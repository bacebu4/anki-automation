# 0001 — Japanese sentence TTS provider

Date: 2026-09-19
Status: accepted, implemented 2026-09-19 (`src/tts.ts`)

## Context

`src/ttsmp3.ts` generates sentence audio for JPM cards by POSTing to ttsmp3.com.
That site is a thin wrapper over **Amazon Polly standard (concatenative) "Takumi"**,
capped at 3,000 chars/day. It is the lowest quality tier of TTS anywhere: robotic
prosody, dated timbre. We want a clear quality jump. Constraints:

- Volume: ~20–100 sentences per session, a few sessions a week (~20k–100k chars/month).
- Paid only as a last resort, and only if quality is truly superior.
- Local models are acceptable; machine is a MacBook Pro M2 Pro, 16 GB, macOS 15.
- Wrong kanji readings are a dealbreaker for flashcards. Pitch accent matters.
- Script is TypeScript on bun; AnkiConnect attaches audio via `audio: [{ url | path | data, filename, fields }]`.

## Decision

Replace ttsmp3 with **Microsoft Edge "Read Aloud" neural voices via the npm package
`msedge-tts`** (`ja-JP-NanamiNeural` / `ja-JP-KeitaNeural`), writing the mp3 locally and
attaching it to Anki with AnkiConnect's `path` field instead of `url`.

Fallback if the Edge endpoint breaks for good: **Azure Speech F0** (same voices, official
key, 500k chars/month permanent free tier, one REST POST).

## Why

- Same Azure neural voices Microsoft sells; the Anki / WaniKani / Tadoku community treats
  Nanami/Keita as the reference for Japanese sentence audio (few misreadings, natural prosody).
- Free, no account, no card.
- Verified live on this machine under bun 1.1.18: 10 sequential sentences, 0 failures,
  ~0.5 s each, 24 kHz mono mp3.
- `msedge-tts` 2.0.7 (July 2026) is maintained, 0 open issues. `edge-tts-universal` is an
  alternative with explicit bun support.

## Known risks

- Gray-area endpoint. Microsoft added the `Sec-MS-GEC` token (Oct 2024) and an Edge
  user-agent / MUID cookie requirement (Dec 2025); the version constant rotates with Edge
  releases. Symptom is HTTP 403 → bump the package. If it stops being fixable, move to Azure F0.
- Only two native Japanese voices. The "multilingual" voices are not Japanese-native; avoid.
- `toFile()` in `msedge-tts` always writes `audio.mp3`; use `toStream()` and write bytes yourself.
- Undocumented rate limit; community sees 429s only above ~30–50 req/min.

## Alternatives considered

Cloud, permanent free tiers (all need a card on file):

| Service | Japanese quality | Free tier | Verdict |
|---|---|---|---|
| Azure Speech (Nanami/Keita, DragonHD Nanami/Masaru) | reference-grade, SSML `<phoneme>` for readings | 500k chars/mo permanent | **fallback** |
| Google Cloud Neural2 / Chirp 3 HD | top intelligibility in JP benchmarks, `<sub>` overrides | 1M chars/mo each, permanent | equal quality, more setup (GCP project + billing) |
| Fish Audio `s2.1-pro-free` | expressive, kanji accuracy unverified | unlimited fair-use until Nov 2026, no card | time-boxed, unproven readings |
| Amazon Polly Neural Takumi/Kazuha/Tomoko | good | 12 months only | needs SigV4 SDK, not free |

Cloud, rejected on quality:

- **OpenAI gpt-4o-mini-tts / tts-1-hd**: 56% kanji reading accuracy on a 2026 benchmark
  (Zenn ja-tts-g2p-bench); "foreigner speaking Japanese". No free tier.
- **Gemini 2.5/3.1 Flash TTS**: 55–80% kanji accuracy, free tier ~15 requests/day.
- **ElevenLabs**: Japanese is its weak language; 50k chars/mo forces the $22 plan.
- **MiniMax, Cartesia, Hume, Inworld, Deepgram**: no meaningful free tier, unproven Japanese.
- **Google Translate `translate_tts`**: non-neural, worse than Takumi.

Local (M2 Pro, 16 GB):

| Option | Notes | Verdict |
|---|---|---|
| **AivisSpeech** (Style-Bert-VITS2, ONNX, VOICEVOX-compatible API on :10101) | best local naturalness per JP reviewers, one .dmg, ~1.5 GB RAM, CPU-only, a few s/sentence. Accent/reading errors on rare compounds, dictionary-only fixes. Default "Anneli" voice pulled Sept 2025 over consent scandal; pick a clean AivisHub voice | best local pick if we ever go offline |
| **VOICEVOX** (:50021) | more synthetic voice, but per-mora pitch-accent editing via `accent_phrases`. ~70% kanji accuracy | only if auditable accent > naturalness |
| Style-Bert-VITS2 direct | same quality as AivisSpeech, Python 3.11 + torch ≥2.6 for MPS | no gain over AivisSpeech |
| Qwen3-TTS 0.6B/1.7B (MLX) | best LLM-style JP readings, 3–6 GB, 2–4 s/sentence, occasional proper-noun misreads | third local option |
| Kokoro-82M | Japanese graded C, "poor" in JP hands-on | no |
| CosyVoice 2/3 | 9% CER on Japanese | no |
| Fish Speech / OpenAudio S1-mini | Apple Silicon generation broken, NC license | no |
| MeloTTS, XTTS-v2, Piper, Chatterbox | below VOICEVOX naturalness | no |
| macOS `say -v Kyoko` (incl. Enhanced) | reliable readings, flat 2013-era prosody, worse than Takumi. Siri voices not exposed to `say` | no |

Verdict on local vs cloud: AivisSpeech roughly matches Azure/Google on naturalness but
misreads more on rare compounds and proper nouns. Nothing local yet combines top
naturalness with the reading reliability a flashcard needs.

## Anki add-ons (if TTS ever moves inside Anki)

- HyperTTS: no free neural Japanese source; premium $5/mo or bring your own Azure/Google key.
- "Local TTS for Japanese (VOICEVOX)" add-on: synthesizes at review time, desktop-only, no media files.

## Implementation

1. `bun add msedge-tts`.
2. Replace `getJapaneseTtsUrl` with a function that calls `toStream()` and writes
   `jpm-<hash>.mp3` to a temp dir.
3. In `src/api.ts`, send `audio: { path, filename, fields }` instead of `url`.
4. Drop the 1 s sleep between requests or reduce it; keep well under ~30 req/min.

## Sources

- Edge token changes: https://github.com/rany2/edge-tts/issues/290 , https://github.com/rany2/edge-tts/issues/458
- msedge-tts: https://github.com/Migushthe2nd/MsEdgeTTS
- Azure quotas: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits
- Azure REST: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech
- Google pricing: https://cloud.google.com/text-to-speech/pricing
- Kanji reading benchmark: https://zenn.dev/tellernovel_inc/articles/ja-tts-g2p-benchmark
- OpenAI kanji complaints: https://community.openai.com/t/japanese-tts-sometimes-misreads-kanji-is-your-japanese-nlp-team-not-talking-to-the-tts-team/1297418
- Local JP TTS comparison (Qiita 2026): https://qiita.com/0h-n0/items/8f78f7acd31000612d13
- AivisSpeech: https://github.com/Aivis-Project/AivisSpeech ; Anneli issue: https://www.itmedia.co.jp/aiplus/articles/2509/09/news059.html
- VOICEVOX engine: https://github.com/VOICEVOX/voicevox_engine ; pitch-accent thread: https://community.wanikani.com/t/voicevox-tts-a-good-resource-for-pitch-accent/55673
- Qwen3-TTS on Apple Silicon: https://dev.to/tumf/qwen3-tts-surprised-by-the-quality-of-japanese-on-apple-silicon-m3-creating-rights-free-voices-k1d
- Kokoro voices: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- CosyVoice CER: https://arxiv.org/html/2505.17589v2
- AnkiConnect README (`addNote` audio `path`/`data`): https://git.sr.ht/~foosoft/anki-connect
- Tadoku on Azure Nanami: https://forum.tadoku.app/t/awesometts-anki-addin-with-azure-neural-voice-is-surprisingly-good/1421
- HyperTTS vs AwesomeTTS: https://www.nextlang.co/how-to/awesometts-vs-hypertts
