---
fetched: 2026-09-15
description: |
  충돌 처리: 새 자료가 옛 주장과 부딪히면 LLM 이 적어 두고, lint 때 사람이 본다. 자동으로 한쪽을 고르지 않는다.
  저장: markdown 파일 디렉토리와 index.md. graph db 나 embedding 을 두지 않는다.
  찾기: 소스 100편쯤까지는 index.md 를 먼저 읽고 내려가는 것으로 충분하고, 그 뒤에 로컬 검색기를 붙인다.
  원문: 읽기만 하고 고치지 않는다.
---

## Claims

- C1: 원문은 불변이고 LLM 은 읽기만 한다.
  > These are immutable — the LLM reads from them but never modifies them.
- C2: 새 자료가 옛 주장과 부딪히면 ingest 때 적어 둔다.
  > noting where new data contradicts old claims
- C3: 페이지 사이 모순과 낡은 주장은 lint 에서 사람이 시켜 찾는다.
  > contradictions between pages, stale claims that newer sources have superseded
- C4: 질문에 답할 때 index.md 를 먼저 읽고 페이지로 내려간다.
  > the LLM reads the index first to find relevant pages, then drills into them
- C5: 소스 100편쯤까지는 index 만으로 되고 embedding RAG 가 필요 없다.
  > This works surprisingly well at moderate scale (~100 sources, ~hundreds of pages) and avoids the need for embedding-based RAG infrastructure.
- C6: 사람이 한 편씩 넣으며 관여하는 쪽을 택한다.
  > Personally I prefer to ingest sources one at a time and stay involved

## Screening

| digest | verdict | reason | quote | hash |
|---|---|---|---|---|

## Comparison

| digest | verdict | pairs | quote |
|---|---|---|---|
