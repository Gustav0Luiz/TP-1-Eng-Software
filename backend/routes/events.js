/**
 * src/routes/events.js
 *
 * Rotas para gerenciar **Eventos base** (ex.: "SBES").
 * Lembre: as **Edições** anuais ficam em outra tabela/rota (editions).
 *
 * Endpoints (este arquivo exporta um Router, sem prefixo):
 *   - POST   /events        → cria evento
 *   - GET    /events        → lista eventos (com paginação simples)
 *   - GET    /events/:id    → detalhe de 1 evento
 *   - PATCH  /events/:id    → edição parcial (name/description)
 *   - DELETE /events/:id    → remove evento
 *
 * Como montar no app.js:
 *   const eventsRouter = require("./routes/events");
 *   const { auth } = require("./middlewares/auth");
 *   app.use("/events", auth, eventsRouter); // protege todas as rotas de /events com JWT
 */

const { Router } = require("express");
const { sql } = require("../src/db/sql"); // cliente SQL (lib "postgres")

const router = Router(); // sub-aplicativo de rotas

/* ============================================================================
   Utilitário de validação simples.
   Se a condição falhar, lançamos um erro com .code = "VALIDATION"
   que depois vira um 400 claro para o cliente.
   ========================================================================== */
function assert(cond, message) {
  if (!cond) {
    const e = new Error(message);
    e.code = "VALIDATION";
    throw e;
  }
}

/* ============================================================================
   POST /events  →  cria um novo evento
   Body (JSON): { name: string, description?: string }
   Regras:
     - name obrigatório, pelo menos 3 caracteres após trim
     - description opcional (pode ser string ou ausente)
   Resposta: { event: { id, name, description, created_at, updated_at } }
   ========================================================================== */
router.post("/", async (req, res, next) => {
  try {
    // 1) coleta e normaliza
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description : null;

    // 2) validação objetiva
    assert(name.length >= 3, "name é obrigatório (mín. 3 caracteres)");

    // 3) insere e retorna o registro recém-criado
    const [created] = await sql/*sql*/`
      INSERT INTO events (name, description)
      VALUES (${name}, ${description})
      RETURNING id, name, description, created_at, updated_at
    `;

    return res.status(201).json({ event: created });
  } catch (err) {
    // erros de validação viram 400
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================================
   GET /events  →  lista eventos com paginação simples
   Query params: ?page=1&pageSize=20
   Defaults: page=1, pageSize=20 (máx 100)
   Resposta: { data: [...], page, pageSize, total }
   ========================================================================== */
router.get("/", async (req, res, next) => {
  try {
    // 1) paginação defensiva
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
    const offset = (page - 1) * pageSize;

    // 2) busca registros ordenados do mais novo para o mais antigo
    const rows = await sql/*sql*/`
      SELECT id, name, description, created_at, updated_at
      FROM events
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // 3) total para o front calcular páginas
    const [{ count }] = await sql/*sql*/`
      SELECT COUNT(*)::int AS count FROM events
    `;

    return res.json({ data: rows, page, pageSize, total: count });
  } catch (err) {
    next(err);
  }
});

/* ============================================================================
   GET /events/:id  →  detalhe de um evento
   Resposta: { event: {...} }  ou  404 se não existir
   ========================================================================== */
router.get("/:id", async (req, res, next) => {
  try {
    // 1) valida id como inteiro
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");

    // 2) busca um único registro
    const rows = await sql/*sql*/`
      SELECT id, name, description, created_at, updated_at
      FROM events
      WHERE id = ${id}
      LIMIT 1
    `;
    const event = rows[0];

    // 3) se não achou, 404
    if (!event) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Evento não encontrado" } });
    }

    return res.json({ event });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================================
   PATCH /events/:id  →  edição parcial
   Body (JSON): { name?: string, description?: string|null }
   Regras:
     - Pelo menos um campo deve ser enviado
     - name, se enviado, é trimado
     - description aceita string ou null (pra limpar)
   Resposta: { event: {...} }  ou  404 se não existir
   ========================================================================== */
router.patch("/:id", async (req, res, next) => {
  try {
    // 1) valida id
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");

    // 2) monta atualização dinâmica segura
    const fields = [];
    const values = [];

    if (typeof req.body?.name === "string") {
      fields.push("name");
      values.push(req.body.name.trim());
    }
    if (typeof req.body?.description === "string" || req.body?.description === null) {
      fields.push("description");
      values.push(req.body.description);
    }

    // 3) se nada foi enviado, 400
    assert(fields.length > 0, "Nada para atualizar");

    // 4) gera o SET dinâmico: SET name = $1, description = $2, ...
    const setSql = fields.map((f, i) => sql`${sql(f)} = ${values[i]}`);

    // 5) atualiza e retorna o registro modificado
    const [updated] = await sql/*sql*/`
      UPDATE events
      SET ${sql(setSql)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, name, description, created_at, updated_at
    `;

    if (!updated) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Evento não encontrado" } });
    }

    return res.json({ event: updated });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================================
   DELETE /events/:id  →  remove evento
   Observações:
     - Se existirem **editions** com FK para este evento (ON DELETE CASCADE),
       elas serão removidas automaticamente, assim como articles ligados a edições.
     - Retorna 204 (sem corpo) em caso de sucesso.
   ========================================================================== */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");

    const result = await sql/*sql*/`
      DELETE FROM events WHERE id = ${id} RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Evento não encontrado" } });
    }

    return res.status(204).send(); // sucesso, sem corpo
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

module.exports = router; // Exporta o Router para ser usado em app.js
