import { Router } from "express";
import {
  filterGroupsForUser,
  getInstanceConnectionState,
  getInstancePhone,
  sendWhatsAppToGroup,
  verifyGroupMembership,
} from "../evolution.js";
import { requireFirebaseUser } from "../middleware/requireFirebaseUser.js";
import { getUserById, updateWhatsappSettings } from "../userStore.js";

const router = Router();

function formatPhoneBr(digits) {
  const d = String(digits).replace(/\D/g, "");
  if (d.length < 12) return d;
  const local = d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return d;
}

router.get("/instance", requireFirebaseUser, async (_req, res) => {
  try {
    const [connection, phoneInfo] = await Promise.all([
      getInstanceConnectionState(),
      getInstancePhone(),
    ]);

    res.json({
      connected: connection.connected,
      phone: phoneInfo.phone,
      phoneFormatted: phoneInfo.phone ? formatPhoneBr(phoneInfo.phone) : null,
      dev: connection.dev || phoneInfo.dev,
    });
  } catch (error) {
    res.status(502).json({ error: error.message || "Não foi possível consultar a instância." });
  }
});

router.get("/groups", requireFirebaseUser, async (req, res) => {
  const user = await getUserById(req.firebaseUser.uid);
  if (!user?.phone) {
    res.status(400).json({ error: "WhatsApp não verificado." });
    return;
  }

  try {
    const groups = await filterGroupsForUser(user.phone);
    res.json(groups);
  } catch (error) {
    res.status(502).json({ error: error.message || "Não foi possível listar os grupos." });
  }
});

router.post("/verify-group", requireFirebaseUser, async (req, res) => {
  const groupJid = String(req.body?.groupJid || "").trim();
  if (!groupJid) {
    res.status(400).json({ error: "Selecione um grupo." });
    return;
  }

  const user = await getUserById(req.firebaseUser.uid);
  if (!user?.phone) {
    res.status(400).json({ error: "WhatsApp não verificado." });
    return;
  }

  try {
    const result = await verifyGroupMembership(groupJid, user.phone);
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: error.message || "Não foi possível verificar o grupo." });
  }
});

router.post("/test", requireFirebaseUser, async (req, res) => {
  const groupJid = String(req.body?.groupJid || "").trim();
  if (!groupJid) {
    res.status(400).json({ error: "Selecione um grupo." });
    return;
  }

  const user = await getUserById(req.firebaseUser.uid);
  if (!user?.phone) {
    res.status(400).json({ error: "WhatsApp não verificado." });
    return;
  }

  try {
    const check = await verifyGroupMembership(groupJid, user.phone);
    if (!check.connected) {
      res.status(400).json({ error: check.reason || "Grupo não conectado." });
      return;
    }

    await sendWhatsAppToGroup(
      groupJid,
      "✅ Teste de alerta — Venceu\nSeu grupo está configurado corretamente.",
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(502).json({ error: error.message || "Não foi possível enviar o teste." });
  }
});

router.put("/group", requireFirebaseUser, async (req, res) => {
  const groupJid = String(req.body?.groupJid || "").trim();
  const testConfirmed = Boolean(req.body?.testConfirmed);
  const alertStartHour = Number(req.body?.alertStartHour);

  if (!groupJid) {
    res.status(400).json({ error: "Selecione um grupo." });
    return;
  }

  if (!testConfirmed) {
    res.status(400).json({ error: "Envie um teste antes de salvar." });
    return;
  }

  if (!Number.isInteger(alertStartHour) || alertStartHour < 0 || alertStartHour > 23) {
    res.status(400).json({ error: "Selecione uma hora de início válida." });
    return;
  }

  const user = await getUserById(req.firebaseUser.uid);
  if (!user?.phone) {
    res.status(400).json({ error: "WhatsApp não verificado." });
    return;
  }

  try {
    const check = await verifyGroupMembership(groupJid, user.phone);
    if (!check.connected) {
      res.status(400).json({ error: check.reason || "Grupo não conectado." });
      return;
    }

    await updateWhatsappSettings(req.firebaseUser.uid, {
      groupId: groupJid,
      alertStartHour,
    });
    res.json({ ok: true, whatsappGroupId: groupJid, alertStartHour });
  } catch (error) {
    res.status(500).json({ error: error.message || "Não foi possível salvar o grupo." });
  }
});

export default router;
