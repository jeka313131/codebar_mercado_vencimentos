import {
  ALERT_DAYS,
  filterUnsentProducts,
  insertAlertLogs,
  listAllAlertUsers,
  listProductsExpiringOn,
  listUsersForAlertHour,
} from "./alertStore.js";
import { sendWhatsAppToGroup } from "./evolution.js";
import { addDaysToIso, getBrasiliaNow } from "./timezone.js";

function formatDayLabel(days) {
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function buildMessage(daysBeforeExpiry, products) {
  const header = `🔔 *Alerta Venceu* — vence em ${formatDayLabel(daysBeforeExpiry)}`;
  const lines = products.map((p) => `• ${p.name} (qtd: ${p.quantity ?? 1})`);
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
      for (const days of ALERT_DAYS) {
        const expiryDate = addDaysToIso(today, days);
        const products = await listProductsExpiringOn(user.id, expiryDate);
        const pending = await filterUnsentProducts(products, days);

        if (!pending.length) continue;

        const message = buildMessage(days, pending);
        await sendWhatsAppToGroup(user.whatsapp_group_id, message);
        await insertAlertLogs(user.id, pending, days, message);
        summary.messagesSent += 1;
      }
    } catch (error) {
      summary.errors.push({ userId: user.id, error: error.message });
    }
  }

  return summary;
}
