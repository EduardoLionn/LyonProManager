const Stripe = require('stripe');
const { getAdmin } = require('./_lib/firebaseAdmin');
const { aplicarCors } = require('./_lib/cors');

// Ajustar se o domínio oficial mudar.
const SITE_URL = 'https://lyonpromanager.web.app';

// Devolve a URL do Customer Portal da Stripe — página hospedada pela própria Stripe onde o
// usuário cancela a assinatura, troca o cartão e vê faturas, sem a gente ter que construir nada
// disso na mão. Pré-requisito: o Customer Portal precisa estar ativado (com "Cancel
// subscriptions" habilitado) nas configurações de Billing do Dashboard da Stripe — em Teste e em
// Produção separadamente, já que são configurações independentes por modo.
module.exports = async function handler(req, res) {
    aplicarCors(req, res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido' }); return; }

    let tokenHeader = req.headers.authorization || '';
    let idToken = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7) : null;
    if (!idToken) { res.status(401).json({ erro: 'Faça login antes de gerenciar sua assinatura.' }); return; }

    const admin = getAdmin();
    let usuario;
    try {
        usuario = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
        res.status(401).json({ erro: 'Sessão inválida, faça login novamente.' });
        return;
    }

    let uid = usuario.uid;

    try {
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
        const db = admin.firestore();
        let userSnap = await db.collection('usuarios').doc(uid).get();
        let stripeCustomerId = userSnap.exists ? userSnap.data().stripeCustomerId : null;

        if (!stripeCustomerId) {
            res.status(400).json({ erro: 'Nenhuma assinatura encontrada pra essa conta ainda.' });
            return;
        }

        let session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${SITE_URL}/`,
        });

        res.status(200).json({ url: session.url });
    } catch (e) {
        console.error('Erro ao criar sessão do portal de assinatura:', e);
        res.status(500).json({ erro: 'Não foi possível abrir o gerenciamento de assinatura.' });
    }
};
