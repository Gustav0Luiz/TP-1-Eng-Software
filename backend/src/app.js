/**
 * app.js
 *
 * Este arquivo é responsável por **configurar** a aplicação Express.
 * Aqui você:
 *  - Cria a instância do Express (app).
 *  - Define middlewares globais (ex.: JSON parser, logger).
 *  - Registra as rotas da API (ex.: /auth, /events, /editions).
 *  - Adiciona tratadores de 404 e de erros.
 *
 * Importante: este arquivo NÃO abre a porta do servidor.
 * Ele apenas monta o "app" e exporta.
 * Quem liga a aplicação na porta é o server.js.
 */

const cors = require('cors');
const express = require("express");       // Framework para criar a API HTTP.
const morgan = require("morgan");         // Logger HTTP (método, URL, status, tempo).
const { sql } = require("./db/sql");      // Conexão com Postgres (usada em /db-check).
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// === Importação das rotas ===
const authRouter = require("../routes/auth");       // Rotas de autenticação (/auth/...).
const eventsRouter = require("../routes/events");   // Rotas de eventos (/events/...).
const editionsRouter = require("../routes/editions"); // Rotas de edições (/editions/...).
const articlesPublicRouter = require("../routes/articles_public");
const articlesRouter = require("../routes/articles");




// === Middleware ===
const { auth } = require("./middlewares/auth");    // Middleware que valida JWT (protege rotas).

const app = express(); // Cria a aplicação Express.

const allowedOrigins = [
  // Regex para permitir localhost com qualquer porta (ex: 3000, 3005)
  /^http:\/\/localhost:\d+$/,
  // Regex para permitir qualquer subdomínio do Codespaces
  /\.app\.github\.dev$/
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem 'origin' (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);

    // Verifica se a origem da requisição está na lista de permissões
    if (allowedOrigins.some(regex => regex.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Permite o envio de cookies e headers de autorização
};

app.use(cors(corsOptions));

// === Middlewares globais (sempre antes das rotas) ===
app.use(express.json()); // Faz o parse automático de JSON no body das requisições.
app.use(morgan("dev"));  // Loga cada requisição no console (útil em dev).



// ----------------------------------------------------
// Montagem dos Routers
// ----------------------------------------------------

// Todas as rotas que começam com /auth serão encaminhadas
// para o router de autenticação (src/routes/auth.js).
// Exemplos que passam por aqui:
//   - POST /auth/register
//   - POST /auth/login
//   - GET  /auth/me
// Observação: normalmente /register e /login são públicas;
// /auth/me costuma exigir JWT dentro do próprio router.
app.use("/api/auth", authRouter);


/* =============================================================================
   HELPERS (movidos de auth.js)
   ========================================================================== */
function normalizeRegisterInput(body = {}) {
  return {
    first_name: typeof body.first_name === "string" ? body.first_name.trim() : "",
    last_name:  typeof body.last_name  === "string" ? body.last_name.trim()  : "",
    nickname:   typeof body.nickname   === "string" ? body.nickname.trim().toLowerCase() : "",
    email:      typeof body.email      === "string" ? body.email.trim().toLowerCase()    : "",
    password:   typeof body.password   === "string" ? body.password.trim()               : "",
  };
}
function normalizeLoginInput(body = {}) {
  return {
    nickname: typeof body.nickname === "string" ? body.nickname.trim().toLowerCase() : "",
    password: typeof body.password === "string" ? body.password.trim() : "",
  };
}
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
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/* =============================================================================
   ROTAS PÚBLICAS (movidas de auth.js)
   ========================================================================== */
app.post("/api/register", async (req, res, next) => {
  try {
    const { first_name, last_name, nickname, email, password } =
      normalizeRegisterInput(req.body);

    if (!first_name || !last_name || !nickname || !email || !password) {
      return res.status(400).json({
        error: {
          code: "VALIDATION",
          message: "Todos os campos são obrigatórios"
        }
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: { code: "WEAK_PASSWORD", message: "A senha deve ter pelo menos 6 caracteres" }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [created] = await sql/*sql*/`
      INSERT INTO users (first_name, last_name, nickname, email, password_hash)
      VALUES (${first_name}, ${last_name}, ${nickname}, ${email}, ${passwordHash})
      RETURNING id, first_name, last_name, nickname, email, created_at, updated_at
    `;

    const token = signTokenForUser(created);
    return res.status(201).json({ user: created, token });

  } catch (err) {
    if (err.code === "23505") {
      const c = err.constraint || "";
      const isEmail    = c.includes("users_email");
      const isNickname = c.includes("users_nickname");
      return res.status(409).json({
        error: {
          code: isEmail ? "EMAIL_IN_USE" : (isNickname ? "NICKNAME_IN_USE" : "UNIQUE_VIOLATION"),
          message: isEmail ? "E-mail já cadastrado" : "Nickname já cadastrado"
        }
      });
    }
    if (err.code === "ENV_MISCONFIG") {
      return res.status(500).json({ error: { code: "ENV_MISCONFIG", message: err.message } });
    }
    next(err);
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { nickname, password } = normalizeLoginInput(req.body);

    if (!nickname || !password) {
      return res.status(400).json({
        error: { code: "VALIDATION", message: "nickname e password são obrigatórios" }
      });
    }

    const rows = await sql/*sql*/`
      SELECT id, first_name, last_name, nickname, email, password_hash, created_at, updated_at
      FROM users
      WHERE nickname = ${nickname}
      LIMIT 1
    `;
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos" } });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos" } });
    }

    const token = signTokenForUser(user);
    const publicUser = { id: user.id, first_name: user.first_name, last_name: user.last_name, nickname: user.nickname, email: user.email, created_at: user.created_at, updated_at: user.updated_at };

    return res.json({ user: publicUser, token });

  } catch (err) {
    if (err.code === "ENV_MISCONFIG") {
      return res.status(500).json({ error: { code: "ENV_MISCONFIG", message: err.message } });
    }
    next(err);
  }
});

// Todas as rotas que começam com /events serão tratadas pelo
// router de eventos (src/routes/events.js). **Antes** de chegar
// ao router, aplicamos o middleware `auth`, o que significa que
// essas rotas exigem **Authorization: Bearer <TOKEN>**.
// Exemplos que passam por aqui (já autenticadas):
//   - POST /events
//   - GET  /events
//   - GET  /events/:id
//   - PATCH/DELETE /events/:id
app.use("/events", auth, eventsRouter);

// Todas as rotas que começam com /editions serão tratadas pelo
// router de edições (src/routes/editions.js). Assim como /events,
// elas também exigem JWT por causa do `auth` aplicado aqui.
// Exemplos (já autenticadas):
//   - POST /editions
//   - GET  /editions?event_id=1
//   - GET  /editions/:id
//   - PATCH/DELETE /editions/:id
app.use("/editions", auth, editionsRouter);

// ######################################
// público: só /articles/search
app.use("/articles", articlesPublicRouter);

// protegido: todas as outras rotas de artigos
// app.use("/articles", auth, articlesRouter);
// ######################################

// Todas as rotas que começam com /articles serão tratadas pelo
// router de artigos (src/routes/articles.js). Também exigem JWT
// pois aplicamos `auth` aqui. Isso garante que **dentro** do
// arquivo articles.js você já terá `req.user` disponível.
// Exemplos (já autenticadas):
//   - POST /articles                 (cadastro manual com PDF)
//   - PUT  /articles/:id             (editar metadados e/ou PDF)
//   - DELETE /articles/:id           (remover)
//   - GET  /articles/:id/pdf         (download/stream do PDF)
//   - GET  /articles/search          (busca por título/autor/evento)
//   - POST /articles/bulk-bibtex     (importação em massa BibTeX + ZIP)
app.use("/articles", auth, articlesRouter);


// ------------------------ ROTAS "soltas" (fora de routers) ---------------------------- //

// Rota de saúde (aberta): checa se o servidor está de pé.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Rota para testar a conexão com o Postgres (aberta).
app.get("/db-check", async (_req, res, next) => {
  try {
    const result = await sql/*sql*/`SELECT version()`;
    res.json({ ok: true, version: result[0].version });
  } catch (err) {
    next(err); // Delega para o middleware de erro.
  }
});





// === Middleware de 404 (DEVE ficar depois de todas as rotas) ===

// Se nenhuma rota acima atendeu, caímos aqui.
app.use((_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Rota não encontrada" }
  });
});

// === Middleware de erros (DEVE ser o último) ===

// Formato padrão de handler de erro no Express: (err, req, res, next)
app.use((err, _req, res, _next) => {
  console.error("[erro]", err);

  // Exemplo: tabela não existe
  if (err.code === "42P01") {
    return res.status(500).json({
      error: { code: "TABLE_NOT_FOUND", message: "Tabela não encontrada. Confira o nome no banco/schema." }
    });
  }

  // Exemplo: violação de UNIQUE (registro duplicado)
  if (err.code === "23505") {
    return res.status(409).json({
      error: { code: "UNIQUE_VIOLATION", message: "Registro duplicado" }
    });
  }

  // Fallback genérico
  res.status(500).json({ error: { code: "INTERNAL", message: "Erro inesperado" } });
});






// Exporta o "app" configurado para que o server.js possa usá-lo (abrir a porta).
module.exports = app;
