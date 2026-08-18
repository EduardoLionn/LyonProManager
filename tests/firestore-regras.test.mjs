// Testa firestore.rules DE VERDADE contra o emulador do Firestore.
// Cobre: o bypass do paywall que existia, isolamento entre contas e o fluxo legítimo do app.
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

let falhas = 0, checks = 0;
async function verificar(desc, promessa, deveriaPassar) {
    checks++;
    try {
        await (deveriaPassar ? assertSucceeds(promessa) : assertFails(promessa));
        console.log('  ✅', desc);
    } catch (e) {
        falhas++;
        console.log('  ❌', desc, '→', String(e.message || e).slice(0, 120));
    }
}

const env = await initializeTestEnvironment({
    projectId: 'demo-teste',
    firestore: { host: '127.0.0.1', port: 8181, rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') }
});

const ana = env.authenticatedContext('uid-ana').firestore();
const bruno = env.authenticatedContext('uid-bruno').firestore();
const anonimo = env.unauthenticatedContext().firestore();

// Semeia dados como admin (ignora as regras, igual ao Admin SDK em produção)
await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/uid-ana'), { assinaturaStatus: 'inativa', stripeCustomerId: 'cus_ana' });
    await setDoc(doc(db, 'usuarios/uid-bruno'), { assinaturaStatus: 'ativa', stripeCustomerId: 'cus_bruno' });
    await setDoc(doc(db, 'usuarios/uid-bruno/saves/save1'), { meta: { nome: 'Save do Bruno' }, dados: {} });
});

console.log('\n=== A FALHA CRÍTICA: dá pra se dar assinatura de graça? ===');
await verificar('Ana NÃO consegue gravar assinaturaStatus="ativa" em si mesma',
    updateDoc(doc(ana, 'usuarios/uid-ana'), { assinaturaStatus: 'ativa' }), false);
await verificar('Ana NÃO consegue criar o doc dela já com assinatura ativa',
    setDoc(doc(ana, 'usuarios/uid-nova'), { assinaturaStatus: 'ativa' }), false);
await verificar('Ana NÃO consegue trocar o stripeCustomerId dela',
    updateDoc(doc(ana, 'usuarios/uid-ana'), { stripeCustomerId: 'cus_bruno' }), false);
await verificar('Ana NÃO consegue apagar o próprio cadastro (perderia o vínculo de cobrança)',
    deleteDoc(doc(ana, 'usuarios/uid-ana')), false);
await verificar('Ana NÃO consegue gravar nem um campo inofensivo no cadastro',
    updateDoc(doc(ana, 'usuarios/uid-ana'), { qualquerCoisa: 1 }), false);

console.log('\n=== Isolamento entre contas ===');
await verificar('Ana NÃO lê o cadastro do Bruno', getDoc(doc(ana, 'usuarios/uid-bruno')), false);
await verificar('Ana NÃO lê o save do Bruno', getDoc(doc(ana, 'usuarios/uid-bruno/saves/save1')), false);
await verificar('Ana NÃO lista os saves do Bruno', getDocs(collection(ana, 'usuarios/uid-bruno/saves')), false);
await verificar('Ana NÃO escreve no save do Bruno',
    setDoc(doc(ana, 'usuarios/uid-bruno/saves/save1'), { invadido: true }), false);
await verificar('Ana NÃO apaga o save do Bruno', deleteDoc(doc(ana, 'usuarios/uid-bruno/saves/save1')), false);
await verificar('Ana NÃO lista a coleção de usuários', getDocs(collection(ana, 'usuarios')), false);

console.log('\n=== Sem login: nada ===');
await verificar('anônimo NÃO lê cadastro', getDoc(doc(anonimo, 'usuarios/uid-ana')), false);
await verificar('anônimo NÃO lê saves', getDoc(doc(anonimo, 'usuarios/uid-ana/saves/x')), false);
await verificar('anônimo NÃO escreve nada', setDoc(doc(anonimo, 'usuarios/uid-ana/saves/x'), { a: 1 }), false);

console.log('\n=== Coleção não prevista fica fechada por padrão ===');
await verificar('Ana NÃO escreve numa coleção nova qualquer', setDoc(doc(ana, 'ranking/global'), { x: 1 }), false);
await verificar('Ana NÃO lê uma coleção nova qualquer', getDoc(doc(ana, 'ranking/global')), false);

console.log('\n=== O APP LEGÍTIMO continua funcionando ===');
await verificar('Ana lê o próprio cadastro (checagem de assinatura)', getDoc(doc(ana, 'usuarios/uid-ana')), true);
await verificar('Ana grava um save seu (_enviarSaveParaNuvem)',
    setDoc(doc(ana, 'usuarios/uid-ana/saves/s1'), { meta: { nome: 'Meu Save', atualizadoEm: 1 }, dados: { clube: {} } }), true);
await verificar('Ana lê o próprio save', getDoc(doc(ana, 'usuarios/uid-ana/saves/s1')), true);
await verificar('Ana lista os próprios saves (sincronizarSavesComNuvem)',
    getDocs(collection(ana, 'usuarios/uid-ana/saves')), true);
await verificar('Ana apaga um save seu (excluirSave)', deleteDoc(doc(ana, 'usuarios/uid-ana/saves/s1')), true);
await verificar('Bruno lê o próprio cadastro e vê assinatura ativa', getDoc(doc(bruno, 'usuarios/uid-bruno')), true);

// O servidor (Admin SDK) tem que continuar podendo liberar a assinatura — é o webhook da Stripe
console.log('\n=== O servidor (webhook da Stripe) segue no comando ===');
checks++;
try {
    await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'usuarios/uid-ana'), { assinaturaStatus: 'ativa' }, { merge: true });
        const s = await getDoc(doc(ctx.firestore(), 'usuarios/uid-ana'));
        if (s.data().assinaturaStatus !== 'ativa') throw new Error('não gravou');
    });
    console.log('  ✅ Admin SDK libera a assinatura normalmente (ignora as regras, como esperado)');
} catch (e) { falhas++; console.log('  ❌ Admin SDK bloqueado:', e.message); }

await env.cleanup();
console.log(`\n${checks - falhas}/${checks} verificações passaram.`);
process.exit(falhas > 0 ? 1 : 0);
