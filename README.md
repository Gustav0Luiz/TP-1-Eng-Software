# TP1 - Biblioteca Digital de Artigos

Esse repositório contém o tp 1 da disciplina de engenharia de software, que consiste em implementaruma biblioteca digital de artigos, trabalhando em time utilizando a metodologia ágil SCRUM.

---

## 👥 Equipe

| Nome                 | Papel      | GitHub |
|----------------------|------------|--------|
| Gustavo Luiz    | Frontend  | [@Gustavo](https://github.com/Gustav0Luiz) |
| Leonardo Romano | Backend    | [@LeoRoms](https://github.com/LeoRoms) |
| Vinicius de Alcantara| Backend   | [@vini-alg](https://github.com/vini-alg) |
| Arthur Guimarães  | Fullstack    | [@Arthur](https://github.com/arthurguimaraesferreira) |

---
## 🛠 Tecnologias Utilizadas

### Frontend
- **Frameworks:** Next.js  
- **Bibliotecas:** ReactJS, TailwindCSS 

### Backend
- **Frameworks:** Express.js  
- **Bibliotecas:** Node.js, JWT (autenticação), Bcrypt (hash de senhas), Cors  

### Banco de Dados
- **SGBD:** PostgreSQL  
- **ORM / Ferramentas:** talvez nao precise 

### Agente de IA 
- Gemini

- 
### Outras Ferramentas
- **Controle de versão:** Git + GitHub  
- **Gerenciamento de dependências:** npm    
---

# User Stories — Biblioteca de Eventos e Artigos

## Administração

### US-001 — Gerenciar **evento**
**Como** administrador  
**Quero** cadastrar, editar e deletar um **evento**  
**Exemplo:** *Simpósio Brasileiro de Engenharia de Software*

---

### US-002 — Gerenciar **edição de evento**
**Como** administrador  
**Quero** cadastrar, editar e deletar uma **edição de um evento**  
**Exemplo:** *Edição de 2025 do SBES*

---

### US-003 — Cadastrar **artigo** manualmente
**Como** administrador  
**Quero** cadastrar (editar, deletar) um **artigo** manualmente, incluindo seu **PDF**

---

### US-004 — Importar **artigos em massa** via BibTeX
**Como** administrador  
**Quero** cadastrar **artigos em massa** a partir de um arquivo **BibTeX**, com dados de vários artigos

---

### US-005 — Home pages de **evento** e **edição**
**Como** administrador  
**Quero** que todo **evento** tenha uma *home page* com suas **edições**; e que cada **edição** tenha sua *home page* com seus **artigos**  
**Exemplos:** `simple-lib/sbes` e `simple-lib/sbes/2025`

## Usuário

### US-006 — Pesquisar **artigos**
**Como** usuário  
**Quero** pesquisar por **artigos** por **título**, por **autor** e por **nome de evento**

---

### US-007 — Home page do **autor**
**Como** usuário  
**Quero** ter uma *home page* com **meus artigos**, organizados por **ano**  
**Exemplo:** `simple-lib/nome-autor`

---

### US-008 — Assinar **alertas por e-mail**
**Como** usuário  
**Quero** me cadastrar para **receber um e-mail** sempre que **eu** tiver um **novo artigo** disponibilizado

