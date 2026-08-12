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
        firebase.auth().onAuthStateChanged(function (user) {
            document.getElementById('auth-carregando').style.display = 'none';
            if (user) {
                document.getElementById('tela-login').style.display = 'none';
                document.getElementById('auth-usuario-email').innerText = user.email || '';
                carregarDados();
            } else {
                document.getElementById('auth-form-box').style.display = 'block';
            }
        });
    } catch (e) {
        document.getElementById('auth-carregando').innerHTML = '⚠️ Não foi possível carregar o sistema de login. Verifique sua internet ou desative bloqueadores de script (ex: Brave Shields / adblock) para este site e recarregue a página.';
    }
}

function authAlternarModo(modo) {
    document.getElementById('auth-erro').innerText = '';
    let ehRegistro = modo === 'registro';
    document.getElementById('auth-titulo').innerText = ehRegistro ? 'Criar Conta' : 'Entrar';
    document.getElementById('auth-campo-confirmar').style.display = ehRegistro ? 'block' : 'none';
    document.getElementById('auth-btn-principal').innerText = ehRegistro ? 'Criar Conta' : 'Entrar';
    document.getElementById('auth-btn-principal').setAttribute('onclick', ehRegistro ? 'authRegistrar()' : 'authEntrar()');
    document.getElementById('auth-link-login').style.display = ehRegistro ? 'block' : 'none';
    document.getElementById('auth-link-registro').style.display = ehRegistro ? 'none' : 'block';
}

function _authSetCarregando(carregando) {
    _authEmProgresso = carregando;
    document.getElementById('auth-btn-principal').disabled = carregando;
    document.getElementById('auth-btn-google').disabled = carregando;
}

function _authMostrarErro(err) {
    document.getElementById('auth-erro').innerText = traduzirErroFirebase(err);
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
    let confirmar = document.getElementById('auth-confirmar-senha').value;
    if (!email || !senha) { _authMostrarErro({ code: 'campos-vazios' }); return; }
    if (senha.length < 6) { _authMostrarErro({ code: 'auth/weak-password' }); return; }
    if (senha !== confirmar) { _authMostrarErro({ code: 'senhas-diferentes' }); return; }
    document.getElementById('auth-erro').innerText = '';
    _authSetCarregando(true);
    firebase.auth().createUserWithEmailAndPassword(email, senha)
        .catch(_authMostrarErro)
        .finally(() => _authSetCarregando(false));
}

function authGoogle() {
    if (_authEmProgresso) return;
    document.getElementById('auth-erro').innerText = '';
    _authSetCarregando(true);
    let provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .catch(_authMostrarErro)
        .finally(() => _authSetCarregando(false));
}

function authLogout() {
    firebase.auth().signOut().then(() => location.reload());
}

function traduzirErroFirebase(err) {
    let mapa = {
        'campos-vazios': 'Preencha e-mail e senha.',
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
