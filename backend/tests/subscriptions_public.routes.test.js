// Guia deste arquivo:
// 1) Exercitamos POST /subscriptions (rota pública) diretamente pelo app Express via Supertest.
// 2) Mockamos o cliente SQL para controlar duplicidade, inserções e evitar dependência do Postgres.
// 3) Cada bloco explica a etapa ABA (Arrange–Act–Assert) e comenta decisões básicas para facilitar leitura.
// 4) Fazemos o máximo de cenários relevantes: campos ausentes, e-mail inválido, assinatura duplicada e sucesso feliz.

const request = require("supertest");

jest.mock("../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

const app = require("../src/app");
const { sql } = require("../src/db/sql");

describe("POST /subscriptions (rota pública)", () => {
  beforeEach(() => {
    // Cada teste começa com o mock zerado e retorno padrão vazio
    sql.mockReset();
    sql.mockResolvedValue([]);
  });

  test("retorna 400 quando name ou email não são enviados", async () => {
    // Arrange: omitimos o e-mail para disparar a validação obrigatória
    const payload = { name: "Visitante" };

    // Act
    const response = await request(app).post("/subscriptions").send(payload);

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION", message: expect.stringContaining("'name' e 'email'") },
    });
    expect(sql).not.toHaveBeenCalled(); // o fluxo encerra antes de acessar o banco
  });

  test("retorna 400 quando o e-mail tem formato inválido", async () => {
    // Arrange
    const payload = { name: "Teste", email: "sem-arroba" };

    // Act
    const response = await request(app).post("/subscriptions").send(payload);

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION", message: "E-mail inválido." },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("retorna 200 com flag duplicated quando já existe assinatura igual", async () => {
    // Arrange
    const existingSubscription = [{ id: 1 }];
    sql.mockResolvedValueOnce(existingSubscription); // primeira query (SELECT) encontra registro
    const payload = { name: "Repetido", email: "duplicado@example.com" };

    // Act
    const response = await request(app).post("/subscriptions").send(payload);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      duplicated: true,
      message: "Assinatura já existente.",
    });
    expect(sql).toHaveBeenCalledTimes(1); // evita INSERT quando já existe
  });

  test("cria assinatura nova quando dados são válidos", async () => {
    // Arrange
    const inserted = [{
      id: 99,
      name: "Nova Pessoa",
      email: "nova@pessoa.com",
      is_enabled: true,
      created_at: "2024-03-01T00:00:00Z",
    }];
    sql
      .mockResolvedValueOnce([])         // SELECT não encontra duplicatas
      .mockResolvedValueOnce(inserted);  // INSERT retorna assinatura criada

    const payload = { name: " Nova Pessoa ", email: "NOVA@PESSOA.COM " }; // note os espaços/maiúsculas

    // Act
    const response = await request(app).post("/subscriptions").send(payload);

    // Assert
    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      subscription: {
        id: inserted[0].id,
        name: inserted[0].name,
        email: inserted[0].email,
      },
    });
    expect(sql).toHaveBeenCalledTimes(2); // SELECT + INSERT

    // Confere se o INSERT recebeu name/email já normalizados (trim + lower-case)
    const insertCallArgs = sql.mock.calls[1];
    expect(insertCallArgs[1]).toBe("Nova Pessoa");        // name trimado
    expect(insertCallArgs[2]).toBe("nova@pessoa.com");    // e-mail em minúsculas
  });
});
