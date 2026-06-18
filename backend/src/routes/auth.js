import { Router } from "express";
import { sendWhatsAppText } from "../evolution.js";
import { requireFirebaseUser } from "../middleware/requireFirebaseUser.js";
import { canResend, createOtp, saveOtp, verifyOtp } from "../otpStore.js";
import { getUserById, updateUserPhone } from "../userStore.js";
import { syncUserFromFirebase, syncUserPhoneVerified } from "../userSync.js";

const router = Router();

function normalizePhoneInput(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 12 || !digits.startsWith("55")) {
    return null;
  }
  return digits;
}

router.get("/profile", requireFirebaseUser, async (req, res) => {
  try {
    let user = await getUserById(req.firebaseUser.uid);
    if (!user) {
      await syncUserFromFirebase(req.firebaseUser);
      user = await getUserById(req.firebaseUser.uid);
    }
    res.json(user ?? { id: req.firebaseUser.uid, phoneVerified: false, onboardingComplete: false });
  } catch (error) {
    res.status(500).json({ error: error.message || "Não foi possível carregar o perfil." });
  }
});

router.post("/sync-user", requireFirebaseUser, async (req, res) => {
  try {
    await syncUserFromFirebase(req.firebaseUser);
    const user = await getUserById(req.firebaseUser.uid);
    res.json(user ?? { ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Não foi possível sincronizar o usuário." });
  }
});

router.post("/send-code", requireFirebaseUser, async (req, res) => {
  const phone = normalizePhoneInput(req.body?.phone);
  if (!phone) {
    res.status(400).json({ error: "Informe o WhatsApp com DDD (ex.: 5511999999999)." });
    return;
  }

  const uid = req.firebaseUser.uid;

  if (!canResend(uid)) {
    res.status(429).json({ error: "Aguarde 1 minuto antes de solicitar outro código." });
    return;
  }

  const code = createOtp();
  saveOtp(uid, phone, code);

  const message = `Seu código Venceu: ${code}\nVálido por 10 minutos.`;

  try {
    const result = await sendWhatsAppText(phone, message);
    const payload = { ok: true };
    if (result?.dev) {
      payload.devCode = code;
    }
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: error.message || "Não foi possível enviar o código." });
  }
});

router.post("/verify-code", requireFirebaseUser, async (req, res) => {
  const phone = normalizePhoneInput(req.body?.phone);
  const code = String(req.body?.code || "").trim();

  if (!phone || code.length !== 6) {
    res.status(400).json({ error: "WhatsApp e código de 6 dígitos são obrigatórios." });
    return;
  }

  const uid = req.firebaseUser.uid;
  const check = verifyOtp(uid, phone, code);

  if (!check.ok) {
    res.status(400).json({ error: check.reason });
    return;
  }

  try {
    await updateUserPhone(uid, phone, req.firebaseUser);
    await syncUserPhoneVerified(uid, phone, req.firebaseUser);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Não foi possível salvar a verificação." });
  }
});

export default router;
