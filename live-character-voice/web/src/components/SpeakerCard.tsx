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
}

export function SpeakerCard({ speaker, voices, onVoice, onPreview }: Props) {
  const voice = voices.find((v) => v.voice_id === speaker.voiceId);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-3.5" data-testid={`speaker-${speaker.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        {voice ? <Avatar name={voice.name} id={voice.voice_id} size={30} /> : null}
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: speaker.color }} />
        <span className="font-semibold">{speaker.name}</span>
        <span className="text-xs text-muted">{speaker.id}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <VoiceSelect voices={voices} value={speaker.voiceId} onChange={onVoice} label={`Voice for ${speaker.name}`} />
        <button
          type="button"
          className="btn-ghost !px-3 !py-1.5 !text-xs"
          onClick={() => voice && onPreview(voice.preview_url)}
          aria-label={`Preview ${voice?.name ?? "voice"}`}
        >
          ▶ preview
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        now: <EmotionChip emotion={speaker.emotion} /> <ArousalMeter arousal={speaker.arousal} />
      </div>
    </div>
  );
}
