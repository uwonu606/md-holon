# Domain docs

코드를 살피기 전에 읽는 것과, 읽은 뒤 말을 맞추는 법.

## 살피기 전에 읽는다

- 저장소 루트의 **`CONTEXT.md`**: 용어집.
- **`docs/adr/`**: 손댈 영역에 걸린 ADR.

없으면 그냥 지나간다. 없다고 알리거나 먼저 만들자고 하지 않는다. `/domain-modeling` 이 용어나 결정이 실제로 굳을 때 만든다. context 가 여럿인 저장소는 루트에 `CONTEXT-MAP.md` 가 있고 context 마다 `CONTEXT.md` 와 `docs/adr/` 를 갖는데, 이 저장소는 context 하나다.

## 용어집의 말을 쓴다

내는 것(issue 제목, refactor 제안, 가설, 테스트 이름)이 도메인 개념을 부를 때 `CONTEXT.md` 에 정한 용어를 쓴다. 용어집이 _Avoid_ 로 적은 동의어는 쓰지 않는다.

필요한 개념이 용어집에 없으면 신호다. 프로젝트가 안 쓰는 말을 만들고 있거나(다시 생각한다), 진짜 빈 자리다(`/domain-modeling` 을 위해 적어 둔다).

## ADR 과 부딪히면 드러낸다

내는 것이 ADR 과 어긋나면 조용히 덮지 않고 밝힌다.

> _ADR-0007(event-sourced orders)과 어긋나지만 다시 열 만하다. 왜냐하면…_
