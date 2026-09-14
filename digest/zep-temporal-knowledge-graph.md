---
fetched: 2026-09-15
description: |
  충돌 처리: 새 edge 가 옛 edge 와 부딪히는지 LLM 이 찾고, 부딪히면 옛 edge 를 자동으로 무효화하며 새 정보를 우선한다. 사람이 끼지 않는다.
  저장: 원문은 episode 로 그대로 두고, 그 위에 entity 와 edge 의 graph 를 둔다.
  찾기: entity 를 1024차원 vector 로 embedding 해 cosine 유사도, full-text, breadth-first 셋을 섞는다.
  원문: episode 는 손실 없이 그대로 둔다.
---

## Claims

- C1: 원문은 episode 로 손실 없이 그대로 두고 그 위에서 뽑는다.
  > Episodes serve as a non-lossy data store from which semantic entities and relations are extracted.
- C2: 새 edge 가 옛 edge 와 부딪히는지는 LLM 이 찾는다.
  > The system employs an LLM to compare new edges against semantically related existing edges to identify potential contradictions.
- C3: 부딪히면 옛 edge 의 t_invalid 를 자동으로 찍는다.
  > it invalidates the affected edges by setting their $t_{\text{invalid}}$ to the $t_{\text{valid}}$ of the invalidating edge
- C4: 무효화할 때 새 정보를 늘 우선한다.
  > Graphiti consistently prioritizes new information when determining edge invalidation.
- C5: entity 이름을 1024차원 vector 로 embedding 해 cosine 유사도로 찾는다.
  > the system embeds each entity name into a 1024-dimensional vector space
- C6: 찾기는 cosine, full-text, breadth-first 셋을 쓴다.
  > Zep implements three search functions

## Screening

| digest | verdict | reason | quote | hash |
|---|---|---|---|---|
| karpathy-llm-wiki | open | 충돌 처리와 저장 둘 다에서 편이 갈린다 | 자동으로 한쪽을 고르지 않는다 | 52f018d5 |

## Comparison

| digest | verdict | pairs | quote |
|---|---|---|---|
| karpathy-llm-wiki | conflict | conflict C3↔C2, conflict C4↔C3, conflict C5↔C5, overlap C1↔C1 | 새 자료가 옛 주장과 부딪히면 ingest 때 적어 둔다. |
