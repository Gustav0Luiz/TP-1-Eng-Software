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
const { sendMail } = require("../src/lib/mailer");

const isTemplateLiteral = (arg) =>
  Array.isArray(arg) && Object.prototype.hasOwnProperty.call(arg, "raw");

const normalizeSql = (strings) =>
  strings.join(" ").replace(/\s+/g, " ").trim();

const matchSql = (...parts) => (sqlText) =>
  parts.every((part) => sqlText.includes(part));

const useSqlHandlers = (handlers) => {
  sql.mockImplementation((firstArg, ...values) => {
    if (isTemplateLiteral(firstArg)) {
      const sqlText = normalizeSql(firstArg);
      const handler = handlers.find(({ match }) =>
        typeof match === "function" ? match(sqlText) : sqlText.includes(match)
      );
      if (handler) {
        const result =
          typeof handler.result === "function"
            ? handler.result({ sqlText, values })
            : handler.result;
        return Promise.resolve(result);
      }
      return Promise.resolve([]);
    }
    return {};
  });
};

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
    sql.mockImplementation(() => Promise.resolve([]));
    sendMail.mockClear();
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

  test("recusa quando o token não é enviado", async () => {
    const response = await request(app)
      .post("/articles")
      .field("title", "Sem Token")
      .field("eventName", "Conf Teste")
      .field("year", "2024")
      .attach("pdf", Buffer.from("dados"), "file.pdf");

    expect(response.statusCode).toBe(401);
    expect(response.body).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  test("cria artigo completo, substitui autores e dispara notificações", async () => {
    const token = createToken({ sub: 7, email: "user@example.com" });

    useSqlHandlers([
      { match: matchSql("FROM events", "owner_id"), result: [{ id: 50, name: "Conf Teste", owner_id: 7 }] },
      {
        match: matchSql("FROM editions", "owner_id"),
        result: [{ id: 60, event_id: 50, year: 2030, owner_id: 7 }],
      },
      { match: matchSql("FROM articles", "edition_id"), result: [] },
      {
        match: "INSERT INTO articles",
        result: [
          { id: 321, title: "Artigo Completo", abstract: null, start_page: 10, end_page: 20, edition_id: 60 },
        ],
      },
      { match: "DELETE FROM article_authors", result: [] },
      { match: matchSql("FROM authors", "WHERE name"), result: [] },
      { match: "INSERT INTO authors", result: [{ id: 999, name: "Ada Lovelace" }] },
      { match: "INSERT INTO article_authors", result: [] },
      { match: "SELECT e.year", result: [{ year: 2030, event_name: "Conf Teste" }] },
      { match: "FROM subscriptions", result: [{ email: "ada@example.com", name: "Ada Lovelace" }] },
    ]);

    const response = await request(app)
      .post("/articles")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Artigo Completo")
      .field("eventName", "Conf Teste")
      .field("year", "2030")
      .field("startPage", "10")
      .field("endPage", "20")
      .field("authors", '["Ada Lovelace"]')
      .attach("pdf", Buffer.from("conteudo"), "artigo.pdf");

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ ok: true, id: 321 });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: "ada@example.com",
      subject: expect.stringContaining("Artigo Completo"),
    });
  });
});

describe("PUT/PATCH /articles/:id", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockImplementation(() => Promise.resolve([]));
  });

  const token = createToken({ sub: 7 });

  test("retorna 400 quando o ID é inválido", async () => {
    const response = await request(app)
      .patch("/articles/abc")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Novo título" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION" },
    });
  });

  test("retorna 404 quando o artigo não pertence ao usuário", async () => {
    sql.mockResolvedValueOnce([]);

    const response = await request(app)
      .patch("/articles/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Sem acesso" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
    expect(sql).toHaveBeenCalledTimes(1);
  });

  test("valida eventName/year quando enviados parcialmente", async () => {
    sql.mockResolvedValueOnce([{ id: 10 }]);

    const response = await request(app)
      .patch("/articles/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ year: 2025 });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION" },
    });
    expect(sql).toHaveBeenCalledTimes(1);
  });

  test("permite alterar a edição via eventName/year", async () => {
    useSqlHandlers([
      { match: matchSql("FROM articles a", "uploader_id"), result: [{ id: 10 }] },
      { match: matchSql("FROM events", "owner_id"), result: [{ id: 70, name: "Conf Nova", owner_id: 7 }] },
      { match: matchSql("FROM editions", "owner_id"), result: [{ id: 80, event_id: 70, year: 2035, owner_id: 7 }] },
      { match: "UPDATE articles", result: [{ id: 10 }] },
    ]);

    const response = await request(app)
      .patch("/articles/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventName: "Conf Nova", year: 2035, startPage: "5" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe("DELETE /articles/:id", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockImplementation(() => Promise.resolve([]));
  });

  const token = createToken();

  test("recusa ID não numérico", async () => {
    const response = await request(app)
      .delete("/articles/xyz")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
  });

  test("retorna 404 quando o artigo não existe", async () => {
    sql.mockResolvedValueOnce([]);

    const response = await request(app)
      .delete("/articles/5")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
  });

  test("remove artigo e autores associados", async () => {
    sql
      .mockResolvedValueOnce([{ id: 5 }]) // existe
      .mockResolvedValueOnce([]) // delete autores
      .mockResolvedValueOnce([]); // delete artigo

    const response = await request(app)
      .delete("/articles/5")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(sql).toHaveBeenCalledTimes(3);
  });
});

describe("GET /articles/:id/pdf", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockImplementation(() => Promise.resolve([]));
  });

  const token = createToken();

  test("recusa ID inválido", async () => {
    const response = await request(app)
      .get("/articles/abc/pdf")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
  });

  test("retorna 404 quando o PDF não está armazenado", async () => {
    sql.mockResolvedValueOnce([{ id: 1, pdf_data: null }]);

    const response = await request(app)
      .get("/articles/1/pdf")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
  });

  test("força download do PDF quando encontrado", async () => {
    sql.mockResolvedValueOnce([{ pdf_data: Buffer.from("PDF"), title: "Meu Artigo" }]);

    const response = await request(app)
      .get("/articles/1/pdf")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toContain("Meu Artigo");
    expect(response.body.toString()).toBe("PDF");
  });
});

describe("GET /articles/search", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockImplementation(() => Promise.resolve([]));
  });

  const token = createToken();

  test("retorna lista vazia quando q não é informado", async () => {
    const response = await request(app)
      .get("/articles/search")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ articles: [] });
    expect(sql).not.toHaveBeenCalled();
  });

  test("busca por evento e consolida autores", async () => {
    useSqlHandlers([
      {
        match: matchSql("FROM articles a", "ev.name"),
        result: [
          {
            id: 1,
            title: "Artigo Evento",
            abstract: "Resumo",
            start_page: 1,
            end_page: 5,
            created_at: "2024-01-01",
            edition_year: 2030,
            event_name: "Conf",
          },
        ],
      },
      { match: matchSql("FROM article_authors", "JOIN authors"), result: [{ article_id: 1, name: "Autor 1" }] },
    ]);

    const response = await request(app)
      .get("/articles/search?field=event&q=Conf")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.articles).toHaveLength(1);
    expect(response.body.articles[0]).toMatchObject({
      title: "Artigo Evento",
      authors: ["Autor 1"],
    });
  });
});

describe("GET /articles/mine", () => {
  beforeEach(() => {
    sql.mockReset();
    sql.mockImplementation(() => Promise.resolve([]));
  });

  const token = createToken({ sub: 12 });

  test("lista artigos do usuário autenticado", async () => {
    useSqlHandlers([
      {
        match: matchSql("FROM articles a", "JOIN editions", "WHERE a.uploader_id"),
        result: [
          {
            id: 55,
            title: "Meu Artigo",
            abstract: null,
            created_at: "2024-02-01",
            start_page: null,
            end_page: null,
            edition_year: 2024,
            event_name: "Conf Pessoal",
          },
        ],
      },
      { match: matchSql("FROM article_authors", "JOIN authors"), result: [{ article_id: 55, name: "Autor X" }] },
    ]);

    const response = await request(app)
      .get("/articles/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.articles[0]).toMatchObject({
      id: 55,
      authors: ["Autor X"],
    });
  });
});
