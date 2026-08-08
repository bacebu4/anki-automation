---
name: jp-meaning-explanations
description: Backfill the "Meaning explanation" field for Japanese cards in the JPM Anki deck with grammar breakdowns. Use when the user asks to add meaning explanations, grammar explanations, or breakdowns for Japanese sentences/cards.
---

# Japanese Meaning Explanations

Fill the empty "Meaning explanation" field on notes in the Anki deck **JPM** (note type "WaniKani OneSided") via AnkiConnect at `http://127.0.0.1:8765`.

## Which notes get an explanation

- Only **sentences and phrases** — anything with grammar to unpack (conjugations, particles, relative clauses, set patterns).
- **Skip single words and bare connectors** (e.g. 今度, だから, なるほど, それから) — there is nothing to break down.
- **Skip notes whose "Meaning explanation" is already non-empty.** Never overwrite.

## Format

The field is **HTML, not markdown**. No heading (the field name already says what it is). Wrap everything in a left-align div so lists render well even if the card template centers text:

```html
<div style="text-align: left;"><ul>
  <li>何を = "what" (direct object)</li>
  <li>聞かれても = passive form of 聞く ("to ask") + ても ("even if")<ul>
    <li>聞かれる = "to be asked"</li>
    <li>聞かれても = "even if (someone) asks me" / "no matter what I'm asked"</li>
  </ul></li>
  <li>のらりくらり = an adverb/onomatopoeic expression meaning:<ul>
    <li>evasively</li>
    <li>dodging the issue</li>
  </ul></li>
</ul></div>
```

Bullet style rules:

- One top-level `<li>` per meaningful chunk of the sentence, in sentence order: `JP chunk = "gloss" (grammatical note)`.
- Use a nested `<ul>` to unpack a chunk: conjugation steps, literal meaning, or the general pattern (e.g. `しか + negative = "only"`).
- Plain kanji in the bullets — no furigana/ruby.
- Keep it tight: only the points a learner actually needs; 2–5 top-level bullets is typical.

## How to apply

1. Fetch notes: `{"action": "notesInfo", "version": 6, "params": {"query": "deck:JPM"}}`.
2. Write each explanation with `updateNoteFields` — it only touches the fields given:
   `{"action": "updateNoteFields", "version": 6, "params": {"note": {"id": <noteId>, "fields": {"Meaning explanation": "<html>"}}}}`
3. Sync: `{"action": "sync", "version": 6}`.
4. Report which notes were filled and which were skipped (already filled / single word).

Write the explanations yourself — no API calls or external services.
