# flow: step 과 gate

용어(step, flow, gate, 그리고 각 step 의 이름)는 `CONTEXT.md` 에 있고, 파일의 모양은 `docs/agents/digest-format.md` 에 있다. 이 문서는 step 이 무엇을 읽어 무엇을 쓰는지, 그 완료를 gate 가 어떻게 판정하는지, flow 가 step 을 어떻게 잇는지를 정한다. 검사 스크립트와 스킬과 flow 스킬이 한 표를 읽게 하기 위해서다.

이 결정의 근거는 [이슈 #18](https://github.com/uwonu606/md-holon/issues/18) 과 `docs/research/interfacing-ai-steps.md` 다.

## step

`<name>` 은 새 source 의 이름이다. 한 flow 는 `<name>` 하나에 대해 돈다.

| step | 하는 이 | 읽는 것 | 쓰는 것 | gate |
|---|---|---|---|---|
| fetch | 스크립트 | URL | `source/<name>.md` | `node scripts/check.mjs fetch <name>` |
| digest | 세션 | `source/<name>.md` | `digest/<name>.md` 의 Claims 절 | `node scripts/check.mjs digest <name>` |
| comparison | 세션 | 앞선 `digest/*.md` 전부, 그 이름을 부른 `status: open` 장 | `digest/<name>.md` 의 Comparison 표 | `node scripts/check.mjs comparison <name>` |
| open | 스크립트 | `digest/<name>.md` 의 Comparison 표, 그 claim 을 부른 `open` 장 | `conflict/<name>.C<n>--<old>.C<m>.md` 의 머리·두 쪽·걸린 자리, 앞선 `open` 장의 걸린 자리 행 | `node scripts/check.mjs open <name>` |
| decide | 세션 | `<name>` 을 두 쪽 중 하나로 가진 `open` 장, 그 두 digest | 장의 풀이·의견·결과·머리·action·reason, 두 digest 의 stance 줄 | `node scripts/check.mjs decide <name>` |

step 의 계약은 이 행 하나다. 읽는 것 밖의 것을 읽지 않고, 쓰는 것 밖의 것을 쓰지 않고, gate 가 0 으로 끝나면 끝난 것이다. 속은 계약이 아니다. 같은 행을 지키면 세션을 스크립트로, 스크립트를 사람으로 바꿔 끼워도 앞뒤 step 은 모른다.

읽는 것이 다르면 다른 step 이고, 하는 이가 다르면 다른 step 이다. digest 와 comparison 은 같은 파일에 쓰지만 읽는 것이 다르고, open 과 decide 는 같은 장에 쓰지만 하는 이가 다르다.

check 와 commit 은 step 이 아니다. check 는 모든 step 뒤에 서는 gate 이고, commit 은 사람이 diff 를 읽고 한다. hook 은 없다. flow 의 마지막에 세션이 인자 없는 check 를 한 번 더 돌리고, 사람은 그 뒤에 커밋한다.

## gate

규칙은 하나이고 부르는 모양이 셋이다. 규칙은 `docs/agents/digest-format.md` 가 정하고, 셀 수 있는 것만 본다. 판단(claim 이 좋은가, verdict 가 맞는가, 편이 옳은가)은 gate 밖이고 사람이 장을 읽고 뒤집는다.

| 부르는 법 | 답하는 물음 | 찍는 것 | exit |
|---|---|---|---|
| `check.mjs <step> <name>` | 이 step 이 끝났나 | 그 step 의 실패 줄 전부 | 0 이면 완료. step 의 완료 기준 |
| `check.mjs --where <name>` | 이 글은 어디까지 왔나 | step 마다 한 단어 | 뜻 없음 |
| `check.mjs [<dir>]` | 저장소 전체가 성한가 | 실패 줄 전부, 또는 `ok` 줄 | 0 이면 성함. flow 의 마지막에 세션이 부른다 |

step gate 는 그 step 만 본다. 앞 step 의 완료는 flow 가 앞 gate 를 지나며 확인한 것으로 본다.

실패 줄은 두 종류이고 문장으로 가른다. 다음 할 일이 다르기 때문이다.

| 종류 | 문장 | 뜻 | 다음 |
|---|---|---|---|
| 덜 했다 | `missing ...` | 있어야 할 것이 없다 | 이 step 을 마저 한다 |
| 틀렸다 | `not ...`, `does not exist`, `not derived`, `not allowed` | 있는데 규칙에 안 맞는다 | 이 step 을 고친다 |

`--where` 는 step 을 왼쪽부터 돌리다 처음 막힌 데서 멈춘다. 단어는 넷이다. `ok` 는 끝났다, `missing ...` 은 덜 했다, `not ...` 은 틀렸다, `-` 는 앞 step 이 `ok` 가 아니라 아직 안 본다. 앞 step 이 덜 됐을 때 뒤 step 의 없는 것을 틀림으로 찍지 않기 위해 `-` 를 둔다. 한 step 에 둘이 섞이면 틀렸다가 이긴다.

세 모양은 한 번의 읽기다. 스크립트는 데이터 루트를 통째로 읽어 실패마다 step 과 `<name>` 을 달아 두고, 인자에 따라 거른다. 인자 없는 모양은 모든 step 과 모든 이름의 합이다. open 과 decide 의 실패는 장의 두 쪽 이름에 다 걸리고, 걸린 자리 행은 그 행의 digest 나 다른 장의 이름에도 걸리고, stance 줄은 상대 claim 의 이름에도 걸린다. `<name>` 하나의 step 을 지나려면 그 이름이 건드린 다른 장의 행까지 봐야 하기 때문이다.

step 이 세는 것에 세 줄이 있다. fetch 는 `source/<name>.md` 가 있고 머리에 `source:` 가 있는 것을 본다. digest 는 source 마다 같은 이름의 digest 가 있는 것을 본다. decide 는 `open` 장에도 의견이 차 있는 것을 본다. open 장은 decide 를 지난 뒤이고, 못 낸 이유가 의견에 있어야 하기 때문이다. 이 셋은 [이슈 #21](https://github.com/uwonu606/md-holon/issues/21) 이 더했다.

## flow

flow 는 step 의 순서 목록이고 얇은 스킬 글이다. step 마다 부를 것 하나(스크립트 또는 step 스킬)와 지날 gate 하나만 적는다. 판단은 step 스킬에 있다. flow 를 읽고 움직이는 것은 세션이다.

flow 는 자리를 어디에도 적지 않는다. 끊긴 flow 는 `--where` 로 파일에서 자리를 도로 세어 이어간다. 별도 orchestrator 와 상태 파일을 두지 않는 이유는 둘이다. 자리의 정본이 파일과 상태 파일 둘이 되고, 세션 step 은 스크립트가 함수처럼 부를 수 없어 orchestrator 가 flow 를 다 쥐지 못한다. 판단 step 이 API 호출이 되어 부를 수 있게 되는 때에 다시 본다.

step 하나만 돌리기는 그 step 의 스크립트나 스킬을 바로 부르는 것이고, 속을 바꿔 끼기는 목록의 한 줄에서 부를 것의 이름을 바꾸는 것이고, step 을 빼고 더하기는 줄을 지우거나 끼우는 것이다.

지금 `.claude/skills/ingest/SKILL.md` 는 다섯 단계를 한 세션에서 죽 돌고 commit 까지 한다. 이 표대로 다시 쓰는 것은 [이슈 #23](https://github.com/uwonu606/md-holon/issues/23) 이다.
