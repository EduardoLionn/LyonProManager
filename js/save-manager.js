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

// Carrega um save existente pelo id, substituindo o `db` em memória, e marca como ativo.
function carregarSave(id) {
    let raw = localStorage.getItem(_chaveDadosSave(id));
    if (!raw) return false;
    let carregado;
    try { carregado = JSON.parse(raw); } catch(e) { return false; }

    db = dbPadrao();
    if (carregado.clube) Object.assign(db.clube, carregado.clube);
    if (carregado.selecao) Object.assign(db.selecao, carregado.selecao);
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
    return id;
}

function excluirSave(id) {
    _gravarIndiceSaves(_lerIndiceSaves().filter(s => s.id !== id));
    localStorage.removeItem(_chaveDadosSave(id));
    if (obterIdSaveAtivo() === id) localStorage.removeItem(ACTIVE_SAVE_KEY);
    if (saveAtualId === id) saveAtualId = null;
}

// Importa um backup .json (baixado via "Baixar Backup") como um save NOVO na lista, sem mexer no save ativo atual.
function importarSaveDeBackup(dbImportado, nomeSugerido) {
    let dbNovo = dbPadrao();
    if (dbImportado.clube) Object.assign(dbNovo.clube, dbImportado.clube);
    if (dbImportado.selecao) Object.assign(dbNovo.selecao, dbImportado.selecao);

    let id = _gerarIdSave();
    let agora = Date.now();
    let nome = nomeSugerido || dbNovo.clube.saveName || dbNovo.selecao.saveName || dbNovo.clube.nome || dbNovo.selecao.nome || 'Save Importado';
    localStorage.setItem(_chaveDadosSave(id), JSON.stringify(dbNovo));
    let indice = _lerIndiceSaves();
    indice.push({ id: id, nome: nome, criadoEm: agora, atualizadoEm: agora, resumo: _resumoDeDb(dbNovo) });
    _gravarIndiceSaves(indice);
    return id;
}
