// Breakage tests for check.mjs. Copies scripts/fixture/ to a temp dir, breaks one thing,
// runs the check on the copy and expects exit 1 plus the failure line it should print.
// The last test reads every fail(...) message in check.mjs and fails if one was never hit.
// Run: node --test scripts/check.test.mjs
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

function run(dir) {
  const r = spawnSync(process.execPath, [check, dir], { encoding: "utf8" });
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

// mutations. edit() refuses to run when the text it wants to change is gone, so a fixture
// edit that silently disarms a break shows up as an error, not a passing test.
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

// [name, mutation, a substring the failure output must contain]
const breaks = [
  // digest frontmatter
  ["digest 머리가 1행에서 안 시작", edit("digest/alpha.md", "---\nfetched", "\n---\nfetched"), "frontmatter must start at line 1 with ---"],
  ["digest 머리가 안 닫힘", edit("digest/gamma.md", "fetched: 2026-01-03\n---", "fetched: 2026-01-03"), "frontmatter is not closed"],
  ["digest 머리에 key: value 아닌 줄", edit("digest/gamma.md", "fetched: 2026-01-03", "fetched: 2026-01-03\nnonsense"), 'frontmatter line is not "key: value": nonsense'],
  ["fetched 가 날짜가 아님", edit("digest/gamma.md", "fetched: 2026-01-03", "fetched: yesterday"), "fetched must be an ISO date"],
  ["digest 머리에 모르는 key", edit("digest/gamma.md", "fetched: 2026-01-03", "fetched: 2026-01-03\nextra: 1"), "frontmatter key not allowed: extra"],
  ["source 없는 digest", remove("source/gamma.md"), "no source/gamma.md"],
  // claims
  ["## Claims 없음", edit("digest/gamma.md", "## Claims", "## Claim"), "missing ## Claims"],
  ["claim 번호에 빈틈", edit("digest/gamma.md", "- C1: 옛 기록은 일주일", "- C2: 옛 기록은 일주일"), "claim ids must run C1, C2, ... without gaps; found C2 where C1 was expected"],
  ["claim 없이 인용만", edit("digest/gamma.md", "## Claims\n\n", "## Claims\n\n  > stray\n"), "excerpt without a claim above it"],
  ["인용이 둘", edit("digest/gamma.md", "  > Old notes are dropped after a week.\n", "  > Old notes are dropped after a week.\n  > Old notes are dropped after a week.\n"), "C1: more than one excerpt"],
  ["인용 한 글자 바꿈", edit("digest/gamma.md", "dropped after a week.", "dropped after a month."), "C1: excerpt is not verbatim in source/gamma.md"],
  ["claim 없이 stance 만", edit("digest/gamma.md", "## Claims\n\n", "## Claims\n\n  stance: lost to alpha#C1 · beta.C1--alpha.C1\n"), "stance line without a claim above it"],
  ["stance 가 인용보다 앞", edit("digest/beta.md", "  > Old notes are replaced by new ones.\n  stance: won over alpha#C1 · beta.C1--alpha.C1", "  stance: won over alpha#C1 · beta.C1--alpha.C1\n  > Old notes are replaced by new ones."), "C1: stance line before the excerpt"],
  ["claim 문법 밖의 줄", edit("digest/gamma.md", "  > Old notes are dropped after a week.\n", "  > Old notes are dropped after a week.\n  note: hi\n"), "line not part of the claim grammar:   note: hi"],
  ["인용 없는 claim", edit("digest/gamma.md", "  > Old notes are dropped after a week.\n", ""), "C1: no excerpt"],
  // comparison table
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
  // coverage
  ["Comparison 행 삭제", edit("digest/gamma.md", "| beta | unrelated | | 기록은 사람이 검사한다. |\n", ""), "beta and gamma were never compared"],
  ["두 digest 가 서로 견줌", edit("digest/beta.md", "| alpha | conflict | conflict C1↔C1, overlap C2↔C2 | 옛 기록은 영원히 남는다. |\n", "| alpha | conflict | conflict C1↔C1, overlap C2↔C2 | 옛 기록은 영원히 남는다. |\n| gamma | unrelated | | 옛 기록은 일주일 뒤 버린다. |\n"), "beta and gamma compare each other"],
  // conflict page set
  ["장 삭제", remove(OPEN), `${OPEN}: missing: a Comparison row has this conflict pair`],
  ["행 없는 장", copy(OPEN, "conflict/gamma.C1--beta.C1.md"), "conflict/gamma.C1--beta.C1.md: no Comparison row has this conflict pair"],
  // conflict page frontmatter
  ["opened 가 날짜가 아님", edit(OPEN, "opened: 2026-01-03", "opened: soon"), "opened must be an ISO date"],
  ["status 가 둘 중 하나가 아님", edit(OPEN, "status: open", "status: pending"), "status must be open or decided"],
  ["장 머리에 모르는 key", edit(OPEN, "status: open", "status: open\nfoo: bar"), "frontmatter key not allowed: foo"],
  ["open 장에 decided_by", edit(OPEN, "status: open", "status: open\ndecided_by: ai"), "open page must not have decided_by"],
  ["decided 장에 decided_by 없음", edit(DECIDED, "decided_by: ai\n", ""), "decided page needs decided_by"],
  // conflict page body
  ["제목의 쌍이 다름", edit(OPEN, "# gamma#C1 ↔ alpha#C1", "# gamma#C1 ↔ alpha#C2"), 'title must be "# gamma#C1 ↔ alpha#C1"'],
  ["절 하나 없음", edit(OPEN, "## 의견", "## 생각"), "missing ## 의견"],
  ["장이 가리킨 claim 이 digest 에 없음", edit("digest/alpha.md", "- C1: 옛 기록은 영원히 남는다.\n  > Old notes are kept forever.\n  stance: lost to beta#C1 · beta.C1--alpha.C1\n", ""), "alpha#C1 does not exist"],
  ["두 쪽의 claim 줄이 다름", edit(OPEN, "**gamma#C1**: 옛 기록은 일주일 뒤 버린다.", "**gamma#C1**: 옛 기록은 버린다."), '두 쪽: missing "**gamma#C1**: <claim line>" verbatim from digest/gamma.md'],
  ["두 쪽의 인용이 다름", edit(OPEN, "> Old notes are dropped after a week.", "> Old notes are dropped."), "두 쪽: excerpt under gamma#C1 is not verbatim from digest/gamma.md"],
  // 걸린 자리
  ["걸린 자리 머리가 다름", edit(OPEN, "| 파일 | 자리 | 무엇 | action | reason |", "| file | 자리 | 무엇 | action | reason |"), "걸린 자리 header must be | 파일 | 자리 | 무엇 | action | reason |"],
  ["걸린 자리 행의 칸이 넷", edit(OPEN, "| digest/gamma.md | C1 | claim | | |", "| digest/gamma.md | C1 | claim | |"), "걸린 자리 row must have 5 cells"],
  ["걸린 자리 행 중복", edit(OPEN, "| digest/gamma.md | C1 | claim | | |\n", "| digest/gamma.md | C1 | claim | | |\n| digest/gamma.md | C1 | claim | | |\n"), "걸린 자리 row duplicated: digest/gamma.md|C1|claim"],
  ["open 장에 action 이 참", edit(OPEN, "| digest/gamma.md | C1 | claim | | |", "| digest/gamma.md | C1 | claim | kept | x |"), "action and reason must be empty while open"],
  ["decided 장의 action 이 둘 중 하나가 아님", edit(DECIDED, "| digest/beta.md | C1 | claim | changed |", "| digest/beta.md | C1 | claim | moved |"), "action must be changed or kept"],
  ["decided 장의 reason 이 빔", edit(DECIDED, "| changed | won over 줄을 더했다 |", "| changed | |"), "reason is empty"],
  ["open 장에 걸린 자리 행 빠짐", edit(OPEN, "| digest/alpha.md | C1 | claim | | |\n", ""), "걸린 자리 missing row: | digest/alpha.md | C1 | claim |"],
  ["id 에서 안 나오는 걸린 자리 행", edit(OPEN, "| digest/alpha.md | C1 | claim | | |\n", "| digest/alpha.md | C1 | claim | | |\n| digest/beta.md | C2 | claim | | |\n"), "걸린 자리 row not derived from ids: | digest/beta.md | C2 | claim |"],
  // 의견 / 결과 / stance mirror
  ["open 장에 결과 씀", edit(OPEN, "## 결과\n", "## 결과\n\n2026-01-03 gamma#C1 편.\n"), "결과 is written but status is open"],
  ["decided 장에 의견 없음", edit(DECIDED, "beta#C1 편. 첫 기준에서 갈렸다. 이 fixture 의 쓰임은 새 것이 옛 것을 간다.\n", ""), "decided without 의견"],
  ["decided 장에 결과 없음", edit(DECIDED, "2026-01-02 beta#C1 편.\n", ""), "decided without 결과"],
  ["decided 인데 새 쪽 stance 없음", edit("digest/beta.md", "  stance: won over alpha#C1 · beta.C1--alpha.C1\n", ""), "decided but beta#C1 has 0 stance lines naming this page (need 1)"],
  ["decided 인데 옛 쪽 stance 없음", edit("digest/alpha.md", "  stance: lost to beta#C1 · beta.C1--alpha.C1\n", ""), "decided but alpha#C1 has 0 stance lines naming this page (need 1)"],
  ["새 쪽 stance 가 다른 claim 을 가리킴", edit("digest/beta.md", "won over alpha#C1 ·", "won over alpha#C2 ·"), "C1: stance names alpha#C2, page beta.C1--alpha.C1 pairs it with alpha#C1"],
  ["옛 쪽 stance 가 다른 claim 을 가리킴", edit("digest/alpha.md", "lost to beta#C1 ·", "lost to beta#C2 ·"), "C1: stance names beta#C2, page beta.C1--alpha.C1 pairs it with beta#C1"],
  ["양쪽 stance 가 같은 말", edit("digest/alpha.md", "stance: lost to beta#C1", "stance: won over beta#C1"), 'both claims say "won over"; one must be lost to, the other won over'],
  // every stance line
  ["stance 가 없는 장을 가리킴", edit("digest/gamma.md", "  > Old notes are dropped after a week.\n", "  > Old notes are dropped after a week.\n  stance: lost to alpha#C1 · nope.C1--alpha.C1\n"), "C1: stance names a conflict page that does not exist: nope.C1--alpha.C1"],
  ["stance 가 open 장을 가리킴", edit("digest/gamma.md", "  > Old notes are dropped after a week.\n", "  > Old notes are dropped after a week.\n  stance: lost to alpha#C1 · gamma.C1--alpha.C1\n"), "C1: stance names a page that is still open: gamma.C1--alpha.C1"],
  ["stance 의 쌍이 장의 쌍이 아님", edit("digest/alpha.md", "  stance: lost to beta#C1 · beta.C1--alpha.C1\n", "  stance: lost to beta#C1 · beta.C1--alpha.C1\n  stance: lost to gamma#C1 · beta.C1--alpha.C1\n"), "C1: stance pair alpha#C1 / gamma#C1 is not the pair of beta.C1--alpha.C1"],
  // prior decided page line in 두 쪽
  ["앞선 decided 장의 줄 없음", edit(OPEN, "alpha#C1 은 beta.C1--alpha.C1 에서 lost 편 (2026-01-02)\n", ""), "두 쪽: no line about the earlier decided page beta.C1--alpha.C1"],
];

const printed = new Set(); // every failure line any break produced

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

// fail(file, `msg ${x}`) → a regex matching "<file>: msg ..." with each ${...} as a wildcard
function failMessagePatterns() {
  const src = readFileSync(check, "utf8");
  const out = [];
  const re = /fail\(\s*(?:`[^`]*`|"[^"]*"|[\w.]+)\s*,\s*(`[^`]*`|"[^"]*")\s*\)/g;
  for (const m of src.matchAll(re)) {
    const tpl = m[1].slice(1, -1);
    const literal = tpl.split(/\$\{[^}]*\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*?");
    out.push({ tpl, re: new RegExp(`^[^\\n]*?: ${literal}$`) });
  }
  return out;
}

test("check.mjs 의 fail 호출마다 깨뜨림이 하나는 있다", () => {
  const patterns = failMessagePatterns();
  assert.ok(patterns.length > 50, `found only ${patterns.length} fail(...) calls; the parser is broken`);
  const lines = [...printed];
  const unhit = patterns.filter((p) => !lines.some((l) => p.re.test(l))).map((p) => p.tpl);
  assert.deepEqual(unhit, [], `no break hits these fail(...) messages:\n  ${unhit.join("\n  ")}`);
});
