const TZ = "America/Sao_Paulo";

export function getBrasiliaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "0";

  return {
    hour: Number(get("hour")) % 24,
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function addDaysToIso(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetweenIso(fromIso, toIso) {
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}
