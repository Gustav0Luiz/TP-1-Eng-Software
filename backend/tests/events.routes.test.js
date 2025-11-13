// Sobre este arquivo:
// 1) Exercitamos todas as operações principais de /events diretamente com Supertest, sem subir servidor real.
// 2) Criamos um mock esperto de `sql` que, além de registrar chamadas, permite enfileirar resultados somente quando `await` acontece.
// 3) Configuramos JWTs falsos para simular usuários distintos e validar filtros de owner_id.
// 4) Cada teste segue o padrão Arrange–Act–Assert com comentários explicando até os passos básicos para facilitar leitura e revisão.

const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "unit-test-secret";

// Mock do cliente SQL com fila de resultados consumida apenas quando `await` é chamado
jest.mock("../src/db/sql", () => {
  const queue = [];

  const sqlMock = jest.fn((strings, ...values) => {
    let basePromise = null;
    const getBasePromise = () => {
      if (!basePromise) {
        const next = queue.length ? queue.shift() : { type: "result", value: [] };
        basePromise =
          next.type === "error"
            ? Promise.reject(next.error)
            : Promise.resolve(next.value);
      }
      return basePromise;
    };

    return {
      then(onFulfilled, onRejected) {
        return getBasePromise().then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        return getBasePromise().catch(onRejected);
      },
      finally(onFinally) {
        return getBasePromise().finally(onFinally);
      },
    };
  });

  sqlMock.queueResult = (value) => queue.push({ type: "result", value });
  sqlMock.queueError = (error) => queue.push({ type: "error", error });
  sqlMock.resetQueue = () => {
    queue.length = 0;
    sqlMock.mockClear();
  };

  return { sql: sqlMock };
});

const app = require("../src/app");
const { sql } = require("../src/db/sql");

const createToken = (overrides = {}) => {
  const payload = {
    sub: overrides.sub ?? 10,
    email: overrides.email ?? "owner@example.com",
    nickname: overrides.nickname ?? "owner",
  };
  return jwt.sign(payload, process.env.JWT_SECRET);
};

describe("POST /events", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna 400 quando name tem menos de 3 caracteres", async () => {
    // Arrange: token válido, payload inválido
    const token = createToken();

    // Act
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "ab" });

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION" },
    });
    expect(sql).not.toHaveBeenCalled(); // validação falha antes do acesso ao banco
  });

  test("cria evento e usa owner_id do token", async () => {
    // Arrange
    const token = createToken({ sub: 42 });
    const createdEvent = {
      id: 123,
      name: "Evento XPTO",
      description: "Detalhes",
      created_at: "2024-03-01T00:00:00Z",
      updated_at: "2024-03-01T00:00:00Z",
    };
    sql.queueResult([createdEvent]); // resultado do INSERT

    // Act
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  Evento XPTO  ", description: "Detalhes" });

    // Assert
    expect(response.statusCode).toBe(201);
    expect(response.body.event).toMatchObject({
      id: createdEvent.id,
      name: createdEvent.name,
      description: createdEvent.description,
    });

    const insertCall = sql.mock.calls.at(-1);
    expect(insertCall[1]).toBe("Evento XPTO"); // nome trimado
    expect(insertCall[2]).toBe("Detalhes");
    expect(insertCall[3]).toBe(42); // owner_id = sub do token
  });
});

describe("GET /events (lista paginada)", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna dados paginados filtrando pelo owner", async () => {
    // Arrange
    const token = createToken({ sub: 55 });
    const rows = [
      {
        id: 1,
        name: "Evento 1",
        description: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ];
    sql.queueResult(rows);           // resultado do SELECT principal
    sql.queueResult([{ count: 5 }]); // resultado do COUNT

    // Act
    const response = await request(app)
      .get("/events?page=2&pageSize=1")
      .set("Authorization", `Bearer ${token}`);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      data: rows,
      page: 2,
      pageSize: 1,
      total: 5,
    });

    // Primeira chamada do sql constrói o WHERE com owner_id
    expect(sql.mock.calls[0][1]).toBe(55);
    // Segunda chamada (SELECT) usa offset calculado (page=2,pageSize=1 → offset=1)
    expect(sql.mock.calls[1][2]).toBe(1); // pageSize
    expect(sql.mock.calls[1][3]).toBe(1); // offset
  });
});

describe("GET /events/:id", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna 400 quando o id não é numérico", async () => {
    const token = createToken();

    const response = await request(app)
      .get("/events/abc")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION" },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("retorna 404 quando o evento não pertence ao usuário", async () => {
    const token = createToken({ sub: 9 });
    sql.queueResult([]); // SELECT não encontra nada

    const response = await request(app)
      .get("/events/999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });

  test("retorna evento quando encontrado", async () => {
    const token = createToken({ sub: 7 });
    const eventRow = {
      id: 77,
      name: "Meu Evento",
      description: "Detalhes",
      created_at: "2024-01-10T00:00:00Z",
      updated_at: "2024-01-11T00:00:00Z",
    };
    sql.queueResult([eventRow]);

    const response = await request(app)
      .get("/events/77")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.event).toMatchObject(eventRow);

    const selectCall = sql.mock.calls.at(-1);
    expect(selectCall[1]).toBe(77); // id usado no WHERE
    expect(selectCall[2]).toBe(7);  // owner_id filtrando pelo token
  });
});

describe("PATCH /events/:id", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna 400 para id inválido", async () => {
    const token = createToken();
    const response = await request(app)
      .patch("/events/NaN")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Novo" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION" },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("retorna 400 quando nenhum campo é enviado", async () => {
    const token = createToken();
    const response = await request(app)
      .patch("/events/5")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION", message: "Nada para atualizar" },
    });
    expect(sql.mock.calls.length).toBe(0);
  });

  test("retorna 404 quando o registro não pertence ao usuário", async () => {
    const token = createToken({ sub: 2 });
    sql.queueResult([]); // UPDATE não retorna linhas

    const response = await request(app)
      .patch("/events/55")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Outro", description: "Texto" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });

  test("atualiza nome e descrição quando o usuário é dono", async () => {
    const token = createToken({ sub: 3 });
    const updated = {
      id: 12,
      name: "Nome Atualizado",
      description: "Nova descrição",
      created_at: "2024-02-01T00:00:00Z",
      updated_at: "2024-02-02T00:00:00Z",
    };
    sql.queueResult([updated]); // resultado do UPDATE

    const response = await request(app)
      .patch("/events/12")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  Nome Atualizado ", description: "Nova descrição" });

    expect(response.statusCode).toBe(200);
    expect(response.body.event).toMatchObject(updated);

    // Primeira chamada: fragmento "name = ${trimmed}"
    expect(sql.mock.calls[0][1]).toBe("Nome Atualizado");
    // Última chamada: UPDATE efetivo com id e owner_id
    const finalCall = sql.mock.calls.at(-1);
    expect(finalCall[2]).toBe(12); // id filtrado
    expect(finalCall[3]).toBe(3);  // owner_id = usuário autenticado
  });
});

describe("DELETE /events/:id", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna 400 quando id não é número", async () => {
    const token = createToken();
    const response = await request(app)
      .delete("/events/xyz")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION" },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("retorna 404 quando o evento não pertence ao usuário", async () => {
    const token = createToken({ sub: 99 });
    sql.queueResult([]); // DELETE não remove linhas

    const response = await request(app)
      .delete("/events/500")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });

  test("remove evento do usuário e retorna 204", async () => {
    const token = createToken({ sub: 8 });
    sql.queueResult([{ id: 8 }]); // DELETE retorna uma linha

    const response = await request(app)
      .delete("/events/8")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(204);
    expect(response.text).toBe(""); // sem corpo

    const deleteCall = sql.mock.calls.at(-1);
    expect(deleteCall[1]).toBe(8); // id deletado
    expect(deleteCall[2]).toBe(8); // owner_id filtrado
  });
});
