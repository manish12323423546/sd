import { Link, useParams } from "react-router-dom";

export function Report() {
  const { id = "" } = useParams();
  const base = `/api/sessions/${id}`;
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-12 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link className="btn-ghost !py-1.5" to={`/session/${id}`}>← Back to player</Link>
        <a className="btn-ghost !py-1.5" href={`${base}/record`} download={`${id}_record.json`}>record.json</a>
        <a className="btn-ghost !py-1.5" href={`${base}/lines.csv`} download>lines.csv</a>
      </div>
      <iframe title="Session report" src={`${base}/report`} className="panel h-[80vh] w-full" />
    </main>
  );
}
