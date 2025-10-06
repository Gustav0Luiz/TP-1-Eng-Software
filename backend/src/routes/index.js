// Define as rotas da API.
// Exportamos uma "fábrica" que recebe o pool do Postgres para poder fazer queries.

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

  /**
   * POST /api/register
   * Registra um novo usuário.
   * Espera um JSON no corpo da requisição:
   *   {
   *     "first_name": "João",
   *     "last_name": "da Silva",
   *     "nickname": "joao123",
   *     "email": "email@exemplo.com",
   *     "password": "senha123"
   *   }
   */
  router.post('/register', async (req, res) => {
    try {
      const { first_name, last_name, nickname, email, password } = req.body || {};

      // Validação de entrada
      if (!first_name || typeof first_name !== 'string' || !first_name.trim()) {
        return res.status(400).json({
          error: 'O campo "first_name" é obrigatório e deve ser uma string não vazia.'
        });
      }

      if (!last_name || typeof last_name !== 'string' || !last_name.trim()) {
        return res.status(400).json({
          error: 'O campo "last_name" é obrigatório e deve ser uma string não vazia.'
        });
      }

      if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
        return res.status(400).json({
          error: 'O campo "nickname" é obrigatório e deve ser uma string não vazia.'
        });
      }

      // Validação do nickname (apenas letras, números e underscore)
      const nicknameRegex = /^[a-zA-Z0-9_]+$/;
      if (!nicknameRegex.test(nickname.trim())) {
        return res.status(400).json({
          error: 'O apelido deve conter apenas letras, números e underscore.'
        });
      }

      if (nickname.trim().length < 3 || nickname.trim().length > 20) {
        return res.status(400).json({
          error: 'O apelido deve ter entre 3 e 20 caracteres.'
        });
      }

      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          error: 'O campo "email" é obrigatório e deve ser uma string não vazia.'
        });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({
          error: 'O campo "password" é obrigatório e deve ter pelo menos 6 caracteres.'
        });
      }

      // Verifica se o email já existe
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.trim().toLowerCase()]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          error: 'Este email já está cadastrado.'
        });
      }

      // Verifica se o apelido já existe
      const existingNickname = await pool.query(
        'SELECT id FROM users WHERE nickname = $1',
        [nickname.trim().toLowerCase()]
      );

      if (existingNickname.rows.length > 0) {
        return res.status(400).json({
          error: 'Este apelido já está em uso.'
        });
      }

      // Hash da senha
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insere o novo usuário
      const { rows } = await pool.query(
        `INSERT INTO users (first_name, last_name, nickname, email, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, first_name, last_name, nickname, email, created_at`,
        [first_name.trim(), last_name.trim(), nickname.trim().toLowerCase(), email.trim().toLowerCase(), passwordHash]
      );

      const user = rows[0];

      // Gera o token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Usuário registrado com sucesso!',
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          nickname: user.nickname,
          email: user.email
        },
        token
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
  });

  /**
   * POST /api/login
   * Autentica um usuário existente.
   * Espera um JSON no corpo da requisição:
   *   {
   *     "email": "email@exemplo.com",
   *     "password": "senha123"
   *   }
   */
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};

      // Validação de entrada
      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          error: 'O campo "email" é obrigatório.'
        });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          error: 'O campo "password" é obrigatório.'
        });
      }

      // Busca o usuário no banco
      const { rows } = await pool.query(
        'SELECT id, first_name, last_name, nickname, email, password_hash FROM users WHERE email = $1',
        [email.trim().toLowerCase()]
      );

      if (rows.length === 0) {
        return res.status(401).json({
          error: 'Email ou senha incorretos.'
        });
      }

      const user = rows[0];

      // Verifica a senha
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Email ou senha incorretos.'
        });
      }

      // Gera o token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login realizado com sucesso!',
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          nickname: user.nickname,
          email: user.email
        },
        token
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao fazer login.' });
    }
  });

  /**
   * GET /api/me
   * Retorna os dados do usuário autenticado.
   * Requer token JWT no header Authorization: Bearer <token>
   */
  router.get('/me', authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, first_name, last_name, nickname, email, created_at FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      return res.json({ user: rows[0] });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao buscar dados do usuário.' });
    }
  });

  /**
   * GET /api/user/:nickname
   * Retorna os dados públicos de um usuário pelo apelido.
   * Requer token JWT no header Authorization: Bearer <token>
   */
  router.get('/user/:nickname', authenticateToken, async (req, res) => {
    try {
      const { nickname } = req.params;

      if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
        return res.status(400).json({
          error: 'Apelido é obrigatório.'
        });
      }

      const { rows } = await pool.query(
        'SELECT id, first_name, last_name, nickname, email, created_at FROM users WHERE nickname = $1',
        [nickname.trim().toLowerCase()]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const user = rows[0];
      
      // Remove email se não for o próprio usuário
      if (user.id !== req.user.userId) {
        delete user.email;
      }

      return res.json({ user });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao buscar dados do usuário.' });
    }
  });

  /**
   * GET /api/database-data
   * Retorna todos os dados do banco de dados para teste
   */
  router.get('/database-data', async (_req, res) => {
    try {
      // Buscar dados de todas as tabelas
      const [users, events, authors, articles, articleAuthors] = await Promise.all([
        pool.query('SELECT id, first_name, last_name, nickname, email, created_at FROM users ORDER BY id'),
        pool.query('SELECT * FROM events ORDER BY id'),
        pool.query('SELECT * FROM authors ORDER BY id'),
        pool.query('SELECT id, title, abstract, event_id, uploader_id, created_at FROM articles ORDER BY id'),
        pool.query('SELECT * FROM article_authors ORDER BY article_id, author_id')
      ]);

      const databaseData = {
        users: users.rows,
        events: events.rows,
        authors: authors.rows,
        articles: articles.rows,
        article_authors: articleAuthors.rows,
        summary: {
          total_users: users.rows.length,
          total_events: events.rows.length,
          total_authors: authors.rows.length,
          total_articles: articles.rows.length,
          total_article_authors: articleAuthors.rows.length
        }
      };

      return res.json(databaseData);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao buscar dados do banco.' });
    }
  });

  // Middleware para autenticação JWT
  function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido.' });
      }
      req.user = user;
      next();
    });
  }

  return router;
}
