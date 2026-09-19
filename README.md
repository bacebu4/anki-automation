# Anki Automation JavaScript (TypeScript)

To install dependencies:

```bash
bun install
```

To import Japanese cards:

```bash
bun run ./src/runForJp [path/to/file.txt]  # defaults to ./assets/jp.txt
```

## What Is It?

Creates Anki cards in the **JPM** deck from `./assets/jp.txt`. Each line is `日本語/English meaning`. The script adds furigana, Japanese TTS audio, and a batch tag.

### How to Use

1. Launch Anki
2. Install AnkiConnect (Code: 2055492159)
3. Fill `./assets/jp.txt` with one `日本語/English meaning` pair per line

## Links

- [AnkiConnect docs](https://foosoft.net/projects/anki-connect/index.html)
