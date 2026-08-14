// A Vercel serve as funções num domínio diferente do site (Firebase Hosting), então cada
// resposta precisa dos cabeçalhos de CORS pra o navegador aceitar a chamada. Além do domínio
// oficial, libera qualquer canal de preview do Firebase Hosting (ex:
// lyonpromanager--teste-pagamento-xxxxx.web.app), usado pra testar sem afetar o site principal.
const ORIGEM_PERMITIDA = /^https:\/\/lyonpromanager(--[a-z0-9-]+)?\.web\.app$|^https:\/\/lyonpromanager\.firebaseapp\.com$/;

function aplicarCors(req, res) {
    let origem = req.headers.origin;
    if (origem && ORIGEM_PERMITIDA.test(origem)) res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = { aplicarCors };
