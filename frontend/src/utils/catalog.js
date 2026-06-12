export function findByBarcode(catalog, barcode) {
  const code = barcode?.trim();
  if (!code) return null;
  return catalog.find((item) => item.barcode === code) ?? null;
}

export function searchByName(catalog, query, limit = 8) {
  const term = query?.trim().toLowerCase();
  if (!term || term.length < 2) return [];
  return catalog.filter((item) => item.name.toLowerCase().includes(term)).slice(0, limit);
}

export function debounce(fn, delayMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
