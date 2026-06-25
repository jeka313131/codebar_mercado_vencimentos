import { apiFetch } from "./http.js";

async function authFetch(path, body) {
  return apiFetch(path, { method: "POST", body });
}

export function fetchProfile() {
  return apiFetch("/api/auth/profile");
}

export function sendPhoneCode(phone) {
  return authFetch("/api/auth/send-code", { phone });
}

export function verifyPhoneCode(phone, code) {
  return authFetch("/api/auth/verify-code", { phone, code });
}

export function syncUserToSupabase() {
  return authFetch("/api/auth/sync-user", {});
}

export function saveWhatsappGroup(groupJid, testConfirmed, alertStartHour, alertDaysBefore) {
  return apiFetch("/api/whatsapp/group", {
    method: "PUT",
    body: { groupJid, testConfirmed, alertStartHour, alertDaysBefore },
  });
}
