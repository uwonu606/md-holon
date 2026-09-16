# md-holon

바깥 글을 긁어 와 정리해 쌓고, 새 글이 쌓인 것과 부딪히는 자리를 장으로 세워 편을 내고, 이긴 것끼리 부딪히지 않게 지키는 저장소. 사람은 저장하고, 읽고, 뒤집는다. 이 문서는 용어집이다.

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

**ingest**:
새 source 한 편을 저장소에 넣는 일 전체. 긁어 오기, digest 쓰기, 쌓인 digest 전부와 견주기, 검사까지다. conflict 장은 이 안에서 서고 decide 까지 이 안에서 돈다. 편을 못 낸 장만 open 으로 남는다.
_Avoid_: 넣기, 추가, 수집

**comparison**:
ingest 의 견주기. 앞서 쌓인 digest 전부의 본문을 열어, 새 digest 의 claim 과 그 digest 의 claim 을 쌍으로 놓고 conflict, overlap, unrelated 중 하나를 낸다. 결과는 새 digest 안에 digest 마다 한 줄로 남는다. 본문을 열지 않고 거르는 단계는 지금 없다. 전부 여는 것이 한 세션에 안 올라갈 때 다시 온다.
_Avoid_: 판정, diff, screening

**coverage**:
검사가 확인하는 성질. comparison 줄이 앞서 쌓인 digest 전부를 이름으로 빠짐없이 덮고, 줄마다 붙인 인용이 그 digest 본문에 글자 그대로 있는 것. 행위가 아니라 스크립트가 확인하는 성질이다.
_Avoid_: 완전성, 다 봤음

**conflict**:
comparison 이 conflict 로 낸 claim 한 쌍. 쌍마다 md 한 장이 서고, 거기에 두 쪽의 인용과 걸린 자리, 편을 낸 쪽이 쓰는 의견, 정한 뒤의 결과가 적힌다. 정해져도 장은 남는다.
_Avoid_: 충돌, contradiction, issue

**stance**:
conflict 한 쌍에 낸 편. 누가 냈는지는 장에 적히고, 지금은 세션이 낸다. conflict 장에 살고, 두 claim 의 바로 밑에 진 쪽은 이긴 claim 을, 이긴 쪽은 진 claim 을 그 장과 함께 한 줄로 가리킨다. 더해지기만 하고 고쳐지거나 지워지지 않는다. 같은 claim 밑에 줄이 여럿 쌓이면 마지막 줄이 지금 편이다. claim 은 원문의 말이라 stance 가 나도 바뀌지 않고, 진 claim 은 여전히 그 글이 한 말이지만 이 저장소의 생각으로는 쓰지 않는다.
_Avoid_: verdict(comparison 이 내는 판정), decision, 입장, 의견

**decide**:
conflict 장 하나에 편을 내고 굳히는 일 전체. 세션이 낸다. 먼저 이 저장소의 쓰임이 고르는 쪽, 안 갈리면 두 인용 중 더 분명하고 정답에 가까운 쪽, 그래도 안 갈리면 편을 안 내고 open 으로 두며 왜 못 냈는지 적는다. 편을 내면 걸린 자리마다 무엇을 했는지 적고, 장을 닫고, 두 claim 밑에 stance 를 더한다. ingest 안에서 장이 서는 자리에서 돌고, 따로도 돈다.
_Avoid_: 반영, 전파, 적용
