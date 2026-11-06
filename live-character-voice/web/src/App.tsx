import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { AccessGate } from "./components/AccessGate";
import { KeysDialog, openKeys } from "./components/KeysDialog";
import { api, type Health } from "./net/api";
import { Home } from "./routes/Home";
import { LiveCapture } from "./routes/LiveCapture";
import { QualityLab } from "./routes/QualityLab";
import { Player } from "./routes/Player";
import { Report } from "./routes/Report";
import { VoiceLab } from "./routes/VoiceLab";
import { Dot } from "./ui/kit";

function EnginePills() {
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => {
    const load = () => api.health().then(setH).catch(() => setH(null));
    void load();
    const t = window.setInterval(load, 15000);
    window.addEventListener("engines-changed", load);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("engines-changed", load);
    };
  }, []);
  const e = h?.engines ?? {};
  const items = [
    { k: "voices", label: e.voices?.online ? "Fish Audio" : "Offline voices" },
    { k: "text", label: e.text?.online ? (e.text?.name ?? "Online").split(" ")[0] + (/backup: Deepgram/.test(e.text?.note ?? "") ? " + Deepgram" : "") : "Offline text" },
  ];
  if (!h) return <span className="text-xs text-muted">connecting…</span>;
  return (
    <div className="hidden items-center gap-2 lg:flex" data-testid="engine-pills">
      {items.map((it) => (
        <button type="button" key={it.k} title={e[it.k]?.note ?? ""} onClick={openKeys}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted transition hover:border-accent/50 hover:text-ink">
          <Dot ok={Boolean(e[it.k]?.online)} />
          {it.label}
        </button>
      ))}
      <button type="button" onClick={openKeys} className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted transition hover:border-accent/50 hover:text-ink">
        Keys
      </button>
    </div>
  );
}

function GateFromHealth() {
  const [required, setRequired] = useState(false);
  useEffect(() => {
    api.health().then((h) => setRequired(Boolean(h.access_code_required))).catch(() => undefined);
  }, []);
  return <AccessGate required={required} />;
}

const tab = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`;

export function App() {
  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Altercast home">
            <img src="/favicon.svg" alt="" className="brand-mark h-8 w-8" />
            <span className="hidden leading-none sm:block">
              <span className="block font-display text-[17px] font-bold tracking-[-0.03em]">altercast</span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Live Character Voice</span>
            </span>
          </Link>
          <nav className="ml-2 flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            <NavLink to="/" end className={tab}>Studio</NavLink>
            <NavLink to="/live" className={tab}>Live capture</NavLink>
            <NavLink to="/voices" className={tab}>Voice Lab</NavLink>
            <NavLink to="/lab" className={tab}>Quality Lab</NavLink>
          </nav>
          <div className="ml-auto">
            <EnginePills />
          </div>
        </div>
      </header>
      <KeysDialog />
      <GateFromHealth />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/voices" element={<VoiceLab />} />
        <Route path="/live" element={<LiveCapture />} />
        <Route path="/lab" element={<QualityLab />} />
        <Route path="/session/:id" element={<Player />} />
        <Route path="/session/:id/report" element={<Report />} />
      </Routes>
    </div>
  );
}
