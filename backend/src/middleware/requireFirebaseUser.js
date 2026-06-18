import { verifyIdToken } from "../firebaseAdmin.js";

export async function requireFirebaseUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "Token ausente." });
      return;
    }

    req.firebaseUser = await verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}
