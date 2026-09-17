#!/usr/bin/env node
// 검사 스크립트. 데이터 루트를 통째로 읽어 실패마다 step 과 <name> 을 달아 두고, 인자에 따라 걸러 찍는다.
// 문법은 docs/agents/digest-format.md, step 과 gate 는 docs/agents/flow.md, 용어는 CONTEXT.md.
// 부르는 법 셋:
//   node check.mjs [<dir>]                  저장소 전체가 성한가. 실패 줄 전부, 없으면 ok 줄. exit 0/1.
//   node check.mjs <step> <name> [<dir>]    이 step 이 <name> 에 대해 끝났나. 그 step 의 실패 줄 전부. exit 0/1.
//   node check.mjs --where <name> [<dir>]   <name> 이 어디까지 왔나. step 마다 ok / missing / not / - 한 단어. exit 0.
// <dir> 은 source/, digest/, conflict/ 를 가진 데이터 루트이고 없으면 현재 디렉터리.
// 데이터는 별도 저장소(md-holon-data)에 있고 이 저장소는 도구만 갖는다.
//
// 실패 문장은 둘로 가른다. `missing ...` 은 덜 했다(이 step 을 마저 한다), 그 밖은 틀렸다(이 step 을 고친다).
// 앞의 `<자리>: ` 는 있어도 된다. --where 는 이 구분으로 한 단어를 고른다.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const STEPS = ["fetch", "digest", "comparison", "open", "decide"];

// ---------- 인자 ----------

const argv = process.argv.slice(2);
let mode = "all";
let step = null;
let name = null;
if (argv[0] === "--where") {
  mode = "where";
  name = argv[1];
  argv.splice(0, 2);
} else if (STEPS.includes(argv[0])) {
  mode = "step";
  step = argv[0];
  name = argv[1];
  argv.splice(0, 2);
}
if (mode !== "all" && !name) {
  console.error("usage: check.mjs [<dir>] | check.mjs <step> <name> [<dir>] | check.mjs --where <name> [<dir>]");
  process.exit(2);
}
const root = resolve(argv[0] ?? process.cwd());

// ---------- 실패 ----------

const failures = []; // { step, names: Set, file, why }
// names 는 이 실패가 걸리는 <name> 하나 또는 여럿. open 과 decide 의 장은 두 쪽 이름을 다 단다.
function fail(step, names, file, why) {
  failures.push({ step, names: new Set([].concat(names)), file, why });
}
const isMissing = (why) => /^(?:[^:]*: )?missing\b/.test(why);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_NAME = /^([a-z0-9-]+)\.C\d+--([a-z0-9-]+)\.C\d+$/;

// ---------- 읽기 ----------

function listMd(dir) {
  const p = join(root, dir);
  if (!existsSync(p)) return [];
  return readdirSync(p).filter((f) => f.endsWith(".md")).sort();
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// frontmatter → { fields: {k: v}, keys: [k], body, errors: [why] }. 실패는 부르는 쪽이 step 을 달아 올린다.
function splitFront(text) {
  const lines = text.split("\n");
  if (lines[0] !== "---") return { fields: {}, keys: [], body: text, errors: ["frontmatter must start at line 1 with ---"] };
  const end = lines.indexOf("---", 1);
  if (end < 0) return { fields: {}, keys: [], body: text, errors: ["frontmatter is not closed"] };
  const fields = {};
  const keys = [];
  const errors = [];
  for (const l of lines.slice(1, end)) {
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(l);
    if (!m) {
      errors.push(`frontmatter line is not "key: value": ${l}`);
      continue;
    }
    fields[m[1]] = m[2].trim();
    keys.push(m[1]);
  }
  return { fields, keys, body: lines.slice(end + 1).join("\n"), errors };
}

// "## 제목" 절 → Map(제목 → 줄들)
function sections(body) {
  const out = new Map();
  let cur = null;
  for (const l of body.split("\n")) {
    const m = /^## (.+)$/.exec(l);
    if (m) {
      cur = [];
      out.set(m[1].trim(), cur);
    } else if (cur) cur.push(l);
  }
  return out;
}

// markdown 표 → 칸을 trim 한 행들(머리와 구분선은 뺀다)
function table(lines) {
  const rows = lines.filter((l) => l.startsWith("|"));
  return rows.slice(2).map((l) => l.slice(1).replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
}

function tableHeader(lines) {
  const h = lines.find((l) => l.startsWith("|"));
  return h ? h.slice(1).replace(/\|\s*$/, "").split("|").map((c) => c.trim()) : null;
}

function sectionText(lines) {
  return lines.filter((l) => !/^\s*<!--.*-->\s*$/.test(l)).join("\n").trim();
}

// ---------- fetch: source 가 있고 머리에 source: 가 있다 ----------

const sourceNames = new Set(listMd("source").map((f) => f.slice(0, -3)));
const digestNames = new Set(listMd("digest").map((f) => f.slice(0, -3)));
// 검사가 아는 이름 전부. 인자로 받은 <name> 은 파일이 하나도 없어도 fetch 부터 missing 으로 찍히게 넣는다.
const known = new Set([...sourceNames, ...digestNames, ...(name ? [name] : [])]);

for (const n of known) {
  const file = `source/${n}.md`;
  if (!sourceNames.has(n)) {
    fail("fetch", n, file, "missing: no such file");
    continue;
  }
  // source 의 머리는 defuddle 의 것이라 문법은 안 보고 source: 줄만 찾는다.
  const { fields } = splitFront(read(file));
  if (!(fields.source ?? "")) fail("fetch", n, file, "missing source: <url> in frontmatter");
}

// ---------- digest: 머리와 Claims 절 ----------

const digests = new Map(); // name → { file, claims: Map(id → {line, excerpt, stances[]}), rows: [...], body }

for (const n of known) if (!digestNames.has(n)) fail("digest", n, `digest/${n}.md`, "missing: no such file");

for (const f of listMd("digest")) {
  const n = f.slice(0, -3);
  const file = `digest/${f}`;
  const text = read(file);
  const { fields, keys, body, errors } = splitFront(text);
  for (const e of errors) fail("digest", n, file, e);

  if (!("fetched" in fields)) fail("digest", n, file, "missing fetched in frontmatter");
  else if (!ISO_DATE.test(fields.fetched)) fail("digest", n, file, "fetched is not an ISO date");
  for (const k of keys) if (k !== "fetched") fail("digest", n, file, `frontmatter key not allowed: ${k}`);

  const source = sourceNames.has(n) ? read(`source/${f}`) : "";

  const secs = sections(body);
  const claims = new Map();
  const claimLines = secs.get("Claims");
  if (!claimLines) fail("digest", n, file, "missing ## Claims");
  else {
    let expect = 1;
    let cur = null;
    for (const l of claimLines) {
      let m;
      if ((m = /^- C(\d+): (.+)$/.exec(l))) {
        const id = Number(m[1]);
        if (id !== expect) fail("digest", n, file, `claim ids must run C1, C2, ... without gaps; found C${id} where C${expect} was expected`);
        expect = id + 1;
        cur = { id: `C${id}`, line: m[2].trim(), excerpt: null, stances: [] };
        claims.set(cur.id, cur);
      } else if ((m = /^  > (.+)$/.exec(l))) {
        if (!cur) fail("digest", n, file, "excerpt without a claim above it");
        else if (cur.excerpt !== null) fail("digest", n, file, `${cur.id}: more than one excerpt`);
        else {
          cur.excerpt = m[1];
          if (source && !source.includes(m[1])) fail("digest", n, file, `${cur.id}: excerpt is not verbatim in source/${f}`);
        }
      } else if ((m = /^  stance: (lost to|won over) (\S+) · (\S+)$/.exec(l))) {
        // stance 줄은 decide 가 쓴다. 상대 claim 의 이름도 같이 단다.
        const names = [n, m[2].split("#")[0]];
        if (!cur) fail("decide", names, file, "stance line without a claim above it");
        else if (cur.excerpt === null) fail("decide", names, file, `${cur.id}: stance line before the excerpt`);
        else cur.stances.push({ word: m[1], other: m[2], page: m[3] });
      } else if (l.trim() !== "") fail("digest", n, file, `line not part of the claim grammar: ${l}`);
    }
    for (const c of claims.values()) if (c.excerpt === null) fail("digest", n, file, `${c.id}: missing excerpt`);
  }

  // ---------- comparison: Comparison 표의 문법 ----------

  const rows = [];
  const cmpLines = secs.get("Comparison");
  if (!cmpLines) fail("comparison", n, file, "missing ## Comparison");
  else {
    const hdr = tableHeader(cmpLines);
    if (!hdr || hdr.join("|") !== "digest|verdict|pairs|quote") fail("comparison", n, file, "Comparison header must be | digest | verdict | pairs | quote |");
    for (const cells of table(cmpLines)) {
      if (cells.length !== 4) {
        fail("comparison", n, file, `Comparison row must have 4 cells: | ${cells.join(" | ")} |`);
        continue;
      }
      const [other, verdict, pairsText, quote] = cells;
      const pairs = [];
      if (pairsText !== "") {
        for (const p of pairsText.split(",").map((s) => s.trim())) {
          const m = /^(conflict|overlap) C(\d+)↔C(\d+)$/.exec(p);
          if (!m) fail("comparison", n, file, `Comparison row ${other}: pair not "<kind> Cn↔Cm": ${p}`);
          else pairs.push({ kind: m[1], left: `C${m[2]}`, right: `C${m[3]}` });
        }
      }
      rows.push({ other, verdict, pairs, quote });
    }
  }

  digests.set(n, { file, claims, rows, body: text });
}

// ---------- comparison: coverage ----------

for (const [n, d] of digests) {
  const seen = new Set();
  for (const r of d.rows) {
    if (r.other === n) fail("comparison", n, d.file, "Comparison row names the digest itself");
    if (!digests.has(r.other)) fail("comparison", n, d.file, `Comparison row names an unknown digest: ${r.other}`);
    if (seen.has(r.other)) fail("comparison", n, d.file, `Comparison row duplicated: ${r.other}`);
    seen.add(r.other);
    if (!["conflict", "overlap", "unrelated"].includes(r.verdict)) fail("comparison", n, d.file, `Comparison row ${r.other}: verdict must be conflict, overlap or unrelated`);
    const kinds = new Set(r.pairs.map((p) => p.kind));
    const strongest = kinds.has("conflict") ? "conflict" : kinds.has("overlap") ? "overlap" : "unrelated";
    if (r.verdict !== strongest) fail("comparison", n, d.file, `Comparison row ${r.other}: verdict ${r.verdict} but pairs say ${strongest}`);
    const od = digests.get(r.other);
    if (od) {
      if (!od.body.includes(r.quote)) fail("comparison", n, d.file, `Comparison row ${r.other}: quote is not verbatim in ${od.file}`);
      for (const p of r.pairs) {
        if (!d.claims.has(p.left)) fail("comparison", n, d.file, `Comparison row ${r.other}: ${n}#${p.left} does not exist`);
        if (!od.claims.has(p.right)) fail("comparison", n, d.file, `Comparison row ${r.other}: ${r.other}#${p.right} does not exist`);
      }
    }
  }
}
// digest 두 장마다 견줌이 꼭 한 번, 나중 것 쪽에 있다. 어느 쪽이 나중인지는 파일이 안 말하니 두 이름을 다 단다.
const names = [...digests.keys()];
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const a = names[i], b = names[j];
    const ab = digests.get(a).rows.some((r) => r.other === b);
    const ba = digests.get(b).rows.some((r) => r.other === a);
    if (!ab && !ba) fail("comparison", [a, b], "digest/", `missing Comparison row: ${a} and ${b} were never compared; the later one carries the row`);
    if (ab && ba) fail("comparison", [a, b], "digest/", `${a} and ${b} compare each other; only the later digest carries the row`);
  }
}

// ---------- open: 있어야 할 장의 집합 ----------

const expectedPages = new Map(); // 장 이름 → { newName, newId, oldName, oldId }
for (const [n, d] of digests) {
  for (const r of d.rows) for (const p of r.pairs) {
    if (p.kind !== "conflict") continue;
    const page = `${n}.${p.left}--${r.other}.${p.right}`;
    expectedPages.set(page, { newName: n, newId: p.left, oldName: r.other, oldId: p.right });
  }
}
const pageNames = (page) => {
  const pair = expectedPages.get(page);
  if (pair) return [pair.newName, pair.oldName];
  const m = PAGE_NAME.exec(page);
  return m ? [m[1], m[2]] : [];
};
const actualPages = new Set(listMd("conflict").map((f) => f.slice(0, -3)));
for (const p of expectedPages.keys()) if (!actualPages.has(p)) fail("open", pageNames(p), `conflict/${p}.md`, "missing: a Comparison row has this conflict pair");
for (const p of actualPages) if (!expectedPages.has(p)) fail("open", pageNames(p), `conflict/${p}.md`, "no Comparison row has this conflict pair");

// 걸린 자리: claim 을 이름 부른 자리 전부. claimRef "name#Cn" → Set("파일|자리|무엇")
function hitRows(refs) {
  const rows = new Set();
  for (const ref of refs) {
    const [n, id] = ref.split("#");
    rows.add(`digest/${n}.md|${id}|claim`);
    for (const [dn, d] of digests) for (const r of d.rows) for (const p of r.pairs) {
      const hits = (dn === n && p.left === id) || (r.other === n && p.right === id);
      if (hits) rows.add(`digest/${dn}.md|Comparison 행 ${r.other}|${p.kind} ${p.left}↔${p.right}`);
    }
  }
  return rows;
}
// 걸린 자리 행 하나가 걸리는 이름. 그 행을 쓰거나 지워야 하는 step 이 그 이름의 open 이다.
function rowNames(key) {
  const file = key.split("|")[0];
  let m;
  if ((m = /^digest\/(.+)\.md$/.exec(file))) return [m[1]];
  if ((m = /^conflict\/(.+)\.md$/.exec(file))) return pageNames(m[1]);
  return [];
}

// ---------- open 과 decide: 장의 속 ----------

const pages = new Map(); // 장 이름 → { status, opened, pair }
for (const page of actualPages) {
  const file = `conflict/${page}.md`;
  const P = pageNames(page);
  const text = read(file);
  const { fields, keys, body, errors } = splitFront(text);
  for (const e of errors) fail("open", P, file, e);
  if (!("opened" in fields)) fail("open", P, file, "missing opened in frontmatter");
  else if (!ISO_DATE.test(fields.opened)) fail("open", P, file, "opened is not an ISO date");
  if (!["open", "decided"].includes(fields.status ?? "")) fail("open", P, file, "status must be open or decided");
  for (const k of keys) if (!["opened", "status", "decided_by"].includes(k)) fail("open", P, file, `frontmatter key not allowed: ${k}`);
  if (fields.status === "open" && "decided_by" in fields) fail("decide", P, file, "open page must not have decided_by");
  if (fields.status === "decided" && !(fields.decided_by ?? "")) fail("decide", P, file, "missing decided_by on a decided page: ai or a person's name");
  const pair = expectedPages.get(page);
  pages.set(page, { status: fields.status, opened: fields.opened, pair });
  if (!pair) continue;
  const newRef = `${pair.newName}#${pair.newId}`;
  const oldRef = `${pair.oldName}#${pair.oldId}`;

  const titleLine = body.split("\n").find((l) => l.startsWith("# "));
  if (titleLine !== `# ${newRef} ↔ ${oldRef}`) fail("open", P, file, `title must be "# ${newRef} ↔ ${oldRef}"`);

  const secs = sections(body);
  for (const s of ["두 쪽", "걸린 자리", "의견", "결과"]) if (!secs.has(s)) fail("open", P, file, `missing ## ${s}`);

  // 두 쪽: claim 줄과 인용이 digest 에서 글자 그대로
  const sides = secs.get("두 쪽") ?? [];
  for (const [ref, n, id] of [[newRef, pair.newName, pair.newId], [oldRef, pair.oldName, pair.oldId]]) {
    const c = digests.get(n)?.claims.get(id);
    if (!c) { fail("open", P, file, `${ref} does not exist`); continue; }
    const i = sides.indexOf(`**${ref}**: ${c.line}`);
    if (i < 0) fail("open", P, file, `두 쪽: missing "**${ref}**: <claim line>" verbatim from digest/${n}.md`);
    else if (sides[i + 1] !== `> ${c.excerpt}`) fail("open", P, file, `두 쪽: excerpt under ${ref} is not verbatim from digest/${n}.md`);
  }

  // 걸린 자리: 앞 세 열은 id 로 뽑은 집합과 같고, 뒤 두 열은 status 에 따른다
  const hits = secs.get("걸린 자리") ?? [];
  const hdr = tableHeader(hits);
  if (!hdr || hdr.join("|") !== "파일|자리|무엇|action|reason") fail("open", P, file, "걸린 자리 header must be | 파일 | 자리 | 무엇 | action | reason |");
  const expected = hitRows([newRef, oldRef]);
  for (const other of actualPages) {
    if (other === page) continue;
    const op = expectedPages.get(other);
    if (!op) continue;
    const refs = [`${op.newName}#${op.newId}`, `${op.oldName}#${op.oldId}`];
    for (const ref of [newRef, oldRef]) if (refs.includes(ref)) expected.add(`conflict/${other}.md|다른 장|${ref}`);
  }
  const got = new Set();
  for (const cells of table(hits)) {
    if (cells.length !== 5) { fail("open", P, file, `걸린 자리 row must have 5 cells: | ${cells.join(" | ")} |`); continue; }
    const key = cells.slice(0, 3).join("|");
    if (got.has(key)) fail("open", P, file, `걸린 자리 row duplicated: ${key}`);
    got.add(key);
    const [action, reason] = cells.slice(3);
    if (fields.status === "open" && (action !== "" || reason !== "")) fail("decide", P, file, `걸린 자리 ${key}: action and reason must be empty while open`);
    if (fields.status === "decided") {
      if (!["changed", "kept"].includes(action)) fail("decide", P, file, `걸린 자리 ${key}: action must be changed or kept`);
      if (reason === "") fail("decide", P, file, `걸린 자리 ${key}: missing reason`);
    }
  }
  // open 장은 뽑은 행을 다 가져야 한다. decided 장은 얼려서, 정한 뒤에 뽑히게 된 행(같은 claim 을
  // 이름 부른 나중 장이나 comparison 행)은 그 나중 장에 살고, 여기서는 안 뽑히는 행만 실패한다.
  // 행이 걸리는 이름(그 행을 더한 digest 나 다른 장의 이름)도 같이 단다.
  if (fields.status === "open") for (const k of expected) if (!got.has(k)) fail("open", [...P, ...rowNames(k)], file, `걸린 자리: missing row | ${k.replaceAll("|", " | ")} |`);
  for (const k of got) if (!expected.has(k)) fail("open", [...P, ...rowNames(k)], file, `걸린 자리 row not derived from ids: | ${k.replaceAll("|", " | ")} |`);

  // 의견 / 결과 / status
  const opinion = sectionText(secs.get("의견") ?? []);
  const result = sectionText(secs.get("결과") ?? []);
  if (fields.status === "open") {
    // open 장도 decide 를 지난 뒤다. 의견에 왜 못 냈는지가 있어야 한다.
    if (opinion === "") fail("decide", P, file, "missing 의견: an open page says why no side was taken");
    if (result !== "") fail("decide", P, file, "결과 is written but status is open");
  }
  if (fields.status === "decided") {
    if (opinion === "") fail("decide", P, file, "missing 의견 on a decided page");
    if (result === "") fail("decide", P, file, "missing 결과 on a decided page");
    // 두 claim 밑의 stance 줄이 거울처럼 맞는다
    const nc = digests.get(pair.newName)?.claims.get(pair.newId);
    const oc = digests.get(pair.oldName)?.claims.get(pair.oldId);
    for (const [ref, c] of [[newRef, nc], [oldRef, oc]]) {
      const k = c?.stances.filter((s) => s.page === page).length ?? 0;
      if (k === 0) fail("decide", P, file, `missing stance line under ${ref} naming this page`);
      else if (k > 1) fail("decide", P, file, `${ref} has ${k} stance lines naming this page, not 1`);
    }
    const ns = nc?.stances.filter((s) => s.page === page) ?? [];
    const os = oc?.stances.filter((s) => s.page === page) ?? [];
    if (ns.length === 1 && os.length === 1) {
      if (ns[0].other !== oldRef) fail("decide", P, `digest/${pair.newName}.md`, `${pair.newId}: stance names ${ns[0].other}, page ${page} pairs it with ${oldRef}`);
      if (os[0].other !== newRef) fail("decide", P, `digest/${pair.oldName}.md`, `${pair.oldId}: stance names ${os[0].other}, page ${page} pairs it with ${newRef}`);
      if (ns[0].word === os[0].word) fail("decide", P, file, `both claims say "${ns[0].word}"; one must be lost to, the other won over`);
    }
  }
}

// stance 줄마다 있는 decided 장을 가리키고 그 장의 쌍이 이 claim 을 담는다
for (const [n, d] of digests) for (const c of d.claims.values()) for (const s of c.stances) {
  const pg = pages.get(s.page);
  const ref = `${n}#${c.id}`;
  const names = [n, s.other.split("#")[0]];
  if (!pg) { fail("decide", names, d.file, `${c.id}: stance names a conflict page that does not exist: ${s.page}`); continue; }
  if (pg.status !== "decided") fail("decide", names, d.file, `${c.id}: stance names a page that is still open: ${s.page}`);
  const refs = pg.pair ? [`${pg.pair.newName}#${pg.pair.newId}`, `${pg.pair.oldName}#${pg.pair.oldId}`] : [];
  if (!refs.includes(ref) || !refs.includes(s.other)) fail("decide", names, d.file, `${c.id}: stance pair ${ref} / ${s.other} is not the pair of ${s.page}`);
}

// 두 쪽 밑의 앞선 stance 줄: 두 claim 중 하나를 이름 부른 앞선 decided 장마다 한 줄
for (const [page, pg] of pages) {
  if (!pg.pair) continue;
  const file = `conflict/${page}.md`;
  const refs = [`${pg.pair.newName}#${pg.pair.newId}`, `${pg.pair.oldName}#${pg.pair.oldId}`];
  const sides = (sections(splitFront(read(file)).body).get("두 쪽") ?? []).join("\n");
  for (const [other, op] of pages) {
    if (other === page || op.status !== "decided" || !op.pair || !(op.opened < pg.opened)) continue;
    const orefs = [`${op.pair.newName}#${op.pair.newId}`, `${op.pair.oldName}#${op.pair.oldId}`];
    if (refs.some((r) => orefs.includes(r)) && !sides.includes(other)) fail("open", pageNames(page), file, `두 쪽: missing line about the earlier decided page ${other}`);
  }
}

// ---------- 찍기 ----------

const line = (f) => `${f.file}: ${f.why}`;
const hits = (s, n) => failures.filter((f) => f.step === s && f.names.has(n));

if (mode === "where") {
  // 왼쪽부터 돌다 처음 막힌 데서 멈춘다. 그 뒤는 - 다. 한 step 에 둘이 섞이면 틀렸다가 이긴다.
  let blocked = false;
  for (const s of STEPS) {
    let word = "-";
    if (!blocked) {
      const fs = hits(s, name);
      word = fs.length === 0 ? "ok" : fs.some((f) => !isMissing(f.why)) ? "not" : "missing";
      if (word !== "ok") blocked = true;
    }
    console.log(`${s}: ${word}`);
  }
  process.exit(0);
}

if (mode === "step") {
  const fs = hits(step, name);
  if (fs.length) {
    for (const f of fs) console.error(line(f));
    console.error(`\n${fs.length} failure(s)`);
    process.exit(1);
  }
  console.log(`ok: ${step} ${name}`);
  process.exit(0);
}

if (failures.length) {
  for (const f of failures) console.error(line(f));
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
const open = [...pages].filter(([, p]) => p.status === "open").map(([n]) => n).sort();
console.log(`ok: ${digests.size} digest(s), ${actualPages.size} conflict page(s), ${open.length} open${open.length ? ": " + open.join(", ") : ""}`);
