# URL 에서 본문을 markdown 으로 긁어 오는 도구 조사

URL 하나를 주면 본문만 markdown 으로 받아 원문 파일로 저장하는 도구 후보를 1차 자료(공식 README·docs·소스)로 비교했다. 잣대는 기사·블로그·문서 페이지를 다 다루는지, 로컬에서 도는지, 같은 URL 이면 같은 파일이 나오는지다. 확인일은 2026-09-14 이고, 별 수와 마지막 push 는 그날 `gh api` 로 읽은 값이다. 상위 후보 둘은 실제 URL 둘에 두 번씩 돌려 출력을 견줬다.

## 요약

defuddle 을 쓰는 것이 맞다. 반반.

- **defuddle 이 세 종류 페이지를 다 다루면서 로컬에서 돌고 결정론적이다.** `npx defuddle parse <url> --markdown --frontmatter` 한 줄로 URL 을 받아 본문 markdown 을 낸다. 실험한 두 URL 모두 두 번 돌린 결과가 byte 단위로 같았다. 문서 페이지의 code block 24개를 다 지켰고, 상대 링크를 절대 링크로 풀었고, 안내 상자를 callout 으로 옮겼다. 프로젝트가 Node 라 설치 비용도 없다.
- **trafilatura 는 기사에서는 더 깨끗하지만 문서 페이지에서 code block 을 반 잃는다.** 문서 페이지의 code block 24개 중 12개(한 줄짜리 shell 명령)가 빠졌고, `--links` 를 켜면 anchor 가 잘못된 base 로 풀린다. 기사에서는 defuddle 보다 잡음이 적었다(대표 이미지·부제·관련 기사 목록이 없다). 기사만 다룬다면 trafilatura 가 낫다.
- **반반인 이유는 실험 표본이 URL 둘뿐이라서다.** 블로그는 안 돌려 봤고, defuddle 이 기사에서 넣는 관련 기사 목록이 잡음으로 쌓일지는 글을 몇 편 더 넣어 봐야 안다.
- **jina reader 는 결정론적이었지만 원격 서비스라 뺀다.** crawl4ai·firecrawl 은 브라우저나 docker 를 끌고 와서 이 용도에는 무겁다. markdownify·html2text·pandoc 은 본문 추출기가 없어 단독으로는 안 되고, readability 계열과 짝지어야 한다.

두 도구 모두 실행 시각을 결과에 넣지 않는다. trafilatura 의 frontmatter `date` 와 defuddle 의 `published` 는 페이지에서 읽은 날짜다. 결정론은 "페이지가 안 바뀌면" 이라는 조건이 붙는다. 페이지가 바뀌면 결과도 바뀌는 것이 맞다.

## 비교표

| 도구 | 본문 추출 | 출력 | 로컬 | 결정론 | JS 렌더 | license | 별 / 마지막 push | 설치 |
|---|---|---|---|---|---|---|---|---|
| defuddle | 있음 (Obsidian Web Clipper 의 추출기) | HTML, markdown, JSON, frontmatter 옵션 | 로컬. 본문이 비면 bot UA 로 한 번 더 받고, library 는 third-party API fallback 이 있음(끌 수 있음) | 두 URL 두 번 모두 동일 | 없음(linkedom 으로 raw HTML 파싱) | MIT | 9,380 / 2026-09-12 | `npx defuddle` |
| trafilatura | 있음 (자체 heuristic + fallback) | txt, markdown, csv, json, html, xml, xmltei | 로컬 | 두 URL 두 번 모두 동일 | 없음. Playwright 로 렌더한 HTML 을 넘기라고 안내 | Apache-2.0 | 6,810 / 2026-09-11 | `uv run --with trafilatura` |
| mozilla/readability | 있음 (Firefox Reader View) | HTML (markdown 은 별도 변환 필요) | 로컬, jsdom 등 DOM 필요 | 실험 안 함 | 없음 | Apache-2.0 | 11,436 / 2026-08-04 | npm + jsdom + turndown 조합 |
| python-readability (readability-lxml) | 있음 (arc90 port) | HTML (markdown 은 별도 변환 필요) | 로컬 | 실험 안 함 | 없음 | Apache-2.0 | 2,893 / 2026-08-27 | `uv run --with readability-lxml --with markdownify` |
| jina reader | 있음 (readability 기반, 옵션으로 끔) | markdown, frontmatter 옵션 | 원격(`r.jina.ai`). self-host 는 docker compose | 한 URL 두 번 동일 | 있음(headless Chrome) | Apache-2.0 | 11,981 / 2026-05-22 | 없음(curl) |
| crawl4ai | 있음 (fit markdown, BM25) | markdown | 로컬이나 Playwright + Chromium 필요 | 실험 안 함 | 있음 | Apache-2.0 | 83,295 / 2026-09-09 | pip + `crawl4ai-setup` 으로 브라우저 설치 |
| firecrawl | 있음 | markdown, JSON, screenshot | 원격이 기본. self-host 는 docker | 실험 안 함 | 있음 | AGPL-3.0 | 180,040 / 2026-09-14 | API key 또는 self-host |
| markitdown | 없음 (`<body>` 전체) | markdown | 로컬 | 실험 안 함 | 없음 | MIT | 183,647 / 2026-09-12 | pip |
| markdownify | 없음 (변환기만) | markdown | 로컬 | — | 없음 | MIT | 2,249 / 2026-06-30 | pip |
| html2text | 없음 (변환기만) | markdown | 로컬 | — | 없음 | GPL-3.0 | 2,169 / 2025-10-28 | pip |
| curl + pandoc | 없음 (페이지 전체) | markdown | 로컬 | — | 없음 | GPL-2.0 | 46,266 / 2026-09-14 | pandoc 바이너리 |

## 실험

URL 둘에 trafilatura 와 defuddle 을 두 번씩 돌려 md5 를 비교했다. 기사는 The Guardian 의 2026-09-13 기술 기사, 문서는 uv 의 "Creating projects" 페이지다.

| | trafilatura 2.2.0 | defuddle 0.19.3 |
|---|---|---|
| 기사, 두 번 md5 | 같음 (7,317 byte) | 같음 (9,117 byte) |
| 문서, 두 번 md5 | 같음 (7,740 byte) | 같음 (9,228 byte) |
| 문서 code block 수 (원문 24) | 12 | 24 |
| 문서 링크 수 | 0 (기본). `--links` 켜면 20 이나 anchor 가 `https://docs.astral.sh#...` 로 잘못 풀림 | 10, 절대 URL 로 바르게 풀림 |
| 기사 잡음 | 없음. 본문 문단만 | 대표 이미지·사진 설명·부제·관련 기사 링크 2개가 본문 앞에 붙음 |
| 제목 | frontmatter `title` 과 본문 `# ` 제목 | frontmatter 에만. 본문 H1 은 제목과 같으면 지우고 나머지 H1 은 H2 로 내림 |

trafilatura 가 놓친 code block 은 `$ uv init example-app` 같은 한 줄짜리 shell 명령 12개였다. 여러 줄짜리(tree 출력, pyproject 내용)는 지켰다. 안내 상자는 "Note" 한 줄과 본문으로 풀어 냈고 defuddle 은 `> [!note]` callout 으로 옮겼다.

readability-lxml + markdownify 조합도 문서 페이지에 한 번 돌려 봤다. code block 23개를 지켰고 링크는 상대 경로 그대로(`../config/#build-systems`) 남아 저장 뒤에는 깨진다. 제목이 `Creating projects | uv` 로 사이트명이 붙는다.

jina reader 는 문서 페이지를 두 번 받아 md5 가 같았다(10,062 byte). 출력 머리가 `Title:` / `URL Source:` / `Markdown Content:` 형식이라 frontmatter 로 받으려면 `X-Respond-With: frontmatter` header 를 붙여야 한다.

## defuddle

출처: https://github.com/kepano/defuddle (README, `src/cli.ts`, `src/fetch.ts`, `package.json`)

Obsidian Web Clipper 를 위해 만든 본문 추출기다. README 는 "takes a URL or HTML, finds the main content, and returns cleaned HTML or Markdown" 이라고 적었다. CLI 는 파일·URL·stdin 을 받고 `--markdown`, `--json`, `--frontmatter`(title, author, source 등) 옵션이 있다. 문서 페이지 잡음을 줄이려고 HTML 을 표준화하는데, 각주·heading·code block·callout 을 통일하고 "The first H1 or H2 heading is removed if it matches the title. H1s are converted to H2s" 라고 적었다.

로컬성에 조건이 둘 있다. CLI 는 URL 을 받으면 fetch 한 HTML 을 linkedom 으로 파싱하고, 단어 수가 0 이면 bot User-Agent 로 한 번 더 받는다(`src/cli.ts`). github.com 은 처음부터 bot UA 로 받는다(`src/fetch.ts`). library 의 `parseAsync()` 는 "if no content can be extracted from the local HTML, Defuddle may fetch content from third-party APIs as a fallback" 이고 `useAsync: false` 로 끈다. 본문이 있는 페이지에서는 둘 다 안 돈다.

JS 렌더는 없다. client-side 만 그리는 SPA 는 위 fallback 에 걸리거나 빈 결과가 된다.

## trafilatura

출처: https://github.com/adbar/trafilatura (README), https://trafilatura.readthedocs.io/en/latest/usage-cli.html, https://trafilatura.readthedocs.io/en/latest/troubleshooting.html, https://trafilatura.readthedocs.io/en/latest/settings.html

web corpus 구축용으로 만든 Python 도구다. "main texts, metadata" 를 뽑고 "strikes a balance between limiting noise (precision) and including all valid parts (recall)" 라고 적었다. CLI 는 `-u <url>` 로 한 URL, `-i list.txt` 로 목록을 받고 `--markdown`, `--with-metadata`, `--links`, `--precision`, `--recall` 옵션이 있다. markdown 을 고르면 formatting 은 자동으로 켜진다. metadata 를 켜면 YAML frontmatter 로 title, author, url, hostname, description, sitename, date, categories, tags 가 붙는다.

날짜는 htmldate 가 페이지에서 찾는다. settings 의 `EXTENSIVE_DATE_SEARCH` 를 끄면 추측 검색을 안 하고 precision 이 오른다. 실행 시각은 안 들어간다.

JS 렌더는 없다. troubleshooting 문서가 "Trafilatura works on raw HTML. If a page uses JavaScript to render its content, render it first with a browser automation library and pass the resulting HTML to extract()" 라고 Playwright 예시와 함께 안내한다. 같은 문서가 "geared towards article pages, blog posts, and main text content. Results vary on link lists, galleries, or catalogs" 라고 적었고, 실험에서 문서 페이지의 한 줄 code block 을 잃은 것이 그 대가다.

## mozilla/readability

출처: https://github.com/mozilla/readability (README)

Firefox Reader View 의 추출기를 떼어 낸 library 다. DOM `Document` 를 받아 `parse()` 로 title, content(HTML), textContent, excerpt, byline 등을 돌려준다. Node 에서는 jsdom 같은 DOM library 가 필요하다. markdown 변환기가 없어 turndown 같은 것을 붙여야 하고, URL 을 받는 CLI 도 없다. defuddle 과 jina reader 가 이 계열 위에 서 있다. `charThreshold` 기본 500자라 짧은 글은 빈 결과가 된다.

## python-readability (readability-lxml)

출처: https://github.com/buriy/python-readability (README)

arc90 Readability 의 Python port 다. `Document(html).summary()` 가 본문 HTML 을, `title()` 이 제목을 준다. CLI `python -m readability -u <url>` 이 있으나 출력은 HTML 이라 markdownify 를 붙여야 markdown 이 된다. README 가 "reproducible comparison of ten extraction engines on 181 saved pages" 에서 F1 0.975 로 둘째라고 적었다. 실험에서 상대 링크가 안 풀린 것이 저장용으로는 흠이다.

## jina reader

출처: https://github.com/jina-ai/reader (README)

`https://r.jina.ai/<url>` 앞에 붙이면 markdown 을 돌려주는 원격 서비스다. README 는 "rendered with headless Chrome, or fetched lightweight via curl-impersonate. Reader picks intelligently between the two" 라고 적었고, JS 렌더 대기 옵션(`x-wait-for-selector`)이 있다. 출력은 readability 를 거친 markdown 이 기본이고 `X-Respond-With: markdown` 은 readability 없이, `frontmatter` 는 YAML frontmatter 로 준다. 요금은 rate limit 이 붙는다. self-host 는 2026-04 부터 "stateless mode out of the box, with optional MinIO/S3-compatible bucket caching via docker compose" 라 가능하지만 headless Chrome 을 끌고 온다. 로컬 조건에 안 맞아 뺀다.

## crawl4ai

출처: https://github.com/unclecode/crawl4ai (README)

Playwright 기반 크롤러다. `pip install crawl4ai` 뒤 `crawl4ai-setup` 이 Chromium 을 설치한다. markdown 생성에 "Fit Markdown: Heuristic-based filtering to remove noise" 와 BM25 filter 가 있다. JS 렌더는 되지만 브라우저를 띄우므로 결정론은 페이지의 동적 내용에 달려 있고, URL 하나를 저장하는 용도에는 무겁다.

## firecrawl

출처: https://github.com/firecrawl/firecrawl (README), https://docs.firecrawl.dev/contributing/self-host

hosted API 가 기본이고 API key 가 필요하다. README 가 "primarily licensed under the GNU Affero General Public License v3.0" 이라 적었고 self-host 는 별도 guide 를 따라 docker 로 올린다. scrape 가 markdown 을 주지만 로컬 조건과 설치 비용에서 뺀다.

## markitdown

출처: https://github.com/microsoft/markitdown (README, `packages/markitdown/src/markitdown/converters/_html_converter.py`)

여러 파일 형식을 markdown 으로 바꾸는 도구다. HTML converter 소스를 보면 `script`·`style` 을 지우고 `<body>` 전체를 markdownify 로 바꾼다. 본문 추출이 없어 nav·footer 가 그대로 들어간다. README 도 "may not be the best option for high-fidelity document conversions for human consumption" 이라 적었다.

## markdownify, html2text, curl + pandoc

출처: https://github.com/matthewwithanm/python-markdownify (README), https://github.com/Alir3z4/html2text (README), https://pandoc.org/MANUAL.html

셋 다 HTML 을 markdown 으로 바꾸는 변환기이고 본문 추출이 없다. markdownify 는 `strip`/`convert` 로 태그를 고르고 `heading_style="ATX"` 를 지원한다. html2text 는 "valid Markdown" 인 plain text 를 내고 GPL-3.0 이다. pandoc 은 `pandoc -f html -t gfm` 으로 바꾸며 이 환경에는 설치돼 있지 않았다. readability 계열 뒤에 붙이는 용도로만 의미가 있다.
