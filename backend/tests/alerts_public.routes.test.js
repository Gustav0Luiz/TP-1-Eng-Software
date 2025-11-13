// Guia deste arquivo:
// 1) Exercitamos POST /public/alerts/subscribe via Supertest sem subir servidor real.
// 2) Mockamos o banco (sql) e o serviço de e-mail para isolar o comportamento da rota.
// 3) Em cada cenário seguimos o padrão Arrange–Act–Assert com comentários explicando até passos simples.
// 4) Cobrimos validações, duplicidade, sucesso com e sem e-mail para garantir o máximo de cobertura unitária.

const request = require("supertest");

jest.mock("../src/db/sql", () => {
  const sqlMock = jest.fn(() => Promise.resolve([]));
  return { sql: sqlMock };
});

jest.mock("../src/lib/mailer", () => ({
  sendMail: jest.fn(),
}));

const app = require("../src/app");
const { sql } = require("../src/db/sql");
const { sendMail } = require("../src/lib/mailer");

describe("POST /public/alerts/subscribe", () => {
  beforeEach(() => {
    // Reseta mocks e define retornos padrão seguros
    sql.mockReset();
    sql.mockImplementation(() => Promise.resolve([]));
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);
  });

  test("retorna 400 quando name ou email não são enviados", async () => {
    // Arrange: payload sem e-mail para forçar a validação
    const payload = { name: "Pesquisador" };

    // Act
    const response = await request(app)
      .post("/public/alerts/subscribe")
      .send(payload);

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION", message: expect.stringContaining("'name' e 'email'") },
    });
    expect(sql).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  test("retorna 400 quando e-mail é inválido", async () => {
    const response = await request(app)
      .post("/public/alerts/subscribe")
      .send({ name: "Teste", email: "sem-arroba" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION", message: "E-mail inválido." },
    });
    expect(sql).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  test("retorna 200 com duplicated quando inscrição já existe", async () => {
    // Arrange: primeira consulta encontra registro existente
    sql.mockResolvedValueOnce([{ id: 1 }]);

    const response = await request(app)
      .post("/public/alerts/subscribe")
      .send({ name: "Existing", email: "existente@example.com" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      duplicated: true,
      message: "Você já está inscrito para este nome.",
    });
    expect(sql).toHaveBeenCalledTimes(1); // apenas o SELECT
    expect(sendMail).not.toHaveBeenCalled(); // nada de e-mail para duplicados
  });

  test("retorna 201 mesmo se o envio de e-mail falhar", async () => {
    // Arrange
    const inserted = {
      id: 77,
      name: "Novo Nome",
      email: "novo@example.com",
      is_enabled: true,
      created_at: "2024-03-10T00:00:00Z",
    };
    sql
      .mockResolvedValueOnce([])          // SELECT não encontra duplicados
      .mockResolvedValueOnce([inserted]); // INSERT retorna assinatura
    sendMail.mockRejectedValueOnce(new Error("SMTP caiu"));

    const response = await request(app)
      .post("/public/alerts/subscribe")
      .send({ name: " Novo Nome ", email: "NOVO@EXAMPLE.COM" });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      subscription: inserted,
      mail: { sent: false, error: expect.stringContaining("SMTP") },
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  test("cria assinatura e envia e-mail quando tudo está correto", async () => {
    const inserted = {
      id: 88,
      name: "Pesquisadora",
      email: "pesquisadora@example.com",
      is_enabled: true,
      created_at: "2024-04-01T00:00:00Z",
    };
    sql
      .mockResolvedValueOnce([])          // SELECT
      .mockResolvedValueOnce([inserted]); // INSERT
    sendMail.mockResolvedValueOnce({ messageId: "123" });

    const response = await request(app)
      .post("/public/alerts/subscribe")
      .send({ name: "Pesquisadora", email: "pesquisadora@example.com" });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      subscription: inserted,
      mail: { sent: true },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: inserted.email,
        subject: expect.stringContaining("Confirmação"),
      })
    );
  });
});
