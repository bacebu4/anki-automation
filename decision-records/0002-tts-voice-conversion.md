# 0002 — Custom voice for sentence audio: TTS then voice conversion

Date: 2026-09-19
Status: accepted, implemented 2026-09-19 (`src/addVoice.ts`, `convertVoice` in `src/tts.ts`)
Depends on: 0001 (Edge TTS Nanami for readings).

## Context

DR 0001 picked Edge `ja-JP-NanamiNeural` for kanji-reading accuracy. We also want cards in a
voice of our choosing, i.e. modern "voice cloning". DR 0001 never considered that as a
category. The naive route is a zero-shot cloning TTS (Fish, CosyVoice, Qwen3-TTS, F5,
IndexTTS2). Those score worst on the only public Japanese reading benchmark
(ja-tts-g2p-bench: CosyVoice 9% CER, Qwen3-TTS 52% heteronym accuracy, OpenAI 56%), and
cloning changes timbre, not grapheme-to-phoneme. So the reading requirement and the voice
requirement are split across two stages:

1. Edge TTS Nanami → correct readings and pitch accent (unchanged from 0001).
2. Voice conversion (VC): same audio, target speaker's timbre.

Constraints as in 0001 (M2 Pro 16 GB, free, bun/TypeScript, local models fine) plus:
per-mora pitch accent must survive stage 2, and the target voice must be one we may use.

## Decision

**Seed-VC v1, F0-conditioned model, run locally on MPS, zero-shot from a 20–25 s reference
clip.** Exact invocation (what `convertVoice` runs):

```
python inference.py --source <edge mp3> --target <ref wav> --output <dir> \
  --diffusion-steps 25 --f0-condition True --semi-tone-shift <N> --fp16 False
```

- `--f0-condition True` selects the 44.1 kHz `seed-uvit-whisper-base` model, which copies the
  source F0 contour (RMVPE) into the decoder. The default speech model has no F0 input and
  regenerates prosody from the reference mel prompt; measured, it does not keep the contour.
- `--semi-tone-shift N` moves the copied contour from Nanami's register (~260 Hz median) to
  the reference speaker's. A global shift in log-F0 keeps the relative H/L pattern per mora,
  so pitch accent is preserved. `N = round(12·log2(ref median / 260))`. Fixed per voice rather
  than `--auto-f0-adjust`: that flag matches the median per clip and picks a different shift
  for every sentence, so the voice would sit at a different height on every card. N is encoded
  in the reference filename (`assets/voices/<name>.shift<N>.wav`) so it cannot get lost.
- Reference files are not part of this record. Whatever voice is used must be one we have
  the right to use (own recording, consenting speaker, or a corpus whose terms allow voice
  conversion, e.g. Tsukuyomi-chan, Amitaro, JVS/JSUT, CC0/ACML voices on AivisHub). Every
  cloud vendor requires owner consent, and Japan's 2026-08-07 MoJ interpretive guideline puts
  voice under publicity rights.

## Why Seed-VC and not the alternatives

Local, Apple Silicon:

| Option | Verdict |
|---|---|
| **Seed-VC v1** (98M, Whisper-small content encoder, DiT) | zero-shot from 1–30 s, confirmed MPS via PR #138, multilingual encoder, explicit F0 mode. GPL-3.0. Repo archived read-only 2025-11-21, so torch is pinned by us. **Picked.** |
| RVC (Applio on MPS, or the MLX port) | F0-exact by design and ~10x faster (~1 s/clip on MLX), but needs a trained `.pth` per voice; Mac training is >6 h per 30 min dataset, so Colab. Stock ContentVec is English-trained and audibly hurts Japanese consonants; needs nadare's / Applio's Japanese pretrains. Upgrade path if speed matters. |
| Chatterbox VC | zero-shot, MPS in-tree, MIT, but no Japanese evidence and output is Perth-watermarked. |
| Vevo2 / Vevo-Timbre | trained on Japanese, but no Mac reports, weights CC-BY-NC-ND, 0.6B params. |
| OpenVoice v2 | Python 3.9, worst WER/SIM on Seed-VC's eval, robotic reports, frozen since 2024. |
| kNN-VC, MeanVC2, X-VC, FreeVC, CosyVoice VC, Beatrice, MMVC, w-okada | English/Chinese-only, needs training, real-time-only tooling, or no Mac path. |

Cloud, speech-to-speech:

| Service | Verdict |
|---|---|
| ElevenLabs STS (`eleven_multilingual_sts_v2`) | Japanese supported, but instant clone needs Starter ($6, 30 min/mo) and our volume lands on Creator $22/mo. Public-figure voices banned. |
| Resemble STS | ~$2–6/mo, 10 s clone, but Japanese undocumented and the source must be a hosted HTTPS WAV. |
| Seed-VC on a HF ZeroGPU Space via `@gradio/client` | free 5 GPU-min/day, same model as local; unofficial, queued. Fallback if local breaks. |
| Azure Voice Conversion | target must be a prebuilt en-US voice; no clone, no ja-JP. |
| Murf, Hume, Kits.ai, Respeecher, Cartesia, Fish Audio | clone-as-target unclear / ≥12 s input minimum / $10+ subscriptions / English-centric / deprecated Aug 2026 / web-only. |
| MiniMax, Google Chirp 3 Instant Custom Voice, OpenAI Custom Voices | TTS-only cloning, no audio-to-audio. |

## Known risks

- Nobody has published a Japanese pitch-accent evaluation of any VC system. Listen to a batch
  before trusting it.
- Occasional voiced/unvoiced consonant softening. Japanese testers also report Seed-VC
  over-emphasises breaths and highs; a low-shelf EQ or `loudnorm` in ffmpeg if it bothers.
- Repo is archived. Two Mac fixes are needed on top of `51383ef` and are kept in
  `vendor/seed-vc-mac.patch`: cast F0 arrays to float32 (MPS has no float64) and write output
  with soundfile (torchaudio 2.14 `save` requires torchcodec).
- ~30 s per clip. `addVoice` is a separate batch step for that reason; a 100-card batch is
  ~50 min. If that hurts, load the model once and loop inside python.
- Stage-1 premise: DR 0001 assumes Nanami reads kanji well, but Azure was never on
  ja-tts-g2p-bench. VC cannot fix a wrong reading, only carry it through.

## Sources

- Seed-VC: https://github.com/Plachtaa/seed-vc , eval: https://github.com/Plachtaa/seed-vc/blob/main/EVAL.md , Mac PR: https://github.com/Plachtaa/seed-vc/pull/138
- Seed-VC prosody caveat: https://arxiv.org/html/2606.08843 ; architecture: https://dev.to/orca_forge/in-depth-explanation-of-the-seed-vc-architecture-decomposing-voice-into-who-what-and-how-in-a-3hjh
- RVC F0 preservation measured: https://arxiv.org/html/2507.03641v1 ; RVC pipeline: https://gudgud96.github.io/2024/09/26/annotated-rvc/
- RVC Japanese pretrains: https://qiita.com/nadare/items/18cd74e51c731904c3b0 , https://zenn.dev/aivoicelab/articles/16f732ca52246b
- RVC MLX: https://github.com/Acelogic/Retrieval-based-Voice-Conversion-MLX ; Applio: https://github.com/IAHispano/Applio
- Accent stays with source through VC: https://arxiv.org/html/2604.25332
- Reading benchmark: https://zenn.dev/tellernovel_inc/articles/ja-tts-g2p-benchmark , https://github.com/moiku/ja-tts-g2p-bench
- Licensed Japanese voices: https://tyc.rei-yumesaki.net/material/corpus/ , https://amitaro.net/voice/voice_rule/ , https://sites.google.com/site/shinnosuketakamichi/research-topics/jvs_corpus , https://hub.aivis-project.com/
- MoJ 2026 voice/publicity guideline: https://www.moj.go.jp/content/001468286.pdf
- ElevenLabs STS: https://elevenlabs.io/docs/capabilities/voice-changer , pricing https://elevenlabs.io/pricing
- Resemble STS: https://docs.resemble.ai/voice-generation/speech-to-speech
- Azure voice conversion: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-conversion
- HF ZeroGPU quotas: https://huggingface.co/docs/hub/en/spaces-zerogpu
- Japanese Seed-VC hands-on: https://www.techno-edge.net/article/2024/10/17/3768.html , https://gihyo.jp/admin/serial/01/ubuntu-recipe/0886
