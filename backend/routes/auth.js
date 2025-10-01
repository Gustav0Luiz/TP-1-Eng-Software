/**
 * src/routes/auth.js
 * -----------------------------------------------------------------------------
 * Rotas de autenticação da API.
 *
 * O que este router expõe (montado em app.js como `app.use("/auth", authRouter)`):
 *   - POST /auth/register  → cria usuário e retorna { user, token }
 *   - POST /auth/login     → autentica (nickname + senha) e retorna { user, token }
 *   - GET  /auth/me        → retorna dados do usuário autenticado (JWT obrigatório)
 *
 * Principais conceitos:
 * - JWT (JSON Web Token): prova de identidade do usuário sem manter sessão no servidor.
 * - Bcrypt: gera/valida hash de senha (NUNCA salve senha em texto puro).
 * - Segurança: nunca retorne `password_hash` em respostas públicas.
 *
 * Integração com o app:
 *   const authRouter = require("./routes/auth");
 *   app.use("/auth", authRouter);
 * -----------------------------------------------------------------------------
 */

const { Router } = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { sql } = require("../src/db/sql");            // Conexão Postgres (lib `postgres`)
const { auth } = require("../src/middlewares/auth"); // Middleware que valida o JWT

const router = Router();

router.use(auth); // Aplica o middleware de autenticação a todas as rotas deste router

/* =============================================================================
   HELPERS (utilitários locais)
   ========================================================================== */

/**
 * Normaliza os campos recebidos no REGISTER.
 * - `first_name` e `last_name`: trim
 * - `nickname` e `email`: trim + lower-case (evita duplicatas por caixa)
 * - `password`: trim simples (o hash é feito no valor pós-trim)
 */
function normalizeRegisterInput(body = {}) {
  return {
    first_name: typeof body.first_name === "string" ? body.first_name.trim() : "",
    last_name:  typeof body.last_name  === "string" ? body.last_name.trim()  : "",
    nickname:   typeof body.nickname   === "string" ? body.nickname.trim().toLowerCase() : "",
    email:      typeof body.email      === "string" ? body.email.trim().toLowerCase()    : "",
    password:   typeof body.password   === "string" ? body.password.trim()               : "",
  };
}

/**
 * Normaliza os campos recebidos no LOGIN.
 * - `nickname`: trim + lower-case
 * - `password`: trim
 */
function normalizeLoginInput(body = {}) {
  return {
    nickname: typeof body.nickname === "string" ? body.nickname.trim().toLowerCase() : "",
    password: typeof body.password === "string" ? body.password.trim() : "",
  };
}

/**
 * Assina o JWT para um usuário.
 * - sub (subject) recebe o id do usuário (boa prática recomendada)
 * - payload inclui `email` e `nickname` (úteis no frontend)
 * - expiração pode ser configurada por `JWT_EXPIRES_IN` (ex.: "7d")
 *
 * Importante:
 * - Exige `JWT_SECRET` no .env; se não houver, lança erro com code "ENV_MISCONFIG".
 */
function signTokenForUser(user) {
  if (!process.env.JWT_SECRET) {
    const e = new Error("JWT_SECRET não está definido no .env");
    e.code = "ENV_MISCONFIG";
    throw e;
  }
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
      // se quiser, pode incluir também first_name/last_name,
      // mas evite payloads muito grandes.
      // first_name: user.first_name,
      // last_name:  user.last_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/* =============================================================================
   GET /auth/me  → retorna os dados do usuário autenticado
   - Rota PROTEGIDA: precisa do header Authorization: Bearer <TOKEN>
   - O middleware `auth` valida o token e popula `req.user` (id/email/nickname).
   - Aqui só fazemos um SELECT no banco e retornamos campos públicos.
   ========================================================================== */
router.get("/me", async (req, res, next) => {
  try {
    // Buscamos o usuário pelo ID que veio no token (req.user.id)
    const rows = await sql/*sql*/`
      SELECT id, first_name, last_name, nickname, email, created_at, updated_at
      FROM users
      WHERE id = ${req.user.id}
      LIMIT 1
    `;
    const me = rows[0];

    if (!me) {
      // Se o usuário foi deletado após o login, por exemplo:
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Usuário não encontrado" }
      });
    }

    // Nunca retornar password_hash.
    return res.json({ user: me });
  } catch (err) {
    next(err); // Handler global cuidará de formatar a resposta de erro
  }
});



module.exports = router;
