import { describe, expect, it } from "vitest";
import { isPong, parseServerMessage } from "./protocol";

// Example messages copied from docs/05 §5.4.
const EXAMPLES = [
  `{ "type": "session.ready", "session_id": "abc", "media_url": "/media/clips/match1.mp4", "speakers_max": 3, "voices": [ {"voice_id":"bm_george","name":"The Veteran","preview_url":"/media/previews/bm_george.wav"} ] }`,
  `{ "type": "session.started", "server_wall": 0.0 }`,
  `{ "type": "speaker.new", "speaker": {"speaker_id":"S1","display_name":"Commentator 1","color":"#4FA3FF","voice_id":"bm_george"} }`,
  `{ "type": "line.complete", "line": { "line_id":"L000042","t_start":61.2,"t_end":64.0, "text":"And he's through on goal!","speaker_id":"S1","emotion":"peak","arousal":2.1 } }`,
  `{ "type": "audio.ready", "line_id":"L000042","voice_id":"bm_george", "url":"/media/tts/s/L000042_bm_george_ab.wav", "duration":2.3, "play_at_media":66.1, "schedule_action":"none", "delay_ready":2.1 }`,
  `{ "type": "metrics", "p50_delay":2.2, "p95_delay":3.9, "last_delay":2.1, "drift_slope":0.001, "lines":42, "dropped":0 }`,
  `{ "type": "warning", "message":"Delay above 6 s, catch-up active" }`,
  `{ "type": "session.ended", "report_url":"/api/sessions/abc/report" }`,
  `{ "type": "pong", "t": 123.4 }`,
];

describe("protocol", () => {
  it("parses every example message from docs/05", () => {
    for (const raw of EXAMPLES) {
      const msg = parseServerMessage(JSON.parse(raw));
      expect(msg, raw).not.toBeNull();
      expect(msg?.type).toBe(JSON.parse(raw).type);
    }
  });

  it("rejects malformed or unknown messages", () => {
    expect(parseServerMessage(null)).toBeNull();
    expect(parseServerMessage({ type: "audio.ready", line_id: "L1" })).toBeNull();
    expect(parseServerMessage({ type: "nope" })).toBeNull();
    expect(parseServerMessage({ type: "line.complete", line: { line_id: 3 } })).toBeNull();
  });

  it("recognises pong", () => {
    expect(isPong({ type: "pong", t: 1 })).toBe(true);
    expect(isPong({ type: "ping", t: 1 })).toBe(false);
  });
});
