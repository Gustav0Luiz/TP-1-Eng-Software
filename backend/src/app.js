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

// === Importação das rotas ===
const authRouter = require("../routes/auth");       // Rotas de autenticação (/auth/...).
const eventsRouter = require("../routes/events");   // Rotas de eventos (/events/...).
const editionsRouter = require("../routes/editions"); // Rotas de edições (/editions/...).
const articlesRouter = require("../routes/articles");



// === Middleware ===
const { auth } = require("./middlewares/auth");    // Middleware que valida JWT (protege rotas).

const app = express(); // Cria a aplicação Express.

app.use(cors({ origin: 'http://localhost:3000', credentials: false }));

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
app.use("/auth", authRouter);

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
