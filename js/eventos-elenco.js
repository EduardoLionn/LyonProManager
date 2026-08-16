// =====================================================================================
// EVENTOS DO ELENCO — Departamento Médico e mensagens dos jogadores
// =====================================================================================
// Dois ciclos independentes, ambos contados em partidas salvas:
//
// - DEPARTAMENTO MÉDICO (a cada 10 a 20 partidas): alguém sente um desconforto e pode
//   ficar de 5 a 45 dias fora, ou pede 1 a 2 jogos de descanso. Quem é sorteado e o que
//   acontece depende do cansaço real (condição física e jogos seguidos) e da idade.
//
// - MENSAGENS DOS JOGADORES (a cada 8 a 12 partidas): de 0 a 5 mensagens, sem regra fixa.
//   O que cada um tem a dizer vem dos minutos que recebeu, do overall dele em relação ao
//   elenco, da idade, da moral e da fase do time. Capitão e vice falam mais e pesam mais.

const EVENTOS_ELENCO_CFG = {
    LESAO_MIN_DIAS: 5,
    LESAO_MAX_DIAS: 45,
    DESCANSO_MIN_JOGOS: 1,
    DESCANSO_MAX_JOGOS: 2
};

// ------------------------------------------------------------------------------------
// LEITURA DO ELENCO
// ------------------------------------------------------------------------------------

function elencoAtivo() {
    let d = db[currentSave];
    if (!d || !d.plantel) return [];
    if (typeof garantirCamposElencoTodos === 'function') garantirCamposElencoTodos();
    if (typeof garantirCondicaoFisicaTodos === 'function') garantirCondicaoFisicaTodos();
    return d.plantel.filter(p => p.status === 'Ativo');
}

function mediaOvrElenco() {
    let ativos = elencoAtivo();
    if (ativos.length === 0) return 70;
    return ativos.reduce((s, p) => s + p.ovr, 0) / ativos.length;
}

// Quantos jogos da temporada atual o atleta disputou, e quanto isso representa do total.
function estatisticasJogadorTemporada(nome) {
    let d = db[currentSave];
    let daTemporada = (d.partidas || []).filter(p => p.temporada === d.temporadaAtual);
    let disputadas = daTemporada.filter(p => (p.jogadores || []).some(j => j.nome === nome));
    let notas = disputadas.map(p => (p.jogadores.find(j => j.nome === nome) || {}).nota).filter(n => typeof n === 'number' && n > 0);
    return {
        totalTime: daTemporada.length,
        jogos: disputadas.length,
        percentual: daTemporada.length > 0 ? Math.round((disputadas.length / daTemporada.length) * 100) : 0,
        mediaNota: notas.length ? Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 10) / 10 : null,
        gols: disputadas.reduce((s, p) => s + ((p.jogadores.find(j => j.nome === nome) || {}).gols || 0), 0),
        assistencias: disputadas.reduce((s, p) => s + ((p.jogadores.find(j => j.nome === nome) || {}).assist || 0), 0)
    };
}

// Quando você promete minutos a um jogador, a promessa fica registrada com o número de
// partidas que o clube tinha na época. Aqui a gente confere se ela foi cumprida: o atleta
// precisava entrar em campo na maioria das partidas seguintes.
function avaliarPromessaMinutos(p) {
    let promessa = p && p.promessaMinutos;
    if (!promessa) return { tem: false };

    let d = db[currentSave];
    let desde = numeroSeguro(promessa.desde, 0);
    let prometidos = Math.max(1, numeroSeguro(promessa.jogosPrometidos, 3));
    let posteriores = (d.partidas || []).slice(desde);
    let jogou = posteriores.filter(m => (m.jogadores || []).some(j => j.nome === p.nome)).length;

    return {
        tem: true,
        prometidos,
        disputadas: posteriores.length,
        jogou,
        // Só dá pra julgar depois que o clube teve partidas suficientes pra cumprir
        vencida: posteriores.length >= prometidos,
        cumprida: jogou >= prometidos
    };
}

// Promessa cumprida encerra o assunto (e o jogador reconhece). Roda a cada partida salva,
// senão a promessa ficaria pendurada no save pra sempre depois de já ter sido honrada.
function revisarPromessasMinutos() {
    elencoAtivo().forEach(p => {
        let promessa = avaliarPromessaMinutos(p);
        if (promessa.tem && promessa.vencida && promessa.cumprida) {
            p.promessaMinutos = null;
            ajustarMoral(p, 6);
        }
    });
}

// Clima do vestiário: moral média e um índice de tensão que aumenta a chance de mensagens.
function calcularClimaVestiario() {
    let ativos = elencoAtivo();
    if (ativos.length === 0) return { moralMedia: 75, tensao: 0, capitaoInsatisfeito: false };

    let moralMedia = ativos.reduce((s, p) => s + (p.moral || 75), 0) / ativos.length;
    let d = db[currentSave];
    let ultimas = (d.partidas || []).slice(-5);
    let aprov = (typeof aproveitamentoPartidas === 'function') ? aproveitamentoPartidas(ultimas) : null;

    let tensao = 0;
    if (moralMedia < 65) tensao += (65 - moralMedia) * 0.8;
    if (aprov !== null && aprov < 45) tensao += (45 - aprov) * 0.35;
    if ((d.aprovacaoTorcida || 75) < 55) tensao += 6;

    let capitao = ativos.find(p => p.nome === d.capitao);
    let capitaoInsatisfeito = !!(capitao && (capitao.moral || 75) < 50);
    if (capitaoInsatisfeito) tensao += 10;
    if (!d.capitao) tensao += 5; // elenco sem liderança definida fala mais

    return { moralMedia, tensao: Math.min(40, Math.round(tensao)), capitaoInsatisfeito, aprovRecente: aprov };
}

// ------------------------------------------------------------------------------------
// DEPARTAMENTO MÉDICO
// ------------------------------------------------------------------------------------

// Lesões leves são muito mais comuns que as graves — a curva abaixo faz a maioria dos
// casos ficar na faixa de 5 a 24 dias, com quadros longos aparecendo de vez em quando.
function sortearDiasLesao(nivel) {
    let r = gerarNumeroAleatorio(1, 100);
    let dias;
    if (r <= 50) dias = gerarNumeroAleatorio(5, 12);
    else if (r <= 80) dias = gerarNumeroAleatorio(13, 24);
    else if (r <= 95) dias = gerarNumeroAleatorio(25, 35);
    else dias = gerarNumeroAleatorio(36, 45);

    if (nivel === 'critico') dias = Math.round(dias * 1.35);
    else if (nivel === 'risco') dias = Math.round(dias * 1.15);
    return Math.max(EVENTOS_ELENCO_CFG.LESAO_MIN_DIAS, Math.min(EVENTOS_ELENCO_CFG.LESAO_MAX_DIAS, dias));
}

// Sorteio ponderado do atleta: cansaço e sequência de jogos pesam muito mais que o acaso.
function sortearJogadorDesgastado() {
    let candidatos = elencoAtivo().filter(p => (p.diasLesao || 0) <= 0);
    if (candidatos.length === 0) return null;

    let pool = candidatos.map(p => {
        let peso = 6;
        peso += Math.max(0, 100 - (p.stamina || 100)) * 0.55;
        peso += (p.jogosSeguidos || 0) * 6;
        let idade = p.idade || 26;
        if (idade >= 33) peso += 18;
        else if (idade >= 30) peso += 10;
        else if (idade <= 19) peso += 6;   // garoto ainda em formação física
        if (p.moral < 45) peso += 5;
        return { p, peso: Math.max(1, Math.round(peso)) };
    });

    let soma = pool.reduce((s, x) => s + x.peso, 0);
    let alvo = gerarNumeroAleatorio(1, soma);
    let acumulado = 0;
    for (let x of pool) {
        acumulado += x.peso;
        if (alvo <= acumulado) return x.p;
    }
    return pool[pool.length - 1].p;
}

function _mensagemLesao(jogador, cond) {
    let dias = sortearDiasLesao(cond.nivel);
    let quadros = [
        { nome: 'desconforto na posterior da coxa', detalhe: 'sentiu um repuxo no fim do último treino forte' },
        { nome: 'edema no joelho', detalhe: 'levou uma pancada e o joelho respondeu com inchaço' },
        { nome: 'lesão muscular na panturrilha', detalhe: 'a ressonância confirmou o grau da lesão' },
        { nome: 'entorse de tornozelo', detalhe: 'pisou em falso numa dividida e o tornozelo travou' },
        { nome: 'dores na região lombar', detalhe: 'vem reclamando de dor nas costas desde a sequência de jogos' },
        { nome: 'estiramento no adutor', detalhe: 'sentiu no momento do chute e pediu substituição no treino' },
        { nome: 'fadiga muscular acumulada', detalhe: 'os exames mostraram marcadores de desgaste muito acima do normal' }
    ];
    let quadro = quadros[gerarNumeroAleatorio(0, quadros.length - 1)];
    let diasAcelerado = Math.max(3, Math.round(dias * 0.6));

    let contextoFisico = cond.nivel === 'critico' || cond.nivel === 'risco'
        ? `<p style="color:var(--danger);">O boletim é duro com a comissão: o atleta vinha de <strong>${jogador.jogosSeguidos || 0} jogo(s) seguido(s)</strong> com a condição física em <strong>${Math.round(jogador.stamina)}%</strong>. Era um caso anunciado.</p>`
        : `<p style="color:var(--text-muted);">O departamento reforça que não houve negligência de carga — foi um episódio isolado.</p>`;

    return {
        assunto: `🏥 ${jogador.nome} sente ${quadro.nome}`,
        corpo: `<p><strong>${jogador.nome}</strong> (${jogador.posicao}, ${jogador.idade ? jogador.idade + ' anos' : 'idade não informada'}) ${quadro.detalhe}.</p>
        <p>O diagnóstico do departamento médico aponta <strong>aproximadamente ${dias} dias de afastamento</strong> com tratamento convencional.</p>
        ${contextoFisico}
        <p style="color:var(--text-muted);">"Existe a opção de tratamento intensivo, mister. Encurta o prazo, mas o risco de recidiva é real."</p>`,
        opcoes: [
            { id: 'conservador', rotulo: `🩺 Seguir o protocolo (${dias} dias)`, detalhe: 'Recuperação segura, sem risco de recaída' },
            { id: 'acelerar', rotulo: `⚡ Tratamento intensivo (${diasAcelerado} dias)`, detalhe: 'Volta antes, mas com risco de agravar o quadro' }
        ],
        contexto: { evento: 'lesao', jogador: jogador.nome, dias, diasAcelerado, quadro: quadro.nome }
    };
}

function _mensagemPedidoDescanso(jogador, cond) {
    let jogos = gerarNumeroAleatorio(EVENTOS_ELENCO_CFG.DESCANSO_MIN_JOGOS, EVENTOS_ELENCO_CFG.DESCANSO_MAX_JOGOS);
    let motivo = cond.nivel === 'ok'
        ? 'não é lesão: é desgaste mental e sono ruim depois da maratona de viagens'
        : `está com a condição física em <strong>${Math.round(jogador.stamina)}%</strong> após <strong>${jogador.jogosSeguidos || 0} jogo(s) seguido(s)</strong>`;

    return {
        assunto: `💤 Pedido de descanso: ${jogador.nome}`,
        corpo: `<p>O preparador físico trouxe um pedido de <strong>${jogador.nome}</strong> (${jogador.posicao}). O atleta ${motivo}, e solicita <strong>${jogos} jogo(s) de descanso</strong>.</p>
        <p>Se você conceder, o departamento controla a carga dele e avisa quando estiver liberado. Se negar, ele vai a campo — mas o risco de lesão sobe nas próximas partidas.</p>`,
        opcoes: [
            { id: 'conceder', rotulo: `✅ Conceder ${jogos} jogo(s) de descanso`, detalhe: 'Recupera condição física e melhora a moral' },
            { id: 'negar', rotulo: '🔥 Negar — preciso dele em campo', detalhe: 'Moral cai e o risco de lesão aumenta' }
        ],
        contexto: { evento: 'descanso', jogador: jogador.nome, jogos }
    };
}

function dispararEventoMedico() {
    let d = db[currentSave];
    if (!d || !d.nome) return;
    let jogador = sortearJogadorDesgastado();
    if (!jogador) return;

    let cond = condicaoJogador(jogador);
    // Quem já está no limite tende mais ao pedido de descanso (o corpo avisa antes);
    // quem está inteiro e cai é lesão de contato/acidente mesmo.
    let cansado = (cond.nivel === 'risco' || cond.nivel === 'critico');
    let chanceLesao = cansado ? 45 : 70;
    let msg = gerarNumeroAleatorio(1, 100) <= chanceLesao ? _mensagemLesao(jogador, cond) : _mensagemPedidoDescanso(jogador, cond);

    registrarMensagem({
        tipo: 'medico',
        remetente: 'Departamento Médico',
        assunto: msg.assunto,
        corpo: msg.corpo,
        opcoes: msg.opcoes,
        acao: 'medico',
        contexto: msg.contexto,
        abaDestino: 'tab-medico'
    });
}

function resolverEventoMedico(msg, opcao) {
    let d = db[currentSave];
    let c = msg.contexto || {};
    let jogador = d.plantel.find(p => p.nome === c.jogador);
    if (!jogador) return 'O atleta não faz mais parte do elenco — a ocorrência foi arquivada.';
    garantirCamposElenco(jogador);
    garantirCondicaoFisica(jogador);

    if (c.evento === 'lesao') {
        if (opcao === 'conservador') {
            jogador.diasLesao = (jogador.diasLesao || 0) + c.dias;
            jogador.jogosSeguidos = 0;
            ajustarMoral(jogador, 4);
            adicionarNoticiaAutomatica(`🏥 BAIXA NO ELENCO: ${jogador.nome} fora por ~${c.dias} dias.`, `O departamento médico confirmou ${c.quadro} e optou pelo tratamento convencional. O atleta segue em recuperação sob supervisão.`);
            salvarDados();
            if (typeof atualizarDepartamentoMedicoUI === 'function') atualizarDepartamentoMedicoUI();
            return `${jogador.nome} entra em tratamento convencional: ${c.dias} dias de afastamento. Ele aprovou a decisão da comissão.`;
        }
        // Tratamento intensivo: encurta o prazo, mas pode dar recaída na hora
        let recaida = gerarNumeroAleatorio(1, 100) <= 40;
        if (recaida) {
            let diasFinal = Math.min(EVENTOS_ELENCO_CFG.LESAO_MAX_DIAS, Math.round(c.dias * 1.4));
            jogador.diasLesao = (jogador.diasLesao || 0) + diasFinal;
            jogador.jogosSeguidos = 0;
            ajustarMoral(jogador, -12);
            adicionarNoticiaAutomatica(`🚨 RECAÍDA: ${jogador.nome} agrava a lesão e fica mais tempo fora.`, `A tentativa de acelerar a recuperação não deu certo. O quadro se agravou e o prazo de retorno subiu para cerca de ${diasFinal} dias.`);
            salvarDados();
            if (typeof atualizarDepartamentoMedicoUI === 'function') atualizarDepartamentoMedicoUI();
            return `❌ Deu errado: houve recaída. ${jogador.nome} fica ${diasFinal} dias fora (mais do que o prazo original) e ficou abalado.`;
        }
        jogador.diasLesao = (jogador.diasLesao || 0) + c.diasAcelerado;
        jogador.jogosSeguidos = 0;
        ajustarMoral(jogador, -3);
        salvarDados();
        if (typeof atualizarDepartamentoMedicoUI === 'function') atualizarDepartamentoMedicoUI();
        return `✅ Deu certo: com tratamento intensivo, ${jogador.nome} volta em ${c.diasAcelerado} dias em vez de ${c.dias}.`;
    }

    if (c.evento === 'descanso') {
        if (opcao === 'conceder') {
            jogador.poupadoRestante = c.jogos;
            jogador.stamina = Math.min(CONDICAO_FISICA_CFG.STAMINA_MAX, (jogador.stamina || 0) + 15);
            ajustarMoral(jogador, 12);
            salvarDados();
            if (typeof atualizarDepartamentoMedicoUI === 'function') atualizarDepartamentoMedicoUI();
            return `${jogador.nome} foi poupado por ${c.jogos} jogo(s). O Auxiliar Técnico já foi avisado e não vai escalá-lo nesse período.`;
        }
        jogador.riscoExtraLesao = 2; // vale pelas próximas 2 partidas em que ele entrar em campo
        ajustarMoral(jogador, -14);
        salvarDados();
        if (typeof atualizarDepartamentoMedicoUI === 'function') atualizarDepartamentoMedicoUI();
        return `Pedido negado. ${jogador.nome} segue à disposição, mas ficou contrariado e o departamento médico registrou risco elevado de lesão nas próximas 2 partidas dele.`;
    }

    return 'Ocorrência arquivada.';
}

// ------------------------------------------------------------------------------------
// CAPITÃO E VICE-CAPITÃO
// ------------------------------------------------------------------------------------

// Perfil de liderança: veterania, peso técnico no elenco, tempo de casa, moral e minutos.
// É essa nota que decide se a braçadeira é respeitada ou questionada no vestiário.
function avaliarLideranca(p) {
    if (!p) return 0;
    garantirCamposElenco(p);
    let media = mediaOvrElenco();
    let stats = estatisticasJogadorTemporada(p.nome);
    let nota = 50;

    let idade = p.idade || 26;
    if (idade >= 30) nota += 18;
    else if (idade >= 27) nota += 12;
    else if (idade >= 24) nota += 4;
    else if (idade <= 21) nota -= 14;

    nota += Math.max(-18, Math.min(18, (p.ovr - media) * 2.5));
    nota += Math.min(15, (p.temporadasNoClube || 0) * 5);
    nota += (p.moral - 70) * 0.3;
    if (stats.totalTime >= 5) nota += (stats.percentual - 50) * 0.2;

    return Math.max(0, Math.min(100, Math.round(nota)));
}

function definirLideranca(cargo) {
    let d = garantirCentralMensagens();
    if (!d || currentSave !== 'clube') return;
    let select = document.getElementById(cargo === 'capitao' ? 'select-capitao' : 'select-vice-capitao');
    if (!select) return;
    let nome = select.value;

    let outroCargo = cargo === 'capitao' ? 'viceCapitao' : 'capitao';
    if (nome && d[outroCargo] === nome) {
        alert('Esse jogador já ocupa o outro cargo. Escolha outro atleta.');
        select.value = d[cargo === 'capitao' ? 'capitao' : 'viceCapitao'] || '';
        return;
    }

    let anterior = d[cargo === 'capitao' ? 'capitao' : 'viceCapitao'];
    if (anterior && anterior !== nome) {
        let antigo = d.plantel.find(p => p.nome === anterior);
        if (antigo) ajustarMoral(antigo, cargo === 'capitao' ? -10 : -6);
    }

    d[cargo === 'capitao' ? 'capitao' : 'viceCapitao'] = nome;

    if (nome) {
        let novo = d.plantel.find(p => p.nome === nome);
        if (novo) {
            ajustarMoral(novo, cargo === 'capitao' ? 12 : 8);
            let lideranca = avaliarLideranca(novo);
            // Braçadeira em quem o grupo não reconhece mexe (pra baixo) com o vestiário inteiro
            if (cargo === 'capitao') {
                if (lideranca >= 65) { ajustarMoralElenco(3); adicionarNoticiaAutomatica(`🎖️ ${nome} é o novo capitão do ${d.nome}.`, `Escolha bem recebida no vestiário: o atleta é uma das principais referências do grupo.`); }
                else if (lideranca < 40) { ajustarMoralElenco(-4); adicionarNoticiaAutomatica(`🎖️ ${nome} recebe a braçadeira de capitão.`, `A escolha causou surpresa nos bastidores — parte do elenco esperava um nome de mais peso no grupo.`); }
                else { adicionarNoticiaAutomatica(`🎖️ ${nome} é o novo capitão do ${d.nome}.`, `O treinador definiu a hierarquia do vestiário para a sequência da temporada.`); }
            }
        }
    }

    salvarDados();
    renderizarLiderancaUI();
    if (typeof atualizarPlantelUI === 'function') atualizarPlantelUI();
}

function renderizarLiderancaUI() {
    if (currentSave !== 'clube') return;
    let d = garantirCentralMensagens();
    if (!d) return;
    let ativos = elencoAtivo().slice().sort((a, b) => avaliarLideranca(b) - avaliarLideranca(a));

    ['capitao', 'viceCapitao'].forEach(cargo => {
        let select = document.getElementById(cargo === 'capitao' ? 'select-capitao' : 'select-vice-capitao');
        if (!select) return;
        select.innerHTML = `<option value="">— Ninguém definido —</option>` + ativos.map(p =>
            `<option value="${p.nome}">${p.nome} (${p.posicao} • OVR ${p.ovr} • liderança ${avaliarLideranca(p)})</option>`
        ).join('');
        select.value = d[cargo] || '';
    });

    let info = document.getElementById('lideranca-info');
    if (!info) return;
    let capitao = ativos.find(p => p.nome === d.capitao);
    let vice = ativos.find(p => p.nome === d.viceCapitao);
    if (!capitao && !vice) {
        info.innerHTML = `<span style="color:var(--warning);">⚠️ Nenhuma liderança definida.</span> Um elenco sem capitão reclama mais e as mensagens do grupo chegam com mais frequência.`;
        return;
    }
    let linhas = [];
    if (capitao) linhas.push(`🎖️ <strong>Capitão:</strong> ${capitao.nome} — liderança ${avaliarLideranca(capitao)}/100 • moral ${rotuloMoral(capitao.moral)}`);
    if (vice) linhas.push(`🅥 <strong>Vice-capitão:</strong> ${vice.nome} — liderança ${avaliarLideranca(vice)}/100 • moral ${rotuloMoral(vice.moral)}`);
    if (capitao && avaliarLideranca(capitao) < 40) linhas.push(`<span style="color:var(--danger);">O grupo questiona a braçadeira: espere cobranças mais duras nas mensagens do elenco.</span>`);
    info.innerHTML = linhas.join('<br>');
}

// ------------------------------------------------------------------------------------
// MENSAGENS DOS JOGADORES
// ------------------------------------------------------------------------------------
// Cada gerador só devolve mensagem se o perfil do jogador realmente justificar aquilo.

function _msgElogioConduta(p, s, ctx) {
    if (p.moral < 78) return null;
    if (ctx.aprovRecente !== null && ctx.aprovRecente < 45) return null;
    let ehLider = (p.nome === ctx.capitao || p.nome === ctx.vice);
    let cargo = p.nome === ctx.capitao ? 'capitão' : 'vice-capitão';
    let complemento = ehLider
        ? `Como ${cargo}, sinto o grupo inteiro puxando junto.`
        : 'O grupo está confiando no processo.';
    return {
        peso: ehLider ? 26 : 18,
        assunto: `🙏 ${p.nome} elogia o trabalho da comissão`,
        corpo: `<p>"Mister, queria dizer pessoalmente: o ambiente que o senhor criou aqui é diferente. ${complemento}"</p>
        <p style="color:var(--text-muted);">${p.posicao} • OVR ${p.ovr} • ${s.jogos} jogo(s) na temporada${s.mediaNota ? ` • média ${s.mediaNota}` : ''} • moral ${rotuloMoral(p.moral)}</p>`,
        opcoes: [
            { id: 'devolver', rotulo: '🤝 Devolver o elogio ao grupo', detalhe: 'Levanta a moral de todo o elenco' },
            { id: 'pe_no_chao', rotulo: '🧊 Pedir pé no chão', detalhe: 'Menos euforia, mais foco — o conselho aprova' }
        ],
        contexto: { evento: 'elogio', jogador: p.nome }
    };
}

function _msgCobrancaMinutos(p, s, ctx) {
    if (s.totalTime < 4) return null;
    if (s.percentual >= 40) return null;
    if (p.ovr < ctx.mediaOvr - 2) return null;

    // Promessa quebrada é caso à parte: passa por cima do filtro de moral alta e cobra
    // muito mais forte, porque o jogador está cobrando a sua palavra, não a escalação.
    let promessa = avaliarPromessaMinutos(p);
    let quebrou = promessa.tem && promessa.vencida && !promessa.cumprida;

    if (!quebrou && p.moral >= 82) return null;

    if (quebrou) {
        return {
            peso: 30,
            assunto: `💢 ${p.nome} cobra a promessa que você fez`,
            corpo: `<p>"Mister, o senhor me olhou no olho e prometeu oportunidades. De lá pra cá foram <strong>${promessa.disputadas} partidas</strong> e eu entrei em <strong>${promessa.jogou}</strong>. Combinamos ${promessa.prometidos}."</p>
            <p style="color:var(--text-muted);">${p.posicao} • OVR ${p.ovr} (média do elenco: ${Math.round(ctx.mediaOvr)}) • ${s.percentual}% dos jogos na temporada • moral ${rotuloMoral(p.moral)}</p>
            <p style="color:var(--danger);">Palavra não cumprida pesa no vestiário inteiro, não só nele.</p>`,
            opcoes: [
                { id: 'admitir', rotulo: '🙇 Admitir a falha e escalá-lo', detalhe: 'Recupera a confiança dele e do grupo' },
                { id: 'ignorar_promessa', rotulo: '🧊 Dizer que o time vem primeiro', detalhe: 'Moral dele despenca e o grupo sente' }
            ],
            contexto: { evento: 'promessa_quebrada', jogador: p.nome, prometidos: promessa.prometidos, jogou: promessa.jogou }
        };
    }

    return {
        peso: 24,
        assunto: `⏱️ ${p.nome} quer mais minutos em campo`,
        corpo: `<p>"Mister, respeito as suas escolhas, mas jogar <strong>${s.jogos} de ${s.totalTime} partidas</strong> não é o que combinamos. Estou treinando bem e me sinto pronto."</p>
        <p style="color:var(--text-muted);">${p.posicao} • OVR ${p.ovr} (média do elenco: ${Math.round(ctx.mediaOvr)}) • ${s.percentual}% dos jogos • moral ${rotuloMoral(p.moral)}</p>`,
        opcoes: [
            { id: 'prometer', rotulo: '🤝 Prometer mais oportunidades', detalhe: 'Moral sobe agora — mas ele vai cobrar depois' },
            { id: 'exigir_treino', rotulo: '💪 Dizer que a vaga se conquista no treino', detalhe: 'Ele pode reagir bem ou se fechar de vez' }
        ],
        contexto: { evento: 'minutos', jogador: p.nome, jogos: s.jogos, totalTime: s.totalTime }
    };
}

function _msgPedidoTransferencia(p, s, ctx) {
    // Emprestado ao nosso clube não é nosso pra negociar — ele nem levanta o assunto.
    if (jogadorPertenceAOutroClube(p)) return null;
    let idade = p.idade || 26;
    let destaque = p.ovr >= ctx.mediaOvr + 4;
    if (!destaque) return null;
    if (idade > 27) return null;
    let minutosEscassos = s.totalTime >= 5 && s.percentual < 50;
    if (!minutosEscassos && p.moral >= 55 && idade > 24) return null;

    let clube = (typeof clubeInteressadoAleatorio === 'function') ? clubeInteressadoAleatorio() : 'um clube de fora';
    return {
        peso: minutosEscassos ? 12 : 6, // é o pedido mais raro do sistema
        assunto: `🚪 ${p.nome} pede para ser negociado`,
        corpo: `<p>"Mister, preciso ser honesto: o <strong>${clube}</strong> me procurou e eu quero ouvir. ${minutosEscassos ? `Estou jogando <strong>${s.percentual}% das partidas</strong> e sinto que posso mais.` : 'Acho que é o momento certo para dar um passo na carreira.'}"</p>
        <p style="color:var(--text-muted);">${p.posicao} • ${idade} anos • OVR ${p.ovr} (média do elenco: ${Math.round(ctx.mediaOvr)}) • ${s.jogos} jogo(s) • moral ${rotuloMoral(p.moral)}</p>
        <p style="color:var(--warning);">É um dos jogadores mais valorizados do elenco. Perder ou segurar tem preço nos dois lados.</p>`,
        opcoes: [
            { id: 'listar', rotulo: '📋 Colocá-lo na lista de negociáveis', detalhe: 'Vai para a aba Transferências; a torcida não vai gostar' },
            { id: 'convencer', rotulo: '🗣️ Tentar convencê-lo a ficar', detalhe: 'Pode dar certo, mas exige minutos de verdade' }
        ],
        contexto: { evento: 'transferencia', jogador: p.nome, clube }
    };
}

function _msgPedidoEmprestimo(p, s, ctx) {
    // Não dá pra emprestar a terceiros quem já está aqui emprestado por outro clube.
    if (jogadorPertenceAOutroClube(p)) return null;
    let idade = p.idade || 26;
    if (idade > 21) return null;
    if (p.ovr > ctx.mediaOvr - 3) return null;
    if (s.totalTime >= 5 && s.percentual >= 30) return null;
    return {
        peso: 14,
        assunto: `📤 ${p.nome} pede para sair por empréstimo`,
        corpo: `<p>"Mister, sei que ainda não estou no nível do elenco (<strong>OVR ${p.ovr}</strong> contra uma média de <strong>${Math.round(ctx.mediaOvr)}</strong>). Queria um empréstimo para jogar e voltar melhor."</p>
        <p style="color:var(--text-muted);">${p.posicao} • ${idade} anos • ${s.jogos} de ${s.totalTime} jogo(s) na temporada • moral ${rotuloMoral(p.moral)}</p>`,
        opcoes: [
            { id: 'emprestar', rotulo: '✅ Liberar o empréstimo', detalhe: 'Sai do elenco e volta com mais rodagem' },
            { id: 'segurar_jovem', rotulo: '🏠 Mantê-lo e dar minutos aqui', detalhe: 'Moral sobe, mas ele espera jogar de verdade' }
        ],
        contexto: { evento: 'emprestimo', jogador: p.nome }
    };
}

function _msgFadiga(p, s, ctx) {
    let cond = condicaoJogador(p);
    if (cond.nivel === 'ok') return null;
    return {
        peso: 16,
        assunto: `😮‍💨 ${p.nome} avisa que está no limite`,
        corpo: `<p>"Mister, não quero sair do time, mas preciso ser sincero: estou sentindo o acúmulo. São <strong>${p.jogosSeguidos || 0} jogo(s) seguidos</strong> e a perna não responde igual."</p>
        <p style="color:var(--text-muted);">Condição física: <strong>${Math.round(p.stamina)}%</strong> • ${rotuloPorNivel(cond.nivel)} • moral ${rotuloMoral(p.moral)}</p>`,
        opcoes: [
            { id: 'poupar', rotulo: '💤 Poupá-lo no próximo jogo', detalhe: 'Zera a sequência e recupera condição física' },
            { id: 'pedir_esforco', rotulo: '🔥 Pedir mais um esforço', detalhe: 'Ele vai a campo, mas com risco de lesão maior' }
        ],
        contexto: { evento: 'fadiga', jogador: p.nome }
    };
}

function _msgCapitaoVestiario(p, s, ctx) {
    if (p.nome !== ctx.capitao) return null;
    let ruim = ctx.clima.moralMedia < 60 || (ctx.aprovRecente !== null && ctx.aprovRecente < 40);
    return {
        peso: 22,
        assunto: ruim ? `🎖️ ${p.nome} traz um recado duro do vestiário` : `🎖️ ${p.nome} faz um balanço do grupo`,
        corpo: ruim
            ? `<p>"Mister, como capitão eu tenho que trazer isso: o grupo está rachado. Tem gente reclamando de minutos, tem gente sem entender a função em campo. A moral média do elenco está em <strong>${Math.round(ctx.clima.moralMedia)}/100</strong>."</p>
               <p style="color:var(--text-muted);">Vem do capitão — o que você decidir aqui repercute no elenco inteiro.</p>`
            : `<p>"Mister, passando o retorno do grupo: o pessoal está comprando a ideia. Moral média em <strong>${Math.round(ctx.clima.moralMedia)}/100</strong>. Só peço que continue conversando com quem está jogando menos."</p>
               <p style="color:var(--text-muted);">Vem do capitão — o que você decidir aqui repercute no elenco inteiro.</p>`,
        opcoes: [
            { id: 'reuniao', rotulo: '🗣️ Convocar uma reunião com o elenco', detalhe: 'Levanta a moral de todos, custa energia da comissão' },
            { id: 'delegar', rotulo: '🤲 Deixar o capitão resolver internamente', detalhe: 'Se a liderança dele for forte, funciona muito bem' }
        ],
        contexto: { evento: 'capitao_vestiario', jogador: p.nome, ruim }
    };
}

function _msgLiderancaQuestionada(p, s, ctx) {
    if (!ctx.capitao || p.nome === ctx.capitao) return null;
    let capitao = elencoAtivo().find(x => x.nome === ctx.capitao);
    if (!capitao) return null;
    if (avaliarLideranca(capitao) >= 40 && capitao.moral >= 50) return null;
    if (avaliarLideranca(p) < 55) return null;
    return {
        peso: 12,
        assunto: `😐 ${p.nome} questiona a braçadeira`,
        corpo: `<p>"Mister, com todo respeito ao <strong>${capitao.nome}</strong>, mas o grupo não está se enxergando na liderança dele. ${capitao.moral < 50 ? 'Ele mesmo não está bem.' : 'Faltam rodagem e presença no dia a dia.'}"</p>
        <p style="color:var(--text-muted);">Quem fala tem liderança <strong>${avaliarLideranca(p)}/100</strong>. O capitão atual está em <strong>${avaliarLideranca(capitao)}/100</strong>.</p>`,
        opcoes: [
            { id: 'trocar_capitao', rotulo: `🎖️ Passar a braçadeira para ${p.nome}`, detalhe: 'Resolve o incômodo, mas magoa o capitão atual' },
            { id: 'bancar_capitao', rotulo: `🛡️ Bancar ${capitao.nome}`, detalhe: 'Capitão se fortalece, quem reclamou se cala a contragosto' }
        ],
        contexto: { evento: 'lideranca', jogador: p.nome, capitaoAtual: capitao.nome }
    };
}

function _msgAgradecimentoSequencia(p, s, ctx) {
    if (s.totalTime < 5 || s.percentual < 65) return null;
    if (p.moral < 65) return null;
    return {
        peso: 14,
        assunto: `💚 ${p.nome} agradece a confiança`,
        corpo: `<p>"Mister, obrigado pela sequência. <strong>${s.jogos} jogos</strong> na temporada${s.gols > 0 ? `, ${s.gols} gol(s)` : ''}${s.assistencias > 0 ? ` e ${s.assistencias} assistência(s)` : ''}. Estou no melhor momento da minha carreira aqui."</p>
        <p style="color:var(--text-muted);">${p.posicao} • OVR ${p.ovr}${s.mediaNota ? ` • média ${s.mediaNota}` : ''} • moral ${rotuloMoral(p.moral)}</p>`,
        opcoes: [
            { id: 'reconhecer', rotulo: '👏 Reconhecer publicamente', detalhe: 'Moral dele e da torcida sobem' },
            { id: 'cobrar_mais', rotulo: '📈 Cobrar o próximo degrau', detalhe: 'Sem afago: exige evolução' }
        ],
        contexto: { evento: 'agradecimento', jogador: p.nome }
    };
}

function _msgDesabafoDerrotas(p, s, ctx) {
    if (ctx.aprovRecente === null || ctx.aprovRecente >= 40) return null;
    if (p.moral >= 55) return null;
    return {
        peso: 18,
        assunto: `😞 ${p.nome} desabafa sobre a fase do time`,
        corpo: `<p>"Mister, o vestiário está pesado. <strong>${ctx.aprovRecente}% de aproveitamento</strong> nos últimos jogos, a torcida em cima... a gente entra em campo com medo de errar."</p>
        <p style="color:var(--text-muted);">${p.posicao} • OVR ${p.ovr} • ${s.jogos} jogo(s) • moral ${rotuloMoral(p.moral)}</p>`,
        opcoes: [
            { id: 'acolher', rotulo: '🫂 Acolher e tirar a pressão do grupo', detalhe: 'Moral do elenco sobe, o conselho acha frouxo' },
            { id: 'endurecer', rotulo: '⚔️ Endurecer e cobrar reação', detalhe: 'Divide o vestiário, mas o conselho aprova' }
        ],
        contexto: { evento: 'desabafo', jogador: p.nome }
    };
}

const GERADORES_MSG_JOGADOR = [
    _msgElogioConduta, _msgCobrancaMinutos, _msgPedidoTransferencia, _msgPedidoEmprestimo,
    _msgFadiga, _msgCapitaoVestiario, _msgLiderancaQuestionada, _msgAgradecimentoSequencia,
    _msgDesabafoDerrotas
];

function dispararMensagensElenco() {
    let d = db[currentSave];
    if (!d || !d.nome) return;
    let ativos = elencoAtivo();
    if (ativos.length === 0) return;

    let clima = calcularClimaVestiario();
    let ctx = {
        mediaOvr: mediaOvrElenco(),
        capitao: d.capitao || '',
        vice: d.viceCapitao || '',
        clima: clima,
        aprovRecente: clima.aprovRecente
    };

    // Quantidade imprevisível: normalmente 0, 1 ou 2 mensagens. Cada mensagem extra fica
    // bem mais difícil que a anterior, então o teto de 5 só acontece com o vestiário em
    // polvorosa (é a tensão do clima que empurra a curva pra cima).
    let chance = 70 + clima.tensao;
    let quantidade = 0;
    for (let i = 0; i < CENTRAL_MSG_CFG.MAX_MENSAGENS_JOGADORES; i++) {
        if (gerarNumeroAleatorio(1, 100) > chance) break;
        quantidade++;
        chance = Math.round(chance * 0.70);
    }
    if (quantidade === 0) return;

    // Monta todas as mensagens possíveis do elenco inteiro e sorteia por peso, sem repetir jogador
    let candidatas = [];
    ativos.forEach(p => {
        let s = estatisticasJogadorTemporada(p.nome);
        GERADORES_MSG_JOGADOR.forEach(fn => {
            let m = null;
            try { m = fn(p, s, ctx); } catch (e) { m = null; }
            if (!m) return;
            let peso = m.peso;
            if (p.nome === ctx.capitao) peso = Math.round(peso * 2.2);
            else if (p.nome === ctx.vice) peso = Math.round(peso * 1.5);
            candidatas.push({ jogador: p, peso, msg: m });
        });
    });
    if (candidatas.length === 0) return;

    let jaFalaram = new Set();
    for (let i = 0; i < quantidade; i++) {
        let pool = candidatas.filter(c => !jaFalaram.has(c.jogador.nome));
        if (pool.length === 0) break;

        let soma = pool.reduce((s, c) => s + c.peso, 0);
        let alvo = gerarNumeroAleatorio(1, soma);
        let acumulado = 0;
        let escolhida = pool[pool.length - 1];
        for (let c of pool) {
            acumulado += c.peso;
            if (alvo <= acumulado) { escolhida = c; break; }
        }
        jaFalaram.add(escolhida.jogador.nome);

        let sufixo = escolhida.jogador.nome === ctx.capitao ? ' 🎖️' : (escolhida.jogador.nome === ctx.vice ? ' 🅥' : '');
        registrarMensagem({
            tipo: 'jogador',
            remetente: escolhida.jogador.nome + sufixo,
            assunto: escolhida.msg.assunto,
            corpo: escolhida.msg.corpo,
            opcoes: escolhida.msg.opcoes,
            acao: 'jogador',
            contexto: escolhida.msg.contexto,
            abaDestino: 'tab-plantel'
        });
    }
}

function resolverMensagemJogador(msg, opcao) {
    let d = db[currentSave];
    let c = msg.contexto || {};
    let p = d.plantel.find(x => x.nome === c.jogador);
    if (!p) return 'O atleta não faz mais parte do elenco — a conversa foi arquivada.';
    garantirCamposElenco(p);

    // A situação pode ter mudado entre a mensagem chegar e você responder (o atleta pode ter
    // virado um empréstimo de outro clube nesse meio-tempo). Negociar quem não é nosso fica
    // barrado aqui também, e não só na hora de gerar a mensagem.
    if (jogadorPertenceAOutroClube(p) && (c.evento === 'transferencia' || c.evento === 'emprestimo')) {
        return `${p.nome} está no clube por empréstimo e pertence a outro time — não há como negociá-lo. O departamento jurídico arquivou o pedido.`;
    }

    switch (c.evento) {
        case 'elogio': {
            if (opcao === 'devolver') { ajustarMoralElenco(4); ajustarMoral(p, 6); return `Você devolveu o elogio ao grupo: a moral de todo o elenco subiu.`; }
            ajustarMoral(p, 2); atualizarNotaDiretoria(0.08);
            return 'Você pediu pé no chão. O jogador entendeu o recado e o conselho gostou da postura sóbria.';
        }

        case 'minutos': {
            if (opcao === 'prometer') {
                ajustarMoral(p, 14);
                p.promessaMinutos = { desde: (d.partidas || []).length, jogosPrometidos: 4 };
                return `${p.nome} saiu satisfeito da conversa. A promessa fica registrada: se ele não entrar em campo em 4 das próximas partidas, a cobrança volta bem mais dura.`;
            }
            p.promessaMinutos = null; // não prometeu nada: nada a cobrar depois
            let aceitou = gerarNumeroAleatorio(1, 100) <= 45;
            ajustarMoral(p, aceitou ? 3 : -12);
            return aceitou
                ? `${p.nome} aceitou o desafio e prometeu se impor nos treinos.`
                : `${p.nome} não gostou da resposta e saiu contrariado da sala (moral em queda).`;
        }

        case 'promessa_quebrada': {
            if (opcao === 'admitir') {
                ajustarMoral(p, 16);
                ajustarMoralElenco(2);
                // Renova o compromisso: a contagem recomeça a partir de agora
                p.promessaMinutos = { desde: (d.partidas || []).length, jogosPrometidos: 3 };
                return `Você assumiu a falha na frente dele. ${p.nome} recuperou a confiança e o grupo registrou a atitude — mas agora são 3 partidas para cumprir de verdade.`;
            }
            p.promessaMinutos = null;
            ajustarMoral(p, -22);
            ajustarMoralElenco(-5);
            return `${p.nome} saiu com a sensação de ter sido enganado (moral despencou) e o vestiário inteiro sentiu o peso da palavra não cumprida.`;
        }

        case 'transferencia': {
            if (opcao === 'listar') {
                if (!Array.isArray(d.exigenciasDiretoria)) d.exigenciasDiretoria = [];
                if (!d.exigenciasDiretoria.includes(p.nome)) d.exigenciasDiretoria.push(p.nome);
                p.pediuSaida = true;
                ajustarMoral(p, 8);
                atualizarTermometroTorcida(-gerarNumeroAleatorio(3, 7));
                adicionarNoticiaAutomatica(`🚪 NA VITRINE: ${p.nome} é liberado para negociar com o ${c.clube}.`, `O atleta pediu para sair e o clube aceitou ouvir propostas. A torcida reagiu mal nas redes sociais.`);
                return `${p.nome} entrou na lista de negociáveis (aparece marcado na aba Elenco e você pode fechar a saída na aba Transferências).`;
            }
            let convenceu = gerarNumeroAleatorio(1, 100) <= (p.moral >= 60 ? 65 : 35);
            if (convenceu) {
                ajustarMoral(p, 12);
                p.promessaMinutos = { desde: (d.partidas || []).length, jogosPrometidos: 5 };
                return `Você convenceu ${p.nome} a ficar — mas com o compromisso de dar minutos a ele. A promessa está registrada.`;
            }
            ajustarMoral(p, -15);
            p.pediuSaida = true;
            return `${p.nome} ouviu, mas não se convenceu. Ele segue no elenco de cabeça quente e o assunto vai voltar.`;
        }

        case 'emprestimo': {
            if (opcao === 'emprestar') {
                p.status = 'Emprestado';
                p.temporadasEmprestimo = 1;
                liberarBracadeiraSeNecessario(p.nome);
                adicionarNoticiaAutomatica(`📤 RODAGEM: ${p.nome} sai por empréstimo.`, `O clube liberou o jovem para ganhar minutos em outra equipe e voltar mais preparado.`);
                if (typeof preencherDatalistJogadores === 'function') preencherDatalistJogadores();
                if (typeof filtrarMercado === 'function') filtrarMercado(statusFiltroMercado);
                return `${p.nome} foi emprestado por 1 temporada. Ele aparece na aba Transferências com o status de emprestado.`;
            }
            ajustarMoral(p, 10);
            p.promessaMinutos = { desde: (d.partidas || []).length, jogosPrometidos: 3 };
            return `${p.nome} ficou animado com a chance de brigar por espaço aqui. Agora é dar minutos a ele.`;
        }

        case 'fadiga': {
            if (opcao === 'poupar') {
                p.poupadoRestante = 1;
                p.stamina = Math.min(CONDICAO_FISICA_CFG.STAMINA_MAX, (p.stamina || 0) + 12);
                ajustarMoral(p, 10);
                if (typeof atualizarDepartamentoMedicoUI === 'function') atualizarDepartamentoMedicoUI();
                return `${p.nome} será poupado na próxima partida. O Auxiliar Técnico já está avisado.`;
            }
            p.riscoExtraLesao = 2;
            ajustarMoral(p, -10);
            return `${p.nome} vai a campo mesmo assim. O departamento médico registrou risco elevado de lesão nas próximas 2 partidas dele.`;
        }

        case 'capitao_vestiario': {
            if (opcao === 'reuniao') {
                ajustarMoralElenco(c.ruim ? 8 : 4);
                ajustarMoral(p, 6);
                adicionarNoticiaAutomatica(`🗣️ CONVERSA FRANCA: treinador reúne o elenco.`, `Após um alerta da liderança do grupo, o comandante parou o treino para uma conversa longa com os atletas.`);
                return `Reunião feita. A moral do elenco inteiro subiu${c.ruim ? ' de forma significativa' : ''}.`;
            }
            let forca = avaliarLideranca(p);
            if (forca >= 60) { ajustarMoralElenco(6); ajustarMoral(p, 10); return `${p.nome} tem liderança de sobra (${forca}/100) e resolveu internamente. O grupo se uniu e ele saiu ainda mais forte.`; }
            ajustarMoralElenco(-4); ajustarMoral(p, -6);
            return `${p.nome} não teve força suficiente (liderança ${forca}/100) para resolver sozinho. O clima piorou um pouco.`;
        }

        case 'lideranca': {
            if (opcao === 'trocar_capitao') {
                let antigo = d.plantel.find(x => x.nome === c.capitaoAtual);
                if (antigo) ajustarMoral(antigo, -18);
                d.capitao = p.nome;
                if (d.viceCapitao === p.nome) d.viceCapitao = '';
                ajustarMoral(p, 15);
                ajustarMoralElenco(3);
                adicionarNoticiaAutomatica(`🎖️ TROCA DE BRAÇADEIRA: ${p.nome} é o novo capitão.`, `O treinador reagiu ao mal-estar interno e mudou a hierarquia do vestiário.`);
                renderizarLiderancaUI();
                return `${p.nome} é o novo capitão. ${c.capitaoAtual} ficou muito abalado com a decisão.`;
            }
            let capitao = d.plantel.find(x => x.nome === c.capitaoAtual);
            if (capitao) ajustarMoral(capitao, 12);
            ajustarMoral(p, -8);
            return `Você bancou ${c.capitaoAtual}, que se fortaleceu no grupo. ${p.nome} aceitou a contragosto.`;
        }

        case 'agradecimento': {
            if (opcao === 'reconhecer') {
                ajustarMoral(p, 8);
                atualizarTermometroTorcida(3);
                adicionarNoticiaAutomatica(`👏 ELOGIO PÚBLICO: treinador exalta ${p.nome}.`, `Em entrevista, o comandante destacou a temporada do atleta e o transformou em exemplo para o elenco.`);
                return `Reconhecimento público feito. ${p.nome} e a torcida gostaram.`;
            }
            let respondeu = gerarNumeroAleatorio(1, 100) <= 55;
            ajustarMoral(p, respondeu ? 4 : -8);
            return respondeu
                ? `${p.nome} abraçou a cobrança e prometeu o próximo degrau.`
                : `${p.nome} esperava um afago e recebeu cobrança. Saiu murcho da conversa.`;
        }

        case 'desabafo': {
            if (opcao === 'acolher') {
                ajustarMoralElenco(6);
                atualizarNotaDiretoria(-0.1);
                return 'Você tirou a pressão do grupo: a moral do elenco subiu, mas o conselho achou o discurso complacente.';
            }
            ajustarMoralElenco(-3);
            ajustarMoral(p, -5);
            atualizarNotaDiretoria(0.12);
            return 'Você endureceu o discurso: o conselho aprovou a firmeza, mas parte do vestiário se fechou.';
        }
    }

    return 'Conversa registrada.';
}
