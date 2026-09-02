// ============================================================
// SCOUT — OLHEIRO-CHEFE
// Chat com uma IA que atua como olheiro: analisa as necessidades do elenco atual e sugere
// contratações realistas (nível do clube, orçamento, faixa de idade) usando só jogadores REAIS
// do banco de dados (js/jogadores-data.js) — nunca inventa nomes. De propósito, NUNCA mostra o
// OVR do jogador sugerido: isso preservaria a graça de descobrir a força real do jogador
// procurando por ele no jogo de futebol de verdade. A transferência em si continua acontecendo
// lá; aqui é só o relatório de olheiro que ajuda a decidir quem procurar.
// ============================================================

// Grupos amplos de posição -> siglas EA do banco real que pertencem a cada um.
const SCOUT_GRUPOS_POSICAO = {
    'Goleiro': ['GK'],
    'Zagueiro': ['CB', 'LCB', 'RCB'],
    'Lateral': ['LB', 'RB'],
    'Volante': ['CDM', 'LDM', 'RDM'],
    'Meio-Campo': ['CM', 'LCM', 'RCM', 'CAM', 'LAM', 'RAM'],
    'Ponta': ['LM', 'RM', 'LW', 'RW'],
    'Atacante': ['LS', 'RS', 'ST']
};

// Especialidade "padrão" (catálogo do jogo) por sigla EA — só pra pré-preencher o formulário de
// compra com um ponto de partida razoável quando o treinador usa um nome sugerido pelo olheiro;
// ele ainda pode trocar no próprio select antes de salvar.
const SCOUT_ESPECIALIDADE_PADRAO_POR_SIGLA = {
    GK: 'Goleiro/Tradicional',
    CB: 'Zagueiro/Híbrido', LCB: 'Zagueiro/Híbrido', RCB: 'Zagueiro/Híbrido',
    LB: 'Lateral/Construtor Esquerdo', RB: 'Lateral/Construtor Direito',
    CDM: 'Volante/Organizador', LDM: 'Volante/Organizador', RDM: 'Volante/Organizador',
    CM: 'MeioCampo/Dinâmico', LCM: 'MeioCampo/Dinâmico', RCM: 'MeioCampo/Dinâmico',
    CAM: 'MeioCampo/Armador Clássico', LAM: 'MeioCampo/Armador Clássico', RAM: 'MeioCampo/Armador Clássico',
    LM: 'Ponta/Clássico Esquerdo', RM: 'Ponta/Clássico Direito',
    LW: 'Ponta/Invertido Esquerdo', RW: 'Ponta/Invertido Direito',
    LS: 'Atacante/Móvel', RS: 'Atacante/Móvel', ST: 'Atacante/Matador'
};

// Quantos candidatos (no máximo) entram no pool de cada grupo de posição — controla o tamanho
// do prompt enviado à IA. Setor prioritário (curto ou fraco) ganha mais opções; os outros ganham
// só um punhado, caso o treinador pergunte por eles mesmo assim. Com os 7 grupos possíveis, isso
// mantém o pool bem menor que mandar o máximo em todo setor (que deixava a IA lenta demais e
// estourava o timeout da conversa).
const SCOUT_CANDIDATOS_GRUPO_PRIORITARIO = 8;
const SCOUT_CANDIDATOS_GRUPO_PADRAO = 4;

function scoutObterBaseDaEdicao() {
    if (currentSave !== 'clube' || typeof jogadoresPorClubePorEdicao !== 'object') return null;
    let temporada = db.clube.temporadaAtual;
    let edicao = (typeof edicaoFcDaTemporada === 'function') ? edicaoFcDaTemporada(temporada) : 'fc26';
    return jogadoresPorClubePorEdicao[edicao] || jogadoresPorClubePorEdicao.fc26 || null;
}

// Abre a aba: garante o histórico do chat, manda uma mensagem de boas-vindas na primeira vez, e
// renderiza o Perfil do Clube + a Lista de Interesse.
function scoutAbrirTab() {
    if (!db.clube.chatHistory) db.clube.chatHistory = {};
    if (!db.clube.chatHistory.scout || db.clube.chatHistory.scout.length === 0) {
        db.clube.chatHistory.scout = [{
            role: 'ai',
            text: `Fala, treinador! Sou ${(typeof nomeOlheiroExibicao === 'function') ? nomeOlheiroExibicao() : 'o Olheiro-Chefe'}, olheiro do ${db.clube.nome || 'clube'}. Me conta o que o elenco está precisando (posição, perfil, "algo mais barato"...) que eu já trago nomes reais no nosso nível — sem spoiler de nota.`
        }];
        salvarDados();
    }
    renderizarChat('scout');
    scoutRenderPerfilClube();
    scoutRenderListaInteresse();
}

// ============================================================
// PERFIL DO CLUBE — ligas prioritárias de contratação (A a E) + teto de valor por jogador.
// Pedido do treinador: o olheiro deve preferir ligas de onde o clube "costuma comprar" (definido
// por país inteiro ou liga específica) e nunca sugerir alguém acima do teto de valor — como não
// existe uma base real de valores de mercado nesse app, o teto usa uma ESTIMATIVA própria (por
// OVR e idade), só pra filtrar de forma realista, nunca exibida ao treinador.
// ============================================================

const SCOUT_ORDEM_PRIORIDADE = ['A', 'B', 'C', 'D', 'E'];

function scoutObterPerfilClube() {
    if (!db.clube.scoutPerfil) db.clube.scoutPerfil = { valorMaximo: null, prioridadePorLiga: {} };
    if (!db.clube.scoutPerfil.prioridadePorLiga) db.clube.scoutPerfil.prioridadePorLiga = {};
    return db.clube.scoutPerfil;
}

// Estimativa própria de valor de mercado (NÃO é dado real — o app não tem uma base de valores de
// transferência). Serve só pra aplicar o teto que o treinador define; nunca é mostrada na tela.
function scoutEstimarValorMercado(ovr, idade) {
    let base = Math.pow(1.22, Math.max(0, ovr - 60)) * 0.5;
    let fatorIdade = idade <= 23 ? 1.3 : idade <= 27 ? 1.15 : idade <= 30 ? 0.9 : idade <= 33 ? 0.55 : 0.3;
    return Math.max(0.1, Math.round(base * fatorIdade * 10) / 10);
}

// Lê os países/ligas a partir do select oculto "#setup-liga" (fonte única já usada pelo wizard e
// pela Troca de Liga) — evita duplicar essa lista de novo só pro Scout.
function scoutObterPaisesELigas() {
    let optgroups = [...document.querySelectorAll('#setup-liga optgroup')].filter(og => !og.label.includes('Seleções'));
    return optgroups.map(og => ({ pais: og.label, ligas: [...og.children].map(opt => opt.value) }));
}

function scoutToggleConfigPerfilClube() {
    let corpo = document.getElementById('scout-perfil-clube-corpo');
    let btn = document.getElementById('btn-toggle-perfil-clube');
    if (!corpo) return;
    if (corpo.style.display === 'none') {
        corpo.style.display = 'block';
        if (btn) btn.innerHTML = '👁️ Ocultar Perfil do Clube';
        scoutRenderPerfilClube();
    } else {
        corpo.style.display = 'none';
        if (btn) btn.innerHTML = '⚙️ Perfil do Clube (ligas que costumamos contratar)';
    }
}

function scoutSalvarValorMaximo() {
    let valor = document.getElementById('scout-valor-maximo').value;
    scoutObterPerfilClube().valorMaximo = valor ? Number(valor) : null;
    salvarDados();
}

function scoutDefinirPrioridadeLiga(liga, tier) {
    let perfil = scoutObterPerfilClube();
    if (tier) perfil.prioridadePorLiga[liga] = tier;
    else delete perfil.prioridadePorLiga[liga];
    salvarDados();
}

// "Colocar por país": aplica a mesma prioridade a todas as ligas daquele país de uma vez.
function scoutDefinirPrioridadePais(pais, tier) {
    if (!tier) return;
    let grupo = scoutObterPaisesELigas().find(g => g.pais === pais);
    if (!grupo) return;
    let perfil = scoutObterPerfilClube();
    grupo.ligas.forEach(liga => perfil.prioridadePorLiga[liga] = tier);
    salvarDados();
    scoutRenderPerfilClube();
}

function scoutRenderPerfilClube() {
    let container = document.getElementById('scout-ligas-prioridade-grid');
    if (!container) return;
    let perfil = scoutObterPerfilClube();

    let campoValor = document.getElementById('scout-valor-maximo');
    if (campoValor) campoValor.value = (perfil.valorMaximo !== null && perfil.valorMaximo !== undefined) ? perfil.valorMaximo : '';

    let opcoesTier = (selecionado) => ['', ...SCOUT_ORDEM_PRIORIDADE].map(t =>
        `<option value="${t}" ${t === (selecionado || '') ? 'selected' : ''}>${t || '—'}</option>`).join('');

    container.innerHTML = scoutObterPaisesELigas().map(({ pais, ligas }) => {
        let linhasLigas = ligas.map(liga => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0 3px 14px; font-size:12.5px;">
                <span>${liga}</span>
                <select onchange="scoutDefinirPrioridadeLiga('${liga.replace(/'/g, "\\'")}', this.value)" style="width:64px; padding:2px;">
                    ${opcoesTier(perfil.prioridadePorLiga[liga])}
                </select>
            </div>`).join('');
        return `<div style="border:1px solid var(--border); border-radius:8px; padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <strong style="font-size:13px;">${pais}</strong>
                <select onchange="scoutDefinirPrioridadePais('${pais.replace(/'/g, "\\'")}', this.value)" style="width:130px; padding:2px; font-size:12px;">
                    <option value="">Aplicar a todo país...</option>
                    ${SCOUT_ORDEM_PRIORIDADE.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
            </div>
            ${linhasLigas}
        </div>`;
    }).join('');
}

// Extrai o OVR de referência da liga (ex: "Premier League (OVR 77)" -> 77) — é o proxy mais
// direto que temos do "tamanho"/nível do clube pra calibrar realismo nas sugestões.
function scoutExtrairOvrDaLiga(liga) {
    let m = String(liga || '').match(/OVR\s*(\d+)/i);
    return m ? Number(m[1]) : null;
}

// Nível de referência do nosso clube: OVR da liga atual, com fallback pra média do elenco ativo
// (útil se a liga não seguir o padrão "(OVR NN)", ex: nomes digitados manualmente no wizard).
function scoutNivelClubeAtual() {
    let porLiga = scoutExtrairOvrDaLiga(db.clube.liga);
    if (porLiga) return porLiga;
    let ativos = (db.clube.plantel || []).filter(p => p.status === 'Ativo' && p.ovr);
    if (!ativos.length) return 65;
    return Math.round(ativos.reduce((s, p) => s + p.ovr, 0) / ativos.length);
}

// Radiografia do elenco atual por setor — uso interno do prompt (a IA usa isso pra embasar a
// necessidade real, mas não repete os números pro treinador) e também pra decidir quantos
// candidatos de cada setor entram no pool (setor carente ganha mais opções, setor bem servido
// ganha menos — mantém o prompt enxuto sem perder profundidade onde ela realmente importa).
function scoutAnalisarElencoPorGrupo() {
    let ativos = (db.clube.plantel || []).filter(p => p.status === 'Ativo');
    let nivelClube = scoutNivelClubeAtual();
    let porGrupo = {};
    Object.keys(SCOUT_GRUPOS_POSICAO).forEach(g => porGrupo[g] = { jogadores: [] });

    ativos.forEach(p => {
        let prefixo = String(p.posicao || '').split('/')[0];
        let grupo = prefixo === 'MeioCampo' ? 'Meio-Campo' : prefixo;
        if (porGrupo[grupo]) porGrupo[grupo].jogadores.push(p);
    });

    Object.values(porGrupo).forEach(info => {
        let jogadores = info.jogadores;
        info.idadeMedia = jogadores.length ? Math.round(jogadores.reduce((s, p) => s + (p.idade || 25), 0) / jogadores.length) : null;
        info.ovrMedio = jogadores.length ? Math.round(jogadores.reduce((s, p) => s + (p.ovr || 0), 0) / jogadores.length) : null;
        info.prioridade = jogadores.length <= 1 || (info.ovrMedio !== null && info.ovrMedio < nivelClube - 5);
    });

    return porGrupo;
}

function scoutResumoNecessidadesElenco() {
    let porGrupo = scoutAnalisarElencoPorGrupo();
    let linhas = Object.entries(porGrupo).map(([grupo, info]) => {
        if (info.jogadores.length === 0) return `- ${grupo}: NENHUM jogador ativo nesse setor — necessidade urgente.`;
        let alerta = info.jogadores.length === 1 ? ' (elenco curto — só 1 opção nesse setor)'
            : (info.prioridade ? ' (nível visivelmente abaixo da média do time)' : '');
        return `- ${grupo}: ${info.jogadores.length} jogador${info.jogadores.length === 1 ? '' : 'es'}, idade média ${info.idadeMedia}${alerta}`;
    });

    return `Elenco atual por setor (uso interno pra embasar a necessidade real — não repita esses números pro treinador):\n${linhas.join('\n')}`;
}

// Rótulo qualitativo de nível (nunca um número) comparando o candidato ao nível do nosso clube.
function scoutRotuloNivel(ovrCandidato, nivelClube) {
    let diff = ovrCandidato - nivelClube;
    if (diff >= 4) return 'acima do nível atual do nosso elenco (contratação ambiciosa)';
    if (diff <= -6) return 'bem abaixo do nosso nível (opção econômica ou pro banco)';
    if (diff <= -3) return 'um pouco abaixo do nosso nível (bom custo-benefício)';
    return 'no nível atual do nosso elenco';
}

// Monta o pool de candidatos realistas (por grupo de posição, mais próximos do nosso nível) e o
// texto formatado pro prompt. O pool retornado é a ÚNICA fonte confiável pra validar depois quais
// nomes a IA pode ter sugerido de verdade — nunca confiamos no texto livre da resposta pra isso.
function scoutMontarCandidatos() {
    let base = scoutObterBaseDaEdicao();
    if (!base) return { texto: '', pool: [], resumoNecessidades: '' };

    let nivelClube = scoutNivelClubeAtual();
    let anos = (typeof anosAlemDaBaseDadosReais === 'function') ? anosAlemDaBaseDadosReais(db.clube.temporadaAtual) : 0;
    let nomeClubeProprio = db.clube.nome;
    let analiseElenco = scoutAnalisarElencoPorGrupo();
    let perfil = scoutObterPerfilClube();

    let porGrupo = {};
    Object.keys(SCOUT_GRUPOS_POSICAO).forEach(g => porGrupo[g] = []);

    Object.entries(base).forEach(([liga, clubes]) => {
        Object.entries(clubes).forEach(([clube, jogadores]) => {
            if (clube === nomeClubeProprio) return; // nunca sugere jogador que já é nosso
            jogadores.forEach(j => {
                let grupo = Object.keys(SCOUT_GRUPOS_POSICAO).find(g => SCOUT_GRUPOS_POSICAO[g].includes(j.posicao));
                if (!grupo) return;
                if (j.ovr < nivelClube - 16 || j.ovr > nivelClube + 8) return; // fora de qualquer realismo pro nosso tamanho
                let idadeAjustada = j.idade + anos;
                // Teto de valor (estimativa própria, nunca exibida) — corta quem está claramente
                // fora do orçamento que o treinador definiu no Perfil do Clube.
                if (perfil.valorMaximo && scoutEstimarValorMercado(j.ovr, idadeAjustada) > perfil.valorMaximo) return;
                let prioridade = perfil.prioridadePorLiga[liga] || 'C'; // sem configuração = prioridade neutra
                porGrupo[grupo].push({ nome: j.nome, clube, liga, idade: idadeAjustada, posicaoEA: j.posicao, ovr: j.ovr, prioridade });
            });
        });
    });

    let pool = [];
    let blocos = Object.entries(porGrupo).map(([grupo, lista]) => {
        // Prioridade da liga é o critério principal (A antes de B, antes de C...); dentro da mesma
        // prioridade, o mais próximo do nosso nível (OVR) vem primeiro.
        lista.sort((a, b) => {
            let diffPrioridade = SCOUT_ORDEM_PRIORIDADE.indexOf(a.prioridade) - SCOUT_ORDEM_PRIORIDADE.indexOf(b.prioridade);
            if (diffPrioridade !== 0) return diffPrioridade;
            return Math.abs(a.ovr - nivelClube) - Math.abs(b.ovr - nivelClube);
        });
        let limite = (analiseElenco[grupo] && analiseElenco[grupo].prioridade) ? SCOUT_CANDIDATOS_GRUPO_PRIORITARIO : SCOUT_CANDIDATOS_GRUPO_PADRAO;
        let selecionados = lista.slice(0, limite);
        if (selecionados.length === 0) return '';
        pool.push(...selecionados);
        let linhas = selecionados.map(j => `${j.nome} (${j.clube}, ${j.liga}, ${j.idade} anos, ${j.posicaoEA}) — nível: ${scoutRotuloNivel(j.ovr, nivelClube)}`);
        return `${grupo}:\n  ${linhas.join('\n  ')}`;
    }).filter(Boolean);

    return { texto: blocos.join('\n\n'), pool, resumoNecessidades: scoutResumoNecessidadesElenco() };
}

// Card com os jogadores citados nesta resposta do olheiro — SEM ovr em lugar nenhum. Cada um tem
// um atalho pra já preencher nome/posição/idade no formulário de compra (Transferências) e outro
// pra salvar/remover da Lista de Interesse; o custo e o OVR ficam de propósito pro treinador
// preencher/descobrir depois de ver o jogador no próprio jogo.
function renderizarCardSugestoesScout(sugestoes) {
    if (!Array.isArray(sugestoes) || sugestoes.length === 0) return '';
    return `<div class="sugestao-sub-card" style="display:flex; flex-direction:column; gap:10px;">
        ${sugestoes.map(s => {
            let salvo = scoutEstaNaListaInteresse(s.nome, s.clube);
            let argsJs = `'${s.nome.replace(/'/g, "\\'")}', '${s.clube.replace(/'/g, "\\'")}', '${s.liga.replace(/'/g, "\\'")}', ${s.idade}, '${s.posicaoEA}'`;
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                <span><strong>${s.nome}</strong> — ${s.clube} (${s.liga}), ${s.idade} anos</span>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn-ssc-confirmar" onclick="scoutUsarNomeNoFormularioCompra('${s.nome.replace(/'/g, "\\'")}', '${s.posicaoEA}', ${s.idade})">📥 Usar no Formulário de Compra</button>
                    <button class="${salvo ? 'btn-ssc-rejeitar' : 'btn-ssc-alterar'}" onclick="scoutToggleInteresse(${argsJs})">${salvo ? '🗑️ Remover da Lista' : '⭐ Salvar na Lista'}</button>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

// Leva nome/posição/idade pro formulário manual de "Comprar Reforço" (aba Transferências) — o
// OVR NUNCA é preenchido aqui: é o dado que o treinador precisa ir descobrir no próprio jogo de
// futebol antes de fechar a contratação de verdade.
function scoutUsarNomeNoFormularioCompra(nome, siglaEA, idade) {
    mudarAba('tab-mercado');

    let painel = document.getElementById('painel-controles-manuais-mercado');
    let btnToggle = document.getElementById('btn-toggle-controles-mercado');
    if (painel && painel.style.display === 'none') {
        painel.style.display = 'grid';
        if (btnToggle) btnToggle.innerHTML = '👁️ Ocultar Controles Manuais';
    }

    document.getElementById('add-nome').value = nome;
    document.getElementById('add-pos').value = SCOUT_ESPECIALIDADE_PADRAO_POR_SIGLA[siglaEA] || 'MeioCampo/Dinâmico';
    document.getElementById('add-idade').value = idade;

    let campoNome = document.getElementById('add-nome');
    if (campoNome) campoNome.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================================
// LISTA DE INTERESSE — sugestões do olheiro que o treinador quis guardar pra decidir depois.
// ============================================================

function scoutEstaNaListaInteresse(nome, clube) {
    let lista = db.clube.scoutListaInteresse || [];
    return lista.some(j => j.nome === nome && j.clube === clube);
}

// Alterna: salva se ainda não estiver na lista, remove se já estiver. Sempre re-renderiza tanto a
// lista quanto o chat (o botão do card precisa trocar de "Salvar" pra "Remover" e vice-versa).
function scoutToggleInteresse(nome, clube, liga, idade, posicaoEA) {
    if (!db.clube.scoutListaInteresse) db.clube.scoutListaInteresse = [];
    let lista = db.clube.scoutListaInteresse;
    let idx = lista.findIndex(j => j.nome === nome && j.clube === clube);
    if (idx >= 0) lista.splice(idx, 1);
    else lista.push({ nome, clube, liga, idade, posicaoEA, salvoEm: Date.now() });
    salvarDados();
    scoutRenderListaInteresse();
    renderizarChat('scout');
}

function scoutRenderListaInteresse() {
    let container = document.getElementById('scout-lista-interesse-corpo');
    if (!container) return;
    let lista = db.clube.scoutListaInteresse || [];
    if (lista.length === 0) {
        container.innerHTML = `<p class="wizard-elenco-vazio">Nenhum jogador salvo ainda — use "⭐ Salvar na Lista" nas sugestões do olheiro.</p>`;
        return;
    }
    container.innerHTML = lista.slice().reverse().map(j => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; padding:8px 0; border-bottom:1px solid var(--border);">
            <span><strong>${j.nome}</strong> — ${j.clube} (${j.liga}), ${j.idade} anos</span>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn-ssc-confirmar" onclick="scoutUsarNomeNoFormularioCompra('${j.nome.replace(/'/g, "\\'")}', '${j.posicaoEA}', ${j.idade})">📥 Usar no Formulário de Compra</button>
                <button class="btn-ssc-rejeitar" onclick="scoutToggleInteresse('${j.nome.replace(/'/g, "\\'")}', '${j.clube.replace(/'/g, "\\'")}', '${j.liga.replace(/'/g, "\\'")}', ${j.idade}, '${j.posicaoEA}')">🗑️ Remover</button>
            </div>
        </div>`).join('');
}
