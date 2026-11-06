import { describe, expect, it } from "vitest";
import { initialState, recentDelays, reduce, toCsv, type SessionState } from "./session";
import type { ServerMessage } from "../types/protocol";

const run = (msgs: ServerMessage[], s: SessionState = initialState) => msgs.reduce(reduce, s);

const ready: ServerMessage = {
  type: "session.ready",
  session_id: "s1",
  media_url: "/media/clips/a.mp4",
  speakers_max: 2,
  voices: [
    { voice_id: "bm_george", name: "The Veteran", preview_url: "/p/bm_george.wav" },
    { voice_id: "am_adam", name: "Hype Host", preview_url: "/p/am_adam.wav" },
  ],
};

describe("session reducer", () => {
  it("walks a session from ready to ended", () => {
    const s = run([
      ready,
      { type: "session.started", server_wall: 0 },
      { type: "speaker.new", speaker: { speaker_id: "S1", display_name: "Commentator 1", color: "#4FA3FF", voice_id: "bm_george" } },
      { type: "line.complete", line: { line_id: "L000001", t_start: 1, t_end: 3, text: "Goal!", speaker_id: "S1", emotion: "peak", arousal: 2.2 } },
      { type: "line.complete", line: { line_id: "L000002", t_start: 4, t_end: 6, text: "Lovely.", speaker_id: "S1", emotion: "calm", arousal: -1 } },
      { type: "audio.ready", line_id: "L000001", voice_id: "bm_george", url: "/x.wav", duration: 1, play_at_media: 5.1, schedule_action: "none", delay_ready: 2.0 },
      { type: "metrics", p50_delay: 2, p95_delay: 3, last_delay: 2, drift_slope: 0, lines: 2, dropped: 0 },
      { type: "session.ended", report_url: "/api/sessions/s1/report" },
    ]);
    expect(s.status).toBe("ended");
    expect(s.lines.map((l) => l.lineId)).toEqual(["L000002", "L000001"]); // newest first
    expect(s.lines[1]?.delay).toBeCloseTo(4.1); // felt delay: voice start (5.1) − line start
    expect(s.lines[1]?.playAt).toBe(5.1);
    expect(s.speakers.S1?.emotion).toBe("calm");
    expect(s.metrics.p95).toBe(3);
    expect(s.reportUrl).toBe("/api/sessions/s1/report");
    expect(recentDelays(s)[0]?.t).toBe(5.1);
    expect(recentDelays(s)[0]?.d).toBeCloseTo(4.1);
  });

  it("keeps the chosen voice when the server updates a speaker without one", () => {
    const s = run([
      ready,
      { type: "speaker.new", speaker: { speaker_id: "S2", display_name: "C2", color: "#F5A524", voice_id: null } },
    ]);
    expect(s.speakers.S2?.voiceId).toBe("bm_george"); // falls back to the first voice
    const s2 = reduce(s, { type: "speaker.updated", speaker: { speaker_id: "S2", display_name: "C2", color: "#F5A524", voice_id: "am_adam" } });
    expect(s2.speakers.S2?.voiceId).toBe("am_adam");
    expect(s2.speakerOrder).toEqual(["S2"]);
  });

  it("caps the transcript and exports CSV in time order", () => {
    let s = run([ready]);
    for (let i = 0; i < 520; i++) {
      s = reduce(s, { type: "line.complete", line: { line_id: `L${i}`, t_start: i, t_end: i + 1, text: `say "${i}"`, speaker_id: null, emotion: null, arousal: null } });
    }
    expect(s.lines.length).toBe(500);
    const csv = toCsv(s.lines.slice(0, 2));
    const rows = csv.trim().split("\n");
    expect(rows[1]?.startsWith("L518,")).toBe(true);
    expect(rows[2]).toContain('"say ""519"""');
  });
});
