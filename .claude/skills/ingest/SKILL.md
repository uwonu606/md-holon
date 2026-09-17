---
name: ingest
description: URL 하나를 md-holon 에 넣는다. source 를 긁어 오고, digest 를 쓰고, 앞선 digest 전부와 견주고, conflict 장을 세워 편을 내고, 검사를 통과해 커밋한다.
disable-model-invocation: true
---

source 하나를 넣는다: `/ingest <url>`. 용어는 `CONTEXT.md`, 파일 문법은 `docs/agents/digest-format.md` 다. 둘을 먼저 읽는다. 문법은 거기에만 적혀 있고 여기는 순서와, 문법이 정하지 않는 고르는 법만 적는다. 판정자는 `scripts/check.mjs` 다. 규칙의 뜻이 흔들릴 때마다 돌리고 실패 줄을 지시로 읽는다.

## 1. source 를 긁어 온다

`<name>` 을 고른다. kebab-case, 페이지 제목에서, `source/` 안에서 유일하게. 그리고:

```bash
npx defuddle parse <url> --markdown --frontmatter > source/<name>.md
```

`source/<name>.md` 가 이미 있으면 그것을 쓴다. source 는 읽기만 한다.

**완료 기준**: `source/<name>.md` 가 있고 frontmatter 에 `source: <url>` 이 있다.

## 2. digest 를 쓴다

source 를 끝까지 읽고 `digest/<name>.md` 를 쓴다. claim 은 여섯쯤이고, source 가 주장하는 것 중 나중 글이 동의하거나 부딪힐 수 있는 것이다. API 사용법과 예시는 지나간다. Comparison 절은 표 머리만 두고 3단계에서 채운다.

**완료 기준**: `node scripts/check.mjs` 가 `digest/<name>.md` 에 대해 "never compared" 말고는 찍는 것이 없다.

## 3. 앞선 digest 전부와 견준다

`digest/` 안의 새 것이 아닌 파일마다:

1. 본문을 끝까지 읽는다. `grep -l <그-이름> conflict/` 로 나온 `status: open` 장도 읽는다. 그 claim 들은 다투는 중이고 아직 stance 줄이 없다.
2. claim 을 짝짓는다. 둘이 같이 설 수 없으면 `conflict`, 같은 말이면 `overlap`. 짝은 마지막 `stance` 줄이 `won over` 이거나 stance 가 없는 claim 하고 맺는다.
3. 행 하나를 더한다.

**완료 기준**: 앞선 digest 마다 행이 정확히 하나 있다.

## 4. conflict 장을 세우고 편을 낸다

`node scripts/open.mjs <name>` 을 돌린다. `conflict` 쌍마다 장을 세우고, 이번 행이 건드린 claim 을 이름 부른 앞선 `open` 장에 걸린 자리 행을 더한다. 손으로 장을 만들지 않는다. 풀이·의견·결과는 비어 있고 decide 가 쓴다. `node scripts/check.mjs open <name>` 이 `ok` 를 찍어야 다음이다.

open gate 를 지나면 `.claude/skills/decide/SKILL.md` 를 읽고 그대로 따른다. 이 세션이 이어서 하고 subagent 는 안 띄운다. 새 장과, 행이 자란 앞선 open 장이 대상이다.

**완료 기준**: `node scripts/check.mjs` 가 `ok` 를 찍고, 대상 장마다 `decided` 이거나 의견에 왜 못 냈는지가 적혀 있다.

## 5. 커밋하고 보고한다

`source/`, `digest/`, `conflict/` 를 한 커밋으로 묶는다. 커밋 전에 `node scripts/check.mjs` 를 한 번 더 돌린다. 보고에 적는 것:

- 앞선 digest 수,
- source 와 앞선 digest 전부의 `wc -m` 합(한 세션이 읽어야 했던 양),
- 정한 장과 편, open 으로 남은 장과 못 낸 이유. open 목록은 검사의 `ok` 줄이 찍는다. 사람은 장을 읽고 뒤집을 수 있다.

**완료 기준**: 커밋이 있고 보고를 올렸다.
