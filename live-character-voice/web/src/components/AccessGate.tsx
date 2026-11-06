// Hosted engines can be protected with an access code (LCV_ACCESS_CODE). Asks once, remembers it.
import { useEffect, useState } from "react";
import { getCode, setCode } from "../net/base";

export function AccessGate({ required }: { required: boolean }) {
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (required && !getCode()) setOpen(true);
  }, [required]);
  useEffect(() => {
    const on = () => {
      setWrong(Boolean(getCode()));
      setOpen(true);
    };
    window.addEventListener("lcv-need-code", on);
    return () => window.removeEventListener("lcv-need-code", on);
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur" data-testid="access-gate">
      <form
        className="panel w-full max-w-sm animate-rise !bg-panel p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setCode(value);
          window.location.reload();
        }}
      >
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-accent to-aqua text-xl shadow-glow">🔒</div>
        <h2 className="text-center font-display text-xl font-semibold">Access code</h2>
        <p className="mt-1 text-center text-sm text-muted">This engine is private. Enter the access code you set for it.</p>
        <input autoFocus type="password" className="field mt-4 text-center font-mono" placeholder="access code" aria-label="Access code"
          value={value} onChange={(e) => setValue(e.target.value)} />
        {wrong && <p className="mt-2 text-center text-sm text-peak">That code was not accepted.</p>}
        <button type="submit" className="btn-primary mt-4 w-full" disabled={!value.trim()}>Unlock</button>
      </form>
    </div>
  );
}
