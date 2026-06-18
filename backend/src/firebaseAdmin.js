import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function initFirebaseAdmin() {
  if (getApps().length) {
    return getApps()[0];
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn("[firebase-admin] FIREBASE_SERVICE_ACCOUNT não configurado — rotas de auth desabilitadas.");
    return null;
  }

  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export async function verifyIdToken(token) {
  if (!initFirebaseAdmin()) {
    throw new Error("Autenticação do servidor não configurada.");
  }
  return getAuth().verifyIdToken(token);
}
