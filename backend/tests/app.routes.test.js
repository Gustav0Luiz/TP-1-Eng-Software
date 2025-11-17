const request = require("supertest");

jest.mock("../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

const app = require("../src/app");
const { sql } = require("../src/db/sql");

describe("app.js utilitários globais", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockResolvedValue([]);
  });

  test("GET /health expõe status simples", async () => {
    const response = await request(app).get("/health");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(sql).not.toHaveBeenCalled();
  });

  test("GET /db-check retorna versão do banco quando OK", async () => {
    sql.mockResolvedValueOnce([{ version: "PostgreSQL 16" }]);
    const response = await request(app).get("/db-check");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, version: "PostgreSQL 16" });
    expect(sql).toHaveBeenCalledTimes(1);
  });

  test("GET /db-check trata erro de tabela inexistente (42P01)", async () => {
    const tableErr = Object.assign(new Error("missing"), { code: "42P01" });
    sql.mockRejectedValueOnce(tableErr);

    const response = await request(app).get("/db-check");

    expect(response.statusCode).toBe(500);
    expect(response.body).toMatchObject({
      error: { code: "TABLE_NOT_FOUND" },
    });
  });

  test("GET /db-check trata violação de unicidade (23505)", async () => {
    const uniqueErr = Object.assign(new Error("dup"), { code: "23505" });
    sql.mockRejectedValueOnce(uniqueErr);

    const response = await request(app).get("/db-check");

    expect(response.statusCode).toBe(409);
    expect(response.body).toMatchObject({
      error: { code: "UNIQUE_VIOLATION" },
    });
  });

  test("rotas inexistentes retornam 404 padronizado", async () => {
    const response = await request(app).get("/rota-nao-existe");
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND", message: "Rota não encontrada" },
    });
  });
});
