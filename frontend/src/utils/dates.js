const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function formatDateBr(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}`;
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
