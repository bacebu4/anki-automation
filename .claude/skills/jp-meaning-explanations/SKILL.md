---
name: jp-meaning-explanations
description: Backfill the "Meaning explanation" field for Japanese cards in the JPM Anki deck with grammar breakdowns. Use when the user asks to add meaning explanations, grammar explanations, or breakdowns for Japanese sentences/cards.
---

# Japanese Meaning Explanations

Fill the empty "Meaning explanation" field on notes in the Anki deck **JPM** (note type "WaniKani OneSided") with grammar breakdowns. Write the explanations yourself — no API calls or external services for the content.

## Talking to Anki (AnkiConnect)

Anki desktop must be running with the AnkiConnect add-on; it serves HTTP on `http://127.0.0.1:8765`. Every call is a POST with a JSON body `{"action": ..., "version": 6, "params": {...}}`; the response is `{"result": ..., "error": ...}` — treat non-null `error` as failure. A GET to the same URL returns `{"apiVersion": "AnkiConnect v.6"}` (healthcheck). If the connection is refused, tell the user to open Anki — don't retry blindly.

Use this helper (Python, stdlib only):

```python
import json, urllib.request

def anki(action, **params):
    req = urllib.request.Request('http://127.0.0.1:8765',
        json.dumps({'action': action, 'version': 6, 'params': params}).encode())
    res = json.load(urllib.request.urlopen(req, timeout=30))
    if res['error']:
        raise RuntimeError(f'{action}: {res["error"]}')
    return res['result']
```

The timeout matters: a hung Anki (e.g. stuck on a modal dialog) would otherwise block forever. On timeout, tell the user to check Anki's window.

Actions used here:

- `anki('notesInfo', query='deck:JPM tag:jpm-2026-08-08-3')` → list of notes, each `{noteId, tags, modelName, fields: {"Word": {"value": ...}, "Reading": ..., "Meaning": ..., "Meaning explanation": ..., "Audio": ...}}`. `Word` is the plain Japanese sentence, `Meaning` its English translation.
- `anki('getTags')` → all tag strings in the collection.
- `anki('updateNoteFields', note={'id': note_id, 'fields': {'Meaning explanation': html}})` — updates only the fields given; other fields are untouched. Caution: if the note is open in Anki's Browse/edit view, the update can silently fail — ask the user to close the browser window before writing, and spot-check one note afterwards with `notesInfo`.
- `anki('sync')` — sync to AnkiWeb; call once at the end.

## Finding the notes

Every import run tags its notes with a batch tag: `jpm-<YYYY-MM-DD>-<run index>`, e.g. `jpm-2026-08-08-3` (older notes may have date-only tags like `jpm-2026-08-08`).

- If the user names a tag, query it: `deck:JPM tag:jpm-2026-08-08-3`.
- If the user says "the new ones" / "recently added" without a tag, find the latest batch tag: `getTags`, filter by the `jpm-` prefix, and pick the latest by parsing date and run index — sort numerically on the index, NOT as strings (a string sort puts `-10` before `-2`). Show which tag you picked.
- Last resort (no usable tags): note IDs are creation timestamps in ms, so the highest `noteId`s in `deck:JPM` are the newest notes. Don't use "empty Meaning explanation" alone to find new notes — deliberately skipped single-word notes stay empty forever, so old batches would match too.

## Which notes get an explanation

- Only **sentences and phrases** — anything with grammar to unpack (conjugations, particles, relative clauses, set patterns, honorifics).
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

## Workflow

1. Find the batch (see "Finding the notes") and fetch its notes with `notesInfo`.
2. Decide per note: explanation or skip.
3. Write each explanation with `updateNoteFields`.
4. `sync` once at the end.
5. Report: which notes were filled (with a rendered preview of at least one), which were skipped and why (already filled / single word). If a note's Word looks malformed (e.g. a reading baked into the text like 美味おいしそう), flag it to the user instead of silently working around it.
