const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function formatDateBr(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

export function formatDateBrYy(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

export function isoToDateBrFull(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function maskDateBrInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateBrToIso(text) {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00`);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return null;
  }
  return iso;
}

export function formatExpiryLabel(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  const weekday = WEEKDAYS[date.getDay()];
  return `Venc: ${formatDateBr(isoDate)} (${weekday})`;
}

export function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysIso(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysUntilExpiry(isoDate) {
  const today = new Date(`${todayIso()}T12:00:00`);
  const expiry = new Date(`${isoDate}T12:00:00`);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}
