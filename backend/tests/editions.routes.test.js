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

describe("POST /editions (fluxos gerais)", () => {
  beforeEach(() => {
    sql.mockReset();
  });

  test("cria uma edição com sucesso quando os dados são válidos", async () => {
    const token = createToken({ sub: 5 });

    sql
      .mockResolvedValueOnce([{ id: 40 }]) // SELECT do evento por nome
      .mockResolvedValueOnce([
        { id: 99, event_id: 40, year: 2032, description: "Edição Principal", local: "Recife" },
      ]); // INSERT retorna edição

    const response = await request(app)
      .post("/editions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        eventName: "Evento Cypress",
        year: 2032,
        description: "Edição Principal",
        local: "Recife",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      edition: { id: 99, year: 2032, description: "Edição Principal", local: "Recife" },
    });
    expect(sql).toHaveBeenCalledTimes(2);
  });

  test("retorna 409 quando já existe edição no mesmo ano", async () => {
    const token = createToken({ sub: 5 });
    const duplicateError = Object.assign(new Error("duplicate"), { code: "23505" });

    sql
      .mockResolvedValueOnce([{ id: 40 }])
      .mockRejectedValueOnce(duplicateError);

    const response = await request(app)
      .post("/editions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        eventName: "Evento Cypress",
        year: 2032,
      });

    expect(response.statusCode).toBe(409);
    expect(response.body).toMatchObject({
      error: { code: "DUPLICATE" },
    });
  });
});

describe("GET /editions", () => {
  beforeEach(() => {
    sql.mockReset();
  });
});

describe("GET /editions/:id", () => {
  beforeEach(() => {
    sql.mockReset();
  });

  test("retorna 400 quando o id não é numérico", async () => {
    const token = createToken();

    const response = await request(app)
      .get("/editions/abc")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION" },
    });
  });

  test("retorna a edição quando pertence ao usuário", async () => {
    const token = createToken({ sub: 9 });

    sql.mockResolvedValueOnce([
      { id: 7, event_id: 3, year: 2029, description: "Detalhe", local: "RJ", event_name: "Evento A" },
    ]);

    const response = await request(app)
      .get("/editions/7")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      edition: { id: 7, year: 2029, event_name: "Evento A" },
    });
  });
});

describe("PATCH /editions/:id", () => {
  beforeEach(() => {
    sql.mockReset();
  });

  test("retorna 400 quando nenhum campo é enviado", async () => {
    const token = createToken();

    const response = await request(app)
      .patch("/editions/5")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION" },
    });
  });

});

describe("DELETE /editions/:id", () => {
  beforeEach(() => {
    sql.mockReset();
  });

  test("retorna 400 com id inválido", async () => {
    const token = createToken();

    const response = await request(app)
      .delete("/editions/xyz")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
  });

  test("remove edição pertencente ao usuário", async () => {
    const token = createToken({ sub: 15 });
    sql.mockResolvedValueOnce([{ id: 12 }]);

    const response = await request(app)
      .delete("/editions/12")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(204);
    expect(sql).toHaveBeenCalledTimes(1);
  });

  test("retorna 404 quando não encontra edição", async () => {
    const token = createToken();
    sql.mockResolvedValueOnce([]);

    const response = await request(app)
      .delete("/editions/12")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });
});
