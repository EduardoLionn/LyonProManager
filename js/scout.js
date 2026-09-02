// ============================================================
// SCOUT — ANALISTA DE MERCADO
// Aba de busca sobre o banco de jogadores reais (js/jogadores-data.js): o treinador pesquisa
// por liga/clube/posição/OVR/idade pra planejar a próxima contratação, e o botão "Usar na
// Compra" já leva nome/posição/OVR/idade pro formulário manual da aba Transferências — a
// transferência de verdade acontece no jogo de futebol, aqui é só planejamento e registro.
// ============================================================

// Grupos amplos de posição (pro filtro da UI) -> siglas EA do banco real que pertencem a cada um.
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
// compra com um ponto de partida razoável; o treinador ainda pode trocar no próprio select antes
// de salvar. Sem chamada de IA aqui (a busca precisa responder na hora, sem esperar rede).
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

const SCOUT_LIMITE_RESULTADOS = 60;

function scoutObterBaseDaEdicao() {
    if (currentSave !== 'clube' || typeof jogadoresPorClubePorEdicao !== 'object') return null;
    let temporada = db.clube.temporadaAtual;
    let edicao = (typeof edicaoFcDaTemporada === 'function') ? edicaoFcDaTemporada(temporada) : 'fc26';
    return jogadoresPorClubePorEdicao[edicao] || jogadoresPorClubePorEdicao.fc26 || null;
}

function scoutRenderFiltros() {
    let base = scoutObterBaseDaEdicao();
    let selLiga = document.getElementById('scout-filtro-liga');
    if (!base || !selLiga) return;

    let ligaAnterior = selLiga.value;
    selLiga.innerHTML = '<option value="">Todas as Ligas</option>' +
        Object.keys(base).sort().map(liga => `<option value="${liga}">${liga}</option>`).join('');
    if (Object.keys(base).includes(ligaAnterior)) selLiga.value = ligaAnterior;

    scoutRenderClubesFiltro();
}

function scoutRenderClubesFiltro() {
    let base = scoutObterBaseDaEdicao();
    let selLiga = document.getElementById('scout-filtro-liga');
    let selClube = document.getElementById('scout-filtro-clube');
    if (!base || !selLiga || !selClube) return;

    let ligaEscolhida = selLiga.value;
    let clubeAnterior = selClube.value;
    let clubes = [];
    if (ligaEscolhida) {
        clubes = Object.keys(base[ligaEscolhida] || {});
    } else {
        Object.values(base).forEach(clubesDaLiga => clubes.push(...Object.keys(clubesDaLiga)));
    }
    // Seu próprio clube nunca aparece — não faz sentido "scoutar" o elenco que você já tem.
    clubes = clubes.filter(c => c !== db.clube.nome);
    clubes.sort();

    selClube.innerHTML = '<option value="">Todos os Clubes</option>' +
        clubes.map(c => `<option value="${c}">${c}</option>`).join('');
    if (clubes.includes(clubeAnterior)) selClube.value = clubeAnterior;
}

function scoutBuscar() {
    let base = scoutObterBaseDaEdicao();
    let corpo = document.querySelector('#tabela-scout tbody');
    let contagemEl = document.getElementById('scout-contagem-resultados');
    if (!base || !corpo) return;

    let ligaFiltro = document.getElementById('scout-filtro-liga').value;
    let clubeFiltro = document.getElementById('scout-filtro-clube').value;
    let grupoPosicaoFiltro = document.getElementById('scout-filtro-posicao').value;
    let ovrMinimo = Number(document.getElementById('scout-filtro-ovr-min').value) || 0;
    let idadeMaximaVal = document.getElementById('scout-filtro-idade-max').value;
    let idadeMaxima = idadeMaximaVal ? Number(idadeMaximaVal) : null;
    let nomeFiltro = (document.getElementById('scout-filtro-nome').value || '').trim().toLowerCase();
    let siglasDoGrupo = grupoPosicaoFiltro ? SCOUT_GRUPOS_POSICAO[grupoPosicaoFiltro] : null;
    let nomeClubeProprio = db.clube.nome;

    let resultados = [];
    Object.entries(base).forEach(([liga, clubes]) => {
        if (ligaFiltro && liga !== ligaFiltro) return;
        Object.entries(clubes).forEach(([clube, jogadores]) => {
            if (clubeFiltro && clube !== clubeFiltro) return;
            if (clube === nomeClubeProprio) return; // já é seu — não faz sentido "scoutar" seu próprio elenco
            jogadores.forEach(j => {
                if (siglasDoGrupo && !siglasDoGrupo.includes(j.posicao)) return;
                if (j.ovr < ovrMinimo) return;
                if (idadeMaxima !== null && j.idade > idadeMaxima) return;
                if (nomeFiltro && !j.nome.toLowerCase().includes(nomeFiltro)) return;
                resultados.push({ ...j, clube, liga });
            });
        });
    });

    resultados.sort((a, b) => b.ovr - a.ovr);
    let totalEncontrado = resultados.length;
    let resultadosExibidos = resultados.slice(0, SCOUT_LIMITE_RESULTADOS);

    if (contagemEl) {
        contagemEl.innerText = totalEncontrado === 0
            ? 'Nenhum jogador encontrado com esses filtros.'
            : (totalEncontrado > SCOUT_LIMITE_RESULTADOS
                ? `Mostrando os ${SCOUT_LIMITE_RESULTADOS} de maior OVR (${totalEncontrado} encontrados) — refine os filtros pra ver outros.`
                : `${totalEncontrado} jogador${totalEncontrado === 1 ? '' : 'es'} encontrado${totalEncontrado === 1 ? '' : 's'}.`);
    }

    if (resultadosExibidos.length === 0) {
        corpo.innerHTML = `<tr><td colspan="7" class="wizard-elenco-vazio">Nenhum jogador encontrado. Ajuste os filtros (ex: baixe o OVR mínimo).</td></tr>`;
        return;
    }

    corpo.innerHTML = resultadosExibidos.map(j => `
        <tr>
            <td class="tc-titulo">${j.nome}</td>
            <td data-label="Posição">${j.posicao}</td>
            <td data-label="OVR">${j.ovr}</td>
            <td data-label="Idade">${j.idade}</td>
            <td data-label="Clube">${j.clube}</td>
            <td data-label="Liga">${j.liga}</td>
            <td class="tc-acoes">
                <button class="btn-upload" style="margin:0; padding:6px 10px; color:var(--accent); border-color:var(--accent);"
                    onclick="scoutUsarNoFormularioCompra('${j.nome.replace(/'/g, "\\'")}', '${j.posicao}', ${j.ovr}, ${j.idade})">📥 Usar na Compra</button>
            </td>
        </tr>`).join('');
}

// Leva os dados do jogador escolhido pro formulário manual de "Comprar Reforço" (aba
// Transferências) — o treinador ainda confere/ajusta a especialidade e preenche o custo real
// (o valor não vem do scout: é o que aparecer no seu próprio jogo de futebol ao negociar).
function scoutUsarNoFormularioCompra(nome, siglaEA, ovr, idade) {
    mudarAba('tab-mercado');

    let painel = document.getElementById('painel-controles-manuais-mercado');
    let btnToggle = document.getElementById('btn-toggle-controles-mercado');
    if (painel && painel.style.display === 'none') {
        painel.style.display = 'grid';
        if (btnToggle) btnToggle.innerHTML = '👁️ Ocultar Controles Manuais';
    }

    document.getElementById('add-nome').value = nome;
    document.getElementById('add-pos').value = SCOUT_ESPECIALIDADE_PADRAO_POR_SIGLA[siglaEA] || 'MeioCampo/Dinâmico';
    document.getElementById('add-ovr').value = ovr;
    document.getElementById('add-idade').value = idade;

    let campoNome = document.getElementById('add-nome');
    if (campoNome) campoNome.scrollIntoView({ behavior: 'smooth', block: 'center' });

    alert(`Dados de ${nome} preenchidos no formulário de compra. Confira a especialidade e preencha o custo real (o valor que apareceu no seu jogo de futebol) antes de salvar.`);
}
