// Where the engine lives. Same origin when the engine serves the app (local `make serve`, the
// Hugging Face Space); a separate host when the app is deployed on Vercel (VITE_API_BASE).
// Hosted engines can require an access code (LCV_ACCESS_CODE): sent as a header on fetches and
// as ?code= on URLs that browsers load by themselves (audio, video, WebSocket).
export const API_BASE: string = ((import.meta.env.VITE_API_BASE as string | undefined) ?? "").replace(/\/$/, "");

const CODE_KEY = "lcv.accessCode";

export function getCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setCode(code: string): void {
  try {
    localStorage.setItem(CODE_KEY, code.trim());
  } catch {
    /* private mode */
  }
}

/** Absolute engine URL for a server path ("/media/…", "/api/…"); other URLs pass through. */
export function withBase(path: string): string;
export function withBase(path: string | null | undefined): string | undefined;
export function withBase(path: string | null | undefined): string | undefined {
  if (!path) return path ?? undefined;
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const code = getCode();
  const url = `${API_BASE}${path}`;
  if (!code || !/^\/(api|media|ws)\//.test(path)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}code=${encodeURIComponent(code)}`;
}

/** fetch() against the engine with the access code; a 401 asks the app for a (new) code. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const code = getCode();
  if (code) headers.set("X-Access-Code", code);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) window.dispatchEvent(new Event("lcv-need-code"));
  return res;
}

export function wsUrl(path: string): string {
  const http = API_BASE || window.location.origin;
  const ws = http.replace(/^http/, "ws");
  const code = getCode();
  return `${ws}${path}${code ? `${path.includes("?") ? "&" : "?"}code=${encodeURIComponent(code)}` : ""}`;
}
