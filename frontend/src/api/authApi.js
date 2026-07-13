import { apiFetch } from "./http.js";

async function authFetch(path, body) {
  return apiFetch(path, { method: "POST", body });
}

export function fetchProfile() {
  return apiFetch("/api/auth/profile");
}

export function savePhone(phone) {
  return authFetch("/api/auth/phone", { phone });
}

export function syncUserToSupabase() {
  return authFetch("/api/auth/sync-user", {});
}

export function saveWhatsappGroup(groupJid, testConfirmed, settings = {}) {
  return apiFetch("/api/whatsapp/group", {
    method: "PUT",
    body: { groupJid, testConfirmed, ...settings },
  });
}
