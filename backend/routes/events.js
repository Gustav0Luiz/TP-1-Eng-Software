/**
 * src/routes/events.js
 *
 * Rotas para gerenciar **Eventos base** (ex.: "SBES").
 * Corrigido para implementar rastreamento de propriedade (`owner_id`) e
 * filtrar listagens e operações CRUD pelo usuário logado (`req.user?.id`).
 */

const { Router } = require("express");
const { sql } = require("../src/db/sql"); // cliente SQL (lib "postgres")

const router = Router(); // sub-aplicativo de rotas

/* ============================================================================
   Utilitário de validação simples.
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
   MUDANÇA: Adiciona owner_id (ID do usuário logado)
   ========================================================================== */
router.post("/", async (req, res, next) => {
  try {
    // 1) coleta e normaliza
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description : null;
    const ownerId = req.user?.id || null; // NOVO: Pega o ID do usuário logado

    // 2) validação objetiva
    assert(name.length >= 3, "name é obrigatório (mín. 3 caracteres)");

    // 3) insere e retorna o registro recém-criado
    const [created] = await sql/*sql*/`
      INSERT INTO events (name, description, owner_id)
      VALUES (${name}, ${description}, ${ownerId})
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
   MUDANÇA: FILTRA por owner_id (apenas eventos criados pelo usuário logado)
   ========================================================================== */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.id; // ID do usuário logado
    
    // 1) paginação defensiva
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
    const offset = (page - 1) * pageSize;

    // NOVO: Cláusula WHERE para filtrar pelo dono
    const where = sql`WHERE owner_id = ${userId}`; 

    // 2) busca registros ordenados do mais novo para o mais antigo
    const rows = await sql/*sql*/`
      SELECT id, name, description, created_at, updated_at
      FROM events
      ${where}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // 3) total para o front calcular páginas
    const [{ count }] = await sql/*sql*/`
      SELECT COUNT(*)::int AS count FROM events ${where}
    `;

    return res.json({ data: rows, page, pageSize, total: count });
  } catch (err) {
    next(err);
  }
});

/* ============================================================================
   GET /events/:id  →  detalhe de um evento
   MUDANÇA: Restringe a visualização ao owner_id
   ========================================================================== */
router.get("/:id", async (req, res, next) => {
  try {
    // 1) valida id como inteiro
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");
    
    const userId = req.user?.id; // ID do usuário logado

    // 2) busca um único registro (filtrado por ID e owner_id)
    const rows = await sql/*sql*/`
      SELECT id, name, description, created_at, updated_at
      FROM events
      WHERE id = ${id} AND owner_id = ${userId}
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
   MUDANÇA: Restringe a edição ao owner_id (mantendo sua lógica de SET)
   ========================================================================== */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");
    
    const userId = req.user?.id; // ID do usuário logado

    const updates = []; 

    if (typeof req.body?.name === "string") {
      updates.push(sql/*sql*/`name = ${req.body.name.trim()}`);
    }
    if (typeof req.body?.description === "string" || req.body?.description === null) {
      updates.push(sql/*sql*/`description = ${req.body.description}`);
    }

    assert(updates.length > 0, "Nada para atualizar");

    // Adiciona a atualização do timestamp
    updates.push(sql/*sql*/`updated_at = CURRENT_TIMESTAMP`);

    // Mantendo sua lógica de injeção de array `updates` (SetSql)
    let setSql = updates[0];
    for (let i = 1; i < updates.length; i++) {
      setSql = sql/*sql*/`${setSql}, ${updates[i]}`;
    }
    
    const [updated] = await sql/*sql*/`
      UPDATE events
      SET ${setSql}
      WHERE id = ${id} AND owner_id = ${userId}
      RETURNING id, name, description, created_at, updated_at
    `;

    if (!updated) {
      // Retorna 404 se não for encontrado ou se o usuário não for o dono
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
   MUDANÇA: Restringe a deleção ao owner_id.
   ========================================================================== */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");
    
    const userId = req.user?.id; // ID do usuário logado

    const result = await sql/*sql*/`
      DELETE FROM events WHERE id = ${id} AND owner_id = ${userId} RETURNING id
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