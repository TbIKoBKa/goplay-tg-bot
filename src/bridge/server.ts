import type { Server, ServerWebSocket } from "bun";
import { parseBridgeMessage, type BridgeRequest, type BridgeResponse } from "./protocol";

type ClientRole = "bridge" | "api";
type WsData = { id: string; authenticated: boolean; role: ClientRole | null };

type PendingRequest = {
  resolve: (res: BridgeResponse) => void;
  timer: ReturnType<typeof setTimeout>;
  /** Соединение, ожидающее ответ (для api-клиентов). Для запросов бота — null. */
  owner: ServerWebSocket<WsData> | null;
};

const REQUEST_TIMEOUT_MS = 10_000;
/** Верхняя граница текста рассылки — 4096 в Telegram плюс запас на HTML-разметку. */
const MAX_NOTIFY_LENGTH = 8192;

/** Сравнение секретов за постоянное время. */
function secretsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function safeSend(ws: ServerWebSocket<WsData>, payload: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch (err) {
    console.error("[bridge] send failed:", err);
  }
}

export class BridgeServer {
  private server: Server<WsData> | null = null;
  private bridge: ServerWebSocket<WsData> | null = null;
  private apiClients = new Set<ServerWebSocket<WsData>>();
  private pending = new Map<string, PendingRequest>();
  private notifySecret: string | null = null;
  private notifyHandler: ((text: string) => Promise<unknown>) | null = null;

  constructor(
    private readonly port: number,
    private readonly secret: string,
  ) {}

  /**
   * Включает HTTP-эндпоинт POST /notify на публичном порту бриджа.
   * Источник (сайт/cron) шлёт { "text": "..." } с заголовком x-notify-secret.
   * Бот рассылает текст подписчикам.
   */
  onNotify(secret: string, handler: (text: string) => Promise<unknown>): void {
    this.notifySecret = secret;
    this.notifyHandler = handler;
  }

  start(): void {
    const self = this;
    this.server = Bun.serve<WsData>({
      port: this.port,
      async fetch(req, server) {
        if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
          const upgraded = server.upgrade(req, {
            data: { id: crypto.randomUUID(), authenticated: false, role: null },
          });
          if (!upgraded) {
            return new Response("WebSocket upgrade failed", { status: 400 });
          }
          return;
        }

        const url = new URL(req.url);

        if (req.method === "POST" && url.pathname === "/notify") {
          return self.handleNotify(req);
        }

        if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
          return Response.json({
            status: "ok",
            bridgeConnected: self.connected,
            apiClients: self.apiClients.size,
          });
        }

        return new Response("not found", { status: 404 });
      },
      websocket: {
        open: () => {
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
          this.dropPendingOf(ws);
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

  execute(server: string, command: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<BridgeResponse> {
    return new Promise((resolve) => {
      const bridge = this.bridge;
      if (!bridge || bridge.readyState !== WebSocket.OPEN) {
        resolve({ type: "response", id: "", success: false, message: "Bridge not connected" });
        return;
      }

      const id = crypto.randomUUID();
      const request: BridgeRequest = { type: "request", id, server, command };

      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ type: "response", id, success: false, message: "Request timed out" });
      }, timeoutMs);

      this.pending.set(id, { resolve, timer, owner: null });
      safeSend(bridge, request);
    });
  }

  private async handleNotify(req: Request): Promise<Response> {
    if (!this.notifyHandler || !this.notifySecret) {
      return new Response("notify disabled", { status: 404 });
    }
    if (!secretsEqual(req.headers.get("x-notify-secret") ?? "", this.notifySecret)) {
      return new Response("forbidden", { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response("bad json", { status: 400 });
    }

    const text = (body as { text?: unknown })?.text;
    if (typeof text !== "string" || !text.trim()) {
      return new Response("missing text", { status: 400 });
    }
    if (text.length > MAX_NOTIFY_LENGTH) {
      return new Response("text too long", { status: 413 });
    }

    // Рассылка идёт минутами — отвечаем сразу, чтобы источник не держал соединение.
    void this.notifyHandler(text).catch((err) => {
      console.error("[notify] broadcast failed:", err);
    });
    return new Response("accepted", { status: 202 });
  }

  private handleMessage(ws: ServerWebSocket<WsData>, text: string): void {
    const msg = parseBridgeMessage(text);
    if (!msg) {
      console.warn("[bridge] failed to parse message:", text.slice(0, 200));
      return;
    }

    if (msg.type === "auth") {
      if (!secretsEqual(msg.secret, this.secret)) {
        console.warn("[bridge] auth failed, closing");
        ws.close(1008, "Invalid secret");
        return;
      }

      ws.data.authenticated = true;
      ws.data.role = msg.role;

      if (msg.role === "bridge") {
        if (this.bridge && this.bridge !== ws) {
          console.warn("[bridge] replacing previously connected bridge client");
          this.bridge.close(1000, "Replaced by new bridge connection");
        }
        this.bridge = ws;
        console.log("[bridge] bridge client authenticated");
      } else {
        this.apiClients.add(ws);
        console.log("[bridge] api client authenticated");
      }

      safeSend(ws, { type: "auth", success: true });
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
    if (!this.bridge || this.bridge.readyState !== WebSocket.OPEN) {
      safeSend(sender, {
        type: "response",
        id: req.id,
        success: false,
        message: "Bridge not connected",
      });
      return;
    }

    // Наружу идёт собственный id: id от api-клиента не уникален между клиентами
    // и мог бы затереть чужой ожидающий запрос.
    const internalId = crypto.randomUUID();

    const timer = setTimeout(() => {
      this.pending.delete(internalId);
      safeSend(sender, {
        type: "response",
        id: req.id,
        success: false,
        message: "Request timed out",
      });
    }, REQUEST_TIMEOUT_MS);

    this.pending.set(internalId, {
      owner: sender,
      timer,
      resolve: (res) => safeSend(sender, { ...res, id: req.id }),
    });

    safeSend(this.bridge, { ...req, id: internalId });
  }

  /** Снимает ожидающие запросы отключившегося api-клиента. */
  private dropPendingOf(ws: ServerWebSocket<WsData>): void {
    for (const [id, req] of this.pending) {
      if (req.owner === ws) {
        clearTimeout(req.timer);
        this.pending.delete(id);
      }
    }
  }
}
