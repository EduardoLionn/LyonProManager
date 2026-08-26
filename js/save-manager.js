// ============================================================
// GERENCIADOR DE SAVES — múltiplos saves guardados no cache do navegador (localStorage).
// Cada save é um blob independente (mesmo formato do `db`: .clube + .selecao).
// Um índice leve guarda apenas nome/resumo/datas de cada save, pra listar rápido sem
// precisar carregar o JSON inteiro de todos eles.
// ============================================================

const SAVES_INDEX_KEY = 'lyonpro_saves_index';
const ACTIVE_SAVE_KEY = 'lyonpro_active_save_id';
const LEGACY_SAVE_KEY = 'manager_fc_v4'; // formato antigo, usado antes de existir múltiplos saves

function _lerIndiceSaves() {
    try { return JSON.parse(localStorage.getItem(SAVES_INDEX_KEY)) || []; } catch(e) { return []; }
}
function _gravarIndiceSaves(lista) { localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify(lista)); }
function _gerarIdSave() { return 'save_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
function _chaveDadosSave(id) { return 'lyonpro_save_data_' + id; }

function _resumoDeDb(dbObj) {
    return {
        clubeNome: dbObj.clube.nome || '', clubeLiga: dbObj.clube.liga || '', clubeTemporada: dbObj.clube.temporadaAtual || '',
        selecaoNome: dbObj.selecao.nome || '', selecaoLiga: dbObj.selecao.liga || ''
    };
}

// Migra o save único antigo (chave 'manager_fc_v4') pro novo sistema de múltiplos saves.
// Roda uma única vez: se já existe algum save no índice novo, não faz nada.
function migrarSaveAntigoSeNecessario() {
    if (_lerIndiceSaves().length > 0) return;

    let legado = null;
    try { legado = JSON.parse(localStorage.getItem(LEGACY_SAVE_KEY)); } catch(e) {}
    if (!legado || (!(legado.clube && legado.clube.nome) && !(legado.selecao && legado.selecao.nome))) return;

    let dbMigrado = dbPadrao();
    if (legado.clube) Object.assign(dbMigrado.clube, legado.clube);
    if (legado.selecao) Object.assign(dbMigrado.selecao, legado.selecao);

    let id = _gerarIdSave();
    let nome = dbMigrado.clube.saveName || dbMigrado.selecao.saveName || dbMigrado.clube.nome || dbMigrado.selecao.nome || 'Meu Save';
    let agora = Date.now();
    localStorage.setItem(_chaveDadosSave(id), JSON.stringify(dbMigrado));
    let indice = _lerIndiceSaves();
    indice.push({ id: id, nome: nome, criadoEm: agora, atualizadoEm: agora, resumo: _resumoDeDb(dbMigrado) });
    _gravarIndiceSaves(indice);
    localStorage.setItem(ACTIVE_SAVE_KEY, id);
}

function listarSaves() {
    return _lerIndiceSaves().sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

function obterIdSaveAtivo() {
    return localStorage.getItem(ACTIVE_SAVE_KEY);
}

// Reformulação das posições de carteirinha (ago/2026): as especialidades antigas viraram um
// catálogo novo e mais detalhado (ver ESPECIALIDADES_JOGADOR em js/funcoes-ea.js). Melhor
// equivalente pra cada posição antiga — não é exato (o novo catálogo é mais rico), mas evita
// que saves existentes percam a posição dos jogadores já cadastrados. Quem quiser afinar, edita
// o jogador manualmente depois; posição não reconhecida (nem antiga nem nova) fica como está.
const MIGRACAO_POSICOES_ANTIGAS = {
    'Goleiro': 'Goleiro/Tradicional',
    'Zagueiro/Construtor': 'Zagueiro/Construtor', 'Zagueiro/Lateral': 'Zagueiro/Cobertura',
    'Zagueiro/Versatil': 'Zagueiro/Híbrido', 'Zagueiro/Defesa': 'Zagueiro/Rebatedor',
    'Lateral/Defesa Direito': 'Lateral/Defensivo Direito', 'Lateral/Defesa Esquerdo': 'Lateral/Defensivo Esquerdo',
    'Lateral/Ala Direito': 'Lateral/Ala Clássico Direito', 'Lateral/Ala Esquerdo': 'Lateral/Ala Clássico Esquerdo',
    'Lateral/Construtor Direito': 'Lateral/Construtor Direito', 'Lateral/Construtor Esquerdo': 'Lateral/Construtor Esquerdo',
    'Lateral/Defesa Versatil': 'Lateral/Defensivo Direito', 'Lateral/Ala Versatil': 'Lateral/Ala Clássico Direito', 'Lateral/Construtor Versatil': 'Lateral/Construtor Direito',
    'Volante/Zaga': 'Volante/Cão de Guarda', 'Volante/Contenção': 'Volante/Cão de Guarda', 'Volante/Armação': 'Volante/Organizador',
    'MeioCampo/Equilibrado': 'MeioCampo/Dinâmico', 'MeioCampo/Armador': 'MeioCampo/Armador Clássico',
    'MeioCampo/Abertura': 'MeioCampo/Aberto Direito', 'MeioCampo/Ataque': 'MeioCampo/Infiltrador', 'MeioCampo/Versátil': 'MeioCampo/Dinâmico',
    'Ponta/Ala Direita': 'Ponta/Clássico Direito', 'Ponta/Ala Esquerda': 'Ponta/Clássico Esquerdo',
    'Ponta/Invertido': 'Ponta/Invertido Direito', 'Ponta/Armador': 'Ponta/Construtor Direito', 'Ponta/Versátil': 'Ponta/Clássico Direito',
    'Atacante/Aberto': 'Atacante/Móvel', 'Atacante/Fisico': 'Atacante/Pivô', 'Atacante/Armador': 'Atacante/Falso 9',
    'Atacante/Velocidade': 'Atacante/Matador', 'Atacante/Versátil': 'Atacante/Móvel'
};

// Aplica MIGRACAO_POSICOES_ANTIGAS no plantel de um save recém-carregado — chamado uma vez
// por load, então nunca reprocessa posições que já estão no catálogo novo.
function _migrarPosicoesAntigasDoSave(dbObj) {
    [dbObj.clube, dbObj.selecao].forEach(save => {
        (save && save.plantel || []).forEach(p => {
            let nova = MIGRACAO_POSICOES_ANTIGAS[p.posicao];
            if (nova) p.posicao = nova;
        });
    });
}

// Carrega um save existente pelo id, substituindo o `db` em memória, e marca como ativo.
function carregarSave(id) {
    let raw = localStorage.getItem(_chaveDadosSave(id));
    if (!raw) return false;
    let carregado;
    try { carregado = JSON.parse(raw); } catch(e) { return false; }

    db = dbPadrao();
    if (carregado.clube) Object.assign(db.clube, carregado.clube);
    if (carregado.selecao) Object.assign(db.selecao, carregado.selecao);
    _migrarPosicoesAntigasDoSave(db);
    saveAtualId = id;
    localStorage.setItem(ACTIVE_SAVE_KEY, id);
    return true;
}

// Registra o `db` atual (já preenchido pelo assistente de Novo Jogo) como um save novo na lista.
function registrarNovoSaveAtivo(nomeSave) {
    let id = _gerarIdSave();
    let agora = Date.now();
    let indice = _lerIndiceSaves();
    indice.push({ id: id, nome: nomeSave || 'Nova Carreira', criadoEm: agora, atualizadoEm: agora, resumo: _resumoDeDb(db) });
    _gravarIndiceSaves(indice);
    saveAtualId = id;
    localStorage.setItem(ACTIVE_SAVE_KEY, id);
    localStorage.setItem(_chaveDadosSave(id), JSON.stringify(db));
    _enviarSaveParaNuvem(id);
    return id;
}

function excluirSave(id) {
    _gravarIndiceSaves(_lerIndiceSaves().filter(s => s.id !== id));
    localStorage.removeItem(_chaveDadosSave(id));
    if (obterIdSaveAtivo() === id) localStorage.removeItem(ACTIVE_SAVE_KEY);
    if (saveAtualId === id) saveAtualId = null;
    _removerSaveDaNuvem(id);
}

// Importa um backup .json (baixado via "Baixar Backup") como um save NOVO na lista, sem mexer no save ativo atual.
function importarSaveDeBackup(dbImportado, nomeSugerido) {
    // O arquivo pode ter vindo de qualquer lugar (alguém compartilhou, veio de outro PC).
    // Como o app renderiza esses textos com innerHTML, tudo passa pelo saneamento antes de
    // encostar no estado do jogo — é a única fronteira por onde texto de terceiro entra aqui.
    if (typeof sanearSaveImportado === 'function') dbImportado = sanearSaveImportado(dbImportado) || {};

    let dbNovo = dbPadrao();
    if (dbImportado.clube) Object.assign(dbNovo.clube, dbImportado.clube);
    if (dbImportado.selecao) Object.assign(dbNovo.selecao, dbImportado.selecao);
    _migrarPosicoesAntigasDoSave(dbNovo);

    let id = _gerarIdSave();
    let agora = Date.now();
    let nome = nomeSugerido || dbNovo.clube.saveName || dbNovo.selecao.saveName || dbNovo.clube.nome || dbNovo.selecao.nome || 'Save Importado';
    if (typeof limparTextoUsuario === 'function') nome = limparTextoUsuario(nome, 120) || 'Save Importado';
    localStorage.setItem(_chaveDadosSave(id), JSON.stringify(dbNovo));
    let indice = _lerIndiceSaves();
    indice.push({ id: id, nome: nome, criadoEm: agora, atualizadoEm: agora, resumo: _resumoDeDb(dbNovo) });
    _gravarIndiceSaves(indice);
    _enviarSaveParaNuvem(id);
    return id;
}

// ============================================================
// SINCRONIZAÇÃO COM A NUVEM (Firestore) — os saves continuam vivendo no localStorage
// (rápido, funciona offline), mas agora também ficam espelhados em usuarios/{uid}/saves/{id}
// no Firestore, pra estarem disponíveis em qualquer navegador/aparelho logado na mesma conta.
// window._authUidAtual é setado pelo auth.js assim que o login é confirmado.
// ============================================================

let _syncNuvemTimeoutId = null;

// Chamada toda vez que salvarDados() roda — não manda pra nuvem a cada chamada (aconteceria
// dezenas de vezes por minuto), só agenda um envio único alguns segundos depois da última mudança.
function _agendarSyncNuvem(id) {
    if (!window._authUidAtual || !id) return;
    clearTimeout(_syncNuvemTimeoutId);
    _syncNuvemTimeoutId = setTimeout(() => _enviarSaveParaNuvem(id), 4000);
}

async function _enviarSaveParaNuvem(id) {
    if (!window._authUidAtual || !id || typeof firebase === 'undefined' || !firebase.firestore) return;
    let indice = _lerIndiceSaves();
    let meta = indice.find(s => s.id === id);
    let raw = localStorage.getItem(_chaveDadosSave(id));
    if (!meta || !raw) return;
    try {
        await firebase.firestore().collection('usuarios').doc(window._authUidAtual).collection('saves').doc(id)
            .set({ meta: meta, dados: JSON.parse(raw) });
    } catch (e) { console.error('Erro ao enviar save pra nuvem:', e); }
}

async function _removerSaveDaNuvem(id) {
    if (!window._authUidAtual || !id || typeof firebase === 'undefined' || !firebase.firestore) return;
    try {
        await firebase.firestore().collection('usuarios').doc(window._authUidAtual).collection('saves').doc(id).delete();
    } catch (e) { console.error('Erro ao remover save da nuvem:', e); }
}

// Roda uma vez, logo após o login (antes de carregarDados()): busca os saves da nuvem e faz a
// sincronização nos dois sentidos — o mais recente (por atualizadoEm) de cada save vence, e
// saves que só existem de um lado são copiados pro outro. Assim nenhum progresso se perde ao
// ativar isso pela primeira vez com saves que já existiam só localmente.
async function sincronizarSavesComNuvem(uid) {
    if (!uid || typeof firebase === 'undefined' || !firebase.firestore) return;
    let firestoreDB = firebase.firestore();
    let indiceLocalPorId = {};
    _lerIndiceSaves().forEach(s => { indiceLocalPorId[s.id] = s; });

    let snap;
    try {
        snap = await firestoreDB.collection('usuarios').doc(uid).collection('saves').get();
    } catch (e) { console.error('Erro ao buscar saves da nuvem:', e); return; }

    let uploads = [];
    snap.forEach(doc => {
        let nuvem = doc.data();
        let local = indiceLocalPorId[doc.id];
        if (!local || nuvem.meta.atualizadoEm > local.atualizadoEm) {
            // Nuvem está mais atualizada (ou o save nem existe aqui ainda) — baixa.
            localStorage.setItem(_chaveDadosSave(doc.id), JSON.stringify(nuvem.dados));
            indiceLocalPorId[doc.id] = nuvem.meta;
        } else if (local.atualizadoEm > nuvem.meta.atualizadoEm) {
            // Local está mais atualizado — sobe a versão local por cima.
            uploads.push(_enviarSaveParaNuvem(doc.id));
        }
    });

    let idsNaNuvem = {}; snap.forEach(doc => { idsNaNuvem[doc.id] = true; });
    for (let id in indiceLocalPorId) {
        if (!idsNaNuvem[id]) uploads.push(_enviarSaveParaNuvem(id)); // save só local — sobe pela primeira vez
    }

    await Promise.all(uploads);
    _gravarIndiceSaves(Object.values(indiceLocalPorId));
}
