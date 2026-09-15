# md-holon

바깥 글을 긁어 와 정리해 쌓고, 새 글이 쌓인 것과 부딪히는 자리를 사람이 정하게 하는 저장소. 이 문서는 용어집이다.

## Language

**source**:
URL 에서 긁어 온 본문 markdown. 읽기만 하고 고치지 않는다.
_Avoid_: raw, article, 원문, 소스

**digest**:
source 한 편에서 뽑은 claim 목록 한 장. source 위의 유일한 손으로 두는 층이다.
_Avoid_: summary, page, wiki, 정리, 요약

**claim**:
digest 의 알갱이. 내 말 한 줄과 source 인용 한 토막이 붙고, digest 안에서 바뀌지 않는 번호를 가진다.
_Avoid_: fact, statement, assertion, 주장, 사실

**description**:
digest 앞머리에 붙는 짧은 글로, 새 source 가 이 digest 를 열어 봐야 하는지를 정하는 데 쓰인다. source 파일 머리에도 같은 이름의 필드가 있으나 그것은 긁어 온 도구가 적은 사이트 설명이고, 이 용어는 digest 의 것만 가리킨다.
_Avoid_: abstract, 요약

**ingest**:
새 source 한 편을 저장소에 넣는 한 바퀴. 긁어 오기, digest 쓰기, 쌓인 digest 와 견주기, 검사까지가 한 바퀴다.
_Avoid_: 넣기, 추가, 수집

**screening**:
ingest 의 첫 단계. 새 source 를 앞서 쌓인 digest 의 description 만 보고, digest 마다 open 또는 skip 을 이유와 함께 낸다. 본문은 열지 않는다. 결과는 새 digest 안에 digest 마다 한 줄로 남는다.
_Avoid_: 판정(사람이 충돌에 내리는 답에 남겨 둔다), 거르기, 1차 견줌

**comparison**:
ingest 의 둘째 단계. screening 이 open 으로 낸 digest 만 본문을 열어, 새 digest 의 claim 과 그 digest 의 claim 을 쌍으로 놓고 conflict, overlap, unrelated 중 하나를 낸다. 결과는 새 digest 안에 열어 본 digest 마다 한 줄로 남는다.
_Avoid_: 판정, diff, 2차 견줌

**coverage**:
검사가 확인하는 성질. screening 줄이 앞서 쌓인 digest 전부를 이름으로 빠짐없이 덮고, comparison 줄이 open 된 digest 전부를 덮으며, 줄마다 붙인 인용이 그 description 이나 본문에 글자 그대로 있는 것. 행위가 아니라 스크립트가 확인하는 성질이다.
_Avoid_: 완전성, 다 봤음

**conflict**:
comparison 이 conflict 로 낸 claim 한 쌍. 쌍마다 md 한 장이 서고, 거기에 두 쪽의 인용과 걸린 자리, 사람이 쓰는 의견, 정한 뒤의 결과가 적힌다. 정해져도 장은 남는다.
_Avoid_: 충돌, contradiction, issue

**stance**:
conflict 한 쌍에 사람이 낸 편. conflict 장에 살고, 두 digest 의 머리가 그 장과 편을 한 줄로 가리킨다. claim 은 원문의 말이라 stance 가 나도 바뀌지 않는다.
_Avoid_: verdict(screening 과 comparison 이 내는 판정), decision, 입장, 의견
