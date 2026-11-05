# 12 — Costs and Paid Upgrades

## 12.1 Cost of this build: $0
| Item | Cost | Note |
|---|---|---|
| All code libraries and models in `03` | $0 | Open-source licences |
| Claude Code cloud machine | $0 extra | Counts toward your Claude plan's usage limits; no separate charge for the VM (per Claude Code docs) |
| GitHub private repo + Actions for lint/tests | $0 | Free tier is enough for this size |
| Hosting | $0 | Not needed for A/B; see `13` |

## 12.2 Where paid services would help later (not used now)

Prices below were checked in November 2026 from the sources listed; they change often, so re-check before buying. Items marked **[Unverified]** were not confirmed from a current source.

| Need | Option | Price (as found) | What it improves | Source |
|---|---|---|---|---|
| Faster, more accurate live speech-to-text | Deepgram **Flux** (streaming, English) | $0.0065/min (promotional); multilingual $0.0078/min | Lower delay (true streaming with end-of-turn detection), better accuracy in noise | https://diyai.io/ai-tools/speech-to-text/deepgram-pricing-2026/ |
| | Deepgram **Nova-3** streaming | $0.0048/min monolingual (promotional; listed regular $0.0077) | Cheaper streaming ASR | same |
| | Deepgram streaming **diarization** add-on | +$0.0020/min | Speaker labels from the ASR service | same |
| | Deepgram new-account credit | $200 free credit, no card | Enough to test many hours before paying | same |
| Expressive character voices with emotion tags | Fish Audio **Drama 3** API | $50 per 1M characters (promo $10 per 1M was advertised until 12 Nov 2026) | Much richer emotion control (bracket direction tags), custom designed voices | https://fish.audio (pricing page) |
| Cleaner game sound in real time | AudioShake Dialogue (real-time separation) | **[Unverified]** — sales/contract pricing | Removes commentary instead of just turning it down | https://www.audioshake.ai |
| GPU hosting for open models | e.g. a cloud GPU (L4/A10 class) | **[Unverified]** — roughly $0.40–$1.20/hour depending on provider | Lets larger open models run with low delay | provider pages |
| Hosting the Pilot backend publicly | Hugging Face Docker Space | Free CPU hardware exists (2 vCPU, 16 GB RAM), but Docker Spaces require a PRO account; PRO price **[Unverified]** | Public demo link | https://huggingface.co/docs/hub/en/spaces-overview |

## 12.3 Rough running cost per hour of live content (for planning only)
Assumptions (estimates, not measurements): commentators speak ~150 words/min ≈ 900 characters/min ≈ 54,000 characters/hour.

| Item | Per hour | How |
|---|---|---|
| Deepgram Flux ASR | ≈ $0.39 | 60 min × $0.0065 |
| Deepgram diarization | ≈ $0.12 | 60 min × $0.0020 |
| Fish Audio Drama 3 TTS, **per voice stream** | ≈ $2.70 | 54,000 chars × $50/1M |
| **Total with one voice stream** | **≈ $3.21/hour** | |

Key insight for the business model: TTS cost scales with the number of **distinct voices being generated**, not the number of viewers. Viewers who pick the same voice can share the same generated audio. So 10,000 viewers across 4 voices ≈ 4 voice streams ≈ $11/hour of TTS, plus ASR once. (Estimate; confirm after real measurements.)

## 12.4 How a paid provider plugs in later
1. Add a class in `engine/providers/paid/` implementing the same `Protocol`.
2. Read the API key from an environment variable (never commit it).
3. Switch `provider:` in `config/engine.yaml`.
4. Re-run the POC benchmark and compare reports side by side.
