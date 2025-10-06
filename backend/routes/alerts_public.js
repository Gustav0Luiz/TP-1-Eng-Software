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
    const subject = "✅ Confirmação de Inscrição: Alertas de Artigos Vlib";
    // Versão Plain Text (para clientes de e-mail que não renderizam HTML)
    const plain = [
      `Prezado(a) ${name},`,
      "",
      "Obrigado por se inscrever no serviço de alertas de autoria da Vlib (Biblioteca Virtual de Artigos).",
      "",
      `Sua inscrição está ativa para monitorar o nome: ${name}.`,
      "",
      "Você receberá um e-mail de notificação sempre que um novo artigo for adicionado ao nosso catálogo com este nome entre os autores (correspondência exata e sem diferenciar maiúsculas/minúsculas).",
      "",
      "---",
      "Se você não solicitou este serviço, por favor, ignore este e-mail. Para cancelar futuras notificações, você pode responder a este e-mail solicitando a remoção.",
      "",
      "Atenciosamente,",
      "Equipe Vlib.",
    ].join("\n");

    // Versão HTML (Mais profissional e visual)
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Vlib - Confirmação de Alerta</h1>
        </div>
        <div style="padding: 25px;">
          <h2 style="color: #007bff; margin-top: 0;">Inscrição Confirmada, ${name}!</h2>
          <p>Seu cadastro no nosso serviço de monitoramento de autoria foi concluído com sucesso.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
            <strong>Nome monitorado:</strong> 
            <span style="color: #007bff; font-weight: bold;">${name}</span>
          </div>
          
          <p style="margin-top: 20px;">Você será notificado imediatamente por e-mail sempre que um artigo novo com este nome for indexado em nossa biblioteca.</p>
          
          <p>Obrigado por utilizar a Vlib para acompanhar suas publicações! 📚</p>
        </div>
        <div style="background-color: #f1f1f1; color: #6c757d; padding: 15px; font-size: 12px; text-align: center;">
          <p style="margin: 0;">Se você não solicitou este serviço, por favor, ignore este e-mail.</p>
          <p style="margin: 5px 0 0 0;">Para cancelar, responda a este e-mail solicitando a remoção do seu endereço.</p>
        </div>
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
