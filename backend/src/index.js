import cors from "cors";
import express from "express";
import productsRouter from "./routes/products.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = FRONTEND_URL.split(",").map((url) => url.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || process.env.CORS_ALLOW_ALL === "true") {
        callback(null, true);
        return;
      }

      // Rede local no celular (ex: https://192.168.x.x:8443)
      if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origem não permitida pelo CORS"));
    },
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/products", productsRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend rodando na porta ${PORT}`);
});

// faça dar certo