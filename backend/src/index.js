// Arquivo de entrada do backend.
// Objetivo: subir o servidor HTTP (Express), habilitar CORS/JSON,
// conectar no PostgreSQL e montar as rotas da API.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';              // biblioteca oficial do PostgreSQL para Node
import apiRoutes from './routes/index.js';

dotenv.config();                   // carrega variáveis do .env

const { Pool } = pkg;

// Cria um pool de conexões com o Postgres.
// O Pool gerencia conexões automaticamente (reuso, fila, etc).
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'vlib',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres'
      }
);

const app = express();

// --- Middlewares globais ---
// Habilita CORS (permite que o frontend acesse a API de outro domínio/porta)
app.use(cors());
// Faz o parse automático de JSON no corpo das requisições (req.body)
app.use(express.json());

// --- Rota de healthcheck (útil para ver se o servidor e o DB respondem) ---
app.get('/health', async (_req, res) => {
  try {
    const r = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- Monta as rotas da API em /api ---
// Passamos o "pool" para as rotas poderem acessar o banco de dados.
app.use('/api', apiRoutes(pool));

// --- Sobe o servidor ---
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API ouvindo em http://localhost:${PORT}`);
});
