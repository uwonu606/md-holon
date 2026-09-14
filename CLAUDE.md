## 문서 언어

언어는 읽는 쪽으로 정한다. 에이전트만 읽는 `docs/agents/*` 는 파일 전체를 영어로 쓴다. 사람이 읽는 문서(issue, `docs/research/`, `CONTEXT.md`)는 한글로 쓰되, 스킬이 정한 절 제목·label·고정 문구는 스킬에 적힌 영어 그대로 옮긴다.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`uwonu606/md-holon`), driven with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels, each label string equal to its role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
