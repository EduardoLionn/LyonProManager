const Stripe = require('stripe');
const { getAdmin } = require('./_lib/firebaseAdmin');

function lerCorpoCru(req) {
    return new Promise((resolve, reject) => {
        let pedacos = [];
        req.on('data', chunk => pedacos.push(chunk));
        req.on('end', () => resolve(Buffer.concat(pedacos)));
        req.on('error', reject);
    });
}

// Endpoint chamado pela Stripe (não pelo app) sempre que algo muda numa assinatura — mantém
// usuarios/{uid}.assinaturaStatus sincronizado com a verdade da Stripe.
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).end(); return; }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    let corpoCru = await lerCorpoCru(req);
    let evento;
    try {
        evento = stripe.webhooks.constructEvent(corpoCru, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Assinatura do webhook inválida:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    const admin = getAdmin();
    const db = admin.firestore();
    async function atualizarStatusPorUid(uid, status) {
        if (!uid) return;
        await db.collection('usuarios').doc(uid).set({ assinaturaStatus: status, assinaturaAtualizadaEm: Date.now() }, { merge: true });
    }

    switch (evento.type) {
        case 'checkout.session.completed': {
            let session = evento.data.object;
            await atualizarStatusPorUid(session.client_reference_id, 'ativa');
            break;
        }
        case 'customer.subscription.updated': {
            let sub = evento.data.object;
            let status = (sub.status === 'active' || sub.status === 'trialing') ? 'ativa' : 'inativa';
            await atualizarStatusPorUid(sub.metadata && sub.metadata.uid, status);
            break;
        }
        case 'customer.subscription.deleted': {
            let sub = evento.data.object;
            await atualizarStatusPorUid(sub.metadata && sub.metadata.uid, 'cancelada');
            break;
        }
    }

    res.status(200).json({ recebido: true });
};

// A Stripe precisa do corpo cru (sem o Vercel já ter transformado em JSON) pra validar a
// assinatura HMAC do webhook — por isso o bodyParser fica desligado aqui.
module.exports.config = { api: { bodyParser: false } };
