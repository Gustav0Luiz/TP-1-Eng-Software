-- Tabela para armazenar os eventos
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para os usuários do sistema (para login e cadastro de artigos)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar os autores dos artigos
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Tabela para armazenar os artigos
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    abstract TEXT,
    pdf_data BYTEA, -- Armazena o conteúdo do PDF como dados binários
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Quem submeteu o artigo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de junção para o relacionamento muitos-para-muitos entre artigos e autores
CREATE TABLE article_authors (
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, author_id)
);

-- Índices para otimizar as consultas mais comuns
CREATE INDEX idx_articles_event_id ON articles(event_id);
CREATE INDEX idx_articles_uploader_id ON articles(uploader_id);
CREATE INDEX idx_article_authors_article_id ON article_authors(article_id);
CREATE INDEX idx_article_authors_author_id ON article_authors(author_id);
CREATE INDEX idx_users_nickname ON users(nickname);
