import { Router } from "express";
import { runExpiryAlerts } from "../alertJob.js";

const router = Router();

function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({ error: "CRON_SECRET não configurado." });
    return;
  }

  const header = req.headers.authorization ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || req.headers["x-cron-secret"];

  if (token !== secret) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }

  next();
}

router.post("/send-alerts", requireCronSecret, async (req, res) => {
  try {
    const force = req.query.force === "true" || req.body?.force === true;
    const summary = await runExpiryAlerts({ force });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message || "Falha ao executar alertas." });
  }
});

export default router;
