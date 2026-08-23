// =====================================================================================
// CONTEXTO DE FUTEBOL PARA A IA
// =====================================================================================
// O save já guarda quase tudo que um auxiliar de verdade usaria pra falar do time —
// moral individual, clima de vestiário, liderança, estatísticas detalhadas de cada
// partida, calendário, competição de cada jogo. Só que até aqui quase nada disso
// chegava aos prompts: a IA analisava o elenco olhando basicamente OVR e nota média,
// e por isso soava como um assistente genérico em vez de gente do futebol.
//
// Este módulo traduz o estado do save em CONTEXTO DE FUTEBOL:
//   - momento na competição (sequência, aproveitamento, calendário, peso do jogo)
//   - retrospecto contra o adversário específico
//   - clima do vestiário (moral, tensão, liderança, quem está incomodado)
//   - perfil de cada jogador (papel no grupo, fase, números que importam na posição)
//
// Tudo é DERIVADO do que já existe — nenhum campo novo no save, nenhuma migração,
// e funciona com o histórico que o save já tinha. Cada função é defensiva: se o dado
// não existe ainda (save novo), devolve texto vazio em vez de inventar informação.

// -------------------------------------------------------------------------------------
// MOMENTO NA COMPETIÇÃO
// -------------------------------------------------------------------------------------

function _resultadoDaPartida(p) {
    if (!p) return null;
    if (p.golsPro > p.golsContra || p.penaltis) return 'V';
    if (p.golsPro === p.golsContra) return 'E';
    return 'D';
}

// "3 vitórias seguidas", "4 jogos sem vencer", "invicto há 6 jogos" — o tipo de frase
// que aparece na coletiva antes do jogo, e que muda completamente o tom da conversa.
function sequenciaAtualTexto() {
    let d = db[currentSave];
    let partidas = (d && d.partidas) ? d.partidas : [];
    if (partidas.length === 0) return '';

    let seq = partidas.slice().reverse().map(_resultadoDaPartida);
    let ultimo = seq[0];

    let iguais = 0;
    while (iguais < seq.length && seq[iguais] === ultimo) iguais++;

    if (ultimo === 'V' && iguais >= 2) return `${iguais} vitórias seguidas`;
    if (ultimo === 'D' && iguais >= 2) return `${iguais} derrotas seguidas`;

    let semVencer = 0;
    while (semVencer < seq.length && seq[semVencer] !== 'V') semVencer++;
    if (semVencer >= 3) return `${semVencer} jogos sem vencer`;

    let invicto = 0;
    while (invicto < seq.length && seq[invicto] !== 'D') invicto++;
    if (invicto >= 4) return `invicto há ${invicto} jogos`;

    if (ultimo === 'V') return 'vindo de vitória';
    if (ultimo === 'D') return 'vindo de derrota';
    return 'vindo de empate';
}

// Aproveitamento e saldo por competição na temporada atual — a liga cobra regularidade,
// a copa é mata-mata, e o auxiliar precisa saber em qual das duas o time está bem.
function _resumoPorCompeticao() {
    let d = db[currentSave];
    let daTemporada = ((d && d.partidas) || []).filter(p => p.temporada === d.temporadaAtual);
    if (daTemporada.length === 0) return '';

    let porComp = {};
    daTemporada.forEach(p => {
        let c = p.comp || 'Outros';
        if (!porComp[c]) porComp[c] = { v: 0, e: 0, d: 0, gp: 0, gc: 0 };
        let r = _resultadoDaPartida(p);
        if (r === 'V') porComp[c].v++; else if (r === 'E') porComp[c].e++; else porComp[c].d++;
        porComp[c].gp += p.golsPro || 0;
        porComp[c].gc += p.golsContra || 0;
    });

    return Object.entries(porComp).map(([comp, r]) => {
        let jogos = r.v + r.e + r.d;
        let aprov = Math.round(((r.v * 3 + r.e) / (jogos * 3)) * 100);
        let saldo = r.gp - r.gc;
        return `${comp}: ${r.v}V ${r.e}E ${r.d}D em ${jogos} jogo(s), ${aprov}% de aproveitamento, saldo ${saldo >= 0 ? '+' : ''}${saldo}`;
    }).join(' | ');
}

// Como o time se comporta jogando em casa e fora — diferença que todo treinador real
// leva em conta ao montar a postura da equipe.
function _resumoMando() {
    let d = db[currentSave];
    let daTemporada = ((d && d.partidas) || []).filter(p => p.temporada === d.temporadaAtual && p.mando);
    if (daTemporada.length < 4) return '';

    let calc = (mando) => {
        let lista = daTemporada.filter(p => p.mando === mando);
        if (lista.length === 0) return null;
        let aprov = (typeof aproveitamentoPartidas === 'function') ? aproveitamentoPartidas(lista) : null;
        return aprov === null ? null : `${mando.toLowerCase()}: ${aprov}% em ${lista.length} jogo(s)`;
    };
    return [calc('Casa'), calc('Fora')].filter(Boolean).join(', ');
}

// Retrospecto direto contra ESTE adversário — "não vencemos eles há 3 jogos" é
// exatamente o tipo de coisa que muda a preparação de uma partida.
function retrospectoContraAdversario(nomeAdversario) {
    let d = db[currentSave];
    if (!nomeAdversario || !d || !Array.isArray(d.partidas)) return '';
    let alvo = String(nomeAdversario).toLowerCase().trim();
    if (!alvo) return '';

    let confrontos = d.partidas.filter(p => String(p.adversario || '').toLowerCase().trim() === alvo);
    if (confrontos.length === 0) return '';

    let v = 0, e = 0, der = 0;
    confrontos.forEach(p => {
        let r = _resultadoDaPartida(p);
        if (r === 'V') v++; else if (r === 'E') e++; else der++;
    });

    let ultimos = confrontos.slice(-3).map(p => `${p.golsPro}x${p.golsContra}${p.mando ? ' (' + p.mando + ')' : ''}`).join(', ');
    return `Já enfrentamos ${nomeAdversario} ${confrontos.length} vez(es): ${v}V ${e}E ${der}D. Últimos placares: ${ultimos}.`;
}

// Bloco completo do momento do time na temporada, pronto pra entrar em qualquer prompt.
function contextoCompeticaoIA() {
    let d = db[currentSave];
    if (!d || !d.nome) return '';

    let partes = [];

    let seq = sequenciaAtualTexto();
    if (seq) partes.push(`Momento: ${seq}`);

    let ultimas5 = (d.partidas || []).slice(-5);
    if (ultimas5.length > 0 && typeof aproveitamentoPartidas === 'function') {
        let aprov = aproveitamentoPartidas(ultimas5);
        if (aprov !== null) {
            let leitura = aprov >= 70 ? 'fase muito boa' : aprov >= 50 ? 'fase regular' : aprov >= 30 ? 'fase ruim' : 'fase crítica';
            partes.push(`Últimos ${ultimas5.length} jogos: ${aprov}% de aproveitamento (${leitura})`);
        }
    }

    let porComp = _resumoPorCompeticao();
    if (porComp) partes.push(`Temporada por competição — ${porComp}`);

    let mando = _resumoMando();
    if (mando) partes.push(`Desempenho por mando — ${mando}`);

    if (d.competicaoContinental && d.competicaoContinental !== 'Nenhuma') {
        partes.push(`O clube também disputa: ${d.competicaoContinental}`);
    }

    // Calendário: sequência de jogos apertada muda quem pode ser escalado e a intensidade.
    let descanso = (typeof d.descansoAntesProxima === 'number') ? d.descansoAntesProxima : null;
    if (descanso !== null) {
        let leitura = descanso <= 2 ? 'CALENDÁRIO CONGESTIONADO — jogo em sequência curta, exige rodar o elenco e dosar a intensidade'
            : descanso <= 4 ? 'intervalo normal entre jogos'
            : 'semana cheia de treino — dá pra exigir mais fisicamente e ajustar detalhes táticos';
        partes.push(`Descanso até o próximo jogo: ${descanso} dia(s) — ${leitura}`);
    }

    if (typeof d.aprovacaoTorcida === 'number') {
        let t = d.aprovacaoTorcida;
        let clima = t >= 75 ? 'torcida empolgada' : t >= 55 ? 'torcida dividida' : t >= 40 ? 'torcida impaciente' : 'torcida revoltada, clima de pressão máxima';
        partes.push(`Ambiente externo: ${clima} (${Math.round(t)}/100 de aprovação)`);
    }

    return partes.length ? partes.join('. ') + '.' : '';
}

// -------------------------------------------------------------------------------------
// CLIMA DO VESTIÁRIO
// -------------------------------------------------------------------------------------

// Moral, tensão, liderança e quem especificamente está incomodado. O vestiário é metade
// do trabalho de um treinador de verdade, e a IA não enxergava nada disso.
function contextoVestiarioIA() {
    let d = db[currentSave];
    if (!d || typeof calcularClimaVestiario !== 'function') return '';

    let clima = calcularClimaVestiario();
    let ativos = (typeof elencoAtivo === 'function') ? elencoAtivo() : [];
    if (ativos.length === 0) return '';

    let partes = [];

    let m = clima.moralMedia;
    let leituraMoral = m >= 80 ? 'grupo muito motivado' : m >= 68 ? 'grupo tranquilo' : m >= 55 ? 'grupo mexido, atenção necessária' : 'vestiário rachado, clima pesado';
    partes.push(`Moral média do elenco: ${Math.round(m)}/100 (${leituraMoral})`);

    if (clima.tensao >= 20) partes.push(`TENSÃO ALTA no vestiário (${clima.tensao}/40) — o grupo está no limite, cuidado com decisões impopulares`);
    else if (clima.tensao >= 10) partes.push(`Alguma tensão no vestiário (${clima.tensao}/40)`);

    // Liderança: quem manda no grupo (e se a braçadeira está sendo respeitada).
    if (d.capitao) {
        let cap = ativos.find(p => p.nome === d.capitao);
        if (cap) {
            let lid = (typeof avaliarLideranca === 'function') ? avaliarLideranca(cap) : null;
            partes.push(`Capitão: ${cap.nome}${lid !== null ? ` (liderança ${lid}/100)` : ''}, moral ${Math.round(cap.moral)}/100${clima.capitaoInsatisfeito ? ' — O CAPITÃO ESTÁ INSATISFEITO, isso contamina o grupo inteiro' : ''}`);
        }
    } else {
        partes.push('O elenco está SEM CAPITÃO definido — falta uma referência de liderança no grupo');
    }

    // Nomes concretos importam muito mais que médias: um auxiliar cita quem está mal.
    let insatisfeitos = ativos.filter(p => (p.moral || 75) < 50).sort((a, b) => (a.moral || 75) - (b.moral || 75)).slice(0, 4);
    if (insatisfeitos.length > 0) {
        partes.push(`Jogadores incomodados: ${insatisfeitos.map(p => `${p.nome} (moral ${Math.round(p.moral)})`).join(', ')}`);
    }

    let empolgados = ativos.filter(p => (p.moral || 75) >= 88).sort((a, b) => (b.moral || 75) - (a.moral || 75)).slice(0, 3);
    if (empolgados.length > 0) {
        partes.push(`Jogadores em alta no grupo: ${empolgados.map(p => p.nome).join(', ')}`);
    }

    return partes.length ? partes.join('. ') + '.' : '';
}

// -------------------------------------------------------------------------------------
// PERFIL INDIVIDUAL DOS JOGADORES
// -------------------------------------------------------------------------------------

// Traços derivados do que o save já sabe: idade, tempo de casa, peso técnico, minutos,
// moral e liderança. É o que transforma "OVR 74" em "veterano, referência do grupo".
function perfilJogadorIA(p) {
    if (!p) return '';
    let tracos = [];

    let idade = p.idade || 26;
    let media = (typeof mediaOvrElenco === 'function') ? mediaOvrElenco() : 70;
    let stats = (typeof estatisticasJogadorTemporada === 'function') ? estatisticasJogadorTemporada(p.nome) : null;

    if (idade >= 32) tracos.push('veterano no fim de carreira');
    else if (idade >= 29) tracos.push('experiente');
    else if (idade <= 20) tracos.push('jovem promessa');
    else if (idade <= 22) tracos.push('jovem em formação');

    if ((p.temporadasNoClube || 0) >= 4) tracos.push('prata da casa');

    if (p.ovr >= media + 6) tracos.push('craque do elenco');
    else if (p.ovr <= media - 7) tracos.push('opção de rodízio');

    let lid = (typeof avaliarLideranca === 'function') ? avaliarLideranca(p) : null;
    if (lid !== null && lid >= 70) tracos.push('líder de vestiário');

    let d = db[currentSave];
    if (d && d.capitao === p.nome) tracos.push('CAPITÃO');
    else if (d && d.viceCapitao === p.nome) tracos.push('vice-capitão');

    // Titular absoluto x reserva x esquecido — minutos contam a história real do jogador.
    if (stats && stats.totalTime >= 4) {
        if (stats.percentual >= 80) tracos.push('titular absoluto');
        else if (stats.percentual <= 20) tracos.push('quase sem jogar — pode estar insatisfeito');
    }

    let moral = p.moral || 75;
    if (moral < 45) tracos.push('MORAL BAIXA');
    else if (moral >= 88) tracos.push('moral lá em cima');

    // Evolução em relação ao OVR de quando chegou: quem cresceu e quem estagnou.
    if (typeof p.ovrInicial === 'number' && p.ovr - p.ovrInicial >= 3) tracos.push('em franca evolução');

    return tracos.join(', ');
}

// Média das estatísticas que realmente importam na posição do jogador. O save guarda
// finalização, passe, drible, divididas e defesas por partida — sem isso a IA só
// conseguia falar de "nota média", que é vago demais pra uma análise tática de verdade.
function estatisticasDetalhadasJogador(nome) {
    let d = db[currentSave];
    if (!d || !Array.isArray(d.partidas)) return '';

    let atuacoes = [];
    d.partidas.forEach(p => {
        let j = (p.jogadores || []).find(x => x.nome === nome);
        if (j) atuacoes.push(j);
    });
    if (atuacoes.length < 3) return ''; // amostra pequena demais pra tirar conclusão

    let media = (campo) => {
        let vals = atuacoes.map(a => a[campo]).filter(v => typeof v === 'number' && !isNaN(v));
        if (!vals.length) return null;
        return vals.reduce((s, v) => s + v, 0) / vals.length;
    };
    let total = (campo) => atuacoes.reduce((s, a) => s + (Number(a[campo]) || 0), 0);

    let jog = (d.plantel || []).find(x => x.nome === nome);
    let cat = jog && jog.posicao ? String(jog.posicao).split('/')[0] : '';
    let bits = [];

    let gols = total('gols'), assist = total('assist');
    if (gols > 0 || assist > 0) bits.push(`${gols}G/${assist}A em ${atuacoes.length} jogos`);

    if (cat === 'Goleiro') {
        let def = media('defesas');
        if (def !== null) bits.push(`${def.toFixed(1)} defesas/jogo`);
    } else {
        let precPasse = media('precPasse');
        if (precPasse !== null && precPasse > 0) bits.push(`${Math.round(precPasse)}% de acerto no passe`);

        // Drible e finalização só dizem algo em quem realmente tenta — senão vira ruído.
        let taxaDribles = media('taxaDribles');
        if (taxaDribles !== null && taxaDribles > 0 && media('dribles') > 1) bits.push(`${Math.round(taxaDribles)}% nos dribles`);

        let precFin = media('precFin');
        if (precFin !== null && precFin > 0 && media('fin') > 1) bits.push(`${Math.round(precFin)}% de acerto nas finalizações`);

        let taxaDiv = media('taxaDivididas');
        if (taxaDiv !== null && taxaDiv > 0) bits.push(`${Math.round(taxaDiv)}% nas divididas`);

        let perdas = media('perdasPosse');
        if (perdas !== null && perdas >= 3) bits.push(`${perdas.toFixed(1)} perdas de posse por jogo (atenção)`);
    }

    let mvps = total('mvp');
    if (mvps > 0) bits.push(`${mvps}x melhor em campo`);

    return bits.join(', ');
}

// -------------------------------------------------------------------------------------
// VOZ DOS PERSONAGENS
// -------------------------------------------------------------------------------------

// O Auxiliar precisa soar como auxiliar de futebol, não como assistente de IA.
function personalidadeAuxiliarTexto() {
    return `🎙️ COMO VOCÊ FALA (isto define sua voz — siga à risca):
        - Você é um profissional de futebol conversando com o treinador na beira do campo ou no vestiário. Fale como gente do futebol fala: direto, com opinião, sem rodeio corporativo.
        - USE O VOCABULÁRIO REAL DO JOGO: linha de passe, bola parada, transição, saída de bola, bloco baixo/médio/alto, sobrecarga no lado, homem livre, segunda bola, basculação, encaixe na marcação, dobra de marcação, jogar por dentro/por fora, quebrar linha, dar profundidade, fixar o zagueiro.
        - NUNCA use linguagem de assistente virtual ("Claro!", "Posso ajudar com isso", "Espero ter ajudado", "Como posso auxiliar"). Você não é atendimento — você é o auxiliar técnico do clube.
        - TENHA OPINIÃO PRÓPRIA e defenda ela. Se o treinador propuser algo que você acha errado, DISCORDE com argumento técnico, respeitosamente. Um auxiliar que só concorda não serve pra nada.
        - Seja específico e verificável: cite nomes, posições, números e situações concretas do jogo. Nada de conselho genérico que serviria pra qualquer time.
        - Tamanho: 2 a 4 frases. Conversa de beira de campo é curta e objetiva — ninguém faz palestra no intervalo.
        - Trate o treinador por "mister", "professor" ou "treinador", variando naturalmente.`;
}

// A Diretoria fala como dirigente: números, contrato, imagem do clube, pressão.
function personalidadeDiretoriaTexto() {
    return `🎙️ COMO VOCÊ FALA (isto define sua voz — siga à risca):
        - Você é dirigente de futebol, não um assistente. Fala de resultado, folha salarial, janela de transferências, imagem do clube, patrocinador, sócio-torcedor, conselho e cobrança da imprensa.
        - Você NÃO entende de tática nem quer entender — se o treinador tentar explicar esquema tático, corte educadamente e volte pro que interessa a você: resultado, dinheiro e a posição do clube.
        - NUNCA use linguagem de assistente virtual ("Claro!", "Posso ajudar", "Fico à disposição"). Dirigente não atende chamado, ele cobra e negocia.
        - Seja político: elogie em público, cobre em particular, e deixe subentendido o que não pode dizer na cara. Quando a situação é ruim, o tom fica frio e formal — é assim que se demite alguém no futebol.
        - Tamanho: 2 a 4 frases, no tom de quem tem outra reunião depois desta.`;
}

// -------------------------------------------------------------------------------------
// LEITURA TÁTICA
// -------------------------------------------------------------------------------------

// As fases do jogo e os conceitos que um auxiliar de verdade usa pra ler uma partida.
function conceitosTaticosTexto() {
    return `⚽ COMO LER UMA PARTIDA (analise SEMPRE por fases, não em bloco genérico):
        1. SAÍDA DE BOLA / CONSTRUÇÃO: quantos homens ficam na primeira linha, o goleiro participa, o volante baixa entre os zagueiros, o adversário pressiona a saída? Se o time está perdendo a bola na própria saída, é aqui que se corrige — não no ataque.
        2. CRIAÇÃO / ÚLTIMO TERÇO: por onde o time chega (por dentro, pelas pontas, em profundidade, em bola longa)? Está criando pouco porque falta homem entre linhas, porque as pontas estão presas na lateral, ou porque o atacante não fixa o zagueiro?
        3. TRANSIÇÃO OFENSIVA (perdeu→ganhou): o time sai rápido no contra-ataque ou segura pra organizar? Tem gente pra correr no espaço?
        4. TRANSIÇÃO DEFENSIVA (ganhou→perdeu): o time faz pressão imediata pra recuperar ou recompõe atrás? Os laterais subiram demais e deixaram as costas expostas?
        5. FASE DEFENSIVA: altura do bloco (alto/médio/baixo), marcação por zona ou individual, compactação entre linhas, quem faz a dobra na ponta. Se o adversário domina um setor, quase sempre é falta de compactação ou de dobra ali.
        6. BOLA PARADA: escanteio e falta decidem muitos jogos. Se o time sofre em bola parada, aponte marcação (zona/individual) e quem está perdendo os duelos aéreos.

        Ao apontar um problema, diga SEMPRE: (a) em qual fase acontece, (b) qual jogador ou setor está envolvido, (c) o ajuste concreto. Diagnóstico sem ajuste não serve; ajuste sem diagnóstico é chute.`;
}
