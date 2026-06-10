import { Router } from "express";
import { addProduct, listProducts } from "../store.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const products = await listProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  const { barcode, name, expiryDate, quantity, imageUrl } = req.body ?? {};

  if (!barcode?.trim() || !name?.trim() || !expiryDate) {
    return res.status(400).json({
      error: "Informe código de barras, nome e data de vencimento.",
    });
  }

  try {
    const product = await addProduct({
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

export default router;
