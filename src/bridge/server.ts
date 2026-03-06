import type { Server, ServerWebSocket } from "bun";
import { parseBridgeMessage, type BridgeRequest, type BridgeResponse } from "./protocol";

type WsData = { authenticated: boolean };

type PendingRequest = {
  resolve: (res: BridgeResponse) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class BridgeServer {
  private server: Server<WsData> | null = null;
  private client: ServerWebSocket<WsData> | null = null;
  private pending = new Map<string, PendingRequest>();

  constructor(
    private readonly port: number,
    private readonly secret: string,
  ) {}

  start(): void {
    this.server = Bun.serve<WsData>({
      port: this.port,
      fetch(req, server) {
        const upgraded = server.upgrade(req, { data: { authenticated: false } });
        if (!upgraded) {
          return new Response("WebSocket upgrade failed", { status: 400 });
        }
      },
      websocket: {
        open: (ws) => {
          console.log("[bridge] client connected, awaiting auth...");
        },
        message: (ws, raw) => {
          const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
          this.handleMessage(ws, text);
        },
        close: (ws) => {
          if (this.client === ws) {
            this.client = null;
            console.log("[bridge] client disconnected");
          }
        },
      },
    });
    console.log(`[bridge] WebSocket server listening on port ${this.port}`);
  }

  stop(): void {
    for (const [id, req] of this.pending) {
      clearTimeout(req.timer);
      req.resolve({ type: "response", id, success: false, message: "Bridge shutting down" });
    }
    this.pending.clear();
    this.client?.close();
    this.server?.stop();
    console.log("[bridge] stopped");
  }

  get connected(): boolean {
    return this.client !== null;
  }

  execute(server: string, command: string, timeoutMs = 10_000): Promise<BridgeResponse> {
    return new Promise((resolve) => {
      if (!this.client) {
        resolve({ type: "response", id: "", success: false, message: "Bridge not connected" });
        return;
      }

      const id = crypto.randomUUID();
      const request: BridgeRequest = { type: "request", id, server, command };

      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ type: "response", id, success: false, message: "Request timed out" });
      }, timeoutMs);

      this.pending.set(id, { resolve, timer });
      this.client.send(JSON.stringify(request));
    });
  }

  private handleMessage(ws: ServerWebSocket<WsData>, text: string): void {
    const msg = parseBridgeMessage(text);
    if (!msg) return;

    if (msg.type === "auth") {
      if (msg.secret === this.secret) {
        ws.data.authenticated = true;
        this.client = ws;
        console.log("[bridge] client authenticated");
      } else {
        console.warn("[bridge] auth failed, closing");
        ws.close(1008, "Invalid secret");
      }
      return;
    }

    if (!ws.data.authenticated) {
      ws.close(1008, "Not authenticated");
      return;
    }

    if (msg.type === "response") {
      const pending = this.pending.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);
        pending.resolve(msg);
      }
    }
  }
}
