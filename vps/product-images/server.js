import express from "express";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || "/data";
const UPLOAD_TOKEN = process.env.UPLOAD_TOKEN || "";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

if (!UPLOAD_TOKEN) {
  console.error("UPLOAD_TOKEN é obrigatório.");
  process.exit(1);
}

if (!PUBLIC_BASE_URL) {
  console.error("PUBLIC_BASE_URL é obrigatório (ex.: https://143.95.210.104/product-images).");
  process.exit(1);
}

await fs.mkdir(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: "8mb" }));

function requireToken(req, res, next) {
  const header = req.headers.authorization ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || req.headers["x-upload-token"];
  if (token !== UPLOAD_TOKEN) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }
  next();
}

function safeRelativePath(filePath) {
  const normalized = path.posix.normalize(String(filePath || "").replace(/\\/g, "/"));
  if (!normalized || normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return null;
  }
  if (!/^[a-zA-Z0-9/_.-]+\.jpe?g$/i.test(normalized)) {
    return null;
  }
  return normalized;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/upload", requireToken, async (req, res) => {
  const relative = safeRelativePath(req.body?.path);
  const data = req.body?.data;

  if (!relative || typeof data !== "string") {
    res.status(400).json({ error: "Informe path (ex.: userId/arquivo.jpg) e data (base64)." });
    return;
  }

  try {
    const buffer = Buffer.from(data, "base64");
    if (!buffer.length) {
      res.status(400).json({ error: "Imagem vazia." });
      return;
    }
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: "Imagem muito grande (máx. 5 MB)." });
      return;
    }

    const absolute = path.join(DATA_DIR, relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer);

    res.status(201).json({
      ok: true,
      url: `${PUBLIC_BASE_URL}/${relative}`,
      path: relative,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Falha ao salvar imagem." });
  }
});

app.use(
  express.static(DATA_DIR, {
    fallthrough: true,
    maxAge: "7d",
    setHeaders(res) {
      res.setHeader("Cache-Control", "public, max-age=604800");
    },
  }),
);

app.use((_req, res) => {
  res.status(404).json({ error: "Arquivo não encontrado." });
});

app.listen(PORT, () => {
  console.log(`[product-images] ouvindo :${PORT} data=${DATA_DIR}`);
});
