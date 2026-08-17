// Testa worker/proxy-ia.js DE VERDADE: importa o módulo, monta um par de chaves RSA que
// imita o JWKS do Google, assina tokens (legítimos e maliciosos) com essas chaves, e chama
// o handler exportado como o Cloudflare faria. Não é simulação de lógica — é o código real
// rodando com Web Crypto de verdade.
// Node 20+ já expõe globalThis.crypto (Web Crypto) e globalThis.Response/Request nativamente.
globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
globalThis.btoa = (bin) => Buffer.from(bin, 'binary').toString('base64');

const PROJETO = 'lyonpromanager';
const KID = 'kid-de-teste-1';

function b64url(buf) {
    return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const par = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
);
const jwkPublica = await crypto.subtle.exportKey('jwk', par.publicKey);

// Um SEGUNDO par, usado pra simular um token forjado por um atacante (assinado com uma
// chave que o Google nunca publicou) — tem que ser rejeitado mesmo tendo o formato certo.
const parAtacante = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
);

async function assinarToken(payload, { chave = par.privateKey, kid = KID, alg = 'RS256' } = {}) {
    const cabecalho = { alg, kid, typ: 'JWT' };
    const cab64 = b64url(Buffer.from(JSON.stringify(cabecalho)));
    const pay64 = b64url(Buffer.from(JSON.stringify(payload)));
    const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, Buffer.from(`${cab64}.${pay64}`));
    return `${cab64}.${pay64}.${b64url(assinatura)}`;
}

function payloadValido(extra = {}) {
    const agora = Math.floor(Date.now() / 1000);
    return { aud: PROJETO, iss: `https://securetoken.google.com/${PROJETO}`, sub: 'uid-jogador-1', iat: agora - 5, exp: agora + 3600, ...extra };
}

// Mocka o fetch global: chamadas ao endpoint do Gemini são interceptadas (não bate na rede
// de verdade — nem precisa, nem deve gastar cota); chamada ao JWKS do Google devolve o
// par de chaves que geramos aqui.
let chamouGemini = 0;
globalThis.fetch = async (url, opts) => {
    url = String(url);
    if (url.includes('googleapis.com/service_accounts')) {
        return new Response(JSON.stringify({ keys: [{ ...jwkPublica, kid: KID }] }), { headers: { 'cache-control': 'max-age=3600' } });
    }
    if (url.includes('generativelanguage.googleapis.com')) {
        chamouGemini++;
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
    }
    throw new Error('fetch inesperado para ' + url);
};

const worker = (await import(new URL('../worker/proxy-ia.js', import.meta.url))).default;
const ORIGEM_OK = 'https://lyonpromanager.web.app';
const ENV = { GEMINI_API_KEY: 'chave-fake-nunca-deveria-vazar' };

function req(token, origem = ORIGEM_OK, corpo = { contents: [{ parts: [{ text: 'oi' }] }] }) {
    const headers = { 'Content-Type': 'application/json' };
    if (origem) headers['Origin'] = origem;
    if (token !== null) headers['Authorization'] = 'Bearer ' + token;
    return new Request('https://worker.exemplo/', { method: 'POST', headers, body: JSON.stringify(corpo) });
}

let falhas = 0, checks = 0;
async function verificar(desc, promessa, statusEsperado) {
    checks++;
    try {
        const resp = await promessa;
        const corpo = await resp.clone().text();
        if (resp.status === statusEsperado) console.log('  ✅', desc, `(HTTP ${resp.status})`);
        else { falhas++; console.log('  ❌', desc, `→ esperado ${statusEsperado}, veio ${resp.status}: ${corpo.slice(0, 150)}`); }
        return resp;
    } catch (e) {
        falhas++; console.log('  ❌', desc, '→ lançou:', e.message);
    }
}

console.log('=== O curl exato que o usuário tentou colar no console (agora em JS) ===');
{
    // É isto que a pessoa deveria rodar no DevTools em vez do curl — confirma que o app real
    // vai anexar o Authorization automaticamente via chamarIA(), não que o usuário precise
    // montar isso à mão.
    const tokenValido = await assinarToken(payloadValido());
    const resp = await fetch('https://worker.exemplo/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenValido }, body: JSON.stringify({ contents: [{ parts: [{ text: 'oi' }] }] }) }).catch(() => null);
    console.log('  (demonstração — o teste de verdade está abaixo, chamando o handler exportado)');
}

console.log('\n=== Sem token: acesso negado antes de gastar a chave ===');
chamouGemini = 0;
await verificar('sem header Authorization', worker.fetch(req(null), ENV), 401);
await verificar('token vazio', worker.fetch(req(''), ENV), 401);
if (chamouGemini === 0) console.log('  ✅ confirmação: nenhuma chamada ao Gemini foi feita sem autenticação');
else { falhas++; console.log('  ❌ CHAMOU O GEMINI SEM AUTENTICAÇÃO'); }

console.log('\n=== Ataques clássicos de JWT ===');
{
    const semAssinatura = payloadValido();
    const cab64 = b64url(Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })));
    const pay64 = b64url(Buffer.from(JSON.stringify(semAssinatura)));
    await verificar('alg:none (token "assinado" com nada) é rejeitado', worker.fetch(req(`${cab64}.${pay64}.`), ENV), 401);

    const tokenAtacante = await assinarToken(payloadValido(), { chave: parAtacante.privateKey });
    await verificar('token assinado com OUTRA chave (kid do Google, assinatura forjada) é rejeitado', worker.fetch(req(tokenAtacante), ENV), 401);

    const tokenValido = await assinarToken(payloadValido());
    const partes = tokenValido.split('.');
    const payloadAdulterado = b64url(Buffer.from(JSON.stringify(payloadValido({ sub: 'uid-outra-pessoa' }))));
    await verificar('payload trocado depois de assinado (assinatura não bate mais) é rejeitado',
        worker.fetch(req(`${partes[0]}.${payloadAdulterado}.${partes[2]}`), ENV), 401);

    await verificar('token com kid desconhecido é rejeitado', worker.fetch(req(await assinarToken(payloadValido(), { kid: 'kid-nunca-existiu' })), ENV), 401);
    await verificar('token mal formado (não é JWT) é rejeitado', worker.fetch(req('isso.nao.eh.um.jwt'), ENV), 401);
}

console.log('\n=== Reivindicações do token ===');
await verificar('token expirado é rejeitado', worker.fetch(req(await assinarToken(payloadValido({ exp: Math.floor(Date.now() / 1000) - 3600 }))), ENV), 401);
await verificar('token de OUTRO projeto Firebase (aud errado) é rejeitado', worker.fetch(req(await assinarToken(payloadValido({ aud: 'projeto-de-outro-app' }))), ENV), 401);
await verificar('emissor (iss) errado é rejeitado', worker.fetch(req(await assinarToken(payloadValido({ iss: 'https://securetoken.google.com/outro-projeto' }))), ENV), 401);
await verificar('token sem "sub" (uid) é rejeitado', worker.fetch(req(await assinarToken({ aud: PROJETO, iss: `https://securetoken.google.com/${PROJETO}`, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 })), ENV), 401);

console.log('\n=== Token de verdade: o fluxo legítimo funciona ===');
chamouGemini = 0;
await verificar('token válido, origem correta → passa', worker.fetch(req(await assinarToken(payloadValido())), ENV), 200);
if (chamouGemini === 1) console.log('  ✅ o Gemini foi chamado exatamente 1 vez, como esperado');
else { falhas++; console.log('  ❌ número de chamadas ao Gemini inesperado:', chamouGemini); }

console.log('\n=== Robustez de entrada ===');
await verificar('corpo que não é JSON é rejeitado', worker.fetch(new Request('https://worker.exemplo/', { method: 'POST', headers: { Authorization: 'Bearer ' + await assinarToken(payloadValido()), Origin: ORIGEM_OK }, body: 'isto não é json{{{' }), ENV), 400);
await verificar('corpo sem "contents" é rejeitado', worker.fetch(req(await assinarToken(payloadValido()), ORIGEM_OK, { bobagem: true }), ENV), 400);
await verificar('método GET é rejeitado', worker.fetch(new Request('https://worker.exemplo/', { method: 'GET' }), ENV), 405);

console.log('\n=== CORS ===');
{
    const tokenValido = await assinarToken(payloadValido());
    const respBoa = await worker.fetch(req(tokenValido, ORIGEM_OK), ENV);
    checks++;
    if (respBoa.headers.get('Access-Control-Allow-Origin') === ORIGEM_OK) console.log('  ✅ origem oficial recebe Access-Control-Allow-Origin');
    else { falhas++; console.log('  ❌ CORS da origem oficial:', respBoa.headers.get('Access-Control-Allow-Origin')); }

    const respMa = await worker.fetch(req(tokenValido, 'https://site-malicioso.exemplo'), ENV);
    checks++;
    if (!respMa.headers.get('Access-Control-Allow-Origin')) console.log('  ✅ origem estranha NÃO recebe o cabeçalho de CORS (o navegador bloqueia a leitura)');
    else { falhas++; console.log('  ❌ origem estranha recebeu CORS:', respMa.headers.get('Access-Control-Allow-Origin')); }
}

console.log('\n=== A chave da API nunca aparece na resposta ===');
{
    const tokenValido = await assinarToken(payloadValido());
    const resp = await worker.fetch(req(tokenValido), ENV);
    const texto = await resp.text();
    checks++;
    if (!texto.includes(ENV.GEMINI_API_KEY)) console.log('  ✅ a chave secreta não vaza em nenhuma resposta (sucesso ou erro)');
    else { falhas++; console.log('  ❌ A CHAVE VAZOU NA RESPOSTA'); }
}

console.log(`\n${checks - falhas}/${checks} verificações passaram.`);
process.exit(falhas > 0 ? 1 : 0);
