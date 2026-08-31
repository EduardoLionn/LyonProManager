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
        altura_bloco: 'alto', tipo_marcacao: 'zonal', compactacao: 'compacto',
        reacao_recuperacao: 'manutencao'
    },
    'catenaccio': {
        saida_bola: 'direta', ocupacao_espacos: 'misto', comportamento_laterais: 'assimetrico', mobilidade: 'posicional',
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
        saida_bola: 'direta', ocupacao_espacos: 'misto', comportamento_laterais: 'assimetrico', mobilidade: 'posicional',
        reacao_perda: 'recomposicao',
        altura_bloco: 'medio', tipo_marcacao: 'zonal', compactacao: 'esticado',
        reacao_recuperacao: 'vertical'
    },
    'transicao-letal': {
        saida_bola: 'direta', ocupacao_espacos: 'misto', comportamento_laterais: 'assimetrico', mobilidade: 'funcional',
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

    // Comportamento dos laterais: lido das funções realmente atribuídas — levando o FOCO em
    // conta, porque ele muda o papel por completo. "Lateral"/Defesa é um terceiro zagueiro (o
    // próprio jogo diz que ele entra pra formar linha de três com a bola); o mesmo "Lateral" com
    // foco Equilibrado/Versátil já sobe e dá largura. Em formações sem lateral de origem (linha
    // de três), quem dá a largura é o "Meia Aberto" — que é um ala, quase um lateral —, então
    // esse grupo entra na leitura quando não há laterais em campo.
    let rolesDoGrupo = (grupoAlvo) => Object.keys(funcoes)
        .filter(role => (typeof grupoFuncaoDoRole === 'function') && grupoFuncaoDoRole(role) === grupoAlvo)
        .map(role => funcoes[role]);
    let escolhasLaterais = rolesDoGrupo('lateral');
    if (!escolhasLaterais.length) escolhasLaterais = rolesDoGrupo('meia_lateral');

    let classificarLateral = (escolha) => {
        let f = escolha.funcao, foco = escolha.foco;
        if (f === 'lateral-invertido' || f === 'ala-invertido') return 'invertidos';
        if (f === 'lateral') return foco === 'defesa' ? 'presos_base' : 'amplitude_externa';
        if (f === 'meia-aberto') return foco === 'defesa' ? 'presos_base' : 'amplitude_externa';
        if (f === 'ala-atacante' || f === 'ala' || f === 'armador-aberto' || f === 'corta-pra-dentro') return 'amplitude_externa';
        return 'presos_base';
    };
    let classesLaterais = escolhasLaterais.map(classificarLateral);
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
// DNA -> CONFIGURAÇÃO REAL DO JOGO
// =====================================================================================
// Pedido do treinador: "os planos devem atuar diretamente nas funções dos jogadores, pra isso
// crie regras bem claras pra todos os estilos de jogos e planos... os planos traduzem a função
// de cada jogador em campo... e a forma q defende e ataca das predefinições táticas, estilo de
// armação e altura da linha".
//
// Então a tradução deixou de ser uma cadeia de ifs escondida e virou uma TABELA DE REGRAS
// explícita: pra cada grupo de posição, uma lista ordenada de regras, cada uma dizendo
//   · `se`     — a combinação de eixos do DNA que ativa a regra (primeira que casar, ganha);
//   · `eixos`  — quais planos mandam nela (é o que a tela usa pra mostrar "este plano comanda X");
//   · `porque` — a frase de treinador que explica a escolha, mostrada na própria tela;
//   · `funcoes`— a lista de função+foco. Mais de um item = os lados do campo recebem
//                instruções DIFERENTES (é assim que "Assimétrico" faz um lateral virar ala e o
//                outro virar terceiro zagueiro).
// Nada aqui inventa nome: todo par função/foco existe em GRUPOS_FUNCAO_EA (js/funcoes-ea.js).
// =====================================================================================

// Casa um objeto {eixo: valor} ou {eixo: [valores]} contra o DNA. `null` = regra coringa (a
// última de cada lista, que fecha o leque e garante que todo grupo sempre tem resposta).
function _casaDna(dna, condicao) {
    if (!condicao) return true;
    return Object.keys(condicao).every(eixo => {
        let esperado = condicao[eixo];
        return Array.isArray(esperado) ? esperado.indexOf(dna[eixo]) !== -1 : dna[eixo] === esperado;
    });
}

// Atalho de leitura da tabela: _papel('ala-atacante', 'ataque') = a função + o foco dela.
const _papel = (funcao, foco) => ({ funcao: funcao, foco: foco });

const REGRAS_FUNCAO_POR_DNA = {
    // -------------------------------------------------------------------------------------
    goleiro: [
        { se: { saida_bola: 'sustentada' }, eixos: ['saida_bola'],
          porque: 'O time constrói desde trás, então o goleiro é a primeira opção de passe.',
          funcoes: [_papel('gl-sai-jogando', 'armacao')] },
        { se: { altura_bloco: 'alto' }, eixos: ['altura_bloco'],
          porque: 'Com a linha lá na frente, alguém precisa cobrir as costas da zaga: o goleiro vira líbero.',
          funcoes: [_papel('goleiro-libero', 'equilibrado')] },
        { se: null, eixos: ['altura_bloco'],
          porque: 'Bloco atrás e saída sem risco: goleiro colado na linha, focado em defender.',
          funcoes: [_papel('goleiro', 'defesa')] }
    ],
    // -------------------------------------------------------------------------------------
    zagueiro: [
        { se: { tipo_marcacao: 'individual' }, eixos: ['tipo_marcacao'],
          porque: 'Marcação homem a homem: o zagueiro sai da linha pra caçar o atacante antes que ele receba.',
          funcoes: [_papel('marcador', 'combatividade'), _papel('defesa', 'defesa')] },
        { se: { saida_bola: 'sustentada', mobilidade: 'funcional' }, eixos: ['saida_bola', 'mobilidade'],
          porque: 'Saída sustentada com o time trocando de posição: o zagueiro entra na roda de armação.',
          funcoes: [_papel('sai-jogando', 'armacao'), _papel('defesa', 'equilibrado')] },
        { se: { saida_bola: 'sustentada' }, eixos: ['saida_bola'],
          porque: 'Sai jogando de trás, mas sem abandonar a estrutura: constrói e volta pra linha.',
          funcoes: [_papel('sai-jogando', 'defesa'), _papel('defesa', 'equilibrado')] },
        { se: { reacao_perda: 'gegenpressing' }, eixos: ['reacao_perda'],
          porque: 'Pra sufocar logo após a perda, a zaga sobe junto e briga a bola adiantada.',
          funcoes: [_papel('marcador', 'combatividade'), _papel('defesa', 'equilibrado')] },
        { se: { altura_bloco: 'baixo' }, eixos: ['altura_bloco'],
          porque: 'Bloco baixo: zagueiro fixo na linha, sem se adiantar pra não abrir corredor.',
          funcoes: [_papel('defesa', 'defesa')] },
        { se: null, eixos: ['altura_bloco'],
          porque: 'Dupla clássica: um segura a linha e o outro pode se adiantar pra fechar o ataque.',
          funcoes: [_papel('defesa', 'defesa'), _papel('defesa', 'equilibrado')] }
    ],
    // -------------------------------------------------------------------------------------
    // O plano "Comportamento dos Laterais" manda aqui — é literalmente ele que escolhe a função.
    // A altura do bloco entra como freio: com o time defendendo perto da própria área, ninguém
    // solta os dois laterais no ataque (ver _freioDeBlocoBaixo, logo abaixo).
    lateral: [
        { se: { comportamento_laterais: 'invertidos' }, eixos: ['comportamento_laterais'],
          porque: 'Os laterais entram no miolo ao lado dos volantes pra construir com superioridade central.',
          funcoes: [_papel('lateral-invertido', 'equilibrado'), _papel('ala-invertido', 'armacao')] },
        { se: { comportamento_laterais: 'presos_base' }, eixos: ['comportamento_laterais'],
          porque: 'Presos na base: os dois viram zagueiros de fora, fechando a linha contra o contra-ataque.',
          funcoes: [_papel('lateral', 'defesa')] },
        { se: { comportamento_laterais: 'assimetrico' }, eixos: ['comportamento_laterais'],
          porque: 'Um lado sobe como ala e dá a largura; o outro fica e forma linha de três com a zaga.',
          funcoes: [_papel('ala-atacante', 'ataque'), _papel('lateral', 'defesa')] },
        { se: null, eixos: ['comportamento_laterais'],
          porque: 'São os laterais que dão a largura: ultrapassam o ponta pela linha de fundo.',
          funcoes: [_papel('ala-atacante', 'ataque'), _papel('ala', 'apoio')] }
    ],
    // -------------------------------------------------------------------------------------
    volante: [
        { se: { altura_bloco: 'baixo', compactacao: 'muito_compacto', reacao_recuperacao: 'manutencao' },
          eixos: ['altura_bloco', 'compactacao', 'reacao_recuperacao'],
          porque: 'Barreira absoluta: o volante joga praticamente como um terceiro zagueiro à frente da área.',
          funcoes: [_papel('zaga', 'defesa'), _papel('contencao', 'defesa')] },
        { se: { altura_bloco: 'baixo' }, eixos: ['altura_bloco'],
          porque: 'Bloco baixo: a função do volante é tapar a entrada da área, não sair jogando.',
          funcoes: [_papel('contencao', 'defesa'), _papel('zaga', 'defesa')] },
        { se: { saida_bola: 'sustentada', mobilidade: 'funcional' }, eixos: ['saida_bola', 'mobilidade'],
          porque: 'Ele é o pivô da construção e ainda se desloca pra receber entre as linhas.',
          funcoes: [_papel('armador-recuado', 'deslocamento'), _papel('contencao', 'defesa')] },
        { se: { saida_bola: 'sustentada' }, eixos: ['saida_bola'],
          porque: 'Toda a saída passa por ele: recebe da zaga e vira o jogo sem sair da posição.',
          funcoes: [_papel('armador-recuado', 'armacao'), _papel('contencao', 'defesa')] },
        { se: { reacao_perda: 'gegenpressing' }, eixos: ['reacao_perda'],
          porque: 'É ele quem sustenta a pressão pós-perda: mata a primeira ligação do adversário.',
          funcoes: [_papel('contencao', 'roubada-de-bola'), _papel('volante-oportunista', 'equilibrado')] },
        { se: { tipo_marcacao: 'individual' }, eixos: ['tipo_marcacao'],
          porque: 'Encaixe individual: o volante persegue o homem de referência do meio adversário.',
          funcoes: [_papel('contencao', 'roubada-de-bola'), _papel('volante-oportunista', 'equilibrado')] },
        { se: { reacao_recuperacao: 'vertical', altura_bloco: 'medio' }, eixos: ['reacao_recuperacao', 'altura_bloco'],
          porque: 'Rouba no meio e já se desloca pra dar a primeira ligação do contra-ataque.',
          funcoes: [_papel('contencao', 'deslocamento'), _papel('armador-recuado', 'armacao')] },
        { se: { compactacao: 'muito_compacto' }, eixos: ['compactacao'],
          porque: 'Linhas muito coladas: o volante fica fixo tapando o buraco entre a zaga e o meio.',
          funcoes: [_papel('contencao', 'defesa'), _papel('zaga', 'defesa')] },
        { se: { compactacao: 'esticado' }, eixos: ['compactacao'],
          porque: 'Time alongado: sobra campo pro volante conduzir e lançar na transição.',
          funcoes: [_papel('contencao', 'deslocamento'), _papel('armador-recuado', 'armacao')] },
        { se: null, eixos: ['altura_bloco'],
          porque: 'Equilíbrio: um protege a zaga, o outro ajuda a girar a bola.',
          funcoes: [_papel('contencao', 'defesa'), _papel('armador-recuado', 'armacao')] }
    ],
    // -------------------------------------------------------------------------------------
    meio_campo_central: [
        { se: { reacao_perda: 'gegenpressing', altura_bloco: 'alto', saida_bola: ['mista', 'direta'] },
          eixos: ['reacao_perda', 'altura_bloco'],
          porque: 'Meio-campo de pressão: os dois caçam a bola no campo do adversário.',
          funcoes: [_papel('contencao', 'roubada-de-bola'), _papel('box-to-box', 'roubada-de-bola')] },
        { se: { saida_bola: 'sustentada' }, eixos: ['saida_bola'],
          porque: 'Com posse, o meio-campo é quem organiza: um armador conduz e o outro liga as linhas.',
          funcoes: [_papel('armador', 'deslocamento'), _papel('box-to-box', 'equilibrado')] },
        { se: { reacao_recuperacao: 'vertical', altura_bloco: 'medio', compactacao: 'muito_compacto' },
          eixos: ['reacao_recuperacao', 'compactacao'],
          porque: 'Armadilha no meio: fecha o corredor central e transforma a roubada em ataque.',
          funcoes: [_papel('contencao', 'roubada-de-bola'), _papel('box-to-box', 'equilibrado')] },
        { se: { mobilidade: 'funcional' }, eixos: ['mobilidade'],
          porque: 'Mobilidade total: o meia abandona a zona pra aparecer onde a bola está.',
          funcoes: [_papel('armador', 'deslocamento'), _papel('box-to-box', 'equilibrado')] },
        { se: null, eixos: ['mobilidade'],
          porque: 'Cada um na sua zona: um chega na área, o outro segura a base do meio.',
          funcoes: [_papel('box-to-box', 'equilibrado'), _papel('armador-recuado', 'armacao')] }
    ],
    // -------------------------------------------------------------------------------------
    meia_atacante: [
        { se: { altura_bloco: 'baixo' }, eixos: ['altura_bloco'],
          porque: 'Time atrás: o meia é o primeiro homem de apoio, não um segundo atacante.',
          funcoes: [_papel('armador', 'equilibrado')] },
        { se: { saida_bola: 'sustentada', mobilidade: 'funcional' }, eixos: ['saida_bola', 'mobilidade'],
          porque: 'Ele é o cérebro que flutua entre as linhas procurando o espaço livre.',
          funcoes: [_papel('armador', 'deslocamento')] },
        { se: { saida_bola: 'sustentada' }, eixos: ['saida_bola'],
          porque: 'Camisa 10 clássico: recebe de frente pro gol e decide a última bola.',
          funcoes: [_papel('camisa-10-classico', 'ataque')] },
        { se: { reacao_recuperacao: 'vertical', compactacao: ['muito_compacto', 'compacto'] },
          eixos: ['reacao_recuperacao', 'compactacao'],
          porque: 'Na transição ele ataca as costas da zaga em corrida — é o homem da facada.',
          funcoes: [_papel('atacante-sombra', 'ataque')] },
        { se: null, eixos: ['reacao_recuperacao'],
          porque: 'Meia de ligação: aparece pra receber e dar sequência à jogada.',
          funcoes: [_papel('armador', 'deslocamento')] }
    ],
    // -------------------------------------------------------------------------------------
    // Ala das formações com linha de três (o "Meia Aberto" é um ala, quase um lateral).
    meia_lateral: [
        { se: { altura_bloco: 'baixo', reacao_recuperacao: 'vertical' }, eixos: ['altura_bloco', 'reacao_recuperacao'],
          porque: 'Ala de bloco baixo que vira arma no contra-ataque: defende na linha de cinco e explode pelo lado.',
          funcoes: [_papel('ala', 'equilibrado'), _papel('meia-aberto', 'defesa')] },
        { se: { altura_bloco: 'baixo' }, eixos: ['altura_bloco'],
          porque: 'Ala virado pra trás: a prioridade é fechar o corredor, não atacar.',
          funcoes: [_papel('meia-aberto', 'defesa'), _papel('ala', 'equilibrado')] },
        { se: { ocupacao_espacos: 'relacional' }, eixos: ['ocupacao_espacos'],
          porque: 'Jogo relacional: o homem do lado entra pra tabelar perto da bola, não pra esticar o campo.',
          funcoes: [_papel('armador-aberto', 'armacao'), _papel('meia-aberto', 'apoio')] },
        { se: { saida_bola: 'sustentada', mobilidade: 'funcional' }, eixos: ['saida_bola', 'mobilidade'],
          porque: 'Ele vem buscar o jogo por fora e participa da construção como um meia a mais.',
          funcoes: [_papel('armador-aberto', 'armacao'), _papel('meia-aberto', 'apoio')] },
        { se: { tipo_marcacao: 'individual' }, eixos: ['tipo_marcacao'],
          porque: 'Encaixe individual: o ala acompanha o lateral adversário por todo o corredor.',
          funcoes: [_papel('meia-aberto', 'apoio'), _papel('ala', 'equilibrado')] },
        { se: { mobilidade: 'funcional' }, eixos: ['mobilidade', 'comportamento_laterais'],
          porque: 'Com o time trocando de posição, ele corta pra dentro e ataca o meio-espaço.',
          funcoes: [_papel('corta-pra-dentro', 'ataque'), _papel('ala', 'equilibrado')] },
        { se: { saida_bola: 'sustentada', comportamento_laterais: ['amplitude_externa', 'assimetrico'] },
          eixos: ['saida_bola', 'comportamento_laterais'],
          porque: 'A largura já vem do lateral, então o homem do lado ataca por dentro.',
          funcoes: [_papel('corta-pra-dentro', 'ataque'), _papel('ala', 'equilibrado')] },
        { se: { comportamento_laterais: ['invertidos', 'presos_base'] }, eixos: ['comportamento_laterais'],
          porque: 'Como o lateral não dá largura, é o ala quem fica colado na linha.',
          funcoes: [_papel('ala', 'ataque'), _papel('meia-aberto', 'apoio')] },
        { se: null, eixos: ['comportamento_laterais'],
          porque: 'Ala de ida e volta: sobe pra apoiar e volta pra compor a linha.',
          funcoes: [_papel('ala', 'equilibrado'), _papel('corta-pra-dentro', 'ataque')] }
    ],
    // -------------------------------------------------------------------------------------
    ponta: [
        { se: { ocupacao_espacos: 'relacional' }, eixos: ['ocupacao_espacos'],
          porque: 'Jogo relacional: o ponta fecha pra dentro e vira mais um armador perto da bola.',
          funcoes: [_papel('armador-aberto', 'armacao'), _papel('corta-pra-dentro', 'deslocamento')] },
        { se: { saida_bola: 'sustentada', mobilidade: 'funcional' }, eixos: ['saida_bola', 'mobilidade'],
          porque: 'Ponta que vem buscar o jogo: participa da construção em vez de esperar na ponta.',
          funcoes: [_papel('armador-aberto', 'armacao'), _papel('ala', 'equilibrado')] },
        { se: { altura_bloco: 'baixo' }, eixos: ['altura_bloco'],
          porque: 'Com o time atrás, o ponta é o primeiro defensor do corredor e só depois atacante.',
          funcoes: [_papel('ala', 'equilibrado'), _papel('corta-pra-dentro', 'ataque')] },
        { se: { mobilidade: 'funcional' }, eixos: ['mobilidade', 'comportamento_laterais'],
          porque: 'Ponta invertido: corta pra dentro procurando o gol enquanto o lateral abre por fora.',
          funcoes: [_papel('corta-pra-dentro', 'ataque'), _papel('ala', 'ataque')] },
        { se: { saida_bola: 'sustentada', comportamento_laterais: ['amplitude_externa', 'assimetrico'] },
          eixos: ['saida_bola', 'comportamento_laterais'],
          porque: 'O lateral segura a linha lateral, então o ponta entra no meio-espaço.',
          funcoes: [_papel('corta-pra-dentro', 'ataque'), _papel('ala', 'equilibrado')] },
        { se: { comportamento_laterais: ['invertidos', 'presos_base'] }, eixos: ['comportamento_laterais'],
          porque: 'Sem lateral por fora, é o ponta quem fica colado na linha esticando a defesa.',
          funcoes: [_papel('ala', 'equilibrado'), _papel('corta-pra-dentro', 'ataque')] },
        { se: { ocupacao_espacos: 'posicional_amplo' }, eixos: ['ocupacao_espacos'],
          porque: 'Jogo de posição amplo: o ponta pisa na linha de cal pra esticar a defesa adversária.',
          funcoes: [_papel('ala', 'ataque'), _papel('corta-pra-dentro', 'ataque')] },
        { se: null, eixos: ['ocupacao_espacos'],
          porque: 'Ponta de encarar: recebe de frente e ataca o espaço por dentro.',
          funcoes: [_papel('corta-pra-dentro', 'ataque'), _papel('ala', 'equilibrado')] }
    ],
    // -------------------------------------------------------------------------------------
    atacante: [
        { se: { saida_bola: 'direta', reacao_recuperacao: 'vertical', compactacao: 'muito_compacto', altura_bloco: ['medio', 'alto'] },
          eixos: ['saida_bola', 'reacao_recuperacao'],
          porque: 'Atacante de transição: vive de atacar as costas da zaga assim que a bola é roubada.',
          funcoes: [_papel('oportunista', 'ataque'), _papel('pivo', 'ataque')] },
        { se: { saida_bola: 'direta', altura_bloco: 'baixo' }, eixos: ['saida_bola', 'altura_bloco'],
          porque: 'É o ponto de apoio do alívio: segura a bola de costas e espera a equipe subir.',
          funcoes: [_papel('pivo', 'com-abertura'), _papel('oportunista', 'ataque')] },
        { se: { saida_bola: 'direta' }, eixos: ['saida_bola'],
          porque: 'Ligação direta: o pivô briga a primeira bola e o parceiro ataca a sobra.',
          funcoes: [_papel('pivo', 'equilibrado'), _papel('oportunista', 'ataque')] },
        { se: { ocupacao_espacos: 'relacional' }, eixos: ['ocupacao_espacos'],
          porque: 'Centroavante versátil: ora fixa a zaga, ora recua pra participar da tabela.',
          funcoes: [_papel('centroavante', 'versatil'), _papel('falso-9', 'armacao')] },
        { se: { saida_bola: 'sustentada', mobilidade: 'funcional' }, eixos: ['saida_bola', 'mobilidade'],
          porque: 'Falso 9: sai da área pra criar o buraco onde os meias vão atacar.',
          funcoes: [_papel('falso-9', 'armacao'), _papel('centroavante', 'apoio')] },
        { se: { saida_bola: 'sustentada', comportamento_laterais: 'invertidos' }, eixos: ['saida_bola', 'comportamento_laterais'],
          porque: 'Com o time inteiro por dentro, o 9 recua e abre a linha pros meias chegarem.',
          funcoes: [_papel('falso-9', 'armacao'), _papel('centroavante', 'ataque')] },
        { se: { tipo_marcacao: 'individual' }, eixos: ['tipo_marcacao'],
          porque: 'A pressão começa nele: fecha a saída do zagueiro e ainda apoia a posse.',
          funcoes: [_papel('centroavante', 'apoio'), _papel('oportunista', 'ataque')] },
        { se: { saida_bola: 'sustentada' }, eixos: ['saida_bola'],
          porque: 'Atacante móvel de time de posse: aparece no lugar certo em vez de brigar de costas.',
          funcoes: [_papel('oportunista', 'versatil'), _papel('centroavante', 'ataque')] },
        { se: { reacao_perda: 'gegenpressing' }, eixos: ['reacao_perda'],
          porque: 'Ele inicia a pressão e é o primeiro a atacar o erro do adversário.',
          funcoes: [_papel('oportunista', 'ataque'), _papel('centroavante', 'ataque')] },
        { se: { ocupacao_espacos: 'posicional_amplo' }, eixos: ['ocupacao_espacos'],
          porque: 'Time que ataca pelos lados precisa de alguém pra atacar o cruzamento na área.',
          funcoes: [_papel('pivo', 'com-abertura'), _papel('centroavante', 'ataque')] },
        { se: null, eixos: ['saida_bola'],
          porque: 'Referência clássica na área, com um parceiro atacando a sobra.',
          funcoes: [_papel('centroavante', 'ataque'), _papel('oportunista', 'ataque')] }
    ]
};

// Freio único e documentado: com bloco baixo ninguém solta lateral pra linha de fundo. A regra
// não muda de função por função — ela rebaixa a instrução mais ofensiva do leque pra versão
// contida equivalente, e só isso.
const _REBAIXAMENTO_BLOCO_BAIXO = {
    'ala-atacante': _papel('ala', 'apoio'),
    'ala-invertido': _papel('lateral-invertido', 'equilibrado')
};
function _freioDeBlocoBaixo(dna, grupo, funcoes) {
    if (dna.altura_bloco !== 'baixo' || grupo !== 'lateral') return funcoes;
    return funcoes.map(f => _REBAIXAMENTO_BLOCO_BAIXO[f.funcao] || f);
}

// Regra vencedora de um grupo — devolve as funções já com o freio aplicado, mais o "porque" e
// os eixos responsáveis, que a tela usa pra mostrar o efeito de cada plano.
function regraDnaDoGrupo(dna, grupo) {
    let normalizado = normalizarDna(dna);
    let regras = REGRAS_FUNCAO_POR_DNA[grupo] || [];
    let vencedora = regras.find(r => _casaDna(normalizado, r.se)) || regras[regras.length - 1];
    if (!vencedora) return null;
    return {
        funcoes: _freioDeBlocoBaixo(normalizado, grupo, vencedora.funcoes),
        eixos: vencedora.eixos || [],
        porque: vencedora.porque
    };
}

// Matriz de função por grupo montada a partir das escolhas do treinador. Cada grupo recebe uma
// LISTA (não um único item) sempre que o estilo admite variação entre os dois lados — é isso
// que faz os dois laterais deixarem de receber sempre a mesma instrução.
function funcoesPorGrupoDoDna(dna) {
    let saida = {};
    Object.keys(REGRAS_FUNCAO_POR_DNA).forEach(grupo => {
        let regra = regraDnaDoGrupo(dna, grupo);
        if (regra) saida[grupo] = regra.funcoes;
    });
    return saida;
}

// -------------------------------------------------------------------------------------
// A FORMA DE DEFENDER E ATACAR — predefinição tática, estilo de armação e altura da linha
// saem dos mesmos 9 planos, na mesma lógica de "primeira regra que casa, ganha".
// -------------------------------------------------------------------------------------
function _predefinicaoDoDna(dna) {
    if (dna.altura_bloco === 'baixo') return 'retranca-total';
    if (dna.saida_bola === 'sustentada') return 'posse-de-bola';
    if (dna.saida_bola === 'direta' && dna.reacao_recuperacao === 'vertical') {
        return dna.compactacao === 'esticado' ? 'ligacao-direta' : 'contra-ataque';
    }
    if (dna.saida_bola === 'direta') return 'ligacao-direta';
    if (dna.reacao_perda === 'gegenpressing' && dna.altura_bloco === 'alto') return 'pressao-alta';
    if (dna.ocupacao_espacos === 'posicional_amplo' && dna.comportamento_laterais !== 'invertidos') return 'jogadas-pelas-pontas';
    return 'padrao';
}

function _armacaoDoDna(dna) {
    if (dna.saida_bola === 'sustentada') return 'passe-curto';
    if (dna.saida_bola === 'direta') return 'contra-ataque';
    return dna.reacao_recuperacao === 'vertical' ? 'contra-ataque' : 'equilibrado';
}

// A altura da linha é a soma de três planos: onde o bloco espera, o que o time faz ao perder a
// bola e o quanto ele aceita ficar alongado.
function _abordagemDoDna(dna) {
    let base = dna.altura_bloco === 'alto' ? 72 : (dna.altura_bloco === 'baixo' ? 25 : 50);
    if (dna.reacao_perda === 'gegenpressing') base += 12;
    if (dna.reacao_perda === 'recomposicao') base -= 10;
    if (dna.compactacao === 'esticado') base -= 4;
    if (dna.compactacao === 'muito_compacto') base += 2;
    if (dna.reacao_recuperacao === 'manutencao') base -= 3;
    return Math.max(5, Math.min(100, base));
}

// Pacote tático completo (predefinição/armação/linha/matriz de funções) a partir do DNA.
function dnaParaPacoteTatico(dna) {
    let normalizado = normalizarDna(dna);
    return {
        predefinicao: _predefinicaoDoDna(normalizado),
        estiloArmacao: _armacaoDoDna(normalizado),
        abordagemDefensiva: _abordagemDoDna(normalizado),
        funcoesPorGrupo: funcoesPorGrupoDoDna(normalizado)
    };
}

// =====================================================================================
// O FOCO DA PARTIDA MEXE NOS 4 PLANOS — não numa tabela paralela
// =====================================================================================
// Pedido do treinador: "amarre tudo, com diretriz e foco de cada partida selecionada,
// respeitando o estilo de jogo selecionado". Antes, cada Foco tinha sua própria matriz de
// funções escrita à mão, que podia contradizer o painel dos 4 planos (o painel dizia
// "amplitude por fora" e o Auxiliar mandava dois alas invertidos pra campo). Agora o Foco
// desloca os PLANOS — e as funções saem das mesmas regras de sempre, então painel e campo
// nunca mais discordam.
const _ESCADA_LATERAIS = ['presos_base', 'assimetrico', 'amplitude_externa'];
function _laterasMaisOfensivos(v) {
    if (v === 'invertidos') return 'amplitude_externa';
    let i = _ESCADA_LATERAIS.indexOf(v);
    return _ESCADA_LATERAIS[Math.min(_ESCADA_LATERAIS.length - 1, i + 1)] || 'amplitude_externa';
}
function _laterasMaisDefensivos(v) {
    if (v === 'invertidos') return 'presos_base';
    let i = _ESCADA_LATERAIS.indexOf(v);
    return _ESCADA_LATERAIS[Math.max(0, i - 1)] || 'presos_base';
}

const AJUSTES_DNA_POR_FOCO = {
    equilibrado: {
        rotulo: 'mantém o estilo exatamente como o treinador desenhou',
        aplicar: (d) => d
    },
    ofensivo: {
        rotulo: 'sobe uma marcha: bloco mais alto e laterais mais soltos',
        aplicar: (d) => {
            if (d.altura_bloco === 'baixo') d.altura_bloco = 'medio';
            else if (d.altura_bloco === 'medio') d.altura_bloco = 'alto';
            d.comportamento_laterais = _laterasMaisOfensivos(d.comportamento_laterais);
            if (d.reacao_recuperacao === 'manutencao') d.reacao_recuperacao = 'situacional';
            return d;
        }
    },
    extremamente_ofensivo: {
        rotulo: 'joga o time inteiro pra frente, com pressão logo após a perda',
        aplicar: (d) => {
            d.altura_bloco = 'alto';
            d.comportamento_laterais = _laterasMaisOfensivos(_laterasMaisOfensivos(d.comportamento_laterais));
            if (d.reacao_perda === 'recomposicao') d.reacao_perda = 'equilibrio_transicao';
            else if (d.reacao_perda === 'equilibrio_transicao') d.reacao_perda = 'gegenpressing';
            d.mobilidade = 'funcional';
            if (d.reacao_recuperacao === 'manutencao') d.reacao_recuperacao = 'situacional';
            return d;
        }
    },
    tudo_ou_nada: {
        rotulo: 'abre mão do equilíbrio: tudo à frente, bola pro gol em linha reta',
        aplicar: (d) => {
            d.altura_bloco = 'alto';
            d.comportamento_laterais = 'amplitude_externa';
            d.reacao_perda = 'gegenpressing';
            d.reacao_recuperacao = 'vertical';
            d.mobilidade = 'funcional';
            d.compactacao = 'esticado';
            return d;
        }
    },
    defensivo: {
        rotulo: 'desce uma marcha: bloco mais atrás e laterais mais contidos',
        aplicar: (d) => {
            if (d.altura_bloco === 'alto') d.altura_bloco = 'medio';
            d.comportamento_laterais = _laterasMaisDefensivos(d.comportamento_laterais);
            if (d.reacao_perda === 'gegenpressing') d.reacao_perda = 'equilibrio_transicao';
            if (d.compactacao === 'esticado') d.compactacao = 'compacto';
            return d;
        }
    },
    extremamente_defensivo: {
        rotulo: 'ferrolho: bloco na área, linhas coladas e saída em velocidade',
        aplicar: (d) => {
            d.altura_bloco = 'baixo';
            d.comportamento_laterais = 'presos_base';
            d.reacao_perda = 'recomposicao';
            d.compactacao = 'muito_compacto';
            d.reacao_recuperacao = 'vertical';
            d.mobilidade = 'posicional';
            return d;
        }
    },
    segura_o_jogo: {
        rotulo: 'tira o pé do acelerador: prende a bola e mata o ritmo do jogo',
        aplicar: (d) => {
            d.reacao_recuperacao = 'manutencao';
            if (d.saida_bola === 'direta') d.saida_bola = 'mista';
            if (d.altura_bloco === 'alto') d.altura_bloco = 'medio';
            if (d.reacao_perda === 'gegenpressing') d.reacao_perda = 'equilibrio_transicao';
            if (d.compactacao === 'esticado') d.compactacao = 'compacto';
            d.mobilidade = 'posicional';
            return d;
        }
    }
};

// Estratégia de formação de cada Foco (alimenta a "regra de ouro" escolherEsquemaPorFoco).
const ESTRATEGIA_FORMACAO_POR_FOCO = {
    equilibrado: 'equilibrada', segura_o_jogo: 'equilibrada',
    ofensivo: 'ofensiva', extremamente_ofensivo: 'ofensiva', tudo_ou_nada: 'ofensiva',
    defensivo: 'defensiva', extremamente_defensivo: 'defensiva'
};

function dnaAjustadoPorFoco(dna, focoId) {
    let base = normalizarDna(dna);
    let ajuste = AJUSTES_DNA_POR_FOCO[focoId];
    if (!ajuste) return base;
    return normalizarDna(ajuste.aplicar(Object.assign({}, base)));
}

function rotuloAjusteDoFoco(focoId) {
    return AJUSTES_DNA_POR_FOCO[focoId] ? AJUSTES_DNA_POR_FOCO[focoId].rotulo : '';
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
// IDENTIDADE TÁTICA EM PROSA — a frase que resume o time como um observador descreveria,
// montada a partir das mesmas escolhas do DNA. É o que dá personalidade ao painel: em vez de
// nove rótulos soltos, o treinador lê o time dele numa frase só.
// =====================================================================================
const FRASES_DNA = {
    saida_bola: { sustentada: 'constrói desde o goleiro com passe curto', mista: 'sai curto quando dá e alivia longo quando é pressionado', direta: 'liga direto no ataque e briga pela segunda bola' },
    ocupacao_espacos: { posicional_amplo: 'abrindo o campo na largura máxima', relacional: 'aglomerando gente perto da bola', misto: 'variando entre abrir e aproximar' },
    comportamento_laterais: { amplitude_externa: 'com os laterais dando a largura por fora', invertidos: 'com os laterais entrando pro miolo', presos_base: 'com os laterais presos formando linha de três', assimetrico: 'com um lateral subindo e o outro segurando' },
    mobilidade: { posicional: 'cada um na sua zona', funcional: 'com os homens de frente trocando de posição o tempo todo' },
    reacao_perda: { gegenpressing: 'sufoca na hora que perde a bola', equilibrio_transicao: 'pressiona só quem está perto e recompõe o resto', recomposicao: 'recua inteiro pra se reorganizar' },
    altura_bloco: { alto: 'defende lá na frente', medio: 'espera no meio-campo', baixo: 'defende perto da própria área' },
    tipo_marcacao: { zonal: 'marcando por zona', individual: 'marcando homem a homem', mista: 'misturando zona e encaixe individual' },
    compactacao: { muito_compacto: 'com as linhas muito coladas', compacto: 'com as linhas próximas', esticado: 'aceitando o time alongado' },
    reacao_recuperacao: { vertical: 'e ataca em velocidade assim que rouba', situacional: 'e decide na hora entre atacar rápido ou segurar', manutencao: 'e prende a bola pra instalar o time no ataque' }
};

function identidadeTaticaEmProsa(dna) {
    let n = normalizarDna(dna);
    let f = (eixo) => FRASES_DNA[eixo][n[eixo]];
    return `Com a bola, ${f('saida_bola')}, ${f('ocupacao_espacos')}, ${f('comportamento_laterais')} e ${f('mobilidade')}. ` +
           `Ao perder, ${f('reacao_perda')}. Sem a bola, ${f('altura_bloco')}, ${f('tipo_marcacao')} e ${f('compactacao')} — ${f('reacao_recuperacao')}.`;
}

// =====================================================================================
// O EFEITO DE CADA PLANO, ESCRITO NA TELA
// =====================================================================================
// Pedido do treinador: "os planos devem atuar diretamente nas funções dos jogadores". Não basta
// atuar — tem que dar pra VER. Cada eixo mostra, ali embaixo do select, quais posições ele está
// comandando agora e com qual função/foco. Se mudar o plano, a linha muda junto na hora.
const ROTULO_CURTO_GRUPO = {
    goleiro: 'GOL', zagueiro: 'ZAG', lateral: 'LAT', volante: 'VOL',
    meio_campo_central: 'MC', meia_atacante: 'MEI', meia_lateral: 'ALA', ponta: 'PTA', atacante: 'ATA'
};

// "Ala Atacante (Ataque)" — nomes reais do catálogo, nunca o id cru. (Nome próprio: existe um
// _nomeFuncaoFoco em estilo-jogo.js, que carrega depois e sobrescreveria este.)
function _rotularFuncaoDoGrupo(grupo, escolha) {
    if (typeof GRUPOS_FUNCAO_EA === 'undefined' || !GRUPOS_FUNCAO_EA[grupo]) return `${escolha.funcao}/${escolha.foco}`;
    let funcao = GRUPOS_FUNCAO_EA[grupo].funcoes.find(f => f.id === escolha.funcao);
    if (!funcao) return `${escolha.funcao}/${escolha.foco}`;
    let foco = funcao.focos.find(f => f.id === escolha.foco) || funcao.focos[0];
    return `${funcao.nome}${foco ? ` (${foco.nome})` : ''}`;
}

// Grupos que este eixo está comandando no DNA atual, com a função que ele produziu.
function consequenciasDoEixo(dna, eixoId) {
    let normalizado = normalizarDna(dna);
    return Object.keys(REGRAS_FUNCAO_POR_DNA).map(grupo => {
        let regra = regraDnaDoGrupo(normalizado, grupo);
        if (!regra || regra.eixos.indexOf(eixoId) === -1) return null;
        return {
            grupo: grupo,
            rotulo: ROTULO_CURTO_GRUPO[grupo] || grupo,
            texto: regra.funcoes.map(f => _rotularFuncaoDoGrupo(grupo, f)).join(' + '),
            porque: regra.porque
        };
    }).filter(Boolean);
}

function _htmlConsequenciasDoEixo(dna, eixoId) {
    let lista = consequenciasDoEixo(dna, eixoId);
    if (!lista.length) return '<span class="dna-efeito-vazio">Neste desenho, outro plano está comandando as funções — mude a combinação e este volta a mandar.</span>';
    return lista.map(c => `<span class="dna-efeito-item" title="${c.porque}"><b>${c.rotulo}</b> ${c.texto}</span>`).join('');
}

// =====================================================================================
// RENDERIZAÇÃO — o painel das 4 fases que substitui o antigo resumo por posição.
// =====================================================================================
function renderizarDnaTatico(dna, opcoes) {
    if (!dna) return '';
    let cfg = opcoes || {};
    let normalizado = normalizarDna(dna);
    let fasesHtml = DNA_TATICO_FASES.map(fase => {
        let eixosHtml = fase.eixos.map(eixo => {
            let opcao = opcaoDnaPorId(eixo.id, normalizado[eixo.id]);
            let efeitos = consequenciasDoEixo(normalizado, eixo.id);
            return `<div class="dna-eixo">
                <div class="dna-eixo-topo"><span class="dna-eixo-nome">${eixo.nome}</span><strong class="dna-eixo-valor">${opcao.nome}</strong></div>
                <p class="dna-eixo-desc">${opcao.descricao}</p>
                ${efeitos.length ? `<div class="dna-eixo-efeito">${efeitos.map(c => `<span class="dna-efeito-item" title="${c.porque}"><b>${c.rotulo}</b> ${c.texto}</span>`).join('')}</div>` : ''}
            </div>`;
        }).join('');
        return `<div class="dna-fase" data-fase="${fase.id}">
            <div class="dna-fase-titulo">${fase.emoji} ${fase.nome}<span>${fase.momento}</span></div>
            ${eixosHtml}
        </div>`;
    }).join('');

    let cabecalho = `<div class="dna-identidade">
        <span class="dna-identidade-rotulo">Identidade Tática</span>
        <p class="dna-identidade-frase">${identidadeTaticaEmProsa(normalizado)}</p>
    </div>`;
    let acao = cfg.botaoAjustar ? `<div class="dna-acao">${cfg.botaoAjustar}</div>` : '';

    return `<div class="dna-painel">${cabecalho}<div class="dna-grid">${fasesHtml}</div>${acao}</div>`;
}

// Prévia do pacote tático que os planos atuais produzem — a "forma de defender e atacar" que o
// treinador pediu pra ver amarrada aos planos: predefinição, estilo de armação e altura da linha.
function _htmlPreviaPacoteDna(dna) {
    let pacote = dnaParaPacoteTatico(dna);
    let pre = (typeof predefinicaoPorId === 'function') ? predefinicaoPorId(pacote.predefinicao) : { nome: pacote.predefinicao, emoji: '' };
    let arm = (typeof estiloArmacaoPorId === 'function') ? estiloArmacaoPorId(pacote.estiloArmacao) : { nome: pacote.estiloArmacao };
    let faixa = (typeof faixaAbordagem === 'function') ? faixaAbordagem(pacote.abordagemDefensiva) : { nome: '' };
    return `<span>Predefinição <strong>${pre.emoji || ''} ${pre.nome}</strong></span>` +
           `<span>Armação <strong>${arm.nome}</strong></span>` +
           `<span>Linha defensiva <strong>${pacote.abordagemDefensiva}/100 (${faixa.nome})</strong></span>`;
}

// Formulário do Modo Avançado: um <select> por eixo, agrupado pelas 4 fases.
function renderizarFormularioDnaAvancado(prefixo, dnaAtual) {
    let normalizado = normalizarDna(dnaAtual);
    let previa = `<div class="dna-pacote-previa" id="${prefixo}dna-pacote">${_htmlPreviaPacoteDna(normalizado)}</div>`;
    return previa + DNA_TATICO_FASES.map(fase => {
        let camposHtml = fase.eixos.map(eixo => {
            let opcoes = eixo.opcoes.map(o => `<option value="${o.id}" ${normalizado[eixo.id] === o.id ? 'selected' : ''}>${o.nome}</option>`).join('');
            let descAtual = opcaoDnaPorId(eixo.id, normalizado[eixo.id]).descricao;
            return `<div class="linha-form">
                <label>${eixo.nome}</label>
                <select id="${prefixo}dna-${eixo.id}" onchange="atualizarDescricaoEixoDna('${prefixo}', '${eixo.id}')">${opcoes}</select>
                <p class="dna-eixo-desc" id="${prefixo}dna-desc-${eixo.id}">${descAtual}</p>
                <div class="dna-eixo-efeito" id="${prefixo}dna-efeito-${eixo.id}">${_htmlConsequenciasDoEixo(normalizado, eixo.id)}</div>
            </div>`;
        }).join('');
        return `<div class="dna-fase dna-fase-form">
            <div class="dna-fase-titulo">${fase.emoji} ${fase.nome}<span>${fase.momento}</span></div>
            ${camposHtml}
        </div>`;
    }).join('');
}

// Mantém a explicação embaixo de cada select sempre coerente com a opção escolhida — e
// recalcula o efeito em campo de TODOS os eixos, não só do que acabou de mudar: as regras
// combinam planos (quem dá a largura muda o papel do ponta, o bloco baixo freia o lateral...),
// então mexer num eixo pode transferir o comando de um grupo pra outro plano.
function atualizarDescricaoEixoDna(prefixo, eixoId) {
    let select = document.getElementById(`${prefixo}dna-${eixoId}`);
    let alvo = document.getElementById(`${prefixo}dna-desc-${eixoId}`);
    if (!select || !alvo) return;
    alvo.innerText = opcaoDnaPorId(eixoId, select.value).descricao;

    let dnaAtual = lerFormularioDnaAvancado(prefixo);
    idsEixosDna().forEach(id => {
        let box = document.getElementById(`${prefixo}dna-efeito-${id}`);
        if (box) box.innerHTML = _htmlConsequenciasDoEixo(dnaAtual, id);
    });
    // A forma de defender e atacar (predefinição/armação/linha) também é filha dos planos.
    let previa = document.getElementById(`${prefixo}dna-pacote`);
    if (previa) previa.innerHTML = _htmlPreviaPacoteDna(dnaAtual);

    // Avisa a tela de Estilo de Jogo que estes 4 planos deixaram de ser a receita pronta do
    // estilo e passaram a ser o ajuste do treinador (ver marcarDnaEditado, em estilo-jogo.js).
    if (typeof marcarDnaEditado === 'function') marcarDnaEditado(prefixo);
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
