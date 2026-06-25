import { Router } from "express";
import { requireFirebaseUser } from "../middleware/requireFirebaseUser.js";
import {
  addProduct,
  listAllProducts,
  listExpiringProducts,
  listProductCatalog,
  removeProduct,
  updateProduct,
  uploadProductImage,
} from "../store.js";

const router = Router();

router.use(requireFirebaseUser);

router.get("/", async (req, res) => {
  try {
    const products = await listAllProducts(req.firebaseUser.uid);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/expiring", async (req, res) => {
  const filterDays = Number(req.query.days ?? 7);
  try {
    const products = await listExpiringProducts(req.firebaseUser.uid, filterDays);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/catalog", async (req, res) => {
  try {
    const catalog = await listProductCatalog(req.firebaseUser.uid);
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/upload-image", async (req, res) => {
  const { data, mimeType } = req.body ?? {};
  if (!data || typeof data !== "string") {
    res.status(400).json({ error: "Imagem inválida." });
    return;
  }

  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const type = mimeType || "image/jpeg";
  if (!allowed.has(type)) {
    res.status(400).json({ error: "Formato de imagem não suportado." });
    return;
  }

  const ext = type.split("/")[1] || "jpg";
  const buffer = Buffer.from(data, "base64");

  if (buffer.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: "Imagem muito grande (máx. 5 MB)." });
    return;
  }

  try {
    const url = await uploadProductImage(req.firebaseUser.uid, buffer, ext, type);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  const { barcode, name, expiryDate, quantity, imageUrl } = req.body ?? {};

  if (!barcode?.trim() || !name?.trim() || !expiryDate) {
    res.status(400).json({
      error: "Informe código de barras, nome e data de vencimento.",
    });
    return;
  }

  try {
    const product = await addProduct(req.firebaseUser.uid, {
      barcode,
      name,
      expiryDate,
      quantity,
      imageUrl,
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  const { barcode, name, expiryDate, quantity, imageUrl } = req.body ?? {};

  if (!barcode?.trim() || !name?.trim() || !expiryDate) {
    res.status(400).json({
      error: "Informe código de barras, nome e data de vencimento.",
    });
    return;
  }

  try {
    const product = await updateProduct(req.firebaseUser.uid, req.params.id, {
      barcode,
      name,
      expiryDate,
      quantity,
      imageUrl,
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await removeProduct(req.firebaseUser.uid, req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
