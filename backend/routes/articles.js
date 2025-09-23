/**
 * src/routes/articles.js
 *
 * Rotas relacionadas a ARTIGOS.
 *
 * IMPORTANTE:
 *  - No app.js você monta: app.use("/articles", auth, articlesRouter)
 *    => Isto garante que TODAS as rotas aqui já chegam autenticadas
 *       (req.user disponível) e não precisamos importar o middleware de auth.
 *
 * O que este router expõe:
 *   1) POST   /articles             → Cadastro manual de artigo (com PDF)
 *   2) PUT    /articles/:id         → Edição de metadados e/ou PDF
 *   3) DELETE /articles/:id         → Remoção de artigo
 *   4) GET    /articles/:id/pdf     → Download/stream do PDF do banco
 *   5) GET    /articles/search      → Busca (title|author|event + substring)
 *   6) POST   /articles/bulk-bibtex → Importação em massa (BibTeX + ZIP)
 *
 * Stack:
 *   - Express 5 (Router)
 *   - postgres (helper `sql` com tagged template)
 *   - multer (memoryStorage) → recebemos PDF em memória para gravar em bytea
 *   - @citation-js/core + @citation-js/plugin-bibtex → parse BibTeX → CSL-JSON
 *   - jszip → leitura de ZIP em memória (PDFs por <citationKey>.pdf)
 */

const { Router } = require("express");
const multer = require("multer");
const JSZip = require("jszip");

// Lib p/ parse BibTeX em formato padronizado (CSL-JSON)
const Cite = require("@citation-js/core");
require("@citation-js/plugin-bibtex");

// Helper de DB (Postgres, lib `postgres`)
const { sql } = require("../src/db/sql");

const router = Router();

/* ============================================================================
   CONFIGURAÇÃO DE UPLOAD (multer, em memória)
   - Usamos memoryStorage porque salvaremos o PDF em coluna BYTEA (Postgres).
   - Definimos dois "uploaders": um para upload único e outro para bulk.
============================================================================ */
const uploadOne = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB por arquivo (ajuste se necessário)
});

const uploadBulk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

/* ============================================================================
   HELPERS DE BANCO
============================================================================ */

/**
 * Lê uma edição pelo ID. Lança erro "VALIDATION" se não existir.
 * Usado para garantir integridade no cadastro/edição de artigos.
 */
async function getEditionOrThrow(editionId) {
  const rows = await sql/*sql*/`
    SELECT id, event_id, year, description
      FROM editions
     WHERE id = ${editionId}
     LIMIT 1
  `;
  const ed = rows[0];
  if (!ed) {
    const e = new Error("Edição (edition_id) não encontrada");
    e.code = "VALIDATION";
    throw e;
  }
  return ed;
}

/**
 * Faz "upsert" de autor por nome (na prática: SELECT; se não houver, INSERT).
 * Retorna { id, name } do autor.
 */
async function upsertAuthorByName(name) {
  const rows = await sql/*sql*/`
    SELECT id, name
      FROM authors
     WHERE name = ${name}
     LIMIT 1
  `;
  if (rows[0]) return rows[0];

  const inserted = await sql/*sql*/`
    INSERT INTO authors (name)
    VALUES (${name})
    RETURNING id, name
  `;
  return inserted[0];
}

/**
 * Substitui os autores de um artigo:
 *   - Apaga vínculos antigos em `article_authors`;
 *   - Para cada nome, garante autor em `authors` e cria vínculo.
 * Observação: se quiser manter a ordem dos autores, adicione uma coluna "ord"
 * em `article_authors` e incremente aqui.
 */
async function replaceArticleAuthors(articleId, authorNames) {
  await sql/*sql*/`DELETE FROM article_authors WHERE article_id = ${articleId}`;

  for (const raw of authorNames || []) {
    const name = String(raw || "").trim();
    if (!name) continue;

    const a = await upsertAuthorByName(name);
    await sql/*sql*/`
      INSERT INTO article_authors (article_id, author_id)
      VALUES (${articleId}, ${a.id})
    `;
  }
}

/**
 * Insere artigo (com PDF e autores) e retorna { id }.
 * - pdfBuffer → armazenado em `articles.pdf_data` (bytea).
 * - editionId deve existir (garantido pelo caller).
 */
async function insertArticle({ title, abstract, startPage, endPage, pdfBuffer, editionId, uploaderId, authors }) {
  const inserted = await sql/*sql*/`
    INSERT INTO articles (title, abstract, start_page, end_page, pdf_data, edition_id, uploader_id)
    VALUES (${title}, ${abstract ?? null}, ${startPage ?? null}, ${endPage ?? null}, ${pdfBuffer}, ${editionId}, ${uploaderId ?? null})
    RETURNING id
  `;
  const created = inserted[0];

  if (authors?.length) {
    await replaceArticleAuthors(created.id, authors);
  }
  return created; // { id }
}

/* ============================================================================
   HELPERS DE PARSING (BibTeX via citation-js)
============================================================================ */

/**
 * Extrai nomes de autores a partir de um item CSL-JSON.
 * A biblioteca já normaliza autores nos campos `given`, `family` ou `literal`.
 */
function authorsFromCiteItem(item) {
  const list = item.author || [];
  const names = [];
  for (const a of list) {
    const given = (a.given || "").trim();
    const family = (a.family || "").trim();
    const literal = (a.literal || "").trim(); // fallback caso venha em formato livre
    const full = literal || [given, family].filter(Boolean).join(" ").trim();
    if (full) names.push(full);
  }
  return names;
}

/**
 * Extrai ano de publicação a partir de um item CSL-JSON.
 * A estrutura `issued["date-parts"]` é a mais comum fornecida pelo citation-js.
 */
function yearFromCiteItem(item) {
  const dp = item?.issued?.["date-parts"];
  if (Array.isArray(dp) && Array.isArray(dp[0]) && Number.isInteger(dp[0][0])) {
    return dp[0][0];
  }
  return null;
}

/**
 * Garante que um texto seja uma string (ou null) com trimming.
 */
function asStringOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

/* ============================================================================
   1) POST /articles  → Cadastro manual com PDF
   - Body (multipart/form-data):
 *     - title            (obrigatório)
 *     - authors          (CSV "A;B;C" OU JSON array ["A","B","C"])
 *     - edition_id       (obrigatório, inteiro)
 *     - start_page       (opcional, inteiro)
 *     - end_page         (opcional, inteiro)
 *     - abstract         (opcional, texto)
 *     - pdf              (arquivo, obrigatório)
   - Autorização: já garantida por app.use("/articles", auth, ...)
============================================================================ */
router.post("/", uploadOne.single("pdf"), async (req, res, next) => {
  try {
    const { title, authors, edition_id, start_page, end_page, abstract } = req.body;

    // 1) valida obrigatórios
    if (!title || !edition_id || !req.file) {
      return res.status(400).json({
        error: { code: "VALIDATION", message: "Campos obrigatórios: title, edition_id e pdf" }
      });
    }

    const editionId = parseInt(edition_id, 10);
    if (!Number.isInteger(editionId)) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "edition_id inválido" } });
    }

    // 2) garante que a edição existe
    await getEditionOrThrow(editionId);

    // 3) normaliza páginas (opcionais)
    const startPage = Number.isFinite(parseInt(start_page, 10)) ? parseInt(start_page, 10) : null;
    const endPage   = Number.isFinite(parseInt(end_page, 10))   ? parseInt(end_page, 10)   : null;

    // 4) normaliza autores (CSV "A;B;C" ou JSON array)
    let authorNames = [];
    if (Array.isArray(authors)) {
      authorNames = authors;
    } else if (typeof authors === "string") {
      try {
        const asJson = JSON.parse(authors);
        authorNames = Array.isArray(asJson) ? asJson : authors.split(/[,;]\s*/g);
      } catch {
        authorNames = authors.split(/[,;]\s*/g);
      }
    }

    // 5) insere artigo com PDF em bytea
    const created = await insertArticle({
      title: title.trim(),
      abstract: asStringOrNull(abstract),
      startPage,
      endPage,
      pdfBuffer: req.file.buffer,
      editionId,
      uploaderId: req.user?.id ?? null, // vem do middleware auth
      authors: authorNames
    });

    return res.status(201).json({ ok: true, id: created.id });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================================
   2) PUT /articles/:id  → Edição de metadados e/ou PDF
   - Body (multipart/form-data) com campos opcionais:
 *     - title, authors, edition_id, start_page, end_page, abstract, pdf(file)
============================================================================ */
router.put("/:id", uploadOne.single("pdf"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "ID inválido" } });
    }

    // Verifica se artigo existe
    const current = await sql/*sql*/`SELECT id FROM articles WHERE id = ${id} LIMIT 1`;
    if (!current[0]) return res.status(404).json({ error: "Artigo não encontrado" });

    const { title, authors, edition_id, start_page, end_page, abstract } = req.body;

    // Construímos a lista de updates dinamicamente
    const updates = [];

    if (title !== undefined)      updates.push(sql/*sql*/`title = ${asStringOrNull(title)}`);
    if (abstract !== undefined)   updates.push(sql/*sql*/`abstract = ${asStringOrNull(abstract)}`);
    if (start_page !== undefined) updates.push(sql/*sql*/`start_page = ${Number.isFinite(parseInt(start_page,10)) ? parseInt(start_page,10) : null}`);
    if (end_page !== undefined)   updates.push(sql/*sql*/`end_page = ${Number.isFinite(parseInt(end_page,10)) ? parseInt(end_page,10) : null}`);

    if (edition_id !== undefined) {
      const editionId = parseInt(edition_id, 10);
      if (!Number.isInteger(editionId)) {
        return res.status(400).json({ error: { code: "VALIDATION", message: "edition_id inválido" } });
      }
      await getEditionOrThrow(editionId);
      updates.push(sql/*sql*/`edition_id = ${editionId}`);
    }

    if (req.file) {
      updates.push(sql/*sql*/`pdf_data = ${req.file.buffer}`);
    }

    if (updates.length) {
      await sql/*sql*/`UPDATE articles SET ${sql.join(updates, sql`, `)} WHERE id = ${id}`;
    }

    // Se autores vieram, substitui vínculos
    if (authors !== undefined) {
      let authorNames = [];
      if (Array.isArray(authors)) authorNames = authors;
      else if (typeof authors === "string") {
        try {
          const asJson = JSON.parse(authors);
          authorNames = Array.isArray(asJson) ? asJson : authors.split(/[,;]\s*/g);
        } catch {
          authorNames = authors.split(/[,;]\s*/g);
        }
      }
      await replaceArticleAuthors(id, authorNames);
    }

    return res.json({ ok: true });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================================
   3) DELETE /articles/:id  → Remoção
   - Remove vínculos em article_authors e depois o artigo.
============================================================================ */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "ID inválido" } });
    }

    const exists = await sql/*sql*/`SELECT id FROM articles WHERE id = ${id} LIMIT 1`;
    if (!exists[0]) return res.status(404).json({ error: "Artigo não encontrado" });

    await sql/*sql*/`DELETE FROM article_authors WHERE article_id = ${id}`;
    await sql/*sql*/`DELETE FROM articles WHERE id = ${id}`;

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ============================================================================
   4) GET /articles/:id/pdf  → Download/stream do PDF
   - Busca o `pdf_data` (bytea) e envia com content-type "application/pdf".
============================================================================ */
router.get("/:id/pdf", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "ID inválido" } });
    }

    const rows = await sql/*sql*/`SELECT pdf_data FROM articles WHERE id = ${id} LIMIT 1`;
    if (!rows[0]?.pdf_data) return res.status(404).json({ error: "PDF não encontrado" });

    res.setHeader("Content-Type", "application/pdf");
    // Buffer já está em formato adequado para envio:
    res.send(Buffer.from(rows[0].pdf_data));
  } catch (err) { next(err); }
});

/* ============================================================================
   5) GET /articles/search?field=title|author|event&q=substr
   - Busca substring (`ILIKE`) por campo escolhido.
   - Retorna: título, autores, evento (nome/sigla), ano (edition.year), páginas, id.
============================================================================ */
router.get("/search", async (req, res, next) => {
  try {
    const field = String(req.query.field || "title").toLowerCase();
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ articles: [] });

    const like = `%${q}%`;
    let rows = [];

    if (field === "author") {
      rows = await sql/*sql*/`
        SELECT a.id, a.title, a.abstract, a.start_page, a.end_page,
               e.year AS edition_year, ev.name AS event_name
          FROM articles a
          JOIN editions e ON e.id = a.edition_id
          JOIN events   ev ON ev.id = e.event_id
          JOIN article_authors aa ON aa.article_id = a.id
          JOIN authors au ON au.id = aa.author_id
         WHERE au.name ILIKE ${like}
         GROUP BY a.id, e.year, ev.name
         ORDER BY e.year DESC, a.id DESC
      `;
    } else if (field === "event") {
      rows = await sql/*sql*/`
        SELECT a.id, a.title, a.abstract, a.start_page, a.end_page,
               e.year AS edition_year, ev.name AS event_name
          FROM articles a
          JOIN editions e ON e.id = a.edition_id
          JOIN events   ev ON ev.id = e.event_id
         WHERE ev.name ILIKE ${like}
         ORDER BY e.year DESC, a.id DESC
      `;
    } else {
      rows = await sql/*sql*/`
        SELECT a.id, a.title, a.abstract, a.start_page, a.end_page,
               e.year AS edition_year, ev.name AS event_name
          FROM articles a
          JOIN editions e ON e.id = a.edition_id
          JOIN events   ev ON ev.id = e.event_id
         WHERE a.title ILIKE ${like}
         ORDER BY e.year DESC, a.id DESC
      `;
    }

    if (!rows.length) return res.json({ articles: [] });

    const ids = rows.map(r => r.id);
    const authors = await sql/*sql*/`
      SELECT aa.article_id, au.name
        FROM article_authors aa
        JOIN authors au ON au.id = aa.author_id
       WHERE aa.article_id IN ${sql(ids)}
       ORDER BY aa.article_id, au.name
    `;

    const byArticle = new Map();
    for (const r of rows) {
      byArticle.set(r.id, {
        id: r.id,
        title: r.title,
        abstract: r.abstract,
        event: { name: r.event_name },
        edition_year: r.edition_year,
        start_page: r.start_page,
        end_page: r.end_page,
        authors: []
      });
    }
    for (const a of authors) {
      byArticle.get(a.article_id)?.authors.push(a.name);
    }

    return res.json({ articles: Array.from(byArticle.values()) });
  } catch (err) { next(err); }
});

/* ============================================================================
   6) POST /articles/bulk-bibtex
   - Importa artigos em massa a partir de:
 *     - "bibtex": arquivo .bib (metadados)
 *     - "pdfs":   arquivo .zip (PDFs nomeados por <citationKey>.pdf)
 *   - Também exigimos "edition_id" no body para amarrar todos os artigos
 *     a uma edição específica (os itens do .bib devem ter "year" == edição.year).
 *
 * Regras de pulo (skipped):
 *   - Falta de campos obrigatórios no item (title, author, year)
 *   - "year" do item diferente do ano da edição
 *   - PDF correspondente não encontrado no ZIP
 *
 * Resposta:
 *   { ok, createdCount, skippedCount, created: [{key,id,title}], skipped: [{key,reason}] }
============================================================================ */
router.post(
  "/bulk-bibtex",
  uploadBulk.fields([
    { name: "bibtex", maxCount: 1 },
    { name: "pdfs",   maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      // 1) valida edition_id
      const editionId = parseInt(req.body?.edition_id, 10);
      if (!Number.isInteger(editionId)) {
        return res.status(400).json({
          error: { code: "VALIDATION", message: "edition_id é obrigatório e deve ser inteiro" },
        });
      }
      const edition = await getEditionOrThrow(editionId);

      // 2) valida presença dos arquivos
      const bibFile = req.files?.bibtex?.[0];
      const zipFile = req.files?.pdfs?.[0];
      if (!bibFile || !zipFile) {
        return res.status(400).json({
          error: { code: "VALIDATION", message: "Envie os dois arquivos: 'bibtex' (.bib) e 'pdfs' (.zip)" },
        });
      }

      // 3) carrega o ZIP em memória
      const zip = await JSZip.loadAsync(zipFile.buffer);

      // 4) parse do BibTeX com citation-js → `cite.data` (CSL-JSON)
      const bibStr = bibFile.buffer.toString("utf-8");
      const cite = new Cite(bibStr);
      const items = cite.data || [];

      // 5) listas de resultado
      const created = [];
      const skipped = [];

      // 6) percorrer cada item do .bib
      for (const item of items) {
        const key = (item.id || "(sem-chave)").trim();

        // --- validações de campos obrigatórios ---
        const title = asStringOrNull(item.title);
        if (!title) {
          skipped.push({ key, reason: "Campo obrigatório ausente: title" });
          continue;
        }

        const authorNames = authorsFromCiteItem(item);
        if (!authorNames.length) {
          skipped.push({ key, reason: "Campo obrigatório ausente: author(s)" });
          continue;
        }

        const year = yearFromCiteItem(item);
        if (!Number.isInteger(year)) {
          skipped.push({ key, reason: "Campo obrigatório ausente ou inválido: year" });
          continue;
        }

        if (year !== edition.year) {
          skipped.push({ key, reason: `Year (${year}) não coincide com o year da edição (${edition.year})` });
          continue;
        }

        // --- PDF: procuramos por <key>.pdf em QUALQUER subpasta do zip (case-insensitive)
        const pattern = new RegExp(`(^|/)${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.pdf$`, "i");
        const files = zip.file(pattern);
        if (!files || files.length === 0) {
          skipped.push({ key, reason: `PDF "${key}.pdf" não encontrado no ZIP` });
          continue;
        }
        const pdfBuffer = await files[0].async("nodebuffer");

        // --- campos opcionais ---
        const abstract = asStringOrNull(item.abstract);

        // --- páginas (se existirem no .bib: field "page" ou "pages")
        //     Obs.: citation-js usa "page" (singular) em CSL; muitos .bib usam "pages".
        //     Tentamos ambos.
        let startPage = null, endPage = null;
        const pageField = asStringOrNull(item.page) || asStringOrNull(item.pages);
        if (pageField) {
          const m = pageField.match(/(\d+)\s*[-–]\s*(\d+)/);
          if (m) { startPage = parseInt(m[1], 10); endPage = parseInt(m[2], 10); }
        }

        // --- inserção no banco
        try {
          const ins = await insertArticle({
            title,
            abstract,
            startPage,
            endPage,
            pdfBuffer,
            editionId: edition.id,
            uploaderId: req.user?.id,
            authors: authorNames,
          });
          created.push({ key, id: ins.id, title });
        } catch (e) {
          skipped.push({ key, reason: e?.code ? `Erro SQL (${e.code})` : (e?.message || "Erro ao salvar artigo") });
        }
      }

      // 7) resposta final
      return res.status(201).json({
        ok: true,
        createdCount: created.length,
        skippedCount: skipped.length,
        created,
        skipped,
      });
    } catch (err) {
      if (err.code === "VALIDATION") {
        return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
      }
      next(err);
    }
  }
);


// ---------------------------------------------------------------------------
// GET /articles/mine  → lista apenas os artigos do usuário autenticado
// Requer JWT (já está protegido pois o router é montado com `auth` no app.js).
router.get("/mine", async (req, res, next) => {
  try {
    const rows = await sql/*sql*/`
      SELECT a.id, a.title, a.abstract, a.created_at
      FROM articles a
      WHERE a.uploader_id = ${req.user.id}
      ORDER BY a.created_at DESC
    `;
    return res.json({ articles: rows });
  } catch (err) {
    next(err);
  }
});


/* ============================================================================
   Exporta o Router para ser montado no app.js:
   app.use("/articles", auth, articlesRouter);
============================================================================ */
module.exports = router;
