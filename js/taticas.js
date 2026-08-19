// =====================================================================================
// MODELO TÁTICO — espelho das opções que existem dentro do jogo
// =====================================================================================
// Este arquivo é a fonte única da verdade sobre táticas. A ideia é que o que o treinador
// define aqui (e o que o Auxiliar sugere) possa ser aplicado LETRA POR LETRA no jogo, sem
// tradução no meio do caminho.
//
// São quatro escolhas independentes:
//   1. Predefinição tática — o "pacote" (Posse de bola, Pressão alta, Retranca total...)
//   2. Esquema — a formação (4-2-3-1, 4-3-3, ...), vinda de coordsFormacoes
//   3. Estilo de armação — como a bola sai de trás
//   4. Abordagem defensiva — 0 a 100, dividido em quatro faixas
//
// O jogo não deixa combinar tudo com tudo: cada predefinição trava uma das outras escolhas.
// Essas travas estão em PREDEFINICOES_TATICAS[].regra e são aplicadas tanto na tela do
// Perfil do Treinador quanto na sugestão do Auxiliar — assim o Auxiliar nunca sugere uma
// combinação que você não conseguiria selecionar no jogo.

// -------------------------------------------------------------------------------------
// ESTILO DE ARMAÇÃO
// -------------------------------------------------------------------------------------
const ESTILOS_ARMACAO = [
    {
        id: 'passe-curto',
        nome: 'Passe curto',
        descricao: 'Atletas se aproximam para apoiar ao invés de avançar. Esta abordagem mais cautelosa permite que a equipe mantenha a estrutura defensiva por mais tempo durante a transição.'
    },
    {
        id: 'equilibrado',
        nome: 'Equilibrado',
        descricao: 'Atletas variam entre corridas ofensivas e aproximações. A transição do time para a estrutura de quem está com a bola é estável em vez de repentina.'
    },
    {
        id: 'contra-ataque',
        nome: 'Contra-ataque',
        descricao: 'Esta abordagem incentiva atletas a entrar pelas costas da defesa adversária, à medida que o time faz a transição rápida da defesa para o ataque.'
    }
];

// A predefinição "Posse de bola" obriga o estilo de armação de posse — que no jogo é o
// "Passe curto" (o único dos três que aproxima os atletas para manter a bola). Se numa
// edição futura o jogo passar a ter um estilo chamado literalmente "Posse de bola", basta
// trocar esta constante: todas as regras apontam para cá.
const ESTILO_DE_POSSE = 'passe-curto';

// -------------------------------------------------------------------------------------
// ABORDAGEM DEFENSIVA (0 a 100)
// -------------------------------------------------------------------------------------
const ABORDAGENS_DEFENSIVAS = [
    {
        id: 'recuada', nome: 'Recuada', min: 0, max: 30, cor: 'var(--accent)',
        descricao: 'Uma abordagem que prioriza a segurança, com a linha de defesa mais recuada para marcar o time adversário.'
    },
    {
        id: 'equilibrada', nome: 'Equilibrada', min: 31, max: 60, cor: 'var(--primary)',
        descricao: 'Esta abordagem dá à defesa flexibilidade em relação à profundidade do recuo e a quais corridas acompanham.'
    },
    {
        id: 'avancada', nome: 'Avançada', min: 61, max: 90, cor: 'var(--warning)',
        descricao: 'Uma abordagem defensiva mais arriscada, adotando uma linha alta que tende a não acompanhar as corridas adversárias.'
    },
    {
        id: 'extremo-avancada', nome: 'Extremo avançada', min: 91, max: 100, cor: 'var(--danger)',
        descricao: 'A abordagem defensiva mais adiantada, adotando uma linha alta que busca forçar impedimentos do time adversário. Usa mais fôlego.'
    }
];

// -------------------------------------------------------------------------------------
// PREDEFINIÇÕES TÁTICAS
// -------------------------------------------------------------------------------------
// regra:
//   estiloObrigatorio  -> o estilo de armação TEM que ser esse
//   estilosProibidos   -> esses estilos de armação não podem ser usados
//   abordagensPermitidas -> só essas faixas de abordagem defensiva valem
// Ausência de regra = liberdade total naquele campo.
const PREDEFINICOES_TATICAS = [
    {
        id: 'posse-de-bola', nome: 'Posse de bola', emoji: '🎯',
        descricao: 'Posse de bola a todo custo! Essa abordagem exige que todo o time tenha desenvoltura com a bola nos pés, pois utiliza passes curtos e constante alternância de posições para gerar espaço para os ataques.',
        regra: { estiloObrigatorio: ESTILO_DE_POSSE }
    },
    {
        id: 'pressao-alta', nome: 'Pressão alta', emoji: '🔥',
        descricao: 'Esta estratégia não deixa o time adversário descansar com a posse de bola. Sua equipe tentará recuperar a bola rapidamente, usando transições rápidas para criar oportunidades de gol.',
        regra: { abordagensPermitidas: ['avancada', 'extremo-avancada'] }
    },
    {
        id: 'retranca-total', nome: 'Retranca total', emoji: '🛡️',
        descricao: 'Quando você precisa que seu time assuma uma defesa sólida, implacável, disciplinada e bem organizada, com uma linha defensiva compacta que impede ataques adversários.',
        regra: { abordagensPermitidas: ['recuada'] }
    },
    {
        id: 'contra-ataque', nome: 'Contra-ataque', emoji: '⚡',
        descricao: 'A versão futebolística do "rope-a-dope". Esta abordagem de baixo risco faz com que o time se defenda com paciência, e depois avance rapidamente quando a posse é recuperada.',
        regra: { estiloObrigatorio: 'contra-ataque' }
    },
    {
        id: 'ligacao-direta', nome: 'Ligação direta', emoji: '🚀',
        descricao: 'Uma abordagem direta que faz a bola avançar rapidamente, usando atacantes fortes para explorar o espaço nas costas da defesa e lutar por sobras e rebotes.',
        regra: { abordagensPermitidas: ['equilibrada'] }
    },
    {
        id: 'padrao', nome: 'Padrão', emoji: '⚖️',
        descricao: 'Uma abordagem estruturada que tem como objetivo manter a força da formação do time na defesa e ainda construir ataques.',
        regra: {}
    },
    {
        id: 'jogadas-pelas-pontas', nome: 'Jogadas pelas pontas', emoji: '↔️',
        descricao: 'Esta abordagem usa toda a amplitude do campo, mudando as jogadas para posições abertas para ter vantagem numérica nas pontas e criar oportunidades de cruzamento.',
        regra: { estilosProibidos: [ESTILO_DE_POSSE] }
    },
    {
        id: 'personalizado', nome: 'Personalizado', emoji: '🎛️',
        descricao: '100% personalizado. Nenhuma trava: combine esquema, estilo de armação e abordagem defensiva do jeito que quiser.',
        regra: {}
    }
];

// -------------------------------------------------------------------------------------
// CONSULTAS BÁSICAS
// -------------------------------------------------------------------------------------

function predefinicaoPorId(id) {
    return PREDEFINICOES_TATICAS.find(p => p.id === id) || PREDEFINICOES_TATICAS.find(p => p.id === 'padrao');
}

function estiloArmacaoPorId(id) {
    return ESTILOS_ARMACAO.find(e => e.id === id) || ESTILOS_ARMACAO.find(e => e.id === 'equilibrado');
}

// Qual faixa (Recuada/Equilibrada/Avançada/Extremo avançada) um valor de 0 a 100 representa.
function faixaAbordagem(valor) {
    let n = (typeof numeroNaFaixa === 'function') ? numeroNaFaixa(valor, 0, 100, 50) : Math.max(0, Math.min(100, Number(valor) || 50));
    return ABORDAGENS_DEFENSIVAS.find(a => n >= a.min && n <= a.max) || ABORDAGENS_DEFENSIVAS[1];
}

// Um valor representativo no meio de cada faixa — usado quando a regra da predefinição
// obriga a mudar de faixa e a gente precisa escolher um número concreto.
function valorCentralDaFaixa(idFaixa) {
    let faixa = ABORDAGENS_DEFENSIVAS.find(a => a.id === idFaixa) || ABORDAGENS_DEFENSIVAS[1];
    return Math.round((faixa.min + faixa.max) / 2);
}

function listaFormacoesDisponiveis() {
    return (typeof coordsFormacoes !== 'undefined') ? Object.keys(coordsFormacoes) : [];
}

function taticaPadrao() {
    return {
        predefinicao: 'padrao',
        esquema: '4-2-3-1',
        esquemaAlternativo: '4-4-2',
        estiloArmacao: 'equilibrado',
        abordagemDefensiva: 50
    };
}

// -------------------------------------------------------------------------------------
// MOTOR DE REGRAS
// -------------------------------------------------------------------------------------

// Lista, em texto, o que a predefinição escolhida exige. Serve tanto pra UI quanto pro prompt.
function textoRegraPredefinicao(idPredefinicao) {
    let pre = predefinicaoPorId(idPredefinicao);
    let r = pre.regra || {};
    if (r.estiloObrigatorio) {
        return `Obriga o estilo de armação "${estiloArmacaoPorId(r.estiloObrigatorio).nome}". O resto é livre.`;
    }
    if (r.estilosProibidos && r.estilosProibidos.length) {
        return `Não permite o estilo de armação "${r.estilosProibidos.map(e => estiloArmacaoPorId(e).nome).join('", "')}". O resto é livre.`;
    }
    if (r.abordagensPermitidas && r.abordagensPermitidas.length) {
        let nomes = r.abordagensPermitidas.map(id => (ABORDAGENS_DEFENSIVAS.find(a => a.id === id) || {}).nome).filter(Boolean);
        return `Exige abordagem defensiva ${nomes.join(' ou ')}. O resto é livre.`;
    }
    return 'Sem travas: qualquer combinação é permitida.';
}

// Confere se a combinação é selecionável no jogo. Devolve os problemas encontrados,
// cada um já com a correção que resolveria.
function validarTatica(tatica) {
    let t = tatica || {};
    let pre = predefinicaoPorId(t.predefinicao);
    let r = pre.regra || {};
    let problemas = [];

    if (r.estiloObrigatorio && t.estiloArmacao !== r.estiloObrigatorio) {
        problemas.push({
            campo: 'estiloArmacao',
            mensagem: `A predefinição "${pre.nome}" exige o estilo de armação "${estiloArmacaoPorId(r.estiloObrigatorio).nome}".`,
            correcao: { estiloArmacao: r.estiloObrigatorio }
        });
    }

    if (r.estilosProibidos && r.estilosProibidos.includes(t.estiloArmacao)) {
        // Cai no primeiro estilo permitido — mantém a escolha do treinador sempre que der
        let alternativa = ESTILOS_ARMACAO.find(e => !r.estilosProibidos.includes(e.id));
        problemas.push({
            campo: 'estiloArmacao',
            mensagem: `A predefinição "${pre.nome}" não permite o estilo "${estiloArmacaoPorId(t.estiloArmacao).nome}".`,
            correcao: { estiloArmacao: alternativa ? alternativa.id : 'equilibrado' }
        });
    }

    if (r.abordagensPermitidas && r.abordagensPermitidas.length) {
        let faixaAtual = faixaAbordagem(t.abordagemDefensiva);
        if (!r.abordagensPermitidas.includes(faixaAtual.id)) {
            // Vai pra faixa permitida mais próxima do valor que o treinador tinha escolhido
            let atual = (typeof numeroNaFaixa === 'function') ? numeroNaFaixa(t.abordagemDefensiva, 0, 100, 50) : 50;
            let alvo = r.abordagensPermitidas
                .map(id => ({ id, valor: valorCentralDaFaixa(id) }))
                .sort((a, b) => Math.abs(a.valor - atual) - Math.abs(b.valor - atual))[0];
            let nomes = r.abordagensPermitidas.map(id => (ABORDAGENS_DEFENSIVAS.find(a => a.id === id) || {}).nome).filter(Boolean);
            problemas.push({
                campo: 'abordagemDefensiva',
                mensagem: `A predefinição "${pre.nome}" exige abordagem defensiva ${nomes.join(' ou ')} — "${faixaAtual.nome}" não é permitida.`,
                correcao: { abordagemDefensiva: alvo.valor }
            });
        }
    }

    let formacoes = listaFormacoesDisponiveis();
    if (formacoes.length && !formacoes.includes(t.esquema)) {
        problemas.push({
            campo: 'esquema',
            mensagem: `O esquema "${t.esquema || '(vazio)'}" não existe na lista.`,
            correcao: { esquema: '4-2-3-1' }
        });
    }

    return { ok: problemas.length === 0, problemas: problemas };
}

// Devolve uma cópia legal da tática, aplicando as correções necessárias.
// `ajustes` explica em texto o que precisou mudar (a UI e o Auxiliar mostram isso).
function corrigirTatica(tatica) {
    let t = Object.assign(taticaPadrao(), tatica || {});
    t.abordagemDefensiva = (typeof numeroNaFaixa === 'function') ? numeroNaFaixa(t.abordagemDefensiva, 0, 100, 50) : Math.max(0, Math.min(100, Number(t.abordagemDefensiva) || 50));

    let ajustes = [];
    // Duas passadas bastam: cada correção mexe num campo diferente e nenhuma regra depende
    // de outra. O laço com teto evita qualquer chance de ficar girando à toa.
    for (let volta = 0; volta < 3; volta++) {
        let { ok, problemas } = validarTatica(t);
        if (ok) break;
        problemas.forEach(p => {
            Object.assign(t, p.correcao);
            ajustes.push(p.mensagem);
        });
    }
    return { tatica: t, ajustes: ajustes };
}

// -------------------------------------------------------------------------------------
// LEITURA/ESCRITA NO SAVE
// -------------------------------------------------------------------------------------

// Saves antigos guardavam { primaria, secundaria, estilo } — o formato velho de 3 selects.
// Aqui isso é convertido pro modelo novo uma única vez, sem perder o que já estava escolhido.
function taticaDoSave() {
    let d = db[currentSave];
    if (!d) return taticaPadrao();
    if (!d.taticas || typeof d.taticas !== 'object') d.taticas = {};

    if (!d.taticas.predefinicao) {
        let antiga = d.taticas;
        let convertida = taticaPadrao();
        if (antiga.primaria && listaFormacoesDisponiveis().includes(antiga.primaria)) convertida.esquema = antiga.primaria;
        if (antiga.secundaria && listaFormacoesDisponiveis().includes(antiga.secundaria)) convertida.esquemaAlternativo = antiga.secundaria;

        // O "Estilo de Jogo" antigo era texto livre; dá pra deduzir uma predefinição decente dele.
        let estiloAntigo = String(antiga.estilo || '').toLowerCase();
        if (estiloAntigo.includes('posse')) convertida.predefinicao = 'posse-de-bola';
        else if (estiloAntigo.includes('pressão') || estiloAntigo.includes('gegenpress')) convertida.predefinicao = 'pressao-alta';
        else if (estiloAntigo.includes('retranca')) convertida.predefinicao = 'retranca-total';
        else if (estiloAntigo.includes('contra-ataque')) convertida.predefinicao = 'contra-ataque';
        else if (estiloAntigo.includes('direto') || estiloAntigo.includes('bola longa') || estiloAntigo.includes('vertical')) convertida.predefinicao = 'ligacao-direta';
        else if (estiloAntigo.includes('lateral') || estiloAntigo.includes('ponta') || estiloAntigo.includes('amplitude')) convertida.predefinicao = 'jogadas-pelas-pontas';

        convertida.estiloJogoLegado = antiga.estilo || '';
        d.taticas = corrigirTatica(convertida).tatica;
        d.taticas.estiloJogoLegado = convertida.estiloJogoLegado;
    }
    return d.taticas;
}

function salvarTaticaNoSave(tatica) {
    let d = db[currentSave];
    if (!d) return;
    let resultado = corrigirTatica(tatica);
    // Preserva o texto livre do estilo antigo, que ainda enriquece os prompts da IA
    if (d.taticas && d.taticas.estiloJogoLegado) resultado.tatica.estiloJogoLegado = d.taticas.estiloJogoLegado;
    d.taticas = resultado.tatica;
    salvarDados();
    return resultado;
}

// -------------------------------------------------------------------------------------
// TEXTO PARA A IA
// -------------------------------------------------------------------------------------

// Como o treinador joga hoje — entra nos prompts do Auxiliar.
function descreverTaticaParaIA(tatica) {
    let t = tatica || taticaDoSave();
    let pre = predefinicaoPorId(t.predefinicao);
    let est = estiloArmacaoPorId(t.estiloArmacao);
    let faixa = faixaAbordagem(t.abordagemDefensiva);
    return `Predefinição tática: ${pre.nome} | Esquema: ${t.esquema} (alternativo: ${t.esquemaAlternativo || '—'}) | Estilo de armação: ${est.nome} | Abordagem defensiva: ${t.abordagemDefensiva}/100 (${faixa.nome})${t.estiloJogoLegado ? ` | Filosofia declarada: ${t.estiloJogoLegado}` : ''}`;
}

// As regras do jogo, escritas pra IA nunca sugerir combinação impossível de selecionar.
function regrasTaticasParaIA() {
    let linhasPre = PREDEFINICOES_TATICAS.map(p => `  * "${p.nome}" (id: ${p.id}) — ${textoRegraPredefinicao(p.id)}`).join('\n');
    let linhasEst = ESTILOS_ARMACAO.map(e => `  * "${e.nome}" (id: ${e.id})`).join('\n');
    let linhasAbo = ABORDAGENS_DEFENSIVAS.map(a => `  * ${a.min} a ${a.max} = "${a.nome}"`).join('\n');
    return `REGRAS TÁTICAS DO JOGO (siga à risca — uma combinação inválida é impossível de selecionar no jogo):
PREDEFINIÇÕES TÁTICAS e as travas de cada uma:
${linhasPre}
ESTILOS DE ARMAÇÃO possíveis:
${linhasEst}
ABORDAGEM DEFENSIVA é um número de 0 a 100, com estas faixas:
${linhasAbo}
ESQUEMAS (formações) possíveis, use EXATAMENTE um destes nomes: ${listaFormacoesDisponiveis().join(', ')}`;
}

// Pega o que a IA devolveu e força para dentro das regras. Nunca confia na IA ter obedecido.
function normalizarSugestaoTaticaIA(sugestao) {
    let s = sugestao || {};
    let base = taticaDoSave();
    let bruta = {
        predefinicao: predefinicaoPorId(s.predefinicao).id,
        esquema: listaFormacoesDisponiveis().includes(s.esquema) ? s.esquema : base.esquema,
        esquemaAlternativo: base.esquemaAlternativo,
        estiloArmacao: estiloArmacaoPorId(s.estiloArmacao).id,
        abordagemDefensiva: (typeof numeroNaFaixa === 'function') ? numeroNaFaixa(s.abordagemDefensiva, 0, 100, base.abordagemDefensiva) : 50
    };
    return corrigirTatica(bruta);
}

