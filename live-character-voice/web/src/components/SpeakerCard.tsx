import { useState } from "react";
import type { SpeakerView } from "../store/session";
import type { VoiceRef } from "../types/protocol";
import { Avatar } from "../ui/kit";
import { ArousalMeter, EmotionChip } from "./EmotionChip";
import { VoiceSelect } from "./VoiceSelect";

interface Props {
  speaker: SpeakerView;
  voices: VoiceRef[];
  onVoice: (voiceId: string) => void;
  onPreview: (url: string) => void;
  /** other commentators, for "same person as…" */
  others?: SpeakerView[];
  onMerge?: (intoId: string) => void;
  onRename?: (name: string) => void;
}

export function SpeakerCard({ speaker, voices, onVoice, onPreview, others = [], onMerge, onRename }: Props) {
  const voice = voices.find((v) => v.voice_id === speaker.voiceId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(speaker.name);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-3.5" data-testid={`speaker-${speaker.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        {voice ? <Avatar name={voice.name} id={voice.voice_id} size={30} /> : null}
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: speaker.color }} />
        {editing && onRename ? (
          <form className="flex flex-1 gap-1" onSubmit={(e) => { e.preventDefault(); onRename(name); setEditing(false); }}>
            <input autoFocus className="field !py-1 text-sm" value={name} maxLength={40} aria-label={`Name for ${speaker.id}`} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="btn-ghost !px-2 !py-1 !text-xs">Save</button>
          </form>
        ) : (
          <button type="button" className="font-semibold hover:underline" title="Rename" onClick={() => { setName(speaker.name); setEditing(true); }} disabled={!onRename}>
            {speaker.name}
          </button>
        )}
        <span className="text-xs text-muted">{speaker.id}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <VoiceSelect voices={voices} value={speaker.voiceId} onChange={onVoice} label={`Voice for ${speaker.name}`} />
        <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => voice && onPreview(voice.preview_url)} aria-label={`Preview ${voice?.name ?? "voice"}`}>
          ▶ preview
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="flex items-center gap-2">now: <EmotionChip emotion={speaker.emotion} /> <ArousalMeter arousal={speaker.arousal} /></span>
        {onMerge && others.length > 0 && (
          <select className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-muted" value="" aria-label={`${speaker.name} is the same person as`}
            onChange={(e) => e.target.value && onMerge(e.target.value)} title="Fix a split: this label is really another commentator">
            <option value="">Same person as…</option>
            {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
