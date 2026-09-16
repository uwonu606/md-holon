---
opened: 2026-09-15
status: decided
decided_by: ai
---

# zep-temporal-knowledge-graph#C5 ↔ karpathy-llm-wiki#C5

## 두 쪽

**zep-temporal-knowledge-graph#C5**: entity 이름을 1024차원 vector 로 embedding 해 cosine 유사도로 찾는다.
> the system embeds each entity name into a 1024-dimensional vector space

**karpathy-llm-wiki#C5**: 소스 100편쯤까지는 index 만으로 되고 embedding RAG 가 필요 없다.
> This works surprisingly well at moderate scale (~100 sources, ~hundreds of pages) and avoids the need for embedding-based RAG infrastructure.

## 풀이

Zep 은 이름을 vector 로 바꿔 가까운 것을 찾는다. embedding 이 저장의 한 부분이다. Karpathy 는 소스 백 편쯤까지는 index 파일 하나를 읽는 것으로 되고 embedding 이 필요 없다고 한다. 갈리는 것은 "찾기에 embedding 이 있어야 하는가" 다.

## 걸린 자리

| 파일 | 자리 | 무엇 | action | reason |
|---|---|---|---|---|
| digest/zep-temporal-knowledge-graph.md | C5 | claim | changed | lost to 줄을 더했다. claim 줄과 인용은 그대로다 |
| digest/zep-temporal-knowledge-graph.md | Comparison 행 karpathy-llm-wiki | conflict C5↔C5 | kept | comparison 행은 판정 기록이라 stance 가 나도 그대로다 |
| digest/karpathy-llm-wiki.md | C5 | claim | changed | won over 줄을 더했다 |

## 의견

karpathy-llm-wiki#C5 편. 첫 기준(저장소의 쓰임)에서 갈렸다. 이 저장소는 markdown 파일과 검사 스크립트로 서고, 계층은 데이터가 부를 때 더한다. 지금 digest 셋이고 찾기(query)는 아직 없다. 규모가 부르기 전에 embedding 을 두는 것은 쓰임과 어긋난다. Karpathy 쪽은 규모 조건(~100 sources)이 붙어 있어 인용도 더 분명하다.

## 결과

2026-09-16 karpathy-llm-wiki#C5 편.
