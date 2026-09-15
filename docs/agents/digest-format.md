# Storage layout and digest format

Terms (source, digest, claim, description, ingest, screening, comparison, coverage) are defined in `CONTEXT.md`. This file fixes where files go and how a digest is written, so the check script and the ingest skill read one grammar.

## Layout

```
source/<name>.md     defuddle output, byte for byte. Never edited.
digest/<name>.md     one per source, same <name>. Written by the ingest session.
conflict/<new>.C<n>--<old>.C<m>.md   one per conflict pair; see Conflict page.
scripts/check.mjs    the check script. scripts/pre-commit runs it.
.claude/skills/ingest/SKILL.md
```

`<name>` is kebab-case, chosen by the ingest session, and is the only link between a source and its digest: no pointer field. The URL lives in the source's own frontmatter (`source:`), which defuddle always writes when given a URL.

Source frontmatter belongs to defuddle. Its `description:` field is the site's meta description, not our description. Ours lives only in the digest.

## Digest

```markdown
---
fetched: 2026-09-15
description: |
  <one line per side the source takes: on what, and which side>
  ...
stance:
  - conflict: <conflict file name without .md>
    side: <name>#C<n>
---

## Claims

- C1: <my one line>
  > <verbatim excerpt from the source>
- C2: ...

## Screening

| digest | verdict | reason | quote | hash |
|---|---|---|---|---|
| <name> | open \| skip | <why> | <verbatim excerpt from that digest's description> | <hash> |

## Comparison

| digest | verdict | pairs | quote |
|---|---|---|---|
| <name> | conflict \| overlap \| unrelated | <kind> Cn↔Cm, ... | <verbatim excerpt from that digest's body> |
```

Rules the check script enforces:

- `fetched` is an ISO date. `description` is a YAML block scalar (`|`).
- **hash** is the first 8 hex chars of sha256 over the parsed `description` string value, trimmed. Any edit to a description changes it; every screening row that carries the old hash then fails until rewritten.
- Claim ids are `C<n>` in the order written, never reused inside a digest. Outside the digest a claim is `<name>#C<n>`. The excerpt is one blockquote line directly under the claim and must occur verbatim (`includes`, no normalisation) in `source/<name>.md`.
- Screening has one row per digest that existed before this one, matched as a name set: missing, unknown, and duplicated names each fail. `quote` must occur verbatim in that digest's description.
- Comparison has one row per digest screened `open`. `pairs` lists `C<n>↔C<m>` with the new digest's claim on the left and the old digest's on the right, each prefixed by its kind (`conflict`, `overlap`). The row `verdict` is the strongest kind present (conflict > overlap > unrelated); `unrelated` rows have no pairs. `quote` must occur verbatim in that digest's body, and every referenced claim id must exist.
- Both sections exist even when their tables are empty (the first digest).
- `stance` is optional. Each entry names a conflict page whose `status` is `decided`, and the same entry appears in both digests of that pair. `side` is one of the pair's two claims. Adding a stance does not touch `description`, so the hash and existing screening rows stay valid.

## Conflict page

One file per `conflict` pair in a comparison row, named `<new>.C<n>--<old>.C<m>.md` with the new digest on the left, exactly as the pair is written in the row. The check script derives the expected file set from every comparison row.

```markdown
---
opened: 2026-09-15
status: open | decided
---

# <new>#C<n> ↔ <old>#C<m>

## 두 쪽

**<new>#C<n>**: <its claim line>
> <its excerpt>

**<old>#C<m>**: <its claim line>
> <its excerpt>

## 걸린 자리

| 파일 | 자리 | 무엇 |
|---|---|---|
| digest/<name>.md | C<n> | claim |
| digest/<name>.md | description "<line head>" 줄 | 편을 적은 줄 |
| digest/<new>.md | Comparison 행 <old> | conflict C<n>↔C<m> |

## 의견

<!-- the human writes here: which side, and why -->

## 결과

<!-- written when decided: first line is date and side, then one row per 걸린 자리 saying what was done -->
```

Rules:

- Section headings and table headers are fixed strings, in Korean, because the human reads and writes this file.
- 두 쪽 repeats each claim's line and excerpt from its digest, verbatim.
- 걸린 자리 is generated: every place either claim's id or its digest's description line is referenced. The human does not edit it.
- 의견 is the human's; the session never writes it. A page whose 의견 is still empty stays `open`.
- 결과 is written by the session after 의견, and `status` flips to `decided` in the same edit. Claims are never rewritten or deleted; what changes is the `stance` entry in both digests and, if the propagation ticket decides so, a marker on the losing claim.
- The check script fails on a `decided` page without a matching `stance` entry in both digests, and on a `stance` entry whose page is missing or still `open`.
- A `|` inside a quote breaks the table; pick another excerpt.
