import { InlineKeyboard, backRow, cb } from "../keyboard";
import { escapeHtml } from "../../bot/format";
import type { MenuRequest, MenuView } from "../types";

/**
 * Профиль игрока. Пока показывает только привязку: статистика приезжает сюда
 * следующей фазой, когда серверы научатся её отдавать.
 */
export function profileMenu(req: MenuRequest): MenuView {
  const { links } = req.deps;
  let toast: string | undefined;

  if (req.action === "unlink" && req.arg === "yes") {
    toast = links.unlink(req.chatId) ? "Привязка снята" : "Аккаунт и так не привязан";
  }

  const link = links.byTelegramId(req.chatId);

  if (!link) {
    const text = [
      "👤 <b>Профиль</b>",
      "",
      "Аккаунт не привязан.",
      "",
      "Зайди на любой режим и набери в чате <code>/tg</code>.",
      "Бот откроется по ссылке сам, ничего вводить не надо.",
      "",
      "После привязки здесь появится статистика, а уведомления станут личными:",
      "рейд твоей базы, просевший щит, сгорающий стрик квестов.",
    ].join("\n");

    return { text, keyboard: backRow(new InlineKeyboard()), ...(toast ? { toast } : {}) };
  }

  const linkedAt = new Date(link.linkedAt).toLocaleDateString("ru-RU");
  const text = [
    "👤 <b>Профиль</b>",
    "",
    `Аккаунт: <b>${escapeHtml(link.nick)}</b>`,
    `Привязан: ${linkedAt}`,
    "",
    "Цифры по режимам лежат в разделе «Статистика».",
    "Привилегия и её срок показаны там же, отдельно для каждого сервера:",
    "они не общие, на каждом режиме своя.",
  ].join("\n");

  const keyboard = new InlineKeyboard();
  if (req.action === "unlink") {
    keyboard.text("Да, отвязать", cb("profile", "unlink", "yes")).row();
    keyboard.text("Отмена", cb("profile"));
  } else {
    keyboard.text("📊 Статистика", cb("stats")).row();
    keyboard.text("Отвязать аккаунт", cb("profile", "unlink"));
  }

  return { text, keyboard: backRow(keyboard), ...(toast ? { toast } : {}) };
}
