/**
 * src/routes/articles.js
 *
 * Rotas relacionadas a ARTIGOS.
 * (Inclui PUT/PATCH para editar artigo; aceita eventName+year com upsert de edição)
 */
const { sendMail } = require("../src/lib/mailer");
const { Router } = require("express");
const multer = require("multer");
const JSZip = require("jszip");

const { Cite } = require("@citation-js/core");
require("@citation-js/plugin-bibtex");

const { sql } = require("../src/db/sql");

const router = Router();

/* ============================================================================
   CONFIGURAÇÃO DE UPLOAD
============================================================================ */
const uploadOne = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

const uploadBulk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

/* ============================================================================
   HELPERS DE BANCO
============================================================================ */

/**
 * Faz "upsert" de autor por nome (SELECT; se não houver, INSERT).
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
 * Faz "upsert" de evento (por nome) e edição (por ano) ESCOPADOS ao owner.
 * Sempre usa/define owner_id = userId.
 */
async function upsertEditionByEventNameAndYearForUser(eventName, year, userId) {
  if (!userId) {
    const e = new Error("Usuário não autenticado");
    e.code = "VALIDATION";
    throw e;
  }

  // 1) Evento do usuário (mesmo nome, mesmo owner)
  const eventRows = await sql/*sql*/`
    SELECT id, name, owner_id
      FROM events
     WHERE owner_id = ${userId} AND name ILIKE ${eventName}
     LIMIT 1
  `;
  let event = eventRows[0];

  if (!event) {
    const insertedEvent = await sql/*sql*/`
      INSERT INTO events (name, owner_id)
      VALUES (${eventName}, ${userId})
      RETURNING id, name, owner_id
    `;
    event = insertedEvent[0];
  }
  const eventId = event.id;

  // 2) Edição do usuário (mesmo evento, mesmo ano, mesmo owner)
  const editionRows = await sql/*sql*/`
    SELECT id, event_id, year, owner_id
      FROM editions
     WHERE event_id = ${eventId} AND year = ${year} AND owner_id = ${userId}
     LIMIT 1
  `;
  if (editionRows[0]) return editionRows[0];

  const insertedEdition = await sql/*sql*/`
    INSERT INTO editions (event_id, year, owner_id)
    VALUES (${eventId}, ${year}, ${userId})
    RETURNING id, event_id, year, owner_id
  `;
  return insertedEdition[0];
}


/**
 * Lê uma edição pelo ID. Lança erro "VALIDATION" se não existir.
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
 * Verifica se já existe um artigo com o mesmo título na mesma edição.
 */
async function checkDuplicateArticle(title, editionId) {
  const rows = await sql/*sql*/`
    SELECT id
      FROM articles
     WHERE title = ${title} AND edition_id = ${editionId}
     LIMIT 1
  `;
  if (rows[0]) {
    const e = new Error(`Artigo com título '${title}' já existe nesta edição.`);
    e.code = "DUPLICATE_ARTICLE";
    throw e;
  }
}

/**
 * Substitui os autores de um artigo.
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




// --- HTML helper (no mesmo arquivo/escopo) ---
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/**
 * Envia e-mail para assinantes cujo `name` (case-insensitive, match exato)
 * aparece na lista de autores do artigo recém-criado.
 */
async function notifySubscribersForNewArticle({
  title,
  authors,
  eventName,
  year,
  articleId,
  startPage,
  endPage
}) {
  try {
    // Helpers locais
    const toArray = (x) => Array.isArray(x) ? x : (x ? [x] : []);
    const normalizeName = (s) =>
      String(s ?? "")
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .trim();

    // Garante array e normaliza
    const authorList = toArray(authors).map(normalizeName).filter(Boolean);
    if (!authorList.length) return;

    // nomes lower para comparação exata porém case-insensitive
    const lowers = authorList.map((n) => n.toLowerCase());

    // ✅ FORMA ALTERNATIVA (sem ANY/array): expande como IN ($1,$2,...)
    const subs = await sql/*sql*/`
      SELECT DISTINCT s.email, s.name
      FROM subscriptions s
      WHERE s.is_enabled = TRUE
        AND lower(s.name) IN ${sql(lowers)}
    `;

    if (!subs.length) return;

    // Assunto e corpos
    const subject = `🔔 NOVO ARTIGO: "${title}" - ${eventName} ${year}`;

    const makeText = (subName) =>
      [
        `Prezado(a) ${subName},`,
        "",
        "A Vlib detectou o cadastro de um novo artigo em nosso catálogo que lista o seu nome (" +
          subName +
          ") na autoria.",
        "",
        "Detalhes do Artigo:",
        "-------------------------------------------",
        `Título: ${title}`,
        `Autores: ${authorList.join(", ")}`,
        `Evento: ${eventName} (${year})`,
        `Páginas: ${startPage ?? "—"}–${endPage ?? "—"}`,
        "-------------------------------------------",
        "",
        "Recomendamos que você acesse a biblioteca para mais detalhes.",
        "",
        "Para cancelar futuros alertas, responda a este e-mail solicitando a remoção.",
        "",
        "— Equipe Vlib"
      ].join("\n");

    const makeHtml = (subName) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #17a2b8; color: white; padding: 15px; text-align: center;">
          <h3 style="margin: 0; font-size: 20px;">🚨 Novo Artigo Detectado em Seu Nome</h3>
        </div>
        <div style="padding: 25px;">
          <p>Prezado(a) <strong>${escapeHtml(subName)}</strong>,</p>
          <p>Detectamos o cadastro de um novo artigo no catálogo da Vlib que lista seu nome na autoria.</p>

          <div style="margin: 20px 0; border: 1px solid #ced4da; border-radius: 5px; overflow: hidden;">
            <div style="background-color: #f8f9fa; padding: 10px; font-weight: bold; color: #007bff;">
              ${escapeHtml(title)}
            </div>
            <ul style="list-style: none; padding: 15px; margin: 0;">
              <li style="margin-bottom: 5px;"><strong>Autores:</strong> ${escapeHtml(authorList.join(", "))}</li>
              <li style="margin-bottom: 5px;"><strong>Evento/Edição:</strong> ${escapeHtml(eventName)} (${year})</li>
              <li><strong>Páginas:</strong> ${startPage ?? "—"}–${endPage ?? "—"}</li>
            </ul>
          </div>

          <p>Acesse a plataforma para visualizar e baixar o artigo.</p>
        </div>
        <div style="background-color: #f1f1f1; color: #6c757d; padding: 15px; font-size: 12px; text-align: center;">
          <p style="margin: 0;">Este e-mail é um serviço de monitoramento. Para cancelar os alertas, responda solicitando a remoção do seu endereço.</p>
        </div>
      </div>
    `;

    // Envia um e-mail por inscrito
    for (const s of subs) {
      try {
        await sendMail({
          to: s.email,
          subject,
          text: makeText(s.name),
          html: makeHtml(s.name)
        });
      } catch (e) {
        console.error(
          "Erro ao enviar e-mail p/ subscriber:",
          s?.email,
          e?.message || e
        );
      }
    }
  } catch (err) {
    console.error(
      "notifySubscribersForNewArticle error:",
      err?.message || err
    );
  }
}


/**
 * Insere artigo (com PDF e autores) E RETORNA TODOS OS DADOS.
 */
async function insertArticle({ title, abstract, startPage, endPage, pdfBuffer, editionId, uploaderId, authors }) {
  // 1. Insere e retorna os dados básicos (incluindo o ID)
  const inserted = await sql/*sql*/`
    INSERT INTO articles (title, abstract, start_page, end_page, pdf_data, edition_id, uploader_id)
    VALUES (${title}, ${abstract ?? null}, ${startPage ?? null}, ${endPage ?? null}, ${pdfBuffer}, ${editionId}, ${uploaderId ?? null})
    RETURNING id, title, abstract, start_page, end_page, edition_id
  `;
  const created = inserted[0];

  if (authors?.length) {
    await replaceArticleAuthors(created.id, authors);
  }

  // 2. Obtém EventName e Year para a notificação
  const [editionData] = await sql/*sql*/`
      SELECT e.year, ev.name AS event_name
      FROM editions e
      JOIN events ev ON ev.id = e.event_id
      WHERE e.id = ${editionId}
      LIMIT 1
  `;
  
  if (editionData) {
      // Retorna o objeto completo do artigo + metadados de edição/evento
      return { 
          ...created, 
          event_name: editionData.event_name, 
          year: editionData.year 
      }; 
  }

  return created; // Retorna o que tem, mesmo se falhar o JOIN
}

/* ============================================================================
   HELPERS DE CONSOLIDAÇÃO DE ARTIGOS E AUTORES (Reutilizado do Search)
============================================================================ */
/**
 * Consolida dados de artigos (vindos de um SELECT com JOINs) com seus respectivos autores.
 */
async function consolidateArticles(rows) {
    if (!rows.length) return [];
    
    const ids = rows.map(r => r.id);
    
    // Busca de autores para todos os artigos encontrados
    const authors = await sql/*sql*/`
      SELECT aa.article_id, au.name
        FROM article_authors aa
        JOIN authors au ON au.id = aa.author_id
       WHERE aa.article_id IN ${sql(ids)}
       ORDER BY aa.article_id, au.name
    `;

    // Mapeamento e consolidação de autores por artigo
    const byArticle = new Map();
    for (const r of rows) {
      byArticle.set(r.id, {
        id: r.id,
        title: r.title,
        abstract: r.abstract,
        // Campos extras para exibição no frontend:
        event_name: r.event_name,
        edition_year: r.edition_year,
        start_page: r.start_page,
        end_page: r.end_page,
        created_at: r.created_at,
        authors: []
      });
    }
    for (const a of authors) {
      byArticle.get(a.article_id)?.authors.push(a.name);
    }

    return Array.from(byArticle.values());
}

/* ============================================================================
   HELPERS DE PARSING (BibTeX via citation-js)
============================================================================ */

function authorsFromCiteItem(item) {
  const list = item.author || [];
  const names = [];
  for (const a of list) {
    const given = (a.given || "").trim();
    const family = (a.family || "").trim();
    const literal = (a.literal || "").trim();
    const full = literal || [given, family].filter(Boolean).join(" ").trim();
    if (full) names.push(full);
  }
  return names;
}

function yearFromCiteItem(item) {
  const dp = item?.issued?.["date-parts"];
  if (Array.isArray(dp) && Array.isArray(dp[0]) && Number.isInteger(dp[0][0])) {
    return dp[0][0];
  }
  return null;
}

function asStringOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}


/* ============================================================================
   1) POST /articles  → Cadastro manual com PDF
============================================================================ */
router.post("/", uploadOne.single("pdf"), async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Requer autenticação." }
      });
    }

    const { title, authors, abstract } = req.body;
    const { eventName, year: rawYear, startPage: rawStart, endPage: rawEnd } = req.body;

    if (!title || !eventName || !rawYear || !req.file) {
      return res.status(400).json({
        error: { code: "VALIDATION", message: "Campos obrigatórios: title, eventName, year e pdf" }
      });
    }

    const year = parseInt(rawYear, 10);
    if (!Number.isInteger(year) || year < 1900) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "Ano (year) inválido" } });
    }

    const edition = await upsertEditionByEventNameAndYearForUser(
      eventName.trim(),
      year,
      req.user.id
    );
    const editionId = edition.id;

    try {
      await checkDuplicateArticle(title.trim(), editionId);
    } catch (err) {
      if (err.code === "DUPLICATE_ARTICLE") {
        return res.status(409).json({ error: { code: "DUPLICATE_ARTICLE", message: err.message } });
      }
      throw err;
    }

    const startPage = Number.isFinite(parseInt(rawStart, 10)) ? parseInt(rawStart, 10) : null;
    const endPage   = Number.isFinite(parseInt(rawEnd, 10))   ? parseInt(rawEnd, 10)   : null;

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
    
    // *** CORREÇÃO APLICADA: Usa o insertArticle corrigido para obter os dados completos ***
    const created = await insertArticle({
      title: title.trim(),
      abstract: asStringOrNull(abstract),
      startPage,
      endPage,
      pdfBuffer: req.file.buffer,
      editionId,
      uploaderId: req.user.id,
      authors: authorNames
    });

    // CORREÇÃO: Chamamos a notificação usando os dados consolidados do objeto 'created'
    notifySubscribersForNewArticle({
      title: created.title || title.trim(),
      authors: authorNames,
      eventName: created.event_name || eventName.trim(),
      year: created.year || year,
      articleId: created.id,
      startPage: created.start_page || startPage,
      endPage: created.end_page || endPage,
    });
    // ************************************************************************************

    return res.status(201).json({ ok: true, id: created.id });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ error: { code: "VALIDATION", message: err.message } });
    }
    next(err);
  }
});

/* ============================================================================
   2) PUT/PATCH /articles/:id  → Edição de metadados e/ou PDF
   - Restringe a edição ao uploader_id do usuário logado
   - Aceita eventName + year e faz upsert da edição automaticamente
============================================================================ */
async function updateArticleHandler(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "ID inválido" } });
    }

    const userId = req.user?.id;

    // Garante existência e posse ANTES de alterar qualquer coisa (inclusive autores)
    const owned = await sql/*sql*/`
      SELECT a.id
        FROM articles a
       WHERE a.id = ${id} AND a.uploader_id = ${userId}
       LIMIT 1
    `;
    if (!owned[0]) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Artigo não encontrado ou acesso negado" } });
    }

    // Suporta snake_case e camelCase para páginas
    const {
      title,
      abstract,
      edition_id,
      start_page,
      end_page,
      startPage,
      endPage,
      // Upsert de edição:
      eventName,
      year,
      // Autores (substituição completa)
      authors,
    } = req.body;

    const updates = [];

    if (title !== undefined)     updates.push(sql/*sql*/`title = ${asStringOrNull(title)}`);
    if (abstract !== undefined)  updates.push(sql/*sql*/`abstract = ${asStringOrNull(abstract)}`);

    const startPg = start_page ?? startPage;
    const endPg   = end_page ?? endPage;

    if (startPg !== undefined) {
      const v = Number.isFinite(parseInt(startPg, 10)) ? parseInt(startPg, 10) : null;
      updates.push(sql/*sql*/`start_page = ${v}`);
    }
    if (endPg !== undefined) {
      const v = Number.isFinite(parseInt(endPg, 10)) ? parseInt(endPg, 10) : null;
      updates.push(sql/*sql*/`end_page = ${v}`);
    }

    // (1) edition_id explícito
    if (edition_id !== undefined) {
      const editionId = parseInt(edition_id, 10);
      if (!Number.isInteger(editionId)) {
        return res.status(400).json({ error: { code: "VALIDATION", message: "edition_id inválido" } });
      }
      await getEditionOrThrow(editionId);
      updates.push(sql/*sql*/`edition_id = ${editionId}`);
    }

    // (2) eventName + year  → upsert de edição (prevalece se ambos enviados)
    if (eventName !== undefined || year !== undefined) {
      const evName = asStringOrNull(eventName);
      const yr = parseInt(year, 10);

      if (!evName || !Number.isInteger(yr) || yr < 1900) {
        return res.status(400).json({
          error: { code: "VALIDATION", message: "Para alterar via eventName/year, envie eventName (string) e year (>= 1900)" }
        });
      }

      const edition = await upsertEditionByEventNameAndYearForUser(evName,yr,req.user?.id);
      updates.push(sql/*sql*/`edition_id = ${edition.id}`);

    }

    // PDF opcional
    if (req.file) {
      updates.push(sql/*sql*/`pdf_data = ${req.file.buffer}`);
    }

    // Sempre atualizar updated_at quando houver mudanças de metadados/pdf
    if (updates.length > 0) {
      updates.push(sql/*sql*/`updated_at = CURRENT_TIMESTAMP`);
    }

    // Junta os fragments manualmente (mesmo padrão do PATCH /editions)
    if (updates.length > 0) {
      const [updated] = await sql/*sql*/`
        UPDATE articles
           SET ${sql(updates)}
         WHERE id = ${id} AND uploader_id = ${userId}
         RETURNING id
      `;

      if (!updated) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Artigo não encontrado ou acesso negado" } });
      }
    }

    // Autores (substituição completa), apenas se enviados
    if (authors !== undefined) {
      let authorNames = [];
      if (Array.isArray(authors)) {
        authorNames = authors;
      } else if (typeof authors === "string") {
        try {
          const parsed = JSON.parse(authors);
          authorNames = Array.isArray(parsed) ? parsed : authors.split(/[,;]\s*/g);
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
    // Conflitos únicos etc.
    if (err.code === "23505") {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Conflito de unicidade ao atualizar artigo" } });
    }
    next(err);
  }
}

router.put("/:id", uploadOne.single("pdf"), updateArticleHandler);
router.patch("/:id", uploadOne.single("pdf"), updateArticleHandler);


/* ============================================================================
   3) DELETE /articles/:id  → Remoção
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
   4) GET /articles/:id/pdf  → Força download do PDF com filename amigável
============================================================================ */
router.get("/:id/pdf", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "ID inválido" } });
    }

    const rows = await sql/*sql*/`
      SELECT a.pdf_data, a.title
        FROM articles a
       WHERE a.id = ${id}
       LIMIT 1
    `;
    const row = rows[0];
    if (!row?.pdf_data) {
      return res.status(404).json({ error: "PDF não encontrado" });
    }

    // Gera nome de arquivo seguro a partir do título
    const safeTitle =
      (row.title || `artigo-${id}`)
        .replace(/[^\w\- ]+/g, "") // remove caracteres problemáticos
        .trim() || `artigo-${id}`;
    const fileName = `${safeTitle}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    // 👉 força download em vez de abrir no viewer
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    // (opcional) cache control
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

    res.send(Buffer.from(row.pdf_data));
  } catch (err) {
    next(err);
  }
});



/* ============================================================================
   5) GET /articles/search?field=title|author|event&q=substr
   Sempre retorna ARTIGOS; o "field" só define o filtro aplicado.
============================================================================ */
router.get("/search", async (req, res, next) => {
  try {
    const rawField = String(req.query.field || "title").toLowerCase();
    const field = ["title", "author", "event"].includes(rawField) ? rawField : "title";

    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ articles: [] });

    const like = `%${q}%`;

    // Base: artigos + edição + evento (uma linha por artigo)
    // Filtro específico é aplicado depois sem gerar duplicatas.
    let rows = [];

    if (field === "title") {
      rows = await sql/*sql*/`
        SELECT 
          a.id, a.title, a.abstract, a.start_page, a.end_page, a.created_at,
          e.year AS edition_year, ev.name AS event_name
        FROM articles a
        JOIN editions e ON e.id = a.edition_id
        JOIN events   ev ON ev.id = e.event_id
        WHERE a.title ILIKE ${like}
        ORDER BY e.year DESC NULLS LAST, a.id DESC
      `;
    } else if (field === "event") {
      rows = await sql/*sql*/`
        SELECT 
          a.id, a.title, a.abstract, a.start_page, a.end_page, a.created_at,
          e.year AS edition_year, ev.name AS event_name
        FROM articles a
        JOIN editions e ON e.id = a.edition_id
        JOIN events   ev ON ev.id = e.event_id
        WHERE ev.name ILIKE ${like}
        ORDER BY e.year DESC NULLS LAST, a.id DESC
      `;
    } else { // author
      // Usa EXISTS para não duplicar artigos por múltiplos autores
      rows = await sql/*sql*/`
        SELECT 
          a.id, a.title, a.abstract, a.start_page, a.end_page, a.created_at,
          e.year AS edition_year, ev.name AS event_name
        FROM articles a
        JOIN editions e ON e.id = a.edition_id
        JOIN events   ev ON ev.id = e.event_id
        WHERE EXISTS (
          SELECT 1
          FROM article_authors aa
          JOIN authors au ON au.id = aa.author_id
          WHERE aa.article_id = a.id
            AND au.name ILIKE ${like}
        )
        ORDER BY e.year DESC NULLS LAST, a.id DESC
      `;
    }

    if (!rows.length) return res.json({ articles: [] });

    // Monta autores sem duplicar artigos
    const articles = await consolidateArticles(rows);

    // Garantia extra de ordenação por ano (caso mude algo acima futuramente)
    articles.sort((a, b) => (b.edition_year ?? 0) - (a.edition_year ?? 0) || (b.id - a.id));

    return res.json({ articles });
  } catch (err) {
    next(err);
  }
});
/* ============================================================================
   6) POST /articles/bulk-bibtex
============================================================================ */
router.post(
  "/bulk-bibtex",
  uploadBulk.fields([
    { name: "bibtex", maxCount: 1 },
    { name: "pdfs",   maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      // ⚠️ Garante usuário autenticado (rota deve estar com `auth` no app.js)
      if (!req.user?.id) {
        return res.status(401).json({
          error: { code: "UNAUTHENTICATED", message: "Requer autenticação." }
        });
      }

      const bibFile = req.files?.bibtex?.[0];
      const zipFile = req.files?.pdfs?.[0];
      if (!bibFile || !zipFile) {
        return res.status(400).json({
          error: { code: "VALIDATION", message: "Envie os dois arquivos: 'bibtex' (.bib) e 'pdfs' (.zip)" },
        });
      }

      const zip = await JSZip.loadAsync(zipFile.buffer);
      const bibStr = bibFile.buffer.toString("utf-8");
      const cite = new Cite(bibStr);
      const items = cite.data || [];

      const created = [];
      const skipped = [];
      const uploaderId = req.user.id; // autenticado

      for (const item of items) {
        const key = (item.id || "(sem-chave)").trim();

        // --- VALIDAÇÕES E EXTRAÇÃO ---
        const title = asStringOrNull(item.title);
        const booktitle = asStringOrNull(item["container.title"]); // nome do evento
        const year = yearFromCiteItem(item);
        const authorNames = authorsFromCiteItem(item);

        if (!title)              { skipped.push({ key, reason: "Campo obrigatório ausente: title" }); continue; }
        if (!booktitle)          { skipped.push({ key, reason: "Campo obrigatório ausente: booktitle (Nome do Evento)" }); continue; }
        if (!authorNames.length) { skipped.push({ key, reason: "Campo obrigatório ausente: author(s)" }); continue; }
        if (!Number.isInteger(year) || year < 1000) {
          skipped.push({ key, reason: "Campo obrigatório ausente ou inválido: year" });
          continue;
        }

        // --- GUARDA PDF ---
        const pattern = new RegExp(`(^|/)${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.pdf$`, "i");
        const files = zip.file(pattern);
        if (!files || files.length === 0) {
          skipped.push({ key, reason: `PDF "${key}.pdf" não encontrado no ZIP` });
          continue;
        }
        const pdfBuffer = await files[0].async("nodebuffer");

        // --- UPSERT DE EVENTO/EDIÇÃO E INSERÇÃO DE ARTIGO ---
        try {
          // ✅ Função correta e escopada ao usuário logado
          const edition = await upsertEditionByEventNameAndYearForUser(
            booktitle.trim(),
            year,
            uploaderId
          );

          // Evita duplicata: mesmo título na mesma edição
          await checkDuplicateArticle(title.trim(), edition.id);

          const abstract = asStringOrNull(item.abstract);
          let startPage = null, endPage = null;
          const pageField = asStringOrNull(item.page); // "1--11", etc.
          if (pageField) {
            const m = pageField.match(/(\d+)\s*[-–]\s*(\d+)/);
            if (m) { startPage = parseInt(m[1], 10); endPage = parseInt(m[2], 10); }
          }
          
          // *** CORREÇÃO APLICADA: Usa o insertArticle corrigido para obter os dados completos ***
          const ins = await insertArticle({
            title: title.trim(),
            abstract,
            startPage,
            endPage,
            pdfBuffer,
            editionId: edition.id,
            uploaderId,
            authors: authorNames,
          });

          // 🔔 Notifica assinantes cujo nome bate (exatamente, case-insensitive)
          notifySubscribersForNewArticle({
            title: ins.title, // Pega do retorno
            authors: authorNames,
            eventName: ins.event_name, // Pega do retorno
            year: ins.year, // Pega do retorno
            articleId: ins.id,
            startPage: ins.start_page,
            endPage: ins.end_page,
          });
          // ************************************************************************************

          created.push({ key, id: ins.id, title: title.trim() });
        } catch (e) {
          if (e.code === "DUPLICATE_ARTICLE") {
            skipped.push({ key, reason: e.message });
          } else if (e.code === "VALIDATION") {
            skipped.push({ key, reason: e.message || "Erro de validação ao criar edição/artigo" });
          } else {
            skipped.push({ key, reason: e?.code ? `Erro SQL (${e.code})` : (e?.message || "Erro ao salvar artigo") });
          }
        }
      }

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
router.get("/mine", async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const rows = await sql/*sql*/`
      SELECT a.id, a.title, a.abstract, a.created_at, a.start_page, a.end_page,
             e.year AS edition_year, ev.name AS event_name
      FROM articles a
      JOIN editions e ON e.id = a.edition_id
      JOIN events ev ON ev.id = e.event_id
      WHERE a.uploader_id = ${userId}
      ORDER BY a.created_at DESC
    `;
    
    const articles = await consolidateArticles(rows);

    return res.json({ articles });
  } catch (err) {
    next(err);
  }
});


/* ============================================================================
   Exporta o Router para ser montado no app.js:
   app.use("/articles", auth, articlesRouter);
============================================================================ */
module.exports = router;