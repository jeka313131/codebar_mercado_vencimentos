import { getIdToken } from "../utils/firebase/auth.js";

export async function apiFetch(path, { method = "GET", body } = {}) {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const headers = { Authorization: `Bearer ${token}` };
  const init = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(path, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível completar a operação.");
  }

  return data;
}
