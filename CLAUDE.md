## 문서 언어

본문은 한글로 쓴다. 영어로 두는 것은 넷이다. `CONTEXT.md` 의 용어 이름(digest, claim, stance), 명령과 파일 경로, 스크립트가 찍는 문구, 스킬이 정한 절 제목·label·고정 문구다. 코드와 문서와 검사 출력이 같은 이름을 쓰기 위해서다. 바깥 스킬 설치가 놓은 `docs/agents/issue-tracker.md`, `triage-labels.md`, `domain.md` 는 그 틀대로 영어로 둔다.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`uwonu606/md-holon`), driven with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels, each label string equal to its role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Storage layout

`source/`, `digest/`, `conflict/` at the repo root, one digest per source under the same name. Digest grammar and the checks it must pass: `docs/agents/digest-format.md`. `scripts/check.mjs` runs those checks on every commit through `.githooks/pre-commit`; a failing check blocks the commit and prints every failing line.
