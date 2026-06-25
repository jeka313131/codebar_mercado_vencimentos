import {
  attachDaysRemaining,
  filterUnsentAlertEntries,
  insertAlertLogs,
  listAllAlertUsers,
  listProductsExpiringWithin,
  listUsersForAlertHour,
} from "./alertStore.js";
import { sendWhatsAppToGroup } from "./evolution.js";
import { getBrasiliaNow } from "./timezone.js";

function formatDayLabel(days) {
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function buildMessage(entries) {
  const header = "🔔 *Alerta Venceu*";
  const lines = entries.map(
    ({ product, daysBeforeExpiry }) =>
      `• ${product.name} — vence em ${formatDayLabel(daysBeforeExpiry)} (qtd: ${product.quantity ?? 1})`,
  );
  return `${header}\n\n${lines.join("\n")}`;
}

export async function runExpiryAlerts({ force = false } = {}) {
  const { hour, date: today } = getBrasiliaNow();
  const users = force ? await listAllAlertUsers() : await listUsersForAlertHour(hour);

  const summary = {
    hour,
    today,
    timezone: "America/Sao_Paulo",
    usersProcessed: 0,
    messagesSent: 0,
    errors: [],
  };

  for (const user of users) {
    summary.usersProcessed += 1;

    try {
      const maxDays = user.alert_days_before ?? 7;
      const products = await listProductsExpiringWithin(user.id, today, maxDays);
      const withDays = attachDaysRemaining(products, today);
      const pending = await filterUnsentAlertEntries(withDays);

      if (pending.length) {
        const message = buildMessage(pending);
        await sendWhatsAppToGroup(user.whatsapp_group_id, message);
        await insertAlertLogs(user.id, pending, message);
        summary.messagesSent += 1;
      }
    } catch (error) {
      summary.errors.push({ userId: user.id, error: error.message });
    }
  }

  return summary;
}
