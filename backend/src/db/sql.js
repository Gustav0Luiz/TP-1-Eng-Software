/**
 * src/db/sql.js
 *
 * Conexão com o PostgreSQL usando a lib "postgres".
 * - Lê variáveis de ambiente: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT.
 * - Usa pooling automático (reutiliza conexões).
 * - Permite queries seguras com template string.
 */

const postgres = require("postgres");

// Cria o cliente SQL lendo variáveis do ambiente (.env).
// Como não passamos DATABASE_URL, ele usa automaticamente PGHOST, PGUSER, etc.
const sql = postgres({
  host: process.env.PGHOST,       // ex.: "localhost"
  port: process.env.PGPORT,       // ex.: 5432
  database: process.env.PGDATABASE, // nome do banco
  username: process.env.PGUSER,   // usuário
  password: process.env.PGPASSWORD, // senha
  idle_timeout: 30,   // fecha conexões inativas após 30s
  connect_timeout: 5, // tempo limite de conexão (segundos)
  // ssl: 'require'   // descomente se for usar banco na nuvem que exija SSL
});

/**
 * Fecha todas as conexões graciosamente.
 * Útil em testes e scripts de migração.
 */
async function shutdown() {
  await sql.end({ timeout: 5 });
}

module.exports = { sql, shutdown };
