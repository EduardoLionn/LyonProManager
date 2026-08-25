// =====================================================================================
// DEPARTAMENTO MÉDICO — Fadiga Acumulada, Recuperação e Rotação Inteligente
// =====================================================================================
// Este arquivo controla tudo que é "realismo físico" do elenco:
// - Fadiga Acumulada (0% = descansado, 100%+ = risco crítico) de cada jogador, calculada a
//   partir das estatísticas REAIS da partida (distância percorrida, distância corrida, dividas,
//   dribles) e recuperada por uma curva de dias de descanso até o próximo jogo — ver
//   calcularFadigaAtualizada().
// - Contagem de jogos seguidos sem descanso (rodízio)
// - Risco de lesão por desgaste (pode virar lesão real se ignorado)
// - O "Boletim do Preparador Físico", usado pela aba Departamento Médico e também
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

    let pontosPartida = distanciaPercorrida + (distanciaCorrida * 4) + (divididas / 3) + (dribles / 2);
    let fadigaPartida = pontosPartida * 2;
    let fadigaTotalAcumulada = fadigaPartida + fadigaResidual;

    if (diasDescanso >= 12) return 0;
    // Sem nenhum dia de descanso (jogo em sequência no mesmo dia, ex: prorrogação/replay), não há
    // recuperação nenhuma — divisor 1 (fadiga passa direto, sem dissolver nada).
    let divisor = diasDescanso <= 0 ? 1 : (DIVISOR_DESCANSO_FADIGA[diasDescanso] || 1);
    return Math.max(0, Math.floor(fadigaTotalAcumulada / divisor));
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
        let statsPartida = mapaQueJogou.get(p.nome) || null;
        p.fadiga = calcularFadigaAtualizada({
            distanciaPercorrida: statsPartida ? statsPartida.distanciaPercorrida : 0,
            distanciaCorrida: statsPartida ? statsPartida.distanciaCorrida : 0,
            divididas: statsPartida ? statsPartida.dividasTotais : 0,
            dribles: statsPartida ? statsPartida.dribles : 0,
            fadigaResidual: p.fadiga,
            diasDescanso: diasDescanso
        });
        p.stamina = Math.max(0, Math.min(cfg.STAMINA_MAX, cfg.STAMINA_MAX - p.fadiga));

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
    if (r.suspensos.length) partes.push(`Suspensos: ${r.suspensos.map(p => p.nome).join(', ')}`);
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

function atualizarDescansoAtualUI() {
    let el = document.getElementById('input-descanso-atual');
    if (!el || !db[currentSave]) return;
    el.value = (typeof db[currentSave].descansoAntesProxima === 'number') ? db[currentSave].descansoAntesProxima : 3;
}

function salvarDescansoManual() {
    let el = document.getElementById('input-descanso-atual');
    if (!el || !db[currentSave]) return;
    let dias = Math.max(0, parseInt(el.value) || 0);
    db[currentSave].descansoAntesProxima = dias;
    salvarDados();
    atualizarDepartamentoMedicoUI();
    if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Descanso ajustado para ${dias} dia(s)`);
    alert(`✅ Descanso atualizado: ${dias} dia(s) até a próxima partida. O Auxiliar Técnico já está usando essa informação.`);
}

function forcarDescansoPreventivo(nome) {
    if (!db[currentSave]) return;
    let p = db[currentSave].plantel.find(x => x.nome === nome);
    if (!p) return;
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

// Pedido do treinador: "quero plano de carga, sugestão de descanso... quero me sentir em um
// clube profissional de futebol". Em vez de precisar entrar jogador por jogador, o Preparador
// Físico já lista quem está em risco/crítico e deixa poupar todo mundo de uma vez.
function pouparTodosSugeridos() {
    if (!db[currentSave]) return;
    let sugeridos = db[currentSave].plantel.filter(p => {
        if (p.status !== 'Ativo') return false;
        let c = condicaoJogador(p);
        return !c.indisponivel && (c.nivel === 'risco' || c.nivel === 'critico');
    });
    if (sugeridos.length === 0) return;
    sugeridos.forEach(p => {
        garantirCondicaoFisica(p);
        p.jogosSeguidos = 0;
        p.fadiga = 0;
        p.stamina = CONDICAO_FISICA_CFG.STAMINA_MAX;
    });
    salvarDados();
    atualizarDepartamentoMedicoUI();
    if (currentSave === 'clube' && typeof atualizarPlantelUI === 'function') atualizarPlantelUI();
    if (typeof adicionarNoticiaAutomatica === 'function') {
        adicionarNoticiaAutomatica(`💤 RODÍZIO PREVENTIVO: comissão técnica poupa ${sugeridos.length} atleta(s) em risco.`,
            `Seguindo a recomendação do Preparador Físico, ${sugeridos.map(p => p.nome).join(', ')} folgaram dos treinos de alta intensidade para preservar a condição física.`);
    }
    if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Poupou ${sugeridos.length} jogador(es) sugerido(s) pelo Preparador Físico`);
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

function atualizarDepartamentoMedicoUI() {
    if (!db[currentSave] || !db[currentSave].nome) return;
    garantirCondicaoFisicaTodos();
    if (typeof garantirCamposElencoTodos === 'function') garantirCamposElencoTodos();
    atualizarDescansoAtualUI();

    let r = gerarRelatorioMedico();
    let totalAtivos = db[currentSave].plantel.filter(p => p.status === 'Ativo').length;

    let cards = document.getElementById('medico-resumo-cards');
    if (cards) {
        cards.innerHTML = `
            <div class="stat-card" style="border-left-color: var(--primary);"><span>Elenco Ativo</span><strong>${totalAtivos}</strong></div>
            <div class="stat-card" style="border-left-color: var(--danger);"><span>Lesionados</span><strong>${r.lesionados.length}</strong></div>
            <div class="stat-card" style="border-left-color: var(--warning);"><span>Suspensos</span><strong>${r.suspensos.length}</strong></div>
            <div class="stat-card" style="border-left-color: var(--danger);"><span>Risco de Lesão</span><strong>${r.risco.length + r.critico.length}</strong></div>
            <div class="stat-card" style="border-left-color: var(--warning);"><span>Fadiga Moderada</span><strong>${r.alerta.length}</strong></div>
        `;
    }

    let relatorioTexto = document.getElementById('medico-relatorio-texto');
    if (relatorioTexto) relatorioTexto.innerText = gerarRelatorioMedicoTexto();

    // Sugestões do Preparador Físico: quem está em risco/crítico agora, pronto pra poupar tudo de
    // uma vez em vez de entrar jogador por jogador — "quero sugestão de descanso" de verdade.
    let sugestoes = document.getElementById('medico-sugestoes');
    if (sugestoes) {
        let sugeridos = db[currentSave].plantel.filter(p => {
            if (p.status !== 'Ativo') return false;
            let c = condicaoJogador(p);
            return !c.indisponivel && (c.nivel === 'risco' || c.nivel === 'critico');
        });
        if (sugeridos.length === 0) {
            sugestoes.innerHTML = `<p style="margin:0; color:var(--primary);">🟢 Nenhum atleta precisa de descanso agora — pode manter a carga normal de treino.</p>`;
        } else {
            sugestoes.innerHTML = `
                <p style="margin:0 0 10px 0;">⚠️ Recomendo poupar <strong>${sugeridos.length}</strong> atleta(s) no próximo jogo: ${sugeridos.map(p => p.nome).join(', ')}.</p>
                <button style="background:var(--danger); color:white; font-weight:bold;" onclick="pouparTodosSugeridos()">💤 Poupar Todos os Sugeridos</button>`;
        }
    }

    let lista = document.getElementById('medico-lista');
    if (lista) {
        let ordem = { critico: 0, risco: 1, alerta: 2, ok: 3 };
        let ativos = [...db[currentSave].plantel].filter(p => p.status === 'Ativo');
        ativos.sort((a, b) => {
            let ca = condicaoJogador(a), cb = condicaoJogador(b);
            let na = (a.diasLesao > 0 || a.suspensoVermelho) ? -1 : ordem[ca.nivel];
            let nb = (b.diasLesao > 0 || b.suspensoVermelho) ? -1 : ordem[cb.nivel];
            return na - nb;
        });

        // Grade de "quadrados" (no máximo 3 por linha) em vez de uma linha inteira por jogador —
        // cada card traz só nome, posição/OVR e a barrinha de fadiga fina embaixo, reduzindo bem
        // a rolagem da tela com o elenco inteiro.
        let cardsHtml = ativos.map(p => {
            let c = condicaoJogador(p);
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
                ? `<button class="medico-card-btn" title="Dar descanso preventivo" onclick="forcarDescansoPreventivo('${p.nome.replace(/'/g, "\\'")}')">💤</button>`
                : '';

            let dicaExtra = `${p.jogosSeguidos || 0} jogo(s) seguido(s) sem descanso${typeof p.moral === 'number' ? ` • moral ${Math.round(p.moral)}/100` : ''}`;

            return `
            <div class="medico-card" style="border-left-color:${corBorda};" title="${dicaExtra.replace(/"/g, '&quot;')}">
                ${botaoDescanso}
                <strong class="medico-card-nome">${p.nome}</strong>
                <div class="medico-card-sub">${p.posicao} • OVR ${p.ovr}</div>
                <div class="medico-card-barra-linha">
                    <div class="stamina-bar"><div class="stamina-fill" style="width:${fadigaPct}%; background:${corBarra};"></div></div>
                    <span class="medico-card-pct" style="color:${corBarra};">${fadigaPct}%</span>
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
        let indisp = r.lesionados.length + r.suspensos.length;
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
