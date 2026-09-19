# Japanese mining (JPM)

This repo mines Japanese into the Anki deck **JPM**. The card is not a word list item. It is a **sentence-structure recognition pattern**: a construction you should be able to spot the next time it shows up in the wild (clause order, particles, conjugations, relative clauses, set patterns, discourse glue).

Input is `assets/jp.txt`, one `日本語/English meaning` per line. The English side should make the structure obvious, not just give a fluent paraphrase.

## Code

TypeScript + bun. Entry point: `src/runForJp.ts`. Anki writes go through `src/api.ts` / `src/loader.ts` — don't add a second client.

## Decision records

`decision-records/` holds numbered records of non-obvious choices: research done, options weighed, what was picked and why. Like ADRs but not limited to architecture. Read the relevant one before changing the thing it covers; add a new numbered file when you make a choice someone would otherwise re-research.

Short form is DR / DRs.
