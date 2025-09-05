# 🧭 Guia de Setup — Projeto VLib (Frontend + Backend + PostgreSQL)

Este guia explica **do zero** como clonar o repositório, instalar as dependências, preparar o **PostgreSQL** e rodar o projeto localmente em **Windows**, **macOS** e **Linux**.

> ✅ **Resumo do que você terá ao final:**
> - Repositório clonado
> - Node.js + npm instalados
> - PostgreSQL instalado e rodando
> - Banco **vlib** criado com usuário dedicado
> - `schema.sql` executado
> - `.env` configurados
> - Frontend e backend instalados e rodando

---

## 0) Pré-requisitos (Git e Node.js)

### Windows
- **Git** — baixe e instale: <https://git-scm.com/download/win>  
- **Node.js (LTS)** — baixe e instale: <https://nodejs.org/en/download> (versão LTS)

### macOS
```bash
## Homebrew (recomendado) — instale se ainda não tiver
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

## Git e Node.js (via Homebrew)
brew install git node
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y git curl build-essential
# Node LTS via NodeSource (opção comum e estável)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

**Dica: confirme as versões**
```bash
git --version
node -v
npm -v
```

---

## 1) Clonar o repositório
```bash
# Use SSH ou HTTPS conforme seu setup de GitHub/GitLab
git clone https://github.com/Gustav0Luiz/TP-1-Eng-Software.git
cd TP-1-Eng-Software
```

---

## 2) Instalar o PostgreSQL

### Windows
- Baixe o instalador oficial: <https://www.postgresql.org/download/windows/>
- Link direto: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

**Durante a instalação:**
- Defina a senha do usuário `postgres` (anote!)
- Instale também o **pgAdmin** (opcional, GUI)
- Marque a opção para instalar os utilitários de linha de comando (`psql`)

Após instalar:
```bash
psql --version
```

### macOS (Homebrew)
```bash
brew install postgresql
brew services start postgresql
psql --version
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
# Inicia e habilita o serviço
sudo systemctl enable --now postgresql
psql --version
```

**Se o serviço não subir, cheque o status:**
```bash
# Linux
systemctl status postgresql

# macOS (Homebrew)
brew services list

# Windows (abrir)
services.msc  # procure "postgresql-x64-<versao>"
```

---

## 3) Criar banco e usuário

Você pode fazer pelo `psql`. No Windows, se preferir GUI, use o **pgAdmin** (os comandos SQL são os mesmos).

### Acessar o psql

**Linux/macOS:**
```bash
sudo -u postgres psql
```

**Windows:**  
Abra o **SQL Shell (psql)** e conecte como `postgres` (informe a senha definida na instalação).

### Comandos SQL
```sql
-- Cria o banco
CREATE DATABASE vlib;

-- Cria um usuário dedicado (troque 'sua_senha_aqui' por uma senha forte)
CREATE USER vlib_user WITH PASSWORD 'sua_senha_aqui';

-- Dá permissões ao usuário no banco
GRANT ALL PRIVILEGES ON DATABASE vlib TO vlib_user;
```

**Sair do psql:**
```bash
\q
```

---

## 4) Importar o schema do projeto

Encontre o arquivo `schema.sql` no repositório (ex.: `backend/schema.sql`). Use o caminho correto conforme seu SO.

> ⚠️ Importante: sempre rode o `schema.sql` com o **usuário da aplicação (`vlib_user`)**, e não com `postgres`.  
> Assim, todas as tabelas/objetos serão criados já com o dono correto, evitando erros de permissão no backend.

### Exemplos de execução

**Linux/macOS:**
```bash
# Dentro da pasta do projeto
psql -U vlib_user -d vlib -f backend/schema.sql
```

**Windows (PowerShell ou Prompt):**
```bash
# Dentro da pasta do projeto
psql -U vlib_user -d vlib -f backend\schema.sql
```

Se `psql` não for reconhecido, abra o **SQL Shell (psql)** e rode:
```sql
\i 'C:/caminho/para/o/projeto/backend/schema.sql'
```

**Teste rápido do banco:**
```bash
psql -U vlib_user -d vlib -c "SELECT current_user, current_database();"
```

---

## 5) Configurar variáveis de ambiente

> **Nunca versionar** `.env` no Git.

### Copiar os exemplos

**Linux/macOS:**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Windows (PowerShell):**
```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

**Windows (Prompt):**
```bat
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

### Editar `backend/.env`

Preencha com suas credenciais. Dois formatos comuns:

**Variáveis separadas**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vlib
DB_USER=vlib_user
DB_PASSWORD=sua_senha_aqui
```

**URL única (ex.: Prisma/Sequelize)**
```env
DATABASE_URL=postgresql://vlib_user:sua_senha_aqui@localhost:5432/vlib
```

> Verifique o que o backend espera (variáveis separadas ou `DATABASE_URL`).  
> Ajuste também outras variáveis necessárias (porta, JWT secret etc.), se existirem no `.env.example`.

### Editar `frontend/.env` (se necessário)
Siga as chaves do `.env.example` (URLs da API, etc.).

---

## 6) Instalar dependências e rodar

### Backend
```bash
cd backend
npm install
# Comando de desenvolvimento (ajuste se seu package.json usar outro)
npm run dev
# ou:
# npm start
```

### Frontend
```bash
cd ../frontend
npm install
# Comando comum do React/Vite/Next:
npm run dev
# ou:
# npm start
```

> Dê uma olhada nos scripts no `package.json` de cada pasta para confirmar os comandos corretos.

---

## 7) Verificação da conexão app ↔ banco

Com o backend rodando, acesse a rota de health/status (se existir) ou provoque alguma ação que leia/grave no banco.

**Teste direto com a connection string:**
```bash
psql "postgresql://vlib_user:sua_senha_aqui@localhost:5432/vlib" -c "SELECT 1;"
```

---

## 8) (Opcional) Rodando o PostgreSQL via Docker

Se preferir não instalar o PostgreSQL nativo:
```bash
docker run --name vlib-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vlib -p 5432:5432 -d postgres:16
```

Depois, crie o usuário dedicado (conectando como `postgres`):
```bash
psql -h localhost -U postgres -d vlib -c "CREATE USER vlib_user WITH PASSWORD 'sua_senha_aqui';"
psql -h localhost -U postgres -d vlib -c "GRANT ALL PRIVILEGES ON DATABASE vlib TO vlib_user;"
psql -h localhost -U postgres -d vlib -f backend/schema.sql
```

> No `.env`, use `localhost` e porta `5432` (ou a que mapear).

---

## 9) Solução de problemas comuns

**`psql: command not found` / `'psql' não é reconhecido`**
- **Windows:** abra o **SQL Shell (psql)** ou adicione `C:\Program Files\PostgreSQL\<versão>\bin` ao `PATH`.
- **macOS (Homebrew):** `brew link postgresql` e/ou reinicie o terminal.
- **Linux:** confirme instalação de `postgresql-client`.

**Senha do `postgres` desconhecida (Windows)**
- Reinstale o PostgreSQL e anote a nova senha ou crie um novo superusuário via **pgAdmin**.

**Serviço do PostgreSQL não inicia**
- Verifique portas em uso (`5432`) e permissões da pasta de dados.
- **Linux:** `journalctl -u postgresql -e` para logs.

**Permissão negada ao importar `schema.sql`**
- Confirme que está conectando no banco certo (`-d vlib`) e com um usuário com permissão.
- Rode `GRANT` novamente se necessário.
- Se o schema cria objetos em outros schemas, pode ser preciso `GRANT` em nível de schema/tabelas.

**Aplicação não conecta ao banco**
- Verifique variáveis do `.env` (host, porta, usuário, senha, nome do DB).
- Teste com `psql` usando a mesma connection string do `.env`.

---

## 10) Checklist final

- Repositório clonado e na pasta do projeto  
- Node.js (LTS) e npm instalados  
- PostgreSQL instalado e serviço ativo  
- Banco **vlib** e usuário **vlib_user** criados  
- `schema.sql` executado sem erros  
- `backend/.env` e `frontend/.env` configurados  
- `npm install` no backend e frontend  
- Backend e frontend iniciados com sucesso


## 11) Testar as Conexões

Acesse `http://localhost:3000/test-connection` para verificar se:
- ✅ Frontend está se comunicando com o Backend
- ✅ Backend está conectado ao Banco de Dados
- ✅ API está funcionando corretamente
