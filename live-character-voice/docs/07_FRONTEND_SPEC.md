# 07 — Frontend Spec (Pilot web player)

## 7.1 Goal
A clean, dark, broadcast-style web player where a viewer can watch a recorded match streamed as live, hear each commentator in a chosen character voice, switch voices while it plays, and see the delay of every line.

## 7.2 Tech
React 18 + TypeScript (strict) + Vite + Tailwind CSS + Zustand. No UI kit needed; build small components. Font: **Sora** (Google Fonts) for headings and body. Icons: inline SVG.

## 7.3 Screens

### Screen 1 — Home (`/`)
- Title: "Live Sports Character Voice — Pilot"
- List of clips from `GET /api/clips` (name, duration) + "Upload clip" button.
- Max commentators selector (2 or 3).
- "Start session" → `POST /api/sessions` → navigate to `/session/:id`.
- Status card: backend health + models loaded (from `/api/health`).

### Screen 2 — Player (`/session/:id`)
Layout (desktop ≥ 1200 px; stacks vertically on narrow screens):

```
┌───────────────────────────────────────────────┬──────────────────────────┐
│                                               │  COMMENTATORS            │
│              VIDEO (16:9)                     │  ● Commentator 1  [▼ The Veteran ] [▶ preview]
│                                               │     now: EXCITED ▮▮▮▯     │
│                                               │  ● Commentator 2  [▼ Hype Host  ] [▶]
│                                               │     now: CALM ▮▯▯▯        │
│                                               │──────────────────────────│
├───────────────────────────────────────────────┤  LIVE TRANSCRIPT         │
│ ▶/❚❚  00:12:41  LIVE ●   delay 2.1 s (p95 3.8)│  12:38 S1 [peak] "And he's through…"  2.1 s
│ Original commentary ──○──── 25%               │  12:35 S2 [calm] "Lovely ball from…"   1.9 s
│ Character voices     ────○── 100%             │  …auto-scrolls, newest at top            │
│ Ducking              on/off                   │──────────────────────────│
│                                               │  DELAY (last 2 min) sparkline            │
│                                               │  [Export delay log CSV]                  │
└───────────────────────────────────────────────┴──────────────────────────┘
```

Before start: a big "Start live playback" button (needed anyway: browsers require a user gesture before playing audio).

### Screen 3 — Session report (`/session/:id/report`)
Renders `GET /api/sessions/{id}/report` (HTML) + download links for `record.json` and `lines.csv`.

## 7.4 Audio graph (Web Audio API)

```
<video> ──► MediaElementAudioSourceNode ──► GainNode "originalGain" ──┐
                                                                      ├──► AudioContext.destination
TTS AudioBuffer (per line) ──► AudioBufferSourceNode ──► GainNode "voiceGain" ──┘
```

- `video.muted = false` but its audio is routed through the graph (creating a MediaElementSource takes over the element's output).
- **Ducking:** when a voice line starts, ramp `originalGain` from the user's level to `level * 0.25` over 80 ms; ramp back 150 ms after the line ends (unless another line starts). Use `linearRampToValueAtTime`.
- **Scheduling:** on `audio.ready`, fetch + `decodeAudioData` the wav immediately (pre-load), then schedule start at the AudioContext time that corresponds to `play_at_media`:
  `ctxStart = ctx.currentTime + (play_at_media − video.currentTime)`; if that is in the past by < 0.5 s, play now; if > 0.5 s late, play now and mark `late=true` in the transcript.
- Report back `{type:"played", line_id, client_media_time}`.

## 7.5 Live behaviour
- The video is "live": no seeking, no scrubbing. Pause button = stop session (confirm dialog).
- Clock sync per `05 §5.4`: ping/pong, keep `video.currentTime` within 300 ms of server time using `playbackRate` nudges.
- Voice dropdown change → send `set_voice`; show a small "applies from next line" toast.
- Preview button plays `/media/previews/<voice>.wav` through `voiceGain` (does not duck).
- When a new speaker appears (`speaker.new`) add its card with the default voice.

## 7.6 State (Zustand)
```ts
type SessionState = {
  status: 'idle'|'ready'|'live'|'ended'|'error';
  speakers: Record<string, {id:string; name:string; color:string; voiceId:string; emotion?:Emotion; arousal?:number}>;
  lines: LineView[];                 // newest first, cap 500 in memory
  metrics: {p50:number; p95:number; last:number; drift:number; dropped:number};
  voices: Voice[];
  levels: {original:number; voice:number; ducking:boolean};
};
```

## 7.7 Visual style
- Background `#0B0F14`, panels `#121821`, borders `#1E2733`, text `#E6EDF5`, muted `#8A97A8`, accent `#4FA3FF`.
- Emotion chips: calm `#5BC0BE`, neutral `#8A97A8`, excited `#F5A524`, peak `#F31260`.
- Speaker colours from the server (`speaker.color`).
- Rounded 12 px panels, 16 px spacing, Sora 14 px body / 20 px headings.
- Accessible: all controls keyboard reachable, visible focus ring, colour never the only signal (emotion chips include the word).

## 7.8 Tests
- Unit (Vitest): protocol message reducer, clock-sync maths, schedule-time maths, ducking envelope builder.
- E2E smoke (Playwright, headless Chromium): start backend with the synthetic clip at `speed=4` (dev only), open player, click start, assert ≥ 5 transcript lines appear and a voice switch message is sent. Save a screenshot to `outputs/ui/player.png` and commit it so the user can see the UI.
