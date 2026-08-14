const Stripe = require('stripe');
const { getAdmin } = require('./_lib/firebaseAdmin');
const { aplicarCors } = require('./_lib/cors');

// Ajustar se o domínio oficial mudar.
const SITE_URL = 'https://lyonpromanager.web.app';

// Cria (ou reaproveita) o Customer da Stripe vinculado a este usuário e devolve a URL do
// Checkout de assinatura — 'brl' habilita Pix + cartão (mercado brasileiro), 'usd' usa cartão
// internacional. O uid vai em client_reference_id e nos metadados da assinatura, pra o webhook
// conseguir achar o usuário sem depender do e-mail.
module.exports = async function handler(req, res) {
    aplicarCors(req, res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido' }); return; }

    let tokenHeader = req.headers.authorization || '';
    let idToken = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7) : null;
    if (!idToken) { res.status(401).json({ erro: 'Faça login antes de assinar.' }); return; }

    const admin = getAdmin();
    let usuario;
    try {
        usuario = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
        res.status(401).json({ erro: 'Sessão inválida, faça login novamente.' });
        return;
    }

    let uid = usuario.uid;
    let email = usuario.email || '';
    let tipo = req.body && req.body.tipo === 'usd' ? 'usd' : 'brl';

    try {
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
        const db = admin.firestore();
        let userRef = db.collection('usuarios').doc(uid);
        let userSnap = await userRef.get();
        let stripeCustomerId = userSnap.exists ? userSnap.data().stripeCustomerId : null;

        // O ID salvo pode ter ficado orfão (ex: conta trocou de modo Teste pra Produção, que têm
        // clientes completamente separados na Stripe) — confirma que ele ainda existe antes de
        // reaproveitar, senão cria um novo em vez de quebrar o checkout.
        if (stripeCustomerId) {
            try { await stripe.customers.retrieve(stripeCustomerId); } catch (e) { stripeCustomerId = null; }
        }
        if (!stripeCustomerId) {
            let customer = await stripe.customers.create({ email, metadata: { uid } });
            stripeCustomerId = customer.id;
            await userRef.set({ stripeCustomerId }, { merge: true });
        }

        let priceId = tipo === 'usd' ? process.env.STRIPE_PRICE_USD : process.env.STRIPE_PRICE_BRL;
        // Pix fica de fora até a conta Stripe sair do modo "área restrita" (ativação pendente) —
        // até lá, a Stripe rejeita esse tipo de pagamento. Reativar assim que a conta liberar:
        // paymentMethodTypes = tipo === 'usd' ? ['card'] : ['card', 'pix', 'boleto'];
        let paymentMethodTypes = tipo === 'usd' ? ['card'] : ['card', 'boleto'];

        let session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            client_reference_id: uid,
            payment_method_types: paymentMethodTypes,
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: { metadata: { uid } },
            success_url: `${SITE_URL}/?checkout=sucesso`,
            cancel_url: `${SITE_URL}/?checkout=cancelado`,
        });

        res.status(200).json({ url: session.url });
    } catch (e) {
        console.error('Erro ao criar sessão de checkout:', e);
        res.status(500).json({ erro: 'Não foi possível iniciar o pagamento.' });
    }
};
