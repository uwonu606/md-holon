---
fetched: 2026-09-15
---

## Claims

- C1: memory block 은 context window 에 늘 들어 있어 retrieval 이 필요 없다.
  > They are always visible - no retrieval needed.
- C2: block 마다 글자 수 상한이 있다.
  > A `limit`, which is the size limit (in characters) of the block
- C3: description 이 에이전트가 block 을 어떻게 읽고 쓸지 정하는 주된 정보다.
  > The `description` is the main information used by the agent to determine how to read and write to that block.
- C4: block 은 기본이 읽기쓰기이고 read_only 로 잠글 수 있다.
  > Memory blocks are read-write by default (so the agent can update the block using memory tools), but can be set to read-only by setting the `read_only` field to `true`.
- C5: block 하나를 여러 에이전트에 붙이면 공유 메모리가 된다.
  > If multiple agents are attached to a block, they will all have the block data in their context windows (essentially providing shared memory).
- C6: value 를 쓰면 통째로 바뀌고 동시에 쓰면 마지막 쓰기가 이긴다.
  > If multiple processes (agents or external scripts) modify the same block concurrently, the last write wins and overwrites all earlier changes.

## Comparison

| digest | verdict | pairs | quote |
|---|---|---|---|
| karpathy-llm-wiki | overlap | overlap C4↔C1 | 원문은 불변이고 LLM 은 읽기만 한다. |
| zep-temporal-knowledge-graph | overlap | overlap C6↔C4 | 무효화할 때 새 정보를 늘 우선한다. |
