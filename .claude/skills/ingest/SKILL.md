---
name: ingest
description: URL 하나를 md-holon 에 넣는다. source 를 긁어 오고, digest 를 쓰고, 앞선 digest 전부와 견주고, conflict 장을 세우고, 검사를 통과해 커밋한다.
disable-model-invocation: true
---

source 하나를 넣는다: `/ingest <url>`. 용어는 `CONTEXT.md`, 파일 문법은 `docs/agents/digest-format.md` 에 있다. 둘을 먼저 읽는다. 아래 모든 단계의 판정자는 검사 스크립트 `scripts/check.mjs` 다. 규칙이 무슨 뜻인지 흔들릴 때마다 돌리고, 실패 줄을 지시로 읽는다.

## 1. source 를 긁어 온다

`<name>` 을 고른다. kebab-case, 페이지 제목에서, `source/` 안에서 유일하게. 그리고:

```bash
npx defuddle parse <url> --markdown --frontmatter > source/<name>.md
```

`source/<name>.md` 가 이미 있으면 그대로 쓴다. source 는 놓이는 순간부터 읽기만 한다. 오타를 고치려고도 손대지 않는다.

**완료 기준**: `source/<name>.md` 가 있고 frontmatter 에 `source: <url>` 이 있다.

## 2. digest 를 쓴다

source 를 끝까지 읽는다. `digest/<name>.md` 를 쓴다:

- `fetched` 는 오늘의 ISO 날짜이고 frontmatter 의 유일한 key 다.
- claim 은 여섯쯤. source 가 주장하는 것 중 나중 글이 동의하거나 부딪힐 수 있는 것이다. API 사용법과 예시는 건너뛴다. claim 줄은 내 말 한 문장이고, 그 밑의 인용은 source 에서 글자 그대로 옮긴 한 줄이며 `|` 가 없다.
- `## Comparison` 절과 표 머리. 앞선 digest 가 없어도 둔다.

**완료 기준**: `node scripts/check.mjs` 가 `digest/<name>.md` 에 대해 comparison 행이 없다는 것 말고는 아무것도 찍지 않는다.

## 3. 앞선 digest 전부와 견준다

`digest/` 안의 새 것이 아닌 파일마다:

1. 본문을 끝까지 읽는다. `grep -l <그-이름> conflict/` 도 하고 `status: open` 인 장을 전부 읽는다. 그 claim 들은 다투는 중이고 아직 stance 줄이 없다.
2. claim 을 짝짓는다. 둘이 같이 설 수 없으면 `conflict`, 같은 말이면 `overlap`. 마지막 `stance` 줄이 `lost to` 인 claim 과는 짝짓지 않는다. 그 claim 은 이 저장소의 생각이 아니다.
3. 행 하나를 더한다. digest 이름, 가장 센 kind 를 verdict 로(짝이 없으면 `unrelated`), 새 claim 을 왼쪽에 둔 pairs, 그 digest 본문에서 글자 그대로 옮긴 quote.

**완료 기준**: 앞선 digest 마다 행이 정확히 하나 있다.

## 4. conflict 장을 세우고 open 장을 늘린다

- `conflict` 쌍마다 `docs/agents/digest-format.md` 의 틀로 `conflict/<name>.C<n>--<old>.C<m>.md` 를 만든다. `status: open`, 의견과 결과는 주석 그대로 둔다.
- 검사를 돌린다. 검사는 뽑았는데 못 찾은 걸린 자리 행을 전부 찍는다. 새 장의 행과, 이번 행이 건드린 claim 을 이름 부른 앞선 `open` 장의 행이다. 찍힌 행을 `action` 과 `reason` 을 비운 채 글자 그대로 더한다. 검사가 찍지 않은 행은 더하지 않는다.

**완료 기준**: `node scripts/check.mjs` 가 `ok` 를 찍는다.

## 5. 커밋하고 보고한다

`source/`, `digest/`, `conflict/` 를 한 커밋으로 묶는다. pre-commit hook 이 검사를 다시 돌린다. 그리고 보고한다:

- 앞선 digest 가 몇이었는지,
- source 와 앞선 digest 전부의 `wc -m` 합(한 세션이 읽어야 했던 양),
- 어느 conflict 장이 open 인지. conflict 쌍은 여기서 멈춘다. 사람이 장에 의견을 쓰고 `/decide` 를 돌린다.

**완료 기준**: 커밋이 있고 보고를 올렸다.
