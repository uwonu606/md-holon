---
opened: 2026-09-15
status: decided
decided_by: ai
---

# zep-temporal-knowledge-graph#C3 ↔ karpathy-llm-wiki#C2

## 두 쪽

**zep-temporal-knowledge-graph#C3**: 부딪히면 옛 edge 의 t_invalid 를 자동으로 찍는다.
> it invalidates the affected edges by setting their $t_{\text{invalid}}$ to the $t_{\text{valid}}$ of the invalidating edge

**karpathy-llm-wiki#C2**: 새 자료가 옛 주장과 부딪히면 ingest 때 적어 둔다.
> noting where new data contradicts old claims

## 풀이

Zep 은 새 edge 가 옛 edge 와 부딪히면 그 자리에서 옛 edge 에 끝난 시각을 찍는다. 옛 edge 는 지워지지 않고 남되 지금의 사실로는 안 읽힌다. Karpathy 는 부딪힌 자리를 ingest 때 적어 두기만 하고, 어느 쪽이 맞는지는 그때 정하지 않는다. 갈리는 것은 "넣는 자리에서 편까지 내는가, 적어 두고 넘기는가" 다.

## 걸린 자리

| 파일 | 자리 | 무엇 | action | reason |
|---|---|---|---|---|
| digest/zep-temporal-knowledge-graph.md | C3 | claim | changed | won over 줄을 더했다 |
| digest/zep-temporal-knowledge-graph.md | Comparison 행 karpathy-llm-wiki | conflict C3↔C2 | kept | comparison 행은 판정 기록이라 stance 가 나도 그대로다 |
| digest/karpathy-llm-wiki.md | C2 | claim | changed | lost to 줄을 더했다. claim 줄과 인용은 그대로다 |

## 의견

zep-temporal-knowledge-graph#C3 편. 첫 기준(저장소의 쓰임)에서 갈렸다. 이 저장소는 넣는 자리에서 세션이 편을 내고 이긴 것끼리 부딪히지 않게 지키며, 사람은 저장하고 읽고 뒤집는다. 적어 두고 사람에게 넘기는 것이 아니다. 진 claim 이 지워지지 않고 stance 줄로 남는 것도 t_invalid 를 찍고 edge 를 두는 쪽과 같은 모양이다.

## 결과

2026-09-16 zep-temporal-knowledge-graph#C3 편.
