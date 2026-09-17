// open.mjs 의 테스트. scripts/fixture/ 를 임시 디렉터리에 복사해 장을 지우거나 digest 를 더한 뒤
// open.mjs 를 돌리고, 세운 장이 check.mjs 의 open gate 를 지나는지와 세션 몫이 비어 있는지를 본다.
// 실행: node --test scripts/open.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const open = join(here, "open.mjs");
const check = join(here, "check.mjs");
const fixture = join(here, "fixture");

const run = (script, dir, ...args) => {
  const r = spawnSync(process.execPath, [script, ...args, dir], { encoding: "utf8" });
  return { status: r.status, out: r.stdout, err: r.stderr };
};
function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), "md-holon-open-"));
  cpSync(fixture, dir, { recursive: true });
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const cat = (dir, rel) => readFileSync(join(dir, rel), "utf8");
const today = new Date().toLocaleDateString("sv-SE");

const GAMMA = "conflict/gamma.C1--alpha.C1.md";

test("지운 장을 fixture 와 같은 틀로 다시 세우고 open gate 를 지난다", () => withCopy((dir) => {
  const before = cat(dir, GAMMA);
  unlinkSync(join(dir, GAMMA));
  const r = run(open, dir, "gamma");
  assert.equal(r.status, 0, r.err);
  assert.equal(r.out, `${GAMMA}: created\n`);
  // 세션 몫(풀이, 의견)과 날짜만 다르다
  const expected = before
    .replace("opened: 2026-01-03", `opened: ${today}`)
    .replace("gamma 는 옛 기록을 일주일 뒤 버리고, alpha 는 영원히 둔다. 갈리는 것은 버리는 때다.\n\n", "")
    .replace("편을 못 냈다. 이 fixture 의 쓰임은 버리는 때를 말하지 않는다.\n\n", "");
  const trimEnd = (t) => t.replace(/\n+$/, "\n");
  assert.equal(trimEnd(cat(dir, GAMMA)), trimEnd(expected));
  assert.equal(run(check, dir, "open", "gamma").status, 0);
  assert.equal(run(check, dir, "--where", "gamma").out, "fetch: ok\ndigest: ok\ncomparison: ok\nopen: ok\ndecide: missing\n");
}));

test("있는 장은 다시 쓰지 않는다", () => withCopy((dir) => {
  const before = { gamma: cat(dir, GAMMA), beta: cat(dir, "conflict/beta.C1--alpha.C1.md") };
  const r = run(open, dir, "gamma");
  assert.equal(r.status, 0, r.err);
  assert.equal(r.out, "nothing to write: open gamma\n");
  assert.equal(cat(dir, GAMMA), before.gamma);
  assert.equal(cat(dir, "conflict/beta.C1--alpha.C1.md"), before.beta);
}));

// delta 가 alpha#C1 과 새로 부딪히고 gamma#C1 과 겹친다. 새 장은 앞선 장 둘을 다른 장으로 적고, 앞선 open 장(gamma)에는
// delta 의 comparison 행 둘과 새 장이 행으로 늘고, decided 장(beta)은 그대로다.
function addDelta(dir) {
  writeFileSync(join(dir, "source/delta.md"), '---\ntitle: "delta"\nsource: "https://example.test/delta"\n---\n\n# Delta\n\n옛 기록은 한 달이 지나면 버린다.\n');
  writeFileSync(join(dir, "digest/delta.md"), [
    "---", "fetched: 2026-01-04", "---", "", "## Claims", "",
    "- C1: 옛 기록은 한 달 뒤 버린다.", "  > 옛 기록은 한 달이 지나면 버린다.", "",
    "## Comparison", "", "| digest | verdict | pairs | quote |", "|---|---|---|---|",
    "| alpha | conflict | conflict C1↔C1 | 옛 기록은 영원히 남는다. |",
    "| beta | unrelated | | 기록은 사람이 검사한다. |",
    "| gamma | overlap | overlap C1↔C1 | 옛 기록은 일주일 뒤 버린다. |", "",
  ].join("\n"));
}

test("새 장은 다른 장을 적고, 앞선 open 장에만 행을 더한다", () => withCopy((dir) => {
  addDelta(dir);
  const betaBefore = cat(dir, "conflict/beta.C1--alpha.C1.md");
  const r = run(open, dir, "delta");
  assert.equal(r.status, 0, r.err);
  assert.equal(r.out, [
    "conflict/delta.C1--alpha.C1.md: created",
    `${GAMMA}: 걸린 자리 row added | digest/delta.md | Comparison 행 gamma | overlap C1↔C1 | | |`,
    `${GAMMA}: 걸린 자리 row added | digest/delta.md | Comparison 행 alpha | conflict C1↔C1 | | |`,
    `${GAMMA}: 걸린 자리 row added | conflict/delta.C1--alpha.C1.md | 다른 장 | alpha#C1 | | |`, "",
  ].join("\n"));
  const page = cat(dir, "conflict/delta.C1--alpha.C1.md");
  assert.ok(page.includes("alpha#C1 은 beta.C1--alpha.C1 에서 lost 편 (2026-01-02)\n"), page);
  assert.ok(page.includes("| conflict/beta.C1--alpha.C1.md | 다른 장 | alpha#C1 | | |\n| conflict/gamma.C1--alpha.C1.md | 다른 장 | alpha#C1 | | |\n"), page);
  assert.ok(page.includes("| digest/delta.md | Comparison 행 alpha | conflict C1↔C1 | | |\n"), page);
  assert.ok(!page.includes("gamma#C1"), "overlap 쌍은 장이 아니라 두 쪽에 안 선다");
  const gamma = cat(dir, GAMMA);
  assert.ok(gamma.endsWith("| conflict/beta.C1--alpha.C1.md | 다른 장 | alpha#C1 | | |\n| digest/delta.md | Comparison 행 gamma | overlap C1↔C1 | | |\n| digest/delta.md | Comparison 행 alpha | conflict C1↔C1 | | |\n| conflict/delta.C1--alpha.C1.md | 다른 장 | alpha#C1 | | |\n\n## 의견\n\n편을 못 냈다. 이 fixture 의 쓰임은 버리는 때를 말하지 않는다.\n\n## 결과\n\n"), gamma);
  assert.equal(cat(dir, "conflict/beta.C1--alpha.C1.md"), betaBefore);
  assert.equal(run(check, dir, "open", "delta").status, 0, run(check, dir, "open", "delta").err);
  assert.equal(run(check, dir, "open", "gamma").status, 0);
  // 두 번 돌려도 같다
  const snapshot = [GAMMA, "conflict/delta.C1--alpha.C1.md"].map((f) => cat(dir, f));
  const again = run(open, dir, "delta");
  assert.equal(again.out, "nothing to write: open delta\n");
  assert.deepEqual([GAMMA, "conflict/delta.C1--alpha.C1.md"].map((f) => cat(dir, f)), snapshot);
}));

test("같은 이름의 새 장 둘이 한 claim 을 나누면 서로를 다른 장으로 적는다", () => withCopy((dir) => {
  addDelta(dir);
  const p = join(dir, "digest/delta.md");
  writeFileSync(p, cat(dir, "digest/delta.md")
    .replace("  > 옛 기록은 한 달이 지나면 버린다.\n", "  > 옛 기록은 한 달이 지나면 버린다.\n- C2: 옛 기록은 버린다.\n  > 옛 기록은 한 달이 지나면 버린다.\n")
    .replace("conflict C1↔C1 |", "conflict C1↔C1, conflict C2↔C1 |"));
  const r = run(open, dir, "delta");
  assert.equal(r.status, 0, r.err);
  assert.ok(cat(dir, "conflict/delta.C1--alpha.C1.md").includes("| conflict/delta.C2--alpha.C1.md | 다른 장 | alpha#C1 | | |"));
  assert.ok(cat(dir, "conflict/delta.C2--alpha.C1.md").includes("| conflict/delta.C1--alpha.C1.md | 다른 장 | alpha#C1 | | |"));
  assert.equal(run(check, dir, "open", "delta").status, 0, run(check, dir, "open", "delta").err);
}));

test("digest 가 없으면 missing 을 찍고 exit 1", () => withCopy((dir) => {
  const r = run(open, dir, "zeta");
  assert.equal(r.status, 1);
  assert.equal(r.err, "digest/zeta.md: missing: no such file\n");
}));

test("행이 가리킨 claim 이 없으면 장을 안 세우고 exit 1", () => withCopy((dir) => {
  unlinkSync(join(dir, GAMMA));
  const p = join(dir, "digest/gamma.md");
  writeFileSync(p, cat(dir, "digest/gamma.md").replace("conflict C1↔C1", "conflict C1↔C9"));
  const r = run(open, dir, "gamma");
  assert.equal(r.status, 1);
  assert.match(r.err, /alpha#C9 does not exist/);
}));

test("이름이 없으면 usage 를 찍고 exit 2", () => {
  const r = spawnSync(process.execPath, [open], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^usage: /);
});
