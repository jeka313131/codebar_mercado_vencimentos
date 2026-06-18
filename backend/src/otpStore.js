const store = new Map();

const TTL_MS = 10 * 60 * 1000;

export function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function saveOtp(uid, phone, code) {
  store.set(uid, {
    phone,
    code,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function verifyOtp(uid, phone, code) {
  const entry = store.get(uid);
  if (!entry) return { ok: false, reason: "Código expirado ou não solicitado." };
  if (Date.now() > entry.expiresAt) {
    store.delete(uid);
    return { ok: false, reason: "Código expirado. Solicite um novo." };
  }
  if (entry.phone !== phone) {
    return { ok: false, reason: "Número não confere com o código enviado." };
  }
  if (entry.code !== code) {
    return { ok: false, reason: "Código incorreto." };
  }

  store.delete(uid);
  return { ok: true };
}

export function canResend(uid) {
  const entry = store.get(uid);
  if (!entry) return true;
  return Date.now() > entry.expiresAt - (TTL_MS - 60 * 1000);
}
