# 저장 배치와 digest 문법

용어(source, digest, claim, ingest, comparison, coverage, conflict, stance, decide)는 `CONTEXT.md` 에 있다. 이 문서는 파일이 어디에 놓이고 digest 와 conflict 장을 어떻게 쓰는지를 정한다. 검사 스크립트, ingest 스킬, decide 스킬이 한 문법을 읽게 하기 위해서다.

## 배치

```
source/<name>.md     defuddle 출력 그대로. 고치지 않는다.
digest/<name>.md     source 하나에 하나, 같은 <name>. ingest 세션이 쓴다.
conflict/<new>.C<n>--<old>.C<m>.md   conflict 쌍 하나에 하나. 아래 conflict 장.
scripts/check.mjs    검사 스크립트. .githooks/pre-commit 이 커밋마다 돌린다(기계 전체 hook dispatcher 가 <repo>/.githooks/<name> 을 부른다).
.claude/skills/ingest/SKILL.md
.claude/skills/decide/SKILL.md
```

`<name>` 은 kebab-case 로 ingest 세션이 고르고, source 와 digest 를 잇는 유일한 고리다. 가리키는 field 는 없다. URL 은 source 의 frontmatter(`source:`)에 있고, defuddle 이 URL 을 받으면 늘 써 준다.

source 의 frontmatter 는 defuddle 의 것이다. 그 안의 `description:` 은 사이트의 meta description 이고 여기서는 아무것도 읽지 않는다.

## digest

```markdown
---
fetched: 2026-09-15
---

## Claims

- C1: <내 말 한 줄>
  > <source 에서 글자 그대로 가져온 한 토막>
  stance: lost to <name>#C<m> · <conflict 파일 이름, .md 없이>
- C2: ...

## Comparison

| digest | verdict | pairs | quote |
|---|---|---|---|
| <name> | conflict \| overlap \| unrelated | <kind> Cn↔Cm, ... | <그 digest 본문에서 글자 그대로 가져온 한 토막> |
```

검사 스크립트가 강제하는 규칙:

- `fetched` 는 ISO 날짜다.
- claim id 는 쓴 순서대로 `C<n>` 이고 digest 안에서 다시 쓰지 않는다. digest 밖에서 claim 은 `<name>#C<n>` 이다. 인용은 claim 바로 밑 blockquote 한 줄이고 `source/<name>.md` 에 글자 그대로(`includes`, 정규화 없음) 있어야 한다.
- Comparison 은 이 digest 보다 앞서 있던 digest 마다 한 행이고, 이름 집합으로 맞춘다. 빠짐, 모르는 이름, 중복은 각각 실패다. ingest 세션은 앞선 digest 의 본문을 전부 연다. screening 단계는 없다. (본문 대신 digest 마다의 요약을 읽는 screening 층은 전부 여는 것이 한 세션에 안 올라갈 때만 돌아온다. 그때의 digest 수는 지도에 적는다.)
- `pairs` 는 `C<n>↔C<m>` 을 나열하고, 새 digest 의 claim 이 왼쪽, 옛 digest 의 claim 이 오른쪽이며, 앞에 kind(`conflict`, `overlap`)를 붙인다. 행의 `verdict` 는 있는 kind 중 가장 센 것이다(conflict > overlap > unrelated). `unrelated` 행은 pairs 가 없다. `quote` 는 그 digest 본문에 글자 그대로 있어야 하고, 가리킨 claim id 는 전부 있어야 한다.
- Comparison 절은 표가 비어도(첫 digest) 있다.
- `stance` 는 claim 의 인용 바로 밑에 붙는 선택 줄이고 여럿일 수 있다. 각 줄은 `stance: lost to <name>#C<m> · <page>` 또는 `stance: won over <name>#C<m> · <page>` 이며, `<page>` 는 `status` 가 `decided` 이고 쌍이 정확히 이 claim 과 그 claim 인 conflict 장이다. 상대 claim 은 거울 줄을 갖는다. 위의 claim 줄과 인용은 바뀌지 않는다. stance 줄은 더해지기만 한다. 앞선 장을 뒤집는 나중 장은 같은 claim 밑에 줄을 더하고 옛 줄을 두므로, 마지막 줄이 지금 편이고 순서에 날짜가 필요 없다. 검사 스크립트는 줄마다 장과 거울을 확인하고, 줄들이 서로 어긋나는 claim 은 판정하지 않는다. 마지막 stance 줄이 `lost` 인 claim 은 여전히 그 source 가 한 말이지만 이 저장소의 생각은 아니다. ingest 와 decide 스킬은 그 위에 세우지 않는다.

## conflict 장

comparison 행의 `conflict` 쌍 하나에 파일 하나이고, 이름은 `<new>.C<n>--<old>.C<m>.md` 로 행에 적힌 그대로 새 digest 가 왼쪽이다. 검사 스크립트는 모든 comparison 행에서 있어야 할 파일 집합을 뽑는다.

```markdown
---
opened: 2026-09-15
status: open | decided
---

# <new>#C<n> ↔ <old>#C<m>

## 두 쪽

**<new>#C<n>**: <그 claim 줄>
> <그 인용>

**<old>#C<m>**: <그 claim 줄>
> <그 인용>

<!-- 두 claim 중 하나를 이름 부른 앞선 decided 장마다 한 줄: -->
<name>#C<n> 은 <conflict 파일 이름> 에서 <side> 편 (<그 장의 opened 날짜>)

## 걸린 자리

| 파일 | 자리 | 무엇 | action | reason |
|---|---|---|---|---|
| digest/<name>.md | C<n> | claim | | |
| digest/<new>.md | Comparison 행 <old> | conflict C<n>↔C<m> | | |
| conflict/<other>.md | 다른 장 | <name>#C<n> | | |

## 의견

<!-- 사람이 쓴다. 어느 쪽인지, 왜인지. -->

## 결과

<!-- 정한 뒤에 쓴다. 날짜와 편 한 줄. -->
```

규칙:

- 절 제목과 표 머리는 고정 문구이고 한글이다. 사람이 이 파일을 읽고 쓰기 때문이다. 뒤의 두 열 이름은 영어다. 검사 스크립트와 사람이 한 낱말을 읽기 위해서다.
- 두 쪽은 각 claim 의 줄과 인용을 digest 에서 글자 그대로 되풀이한다. 그 밑에, 두 claim 중 하나를 이름 부른 앞선 `decided` 장마다 한 줄을 둔다. 읽는 사람이 의견을 쓰기 전에 앞선 stance 를 보게 하기 위해서다. 이미 stance 를 가진 claim 이라도 새 conflict 마다 장은 다시 선다.
- 걸린 자리는 검사 스크립트가 id 만으로 뽑는다. 두 쪽 중 하나의 `<name>#C<n>` 을 이름 부른 모든 claim 줄, 모든 comparison 행, 모든 다른 conflict 장이다. 앞의 세 열은 스크립트의 것이고, `open` 장의 행이 뽑은 집합과 다르면 실패다. `decided` 장은 얼린다. 나중에 뽑히게 된 행(같은 claim 을 이름 부른 나중 장이나 comparison 행)은 그 나중 장에 적히고, decided 장은 어떤 id 로도 안 뽑히는 행이 있을 때만 실패한다. id 가 없는 자리는 적지 않는다.
- `action` 과 `reason` 은 decide 세션이 행마다 채운다. `action` 은 `changed` 또는 `kept` 이고, `reason` 은 한 줄이며 비지 않는다. `open` 장에서는 둘 다 비어 있다.
- 의견은 사람의 것이고 세션은 쓰지 않는다. `status` 가 아직 `open` 인데 의견이 찬 장은 검사에 실패한다. 쓴 의견을 잊지 못하게 하기 위해서다.
- 결과는 의견 뒤에 decide 세션이 쓰고, 같은 편집에서 `status` 를 `decided` 로 바꾼다. 그 편집에서 세션은 두 claim 밑에 `stance` 줄도 하나씩 더한다. claim 줄과 인용은 고쳐 쓰거나 지우지 않는다. 밑의 stance 줄이 유일한 표시다.
- `decided` 장은 모든 `action` 과 `reason` 이 차 있고, 두 claim 밑에 그 장을 이름 부른 `stance` 줄이 있어야 한다(한쪽은 `lost`, 다른 쪽은 `won`). 장이 없거나 아직 `open` 인 `stance` 줄은 실패다.
- 뒤집기: 사람이 앞선 decided 장과 반대 편을 들면 그 앞선 장은 고치지 않는다. 새 장의 걸린 자리에서 그 행은 `kept` 이고 reason 에 이 장이 그것을 뒤집는다고 적으며, 새 stance 줄은 claim 의 옛 줄 밑에 더한다.
- quote 안의 `|` 는 표를 깨뜨린다. 다른 토막을 고른다.

## decide

decide 스킬은 ingest 밖에서, 사람이 장 하나에 의견을 쓴 직후에 돈다. 한 번에 걸린 자리 모든 행의 `action` 과 `reason` 을 채우고, 결과를 쓰고, `status` 를 바꾸고, 두 claim 밑에 `stance` 줄을 더하고, 검사 스크립트를 돌린다. 파일은 커밋하지 않고 둔다. 사람이 diff 를 읽고 커밋한다.
