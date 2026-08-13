const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');

admin.initializeApp();
const db = admin.firestore();

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const STRIPE_PRICE_BRL = defineSecret('STRIPE_PRICE_BRL');
const STRIPE_PRICE_USD = defineSecret('STRIPE_PRICE_USD');

// Ajustar se o domínio oficial mudar.
const SITE_URL = 'https://lyonpromanager.web.app';

// Cria (ou reaproveita) o Customer da Stripe vinculado a este usuário e devolve a URL do
// Checkout de assinatura — 'brl' habilita Pix + cartão (mercado brasileiro), 'usd' usa
// cartão internacional. O uid vai em client_reference_id e nos metadados da assinatura,
// pra o webhook conseguir achar o usuário sem depender do e-mail.
exports.criarSessaoCheckout = onCall(
    { secrets: [STRIPE_SECRET_KEY, STRIPE_PRICE_BRL, STRIPE_PRICE_USD] },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login antes de assinar.');
        let uid = request.auth.uid;
        let email = request.auth.token.email || '';
        let tipo = request.data && request.data.tipo === 'usd' ? 'usd' : 'brl';

        const stripe = Stripe(STRIPE_SECRET_KEY.value());
        let userRef = db.collection('usuarios').doc(uid);
        let userSnap = await userRef.get();
        let stripeCustomerId = userSnap.exists ? userSnap.data().stripeCustomerId : null;

        if (!stripeCustomerId) {
            let customer = await stripe.customers.create({ email, metadata: { uid } });
            stripeCustomerId = customer.id;
            await userRef.set({ stripeCustomerId }, { merge: true });
        }

        let priceId = tipo === 'usd' ? STRIPE_PRICE_USD.value() : STRIPE_PRICE_BRL.value();
        let paymentMethodTypes = tipo === 'usd' ? ['card'] : ['card', 'pix'];

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

        return { url: session.url };
    }
);

// Endpoint chamado pela Stripe (não pelo app) sempre que algo muda numa assinatura — mantém
// usuarios/{uid}.assinaturaStatus sincronizado com a verdade da Stripe. Precisa do corpo cru
// da requisição (req.rawBody) pra verificar a assinatura HMAC do webhook.
exports.webhookStripe = onRequest(
    { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
    async (req, res) => {
        const stripe = Stripe(STRIPE_SECRET_KEY.value());
        let evento;
        try {
            evento = stripe.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET.value());
        } catch (err) {
            console.error('Assinatura do webhook inválida:', err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

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

        res.json({ recebido: true });
    }
);
