// Live session socket: typed send, validated receive, ping/pong every 10 s for clock sync.
import { parseServerMessage, type ClientMessage, type ServerMessage } from "../types/protocol";

export type Listener = (msg: ServerMessage) => void;

export class SessionSocket {
  private ws: WebSocket | null = null;
  private pingTimer: number | null = null;
  private listeners = new Set<Listener>();
  private pending = new Map<number, number>(); // t → local send time
  onPong: ((tSent: number, serverWall: number, localNow: number) => void) | null = null;
  onClose: (() => void) | null = null;
  sent: ClientMessage[] = []; // for tests / debugging

  constructor(private readonly url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = () => {
        this.pingTimer = window.setInterval(() => this.ping(), 10_000);
        resolve();
      };
      ws.onerror = () => reject(new Error("WebSocket connection failed"));
      ws.onclose = () => {
        if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
        this.onClose?.();
      };
      ws.onmessage = (ev: MessageEvent<string>) => {
        let raw: unknown;
        try {
          raw = JSON.parse(ev.data);
        } catch {
          return;
        }
        const msg = parseServerMessage(raw);
        if (!msg) return;
        if (msg.type === "pong" && this.onPong && msg.server_wall !== undefined) {
          const sentAt = this.pending.get(msg.t);
          if (sentAt !== undefined) {
            this.pending.delete(msg.t);
            this.onPong(sentAt, msg.server_wall, performance.now() / 1000);
          }
        }
        for (const l of this.listeners) l(msg);
      };
    });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(msg: ClientMessage): void {
    this.sent.push(msg);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  ping(): void {
    const t = Math.round(performance.now()) / 1000;
    this.pending.set(t, performance.now() / 1000);
    this.send({ type: "ping", t });
  }

  close(): void {
    if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
    this.ws?.close();
  }
}
