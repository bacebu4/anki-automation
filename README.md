# Anki Automation JavaScript (TypeScript)

To install dependencies:

```bash
bun install
```

To run for txt files:

```bash
bun run src/runForTxt < ru | sr | en >
```

To run for XLSX files:

```bash
bun run src/runForXlsx
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
3. Adjust configuration of `load` function
4. Fill in words in input file separated by new line (whether in `./assets/ru.txt` or in `./assets/sr.txt`)
5. Run script with needed param. If `ru` passed, then `./assets/ru.txt` will be parsed. The same principle with `sr`

## XLSX

Download favorites from Google Translate and put it into `assets` folder. Then run script. It'll automatically select needed deck.

## Links

- [AnkiConnect docs](https://foosoft.net/projects/anki-connect/index.html)
