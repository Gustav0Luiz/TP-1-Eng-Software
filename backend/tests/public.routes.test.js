// O que cobrimos aqui:
// 1) Exercitamos o router /public (eventos e edições) com Supertest, sem subir servidor real.
// 2) Montamos um mock de sql com fila para controlar exatamente cada consulta executada pelas rotas.
// 3) Simulamos respostas diferentes para testar slugs inválidos, fallback por slugify, edições inexistentes e casos felizes.
// 4) Cada teste segue Arrange–Act–Assert com comentários explícitos dos passos para facilitar o entendimento.

const request = require("supertest");

// Mock do cliente SQL com fila de respostas síncronas ao await
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

describe("GET /public/events/:slug", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna 400 quando o slug é inválido", async () => {
    const response = await request(app).get("/public/events/%20");

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: "Slug inválido" },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("retorna 404 quando não encontra evento nem por slugify", async () => {
    sql.queueResult([]); // SELECT ILIKE
    sql.queueResult([]); // SELECT all

    const response = await request(app).get("/public/events/inexistente");

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { message: "Evento não encontrado" },
    });
    expect(sql).toHaveBeenCalledTimes(2);
  });

  test("usa fallback por slug e retorna edições", async () => {
    const event = { id: 10, name: "Mega Evento", description: "Desc" };
    const editions = [{ id: 1, year: 2024, local: "SP" }];

    sql.queueResult([]);           // consulta exata falha
    sql.queueResult([event]);      // consulta por slugify encontra
    sql.queueResult(editions);     // consulta de edições

    const response = await request(app).get("/public/events/mega-evento");

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      event,
      editions,
    });
  });

  test("retorna evento quando encontra por nome direto", async () => {
    const event = { id: 20, name: "SBES", description: null };
    const editions = [
      { id: 3, year: 2023, local: "Recife" },
      { id: 4, year: 2022, local: "Florianópolis" },
    ];

    sql.queueResult([event]);  // SELECT direto (ILIKE) encontra
    sql.queueResult(editions); // edições

    const response = await request(app).get("/public/events/SBES");

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      event,
      editions,
    });
  });
});

describe("GET /public/editions/:slug/:year", () => {
  beforeEach(() => {
    sql.resetQueue();
  });

  test("retorna 400 quando slug ou ano são inválidos", async () => {
    const response = await request(app).get("/public/editions/%20/abcd");

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: "Parâmetros inválidos" },
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("retorna 404 quando não encontra o evento", async () => {
    sql.queueResult([]); // ILIKE
    sql.queueResult([]); // all events

    const response = await request(app).get("/public/editions/inexistente/2024");

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { message: "Evento não encontrado" },
    });
    expect(sql).toHaveBeenCalledTimes(2);
  });

  test("retorna 404 quando não encontra a edição requisitada", async () => {
    const event = { id: 30, name: "Evento", description: "Desc" };
    sql.queueResult([event]); // evento encontrado
    sql.queueResult([]);      // edição não encontrada

    const response = await request(app).get("/public/editions/evento/2024");

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { message: "Edição não encontrada" },
    });
  });

  test("retorna edição e artigos consolidados", async () => {
    const event = { id: 40, name: "Evento Científico", description: "Desc" };
    const editionRow = {
      id: 5,
      event_id: 40,
      year: 2024,
      local: "São Paulo",
      description: "Edição especial",
    };
    const articleRows = [
      {
        id: 100,
        title: "Artigo A",
        abstract: "Resumo A",
        start_page: 1,
        end_page: 5,
        created_at: "2024-01-01",
        edition_year: 2024,
        event_name: "Evento Científico",
      },
    ];
    const authorsRows = [{ article_id: 100, name: "Autor A" }];

    sql.queueResult([event]);       // evento
    sql.queueResult([editionRow]);  // edição
    sql.queueResult(articleRows);   // artigos
    sql.queueResult(authorsRows);   // autores (consolidateArticles)

    const response = await request(app).get("/public/editions/Evento%20Cientifico/2024");

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      edition: {
        event_name: event.name,
        year: editionRow.year,
        local: editionRow.local,
        description: editionRow.description,
      },
      articles: [
        expect.objectContaining({
          id: 100,
          title: "Artigo A",
          authors: ["Autor A"],
        }),
      ],
    });
  });
});
