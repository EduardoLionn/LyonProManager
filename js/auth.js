// ============================================================
// LOGIN / REGISTRO (Firebase Authentication) — trava o app inteiro atrás de uma
// conta antes de deixar carregarDados() rodar. Pagamento fica pra depois; por
// enquanto isso só garante que cada jogador tem uma conta (e-mail/senha ou Google).
// ============================================================

let _authEmProgresso = false;

function iniciarAuthGate() {
    document.getElementById('tela-login').style.display = 'flex';
    if (typeof firebase === 'undefined' || !firebase.auth) {
        document.getElementById('auth-carregando').innerHTML = '⚠️ Não foi possível carregar o sistema de login (Firebase). Verifique sua internet ou desative bloqueadores de script (ex: Brave Shields / adblock) para este site e recarregue a página.';
        return;
    }
    try {
        // Força persistência em localStorage (em vez de IndexedDB) — navegadores com proteções
        // agressivas contra rastreamento (ex: Brave Shields) às vezes bloqueiam/isolam IndexedDB
        // entre a ida e a volta do redirecionamento do Google, perdendo a sessão no meio do caminho.
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function (e) { console.error('Erro ao definir persistência:', e); });

        // Resultado de um login com Google via redirecionamento (ver authGoogle) — se der erro
        // (ex: domínio não autorizado no console do Firebase), mostra assim que a página volta.
        firebase.auth().getRedirectResult().catch(_authMostrarErro);

        firebase.auth().onAuthStateChanged(async function (user) {
            if (user) {
                // Quem se cadastrou com e-mail/senha e ainda não confirmou o e-mail fica travado
                // numa tela própria — não entra no jogo até clicar no link e voltar aqui pra
                // confirmar. Login com Google já chega verificado, então nunca cai nesse bloqueio.
                let logouPorSenha = (user.providerData || []).some(p => p.providerId === 'password');
                if (logouPorSenha && !user.emailVerified) {
                    document.getElementById('auth-carregando').style.display = 'none';
                    document.getElementById('auth-form-box').style.display = 'none';
                    document.getElementById('auth-verificacao-obrigatoria').style.display = 'block';
                    document.getElementById('auth-verificacao-email-destino').innerText = user.email || '';
                    document.getElementById('tela-login').style.display = 'flex';
                    return;
                }
                document.getElementById('auth-verificacao-obrigatoria').style.display = 'none';
                await _authDestravarApp(user);
            } else {
                window._authUidAtual = null;
                document.getElementById('auth-carregando').style.display = 'none';
                document.getElementById('auth-verificacao-obrigatoria').style.display = 'none';
                document.getElementById('auth-form-box').style.display = 'block';
            }
        });
    } catch (e) {
        document.getElementById('auth-carregando').innerHTML = '⚠️ Não foi possível carregar o sistema de login. Verifique sua internet ou desative bloqueadores de script (ex: Brave Shields / adblock) para este site e recarregue a página.';
    }
}

// Sincroniza os saves da nuvem e libera o app de fato — chamada tanto pelo fluxo normal de
// login (onAuthStateChanged) quanto por "Já verifiquei, continuar" na tela de bloqueio.
async function _authDestravarApp(user) {
    document.getElementById('auth-carregando').innerText = '⏳ Sincronizando seus saves...';
    document.getElementById('auth-carregando').style.display = 'block';
    document.getElementById('auth-form-box').style.display = 'none';
    window._authUidAtual = user.uid;
    if (typeof sincronizarSavesComNuvem === 'function') {
        try { await sincronizarSavesComNuvem(user.uid); } catch (e) { console.error('Erro ao sincronizar saves com a nuvem:', e); }
    }
    document.getElementById('auth-carregando').style.display = 'none';
    document.getElementById('tela-login').style.display = 'none';
    let nomeExibido = user.displayName || user.email || '';
    document.getElementById('auth-usuario-email-sidebar').innerText = nomeExibido;
    document.getElementById('auth-usuario-email-hero').innerText = nomeExibido;
    carregarDados();
}

// Botão "Já verifiquei, continuar" na tela de bloqueio — o objeto `user` local só reflete o que
// era verdade no login, então precisa de user.reload() pra buscar o emailVerified atualizado.
let _authRecheckEmProgresso = false;
async function authRecheckVerificacao() {
    let user = firebase.auth().currentUser;
    if (!user || _authRecheckEmProgresso) return;
    _authRecheckEmProgresso = true;
    let btn = document.getElementById('auth-btn-ja-verifiquei');
    let msgEl = document.getElementById('auth-verificacao-msg');
    btn.disabled = true;
    msgEl.innerText = '';
    try {
        await user.reload();
        user = firebase.auth().currentUser;
        if (user.emailVerified) {
            document.getElementById('auth-verificacao-obrigatoria').style.display = 'none';
            await _authDestravarApp(user);
        } else {
            msgEl.innerText = 'Ainda não confirmado. Verifique sua caixa de entrada (e o spam) e clique no link antes de tentar de novo.';
        }
    } catch (e) {
        console.error('Erro ao checar verificação de e-mail:', e);
        msgEl.innerText = 'Não foi possível checar agora. Tente de novo em instantes.';
    } finally {
        btn.disabled = false;
        _authRecheckEmProgresso = false;
    }
}

function authAlternarModo(modo) {
    document.getElementById('auth-erro').innerText = '';
    let ehRegistro = modo === 'registro';
    document.getElementById('auth-titulo').innerText = ehRegistro ? 'Criar Conta' : 'Entrar';
    document.getElementById('auth-campo-apelido').style.display = ehRegistro ? 'block' : 'none';
    document.getElementById('auth-campo-confirmar').style.display = ehRegistro ? 'block' : 'none';
    document.getElementById('auth-btn-principal').innerText = ehRegistro ? 'Criar Conta' : 'Entrar';
    document.getElementById('auth-btn-principal').setAttribute('onclick', ehRegistro ? 'authRegistrar()' : 'authEntrar()');
    document.getElementById('auth-link-login').style.display = ehRegistro ? 'block' : 'none';
    document.getElementById('auth-link-registro').style.display = ehRegistro ? 'none' : 'block';
    document.getElementById('auth-link-esqueci-senha').style.display = ehRegistro ? 'none' : 'block';
}

function _authSetCarregando(carregando) {
    _authEmProgresso = carregando;
    document.getElementById('auth-btn-principal').disabled = carregando;
    document.getElementById('auth-btn-google').disabled = carregando;
}

function _authMostrarErro(err) {
    console.error('Erro de autenticação:', err);
    let msg = traduzirErroFirebase(err);
    if (err && err.code) msg += ` (${err.code})`;
    document.getElementById('auth-erro').style.color = 'var(--warning)';
    document.getElementById('auth-erro').innerText = msg;
}

function authEntrar() {
    if (_authEmProgresso) return;
    let email = document.getElementById('auth-email').value.trim();
    let senha = document.getElementById('auth-senha').value;
    if (!email || !senha) { _authMostrarErro({ code: 'campos-vazios' }); return; }
    document.getElementById('auth-erro').innerText = '';
    _authSetCarregando(true);
    firebase.auth().signInWithEmailAndPassword(email, senha)
        .catch(_authMostrarErro)
        .finally(() => _authSetCarregando(false));
}

function authRegistrar() {
    if (_authEmProgresso) return;
    let email = document.getElementById('auth-email').value.trim();
    let senha = document.getElementById('auth-senha').value;
    let apelido = document.getElementById('auth-apelido').value.trim();
    let confirmar = document.getElementById('auth-confirmar-senha').value;
    if (!email || !senha) { _authMostrarErro({ code: 'campos-vazios' }); return; }
    if (!apelido) { _authMostrarErro({ code: 'apelido-vazio' }); return; }
    if (senha.length < 6) { _authMostrarErro({ code: 'auth/weak-password' }); return; }
    if (senha !== confirmar) { _authMostrarErro({ code: 'senhas-diferentes' }); return; }
    document.getElementById('auth-erro').innerText = '';
    _authSetCarregando(true);
    firebase.auth().createUserWithEmailAndPassword(email, senha)
        .then(cred => Promise.all([
            cred.user.updateProfile({ displayName: apelido }),
            cred.user.sendEmailVerification().catch(e => console.error('Erro ao enviar e-mail de verificação:', e))
        ]))
        .catch(_authMostrarErro)
        .finally(() => _authSetCarregando(false));
}

let _authReenvioEmProgresso = false;
function authReenviarVerificacao() {
    let user = firebase.auth().currentUser;
    if (!user || _authReenvioEmProgresso) return;
    _authReenvioEmProgresso = true;
    let link = document.getElementById('auth-link-reenviar-verificacao');
    let textoOriginal = link.innerText;
    user.sendEmailVerification()
        .then(() => { link.innerText = 'E-mail enviado! Confira sua caixa de entrada.'; })
        .catch(err => { console.error('Erro ao reenviar verificação:', err); link.innerText = 'Não foi possível enviar. Tente de novo mais tarde.'; })
        .finally(() => {
            setTimeout(() => { link.innerText = textoOriginal; _authReenvioEmProgresso = false; }, 15000);
        });
}

function authEsqueciSenha() {
    if (_authEmProgresso) return;
    let email = document.getElementById('auth-email').value.trim();
    if (!email) { _authMostrarErro({ code: 'email-vazio' }); return; }
    document.getElementById('auth-erro').innerText = '';
    _authSetCarregando(true);
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            document.getElementById('auth-erro').style.color = 'var(--success, #4caf50)';
            document.getElementById('auth-erro').innerText = 'Enviamos um link para redefinir sua senha em ' + email + '.';
        })
        .catch(_authMostrarErro)
        .finally(() => _authSetCarregando(false));
}

function authGoogle() {
    if (_authEmProgresso) return;
    document.getElementById('auth-erro').innerText = '';
    _authSetCarregando(true);
    let provider = new firebase.auth.GoogleAuthProvider();
    // Popup em vez de redirecionamento: o redirecionamento depende do sessionStorage sobreviver
    // à ida-e-volta pro Google, o que quebra em navegadores móveis com armazenamento particionado
    // ou quando o usuário troca de "site mobile" pra "site desktop" no meio do fluxo (erro "missing
    // initial state"). O popup não tem esse problema — e agora que o site está no Firebase Hosting
    // (não mais no GitHub Pages), não há mais o cabeçalho COOP que quebrava popups antes.
    firebase.auth().signInWithPopup(provider)
        .then(result => _authPedirApelidoSeNovo(result))
        .catch(err => {
            // Popup bloqueado pelo navegador, ou ambiente que não suporta popup (ex: alguns
            // navegadores in-app) — cai pro redirecionamento como última alternativa.
            if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
                firebase.auth().signInWithRedirect(provider).catch(err2 => { _authMostrarErro(err2); _authSetCarregando(false); });
                return;
            }
            _authMostrarErro(err);
            _authSetCarregando(false);
        });
}

// Primeiro login (registro ou Google): pergunta o apelido, mesmo que o Google já tenha um nome —
// o jogador pode querer ser chamado de outro jeito dentro do jogo.
async function _authPedirApelidoSeNovo(result) {
    let ehNovo = result && result.additionalUserInfo && result.additionalUserInfo.isNewUser;
    if (!ehNovo || typeof promptModerno !== 'function') return;
    let apelido = await promptModerno('Como você quer ser chamado no jogo?', result.user.displayName || '', 'Bem-vindo(a) ao LyonPro Manager!');
    if (apelido && apelido.trim()) {
        await result.user.updateProfile({ displayName: apelido.trim() });
        let nomeExibido = apelido.trim();
        let elSidebar = document.getElementById('auth-usuario-email-sidebar');
        let elHero = document.getElementById('auth-usuario-email-hero');
        if (elSidebar) elSidebar.innerText = nomeExibido;
        if (elHero) elHero.innerText = nomeExibido;
    }
}

function authLogout() {
    firebase.auth().signOut().then(() => location.reload());
}

function traduzirErroFirebase(err) {
    let mapa = {
        'campos-vazios': 'Preencha e-mail e senha.',
        'email-vazio': 'Informe seu e-mail para redefinir a senha.',
        'apelido-vazio': 'Informe um apelido.',
        'senhas-diferentes': 'As senhas não coincidem.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/user-disabled': 'Esta conta foi desativada.',
        'auth/user-not-found': 'Não existe conta com esse e-mail.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Tente entrar.',
        'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
        'auth/popup-closed-by-user': 'Login com Google cancelado.',
        'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
    };
    return mapa[err && err.code] || 'Não foi possível concluir. Tente novamente.';
}
