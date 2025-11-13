// Contexto deste arquivo:
// 1) Exercitamos GET /articles/search e GET /articles/:id/pdf via Supertest, diretamente no app Express.
// 2) Mockamos o cliente SQL com uma fila de resultados para controlar cada consulta em sequência.
// 3) Fazemos asserts em dois níveis: respostas HTTP e parâmetros enviados ao banco (campos, filtros, ordenação).
// 4) Comentamos cada passo (Arrange–Act–Assert) para manter o padrão pedagógico adotado nos demais testes.
const request = require("supertest");

jest.mock("../src/db/sql", () => {
  const queue = [];

  const sqlMock = jest.fn(() => {
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

describe("GET /articles/search", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna lista vazia quando o parâmetro q está vazio", async () => {
    const response = await request(app).get("/articles/search?q=");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ articles: [] });
    expect(sql).not.toHaveBeenCalled();
  });

  test("filtra por título por padrão e consolida autores", async () => {
    // Arrange: 1) consulta principal retorna um artigo; 2) consulta de autores devolve lista correspondente
    const articleRows = [
      {
        id: 1,
        title: "Artigo Alpha",
        abstract: "Resumo",
        start_page: 1,
        end_page: 10,
        created_at: "2024-01-01",
        edition_year: 2024,
        event_name: "Evento X",
      },
    ];
    const authorsRows = [{ article_id: 1, name: "Autor Um" }];
    sql.queueResult(articleRows);
    sql.queueResult(authorsRows);

    // Act
    const response = await request(app).get("/articles/search?q=Alpha");

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body.articles).toEqual([
      {
        id: 1,
        title: "Artigo Alpha",
        abstract: "Resumo",
        event_name: "Evento X",
        edition_year: 2024,
        start_page: 1,
        end_page: 10,
        created_at: "2024-01-01",
        authors: ["Autor Um"],
      },
    ]);

    // A primeira chamada do SQL usa ILIKE no título; conferimos o like montado
    expect(sql.mock.calls[0][1]).toMatch(/%Alpha%/);
  });

  test("filtra por autor quando field=author", async () => {
    const articleRows = [
      {
        id: 2,
        title: "Artigo Beta",
        abstract: "Resumo Beta",
        start_page: 5,
        end_page: 15,
        created_at: "2024-02-02",
        edition_year: 2023,
        event_name: "Evento Y",
      },
    ];
    const authorsRows = [{ article_id: 2, name: "Autor Dois" }];
    sql.queueResult(articleRows);
    sql.queueResult(authorsRows);

    const response = await request(app).get("/articles/search?field=author&q=Autor");

    expect(response.statusCode).toBe(200);
    expect(response.body.articles[0]).toMatchObject({
      id: 2,
      title: "Artigo Beta",
      authors: ["Autor Dois"],
    });
    expect(sql.mock.calls[0][1]).toMatch(/%Autor%/);
  });

  test("filtra por evento quando field=event", async () => {
    const articleRows = [
      {
        id: 3,
        title: "Artigo Gamma",
        abstract: "Resumo Gamma",
        start_page: 2,
        end_page: 8,
        created_at: "2024-03-03",
        edition_year: 2022,
        event_name: "Evento Z",
      },
    ];
    const authorsRows = [{ article_id: 3, name: "Autor Três" }];
    sql.queueResult(articleRows);
    sql.queueResult(authorsRows);

    const response = await request(app).get("/articles/search?field=event&q=Evento");

    expect(response.statusCode).toBe(200);
    expect(response.body.articles[0]).toMatchObject({
      id: 3,
      event_name: "Evento Z",
      authors: ["Autor Três"],
    });
    expect(sql.mock.calls[0][1]).toMatch(/%Evento%/);
  });

  test("retorna lista vazia quando nenhuma linha é encontrada", async () => {
    sql.queueResult([]); // primeira consulta já não encontra artigos

    const response = await request(app).get("/articles/search?q=Inexistente");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ articles: [] });
    expect(sql).toHaveBeenCalledTimes(1);
  });
});

describe("GET /articles/:id/pdf", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna 400 quando o ID não é inteiro", async () => {
    const response = await request(app).get("/articles/abc/pdf");

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION", message: "ID inválido" },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("retorna 404 quando não encontra PDF para o artigo", async () => {
    sql.queueResult([{ title: "Sem PDF", pdf_data: null }]);

    const response = await request(app).get("/articles/99/pdf");

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "PDF não encontrado" });
  });

  test("envia PDF com cabeçalhos corretos quando encontra o arquivo", async () => {
    const pdfBuffer = Buffer.from("conteudo-falso");
    sql.queueResult([{ title: "Artigo Download", pdf_data: pdfBuffer }]);

    const response = await request(app).get("/articles/5/pdf");

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toContain("Artigo Download");
    expect(response.body).toEqual(pdfBuffer);
  });
});
