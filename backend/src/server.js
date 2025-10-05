/**
 * server.js
 *
 * Este arquivo é responsável por **iniciar** o servidor.
 * Aqui você:
 *  - Carrega variáveis de ambiente do arquivo .env (como a PORT).
 *  - Importa o "app" já configurado do app.js.
 *  - Diz ao Express para "escutar" em uma porta (abrir o servidor HTTP).
 *
 * Importante: toda a lógica e rotas estão no app.js.
 * O server.js só dá o "start" no servidor.
 */


require("dotenv").config(); // Carrega o conteúdo do arquivo .env e coloca em process.env.

const app = require("./app");       // Importa o app configurado (rotas + middlewares) do app.js.
const PORT = process.env.PORT || 4000; // Lê a variável PORT do .env. Se não existir, usa 3000 como padrão.

// Inicia o servidor e faz ele "escutar" na porta definida.
app.listen(PORT, () => {
  // Quando o servidor começa a rodar, exibe a mensagem abaixo no terminal.
  console.log(`[server] rodando em http://localhost:${PORT}`);
});