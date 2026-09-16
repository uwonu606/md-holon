---
opened: 2026-09-15
status: open
---

# zep-temporal-knowledge-graph#C4 ↔ karpathy-llm-wiki#C3

## 두 쪽

**zep-temporal-knowledge-graph#C4**: 무효화할 때 새 정보를 늘 우선한다.
> Graphiti consistently prioritizes new information when determining edge invalidation.

**karpathy-llm-wiki#C3**: 페이지 사이 모순과 낡은 주장은 lint 에서 사람이 시켜 찾는다.
> contradictions between pages, stale claims that newer sources have superseded

## 풀이

Zep 은 부딪히면 늘 새 쪽이 이긴다. 편의 기준이 새로움 하나다. Karpathy 는 부딪힘과 낡음을 넣을 때가 아니라 사람이 lint 를 시킬 때 찾는다. 갈리는 것은 "편을 무엇으로, 언제 내는가" 다. 새로움으로 자동으로 내는가, 사람이 시켜 나중에 찾는가.

## 걸린 자리

| 파일 | 자리 | 무엇 | action | reason |
|---|---|---|---|---|
| digest/zep-temporal-knowledge-graph.md | C4 | claim | | |
| digest/zep-temporal-knowledge-graph.md | Comparison 행 karpathy-llm-wiki | conflict C4↔C3 | | |
| digest/karpathy-llm-wiki.md | C3 | claim | | |
| digest/letta-memory-blocks.md | Comparison 행 zep-temporal-knowledge-graph | overlap C6↔C4 | | |

## 의견

편을 못 냈다. 첫 기준(저장소의 쓰임)이 두 쪽을 다 뺀다. 이 저장소는 새 글이 늘 이기는 규칙을 안 두고 장마다 세션이 기준을 따라 내며, 찾기는 사람이 시키는 lint 가 아니라 ingest 마다의 comparison 이다. 둘째 기준(인용의 분명함)도 안 가른다. 두 인용 다 분명하고, 어느 쪽이 정답에 가까운지는 저장소 밖의 물음이다.

## 결과

<!-- 정한 뒤 세션이 적는다. 날짜와 편 한 줄. 자리마다 한 것은 걸린 자리 표의 action, reason 에. -->
