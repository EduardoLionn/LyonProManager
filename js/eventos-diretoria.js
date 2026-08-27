// =====================================================================================
// EVENTOS DA DIRETORIA — pautas de bastidor com contexto real do clube
// =====================================================================================
// A cada 15 a 25 ações tomadas pelo treinador (partida salva, transferência, upgrade,
// mexida no elenco...), a diretoria aparece com UMA pauta. A pauta nunca é sorteada no
// vácuo: ela é escolhida a partir do momento do clube — aproveitamento recente, campanha
// na liga e nas copas, prestígio, humor da torcida e o caixa da temporada.
//
// Cada evento chega na Central de Mensagens com 1 ou 2 opções de resposta, e só produz
// efeito no jogo quando o treinador escolhe (resolverEventoDiretoria).

// ------------------------------------------------------------------------------------
// LEITURA DE CONTEXTO
// ------------------------------------------------------------------------------------

// Aproveitamento (%) de um conjunto de partidas, no critério clássico de pontos ganhos.
// Vitória nos pênaltis conta como vitória (é como o resto do sistema já trata o campo penaltis).
function aproveitamentoPartidas(lista) {
    if (!lista || lista.length === 0) return null;
    let pontos = lista.reduce((soma, p) => {
        if (p.golsPro > p.golsContra || p.penaltis) return soma + 3;
        if (p.golsPro === p.golsContra) return soma + 1;
        return soma;
    }, 0);
    return Math.round((pontos / (lista.length * 3)) * 100);
}

// Quanto o clube gastou nas últimas 5 temporadas. Usa os valores reais gravados no
// histórico quando existem; para as temporadas antigas (saves que ainda não registravam
// gasto por temporada) completa com a média histórica que a diretoria já mantinha.
function totalGastoUltimas5Temporadas() {
    let d = db[currentSave];
    if (!d) return 0;
    let comGasto = (d.historicoTemporadas || []).filter(h => typeof h.gastoTemporada === 'number').slice(-5);
    let total = comGasto.reduce((s, h) => s + h.gastoTemporada, 0);
    let faltando = 5 - comGasto.length;
    if (faltando > 0) total += Math.max(0, d.mediaGastoHistorico || 0) * faltando;
    total += Math.max(0, d.gastoAtual || 0); // a temporada em curso também conta na janela
    // Clube que nunca gastou nada ainda: usa o orçamento atual como régua pra não zerar a conta
    if (total <= 0.5) total = Math.max(2, (d.orcamento || 0) * 1.5);
    return total;
}

// Retrato do momento do clube usado por todos os eventos desta tela.
function avaliarContextoClube() {
    let d = db[currentSave];
    let partidas = d.partidas || [];
    let daTemporada = partidas.filter(p => p.temporada === d.temporadaAtual);

    let ultimas = partidas.slice(-6);
    let aprovRecente = aproveitamentoPartidas(ultimas);
    let aprovLiga = aproveitamentoPartidas(daTemporada.filter(p => p.comp === 'Liga'));
    let aprovCopa = aproveitamentoPartidas(daTemporada.filter(p => p.comp !== 'Liga' && p.comp !== 'Amistoso'));

    let nota = d.notaDiretoria || 75;
    let torcida = d.aprovacaoTorcida || 75;
    let gasto = d.gastoAtual || 0;
    let arrecadado = d.arrecadadoAtual || 0;
    let saldo = arrecadado - gasto;

    // Receita fraca = arrecadou bem menos do que costuma arrecadar (patrocínio/bilheteria em baixa).
    // Se ainda não há histórico, considera fraca quando o clube gastou e não arrecadou nada.
    let mediaArrecadado = d.mediaArrecadadoHistorico || 0;
    let receitaFraca = mediaArrecadado > 0
        ? arrecadado < mediaArrecadado * 0.45
        : (gasto > 0 && arrecadado <= 0);

    // Nota composta do momento: forma recente pesa mais, prestígio e torcida completam.
    let baseForma = (aprovRecente === null ? 50 : aprovRecente);
    let score = (baseForma - 50) * 0.6 + (nota - 70) * 0.9 + (torcida - 70) * 0.45;

    let momento = 'neutro';
    if (score >= 14) momento = 'otimo';
    else if (score >= 5) momento = 'bom';
    else if (score <= -16) momento = 'pessimo';
    else if (score <= -5) momento = 'ruim';

    // "Acima dos objetivos" na prática: campanha forte na liga OU nas copas, com prestígio em dia.
    let acimaDosObjetivos = (nota >= 70) && (
        (aprovLiga !== null && aprovLiga >= 62) ||
        (aprovCopa !== null && aprovCopa >= 70) ||
        (aprovRecente !== null && aprovRecente >= 72)
    );

    return {
        momento, score: Math.round(score),
        aprovRecente, aprovLiga, aprovCopa, acimaDosObjetivos,
        nota, torcida, gasto, arrecadado, saldo, receitaFraca,
        partidasNaTemporada: daTemporada.length,
        orcamento: d.orcamento || 0
    };
}

// Nome de um clube plausível para simular interesse externo: tenta a divisão de cima
// (ou a própria, se já estiver no topo) e nunca devolve o nome do próprio clube.
function clubeInteressadoAleatorio() {
    let d = db[currentSave];
    let ligaAtual = d.liga || '';
    let destino = (typeof ligaMap !== 'undefined' && ligaMap[ligaAtual] && ligaMap[ligaAtual].up) ? ligaMap[ligaAtual].up : ligaAtual;
    let lista = (typeof clubesPorLiga !== 'undefined' && clubesPorLiga[destino]) ? clubesPorLiga[destino] : null;
    if (!lista) {
        let todas = (typeof clubesPorLiga !== 'undefined') ? Object.values(clubesPorLiga).flat() : [];
        lista = todas.length ? todas : ['um clube do exterior'];
    }
    let candidatos = lista.filter(c => c.toLowerCase() !== String(d.nome || '').toLowerCase());
    if (candidatos.length === 0) candidatos = ['um clube do exterior'];
    return candidatos[gerarNumeroAleatorio(0, candidatos.length - 1)];
}

// Jovem revelação: pouco tempo de casa (1+ temporada concluída), idade baixa e evolução
// clara de OVR desde que chegou. É esse perfil que atrai proposta de fora.
function encontrarJoiaDoElenco() {
    let d = db[currentSave];
    if (!d || !d.plantel) return null;
    if (typeof garantirCamposElencoTodos === 'function') garantirCamposElencoTodos();

    let ativos = d.plantel.filter(p => p.status === 'Ativo' && p.origem !== 'EmprestadoIn');
    if (ativos.length === 0) return null;
    let mediaOvr = ativos.reduce((s, p) => s + p.ovr, 0) / ativos.length;

    let candidatos = ativos.filter(p => {
        let idade = p.idade || 0;
        let jovem = idade === 0 ? false : idade <= 24;
        let temporadas = p.temporadasNoClube || 0;
        let evolucao = p.ovr - (p.ovrInicial || p.ovr);
        if (!(jovem && temporadas >= 1 && evolucao >= 3 && p.ovr >= mediaOvr - 1)) return false;
        // PROFUNDIDADE REALISTA (mesmo critério de _msgPedidoTransferencia, eventos-elenco.js):
        // só considera vender uma joia se sobrarem pelo menos 3 jogadores da mesma categoria
        // posicional depois dela sair.
        let categoria = (p.posicao || '').split('/')[0];
        let mesmaCategoria = ativos.filter(o => (o.posicao || '').split('/')[0] === categoria).length;
        return mesmaCategoria >= 4;
    });
    if (candidatos.length === 0) return null;

    // O mais valorizado da safra: evolução conta o dobro do overall bruto na régua de interesse
    candidatos.sort((a, b) => {
        let ea = (a.ovr - (a.ovrInicial || a.ovr)) * 2 + a.ovr;
        let eb = (b.ovr - (b.ovrInicial || b.ovr)) * 2 + b.ovr;
        return eb - ea;
    });
    return candidatos[0];
}

// Valor de mercado aproximado de um atleta, em €M — cresce forte com o overall e é
// puxado pra cima quando o jogador é jovem.
function valorDeMercadoEstimado(p) {
    if (!p) return 0;
    let base = Math.pow(Math.max(40, p.ovr) / 10, 3) / 12;
    let idade = p.idade || 26;
    let fatorIdade = idade <= 21 ? 1.6 : (idade <= 24 ? 1.35 : (idade <= 28 ? 1 : (idade <= 31 ? 0.7 : 0.4)));
    return Math.max(0.5, Math.round(base * fatorIdade * 10) / 10);
}

// ------------------------------------------------------------------------------------
// GERADORES DE PAUTA
// ------------------------------------------------------------------------------------
// Cada gerador devolve a mensagem pronta (ou null, se o contexto não permitir aquela pauta).
// O peso indica a chance relativa daquela pauta aparecer no momento atual do clube.

function _pautaMetasAmpliadas(ctx) {
    if (!ctx.acimaDosObjetivos || (ctx.momento !== 'otimo' && ctx.momento !== 'bom')) return null;

    let totalGasto5 = totalGastoUltimas5Temporadas();
    let percentual = gerarNumeroAleatorio(10, 20);
    let verba = Math.round(totalGasto5 * (percentual / 100) * 100) / 100;
    if (verba < 0.5) return null;

    let alvoLiga = (ctx.aprovLiga !== null && ctx.aprovLiga >= 62) ? 'terminar a liga entre os 3 primeiros' : 'brigar pelo título da liga até a última rodada';
    let alvoCopa = 'chegar pelo menos à semifinal da copa nacional';
    let novaMeta = gerarNumeroAleatorio(1, 2) === 1 ? alvoLiga : alvoCopa;

    return {
        peso: 30,
        assunto: '📈 A diretoria quer subir a régua da temporada',
        corpo: `<p>O conselho se reuniu depois da sequência recente${ctx.aprovRecente !== null ? ` (<strong>${ctx.aprovRecente}% de aproveitamento</strong> nos últimos jogos)` : ''} e a leitura foi unânime: <strong>o time está acima do que foi contratado no início da temporada</strong>.</p>
        <p>A proposta é direta — a diretoria quer <strong>${novaMeta}</strong> e, para isso, se dispõe a liberar <strong>€${verba.toFixed(2)}M</strong> em verba extraordinária, o equivalente a <strong>${percentual}% de tudo que o clube gastou nas últimas 5 temporadas</strong> (€${totalGasto5.toFixed(2)}M).</p>
        <p style="color:var(--text-muted);">"Se o senhor topar, o dinheiro entra no caixa de transferências esta semana. Mas a meta passa a valer na sua avaliação de fim de temporada."</p>`,
        opcoes: [
            { id: 'aceitar', rotulo: '✅ Aceitar o desafio e a verba', detalhe: `+€${verba.toFixed(2)}M no orçamento, nova meta na avaliação` },
            { id: 'recusar', rotulo: '🛡️ Recusar e manter as metas atuais', detalhe: 'Sem verba extra, mas sem cobrança nova' }
        ],
        contexto: { evento: 'metas_ampliadas', verba, percentual, novaMeta, totalGasto5 }
    };
}

function _pautaVendaJoia(ctx) {
    let joia = encontrarJoiaDoElenco();
    if (!joia) return null;

    let clube = clubeInteressadoAleatorio();
    let valorBase = valorDeMercadoEstimado(joia);
    // Proposta sempre acima do valor de mercado — é isso que faz a diretoria se interessar
    let proposta = Math.round(valorBase * (1 + gerarNumeroAleatorio(15, 60) / 100) * 100) / 100;
    let evolucao = joia.ovr - (joia.ovrInicial || joia.ovr);

    // Clube quebrado com proposta na mesa tem chance bem maior de a pauta subir
    let peso = ctx.receitaFraca || ctx.saldo < 0 ? 32 : 18;
    if (ctx.momento === 'pessimo' || ctx.momento === 'ruim') peso += 8;

    return {
        peso,
        assunto: `💸 Proposta do ${clube} por ${joia.nome}`,
        corpo: `<p>Chegou uma proposta formal do <strong>${clube}</strong> por <strong>${joia.nome}</strong> (${joia.posicao}, ${joia.idade ? joia.idade + ' anos, ' : ''}OVR ${joia.ovr}): <strong>€${proposta.toFixed(2)}M</strong>.</p>
        <p>O departamento de scouting lembra que o atleta <strong>evoluiu ${evolucao} pontos de overall</strong> desde que chegou (entrou com ${joia.ovrInicial || joia.ovr}) e já completou <strong>${joia.temporadasNoClube || 1} temporada(s)</strong> no clube. É a maior valorização da nossa base.</p>
        <p style="color:var(--text-muted);">${ctx.receitaFraca ? '"Mister, o senhor sabe da nossa situação de receita. Um valor desses resolve o nosso ano."' : '"Financeiramente é um negócio excelente. Mas quem monta o time é o senhor — queremos a sua leitura antes de responder."'}</p>`,
        opcoes: [
            { id: 'vender', rotulo: '💰 Aceitar a proposta', detalhe: `+€${(proposta * 0.8).toFixed(2)}M no caixa de transferências` },
            { id: 'segurar', rotulo: '🔒 Segurar o jogador', detalhe: 'Torcida aprova, mas o conselho fica contrariado' }
        ],
        contexto: { evento: 'venda_joia', jogador: joia.nome, proposta, clube, evolucao }
    };
}

function _pautaCorteVerba(ctx) {
    if (ctx.momento !== 'ruim' && ctx.momento !== 'pessimo') return null;
    if (!ctx.receitaFraca && ctx.torcida >= 55) return null;

    let percentual = gerarNumeroAleatorio(20, 40);
    let corte = Math.round(Math.max(0, ctx.orcamento) * (percentual / 100) * 100) / 100;

    return {
        peso: 34,
        assunto: '📉 Conselho quer cortar a verba de transferências',
        corpo: `<p>O relatório financeiro do trimestre não foi bom. Com a campanha abaixo do esperado${ctx.aprovRecente !== null ? ` (<strong>${ctx.aprovRecente}%</strong> de aproveitamento recente)` : ''} e a aprovação da torcida em <strong>${Math.round(ctx.torcida)}%</strong>, <strong>a bilheteria e os bônus de patrocínio despencaram</strong>.</p>
        <p>Nesta temporada o clube gastou <strong>€${ctx.gasto.toFixed(2)}M</strong> e arrecadou apenas <strong>€${ctx.arrecadado.toFixed(2)}M</strong>. O conselho propõe cortar <strong>${percentual}% da verba de transferências (€${corte.toFixed(2)}M)</strong> para fechar as contas.</p>
        <p style="color:var(--text-muted);">"Não é punição, mister. É caixa. Se o senhor discordar, vamos precisar de um compromisso de resultado no lugar do corte."</p>`,
        opcoes: [
            { id: 'aceitar_corte', rotulo: '🤝 Aceitar o corte e colaborar', detalhe: `-€${corte.toFixed(2)}M no orçamento, conselho reconhece o gesto` },
            { id: 'contestar', rotulo: '📣 Contestar e prometer resultados', detalhe: 'Mantém a verba, mas assume um ultimato' }
        ],
        contexto: { evento: 'corte_verba', corte, percentual }
    };
}

function _pautaBonusPatrocinio(ctx) {
    if (ctx.momento !== 'otimo' && ctx.momento !== 'bom') return null;
    if (ctx.torcida < 65) return null;

    let bonus = Math.round(Math.max(1.5, totalGastoUltimas5Temporadas() * (gerarNumeroAleatorio(5, 9) / 100)) * 100) / 100;

    return {
        peso: 22,
        assunto: '🤝 Patrocinador quer antecipar o bônus de desempenho',
        corpo: `<p>Com a torcida em <strong>${Math.round(ctx.torcida)}% de aprovação</strong> e a boa fase do time, o patrocinador máster procurou o clube para <strong>antecipar o bônus de desempenho do contrato: €${bonus.toFixed(2)}M</strong>.</p>
        <p>O conselho quer decidir com o senhor onde o dinheiro entra.</p>`,
        opcoes: [
            { id: 'elenco', rotulo: '⚽ Direcionar tudo ao elenco', detalhe: `+€${bonus.toFixed(2)}M na verba de transferências` },
            { id: 'estrutura', rotulo: '🏗️ Investir em estrutura e base', detalhe: `+€${(bonus * 0.4).toFixed(2)}M agora, mas receita futura sobe` }
        ],
        contexto: { evento: 'bonus_patrocinio', bonus }
    };
}

function _pautaUltimato(ctx) {
    if (ctx.momento !== 'pessimo') return null;

    return {
        peso: 30,
        assunto: '⚠️ Reunião de emergência: o conselho quer explicações',
        corpo: `<p>O conselho convocou uma reunião fora do calendário. Os números na mesa: <strong>prestígio ${Math.round(ctx.nota)}/100</strong>, torcida em <strong>${Math.round(ctx.torcida)}%</strong>${ctx.aprovRecente !== null ? ` e apenas <strong>${ctx.aprovRecente}% de aproveitamento</strong> nos últimos jogos` : ''}.</p>
        <p>A pergunta foi direta: o que muda a partir de agora?</p>`,
        opcoes: [
            { id: 'assumir', rotulo: '🎙️ Assumir a responsabilidade publicamente', detalhe: 'Torcida e vestiário te apoiam, conselho segue desconfiado' },
            { id: 'cobrar_reforcos', rotulo: '📋 Apontar a falta de elenco e pedir reforços', detalhe: 'Pequena verba emergencial, mas o desgaste com o conselho aumenta' }
        ],
        contexto: { evento: 'ultimato' }
    };
}

function _pautaRenovacaoDestaque(ctx) {
    let joia = encontrarJoiaDoElenco();
    if (!joia) return null;
    if (ctx.momento === 'pessimo') return null;

    let custo = Math.round(Math.max(0.4, valorDeMercadoEstimado(joia) * 0.12) * 100) / 100;

    return {
        peso: 16,
        assunto: `📝 Renovação de ${joia.nome} está na mesa`,
        corpo: `<p>O departamento jurídico avisa que o contrato de <strong>${joia.nome}</strong> (OVR ${joia.ovr}) entra na reta final. Com a valorização recente, o empresário já pediu reajuste.</p>
        <p>Renovar agora custa <strong>€${custo.toFixed(2)}M</strong> em luvas e salários adiantados, saindo da verba de transferências. Esperar significa ouvir propostas de fora nas próximas janelas.</p>`,
        opcoes: [
            { id: 'renovar', rotulo: '✍️ Renovar agora com reajuste', detalhe: `-€${custo.toFixed(2)}M, jogador fica satisfeito e blindado` },
            { id: 'adiar', rotulo: '⏳ Adiar a conversa para depois', detalhe: 'Economiza o dinheiro, mas o atleta fica incomodado' }
        ],
        contexto: { evento: 'renovacao_destaque', jogador: joia.nome, custo }
    };
}

function _pautaAntecipacaoVerba(ctx) {
    if (ctx.momento === 'pessimo') return null;
    if (ctx.orcamento > totalGastoUltimas5Temporadas() * 0.3) return null; // caixa já está confortável

    let antecipacao = Math.round(Math.max(1, totalGastoUltimas5Temporadas() * (gerarNumeroAleatorio(8, 14) / 100)) * 100) / 100;

    return {
        peso: 14,
        assunto: '💳 Antecipação de verba da próxima temporada',
        corpo: `<p>O caixa de transferências está em <strong>€${ctx.orcamento.toFixed(2)}M</strong> e o conselho entende que isso limita o seu trabalho no meio da temporada.</p>
        <p>A diretoria pode <strong>antecipar €${antecipacao.toFixed(2)}M da verba da próxima temporada</strong>. O dinheiro entra agora e é descontado do orçamento que você receberá na virada.</p>`,
        opcoes: [
            { id: 'antecipar', rotulo: '💰 Antecipar a verba', detalhe: `+€${antecipacao.toFixed(2)}M agora, descontado na próxima temporada` },
            { id: 'nao_antecipar', rotulo: '🧾 Trabalhar com o que tem', detalhe: 'Conselho valoriza a responsabilidade financeira' }
        ],
        contexto: { evento: 'antecipacao_verba', antecipacao }
    };
}

// Sempre disponível — é a pauta "de manutenção" quando nenhuma das específicas encaixa.
function _pautaCobrancaRotina(ctx) {
    let foco = ctx.saldo < 0 ? 'financeiro' : (ctx.torcida < 60 ? 'torcida' : 'esportivo');
    let textos = {
        financeiro: `<p>O balanço da temporada mostra <strong>€${ctx.gasto.toFixed(2)}M gastos</strong> contra <strong>€${ctx.arrecadado.toFixed(2)}M arrecadados</strong>. O conselho não vetou nada, mas pediu para registrar em ata que o clube está no vermelho na janela.</p><p>Querem saber se o senhor pretende compensar com vendas ou segurar as contratações.</p>`,
        torcida: `<p>A aprovação da torcida caiu para <strong>${Math.round(ctx.torcida)}%</strong> e o departamento de marketing está preocupado com a venda de ingressos e sócios.</p><p>O conselho pergunta que postura o senhor pretende ter publicamente.</p>`,
        esportivo: `<p>Reunião de rotina do conselho. O prestígio está em <strong>${Math.round(ctx.nota)}/100</strong>${ctx.aprovLiga !== null ? ` e o aproveitamento na liga em <strong>${ctx.aprovLiga}%</strong>` : ''}. Nada de urgente na mesa — querem só alinhar o discurso para a imprensa.</p>`
    };

    return {
        peso: 12,
        assunto: foco === 'financeiro' ? '🧾 Conselho registra o balanço da janela' : (foco === 'torcida' ? '📊 Marketing preocupado com a torcida' : '🗓️ Reunião de alinhamento com o conselho'),
        corpo: textos[foco],
        opcoes: [
            { id: 'alinhar', rotulo: '🤝 Alinhar o discurso com o conselho', detalhe: 'Relação institucional melhora um pouco' },
            { id: 'peitar', rotulo: '🔥 Bater na tecla de que falta investimento', detalhe: 'Torcida gosta, conselho não' }
        ],
        contexto: { evento: 'cobranca_rotina', foco }
    };
}

// ------------------------------------------------------------------------------------
// DISPARO
// ------------------------------------------------------------------------------------

function dispararEventoDiretoria() {
    let d = db[currentSave];
    if (!d || !d.nome || currentSave !== 'clube') return;
    if (typeof garantirCamposElencoTodos === 'function') garantirCamposElencoTodos();

    let ctx = avaliarContextoClube();
    let geradores = [
        _pautaMetasAmpliadas, _pautaVendaJoia, _pautaCorteVerba, _pautaBonusPatrocinio,
        _pautaUltimato, _pautaRenovacaoDestaque, _pautaAntecipacaoVerba, _pautaCobrancaRotina
    ];

    let disponiveis = [];
    geradores.forEach(fn => {
        let pauta = null;
        try { pauta = fn(ctx); } catch (e) { pauta = null; }
        if (pauta) disponiveis.push(pauta);
    });
    if (disponiveis.length === 0) return;

    // Sorteio ponderado: o contexto define a chance, não a ordem da lista
    let somaPesos = disponiveis.reduce((s, p) => s + p.peso, 0);
    let alvo = gerarNumeroAleatorio(1, somaPesos);
    let escolhida = disponiveis[disponiveis.length - 1];
    let acumulado = 0;
    for (let p of disponiveis) {
        acumulado += p.peso;
        if (alvo <= acumulado) { escolhida = p; break; }
    }

    registrarMensagem({
        tipo: 'diretoria',
        remetente: (typeof nomeDiretorExibicao === 'function' ? nomeDiretorExibicao() : 'Diretoria'),
        assunto: escolhida.assunto,
        corpo: escolhida.corpo,
        opcoes: escolhida.opcoes,
        acao: 'diretoria',
        contexto: escolhida.contexto,
        abaDestino: 'tab-diretoria'
    });
}

// ------------------------------------------------------------------------------------
// RESOLUÇÃO DAS ESCOLHAS
// ------------------------------------------------------------------------------------

function resolverEventoDiretoria(msg, opcao) {
    let d = db[currentSave];
    let c = msg.contexto || {};

    switch (c.evento) {
        case 'metas_ampliadas': {
            if (opcao === 'aceitar') {
                d.orcamento = (d.orcamento || 0) + c.verba;
                registrarComandoOrcamento(d.orcamento, 'Verba por Ampliação de Metas');
                d.objetivosTemporada = (d.objetivosTemporada || '') + `<br><span style="color:var(--gold)">📈 META AMPLIADA (acordo com o conselho): ${c.novaMeta}</span>`;
                atualizarNotaDiretoria(0.3);
                atualizarTermometroTorcida(4);
                adicionarNoticiaAutomatica(`📈 ACORDO NOS BASTIDORES: diretoria libera €${c.verba.toFixed(2)}M por metas maiores.`, `O clube e o treinador fecharam um novo acordo de desempenho. A verba extraordinária já está disponível para a janela e a meta agora é ${c.novaMeta}.`);
                return `Verba de €${c.verba.toFixed(2)}M liberada e a nova meta ("${c.novaMeta}") entrou nos objetivos da temporada. Prestígio +0,3 e torcida animada.`;
            }
            atualizarNotaDiretoria(-0.15);
            return 'Você preferiu não mexer no combinado. O conselho aceitou, mas registrou que "faltou ambição" (prestígio -0,15).';
        }

        case 'venda_joia': {
            let jogador = d.plantel.find(p => p.nome === c.jogador);
            if (jogador && jogadorPertenceAOutroClube(jogador)) {
                return `${c.jogador} está no clube por empréstimo e pertence a outro time — a proposta do ${c.clube} foi devolvida ao remetente.`;
            }
            if (opcao === 'vender') {
                if (jogador) {
                    jogador.status = 'Vendido';
                    jogador.valor = c.proposta;
                    d.exigenciasDiretoria = (d.exigenciasDiretoria || []).filter(n => n !== c.jogador);
                    if (typeof liberarBracadeiraSeNecessario === 'function') liberarBracadeiraSeNecessario(c.jogador);
                }
                d.orcamento = (d.orcamento || 0) + c.proposta * 0.8;
                d.arrecadadoAtual = (d.arrecadadoAtual || 0) + c.proposta;
                registrarComandoOrcamento(d.orcamento, `Venda de ${c.jogador} ao ${c.clube}`);
                atualizarNotaDiretoria(0.25);
                atualizarTermometroTorcida(-gerarNumeroAleatorio(5, 10));
                ajustarMoralElenco(-3);
                adicionarNoticiaAutomatica(`💸 NEGÓCIO FECHADO: ${c.jogador} é vendido ao ${c.clube} por €${c.proposta.toFixed(2)}M.`, `A joia formada em casa deixa o clube após evoluir ${c.evolucao} pontos de overall desde que chegou. A torcida recebeu a notícia com irritação nas redes.`);
                return `${c.jogador} vendido por €${c.proposta.toFixed(2)}M (€${(c.proposta * 0.8).toFixed(2)}M entraram na verba de transferências). Torcida irritada e vestiário sentido, mas o conselho aprovou.`;
            }
            if (jogador) ajustarMoral(jogador, 12);
            atualizarNotaDiretoria(-0.2);
            atualizarTermometroTorcida(gerarNumeroAleatorio(4, 8));
            adicionarNoticiaAutomatica(`🔒 FICA! Clube recusa €${c.proposta.toFixed(2)}M do ${c.clube} por ${c.jogador}.`, `O treinador bateu o pé e vetou a saída da joia da casa. A torcida foi às redes comemorar; nos bastidores, o conselho não gostou de abrir mão do valor.`);
            return `Proposta recusada. ${c.jogador} ficou muito satisfeito (moral em alta) e a torcida comemorou, mas o conselho ficou contrariado (prestígio -0,2).`;
        }

        case 'corte_verba': {
            if (opcao === 'aceitar_corte') {
                d.orcamento = Math.max(0, (d.orcamento || 0) - c.corte);
                registrarComandoOrcamento(d.orcamento, 'Corte de Verba Aprovado pelo Conselho');
                atualizarNotaDiretoria(0.2);
                adicionarNoticiaAutomatica(`📉 APERTO NO CAIXA: clube corta ${c.percentual}% da verba de transferências.`, `Com a queda de receitas, a diretoria e o treinador chegaram a um acordo para reduzir o teto de investimento da janela.`);
                return `Verba reduzida em €${c.corte.toFixed(2)}M (novo orçamento: €${d.orcamento.toFixed(2)}M). O conselho reconheceu a colaboração (prestígio +0,2).`;
            }
            atualizarNotaDiretoria(-0.35);
            d.objetivosTemporada = (d.objetivosTemporada || '') + `<br><span style="color:var(--danger)">⚠️ ULTIMATO FINANCEIRO: verba mantida sob a condição de reagir nos próximos jogos.</span>`;
            return 'Você manteve a verba intacta, mas assinou embaixo de um ultimato: o conselho espera reação imediata (prestígio -0,35).';
        }

        case 'bonus_patrocinio': {
            if (opcao === 'elenco') {
                d.orcamento = (d.orcamento || 0) + c.bonus;
                registrarComandoOrcamento(d.orcamento, 'Bônus de Patrocínio Antecipado');
                atualizarTermometroTorcida(3);
                return `€${c.bonus.toFixed(2)}M entraram direto na verba de transferências.`;
            }
            let parcela = Math.round(c.bonus * 0.4 * 100) / 100;
            d.orcamento = (d.orcamento || 0) + parcela;
            d.mediaArrecadadoHistorico = (d.mediaArrecadadoHistorico || 0) + c.bonus * 0.25;
            registrarComandoOrcamento(d.orcamento, 'Parcela do Bônus de Patrocínio');
            atualizarNotaDiretoria(0.4);
            adicionarNoticiaAutomatica(`🏗️ INVESTIMENTO NA BASE: clube aplica bônus de patrocínio na estrutura.`, `Parte do bônus foi para o CT e as categorias de base. A diretoria elogiou publicamente a visão de longo prazo do treinador.`);
            return `€${parcela.toFixed(2)}M na verba e o restante na estrutura. A média de arrecadação do clube subiu e o conselho aprovou muito (prestígio +0,4).`;
        }

        case 'ultimato': {
            if (opcao === 'assumir') {
                atualizarTermometroTorcida(gerarNumeroAleatorio(4, 7));
                ajustarMoralElenco(5);
                atualizarNotaDiretoria(-0.05);
                adicionarNoticiaAutomatica(`🎙️ "A CULPA É MINHA": treinador assume responsabilidade pela fase.`, `Em entrevista coletiva, o treinador blindou o elenco e chamou a responsabilidade para si. O vestiário respondeu bem ao gesto.`);
                return 'Você protegeu o elenco publicamente: torcida e vestiário reagiram bem. O conselho segue observando (prestígio -0,05).';
            }
            let emergencial = Math.round(Math.max(0.8, totalGastoUltimas5Temporadas() * 0.05) * 100) / 100;
            d.orcamento = (d.orcamento || 0) + emergencial;
            registrarComandoOrcamento(d.orcamento, 'Verba Emergencial Após Ultimato');
            atualizarNotaDiretoria(-0.3);
            ajustarMoralElenco(-4);
            return `O conselho liberou €${emergencial.toFixed(2)}M emergenciais, mas a fatura veio: prestígio -0,3 e o elenco não gostou de ouvir que o problema é a qualidade do grupo.`;
        }

        case 'renovacao_destaque': {
            let jogador = d.plantel.find(p => p.nome === c.jogador);
            if (opcao === 'renovar') {
                d.orcamento = Math.max(0, (d.orcamento || 0) - c.custo);
                d.gastoAtual = (d.gastoAtual || 0) + c.custo;
                registrarComandoOrcamento(d.orcamento, `Renovação de ${c.jogador}`);
                if (jogador) { ajustarMoral(jogador, 18); jogador.contratoRenovado = true; }
                atualizarNotaDiretoria(0.1);
                atualizarTermometroTorcida(4);
                adicionarNoticiaAutomatica(`✍️ RENOVOU! ${c.jogador} assina novo contrato.`, `A joia da casa acertou a renovação com reajuste. A diretoria comemorou a valorização do patrimônio do clube.`);
                return `${c.jogador} renovou (-€${c.custo.toFixed(2)}M da verba). Moral do atleta lá em cima e a torcida aprovou.`;
            }
            if (jogador) ajustarMoral(jogador, -12);
            return `Conversa adiada. ${c.jogador} ficou incomodado com a demora e o assunto deve voltar — provavelmente com proposta de fora na mesa.`;
        }

        case 'antecipacao_verba': {
            if (opcao === 'antecipar') {
                d.orcamento = (d.orcamento || 0) + c.antecipacao;
                d.verbaAntecipada = (d.verbaAntecipada || 0) + c.antecipacao;
                registrarComandoOrcamento(d.orcamento, 'Verba Antecipada da Próxima Temporada');
                return `€${c.antecipacao.toFixed(2)}M antecipados. Esse valor será descontado do orçamento da próxima temporada.`;
            }
            atualizarNotaDiretoria(0.15);
            return 'Você optou por trabalhar com o caixa atual. O conselho registrou o gesto de responsabilidade (prestígio +0,15).';
        }

        case 'cobranca_rotina': {
            if (opcao === 'alinhar') {
                atualizarNotaDiretoria(0.12);
                return 'Discurso alinhado com o conselho. A relação institucional melhorou um pouco (prestígio +0,12).';
            }
            atualizarNotaDiretoria(-0.18);
            atualizarTermometroTorcida(gerarNumeroAleatorio(3, 6));
            adicionarNoticiaAutomatica(`🔥 TREINADOR COBRA INVESTIMENTO EM ENTREVISTA.`, `O comandante usou a coletiva para pedir mais investimento no elenco. A torcida abraçou o discurso; a diretoria, nem tanto.`);
            return 'Você cobrou investimento publicamente: a torcida abraçou o discurso, mas o conselho não gostou (prestígio -0,18).';
        }
    }

    return 'Decisão registrada.';
}
