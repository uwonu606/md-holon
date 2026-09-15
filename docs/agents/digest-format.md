# Storage layout and digest format

Terms (source, digest, claim, ingest, comparison, coverage, conflict, stance, decide) are defined in `CONTEXT.md`. This file fixes where files go and how a digest and a conflict page are written, so the check script, the ingest skill and the decide skill read one grammar.

## Layout

```
source/<name>.md     defuddle output, byte for byte. Never edited.
digest/<name>.md     one per source, same <name>. Written by the ingest session.
conflict/<new>.C<n>--<old>.C<m>.md   one per conflict pair; see Conflict page.
scripts/check.mjs    the check script. .githooks/pre-commit runs it before every commit (the machine-wide hook dispatcher calls <repo>/.githooks/<name>).
.claude/skills/ingest/SKILL.md
.claude/skills/decide/SKILL.md
```

`<name>` is kebab-case, chosen by the ingest session, and is the only link between a source and its digest: no pointer field. The URL lives in the source's own frontmatter (`source:`), which defuddle always writes when given a URL.

Source frontmatter belongs to defuddle. Its `description:` field is the site's meta description and is not read by anything here.

## Digest

```markdown
---
fetched: 2026-09-15
---

## Claims

- C1: <my one line>
  > <verbatim excerpt from the source>
  stance: lost to <name>#C<m> · <conflict file name without .md>
- C2: ...

## Comparison

| digest | verdict | pairs | quote |
|---|---|---|---|
| <name> | conflict \| overlap \| unrelated | <kind> Cn↔Cm, ... | <verbatim excerpt from that digest's body> |
```

Rules the check script enforces:

- `fetched` is an ISO date.
- Claim ids are `C<n>` in the order written, never reused inside a digest. Outside the digest a claim is `<name>#C<n>`. The excerpt is one blockquote line directly under the claim and must occur verbatim (`includes`, no normalisation) in `source/<name>.md`.
- Comparison has one row per digest that existed before this one, matched as a name set: missing, unknown, and duplicated names each fail. The ingest session opens every earlier digest's body; there is no screening step. (A screening layer that reads a per-digest summary instead of the body comes back only when opening every body no longer fits one session; the map records the digest count at which that happens.)
- `pairs` lists `C<n>↔C<m>` with the new digest's claim on the left and the old digest's on the right, each prefixed by its kind (`conflict`, `overlap`). The row `verdict` is the strongest kind present (conflict > overlap > unrelated); `unrelated` rows have no pairs. `quote` must occur verbatim in that digest's body, and every referenced claim id must exist.
- The Comparison section exists even when its table is empty (the first digest).
- `stance` is an optional line directly under a claim's excerpt, and there may be several. Each is `stance: lost to <name>#C<m> · <page>` or `stance: won over <name>#C<m> · <page>`, where `<page>` is a conflict page whose `status` is `decided` and whose pair is exactly this claim and the named one; the other claim carries the mirror line. The claim line and excerpt above it never change. Stance lines are append-only: a later page that reverses an earlier one adds a line under the same claim and leaves the old one, so the last line is the current side and the order needs no dates. The check script verifies each line's page and mirror; it does not judge a claim whose lines disagree. A claim whose last stance line is `lost` is still what its source says, but it is not this repo's view: the ingest and decide skills do not build on it.

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

<!-- one line per earlier decided page that names either claim: -->
<name>#C<n> 은 <conflict file name> 에서 <side> 편 (<its opened date>)

## 걸린 자리

| 파일 | 자리 | 무엇 | action | reason |
|---|---|---|---|---|
| digest/<name>.md | C<n> | claim | | |
| digest/<new>.md | Comparison 행 <old> | conflict C<n>↔C<m> | | |
| conflict/<other>.md | 다른 장 | <name>#C<n> | | |

## 의견

<!-- the human writes here: which side, and why -->

## 결과

<!-- written when decided: one line, date and side -->
```

Rules:

- Section headings and table headers are fixed strings, in Korean, because the human reads and writes this file. The two trailing column names are English so the check script and the human read one word.
- 두 쪽 repeats each claim's line and excerpt from its digest, verbatim. Below them, one line per earlier `decided` page whose pair names either claim, so the reader sees a prior stance before writing an opinion. A page is raised again on every new conflict, even on a claim that already carries a stance.
- 걸린 자리 is generated by the check script from ids only: every claim line, every comparison row, and every other conflict page that names `<name>#C<n>` of either side. The first three columns are the script's; it fails an `open` page whose rows differ from the derived set. A `decided` page is frozen: rows that become derivable later (a later page or comparison row naming the same claim) are listed on that later page, and the decided page only fails on a row that no id derives. Places without an id are not listed.
- `action` and `reason` are filled by the decide session, one row at a time. `action` is `changed` or `kept`; `reason` is one line and never empty. On an `open` page both are empty.
- 의견 is the human's; the session never writes it. A page whose 의견 is filled while `status` is still `open` fails the check, so a written opinion cannot be forgotten.
- 결과 is written by the decide session after 의견, and `status` flips to `decided` in the same edit. In that edit the session also appends one `stance` line under each of the two claims. Claim lines and excerpts are never rewritten or deleted; the stance line below them is the only mark.
- A `decided` page must have every `action` and `reason` filled, and a `stance` line naming it under both claims (`lost` on one, `won` on the other); a `stance` line whose page is missing or still `open` fails.
- Reversal: when the human sides against an earlier decided page, that earlier page is not edited. Its row in the new page's 걸린 자리 gets `kept` with a reason saying this page reverses it, and the new stance line is appended under the old one on the claim.
- A `|` inside a quote breaks the table; pick another excerpt.

## Decide

The decide skill runs outside ingest, right after the human fills 의견 on one page. In one pass it fills `action` and `reason` on every 걸린 자리 row, writes 결과, flips `status`, appends a `stance` line under both claims, and runs the check script. It leaves the files uncommitted; the human reads the diff and commits.
