# URL 에서 본문을 md 로 긁어 오는 방법
Type: research
Status: resolved
Blocked by:

## Question

URL 하나를 주면 본문만 md 로 받아 원문 파일로 저장하는 도구 후보. 기사, 블로그, 문서 페이지를 다 다루는 것, 로컬에서 도는 것, 결과가 결정론적인 것(같은 URL 이면 같은 파일)을 본다. 유튜브는 yt-notes 스크립트가 있으니 뺀다.

## Answer

defuddle 을 쓴다. 반반.

`npx defuddle parse <url> --markdown --frontmatter` 한 줄로 URL 을 받아 본문 markdown 을 내고, 로컬에서 돌며, 기사와 문서 페이지 각각 두 번 돌린 결과가 byte 단위로 같았다. 문서 페이지의 code block 을 다 지키고 상대 링크를 절대 링크로 풀어 저장용으로 알맞다. 프로젝트가 Node 라 설치 비용이 없다.

trafilatura 는 기사에서는 더 깨끗하지만 문서 페이지의 한 줄 code block 을 절반 잃고 `--links` 의 anchor 가 잘못 풀린다. 기사만 다룬다면 이쪽이 낫다.

jina reader 는 결정론적이었으나 원격 서비스라 빼고, crawl4ai·firecrawl 은 브라우저·docker 가 붙어 무겁다. markdownify·html2text·pandoc·markitdown 은 본문 추출이 없다.

반반인 이유는 표본이 URL 둘이라서다. 블로그는 안 돌려 봤고, defuddle 이 기사 앞에 붙이는 대표 이미지·관련 기사 목록이 잡음으로 쌓일지는 글을 더 넣어 봐야 안다.

조사: [docs/research/url-to-markdown.md](../../../docs/research/url-to-markdown.md)
