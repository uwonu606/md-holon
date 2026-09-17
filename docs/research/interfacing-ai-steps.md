# 세션이 판단하는 단계가 섞인 흐름의 step 계약 조사

md-holon 의 ingest 는 스크립트 단계(fetch, conflict 장의 걸린 자리 뽑기, check)와 세션이 판단하는 단계(digest 쓰기, comparison, decide)가 번갈아 선다. 단계 사이의 계약을 무엇으로 적고 지키는지, 속을 바꿔 끼울 때(세션 → 스크립트, 세션 → 사람) 앞뒤가 모르게 하려면 무엇이 고정돼야 하는지를 1차 자료로 조사했다. 확인일은 2026-09-17 이다. 이슈 #17.

패턴마다 네 가지를 봤다. 경계에 고정되는 것(schema, 파일, 검사기), 완료를 누가 어떻게 확인하는지, 끊긴 실행이 제 자리를 어떻게 아는지, 값(제약과 덧붙는 코드)이다.

## 요약

md-holon 이 이미 가진 셋, 즉 파일 문법(`docs/agents/digest-format.md`), 검사 스크립트(`scripts/check.mjs`), 스킬의 **완료 기준** 줄이 조사한 패턴들이 step 계약으로 두는 것과 같은 자리다. 고칠 것은 형태가 아니라 빈 곳이다. 확신.

- **경계에 고정할 것은 파일 이름·문법과 검사기 둘이고, 단계의 구현은 아무것도 고정하지 않는다.** Unix filter(McIlroy 1978), Snakemake 와 DVC 의 `input`/`output`, Dagster 의 IO manager 가 전부 이 모양이다. 단계는 명령이든 LLM 이든 사람이든 "이 파일들을 읽어 저 파일들을 만든다" 이상을 약속하지 않는다. 확신.
- **완료는 다음 단계가 아니라 검사기가 확인한다.** Snakemake `ensure()`, Dagster asset check 의 `blocking=True`, git `pre-commit`, Claude Code hook 의 exit 2, Anthropic 이 말하는 prompt chaining 의 "gate" 가 같은 자리다. 검사기가 통과시키면 그 단계의 속이 무엇이었든 다음 단계는 모른다. 확신.
- **검사기는 모양만 본다. 판단의 옳음은 못 본다.** OpenAI 와 Anthropic 의 structured outputs 가 보장하는 것은 schema 적합이지 내용이 아니고, LangGraph 의 state schema 는 node 출력을 아예 검사하지 않는다. 세션 단계의 계약은 사후조건(postcondition) 중 스크립트가 셀 수 있는 부분(글자 그대로 인용, coverage, id 정합)까지이고, verdict 가 맞는지는 GD4AI 식 gate 로 오탐을 줄일 뿐 계약 밖이다. 확신.
- **끊긴 실행의 자리는 저장된 결과에서 도로 계산한다.** make 와 Snakemake 는 output 파일의 유무·시각, DVC 는 `dvc.lock` 의 hash, Temporal 은 event history, LangGraph 는 checkpoint 다. md-holon 에서 그 자리는 "어떤 파일이 있고 검사가 무엇을 찍는가" 이고, 지금 ingest 스킬이 2단계 완료를 "`never compared` 말고는 없다" 로 적은 것이 바로 그 방식이다. 이것을 검사기가 단계 이름으로 찍게 하면 재개가 명시적이 된다. 반반.
- **반쯤 쓰인 파일이 완료로 보이는 것이 파일 경계의 고전적 함정이다.** make 매뉴얼이 `.DELETE_ON_ERROR` 를 두는 이유이고, Snakemake 가 `--rerun-incomplete` 를 두는 이유다. digest 한 장이 2단계(claim)와 3단계(comparison)에 걸쳐 자라므로, 검사기가 "미완" 과 "틀림" 을 다른 줄로 찍어야 한다. 확신.
- **단계는 다시 돌려도 같은 끝에 닿아야 한다.** Temporal 은 activity 를 idempotent 하게 만들라 하고, LangGraph 는 interrupt 앞의 side effect 가 재개 때 다시 돈다고 경고한다. fetch 가 있는 source 를 재사용하는 것과 stance 가 더해지기만 하는 것이 이미 그 모양이다. 확신.
- **사람은 또 하나의 구현이고, 속을 바꾸는 데 장치가 필요 없는 것이 계약이 맞다는 증거다.** Temporal 은 activity 의 속을 바꿔도 history 가 안 깨지고(입력과 결과만 기록), asynchronous activity completion 으로 사람이 activity 를 채운다. Prefect 의 `wait_for_input`, Airflow HITL operator 도 사람이 채운 값이 다른 단계와 같은 자리로 들어간다. conflict 장의 `decided_by: ai | <사람>` 이 이미 그 자리다. 확신.

## 계약이라는 말

Meyer 의 Design by Contract 가 틀이다. "A system is made of a number of cooperating components. Design by Contract states that their cooperation should be based on precise specifications -- contracts." 계약은 사전조건(client 의 의무), 사후조건(supplier 의 의무), 불변식 셋이다(https://www.eiffel.org/doc/eiffel/ET-_Design_by_Contract_(tm)%2C_Assertions_and_Exceptions).

파이프라인에 옮기면 단계의 사전조건은 "앞 단계의 출력 파일이 검사를 통과해 있다", 사후조건은 "내 출력 파일이 검사를 통과한다", 불변식은 "저장소 전체가 검사를 통과한다" 다. 세션 단계도 스크립트 단계도 이 세 문장 밖으로 약속하지 않으면 바꿔 끼울 수 있다.

같은 글이 "a routine body should never test for the precondition, since it is the client's responsibility to ensure it" 이라 한다. 단계가 앞 단계의 출력을 제 손으로 다시 검사하지 않고 검사기 하나가 경계에서 한 번 본다는 뜻이다.

## Unix filter, make, hook

가장 오래된 파일 경계 계약이다.

| 장치 | 경계에 고정되는 것 | 완료 확인 | 자리 | 값 |
|---|---|---|---|---|
| Unix filter | 텍스트 스트림. "Expect the output of every program to become the input to another, as yet unknown, program." | exit status 0 | 없음(스트림) | 다음 프로그램을 모르므로 출력에 군더더기를 못 넣는다 |
| make | target·prerequisite 파일 이름 | target 이 있고 prerequisite 보다 새것 | 파일 시각으로 도로 계산 | 실패로 반쯤 쓰인 target 이 완료로 보인다 |
| git pre-commit | hook 의 exit status | 0 이 아니면 commit 이 서지 않는다 | 없음 | `--no-verify` 로 지나갈 수 있다 |

McIlroy 의 네 원칙은 1978 년 Bell System Technical Journal 57(6) 의 UNIX 특집 서문에 있다(https://archive.org/stream/bstj57-6-1899/bstj57-6-1899_djvu.txt, Raymond 의 The Art of Unix Programming 1장이 같은 글을 싣는다 https://cscie2x.dce.harvard.edu/hw/ch01s06.html). "as yet unknown" 이 핵심이다. 출력을 읽을 쪽을 모르므로 계약은 형식 하나로 줄어든다.

make 매뉴얼은 반쯤 쓰인 파일의 함정을 그대로 적는다. "Usually when a recipe line fails, if it has changed the target file at all, the file is corrupted and cannot be used—or at least it is not completely updated. Yet the file's time stamp says that it is now up to date, so the next time make runs, it will not try to update that file." 그래서 `.DELETE_ON_ERROR` 를 두고 "This is almost always what you want" 라 한다(https://www.gnu.org/software/make/manual/html_node/Errors.html).

같은 매뉴얼이 다른 답도 적는다. "it's best to write defensive recipes, which won't leave behind corrupted targets even if they fail. Most commonly these recipes create temporary files rather than updating the target directly, then rename the temporary file to the final target name" (https://www.gnu.org/software/make/manual/html_node/Interrupts.html). `rename(2)` 가 "atomically replaced" 를 보장하기 때문이다(https://man7.org/linux/man-pages/man2/rename.2.html).

git 의 `pre-commit` 은 "Exiting with a non-zero status from this script causes the git commit command to abort before creating a commit" 이다(https://git-scm.com/docs/githooks). md-holon 의 `.githooks/pre-commit` 이 `check.mjs` 를 그대로 `exec` 하니 저장소의 불변식은 이미 commit 단위로 지켜진다.

## Snakemake 와 DVC

파일이 경계이고 단계가 블랙박스 명령인 파이프라인이다. md-holon 과 같은 모양이다.

| | Snakemake | DVC |
|---|---|---|
| 경계 | rule 의 `input:`/`output:` 파일 목록 | stage 의 `deps`/`outs`/`params` |
| 단계의 속 | `shell:` 이나 `script:`, 무엇이든 | `cmd`, 무엇이든 |
| 완료 확인 | output 이 있고 input 보다 새것. 작은 파일은 checksum 비교. `ensure(non_empty=True, sha256=...)` 로 내용 조건 추가 | `dvc.lock` 에 deps·outs 의 hash 를 적고 다음 `repro` 때 비교 |
| 반쯤 쓰인 파일 | 시작할 때 `.snakemake/` 에 미완 표시를 두고 끝나면 지운다. `--rerun-incomplete` 로 미완 job 을 다시 돈다 | "Stage outputs are deleted from the workspace before executing the stage commands that produce them". 실패하면 output 이 없지 낡은 것이 아니다 |
| 속을 바꾸면 | `--rerun-triggers` 기본값에 `code` 가 있어 rule 본문이 바뀌면 다시 돈다 | `dvc.lock` 이 stage 정의도 hash 하므로 `cmd` 가 바뀌면 다시 돈다 |
| 값 | 파일 이름을 미리 다 적어야 한다. 내용 검사는 `ensure()` 만큼만 | lock 파일이 상태의 전부라 lock 을 잃으면 다 다시 돈다 |

Snakemake 는 "Snakemake checks whether the file modification date of any input file is newer than the timestamp of the output file" 로 다시 돌릴지 정하고, `ensure("test.txt", non_empty=True)` 처럼 output 에 조건을 붙일 수 있다(https://snakemake.readthedocs.io/en/stable/snakefiles/rules.html). "Snakemake will check such annotated files before considering a job to be successful" 이라 검사가 완료의 일부다. `ensure()` 가 md-holon 의 `check.mjs` 에 가장 가까운 자리다. 다만 Snakemake 의 것은 파일 하나의 속성이고, `check.mjs` 는 파일 사이의 관계(coverage, 거울 stance)까지 본다.

DVC 는 `dvc repro` 가 "Stages are then checked to decide which ones need to run" 이고 그 판단은 `dvc.lock` 의 hash 다(https://doc.dvc.org/command-reference/repro). 끊긴 자리는 `dvc status` 가 workspace 의 hash 와 lock 을 견줘 `modified`, `deleted`, `new` 로 찍는다(https://doc.dvc.org/command-reference/status). 자리를 lock 파일에서 읽는다. md-holon 은 lock 이 따로 없고 파일 자체가 상태다. 파일이 셋(source, digest, conflict)뿐이라 lock 없이 도로 계산하는 편이 싸다.

## Dagster 와 Prefect

typed step 과 검사 단계를 따로 둔 orchestrator 다.

Dagster 는 asset 함수와 저장을 가른다. "I/O managers in Dagster allow you to keep the code for data processing separate from the code for reading and writing data" 이고, "swapping data stores consists of changing the implementation of the I/O manager. The asset definitions, which only contain transformational logic, won't need to change" 다(https://docs.dagster.io/guides/build/io-managers). asset check 는 asset 이 만들어진 뒤 도는 검사이고 `blocking=True` 면 "if the orders_id_has_no_nulls check fails, the downstream augmented_orders asset won't be materialized" 다(https://docs.dagster.io/guides/test/asset-checks). 검사기가 다음 단계의 문이다.

끊긴 run 은 `FROM_FAILURE` 로 다시 돌리면 "any successful ops will be skipped, but their output will be used for downstream ops" 인데, 그러려면 "an I/O manager that can access outputs from other runs" 가 있어야 한다(https://docs.dagster.io/deployment/execution/run-retries). 결과가 저장소에 있어야 자리를 안다.

Prefect 는 결과를 저장해 두고 같은 입력이면 다시 안 돈다. "Caching refers to the ability of a task run to enter a Completed state and return a predetermined value without actually running the code that defines the task." 기본 cache key 는 입력과 task 의 소스 코드이고, "Caching requires result persistence, which is off by default" 다(https://docs.prefect.io/v3/concepts/caching). 사람 단계는 `pause_flow_run(wait_for_input=Model)` 이고 Pydantic model 이 사람의 입력을 typed 로 받는다. "Prefect automatically creates a Pydantic model containing one field annotated with the type you specified" 이며 재개하면 그 값이 변수로 들어와 멈춘 자리에서 이어진다(https://docs.prefect.io/v3/advanced/interactive).

값은 둘이다. step 을 함수로 감싸야 하고(md-holon 의 세션 단계는 함수가 아니다), 결과를 orchestrator 의 저장소에 두어야 한다. md-holon 에서 그 저장소는 git 이다.

## Temporal

판단이 아니라 실패를 다루는 도구지만, 결정적 부분과 비결정적 부분을 가르는 선이 md-holon 의 스크립트·세션 경계와 같다.

- **선**: "To handle non-deterministic operations like API calls, LLM/AI invocations, database queries, and other external interactions, put them in Activities. Activities execute outside the replay path and are automatically retried" (https://docs.temporal.io/workflow-definition). workflow 코드는 "the same Workflow API calls in the same sequence, given the same input" 이어야 한다.
- **자리**: event history 다. "When the Workflow's code replays, the Commands that are emitted are compared with the existing Event History." activity 결과는 "won't record to the Event History until they return or produce an error" 다(https://docs.temporal.io/activity-definition).
- **멱등**: "Activities should be designed to be safely executed multiple times without causing unexpected side effects." 재시도로 "may even partially complete more than once" 이기 때문이다(https://docs.temporal.io/activity-definition#idempotency).
- **사람**: asynchronous activity completion. "enables the Activity Function to return without the Activity Execution completing" 이고 task token 으로 바깥에서 `handle.complete(value)` 한다(https://docs.temporal.io/develop/python/asynchronous-activity-completion). 사람이 채운 값이 activity 결과와 같은 자리로 들어간다.
- **LLM**: OpenAI Agents SDK 통합에서 "Model calls are always routed through Activities" 다(https://docs.temporal.io/develop/python/integrations/openai-agents). LLM 호출은 비결정적 단계로 두고 결과만 history 에 남긴다.
- **바꿔 끼우기**: activity 의 속을 바꾸는 데는 아무 장치도 필요 없다. history 에는 activity 의 입력과 결과만 있고 그 속은 replay 되지 않는다. 그래서 LLM 호출을 코드나 사람으로 바꿔도 workflow 는 모른다. 순서를 정하는 workflow 코드를 바꿀 때만 아래의 값을 낸다.
- **값**: workflow 코드를 바꾸면 replay 가 깨진다. "If you make a change to your Workflow code that would cause non-deterministic behavior on Replay, you'll need to use one of our Versioning methods" 이고 `patched()` 가 history 에 marker 를 넣는다(https://docs.temporal.io/develop/python/versioning). 실행 중인 history 가 없으면 이 값은 없다. md-holon 은 실행 중 상태를 파일 밖에 두지 않으니 이 값을 안 낸다.

## LangGraph

state schema 가 경계이고 checkpoint 가 자리다.

"The schema of the State will be the input schema to all Nodes and Edges in the graph." node 는 부분 update 를 내고 reducer 가 합친다. `new_value = reducer(left=current_state[key], right=node_update[key])`. 입력·출력 schema 를 내부 schema 와 따로 둘 수 있어 "Internal nodes can pass information that is not required in the graph's input / output" 다(https://docs.langchain.com/oss/python/langgraph/graph-api). 다만 schema 는 node 의 출력을 검사하지 않는다. "Run-time validation only occurs on inputs to the first node in the graph, not on subsequent nodes or outputs" 다(https://docs.langchain.com/oss/python/langgraph/use-graph-api). 경계는 규약이지 강제가 아니다.

사람 단계는 `interrupt()` 다. "The node restarts from the beginning of the node where the interrupt was called when resumed, so any code before the interrupt runs again" 이고, 그래서 "Side effects called before interrupt must be idempotent" 다. checkpointer 와 `thread_id` 가 있어야 하고 `thread_id` 가 "persistent cursor" 다(https://docs.langchain.com/oss/python/langgraph/interrupts). 끊긴 자리는 checkpoint 다. "When a graph node fails mid-execution, LangGraph stores pending checkpoint writes from successful nodes. Resume execution without re-running successful nodes" 이고(https://docs.langchain.com/oss/python/langgraph/checkpointers), functional API 는 "Execution returns to a checkpoint boundary, and the workflow replays forward until it reaches the pause again" 이라 "Design side effects to be idempotent" 를 요구한다(https://docs.langchain.com/oss/python/langgraph/functional-api).

값: 단계가 python 함수여야 하고, 재개 단위가 node 라 node 안에서 끊기면 node 처음부터다. LLM 판단과 코드 판단을 바꿔 끼우는 것은 conditional edge 를 함수로 두는 것이라 자연스럽지만, 그 함수의 출력을 검증하는 층은 schema 뿐이다.

## Agent 만드는 쪽의 지침

| 출처 | 말하는 것 | 자리 |
|---|---|---|
| Anthropic, Building effective agents | prompt chaining 에 "programmatic checks (see 'gate' in the diagram below) on any intermediate steps to ensure that the process is still on track" | 단계 사이의 검사기 |
| Claude Code hooks | hook 은 LLM 판단 없이 도는 결정적 장치. exit 2 가 막고 stderr 를 Claude 에게 보여 준다. `Stop` 에서 exit 2 는 "Prevents Claude from stopping, continues the conversation" | 세션 단계의 완료 기준을 스크립트가 강제 |
| Claude Code best practices | "As a deterministic gate: a Stop hook runs your check as a script and blocks the turn from ending until it passes." 여덟 번 연속 막히면 hook 을 무시하고 끝낸다 | 세션 끝의 문 |
| Claude Code skills | 스크립트는 "Complex logic that needs to run the same way every time", 산문은 "Decision-making logic and judgment calls" | 스크립트 단계와 세션 단계의 가르는 기준 |
| Skill authoring best practices | "Prefer scripts for deterministic operations". "plan-validate-execute": 계획을 구조화된 파일로 쓰고 스크립트로 검증한 뒤 실행 | 파일을 사이에 두고 검사기가 거르는 흐름 |
| OpenAI Agents SDK `deterministic.py` | LLM 이 `good_quality`, `is_scifi` 두 bool 을 typed 로 내고, 그 뒤의 gate 는 plain Python 이다. "Add a gate to stop if the outline is not good quality" | 판단은 LLM, 문은 코드 |
| Claude Agent SDK structured outputs | "the SDK validates the output against it, re-prompting on mismatch. If validation does not succeed within the retry limit, the result is an error" | 검사 실패를 다시 시키는 loop |
| OpenAI Agents SDK guardrails | "output guardrails run on the final agent output", 걸리면 tripwire 로 "The runner immediately raises an exception and halts agent execution" | 출력 검사기가 다음 단계를 막는다 |
| OpenAI / Anthropic structured outputs | "ensures the model will always generate responses that adhere to your supplied JSON Schema" / "guarantee schema-compliant responses through constrained decoding" | 모양의 보장. 내용은 아니다 |

출처는 https://www.anthropic.com/engineering/building-effective-agents, https://code.claude.com/docs/en/hooks, https://code.claude.com/docs/en/best-practices, https://code.claude.com/docs/en/skills, https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices, https://github.com/openai/openai-agents-python/blob/main/examples/agent_patterns/deterministic.py, https://openai.github.io/openai-agents-python/guardrails/, https://code.claude.com/docs/en/agent-sdk/structured-outputs, https://developers.openai.com/api/docs/guides/structured-outputs, https://platform.claude.com/docs/en/build-with-claude/structured-outputs 다.

사람 단계의 재개는 OpenAI Agents SDK 만 적는다. "RunState lets you serialize paused runs and resume them after decisions are made" 이고 `state.approve()` 뒤 "The resumed run continues where it left off" 다(https://openai.github.io/openai-agents-python/human_in_the_loop/). 멈춘 자리를 파일(JSON)로 내보내는 것이니 md-holon 이 파일로 자리를 두는 것과 같은 방향이다.

전부 같은 그림이다. LLM 단계의 출력은 schema 로 모양을 묶고, 결정적 검사기가 문을 지키며, 판단 자체는 산문(prompt, SKILL.md)에 둔다. structured outputs 문서 어느 쪽도 내용의 옳음을 말하지 않는다. md-holon 에서 schema 는 `digest-format.md` 의 markdown 문법이고, 검사기는 `check.mjs`, 산문은 두 SKILL.md 다.

Claude Code hook 이 md-holon 에 주는 것은 하나다. 세션 단계의 완료 기준을 세션이 "돌려 보고 읽는" 것이 아니라 `Stop` hook 이 `check.mjs` 를 돌려 실패하면 세션을 못 끝내게 할 수 있다. "Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens." 지금 `pre-commit` 이 commit 에 대해 하는 일을 세션의 끝에 대해 한다. OpenAI 의 `deterministic.py` 는 md-holon 의 comparison 과 정확히 같은 모양이다. LLM 이 verdict 를 typed 로 내고 코드가 그 값으로 다음을 가른다.

## Karpathy LLM wiki

ingest 와 lint 를 갈랐지만 둘 다 LLM 이 한다. "Lint. Periodically, ask the LLM to health-check the wiki. Look for: contradictions between pages, stale claims that newer sources have superseded, orphan pages with no inbound links" 다. schema 는 "a document (e.g. CLAUDE.md for Claude Code or AGENTS.md for Codex) that tells the LLM how the wiki is structured, what the conventions are, and what workflows to follow" 이고 raw source 는 "immutable — the LLM reads from them but never modifies them" 이다. `log.md` 는 "an append-only record of what happened and when" 이고 접두어를 고정하면 "the log becomes parseable with simple unix tools" 라 한다(https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

계약이라 부를 것은 schema 문서 하나뿐이고 검사기가 없다. md-holon 은 lint 자리에 스크립트를 넣은 셈이다. 가져올 것은 log 의 접두어 발상이다. 단계의 완료를 사람과 스크립트가 같은 줄로 읽는다.

## 비교

| | 경계에 고정되는 것 | 완료 확인 | 자리 | 사람 단계 | 값 |
|---|---|---|---|---|---|
| Unix filter | 텍스트 스트림 | exit 0 | 없음 | 없음 | 출력 형식의 절제 |
| make | 파일 이름 | 파일 유무·시각 | 파일 시각 | 없음 | 반쯤 쓰인 파일 |
| Snakemake | input/output 파일 | 유무·시각·checksum + `ensure()` | `.snakemake/` 메타 | 없음 | 파일 목록 선언 |
| DVC | deps/outs | `dvc.lock` hash | lock 파일 | 없음 | lock 이 상태의 전부 |
| Dagster | asset key + IO manager | asset check(blocking) | materialization 기록 | 없음 | 함수로 감싸기 |
| Prefect | task 시그니처 | 결과 저장 + cache key | 결과 저장소 | `wait_for_input` typed | 결과 저장 켜기 |
| Temporal | activity 시그니처 | event history 기록 | event history replay | async activity completion | 결정성·versioning |
| LangGraph | state schema(입구에서만 검사) | checkpoint | checkpoint + thread_id | `interrupt()` | node 단위 재실행 |
| agent 지침 | JSON schema | gate / hook / guardrail | 없음 | (Claude Code 의 permission) | 내용은 보장 못 함 |
| Karpathy wiki | schema 문서 | 없음(LLM lint) | log.md | 습관 | 검사기 없음 |
| md-holon 지금 | 파일 문법 | `check.mjs` | 파일 유무 + 검사 출력 | `decided_by` | 미완·틀림이 같은 줄 |

## md-holon 에 두는 계약

경계는 파일이고 검사기는 `check.mjs` 다. 이 둘 위에 단계 계약을 이렇게 둔다.

### 고정하는 것

세 겹이고 셋 다 이미 있다. 확신.

| 겹 | 파일 | 역할 |
|---|---|---|
| schema | `docs/agents/digest-format.md` | 파일 이름과 문법. Snakemake 의 input/output, LangGraph 의 state schema 자리 |
| 검사기 | `scripts/check.mjs` | 사후조건과 불변식. Dagster asset check, Snakemake `ensure()`, Anthropic 의 gate 자리 |
| 산문 | `.claude/skills/*/SKILL.md` | 판단하는 법. 계약이 아니라 한 구현의 설명서 |

단계의 계약은 "이 파일들을 읽어 저 파일들을 만들고 `check.mjs` 가 이렇게 찍는다" 한 줄이다. SKILL.md 의 **완료 기준** 이 그 줄이고, 지금 다섯 단계 중 셋(2, 4, 5)은 검사 출력으로 적혀 있고 둘(1, 3)은 파일 상태로 적혀 있다. 다섯 다 검사 출력으로 적으면 세션 단계와 스크립트 단계의 완료가 같은 문장이 된다.

### 단계 입력은 파일뿐

세션 단계가 앞 단계에서 파일에 안 남긴 것을 쓰면 그것이 숨은 결합이고, 그 단계를 스크립트로 바꿔 끼울 때 드러난다. ingest 4단계가 "이 세션이 이어서 하고 subagent 는 안 띄운다" 고 적은 것은 맥락을 세션 기억으로 넘기는 결합이다. 장을 세울 때 쓰는 풀이 절이 이미 그 맥락을 파일에 옮기는 자리이므로, decide 가 풀이만 읽고도 되게 하면 결합이 풀린다. Dagster 가 asset 함수에 저장을 안 보이게 한 것과 같은 방향이다. 확신.

### 검사기가 자리를 찍는다

끊긴 ingest 가 어디까지 왔는지를 사람도 세션도 파일에서 도로 계산한다. 지금은 "`never compared` 말고는 없다" 처럼 실패 줄을 읽어 알아내고, 그것이 make 의 파일 시각과 같은 방식이다. 검사기에 단계 이름을 붙여 찍게 하면 명시적이 된다. 예를 들어 `node scripts/check.mjs --where <name>` 이 `digest: claims ok, comparison missing 2 of 3` 처럼 찍는다. 이름과 모양은 반반, 필요는 확신.

이때 미완과 틀림을 다른 줄로 찍어야 한다. 반쯤 쓰인 digest(Comparison 표가 빈 것)는 "다음 단계가 남았다" 이고, 글자 그대로가 아닌 인용은 "이 단계가 틀렸다" 다. make 의 `.DELETE_ON_ERROR` 문제를 md-holon 에서는 지우는 대신 구분해 찍는 것으로 푼다. digest 한 장이 2·3단계에 걸쳐 자라니 파일을 쪼개는 대신 검사가 가른다. 확신.

### 다시 돌려도 같은 끝

단계마다 재실행이 안전해야 끊긴 자리에서 다시 시작할 수 있다. 지금 상태는 이렇다.

| 단계 | 재실행 | 근거 |
|---|---|---|
| 1 fetch | 안전 | source 가 있으면 재사용 |
| 2 digest | 덮어쓴다 | claim 번호가 바뀌면 뒤의 comparison·conflict 가 깨진다. 검사가 잡는다 |
| 3 comparison | 행을 더한다 | 중복 행은 검사가 잡는다 |
| 4 conflict 장 | 안전 | 검사가 찍은 행만 더한다 |
| decide | 안전 | stance 는 더해지기만 한다 |
| 5 commit | 안전 | pre-commit 이 검사를 다시 돈다 |

2단계만 Temporal 의 "idempotent" 에 안 맞는다. digest 를 다시 쓸 때 claim 번호를 보존하라는 규칙(번호는 "digest 안에서 바뀌지 않는")이 `CONTEXT.md` 에 이미 있으니, 검사가 옛 번호와 새 번호를 대조하지는 못해도 뒤가 깨지면 잡는다. 지금은 이만큼으로 둔다. 확신.

### 사람과 스크립트로 바꿔 끼우기

- **사람**: conflict 장의 `decided_by` 가 Temporal 의 asynchronous activity completion 자리다. 사람이 장을 고치고 stance 를 더하면 검사는 세션이 한 것과 같은 규칙으로 본다. 더 할 것이 없다. 확신.
- **스크립트**: comparison 의 screening 을 스크립트로 넣거나 decide 의 첫째 기준(쓰임)을 규칙으로 옮길 때, 입력은 파일이고 출력은 같은 문법이며 검사기가 같으니 앞뒤가 모른다. 스크립트가 못 채우는 열(풀이, 의견)은 빈 채로 두고 검사가 그 열을 안 보는 것이 지금 문법에 이미 있다(풀이는 "검사는 안 본다"). 확신.
- **검사가 못 보는 것**: verdict 가 맞는지, 편이 옳은지다. structured outputs 의 한계와 같다. GD4AI 식 gate(인용이 글자 그대로 있는가)로 오탐을 줄이는 것까지가 계약이고, 나머지는 사람이 읽고 뒤집는다. 확신.

### 세션 끝의 문

`pre-commit` 이 commit 을 지키듯 Claude Code 의 `Stop` hook 이 세션 끝을 지킬 수 있다. `check.mjs` 가 실패하면 exit 2 로 세션이 못 끝나고 실패 줄을 본다. ingest 스킬이 "실패 줄을 지시로 읽는다" 고 적은 것을 세션의 습관이 아니라 장치로 옮기는 것이다. 다만 open 장이 남는 것은 실패가 아니라 정상이므로 `ok` 줄이 문을 열어 준다. 감. 스킬이 `disable-model-invocation: true` 라 hook 을 스킬 범위로 좁히는 방법을 먼저 봐야 한다.

## 피할 것

- **orchestrator 를 들이는 것.** Dagster·Prefect·Temporal·LangGraph 는 단계를 함수로 감싸고 결과를 제 저장소에 둔다. md-holon 의 단계는 세션이고 저장소는 git 이다. 얻는 것은 typed 시그니처인데 markdown 문법과 검사기가 그 자리를 이미 채운다.
- **lock 파일이나 status 필드로 자리를 적는 것.** DVC 의 lock, conflict 장의 `status` 처럼 적어 두면 파일과 어긋날 수 있다. digest 의 자리는 내용에서 도로 계산한다. conflict 장의 `status` 는 사람이 읽는 값이라 남긴다.
- **검사기에 판단을 넣는 것.** verdict 의 옳음을 LLM 호출로 검사하면 검사기가 결정적이지 않게 되고, Karpathy lint 와 같아진다. 검사기는 셀 수 있는 것만 본다.

덜어낸 것: Airflow HITL operator(task 가 `awaiting_input` 상태로 기다리고 "tasks resume on a human response or on the scheduler's response-timeout sweep", https://airflow.apache.org/docs/apache-airflow/stable/tutorial/hitl.html), Argo `suspend` 템플릿("Once suspended, a Workflow will not schedule any new steps until it is resumed", https://argo-workflows.readthedocs.io/en/latest/walk-through/suspending/), GitHub Actions environment 의 required reviewers("If a job is rejected, the workflow will fail", https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/reviewing-deployments), OpenAI practical guide PDF(본문을 못 읽었다). 셋 다 기다리는 자리를 orchestrator 의 DB 에 두는 방식이라 파일이 경계인 md-holon 과 결이 다르다.
