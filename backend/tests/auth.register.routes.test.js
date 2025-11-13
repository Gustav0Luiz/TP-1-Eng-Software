// O que este arquivo cobre:
// 1) Testamos a rota POST /auth/register de forma isolada, usando Supertest sem subir servidor real.
// 2) Mockamos o banco (sql) e o bcrypt para não depender de infraestrutura externa.
// 3) Forçamos um JWT_SECRET fictício para permitir a geração de tokens durante os testes.
// 4) Cada cenário segue o padrão Arrange–Act–Assert e contém comentários explicando cada etapa.

const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "unit-test-secret";

// Mock do cliente SQL para controlar inserts/erros retornados pela rota
jest.mock("../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

// Mock do bcrypt para controlar hashing e evitar custo computacional
jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const app = require("../src/app");
const { sql } = require("../src/db/sql");
const bcrypt = require("bcrypt");

describe("POST /auth/register (testes de unidade)", () => {
  beforeEach(() => {
    // Limpa o estado de todos os mocks antes de cada caso
    sql.mockReset();
    sql.mockResolvedValue([]);
    bcrypt.hash.mockReset();
  });

  test("retorna 400 quando campos obrigatórios não são enviados", async () => {
    // Arrange: payload incompleto (faltam diversos campos)
    const payload = { nickname: "novo" };

    // Act
    const response = await request(app).post("/auth/register").send(payload);

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION",
        message: expect.stringContaining("são obrigatórios"),
      },
    });
    expect(sql).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  test("retorna 409 quando o e-mail já está cadastrado", async () => {
    // Arrange
    const duplicateError = new Error("duplicate");
    duplicateError.code = "23505";
    duplicateError.constraint = "users_email_key";
    sql.mockImplementationOnce(() => Promise.reject(duplicateError));
    bcrypt.hash.mockResolvedValue("hash-duplicado");

    // Act
    const response = await request(app).post("/auth/register").send({
      first_name: "Marie",
      last_name: "Curie",
      nickname: "mcurie",
      email: "MARIE@example.com",
      password: "segredo123",
    });

    // Assert
    expect(response.statusCode).toBe(409);
    expect(response.body).toMatchObject({
      error: { code: "EMAIL_IN_USE", message: "E-mail já cadastrado" },
    });
    expect(sql).toHaveBeenCalledTimes(1);
    expect(bcrypt.hash).toHaveBeenCalledWith("segredo123", 10);
  });

  test("cria usuário e retorna token quando os dados são válidos", async () => {
    // Arrange
    const payload = {
      first_name: "Katherine",
      last_name: "Johnson",
      nickname: "KJ",
      email: "KATHERINE@NASA.GOV",
      password: "Apolo11",
    };
    const hashed = "hashed-password";
    const insertedUser = {
      id: 101,
      first_name: "Katherine",
      last_name: "Johnson",
      nickname: "kj",
      email: "katherine@nasa.gov",
      created_at: "2024-03-01T00:00:00Z",
      updated_at: "2024-03-01T00:00:00Z",
    };

    bcrypt.hash.mockResolvedValue(hashed);
    sql.mockResolvedValueOnce([insertedUser]);

    // Act
    const response = await request(app).post("/auth/register").send(payload);

    // Assert
    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      user: {
        id: insertedUser.id,
        email: insertedUser.email,
        nickname: insertedUser.nickname,
      },
      token: expect.any(String),
    });
    expect(response.body.user).not.toHaveProperty("password_hash");

    // Assegura que o hash foi calculado com a senha informada
    expect(bcrypt.hash).toHaveBeenCalledWith(payload.password, 10);
    expect(sql).toHaveBeenCalledTimes(1);

    // Verifica se o token foi assinado com o segredo definido
    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe(insertedUser.id);
  });
});
