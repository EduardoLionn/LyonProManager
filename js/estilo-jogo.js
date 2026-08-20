// =====================================================================================
// ESTILO DE JOGO — motor de tradução "estilo → configuração tática completa"
// =====================================================================================
// O treinador escolhe até 4 formações (em ordem de prioridade) e um estilo de jogo — de
// uma lista fechada (Gegenpressing, Tiki-Taka...) ou em texto livre. Este arquivo traduz
// isso na configuração EXATA que se aplica no jogo: predefinição, esquema, estilo de
// armação, abordagem defensiva e a função (com foco) de cada sigla do campinho.
//
// Nunca inventa uma opção nova: tudo aqui sai de PREDEFINICOES_TATICAS/ESTILOS_ARMACAO
// (js/taticas.js) e de GRUPOS_FUNCAO_EA (js/funcoes-ea.js). Onde o mapeamento "ideal" de
// um estilo pede uma função que não existe no grupo daquela posição, a lista já traz a
// alternativa válida mais próxima — documentada no campo `ajustes` de cada preset.

const MAX_FORMACOES_PREFERIDAS = 4;

const PLAYSTYLE_PRESETS = [
    {
        id: 'gegenpressing', nome: 'Gegenpressing', emoji: '🔥', apelido: 'Heavy Metal Football',
        contexto: 'Pressão pós-perda imediata, alta intensidade e transição rápida ao recuperar a bola.',
        predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 95,
        formacoesIdeais: ['4-3-3', '4-2-3-1'],
        funcoesPorGrupo: {
            zagueiro: [{ funcao: 'marcador', foco: 'combatividade' }],
            lateral: [{ funcao: 'ala-atacante', foco: 'ataque' }],
            volante: [{ funcao: 'contencao', foco: 'roubada-de-bola' }],
            meio_campo_central: [{ funcao: 'contencao', foco: 'roubada-de-bola' }, { funcao: 'box-to-box', foco: 'roubada-de-bola' }],
            meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
            ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
            meia_atacante: [{ funcao: 'atacante-sombra', foco: 'ataque' }],
            atacante: [{ funcao: 'oportunista', foco: 'ataque' }]
        },
        ajustes: ['Meia-Atacante (MEI): "Corta pra Dentro" não existe nesse grupo — usei "Atacante Sombra" com foco Ataque, mesma ideia de corrida tardia pra dentro da área.']
    },
    {
        id: 'tiki-taka', nome: 'Tiki-Taka', emoji: '🎯', apelido: 'Juego de Posición',
        contexto: 'Posse de bola sufocante, passes curtos, triangulações e pressão alta organizada.',
        predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
        formacoesIdeais: ['4-3-3', '4-2-3-1'],
        funcoesPorGrupo: {
            goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
            zagueiro: [{ funcao: 'sai-jogando', foco: 'defesa' }],
            lateral: [{ funcao: 'lateral-invertido', foco: 'equilibrado' }],
            volante: [{ funcao: 'armador-recuado', foco: 'defesa' }],
            meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
            meia_lateral: [{ funcao: 'ala', foco: 'equilibrado' }],
            ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
            atacante: [{ funcao: 'falso-9', foco: 'armacao' }]
        },
        ajustes: ['Pontas: "Meia pelas Pontas" não existe nos grupos Meia-Lateral/Ponta — usei "Ala" com foco Equilibrado, o comportamento mais próximo disponível.']
    },
    {
        id: 'futebol-relacional', nome: 'Futebol Relacional', emoji: '🌀', apelido: 'Dinizismo / Aproximação',
        contexto: 'Abandono de posições rígidas, aglomeração no setor da bola, passes curtos constantes.',
        predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
        formacoesIdeais: ['4-2-3-1', '4-3-3'],
        funcoesPorGrupo: {
            zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }],
            lateral: [{ funcao: 'lateral', foco: 'versatil' }],
            volante: [{ funcao: 'armador-recuado', foco: 'deslocamento' }],
            meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
            meia_atacante: [{ funcao: 'armador', foco: 'deslocamento' }],
            meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }],
            ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }],
            atacante: [{ funcao: 'centroavante', foco: 'versatil' }]
        },
        ajustes: ['Volante: "Armador" não existe nesse grupo — usei "Armador Recuado" com foco Deslocamento, a versão mais defensiva da mesma ideia.']
    },
    {
        id: 'catenaccio', nome: 'Catenaccio', emoji: '🛡️', apelido: 'Retranca e Contra-Ataque Fluido',
        contexto: 'Foco absoluto na defesa, bloco baixo, compactação extrema e estocadas rápidas.',
        predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 25,
        formacoesIdeais: ['5-2-3', '3-5-2', '4-4-2'],
        funcoesPorGrupo: {
            zagueiro: [{ funcao: 'defesa', foco: 'defesa' }, { funcao: 'zagueiro-aberto', foco: 'defesa' }],
            lateral: [{ funcao: 'ala', foco: 'equilibrado' }],
            meia_lateral: [{ funcao: 'ala', foco: 'equilibrado' }],
            ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
            volante: [{ funcao: 'contencao', foco: 'defesa' }],
            meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
            atacante: [{ funcao: 'pivo', foco: 'equilibrado' }, { funcao: 'oportunista', foco: 'ataque' }]
        },
        ajustes: [
            'Zagueiro: 1º slot (o mais central) vira "Zagueiro"/Defesa; os demais (laterais da linha de três/cinco) viram "Zagueiro Aberto"/Defesa.',
            'Alas (Meia-Lateral/Ponta): o foco "Defesa" não existe pra função Ala nesses grupos (só Equilibrado/Ataque) — usei Equilibrado, a alternativa mais próxima.',
            'Atacante: 1º slot vira "Pivô" (alvo), 2º vira "Oportunista" (velocista).'
        ]
    },
    {
        id: 'jogo-pelas-pontas', nome: 'Jogo pelas Pontas', emoji: '↔️', apelido: 'Wing Play Clássico',
        contexto: 'Exploração máxima da largura do campo, sobrecarga nas laterais e cruzamentos na área.',
        predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'equilibrado', abordagemDefensiva: 50,
        formacoesIdeais: ['4-4-2', '4-2-3-1'],
        funcoesPorGrupo: {
            lateral: [{ funcao: 'ala-atacante', foco: 'apoio' }],
            meia_lateral: [{ funcao: 'ala', foco: 'ataque' }],
            ponta: [{ funcao: 'ala', foco: 'ataque' }],
            meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
            atacante: [{ funcao: 'pivo', foco: 'com-abertura' }, { funcao: 'centroavante', foco: 'ataque' }]
        },
        ajustes: []
    },
    {
        id: 'ligacao-direta', nome: 'Ligação Direta', emoji: '🚀', apelido: 'Route One',
        contexto: 'Salta o meio-campo, passes longos diretos para o ataque buscar a 1ª e a 2ª bola.',
        predefinicao: 'ligacao-direta', estiloArmacao: 'equilibrado', abordagemDefensiva: 50,
        formacoesIdeais: ['4-4-2', '5-2-3'],
        funcoesPorGrupo: {
            goleiro: [{ funcao: 'goleiro', foco: 'equilibrado' }],
            zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
            lateral: [{ funcao: 'lateral', foco: 'defesa' }],
            volante: [{ funcao: 'contencao', foco: 'roubada-de-bola' }],
            atacante: [{ funcao: 'pivo', foco: 'equilibrado' }, { funcao: 'oportunista', foco: 'ataque' }]
        },
        ajustes: ['A predefinição "Ligação direta" só permite abordagem defensiva na faixa Equilibrada — fixei em 50/100 (a opção "Recuada" não é selecionável junto com ela no jogo).']
    },
    {
        id: 'transicao-letal', nome: 'Transição Ofensiva Letal', emoji: '🎯', apelido: 'Fast Counter',
        contexto: 'Não se importa em ceder a bola — mantém um bloco médio, atrai o adversário e destrói a defesa rival em segundos com a velocidade das pontas ao roubar a bola.',
        predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 50,
        formacoesIdeais: ['4-4-2', '4-2-3-1'],
        funcoesPorGrupo: {
            zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
            lateral: [{ funcao: 'ala', foco: 'equilibrado' }],
            volante: [{ funcao: 'contencao', foco: 'deslocamento' }],
            meio_campo_central: [{ funcao: 'contencao', foco: 'roubada-de-bola' }],
            meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'equilibrado' }],
            ponta: [{ funcao: 'corta-pra-dentro', foco: 'deslocamento' }],
            meia_atacante: [{ funcao: 'atacante-sombra', foco: 'ataque' }],
            atacante: [{ funcao: 'oportunista', foco: 'ataque' }]
        },
        ajustes: ['Pontas na função Meia-Lateral (MD/ME): "Corta pra Dentro" não tem foco Deslocamento nesse grupo — usei Equilibrado, o mais próximo do "explorar a lacuna deixada" pedido. Já como Ponta clássica (PD/PE) o foco Deslocamento existe normalmente.']
    },
    {
        id: 'futebol-total', nome: 'Futebol Total', emoji: '🌀', apelido: 'Total Football',
        contexto: 'Inteligência espacial e trocas constantes de posição — se o lateral sobe pelo meio, o volante cobre a lateral. Todo mundo ataca, todo mundo defende.',
        predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
        formacoesIdeais: ['4-3-3', '4-2-3-1'],
        funcoesPorGrupo: {
            goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
            zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }],
            lateral: [{ funcao: 'ala-invertido', foco: 'armacao' }],
            volante: [{ funcao: 'armador-recuado', foco: 'armacao' }],
            meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
            meia_atacante: [{ funcao: 'armador', foco: 'deslocamento' }],
            meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }],
            ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }],
            atacante: [{ funcao: 'falso-9', foco: 'armacao' }]
        },
        ajustes: ['A predefinição "Posse de bola" trava o estilo de armação em Passe Curto — mantém a base de circulação rápida em toques curtos que sustenta as trocas de posição do Futebol Total.']
    },
    {
        id: 'pressao-individual', nome: 'Pressão Alta Individual', emoji: '🐺', apelido: 'Man-to-Man High Press',
        contexto: 'Marcação homem a homem no campo inteiro, sufocando a saída de bola do goleiro rival pra forçar o erro perto do gol adversário. Estilo de risco altíssimo.',
        predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 95,
        formacoesIdeais: ['3-4-1-2', '4-1-4-1'],
        funcoesPorGrupo: {
            goleiro: [{ funcao: 'goleiro-libero', foco: 'equilibrado' }],
            zagueiro: [{ funcao: 'marcador', foco: 'combatividade' }],
            lateral: [{ funcao: 'ala-atacante', foco: 'ataque' }],
            volante: [{ funcao: 'contencao', foco: 'roubada-de-bola' }],
            meio_campo_central: [{ funcao: 'box-to-box', foco: 'roubada-de-bola' }],
            meia_lateral: [{ funcao: 'meia-aberto', foco: 'apoio' }],
            meia_atacante: [{ funcao: 'armador', foco: 'deslocamento' }],
            atacante: [{ funcao: 'centroavante', foco: 'apoio' }]
        },
        ajustes: []
    },
    {
        id: 'sarriball', nome: 'Passe Vertical Rápido', emoji: '🧭', apelido: 'Sarriball',
        contexto: 'Alta posse de bola jogada a um ou dois toques — não é posse pra descansar, é posse vertical pra furar linhas o mais rápido possível usando triângulos curtos.',
        predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
        formacoesIdeais: ['4-3-3', '4-2-3-1'],
        funcoesPorGrupo: {
            zagueiro: [{ funcao: 'sai-jogando', foco: 'defesa' }],
            lateral: [{ funcao: 'lateral', foco: 'equilibrado' }],
            volante: [{ funcao: 'armador-recuado', foco: 'armacao' }],
            meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
            meia_atacante: [{ funcao: 'camisa-10-classico', foco: 'ataque' }],
            meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
            ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
            atacante: [{ funcao: 'oportunista', foco: 'versatil' }]
        },
        ajustes: []
    },
    {
        id: 'estacionar-onibus', nome: 'Estacionar o Ônibus', emoji: '🚌', apelido: 'Park the Bus',
        contexto: 'Pra segurar resultado em mata-mata, ou quando o time é muito inferior ao adversário: uma barreira intransponível dentro e na borda da própria área.',
        predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 25,
        formacoesIdeais: ['3-5-2', '4-2-3-1'],
        funcoesPorGrupo: {
            goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
            zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
            lateral: [{ funcao: 'lateral', foco: 'defesa' }],
            volante: [{ funcao: 'zaga', foco: 'defesa' }],
            meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
            meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
            atacante: [{ funcao: 'pivo', foco: 'com-abertura' }, { funcao: 'oportunista', foco: 'ataque' }]
        },
        ajustes: ['Volante (VOL 1 e 2): função "Zaga" — os volantes literalmente se enfiam entre os zagueiros pra formar a linha de 5/6, exatamente como pedido.', 'Atacante: com 2 pontas de ataque na formação, o 1º slot vira "Pivô" (segura a bola sozinho) e o 2º vira "Oportunista" (pronto pro rebote/contra-ataque).']
    }
];

function presetPorId(id) {
    return PLAYSTYLE_PRESETS.find(p => p.id === id) || null;
}

// -------------------------------------------------------------------------------------
// ESCOLHA DO ESQUEMA — entre as até 4 formações priorizadas, pontua por interseção com o
// "formato ideal" do estilo. Empate é desfeito respeitando a ordem que o treinador deu.
// Se nenhuma das 4 bater com o formato ideal, usa a prioridade #1 mesmo assim — o estilo
// ainda se aplica na micro-tática, só não achou a formação "perfeita" pra ele.
// -------------------------------------------------------------------------------------
function escolherEsquemaPorPrioridade(formacoesPreferidas, formacoesIdeais) {
    let validas = (formacoesPreferidas || []).filter(f => f && coordsFormacoes[f]).slice(0, MAX_FORMACOES_PREFERIDAS);
    if (!validas.length) return { esquema: null, preteridas: [] };

    let pontuadas = validas.map((formacao, indice) => ({
        formacao,
        pontuacao: (formacoesIdeais.includes(formacao) ? 100 : 0) + (MAX_FORMACOES_PREFERIDAS - indice)
    }));
    pontuadas.sort((a, b) => b.pontuacao - a.pontuacao);
    let [escolhida, ...resto] = pontuadas;

    return {
        esquema: escolhida.formacao,
        preteridas: resto.map(p => ({
            formacao: p.formacao,
            motivo: formacoesIdeais.includes(p.formacao) ? 'também serviria, mas era menos prioritária' : 'não é o formato ideal para este estilo'
        }))
    };
}

// -------------------------------------------------------------------------------------
// MICRO-TÁTICA — ordena os slots do mesmo grupo dentro da formação escolhida (centralidade
// pro zagueiro, profundidade pros grupos de meio-campo, esquerda→direita nos demais) e
// resolve função+foco de cada sigla a partir da lista do preset pra aquele grupo.
// Grupo sem regra no preset cai pro motor genérico (escolherFuncaoJogador), que já sabe
// dar uma função padrão sensata só com a tática, sem precisar de um jogador real.
// -------------------------------------------------------------------------------------
function _ordenarSlotsDoGrupo(grupoKey, coordsFormacao) {
    let doGrupo = coordsFormacao.filter(c => grupoFuncaoDoRole(c.role) === grupoKey);
    if (grupoKey === 'zagueiro') {
        return doGrupo.slice().sort((a, b) => Math.abs(parseFloat(a.left) - 50) - Math.abs(parseFloat(b.left) - 50));
    }
    if (grupoKey === 'volante' || grupoKey === 'meio_campo_central' || grupoKey === 'meia_atacante') {
        return doGrupo.slice().sort((a, b) => parseFloat(b.top) - parseFloat(a.top)); // mais recuado primeiro
    }
    return doGrupo.slice().sort((a, b) => parseFloat(a.left) - parseFloat(b.left)); // esquerda -> direita
}

function resolverFuncaoDoSlot(role, formacao, preset, taticaResultante) {
    let grupo = grupoFuncaoDoRole(role);
    let candidatos = grupo ? preset.funcoesPorGrupo[grupo] : null;
    if (candidatos && candidatos.length) {
        let ordenados = _ordenarSlotsDoGrupo(grupo, coordsFormacoes[formacao] || []);
        let indice = ordenados.findIndex(c => c.role === role);
        let escolha = candidatos[Math.min(Math.max(indice, 0), candidatos.length - 1)];
        return { funcao: escolha.funcao, foco: escolha.foco };
    }
    // Sem regra do preset pra esse grupo — o motor genérico já dá uma função padrão
    // coerente com a tática, sem precisar saber quem é o jogador.
    let escolha = escolherFuncaoJogador(role, null, taticaResultante);
    return escolha ? { funcao: escolha.funcao.id, foco: escolha.foco.id } : null;
}

// -------------------------------------------------------------------------------------
// RELATÓRIO COMPLETO — ponto de entrada principal.
// -------------------------------------------------------------------------------------
function gerarRelatorioTaticoPorPreset(formacoesPreferidas, presetId) {
    let preset = presetPorId(presetId);
    if (!preset) return null;

    let { esquema, preteridas } = escolherEsquemaPorPrioridade(formacoesPreferidas, preset.formacoesIdeais);
    if (!esquema) return null;

    // Rede de segurança: os presets são escritos à mão, então passam pelo mesmo motor de
    // regras do resto do app antes de virar resultado final — se algum combo macro tivesse
    // ficado inconsistente, é corrigido aqui em vez de silenciosamente virar algo inválido.
    let { tatica: taticaResultante, ajustes: ajustesRegra } = corrigirTatica({
        predefinicao: preset.predefinicao, esquema: esquema,
        estiloArmacao: preset.estiloArmacao, abordagemDefensiva: preset.abordagemDefensiva
    });

    let funcoesPorRole = {};
    (coordsFormacoes[esquema] || []).forEach(c => {
        let f = resolverFuncaoDoSlot(c.role, esquema, preset, taticaResultante);
        if (f) funcoesPorRole[c.role] = f;
    });

    return {
        esquemaEscolhido: esquema,
        esquemaPreteridas: preteridas,
        formacoesPreferidas: (formacoesPreferidas || []).slice(0, MAX_FORMACOES_PREFERIDAS),
        predefinicao: taticaResultante.predefinicao,
        estiloArmacao: taticaResultante.estiloArmacao,
        abordagemDefensiva: taticaResultante.abordagemDefensiva,
        funcoesPorRole: funcoesPorRole,
        ajustesAutomaticos: (preset.ajustes || []).concat(ajustesRegra),
        justificativa: `${preset.emoji} ${preset.nome} (${preset.apelido}): ${preset.contexto}`,
        origem: { tipo: 'preset', rotulo: preset.nome }
    };
}

// -------------------------------------------------------------------------------------
// FALLBACK — estilo em texto livre, interpretado pela IA e validado contra o vocabulário
// real antes de qualquer coisa ser aplicada. Nunca aplica o JSON da IA direto.
// -------------------------------------------------------------------------------------
function _listarGruposFuncaoParaIA() {
    return Object.entries(GRUPOS_FUNCAO_EA).map(([chave, grupo]) => {
        let funcoes = grupo.funcoes.map(f => `${f.nome} (id: ${f.id}, focos: ${f.focos.map(fo => fo.id).join('/')})`).join('; ');
        return `  * ${grupo.nome} (grupo: ${chave}) — ${funcoes}`;
    }).join('\n');
}

async function gerarRelatorioTaticoPorTextoLivre(formacoesPreferidas, descricaoLivre) {
    let validas = (formacoesPreferidas || []).filter(f => f && coordsFormacoes[f]).slice(0, MAX_FORMACOES_PREFERIDAS);
    if (!validas.length) throw new Error('Escolha ao menos uma formação preferida.');

    let promptIA = `Você é o Auxiliar Técnico. O treinador descreveu o estilo de jogo que quer com as próprias palavras — sua tarefa é traduzir isso pra configuração EXATA do jogo.

DESCRIÇÃO DO TREINADOR: "${descricaoLivre}"

FORMAÇÕES QUE ELE PRIORIZOU (nesta ordem, a primeira é a preferida): ${validas.join(' > ')}

${regrasTaticasParaIA()}

FUNÇÕES E FOCOS POR GRUPO DE POSIÇÃO (use SÓ estes ids — nunca invente um novo):
${_listarGruposFuncaoParaIA()}

REGRAS:
1. Escolha UMA das formações priorizadas pra virar "esquemaEscolhido" — a que melhor serve o estilo descrito. Não invente uma formação fora da lista.
2. predefinicao, estiloArmacao e abordagemDefensiva têm que respeitar as travas listadas acima.
3. Para CADA sigla da formação escolhida, devolva a função e o foco — os dois ids têm que vir do MESMO grupo daquela sigla. Se não tiver certeza, use a mais equilibrada do grupo.
4. Escreva 2-3 frases em "justificativa" explicando a leitura que você fez do texto do treinador.

Retorne EXATAMENTE este JSON puro:
{
  "esquemaEscolhido": "4-2-3-1",
  "predefinicao": "id da predefinição",
  "estiloArmacao": "id do estilo de armação",
  "abordagemDefensiva": 50,
  "funcoesPorRole": { "GOL": { "funcao": "id", "foco": "id" } },
  "justificativa": "..."
}`;

    const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
    let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('A IA não devolveu um JSON legível.');
    let bruto = JSON.parse(match[0]);

    return normalizarRelatorioTaticoIA(bruto, validas, descricaoLivre);
}

// Nunca confia que a IA obedeceu — cada campo é validado contra o vocabulário real, e o
// que não bater cai pro motor determinístico em vez de ficar sem função.
function normalizarRelatorioTaticoIA(bruto, formacoesPreferidas, descricaoLivre) {
    let esquema = coordsFormacoes[bruto.esquemaEscolhido] ? bruto.esquemaEscolhido : formacoesPreferidas[0];
    let { tatica, ajustes } = normalizarSugestaoTaticaIA({
        predefinicao: bruto.predefinicao, estiloArmacao: bruto.estiloArmacao,
        abordagemDefensiva: bruto.abordagemDefensiva, esquema: esquema
    });

    let funcoesPorRole = {};
    (coordsFormacoes[tatica.esquema] || []).forEach(c => {
        let grupo = grupoFuncaoDoRole(c.role);
        let pedida = bruto.funcoesPorRole && bruto.funcoesPorRole[c.role];
        let valida = grupo && pedida && GRUPOS_FUNCAO_EA[grupo].funcoes.some(f => f.id === pedida.funcao && f.focos.some(fo => fo.id === pedida.foco));
        if (valida) {
            funcoesPorRole[c.role] = { funcao: pedida.funcao, foco: pedida.foco };
        } else {
            let escolha = escolherFuncaoJogador(c.role, null, tatica);
            if (escolha) {
                funcoesPorRole[c.role] = { funcao: escolha.funcao.id, foco: escolha.foco.id };
                ajustes.push(`A IA não deu uma função válida pra ${c.role} — usei a função padrão do motor pra essa posição.`);
            }
        }
    });

    return {
        esquemaEscolhido: tatica.esquema,
        esquemaPreteridas: formacoesPreferidas.filter(f => f !== tatica.esquema).map(f => ({ formacao: f, motivo: 'a IA preferiu outra formação da sua lista' })),
        formacoesPreferidas: formacoesPreferidas,
        predefinicao: tatica.predefinicao,
        estiloArmacao: tatica.estiloArmacao,
        abordagemDefensiva: tatica.abordagemDefensiva,
        funcoesPorRole: funcoesPorRole,
        ajustesAutomaticos: ajustes,
        justificativa: bruto.justificativa || `Leitura do Auxiliar sobre "${descricaoLivre}".`,
        origem: { tipo: 'texto-livre-interpretado', rotulo: descricaoLivre }
    };
}

// -------------------------------------------------------------------------------------
// APLICAR NO SAVE — grava o resultado dentro de db[currentSave].taticas, reaproveitando
// corrigirTatica()/salvarTaticaNoSave() pra nunca deixar uma combinação inválida entrar.
// -------------------------------------------------------------------------------------
function aplicarRelatorioTaticoNoSave(relatorio) {
    if (!relatorio) return null;
    let resultado = salvarTaticaNoSave({
        predefinicao: relatorio.predefinicao,
        estiloArmacao: relatorio.estiloArmacao,
        esquema: relatorio.esquemaEscolhido,
        abordagemDefensiva: relatorio.abordagemDefensiva
    });
    let d = db[currentSave];
    d.taticas.formacoesPreferidas = (relatorio.formacoesPreferidas || []).slice(0, MAX_FORMACOES_PREFERIDAS);
    d.taticas.estiloJogoSelecionado = relatorio.origem;
    d.taticas.funcoesPorRoleSugeridas = relatorio.funcoesPorRole;
    salvarDados();
    return resultado;
}

// =====================================================================================
// INTERFACE — o mesmo seletor (até 4 formações + estilo) é usado em dois lugares: o
// assistente de "Início de Jogo" (prefixo "wiz-") e a aba Perfil do Treinador (prefixo
// "perfil-"). Cada um só difere em ONDE o resultado é aplicado — no assistente ele
// preenche os mesmos <select> manuais que wizardFinalizar() já lê; no Perfil ele grava
// direto no save e atualiza o painel de 4 escolhas que já existia.
// =====================================================================================

let _estiloJogoSelecionado = {}; // prefixo -> id do preset, ou null quando "Personalizado" está ativo
let _estiloJogoModoEdicao = {}; // prefixo -> true quando o treinador pediu pra alterar uma config já salva

// No Perfil do Treinador, uma vez que o estilo já foi salvo no save, não faz sentido
// mostrar o formulário inteiro de novo toda vez que a aba é aberta — só o resumo do que
// já está valendo, com um botão pra entrar em modo de edição. No assistente de Início de
// Jogo não existe save ainda, então lá o formulário completo é sempre o único estado.
function _configuracaoJaSalva(prefixo) {
    if (prefixo !== 'perfil-') return null;
    let t = db[currentSave] && db[currentSave].taticas;
    return (t && t.estiloJogoSelecionado) ? t : null;
}

function renderizarSeletorEstiloJogo(prefixo) {
    let container = document.getElementById(prefixo + 'estilo-jogo-container');
    if (!container) return;
    delete _estiloJogoSelecionado[prefixo]; // o HTML é reconstruído do zero — nenhum cartão fica marcado como ativo

    let salva = _configuracaoJaSalva(prefixo);
    if (salva && !_estiloJogoModoEdicao[prefixo]) {
        renderizarResumoEstiloJogoSalvo(prefixo, container, salva);
        return;
    }

    let optionsFormacoes = listaFormacoesDisponiveis().map(f => `<option value="${f}">${f}</option>`).join('');
    let seletoresFormacao = [1, 2, 3, 4].map(i => `
        <div class="linha-form">
            <label>${i}ª prioridade${i === 1 ? '' : ' (opcional)'}</label>
            <select id="${prefixo}estilo-formacao-${i}">${i === 1 ? '' : '<option value="">— Nenhuma —</option>'}${optionsFormacoes}</select>
        </div>`).join('');

    let cardsPreset = PLAYSTYLE_PRESETS.map(p => `
        <button type="button" class="tatica-card tatica-card-menor" id="${prefixo}estilo-card-${p.id}" onclick="escolherPresetEstiloJogo('${prefixo}', '${p.id}')">
            <span class="tatica-card-nome">${p.emoji} ${p.nome}</span>
            <span class="tatica-card-desc">${p.contexto}</span>
        </button>`).join('');
    let cardLivre = `
        <button type="button" class="tatica-card tatica-card-menor" id="${prefixo}estilo-card-livre" onclick="escolherPresetEstiloJogo('${prefixo}', null)">
            <span class="tatica-card-nome">✍️ Personalizado</span>
            <span class="tatica-card-desc">Descreva o estilo com suas palavras — o Auxiliar traduz pras opções do jogo.</span>
        </button>`;

    let rotuloBotao = prefixo === 'perfil-' ? '💾 Salvar Configuração' : '✅ Aplicar Configuração';
    let botaoCancelar = salva ? `<button type="button" onclick="alternarEdicaoEstiloJogo('${prefixo}', false)" style="width:100%; margin-top:8px; background:transparent; border:1px solid var(--border); color:var(--text-muted); padding:8px;">Cancelar</button>` : '';

    container.innerHTML = `
        <div class="grid-2">${seletoresFormacao}</div>
        <p class="tatica-ajuda" style="margin-top:14px;">Estilo de jogo</p>
        <div class="tatica-grade">${cardsPreset}${cardLivre}</div>
        <div class="linha-form" id="${prefixo}estilo-texto-livre-wrap" style="display:none; margin-top:10px;">
            <label>Descreva o estilo que você quer</label>
            <textarea id="${prefixo}estilo-texto-livre" rows="2" placeholder="Ex: quero jogar recuado mas com muita posse quando recuperar a bola" style="width:100%; background:var(--bg-dark);"></textarea>
        </div>
        <button type="button" onclick="gerarConfiguracaoEstiloJogo('${prefixo}')" style="width:100%; margin-top:14px; background:var(--primary); color:black; padding:12px; font-weight:bold;">${rotuloBotao}</button>
        ${botaoCancelar}
        <div id="${prefixo}estilo-loader" style="display:none; font-size:13px; color:var(--warning); font-weight:bold; margin-top:10px;"></div>
        <div id="${prefixo}estilo-resultado" style="margin-top:16px;"></div>
    `;

    // Editando uma config já existente: pré-preenche o formulário com o que já está salvo,
    // em vez de forçar o treinador a escolher tudo de novo do zero.
    if (salva) {
        (salva.formacoesPreferidas || []).forEach((f, i) => {
            let el = document.getElementById(`${prefixo}estilo-formacao-${i + 1}`);
            if (el) el.value = f;
        });
        let origem = salva.estiloJogoSelecionado;
        if (origem.tipo === 'preset') {
            let preset = PLAYSTYLE_PRESETS.find(p => p.nome === origem.rotulo);
            if (preset) escolherPresetEstiloJogo(prefixo, preset.id);
        } else {
            escolherPresetEstiloJogo(prefixo, null);
            let txt = document.getElementById(`${prefixo}estilo-texto-livre`);
            if (txt) txt.value = origem.rotulo;
        }
    }
}

function renderizarResumoEstiloJogoSalvo(prefixo, container, t) {
    let pre = predefinicaoPorId(t.predefinicao);
    let est = estiloArmacaoPorId(t.estiloArmacao);
    let faixa = faixaAbordagem(t.abordagemDefensiva);
    let origem = t.estiloJogoSelecionado;
    let rotuloOrigem = origem.tipo === 'preset' ? origem.rotulo : `Personalizado: "${origem.rotulo}"`;
    let formacoesTxt = (t.formacoesPreferidas && t.formacoesPreferidas.length) ? t.formacoesPreferidas.join(' → ') : t.esquema;
    let funcoesHtml = _funcoesPorRoleParaExibicao(t.funcoesPorRoleSugeridas || {}).map(e => `
        <div class="banco-reserva-item"><strong>${e.rotulo}</strong><span>${e.texto}</span></div>
    `).join('');

    container.innerHTML = `
        <div class="tatica-resumo">
            <strong>📋 Estilo de Jogo: ${rotuloOrigem}</strong>
            <span>${pre.emoji} ${pre.nome} &nbsp;•&nbsp; ${t.esquema} &nbsp;•&nbsp; ${est.nome} &nbsp;•&nbsp; ${t.abordagemDefensiva}/100 (${faixa.nome})</span>
        </div>
        <p class="tatica-ajuda" style="margin-top:10px;">Formações preferidas (ordem de prioridade): ${formacoesTxt}</p>
        ${funcoesHtml ? `<p class="tatica-ajuda" style="margin-top:14px;">Função de cada posição em campo</p><div class="banco-reservas-grid">${funcoesHtml}</div>` : ''}
        <p style="font-size:12px; color:var(--text-muted); line-height:1.6; margin-top:14px;">💡 Isto é a <strong>base</strong> — não é engessado. Partida a partida, o Auxiliar Técnico ajusta a abordagem, a formação (entre as preferidas acima) e a função de cada jogador de acordo com o adversário específico, sempre dentro do espírito deste estilo.</p>
        <button type="button" onclick="alternarEdicaoEstiloJogo('${prefixo}', true)" style="width:100%; margin-top:10px; background:var(--bg-dark); border:1px solid var(--border); color:var(--text); padding:10px; font-weight:bold;">✏️ Alterar Configuração</button>
    `;
}

function alternarEdicaoEstiloJogo(prefixo, ligar) {
    _estiloJogoModoEdicao[prefixo] = !!ligar;
    renderizarSeletorEstiloJogo(prefixo);
}

function escolherPresetEstiloJogo(prefixo, presetId) {
    _estiloJogoSelecionado[prefixo] = presetId;
    document.querySelectorAll(`[id^="${prefixo}estilo-card-"]`).forEach(el => el.classList.remove('tatica-card-ativo'));
    let elAtivo = document.getElementById(presetId ? `${prefixo}estilo-card-${presetId}` : `${prefixo}estilo-card-livre`);
    if (elAtivo) elAtivo.classList.add('tatica-card-ativo');
    let wrapLivre = document.getElementById(`${prefixo}estilo-texto-livre-wrap`);
    if (wrapLivre) wrapLivre.style.display = presetId ? 'none' : 'block';
}

function _formacoesPreferidasDoSeletor(prefixo) {
    return [1, 2, 3, 4]
        .map(i => { let el = document.getElementById(`${prefixo}estilo-formacao-${i}`); return el ? el.value : ''; })
        .filter(Boolean);
}

async function gerarConfiguracaoEstiloJogo(prefixo) {
    let formacoes = _formacoesPreferidasDoSeletor(prefixo);
    if (!formacoes.length) return alert('Escolha ao menos a 1ª formação preferida.');

    let presetId = _estiloJogoSelecionado[prefixo];
    if (presetId === undefined) return alert('Escolha um estilo de jogo (ou "Personalizado").');

    let loader = document.getElementById(`${prefixo}estilo-loader`);
    let relatorio;
    try {
        if (presetId === null) {
            let texto = (document.getElementById(`${prefixo}estilo-texto-livre`) || {}).value;
            texto = (texto || '').trim();
            if (!texto) return alert('Descreva o estilo que você quer.');
            if (loader) { loader.style.display = 'block'; loader.style.color = 'var(--warning)'; loader.innerText = '⏳ Traduzindo o estilo pra configuração do jogo...'; }
            relatorio = await gerarRelatorioTaticoPorTextoLivre(formacoes, texto);
        } else {
            relatorio = gerarRelatorioTaticoPorPreset(formacoes, presetId);
        }
    } catch (e) {
        if (loader) { loader.style.display = 'block'; loader.style.color = 'var(--danger)'; loader.innerText = '❌ ' + e.message; }
        return;
    }
    if (!relatorio) {
        if (loader) { loader.style.display = 'block'; loader.style.color = 'var(--danger)'; loader.innerText = '❌ Não consegui montar a configuração — confira as formações escolhidas.'; }
        return;
    }
    if (loader) loader.style.display = 'none';

    if (prefixo === 'perfil-') {
        aplicarRelatorioTaticoNoSave(relatorio);
        // Salvo — volta pro resumo colapsado em vez de deixar o formulário inteiro aberto.
        _estiloJogoModoEdicao[prefixo] = false;
        renderizarSeletorEstiloJogo(prefixo);
        return;
    }

    // Assistente de Início de Jogo: ainda não existe save pra gravar — wizardFinalizar() lê
    // isto pra montar db[currentSave].taticas por completo (predefinição/esquema/estilo/
    // abordagem/formações preferidas/função por posição) quando o treinador concluir o assistente.
    window._wizardRelatorioEstiloJogo = relatorio;

    renderizarResultadoEstiloJogo(prefixo, relatorio);
}

function _nomeFuncaoFoco(role, escolha) {
    let grupo = grupoFuncaoDoRole(role);
    if (!grupo || !escolha) return '';
    let g = GRUPOS_FUNCAO_EA[grupo];
    let f = g.funcoes.find(x => x.id === escolha.funcao);
    let foco = f ? f.focos.find(x => x.id === escolha.foco) : null;
    return f ? `${f.nome}${foco ? '-' + foco.nome : ''}` : escolha.funcao;
}

// Prepara a lista {rotulo, texto} pra exibir "função de cada posição em campo": nos grupos sem
// lado (ver ROTULO_GENERICO_POR_GRUPO) onde TODAS as siglas do grupo caíram na mesma função/foco,
// mostra uma linha só com o rótulo genérico (ex: "VOL") em vez de repetir "VOLD" e "VOLE" dizendo
// exatamente a mesma coisa. Se as siglas do grupo tiverem funções diferentes entre si (ex: zagueiro
// central com função diferente dos zagueiros abertos), mantém cada sigla separada — aí a diferença
// é real e precisa aparecer.
function _funcoesPorRoleParaExibicao(funcoesPorRole) {
    let porGrupo = {};
    let ordemGrupos = [];
    Object.keys(funcoesPorRole).forEach(role => {
        let grupoKey = grupoFuncaoDoRole(role) || role;
        if (!porGrupo[grupoKey]) { porGrupo[grupoKey] = []; ordemGrupos.push(grupoKey); }
        porGrupo[grupoKey].push({ role: role, escolha: funcoesPorRole[role] });
    });

    let saida = [];
    ordemGrupos.forEach(grupoKey => {
        let itens = porGrupo[grupoKey];
        let rotuloGenerico = ROTULO_GENERICO_POR_GRUPO[grupoKey];
        let todasIguais = rotuloGenerico && itens.length > 1 && itens.every(it =>
            it.escolha.funcao === itens[0].escolha.funcao && it.escolha.foco === itens[0].escolha.foco);
        if (todasIguais) {
            saida.push({ rotulo: rotuloGenerico, texto: _nomeFuncaoFoco(itens[0].role, itens[0].escolha) });
        } else {
            itens.forEach(it => saida.push({ rotulo: it.role, texto: _nomeFuncaoFoco(it.role, it.escolha) }));
        }
    });
    return saida;
}

function renderizarResultadoEstiloJogo(prefixo, relatorio) {
    let box = document.getElementById(`${prefixo}estilo-resultado`);
    if (!box) return;

    let pre = predefinicaoPorId(relatorio.predefinicao);
    let est = estiloArmacaoPorId(relatorio.estiloArmacao);
    let faixa = faixaAbordagem(relatorio.abordagemDefensiva);

    let preteridasHtml = relatorio.esquemaPreteridas.length
        ? `<p style="font-size:12px; color:var(--text-muted); margin:6px 0 0 0;">Não usei ${relatorio.esquemaPreteridas.map(p => `<strong>${p.formacao}</strong> (${p.motivo})`).join(', ')}.</p>`
        : '';
    let ajustesHtml = relatorio.ajustesAutomaticos.length
        ? `<div style="background: rgba(217,130,43,0.12); border:1px solid var(--warning); color:var(--warning); border-radius:8px; padding:12px 14px; font-size:13px; line-height:1.6; margin-top:12px;">⚠️ <strong>Ajustes automáticos:</strong><br>${relatorio.ajustesAutomaticos.join('<br>')}</div>`
        : '';
    let funcoesHtml = _funcoesPorRoleParaExibicao(relatorio.funcoesPorRole).map(e => `
        <div class="banco-reserva-item"><strong>${e.rotulo}</strong><span>${e.texto}</span></div>
    `).join('');

    box.innerHTML = `
        <div class="tatica-resumo">
            <strong>📋 ${relatorio.justificativa}</strong>
            <span>${pre.emoji} ${pre.nome} &nbsp;•&nbsp; ${relatorio.esquemaEscolhido} &nbsp;•&nbsp; ${est.nome} &nbsp;•&nbsp; ${relatorio.abordagemDefensiva}/100 (${faixa.nome})</span>
        </div>
        ${preteridasHtml}
        ${ajustesHtml}
        <p class="tatica-ajuda" style="margin-top:14px;">Função de cada posição em campo</p>
        <div class="banco-reservas-grid">${funcoesHtml}</div>
    `;
}
