import { Link, Route, Routes } from "react-router-dom";
import { Home } from "./routes/Home";
import { Player } from "./routes/Player";
import { Report } from "./routes/Report";

export function App() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <Link to="/" className="text-[20px] font-semibold">
          Live Sports Character Voice <span className="text-muted">— Pilot</span>
        </Link>
        <span className="text-xs text-muted">free, CPU-only engine · original voices only</span>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session/:id" element={<Player />} />
        <Route path="/session/:id/report" element={<Report />} />
      </Routes>
    </div>
  );
}
