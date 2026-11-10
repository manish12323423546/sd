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

## Set-up: one secret, the app does the rest

1. Open **https://huggingface.co/settings/tokens** → **Create new token** → Token type **Write**
   → name `altercast` → **Create token** → copy it (starts with `hf_`). Never paste it in a chat.
2. Open **https://huggingface.co/spaces/manishvk18/live-character-voice/settings** →
   *Variables and secrets* → **New secret** → Name `HF_TOKEN`, Value = the token → **Save**.

The Space restarts and then sets everything up by itself (engine/studio_setup.py):
- creates the private voice library `manishvk18/altercast-voices`;
- creates the private Space `manishvk18/altercast-voice-studio` (role `studio`, same keys) — or, if
  it exists, makes it private and sets its role. First start of the Studio takes 15–20 minutes;
- from then on the app's voices are read-only and come from the library.
`/api/health` → `voice_library` shows the result (`studio.state`, `voices`, `error`).

Voices that are on the app's disk at that moment are lost by this restart (as with every restart
until now) unless you first paste the token in the app's **Keys** dialog (needs `LCV_ADMIN_CODE`),
which saves them to the library before restarting. Other Spaces with "studio" in the name
(earlier manual duplicates) are never touched; they are listed as `studio.strays` — delete them
in their own Settings → *Delete this Space*.

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
