// =====================================================================================
// DEPARTAMENTO FÍSICO E MÉDICO — Fadiga Acumulada, Preparo Físico, Recuperação e Rotação
// =====================================================================================
// Este arquivo controla tudo que é "realismo físico" do elenco:
// - Fadiga Acumulada (0% = descansado, 100%+ = risco crítico) de cada jogador, calculada a
//   partir das estatísticas REAIS da partida (distância percorrida, distância corrida, dividas,
//   dribles) e recuperada por uma curva de dias de descanso até o próximo jogo — ver
//   calcularFadigaAtualizada().
// - Preparo Físico (0-100%, distinto de fadiga): o quanto o jogador está "em ritmo de jogo" —
//   reseta a 30% no início de cada temporada, sobe quando ele joga e cai quando fica de fora
//   (ver PREPARO_FISICO_CFG/garantirCondicaoFisica/atualizarPreparoFisicoPosPartida abaixo).
//   Influencia o quanto ele cansa em campo (multiplicadorFadigaPorPreparo) e pesa na escalação
//   do Auxiliar Técnico (com peso reduzido nas diretrizes de rotação, onde dar minutos a quem
//   não está afiado é intencional).
// - Contagem de jogos seguidos sem descanso (rodízio)
// - Risco de lesão por desgaste (pode virar lesão real se ignorado)
// - O "Boletim do Preparador Físico", usado pela aba Departamento Físico e Médico e também
//   enviado ao Auxiliar Técnico (IA) para forçar rotação inteligente na escalação.

const CONDICAO_FISICA_CFG = {
    STAMINA_MAX: 100,
    // Fadiga acumulada (0% descansado, acima de 100% = risco crítico de lesão/exaustão — ver
    // calcularFadigaAtualizada). Os três limiares abaixo definem onde entra cada nível.
    FADIGA_ALERTA: 60,
    FADIGA_RISCO: 80,
    FADIGA_CRITICO: 100,
    JOGOS_SEGUIDOS_ALERTA: 7,
    JOGOS_SEGUIDOS_RISCO: 10,          // "mais de 10 partidas seguidas" -> risco real
    JOGOS_SEGUIDOS_CRITICO: 14,
    CHANCE_LESAO_RISCO: 16,            // % de chance de lesão por partida jogada em risco
    CHANCE_LESAO_CRITICO: 32           // % de chance por partida jogada em risco crítico
};

// Divisor de recuperação por dias de descanso até a próxima partida — quanto mais dias, maior o
// divisor (mais fadiga é dissolvida). 12 dias ou mais zera a fadiga por completo (pré-temporada,
// data FIFA longa etc.). Ver calcularFadigaAtualizada.
const DIVISOR_DESCANSO_FADIGA = {
    1: 1.05, 2: 1.10, 3: 1.20, 4: 1.50, 5: 2.00,
    6: 3.00, 7: 4.00, 8: 5.00, 9: 7.00, 10: 10.00, 11: 15.00
};

// =====================================================================================
// FÓRMULA DE FADIGA ACUMULADA
// =====================================================================================
// pontos_partida = distancia_percorrida + (distancia_corrida * 4) + (divididas / 3) + (dribles / 2)
// fadiga_partida = pontos_partida * 2
// fadiga_total_acumulada = fadiga_partida + fadiga_residual
// fadiga_final_atualizada = floor(fadiga_total_acumulada / divisor_do_descanso)
// (12+ dias de descanso zera a fadiga.) Roda tanto pra quem jogou (usando as estatísticas reais
// da partida) quanto pra quem não jogou (fadiga_partida = 0, só a recuperação pelo descanso).
function calcularFadigaAtualizada(entrada) {
    entrada = entrada || {};
    let distanciaPercorrida = Number(entrada.distanciaPercorrida) || 0;
    let distanciaCorrida = Number(entrada.distanciaCorrida) || 0;
    let divididas = Number(entrada.divididas) || 0;
    let dribles = Number(entrada.dribles) || 0;
    let fadigaResidual = Math.max(0, Number(entrada.fadigaResidual) || 0);
    let diasDescanso = Math.max(0, Math.floor(Number(entrada.diasDescanso) || 0));
    // Um jogador despreparado cansa mais rápido em campo (a partida "pesa mais" nele); um
    // incansável cansa menos — ver multiplicadorFadigaPorPreparo(), calculado com o Preparo
    // Físico do jogador ANTES desta partida (o estado depois dela é outra conta, separada).
    let multiplicadorPreparo = Number(entrada.multiplicadorPreparo);
    if (isNaN(multiplicadorPreparo) || multiplicadorPreparo <= 0) multiplicadorPreparo = 1;
    // Idade também pesa no cansaço em campo — ver multiplicadorFadigaPorIdade().
    let multiplicadorIdade = Number(entrada.multiplicadorIdade);
    if (isNaN(multiplicadorIdade) || multiplicadorIdade <= 0) multiplicadorIdade = 1;

    let pontosPartida = distanciaPercorrida + (distanciaCorrida * 4) + (divididas / 3) + (dribles / 2);
    let fadigaPartida = pontosPartida * 2 * multiplicadorPreparo * multiplicadorIdade;
    let fadigaTotalAcumulada = fadigaPartida + fadigaResidual;

    if (diasDescanso >= 12) return 0;
    // Sem nenhum dia de descanso (jogo em sequência no mesmo dia, ex: prorrogação/replay), não há
    // recuperação nenhuma — divisor 1 (fadiga passa direto, sem dissolver nada).
    let divisor = diasDescanso <= 0 ? 1 : (DIVISOR_DESCANSO_FADIGA[diasDescanso] || 1);
    return Math.max(0, Math.floor(fadigaTotalAcumulada / divisor));
}

// =====================================================================================
// PREPARO FÍSICO — pedido do treinador: uma métrica de "ritmo de jogo" (0-100%), separada da
// fadiga. Um jogador pode estar totalmente descansado (fadiga baixa) e mesmo assim fora de ritmo
// (preparo baixo) se ficou muitos DIAS sem jogar — e vice-versa. Reseta a 30% (despreparado) no
// início de cada temporada (ver processarConclusaoTemporada em js/temporada-mercado.js). Cai
// LINEARMENTE por dia até a próxima partida (o dobro do ritmo se o motivo for lesão) — isso vale
// pra TODO MUNDO, jogando ou não; quem joga esta partida ganha, por cima disso, um bônus fixo —
// ver atualizarPreparoFisicoPosPartida() logo abaixo.
// =====================================================================================
const PREPARO_FISICO_CFG = {
    INICIAL_TEMPORADA: 30,
    MINIMO: 5,
    MAXIMO: 100,
    // Ganho fixo por partida jogada — o app não rastreia minutos jogados por atleta (só se jogou
    // ou não), então qualquer partida disputada soma o mesmo ganho, mesmo entrando nos últimos
    // minutos. Uma simplificação conhecida, documentada aqui de propósito.
    GANHO_POR_PARTIDA: 25,
    // Perda por DIA sem jogar (não por partida) — pedido do treinador: um jogador saudável que
    // fica de fora perde 1%/dia; exemplo do pedido: não joga hoje, a próxima partida é 14 dias
    // depois, perde 14%.
    PERDA_POR_DIA_SEM_JOGAR: 1,
    // Enquanto lesionado, o ritmo de perda dobra — pedido do treinador: 30 dias de lesão = -60%
    // de preparo físico (30 * 2%).
    PERDA_POR_DIA_LESIONADO: 2
};

// Classifica o Preparo Físico nas 5 faixas do pedido do treinador — cada uma com um rótulo, uma
// recomendação de minutos (usada no "Plano de Uso" da aba) e o multiplicador de fadiga aplicado
// em campo (quanto mais despreparado, mais rápido cansa).
function nivelPreparoFisico(preparoFisico) {
    let p = Math.max(0, Math.min(100, Number(preparoFisico) || 0));
    if (p <= 20) return { nivel: 'sem-condicao', rotulo: 'Sem Condição de Jogo', minutosRecomendados: 20, multiplicadorFadiga: 1.5 };
    if (p <= 40) return { nivel: 'despreparado', rotulo: 'Despreparado', minutosRecomendados: 45, multiplicadorFadiga: 1.25 };
    if (p <= 60) return { nivel: 'regular', rotulo: 'Regular', minutosRecomendados: 70, multiplicadorFadiga: 1.0 };
    if (p <= 80) return { nivel: 'preparado', rotulo: 'Preparado', minutosRecomendados: 90, multiplicadorFadiga: 0.85 };
    return { nivel: 'incansavel', rotulo: 'Incansável', minutosRecomendados: 90, multiplicadorFadiga: 0.7 };
}

function multiplicadorFadigaPorPreparo(preparoFisico) {
    return nivelPreparoFisico(preparoFisico).multiplicadorFadiga;
}

// Idade também pesa no cansaço em campo (mesma ideia do multiplicador de Preparo Físico, só que
// pela idade do jogador) — multiplica junto na fórmula de fadiga da partida (ver
// calcularFadigaAtualizada). Até 23 anos o corpo ainda está em desenvolvimento (leve penalidade);
// 24-29 é o pico físico (baseline, sem efeito); 30-33 já sente um pouco mais; a partir de 34 o
// efeito cresce ano a ano — 34 anos = 1.15x, e sobe +0.015 a cada ano acima disso (39 anos =
// 1.15 + 5*0.015 = 1.225x).
function multiplicadorFadigaPorIdade(idade) {
    let i = Number(idade);
    if (isNaN(i)) return 1;
    if (i <= 23) return 1.05;
    if (i <= 29) return 1.0;
    if (i <= 33) return 1.1;
    return Math.round((1.15 + Math.max(0, i - 34) * 0.015) * 1000) / 1000;
}

// Penalidade de Preparo Físico na pontuação da escalação (js/chat-ia.js) — abaixo de 60%
// (metade de "Regular") já desconta pontos, proporcional ao quanto falta pro ideal; acima disso,
// nenhum desconto. O peso (o quanto isso realmente pesa) varia por diretriz — cai bastante nas
// diretrizes de rotação/rodízio/jovens, onde dar minutos a quem não está 100% em ritmo é uma
// escolha deliberada do treinador, não um problema a evitar.
function penalidadePorPreparoFisico(preparoFisico, peso) {
    let p = Number(preparoFisico);
    if (isNaN(p)) p = PREPARO_FISICO_CFG.INICIAL_TEMPORADA; // nunca deixa a pontuação virar NaN num save antigo sem o campo ainda
    p = Math.max(0, Math.min(100, p));
    let deficit = Math.max(0, 60 - p);
    return deficit * (Number(peso) || 0);
}

// Atualiza o Preparo Físico após uma partida: a perda por dia até a próxima partida (1%/dia
// normal, 2%/dia se lesionado, o dobro do ritmo) SEMPRE se aplica, jogando ou não — pedido do
// treinador: mesmo quem jogou esta partida perde pelos dias que passam até a próxima (o ritmo de
// jogo não se sustenta sozinho no tempo parado). Quem jogou ESTA partida ganha, por cima disso, o
// ganho fixo (teto 100%). Ou seja: jogar com 10 dias até o próximo jogo ainda rende +15 líquido
// (25 de ganho − 10 de dias parado); não jogar com 10 dias até o próximo custa −10 (sem ganho
// nenhum). Piso de 5% sempre garantido (nunca some de vez, mesmo num jogador esquecido a
// temporada inteira). "diasSemJogar" é o mesmo "diasDescanso" já usado pra fadiga (dias até a
// próxima partida); "lesionado" reflete se ele JÁ estava lesionado no início desse período (ver o
// "estavaLesionadoAntes" capturado em processarCondicaoFisicaPosPartida, antes do desconto dos
// dias de lesão restantes).
function atualizarPreparoFisicoPosPartida(p, jogou, diasSemJogar, lesionado) {
    let cfg = PREPARO_FISICO_CFG;
    let dias = Math.max(0, Number(diasSemJogar) || 0);
    let taxaPorDia = lesionado ? cfg.PERDA_POR_DIA_LESIONADO : cfg.PERDA_POR_DIA_SEM_JOGAR;
    let novoValor = p.preparoFisico - (dias * taxaPorDia) + (jogou ? cfg.GANHO_POR_PARTIDA : 0);
    p.preparoFisico = Math.max(cfg.MINIMO, Math.min(cfg.MAXIMO, Math.round(novoValor)));
}

// Garante que jogadores antigos (criados antes desta atualização) ganhem os campos novos. Save
// antigo que só tinha "stamina" (0-100, maior é melhor) ganha uma fadiga estimada a partir dela
// (fadiga = 100 - stamina) na primeira leitura — depois disso, fadiga vira a fonte de verdade e
// stamina passa a ser só um valor derivado dela (100 - fadiga), mantido pros outros lugares do
// jogo que já leem p.stamina (moral, narrativas de lesão, prompt de escalação do Auxiliar etc.).
function garantirCondicaoFisica(p) {
    if (!p) return p;
    if (typeof p.stamina !== 'number' || isNaN(p.stamina)) p.stamina = CONDICAO_FISICA_CFG.STAMINA_MAX;
    if (typeof p.fadiga !== 'number' || isNaN(p.fadiga)) p.fadiga = Math.max(0, CONDICAO_FISICA_CFG.STAMINA_MAX - p.stamina);
    if (typeof p.jogosSeguidos !== 'number' || isNaN(p.jogosSeguidos)) p.jogosSeguidos = 0;
    if (typeof p.diasLesao !== 'number' || isNaN(p.diasLesao)) p.diasLesao = 0;
    if (typeof p.suspensoVermelho !== 'boolean') p.suspensoVermelho = false;
    if (typeof p.ovrPendente !== 'number' || isNaN(p.ovrPendente)) p.ovrPendente = 0;
    if (typeof p.preparoFisico !== 'number' || isNaN(p.preparoFisico)) p.preparoFisico = PREPARO_FISICO_CFG.INICIAL_TEMPORADA;
    return p;
}

function garantirCondicaoFisicaTodos() {
    if (!db[currentSave] || !db[currentSave].plantel) return;
    db[currentSave].plantel.forEach(garantirCondicaoFisica);
}

// Classifica a condição atual de um jogador: ok | alerta | risco | critico
function condicaoJogador(p) {
    garantirCondicaoFisica(p);
    let cfg = CONDICAO_FISICA_CFG;

    let indisponivel = false, motivoIndisponivel = "";
    if (p.diasLesao > 0) { indisponivel = true; motivoIndisponivel = `Lesionado (${p.diasLesao}d)`; }
    else if (p.suspensoVermelho) { indisponivel = true; motivoIndisponivel = "Suspenso (Cartão Vermelho)"; }

    let nivel = 'ok';
    if (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_CRITICO || p.fadiga >= cfg.FADIGA_CRITICO) nivel = 'critico';
    else if (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_RISCO || p.fadiga >= cfg.FADIGA_RISCO) nivel = 'risco';
    else if (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_ALERTA || p.fadiga >= cfg.FADIGA_ALERTA) nivel = 'alerta';

    return { stamina: p.stamina, fadiga: p.fadiga, jogosSeguidos: p.jogosSeguidos, nivel, indisponivel, motivoIndisponivel };
}

// Motor principal: roda toda vez que uma partida é salva.
// diasDescanso = dias até a próxima partida (já vem contando a partir de AGORA, não da próxima vez que algo for declarado)
// jogadoresQueJogaram = lista dos jogadores que estiveram em campo nesta partida. Aceita objetos
// com as estatísticas reais ({nome, distanciaPercorrida, distanciaCorrida, dividasTotais,
// dribles}) pra alimentar a fórmula de fadiga corretamente, ou (por compatibilidade) uma lista
// simples de nomes — nesse caso a fadiga gerada pela partida entra como 0 (sem dado físico
// registrado), só a recuperação pelos dias de descanso é aplicada.
function processarCondicaoFisicaPosPartida(diasDescanso, jogadoresQueJogaram) {
    if (!db[currentSave] || !db[currentSave].plantel) return;
    let cfg = CONDICAO_FISICA_CFG;
    diasDescanso = Math.max(0, Number(diasDescanso) || 0);

    // Fonte única de verdade: qualquer tela (Departamento Médico, Auxiliar Técnico) lê daqui,
    // então a informação já "conta" no sistema assim que a partida é salva.
    db[currentSave].descansoAntesProxima = diasDescanso;

    let mapaQueJogou = new Map();
    (jogadoresQueJogaram || []).forEach(item => {
        if (typeof item === 'string') mapaQueJogou.set(item, {});
        else if (item && item.nome) mapaQueJogou.set(item.nome, item);
    });

    db[currentSave].plantel.filter(p => p.status === 'Ativo').forEach(p => {
        garantirCondicaoFisica(p);

        // Capturado ANTES do desconto de dias de lesão abaixo — é o que decide a taxa de perda
        // de Preparo Físico deste período (2%/dia lesionado vs. 1%/dia normal, ver passo 3b):
        // um jogador que estava lesionado durante ESTE intervalo perde no ritmo dobrado, mesmo
        // que ele se recupere exatamente durante este mesmo cálculo.
        let estavaLesionadoAntes = p.diasLesao > 0;

        // 1. Recuperação de lesão
        if (p.diasLesao > 0) {
            p.diasLesao -= diasDescanso;
            if (p.diasLesao <= 0) {
                p.diasLesao = 0;
                p.jogosSeguidos = 0;
                p.fadiga = Math.min(p.fadiga, 25); // volta pelo menos com 75% de condição
                if (typeof adicionarNoticiaAutomatica === 'function') {
                    adicionarNoticiaAutomatica(`🏥 DM VAZIO: ${p.nome} está de volta!`, `O atleta se recuperou de sua lesão e já treina normalmente com o resto do elenco principal.`);
                }
            }
        }

        // 2. Suspensão só é cumprida quando o jogador realmente fica de fora de uma partida
        if (p.suspensoVermelho && !mapaQueJogou.has(p.nome)) {
            p.suspensoVermelho = false;
        }

        // 3. Fadiga acumulada: aplica a fórmula (ver calcularFadigaAtualizada) pra todo mundo —
        // quem jogou soma a fadiga gerada pelas estatísticas reais da partida à fadiga residual;
        // quem não jogou só recupera pelo descanso (fadiga da partida = 0). stamina continua
        // existindo como valor derivado (100 - fadiga) pros outros sistemas que já leem p.stamina.
        // O multiplicador de preparo usa o Preparo Físico de ANTES desta partida — um jogador
        // despreparado cansa mais rápido em campo; um incansável cansa menos (ver
        // multiplicadorFadigaPorPreparo). A idade multiplica junto (ver multiplicadorFadigaPorIdade).
        let statsPartida = mapaQueJogou.get(p.nome) || null;
        p.fadiga = calcularFadigaAtualizada({
            distanciaPercorrida: statsPartida ? statsPartida.distanciaPercorrida : 0,
            distanciaCorrida: statsPartida ? statsPartida.distanciaCorrida : 0,
            divididas: statsPartida ? statsPartida.dividasTotais : 0,
            dribles: statsPartida ? statsPartida.dribles : 0,
            fadigaResidual: p.fadiga,
            diasDescanso: diasDescanso,
            multiplicadorPreparo: multiplicadorFadigaPorPreparo(p.preparoFisico),
            multiplicadorIdade: multiplicadorFadigaPorIdade(p.idade)
        });
        p.stamina = Math.max(0, Math.min(cfg.STAMINA_MAX, cfg.STAMINA_MAX - p.fadiga));

        // 3b. Preparo Físico: cai pelos "diasDescanso" corridos até a próxima partida pra TODO
        // MUNDO (jogando ou não), no dobro do ritmo se estava lesionado nesse intervalo; quem
        // jogou esta partida ainda ganha um bônus fixo por cima — ver
        // atualizarPreparoFisicoPosPartida (usa o mesmo mapaQueJogou.has, não statsPartida,
        // porque "jogou" continua valendo mesmo sem estatísticas físicas detalhadas registradas).
        atualizarPreparoFisicoPosPartida(p, mapaQueJogou.has(p.nome), diasDescanso, estavaLesionadoAntes);

        // 4. Quem jogou acumula jogos seguidos / quem descansou zera a sequência
        if (mapaQueJogou.has(p.nome)) {
            p.jogosSeguidos = (p.jogosSeguidos || 0) + 1;

            // Escalar quem tinha descanso concedido pelo Departamento Médico queima o combinado:
            // o jogador se sente passado para trás e o descanso é cancelado.
            if (p.poupadoRestante > 0) {
                p.poupadoRestante = 0;
                if (typeof ajustarMoral === 'function') ajustarMoral(p, -10);
                if (typeof adicionarNoticiaAutomatica === 'function') {
                    adicionarNoticiaAutomatica(`😠 QUEBRA DE COMBINADO: ${p.nome} joga mesmo tendo descanso concedido.`, `O atleta havia sido liberado pelo departamento médico, mas foi a campo. Nos bastidores, o clima com a comissão ficou ruim.`);
                }
            }
        } else {
            // Ficou de fora: cumpre um dos jogos de descanso que o DM concedeu
            if (p.poupadoRestante > 0) p.poupadoRestante -= 1;
            if (p.diasLesao <= 0 && !p.suspensoVermelho) p.jogosSeguidos = 0;
        }
    });

    // 5. Overuse real: ignorar o rodízio pode virar lesão de verdade
    db[currentSave].plantel.filter(p => p.status === 'Ativo').forEach(p => {
        if (!mapaQueJogou.has(p.nome) || p.diasLesao > 0) return;
        let chance = 0;
        let critico = (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_CRITICO || p.fadiga >= cfg.FADIGA_CRITICO);
        let risco = (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_RISCO || p.fadiga >= cfg.FADIGA_RISCO);
        if (critico) chance = cfg.CHANCE_LESAO_CRITICO;
        else if (risco) chance = cfg.CHANCE_LESAO_RISCO;

        // Negar um pedido de descanso do Departamento Médico cobra o preço aqui: as próximas
        // 2 partidas do atleta entram com risco extra, mesmo que ele não esteja no limite.
        if (p.riscoExtraLesao > 0) {
            chance += cfg.CHANCE_LESAO_RISCO;
            p.riscoExtraLesao -= 1;
        }
        if (chance <= 0) return;

        if (gerarNumeroAleatorio(1, 100) <= chance) {
            let dias = critico ? gerarNumeroAleatorio(7, 21) : gerarNumeroAleatorio(3, 10);
            p.diasLesao = dias;
            p.jogosSeguidos = 0;
            if (typeof adicionarNoticiaAutomatica === 'function') {
                adicionarNoticiaAutomatica(
                    `🏥 PREPARADOR FÍSICO ALERTA: ${p.nome} sofre lesão por desgaste!`,
                    `O departamento médico confirmou uma lesão muscular em ${p.nome} após uma sequência de partidas sem descanso adequado. Fora de combate por aproximadamente ${dias} dias. O boletim reforça a importância do rodízio do elenco.`
                );
            }
        }
    });

    salvarDados();
    if (typeof atualizarDepartamentoMedicoUI === 'function') atualizarDepartamentoMedicoUI();
    if (typeof atualizarPlantelUI === 'function' && currentSave === 'clube') atualizarPlantelUI();
}

// Mantido por compatibilidade (não usar em código novo)
function processarDiasAposPartida(diasDescanso) {
    processarCondicaoFisicaPosPartida(diasDescanso, []);
}

// Monta o relatório estruturado usado pela UI
function gerarRelatorioMedico() {
    let vazio = { lesionados: [], suspensos: [], critico: [], risco: [], alerta: [], ok: [] };
    if (!db[currentSave] || !db[currentSave].plantel) return vazio;
    let ativos = db[currentSave].plantel.filter(p => p.status === 'Ativo');
    let relatorio = { lesionados: [], suspensos: [], critico: [], risco: [], alerta: [], ok: [] };
    ativos.forEach(p => {
        garantirCondicaoFisica(p);
        let c = condicaoJogador(p);
        if (p.diasLesao > 0) relatorio.lesionados.push(p);
        else if (p.suspensoVermelho) relatorio.suspensos.push(p);
        else if (c.nivel === 'critico') relatorio.critico.push(p);
        else if (c.nivel === 'risco') relatorio.risco.push(p);
        else if (c.nivel === 'alerta') relatorio.alerta.push(p);
        else relatorio.ok.push(p);
    });
    return relatorio;
}

// Texto compacto para alimentar prompts de IA (Auxiliar Técnico, chat, etc.)
function gerarRelatorioMedicoTexto() {
    if (!db[currentSave] || !db[currentSave].nome) return "";
    let r = gerarRelatorioMedico();
    let partes = [];
    if (r.lesionados.length) partes.push(`Lesionados: ${r.lesionados.map(p => `${p.nome} (${p.diasLesao}d)`).join(', ')}`);
    // Suspensão por cartão vermelho é assunto de partida, não de departamento médico — o
    // pedido do treinador foi tirar essa "ocorrência médica" daqui. A exclusão de jogadores
    // suspensos na escalação continua funcionando à parte, via checagem direta de
    // p.suspensoVermelho (ver chat-ia.js), então nada de gameplay depende desta linha.
    if (r.critico.length) partes.push(`RISCO CRÍTICO DE LESÃO (rotação obrigatória): ${r.critico.map(p => `${p.nome} (${p.jogosSeguidos} jogos seguidos, fadiga ${Math.round(p.fadiga)}%)`).join(', ')}`);
    if (r.risco.length) partes.push(`Risco de lesão (priorizar descanso): ${r.risco.map(p => `${p.nome} (${p.jogosSeguidos} jogos seguidos, fadiga ${Math.round(p.fadiga)}%)`).join(', ')}`);
    if (r.alerta.length) partes.push(`Fadiga moderada: ${r.alerta.map(p => p.nome).join(', ')}`);

    // Descanso concedido pelo Departamento Médico é ordem, não sugestão: o Auxiliar Técnico
    // precisa ver isso no boletim pra não escalar quem foi poupado.
    let poupados = db[currentSave].plantel.filter(p => p.status === 'Ativo' && p.poupadoRestante > 0);
    if (poupados.length) partes.push(`NÃO ESCALAR (descanso concedido pelo DM): ${poupados.map(p => `${p.nome} (${p.poupadoRestante} jogo(s))`).join(', ')}`);

    let desmotivados = db[currentSave].plantel.filter(p => p.status === 'Ativo' && typeof p.moral === 'number' && p.moral < 45);
    if (desmotivados.length) partes.push(`Moral baixa no vestiário: ${desmotivados.map(p => `${p.nome} (${Math.round(p.moral)}/100)`).join(', ')}`);

    let descanso = (typeof db[currentSave].descansoAntesProxima === 'number') ? db[currentSave].descansoAntesProxima : 3;
    let cabecalho = `Descanso até a próxima partida: ${descanso} dia(s).`;
    if (partes.length === 0) return `${cabecalho} Elenco 100% saudável e sem sinais de fadiga.`;
    return `${cabecalho} ${partes.join(' | ')}.`;
}

// Confere se a escalação sugerida pela IA usou algum jogador em risco (aviso pro treinador)
function verificarRotacaoEscalacao(escalacao) {
    if (!escalacao || !db[currentSave]) return "";
    let avisos = [];
    Object.values(escalacao).forEach(info => {
        let nomeEsc = info && info.nome;
        if (!nomeEsc) return;
        let p = db[currentSave].plantel.find(x => x.nome.toLowerCase() === String(nomeEsc).toLowerCase().trim());
        if (!p) p = db[currentSave].plantel.find(x => String(nomeEsc).toLowerCase().includes(x.nome.toLowerCase()));
        if (!p) return;
        let c = condicaoJogador(p);
        if (c.nivel === 'critico') avisos.push(`${p.nome} (risco crítico)`);
        else if (c.nivel === 'risco') avisos.push(`${p.nome} (risco de lesão)`);
    });
    if (avisos.length === 0) return "";
    return `⚠️ Atenção: a escalação inclui jogador(es) em risco de lesão: ${avisos.join(', ')}. Considere poupá-los se houver alternativa.`;
}

// ---------------------- INTERFACE (ABA DEPARTAMENTO MÉDICO) ----------------------

// Pedido do treinador: "tem um botão com símbolo de dormir q clico e descansa 100% o jogador,
// odiei isso" — o ícone é pequeno (22x22px, no canto do card) e ficava fácil de tocar sem querer
// no celular, zerando a fadiga/sequência de jogos do jogador na hora, sem chance de desfazer.
// Uma confirmação explícita não tira a função de quem usa de propósito, só evita o toque errado.
async function forcarDescansoPreventivo(nome) {
    if (!db[currentSave]) return;
    let p = db[currentSave].plantel.find(x => x.nome === nome);
    if (!p) return;
    let ok = await confirmarModerno(`Dar descanso preventivo pra ${nome}? Isso zera a fadiga e a sequência de jogos dele na hora.`, '💤 Descanso Preventivo');
    if (!ok) return;
    garantirCondicaoFisica(p);
    p.jogosSeguidos = 0;
    p.fadiga = 0;
    p.stamina = CONDICAO_FISICA_CFG.STAMINA_MAX;
    salvarDados();
    atualizarDepartamentoMedicoUI();
    if (currentSave === 'clube' && typeof atualizarPlantelUI === 'function') atualizarPlantelUI();
    if (typeof adicionarNoticiaAutomatica === 'function') {
        adicionarNoticiaAutomatica(`💤 DESCANSO PREVENTIVO: ${nome} é poupado pela comissão técnica.`, `Por recomendação do departamento médico, ${nome} folgou dos treinos de alta intensidade para preservar a condição física visando a sequência de jogos.`);
    }
    if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Descanso preventivo para ${nome}`);
}

// Categoria ampla cadastrada no jogador (o texto antes da "/" em p.posicao, ex: "Volante" em
// "Volante/Organizador") -> grupo de função real do EA FC (js/funcoes-ea.js), pra saber em qual
// catálogo de funções procurar a sugestão de desenvolvimento individual dele.
const GRUPO_POR_CATEGORIA_JOGADOR = {
    'Goleiro': 'goleiro', 'Zagueiro': 'zagueiro', 'Lateral': 'lateral', 'Volante': 'volante',
    'MeioCampo': 'meio_campo_central', 'Ponta': 'ponta', 'Atacante': 'atacante'
};

// Pedido do treinador: "sugestões de desenvolvimento individual" com os planos de desenvolvimento
// reais do EA FC (ex: Volante -> Armador Recuado), ignorando o "foco" (Defesa/Armação/etc.) —
// só a função em si. Não é escolhida pelo usuário: é sempre derivada da posição cadastrada do
// jogador (p.posicao), reaproveitando o mesmo motor determinístico que já existe pra escalação
// (_escolherFuncaoBase, em js/funcoes-ea.js) — sem role/tática de partida, só a especialidade.
// Como nunca é armazenada, muda sozinha assim que a posição do jogador muda.
function funcaoDesenvolvimentoSugerida(p) {
    if (!p || !p.posicao) return null;
    if (typeof GRUPOS_FUNCAO_EA === 'undefined' || typeof _escolherFuncaoBase !== 'function') return null;
    let grupoKey = GRUPO_POR_CATEGORIA_JOGADOR[String(p.posicao).split('/')[0]];
    if (!grupoKey) return null;
    let grupo = GRUPOS_FUNCAO_EA[grupoKey];
    let funcao = _escolherFuncaoBase(grupoKey, null, p.posicao, null);
    if (!grupo || !funcao) return null;
    return { grupoNome: grupo.nome, funcao: funcao };
}

// Plano de carga: reaproveita o mesmo nível (ok/alerta/risco/crítico) já calculado pra fadiga
// acumulada, só que na linguagem de treino que um preparador físico de verdade usaria.
function rotuloCargaSugerida(nivel) {
    if (nivel === 'critico') return { texto: '🔴 Recuperação Total', cor: 'var(--danger)' };
    if (nivel === 'risco') return { texto: '🟠 Recuperação Ativa', cor: 'var(--danger)' };
    if (nivel === 'alerta') return { texto: '🟡 Carga Moderada', cor: 'var(--warning)' };
    return { texto: '🟢 Carga Plena', cor: 'var(--primary)' };
}

function corPorNivel(nivel) {
    if (nivel === 'critico' || nivel === 'risco') return 'var(--danger)';
    if (nivel === 'alerta') return 'var(--warning)';
    return 'var(--primary)';
}

function rotuloPorNivel(nivel) {
    if (nivel === 'critico') return '🚨 RISCO CRÍTICO — ROTAÇÃO OBRIGATÓRIA';
    if (nivel === 'risco') return '⚠️ RISCO DE LESÃO';
    if (nivel === 'alerta') return '🟡 FADIGA MODERADA';
    return '🟢 CONDIÇÃO IDEAL';
}

function corPorNivelPreparo(nivel) {
    if (nivel === 'sem-condicao') return 'var(--danger)';
    if (nivel === 'despreparado') return 'var(--warning)';
    if (nivel === 'regular') return 'var(--text-muted)';
    return 'var(--primary)'; // preparado / incansável
}

// Rótulo dos grupos táticos (GRUPOS_FUNCAO_EA, js/funcoes-ea.js) que a posição cadastrada do
// jogador consegue ocupar — mesmo motor de compatibilidade usado na escalação/substituições
// (ESPECIALIDADES_JOGADOR[...].gruposFuncao), só que virado texto pro card de detalhe.
const ROTULO_GRUPO_TATICO_FISICO = {
    goleiro: 'Goleiro', zagueiro: 'Zagueiro', lateral: 'Lateral', volante: 'Volante',
    meio_campo_central: 'Meio-Campo', meia_atacante: 'Meia-Atacante', meia_lateral: 'Ponta',
    ponta: 'Ponta', atacante: 'Atacante'
};
function posicoesPossiveisJogador(p) {
    let def = (p && p.posicao && typeof ESPECIALIDADES_JOGADOR !== 'undefined') ? ESPECIALIDADES_JOGADOR[p.posicao] : null;
    if (!def || !def.gruposFuncao) return [];
    return [...new Set(Object.keys(def.gruposFuncao).map(g => ROTULO_GRUPO_TATICO_FISICO[g] || g))];
}

// "Plano de Uso" — recomendação de minutos pro PRÓXIMO jogo, na linguagem de um preparador
// físico de verdade, cruzando o Preparo Físico com a fadiga acumulada atual. Puramente
// determinístico (sem IA, sem espera): os patamares já vêm do próprio pedido do treinador.
function planoDeUsoTexto(p) {
    let c = condicaoJogador(p);
    if (c.indisponivel) return `Fora de combate: ${c.motivoIndisponivel}. Sem plano de uso até a liberação médica.`;

    let nivelPreparo = nivelPreparoFisico(p.preparoFisico);
    let base;
    if (nivelPreparo.nivel === 'sem-condicao') base = `Sem condição de jogo. Se for realmente necessário escalar, use por no máximo ${nivelPreparo.minutosRecomendados} minutos e fique de olho em qualquer sinal de desconforto.`;
    else if (nivelPreparo.nivel === 'despreparado') base = `Despreparado. Recomendado usar por até ${nivelPreparo.minutosRecomendados} minutos, até ganhar ritmo de jogo.`;
    else if (nivelPreparo.nivel === 'regular') base = `Condição regular. Pode fazer a partida completa, mas com ressalvas — fique de olho na queda de rendimento no segundo tempo.`;
    else if (nivelPreparo.nivel === 'preparado') base = `Preparado. Apto pros 90 minutos sem restrições físicas.`;
    else base = `Incansável. Aguenta os 90 minutos tranquilamente, inclusive uma eventual prorrogação.`;

    if (c.nivel === 'critico') base += ' ⚠️ Além disso, está em RISCO CRÍTICO de lesão por fadiga acumulada — evite escalar mesmo assim, a não ser que não haja alternativa nenhuma.';
    else if (c.nivel === 'risco') base += ' ⚠️ Também está em risco de lesão por fadiga acumulada — considere poupar se houver alternativa.';
    else if (c.nivel === 'alerta') base += ' A fadiga acumulada está moderada — pode jogar, mas monitore.';

    return base;
}

// Abre o modal de detalhe físico de um jogador — cansaço, preparo físico, posição real com
// função sugerida, posições que pode ocupar e o plano de uso pro próximo jogo. Pedido do
// treinador: "os jogadores são estáticos, poderia ser interativo, ao clicar mostraria..."
function abrirModalDetalheFisico(nome) {
    if (!db[currentSave]) return;
    let p = db[currentSave].plantel.find(x => x.nome === nome);
    if (!p) return;
    garantirCondicaoFisica(p);
    if (typeof garantirCamposElenco === 'function') garantirCamposElenco(p);

    let modal = document.getElementById('modal-detalhe-fisico');
    let elNome = document.getElementById('detalhe-fisico-nome');
    let elSub = document.getElementById('detalhe-fisico-sub');
    let corpo = document.getElementById('detalhe-fisico-corpo');
    if (!modal || !elNome || !elSub || !corpo) return;

    let c = condicaoJogador(p);
    let nivelPreparo = nivelPreparoFisico(p.preparoFisico);
    let posicoes = posicoesPossiveisJogador(p);
    let sugestao = funcaoDesenvolvimentoSugerida(p);
    let fadigaPct = Math.max(0, Math.min(100, Math.round(p.fadiga)));
    let preparoPct = Math.max(0, Math.min(100, Math.round(p.preparoFisico)));

    elNome.innerText = `🩺 ${p.nome}`;
    elSub.innerText = `${p.posicao} • OVR ${p.ovr}${p.idade ? ` • ${p.idade} anos` : ''}`;

    corpo.innerHTML = `
        <div class="linha-form">
            <label>😮‍💨 Cansaço (Fadiga Acumulada)</label>
            <div class="stamina-bar"><div class="stamina-fill" style="width:${fadigaPct}%; background:${corPorNivel(c.nivel)};"></div></div>
            <span style="font-size:12px; color:var(--text-muted);">${fadigaPct}% — ${rotuloPorNivel(c.nivel)}</span>
        </div>
        <div class="linha-form">
            <label>🏃 Preparo Físico</label>
            <div class="stamina-bar"><div class="stamina-fill" style="width:${preparoPct}%; background:${corPorNivelPreparo(nivelPreparo.nivel)};"></div></div>
            <span style="font-size:12px; color:var(--text-muted);">${preparoPct}% — ${nivelPreparo.rotulo}</span>
        </div>
        <div class="linha-form">
            <label>📍 Posição Real / Função em Campo</label>
            <span>${sugestao ? `${sugestao.grupoNome}: ${sugestao.funcao.nome}` : p.posicao}</span>
        </div>
        <div class="linha-form">
            <label>🔀 Posições que Pode Fazer</label>
            <span>${posicoes.length ? posicoes.join(' / ') : p.posicao}</span>
        </div>
        <div class="linha-form" style="background: var(--input-bg); padding:12px; border-radius:8px; border:1px solid var(--border);">
            <label>📋 Plano de Uso</label>
            <p style="font-size:13px; line-height:1.5; margin:6px 0 0;">${planoDeUsoTexto(p)}</p>
        </div>
    `;
    modal.style.display = 'flex';
}

function fecharModalDetalheFisico() {
    let modal = document.getElementById('modal-detalhe-fisico');
    if (modal) modal.style.display = 'none';
}

function toggleDesenvolvimentoIndividualPanel() {
    let panel = document.getElementById('medico-desenvolvimento');
    let btn = document.getElementById('btn-toggle-medico-dev');
    if (!panel || !btn) return;
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        btn.innerText = '🎯 Ocultar Sugestões de Desenvolvimento Individual';
    } else {
        panel.style.display = 'none';
        btn.innerText = '🎯 Ver Sugestões de Desenvolvimento Individual';
    }
}

function atualizarDepartamentoMedicoUI() {
    if (!db[currentSave] || !db[currentSave].nome) return;
    garantirCondicaoFisicaTodos();
    if (typeof garantirCamposElencoTodos === 'function') garantirCamposElencoTodos();

    let r = gerarRelatorioMedico();
    let totalAtivos = db[currentSave].plantel.filter(p => p.status === 'Ativo').length;

    let cards = document.getElementById('medico-resumo-cards');
    if (cards) {
        cards.innerHTML = `
            <div class="stat-card" style="border-left-color: var(--primary);"><span>Elenco Ativo</span><strong>${totalAtivos}</strong></div>
            <div class="stat-card" style="border-left-color: var(--danger);"><span>Lesionados</span><strong>${r.lesionados.length}</strong></div>
            <div class="stat-card" style="border-left-color: var(--danger);"><span>Risco de Lesão</span><strong>${r.risco.length + r.critico.length}</strong></div>
            <div class="stat-card" style="border-left-color: var(--warning);"><span>Fadiga Moderada</span><strong>${r.alerta.length}</strong></div>
        `;
    }

    let relatorioTexto = document.getElementById('medico-relatorio-texto');
    if (relatorioTexto) relatorioTexto.innerText = gerarRelatorioMedicoTexto();

    // Sugestões de Desenvolvimento Individual: função real do EA FC (catálogo de js/funcoes-ea.js)
    // que o Preparador Físico recomenda treinar pra cada atleta, derivada direto da posição
    // cadastrada — nunca escolhida pelo usuário, e atualiza sozinha se a posição do jogador mudar.
    let dev = document.getElementById('medico-desenvolvimento');
    if (dev) {
        let ativosDev = db[currentSave].plantel.filter(p => p.status === 'Ativo');
        dev.innerHTML = ativosDev.map(p => {
            let sugestao = funcaoDesenvolvimentoSugerida(p);
            if (!sugestao) return '';
            return `
            <div class="medico-dev-linha">
                <div>
                    <strong>${p.nome}</strong>
                    <span class="medico-card-sub">${p.posicao}</span>
                </div>
                <div class="medico-dev-funcao" title="${sugestao.funcao.descricao.replace(/"/g, '&quot;')}">🎯 ${sugestao.grupoNome}: ${sugestao.funcao.nome}</div>
            </div>`;
        }).join('') || `<p style="color: var(--text-muted); text-align:center;">Nenhum jogador cadastrado ainda.</p>`;
    }

    let lista = document.getElementById('medico-lista');
    if (lista) {
        let ordem = { critico: 0, risco: 1, alerta: 2, ok: 3 };
        let ativos = [...db[currentSave].plantel].filter(p => p.status === 'Ativo');
        ativos.sort((a, b) => {
            let ca = condicaoJogador(a), cb = condicaoJogador(b);
            // Suspensão por cartão não fura fila aqui — é assunto de partida, não médico.
            let na = (a.diasLesao > 0) ? -1 : ordem[ca.nivel];
            let nb = (b.diasLesao > 0) ? -1 : ordem[cb.nivel];
            return na - nb;
        });

        // Grade de "quadrados" (no máximo 3 por linha) em vez de uma linha inteira por jogador —
        // cada card traz só nome, posição/OVR e a barrinha de fadiga fina embaixo, reduzindo bem
        // a rolagem da tela com o elenco inteiro.
        let cardsHtml = ativos.map(p => {
            let c = condicaoJogador(p);
            // Suspensão por cartão vermelho não é uma "ocorrência médica" — o Departamento
            // Médico só trata lesão e fadiga. O selo de suspenso continua na aba Elenco; aqui
            // ele só deixa de aparecer quando esse era o ÚNICO motivo de indisponibilidade
            // (uma lesão junto continua indisponível normalmente).
            if (c.indisponivel && !(p.diasLesao > 0) && p.suspensoVermelho) {
                c = Object.assign({}, c, { indisponivel: false, motivoIndisponivel: '' });
            }
            // A barra reflete FADIGA (cansaço), não fôlego: quanto mais cheia/vermelha, mais
            // cansado o atleta está — por isso usa p.fadiga direto, nunca p.stamina.
            let fadigaPct = Math.max(0, Math.min(100, Math.round(p.fadiga)));
            let corBarra = p.fadiga >= CONDICAO_FISICA_CFG.FADIGA_RISCO ? 'var(--danger)' : (p.fadiga >= CONDICAO_FISICA_CFG.FADIGA_ALERTA ? 'var(--warning)' : 'var(--primary)');
            let corBorda = c.indisponivel ? 'var(--danger)' : corBarra;

            // Um único selo por jogador (em vez de dois empilhados): pra quem está disponível,
            // mostra direto o plano de carga sugerido — ele já carrega a cor/urgência do nível.
            let badge = c.indisponivel
                ? `<span class="badge medico-badge-sm" style="background: rgba(226, 75, 75, 0.2); color: var(--danger);">${p.diasLesao > 0 ? '🏥' : '🟥'} ${c.motivoIndisponivel}</span>`
                : (carga => `<span class="badge medico-badge-sm" style="background: transparent; color: ${carga.cor}; border: 1px solid ${carga.cor};">${carga.texto}</span>`)(rotuloCargaSugerida(c.nivel));

            if (p.poupadoRestante > 0) badge += `<span class="badge medico-badge-sm" style="background: rgba(75, 159, 226, 0.18); color: var(--accent);">💤 ${p.poupadoRestante}j</span>`;
            if (p.riscoExtraLesao > 0) badge += `<span class="badge medico-badge-sm" style="background: rgba(226, 75, 75, 0.18); color: var(--danger);">⚠️ ${p.riscoExtraLesao}j</span>`;

            let botaoDescanso = (!c.indisponivel && c.nivel !== 'ok')
                ? `<button class="medico-card-btn" title="Dar descanso preventivo" onclick="event.stopPropagation(); forcarDescansoPreventivo('${p.nome.replace(/'/g, "\\'")}')">💤</button>`
                : '';

            let dicaExtra = `${p.jogosSeguidos || 0} jogo(s) seguido(s) sem descanso${typeof p.moral === 'number' ? ` • moral ${Math.round(p.moral)}/100` : ''} • clique pra ver detalhes e plano de uso`;

            // Preparo Físico ganha sua própria barrinha, curta, embaixo da fadiga — cor por
            // patamar (ver nivelPreparoFisico/corPorNivelPreparo), pra bater o olho já no card
            // sem precisar abrir o detalhe.
            let preparoPct = Math.max(0, Math.min(100, Math.round(p.preparoFisico)));
            let nivelPreparoCard = nivelPreparoFisico(p.preparoFisico);
            let corPreparo = corPorNivelPreparo(nivelPreparoCard.nivel);

            return `
            <div class="medico-card" style="border-left-color:${corBorda}; cursor:pointer;" title="${dicaExtra.replace(/"/g, '&quot;')}" onclick="abrirModalDetalheFisico('${p.nome.replace(/'/g, "\\'")}')">
                ${botaoDescanso}
                <strong class="medico-card-nome">${p.nome}</strong>
                <div class="medico-card-sub">${p.posicao} • OVR ${p.ovr}</div>
                <div class="medico-card-barra-linha">
                    <div class="stamina-bar"><div class="stamina-fill" style="width:${fadigaPct}%; background:${corBarra};"></div></div>
                    <span class="medico-card-pct" style="color:${corBarra};">${fadigaPct}%</span>
                </div>
                <div class="medico-card-barra-linha" title="Preparo Físico: ${nivelPreparoCard.rotulo}">
                    <div class="stamina-bar"><div class="stamina-fill" style="width:${preparoPct}%; background:${corPreparo};"></div></div>
                    <span class="medico-card-pct" style="color:${corPreparo};">🏃${preparoPct}%</span>
                </div>
                <div class="medico-card-rodape">${badge}</div>
            </div>`;
        }).join('');
        lista.innerHTML = cardsHtml
            ? `<div class="medico-grid">${cardsHtml}</div>`
            : `<p style="color: var(--text-muted); text-align:center;">Nenhum jogador cadastrado ainda.</p>`;
    }

    if (typeof atualizarSelectCondicaoAuxiliar === 'function') atualizarSelectCondicaoAuxiliar();

    // Alerta compacto reaproveitado na aba do Auxiliar Técnico
    let alertaAux = document.getElementById('auxiliar-alerta-medico');
    if (alertaAux) {
        // Suspensão por cartão não entra na contagem "médica" — só lesão e fadiga.
        let indisp = r.lesionados.length;
        let riscoTotal = r.risco.length + r.critico.length;
        if (indisp === 0 && riscoTotal === 0 && r.alerta.length === 0) {
            alertaAux.innerHTML = `🟢 <strong>Departamento Médico:</strong> elenco 100% saudável, sem sinais de fadiga.`;
            alertaAux.style.borderColor = 'var(--primary)';
        } else {
            let partes = [];
            if (indisp > 0) partes.push(`${indisp} indisponível(is)`);
            if (riscoTotal > 0) partes.push(`${riscoTotal} em risco de lesão`);
            if (r.alerta.length > 0) partes.push(`${r.alerta.length} com fadiga moderada`);
            alertaAux.innerHTML = `🏥 <strong>Departamento Médico:</strong> ${partes.join(', ')}. <a href="#" onclick="mudarAba('tab-medico'); return false;" style="color: var(--accent); font-weight:bold;">Ver relatório completo →</a>`;
            alertaAux.style.borderColor = riscoTotal > 0 ? 'var(--danger)' : 'var(--warning)';
        }
    }
}
