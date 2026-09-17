#!/usr/bin/env node
// open step. comparison 행의 conflict 쌍마다 장을 세운다. 판단은 없고 id 만 센다.
// 문법은 docs/agents/digest-format.md, step 과 gate 는 docs/agents/flow.md, 용어는 CONTEXT.md.
//   node open.mjs <name> [<dir>]
// 읽는 것: digest/<name>.md 의 Comparison 표(와 두 쪽을 채울 두 digest 의 claim 줄), 그 claim 을 부른 장.
// 쓰는 것: conflict/<name>.C<n>--<old>.C<m>.md 의 머리·두 쪽·걸린 자리, 앞선 open 장의 걸린 자리 행.
// 풀이·의견·결과는 비워 둔다. decide 가 쓴다.
// 이미 있는 장은 다시 쓰지 않고, decided 장은 안 건드린다. 두 번 돌려도 같은 상태다.
// 끝나면 gate 는 `check.mjs open <name>` 이다. 이 스크립트는 검사하지 않는다.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { splitFront, sections, table } from "./md.mjs";

const [name, dirArg] = process.argv.slice(2);
if (!name) {
  console.error("usage: open.mjs <name> [<dir>]");
  process.exit(2);
}
const root = resolve(dirArg ?? process.cwd());
const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, 로컬 날짜

const listMd = (dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith(".md")).sort() : []);
const read = (rel) => readFileSync(join(root, rel), "utf8");
const write = (rel, text) => writeFileSync(join(root, rel), text);

// ---------- 읽기: digest 의 claim 과 Comparison 행 ----------

const digests = new Map(); // name → { claims: Map(id → {line, excerpt, stances[]}), rows: [{other, pairs}] }
for (const f of listMd("digest")) {
  const secs = sections(splitFront(read(`digest/${f}`)).body);
  const claims = new Map();
  let cur = null;
  for (const l of secs.get("Claims") ?? []) {
    let m;
    if ((m = /^- (C\d+): (.+)$/.exec(l))) claims.set(m[1], (cur = { line: m[2].trim(), excerpt: null, stances: [] }));
    else if (cur && (m = /^  > (.+)$/.exec(l))) cur.excerpt ??= m[1];
    else if (cur && (m = /^  stance: (lost|won) (?:to|over) (\S+) · (\S+)$/.exec(l))) cur.stances.push({ side: m[1], other: m[2], page: m[3] });
  }
  const rows = [];
  for (const [other, , pairsText] of table(secs.get("Comparison") ?? [])) {
    const pairs = [];
    for (const p of (pairsText ?? "").split(",")) {
      const m = /^(conflict|overlap) (C\d+)↔(C\d+)$/.exec(p.trim());
      if (m) pairs.push({ kind: m[1], left: m[2], right: m[3] });
    }
    rows.push({ other, pairs });
  }
  digests.set(f.slice(0, -3), { claims, rows });
}
if (!digests.has(name)) {
  console.error(`digest/${name}.md: missing: no such file`);
  process.exit(1);
}

// ---------- 있어야 할 장 전부와 있는 장 ----------

const pairOf = new Map(); // 장 이름 → { newRef, oldRef }
for (const [n, d] of digests) for (const r of d.rows) for (const p of r.pairs) {
  if (p.kind === "conflict") pairOf.set(`${n}.${p.left}--${r.other}.${p.right}`, { newRef: `${n}#${p.left}`, oldRef: `${r.other}#${p.right}` });
}
const pages = new Map(); // 있는 장 이름 → { status, opened, text }
for (const f of listMd("conflict")) {
  const text = read(`conflict/${f}`);
  const { fields } = splitFront(text);
  pages.set(f.slice(0, -3), { status: fields.status, opened: fields.opened, text });
}

const claimOf = (ref) => {
  const [n, id] = ref.split("#");
  return digests.get(n)?.claims.get(id);
};

// 걸린 자리: 두 claim 을 이름 부른 자리 전부. check.mjs 와 같은 셈이다.
// [파일, 자리, 무엇] 을 "|" 로 이은 키. 순서는 새 claim 쪽, 옛 claim 쪽, 다른 장.
function hitRows(page, { newRef, oldRef }) {
  const rows = new Set();
  for (const ref of [newRef, oldRef]) {
    const [n, id] = ref.split("#");
    rows.add(`digest/${n}.md|${id}|claim`);
    for (const [dn, d] of digests) for (const r of d.rows) for (const p of r.pairs) {
      if ((dn === n && p.left === id) || (r.other === n && p.right === id)) rows.add(`digest/${dn}.md|Comparison 행 ${r.other}|${p.kind} ${p.left}↔${p.right}`);
    }
  }
  for (const [other, op] of pairOf) {
    if (other === page || !pages.has(other)) continue;
    for (const ref of [newRef, oldRef]) if (ref === op.newRef || ref === op.oldRef) rows.add(`conflict/${other}.md|다른 장|${ref}`);
  }
  return rows;
}
const rowLine = (key) => `| ${key.replaceAll("|", " | ")} | | |`;

// ---------- 새 장 세우기 ----------

function render(page, { newRef, oldRef }) {
  const sides = [];
  for (const ref of [newRef, oldRef]) {
    const c = claimOf(ref);
    sides.push(`**${ref}**: ${c.line}`, `> ${c.excerpt}`, "");
  }
  // 두 claim 중 하나를 이름 부른 앞선 decided 장마다 한 줄. 편은 그 claim 의 stance 줄에서 읽는다.
  const earlier = [];
  for (const [other, op] of pages) {
    if (op.status !== "decided") continue;
    for (const ref of [newRef, oldRef]) {
      const s = claimOf(ref).stances.find((s) => s.page === other);
      if (s) earlier.push(`${ref} 은 ${other} 에서 ${s.side} 편 (${op.opened})`);
    }
  }
  if (earlier.length) sides.push(...earlier, "");
  const rows = [...hitRows(page, { newRef, oldRef })].map(rowLine);
  return [
    "---", `opened: ${today}`, "status: open", "---", "",
    `# ${newRef} ↔ ${oldRef}`, "",
    "## 두 쪽", "", ...sides,
    "## 풀이", "",
    "## 걸린 자리", "", "| 파일 | 자리 | 무엇 | action | reason |", "|---|---|---|---|---|", ...rows, "",
    "## 의견", "",
    "## 결과", "",
  ].join("\n");
}

mkdirSync(join(root, "conflict"), { recursive: true });
// 먼저 세울 장을 다 등록하고 그 다음 쓴다. 같은 이름의 새 장 둘이 한 claim 을 나눠 가지면 서로를 다른 장으로 적어야 해서다.
const toCreate = [...pairOf].filter(([page]) => page.startsWith(`${name}.`) && !pages.has(page));
for (const [page, pair] of toCreate) {
  for (const ref of [pair.newRef, pair.oldRef]) {
    if (!claimOf(ref)?.excerpt) {
      console.error(`conflict/${page}.md: ${ref} does not exist or has no excerpt; pass \`check.mjs comparison ${name}\` first`);
      process.exit(1);
    }
  }
  pages.set(page, { status: "open", opened: today, text: "" });
}
let wrote = 0;
for (const [page, pair] of toCreate) {
  const text = render(page, pair);
  write(`conflict/${page}.md`, text);
  pages.get(page).text = text;
  console.log(`conflict/${page}.md: created`);
  wrote++;
}

// ---------- open 장의 걸린 자리에 이 이름이 더한 행 ----------

// 행이 걸리는 이름: 그 행을 더한 digest 나 장의 이름. 이 이름의 행만 더한다. 다른 이름의 빠진 행은 그 이름의 open 이 할 일이다.
function rowIsMine(key) {
  const file = key.split("|")[0];
  let m;
  if ((m = /^digest\/(.+)\.md$/.exec(file))) return m[1] === name;
  if ((m = /^conflict\/(.+)\.md$/.exec(file))) return m[1].startsWith(`${name}.`);
  return false;
}
for (const [page, pg] of pages) {
  const pair = pairOf.get(page);
  if (pg.status !== "open" || !pair) continue;
  const lines = pg.text.split("\n");
  const start = lines.indexOf("## 걸린 자리");
  if (start < 0) continue;
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith("## ")) end++;
  const got = new Set(table(lines.slice(start, end)).map((c) => c.slice(0, 3).join("|")));
  const missing = [...hitRows(page, pair)].filter((k) => !got.has(k) && rowIsMine(k));
  if (!missing.length) continue;
  let last = end - 1;
  while (last > start && !lines[last].startsWith("|")) last--;
  lines.splice(last + 1, 0, ...missing.map(rowLine));
  write(`conflict/${page}.md`, lines.join("\n"));
  for (const k of missing) console.log(`conflict/${page}.md: 걸린 자리 row added ${rowLine(k)}`);
  wrote++;
}
if (!wrote) console.log(`nothing to write: open ${name}`);
