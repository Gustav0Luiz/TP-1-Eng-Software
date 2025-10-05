/**
 * src/routes/editions.js
 *
 * Rotas para gerenciar **Edições** de eventos.
 * CORREÇÃO FINAL: Implementa owner_id e filtro de listagem/CRUD.
 */

const { Router } = require("express");
const { sql } = require("../src/db/sql");

const router = Router();

/* ============================================================
   Utilitários e Helpers
   ========================================================== */
function assert(cond, message) {
  if (!cond) {
    const e = new Error(message);
    e.code = "VALIDATION";
    throw e;
  }
}

function asStringOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * Converte Nome do Evento (string) para ID, ou lança erro 404.
 */
async function getEventIdByNameOrThrow(eventName) {
  const rows = await sql/*sql*/`
    SELECT id FROM events
    WHERE name ILIKE ${eventName}
    LIMIT 1
  `;
  const event = rows[0];
  if (!event) {
    const e = new Error(`Evento '${eventName}' não encontrado. Cadastre-o primeiro.`);
    e.code = "EVENT_NOT_FOUND";
    throw e;
  }
  return event.id;
}


/* ============================================================
   POST /editions → cria edição de um evento
   MUDANÇA: Adiciona owner_id
   ========================================================== */
router.post("/", async (req, res, next) => {
  try {
    const { eventName, year: rawYear, description: rawDesc, local: rawLocal } = req.body;

    const eventNameClean = asStringOrNull(eventName);
    const year = parseInt(rawYear, 10);
    const description = asStringOrNull(rawDesc);
    const local = asStringOrNull(rawLocal);
    const ownerId = req.user?.id || null; // NOVO: Pega o ID do usuário logado

    // 1. Validação
    assert(eventNameClean && eventNameClean.length >= 3, "Nome do Evento é obrigatório (mín. 3 caracteres)");
    assert(Number.isInteger(year) && year >= 1000, "Ano deve ser um inteiro válido (ex.: 2025)");

    // 2. CONVERTE NOME DO EVENTO EM ID
    const eventId = await getEventIdByNameOrThrow(eventNameClean);

    // 3. Insere a nova edição
    const [created] = await sql/*sql*/`
      INSERT INTO editions (event_id, year, description, local, owner_id)
      VALUES (${eventId}, ${year}, ${description}, ${local}, ${ownerId})
      RETURNING id, event_id, year, description, local, created_at, updated_at
    `;

    return res.status(201).json({ edition: created });

  } catch (err) {
    if (err.code === "EVENT_NOT_FOUND") {
       return res.status(404).json({ error: { code: "NOT_FOUND", message: err.message } });
    }
    if (err.code === "23505") {
      return res.status(409).json({
        error: { code: "DUPLICATE", message: "Já existe uma edição para esse evento neste ano" }
      });
    }
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================
   GET /editions → lista edições
   MUDANÇA: FILTRA por owner_id
   ========================================================== */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.id; // ID do usuário logado
    
    const eventId = req.query.event_id ? parseInt(req.query.event_id, 10) : null;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
    const offset = (page - 1) * pageSize;

    // NOVO: Cláusula WHERE base para filtrar pelo dono
    let where = sql`WHERE e.owner_id = ${userId}`; 

    if (eventId) {
      // Se tiver filtro de event_id, adiciona à cláusula WHERE existente
      where = sql`${where} AND e.event_id = ${eventId}`;
    }

    const rows = await sql/*sql*/`
      SELECT e.id, e.event_id, e.year, e.description, e.local, e.created_at, e.updated_at,
             ev.name AS event_name, ev.id AS event_id
      FROM editions e
      JOIN events ev ON ev.id = e.event_id
      ${where}
      ORDER BY e.year DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const [{ count }] = await sql/*sql*/`
      SELECT COUNT(*)::int AS count FROM editions e ${where}
    `;

    return res.json({ data: rows, page, pageSize, total: count });
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   GET /editions/:id → detalhe de uma edição
   MUDANÇA: Adicionado filtro por owner_id.
   ========================================================== */
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");
    
    const userId = req.user?.id; // ID do usuário logado

    const rows = await sql/*sql*/`
      SELECT e.id, e.event_id, e.year, e.description, e.local, e.created_at, e.updated_at,
             ev.name AS event_name
      FROM editions e
      JOIN events ev ON ev.id = e.event_id
      WHERE e.id = ${id} AND e.owner_id = ${userId}
      LIMIT 1
    `;
    const edition = rows[0];
    if (!edition) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Edição não encontrada ou acesso negado" } });
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
   MUDANÇA: Restringe a edição ao owner_id.
   ========================================================== */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");
    
    const userId = req.user?.id; // ID do usuário logado

    const { eventName, year: rawYear, description: rawDesc, local: rawLocal } = req.body;

    const updates = []; 

    // 1. Atualiza o Ano
    if (rawYear !== undefined) {
      const year = parseInt(rawYear, 10);
      assert(Number.isInteger(year) && year >= 1000, "Ano deve ser um inteiro válido");
      updates.push(sql/*sql*/`year = ${year}`);
    }
    
    // 2. Atualiza Descrição e Local
    if (rawDesc !== undefined) {
      updates.push(sql/*sql*/`description = ${asStringOrNull(rawDesc)}`);
    }
    if (rawLocal !== undefined) {
      updates.push(sql/*sql*/`local = ${asStringOrNull(rawLocal)}`);
    }

    // 3. Atualiza o Evento base (converte nome para ID)
    if (eventName !== undefined) {
      const eventNameClean = asStringOrNull(eventName);
      assert(eventNameClean && eventNameClean.length >= 3, "Nome do Evento deve ter no mínimo 3 caracteres");
      
      const eventId = await getEventIdByNameOrThrow(eventNameClean);
      updates.push(sql/*sql*/`event_id = ${eventId}`);
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
      UPDATE editions
      SET ${setSql}
      WHERE id = ${id} AND owner_id = ${userId}
      RETURNING id, event_id, year, description, local, created_at, updated_at
    `;

    if (!updated) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Edição não encontrada ou acesso negado" } });
    }

    return res.json({ edition: updated });
  } catch (err) {
    if (err.code === "EVENT_NOT_FOUND") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: err.message } });
    }
    if (err.code === "23505") {
      return res.status(409).json({
        error: { code: "DUPLICATE", message: "Já existe uma edição para esse evento neste ano" }
      });
    }
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});


/* ============================================================
   DELETE /editions/:id → remove edição
   MUDANÇA: Restringe a deleção ao owner_id.
   ========================================================== */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    assert(Number.isInteger(id), "id inválido");
    
    const userId = req.user?.id; // ID do usuário logado

    const result = await sql/*sql*/`
      DELETE FROM editions WHERE id = ${id} AND owner_id = ${userId} RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Edição não encontrada ou acesso negado" } });
    }

    return res.status(204).send();
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});


module.exports = router;