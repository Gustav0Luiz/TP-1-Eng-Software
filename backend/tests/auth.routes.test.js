// O que este arquivo faz:
// 1) Isola a rota POST /auth/login mockando banco (sql) e bcrypt.
// 2) Força um JWT_SECRET fictício para permitir emissão de tokens em memória.
// 3) Usa Supertest para exercitar o app Express direto (sem subir servidor de verdade).
// 4) Para cada cenário, seguimos Arrange–Act–Assert, validando entrada, credenciais e resposta pública.

const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "unit-test-secret";

// Mock do cliente SQL para controlar o que a rota enxerga no banco
jest.mock("../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

// Mock do bcrypt para simular comparação de senha
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const app = require("../src/app");
const { sql } = require("../src/db/sql");
const bcrypt = require("bcrypt");

const createToken = (overrides = {}) =>
  jwt.sign(
    {
      sub: overrides.sub ?? 1,
      email: overrides.email ?? "unit@test.dev",
      nickname: overrides.nickname ?? "tester",
    },
    process.env.JWT_SECRET
  );

describe("POST /auth/login (testes de unidade)", () => {
  beforeEach(() => {
    // Garante estado limpo entre os testes
    sql.mockReset();
    sql.mockResolvedValue([]);
    bcrypt.compare.mockReset();
  });

  test("retorna 400 quando nickname ou password não são enviados", async () => {
    // Arrange: não precisamos preparar banco porque a validação falha antes

    // Act
    const response = await request(app).post("/auth/login").send({
      nickname: "",
      password: "",
    });

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION", message: "nickname e password são obrigatórios" },
    });
    expect(sql).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  test("retorna 401 quando o nickname existe mas a senha está incorreta", async () => {
    // Arrange
    const fakeUser = {
      id: 42,
      first_name: "Ada",
      last_name: "Lovelace",
      nickname: "ada",
      email: "ada@example.com",
      password_hash: "hashed",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    sql.mockResolvedValueOnce([fakeUser]);
    bcrypt.compare.mockResolvedValue(false); // senha errada

    // Act
    const response = await request(app).post("/auth/login").send({
      nickname: "Ada",
      password: "wrong-password",
    });

    // Assert
    expect(response.statusCode).toBe(401);
    expect(response.body).toMatchObject({
      error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos" },
    });
    expect(sql).toHaveBeenCalledTimes(1);
    expect(bcrypt.compare).toHaveBeenCalledWith("wrong-password", fakeUser.password_hash);
  });

  test("retorna token e dados públicos quando as credenciais estão corretas", async () => {
    // Arrange
    const fakeUser = {
      id: 7,
      first_name: "Grace",
      last_name: "Hopper",
      nickname: "grace",
      email: "grace@example.com",
      password_hash: "secret-hash",
      created_at: "2024-02-01T00:00:00Z",
      updated_at: "2024-02-01T00:00:00Z",
    };
    sql.mockResolvedValueOnce([fakeUser]);
    bcrypt.compare.mockResolvedValue(true);

    // Act
    const response = await request(app).post("/auth/login").send({
      nickname: "GRACE", // confirma normalização para minúsculas
      password: "super-secret",
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      user: {
        id: fakeUser.id,
        first_name: fakeUser.first_name,
        last_name: fakeUser.last_name,
        nickname: fakeUser.nickname,
        email: fakeUser.email,
      },
      token: expect.any(String),
    });
    expect(response.body.user).not.toHaveProperty("password_hash");

    // Verifica se o token realmente é assinado com o segredo configurado
    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe(fakeUser.id);
    expect(sql).toHaveBeenCalledTimes(1);
    expect(bcrypt.compare).toHaveBeenCalledWith("super-secret", fakeUser.password_hash);
  });
});

describe("GET /auth/me", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockResolvedValue([]);
  });

  test("retorna os dados do usuário autenticado", async () => {
    const token = createToken({ sub: 55, email: "me@example.com", nickname: "me" });
    const me = {
      id: 55,
      first_name: "Linus",
      last_name: "Torvalds",
      nickname: "linus",
      email: "linus@example.com",
      created_at: "2024-04-01T00:00:00Z",
      updated_at: "2024-04-01T00:00:00Z",
    };
    sql.mockResolvedValueOnce([me]);

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ user: me });
    expect(sql).toHaveBeenCalledTimes(1);
  });

  test("retorna 404 quando o usuário não existe mais", async () => {
    const token = createToken({ sub: 77 });
    sql.mockResolvedValueOnce([]);

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND", message: "Usuário não encontrado" },
    });
  });
});
