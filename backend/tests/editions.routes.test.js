// Objetivo deste arquivo:
// 1) Exercitar POST /editions via Supertest sem subir servidor real.
// 2) Mockar o banco (sql) para controlar eventos/edições retornados durante o teste.
// 3) Configurar um JWT falso para simular usuário autenticado.
// 4) Demonstrar, via Arrange–Act–Assert, que a API deveria bloquear uso de eventos de outro usuário.

const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "unit-test-secret";

jest.mock("../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

const app = require("../src/app");
const { sql } = require("../src/db/sql");

const createToken = (overrides = {}) => {
  const payload = {
    sub: overrides.sub ?? 1,
    email: overrides.email ?? "tester@example.com",
    nickname: overrides.nickname ?? "tester",
  };
  return jwt.sign(payload, process.env.JWT_SECRET);
};

describe("POST /editions (cenário de segurança)", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockResolvedValue([]);
  });

  test("deve rejeitar criação quando o evento pertence a outro usuário", async () => {
    // Arrange
    const token = createToken({ sub: 1 }); // usuário autenticado = 1
    sql
      // Busca de evento pelo nome retorna um evento pertencente a outro usuário
      .mockResolvedValueOnce([{ id: 500, owner_id: 999 }]);

    const payload = {
      eventName: "Evento de Outro Usuário",
      year: 2025,
      description: "Tentativa de invasão de domínio",
      local: "SP",
    };

    // Act
    const response = await request(app)
      .post("/editions")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    // Assert
    expect(response.statusCode).toBe(404); // comportamento esperado para proteger o recurso
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
    expect(sql).toHaveBeenCalledTimes(1); // deveria abortar antes do INSERT
  });
});
