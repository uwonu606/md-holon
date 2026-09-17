// check.mjs 의 깨뜨림 테스트. scripts/fixture/ 를 임시 디렉터리에 복사하고 하나를 깨뜨린 뒤
// 복사본에 검사를 돌려 exit 1 과 찍혀야 할 실패 줄을 기대한다.
// 뒤의 테스트는 step 인자와 --where 가 이름과 step 으로 바르게 거르는지 본다.
// 마지막 테스트는 check.mjs 의 실패 문구를 전부 읽어 한 번도 안 맞은 것이 있으면 실패한다.
// 실행: node --test scripts/check.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const check = join(here, "check.mjs");
const fixture = join(here, "fixture");

function run(dir, ...args) {
  const r = spawnSync(process.execPath, [check, ...args, dir], { encoding: "utf8" });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), "md-holon-check-"));
  cpSync(fixture, dir, { recursive: true });
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// 깨뜨리는 손. edit() 은 바꾸려는 글이 없으면 거부한다. fixture 를 고쳐서 깨뜨림이 조용히
// 무뎌지면 통과가 아니라 에러로 드러난다.
const edit = (rel, from, to) => (dir) => {
  const p = join(dir, rel);
  const t = readFileSync(p, "utf8");
  if (!t.includes(from)) throw new Error(`fixture drifted: ${rel} no longer contains ${JSON.stringify(from)}`);
  writeFileSync(p, t.replace(from, to));
};
const remove = (rel) => (dir) => unlinkSync(join(dir, rel));
const copy = (from, to) => (dir) => writeFileSync(join(dir, to), readFileSync(join(dir, from)));

const OPEN = "conflict/gamma.C1--alpha.C1.md";
const DECIDED = "conflict/beta.C1--alpha.C1.md";

// [이름, 깨뜨리는 손, 실패 출력에 들어 있어야 할 문구]
const breaks = [
  // digest 머리
  ["digest 머리가 1행에서 안 시작", edit("digest/alpha.md", "---\nfetched", "\n---\nfetched"), "frontmatter must start at line 1 with ---"],
  ["digest 머리가 안 닫힘", edit("digest/gamma.md", "fetched: 2026-01-03\n---", "fetched: 2026-01-03"), "frontmatter is not closed"],
  ["digest 머리에 key: value 아닌 줄", edit("digest/gamma.md", "fetched: 2026-01-03", "fetched: 2026-01-03\nnonsense"), 'frontmatter line is not "key: value": nonsense'],
  ["fetched 없음", edit("digest/gamma.md", "fetched: 2026-01-03\n", "title: x\n"), "missing fetched in frontmatter"],
  ["fetched 가 날짜가 아님", edit("digest/gamma.md", "fetched: 2026-01-03", "fetched: yesterday"), "fetched is not an ISO date"],
  ["digest 머리에 모르는 key", edit("digest/gamma.md", "fetched: 2026-01-03", "fetched: 2026-01-03\nextra: 1"), "frontmatter key not allowed: extra"],
  // fetch
  ["source 없는 digest", remove("source/gamma.md"), "source/gamma.md: missing: no such file"],
  ["source 머리에 source: 없음", edit("source/gamma.md", "source: \"https://example.test/gamma\"\n", ""), "source/gamma.md: missing source: <url> in frontmatter"],
  ["digest 없는 source", remove("digest/gamma.md"), "digest/gamma.md: missing: no such file"],
  // claims
  ["## Claims 없음", edit("digest/gamma.md", "## Claims", "## Claim"), "missing ## Claims"],
  ["claim 번호에 빈틈", edit("digest/gamma.md", "- C1: 옛 기록은 일주일", "- C2: 옛 기록은 일주일"), "claim ids must run C1, C2, ... without gaps; found C2 where C1 was expected"],
  ["claim 없이 인용만", edit("digest/gamma.md", "## Claims\n\n", "## Claims\n\n  > 떠도는 인용\n"), "excerpt without a claim above it"],
  ["인용이 둘", edit("digest/gamma.md", "  > 옛 기록은 일주일이 지나면 버린다.\n", "  > 옛 기록은 일주일이 지나면 버린다.\n  > 옛 기록은 일주일이 지나면 버린다.\n"), "C1: more than one excerpt"],
  ["인용 한 낱말 바꿈", edit("digest/gamma.md", "일주일이 지나면 버린다.", "한 달이 지나면 버린다."), "C1: excerpt is not verbatim in source/gamma.md"],
  ["claim 없이 stance 만", edit("digest/gamma.md", "## Claims\n\n", "## Claims\n\n  stance: lost to alpha#C1 · beta.C1--alpha.C1\n"), "stance line without a claim above it"],
  ["stance 가 인용보다 앞", edit("digest/beta.md", "  > 옛 기록은 새 기록으로 갈아 끼운다.\n  stance: won over alpha#C1 · beta.C1--alpha.C1", "  stance: won over alpha#C1 · beta.C1--alpha.C1\n  > 옛 기록은 새 기록으로 갈아 끼운다."), "C1: stance line before the excerpt"],
  ["claim 문법 밖의 줄", edit("digest/gamma.md", "  > 옛 기록은 일주일이 지나면 버린다.\n", "  > 옛 기록은 일주일이 지나면 버린다.\n  note: hi\n"), "line not part of the claim grammar:   note: hi"],
  ["인용 없는 claim", edit("digest/gamma.md", "  > 옛 기록은 일주일이 지나면 버린다.\n", ""), "C1: missing excerpt"],
  // Comparison 표
  ["## Comparison 없음", edit("digest/gamma.md", "## Comparison", "## Compare"), "missing ## Comparison"],
  ["Comparison 머리가 다름", edit("digest/gamma.md", "| digest | verdict | pairs | quote |", "| digest | verdict | quote |"), "Comparison header must be | digest | verdict | pairs | quote |"],
  ["Comparison 행의 칸이 셋", edit("digest/gamma.md", "| beta | unrelated | | 기록은 사람이 검사한다. |", "| beta | unrelated | 기록은 사람이 검사한다. |"), "Comparison row must have 4 cells"],
  ["pair 문법이 다름", edit("digest/gamma.md", "conflict C1↔C1", "conflict C1-C1"), 'Comparison row alpha: pair not "<kind> Cn↔Cm": conflict C1-C1'],
  ["Comparison 행이 자기를 가리킴", edit("digest/gamma.md", "| beta | unrelated", "| gamma | unrelated"), "Comparison row names the digest itself"],
  ["Comparison 행이 모르는 digest", edit("digest/gamma.md", "| beta | unrelated", "| delta | unrelated"), "Comparison row names an unknown digest: delta"],
  ["Comparison 행 중복", edit("digest/gamma.md", "| beta | unrelated | | 기록은 사람이 검사한다. |\n", "| beta | unrelated | | 기록은 사람이 검사한다. |\n| beta | unrelated | | 기록은 사람이 검사한다. |\n"), "Comparison row duplicated: beta"],
  ["verdict 가 셋 중 하나가 아님", edit("digest/gamma.md", "| beta | unrelated |", "| beta | maybe |"), "Comparison row beta: verdict must be conflict, overlap or unrelated"],
  ["verdict 가 pairs 보다 약함", edit("digest/gamma.md", "| alpha | conflict | conflict C1↔C1", "| alpha | overlap | conflict C1↔C1"), "Comparison row alpha: verdict overlap but pairs say conflict"],
  ["quote 가 상대 digest 에 없음", edit("digest/gamma.md", "| alpha | conflict | conflict C1↔C1 | 옛 기록은 영원히 남는다. |", "| alpha | conflict | conflict C1↔C1 | 옛 기록은 잠깐 남는다. |"), "Comparison row alpha: quote is not verbatim in digest/alpha.md"],
  ["pair 의 왼쪽 claim 없음", edit("digest/gamma.md", "conflict C1↔C1", "conflict C9↔C1"), "Comparison row alpha: gamma#C9 does not exist"],
  ["pair 의 오른쪽 claim 없음", edit("digest/gamma.md", "conflict C1↔C1", "conflict C1↔C9"), "Comparison row alpha: alpha#C9 does not exist"],
  // 견줌 빠짐
  ["Comparison 행 삭제", edit("digest/gamma.md", "| beta | unrelated | | 기록은 사람이 검사한다. |\n", ""), "beta and gamma were never compared"],
  ["두 digest 가 서로 견줌", edit("digest/beta.md", "| alpha | conflict | conflict C1↔C1, overlap C2↔C2 | 옛 기록은 영원히 남는다. |\n", "| alpha | conflict | conflict C1↔C1, overlap C2↔C2 | 옛 기록은 영원히 남는다. |\n| gamma | unrelated | | 옛 기록은 일주일 뒤 버린다. |\n"), "beta and gamma compare each other"],
  // conflict 장의 집합
  ["장 삭제", remove(OPEN), `${OPEN}: missing: a Comparison row has this conflict pair`],
  ["행 없는 장", copy(OPEN, "conflict/gamma.C1--beta.C1.md"), "conflict/gamma.C1--beta.C1.md: no Comparison row has this conflict pair"],
  // conflict 장 머리
  ["opened 가 날짜가 아님", edit(OPEN, "opened: 2026-01-03", "opened: soon"), "opened is not an ISO date"],
  ["opened 없음", edit(OPEN, "opened: 2026-01-03\n", ""), "missing opened in frontmatter"],
  ["status 가 둘 중 하나가 아님", edit(OPEN, "status: open", "status: pending"), "status must be open or decided"],
  ["장 머리에 모르는 key", edit(OPEN, "status: open", "status: open\nfoo: bar"), "frontmatter key not allowed: foo"],
  ["open 장에 decided_by", edit(OPEN, "status: open", "status: open\ndecided_by: ai"), "open page must not have decided_by"],
  ["decided 장에 decided_by 없음", edit(DECIDED, "decided_by: ai\n", ""), "missing decided_by on a decided page"],
  // conflict 장 본문
  ["제목의 쌍이 다름", edit(OPEN, "# gamma#C1 ↔ alpha#C1", "# gamma#C1 ↔ alpha#C2"), 'title must be "# gamma#C1 ↔ alpha#C1"'],
  ["절 하나 없음", edit(OPEN, "## 의견", "## 생각"), "missing ## 의견"],
  ["장이 가리킨 claim 이 digest 에 없음", edit("digest/alpha.md", "- C1: 옛 기록은 영원히 남는다.\n  > 옛 기록은 영원히 보관한다.\n  stance: lost to beta#C1 · beta.C1--alpha.C1\n", ""), "alpha#C1 does not exist"],
  ["두 쪽의 claim 줄이 다름", edit(OPEN, "**gamma#C1**: 옛 기록은 일주일 뒤 버린다.", "**gamma#C1**: 옛 기록은 버린다."), '두 쪽: missing "**gamma#C1**: <claim line>" verbatim from digest/gamma.md'],
  ["두 쪽의 인용이 다름", edit(OPEN, "> 옛 기록은 일주일이 지나면 버린다.", "> 옛 기록은 버린다."), "두 쪽: excerpt under gamma#C1 is not verbatim from digest/gamma.md"],
  // 걸린 자리
  ["걸린 자리 머리가 다름", edit(OPEN, "| 파일 | 자리 | 무엇 | action | reason |", "| file | 자리 | 무엇 | action | reason |"), "걸린 자리 header must be | 파일 | 자리 | 무엇 | action | reason |"],
  ["걸린 자리 행의 칸이 넷", edit(OPEN, "| digest/gamma.md | C1 | claim | | |", "| digest/gamma.md | C1 | claim | |"), "걸린 자리 row must have 5 cells"],
  ["걸린 자리 행 중복", edit(OPEN, "| digest/gamma.md | C1 | claim | | |\n", "| digest/gamma.md | C1 | claim | | |\n| digest/gamma.md | C1 | claim | | |\n"), "걸린 자리 row duplicated: digest/gamma.md|C1|claim"],
  ["open 장에 action 이 참", edit(OPEN, "| digest/gamma.md | C1 | claim | | |", "| digest/gamma.md | C1 | claim | kept | x |"), "action and reason must be empty while open"],
  ["decided 장의 action 이 둘 중 하나가 아님", edit(DECIDED, "| digest/beta.md | C1 | claim | changed |", "| digest/beta.md | C1 | claim | moved |"), "action must be changed or kept"],
  ["decided 장의 reason 이 빔", edit(DECIDED, "| changed | won over 줄을 더했다 |", "| changed | |"), "missing reason"],
  ["open 장에 걸린 자리 행 빠짐", edit(OPEN, "| digest/alpha.md | C1 | claim | | |\n", ""), "걸린 자리: missing row | digest/alpha.md | C1 | claim |"],
  ["id 에서 안 나오는 걸린 자리 행", edit(OPEN, "| digest/alpha.md | C1 | claim | | |\n", "| digest/alpha.md | C1 | claim | | |\n| digest/beta.md | C2 | claim | | |\n"), "걸린 자리 row not derived from ids: | digest/beta.md | C2 | claim |"],
  // 의견 / 결과 / stance 거울
  ["open 장에 결과 씀", edit(OPEN, "## 결과\n", "## 결과\n\n2026-01-03 gamma#C1 편.\n"), "결과 is written but status is open"],
  ["decided 장에 의견 없음", edit(DECIDED, "beta#C1 편. 첫 기준에서 갈렸다. 이 fixture 의 쓰임은 새 것이 옛 것을 간다.\n", ""), "missing 의견 on a decided page"],
  ["decided 장에 결과 없음", edit(DECIDED, "2026-01-02 beta#C1 편.\n", ""), "missing 결과 on a decided page"],
  ["open 장에 의견 없음", edit(OPEN, "편을 못 냈다. 이 fixture 의 쓰임은 버리는 때를 말하지 않는다.\n", ""), "missing 의견: an open page says why no side was taken"],
  ["decided 인데 새 쪽 stance 없음", edit("digest/beta.md", "  stance: won over alpha#C1 · beta.C1--alpha.C1\n", ""), "missing stance line under beta#C1 naming this page"],
  ["decided 인데 새 쪽 stance 가 둘", edit("digest/beta.md", "  stance: won over alpha#C1 · beta.C1--alpha.C1\n", "  stance: won over alpha#C1 · beta.C1--alpha.C1\n  stance: won over alpha#C1 · beta.C1--alpha.C1\n"), "beta#C1 has 2 stance lines naming this page, not 1"],
  ["decided 인데 옛 쪽 stance 없음", edit("digest/alpha.md", "  stance: lost to beta#C1 · beta.C1--alpha.C1\n", ""), "missing stance line under alpha#C1 naming this page"],
  ["새 쪽 stance 가 다른 claim 을 가리킴", edit("digest/beta.md", "won over alpha#C1 ·", "won over alpha#C2 ·"), "C1: stance names alpha#C2, page beta.C1--alpha.C1 pairs it with alpha#C1"],
  ["옛 쪽 stance 가 다른 claim 을 가리킴", edit("digest/alpha.md", "lost to beta#C1 ·", "lost to beta#C2 ·"), "C1: stance names beta#C2, page beta.C1--alpha.C1 pairs it with beta#C1"],
  ["양쪽 stance 가 같은 말", edit("digest/alpha.md", "stance: lost to beta#C1", "stance: won over beta#C1"), 'both claims say "won over"; one must be lost to, the other won over'],
  // stance 줄 하나하나
  ["stance 가 없는 장을 가리킴", edit("digest/gamma.md", "  > 옛 기록은 일주일이 지나면 버린다.\n", "  > 옛 기록은 일주일이 지나면 버린다.\n  stance: lost to alpha#C1 · nope.C1--alpha.C1\n"), "C1: stance names a conflict page that does not exist: nope.C1--alpha.C1"],
  ["stance 가 open 장을 가리킴", edit("digest/gamma.md", "  > 옛 기록은 일주일이 지나면 버린다.\n", "  > 옛 기록은 일주일이 지나면 버린다.\n  stance: lost to alpha#C1 · gamma.C1--alpha.C1\n"), "C1: stance names a page that is still open: gamma.C1--alpha.C1"],
  ["stance 의 쌍이 장의 쌍이 아님", edit("digest/alpha.md", "  stance: lost to beta#C1 · beta.C1--alpha.C1\n", "  stance: lost to beta#C1 · beta.C1--alpha.C1\n  stance: lost to gamma#C1 · beta.C1--alpha.C1\n"), "C1: stance pair alpha#C1 / gamma#C1 is not the pair of beta.C1--alpha.C1"],
  // 두 쪽의 앞선 decided 장 줄
  ["앞선 decided 장의 줄 없음", edit(OPEN, "alpha#C1 은 beta.C1--alpha.C1 에서 lost 편 (2026-01-02)\n", ""), "두 쪽: missing line about the earlier decided page beta.C1--alpha.C1"],
];

const printed = new Set(); // 깨뜨림들이 찍은 실패 줄 전부

test("fixture 는 그대로 통과한다", () => withCopy((dir) => {
  const r = run(dir);
  assert.equal(r.status, 0, r.err);
  assert.equal(r.out, "ok: 3 digest(s), 2 conflict page(s), 1 open: gamma.C1--alpha.C1\n");
}));

for (const [name, mutate, expected] of breaks) {
  test(name, () => withCopy((dir) => {
    mutate(dir);
    const r = run(dir);
    assert.equal(r.status, 1, `check did not block:\n${r.out}${r.err}`);
    assert.ok(r.err.includes(expected), `expected line missing: ${expected}\n--- got ---\n${r.err}`);
    for (const l of r.err.split("\n")) if (l && !/^\d+ failure\(s\)$/.test(l)) printed.add(l);
  }));
}

// step 인자와 --where. 깨뜨림 하나를 두고 이름과 step 으로 걸러지는지 본다.
const where = (dir, name) => run(dir, "--where", name).out.trim().split("\n");

test("--where: 성한 이름은 다섯 step 이 다 ok", () => withCopy((dir) => {
  assert.deepEqual(where(dir, "gamma"), ["fetch: ok", "digest: ok", "comparison: ok", "open: ok", "decide: ok"]);
}));

test("--where: 파일이 하나도 없는 이름은 fetch 가 missing 이고 뒤는 -", () => withCopy((dir) => {
  assert.deepEqual(where(dir, "zeta"), ["fetch: missing", "digest: -", "comparison: -", "open: -", "decide: -"]);
}));

test("--where: 덜 한 step 은 missing, 그 뒤는 -", () => withCopy((dir) => {
  edit("digest/gamma.md", "| beta | unrelated | | 기록은 사람이 검사한다. |\n", "")(dir);
  assert.deepEqual(where(dir, "gamma"), ["fetch: ok", "digest: ok", "comparison: missing", "open: -", "decide: -"]);
}));

test("--where: 틀린 step 은 not, 한 step 에 둘이 섞이면 not 이 이긴다", () => withCopy((dir) => {
  edit("digest/gamma.md", "일주일이 지나면 버린다.", "한 달이 지나면 버린다.")(dir);
  edit("digest/gamma.md", "- C1: 옛 기록은 일주일 뒤 버린다.\n", "- C1: 옛 기록은 일주일 뒤 버린다.\n- C2: 인용 없는 claim\n")(dir);
  assert.deepEqual(where(dir, "gamma"), ["fetch: ok", "digest: not", "comparison: -", "open: -", "decide: -"]);
}));

test("step: 그 step 의 실패만 찍고, 다른 step 은 ok 다", () => withCopy((dir) => {
  edit("digest/gamma.md", "| beta | unrelated | | 기록은 사람이 검사한다. |\n", "")(dir);
  const c = run(dir, "comparison", "gamma");
  assert.equal(c.status, 1);
  assert.equal(c.err, "digest/: missing Comparison row: beta and gamma were never compared; the later one carries the row\n\n1 failure(s)\n");
  const d = run(dir, "digest", "gamma");
  assert.equal(d.status, 0, d.err);
  assert.equal(d.out, "ok: digest gamma\n");
}));

test("step: 인자 없는 이름은 다른 이름의 실패를 안 본다", () => withCopy((dir) => {
  edit("digest/gamma.md", "일주일이 지나면 버린다.", "한 달이 지나면 버린다.")(dir);
  assert.equal(run(dir, "digest", "alpha").status, 0);
  assert.equal(run(dir, "digest", "gamma").status, 1);
}));

test("open: 걸린 자리 행은 장의 두 이름과 그 행의 이름에 다 걸린다", () => withCopy((dir) => {
  edit(OPEN, "| digest/beta.md | Comparison 행 alpha | conflict C1↔C1 | | |\n", "")(dir);
  for (const n of ["gamma", "alpha", "beta"]) assert.equal(run(dir, "open", n).status, 1, `open ${n} did not block`);
}));

test("decide: 장의 실패는 두 쪽 이름에 다 걸리고 stance 줄은 상대 이름에도 걸린다", () => withCopy((dir) => {
  edit("digest/beta.md", "  stance: won over alpha#C1 · beta.C1--alpha.C1\n", "")(dir);
  assert.equal(run(dir, "decide", "alpha").status, 1);
  assert.equal(run(dir, "decide", "beta").status, 1);
  assert.equal(run(dir, "decide", "gamma").status, 0);
  edit("digest/gamma.md", "  > 옛 기록은 일주일이 지나면 버린다.\n", "  > 옛 기록은 일주일이 지나면 버린다.\n  stance: lost to alpha#C1 · nope.C1--alpha.C1\n")(dir);
  assert.equal(run(dir, "decide", "alpha").status, 1);
  assert.equal(run(dir, "decide", "gamma").status, 1);
}));

test("이름 없는 step 인자는 usage 를 찍고 exit 2", () => withCopy((dir) => {
  const r = spawnSync(process.execPath, [check, "digest"], { encoding: "utf8", cwd: dir });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^usage: /);
}));

// fail(step, names, file, `msg ${x}`) 와 splitFront 의 errors.push(`msg`) 의 문구 →
// "<file>: msg ..." 에 맞는 정규식. ${...} 자리는 무엇이든 된다
function failMessagePatterns() {
  const src = readFileSync(check, "utf8");
  const out = [];
  const arg = "(?:\\[[^\\]]*\\]|\\w+\\([^)]*\\)|[^,()]+?)";
  const lit = "(`[^`]*`|\"[^\"]*\")";
  const res = [
    new RegExp(`fail\\(\\s*"\\w+"\\s*,\\s*${arg}\\s*,\\s*(?:\`[^\`]*\`|"[^"]*"|[\\w./]+)\\s*,\\s*${lit}\\s*\\)`, "g"),
    new RegExp(`errors\\.push\\(\\s*${lit}\\s*\\)`, "g"),
  ];
  for (const re of res) for (const m of src.matchAll(re)) {
    const tpl = m[1].slice(1, -1);
    const literal = tpl.split(/\$\{[^}]*\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*?");
    out.push({ tpl, re: new RegExp(`^[^\\n]*?: ${literal}$`) });
  }
  return out;
}

test("check.mjs 의 실패 문구마다 깨뜨림이 하나는 있다", () => {
  const patterns = failMessagePatterns();
  assert.ok(patterns.length > 55, `found only ${patterns.length} fail(...) calls; the parser is broken`);
  const lines = [...printed];
  const unhit = patterns.filter((p) => !lines.some((l) => p.re.test(l))).map((p) => p.tpl);
  assert.deepEqual(unhit, [], `no break hits these fail(...) messages:\n  ${unhit.join("\n  ")}`);
});
