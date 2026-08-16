// =====================================================================================
// CENTRAL DE MENSAGENS — a "caixa de e-mail" do clube
// =====================================================================================
// Tudo que a Diretoria, o Departamento Médico, o Auxiliar Técnico e os jogadores têm a
// dizer passa por aqui. Este arquivo cuida de:
// - guardar as mensagens no save (com opções de resposta e o resultado da escolha);
// - tocar a notificação e mostrar o balão no canto da tela, esteja o usuário na aba que estiver;
// - renderizar a aba "Mensagens" (caixa de entrada com filtros por remetente);
// - contar as "ações" e as partidas que disparam os eventos de cada departamento.
//
// Os eventos em si moram em js/eventos-diretoria.js e js/eventos-elenco.js — aqui fica só
// a infraestrutura compartilhada.

const CENTRAL_MSG_CFG = {
    ACOES_DIRETORIA_MIN: 15,
    ACOES_DIRETORIA_MAX: 25,
    PARTIDAS_MEDICO_MIN: 10,
    PARTIDAS_MEDICO_MAX: 20,
    PARTIDAS_JOGADORES_MIN: 8,
    PARTIDAS_JOGADORES_MAX: 12,
    MAX_MENSAGENS_JOGADORES: 5,   // teto por "rodada" de mensagens — quase nunca vem tudo isso
    MAX_CAIXA: 150                // mensagens guardadas no save (as mais antigas caem fora)
};

// Identidade visual de cada remetente na caixa de entrada
const REMETENTES_MSG = {
    diretoria: { rotulo: 'Diretoria', emoji: '👔', cor: 'var(--gold)', aba: 'tab-diretoria' },
    medico:    { rotulo: 'Departamento Médico', emoji: '🏥', cor: 'var(--danger)', aba: 'tab-medico' },
    auxiliar:  { rotulo: 'Auxiliar Técnico', emoji: '🤖', cor: 'var(--accent)', aba: 'tab-auxiliar' },
    jogador:   { rotulo: 'Elenco', emoji: '💬', cor: 'var(--primary)', aba: 'tab-plantel' }
};

let filtroCaixaMensagens = 'todas';

// ------------------------------------------------------------------------------------
// ESTADO
// ------------------------------------------------------------------------------------

// Cria (uma vez por save) todos os campos novos que a Central usa. Saves antigos passam
// por aqui sem perder nada do que já tinham.
function garantirCentralMensagens() {
    let d = db[currentSave];
    if (!d) return null;
    if (!Array.isArray(d.caixaMensagens)) d.caixaMensagens = [];
    if (typeof d.contadorAcoesDiretoria !== 'number') d.contadorAcoesDiretoria = 0;
    if (typeof d.limiteAcoesDiretoria !== 'number') d.limiteAcoesDiretoria = gerarNumeroAleatorio(CENTRAL_MSG_CFG.ACOES_DIRETORIA_MIN, CENTRAL_MSG_CFG.ACOES_DIRETORIA_MAX);
    if (typeof d.contadorPartidasMedico !== 'number') d.contadorPartidasMedico = 0;
    if (typeof d.limitePartidasMedico !== 'number') d.limitePartidasMedico = gerarNumeroAleatorio(CENTRAL_MSG_CFG.PARTIDAS_MEDICO_MIN, CENTRAL_MSG_CFG.PARTIDAS_MEDICO_MAX);
    if (typeof d.contadorPartidasElenco !== 'number') d.contadorPartidasElenco = 0;
    if (typeof d.limitePartidasElenco !== 'number') d.limitePartidasElenco = gerarNumeroAleatorio(CENTRAL_MSG_CFG.PARTIDAS_JOGADORES_MIN, CENTRAL_MSG_CFG.PARTIDAS_JOGADORES_MAX);
    if (typeof d.capitao !== 'string') d.capitao = '';
    if (typeof d.viceCapitao !== 'string') d.viceCapitao = '';
    return d;
}

// Campos por jogador usados pelos eventos (moral, evolução de OVR, tempo de casa).
// Assim como garantirCondicaoFisica, roda em cima de saves antigos sem quebrar nada.
function garantirCamposElenco(p) {
    if (!p) return p;
    if (typeof p.moral !== 'number' || isNaN(p.moral)) p.moral = 75;
    if (typeof p.ovrInicial !== 'number' || isNaN(p.ovrInicial)) p.ovrInicial = numeroSeguro(p.ovr, 60);
    if (typeof p.temporadasNoClube !== 'number' || isNaN(p.temporadasNoClube)) p.temporadasNoClube = 0;
    if (typeof p.poupadoRestante !== 'number' || isNaN(p.poupadoRestante)) p.poupadoRestante = 0;
    return p;
}

// Quem deixa de estar disponível (vendido, emprestado, aposentado) não pode continuar
// como capitão. Os eventos da Central mexem no status direto, então precisam chamar isso.
function liberarBracadeiraSeNecessario(nome) {
    let d = db[currentSave];
    if (!d) return;
    if (d.capitao === nome) d.capitao = '';
    if (d.viceCapitao === nome) d.viceCapitao = '';
    if (typeof renderizarLiderancaUI === 'function') renderizarLiderancaUI();
}

function garantirCamposElencoTodos() {
    if (!db[currentSave] || !db[currentSave].plantel) return;
    db[currentSave].plantel.forEach(garantirCamposElenco);
}

// Moral anda sempre entre 0 e 100. Devolve o valor final pra quem quiser usar no texto.
function ajustarMoral(jogador, delta) {
    if (!jogador) return 0;
    garantirCamposElenco(jogador);
    jogador.moral = Math.max(0, Math.min(100, jogador.moral + delta));
    return jogador.moral;
}

// Mexe na moral do elenco inteiro (usado por decisões do capitão e reuniões de vestiário)
function ajustarMoralElenco(delta) {
    if (!db[currentSave] || !db[currentSave].plantel) return;
    db[currentSave].plantel.filter(p => p.status === 'Ativo').forEach(p => ajustarMoral(p, delta));
}

function rotuloMoral(moral) {
    if (moral >= 85) return '😄 Muito feliz';
    if (moral >= 70) return '🙂 Contente';
    if (moral >= 50) return '😐 Indiferente';
    if (moral >= 30) return '😕 Incomodado';
    return '😠 Revoltado';
}

// ------------------------------------------------------------------------------------
// REGISTRO E NOTIFICAÇÃO
// ------------------------------------------------------------------------------------

// Ponto único de entrada: qualquer departamento que queira falar com o treinador chama isso.
// msg = { tipo, remetente, assunto, corpo, opcoes, acao, contexto, abaDestino }
// - opcoes: [{ id, rotulo, detalhe }] — deixa a mensagem "pendente" até o treinador decidir
// - acao: nome da família de evento, usada pra saber quem resolve a escolha
function registrarMensagem(msg) {
    let d = garantirCentralMensagens();
    if (!d) return null;

    let perfil = REMETENTES_MSG[msg.tipo] || REMETENTES_MSG.diretoria;
    let registro = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        tipo: msg.tipo,
        remetente: msg.remetente || perfil.rotulo,
        assunto: msg.assunto || 'Sem assunto',
        corpo: msg.corpo || '',
        abaDestino: msg.abaDestino || perfil.aba,
        opcoes: Array.isArray(msg.opcoes) && msg.opcoes.length > 0 ? msg.opcoes : null,
        acao: msg.acao || null,
        contexto: msg.contexto || null,
        data: Date.now(),
        temporada: d.temporadaAtual,
        lida: false,
        respondida: false,
        resposta: null,
        resultado: ''
    };

    d.caixaMensagens.unshift(registro);
    if (d.caixaMensagens.length > CENTRAL_MSG_CFG.MAX_CAIXA) d.caixaMensagens.length = CENTRAL_MSG_CFG.MAX_CAIXA;

    salvarDados();
    atualizarBadgeMensagens();
    if (document.getElementById('tab-mensagens') && document.getElementById('tab-mensagens').classList.contains('active')) {
        renderizarCaixaMensagens();
    }
    notificarNovaMensagem(registro);
    return registro;
}

function contarMensagensNaoLidas() {
    let d = db[currentSave];
    if (!d || !Array.isArray(d.caixaMensagens)) return 0;
    return d.caixaMensagens.filter(m => !m.lida).length;
}

// Quantas mensagens ainda esperam uma decisão do treinador (opções não respondidas)
function contarMensagensPendentes() {
    let d = db[currentSave];
    if (!d || !Array.isArray(d.caixaMensagens)) return 0;
    return d.caixaMensagens.filter(m => m.opcoes && !m.respondida).length;
}

function atualizarBadgeMensagens() {
    let badge = document.getElementById('badge-mensagens');
    if (!badge) return;
    let n = contarMensagensNaoLidas();
    badge.innerText = n > 99 ? '99+' : String(n);
    badge.style.display = n > 0 ? 'inline-flex' : 'none';
}

// Som curto sintetizado na hora (WebAudio) — evita depender de arquivo de áudio externo.
// Dois "blips" ascendentes, no volume baixo, pra avisar sem assustar.
function tocarSomNotificacao() {
    try {
        let Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!window._audioCtxNotificacao) window._audioCtxNotificacao = new Ctx();
        let ctx = window._audioCtxNotificacao;
        if (ctx.state === 'suspended') ctx.resume();

        [[880, 0], [1245, 0.13]].forEach(([freq, atraso]) => {
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            let t0 = ctx.currentTime + atraso;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(t0); osc.stop(t0 + 0.24);
        });
    } catch (e) {
        // Navegador bloqueou o áudio (ainda sem interação do usuário) — o balão visual já avisa.
    }
}

// Balão no canto superior direito. Aparece em qualquer aba e leva pra caixa de entrada.
function mostrarToastMensagem(registro) {
    let container = document.getElementById('toast-mensagens');
    if (!container) return;

    // Quando várias mensagens chegam de uma vez (o elenco pode mandar até 5), a pilha de
    // balões não pode tomar a tela: mantém só os mais recentes e descarta os antigos.
    while (container.children.length >= 4) container.removeChild(container.firstChild);

    let perfil = REMETENTES_MSG[registro.tipo] || REMETENTES_MSG.diretoria;
    let toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.style.borderLeftColor = perfil.cor;
    toast.onclick = function() { abrirMensagem(registro.id); toast.remove(); };
    toast.innerHTML = `
        <div class="toast-msg-topo">
            <span style="color:${perfil.cor}; font-weight:bold;">${perfil.emoji} ${registro.remetente}</span>
            <span class="toast-msg-fechar" onclick="event.stopPropagation(); this.closest('.toast-msg').remove();">✖</span>
        </div>
        <div class="toast-msg-assunto">${registro.assunto}</div>
        <div class="toast-msg-rodape">${registro.opcoes ? '⏳ Aguarda sua decisão · ' : ''}Clique para abrir</div>
    `;
    container.appendChild(toast);

    // Some sozinho, mas a mensagem continua na caixa de entrada
    setTimeout(() => { if (toast.parentNode) toast.classList.add('toast-msg-saindo'); }, 8000);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8600);
}

function notificarNovaMensagem(registro) {
    tocarSomNotificacao();
    mostrarToastMensagem(registro);
}

// ------------------------------------------------------------------------------------
// INTERFACE DA ABA MENSAGENS
// ------------------------------------------------------------------------------------

function filtrarCaixaMensagens(filtro) {
    filtroCaixaMensagens = filtro;
    renderizarCaixaMensagens();
}

// Abre a aba de mensagens já com o item expandido (usado pelo toast e pelos atalhos)
function abrirMensagem(id) {
    mudarAba('tab-mensagens');
    let d = garantirCentralMensagens();
    if (!d) return;
    let msg = d.caixaMensagens.find(m => m.id === id);
    if (!msg) return;
    msg.lida = true;
    filtroCaixaMensagens = 'todas';
    salvarDados();
    renderizarCaixaMensagens(id);
    setTimeout(() => {
        let el = document.getElementById('msg-item-' + id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
}

function alternarMensagem(id) {
    let d = garantirCentralMensagens();
    if (!d) return;
    let msg = d.caixaMensagens.find(m => m.id === id);
    if (!msg) return;
    let jaAberta = document.getElementById('msg-corpo-' + id) && document.getElementById('msg-corpo-' + id).style.display !== 'none';
    msg.lida = true;
    salvarDados();
    renderizarCaixaMensagens(jaAberta ? null : id);
}

function marcarTodasLidas() {
    let d = garantirCentralMensagens();
    if (!d) return;
    d.caixaMensagens.forEach(m => m.lida = true);
    salvarDados();
    renderizarCaixaMensagens();
}

async function limparCaixaMensagens() {
    let d = garantirCentralMensagens();
    if (!d) return;
    let pendentes = contarMensagensPendentes();
    let aviso = pendentes > 0
        ? `Você ainda tem ${pendentes} mensagem(ns) esperando decisão. Apagar tudo mesmo assim?`
        : 'Apagar todas as mensagens já respondidas e lidas?';
    if (!await confirmarModerno(aviso, 'Limpar Caixa de Entrada', { perigo: true, textoConfirmar: 'Apagar' })) return;
    // As que ainda pedem decisão continuam na caixa — apagar sem responder sumiria com o efeito no jogo
    d.caixaMensagens = d.caixaMensagens.filter(m => m.opcoes && !m.respondida);
    salvarDados();
    atualizarBadgeMensagens();
    renderizarCaixaMensagens();
}

function tempoRelativoMensagem(ts) {
    let diff = Date.now() - ts;
    let min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min} min`;
    let h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    let dias = Math.floor(h / 24);
    if (dias < 30) return `há ${dias}d`;
    return new Date(ts).toLocaleDateString('pt-BR');
}

function renderizarCaixaMensagens(idExpandido) {
    let d = garantirCentralMensagens();
    if (!d) return;

    // Chips de filtro com a contagem de não lidas de cada remetente
    let chips = document.getElementById('mensagens-filtros');
    if (chips) {
        let contar = (tipo) => d.caixaMensagens.filter(m => (tipo === 'todas' || m.tipo === tipo) && !m.lida).length;
        let opcoesFiltro = [
            { id: 'todas', rotulo: '📥 Todas' },
            { id: 'diretoria', rotulo: '👔 Diretoria' },
            { id: 'medico', rotulo: '🏥 Dep. Médico' },
            { id: 'auxiliar', rotulo: '🤖 Auxiliar' },
            { id: 'jogador', rotulo: '💬 Jogadores' },
            { id: 'pendentes', rotulo: '⏳ Pendentes' }
        ];
        chips.innerHTML = opcoesFiltro.map(f => {
            let n = f.id === 'pendentes' ? contarMensagensPendentes() : contar(f.id);
            let ativo = filtroCaixaMensagens === f.id ? ' chip-msg-ativo' : '';
            return `<button class="chip-msg${ativo}" onclick="filtrarCaixaMensagens('${f.id}')">${f.rotulo}${n > 0 ? ` <span class="chip-msg-num">${n}</span>` : ''}</button>`;
        }).join('');
    }

    let resumo = document.getElementById('mensagens-resumo');
    if (resumo) {
        let pend = contarMensagensPendentes();
        resumo.innerHTML = pend > 0
            ? `⏳ <strong style="color:var(--warning);">${pend} mensagem(ns) esperando a sua decisão.</strong> Enquanto você não responder, nada é aplicado no clube.`
            : `✅ Nenhuma decisão pendente. Total de ${d.caixaMensagens.length} mensagem(ns) arquivada(s).`;
    }

    let lista = document.getElementById('mensagens-lista');
    if (!lista) return;

    let filtradas = d.caixaMensagens.filter(m => {
        if (filtroCaixaMensagens === 'todas') return true;
        if (filtroCaixaMensagens === 'pendentes') return m.opcoes && !m.respondida;
        return m.tipo === filtroCaixaMensagens;
    });

    if (filtradas.length === 0) {
        lista.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:30px 0;">Nenhuma mensagem por aqui ainda. A diretoria, o departamento médico e o elenco vão te procurar conforme a temporada anda.</p>`;
        atualizarBadgeMensagens();
        return;
    }

    lista.innerHTML = filtradas.map(m => {
        let perfil = REMETENTES_MSG[m.tipo] || REMETENTES_MSG.diretoria;
        let expandida = idExpandido === m.id;
        let pendente = m.opcoes && !m.respondida;

        let blocoOpcoes = '';
        if (m.opcoes) {
            if (pendente) {
                blocoOpcoes = `
                <div class="msg-opcoes">
                    ${m.opcoes.map(op => `
                        <button class="msg-opcao-btn" onclick="responderMensagem('${m.id}', '${op.id}')">
                            <strong>${op.rotulo}</strong>
                            ${op.detalhe ? `<span>${op.detalhe}</span>` : ''}
                        </button>`).join('')}
                </div>`;
            } else {
                let escolhida = m.opcoes.find(op => op.id === m.resposta);
                blocoOpcoes = `
                <div class="msg-resultado">
                    <div><strong>✔️ Sua decisão:</strong> ${escolhida ? escolhida.rotulo : m.resposta}</div>
                    ${m.resultado ? `<div style="margin-top:6px; color:var(--text-muted);">${m.resultado}</div>` : ''}
                </div>`;
            }
        }

        return `
        <div class="msg-item${m.lida ? '' : ' msg-item-nova'}${pendente ? ' msg-item-pendente' : ''}" id="msg-item-${m.id}" style="border-left-color:${perfil.cor};">
            <div class="msg-cabecalho" onclick="alternarMensagem('${m.id}')">
                <div class="msg-cabecalho-info">
                    <span class="msg-remetente" style="color:${perfil.cor};">${perfil.emoji} ${m.remetente}</span>
                    <span class="msg-assunto">${m.lida ? '' : '<span class="msg-ponto"></span>'}${m.assunto}</span>
                </div>
                <div class="msg-cabecalho-meta">
                    ${pendente ? '<span class="badge msg-badge-pendente">⏳ Decisão pendente</span>' : ''}
                    <span class="msg-data">${tempoRelativoMensagem(m.data)}</span>
                </div>
            </div>
            <div class="msg-corpo" id="msg-corpo-${m.id}" style="display:${expandida ? 'block' : 'none'};">
                <div class="msg-texto">${m.corpo}</div>
                ${blocoOpcoes}
                <div class="msg-acoes-rodape">
                    <button class="msg-link-aba" onclick="mudarAba('${m.abaDestino}')">➡️ Ir para ${perfil.rotulo}</button>
                </div>
            </div>
        </div>`;
    }).join('');

    atualizarBadgeMensagens();
}

// Aplica a escolha do treinador. Cada família de evento tem seu próprio resolvedor —
// aqui só despachamos e guardamos o texto do desfecho na própria mensagem.
function responderMensagem(idMensagem, idOpcao) {
    let d = garantirCentralMensagens();
    if (!d) return;
    let msg = d.caixaMensagens.find(m => m.id === idMensagem);
    if (!msg || msg.respondida) return;

    let resultado = '';
    if (msg.acao === 'diretoria' && typeof resolverEventoDiretoria === 'function') {
        resultado = resolverEventoDiretoria(msg, idOpcao);
    } else if (msg.acao === 'medico' && typeof resolverEventoMedico === 'function') {
        resultado = resolverEventoMedico(msg, idOpcao);
    } else if (msg.acao === 'jogador' && typeof resolverMensagemJogador === 'function') {
        resultado = resolverMensagemJogador(msg, idOpcao);
    }

    msg.respondida = true;
    msg.resposta = idOpcao;
    msg.lida = true;
    msg.resultado = resultado || 'Decisão registrada.';

    salvarDados();
    renderizarCaixaMensagens(idMensagem);
    if (typeof atualizarPlantelUI === 'function' && currentSave === 'clube') atualizarPlantelUI();
    if (typeof atualizarDiretoriaUI === 'function') atualizarDiretoriaUI();
    if (typeof atualizarDepartamentoMedicoUI === 'function') atualizarDepartamentoMedicoUI();
}

// ------------------------------------------------------------------------------------
// GATILHOS: O QUE FAZ OS EVENTOS ACONTECEREM
// ------------------------------------------------------------------------------------

// "Ação tomada" = qualquer mexida real no clube (transferência, upgrade, partida salva,
// alteração de elenco...). A cada 15 a 25 delas a diretoria aparece com alguma pauta.
function registrarAcaoJogo(descricao) {
    let d = garantirCentralMensagens();
    if (!d || !d.nome) return;
    if (currentSave !== 'clube') return; // a seleção não tem diretoria de clube

    d.contadorAcoesDiretoria++;
    d.ultimaAcaoRegistrada = descricao || '';
    if (d.contadorAcoesDiretoria >= d.limiteAcoesDiretoria) {
        d.contadorAcoesDiretoria = 0;
        d.limiteAcoesDiretoria = gerarNumeroAleatorio(CENTRAL_MSG_CFG.ACOES_DIRETORIA_MIN, CENTRAL_MSG_CFG.ACOES_DIRETORIA_MAX);
        if (typeof dispararEventoDiretoria === 'function') dispararEventoDiretoria();
    }
    salvarDados();
}

// Chamado uma vez a cada partida salva: cuida dos ciclos do DM e das mensagens do elenco.
function processarCiclosPosPartida() {
    let d = garantirCentralMensagens();
    if (!d || !d.nome) return;
    if (currentSave !== 'clube') return; // slot Seleção não tem departamento médico nem elenco fixo

    // Promessas de minutos são conferidas a cada partida, não só quando o ciclo de mensagens vence
    if (typeof revisarPromessasMinutos === 'function') revisarPromessasMinutos();

    d.contadorPartidasMedico++;
    if (d.contadorPartidasMedico >= d.limitePartidasMedico) {
        d.contadorPartidasMedico = 0;
        d.limitePartidasMedico = gerarNumeroAleatorio(CENTRAL_MSG_CFG.PARTIDAS_MEDICO_MIN, CENTRAL_MSG_CFG.PARTIDAS_MEDICO_MAX);
        if (typeof dispararEventoMedico === 'function') dispararEventoMedico();
    }

    d.contadorPartidasElenco++;
    if (d.contadorPartidasElenco >= d.limitePartidasElenco) {
        d.contadorPartidasElenco = 0;
        d.limitePartidasElenco = gerarNumeroAleatorio(CENTRAL_MSG_CFG.PARTIDAS_JOGADORES_MIN, CENTRAL_MSG_CFG.PARTIDAS_JOGADORES_MAX);
        if (typeof dispararMensagensElenco === 'function') dispararMensagensElenco();
    }

    salvarDados();
}

// Atalho para o Auxiliar Técnico avisar na caixa (avaliação pós-jogo, novidades no chat).
function notificarAuxiliar(assunto, corpo) {
    registrarMensagem({
        tipo: 'auxiliar',
        remetente: (typeof nomeAuxiliarExibicao === 'function' ? nomeAuxiliarExibicao() : 'Auxiliar Técnico'),
        assunto: assunto,
        corpo: corpo,
        abaDestino: 'tab-auxiliar'
    });
}
