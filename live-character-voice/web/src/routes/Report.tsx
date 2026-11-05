import { Link, useParams } from "react-router-dom";

export function Report() {
  const { id = "" } = useParams();
  const base = `/api/sessions/${id}`;
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="text-accent" to={`/session/${id}`}>← back to player</Link>
        <a className="text-accent" href={`${base}/record`} download={`${id}_record.json`}>record.json</a>
        <a className="text-accent" href={`${base}/lines.csv`} download>lines.csv</a>
      </div>
      <iframe title="Session report" src={`${base}/report`} className="h-[80vh] w-full rounded-panel border border-line bg-panel" />
    </main>
  );
}
