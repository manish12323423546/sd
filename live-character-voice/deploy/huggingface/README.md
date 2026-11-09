---
title: Live Character Voice
emoji: 🎙️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: Re-voice live sports commentary with character voices
---

Engine (API + web app) for Live Character Voice. Source: https://github.com/manish12323423546/sd
(`live-character-voice/`). Secrets used: `FISH_API_KEY`, `GROQ_API_KEY`, `DEEPGRAM_API_KEY`, `LCV_ACCESS_CODE`, `LCV_ADMIN_CODE`, `HF_TOKEN` (optional).

Voice Studio: duplicate this Space as a **private** Space and add the variable `LCV_ROLE=studio`.
Cloned voices live in a private dataset (`<owner>/altercast-voices`) and survive restarts —
see docs/VOICE_LIBRARY.md in the repository.
