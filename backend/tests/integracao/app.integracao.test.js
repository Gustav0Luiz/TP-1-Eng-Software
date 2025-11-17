/**
 * Testes de integração básicos
 * --------------------------------------------------------------
 * Estes cenários usam o Express real (app.js) + Supertest para
 * garantir que rotas básicas e o middleware de erros funcionem
 * em conjunto. Simulamos respostas do banco (sql) para validar
 * cada desfecho esperado.
 */

const request = require("supertest");

// Mocka o cliente SQL globalmente, mas deixa Supertest usar o app real.
jest.mock("../../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

const app = require("../../src/app");
const { sql } = require("../../src/db/sql");

describe("Testes de integração do app (camada HTTP completa)", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockResolvedValue([]);
  });

  test("GET /health responde com status simples", async () => {
    // Este endpoint não depende de banco, então o response deve ser imediato.
    const response = await request(app).get("/health");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(sql).not.toHaveBeenCalled(); // Confirma que nada tentou acessar o DB.
  });

  test("GET /db-check retorna versão quando o banco responde", async () => {
    // Simula a consulta SELECT version().
    sql.mockResolvedValueOnce([{ version: "PostgreSQL 16.0" }]);
    const response = await request(app).get("/db-check");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, version: "PostgreSQL 16.0" });
    expect(sql).toHaveBeenCalledTimes(1); // Apenas uma consulta deve ocorrer.
  });

  test("GET /db-check devolve erro específico quando falta tabela (42P01)", async () => {
    const tableError = Object.assign(new Error("missing"), { code: "42P01" });
    sql.mockRejectedValueOnce(tableError);

    const response = await request(app).get("/db-check");

    expect(response.statusCode).toBe(500);
    expect(response.body).toMatchObject({
      error: { code: "TABLE_NOT_FOUND", message: "Tabela não encontrada. Confira o schema." },
    });
  });

  test("GET /db-check converte violação de unicidade em 409", async () => {
    const uniqueError = Object.assign(new Error("dup"), { code: "23505" });
    sql.mockRejectedValueOnce(uniqueError);

    const response = await request(app).get("/db-check");

    expect(response.statusCode).toBe(409);
    expect(response.body).toMatchObject({
      error: { code: "UNIQUE_VIOLATION", message: "Registro duplicado" },
    });
  });

  test("Rotas inexistentes retornam JSON 404 padronizado", async () => {
    // Exercita o middleware final que responde 404 para qualquer rota não mapeada.
    const response = await request(app).get("/rota-desconhecida");
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Rota não encontrada" },
    });
  });
});
