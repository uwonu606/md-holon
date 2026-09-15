# Issue tracker: GitHub

issue 와 spec 은 이 저장소의 GitHub issue 다. 모든 조작은 `gh` CLI 로 한다. 저장소는 clone 안에서 돌리면 `gh` 가 `git remote -v` 에서 알아낸다.

## 조작

- **만들기**: `gh issue create --title "..." --body "..."`. 여러 줄 본문은 heredoc 으로.
- **읽기**: `gh issue view <number> --comments`. label 도 같이 가져온다.
- **목록**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`. `--label`, `--state` 로 거른다.
- **댓글**: `gh issue comment <number> --body "..."`
- **label 붙이기 / 떼기**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **닫기**: `gh issue close <number> --comment "..."`

스킬이 "publish to the issue tracker" 라고 하면 GitHub issue 를 만든다. "fetch the relevant ticket" 이라고 하면 `gh issue view <number> --comments` 다.

## PR 을 triage 대상으로 보는가

**PRs as a request surface: no.** _(바깥 PR 을 기능 요청으로 보는 저장소면 `yes`. `/triage` 가 이 값을 읽는다.)_

`yes` 이면 PR 도 issue 와 같은 label 과 상태를 `gh pr` 의 같은 이름 명령(`view`, `diff`, `list`, `comment`, `edit`, `close`)으로 지난다. 바깥 PR 은 `authorAssociation` 이 `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, `NONE` 인 것이다. GitHub 은 issue 와 PR 이 번호를 같이 쓰므로 `#42` 는 `gh pr view 42` 를 먼저 해 보고 안 되면 `gh issue view 42` 다.

## Wayfinding operations

`/wayfinder` 가 쓴다. **map** 은 issue 하나이고 그 **child** issue 가 티켓이다.

- **Map**: `wayfinder:map` label 을 단 issue 하나. Notes / Decisions-so-far / Fog 본문을 갖는다. `gh issue create --label wayfinder:map`.
- **Child ticket**: map 의 GitHub sub-issue 로 이은 issue(`gh api` 의 sub-issues endpoint). sub-issue 가 안 되면 map 본문의 task list 에 넣고 child 본문 맨 위에 `Part of #<map>` 을 둔다. label 은 `wayfinder:<type>`(`research`/`prototype`/`grilling`/`task`). 잡으면 모는 사람에게 assign 한다.
- **Blocking**: GitHub 의 **native issue dependency**. UI 에 보이는 정본이다. `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 로 잇고, `<blocker-db-id>` 는 막는 issue 의 **database id** 다(`gh api repos/<owner>/<repo>/issues/<n> --jq .id`. `#number` 도 `node_id` 도 아니다). GitHub 은 `issue_dependencies_summary.blocked_by` 로 아직 열린 blocker 수를 준다. dependency 가 안 되면 child 본문 맨 위의 `Blocked by: #<n>, #<n>` 줄로 대신한다. blocker 가 다 닫히면 풀린 것이다.
- **Frontier query**: map 의 열린 child 를 나열하고(`gh issue list --state open`, map 의 sub-issue / task list 로 좁혀), 열린 blocker 가 있거나(`issue_dependencies_summary.blocked_by > 0`, 또는 `Blocked by` 줄에 열린 issue) assignee 가 있는 것을 뺀다. map 순서에서 첫 것이다.
- **Claim**: `gh issue edit <n> --add-assignee @me`. 세션의 첫 쓰기다.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, 그리고 `gh issue close <n>`, 그리고 map 의 Decisions-so-far 에 context pointer(요지 + link)를 붙인다.
