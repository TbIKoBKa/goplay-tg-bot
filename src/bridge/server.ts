import type { Server, ServerWebSocket } from "bun";
import { parseBridgeMessage, type BridgeRequest, type BridgeResponse } from "./protocol";

type ClientRole = "bridge" | "api";
type WsData = { authenticated: boolean; role: ClientRole | null };

type PendingRequest = {
  resolve: (res: BridgeResponse) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class BridgeServer {
  private server: Server<WsData> | null = null;
  private bridge: ServerWebSocket<WsData> | null = null;
  private apiClients = new Set<ServerWebSocket<WsData>>();
  private pending = new Map<string, PendingRequest>();

  constructor(
    private readonly port: number,
    private readonly secret: string,
  ) {}

  start(): void {
    this.server = Bun.serve<WsData>({
      port: this.port,
      fetch(req, server) {
        if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
          const upgraded = server.upgrade(req, { data: { authenticated: false, role: null } });
          if (!upgraded) {
            return new Response("WebSocket upgrade failed", { status: 400 });
          }
          return;
        }

        return new Response("OK", { status: 200 });
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
          if (this.bridge === ws) {
            this.bridge = null;
            console.log("[bridge] bridge client disconnected");
          }
          this.apiClients.delete(ws);
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
    this.bridge?.close();
    for (const ws of this.apiClients) ws.close();
    this.apiClients.clear();
    this.server?.stop();
    console.log("[bridge] stopped");
  }

  get connected(): boolean {
    return this.bridge !== null;
  }

  execute(server: string, command: string, timeoutMs = 10_000): Promise<BridgeResponse> {
    return new Promise((resolve) => {
      if (!this.bridge) {
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
      this.bridge.send(JSON.stringify(request));
    });
  }

  private handleMessage(ws: ServerWebSocket<WsData>, text: string): void {
    const msg = parseBridgeMessage(text);
    if (!msg) {
      console.warn("[bridge] failed to parse message:", text.slice(0, 200));
      return;
    }

    if (msg.type === "auth") {
      if (msg.secret !== this.secret) {
        console.warn("[bridge] auth failed, closing");
        ws.close(1008, "Invalid secret");
        return;
      }

      ws.data.authenticated = true;
      ws.data.role = msg.role;

      if (msg.role === "bridge") {
        this.bridge = ws;
        console.log("[bridge] bridge client authenticated");
      } else {
        this.apiClients.add(ws);
        console.log("[bridge] api client authenticated");
      }

      ws.send(JSON.stringify({ type: "auth", success: true }));
      return;
    }

    if (!ws.data.authenticated) {
      ws.close(1008, "Not authenticated");
      return;
    }

    if (msg.type === "response" && ws.data.role === "bridge") {
      const pending = this.pending.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);
        pending.resolve(msg);
      }
      return;
    }

    if (msg.type === "request" && ws.data.role === "api") {
      console.log(`[bridge] forwarding api request ${msg.id} -> ${msg.server}: ${msg.command}`);
      this.forwardApiRequest(ws, msg);
      return;
    }

    console.warn(`[bridge] unhandled message type=${msg.type} role=${ws.data.role}`);
  }

  private forwardApiRequest(sender: ServerWebSocket<WsData>, req: BridgeRequest): void {
    console.log(`[bridge] bridge connected: ${this.bridge !== null}`);
    if (!this.bridge) {
      sender.send(JSON.stringify({
        type: "response",
        id: req.id,
        success: false,
        message: "Bridge not connected",
      }));
      return;
    }

    const timer = setTimeout(() => {
      this.pending.delete(req.id);
      sender.send(JSON.stringify({
        type: "response",
        id: req.id,
        success: false,
        message: "Request timed out",
      }));
    }, 10_000);

    this.pending.set(req.id, {
      resolve: (res) => {
        sender.send(JSON.stringify(res));
      },
      timer,
    });

    this.bridge.send(JSON.stringify(req));
  }
}
