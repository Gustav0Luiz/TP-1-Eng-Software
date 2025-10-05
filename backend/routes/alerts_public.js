// routes/alerts_public.js
const { Router } = require("express");
const { sql } = require("../src/db/sql");
const { sendMail } = require("../src/lib/mailer");

const router = Router();

// validação simples de e-mail
function isValidEmail(email) {
  return typeof email === "string" && /^\S+@\S+\.\S+$/.test(email.trim());
}

/**
 * POST /public/alerts/subscribe
 * Body: { name: string, email: string }
 * Público: não exige JWT.
 */
router.post("/subscribe", async (req, res, next) => {
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
      // já cadastrado: ainda assim retornamos 200 e avisamos
      return res.status(200).json({
        ok: true,
        duplicated: true,
        message: "Você já está inscrito para este nome."
      });
    }

    // cria a assinatura
    const [inserted] = await sql/*sql*/`
      INSERT INTO subscriptions (name, email, is_enabled)
      VALUES (${name}, ${email}, TRUE)
      RETURNING id, name, email, is_enabled, created_at
    `;

    // envia e-mail de boas-vindas/confirmacao
    const subject = "Inscrição confirmada — Alertas de novos artigos";
    const plain = [
      `Olá, ${name}!`,
      "",
      "Recebemos seu cadastro e você será notificado por e-mail sempre que um novo artigo for registrado com o seu nome (exato) na autoria.",
      "",
      "Se não foi você quem fez essa inscrição, basta ignorar este e-mail.",
      "",
      "— Equipe Vlib",
    ].join("\n");

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 12px 0">Olá, ${name}!</h2>
        <p style="margin:0 0 12px 0">
          Sua inscrição foi confirmada. Você receberá um aviso sempre que
          cadastrarmos um novo artigo com o nome <strong>${name}</strong> entre os autores.
        </p>
        <p style="margin:0 0 12px 0">Obrigado por usar a <strong>Vlib</strong>! 📚</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
        <p style="margin:0;color:#666;font-size:12px">
          Se não foi você quem fez essa inscrição, ignore este e-mail.
        </p>
      </div>
    `;

    try {
      await sendMail({ to: email, subject, text: plain, html });
    } catch (mailErr) {
      // Não falha a inscrição se o e-mail der erro — apenas reporta no payload
      return res.status(201).json({
        ok: true,
        subscription: inserted,
        mail: { sent: false, error: mailErr.message || String(mailErr) },
      });
    }

    return res.status(201).json({
      ok: true,
      subscription: inserted,
      mail: { sent: true }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
