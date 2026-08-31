// =====================================================================================
// DNA TÁTICO — as 4 fases do jogo, do jeito que treinador de verdade descreve um estilo
// =====================================================================================
// Pedido do treinador: o resumo por posição ("GOL: Goleiro-Defesa, LAD: Lateral-Equilibrado...")
// não diz nada sobre COMO o time joga — é uma lista de rótulos. O que descreve um estilo de
// verdade são as 4 fases do jogo e as decisões dentro de cada uma:
//
//   1. Organização Ofensiva (com a bola)      — saída de bola, ocupação de espaços,
//                                               comportamento dos laterais, mobilidade
//   2. Transição Defensiva (ao perder a bola) — pressão pós-perda x recomposição
//   3. Organização Defensiva (sem a bola)     — altura do bloco, tipo de marcação, compactação
//   4. Transição Ofensiva (ao recuperar)      — ataque vertical x manutenção da posse
//
// Este arquivo é a fonte única desse vocabulário. Ele serve pra três coisas:
//   a) descrever TODO estilo de jogo (preset, Camaleão ou personalizado) nessa linguagem;
//   b) alimentar o "Modo Avançado" do estilo Personalizado, onde o treinador escolhe cada
//      eixo na mão em vez de escrever um texto livre;
//   c) traduzir essas escolhas de volta pra configuração real do jogo (predefinição, estilo
//      de armação, abordagem defensiva e função de cada posição), sem IA e sem inventar nada
//      fora dos catálogos reais (PREDEFINICOES_TATICAS/ESTILOS_ARMACAO/GRUPOS_FUNCAO_EA).
// =====================================================================================

const DNA_TATICO_FASES = [
    {
        id: 'organizacao_ofensiva', nome: 'Organização Ofensiva', momento: 'Com a bola', emoji: '⚽',
        eixos: [
            { id: 'saida_bola', nome: 'Saída de Bola', opcoes: [
                { id: 'sustentada', nome: 'Sustentada', descricao: 'Passes curtos desde a defesa, envolvendo o goleiro para atrair a pressão e quebrar linhas.' },
                { id: 'mista', nome: 'Mista', descricao: 'Sai jogando curto quando o adversário permite e aciona o passe longo assim que a pressão sobe.' },
                { id: 'direta', nome: 'Direta', descricao: 'Ligação longa buscando o centroavante e disputando a segunda bola no campo de ataque.' }
            ]},
            { id: 'ocupacao_espacos', nome: 'Ocupação de Espaços', opcoes: [
                { id: 'posicional_amplo', nome: 'Jogo de Posição (amplo)', descricao: 'Pontas pisando na linha lateral para esticar a defesa adversária e abrir os corredores internos.' },
                { id: 'relacional', nome: 'Jogo Relacional (curto)', descricao: 'Jogadores se aglomeram perto da bola para tabelas curtas e superioridade no setor da jogada.' },
                { id: 'misto', nome: 'Misto', descricao: 'Alterna entre abrir o campo e aproximar peças, conforme o lado por onde a jogada nasce.' }
            ]},
            { id: 'comportamento_laterais', nome: 'Comportamento dos Laterais', opcoes: [
                { id: 'amplitude_externa', nome: 'Amplitude por fora', descricao: 'Ultrapassam o ponta pela linha e são eles que dão a largura do time.' },
                { id: 'invertidos', nome: 'Invertidos (por dentro)', descricao: 'Entram no miolo ao lado dos volantes, construindo com superioridade central.' },
                { id: 'presos_base', nome: 'Presos na base', descricao: 'Ficam na linha defensiva formando trinca de zagueiros e protegendo contra o contra-ataque.' },
                { id: 'assimetrico', nome: 'Assimétrico', descricao: 'Um lado sobe para dar amplitude enquanto o outro segura e fecha a linha defensiva.' }
            ]},
            { id: 'mobilidade', nome: 'Mobilidade', opcoes: [
                { id: 'posicional', nome: 'Ataque posicional', descricao: 'Cada jogador fixo na sua zona estrutural, esperando a bola chegar até ele.' },
                { id: 'funcional', nome: 'Ataque funcional', descricao: 'Jogadores abandonam a posição nominal para flutuar e criar superioridade onde a bola está.' }
            ]}
        ]
    },
    {
        id: 'transicao_defensiva', nome: 'Transição Defensiva', momento: 'Ao perder a bola', emoji: '🔻',
        eixos: [
            { id: 'reacao_perda', nome: 'Reação à Perda', opcoes: [
                { id: 'gegenpressing', nome: 'Pressão pós-perda', descricao: 'Agride o portador da bola na hora, tentando recuperá-la em 3 a 5 segundos ainda no campo de ataque.' },
                { id: 'equilibrio_transicao', nome: 'Pressão seletiva', descricao: 'Só quem está perto da bola pressiona; o restante já recompõe as linhas atrás.' },
                { id: 'recomposicao', nome: 'Recomposição', descricao: 'Recua rápido em direção ao próprio gol para reorganizar as linhas e proteger as costas da zaga.' }
            ]}
        ]
    },
    {
        id: 'organizacao_defensiva', nome: 'Organização Defensiva', momento: 'Sem a bola', emoji: '🛡️',
        eixos: [
            { id: 'altura_bloco', nome: 'Altura do Bloco', opcoes: [
                { id: 'alto', nome: 'Bloco alto', descricao: 'Pressiona já na área adversária, encurtando o campo pela frente.' },
                { id: 'medio', nome: 'Bloco médio', descricao: 'Espera no meio-campo para atrair o rival e armar armadilhas de roubada de bola.' },
                { id: 'baixo', nome: 'Bloco baixo', descricao: 'Defende a própria área, cedendo campo e fechando os espaços internos.' }
            ]},
            { id: 'tipo_marcacao', nome: 'Tipo de Marcação', opcoes: [
                { id: 'zonal', nome: 'Zonal', descricao: 'Cada um protege um espaço demarcado e repassa o adversário para o companheiro do setor.' },
                { id: 'individual', nome: 'Encaixe individual', descricao: 'Homem a homem, caçando o adversário pelo campo inteiro (estilo Gasperini/Bielsa).' },
                { id: 'mista', nome: 'Mista', descricao: 'Zonal como base, com encaixe individual em cima dos jogadores-chave do adversário.' }
            ]},
            { id: 'compactacao', nome: 'Compactação', opcoes: [
                { id: 'muito_compacto', nome: 'Muito compacta', descricao: 'Setores espremidos num raio de 25 a 30 metros, negando espaço para o rival girar no meio.' },
                { id: 'compacto', nome: 'Compacta', descricao: 'Linhas próximas, com alguma folga aceitável entre a defesa e o ataque.' },
                { id: 'esticado', nome: 'Esticada', descricao: 'Time alongado, aceitando espaço entre as linhas para manter gente à frente na transição.' }
            ]}
        ]
    },
    {
        id: 'transicao_ofensiva', nome: 'Transição Ofensiva', momento: 'Ao recuperar a bola', emoji: '🔺',
        eixos: [
            { id: 'reacao_recuperacao', nome: 'Reação à Recuperação', opcoes: [
                { id: 'vertical', nome: 'Ataque vertical', descricao: 'Busca o gol em velocidade máxima com 2 ou 3 passes, aproveitando o adversário desorganizado.' },
                { id: 'situacional', nome: 'Situacional', descricao: 'Ataca em velocidade se o campo estiver aberto; senão segura a bola e reorganiza o time.' },
                { id: 'manutencao', nome: 'Manutenção da posse', descricao: 'Passe seguro para trás ou para o lado, acalmando o ritmo e instalando o time no campo de ataque.' }
            ]}
        ]
    }
];

// Índice rápido: eixoId -> { eixo, fase } (evita varrer as 4 fases toda vez).
const _EIXOS_DNA = {};
DNA_TATICO_FASES.forEach(fase => fase.eixos.forEach(eixo => { _EIXOS_DNA[eixo.id] = { eixo: eixo, fase: fase }; }));

function eixoDnaPorId(eixoId) {
    return _EIXOS_DNA[eixoId] ? _EIXOS_DNA[eixoId].eixo : null;
}

function opcaoDnaPorId(eixoId, opcaoId) {
    let eixo = eixoDnaPorId(eixoId);
    if (!eixo) return null;
    return eixo.opcoes.find(o => o.id === opcaoId) || eixo.opcoes[0];
}

// Lista de ids de eixo na ordem em que aparecem — usada pelo formulário do Modo Avançado.
function idsEixosDna() {
    return Object.keys(_EIXOS_DNA);
}

// =====================================================================================
// DNA DE CADA PRESET — cada estilo pronto descrito nas 4 fases, no lugar do resumo por
// posição. São leituras do estilo real que cada preset representa (Klopp, Guardiola, Diniz,
// Simeone...), não uma tradução mecânica dos números da tática.
// =====================================================================================
const DNA_POR_PRESET = {
    'gegenpressing': {
        saida_bola: 'mista', ocupacao_espacos: 'posicional_amplo', comportamento_laterais: 'amplitude_externa', mobilidade: 'funcional',
        reacao_perda: 'gegenpressing',
        altura_bloco: 'alto', tipo_marcacao: 'mista', compactacao: 'muito_compacto',
        reacao_recuperacao: 'vertical'
    },
    'tiki-taka': {
        saida_bola: 'sustentada', ocupacao_espacos: 'posicional_amplo', comportamento_laterais: 'invertidos', mobilidade: 'posicional',
        reacao_perda: 'gegenpressing',
        altura_bloco: 'alto', tipo_marcacao: 'zonal', compactacao: 'muito_compacto',
        reacao_recuperacao: 'manutencao'
    },
    'futebol-relacional': {
        saida_bola: 'sustentada', ocupacao_espacos: 'relacional', comportamento_laterais: 'assimetrico', mobilidade: 'funcional',
        reacao_perda: 'equilibrio_transicao',
        altura_bloco: 'medio', tipo_marcacao: 'zonal', compactacao: 'compacto',
        reacao_recuperacao: 'manutencao'
    },
    'catenaccio': {
        saida_bola: 'direta', ocupacao_espacos: 'misto', comportamento_laterais: 'presos_base', mobilidade: 'posicional',
        reacao_perda: 'recomposicao',
        altura_bloco: 'baixo', tipo_marcacao: 'mista', compactacao: 'muito_compacto',
        reacao_recuperacao: 'vertical'
    },
    'jogo-pelas-pontas': {
        saida_bola: 'mista', ocupacao_espacos: 'posicional_amplo', comportamento_laterais: 'amplitude_externa', mobilidade: 'posicional',
        reacao_perda: 'equilibrio_transicao',
        altura_bloco: 'medio', tipo_marcacao: 'zonal', compactacao: 'compacto',
        reacao_recuperacao: 'vertical'
    },
    'ligacao-direta': {
        saida_bola: 'direta', ocupacao_espacos: 'misto', comportamento_laterais: 'amplitude_externa', mobilidade: 'posicional',
        reacao_perda: 'recomposicao',
        altura_bloco: 'medio', tipo_marcacao: 'zonal', compactacao: 'esticado',
        reacao_recuperacao: 'vertical'
    },
    'transicao-letal': {
        saida_bola: 'direta', ocupacao_espacos: 'misto', comportamento_laterais: 'presos_base', mobilidade: 'funcional',
        reacao_perda: 'recomposicao',
        altura_bloco: 'medio', tipo_marcacao: 'mista', compactacao: 'muito_compacto',
        reacao_recuperacao: 'vertical'
    },
    'futebol-total': {
        saida_bola: 'sustentada', ocupacao_espacos: 'misto', comportamento_laterais: 'amplitude_externa', mobilidade: 'funcional',
        reacao_perda: 'gegenpressing',
        altura_bloco: 'alto', tipo_marcacao: 'mista', compactacao: 'compacto',
        reacao_recuperacao: 'manutencao'
    },
    'pressao-individual': {
        saida_bola: 'mista', ocupacao_espacos: 'misto', comportamento_laterais: 'amplitude_externa', mobilidade: 'funcional',
        reacao_perda: 'gegenpressing',
        altura_bloco: 'alto', tipo_marcacao: 'individual', compactacao: 'esticado',
        reacao_recuperacao: 'vertical'
    },
    'sarriball': {
        saida_bola: 'sustentada', ocupacao_espacos: 'posicional_amplo', comportamento_laterais: 'amplitude_externa', mobilidade: 'posicional',
        reacao_perda: 'gegenpressing',
        altura_bloco: 'alto', tipo_marcacao: 'zonal', compactacao: 'compacto',
        reacao_recuperacao: 'vertical'
    },
    'estacionar-onibus': {
        saida_bola: 'direta', ocupacao_espacos: 'misto', comportamento_laterais: 'presos_base', mobilidade: 'posicional',
        reacao_perda: 'recomposicao',
        altura_bloco: 'baixo', tipo_marcacao: 'zonal', compactacao: 'muito_compacto',
        reacao_recuperacao: 'manutencao'
    }
};

// =====================================================================================
// DNA A PARTIR DE UMA TÁTICA QUALQUER — pros estilos que não têm DNA escrito à mão
// (Camaleão e Personalizado por texto livre, que a IA monta na hora). Assim o painel das 4
// fases aparece em TODO estilo, nunca só nos presets.
// =====================================================================================
function dnaDerivadoDaTatica(tatica) {
    let t = tatica || {};
    let abordagem = (typeof t.abordagemDefensiva === 'number') ? t.abordagemDefensiva : 50;
    let armacao = t.estiloArmacao || 'equilibrado';
    let predef = t.predefinicao || 'padrao';
    let funcoes = t.funcoesPorRoleSugeridas || t.funcoesPorRole || {};

    // Comportamento dos laterais: lido direto das funções realmente atribuídas às laterais.
    let funcoesLaterais = Object.keys(funcoes)
        .filter(role => (typeof grupoFuncaoDoRole === 'function') && grupoFuncaoDoRole(role) === 'lateral')
        .map(role => funcoes[role].funcao);
    let classificarLateral = (f) => {
        if (f === 'lateral-invertido' || f === 'ala-invertido') return 'invertidos';
        if (f === 'ala-atacante' || f === 'ala') return 'amplitude_externa';
        return 'presos_base';
    };
    let classesLaterais = funcoesLaterais.map(classificarLateral);
    let comportamentoLaterais = 'amplitude_externa';
    if (classesLaterais.length) {
        let unicas = classesLaterais.filter((v, i, arr) => arr.indexOf(v) === i);
        comportamentoLaterais = unicas.length > 1 ? 'assimetrico' : unicas[0];
    }

    let temFuncaoFlutuante = Object.keys(funcoes).some(role => {
        let f = funcoes[role].funcao;
        return f === 'armador' || f === 'falso-9' || f === 'atacante-sombra' || f === 'camisa-10-classico';
    });

    return {
        saida_bola: armacao === 'passe-curto' ? 'sustentada' : (armacao === 'contra-ataque' ? 'direta' : 'mista'),
        ocupacao_espacos: (predef === 'jogadas-pelas-pontas' || predef === 'posse-de-bola') ? 'posicional_amplo' : 'misto',
        comportamento_laterais: comportamentoLaterais,
        mobilidade: temFuncaoFlutuante ? 'funcional' : 'posicional',
        reacao_perda: abordagem >= 75 ? 'gegenpressing' : (abordagem <= 40 ? 'recomposicao' : 'equilibrio_transicao'),
        altura_bloco: abordagem >= 61 ? 'alto' : (abordagem <= 30 ? 'baixo' : 'medio'),
        tipo_marcacao: predef === 'pressao-alta' ? 'mista' : 'zonal',
        compactacao: (predef === 'retranca-total' || abordagem <= 30) ? 'muito_compacto' : (predef === 'ligacao-direta' ? 'esticado' : 'compacto'),
        reacao_recuperacao: armacao === 'contra-ataque' ? 'vertical' : (armacao === 'passe-curto' ? 'manutencao' : 'situacional')
    };
}

// Ponto de entrada da tela: dado o bloco `taticas` do save (ou um relatório recém-gerado),
// devolve o DNA que deve ser exibido — do preset, do Modo Avançado ou derivado da tática.
function dnaDoEstiloSalvo(t) {
    if (!t) return null;
    let origem = t.estiloJogoSelecionado;
    if (origem && origem.tipo === 'dna-avancado' && origem.dna) return origem.dna;
    if (origem && origem.tipo === 'preset' && typeof PLAYSTYLE_PRESETS !== 'undefined') {
        let preset = PLAYSTYLE_PRESETS.find(p => p.nome === origem.rotulo);
        if (preset && DNA_POR_PRESET[preset.id]) return DNA_POR_PRESET[preset.id];
    }
    return dnaDerivadoDaTatica(t);
}

// =====================================================================================
// DNA -> CONFIGURAÇÃO REAL DO JOGO (Modo Avançado do estilo Personalizado)
// Tradução determinística: nada de IA, nada fora dos catálogos reais. corrigirTatica() ainda
// roda por cima como rede de segurança contra combinações proibidas pela predefinição.
// =====================================================================================
function _predefinicaoDoDna(dna) {
    if (dna.reacao_perda === 'gegenpressing' && dna.altura_bloco === 'alto') return 'pressao-alta';
    if (dna.altura_bloco === 'baixo') return 'retranca-total';
    if (dna.saida_bola === 'direta' && dna.reacao_recuperacao === 'vertical') return 'contra-ataque';
    if (dna.saida_bola === 'direta') return 'ligacao-direta';
    if (dna.saida_bola === 'sustentada' && dna.ocupacao_espacos !== 'relacional') return 'posse-de-bola';
    if (dna.ocupacao_espacos === 'posicional_amplo' && dna.comportamento_laterais === 'amplitude_externa') return 'jogadas-pelas-pontas';
    return 'padrao';
}

function _armacaoDoDna(dna) {
    if (dna.saida_bola === 'sustentada') return 'passe-curto';
    if (dna.saida_bola === 'direta') return 'contra-ataque';
    return dna.reacao_recuperacao === 'vertical' ? 'contra-ataque' : 'equilibrado';
}

function _abordagemDoDna(dna) {
    let base = dna.altura_bloco === 'alto' ? 80 : (dna.altura_bloco === 'baixo' ? 22 : 50);
    if (dna.reacao_perda === 'gegenpressing') base += 10;
    if (dna.reacao_perda === 'recomposicao') base -= 8;
    if (dna.compactacao === 'esticado') base -= 3;
    return Math.max(5, Math.min(98, base));
}

// Matriz de função por grupo montada a partir das escolhas do treinador. Cada grupo recebe uma
// LISTA (não um único item) sempre que o estilo admite variação entre os dois lados — é isso
// que faz os dois laterais deixarem de receber sempre a mesma instrução.
function funcoesPorGrupoDoDna(dna) {
    let laterais;
    if (dna.comportamento_laterais === 'invertidos') laterais = [{ funcao: 'lateral-invertido', foco: 'equilibrado' }, { funcao: 'ala-invertido', foco: 'armacao' }];
    else if (dna.comportamento_laterais === 'presos_base') laterais = [{ funcao: 'lateral', foco: 'defesa' }];
    else if (dna.comportamento_laterais === 'assimetrico') laterais = [{ funcao: 'ala-atacante', foco: 'ataque' }, { funcao: 'lateral', foco: 'defesa' }];
    else laterais = [{ funcao: 'ala-atacante', foco: 'ataque' }, { funcao: 'ala', foco: 'apoio' }];

    let zagueiros;
    if (dna.tipo_marcacao === 'individual') zagueiros = [{ funcao: 'marcador', foco: 'combatividade' }, { funcao: 'defesa', foco: 'defesa' }];
    else if (dna.saida_bola === 'sustentada') zagueiros = [{ funcao: 'sai-jogando', foco: 'armacao' }, { funcao: 'defesa', foco: 'equilibrado' }];
    else if (dna.comportamento_laterais === 'presos_base') zagueiros = [{ funcao: 'defesa', foco: 'defesa' }, { funcao: 'zagueiro-aberto', foco: 'defesa' }];
    else zagueiros = [{ funcao: 'defesa', foco: 'defesa' }, { funcao: 'marcador', foco: 'combatividade' }];

    let volantes;
    if (dna.comportamento_laterais === 'invertidos' || dna.saida_bola === 'sustentada') volantes = [{ funcao: 'armador-recuado', foco: 'armacao' }, { funcao: 'contencao', foco: 'defesa' }];
    else if (dna.reacao_perda === 'gegenpressing') volantes = [{ funcao: 'contencao', foco: 'roubada-de-bola' }, { funcao: 'volante-oportunista', foco: 'equilibrado' }];
    else if (dna.altura_bloco === 'baixo') volantes = [{ funcao: 'contencao', foco: 'defesa' }, { funcao: 'zaga', foco: 'defesa' }];
    else volantes = [{ funcao: 'contencao', foco: 'defesa' }, { funcao: 'armador-recuado', foco: 'armacao' }];

    let meiosCentrais = dna.mobilidade === 'funcional'
        ? [{ funcao: 'armador', foco: 'deslocamento' }, { funcao: 'box-to-box', foco: 'equilibrado' }]
        : [{ funcao: 'box-to-box', foco: 'equilibrado' }, { funcao: 'armador-recuado', foco: 'armacao' }];

    let meiasAtacantes;
    if (dna.reacao_recuperacao === 'vertical') meiasAtacantes = [{ funcao: 'atacante-sombra', foco: 'ataque' }];
    else if (dna.reacao_recuperacao === 'manutencao') meiasAtacantes = [{ funcao: 'camisa-10-classico', foco: 'versatil' }];
    else meiasAtacantes = [{ funcao: 'armador', foco: 'deslocamento' }];

    let porFora;
    if (dna.ocupacao_espacos === 'posicional_amplo') porFora = { meia_lateral: [{ funcao: 'ala', foco: 'ataque' }], ponta: [{ funcao: 'ala', foco: 'ataque' }, { funcao: 'corta-pra-dentro', foco: 'ataque' }] };
    else if (dna.ocupacao_espacos === 'relacional') porFora = { meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }], ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }, { funcao: 'corta-pra-dentro', foco: 'deslocamento' }] };
    else porFora = { meia_lateral: [{ funcao: 'meia-aberto', foco: 'apoio' }, { funcao: 'corta-pra-dentro', foco: 'ataque' }], ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }, { funcao: 'ala', foco: 'equilibrado' }] };

    let atacantes;
    if (dna.saida_bola === 'direta') atacantes = [{ funcao: 'pivo', foco: 'ataque' }, { funcao: 'oportunista', foco: 'ataque' }];
    else if (dna.saida_bola === 'sustentada' && dna.ocupacao_espacos === 'relacional') atacantes = [{ funcao: 'falso-9', foco: 'armacao' }];
    else if (dna.reacao_recuperacao === 'vertical') atacantes = [{ funcao: 'oportunista', foco: 'ataque' }, { funcao: 'centroavante', foco: 'ataque' }];
    else atacantes = [{ funcao: 'centroavante', foco: 'ataque' }, { funcao: 'falso-9', foco: 'armacao' }];

    let goleiro;
    if (dna.saida_bola === 'sustentada') goleiro = [{ funcao: 'gl-sai-jogando', foco: 'armacao' }];
    else if (dna.altura_bloco === 'alto') goleiro = [{ funcao: 'goleiro-libero', foco: 'equilibrado' }];
    else goleiro = [{ funcao: 'goleiro', foco: 'defesa' }];

    return {
        goleiro: goleiro,
        zagueiro: zagueiros,
        lateral: laterais,
        volante: volantes,
        meio_campo_central: meiosCentrais,
        meia_atacante: meiasAtacantes,
        meia_lateral: porFora.meia_lateral,
        ponta: porFora.ponta,
        atacante: atacantes
    };
}

// Pacote tático completo (predefinição/armação/linha/matriz de funções) a partir do DNA.
function dnaParaPacoteTatico(dna) {
    return {
        predefinicao: _predefinicaoDoDna(dna),
        estiloArmacao: _armacaoDoDna(dna),
        abordagemDefensiva: _abordagemDoDna(dna),
        funcoesPorGrupo: funcoesPorGrupoDoDna(dna)
    };
}

// DNA padrão do formulário do Modo Avançado (um time equilibrado de verdade, nada extremo).
function dnaPadrao() {
    return {
        saida_bola: 'mista', ocupacao_espacos: 'misto', comportamento_laterais: 'amplitude_externa', mobilidade: 'posicional',
        reacao_perda: 'equilibrio_transicao',
        altura_bloco: 'medio', tipo_marcacao: 'zonal', compactacao: 'compacto',
        reacao_recuperacao: 'situacional'
    };
}

// Normaliza qualquer DNA vindo de fora (save antigo, formulário incompleto) — todo eixo
// ausente ou com id inválido cai na opção padrão daquele eixo.
function normalizarDna(dna) {
    let base = dnaPadrao();
    let saida = {};
    idsEixosDna().forEach(eixoId => {
        let escolhido = dna && dna[eixoId];
        let valida = escolhido && eixoDnaPorId(eixoId).opcoes.some(o => o.id === escolhido);
        saida[eixoId] = valida ? escolhido : base[eixoId];
    });
    return saida;
}

// =====================================================================================
// RENDERIZAÇÃO — o painel das 4 fases que substitui o antigo resumo por posição.
// =====================================================================================
function renderizarDnaTatico(dna) {
    if (!dna) return '';
    let normalizado = normalizarDna(dna);
    let fasesHtml = DNA_TATICO_FASES.map(fase => {
        let eixosHtml = fase.eixos.map(eixo => {
            let opcao = opcaoDnaPorId(eixo.id, normalizado[eixo.id]);
            return `<div class="dna-eixo">
                <div class="dna-eixo-topo"><span class="dna-eixo-nome">${eixo.nome}</span><strong class="dna-eixo-valor">${opcao.nome}</strong></div>
                <p class="dna-eixo-desc">${opcao.descricao}</p>
            </div>`;
        }).join('');
        return `<div class="dna-fase">
            <div class="dna-fase-titulo">${fase.emoji} ${fase.nome}<span>${fase.momento}</span></div>
            ${eixosHtml}
        </div>`;
    }).join('');
    return `<div class="dna-grid">${fasesHtml}</div>`;
}

// Formulário do Modo Avançado: um <select> por eixo, agrupado pelas 4 fases.
function renderizarFormularioDnaAvancado(prefixo, dnaAtual) {
    let normalizado = normalizarDna(dnaAtual);
    return DNA_TATICO_FASES.map(fase => {
        let camposHtml = fase.eixos.map(eixo => {
            let opcoes = eixo.opcoes.map(o => `<option value="${o.id}" ${normalizado[eixo.id] === o.id ? 'selected' : ''}>${o.nome}</option>`).join('');
            let descAtual = opcaoDnaPorId(eixo.id, normalizado[eixo.id]).descricao;
            return `<div class="linha-form">
                <label>${eixo.nome}</label>
                <select id="${prefixo}dna-${eixo.id}" onchange="atualizarDescricaoEixoDna('${prefixo}', '${eixo.id}')">${opcoes}</select>
                <p class="dna-eixo-desc" id="${prefixo}dna-desc-${eixo.id}">${descAtual}</p>
            </div>`;
        }).join('');
        return `<div class="dna-fase dna-fase-form">
            <div class="dna-fase-titulo">${fase.emoji} ${fase.nome}<span>${fase.momento}</span></div>
            ${camposHtml}
        </div>`;
    }).join('');
}

// Mantém a explicação embaixo de cada select sempre coerente com a opção escolhida.
function atualizarDescricaoEixoDna(prefixo, eixoId) {
    let select = document.getElementById(`${prefixo}dna-${eixoId}`);
    let alvo = document.getElementById(`${prefixo}dna-desc-${eixoId}`);
    if (!select || !alvo) return;
    alvo.innerText = opcaoDnaPorId(eixoId, select.value).descricao;
}

// Lê o formulário inteiro de volta pra um objeto de DNA.
function lerFormularioDnaAvancado(prefixo) {
    let dna = {};
    idsEixosDna().forEach(eixoId => {
        let select = document.getElementById(`${prefixo}dna-${eixoId}`);
        if (select) dna[eixoId] = select.value;
    });
    return normalizarDna(dna);
}

// Resumo de uma linha ("Bloco alto · Pressão pós-perda · Ataque vertical") pra usar como
// rótulo curto do estilo em telas onde não cabe o painel inteiro.
function resumoCurtoDna(dna) {
    let n = normalizarDna(dna);
    return [
        opcaoDnaPorId('altura_bloco', n.altura_bloco).nome,
        opcaoDnaPorId('reacao_perda', n.reacao_perda).nome,
        opcaoDnaPorId('reacao_recuperacao', n.reacao_recuperacao).nome
    ].join(' · ');
}
