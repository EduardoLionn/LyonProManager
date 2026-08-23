// =====================================================================================
// DEPARTAMENTO MÉDICO — Motor de Condição Física, Fadiga e Rotação Inteligente
// =====================================================================================
// Este arquivo controla tudo que é "realismo físico" do elenco:
// - Condição Física (stamina) de cada jogador, que gasta ao jogar e recupera com descanso
// - Contagem de jogos seguidos sem descanso (rodízio)
// - Risco de lesão por desgaste (pode virar lesão real se ignorado)
// - O "Boletim do Preparador Físico", usado pela aba Departamento Médico e também
//   enviado ao Auxiliar Técnico (IA) para forçar rotação inteligente na escalação.

const CONDICAO_FISICA_CFG = {
    STAMINA_MAX: 100,
    STAMINA_CUSTO_BASE: 16,            // desgaste padrão por partida jogada
    STAMINA_CUSTO_POUCO_DESCANSO: 24,  // desgaste extra se jogou com 2 dias ou menos de descanso
    STAMINA_CUSTO_DESCANSO_MEDIO: 19,  // desgaste com 3-4 dias de descanso
    // Com 9/dia, quem joga a cada 3-4 dias (o normal em qualquer temporada com mais de uma
    // competição) RECUPERAVA mais do que gastava partida a partida — o elenco nunca acumulava
    // cansaço de verdade, só quem jogava a cada 2 dias sentia alguma coisa. Com 6/dia, jogar de 3
    // em 3 dias já corrói a condição aos poucos (recupera 18, gasta 19) e só uma folga de verdade
    // (uma semana cheia ou uma data FIFA) devolve o elenco fresco — cansaço agora se acumula ao
    // longo da temporada com o calendário apertado, não só num sprint de 48h.
    STAMINA_RECUPERACAO_DIA: 6,        // recuperação por dia de descanso (joga ou não)
    STAMINA_ALERTA: 55,
    STAMINA_RISCO: 35,
    STAMINA_CRITICO: 18,
    JOGOS_SEGUIDOS_ALERTA: 7,
    JOGOS_SEGUIDOS_RISCO: 10,          // "mais de 10 partidas seguidas" -> risco real
    JOGOS_SEGUIDOS_CRITICO: 14,
    CHANCE_LESAO_RISCO: 16,            // % de chance de lesão por partida jogada em risco
    CHANCE_LESAO_CRITICO: 32,          // % de chance por partida jogada em risco crítico
    // Multiplicador de desgaste por função em campo — corre mais quem cobre mais linha (lateral/ponta),
    // goleiro praticamente não desgasta fisicamente, o resto (zaga/volante/meio/ataque) fica no padrão.
    MULT_DESGASTE_GOLEIRO: 0.35,
    MULT_DESGASTE_LATERAL_PONTA: 1.3
};

// "Zagueiro" -> "Zagueiro", "Lateral/Defesa Direito" -> "Lateral" etc. (mesmo critério usado
// pelo seletor de troca em chat-ia.js pra filtrar posições relevantes)
function categoriaAmplaPosicao(p) {
    if (!p || !p.posicao) return '';
    return String(p.posicao).split('/')[0];
}

// Jogadores de linha lateral (laterais e pontas) correm muito mais que zagueiros/volantes/meias centrais
// e o goleiro praticamente não desgasta — reflete isso no custo de condição física por partida.
function multiplicadorDesgastePorPosicao(p) {
    let categoria = categoriaAmplaPosicao(p);
    if (categoria === 'Goleiro') return CONDICAO_FISICA_CFG.MULT_DESGASTE_GOLEIRO;
    if (categoria === 'Lateral' || categoria === 'Ponta') return CONDICAO_FISICA_CFG.MULT_DESGASTE_LATERAL_PONTA;
    return 1;
}

// Garante que jogadores antigos (criados antes desta atualização) ganhem os campos novos
function garantirCondicaoFisica(p) {
    if (!p) return p;
    if (typeof p.stamina !== 'number' || isNaN(p.stamina)) p.stamina = CONDICAO_FISICA_CFG.STAMINA_MAX;
    if (typeof p.jogosSeguidos !== 'number' || isNaN(p.jogosSeguidos)) p.jogosSeguidos = 0;
    if (typeof p.diasLesao !== 'number' || isNaN(p.diasLesao)) p.diasLesao = 0;
    if (typeof p.suspensoVermelho !== 'boolean') p.suspensoVermelho = false;
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
    if (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_CRITICO || p.stamina <= cfg.STAMINA_CRITICO) nivel = 'critico';
    else if (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_RISCO || p.stamina <= cfg.STAMINA_RISCO) nivel = 'risco';
    else if (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_ALERTA || p.stamina <= cfg.STAMINA_ALERTA) nivel = 'alerta';

    return { stamina: p.stamina, jogosSeguidos: p.jogosSeguidos, nivel, indisponivel, motivoIndisponivel };
}

// Motor principal: roda toda vez que uma partida é salva.
// diasDescanso = dias até a próxima partida (já vem contando a partir de AGORA, não da próxima vez que algo for declarado)
// nomesQueJogaram = nomes dos jogadores que estiveram em campo nesta partida
function processarCondicaoFisicaPosPartida(diasDescanso, nomesQueJogaram) {
    if (!db[currentSave] || !db[currentSave].plantel) return;
    let cfg = CONDICAO_FISICA_CFG;
    diasDescanso = Math.max(0, Number(diasDescanso) || 0);

    // Fonte única de verdade: qualquer tela (Departamento Médico, Auxiliar Técnico) lê daqui,
    // então a informação já "conta" no sistema assim que a partida é salva.
    db[currentSave].descansoAntesProxima = diasDescanso;

    let setQueJogou = new Set(nomesQueJogaram || []);

    db[currentSave].plantel.filter(p => p.status === 'Ativo').forEach(p => {
        garantirCondicaoFisica(p);

        // 1. Recuperação de lesão
        if (p.diasLesao > 0) {
            p.diasLesao -= diasDescanso;
            if (p.diasLesao <= 0) {
                p.diasLesao = 0;
                p.jogosSeguidos = 0;
                p.stamina = Math.max(p.stamina, 75);
                if (typeof adicionarNoticiaAutomatica === 'function') {
                    adicionarNoticiaAutomatica(`🏥 DM VAZIO: ${p.nome} está de volta!`, `O atleta se recuperou de sua lesão e já treina normalmente com o resto do elenco principal.`);
                }
            }
        }

        // 2. Suspensão só é cumprida quando o jogador realmente fica de fora de uma partida
        if (p.suspensoVermelho && !setQueJogou.has(p.nome)) {
            p.suspensoVermelho = false;
        }

        // 3. Recuperação natural de condição física com o descanso (jogando ou não)
        p.stamina = Math.min(cfg.STAMINA_MAX, p.stamina + diasDescanso * cfg.STAMINA_RECUPERACAO_DIA);

        // 4. Quem jogou desgasta e acumula jogos seguidos / quem descansou zera a sequência
        if (setQueJogou.has(p.nome)) {
            let custo = cfg.STAMINA_CUSTO_BASE;
            if (diasDescanso <= 2) custo = cfg.STAMINA_CUSTO_POUCO_DESCANSO;
            else if (diasDescanso <= 4) custo = cfg.STAMINA_CUSTO_DESCANSO_MEDIO;
            custo *= multiplicadorDesgastePorPosicao(p);
            p.stamina = Math.max(0, p.stamina - custo);
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
        if (!setQueJogou.has(p.nome) || p.diasLesao > 0) return;
        let chance = 0;
        let critico = (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_CRITICO || p.stamina <= cfg.STAMINA_CRITICO);
        let risco = (p.jogosSeguidos >= cfg.JOGOS_SEGUIDOS_RISCO || p.stamina <= cfg.STAMINA_RISCO);
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
    if (r.critico.length) partes.push(`RISCO CRÍTICO DE LESÃO (rotação obrigatória): ${r.critico.map(p => `${p.nome} (${p.jogosSeguidos} jogos seguidos, condição ${Math.round(p.stamina)}%)`).join(', ')}`);
    if (r.risco.length) partes.push(`Risco de lesão (priorizar descanso): ${r.risco.map(p => `${p.nome} (${p.jogosSeguidos} jogos seguidos, condição ${Math.round(p.stamina)}%)`).join(', ')}`);
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
    p.stamina = CONDICAO_FISICA_CFG.STAMINA_MAX;
    salvarDados();
    atualizarDepartamentoMedicoUI();
    if (currentSave === 'clube' && typeof atualizarPlantelUI === 'function') atualizarPlantelUI();
    if (typeof adicionarNoticiaAutomatica === 'function') {
        adicionarNoticiaAutomatica(`💤 DESCANSO PREVENTIVO: ${nome} é poupado pela comissão técnica.`, `Por recomendação do departamento médico, ${nome} folgou dos treinos de alta intensidade para preservar a condição física visando a sequência de jogos.`);
    }
    if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Descanso preventivo para ${nome}`);
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

// Rótulo curto explicando por que a posição do jogador desgasta mais/menos que a média —
// mesma lógica de multiplicadorDesgastePorPosicao, só que em texto pra UI.
function rotuloDesgastePosicao(p) {
    let categoria = categoriaAmplaPosicao(p);
    if (categoria === 'Goleiro') return '🧤 Baixo desgaste físico (goleiro)';
    if (categoria === 'Lateral' || categoria === 'Ponta') return '⚡ Desgaste alto — cobre muita linha (lateral/ponta)';
    return '';
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

        lista.innerHTML = ativos.map(p => {
            let c = condicaoJogador(p);
            let corBarra = p.stamina <= CONDICAO_FISICA_CFG.STAMINA_RISCO ? 'var(--danger)' : (p.stamina <= CONDICAO_FISICA_CFG.STAMINA_ALERTA ? 'var(--warning)' : 'var(--primary)');
            let status = c.indisponivel
                ? `<span class="badge" style="background: rgba(226, 75, 75, 0.2); color: var(--danger);">${p.diasLesao > 0 ? '🏥' : '🟥'} ${c.motivoIndisponivel}</span>`
                : `<span class="badge" style="background: transparent; color: ${corPorNivel(c.nivel)}; border: 1px solid ${corPorNivel(c.nivel)};">${rotuloPorNivel(c.nivel)}</span>`;

            if (p.poupadoRestante > 0) status += `<span class="badge" style="background: rgba(75, 159, 226, 0.18); color: var(--accent);">💤 Poupado (${p.poupadoRestante} jogo(s))</span>`;
            if (p.riscoExtraLesao > 0) status += `<span class="badge" style="background: rgba(226, 75, 75, 0.18); color: var(--danger);">⚠️ Risco extra (${p.riscoExtraLesao} jogo(s))</span>`;

            let botaoDescanso = (!c.indisponivel && c.nivel !== 'ok')
                ? `<button style="background: transparent; border: 1px solid var(--accent); color: var(--accent); padding: 6px 10px; font-size: 11px;" onclick="forcarDescansoPreventivo('${p.nome.replace(/'/g, "\\'")}')">💤 Dar Descanso</button>`
                : '';

            return `
            <div style="background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 15px; flex-wrap: wrap;">
                <div style="min-width: 160px;">
                    <strong>${p.nome}</strong><br>
                    <span style="font-size: 12px; color: var(--text-muted);">${p.posicao} • OVR ${p.ovr}</span>
                    ${rotuloDesgastePosicao(p) ? `<br><span style="font-size: 11px; color: var(--text-muted);">${rotuloDesgastePosicao(p)}</span>` : ''}
                </div>
                <div style="flex: 1; min-width: 180px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom: 3px;">
                        <span>Condição Física</span><span>${Math.round(p.stamina)}%</span>
                    </div>
                    <div class="stamina-bar"><div class="stamina-fill" style="width:${Math.max(0, Math.min(100, p.stamina))}%; background:${corBarra};"></div></div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${p.jogosSeguidos || 0} jogo(s) seguido(s) sem descanso${typeof p.moral === 'number' ? ` • moral ${Math.round(p.moral)}/100 ${typeof rotuloMoral === 'function' ? rotuloMoral(p.moral) : ''}` : ''}</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
                    ${status}
                    ${botaoDescanso}
                </div>
            </div>`;
        }).join('') || `<p style="color: var(--text-muted); text-align:center;">Nenhum jogador cadastrado ainda.</p>`;
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
