/**
 * app.js
 *
 * Configuração principal da aplicação Express.
 * Aqui você:
 *  - Cria a instância do Express (app).
 *  - Define middlewares globais (ex.: JSON parser, logger).
 *  - Registra as rotas da API (públicas e protegidas).
 *  - Adiciona tratadores de 404 e de erros.
 *
 * Importante: este arquivo NÃO abre a porta do servidor.
 * Ele apenas monta e exporta o "app".
 * Quem sobe o servidor na porta é o server.js.
 */

const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const { sql } = require("./db/sql");

// === Importação das rotas ===
const alertsPublicRouter = require("../routes/alerts_public");
const subscriptionsPublic = require("../routes/subscriptions_public");
const publicRouter = require("../routes/public");         // Rotas públicas para consulta de eventos/edições/artigos
const authRouter = require("../routes/auth");                // Rotas de autenticação (/auth/...)
const eventsRouter = require("../routes/events");            // Rotas de eventos (protegidas)
const editionsRouter = require("../routes/editions");        // Rotas de edições (protegidas)
const articlesPublicRouter = require("../routes/articles_public"); // Rotas públicas de artigos (ex.: /articles/search)
const articlesRouter = require("../routes/articles");        // Rotas protegidas de artigos (CRUD completo)

// === Middleware de autenticação ===
const { auth } = require("./middlewares/auth");

const app = express();

// Configuração de CORS (libera frontend local na porta 3000)
app.use(cors({ origin: "http://localhost:3000", credentials: false }));

// === Middlewares globais (sempre antes das rotas) ===
app.use(express.json()); // Faz parse automático de JSON no body
app.use(morgan("dev"));  // Logger HTTP (método, URL, status, tempo)

// ----------------------------------------------------
// Montagem dos Routers
// ----------------------------------------------------

// Rotas públicas (não exigem JWT)
app.use("/public/alerts", alertsPublicRouter);
app.use("/subscriptions", subscriptionsPublic);
app.use("/public", publicRouter);           // Ex.: /public/events/:slug, /public/editions/:slug/:year
app.use("/auth", authRouter);               // Ex.: POST /auth/register, POST /auth/login, GET /auth/me
app.use("/articles", articlesPublicRouter); // Ex.: GET /articles/search

// Rotas protegidas (exigem Authorization: Bearer <TOKEN>)
app.use("/events", auth, eventsRouter);     // Ex.: POST /events, GET /events/:id
app.use("/editions", auth, editionsRouter); // Ex.: POST /editions, GET /editions/:id
app.use("/articles", auth, articlesRouter); // Ex.: POST /articles, PUT /articles/:id, DELETE /articles/:id

// ----------------------------------------------------
// Rotas utilitárias (sem router dedicado)
// ----------------------------------------------------

// Checagem de saúde (sem auth)
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Checa conexão com Postgres (sem auth)
app.get("/db-check", async (_req, res, next) => {
  try {
    const result = await sql/*sql*/`SELECT version()`;
    res.json({ ok: true, version: result[0].version });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Middlewares de erro
// ----------------------------------------------------

// 404 (rota não encontrada)
app.use((_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Rota não encontrada" }
  });
});

// Handler de erros genérico
app.use((err, _req, res, _next) => {
  console.error("[erro]", err);

  if (err.code === "42P01") {
    return res.status(500).json({
      error: { code: "TABLE_NOT_FOUND", message: "Tabela não encontrada. Confira o schema." }
    });
  }

  if (err.code === "23505") {
    return res.status(409).json({
      error: { code: "UNIQUE_VIOLATION", message: "Registro duplicado" }
    });
  }

  res.status(500).json({
    error: { code: "INTERNAL", message: "Erro inesperado" }
  });
});

module.exports = app;
