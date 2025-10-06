// src/routes/public.js
const { Router } = require("express");
const { sql } = require("../src/db/sql");

// util: slug simples (p/ URL amigável)
function slugify(name) {
  return String(name || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// consolida autores por artigo
async function consolidateArticles(rows) {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const authors = await sql/*sql*/`
    SELECT aa.article_id, au.name
      FROM article_authors aa
      JOIN authors au ON au.id = aa.author_id
     WHERE aa.article_id IN ${sql(ids)}
     ORDER BY aa.article_id, au.name
  `;
  const byId = new Map();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      title: r.title,
      abstract: r.abstract,
      event_name: r.event_name,
      edition_year: r.edition_year,
      start_page: r.start_page,
      end_page: r.end_page,
      created_at: r.created_at,
      authors: [],
    });
  }
  for (const a of authors) byId.get(a.article_id)?.authors.push(a.name);
  return [...byId.values()];
}

// tenta bater por nome; se não, compara por slug
async function findEventBySlugOrName(slugOrName) {
  const wanted = String(slugOrName || "").trim();
  if (!wanted) return null;

  const exact = await sql/*sql*/`
    SELECT id, name, description
      FROM events
     WHERE name ILIKE ${wanted}
     LIMIT 1
  `;
  if (exact[0]) return exact[0];

  const all = await sql/*sql*/`
    SELECT id, name, description
      FROM events
  `;
  return all.find(e => slugify(e.name) === slugify(wanted)) || null;
}

const router = Router();

/** GET /public/events/:slug → { event, editions[] } */
router.get("/events/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) return res.status(400).json({ error: { message: "Slug inválido" } });

    const event = await findEventBySlugOrName(slug);
    if (!event) return res.status(404).json({ error: { message: "Evento não encontrado" } });

    const editions = await sql/*sql*/`
      SELECT id, event_id, year, local, description
        FROM editions
       WHERE event_id = ${event.id}
       ORDER BY year DESC
    `;
    res.json({ event, editions });
  } catch (e) { next(e); }
});

/** GET /public/editions/:slug/:year → { edition, articles[] } */
router.get("/editions/:slug/:year", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const year = parseInt(req.params.year, 10);
    if (!slug || !Number.isInteger(year)) {
      return res.status(400).json({ error: { message: "Parâmetros inválidos" } });
    }

    const event = await findEventBySlugOrName(slug);
    if (!event) return res.status(404).json({ error: { message: "Evento não encontrado" } });

    const [ed] = await sql/*sql*/`
      SELECT id, event_id, year, local, description
        FROM editions
       WHERE event_id = ${event.id} AND year = ${year}
       LIMIT 1
    `;
    if (!ed) return res.status(404).json({ error: { message: "Edição não encontrada" } });

    const rows = await sql/*sql*/`
      SELECT 
        a.id, a.title, a.abstract, a.start_page, a.end_page, a.created_at,
        e.year AS edition_year, ev.name AS event_name
      FROM articles a
      JOIN editions e ON e.id = a.edition_id
      JOIN events   ev ON ev.id = e.event_id
      WHERE a.edition_id = ${ed.id}
      ORDER BY a.start_page NULLS LAST, a.id ASC
    `;
    const articles = await consolidateArticles(rows);

    res.json({
      edition: {
        event_name: event.name,
        year: ed.year,
        local: ed.local,
        description: ed.description,
      },
      articles,
    });
  } catch (e) { next(e); }
});

module.exports = router;
