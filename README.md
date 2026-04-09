# Anki Automation JavaScript (TypeScript)

To install dependencies:

```bash
bun install
```

To run for txt files:

```bash
bun run ./src/runForJp
```

## TXT

### What Is It?

This is script for automatically creating Anki cards. The script does the following:

1. Takes every line from the input file
2. Translates this like into desired language
3. Downloads from Google Translate the audio of how the line pronounced
4. Creates cards in Anki with the original line, translation and audio of it

### How to Use

1. Launch Anki
2. Install AnkiConnect (Code: 2055492159)
3. Fill in words in input file separated by new line (whether in `./assets/jp.txt`)

## Links

- [AnkiConnect docs](https://foosoft.net/projects/anki-connect/index.html)
