# md-holon

## Destination

바깥 글 두세 편을 긁어 와 정리해 쌓고, 그중 부딪히는 자리 하나를 충돌 장으로 보이고, 사용자의 의견대로 모든 계층이 고쳐지는 한 바퀴가 실제로 돈 tracer bullet. 그 한 바퀴에서 굳은 저장 모양과 계층이 결과다.

## Notes

- 새 저장소에 처음부터 만든다. 참고한 자료(`docs/research/llm-wiki-and-agent-knowledge-graphs.md`)는 발상만 빌리고 규약은 빌리지 않는다.
- 계층은 미리 정하지 않는다. LLM 이 한 번에 못 올리는 것을 올리게 압축한 것이 계층이고, 데이터가 부를 때 더하고 뺀다.
- 결정론은 둘이다. 인용이 원문에 글자 그대로 있는가. 새 글을 넣을 때 견줌이 쌓인 것 전부를 덮었는가. 둘 다 스크립트가 검사하고, 정리와 고치기는 Claude Code 세션이 스킬을 따라 한다.
- 충돌은 사람이 정한다. 도구는 자리를 보이고 의견을 받아 고친다.
- 원문은 읽기만 한다.
- 세션마다 grilling 과 domain-modeling 스킬을 쓴다. 용어는 새 저장소의 CONTEXT.md 에 그때그때 적는다.
- 정한 것: 첫 쓰임은 첫 글을 고르며 드러나게 둔다. 충돌은 별도 md 한 장에 두 쪽과 걸린 자리를 적고 사용자가 거기에 의견을 쓴다.

## Decisions so far

- [새 저장소를 연다](issues/01-repo.md): md-holon, `~/workspace/alt/md-holon`. holon 은 온전한 부분, md 는 안의 불변 조건.
- [URL 에서 본문을 md 로 긁어 오는 방법](issues/03-scrape.md): defuddle(`npx defuddle parse <url> --markdown --frontmatter`). 로컬, 두 번 돌려 byte 같음, 문서 페이지의 code block 을 지킴. 기사만이면 trafilatura 가 더 깨끗. 반반, 표본이 URL 둘. 조사는 `docs/research/url-to-markdown.md`.

## Not yet specified

- 계층을 더하고 빼는 규칙. 어떤 신호가 새 계층을 부르고, 어떤 계층이 의미 없어 지워지는가. 첫 바퀴가 돌아야 보인다.
- 둘째 글부터의 운영. 글이 수십 편이 됐을 때 맨 위 계층이 여전히 한 번에 올라가는가.
- 쌓인 것을 찾아 읽는 방법(query). 첫 바퀴에는 없다.
- 첫 쓰임이 내 생각 기록인지 프로젝트 문서인지. 첫 글을 고르면 드러난다.

## Out of scope

- docguard 와 잇는 것. 이 저장소가 서고 나서 docguard 가 그 문이 될 수는 있으나 별도 작업이다.
- graph db. 조사에서 사람이 정하는 자리가 없어 뺐다.
