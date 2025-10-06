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
router.get("/me", auth, async (req, res, next) => {
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

/* =============================================================================
   POST /auth/register  → cria um novo usuário e retorna { user, token }
   Body esperado:
     {
       first_name: string,
       last_name:  string,
       nickname:   string,  // único, usado para LOGIN
       email:      string,  // único
       password:   string   // ≥ 6 chars
     }

   Regras:
     * Todos os campos são obrigatórios
     * password ≥ 6 caracteres
     * UNIQUE(email) e UNIQUE(nickname) no schema → tratamos erro 23505
   Segurança:
     * Hash de senha com bcrypt (saltRounds=10)
     * Nunca retornar password_hash
   ========================================================================== */
router.post("/register", async (req, res, next) => {
  try {
    const { first_name, last_name, nickname, email, password } =
      normalizeRegisterInput(req.body);

    // Validações simples
    if (!first_name || !last_name || !nickname || !email || !password) {
      return res.status(400).json({
        error: {
          code: "VALIDATION",
          message: "first_name, last_name, nickname, email e password são obrigatórios"
        }
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: { code: "WEAK_PASSWORD", message: "A senha deve ter pelo menos 6 caracteres" }
      });
    }

    // Gera hash seguro da senha (NUNCA salve a senha em texto puro)
    const passwordHash = await bcrypt.hash(password, 10);

    // Insere o usuário no banco (o schema garante unique de email/nickname)
    const [created] = await sql/*sql*/`
      INSERT INTO users (first_name, last_name, nickname, email, password_hash)
      VALUES (${first_name}, ${last_name}, ${nickname}, ${email}, ${passwordHash})
      RETURNING id, first_name, last_name, nickname, email, created_at, updated_at
    `;

    // Gera token JWT para já autenticar após registro
    const token = signTokenForUser(created);

    // Retorna dados públicos + token (NUNCA inclua password_hash)
    return res.status(201).json({ user: created, token });

  } catch (err) {
    // Tratamento de violações de unicidade (email/nickname duplicados)
    if (err.code === "23505") {
      const c = err.constraint || "";
      const isEmail    = c.includes("users_email");
      const isNickname = c.includes("users_nickname");
      return res.status(409).json({
        error: {
          code: isEmail ? "EMAIL_IN_USE" : (isNickname ? "NICKNAME_IN_USE" : "UNIQUE_VIOLATION"),
          message: isEmail ? "E-mail já cadastrado" : (isNickname ? "Nickname já cadastrado" : "Registro duplicado")
        }
      });
    }
    // Falha de configuração: JWT_SECRET ausente
    if (err.code === "ENV_MISCONFIG") {
      return res.status(500).json({
        error: { code: "ENV_MISCONFIG", message: err.message }
      });
    }
    // Qualquer outro erro → segue para o handler global
    next(err);
  }
});

/* =============================================================================
   POST /auth/login  → autentica por (nickname + password) e retorna { user, token }
   Body esperado:
     { nickname: string, password: string }

   Fluxo:
     * valida/normaliza entradas
     * busca usuário por nickname (único)
     * compara senha com bcrypt.compare
     * se ok, assina JWT e retorna { user público, token }
   ========================================================================== */
router.post("/login", async (req, res, next) => {
  try {
    const { nickname, password } = normalizeLoginInput(req.body);

    if (!nickname || !password) {
      return res.status(400).json({
        error: { code: "VALIDATION", message: "nickname e password são obrigatórios" }
      });
    }

    // Busca por nickname (único)
    const rows = await sql/*sql*/`
      SELECT id, first_name, last_name, nickname, email, password_hash, created_at, updated_at
      FROM users
      WHERE nickname = ${nickname}
      LIMIT 1
    `;
    const user = rows[0];

    // Não revelar qual campo falhou: resposta genérica
    if (!user) {
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos" }
      });
    }

    // Compara a senha informada com o hash do banco
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos" }
      });
    }

    // Credenciais válidas → assina JWT
    const token = signTokenForUser(user);

    // Monta objeto público (sem password_hash)
    const publicUser = {
      id: user.id,
      first_name: user.first_name,
      last_name:  user.last_name,
      nickname:   user.nickname,
      email:      user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return res.json({ user: publicUser, token });

  } catch (err) {
    if (err.code === "ENV_MISCONFIG") {
      return res.status(500).json({
        error: { code: "ENV_MISCONFIG", message: err.message }
      });
    }
    next(err);
  }
});

module.exports = router;
