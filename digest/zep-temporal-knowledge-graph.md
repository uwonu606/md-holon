---
fetched: 2026-09-15
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

## Comparison

| digest | verdict | pairs | quote |
|---|---|---|---|
| karpathy-llm-wiki | conflict | conflict C3↔C2, conflict C4↔C3, conflict C5↔C5, overlap C1↔C1 | 새 자료가 옛 주장과 부딪히면 ingest 때 적어 둔다. |
