import {
  attachDaysRemaining,
  filterUnsentAlertEntries,
  insertAlertLog,
  listAllAlertUsers,
  listProductsExpiringWithin,
  listUsersForAlertHour,
} from "./alertStore.js";
import { sendWhatsAppMediaToGroup, sendWhatsAppToGroup } from "./evolution.js";
import { getBrasiliaNow } from "./timezone.js";

const SEND_DELAY_MS = 1500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatExpiryCount(days) {
  if (days === 0) return "(HOJE)";
  if (days === 1) return "(AMANHÃ)";
  return `(em ${days} dias)`;
}

function formatDateBr(isoDate) {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function buildCaption({ product, daysBeforeExpiry }) {
  return `Venc: ${formatDateBr(product.expiry_date)} ${formatExpiryCount(daysBeforeExpiry)} - ${product.name}`;
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
      const isMilestones = user.alert_mode === "milestones";
      const milestones = Array.isArray(user.alert_milestones) ? user.alert_milestones : [];
      const maxDays = isMilestones
        ? Math.max(...(milestones.length ? milestones : [0]))
        : user.alert_days_before ?? 7;

      const products = await listProductsExpiringWithin(user.id, today, maxDays);
      const withDays = attachDaysRemaining(products, today);
      const matched = isMilestones
        ? withDays.filter((entry) => milestones.includes(entry.daysBeforeExpiry))
        : withDays;
      const pending = await filterUnsentAlertEntries(matched);

      for (const entry of pending) {
        const caption = buildCaption(entry);
        const imageUrl = entry.product.image_url;

        try {
          if (imageUrl) {
            await sendWhatsAppMediaToGroup(user.whatsapp_group_id, imageUrl, caption);
          } else {
            await sendWhatsAppToGroup(user.whatsapp_group_id, caption);
          }

          await insertAlertLog(user.id, entry.product, entry.daysBeforeExpiry, caption);
          summary.messagesSent += 1;
          await delay(SEND_DELAY_MS);
        } catch (error) {
          summary.errors.push({
            userId: user.id,
            productId: entry.product.id,
            error: error.message,
          });
        }
      }
    } catch (error) {
      summary.errors.push({ userId: user.id, error: error.message });
    }
  }

  return summary;
}
