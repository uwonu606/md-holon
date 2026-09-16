---
name: decide
description: md-holon 의 conflict 장에 편을 내고 굳힌다. 쓰임, 인용의 분명함 순으로 기준을 지나 stance 를 두 claim 에 더하거나, 못 내면 open 으로 두고 이유를 적는다. 커밋하지 않는다.
disable-model-invocation: true
---

conflict 장에 편을 낸다: `/decide [<장 이름>]`. 이름이 없으면 `status: open` 인 장 전부다. ingest 4단계도 이 파일을 읽어 그대로 따른다. 용어는 `CONTEXT.md`, 장의 문법은 `docs/agents/digest-format.md` 다. 둘을 먼저 읽는다. 판정자는 `scripts/check.mjs` 다.

편은 저장소의 현재 판단이다. 이 세션이 낸다. 앞선 편은 보되 묶이지 않는다. 사람은 나중에 읽고 뒤집는다.

## 1. 장과 두 digest 를 읽는다

장을 읽고, 두 쪽의 digest 두 장을 끝까지 읽는다. 두 쪽 절 밑에 앞선 decided 장이 적혀 있으면 그 장도 읽는다. 풀이 절이 비어 있으면 지금 쓴다. 두 쪽이 각각 무엇을 말하고 어디서 갈리는지 한글로.

## 2. 기준을 순서대로 지난다

첫째, 이 저장소의 쓰임이 고르는 쪽. `CONTEXT.md` 첫 줄이다. 한쪽이 그 쓰임과 같은 모양이고 다른 쪽이 어긋나면 거기서 끝난다. 둘 다 어긋나거나 둘 다 맞으면 다음으로.

둘째, 두 인용 중 더 분명하고 정답에 가까운 쪽. 조건이 붙어 있거나 범위를 말하는 인용이 더 분명하다.

셋째, 그래도 안 갈리면 open 이다.

## 3. 장과 digest 에 쓴다

편을 냈으면 한 번의 편집으로:

- 의견: 어느 쪽인지, 어느 기준에서 갈렸는지, 왜.
- 결과: `<오늘 날짜> <이긴 claim> 편.` 한 줄.
- 머리: `status: decided`, `decided_by: ai`.
- 걸린 자리: 행마다 `action` 과 `reason`. 이 decide 가 고친 자리는 `changed`, 그대로 둔 자리는 `kept`. claim 행 둘은 stance 줄이 붙으니 `changed`, comparison 행과 다른 장은 `kept`. 앞선 decided 장을 뒤집는 것이면 그 장의 행은 `kept` 이고 reason 에 이 장이 뒤집는다고 적는다.
- 두 digest: 각 claim 의 인용 바로 밑에 `stance` 줄 하나. 이긴 쪽은 `won over <진 claim> · <장 이름>`, 진 쪽은 `lost to <이긴 claim> · <장 이름>`. 옛 stance 줄은 두고 밑에 더한다. claim 줄과 인용은 안 건드린다.

못 냈으면 의견에만 쓴다. 어느 기준까지 갔고 왜 안 갈렸는지. 머리와 표와 결과와 digest 는 그대로다.

**완료 기준**: 장마다 `decided` 이거나 의견에 못 낸 이유가 있다.

## 4. 검사하고 멈춘다

`node scripts/check.mjs` 를 돌린다. 실패 줄을 지시로 읽고 고친다. `ok` 줄이 open 장 목록을 찍는다. 커밋하지 않는다. 사람이 diff 를 읽고 커밋한다. 보고에 적는 것: 정한 장과 편과 가른 기준, open 장과 못 낸 이유.

**완료 기준**: `ok` 를 찍었고 보고를 올렸다. 커밋은 없다.
