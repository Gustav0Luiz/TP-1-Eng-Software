// routes/articles_public.js
const { Router } = require("express");
const { sql } = require("../src/db/sql");

const router = Router();

/**
 * GET /articles/search?field=title|author|event&q=substr
 * Público: não exige JWT.
 */
router.get("/search", async (req, res, next) => {
  try {
    const fieldRaw = String(req.query.field || "title").toLowerCase();
    const field = ["title", "author", "event"].includes(fieldRaw) ? fieldRaw : "title";
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ articles: [] });

    const like = `%${q}%`;
    let rows = [];

    if (field === "author") {
      rows = await sql/*sql*/`
        SELECT a.id, a.title, a.abstract, a.start_page, a.end_page, a.created_at,
               e.year AS edition_year, ev.name AS event_name
          FROM articles a
          JOIN editions e ON e.id = a.edition_id
          JOIN events   ev ON ev.id = e.event_id
          JOIN article_authors aa ON aa.article_id = a.id
          JOIN authors au ON au.id = aa.author_id
         WHERE au.name ILIKE ${like}
         GROUP BY a.id, e.year, ev.name, a.created_at, a.start_page, a.end_page, a.title, a.abstract
         ORDER BY e.year DESC NULLS LAST, a.id DESC
      `;
    } else if (field === "event") {
      rows = await sql/*sql*/`
        SELECT a.id, a.title, a.abstract, a.start_page, a.end_page, a.created_at,
               e.year AS edition_year, ev.name AS event_name
          FROM articles a
          JOIN editions e ON e.id = a.edition_id
          JOIN events   ev ON ev.id = e.event_id
         WHERE ev.name ILIKE ${like}
         ORDER BY e.year DESC NULLS LAST, a.id DESC
      `;
    } else {
      // title (default)
      rows = await sql/*sql*/`
        SELECT a.id, a.title, a.abstract, a.start_page, a.end_page, a.created_at,
               e.year AS edition_year, ev.name AS event_name
          FROM articles a
          JOIN editions e ON e.id = a.edition_id
          JOIN events   ev ON ev.id = e.event_id
         WHERE a.title ILIKE ${like}
         ORDER BY e.year DESC NULLS LAST, a.id DESC
      `;
    }

    if (!rows.length) return res.json({ articles: [] });

    // Busca autores para todos os artigos retornados
    const ids = rows.map(r => r.id);
    const authors = await sql/*sql*/`
      SELECT aa.article_id, au.name
        FROM article_authors aa
        JOIN authors au ON au.id = aa.author_id
       WHERE aa.article_id IN ${sql(ids)}
       ORDER BY aa.article_id, au.name
    `;

    // Consolida autores por artigo e retorna no shape esperado pelo frontend
    const byArticle = new Map();
    for (const r of rows) {
      byArticle.set(r.id, {
        id: r.id,
        title: r.title,
        abstract: r.abstract,
        event_name: r.event_name,   // <- chave esperada no FE
        edition_year: r.edition_year,
        start_page: r.start_page,
        end_page: r.end_page,
        created_at: r.created_at,
        authors: [],
      });
    }
    for (const a of authors) {
      const ref = byArticle.get(a.article_id);
      if (ref) ref.authors.push(a.name);
    }

    res.json({ articles: Array.from(byArticle.values()) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /articles/:id/pdf
 * Público: stream de PDF com cabeçalho para download.
 * ⚠️ Deixe esta rota DEPOIS de /search para não conflitar ("/search" não vira :id).
 */
router.get("/:id/pdf", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "ID inválido" } });
    }

    const rows = await sql/*sql*/`
      SELECT title, pdf_data
        FROM articles
       WHERE id = ${id}
       LIMIT 1
    `;
    const found = rows[0];
    if (!found?.pdf_data) {
      return res.status(404).json({ error: "PDF não encontrado" });
    }

    const safeTitle =
      (found.title || `article-${id}`).replace(/[^\w\- ]+/g, "").trim() || `article-${id}`;

    res.setHeader("Content-Type", "application/pdf");
    // Força download no browser
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
    // Cache curto (opcional)
    res.setHeader("Cache-Control", "public, max-age=300");

    res.send(Buffer.from(found.pdf_data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
