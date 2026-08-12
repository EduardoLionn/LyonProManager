// ============================================================
// CONFIGURAÇÃO DO FIREBASE — projeto "lyonpromanager".
//
// Lembrete: em "Authentication" > "Settings" > "Authorized domains" no console
// do Firebase, o domínio onde este site fica hospedado precisa estar na lista,
// senão o "Entrar com Google" não funciona fora do localhost.
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyCmFDsGDA3yk3E0_UJl5QD9kZh-dF1foY",
    authDomain: "lyonpromanager.firebaseapp.com",
    projectId: "lyonpromanager",
    storageBucket: "lyonpromanager.firebasestorage.app",
    messagingSenderId: "1034766493327",
    appId: "1:1034766493327:web:b322680ed23c30023132fa",
    measurementId: "G-LCKLX1MQQD"
};

firebase.initializeApp(firebaseConfig);
