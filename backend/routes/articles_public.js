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
      // title (default)
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

    // Busca autores
    const ids = rows.map(r => r.id);
    const authors = await sql/*sql*/`
      SELECT aa.article_id, au.name
        FROM article_authors aa
        JOIN authors au ON au.id = aa.author_id
       WHERE aa.article_id IN ${sql(ids)}
       ORDER BY aa.article_id, au.name
    `;

    // Agrega autores por artigo
    const byArticle = new Map();
    for (const r of rows) {
      byArticle.set(r.id, {
        id: r.id,
        title: r.title,
        abstract: r.abstract,
        event: { name: r.event_name },  // sem acronym
        edition_year: r.edition_year,
        start_page: r.start_page,
        end_page: r.end_page,
        authors: []
      });
    }
    for (const a of authors) {
      byArticle.get(a.article_id)?.authors.push(a.name);
    }

    res.json({ articles: Array.from(byArticle.values()) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
