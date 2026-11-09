# Voice library: cloned voices that never disappear, managed only by you

**Problem:** a Hugging Face Space's disk is wiped on every restart, and cloned voices were files on
that disk — so they vanished. Anyone using the app could also clone or delete voices.

**Fix:**

```
   You (owner)                                    Everyone else
┌────────────────────────┐   saves    ┌──────────────────────────┐   reads every minute   ┌──────────────────────┐
│ Voice Studio            │ ────────▶ │ Voice library             │ ─────────────────────▶ │ Altercast app          │
│ private Space (only you)│           │ private HF dataset        │                        │ public Space           │
│ clone · keep/hide · del │ ◀──────── │ <you>/altercast-voices    │                        │ voices read-only       │
└────────────────────────┘           └──────────────────────────┘                        └──────────────────────┘
```

- **Voice library** — a *private* Hugging Face dataset, created automatically
  (`manishvk18/altercast-voices`). Permanent, versioned, free. Restarts never touch it.
- **Voice Studio** — a second, *private* Space (a duplicate of the app with `LCV_ROLE=studio`).
  Only you can open it. Clone voices (instant or professional), then choose **In app** / **Hidden**,
  or **Delete**. Every change is saved to the library immediately.
- **The app** — only *uses* voices: it shows the ones marked In app and picks up Studio changes
  within a minute (or immediately after a restart). Cloning and deleting are switched off there.
- Both Spaces update themselves from GitHub, like now.

## Set-up (about 10 minutes, once)

### 1. Make a Hugging Face token (free)
1. Open **https://huggingface.co/settings/tokens** (sign in as manishvk18).
2. Click **Create new token** → Token type **Write** → name it `altercast` → **Create token**.
3. Copy it (it starts with `hf_`). Never paste it in a chat — only in the places below.

### 2. Save the voices that are on the app right now (before any restart)
Saving a Space secret restarts the Space and would wipe the voices still on its disk. So first:
1. Open the app → **Keys** (top right) → enter your **admin code** (`LCV_ADMIN_CODE`).
2. Paste the token into the **Hugging Face** card → **Save & connect**.
3. It answers e.g. "voice library ready; saved 2 voice(s) from this server: ace, mickey".
   The token is then also stored as the Space secret `HF_TOKEN`, and the Space restarts by
   itself; after ~2 minutes the voices load back from the library.

(No admin code set? Then add `HF_TOKEN` directly under Space → Settings → Variables and secrets →
New secret. The voices currently on the disk can't be saved that way; clone them again in the Studio.)

### 3. Create your private Voice Studio
1. Open **https://huggingface.co/spaces/manishvk18/live-character-voice**.
2. Click **⋮** (top right, next to *Settings*) → **Duplicate this Space**.
3. Owner `manishvk18`, Space name `altercast-voice-studio`, Visibility **Private**,
   Hardware **CPU basic (free)**.
4. In the secrets list it shows, fill in `HF_TOKEN` (the same token), `FISH_API_KEY` (needed
   for previews), and optionally `GROQ_API_KEY` / `DEEPGRAM_API_KEY`. → **Duplicate Space**.
5. In the new Space: **Settings → Variables and secrets → New variable** →
   name `LCV_ROLE`, value `studio` → Save (it restarts once).
6. Open it from **https://huggingface.co/spaces/manishvk18/altercast-voice-studio** (private:
   only you, signed in). It opens on **Voice Library**.

## Daily use
- **Clone:** Studio → **Clone a voice** → instant (6–15 s) or professional (1–10 min). Saved at once.
- **Choose what the app offers:** Studio → **Voice Library** → **In app** / **Hidden**.
- **Remove:** **Delete** (removes it from the library and, within a minute, from the app).
- **Check:** the Studio shows where voices are stored and when it last synced; the app's health
  (`/api/health` → `voice_library`) shows `role: "app"`, `can_edit: false`.

## For later (website / other hosting)
The library is behind a small interface (`engine/voice_library.py`): today a Hugging Face dataset;
`LCV_VOICE_LIBRARY=dir:/path` uses any folder or persistent disk instead. Any future host just
points at the same library — the voices follow.

## Settings reference
| Setting | Where | Meaning |
|---|---|---|
| `HF_TOKEN` | secret, both Spaces | Hugging Face **write** token (stores the library) |
| `LCV_ROLE` | variable | `studio` (Voice Studio), `app` (default on a Space with a library), `all` (local dev) |
| `LCV_VOICE_LIBRARY` | variable, optional | `owner/name` dataset (default `<space owner>/altercast-voices`) or `dir:/path` |
| `LCV_VOICES_DIR` | variable, optional | this server's working copy of the voices |
