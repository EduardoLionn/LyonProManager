// ============================================================
// ASSINATURA (Stripe via API na Vercel) — depois que o e-mail é confirmado, o app fica travado
// na tela de pagamento (#auth-paywall, ver auth.js/_authDestravarApp) até
// usuarios/{uid}.assinaturaStatus virar "ativa" no Firestore, o que só o webhook da Stripe
// (api/webhook-stripe.js) escreve depois de um pagamento confirmado.
// ============================================================

// Preenchido com a URL real depois que o projeto for publicado na Vercel (ex:
// 'https://lyonpromanager-api.vercel.app').
const LYONPRO_API_BASE = 'https://SUBSTITUIR-PELA-URL-DA-VERCEL.vercel.app';

async function _authAssinaturaEstaAtiva(uid) {
    if (typeof firebase === 'undefined' || !firebase.firestore) return false;
    let snap = await firebase.firestore().collection('usuarios').doc(uid).get();
    return snap.exists && snap.data().assinaturaStatus === 'ativa';
}

// 'brl' -> Pix + cartão (mercado brasileiro), 'usd' -> cartão internacional.
async function abrirCheckout(tipo) {
    let user = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth().currentUser : null;
    if (!user) return;
    let btnBrl = document.getElementById('auth-btn-assinar-brl');
    let btnUsd = document.getElementById('auth-btn-assinar-usd');
    let msgEl = document.getElementById('auth-paywall-msg');
    msgEl.style.color = 'var(--warning)';
    msgEl.innerText = '';
    btnBrl.disabled = true;
    btnUsd.disabled = true;
    try {
        let idToken = await user.getIdToken();
        let resposta = await fetch(`${LYONPRO_API_BASE}/api/criar-sessao-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
            body: JSON.stringify({ tipo })
        });
        if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
        let dados = await resposta.json();
        window.location.href = dados.url;
    } catch (err) {
        console.error('Erro ao abrir checkout:', err);
        msgEl.innerText = 'Não foi possível iniciar o pagamento. Tente novamente em instantes.';
        btnBrl.disabled = false;
        btnUsd.disabled = false;
    }
}

// Depois que a Stripe redireciona de volta com ?checkout=sucesso, o webhook pode levar alguns
// segundos pra confirmar — em vez de deixar o jogador preso, tenta de novo por um tempinho.
async function _authAguardarConfirmacaoPagamento(uid) {
    let msgEl = document.getElementById('auth-paywall-msg');
    msgEl.style.color = 'var(--text-muted)';
    msgEl.innerText = 'Confirmando seu pagamento...';
    for (let tentativa = 0; tentativa < 8; tentativa++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        let ativa = await _authAssinaturaEstaAtiva(uid).catch(() => false);
        if (ativa) {
            history.replaceState(null, '', location.pathname);
            let user = firebase.auth().currentUser;
            document.getElementById('auth-paywall').style.display = 'none';
            await _authDestravarApp(user);
            return;
        }
    }
    msgEl.innerText = 'Ainda confirmando... isso pode levar alguns segundos. Clique em "Já assinei, verificar novamente" em instantes.';
}

let _authRecheckAssinaturaEmProgresso = false;
async function authRecheckAssinatura() {
    if (_authRecheckAssinaturaEmProgresso) return;
    let user = firebase.auth().currentUser;
    if (!user) return;
    _authRecheckAssinaturaEmProgresso = true;
    let link = document.getElementById('auth-link-recheck-assinatura');
    let msgEl = document.getElementById('auth-paywall-msg');
    let textoOriginal = link.innerText;
    link.innerText = 'Verificando...';
    try {
        let ativa = await _authAssinaturaEstaAtiva(user.uid);
        if (ativa) {
            document.getElementById('auth-paywall').style.display = 'none';
            await _authDestravarApp(user);
        } else {
            msgEl.style.color = 'var(--warning)';
            msgEl.innerText = 'Ainda não identificamos sua assinatura. Se você acabou de pagar, aguarde alguns segundos e tente de novo.';
        }
    } catch (e) {
        console.error('Erro ao checar assinatura:', e);
        msgEl.style.color = 'var(--warning)';
        msgEl.innerText = 'Não foi possível checar agora. Tente de novo em instantes.';
    } finally {
        link.innerText = textoOriginal;
        _authRecheckAssinaturaEmProgresso = false;
    }
}
