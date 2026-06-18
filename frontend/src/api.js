import { apiFetch } from "./api/http.js";

const PLACEHOLDER_IMAGE = "/placeholder-product.svg";

function mapProduct(row) {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    expiryDate: row.expiryDate,
    quantity: row.quantity ?? 1,
    imageUrl: row.imageUrl || PLACEHOLDER_IMAGE,
    createdAt: row.createdAt,
  };
}

export function getPlaceholderImage() {
  return PLACEHOLDER_IMAGE;
}

export async function fetchAllProducts() {
  const data = await apiFetch("/api/products");
  return data.map(mapProduct);
}

export async function fetchProductsExpiring(filterDays) {
  const data = await apiFetch(`/api/products/expiring?days=${filterDays}`);
  return data.map(mapProduct);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

export async function uploadProductImage(file) {
  const data = await readFileAsBase64(file);
  const result = await apiFetch("/api/products/upload-image", {
    method: "POST",
    body: { data, mimeType: file.type || "image/jpeg" },
  });
  return result.url;
}

export async function fetchProductCatalog() {
  const data = await apiFetch("/api/products/catalog");
  return data.map((item) => ({
    barcode: item.barcode,
    name: item.name,
    imageUrl: item.imageUrl || PLACEHOLDER_IMAGE,
  }));
}

export async function updateProduct(id, { barcode, name, expiryDate, quantity, imageUrl }) {
  const data = await apiFetch(`/api/products/${id}`, {
    method: "PUT",
    body: { barcode, name, expiryDate, quantity, imageUrl },
  });
  return mapProduct(data);
}

export async function deleteProduct(id) {
  await apiFetch(`/api/products/${id}`, { method: "DELETE" });
}

export async function saveProduct({ barcode, name, expiryDate, quantity, imageUrl }) {
  const data = await apiFetch("/api/products", {
    method: "POST",
    body: { barcode, name, expiryDate, quantity, imageUrl },
  });
  return mapProduct(data);
}
