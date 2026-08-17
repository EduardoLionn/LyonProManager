// =====================================================================================
// PROXY DA IA (Cloudflare Worker) — versão com autenticação
// =====================================================================================
// O endereço deste Worker está no JavaScript público do site, então qualquer pessoa que
// abrir o código-fonte o encontra. Sem autenticação, ele é um Gemini de graça na conta do
// dono do site: um bot pode chamá-lo em looping e queimar a cota/fatura inteira.
//
// Aqui só passa quem apresentar um ID token válido do Firebase Authentication — ou seja,
// alguém realmente logado no LyonPro Manager. A validação é feita de verdade (assinatura
// RSA conferida contra as chaves públicas do Google), não é só "olhar se o header existe":
// um token inventado não passa.
//
// Deploy: ver worker/README.md

const PROJETO_FIREBASE = 'lyonpromanager';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MODELO_GEMINI = 'gemini-2.0-flash';

// Só o site oficial e os canais de preview do Firebase Hosting. Atenção: isto é uma camada
// de conveniência, NÃO a proteção principal — Origin é enviado pelo navegador e um script
// fora do navegador simplesmente não manda nenhum. Quem protege de verdade é o token.
const ORIGENS_PERMITIDAS = /^https:\/\/lyonpromanager(--[a-z0-9-]+)?\.web\.app$|^https:\/\/lyonpromanager\.firebaseapp\.com$/;

// As chaves públicas do Google mudam de vez em quando; guarda em memória respeitando o
// max-age que eles mandam, pra não buscar a cada requisição.
let cacheJwks = { chaves: null, expiraEm: 0 };

async function obterChavesPublicas() {
    if (cacheJwks.chaves && Date.now() < cacheJwks.expiraEm) return cacheJwks.chaves;

    const resposta = await fetch(JWKS_URL);
    if (!resposta.ok) throw new Error('Não foi possível obter as chaves públicas do Google');
    const jwks = await resposta.json();

    let segundos = 3600;
    const cacheControl = resposta.headers.get('cache-control') || '';
    const achou = cacheControl.match(/max-age=(\d+)/);
    if (achou) segundos = Math.min(86400, parseInt(achou[1], 10) || 3600);

    cacheJwks = { chaves: jwks.keys, expiraEm: Date.now() + segundos * 1000 };
    return jwks.keys;
}

function base64UrlParaBytes(texto) {
    const base64 = texto.replace(/-/g, '+').replace(/_/g, '/');
    const preenchido = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const bruto = atob(preenchido);
    const bytes = new Uint8Array(bruto.length);
    for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
    return bytes;
}

function base64UrlParaTexto(texto) {
    return new TextDecoder().decode(base64UrlParaBytes(texto));
}

// Valida um ID token do Firebase: assinatura RS256 + todas as reivindicações que importam.
// Devolve o uid se estiver tudo certo, ou lança erro.
async function validarTokenFirebase(token) {
    const partes = token.split('.');
    if (partes.length !== 3) throw new Error('formato de token inválido');

    const cabecalho = JSON.parse(base64UrlParaTexto(partes[0]));
    const dados = JSON.parse(base64UrlParaTexto(partes[1]));

    // "alg: none" é o ataque clássico de JWT: exigir RS256 explicitamente o elimina.
    if (cabecalho.alg !== 'RS256') throw new Error('algoritmo não aceito');
    if (!cabecalho.kid) throw new Error('token sem kid');

    const chaves = await obterChavesPublicas();
    const jwk = chaves.find(k => k.kid === cabecalho.kid);
    if (!jwk) throw new Error('chave de assinatura desconhecida');

    const chavePublica = await crypto.subtle.importKey(
        'jwk',
        { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
    );

    const assinaturaOk = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        chavePublica,
        base64UrlParaBytes(partes[2]),
        new TextEncoder().encode(partes[0] + '.' + partes[1])
    );
    if (!assinaturaOk) throw new Error('assinatura inválida');

    // Um token com assinatura boa mas de OUTRO projeto Firebase não vale aqui.
    const agora = Math.floor(Date.now() / 1000);
    const margem = 60; // tolera relógios levemente dessincronizados
    if (dados.aud !== PROJETO_FIREBASE) throw new Error('token de outro projeto');
    if (dados.iss !== `https://securetoken.google.com/${PROJETO_FIREBASE}`) throw new Error('emissor inválido');
    if (typeof dados.exp !== 'number' || dados.exp + margem < agora) throw new Error('token expirado');
    if (typeof dados.iat !== 'number' || dados.iat - margem > agora) throw new Error('token do futuro');
    if (!dados.sub) throw new Error('token sem usuário');

    return dados.sub;
}

function cabecalhosCors(origem) {
    const cabecalhos = {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
    if (origem && ORIGENS_PERMITIDAS.test(origem)) cabecalhos['Access-Control-Allow-Origin'] = origem;
    return cabecalhos;
}

function json(corpo, status, origem) {
    return new Response(JSON.stringify(corpo), {
        status,
        headers: { 'Content-Type': 'application/json', ...cabecalhosCors(origem) }
    });
}

export default {
    async fetch(request, env) {
        const origem = request.headers.get('Origin');

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cabecalhosCors(origem) });
        }
        if (request.method !== 'POST') {
            return json({ erro: 'Método não permitido' }, 405, origem);
        }

        // 1) Exige prova de login ANTES de qualquer coisa que custe dinheiro
        const autorizacao = request.headers.get('Authorization') || '';
        if (!autorizacao.startsWith('Bearer ')) {
            return json({ erro: 'Faça login no LyonPro Manager para usar a IA.' }, 401, origem);
        }
        let uid;
        try {
            uid = await validarTokenFirebase(autorizacao.slice(7).trim());
        } catch (e) {
            return json({ erro: 'Sessão inválida. Entre de novo no site.' }, 401, origem);
        }

        // 2) Limite por usuário, se o KV estiver configurado (opcional — ver README).
        //    Segura o caso de uma conta legítima ser usada para abusar da cota.
        if (env.LIMITE_IA) {
            const chave = `ia:${uid}:${Math.floor(Date.now() / 60000)}`; // janela de 1 minuto
            const usadas = parseInt(await env.LIMITE_IA.get(chave) || '0', 10);
            if (usadas >= 20) {
                return json({ erro: 'Muitas consultas à IA em pouco tempo. Espere um instante.' }, 429, origem);
            }
            await env.LIMITE_IA.put(chave, String(usadas + 1), { expirationTtl: 120 });
        }

        // 3) Corpo precisa ser o formato que o app manda — barra requisição malformada
        let corpo;
        try {
            corpo = await request.json();
        } catch (e) {
            return json({ erro: 'Corpo inválido' }, 400, origem);
        }
        if (!corpo || !Array.isArray(corpo.contents) || corpo.contents.length === 0) {
            return json({ erro: 'Formato de requisição inesperado' }, 400, origem);
        }

        // 4) Só agora a chave secreta é usada. Ela nunca sai daqui.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent?key=${env.GEMINI_API_KEY}`;
        const respostaGemini = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo)
        });

        return new Response(respostaGemini.body, {
            status: respostaGemini.status,
            headers: { 'Content-Type': 'application/json', ...cabecalhosCors(origem) }
        });
    }
};
