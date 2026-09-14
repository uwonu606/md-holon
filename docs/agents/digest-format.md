# Storage layout and digest format

Terms (source, digest, claim, description, ingest, screening, comparison, coverage) are defined in `CONTEXT.md`. This file fixes where files go and how a digest is written, so the check script and the ingest skill read one grammar.

## Layout

```
source/<name>.md     defuddle output, byte for byte. Never edited.
digest/<name>.md     one per source, same <name>. Written by the ingest session.
conflict/            one md per conflict; shape decided separately.
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
  <one line per stance: what the source takes a side on, and which side>
  ...
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
- A `|` inside a quote breaks the table; pick another excerpt.
