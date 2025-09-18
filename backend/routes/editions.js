/**
 * src/routes/editions.js
 *
 * Rotas para gerenciar **Edições** de eventos.
 * Uma edição é uma instância específica de um evento em determinado ano.
 *
 * Endpoints:
 *   - POST   /editions        → cria edição (vinculada a um evento)
 *   - GET    /editions        → lista edições (pode filtrar por event_id)
 *   - GET    /editions/:id    → detalhe de uma edição
 *   - PATCH  /editions/:id    → edição parcial (year/description)
 *   - DELETE /editions/:id    → remove edição
 *
 * Observação:
 *   Todas as rotas devem estar protegidas por JWT (auth) no app.js:
 *     app.use("/editions", auth, editionsRouter)
 */

const { Router } = require("express");
const { sql } = require("../src/db/sql");

const router = Router();

/* ============================================================
   Utilitário para validar entradas
   ========================================================== */
function assert(cond, message) {
  if (!cond) {
    const e = new Error(message);
    e.code = "VALIDATION";
    throw e;
  }
}

/* ============================================================
   POST /editions → cria edição de um evento
   Body esperado: { event_id: number, year: number, description?: string }
   ========================================================== */
router.post("/", async (req, res, next) => {
  try {
    const { event_id, year, description } = req.body;

    // validações básicas
    assert(Number.isInteger(event_id), "event_id deve ser inteiro");
    assert(Number.isInteger(year), "year deve ser inteiro (ex.: 2025)");

    const [created] = await sql/*sql*/`
      INSERT INTO editions (event_id, year, description)
      VALUES (${event_id}, ${year}, ${description || null})
      RETURNING id, event_id, year, description, created_at, updated_at
    `;

    return res.status(201).json({ edition: created });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: { code: "DUPLICATE", message: "Já existe uma edição para esse evento neste ano" }
      });
    }
    if (err.code === "23503") {
      return res.status(400).json({
        error: { code: "FK_VIOLATION", message: "Evento não encontrado (event_id inválido)" }
      });
    }
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================
   GET /editions → lista edições (pode filtrar por event_id)
   Query params: ?event_id=1&page=1&pageSize=20
   ========================================================== */
router.get("/", async (req, res, next) => {
  try {
    const eventId = req.query.event_id ? parseInt(req.query.event_id, 10) : null;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
    const offset = (page - 1) * pageSize;

    let where = sql``;
    if (eventId) {
      where = sql`WHERE event_id = ${eventId}`;
    }

    const rows = await sql/*sql*/`
      SELECT id, event_id, year, description, created_at, updated_at
      FROM editions
      ${where}
      ORDER BY year DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const [{ count }] = await sql/*sql*/`
      SELECT COUNT(*)::int AS count FROM editions ${where}
    `;

    return res.json({ data: rows, page, pageSize, total: count });
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   GET /editions/:id → detalhe de uma edição
   ========================================================== */
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");

    const rows = await sql/*sql*/`
      SELECT id, event_id, year, description, created_at, updated_at
      FROM editions
      WHERE id = ${id}
      LIMIT 1
    `;
    const edition = rows[0];
    if (!edition) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Edição não encontrada" } });
    }

    return res.json({ edition });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================
   PATCH /editions/:id → atualização parcial
   Body: { year?: number, description?: string|null }
   ========================================================== */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");

    const fields = [];
    const values = [];

    if (Number.isInteger(req.body?.year)) {
      fields.push("year");
      values.push(req.body.year);
    }
    if (typeof req.body?.description === "string" || req.body?.description === null) {
      fields.push("description");
      values.push(req.body.description);
    }

    assert(fields.length > 0, "Nada para atualizar");

    const setSql = fields.map((f, i) => sql`${sql(f)} = ${values[i]}`);

    const [updated] = await sql/*sql*/`
      UPDATE editions
      SET ${sql(setSql)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, event_id, year, description, created_at, updated_at
    `;

    if (!updated) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Edição não encontrada" } });
    }

    return res.json({ edition: updated });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    if (err.code === "23505") {
      return res.status(409).json({
        error: { code: "DUPLICATE", message: "Já existe uma edição para esse evento neste ano" }
      });
    }
    next(err);
  }
});

/* ============================================================
   DELETE /editions/:id → remove edição
   ========================================================== */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");

    const result = await sql/*sql*/`
      DELETE FROM editions WHERE id = ${id} RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Edição não encontrada" } });
    }

    return res.status(204).send(); // sucesso sem corpo
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

module.exports = router;
