# Hosting (V5): web app on Vercel + engine on a Hugging Face Space

```
 browser ──► https://<project>.vercel.app      (web app, Vercel — redeploys on every git push)
    │  fetch / WebSocket / audio  (VITE_API_BASE, access code)
    ▼
 https://<user>-live-character-voice.hf.space (engine: FastAPI + models, Docker Space, free
                                               CPU basic 2 vCPU / 16 GB; also serves the full app)
    │ Groq (speech-to-text) · Fish Audio (voices)   keys = Space secrets
```

## Why not the engine on Vercel
Vercel Functions (checked in Vercel's docs, Nov 2026): Python bundle ≤ 500 MB (the engine needs
PyTorch + speech models, > 1 GB); WebSockets close when the function reaches its max duration
(300 s on Hobby) while a match/stream session lasts minutes to hours; each request may hit a
different instance, but a session keeps its state in one process. So Vercel hosts the web app
(static, global CDN, auto-deploy) and the engine runs where a long-lived process is allowed.

## Engine — Hugging Face Space (one-time, ~3 minutes)
1. https://huggingface.co/new-space → name `live-character-voice`, SDK **Docker** (blank),
   hardware **CPU basic (free)**, visibility public or private → Create.
2. Upload `deploy/huggingface/Dockerfile` and `deploy/huggingface/README.md` to the Space
   (Files → Add file → Upload files) — or `git clone` the Space and copy them in.
3. Settings → Variables and secrets → **New secret**: `FISH_API_KEY`, `GROQ_API_KEY`,
   `LCV_ACCESS_CODE` (any password you choose — protects your credit).
   Optional: `DEEPGRAM_API_KEY` (speech-to-text, used first when it works), `LCV_ADMIN_CODE`
   (a second password: lets you paste/replace keys and pick the speech-to-text engine from the
   app's **Keys & engines** dialog), `HF_TOKEN` (a *write* token from
   https://huggingface.co/settings/tokens — then keys set in the app are saved as Space secrets
   and survive restarts).
4. The first build takes ~15–20 min (Python, PyTorch, models). Then
   `https://<user>-live-character-voice.hf.space` is the full app.

Automatic updates: the image clones the GitHub branch; `start.sh` pulls the latest commit on every
start, and the running app checks GitHub every 5 min (`LCV_AUTO_UPDATE=1`) and restarts itself onto
a new commit when no session is running. Free Spaces sleep after 48 h without visitors (first
visit wakes it, ~1–2 min). Custom voices are stored in the container and are lost on a rebuild —
re-clone them in the Voice Lab or upgrade the Space with persistent storage.

## Web app — Vercel
Project root `live-character-voice/web` (Vite, `vercel.json` handles SPA routes), env
`VITE_API_BASE=https://<user>-live-character-voice.hf.space`. Every push to the branch deploys.
The Chrome extension works with the hosted engine too: popup → Engine → URL + access code.

## Engine settings (env)
`LCV_ACCESS_CODE`, `LCV_CORS_ORIGINS` (extra origins; *.vercel.app is allowed by default),
`LCV_AUTO_UPDATE`, `LCV_UPDATE_EVERY_S`, `PORT` (start.sh, default 7860). See `app/hosting.py`.
