import cron from "node-cron";
import { runExpiryAlerts } from "./alertJob.js";
import { getBrasiliaNow } from "./timezone.js";

export function startAlertCron() {
  if (process.env.ENABLE_ALERT_CRON === "false") {
    console.log("[cron] Alertas automáticos desabilitados (ENABLE_ALERT_CRON=false).");
    return;
  }

  cron.schedule(
    "0 * * * *",
    async () => {
      const { hour } = getBrasiliaNow();
      console.log(`[cron] Verificando alertas — ${hour}h Brasília`);
      try {
        const summary = await runExpiryAlerts();
        console.log(
          `[cron] Concluído: ${summary.usersProcessed} usuário(s), ${summary.messagesSent} mensagem(ns)`,
        );
        if (summary.errors.length) {
          console.warn("[cron] Erros:", summary.errors);
        }
      } catch (error) {
        console.error("[cron] Falha:", error.message);
      }
    },
    { timezone: "America/Sao_Paulo" },
  );

  console.log("[cron] Job de alertas ativo (a cada hora, fuso America/Sao_Paulo).");
}
