import { describe, expect, test } from "bun:test";
import { openDb } from "../db";
import { LinksRepo } from "../db/repos/links";
import { LoginGuardRepo } from "../db/repos/login-guard";
import { LoginGuard, type ConfirmSender, type LoginCheck, type LoginReply } from "./login-guard";

const UUID = "00000000-0000-0000-0000-000000000001";
const CHAT = 111;

function setup(opts: { linked?: boolean; enabled?: boolean; timeoutMs?: number; failSend?: boolean } = {}) {
  const db = openDb(":memory:");
  const links = new LinksRepo(db);
  const repo = new LoginGuardRepo(db);
  if (opts.linked ?? true) links.link(CHAT, UUID, "Steve");
  if (opts.enabled) repo.setEnabled(UUID, true);

  const sent: { chatId: number; text: string; keys: string[] }[] = [];
  const edits: string[] = [];
  const sender: ConfirmSender = {
    ask: async (chatId, text, keyboard) => {
      if (opts.failSend) throw new Error("bot was blocked by the user");
      const keys = keyboard.inline_keyboard.flat().map((b) => ("callback_data" in b ? b.callback_data : ""));
      sent.push({ chatId, text, keys });
      return sent.length;
    },
    edit: async (_chatId, _messageId, text) => {
      edits.push(text);
    },
  };
  const guard = new LoginGuard({ links, repo, sender, timeoutMs: opts.timeoutMs ?? 1_000 });
  return { guard, repo, sent, edits };
}

function check(over: Partial<LoginCheck> = {}): LoginCheck {
  return { id: "req", uuid: UUID, nick: "Steve", ip: "1.2.3.4", required: false, ...over };
}

async function run(guard: LoginGuard, c: LoginCheck): Promise<LoginReply[]> {
  const replies: LoginReply[] = [];
  await guard.handle(c, (r) => replies.push(r));
  return replies;
}

/** Ключ из callback_data кнопки «Подтвердить»: v1:auth:ok:<ключ>. */
const keyOf = (data: string): string => data.split(":")[3] ?? "";

describe("LoginGuard", () => {
  test("подтверждение выключено - пускаем сразу", async () => {
    const { guard, sent } = setup();
    expect(await run(guard, check())).toEqual([{ decision: "allow" }]);
    expect(sent).toHaveLength(0);
  });

  test("включено - шлём кнопки и отвечаем pending", async () => {
    const { guard, sent } = setup({ enabled: true });
    expect(await run(guard, check())).toEqual([{ decision: "pending" }]);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.chatId).toBe(CHAT);
    expect(sent[0]?.text).toContain("1.2.3.4");
    expect(sent[0]?.keys[0]).toMatch(/^v1:auth:ok:/);
    expect(Buffer.byteLength(sent[0]?.keys[1] ?? "")).toBeLessThanOrEqual(64);
  });

  test("«Подтвердить» пускает и запоминает IP, второй вход без вопросов", async () => {
    const { guard, repo, sent, edits } = setup({ enabled: true });
    const replies: LoginReply[] = [];
    await guard.handle(check(), (r) => replies.push(r));

    const toast = await guard.resolve(CHAT, keyOf(sent[0]?.keys[0] ?? ""), true);
    expect(toast).toBe("Вход подтверждён");
    expect(replies).toEqual([{ decision: "pending" }, { decision: "allow" }]);
    expect(repo.isTrusted(UUID, "1.2.3.4")).toBe(true);
    expect(edits[0]).toContain("Вход подтверждён");

    expect(await run(guard, check({ id: "req2" }))).toEqual([{ decision: "allow" }]);
    expect(sent).toHaveLength(1);
  });

  test("«Это не я» отказывает с причиной rejected и IP не доверяет", async () => {
    const { guard, repo, sent } = setup({ enabled: true });
    const replies: LoginReply[] = [];
    await guard.handle(check(), (r) => replies.push(r));

    await guard.resolve(CHAT, keyOf(sent[0]?.keys[1] ?? ""), false);
    expect(replies.at(-1)).toEqual({ decision: "deny", reason: "rejected" });
    expect(repo.isTrusted(UUID, "1.2.3.4")).toBe(false);
  });

  test("чужой чат не может подтвердить", async () => {
    const { guard, sent } = setup({ enabled: true });
    await run(guard, check());
    expect(await guard.resolve(999, keyOf(sent[0]?.keys[0] ?? ""), true)).toBe("Это не твой запрос");
    expect(guard.pendingCount).toBe(1);
  });

  test("без ответа - отказ по таймауту", async () => {
    const { guard, edits } = setup({ enabled: true, timeoutMs: 20 });
    const replies: LoginReply[] = [];
    await guard.handle(check(), (r) => replies.push(r));
    await Bun.sleep(60);
    expect(replies.at(-1)).toEqual({ decision: "deny", reason: "timeout" });
    expect(edits[0]).toContain("истёк");
    expect(guard.pendingCount).toBe(0);
  });

  test("второй вход, пока ждём первый, - busy", async () => {
    const { guard } = setup({ enabled: true });
    await run(guard, check());
    expect(await run(guard, check({ id: "req2", ip: "5.6.7.8" }))).toEqual([{ decision: "deny", reason: "busy" }]);
  });

  test("больше пяти запросов за 10 минут - rate_limited", async () => {
    const { guard, sent } = setup({ enabled: true });
    for (let i = 0; i < 5; i++) {
      await run(guard, check({ id: `r${i}`, ip: `9.9.9.${i}` }));
      await guard.resolve(CHAT, keyOf(sent[i]?.keys[1] ?? ""), false);
    }
    expect(await run(guard, check({ id: "r6", ip: "9.9.9.6" }))).toEqual([{ decision: "deny", reason: "rate_limited" }]);
  });

  test("персонал без привязки - not_linked, обычный игрок без привязки - пускаем", async () => {
    const { guard } = setup({ linked: false, enabled: true });
    expect(await run(guard, check({ required: true }))).toEqual([{ decision: "deny", reason: "not_linked" }]);
    expect(await run(guard, check())).toEqual([{ decision: "allow" }]);
  });

  test("персоналу подтверждение нужно даже если сам игрок его не включал", async () => {
    const { guard, sent } = setup({ enabled: false });
    expect(await run(guard, check({ required: true }))).toEqual([{ decision: "pending" }]);
    expect(sent).toHaveLength(1);
  });

  test("бот заблокирован: игрока пускаем, персонал нет", async () => {
    const player = setup({ enabled: true, failSend: true });
    expect(await run(player.guard, check())).toEqual([{ decision: "pending" }, { decision: "allow" }]);
    expect(player.guard.pendingCount).toBe(0);

    const staff = setup({ enabled: true, failSend: true });
    expect(await run(staff.guard, check({ required: true }))).toEqual([
      { decision: "pending" },
      { decision: "deny", reason: "undeliverable" },
    ]);
  });
});
