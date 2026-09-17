## 문서 언어

본문은 한글로 쓴다. 영어로 두는 것은 넷이다. `CONTEXT.md` 의 용어 이름(digest, claim, stance), 명령과 파일 경로, 스크립트가 찍는 문구, 스킬이 정한 절 제목·label·고정 문구다. 코드와 문서와 검사 출력이 같은 이름을 쓰기 위해서다.

## Agent skills

### Issue tracker

issue 는 이 저장소의 GitHub Issues(`uwonu606/md-holon`)에 있고 `gh` CLI 로 다룬다. `docs/agents/issue-tracker.md`.

### Triage labels

triage label 다섯은 역할 이름과 label 문자열이 같다. `docs/agents/triage-labels.md`.

### Domain docs

context 하나. 저장소 루트의 `CONTEXT.md` 와 `docs/adr/`. `docs/agents/domain.md`.

### Storage layout

데이터(`source/`, `digest/`, `conflict/`)는 별도 저장소 `md-holon-data`(형제 디렉터리 `../md-holon-data`)에 있고 이 저장소는 도구만 갖는다. source 하나에 같은 이름의 digest 하나. digest 문법과 통과해야 할 검사는 `docs/agents/digest-format.md`. `scripts/check.mjs` 는 데이터 루트를 경로 인자나 현재 디렉터리로 받아 실패한 줄을 전부 찍고, `<step> <name>` 으로 step 하나의 gate 를, `--where <name>` 으로 자리를 찍는다(`docs/agents/flow.md`). hook 은 없다. `scripts/open.mjs <name>` 은 open step 이다. comparison 행의 conflict 쌍마다 장을 세우고 앞선 open 장에 걸린 자리 행을 더하며, 풀이·의견·결과는 비워 둔다. 스크립트를 고쳤으면 `node --test "scripts/*.test.mjs"` 로 테스트를 돌린다. GitHub Actions 가 push 마다 같은 테스트를 돌린다.
