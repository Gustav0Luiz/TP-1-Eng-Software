/**
 * Testes de integração das rotas /auth
 * ---------------------------------------------------------------------------
 * Exercitamos a pilha completa (app Express + middlewares + rotas) usando
 * Supertest, mas controlamos as respostas do banco e do bcrypt para
 * reproduzir cada cenário desejado.
 */

const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-secret";

// Mock do cliente SQL usado por todas as rotas.
jest.mock("../../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

// Mock de bcrypt para evitar custos e facilitar asserts.
jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const app = require("../../src/app");
const { sql } = require("../../src/db/sql");
const bcrypt = require("bcrypt");

const createToken = (payload = {}) =>
  jwt.sign(
    {
      sub: payload.sub ?? 1,
      email: payload.email ?? "user@example.com",
      nickname: payload.nickname ?? "user",
    },
    process.env.JWT_SECRET
  );

describe("Integração /auth", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockResolvedValue([]);
    bcrypt.hash.mockReset();
    bcrypt.compare.mockReset();
  });

  test("POST /auth/register cria usuário e devolve token", async () => {
    // bcrypt gera um hash estático para não depender do algoritmo real.
    bcrypt.hash.mockResolvedValue("hashed-password");

    // Simula o retorno do INSERT ... RETURNING.
    sql.mockResolvedValueOnce([
      {
        id: 99,
        first_name: "Linus",
        last_name: "Torvalds",
        nickname: "linus",
        email: "linus@example.com",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);

    const response = await request(app).post("/auth/register").send({
      first_name: "Linus",
      last_name: "Torvalds",
      nickname: "LINUS", // valida normalização para minúsculas
      email: "LINUS@example.com",
      password: "Senha!123",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      user: {
        id: 99,
        nickname: "linus",
        email: "linus@example.com",
      },
      token: expect.any(String),
    });
    expect(bcrypt.hash).toHaveBeenCalledWith("Senha!123", 10);
    expect(sql).toHaveBeenCalledTimes(1);
  });

  test("POST /auth/register retorna 409 quando email é duplicado", async () => {
    const duplicate = Object.assign(new Error("dup"), {
      code: "23505",
      constraint: "users_email_key",
    });
    sql.mockImplementationOnce(() => Promise.reject(duplicate));
    bcrypt.hash.mockResolvedValue("hash");

    const response = await request(app).post("/auth/register").send({
      first_name: "Marie",
      last_name: "Curie",
      nickname: "marie",
      email: "marie@example.com",
      password: "123456",
    });

    expect(response.statusCode).toBe(409);
    expect(response.body).toMatchObject({
      error: { code: "EMAIL_IN_USE", message: "E-mail já cadastrado" },
    });
  });

  test("POST /auth/login autentica quando credenciais batem", async () => {
    const dbUser = {
      id: 10,
      first_name: "Ada",
      last_name: "Lovelace",
      nickname: "ada",
      email: "ada@example.com",
      password_hash: "db-hash",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    sql.mockResolvedValueOnce([dbUser]);
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(app).post("/auth/login").send({
      nickname: "ADA",
      password: "senha correta",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      user: {
        id: 10,
        nickname: "ada",
        email: "ada@example.com",
      },
      token: expect.any(String),
    });
    expect(bcrypt.compare).toHaveBeenCalledWith("senha correta", "db-hash");
  });

  test("POST /auth/login retorna 401 para nickname inexistente", async () => {
    sql.mockResolvedValueOnce([]); // nenhum usuário encontrado

    const response = await request(app).post("/auth/login").send({
      nickname: "ghost",
      password: "123456",
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toMatchObject({
      error: { code: "INVALID_CREDENTIALS" },
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  test("GET /auth/me retorna dados quando token é válido", async () => {
    const token = createToken({ sub: 5, nickname: "grace" });
    sql.mockResolvedValueOnce([
      {
        id: 5,
        first_name: "Grace",
        last_name: "Hopper",
        nickname: "grace",
        email: "grace@example.com",
        created_at: "2024-02-01T00:00:00Z",
        updated_at: "2024-02-01T00:00:00Z",
      },
    ]);

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.user).toMatchObject({
      id: 5,
      nickname: "grace",
    });
    expect(sql).toHaveBeenCalledTimes(1);
  });
});
