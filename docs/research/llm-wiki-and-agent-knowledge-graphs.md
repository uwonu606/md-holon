# LLM wiki 와 agent knowledge graph 조사

글을 넣으면 요약하고 주장·개념을 뽑아 저장소에 쌓고, 새 글이 저장된 것과 부딪히면 사람이 정하는 도구를 만들려 한다. 그와 같거나 가까운 접근과 open source 를 1차 자료로 조사했다. 확인일은 2026-09-14 이고, 별 수와 마지막 push 는 그날 `gh api` 로 읽은 값이다.

## 요약

목표에 가장 가까운 것은 Karpathy 의 LLM wiki 패턴이고, 그 위에 graph memory 계열이 쓰는 두 장치를 얹는 것이 맞다. 확신.

- **저장은 markdown wiki 가 맞다.** graph db 계열(Graphiti, Cognee, mem0)은 충돌을 자동으로 처리하려고 만든 것이라 사람이 정하는 자리가 없고, 그 자동 판정이 실전에서 틀린다(Graphiti 는 한 production graph 에서 fact 의 41% 가 invalidated 되었는데 손으로 본 넷 중 셋이 오탐). wiki 계열은 사람이 읽고 고치는 것을 전제로 짜여 있다.
- **충돌은 wiki 계열이 대부분 LLM 에게 "적어 두라"고만 시킨다.** 검증 장치를 둔 것은 GD4AI/obsidian-llm-wiki 하나뿐이다. 그 장치는 "충돌한다는 기존 문장이 그 page 에 글자 그대로 있는가" 와 "출처가 그 주장을 하는가, 남의 말을 전하는가" 두 gate 인데, 이것이 없을 때 9건 중 7건이 오탐이었다. docguard 명세의 "인용이 원문에 글자 그대로 있는지 검사" 와 같은 발상이라 그대로 가져올 만하다.
- **graph 계열에서 가져올 것은 둘이다.** Graphiti 의 "지우지 않고 invalid_at 을 찍는다" 와, entity dedupe 를 "정확 일치 → 임계값 → LLM 판정" 순으로 단계지어 LLM 호출을 줄이는 구조다.
- **사람이 정하는 단계는 status 필드나 review queue 로 구현된다.** 어느 프로젝트도 claim 단위로 사람이 판정을 채우는 표는 갖고 있지 않다. 가장 가까운 것은 atomicstrata 의 review 정책(`contradicted` 인 page 를 hold 하고 approve/reject)과 synthadoc 의 page 상태(`contradicted` → 사람이 `active` 로 돌림)다.

## Karpathy LLM wiki

출처: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f (2026-04 공개, 본문은 "idea file" 이라 구현이 없다).

세 층이다. raw source 는 불변, wiki 는 LLM 이 전부 쓰는 markdown 디렉토리, schema 는 CLAUDE.md 같은 규약 문서다. 연산은 ingest, query, lint 셋이다.

| 연산 | 원문이 말하는 것 |
|---|---|
| ingest | source 를 읽고 summary page 를 쓰고 index 와 entity·concept page 를 고치고 log 에 붙인다. 한 source 가 page 10~15 장을 건드린다. |
| query | index.md 를 먼저 읽고 page 로 내려가 답한다. 좋은 답은 새 page 로 되돌려 넣는다. |
| lint | "contradictions between pages, stale claims that newer sources have superseded, orphan pages" 를 찾게 한다. |

충돌은 세 번 언급되지만 장치는 없다. ingest 가 "noting where new data contradicts old claims" 를 하고 lint 가 page 사이 모순을 찾는다는 것이 전부다. 사람의 자리는 "I prefer to ingest sources one at a time and stay involved" 라는 습관과, 팀 wiki 에 "Possibly with humans in the loop reviewing updates" 라는 한 줄이다.

index.md 만으로 source 100개, page 수백 장까지 embedding 없이 간다고 적었다. 그 뒤로는 qmd 같은 local 검색을 붙이라고 한다.

## LLM wiki 구현들

원문이 장치를 안 주니 구현마다 충돌 처리가 다르다. 사람이 정하는 자리가 있는 것 위주로 골랐다.

### GD4AI/obsidian-llm-wiki

https://github.com/GD4AI/obsidian-llm-wiki — 607★, Apache-2.0, push 2026-09-13, TypeScript Obsidian plugin, 테스트 3993개.

저장은 vault 안 `entities/`, `concepts/`, `sources/` 와 `contradictions/` 디렉토리다. 검색은 wiki-link 위의 Personalized PageRank 이고 embedding 이 없다.

추출 prompt 는 entity 와 concept 을 JSON 으로 받는데, 항목마다 원문 인용 2~4개(`mentions_in_source`)와 `coverage: defined|discussed|named` 가 붙는다(`src/wiki/prompts/ingestion.ts`).

충돌 검출은 조사한 것 중 가장 공들였다. 새 source 가 기존 page 를 건드릴 때 merge prompt 가 항목마다 `kind: complementary|contradictory` 를 내고, contradictory 면 부딪히는 기존 문장을 "copied VERBATIM" 으로 받는다(`src/wiki/prompts/merge.ts`). 그 뒤 두 gate 가 건다(`src/wiki/page-factory/contradiction-gates.ts`).

| gate | 거르는 것 |
|---|---|
| statementOnPage | 인용한 기존 문장이 실제 page 에 있는가. 정규화 후 정확 일치 또는 연속 6단어. |
| verifySourceStance | 작은 LLM 호출 하나로, source 가 그 주장을 하는가 아니면 남의 주장을 전하는가. |

이 파일 머리말이 왜 gate 를 뒀는지 적는다. "of nine contradictions the triage recorded in one night, two were real, three were positions the source only REPORTED... and four conflicted with nothing the page says — the model compared the source against what it knows, not against the page."

부딪힌 page 자체는 고치되 이긴 쪽을 고르지 않는다. merge prompt 규칙이 "conflicts with existing → preserve BOTH with clear attribution" 이라 두 주장을 출처와 함께 병기한다(`src/wiki/prompts/merge.ts` mergeEntityPage 규칙 4). 사람이 정한 뒤 page 를 한쪽으로 고치거나 다른 page 로 전파하는 코드는 없다.

gate 를 못 넘은 항목은 지우지 않고 보통 사실로 강등한다. 통과한 충돌은 `contradictions/<slug>-<date>.md` 에 `status: detected` 로 남고(`src/core/contradiction-record.ts`), 해당 page frontmatter 에 `contradictions:` 목록이 찍힌다.

사람이 정하는 단계는 frontmatter 를 `resolved|suppressed` 로 손으로 바꾸는 것이다. lint 는 열린 record 를 나열만 하고, 자동 해소 코드는 "Nothing ever produced that status" 라며 걷어냈다(`src/wiki/lint/llm-phases/contradiction-phase.ts`). `reviewed: true` 인 page 는 덮어쓰지 않고 새 block 만 초안으로 붙인다.

### atomicstrata/llm-wiki-compiler

https://github.com/atomicstrata/llm-wiki-compiler — 2016★, MIT, push 2026-09-11, TypeScript CLI + SDK + MCP.

review 정책이 진짜 문이다. `.llmwiki/config.json` 에 `"review": {"hold": ["low-confidence", "contradicted", "schema-violating", "provenance-violating"]}` 를 두면, frontmatter 에 `contradictedBy` 가 있는 page 는 live 로 안 가고 `.llmwiki/candidates/` 에 JSON 후보로 멈춘다. `llmwiki review list|show|approve|reject` 로 사람이 처리한다(https://github.com/atomicstrata/llm-wiki-compiler/blob/main/docs/configuration/review-policy.mdx).

approve 는 후보 본문을 글자 그대로 쓰고 LLM 을 다시 부르지 않으며, 도구 안에 후보를 고치는 명령은 없다. 부딪힌 상대 page 는 그대로다(https://github.com/atomicstrata/llm-wiki-compiler/blob/main/docs/cli/review.mdx). `contradicted_by` 는 compile prompt 가 concept 마다 "slugs of other concepts (in this batch or the index) whose evidence conflicts with this one" 으로 내게 한 값이다(`src/compiler/prompts.ts`).

모르는 mode 이름이 오면 compile 을 중단하는 fail-closed 다. 다만 `contradictedBy` 는 compile LLM 이 스스로 내는 값이고 별도 검출기는 문서에서 못 찾았다. 설정이 없으면 전부 바로 쓴다.

### axoviq-ai/synthadoc

https://github.com/axoviq-ai/synthadoc — 1176★, AGPL-3.0, push 2026-09-13, Python + web UI.

page 에 상태 다섯 개가 있다. `draft → active → contradicted / stale → archived`. `active` 로 올린 page 는 보호되어, 부딪히는 source 가 오면 덮어쓰지 않고 `status: contradicted` 로 표시한다. `synthadoc lint report` 가 "Contradicted pages (N) - need review" 를 내고, `workflow run --name contradiction-resolver` 가 양쪽을 합친 rewrite 를 diff 로 보여 주며 "Apply this change?" 를 page 마다 묻는다(https://github.com/axoviq-ai/synthadoc/blob/main/docs/user-quick-start-guide.md). 두 번째 LLM 이 적대적으로 lint 해 page 를 `contradicted` 로 내릴 수도 있다.

### eugeniughelbur/obsidian-second-brain

https://github.com/eugeniughelbur/obsidian-second-brain — 4441★, MIT, push 2026-09-13.

`commands/obsidian-reconcile.md` 가 판정 규칙을 글로 가장 뚜렷이 적었다. 충돌마다 "Which source is newer? Which source is more authoritative? (peer-reviewed > blog post > transcript > opinion) Is this a genuine contradiction or an evolution?" 를 묻고, 이긴 쪽이 분명하면 page 를 고치고 `## History` 를 붙이며, 애매하면 `Conflict - Topic.md` 를 `status: open` 으로 만들어 사용자에게 넘긴다. 기본은 자동 해소이고 사람은 잔여만 본다. 밤에 무인으로 도는 설계라 우리 목표와는 반대 방향이다.

### 그 밖의 구현

| 프로젝트 | ★ / 라이선스 / push | 충돌 처리 | 사람 |
|---|---|---|---|
| SamurAIGPT/llm-wiki-agent https://github.com/SamurAIGPT/llm-wiki-agent | 3516 / MIT / 09-08 | source page 에 `## Contradictions` 절. lint 는 page 20장을 1500자로 잘라 한 prompt 로 모순을 묻는다. | 보고서 저장 여부만 묻는다. |
| Astro-Han/karpathy-llm-wiki https://github.com/Astro-Han/karpathy-llm-wiki | 2226 / MIT / 07-23 | article 안에 `Status: Disputed` / `Status: Outdated` block. "Never silently rewrite history". | lint 가 보고만 하고 안 고친다. |
| alfadur7/llm-wiki-newsroom https://github.com/alfadur7/llm-wiki-newsroom | 116 / MIT / 09-13 | `wiki/contradiction.md` 전체 집계, theme 별 md, `_contradictions.json` 세 층. | ingest 에 "Human Reviewer Gate" 목록이 있고 theme 를 흔드는 충돌이 그 중 하나. |
| vouchdev/vouch https://github.com/vouchdev/vouch | 92 / MIT / 08-23 | claim 마다 content-hash 한 source 인용을 강제. "supersede / contradict / archive" 로 고치고 이력 보존. | "nothing becomes durable knowledge until you approve it". 단 receipt 검증된 claim 은 기본으로 queue 를 건너뛴다. |
| AgriciDaniel/claude-obsidian https://github.com/AgriciDaniel/claude-obsidian | 14876 / MIT / 09-10 | claim ledger 에 `accepted, provisional, contested, unsupported`, evidence 관계 `supports/contradicts/context`. "A changed target is a conflict, never a silent overwrite." | 고위험 claim 은 독립 source 둘을 요구. |
| xoai/sage-wiki https://github.com/xoai/sage-wiki | 605 / MIT | graph edge 가 bi-temporal. 답이 서로 다르면 둘 다 `conflict` 로 `wiki/under_review/` 에 둔다. | 사람이 under_review 를 본다. |
| kytmanov/obsidian-llm-wiki-local https://github.com/kytmanov/obsidian-llm-wiki-local | 822 / MIT / 05-26 | 없다. 코드에 contradict 가 한 번도 안 나온다. | `olw review` 로 초안을 approve/reject/edit. 5번 거절되면 concept 을 막는다. |
| rohitg00 LLM Wiki v2 https://gist.github.com/rohitg00/2067ab416f7bbe447c1977edaaa681e2 | gist, 설계 글 | "supersedes" 관계, 신뢰도 점수와 감쇠. LLM 이 recency·authority·지지 수로 이긴 쪽을 제안. | "The human can override, but the default behavior should usually be right." |
| Pratiyush/llm-wiki https://github.com/Pratiyush/llm-wiki | 389 / MIT | 광고와 달리 `## Contradictions` 절이 있는지 보는 regex 다. | 없음. |

Jagaller/obsidian-llm-wiki-okf 는 GD4AI 의 fork 로 앞선 commit 이 0개이고 OKF 코드가 없다. Google 의 Open Knowledge Format(https://github.com/GoogleCloudPlatform/open-knowledge-format, 432★, Apache-2.0, SPEC v0.2)은 YAML frontmatter 붙은 markdown 디렉토리 규격으로 `sources`, `verified`, `status: draft|stable|deprecated`, `stale_after` 가 있고 contradiction 개념은 없다.

## Graphiti (Zep)

https://github.com/getzep/graphiti — 30,853★, Apache-2.0, push 2026-09-11, v0.30.2 (09-08). 논문 https://arxiv.org/abs/2501.13956.

저장은 graph db(Neo4j, FalkorDB, Neptune, Kuzu 는 deprecated)이고 embedding 은 node·edge 속성으로 graph 안에 둔다. node 는 Episodic(원문 그대로), Entity, Community, edge 는 EntityEdge 가 자연어 `fact` 문장을 든다(`graphiti_core/edges.py`). custom entity·edge type 은 Pydantic 으로 준다.

entity dedupe 는 세 단계다(`graphiti_core/utils/maintenance/node_operations.py`, `dedup_helpers.py`).

| 단계 | 방법 | 값 |
|---|---|---|
| 후보 | name embedding cosine | 상위 15, 0.6 이상 |
| 결정적 | 정규화 이름 정확 일치, MinHash 3-gram Jaccard | Jaccard 0.9, 짧은 이름은 entropy 1.5 미만이면 보호 |
| LLM | `dedupe_nodes` prompt | "Return duplicate_candidate_id = -1 when there is no match or you are unsure" |

충돌은 edge 에 bi-temporal 로 찍는다. `valid_at`/`invalid_at` 은 사건 시각, `created_at`/`expired_at` 은 기록 시각이다. 새 fact 가 오면 같은 node 쌍의 기존 fact 와 graph 전체 hybrid 검색 후보를 한 LLM 호출(`dedupe_edges.resolve_edge`)에 넣어 `duplicate_facts` 와 `contradicted_facts` 를 받고, 겹치는 기간이 있으면 옛 edge 의 `invalid_at` 을 새 edge 의 `valid_at` 으로 놓는다. 지우지 않는다(`edge_operations.py` `resolve_edge_contradictions`). 사람 단계는 없고 `add_episode` 안에서 자동이다.

실전 문제가 이 자동 판정에서 난다.

- issue #1728: "Edge invalidation searches the whole graph, so unrelated facts retire each other". fact 3,950 중 1,616(41%)에 `invalid_at`, 손으로 본 넷 중 셋이 오탐. https://github.com/getzep/graphiti/issues/1728
- issue #1275: dedupe 가 graph 의 node 전부를 LLM 에 보내 context 가 O(n) 으로 커지고 episode 가 조용히 떨어진다. https://github.com/getzep/graphiti/issues/1275
- issue #467: 채팅 40개(150~250단어)에 $0.80. https://github.com/getzep/graphiti/issues/467
- issue #1262: bulk 100건에 1시간. https://github.com/getzep/graphiti/issues/1262

## mem0

https://github.com/mem0ai/mem0 — 65,241★, Apache-2.0, push 2026-09-11, Python v2.0.20 (09-02). 논문 https://arxiv.org/abs/2504.19413.

graph memory 는 open source 에서 빠졌다. 이전 가이드가 "Graph memory is removed from the open-source SDK... All external graph store drivers... (~4000 lines)" 라 적고 유료 Platform 기능으로 옮겼다(https://github.com/mem0ai/mem0/blob/main/docs/migration/oss-v2-to-v3.mdx). 현재 OSS 는 vector store 와 spaCy NER 로 뽑은 entity 링크뿐이다.

충돌 처리도 같이 사라졌다. 논문의 ADD/UPDATE/DELETE/NOOP 판정은 현재 "ADD only" 이고 dedupe 는 MD5 정확 일치뿐이다. 가이드가 "When information changes, the new fact is stored alongside the old one. Retrieval handles ranking" 이라 적는다. 그 결과가 issue 로 온다.

- #4956: 시간에 민감한 속성에서 옛 fact 가 상위로 올라온다. https://github.com/mem0ai/mem0/issues/4956
- #4573: 10,134건을 감사하니 97.8% 가 쓰레기, 같은 hallucination 사본 668개. https://github.com/mem0ai/mem0/issues/4573

이전 graph 판(v1.0.0)은 node 를 cosine 0.9 로 맞추고, 충돌 edge 를 LLM 이 골라 Cypher `DELETE` 로 지웠다. 논문이 말한 "marking them as invalid rather than physically removing them" 과 코드가 달랐다. 사람 단계는 어느 판에도 없다.

## Cognee

https://github.com/topoteretes/cognee — 30,668★, Apache-2.0, push 2026-09-13, v1.5.4 (09-04).

graph db + vector db + relational db 셋을 쓴다. LLM 은 `KnowledgeGraph {nodes, edges}` 를 구조화 출력으로 내고 edge 마다 한 문장 `description` 이 붙는다. entity id 가 이름에서 결정적으로 나오므로(`Entity:<name>`) 문서 사이 병합은 LLM 이 같은 이름을 내는 데 달렸고, 쓰기 시점에 embedding 이나 LLM 판정이 없다. 사후 `consolidate_entities` 가 cosine 0.85 로 묶어 지우는데 문서가 "This pipeline is destructive" 라 적고 `dry_run` 이 있다(https://docs.cognee.ai/guides/memify-entity-deduplication.md).

충돌은 기본 꺼진 두 task 다.

| task | 하는 것 |
|---|---|
| `detect_contradictions` | 건드린 entity 의 1-hop fact 를 `[F#] a rel b` 로 나열해 LLM 에 묻고, `contradicts` edge 를 이유·신뢰도와 함께 추가만 한다. 임계 0.5. |
| `resolve_temporal_contradictions` | 호출자가 `functional_relationships` 로 선언한 관계(예: `ceo_of`)만, `updated_at` 최신을 남기고 옛 것에 `superseded` 를 찍는다. LLM 없음. |

사람 자리는 없다. 문서가 "The system does not automatically resolve conflicts... Only new knowledge resolves conflicts" 라 하고, feedback 은 "a rating steers attention, it does not decide what is true" 다(https://docs.cognee.ai/examples/contradiction-handling.md). node 의 `valid_to` 는 기본 store 하나만 구현되어 있고 검색이 아직 거르지 않는다. issue #4996 은 세션 이력을 매번 다시 처리해 하루 $18 이 든다고 적는다. https://github.com/topoteretes/cognee/issues/4996

## Microsoft GraphRAG

https://github.com/microsoft/graphrag — 35,964★, MIT, push 2026-09-08, v3.1.2 (08-21). README 가 "largely in maintenance mode" 라 적는다. 논문 https://arxiv.org/abs/2404.16130.

저장은 parquet 표(entities, relationships, communities, community_reports, text_units, documents, covariates)와 별도 vector store 다. entity 병합은 (title, type) 정확 일치이고, 모인 description 을 LLM 이 한 문단으로 요약한다. 그 prompt 가 충돌 처리의 전부다. "If the provided descriptions are contradictory, please resolve the contradictions and provide a single, coherent summary."(`prompts/index/summarize_descriptions.py`) embedding 기반 entity resolution 은 maintainer 가 "weren't yet satisfied with the consistency so it was removed" 라 답했다(https://github.com/microsoft/graphrag/issues/847).

claim 추출이 따로 있다. `extract_claims.enabled` 로 켜며 기본은 꺼져 있고 "claim prompts really need user tuning" 이 이유다(https://microsoft.github.io/graphrag/config/yaml/). claim record 는 subject, object, claim_type, status(TRUE/FALSE/SUSPECTED), start_date, end_date, description, source_text 다. 다만 문서 사이 claim 을 맞대는 단계는 없다.

비용 경고가 1차 자료에 있다. README "GraphRAG indexing can be an expensive operation... start small". HippoRAG 2 논문 표 12 에서 MuSiQue indexing 에 입력 토큰 115.5M, 277분(https://arxiv.org/html/2502.14802). `graphrag update` 가 있으나 issue #2540 이 delta 의 id 가 community 에 매달린 채 버려진다고 적는다. 사람 단계와 편집 API 는 없다.

## LightRAG

https://github.com/HKUDS/LightRAG — 39,611★, MIT, push 2026-09-13, v1.5.7 (09-02). 논문 https://arxiv.org/abs/2410.05779.

KV, vector, graph, doc-status 네 저장소가 각각 갈아끼워진다. entity 병합은 정규화 이름 정확 일치이고, description 이 8개 미만이면 그냥 이어 붙이고 넘으면 LLM 요약한다. 그 요약 prompt 가 충돌 규칙을 든다. "first determine if these conflicts arise from multiple, distinct entities... If conflicts within a single entity... attempt to reconcile them or present both viewpoints with noted uncertainty."(`lightrag/prompt.py`) 즉 8개 미만이면 옛 문장과 새 문장이 그대로 공존한다. maintainer 는 갱신 시 "delete obsolete documents before inserting updated versions" 를 권한다(https://github.com/HKUDS/LightRAG/issues/2528).

사람이 고칠 API 는 셋 중 제일 갖춰졌다. `aedit_entity`, `aedit_relation`, `amerge_entities`(concatenate/keep_first/keep_last/join_unique), `adelete_by_doc_id` 와 REST `/graph/entity/edit` 등, 그리고 WebUI. 다만 사후 손질이지 ingest 의 문은 아니다. 이름이 다른 같은 entity 는 병합 못 한다는 issue #1323 이 2025-04 부터 열려 있고, embedding + LLM 자동 병합 PR #3766 은 기본 꺼짐으로 아직 미병합이다.

## HippoRAG

https://github.com/OSU-NLP-Group/HippoRAG — 4,000★, MIT, push 2026-09-03. 논문 https://arxiv.org/abs/2502.14802.

igraph pickle 에 phrase node 와 passage node, OpenIE triple 로 만든 fact edge, cosine 0.8 이상이면 잇는 synonymy edge 를 둔다. entity 병합은 소문자·기호 제거 후 md5 정확 일치이고, 비슷한 이름은 합치지 않고 synonymy edge 로 잇는다. description 도 claim 도 없고 충돌 처리는 없다. 문서 단위 `index`/`delete` 만 있다. indexing 비용은 GraphRAG 의 1/12 수준(9.2M 토큰, 99.5분)이라 스스로 보고한다.

## 참고 영상: Agentic Knowledge Graph Construction (DeepLearning.AI × Neo4j)

출처: https://www.youtube.com/watch?v=TSySS5TFuLY (Machine Learning TV 재업로드, 1:06:28, 강사 Andreas Kollegger). 원문은 `~/workspace/alt/video-notes/agentic-knowledge-graph-from-scratch/transcript.md` (whisper 전사). 이 업로드는 강의의 앞 세 강(지식 그래프 소개, 다중 에이전트 설계, Google ADK 기초)까지이고, 실제 추출과 구축을 다루는 4~8강은 없다.

충돌 처리는 한 마디도 없다. 가져갈 것은 그래프의 모양과 추출 앞의 계획 단계다.

| 배운 것 | 영상이 말하는 것 | 이 도구에 닿는 자리 |
|---|---|---|
| 그래프를 셋으로 나눈다 [12:18-14:01] | 구조화 데이터의 domain graph, 원문 chunk 의 lexical graph, chunk 에서 뽑은 entity 와 fact 의 subject graph. 셋을 연결한다 | 원문(불변)과 뽑은 주장·개념을 다른 층에 두고 인용으로 잇는 것과 같은 나눔 |
| 추출 전에 계획을 적는다 [21:39-22:41] | unstructured 쪽은 "어떤 entity 와 fact 를 뽑을 수 있는가"를 먼저 knowledge extraction plan 으로 적고, 실제 추출은 그 뒤 도구가 한다 | 주장·개념의 종류를 먼저 정하고 뽑는 순서 |
| 제안자와 비평자 쌍 [20:13-21:01] | schema 제안 에이전트와 비평 에이전트가 안에서 돌며 schema 를 다듬고, 사용자 목표에 맞는지 본다 | 뽑은 주장을 사람에게 보이기 전에 한 번 거르는 자리로 쓸 수 있으나, 판정을 대신하면 안 된다 |
| 사용자 확인점 [16:51], [19:10-20:13] | 에이전트가 넘어갈 때마다 사용자 checkpoint 가 가능하고, 파일 제안은 사용자가 승인해야 다음으로 간다 | 사람이 정하는 자리가 흐름 안에 있다는 점은 같으나, 승인 대상이 파일과 schema 이지 주장 하나하나가 아니다 |
| 에이전트는 제어 흐름 연산자 [14:10-15:38] | loop 안에서 LLM 이 정하고 코드가 실행한다. 느리고 비결정적이고 비싸다 | 판정을 사람이 하고 LLM 호출을 줄이는 쪽으로 기우는 근거 |

Neo4j 와 Google ADK 에 묶인 강의라 저장소 선택의 근거로는 약하다. 그래프 db 가 필요한 이유로 든 것은 관계를 pattern match 로 묻는 것(추천, root cause) [03:18-09:51]인데, 이 도구의 물음은 "이 주장이 저장된 것과 부딪히는가"라 그 물음이 아니다.

## 인접 프로젝트

| 프로젝트 | ★ / 라이선스 | 요점 |
|---|---|---|
| rohitg00/agentmemory https://github.com/rohitg00/agentmemory | 28,405 / Apache-2.0 | "contradiction detection" 은 Jaccard 단어 집합 유사도 0.9 초과면 옛 것을 `isLatest=false` 로 내리는 것이다(`src/functions/auto-forget.ts`). 근사 중복 제거이지 의미 충돌이 아니다. |
| basicmachines-co/basic-memory https://github.com/basicmachines-co/basic-memory | 3,950 / AGPL-3.0 | markdown 노트 + MCP. 충돌은 파일 sync 충돌뿐. |
| letta-ai/letta https://github.com/letta-ai/letta | 24,724 / Apache-2.0 | memory block 은 last write wins. 검출도 승인도 없다(https://docs.letta.com/guides/agents/memory-blocks). |
| stanford-oval/inconsistency-detection https://github.com/stanford-oval/inconsistency-detection | 19 / Apache-2.0 | EMNLP 2025. atomic claim 추출 → 증거 검색 → 일관/불일치 판정. 연구 코드. |
| datarootsio/knowledgebase_guardian https://github.com/datarootsio/knowledgebase_guardian | 23 / MIT, 2023 | 넣기 전에 비슷한 문서를 찾아 LLM 이 충돌을 보고, 충돌이면 넣지 않고 log 만 남긴다. 사람 없음. |
| VectifyAI/OpenKB https://github.com/VectifyAI/OpenKB | 4,504 / Apache-2.0 | "contradictions are flagged" 만 적혀 있다. |

## 비교

| | 저장 | 추출 단위 | entity dedupe | 충돌 검출 | 충돌 처리 | 사람 |
|---|---|---|---|---|---|---|
| Karpathy gist | markdown | page | 없음(LLM 재량) | lint 에서 LLM 재량 | 적어 둔다 | 습관으로만 |
| GD4AI | markdown + `contradictions/` | entity·concept + 인용 | slug 충돌 resolver | merge prompt + 2 gate | record 파일 `status: detected` | frontmatter 를 손으로 바꿈 |
| atomicstrata | markdown + candidates JSON | page | 없음 | LLM 이 `contradictedBy` 냄 | page 를 hold | review approve/reject |
| synthadoc | markdown + web | page | 없음 | ingest + 적대적 lint | `status: contradicted` | diff 승인 |
| Graphiti | graph db | 자연어 fact edge | cosine→MinHash→LLM | 한 LLM 호출 | `invalid_at` 찍음 | 없음 |
| mem0 OSS | vector | fact 문장 | MD5 | 없음 | 쌓아 둠 | 없음 |
| Cognee | graph+vector+relational | edge description | 이름 id, 사후 cosine 0.85 | opt-in LLM | `contradicts` edge 추가 | 없음 |
| GraphRAG | parquet | entity description, claim | (title,type) 정확 | 요약 prompt 한 줄 | 요약에 녹임 | 없음 |
| LightRAG | 4 store | entity description | 이름 정확 | 요약 prompt(8개 이상일 때) | 병존 또는 요약 | 사후 edit API |
| HippoRAG | igraph | triple | md5 + synonymy edge | 없음 | 없음 | 없음 |

## 가져올 것

- **인용을 원문에 대는 gate.** GD4AI 의 statementOnPage 가 오탐 9 중 4 를 걸렀다. docguard 명세의 dropped 검사와 같은 발상이라 이미 맞는 방향이다.
- **출처의 stance 검사.** "source 가 주장하는가, 전하는가" 를 따로 묻는 것이 9 중 3 을 걸렀다. 요약·주장 추출 prompt 에 "reported vs held" 구분을 넣거나 둘째 호출에 얹을 만하다.
- **지우지 않고 무효화한다.** Graphiti 의 `invalid_at`, Astro-Han 의 `Status: Outdated`, vouch 의 supersede. 사람이 정한 뒤에도 진 쪽을 이력으로 남긴다.
- **dedupe 는 단계로.** 정확 일치 → 값 임계 → LLM 판정 순으로, LLM 은 "unsure 면 -1" 을 내게 한다. Graphiti 의 세 단계.
- **review 는 fail-closed.** atomicstrata 처럼 hold 조건에 모르는 값이 오면 멈춘다. 검토된 page 는 덮어쓰지 않고 새 block 만 붙인다(GD4AI `reviewed: true`, synthadoc `active` 보호).
- **entity 페이지는 이름 정확 일치를 기본으로.** GraphRAG·LightRAG·Cognee 셋 다 그렇고, 논문은 중복이 커뮤니티에서 같이 묶여 크게 해롭지 않다고 적는다. 사람이 읽는 wiki 라면 같은 것을 다른 이름으로 두 장 만든 것을 lint 가 보여 주면 된다.

## 피할 것

- **graph 전체를 후보로 넣는 자동 무효화.** Graphiti #1728 의 41%. 후보는 같은 대상(같은 node 쌍, 같은 concept page)으로 좁힌다.
- **충돌을 요약 prompt 에 녹이기.** GraphRAG·LightRAG 방식은 어느 쪽이 이겼는지가 사라진다. 사람이 정할 재료를 없앤다.
- **"저장만 하고 검색이 알아서".** mem0 ADD-only 의 #4956, #4573. 시간에 민감한 주장에서 옛 것이 위로 온다.
- **정확 일치 hash 를 dedupe 로 믿기.** Cognee #4996 처럼 LLM 이 매번 다르게 쓰면 hash 가 안 맞아 비용이 무한히 든다.
- **자동 해소를 기본으로 두고 사람은 잔여만.** second-brain, rohitg00 v2, agentmemory. 우리 원칙과 반대다.
- **dedupe 에 node 전부를 LLM 에 보내기.** Graphiti #1275. 후보를 먼저 값으로 자른다.

덜어낸 것: 각 프로젝트 prompt 원문 인용, Zep·mem0 논문 지표, HippoRAG 1 논문, OKF SPEC 필드 전체, Khoj.
