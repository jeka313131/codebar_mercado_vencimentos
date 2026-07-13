import { Router } from "express";
import { normalizeBrWhatsAppPhone } from "../evolution.js";
import { requireFirebaseUser } from "../middleware/requireFirebaseUser.js";
import { getUserById, updateUserPhone } from "../userStore.js";
import { syncUserFromFirebase, syncUserPhoneVerified } from "../userSync.js";

const router = Router();

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

router.post("/phone", requireFirebaseUser, async (req, res) => {
  const phone = normalizeBrWhatsAppPhone(req.body?.phone, { log: false });
  if (!phone) {
    res.status(400).json({ error: "Informe um WhatsApp com 11 dígitos (DDD + número)." });
    return;
  }

  const uid = req.firebaseUser.uid;

  try {
    await updateUserPhone(uid, phone, req.firebaseUser);
    await syncUserPhoneVerified(uid, phone, req.firebaseUser);
    const user = await getUserById(uid);
    res.json(user ?? { ok: true, phone });
  } catch (error) {
    res.status(500).json({ error: error.message || "Não foi possível salvar o WhatsApp." });
  }
});

export default router;
