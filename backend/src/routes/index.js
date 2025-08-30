// Define as rotas da API.
// Exportamos uma "fábrica" que recebe o pool do Postgres para poder fazer queries.

import { Router } from 'express';

export default function apiRoutes(pool) {
  const router = Router();

  // Rota simples para testar a API
  router.get('/ping', (_req, res) => {
    res.json({ message: 'pong' });
  });

  /**
   * GET /api/events
   * Lista eventos (para verificar rapidamente o cadastro).
   */
  router.get('/events', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, description, created_at
           FROM events
           ORDER BY id DESC`
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro ao listar eventos.' });
    }
  });

  /**
   * POST /api/events
   * Cadastra um novo evento.
   * Espera um JSON no corpo da requisição:
   *   {
   *     "name": "Nome do Evento",
   *     "description": "Texto opcional"
   *   }
   *
   * Fluxo:
   * 1) validação simples de entrada
   * 2) INSERT seguro (com parâmetros) para evitar SQL injection
   * 3) retorna o registro criado (HTTP 201)
   */
  router.post('/events', async (req, res) => {
    try {
      const { name, description } = req.body || {};

      // Validação mínima: "name" é obrigatório e deve ser string não vazia
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          error: 'O campo "name" é obrigatório e deve ser uma string não vazia.'
        });
      }

      // Monta valores: description é opcional
      const desc = typeof description === 'string' ? description : null;

      // INSERT parametrizado (evita SQL injection).
      // "RETURNING *" devolve os campos do registro criado.
      const { rows } = await pool.query(
        `INSERT INTO events (name, description)
         VALUES ($1, $2)
         RETURNING id, name, description, created_at, updated_at`,
        [name.trim(), desc]
      );

      const created = rows[0];
      return res.status(201).json(created);
    } catch (e) {
      console.error(e);
      // Se houver erro de banco ou outro, devolvemos 500
      return res.status(500).json({ error: 'Erro ao criar evento.' });
    }
  });

  return router;
}
