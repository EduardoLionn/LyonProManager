// ============================================================
// MENU PRINCIPAL + TELA DE NOVO JOGO — assistente multi-etapas estilo Football Manager.
// O site sempre abre no Menu Principal (aba "tab-menu-principal"). De lá dá pra:
//  - Continuar o último save carregado
//  - Começar um save totalmente novo (Novo Jogo)
//  - Carregar/apagar qualquer save salvo neste navegador, ou importar um backup .json
// ============================================================

let wizardEtapas = [];
let wizardEtapaIdx = 0;
let wizardLigaSelecionada = null; // valor real escolhido pelo usuário nesta sessão (evita usar o default do <select>)
let wizardIsNovoSaveCompleto = false; // true = veio do "Novo Jogo" do Menu Principal (save inteiro em branco)

// ============================================================
// MENU PRINCIPAL
// ============================================================

// Chamada pelo mudarAba() sempre que a aba "tab-menu-principal" fica ativa: volta pra tela de escolha (hero).
function menuPrincipalResetView() {
    // Tela de escolha (Continuar/Novo Jogo/Carregar Save) é "tela cheia" — sem a barra lateral,
    // que só volta a aparecer quando um save é de fato aberto (ver menuNovoJogo/ajustarInterfaceSave).
    let sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = 'none';
    // Sem save aberto não há pra onde a gaveta mobile levar — esconde a barra do ☰ junto.
    let topbarMobile = document.querySelector('.mobile-topbar');
    if (topbarMobile) topbarMobile.style.display = 'none';

    document.getElementById('wizard-tela-hero').style.display = 'block';
    document.getElementById('menu-carregar-save-lista').style.display = 'none';
    document.getElementById('wizard-header').style.display = 'none';
    document.querySelectorAll('.wizard-step').forEach(el => el.style.display = 'none');
    document.getElementById('wizard-nav').style.display = 'none';

    let ativoId = saveAtualId || obterIdSaveAtivo();
    let entradaAtiva = ativoId ? listarSaves().find(s => s.id === ativoId) : null;
    let boxContinuar = document.getElementById('menu-continuar-box');
    if (entradaAtiva) {
        boxContinuar.style.display = 'block';
        document.getElementById('menu-continuar-nome').innerText = entradaAtiva.nome;
    } else {
        boxContinuar.style.display = 'none';
    }
}

function mostrarMenuPrincipal() {
    mudarAba('tab-menu-principal');
}

function menuContinuarSave() {
    let id = saveAtualId || obterIdSaveAtivo();
    if (!id || !carregarSave(id)) {
        alert('Não foi possível continuar automaticamente. Escolha o save na lista "Carregar Save".');
        menuPrincipalResetView();
        return;
    }
    ajustarInterfaceSave();
}

function menuNovoJogo() {
    db = dbPadrao();
    saveAtualId = null;
    wizardIsNovoSaveCompleto = true;
    // A barra lateral fica escondida durante todo o assistente — só volta a aparecer quando
    // wizardFinalizar() chama ajustarInterfaceSave() ao concluir a criação do save.
    document.getElementById('wizard-tela-hero').style.display = 'none';
    document.getElementById('menu-carregar-save-lista').style.display = 'none';
    wizardIniciar();
}

function menuAbrirCarregarSave() {
    document.getElementById('wizard-tela-hero').style.display = 'none';
    document.getElementById('menu-carregar-save-lista').style.display = 'block';
    menuRenderListaSaves();
}

function menuVoltarHero() {
    document.getElementById('menu-carregar-save-lista').style.display = 'none';
    menuPrincipalResetView();
}

function menuRenderListaSaves() {
    let lista = listarSaves();
    let container = document.getElementById('menu-lista-saves');
    if (lista.length === 0) {
        container.innerHTML = `<p class="wizard-elenco-vazio">Nenhum save salvo neste navegador ainda.</p>`;
        return;
    }
    container.innerHTML = lista.map(s => {
        let partes = [];
        if (s.resumo && s.resumo.clubeNome) partes.push(`⚽ ${s.resumo.clubeNome} (${s.resumo.clubeLiga || '-'})`);
        if (s.resumo && s.resumo.selecaoNome) partes.push(`🌐 ${s.resumo.selecaoNome}`);
        let resumoTxt = partes.length > 0 ? partes.join(' · ') : 'Carreira ainda não configurada';
        let dataTxt = new Date(s.atualizadoEm).toLocaleDateString('pt-BR');
        return `
        <div class="save-card">
            <div class="save-card-info">
                <strong>${s.nome}</strong>
                <span>${resumoTxt}</span>
                <span class="save-card-data">Última vez em ${dataTxt}</span>
            </div>
            <div class="save-card-acoes">
                <button onclick="menuCarregarSaveClick('${s.id}')">▶️ Carregar</button>
                <button class="btn-hero-secundario" style="color:var(--danger); border-color:var(--danger);" onclick="menuExcluirSaveClick('${s.id}', '${s.nome.replace(/'/g, "\\'")}')">🗑️ Apagar</button>
            </div>
        </div>`;
    }).join('');
}

function menuCarregarSaveClick(id) {
    if (!carregarSave(id)) return alert('Não foi possível carregar este save.');
    ajustarInterfaceSave();
}

async function menuExcluirSaveClick(id, nome) {
    if (await confirmarModerno(`Apagar o save "${nome}" permanentemente? Essa ação não pode ser desfeita.`, "Apagar Save", { perigo: true, textoConfirmar: "Apagar" })) {
        excluirSave(id);
        menuRenderListaSaves(); // continua na lista — só a "Continuar" do hero é atualizada quando ele voltar pra lá
    }
}

function menuImportarArquivoSave(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = e => {
        try {
            let dbImportado = JSON.parse(e.target.result);
            importarSaveDeBackup(dbImportado);
            alert('Save importado! Já aparece na lista abaixo.');
            menuRenderListaSaves();
        } catch (err) { alert('Arquivo inválido!'); }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
}

// ============================================================
// ASSISTENTE DE NOVO JOGO (wizard)
// ============================================================

// Chamada pelo ajustarInterfaceSave() quando o slot atual (clube/seleção) de um save JÁ ATIVO
// ainda não tem nome definido (ex: você continua um save de clube e agora quer configurar a seleção também).
// Aqui não existe "menu de escolha": vai direto pras etapas do assistente.
function iniciarTelaNovoJogo() {
    wizardIsNovoSaveCompleto = false;
    mudarAba('tab-menu-principal');
    document.getElementById('wizard-tela-hero').style.display = 'none';
    document.getElementById('menu-carregar-save-lista').style.display = 'none';
    wizardIniciar();
}

function wizardIniciar() {
    document.getElementById('wizard-tela-hero').style.display = 'none';
    document.getElementById('wizard-header').style.display = 'block';

    // Reseta os campos do assistente (evita "vazamento" de dados entre saves/slots)
    ['setup-nome-time', 'setup-nome-time-selecao', 'setup-save-name', 'setup-nome-tecnico',
     'setup-nome-diretor', 'setup-nome-auxiliar',
     'setup-dir-media-gasto', 'setup-dir-media-arrecadacao', 'setup-dir-titulos', 'setup-dir-posicao', 'setup-dir-posicao-copa']
        .forEach(id => { let el = document.getElementById(id); if (el) el.value = ''; });
    wizardLigaSelecionada = null;

    // Copia as opções de posição do formulário de elenco principal (fonte única de verdade)
    let wizPos = document.getElementById('wiz-jog-pos');
    let cadPos = document.getElementById('cad-pos');
    if (wizPos && cadPos) wizPos.innerHTML = cadPos.innerHTML;

    wizardEtapas = currentSave === 'clube'
        ? ['perfil', 'liga', 'clube', 'diretoria', 'tatica', 'elenco', 'resumo']
        : ['perfil', 'liga', 'diretoria', 'tatica', 'resumo'];
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
    document.querySelector('#wizard-nav .btn-wizard-voltar').style.display = 'inline-block';
    document.getElementById('wizard-btn-avancar').style.display = (etapaId === 'resumo') ? 'none' : 'inline-block';

    if (etapaId === 'perfil') wizardRenderStepPerfil();
    if (etapaId === 'liga') wizardRenderStepLiga();
    if (etapaId === 'clube') wizardRenderStepClube();
    if (etapaId === 'diretoria') wizardRenderStepDiretoria();
    if (etapaId === 'tatica') wizardRenderStepTatica();
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
    } else {
        // Primeira etapa: "Voltar" sai do assistente e retorna pra tela de escolha do Menu Principal.
        menuVoltarHero();
    }
}

function wizardValidarEtapaAtual() {
    let etapaId = wizardEtapas[wizardEtapaIdx];
    if (etapaId === 'perfil') return wizardValidarPerfil();
    if (etapaId === 'liga') return wizardValidarLiga();
    if (etapaId === 'clube') return wizardValidarClube();
    if (etapaId === 'tatica') return wizardValidarTatica();
    return true;
}

// --- ETAPA: PERFIL ---
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

// --- ETAPA: PAÍS / LIGA (clube) OU NÍVEL (seleção) ---
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

// --- ETAPA: CLUBE (apenas modo Clube) ---
function wizardRenderStepClube() {
    let liga = document.getElementById('setup-liga').value;
    // A lista de clubes sugeridos muda pela temporada inicial escolhida no passo Perfil — a
    // temporada "25/26" reflete a edição FC26 do jogo de futebol, "26/27" reflete FC27 etc.
    let temporadaWizard = document.getElementById('setup-temporada') ? document.getElementById('setup-temporada').value : '';
    let clubesDaTemporada = (typeof clubesPorLigaDaTemporada === 'function') ? clubesPorLigaDaTemporada(temporadaWizard) : clubesPorLiga;
    window._wizardClubesLista = (clubesDaTemporada && clubesDaTemporada[liga]) ? clubesDaTemporada[liga] : [];
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

// --- ETAPA: DIRETORIA ---
function wizardRenderStepDiretoria() {
    let box = document.getElementById('box-setup-continental');
    if (box) box.style.display = currentSave === 'clube' ? 'flex' : 'none';
}

// --- ETAPA: TÁTICA ---
// A única coisa que o treinador escolhe aqui é o Estilo de Jogo (até 4 formações preferidas +
// preset ou texto livre) — o motor em js/estilo-jogo.js traduz isso na configuração completa.
// Sem escolhas manuais soltas: ao "Iniciar Partida" o resto do jogo tem que refletir exatamente
// o que o Auxiliar decidiu a partir do Estilo de Jogo, não um valor mexido à parte no assistente.
function wizardRenderStepTatica() {
    if (typeof renderizarSeletorEstiloJogo === 'function') renderizarSeletorEstiloJogo('wiz-');
}

// Bloqueia avançar sem ter gerado a configuração tática pelo menos uma vez — sem isso,
// db[currentSave].taticas ficaria incompleto no fim do assistente.
function wizardValidarTatica() {
    if (!window._wizardRelatorioEstiloJogo) {
        alert('Escolha as formações preferidas e um estilo de jogo, depois clique no botão de aplicar/salvar a configuração antes de continuar.');
        return false;
    }
    return true;
}

// Traduz a sigla de posição EA (do banco de jogadores reais, ex: "CB", "ST", "LW") pra sigla
// de "Posição Base" que classificarEspecialidadesEmLote()/PROMPT_CLASSIFICACAO_ESPECIALIDADE_IA
// já entendem (mesmas siglas que a leitura de print por IA usa) — assim o elenco real passa
// pela mesma classificação de especialidade (scout) que qualquer outro jogador cadastrado.
const MAPA_POSICAO_EA_PARA_BASE = {
    GK: 'GL',
    CB: 'ZAG', LCB: 'ZAG', RCB: 'ZAG',
    LB: 'LE', RB: 'LD',
    CDM: 'VOL', LDM: 'VOL', RDM: 'VOL',
    CM: 'MC', LCM: 'MC', RCM: 'MC',
    CAM: 'MEI', LAM: 'MEI', RAM: 'MEI',
    LM: 'ME', RM: 'MD',
    LW: 'ME', RW: 'MD',
    LS: 'ATA', RS: 'ATA', ST: 'ATA'
};

// Mostra (ou esconde) o banner "encontramos o elenco real desse clube" na etapa de Elenco —
// só aparece se o clube escolhido tem base real cadastrada E o elenco ainda está vazio (nunca
// sobrescreve cadastro manual ou leitura por print já feita).
function wizardVerificarElencoReal() {
    let banner = document.getElementById('wizard-elenco-real-banner');
    if (!banner) return;

    if (currentSave !== 'clube' || typeof elencoRealDoClube !== 'function') { banner.style.display = 'none'; return; }

    let nomeClube = (document.getElementById('setup-nome-time').value || '').trim();
    let temporada = document.getElementById('setup-temporada') ? document.getElementById('setup-temporada').value : '';
    let elencoReal = nomeClube ? elencoRealDoClube(nomeClube, temporada) : null;

    if (!elencoReal || (db.clube.plantel || []).length > 0) { banner.style.display = 'none'; return; }

    banner.style.display = 'flex';
    banner.innerHTML = `
        <span>⚽ Encontramos o elenco real do <strong>${nomeClube}</strong> (${elencoReal.length} jogadores) — quer carregar tudo automaticamente em vez de cadastrar um por um?</span>
        <button type="button" onclick="wizardCarregarElencoReal()">✅ Carregar Elenco Real</button>
    `;
}

// Carrega o elenco real do clube escolhido: pega nome/idade/OVR do banco de jogadores reais e
// classifica a especialidade de cada um pela mesma IA de scout usada na leitura de print
// (classificarEspecialidadesEmLote), pra virar um jogador jogável de verdade (com função certa
// pra escalação), não só um nome com uma sigla EA que o jogo nem usa.
async function wizardCarregarElencoReal() {
    let nomeClube = (document.getElementById('setup-nome-time').value || '').trim();
    let temporada = document.getElementById('setup-temporada') ? document.getElementById('setup-temporada').value : '';
    let elencoReal = elencoRealDoClube(nomeClube, temporada);
    if (!elencoReal || elencoReal.length === 0) return;

    atualizarLoaderPlantel('Classificando a especialidade de cada jogador do elenco real...');

    let lote = elencoReal.map(p => ({
        nome: p.nome,
        posicaoBase: MAPA_POSICAO_EA_PARA_BASE[p.posicao] || 'MC',
        ovr: p.ovr
    }));
    let classificacoes = await classificarEspecialidadesEmLote(lote);

    db.clube.plantel = elencoReal.map((p, idx) => {
        let posicaoClassificada = ESPECIALIDADES_JOGADOR[classificacoes[idx]] ? classificacoes[idx] : 'MeioCampo/Dinâmico';
        let jogador = { nome: p.nome, posicao: posicaoClassificada, ovr: p.ovr, idade: p.idade, status: 'Ativo', jogosAvaliacao: 0 };
        if (typeof garantirCamposElenco === 'function') garantirCamposElenco(jogador);
        return jogador;
    });

    atualizarLoaderPlantel('');
    wizardRenderElenco();
}

// --- ETAPA: ELENCO INICIAL (apenas modo Clube) ---
function wizardRenderElenco() {
    wizardVerificarElencoReal();
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
            <td style="display:flex; gap:6px;">
                <button class="btn-upload" style="margin:0; padding:4px 8px; color:var(--warning); border-color:var(--warning);" title="A idade não vem do print — edite aqui se precisar" onclick="abrirModalEditarJogador('${p.nome.replace(/'/g, "\\'")}')">✏️</button>
                <button class="btn-upload" style="margin:0; padding:4px 8px; color:var(--danger); border-color:var(--danger);" onclick="wizardRemoverJogador(${idx})">🗑️</button>
            </td>
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
    if (typeof garantirCamposElenco === 'function') garantirCamposElenco(jogador);
    db.clube.plantel.push(jogador);

    document.getElementById('wiz-jog-nome').value = '';
    document.getElementById('wiz-jog-idade').value = '';
    wizardRenderElenco();
}

function wizardRemoverJogador(idx) {
    db.clube.plantel.splice(idx, 1);
    wizardRenderElenco();
}

// --- ETAPA: RESUMO E FINALIZAÇÃO ---
function wizardRenderResumo() {
    let nome = currentSave === 'clube'
        ? document.getElementById('setup-nome-time').value.trim()
        : document.getElementById('setup-nome-time-selecao').value.trim();
    let saveName = document.getElementById('setup-save-name').value.trim() || nome;
    let tecnico = document.getElementById('setup-nome-tecnico').value.trim();
    let nomeDiretor = document.getElementById('setup-nome-diretor').value.trim();
    let nomeAuxiliar = document.getElementById('setup-nome-auxiliar').value.trim();
    let liga = document.getElementById('setup-liga').value;
    let temporada = currentSave === 'clube' ? document.getElementById('setup-temporada').value : document.getElementById('setup-ciclo').value;
    let mediaGasto = document.getElementById('setup-dir-media-gasto').value || 0;
    let mediaArrec = document.getElementById('setup-dir-media-arrecadacao').value || 0;
    let titulos = document.getElementById('setup-dir-titulos').value || 0;
    let posicao = document.getElementById('setup-dir-posicao').value || '-';
    let posicaoCopa = document.getElementById('setup-dir-posicao-copa').value || '-';
    let formacaoPrimaria = (window._wizardRelatorioEstiloJogo && window._wizardRelatorioEstiloJogo.esquemaEscolhido) || '-';

    let itens = [
        ['Save', saveName],
        ['Técnico', tecnico || '-'],
        [currentSave === 'clube' ? 'Clube' : 'Seleção', nome],
        ['Divisão / Nível', liga],
        [currentSave === 'clube' ? 'Temporada Inicial' : 'Ciclo Inicial', temporada],
        ['Diretor Executivo', nomeDiretor || 'A Diretoria'],
        ['Auxiliar Técnico', nomeAuxiliar || 'O Auxiliar Técnico'],
        ['Formação Preferida', formacaoPrimaria],
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
    let nomeDiretor = document.getElementById('setup-nome-diretor').value.trim();
    let nomeAuxiliar = document.getElementById('setup-nome-auxiliar').value.trim();
    let liga = document.getElementById('setup-liga').value;
    let temporada = currentSave === 'clube' ? document.getElementById('setup-temporada').value : document.getElementById('setup-ciclo').value;

    db[currentSave].nome = nome;
    db[currentSave].saveName = saveName;
    db[currentSave].nomeTecnico = nomeTecnico;
    db[currentSave].nomeDiretor = nomeDiretor;
    db[currentSave].nomeAuxiliar = nomeAuxiliar;
    db[currentSave].liga = liga;
    db[currentSave].temporadaAtual = temporada;

    // wizardValidarTatica() já garante que isto existe antes de deixar chegar aqui — a tática
    // inteira vem do Estilo de Jogo, sem escolha manual solta que pudesse divergir do que o
    // Auxiliar aplica depois em campo.
    if (window._wizardRelatorioEstiloJogo && typeof corrigirTatica === 'function') {
        let r = window._wizardRelatorioEstiloJogo;
        db[currentSave].taticas = corrigirTatica({
            predefinicao: r.predefinicao,
            estiloArmacao: r.estiloArmacao,
            esquema: r.esquemaEscolhido,
            esquemaAlternativo: (r.formacoesPreferidas && r.formacoesPreferidas[1]) || r.esquemaEscolhido,
            abordagemDefensiva: r.abordagemDefensiva
        }).tatica;
        db[currentSave].taticas.formacoesPreferidas = r.formacoesPreferidas || [];
        db[currentSave].taticas.estiloJogoSelecionado = r.origem;
        db[currentSave].taticas.funcoesPorRoleSugeridas = r.funcoesPorRole;
        // Mesma persistência de aplicarRelatorioTaticoNoSave() (js/estilo-jogo.js) — sem isso, o
        // resumo salvo na aba Perfil do Treinador não conseguiria explicar por que o esquema em
        // uso pode não ser a 1ª formação preferida, pra saves criados aqui no assistente.
        db[currentSave].taticas.esquemaPreteridas = r.esquemaPreteridas || [];
        // Camaleão: guarda a "assinatura" do elenco (vazio aqui, ainda no assistente) usada
        // nesta análise — sem isso, a 1ª sugestão do Auxiliar depois de montar o elenco não
        // saberia que precisa reanalisar de verdade (ver atualizarCamaleaoSeElencoMudou).
        if (r.origem && r.origem.tipo === 'camaleao') {
            db[currentSave].taticas.camaleaoFingerprintElenco = (typeof r._fingerprintElenco === 'string') ? r._fingerprintElenco : '';
        }
        window._wizardRelatorioEstiloJogo = null;
    }

    adicionarNoticiaAutomatica(
        `🚨 O projeto começa: ${nome} inicia a temporada ${temporada}.`,
        `A diretoria estabeleceu novas diretrizes ambiciosas para o início desta temporada do ${nome}. O planejamento envolve foco total no campeonato e buscar a solidificação tática sob a tutela do novo técnico, ${nomeTecnico}.`
    );

    // Se veio do "Novo Jogo" do Menu Principal, registra este save inteiro como novo na lista agora
    if (wizardIsNovoSaveCompleto) {
        registrarNovoSaveAtivo(saveName);
    }

    let btn = document.getElementById('wizard-btn-finalizar');
    btn.disabled = true; btn.innerText = '⏳ Preparando a temporada...';

    let mediaGasto = document.getElementById('setup-dir-media-gasto').value;
    let mediaArrec = document.getElementById('setup-dir-media-arrecadacao').value;
    let titulos = document.getElementById('setup-dir-titulos').value;
    let posicaoMedia = document.getElementById('setup-dir-posicao').value;
    let posicaoCopaMedia = document.getElementById('setup-dir-posicao-copa').value;
    let continental = currentSave === 'clube' ? document.getElementById('setup-dir-continental').value : 'Nenhuma';

    await definirMetasDiretoriaIA(mediaGasto, mediaArrec, titulos, posicaoMedia, posicaoCopaMedia, continental);

    // Mensagens automáticas de boas-vindas do Diretor e do Auxiliar (texto fixo, sem custo de IA)
    let exibDiretor = nomeDiretor || 'A Diretoria';
    let exibAuxiliar = nomeAuxiliar || 'O Auxiliar Técnico';
    let formacaoEscolhida = (db[currentSave].taticas && db[currentSave].taticas.esquema) || '4-2-3-1';
    db[currentSave].chatHistory.diretoria.push({
        role: 'ai',
        text: `Seja muito bem-vindo(a) ao ${nome}, ${nomeTecnico}! Eu sou ${exibDiretor}${nomeDiretor ? '' : ', a diretoria do clube'}. A partir de agora vou acompanhar de perto sua gestão — os objetivos da temporada já estão definidos, dá uma olhada aí embaixo. Conte comigo pra o que precisar.`
    });
    db[currentSave].chatHistory.auxiliar.push({
        role: 'ai',
        text: `Fala, mister! Sou ${exibAuxiliar}${nomeAuxiliar ? '' : ', seu auxiliar técnico'}. Já anotei sua filosofia tática (formação ${formacaoEscolhida} como principal) — assim que tiver o elenco pronto, é só pedir que eu monto a escalação e as instruções pro primeiro jogo.`
    });

    salvarDados();
    ajustarInterfaceSave();

    btn.disabled = false; btn.innerText = '🏁 Começar Carreira';
}
