// ============================================================
// CONFIGURAÇÃO DO FIREBASE — troque os valores abaixo pelos do SEU projeto.
//
// Como pegar esses valores:
// 1. Acesse https://console.firebase.google.com e crie um projeto (gratuito).
// 2. No menu lateral, vá em "Build" > "Authentication" > aba "Sign-in method" e
//    ative os provedores "E-mail/senha" e "Google".
// 3. Ainda no console, vá em "Configurações do projeto" (ícone de engrenagem) >
//    aba "Geral" > role até "Seus apps" > clique no ícone "</>" (Web) pra
//    registrar um app da Web. Ele vai te mostrar um objeto firebaseConfig —
//    copie os valores dele pra cá.
// 4. Em "Authentication" > "Settings" > "Authorized domains", adicione o domínio
//    onde o site fica hospedado (ex: seu-usuario.github.io), senão o login com
//    Google não funciona fora do localhost.
// ============================================================
const firebaseConfig = {
    apiKey: "SUBSTITUA_AQUI",
    authDomain: "SUBSTITUA_AQUI.firebaseapp.com",
    projectId: "SUBSTITUA_AQUI",
    storageBucket: "SUBSTITUA_AQUI.appspot.com",
    messagingSenderId: "SUBSTITUA_AQUI",
    appId: "SUBSTITUA_AQUI"
};

firebase.initializeApp(firebaseConfig);
