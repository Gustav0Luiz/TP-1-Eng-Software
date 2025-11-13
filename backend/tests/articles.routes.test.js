// Passo-a-passo deste arquivo:
// 1) Configuramos mocks para o banco (sql) e para o serviço de e-mail, isolando o endpoint.
// 2) Definimos um segredo JWT de teste e criamos um helper para emitir tokens falsos.
// 3) Montamos cenários do POST /articles com Supertest usando o próprio app Express (sem subir servidor real).
// 4) Em cada teste seguimos o padrão Arrange–Act–Assert, validando autenticação, campos obrigatórios e regras de negócio.

const request = require("supertest");
const jwt = require("jsonwebtoken");

// Garante um segredo default para assinar tokens falsos nos testes
process.env.JWT_SECRET = process.env.JWT_SECRET || "unit-test-secret";

// Mock do cliente SQL para impedir consultas reais ao banco
jest.mock("../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

// Mock do serviço de e-mail para bloquear envios reais
jest.mock("../src/lib/mailer", () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

const app = require("../src/app");
const { sql } = require("../src/db/sql");

// Helper para emitir tokens JWT falsos usados nos testes
const createToken = (overrides = {}) => {
  const payload = {
    sub: overrides.sub ?? 1,
    email: overrides.email ?? "unit@test.dev",
    nickname: overrides.nickname ?? "Unit Tester",
  };
  return jwt.sign(payload, process.env.JWT_SECRET);
};

describe("Validações unitárias do POST /articles", () => {
  beforeEach(() => {
    // Limpa histórico e define retorno padrão vazio antes de cada cenário
    sql.mockReset();
    sql.mockResolvedValue([]);
  });


  test("recusa criação quando o ano informado é anterior a 1900", async () => {
    // Arrange
    const token = createToken();

    // Act
    const response = await request(app)
      .post("/articles")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Artigo Histórico")
      .field("eventName", "Conferência Muito Antiga")
      .field("year", "1890")
      .attach("pdf", Buffer.from("conteudo"), "antigo.pdf");

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION", message: "Ano (year) inválido" },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("recusa criação quando o PDF não é enviado", async () => {
    // Arrange
    const token = createToken();

    // Act
    const response = await request(app)
      .post("/articles")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Artigo de Teste")
      .field("eventName", "Conferência de Teste")
      .field("year", "2024");

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION",
        message: expect.stringContaining("Campos obrigatórios"),
      },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("retorna 409 quando o título já existe para a mesma edição", async () => {
    // Arrange
    const token = createToken();
    sql
      // SELECT do evento existente do usuário
      .mockResolvedValueOnce([{ id: 10, name: "Conf Teste", owner_id: 1 }])
      // SELECT da edição existente
      .mockResolvedValueOnce([{ id: 20, event_id: 10, year: 2024, owner_id: 1 }])
      // SELECT de verificação de duplicidade que encontra um registro
      .mockResolvedValueOnce([{ id: 999 }]);

    // Act
    const response = await request(app)
      .post("/articles")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Artigo Repetido")
      .field("eventName", "Conf Teste")
      .field("year", "2024")
      .attach("pdf", Buffer.from("dados"), "duplicado.pdf");

    // Assert
    expect(response.statusCode).toBe(409);
    expect(response.body).toMatchObject({
      error: {
        code: "DUPLICATE_ARTICLE",
        message: expect.stringContaining("já existe"),
      },
    });
    expect(sql).toHaveBeenCalledTimes(3);
  });
});
