import { apiFetch } from "./http.js";

export function fetchWhatsappInstance() {
  return apiFetch("/api/whatsapp/instance");
}

export function fetchWhatsappGroups() {
  return apiFetch("/api/whatsapp/groups");
}

export function verifyWhatsappGroup(groupJid) {
  return apiFetch("/api/whatsapp/verify-group", { method: "POST", body: { groupJid } });
}

export function sendWhatsappGroupTest(groupJid) {
  return apiFetch("/api/whatsapp/test", { method: "POST", body: { groupJid } });
}
