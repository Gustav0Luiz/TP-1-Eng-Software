/**
 * src/middlewares/auth.js
 *
 * Middleware responsável por proteger rotas usando JWT (JSON Web Token).
 *
 * Fluxo:
 *   1. Lê o cabeçalho Authorization enviado pelo cliente.
 *   2. Verifica se o token segue o formato "Bearer <token>".
 *   3. Decodifica e valida o token usando a chave secreta definida no .env.
 *   4. Se válido, coloca as informações básicas do usuário em req.user.
 *   5. Se inválido ou ausente, retorna erro 401 (não autorizado).
 */

const jwt = require("jsonwebtoken"); // Biblioteca para gerar e validar tokens JWT.

function auth(req, res, next) {
  try {
    // 1) Captura o header Authorization. Se não existir, vira string vazia.
    const header = req.headers.authorization || "";

    // 2) Divide o header em duas partes: "scheme" (ex.: "Bearer") e "token".
    //    Exemplo: "Bearer abc123" → scheme = "Bearer", token = "abc123".
    const [scheme, token] = header.split(" ");

    // 3) Se o esquema não for "Bearer" ou o token estiver ausente → erro 401.
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Token ausente" }
      });
    }

    // 4) Verifica e decodifica o token.
    //    Se foi assinado corretamente e não expirou, retorna o payload.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 5) Nosso payload no login/registro agora contém:
    //    { sub: user.id, email: user.email, nickname: user.nickname, iat, exp }
    //    Salvamos esses dados em req.user para uso nas próximas rotas.
    req.user = {
      id: payload.sub,
      email: payload.email,
      nickname: payload.nickname, // importante para identificar login
    };

    // 6) Continua para a próxima função (rota ou middleware).
    return next();

  } catch (err) {
    // Se deu erro ao validar (ex.: token expirado ou inválido), retorna 401.
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Token inválido ou expirado" }
    });
  }
}

module.exports = { auth };
