---
name: ingest
description: Ingest one URL into md-holon: fetch the source, write its digest, compare it against every earlier digest, open conflict pages, pass the check, commit.
disable-model-invocation: true
---

Ingest one source: `/ingest <url>`. Terms are in `CONTEXT.md`; the file grammar is `docs/agents/digest-format.md`. Read both first. The check script `scripts/check.mjs` is the judge of every step below; run it whenever you are unsure what a rule means, and read its failure lines as the instruction.

## 1. Fetch the source

Pick `<name>`: kebab-case, from the page title, unique under `source/`. Then:

```bash
npx defuddle parse <url> --markdown --frontmatter > source/<name>.md
```

If `source/<name>.md` already exists, use it as is. A source is read-only from the moment it lands: never edit it, even to fix a typo.

**Done when** `source/<name>.md` exists and its frontmatter carries `source: <url>`.

## 2. Write the digest

Read the whole source. Write `digest/<name>.md`:

- `fetched` is today's ISO date, the only frontmatter key.
- Six claims or so: what the source asserts that a later source could agree with or contradict. Skip API mechanics and examples. The claim line is your one sentence in Korean; the excerpt under it is one line copied verbatim from the source, with no `|` in it.
- The `## Comparison` section with its header row, even if no earlier digest exists.

**Done when** `node scripts/check.mjs` reports nothing about `digest/<name>.md` except missing comparison rows.

## 3. Compare against every earlier digest

For each file in `digest/` other than the new one:

1. Read its whole body. Also `grep -l <its-name> conflict/` and read every page with `status: open`: those claims are under dispute and carry no stance line yet.
2. Pair claims: `conflict` when the two cannot both hold, `overlap` when they say the same thing. Skip pairing with a claim whose last `stance` line is `lost to`; that claim is not this repo's view.
3. Add one row: the digest name, the strongest kind as verdict (`unrelated` when there are no pairs), the pairs with the new claim on the left, and a quote copied verbatim from that digest's body.

**Done when** every earlier digest has exactly one row.

## 4. Open conflict pages and extend open ones

- For every `conflict` pair, create `conflict/<name>.C<n>--<old>.C<m>.md` from the template in `docs/agents/digest-format.md`, `status: open`, 의견 and 결과 left to their comments.
- Run the check. It prints every 걸린 자리 row it derives and cannot find, on new pages and on earlier `open` pages that name a claim your rows now touch. Add each printed row verbatim with empty `action` and `reason`. Never add a row the check did not print.

**Done when** `node scripts/check.mjs` prints `ok`.

## 5. Commit and report

Commit `source/`, `digest/` and `conflict/` in one commit; the pre-commit hook runs the check again. Then report:

- how many earlier digests there were,
- `wc -m` over the source and every earlier digest, summed (what one session had to read),
- which conflict pages are open. A conflict pair stops here: the human writes 의견 on the page and runs `/decide`.

**Done when** the commit exists and the report is posted.
