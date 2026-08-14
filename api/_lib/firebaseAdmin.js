// Reaproveita a mesma instância do Admin SDK entre chamadas (a função fica "quente" na Vercel).
// Credenciais vêm da variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON (o JSON da chave de
// conta de serviço, gerado em Configurações do projeto > Contas de serviço, no Firebase Console).
const admin = require('firebase-admin');

function getAdmin() {
    if (!admin.apps.length) {
        let credenciais = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({ credential: admin.credential.cert(credenciais) });
    }
    return admin;
}

module.exports = { getAdmin };
