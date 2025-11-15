const { sql } = require('../db/sql');

beforeEach(async () => {
  // Limpa todas as tabelas antes de cada teste
  await sql`DELETE FROM article_authors`;
  await sql`DELETE FROM articles`;
  await sql`DELETE FROM authors`;
  await sql`DELETE FROM editions`;
  await sql`DELETE FROM events`;
  await sql`DELETE FROM subscriptions`;
  await sql`DELETE FROM users`;
});

afterAll(async () => {
  // Fecha a conexão com o banco de dados após todos os testes
  await sql.end();
});
