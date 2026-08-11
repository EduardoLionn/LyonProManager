// ============================================================
// TELA DE NOVO JOGO — assistente multi-etapas estilo Football Manager
// Substitui o antigo modal único de "Configuração da Carreira".
// ============================================================

let wizardEtapas = [];
let wizardEtapaIdx = 0;
let wizardLigaSelecionada = null; // valor real escolhido pelo usuário nesta sessão (evita usar o default do <select>)

// Chamada pelo ajustarInterfaceSave() sempre que o slot atual (clube/seleção) ainda não tem nome definido.
function iniciarTelaNovoJogo() {
    let wrapper = document.getElementById('wizard-novo-jogo');
    if (!wrapper) return;
    wrapper.style.display = 'flex';
    document.getElementById('wizard-tela-hero').style.display = 'block';
    document.getElementById('wizard-header').style.display = 'none';
    document.querySelectorAll('.wizard-step').forEach(el => el.style.display = 'none');
    document.getElementById('wizard-nav').style.display = 'none';

    document.getElementById('wizard-hero-sub').innerText = currentSave === 'selecao'
        ? 'Assuma o comando de uma seleção nacional. Escolha o nível e defina os objetivos com a diretoria.'
        : 'Assuma o comando. Sua carreira como técnico começa aqui.';

    // Reseta os campos do assistente (evita "vazamento" de dados entre os slots clube/seleção)
    ['setup-nome-time', 'setup-nome-time-selecao', 'setup-save-name', 'setup-nome-tecnico',
     'setup-dir-media-gasto', 'setup-dir-media-arrecadacao', 'setup-dir-titulos', 'setup-dir-posicao', 'setup-dir-posicao-copa']
        .forEach(id => { let el = document.getElementById(id); if (el) el.value = ''; });
    wizardLigaSelecionada = null;

    // Copia as opções de posição do formulário de elenco principal (fonte única de verdade)
    let wizPos = document.getElementById('wiz-jog-pos');
    let cadPos = document.getElementById('cad-pos');
    if (wizPos && cadPos) wizPos.innerHTML = cadPos.innerHTML;
}

function wizardIniciar() {
    document.getElementById('wizard-tela-hero').style.display = 'none';
    document.getElementById('wizard-header').style.display = 'block';
    wizardEtapas = currentSave === 'clube'
        ? ['perfil', 'liga', 'clube', 'diretoria', 'elenco', 'resumo']
        : ['perfil', 'liga', 'diretoria', 'resumo'];
    wizardEtapaIdx = 0;
    wizardMostrarEtapa(0);
}

function wizardMostrarEtapa(idx) {
    let etapaId = wizardEtapas[idx];
    document.querySelectorAll('.wizard-step').forEach(el => el.style.display = 'none');
    document.getElementById('wizard-step-' + etapaId).style.display = 'block';

    document.getElementById('wizard-contagem-etapa').innerText = `Etapa ${idx + 1} de ${wizardEtapas.length}`;
    document.getElementById('wizard-stepper').innerHTML = wizardEtapas.map((e, i) =>
        `<div class="wizard-step-dot ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}"></div>`
    ).join('');

    document.getElementById('wizard-nav').style.display = 'flex';
    document.querySelector('.btn-wizard-voltar').style.display = idx === 0 ? 'none' : 'inline-block';
    document.getElementById('wizard-btn-avancar').style.display = (etapaId === 'resumo') ? 'none' : 'inline-block';

    if (etapaId === 'perfil') wizardRenderStepPerfil();
    if (etapaId === 'liga') wizardRenderStepLiga();
    if (etapaId === 'clube') wizardRenderStepClube();
    if (etapaId === 'diretoria') wizardRenderStepDiretoria();
    if (etapaId === 'elenco') wizardRenderElenco();
    if (etapaId === 'resumo') wizardRenderResumo();

    let h2 = document.querySelector('#wizard-step-' + etapaId + ' h2');
    document.getElementById('wizard-titulo-etapa').innerText = h2 ? h2.innerText : 'Novo Jogo';
}

function wizardAvancar() {
    if (!wizardValidarEtapaAtual()) return;
    if (wizardEtapaIdx < wizardEtapas.length - 1) {
        wizardEtapaIdx++;
        wizardMostrarEtapa(wizardEtapaIdx);
    }
}

function wizardVoltar() {
    if (wizardEtapaIdx > 0) {
        wizardEtapaIdx--;
        wizardMostrarEtapa(wizardEtapaIdx);
    }
}

function wizardValidarEtapaAtual() {
    let etapaId = wizardEtapas[wizardEtapaIdx];
    if (etapaId === 'perfil') return wizardValidarPerfil();
    if (etapaId === 'liga') return wizardValidarLiga();
    if (etapaId === 'clube') return wizardValidarClube();
    return true;
}

// --- ETAPA 1: PERFIL ---
function wizardRenderStepPerfil() {
    document.getElementById('wizard-linha-nome-time').style.display = currentSave === 'selecao' ? 'grid' : 'none';
    document.getElementById('wizard-linha-temporada').style.display = currentSave === 'selecao' ? 'none' : 'flex';
}

function wizardValidarPerfil() {
    let nomeTecnico = document.getElementById('setup-nome-tecnico').value.trim();
    if (!nomeTecnico) { alert("Digite o nome do técnico!"); return false; }
    if (!nomeTecnico.includes(' ')) { alert("Digite nome E sobrenome do técnico (ex: Carlo Ancelotti)."); return false; }
    if (currentSave === 'selecao') {
        let nomeSel = document.getElementById('setup-nome-time-selecao').value.trim();
        if (!nomeSel) { alert("Digite o nome da seleção!"); return false; }
    }
    return true;
}

// --- ETAPA 2: PAÍS / LIGA (clube) OU NÍVEL (seleção) ---
function wizardRenderStepLiga() {
    let paisGrid = document.getElementById('wizard-pais-grid');
    let ligaGrid = document.getElementById('wizard-liga-grid');
    let tituloEl = document.getElementById('wizard-liga-titulo');
    let subEl = document.getElementById('wizard-liga-subtitulo');

    if (currentSave === 'selecao') {
        tituloEl.innerText = '🌐 Nível da Seleção';
        subEl.innerText = 'Escolha o patamar competitivo da seleção nacional escolhida.';
        paisGrid.style.display = 'none';
        paisGrid.innerHTML = '';
        let og = [...document.querySelectorAll('#setup-liga optgroup')].find(o => o.label.includes('Seleções'));
        ligaGrid.innerHTML = [...og.children].map(opt =>
            `<div class="pick-card ${opt.value === wizardLigaSelecionada ? 'selected' : ''}" onclick="wizardSelecionarLiga(this)" data-liga-valor="${opt.value}"><span class="pick-label">${opt.value}</span></div>`
        ).join('');
        return;
    }

    tituloEl.innerText = '🌍 País e Divisão';
    subEl.innerText = 'Escolha o país e depois a divisão em que sua carreira começa.';
    paisGrid.style.display = 'grid';
    let optgroups = [...document.querySelectorAll('#setup-liga optgroup')].filter(og => !og.label.includes('Seleções'));
    window._wizardOptgroups = optgroups;
    let paisAtualIdx = optgroups.findIndex(og => [...og.children].some(o => o.value === wizardLigaSelecionada));
    paisGrid.innerHTML = optgroups.map((og, i) =>
        `<div class="pick-card ${i === paisAtualIdx ? 'selected' : ''}" onclick="wizardSelecionarPais(${i})"><span class="pick-label">${og.label}</span></div>`
    ).join('');
    if (paisAtualIdx >= 0) wizardRenderLigasDoPais(paisAtualIdx);
    else ligaGrid.innerHTML = '';
}

function wizardSelecionarPais(idx) {
    document.querySelectorAll('#wizard-pais-grid .pick-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('#wizard-pais-grid .pick-card')[idx].classList.add('selected');
    wizardRenderLigasDoPais(idx);
}

function wizardRenderLigasDoPais(idx) {
    let og = window._wizardOptgroups[idx];
    document.getElementById('wizard-liga-grid').innerHTML = [...og.children].map(opt =>
        `<div class="pick-card ${opt.value === wizardLigaSelecionada ? 'selected' : ''}" onclick="wizardSelecionarLiga(this)" data-liga-valor="${opt.value}"><span class="pick-label">${opt.value}</span></div>`
    ).join('');
}

function wizardSelecionarLiga(el) {
    document.querySelectorAll('#wizard-liga-grid .pick-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    wizardLigaSelecionada = el.dataset.ligaValor;
    document.getElementById('setup-liga').value = wizardLigaSelecionada;
}

function wizardValidarLiga() {
    if (!wizardLigaSelecionada) { alert("Escolha a divisão / nível antes de continuar!"); return false; }
    return true;
}

// --- ETAPA 3: CLUBE (apenas modo Clube) ---
function wizardRenderStepClube() {
    let liga = document.getElementById('setup-liga').value;
    window._wizardClubesLista = (typeof clubesPorLiga !== 'undefined' && clubesPorLiga[liga]) ? clubesPorLiga[liga] : [];
    document.getElementById('wizard-busca-clube').value = '';
    wizardFiltrarClubes();
}

function wizardFiltrarClubes() {
    let termo = (document.getElementById('wizard-busca-clube').value || '').toLowerCase();
    let lista = window._wizardClubesLista || [];
    let filtrados = lista.filter(c => c.toLowerCase().includes(termo));
    let grid = document.getElementById('wizard-club-grid');
    let nomeAtual = document.getElementById('setup-nome-time').value;

    if (filtrados.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; color:var(--text-muted); font-size:13px; text-align:center; padding:20px;">Nenhum clube encontrado para esta divisão/busca. Digite o nome manualmente abaixo — funciona para qualquer edição ou temporada do seu jogo.</p>`;
        return;
    }
    grid.innerHTML = filtrados.map(c =>
        `<div class="club-card ${c === nomeAtual ? 'selected' : ''}" onclick="wizardSelecionarClube('${c.replace(/'/g, "\\'")}', this)">${c}</div>`
    ).join('');
}

function wizardSelecionarClube(nome, el) {
    document.querySelectorAll('#wizard-club-grid .club-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('setup-nome-time').value = nome;
}

function wizardValidarClube() {
    let nome = document.getElementById('setup-nome-time').value.trim();
    if (!nome) { alert("Escolha um clube da lista ou digite o nome manualmente!"); return false; }
    return true;
}

// --- ETAPA 4: DIRETORIA ---
function wizardRenderStepDiretoria() {
    let box = document.getElementById('box-setup-continental');
    if (box) box.style.display = currentSave === 'clube' ? 'flex' : 'none';
}

// --- ETAPA 5: ELENCO INICIAL (apenas modo Clube) ---
function wizardRenderElenco() {
    let tbody = document.querySelector('#wizard-tabela-elenco tbody');
    let elenco = db.clube.plantel || [];
    if (elenco.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="wizard-elenco-vazio">Nenhum jogador adicionado ainda. Use o formulário acima ou tire um print do elenco.</td></tr>`;
        return;
    }
    tbody.innerHTML = elenco.map((p, idx) => `
        <tr>
            <td>${p.posicao}</td>
            <td><strong>${p.nome}</strong></td>
            <td>${p.ovr}</td>
            <td>${p.idade || '-'}</td>
            <td><button class="btn-upload" style="margin:0; padding:4px 8px; color:var(--danger); border-color:var(--danger);" onclick="wizardRemoverJogador(${idx})">🗑️</button></td>
        </tr>`).join('');
}

function wizardAdicionarJogador() {
    let nome = document.getElementById('wiz-jog-nome').value.trim();
    if (!nome) return alert("Digite o nome do jogador!");
    let posicao = document.getElementById('wiz-jog-pos').value;
    let ovr = Number(document.getElementById('wiz-jog-ovr').value) || 70;
    let idadeVal = document.getElementById('wiz-jog-idade').value;

    let jogador = { nome: nome, posicao: posicao, ovr: ovr, status: 'Ativo', jogosAvaliacao: 0 };
    if (idadeVal) jogador.idade = Number(idadeVal);
    db.clube.plantel.push(jogador);

    document.getElementById('wiz-jog-nome').value = '';
    document.getElementById('wiz-jog-idade').value = '';
    wizardRenderElenco();
}

function wizardRemoverJogador(idx) {
    db.clube.plantel.splice(idx, 1);
    wizardRenderElenco();
}

// --- ETAPA 6: RESUMO E FINALIZAÇÃO ---
function wizardRenderResumo() {
    let nome = currentSave === 'clube'
        ? document.getElementById('setup-nome-time').value.trim()
        : document.getElementById('setup-nome-time-selecao').value.trim();
    let saveName = document.getElementById('setup-save-name').value.trim() || nome;
    let tecnico = document.getElementById('setup-nome-tecnico').value.trim();
    let liga = document.getElementById('setup-liga').value;
    let temporada = currentSave === 'clube' ? document.getElementById('setup-temporada').value : document.getElementById('setup-ciclo').value;
    let mediaGasto = document.getElementById('setup-dir-media-gasto').value || 0;
    let mediaArrec = document.getElementById('setup-dir-media-arrecadacao').value || 0;
    let titulos = document.getElementById('setup-dir-titulos').value || 0;
    let posicao = document.getElementById('setup-dir-posicao').value || '-';
    let posicaoCopa = document.getElementById('setup-dir-posicao-copa').value || '-';

    let itens = [
        ['Save', saveName],
        ['Técnico', tecnico || '-'],
        [currentSave === 'clube' ? 'Clube' : 'Seleção', nome],
        ['Divisão / Nível', liga],
        [currentSave === 'clube' ? 'Temporada Inicial' : 'Ciclo Inicial', temporada],
        ['Gasto médio (5 temp.)', `€${mediaGasto}M`],
        ['Arrecadação média (5 temp.)', `€${mediaArrec}M`],
        ['Títulos (5 temp.)', titulos],
        ['Posição média na liga', posicao],
        ['Desempenho médio na copa', posicaoCopa]
    ];
    if (currentSave === 'clube') itens.push(['Jogadores declarados', (db.clube.plantel || []).length]);

    document.getElementById('wizard-resumo-grid').innerHTML = itens.map(([label, val]) =>
        `<div class="wizard-resumo-item"><span>${label}</span><strong>${val}</strong></div>`
    ).join('');
}

async function wizardFinalizar() {
    let nome = currentSave === 'clube'
        ? document.getElementById('setup-nome-time').value.trim()
        : document.getElementById('setup-nome-time-selecao').value.trim();
    if (!nome) { alert("Escolha o nome do clube/seleção antes de continuar!"); return; }

    let saveName = document.getElementById('setup-save-name').value.trim() || nome;
    let nomeTecnico = document.getElementById('setup-nome-tecnico').value.trim();
    let liga = document.getElementById('setup-liga').value;
    let temporada = currentSave === 'clube' ? document.getElementById('setup-temporada').value : document.getElementById('setup-ciclo').value;

    db[currentSave].nome = nome;
    db[currentSave].saveName = saveName;
    db[currentSave].nomeTecnico = nomeTecnico;
    db[currentSave].liga = liga;
    db[currentSave].temporadaAtual = temporada;

    adicionarNoticiaAutomatica(
        `🚨 O projeto começa: ${nome} inicia a temporada ${temporada}.`,
        `A diretoria estabeleceu novas diretrizes ambiciosas para o início desta temporada do ${nome}. O planejamento envolve foco total no campeonato e buscar a solidificação tática sob a tutela do novo técnico, ${nomeTecnico}.`
    );

    let btn = document.getElementById('wizard-btn-finalizar');
    btn.disabled = true; btn.innerText = '⏳ Preparando a temporada...';

    let mediaGasto = document.getElementById('setup-dir-media-gasto').value;
    let mediaArrec = document.getElementById('setup-dir-media-arrecadacao').value;
    let titulos = document.getElementById('setup-dir-titulos').value;
    let posicaoMedia = document.getElementById('setup-dir-posicao').value;
    let posicaoCopaMedia = document.getElementById('setup-dir-posicao-copa').value;
    let continental = currentSave === 'clube' ? document.getElementById('setup-dir-continental').value : 'Nenhuma';

    await definirMetasDiretoriaIA(mediaGasto, mediaArrec, titulos, posicaoMedia, posicaoCopaMedia, continental);

    salvarDados();
    document.getElementById('wizard-novo-jogo').style.display = 'none';
    ajustarInterfaceSave();
    carregarPreferenciasTaticas();

    btn.disabled = false; btn.innerText = '🏁 Começar Carreira';
}
