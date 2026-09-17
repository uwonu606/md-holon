#!/usr/bin/env node
// The check script. Reads the whole data repo every time, prints every failure, exits 1 on any.
// Grammar: docs/agents/digest-format.md. Terms: CONTEXT.md.
// Usage: node check.mjs [<dir>]. <dir> holds source/, digest/, conflict/; default is the current directory.
// The data lives in a separate repo (md-holon-data); this repo holds only the tool.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
const fail = (file, why) => failures.push(`${file}: ${why}`);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLAIM_REF = /^([a-z0-9-]+)#C(\d+)$/;

// ---------- helpers ----------

function listMd(dir) {
  const p = join(root, dir);
  if (!existsSync(p)) return [];
  return readdirSync(p).filter((f) => f.endsWith(".md")).sort();
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// frontmatter → { fields: {k: v}, body: string, keys: [k] }
function splitFront(text, file) {
  const lines = text.split("\n");
  if (lines[0] !== "---") {
    fail(file, "frontmatter must start at line 1 with ---");
    return { fields: {}, keys: [], body: text };
  }
  const end = lines.indexOf("---", 1);
  if (end < 0) {
    fail(file, "frontmatter is not closed");
    return { fields: {}, keys: [], body: text };
  }
  const fields = {};
  const keys = [];
  for (const l of lines.slice(1, end)) {
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(l);
    if (!m) {
      fail(file, `frontmatter line is not "key: value": ${l}`);
      continue;
    }
    fields[m[1]] = m[2].trim();
    keys.push(m[1]);
  }
  return { fields, keys, body: lines.slice(end + 1).join("\n") };
}

// "## Title" sections → Map(title → lines[])
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

// markdown table → rows of trimmed cells (header and separator dropped)
function table(lines) {
  const rows = lines.filter((l) => l.startsWith("|"));
  return rows.slice(2).map((l) => l.slice(1).replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
}

function tableHeader(lines) {
  const h = lines.find((l) => l.startsWith("|"));
  return h ? h.slice(1).replace(/\|\s*$/, "").split("|").map((c) => c.trim()) : null;
}

function sameSet(a, b) {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

function sectionText(lines) {
  return lines.filter((l) => !/^\s*<!--.*-->\s*$/.test(l)).join("\n").trim();
}

// ---------- load digests ----------

const sourceNames = new Set(listMd("source").map((f) => f.slice(0, -3)));
const digests = new Map(); // name → { file, claims: Map(id → {line, excerpt, stances[]}), rows: [...] }

for (const f of listMd("digest")) {
  const name = f.slice(0, -3);
  const file = `digest/${f}`;
  const text = read(file);
  const { fields, keys, body } = splitFront(text, file);

  if (!ISO_DATE.test(fields.fetched ?? "")) fail(file, "fetched must be an ISO date");
  for (const k of keys) if (k !== "fetched") fail(file, `frontmatter key not allowed: ${k}`);

  if (!sourceNames.has(name)) fail(file, `no source/${name}.md`);
  const source = sourceNames.has(name) ? read(`source/${f}`) : "";

  const secs = sections(body);
  const claims = new Map();
  const claimLines = secs.get("Claims");
  if (!claimLines) fail(file, "missing ## Claims");
  else {
    let expect = 1;
    let cur = null;
    for (const l of claimLines) {
      let m;
      if ((m = /^- C(\d+): (.+)$/.exec(l))) {
        const n = Number(m[1]);
        if (n !== expect) fail(file, `claim ids must run C1, C2, ... without gaps; found C${n} where C${expect} was expected`);
        expect = n + 1;
        cur = { id: `C${n}`, line: m[2].trim(), excerpt: null, stances: [] };
        claims.set(cur.id, cur);
      } else if ((m = /^  > (.+)$/.exec(l))) {
        if (!cur) fail(file, "excerpt without a claim above it");
        else if (cur.excerpt !== null) fail(file, `${cur.id}: more than one excerpt`);
        else {
          cur.excerpt = m[1];
          if (source && !source.includes(m[1])) fail(file, `${cur.id}: excerpt is not verbatim in source/${f}`);
        }
      } else if ((m = /^  stance: (lost to|won over) (\S+) · (\S+)$/.exec(l))) {
        if (!cur) fail(file, "stance line without a claim above it");
        else if (cur.excerpt === null) fail(file, `${cur.id}: stance line before the excerpt`);
        else cur.stances.push({ word: m[1], other: m[2], page: m[3] });
      } else if (l.trim() !== "") fail(file, `line not part of the claim grammar: ${l}`);
    }
    for (const c of claims.values()) if (c.excerpt === null) fail(file, `${c.id}: no excerpt`);
  }

  const rows = [];
  const cmpLines = secs.get("Comparison");
  if (!cmpLines) fail(file, "missing ## Comparison");
  else {
    const hdr = tableHeader(cmpLines);
    if (!hdr || hdr.join("|") !== "digest|verdict|pairs|quote") fail(file, "Comparison header must be | digest | verdict | pairs | quote |");
    for (const cells of table(cmpLines)) {
      if (cells.length !== 4) {
        fail(file, `Comparison row must have 4 cells: | ${cells.join(" | ")} |`);
        continue;
      }
      const [other, verdict, pairsText, quote] = cells;
      const pairs = [];
      if (pairsText !== "") {
        for (const p of pairsText.split(",").map((s) => s.trim())) {
          const m = /^(conflict|overlap) C(\d+)↔C(\d+)$/.exec(p);
          if (!m) fail(file, `Comparison row ${other}: pair not "<kind> Cn↔Cm": ${p}`);
          else pairs.push({ kind: m[1], left: `C${m[2]}`, right: `C${m[3]}` });
        }
      }
      rows.push({ other, verdict, pairs, quote });
    }
  }

  digests.set(name, { file, claims, rows, body: text });
}

// ---------- comparison coverage ----------

for (const [name, d] of digests) {
  const seen = new Set();
  for (const r of d.rows) {
    if (r.other === name) fail(d.file, "Comparison row names the digest itself");
    if (!digests.has(r.other)) fail(d.file, `Comparison row names an unknown digest: ${r.other}`);
    if (seen.has(r.other)) fail(d.file, `Comparison row duplicated: ${r.other}`);
    seen.add(r.other);
    if (!["conflict", "overlap", "unrelated"].includes(r.verdict)) fail(d.file, `Comparison row ${r.other}: verdict must be conflict, overlap or unrelated`);
    const kinds = new Set(r.pairs.map((p) => p.kind));
    const strongest = kinds.has("conflict") ? "conflict" : kinds.has("overlap") ? "overlap" : "unrelated";
    if (r.verdict !== strongest) fail(d.file, `Comparison row ${r.other}: verdict ${r.verdict} but pairs say ${strongest}`);
    const od = digests.get(r.other);
    if (od) {
      if (!od.body.includes(r.quote)) fail(d.file, `Comparison row ${r.other}: quote is not verbatim in ${od.file}`);
      for (const p of r.pairs) {
        if (!d.claims.has(p.left)) fail(d.file, `Comparison row ${r.other}: ${name}#${p.left} does not exist`);
        if (!od.claims.has(p.right)) fail(d.file, `Comparison row ${r.other}: ${r.other}#${p.right} does not exist`);
      }
    }
  }
}
// every unordered pair of digests is compared exactly once, from the later one.
const names = [...digests.keys()];
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const a = names[i], b = names[j];
    const ab = digests.get(a).rows.some((r) => r.other === b);
    const ba = digests.get(b).rows.some((r) => r.other === a);
    if (!ab && !ba) fail("digest/", `${a} and ${b} were never compared: the later one needs a Comparison row for the other`);
    if (ab && ba) fail("digest/", `${a} and ${b} compare each other; only the later digest carries the row`);
  }
}

// ---------- conflict pages: expected set ----------

const expectedPages = new Map(); // page name → { newName, newId, oldName, oldId }
for (const [name, d] of digests) {
  for (const r of d.rows) for (const p of r.pairs) {
    if (p.kind !== "conflict") continue;
    const page = `${name}.${p.left}--${r.other}.${p.right}`;
    expectedPages.set(page, { newName: name, newId: p.left, oldName: r.other, oldId: p.right });
  }
}
const actualPages = new Set(listMd("conflict").map((f) => f.slice(0, -3)));
for (const p of expectedPages.keys()) if (!actualPages.has(p)) fail(`conflict/${p}.md`, "missing: a Comparison row has this conflict pair");
for (const p of actualPages) if (!expectedPages.has(p)) fail(`conflict/${p}.md`, "no Comparison row has this conflict pair");

// where a claim is referenced, for 걸린 자리: claimRef "name#Cn" → Set of "file|place|what"
function hitRows(refs) {
  const rows = new Set();
  for (const ref of refs) {
    const [name, id] = ref.split("#");
    rows.add(`digest/${name}.md|${id}|claim`);
    for (const [dn, d] of digests) for (const r of d.rows) for (const p of r.pairs) {
      const hits = (dn === name && p.left === id) || (r.other === name && p.right === id);
      if (hits) rows.add(`digest/${dn}.md|Comparison 행 ${r.other}|${p.kind} ${p.left}↔${p.right}`);
    }
  }
  return rows;
}

// ---------- conflict pages: contents ----------

const pages = new Map(); // page → { status, opened, pair }
for (const page of actualPages) {
  const file = `conflict/${page}.md`;
  const text = read(file);
  const { fields, keys, body } = splitFront(text, file);
  if (!ISO_DATE.test(fields.opened ?? "")) fail(file, "opened must be an ISO date");
  if (!["open", "decided"].includes(fields.status ?? "")) fail(file, "status must be open or decided");
  for (const k of keys) if (!["opened", "status", "decided_by"].includes(k)) fail(file, `frontmatter key not allowed: ${k}`);
  if (fields.status === "open" && "decided_by" in fields) fail(file, "open page must not have decided_by");
  if (fields.status === "decided" && !(fields.decided_by ?? "")) fail(file, "decided page needs decided_by: ai or a person's name");
  const pair = expectedPages.get(page);
  pages.set(page, { status: fields.status, opened: fields.opened, pair });
  if (!pair) continue;
  const newRef = `${pair.newName}#${pair.newId}`;
  const oldRef = `${pair.oldName}#${pair.oldId}`;

  const titleLine = body.split("\n").find((l) => l.startsWith("# "));
  if (titleLine !== `# ${newRef} ↔ ${oldRef}`) fail(file, `title must be "# ${newRef} ↔ ${oldRef}"`);

  const secs = sections(body);
  for (const s of ["두 쪽", "걸린 자리", "의견", "결과"]) if (!secs.has(s)) fail(file, `missing ## ${s}`);

  // 두 쪽: claim line and excerpt verbatim from each digest
  const sides = secs.get("두 쪽") ?? [];
  for (const [ref, name, id] of [[newRef, pair.newName, pair.newId], [oldRef, pair.oldName, pair.oldId]]) {
    const c = digests.get(name)?.claims.get(id);
    if (!c) { fail(file, `${ref} does not exist`); continue; }
    const i = sides.indexOf(`**${ref}**: ${c.line}`);
    if (i < 0) fail(file, `두 쪽: missing "**${ref}**: <claim line>" verbatim from digest/${name}.md`);
    else if (sides[i + 1] !== `> ${c.excerpt}`) fail(file, `두 쪽: excerpt under ${ref} is not verbatim from digest/${name}.md`);
  }

  // 걸린 자리: first three columns equal the derived set; last two per status
  const hits = secs.get("걸린 자리") ?? [];
  const hdr = tableHeader(hits);
  if (!hdr || hdr.join("|") !== "파일|자리|무엇|action|reason") fail(file, "걸린 자리 header must be | 파일 | 자리 | 무엇 | action | reason |");
  const expected = hitRows([newRef, oldRef]);
  for (const other of actualPages) {
    if (other === page) continue;
    const op = expectedPages.get(other);
    if (!op) continue;
    const names = [`${op.newName}#${op.newId}`, `${op.oldName}#${op.oldId}`];
    for (const ref of [newRef, oldRef]) if (names.includes(ref)) expected.add(`conflict/${other}.md|다른 장|${ref}`);
  }
  const got = new Set();
  for (const cells of table(hits)) {
    if (cells.length !== 5) { fail(file, `걸린 자리 row must have 5 cells: | ${cells.join(" | ")} |`); continue; }
    const key = cells.slice(0, 3).join("|");
    if (got.has(key)) fail(file, `걸린 자리 row duplicated: ${key}`);
    got.add(key);
    const [action, reason] = cells.slice(3);
    if (fields.status === "open" && (action !== "" || reason !== "")) fail(file, `걸린 자리 ${key}: action and reason must be empty while open`);
    if (fields.status === "decided") {
      if (!["changed", "kept"].includes(action)) fail(file, `걸린 자리 ${key}: action must be changed or kept`);
      if (reason === "") fail(file, `걸린 자리 ${key}: reason is empty`);
    }
  }
  // an open page must list every derived row; a decided page is frozen, so rows derived
  // after it was decided (a later page or comparison row naming the same claim) live on
  // the later page, and here only bogus rows fail.
  if (fields.status === "open") for (const k of expected) if (!got.has(k)) fail(file, `걸린 자리 missing row: | ${k.replaceAll("|", " | ")} |`);
  for (const k of got) if (!expected.has(k)) fail(file, `걸린 자리 row not derived from ids: | ${k.replaceAll("|", " | ")} |`);

  // 의견 / 결과 / status
  const opinion = sectionText(secs.get("의견") ?? []);
  const result = sectionText(secs.get("결과") ?? []);
  if (fields.status === "open" && result !== "") fail(file, "결과 is written but status is open");
  if (fields.status === "decided") {
    if (opinion === "") fail(file, "decided without 의견");
    if (result === "") fail(file, "decided without 결과");
    // stance lines under both claims, mirrored
    const nc = digests.get(pair.newName)?.claims.get(pair.newId);
    const oc = digests.get(pair.oldName)?.claims.get(pair.oldId);
    const ns = nc?.stances.filter((s) => s.page === page) ?? [];
    const os = oc?.stances.filter((s) => s.page === page) ?? [];
    if (ns.length !== 1) fail(file, `decided but ${newRef} has ${ns.length} stance lines naming this page (need 1)`);
    if (os.length !== 1) fail(file, `decided but ${oldRef} has ${os.length} stance lines naming this page (need 1)`);
    if (ns.length === 1 && os.length === 1) {
      if (ns[0].other !== oldRef) fail(`digest/${pair.newName}.md`, `${pair.newId}: stance names ${ns[0].other}, page ${page} pairs it with ${oldRef}`);
      if (os[0].other !== newRef) fail(`digest/${pair.oldName}.md`, `${pair.oldId}: stance names ${os[0].other}, page ${page} pairs it with ${newRef}`);
      if (ns[0].word === os[0].word) fail(file, `both claims say "${ns[0].word}"; one must be lost to, the other won over`);
    }
  }
}

// every stance line names an existing decided page whose pair contains this claim
for (const [name, d] of digests) for (const c of d.claims.values()) for (const s of c.stances) {
  const pg = pages.get(s.page);
  const ref = `${name}#${c.id}`;
  if (!pg) { fail(d.file, `${c.id}: stance names a conflict page that does not exist: ${s.page}`); continue; }
  if (pg.status !== "decided") fail(d.file, `${c.id}: stance names a page that is still open: ${s.page}`);
  const refs = pg.pair ? [`${pg.pair.newName}#${pg.pair.newId}`, `${pg.pair.oldName}#${pg.pair.oldId}`] : [];
  if (!refs.includes(ref) || !refs.includes(s.other)) fail(d.file, `${c.id}: stance pair ${ref} / ${s.other} is not the pair of ${s.page}`);
}

// prior stance lines in 두 쪽: one per earlier decided page naming either claim
for (const [page, pg] of pages) {
  if (!pg.pair) continue;
  const file = `conflict/${page}.md`;
  const refs = [`${pg.pair.newName}#${pg.pair.newId}`, `${pg.pair.oldName}#${pg.pair.oldId}`];
  const sides = (sections(splitFront(read(file), file).body).get("두 쪽") ?? []).join("\n");
  for (const [other, op] of pages) {
    if (other === page || op.status !== "decided" || !op.pair || !(op.opened < pg.opened)) continue;
    const orefs = [`${op.pair.newName}#${op.pair.newId}`, `${op.pair.oldName}#${op.pair.oldId}`];
    if (refs.some((r) => orefs.includes(r)) && !sides.includes(other)) fail(file, `두 쪽: no line about the earlier decided page ${other}`);
  }
}

// ---------- report ----------

if (failures.length) {
  for (const f of failures) console.error(f);
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
const open = [...pages].filter(([, p]) => p.status === "open").map(([n]) => n).sort();
console.log(`ok: ${digests.size} digest(s), ${actualPages.size} conflict page(s), ${open.length} open${open.length ? ": " + open.join(", ") : ""}`);
