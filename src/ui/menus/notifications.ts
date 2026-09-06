import { InlineKeyboard, backRow, cb } from "../keyboard";
import { findTopic, topicGroups } from "../../push/topics";
import type { MenuRequest, MenuView } from "../types";

/**
 * Меню тем уведомлений. Одна кнопка на тему, состояние прямо на кнопке:
 * галочка означает "приходит", крестик - "выключено".
 */
export function notificationsMenu(req: MenuRequest): MenuView {
  const { prefs } = req.deps;
  let toast: string | undefined;

  if (req.action === "t" && req.arg) {
    const topic = findTopic(req.arg);
    if (topic) {
      const enabled = prefs.toggle(req.chatId, topic.id, topic.defaultOn);
      toast = enabled ? `Включено: ${topic.title}` : `Выключено: ${topic.title}`;
    }
  }

  const choices = prefs.choicesOf(req.chatId);
  const keyboard = new InlineKeyboard();
  const lines = ["🔔 <b>Уведомления</b>", "", "Нажми на тему, чтобы включить или выключить."];

  let first = true;
  for (const group of topicGroups()) {
    lines.push("", `<b>${group.group}</b>`);
    for (const topic of group.topics) {
      const enabled = choices.get(topic.id) ?? topic.defaultOn;
      const mark = enabled ? "✅" : "❌";
      // В тексте только подсказка: состояние и так видно на кнопке, а дублировать
      // его значит удвоить высоту экрана на телефоне.
      lines.push(`<b>${topic.title}</b> - ${topic.hint}`);
      // Ряд открываем только между кнопками, иначе первой строкой уедет пустой.
      if (!first) keyboard.row();
      keyboard.text(`${mark} ${topic.title}`, cb("notif", "t", topic.id));
      first = false;
    }
  }

  return {
    text: lines.join("\n"),
    keyboard: backRow(keyboard),
    ...(toast ? { toast } : {}),
  };
}
