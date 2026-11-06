import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { KeysDialog, openKeys } from "./components/KeysDialog";
import { api, type Health } from "./net/api";
import { Home } from "./routes/Home";
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
    { k: "text", label: e.text?.online ? "Groq" : "Offline text" },
  ];
  if (!h) return <span className="text-xs text-muted">connecting…</span>;
  return (
    <div className="flex items-center gap-2" data-testid="engine-pills">
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

const tab = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`;

export function App() {
  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent to-violet shadow-glow">
              <span className="flex h-3.5 items-end gap-[2px]">
                {[0.5, 1, 0.7, 0.9].map((h, i) => (
                  <span key={i} className="w-[3px] rounded-full bg-white" style={{ height: `${h * 100}%` }} />
                ))}
              </span>
            </span>
            <span className="hidden font-display text-[15px] font-semibold tracking-tight sm:inline">
              Live Character Voice
            </span>
          </Link>
          <nav className="ml-2 flex items-center gap-1">
            <NavLink to="/" end className={tab}>Studio</NavLink>
            <NavLink to="/voices" className={tab}>Voice Lab</NavLink>
          </nav>
          <div className="ml-auto">
            <EnginePills />
          </div>
        </div>
      </header>
      <KeysDialog />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/voices" element={<VoiceLab />} />
        <Route path="/session/:id" element={<Player />} />
        <Route path="/session/:id/report" element={<Report />} />
      </Routes>
    </div>
  );
}
