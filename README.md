# Anki Automation JavaScript (TypeScript)

To install dependencies:

```bash
bun install
```

To import Japanese cards:

```bash
bun run ./src/runForJp [path/to/file.txt]  # defaults to ./assets/jp.txt
```

To add audio in a custom voice to an existing batch (see DR 0002):

```bash
bun run ./src/addVoice <tag> [assets/voices/<name>.shift<N>.wav]  # e.g. jpm-2026-09-19-1
```

## What Is It?

Creates Anki cards in the **JPM** deck from `./assets/jp.txt`. Each line is `日本語/English meaning`. The script adds furigana, Japanese TTS audio, and a batch tag.

### How to Use

1. Launch Anki
2. Install AnkiConnect (Code: 2055492159)
3. Fill `./assets/jp.txt` with one `日本語/English meaning` pair per line

### Custom voices

`addVoice` takes every note with the given tag, re-renders its `Word` with the same neural TTS, converts that audio into a reference speaker's voice with Seed-VC (local, ~30 s per card) and replaces the `Audio` field with the result, `jpm-<hash>-<voice>.mp3`. Cards that already have that voice are skipped. Without a reference path it picks a random `.wav` from `assets/voices/`.

Reference files live in `assets/voices/` and are named `<name>.shift<N>.wav`, where `N` is the semitone shift applied to the TTS pitch so it lands in the reference speaker's register. The number is part of the filename on purpose: it is the one per-voice parameter and it must not get lost.

- The reference is 20–25 s of clean single-speaker speech, mono, 44.1 kHz 16-bit: `ffmpeg -i in.mp3 -t 25 -ac 1 -ar 44100 -sample_fmt s16 assets/voices/<name>.shift<N>.wav`.
- `N = round(12 · log2(reference median F0 / 260))`, 260 Hz being the TTS voice's median. Measure the median with any pitch tracker; a higher voice gets a positive shift, a lower one negative. Within ±1 use 0.

#### Seed-VC setup (once)

Requires `uv` and `ffmpeg` (`brew install uv ffmpeg`). The upstream repo is archived; two small macOS fixes live in `vendor/seed-vc-mac.patch`.

```bash
git clone --depth 1 https://github.com/Plachtaa/seed-vc vendor/seed-vc   # tested at 51383ef
cd vendor/seed-vc && git apply ../seed-vc-mac.patch
uv venv --python 3.10 .venv
uv pip install --python .venv/bin/python torch torchaudio scipy==1.13.1 librosa==0.10.2 \
  "huggingface-hub>=0.28.1" munch==4.0.0 einops==0.8.0 descript-audio-codec==1.0.0 \
  pydub==0.25.1 transformers==4.46.3 soundfile==0.12.1 numpy==1.26.4 pyyaml \
  python-dotenv hydra-core==1.3.2 accelerate
```

Tested with torch 2.14.0. Models (~3 GB) download from Hugging Face into `vendor/seed-vc/checkpoints` on the first conversion, so the first card takes a few minutes. `vendor/seed-vc/` is gitignored.

## Links

- [AnkiConnect docs](https://foosoft.net/projects/anki-connect/index.html)
