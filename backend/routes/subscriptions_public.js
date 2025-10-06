// routes/subscriptions_public.js
const { Router } = require("express");
const { sql } = require("../src/db/sql");

const router = Router();

// validação simples de e-mail
function isValidEmail(email) {
  return typeof email === "string" &&
         /^\S+@\S+\.\S+$/.test(email.trim());
}

/**
 * POST /subscriptions
 * Body: { name: string, email: string } 
 * Público: não exige JWT.
 */
router.post("/", async (req, res, next) => {
  try {
    const name  = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({
        error: { code: "VALIDATION", message: "Envie 'name' e 'email'." }
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: { code: "VALIDATION", message: "E-mail inválido." }
      });
    }

    // evita duplicado (case-insensitive para nome e email)
    const exists = await sql/*sql*/`
      SELECT id
        FROM subscriptions
       WHERE lower(name) = ${name.toLowerCase()}
         AND lower(email) = ${email}
       LIMIT 1
    `;
    if (exists[0]) {
      return res.status(200).json({ ok: true, duplicated: true, message: "Assinatura já existente." });
    }

    const inserted = await sql/*sql*/`
      INSERT INTO subscriptions (name, email, is_enabled)
      VALUES (${name}, ${email}, TRUE)
      RETURNING id, name, email, is_enabled, created_at
    `;

    return res.status(201).json({ ok: true, subscription: inserted[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
