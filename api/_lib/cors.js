// A Vercel serve as funções num domínio diferente do site (Firebase Hosting), então cada
// resposta precisa dos cabeçalhos de CORS pra o navegador aceitar a chamada.
const ORIGENS_PERMITIDAS = ['https://lyonpromanager.web.app', 'https://lyonpromanager.firebaseapp.com'];

function aplicarCors(req, res) {
    let origem = req.headers.origin;
    if (ORIGENS_PERMITIDAS.includes(origem)) res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = { aplicarCors };
