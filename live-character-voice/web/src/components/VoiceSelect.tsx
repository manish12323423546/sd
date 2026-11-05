import type { VoiceRef } from "../types/protocol";

interface Props {
  voices: VoiceRef[];
  value: string;
  onChange: (voiceId: string) => void;
  label: string;
}

export function VoiceSelect({ voices, value, onChange, label }: Props) {
  return (
    <select
      aria-label={label}
      className="rounded-md border border-line bg-bg px-2 py-1 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {voices.map((v) => (
        <option key={v.voice_id} value={v.voice_id}>
          {v.name}
        </option>
      ))}
    </select>
  );
}
