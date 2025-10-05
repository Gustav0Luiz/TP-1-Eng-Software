-- ============================================================
--  Schema do projeto VLIB (eventos, edições, artigos, autores)
-- ============================================================

SET client_encoding = 'UTF8';

-- ------------------------------------------------------------
-- Função e trigger para manter updated_at sempre atualizada
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Tabela: events (evento base, ex.: "SBES")
-- ============================================================
/*
  Armazena o "tipo" de evento (não a edição anual). Ex.: "SBES".
*/
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE, -- Adicionando UNIQUE aqui também é uma boa prática
  description TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index para buscas por nome (LIKE/ILIKE)
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE events IS 'Evento base (ex.: SBES). Edições anuais estão em editions.';
COMMENT ON COLUMN events.name IS 'Nome do evento (ex.: "SBES").';


-- ============================================================
-- Tabela: editions (edição de um evento em um ano)
-- ============================================================
/*
  Cada edição pertence a um evento e tem um ano e um local.
*/
CREATE TABLE IF NOT EXISTS editions (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  description TEXT,
  local       VARCHAR(255), -- NOVO CAMPO: Local da edição (ex: Curitiba/PR)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_editions_event_year UNIQUE (event_id, year),
  CONSTRAINT chk_editions_year CHECK (year >= 1900) -- Ano deve ser >= 1900
);

CREATE INDEX IF NOT EXISTS idx_editions_event_id ON editions(event_id);
CREATE INDEX IF NOT EXISTS idx_editions_year     ON editions(year);

DROP TRIGGER IF EXISTS trg_editions_updated_at ON editions;
CREATE TRIGGER trg_editions_updated_at
BEFORE UPDATE ON editions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE editions IS 'Edições anuais de um evento (ex.: SBES 2025).';
COMMENT ON COLUMN editions.year IS 'Ano da edição.';
COMMENT ON COLUMN editions.local IS 'Local onde a edição do evento foi realizada.';


-- ============================================================
-- Tabela: users (login e autoria de upload)
-- ============================================================
/*
  Usuários do sistema (acesso, uploads).
*/
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  nickname       VARCHAR(50)  NOT NULL UNIQUE,  -- usado no login
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE users IS 'Usuários do sistema (login via nickname, uploads).';


-- ============================================================
-- Tabela: authors (autores dos artigos)
-- ============================================================
/*
  Autores vinculados a artigos (N:N via article_authors).
*/
CREATE TABLE IF NOT EXISTS authors (
  id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);

COMMENT ON TABLE authors IS 'Autores (referenciados pelos artigos).';


-- ============================================================
-- Tabela: articles (artigos submetidos)
-- ============================================================
/*
  Cada artigo pertence a UMA edição específica (edition_id).
*/
CREATE TABLE IF NOT EXISTS articles (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  abstract     TEXT,
  start_page   INTEGER,
  end_page     INTEGER,
  pdf_data     BYTEA,
  edition_id   INTEGER NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  uploader_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_articles_title_edition UNIQUE (title, edition_id) -- NOVO: Impede artigos com mesmo título na mesma edição
);

CREATE INDEX IF NOT EXISTS idx_articles_edition_id  ON articles(edition_id);
CREATE INDEX IF NOT EXISTS idx_articles_uploader_id ON articles(uploader_id);
CREATE INDEX IF NOT EXISTS idx_articles_title       ON articles(title);

DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;
CREATE TRIGGER trg_articles_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE articles IS 'Artigos vinculados a uma edição específica.';


-- ============================================================
-- Tabela de junção: article_authors (N:N artigo <-> autor)
-- ============================================================
/*
  Um artigo pode ter vários autores e um autor pode ter vários artigos.
*/
CREATE TABLE IF NOT EXISTS article_authors (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES authors(id)  ON DELETE CASCADE,
  PRIMARY KEY (article_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_article_authors_article_id ON article_authors(article_id);
CREATE INDEX IF NOT EXISTS idx_article_authors_author_id  ON article_authors(author_id);

COMMENT ON TABLE article_authors IS 'Relação muitos-para-muitos entre artigos e autores.';