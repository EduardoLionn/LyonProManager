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

// =====================================================================================
// GEGENPRESSING — MATRIZ DINÂMICA DE FUNÇÕES POR FOCO DA PARTIDA (pedido do treinador)
// =====================================================================================
// O pedido descreve 4 faixas de Foco (Equilibrado/Ofensivo · Ext.Ofensivo/Tudo ou Nada ·
// Defensivo/Ext.Defensivo · Segura o Jogo), cada uma com a função+foco exigida por grupo de
// posição. Cada combo abaixo foi conferido contra o catálogo real (GRUPOS_FUNCAO_EA, em
// js/funcoes-ea.js) — onde o pedido citava uma função/foco que não existe de verdade, a
// alternativa mais próxima válida entra no lugar, documentada no array de ajustes ao lado.
// Const em vez de literal direto dentro de PLAYSTYLE_PRESETS só pra poder reaproveitar a
// mesma matriz nos dois Focos que o pedido agrupa junto (ex: Equilibrado e Ofensivo usam a
// mesma Tier1) sem repetir o objeto.
const GEGENPRESSING_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "essência do Gegenpressing"
    goleiro: [{ funcao: 'goleiro-libero', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'marcador', foco: 'combatividade' }, { funcao: 'sai-jogando', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala-invertido', foco: 'ataque' }],
    volante: [{ funcao: 'contencao', foco: 'roubada-de-bola' }, { funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    atacante: [{ funcao: 'falso-9', foco: 'ataque' }]
};
const GEGENPRESSING_AJUSTES_TIER1 = [
    'Volante (2º slot, quando a formação tiver 2): "Box-to-Box"/Ataque não existe no grupo Volante (isso só existe no grupo Meio-Campo, e mesmo lá só com foco Equilibrado/Roubada de Bola, nunca Ataque) — usei "Volante Oportunista"/Equilibrado, a função mais avançada disponível pra esse grupo.',
    'MCs e MEIs são grupos diferentes no motor do jogo (MC = Meio-Campo, MEI = Meia-Atacante), mesmo o pedido tratando os dois juntos — MC virou "Box-to-Box"/Equilibrado e MEI virou "Armador"/Deslocamento (a opção "Armador" do "ou" original do pedido, já que "Box-to-Box" não existe no grupo Meia-Atacante).'
];
const GEGENPRESSING_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'goleiro-libero', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'zagueiro-aberto', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala-atacante', foco: 'ataque' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'ataque' }],
    meia_atacante: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_lateral: [{ funcao: 'ala', foco: 'ataque' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    atacante: [{ funcao: 'oportunista', foco: 'ataque' }, { funcao: 'pivo', foco: 'ataque' }]
};
const GEGENPRESSING_AJUSTES_TIER2 = [
    '"Box-to-Box"/Ataque não existe em NENHUM grupo do jogo (Box-to-Box só tem focos Equilibrado/Roubada de Bola) — usei "Armador"/Ataque pro MC (mesma ideia de avançar ignorando a contenção) e "Volante Oportunista"/Equilibrado pro VOL (a função mais avançada que esse grupo tem, já que ele nem possui Box-to-Box).',
    'Goleiro, Meia-Atacante (MEI) e Ponta clássica (PD/PE) não foram mencionados nesta faixa do pedido — mantive os mesmos da faixa Equilibrado/Ofensivo, coerentes com uma postura ainda mais ofensiva.'
];
const GEGENPRESSING_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'pivo', foco: 'equilibrado' }]
};
const GEGENPRESSING_AJUSTES_TIER3 = [
    'Ponta (PD/PE): "Ponta Operário" não é uma função real desse grupo (só existe como nome de especialidade cadastrável do jogador) — e nenhuma função do grupo Ponta tem foco Defesa. Usei "Ala"/Equilibrado, a opção mais contida disponível.',
    'Goleiro e Meia-Atacante (MEI) não foram mencionados nesta faixa do pedido — usei "Goleiro"/Defesa e "Armador"/Equilibrado, as opções mais condizentes com a postura defensiva.'
];
const GEGENPRESSING_FUNCOES_TIER4 = { // Foco: Segurar o Jogo (Posse)
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }],
    lateral: [{ funcao: 'lateral-invertido', foco: 'equilibrado' }],
    volante: [{ funcao: 'armador-recuado', foco: 'armacao' }],
    meio_campo_central: [{ funcao: 'armador-recuado', foco: 'armacao' }],
    meia_atacante: [{ funcao: 'armador', foco: 'armacao' }],
    meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    atacante: [{ funcao: 'falso-9', foco: 'armacao' }]
};
const GEGENPRESSING_AJUSTES_TIER4 = [
    'Goleiro e Meia-Atacante (MEI) não foram mencionados nesta faixa do pedido — usei "GL que Sai Jogando"/Armação e "Armador"/Armação, coerentes com a filosofia de posse de bola.'
];

// =====================================================================================
// TIKI-TAKA — MATRIZ DINÂMICA DE FUNÇÕES POR FOCO DA PARTIDA (pedido do treinador)
// =====================================================================================
// Mesmo esquema do Gegenpressing acima: 4 faixas de Foco, cada combo função+foco conferido
// contra GRUPOS_FUNCAO_EA — onde o pedido citava algo que não existe de verdade, a
// alternativa válida mais próxima entra no lugar, documentada no array de ajustes ao lado.
const TIKITAKA_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "essência do Guardiola"
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }],
    lateral: [{ funcao: 'lateral-invertido', foco: 'equilibrado' }],
    volante: [{ funcao: 'armador-recuado', foco: 'armacao' }, { funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_atacante: [{ funcao: 'camisa-10-classico', foco: 'versatil' }],
    meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    atacante: [{ funcao: 'falso-9', foco: 'armacao' }]
};
const TIKITAKA_AJUSTES_TIER1 = [
    'Zagueiro: "Sai Jogando" não tem foco Equilibrado nesse grupo (só Defesa/Armação/Combatividade) — usei Armação, que já era citada como alternativa no pedido e é a que mais combina com "todo mundo joga com a bola".',
    'MC e MEI são grupos diferentes no motor do jogo (MC = Meio-Campo, MEI = Meia-Atacante), mesmo o pedido tratando os dois juntos — MC virou "Armador"/Deslocamento (o grupo Meio-Campo não tem foco Armação pra Armador, só Deslocamento/Ataque) e MEI virou "Camisa 10 Clássico"/Versátil, batendo exatamente com o pedido.'
];
const TIKITAKA_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala-invertido', foco: 'ataque' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'ataque' }],
    meia_atacante: [{ funcao: 'atacante-sombra', foco: 'ataque' }],
    meia_lateral: [{ funcao: 'ala', foco: 'ataque' }],
    ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    atacante: [{ funcao: 'falso-9', foco: 'ataque' }, { funcao: 'oportunista', foco: 'ataque' }]
};
const TIKITAKA_AJUSTES_TIER2 = [
    'MD/ME (Meia-Lateral): nem "Ala Invertido" nem "Ala Atacante" existem nesse grupo (essas duas só existem no grupo Lateral) — usei "Ala"/Ataque, a opção mais ofensiva disponível no grupo Meia-Lateral. Já como Lateral (LD/LE) bate exatamente com o pedido: "Ala Invertido"/Ataque.',
    'VOL: foco Ataque não existe em NENHUMA função do grupo Volante — usei "Volante Oportunista"/Equilibrado, a função mais avançada que esse grupo tem. "Armador"/Ataque foi pro MC (onde existe de verdade) e "Atacante Sombra"/Ataque foi pro MEI (onde também existe de verdade) — lidos como as duas opções reais por trás do "VOL / MC: Armador (Ataque) / Atacante Sombra (Ataque)" do pedido.',
    'Goleiro e Ponta clássica (PD/PE) não foram mencionados nesta faixa do pedido — mantive os mesmos da faixa Equilibrado/Ofensivo.'
];
const TIKITAKA_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo
    goleiro: [{ funcao: 'goleiro', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }, { funcao: 'sai-jogando', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral-invertido', foco: 'defesa' }],
    volante: [{ funcao: 'armador-recuado', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'armador-recuado', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'armacao' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'pivo', foco: 'equilibrado' }]
};
const TIKITAKA_AJUSTES_TIER3 = [
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo (só existe no grupo Meia-Lateral) — usei "Ala"/Equilibrado, a opção mais contida disponível. MD/ME (Meia-Lateral) bate exatamente com o pedido: "Meia Aberto"/Armação.',
    'Atacante: "Falso 9" não tem foco Apoio nesse grupo (só Ataque/Armação) — usei a alternativa já citada no próprio pedido, "Pivô"/Equilibrado.',
    'Meia-Atacante (MEI) não foi mencionado nesta faixa do pedido — usei "Armador"/Equilibrado, a opção mais condizente com a postura defensiva.'
];
const TIKITAKA_FUNCOES_TIER4 = { // Foco: Segurar o Jogo (Posse)
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }],
    lateral: [{ funcao: 'ala-invertido', foco: 'armacao' }],
    volante: [{ funcao: 'armador-recuado', foco: 'armacao' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_atacante: [{ funcao: 'camisa-10-classico', foco: 'versatil' }],
    meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    atacante: [{ funcao: 'falso-9', foco: 'armacao' }]
};
const TIKITAKA_AJUSTES_TIER4 = [
    'Zagueiro e Volante: o pedido só pediu "função focada em Armação ou Equilibrado" sem nomear a função — usei "Sai Jogando"/Armação e "Armador Recuado"/Armação, as opções desses grupos mais alinhadas com "segurar a bola lá atrás".',
    'LD/LE: "Lateral Invertido" não tem foco Armação nesse grupo (só Defesa/Equilibrado) — usei "Ala Invertido"/Armação, que tem esse foco de verdade e mantém a mesma ideia de avançar pro meio pra ajudar na armação.',
    'Goleiro, Meio-Campo Central (MC) e Meia-Atacante (MEI) não foram mencionados nesta faixa — mantive as escolhas mais alinhadas com posse das faixas anteriores: "GL que Sai Jogando"/Armação, "Armador"/Deslocamento (MC) e "Camisa 10 Clássico"/Versátil (MEI).'
];

// =====================================================================================
// FUTEBOL RELACIONAL — MATRIZ DINÂMICA DE FUNÇÕES POR FOCO DA PARTIDA (pedido do treinador)
// =====================================================================================
// Mesmo esquema do Gegenpressing/Tiki-Taka acima: 4 faixas de Foco, cada combo função+foco
// conferido contra GRUPOS_FUNCAO_EA — onde o pedido citava algo que não existe de verdade, a
// alternativa válida mais próxima entra no lugar, documentada no array de ajustes ao lado.
const RELACIONAL_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "essência relacional"
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }],
    lateral: [{ funcao: 'lateral', foco: 'versatil' }],
    volante: [{ funcao: 'contencao', foco: 'deslocamento' }, { funcao: 'armador-recuado', foco: 'deslocamento' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_atacante: [{ funcao: 'camisa-10-classico', foco: 'versatil' }],
    meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'deslocamento' }],
    atacante: [{ funcao: 'falso-9', foco: 'armacao' }]
};
const RELACIONAL_AJUSTES_TIER1 = [
    'MD/ME (Meia-Lateral): "Corta pra Dentro" não tem foco Deslocamento nesse grupo (só Ataque/Equilibrado) — usei a alternativa já citada no pedido, "Armador Aberto"/Armação, que existe de verdade. Como Ponta (PD/PE) bate exatamente com a opção principal do pedido: "Corta pra Dentro"/Deslocamento.'
];
const RELACIONAL_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala', foco: 'apoio' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'atacante-sombra', foco: 'ataque' }],
    atacante: [{ funcao: 'oportunista', foco: 'versatil' }, { funcao: 'pivo', foco: 'equilibrado' }]
};
const RELACIONAL_AJUSTES_TIER2 = [
    'Goleiro: "Sai Jogando" não existe no grupo Goleiro (só existe no grupo Zagueiro) e o foco Combatividade também não existe pra nenhuma função de goleiro — mantive "GL que Sai Jogando"/Armação (igual à faixa Equilibrado/Ofensivo), o mais parecido com "goleiro que assume risco". Como Zagueiro bate exatamente com o pedido: "Sai Jogando"/Combatividade.',
    'VOL: "Box-to-Box" não existe no grupo Volante (só existe no grupo Meio-Campo) — usei "Volante Oportunista"/Equilibrado, a função desse grupo com mais viés de infiltração ofensiva. MC (Meio-Campo) bate exatamente com o pedido: "Box-to-Box"/Equilibrado.',
    'Meia-Lateral (MD/ME) e Ponta (PD/PE) não foram mencionados nesta faixa do pedido — mantive os mesmos da faixa Equilibrado/Ofensivo.'
];
const RELACIONAL_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'armador-recuado', foco: 'deslocamento' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'centroavante', foco: 'apoio' }]
};
const RELACIONAL_AJUSTES_TIER3 = [
    'MC (Meio-Campo): "Armador Recuado" não tem foco Deslocamento nesse grupo (só Defesa/Armação) — usei "Armador"/Deslocamento, que tem esse foco de verdade e mantém a ideia de flutuar pra cobrir o colega. VOL (Volante) bate exatamente com o pedido: "Armador Recuado"/Deslocamento.',
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo (só existe no grupo Meia-Lateral) — usei "Ala"/Equilibrado, a opção mais contida disponível. MD/ME bate exatamente com o pedido: "Meia Aberto"/Defesa.',
    'Atacante: "Falso 9" não tem foco Apoio nesse grupo (só Ataque/Armação) — usei "Centroavante"/Apoio, que também recua pra ligar o jogo e tem esse foco de verdade.',
    'Goleiro e Meia-Atacante (MEI) não foram mencionados nesta faixa do pedido — usei "Goleiro"/Defesa e "Armador"/Equilibrado, as opções mais condizentes com a postura defensiva.'
];
const RELACIONAL_FUNCOES_TIER4 = { // Foco: Segurar o Jogo — "meio pra frente" em Deslocamento/Armação
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }],
    lateral: [{ funcao: 'lateral', foco: 'versatil' }],
    volante: [{ funcao: 'armador-recuado', foco: 'armacao' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_atacante: [{ funcao: 'armador', foco: 'armacao' }],
    meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    atacante: [{ funcao: 'falso-9', foco: 'armacao' }]
};
const RELACIONAL_AJUSTES_TIER4 = [
    'O pedido só deu uma regra geral pro meio-campo pra frente ("Deslocamento ou Armação"), sem nomear função — usei as funções já validadas nas faixas anteriores que têm esses focos de verdade: "Armador Recuado"/Armação (VOL), "Armador"/Deslocamento (MC), "Armador"/Armação (MEI), "Armador Aberto"/Armação (MD/ME e PD/PE), "Falso 9"/Armação (ATA).',
    'Goleiro, Zagueiro e Lateral não foram cobertos pela regra (que só fala "do meio pra frente") — mantive as escolhas da faixa Equilibrado/Ofensivo: "GL que Sai Jogando"/Armação, "Sai Jogando"/Armação e "Lateral"/Versátil.'
];

// =====================================================================================
// CATENACCIO — MATRIZ DINÂMICA DE FUNÇÕES POR FOCO DA PARTIDA (pedido do treinador)
// =====================================================================================
// Mesmo esquema dos presets refinados acima: 4 faixas de Foco, cada combo função+foco
// conferido contra GRUPOS_FUNCAO_EA — onde o pedido citava algo que não existe de verdade, a
// alternativa válida mais próxima entra no lugar, documentada no array de ajustes ao lado.
const CATENACCIO_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "a armadilha do contra-ataque"
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }, { funcao: 'marcador', foco: 'combatividade' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }, { funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'oportunista', foco: 'ataque' }]
};
const CATENACCIO_AJUSTES_TIER1 = [
    'MC e MEI são grupos diferentes no motor (MC = Meio-Campo, MEI = Meia-Atacante), mesmo o pedido tratando os dois juntos — MC virou "Contenção"/Defesa (a opção mais "muralha" do "ou") e MEI virou "Armador"/Deslocamento (a opção mais criativa do "ou", já que o grupo Meia-Atacante nem tem função Contenção).',
    'PD/PE (Ponta): nem "Ponta Operário" (isso é nome de especialidade cadastrável do jogador, não função real do campinho) nem "Meia Aberto" existem nesse grupo (Meia Aberto só existe no grupo Meia-Lateral) — usei "Ala"/Equilibrado, a opção mais contida disponível. MD/ME (Meia-Lateral) bate exatamente com o pedido: "Meia Aberto"/Defesa.',
    'Atacante: "Atacante Sombra" não existe no grupo Atacante (só existe no grupo Meia-Atacante) — usei "Oportunista"/Ataque, a opção do "ou" que existe de verdade nesse grupo e também bate com "correr nas costas da zaga".'
];
const CATENACCIO_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'marcador', foco: 'combatividade' }, { funcao: 'zagueiro-aberto', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala-atacante', foco: 'ataque' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_lateral: [{ funcao: 'ala', foco: 'ataque' }],
    atacante: [{ funcao: 'oportunista', foco: 'ataque' }, { funcao: 'pivo', foco: 'ataque' }]
};
const CATENACCIO_AJUSTES_TIER2 = [
    'LD/LE (Lateral): "Ala" não tem foco Ataque nesse grupo (só Apoio/Equilibrado) — usei "Ala Atacante"/Ataque, que tem esse foco de verdade e é ainda mais ofensivo. MD/ME (Meia-Lateral) bate exatamente com o pedido: "Ala"/Ataque.',
    'MC: "Box-to-Box" não tem foco Ataque nesse grupo (só Equilibrado/Roubada de Bola) — usei Equilibrado, o mais próximo disponível. VOL: "Box-to-Box" não existe no grupo Volante — usei "Volante Oportunista"/Equilibrado, a função mais avançada que esse grupo tem.',
    'Ponta (PD/PE) não foi mencionada nesta faixa do pedido (só "LD/LE / MD/ME") — mantive a mesma da faixa Equilibrado/Ofensivo.'
];
const CATENACCIO_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo — "o verdadeiro Catenaccio"
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'pivo', foco: 'equilibrado' }]
};
const CATENACCIO_AJUSTES_TIER3 = [
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo (só existe no grupo Meia-Lateral) — usei "Ala"/Equilibrado, a opção mais contida disponível. MD/ME bate exatamente com o pedido: "Meia Aberto"/Defesa.',
    'Goleiro e Meia-Atacante (MEI) não foram mencionados nesta faixa — usei "Goleiro"/Defesa e "Armador"/Equilibrado, as opções mais condizentes com o ferrolho total dessa postura.'
];
const CATENACCIO_FUNCOES_TIER4 = { // Foco: Segurar o Jogo — regra geral Defesa/Equilibrado, ATA em Apoio
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'centroavante', foco: 'apoio' }]
};
const CATENACCIO_AJUSTES_TIER4 = [
    'Ponta (PD/PE): a função "Ala" desse grupo não tem foco Defesa (só Versátil/Ataque/Equilibrado) — usei Equilibrado, o mais contido disponível. Todos os outros grupos bateram exatamente com a regra geral do pedido (Defesa ou Equilibrado).',
    'Atacante: nem "Pivô" nem "Falso 9" têm foco Apoio — usei "Centroavante"/Apoio, que tem esse foco de verdade e também "segura" o jogo perto da linha defensiva adversária, coerente com "prender a bola... e cavar faltas".'
];

// =====================================================================================
// JOGO PELAS PONTAS — MATRIZ DINÂMICA DE FUNÇÕES POR FOCO DA PARTIDA (pedido do treinador)
// =====================================================================================
// Mesmo esquema dos presets refinados acima: 4 faixas de Foco, cada combo função+foco
// conferido contra GRUPOS_FUNCAO_EA — onde o pedido citava algo que não existe de verdade, a
// alternativa válida mais próxima entra no lugar, documentada no array de ajustes ao lado.
// A predefinição "Jogadas pelas pontas" já proíbe Passe Curto nativamente (PREDEFINICOES_
// TATICAS, js/taticas.js), então a "TRAVA ABSOLUTA" do pedido já vem garantida pelo motor
// de regras existente — nenhum ajuste extra precisa ser feito pra isso.
//
// O pedido nunca menciona o grupo Meia-Atacante (MEI) em nenhuma das 4 faixas — em vez de
// reaproveitar a escolha de outro preset, usei "Meia pelas Pontas" (id: meia-pelas-pontas),
// que já É literalmente a função desse grupo pensada pra abrir o jogo pelas pontas, variando
// só o foco pela agressividade de cada faixa.
const PONTAS_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "a base dos cruzamentos"
    goleiro: [{ funcao: 'goleiro', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'defesa', foco: 'equilibrado' }, { funcao: 'sai-jogando', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala', foco: 'apoio' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'meia-pelas-pontas', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'ala', foco: 'ataque' }],
    ponta: [{ funcao: 'ala', foco: 'ataque' }],
    atacante: [{ funcao: 'pivo', foco: 'ataque' }]
};
const PONTAS_AJUSTES_TIER1 = [
    'VOL e MC são grupos diferentes no motor (VOL = Volante, MC = Meio-Campo) — VOL virou "Contenção"/Defesa (o grupo Volante não tem função Box-to-Box) e MC virou "Box-to-Box"/Equilibrado, batendo exatamente com o pedido.'
];
const PONTAS_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'goleiro', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'zagueiro-aberto', foco: 'apoio' }],
    lateral: [{ funcao: 'ala-atacante', foco: 'ataque' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'meia-pelas-pontas', foco: 'ataque' }],
    meia_lateral: [{ funcao: 'ala', foco: 'ataque' }],
    ponta: [{ funcao: 'ala', foco: 'ataque' }],
    atacante: [{ funcao: 'pivo', foco: 'ataque' }, { funcao: 'oportunista', foco: 'ataque' }]
};
const PONTAS_AJUSTES_TIER2 = [
    'VOL: "Box-to-Box" não existe no grupo Volante — usei "Volante Oportunista"/Equilibrado, a função mais avançada que esse grupo tem. MC: "Box-to-Box" não tem foco Ataque nesse grupo (só Equilibrado/Roubada de Bola) — usei Equilibrado, o mais próximo disponível.',
    'Goleiro não foi mencionado nesta faixa — mantive "Goleiro"/Equilibrado, igual à faixa Equilibrado/Ofensivo.'
];
const PONTAS_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'meia-pelas-pontas', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'ala', foco: 'equilibrado' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'pivo', foco: 'equilibrado' }]
};
const PONTAS_AJUSTES_TIER3 = [
    'Goleiro e Meia-Atacante (MEI) não foram mencionados nesta faixa — usei "Goleiro"/Defesa e "Meia pelas Pontas"/Equilibrado (o grupo Meia-Atacante não tem foco Apoio pra essa função, só Equilibrado/Deslocamento/Ataque — diferente do "Meia pelas Pontas" do grupo Meio-Campo, que tem Apoio), as opções mais condizentes com a postura defensiva.'
];
const PONTAS_FUNCOES_TIER4 = { // Foco: Segurar o Jogo
    goleiro: [{ funcao: 'goleiro', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'defesa', foco: 'equilibrado' }, { funcao: 'sai-jogando', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala', foco: 'apoio' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'meia-pelas-pontas', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'armacao' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'centroavante', foco: 'apoio' }]
};
const PONTAS_AJUSTES_TIER4 = [
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo (só existe no grupo Meia-Lateral) — usei "Ala"/Equilibrado, a opção mais contida disponível. MD/ME bate com o pedido: "Meia Aberto"/Armação (a opção "Defesa/Armação" que mais mantém a posse, coerente com "segurar o jogo").',
    'Atacante: "Pivô" não tem foco Apoio nesse grupo (só Com Abertura/Equilibrado/Ataque) — usei "Centroavante"/Apoio, que tem esse foco de verdade e também segura a bola perto da linha defensiva adversária.',
    'Goleiro, Zagueiro, Volante/Meio-Campo e Meia-Atacante não foram mencionados nesta faixa — mantive as escolhas da faixa Equilibrado/Ofensivo (a mais próxima em espírito, já que o pedido agrupa Segura o Jogo com Equilibrado na escolha da formação).'
];

// -------------------------------------------------------------------------------------
// LIGAÇÃO DIRETA DINÂMICA — mesmo mecanismo, aqui aplicado à Ligação Direta (Route One).
// `estrategiaFormacao` de cada Foco: Defensivo/Ext.Defensivo pesa mais defensores/linha de
// 5 ('defensiva'); Equilibrado/Segura o Jogo pesa o meio-campo mais estruturado
// ('equilibrada'); Ofensivo/Ext.Ofensivo/Tudo ou Nada pesa mais atacantes/meias ofensivos
// ('ofensiva') — exatamente como o pedido agrupou a Seleção Dinâmica da Formação.
// -------------------------------------------------------------------------------------
const LIGACAODIRETA_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "a essência do Route One"
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }, { funcao: 'marcador', foco: 'combatividade' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }, { funcao: 'ala', foco: 'equilibrado' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'atacante-sombra', foco: 'ataque' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'apoio' }, { funcao: 'ala', foco: 'equilibrado' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'pivo', foco: 'com-abertura' }, { funcao: 'oportunista', foco: 'ataque' }]
};
const LIGACAODIRETA_AJUSTES_TIER1 = [
    'MEI (Meia-Atacante) não foi mencionado nesta faixa pelo pedido — esse grupo não tem Box-to-Box, então usei "Atacante Sombra"/Ataque, a função do grupo Meia-Atacante mais próxima de "um meia chegando muito perto do centroavante" (citado na Seleção de Formação): corridas tardias pra dentro da área buscando a 2ª bola.',
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo (só existe no grupo Meia-Lateral) — usei a segunda opção que o próprio pedido já dava, "Ala"/Equilibrado, válida nos dois grupos. MD/ME (Meia-Lateral) seguiu a divisão literal do pedido: "Meia Aberto"/Apoio pro primeiro slot e "Ala"/Equilibrado pro segundo.'
];
const LIGACAODIRETA_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'marcador', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala', foco: 'apoio' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'atacante-sombra', foco: 'ataque' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'apoio' }, { funcao: 'ala', foco: 'equilibrado' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'pivo', foco: 'ataque' }, { funcao: 'oportunista', foco: 'ataque' }]
};
const LIGACAODIRETA_AJUSTES_TIER2 = [
    'VOL e MC são grupos diferentes no motor (VOL = Volante, MC = Meio-Campo) — o grupo Volante não tem Box-to-Box, usei "Volante Oportunista"/Equilibrado (a única função avançada desse grupo). O grupo Meio-Campo tem Box-to-Box mas sem foco Ataque (só Equilibrado/Roubada de Bola) — usei Equilibrado, o mais próximo disponível.',
    'GL, MEI e MD/ME/PD/PE não foram mencionados nesta faixa — mantive as escolhas da faixa Equilibrado/Ofensivo.'
];
const LIGACAODIRETA_FUNCOES_TIER3 = { // Foco: Defensivo, Extremamente Defensivo ou Segura o Jogo
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'pivo', foco: 'equilibrado' }]
};
const LIGACAODIRETA_AJUSTES_TIER3 = [
    'VOL e MC: segui a divisão pedida em "Contenção (Defesa) + pelo menos 1 Box-to-Box (Equilibrado)" — "Contenção"/Defesa no grupo Volante (o corpo defensivo) e "Box-to-Box"/Equilibrado no grupo Meio-Campo (o "afasta o perigo" citado no pedido).',
    'PD/PE (Ponta): "Meia Aberto" de novo não existe nesse grupo, e nenhuma das funções desse grupo tem foco Defesa — usei "Ala"/Equilibrado, a opção mais contida disponível. MD/ME (Meia-Lateral) usou a opção literal do pedido: "Meia Aberto"/Defesa.',
    'MEI (Meia-Atacante) não foi mencionado nesta faixa — troquei para "Armador"/Equilibrado (mais contido que o "Atacante Sombra" das faixas ofensivas, mantendo uma saída de bola em vez de pura corrida de área, coerente com a postura defensiva).'
];

// -------------------------------------------------------------------------------------
// TRANSIÇÃO OFENSIVA LETAL DINÂMICA — mesmo mecanismo, aqui aplicado à Transição Ofensiva
// Letal (Fast Counter). `estrategiaFormacao` de cada Foco: Defensivo/Ext.Defensivo pesa mais
// defensores/linha de 5 ('defensiva'); Equilibrado/Segura o Jogo pesa o meio-campo mais
// estruturado ('equilibrada'); Ofensivo/Ext.Ofensivo/Tudo ou Nada pesa mais atacantes/meias
// ofensivos ('ofensiva') — exatamente como o pedido agrupou a Seleção Dinâmica da Formação.
// -------------------------------------------------------------------------------------
const TRANSICAOLETAL_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "a armadilha do bloco médio"
    goleiro: [{ funcao: 'goleiro-libero', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'zagueiro-aberto', foco: 'defesa' }, { funcao: 'marcador', foco: 'combatividade' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'roubada-de-bola' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'ataque' }],
    meia_atacante: [{ funcao: 'camisa-10-classico', foco: 'ataque' }],
    meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    atacante: [{ funcao: 'oportunista', foco: 'ataque' }]
};
const TRANSICAOLETAL_AJUSTES_TIER1 = [
    'MC/MEI: no grupo Meio-Campo, "Box-to-Box" não tem foco Ataque (só Equilibrado/Roubada de Bola) — usei "Armador"/Ataque, a segunda opção que o próprio pedido já dava, e que tem esse foco de verdade. No grupo Meia-Atacante, nem Box-to-Box (não existe nesse grupo) nem Armador (só Equilibrado/Deslocamento/Armação) têm foco Ataque — usei "Camisa 10 Clássico"/Ataque, o armador ofensivo real desse grupo.',
    'ATA: "Atacante Sombra" não existe no grupo Atacante (só existe no grupo Meia-Atacante) — usei a primeira opção que o pedido já dava, "Oportunista"/Ataque, válida nesse grupo.'
];
const TRANSICAOLETAL_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'goleiro-libero', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'zagueiro-aberto', foco: 'defesa' }, { funcao: 'marcador', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala-atacante', foco: 'ataque' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'ataque' }],
    meia_atacante: [{ funcao: 'camisa-10-classico', foco: 'ataque' }],
    meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    atacante: [{ funcao: 'oportunista', foco: 'ataque' }]
};
const TRANSICAOLETAL_AJUSTES_TIER2 = [
    'LD/LE: "Ala" nesse grupo (Lateral) não tem foco Ataque (só Apoio/Equilibrado) — usei "Ala Atacante"/Ataque, a função do grupo Lateral que realmente tem esse foco (o lateral que "raramente volta pra defender").',
    'VOL e MC: o grupo Volante não tem Box-to-Box (nem nenhuma função com foco Ataque) — usei "Volante Oportunista"/Equilibrado, a opção mais avançada disponível. O grupo Meio-Campo tem Box-to-Box mas sem foco Ataque — usei "Armador"/Ataque, igual à faixa Equilibrado/Ofensivo.',
    'GL e ZAGs não foram mencionados nesta faixa — mantive as escolhas da faixa Equilibrado/Ofensivo.'
];
const TRANSICAOLETAL_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'equilibrado' }],
    atacante: [{ funcao: 'oportunista', foco: 'apoio' }]
};
const TRANSICAOLETAL_AJUSTES_TIER3 = [
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo — usei a segunda opção que o próprio pedido já dava, "Corta pra Dentro"/Equilibrado, válida nesse grupo. MD/ME (Meia-Lateral) usou a opção literal: "Meia Aberto"/Defesa.',
    'GL e MEI não foram mencionados nesta faixa — troquei o Goleiro pro "Goleiro" tradicional/Defesa (mais contido que o Goleiro-Líbero das faixas ofensivas) e o Meia-Atacante pro "Armador"/Equilibrado (mais contido que o "Camisa 10 Clássico"/Ataque das faixas ofensivas).'
];

// -------------------------------------------------------------------------------------
// FUTEBOL TOTAL DINÂMICO — mesmo mecanismo, aqui aplicado ao Futebol Total (Total Football).
// `estrategiaFormacao` de cada Foco: Defensivo/Ext.Defensivo pesa mais defensores/linha de 5
// ('defensiva'); Equilibrado/Segura o Jogo pesa o meio-campo mais estruturado ('equilibrada');
// Ofensivo/Ext.Ofensivo/Tudo ou Nada pesa mais atacantes/meias ofensivos ('ofensiva') —
// exatamente como o pedido agrupou a Seleção Dinâmica da Formação. O pedido pede pra "abominar
// linhas de 5" nos Focos defensivos, mas a regra de ouro é genérica (compartilhada por todos os
// presets refinados) e não trava formações específicas — se o treinador incluir uma formação de
// linha de 5 entre as 4 preferidas, ela ainda pode ser escolhida; documentado abaixo.
// -------------------------------------------------------------------------------------
const FUTEBOLTOTAL_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "O Carrossel"
    goleiro: [{ funcao: 'goleiro-libero', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }, { funcao: 'zagueiro-aberto', foco: 'apoio' }],
    lateral: [{ funcao: 'ala-invertido', foco: 'armacao' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'equilibrado' }, { funcao: 'armador', foco: 'deslocamento' }],
    meia_atacante: [{ funcao: 'camisa-10-classico', foco: 'versatil' }],
    meia_lateral: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    ponta: [{ funcao: 'ala', foco: 'versatil' }],
    atacante: [{ funcao: 'falso-9', foco: 'armacao' }, { funcao: 'oportunista', foco: 'versatil' }]
};
const FUTEBOLTOTAL_AJUSTES_TIER1 = [
    'VOL e MC são grupos diferentes no motor — o pedido junta os dois ("VOLs / MCs"). O grupo Volante não tem Box-to-Box nem Armador (só "Armador Recuado", um id diferente) — usei "Volante Oportunista"/Equilibrado, a única das 3 opções que existe de fato nesse grupo. O grupo Meio-Campo tem as outras 2 opções (Box-to-Box e Armador) — usei as duas, uma pra cada slot de MC, representando a "troca de função" que o próprio pedido descreve.',
    'MD/ME (Meia-Lateral): "Ala" nesse grupo não tem foco Versátil (só Equilibrado/Ataque) — usei a segunda opção, "Armador Aberto"/Armação. PD/PE (Ponta) usou a primeira opção literal: "Ala"/Versátil, que existe de verdade nesse grupo.'
];
const FUTEBOLTOTAL_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'goleiro-libero', foco: 'armacao' }],
    zagueiro: [{ funcao: 'zagueiro-aberto', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala-invertido', foco: 'ataque' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'ataque' }],
    meia_atacante: [{ funcao: 'camisa-10-classico', foco: 'versatil' }],
    meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'deslocamento' }],
    atacante: [{ funcao: 'falso-9', foco: 'ataque' }, { funcao: 'oportunista', foco: 'versatil' }]
};
const FUTEBOLTOTAL_AJUSTES_TIER2 = [
    'VOL e MC: mesmo caso da faixa anterior — o grupo Volante não tem Box-to-Box (nem foco Ataque em nenhuma função) — usei "Volante Oportunista"/Equilibrado. O grupo Meio-Campo tem Box-to-Box mas sem foco Ataque — usei "Armador"/Ataque.',
    'MD/ME (Meia-Lateral): "Corta pra Dentro" não tem foco Deslocamento nesse grupo (só Ataque/Equilibrado) — usei Ataque, a opção mais agressiva disponível, coerente com a intensidade desta faixa. PD/PE (Ponta) usou o foco literal do pedido: Deslocamento, que existe de verdade nesse grupo.',
    'GL não foi mencionado nesta faixa — mantive a escolha da faixa Equilibrado/Ofensivo ("Goleiro-Líbero"/Armação).'
];
const FUTEBOLTOTAL_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo
    goleiro: [{ funcao: 'goleiro-libero', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'zagueiro-aberto', foco: 'defesa' }, { funcao: 'sai-jogando', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'deslocamento' }],
    meio_campo_central: [{ funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'apoio' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'oportunista', foco: 'apoio' }]
};
const FUTEBOLTOTAL_AJUSTES_TIER3 = [
    'Formação: o pedido pede pra "abominar linhas de 5" aqui — a regra de ouro genérica ("defensiva": mais defensores, priorizando linha de 5 se alguma das 4 preferidas tiver) é compartilhada por todos os presets refinados e não trava formações específicas. Se o treinador não incluir uma formação de linha de 5 entre as 4 preferidas, o Futebol Total nunca vai parar nela.',
    'VOL e MC: o grupo Meio-Campo tem Contenção mas sem foco Deslocamento (só Defesa/Roubada de Bola) — usei Defesa, a opção mais contida. O grupo Volante tem Contenção com foco Deslocamento normalmente, usado como no pedido.',
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo, e nenhuma das funções desse grupo tem foco Apoio — usei "Ala"/Equilibrado, a opção mais contida disponível. MD/ME (Meia-Lateral) usou a opção literal: "Meia Aberto"/Apoio.',
    'ATA: "Falso 9" não tem foco Apoio nesse grupo (só Ataque/Armação) — usei "Oportunista"/Apoio, a outra função do Cruyff já usada nas faixas ofensivas deste preset, que tem esse foco de verdade.',
    'MEI não foi mencionado nesta faixa — troquei pro "Armador"/Equilibrado, mais contido que o "Camisa 10 Clássico"/Versátil das faixas ofensivas.'
];

// -------------------------------------------------------------------------------------
// PRESSÃO ALTA INDIVIDUAL DINÂMICA — mesmo mecanismo, aqui aplicado à marcação homem a
// homem (Man-to-Man High Press). `estrategiaFormacao` de cada Foco: Defensivo/Ext.Defensivo
// pesa mais defensores/linha de 3 na sobra ('defensiva'); Equilibrado/Segura o Jogo pesa
// meias abertos e volantes combativos ('equilibrada'); Ofensivo/Ext.Ofensivo/Tudo ou Nada
// pesa mais atacantes pra sufocar os zagueiros ('ofensiva') — exatamente como o pedido
// agrupou a Seleção Dinâmica da Formação.
// -------------------------------------------------------------------------------------
const PRESSAOINDIVIDUAL_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "A Caçada Implacável"
    goleiro: [{ funcao: 'goleiro-libero', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'marcador', foco: 'combatividade' }, { funcao: 'zagueiro-aberto', foco: 'combatividade' }],
    lateral: [{ funcao: 'lateral', foco: 'versatil' }, { funcao: 'ala', foco: 'apoio' }],
    volante: [{ funcao: 'contencao', foco: 'roubada-de-bola' }],
    meio_campo_central: [{ funcao: 'box-to-box', foco: 'roubada-de-bola' }, { funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'meia-pelas-pontas', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'centroavante', foco: 'versatil' }, { funcao: 'oportunista', foco: 'versatil' }]
};
const PRESSAOINDIVIDUAL_AJUSTES_TIER1 = [
    'MEI (Meia-Atacante): o pedido junta "MCs / MEIs" numa só regra ("Box-to-Box ou Contenção"), mas esse grupo não tem nenhuma das duas funções (exclusivas de Volante/Meio-Campo) — usei "Meia pelas Pontas"/Equilibrado, a única função desse grupo com foco "alterna igualmente entre o ataque e a defesa", coerente com "o meia precisa desarmar tanto quanto arma" (e sem ser coberta pela especialidade "MeioCampo/Armador Clássico", que não pode escapar impune da penalidade de Afinidade Tática). O grupo Meio-Campo (MC) recebeu as duas opções literais do pedido, uma pra cada slot.'
];
const PRESSAOINDIVIDUAL_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'goleiro-libero', foco: 'equilibrado' }],
    zagueiro: [{ funcao: 'zagueiro-aberto', foco: 'combatividade' }],
    lateral: [{ funcao: 'ala-atacante', foco: 'ataque' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'ataque' }],
    meia_atacante: [{ funcao: 'meia-pelas-pontas', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'ala', foco: 'ataque' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'oportunista', foco: 'ataque' }, { funcao: 'pivo', foco: 'ataque' }]
};
const PRESSAOINDIVIDUAL_AJUSTES_TIER2 = [
    'LD/LE (Lateral) e MD/ME (Meia-Lateral) são grupos diferentes no motor — o pedido oferece "Ala (Ataque) / Ala Atacante" como duas opções, mas cada uma só existe de fato num dos grupos: usei "Ala Atacante"/Ataque pro grupo Lateral e "Ala"/Ataque pro grupo Meia-Lateral, a combinação literal que bate com o catálogo real de cada um.',
    'VOL e MC são grupos diferentes no motor — o pedido junta os dois em "Box-to-Box (Ataque)". O grupo Volante não tem Box-to-Box (nem nenhuma função com foco Ataque) — usei "Volante Oportunista"/Equilibrado, a opção mais avançada disponível. O grupo Meio-Campo tem Box-to-Box mas sem foco Ataque (só Equilibrado/Roubada de Bola) — usei "Armador"/Ataque, que tem esse foco de verdade.',
    'GL, MEI e PD/PE não foram mencionados nesta faixa — mantive as escolhas da faixa Equilibrado/Ofensivo (o MEI já era um substituto — "Meia pelas Pontas"/Equilibrado — por esse grupo não ter Box-to-Box/Contenção).'
];
const PRESSAOINDIVIDUAL_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo
    goleiro: [{ funcao: 'goleiro', foco: 'defesa' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'meia-pelas-pontas', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'defesa' }],
    ponta: [{ funcao: 'ala', foco: 'equilibrado' }],
    atacante: [{ funcao: 'centroavante', foco: 'apoio' }]
};
const PRESSAOINDIVIDUAL_AJUSTES_TIER3 = [
    'GL não foi mencionado nesta faixa — troquei o "Goleiro-Líbero" (mandatório só na faixa Equilibrado/Ofensivo) pelo "Goleiro" tradicional/Defesa, mais contido e coerente com a postura defensiva.',
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo (só existe no grupo Meia-Lateral), e nenhuma função do grupo Ponta tem foco Defesa — usei "Ala"/Equilibrado, a opção mais contida disponível. MD/ME (Meia-Lateral) usou a opção literal do pedido: "Meia Aberto"/Defesa.',
    'MEI não foi mencionado nesta faixa — mantive o substituto "Meia pelas Pontas"/Equilibrado, a mesma troca já necessária na faixa Equilibrado/Ofensivo (esse grupo não tem Box-to-Box/Contenção).'
];

// -------------------------------------------------------------------------------------
// PASSE VERTICAL RÁPIDO DINÂMICO (Sarriball) — mesmo mecanismo, aqui aplicado à construção
// vertical de um/dois toques. `estrategiaFormacao` de cada Foco: Defensivo/Ext.Defensivo pesa
// mais defensores/linha de 5 ('defensiva'); Equilibrado/Segura o Jogo pesa o meio-campo mais
// estruturado ('equilibrada'); Ofensivo/Ext.Ofensivo/Tudo ou Nada pesa mais atacantes/meias
// ofensivos ('ofensiva') — a mesma regra de ouro genérica compartilhada por todos os presets
// refinados, mesmo o pedido descrevendo a formação ideal de cada faixa em termos de "meio-campo
// denso" ou "verticalidade central" em vez de contagem literal de defensores/atacantes.
// -------------------------------------------------------------------------------------
const SARRIBALL_FUNCOES_TIER1 = { // Foco: Equilibrado ou Ofensivo — "A Isca de De Zerbi"
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'armacao' }],
    lateral: [{ funcao: 'lateral-invertido', foco: 'equilibrado' }, { funcao: 'lateral', foco: 'equilibrado' }],
    volante: [{ funcao: 'armador-recuado', foco: 'armacao' }, { funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'deslocamento' }],
    meia_atacante: [{ funcao: 'atacante-sombra', foco: 'ataque' }],
    meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    atacante: [{ funcao: 'falso-9', foco: 'ataque' }, { funcao: 'oportunista', foco: 'versatil' }]
};
const SARRIBALL_AJUSTES_TIER1 = [
    'LD/LE (Lateral): "Lateral Invertido" não tem foco Ataque nesse grupo (só Defesa/Equilibrado) — usei Equilibrado, a opção real mais próxima da mobilidade pedida. "Lateral" (a 2ª opção do pedido) bate literal com foco Equilibrado.',
    'VOLs: o pedido pede uma função pra cada um dos 2 volantes ("um organiza, o outro acelera") — "Box-to-Box" não existe no grupo Volante (só existe no Meio-Campo) — usei "Volante Oportunista"/Equilibrado pro 2º slot, a única função avançada real desse grupo (sem foco Ataque/Deslocamento disponível).',
    'MC (Meio-Campo) e MEI (Meia-Atacante) são grupos diferentes no motor — o pedido oferece "Atacante Sombra" ou "Armador" como alternativas: usei "Atacante Sombra"/Ataque pro MEI (a única função com esse nome, e que existe de verdade só nesse grupo) e "Armador"/Deslocamento pro MC (a outra opção, válida literalmente nesse grupo).'
];
const SARRIBALL_FUNCOES_TIER2 = { // Foco: Extremamente Ofensivo ou Tudo ou Nada
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'sai-jogando', foco: 'combatividade' }],
    lateral: [{ funcao: 'lateral-invertido', foco: 'equilibrado' }, { funcao: 'lateral', foco: 'equilibrado' }],
    volante: [{ funcao: 'volante-oportunista', foco: 'equilibrado' }],
    meio_campo_central: [{ funcao: 'armador', foco: 'ataque' }],
    meia_atacante: [{ funcao: 'atacante-sombra', foco: 'ataque' }],
    meia_lateral: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    ponta: [{ funcao: 'corta-pra-dentro', foco: 'ataque' }],
    atacante: [{ funcao: 'oportunista', foco: 'ataque' }, { funcao: 'falso-9', foco: 'ataque' }]
};
const SARRIBALL_AJUSTES_TIER2 = [
    'VOL e MC são grupos diferentes no motor — o pedido junta os dois em "Box-to-Box (Ataque)". O grupo Volante não tem Box-to-Box (nem foco Ataque em nenhuma função) — usei "Volante Oportunista"/Equilibrado, a única função avançada real desse grupo. O grupo Meio-Campo tem Box-to-Box mas sem foco Ataque (só Equilibrado/Roubada de Bola) — usei "Armador"/Ataque, que tem esse foco de verdade.',
    'GL, Lateral e MEI não foram mencionados nesta faixa — mantive as escolhas da faixa Equilibrado/Ofensivo.'
];
const SARRIBALL_FUNCOES_TIER3 = { // Foco: Defensivo ou Extremamente Defensivo
    goleiro: [{ funcao: 'gl-sai-jogando', foco: 'armacao' }],
    zagueiro: [{ funcao: 'defesa', foco: 'defesa' }, { funcao: 'sai-jogando', foco: 'defesa' }],
    lateral: [{ funcao: 'lateral', foco: 'defesa' }],
    volante: [{ funcao: 'armador-recuado', foco: 'defesa' }, { funcao: 'contencao', foco: 'defesa' }],
    meio_campo_central: [{ funcao: 'armador-recuado', foco: 'defesa' }, { funcao: 'contencao', foco: 'defesa' }],
    meia_atacante: [{ funcao: 'armador', foco: 'equilibrado' }],
    meia_lateral: [{ funcao: 'meia-aberto', foco: 'armacao' }, { funcao: 'meia-aberto', foco: 'apoio' }],
    ponta: [{ funcao: 'armador-aberto', foco: 'armacao' }],
    atacante: [{ funcao: 'oportunista', foco: 'apoio' }]
};
const SARRIBALL_AJUSTES_TIER3 = [
    'ATA: "Falso 9" não tem foco Apoio nesse grupo (só Ataque/Armação) — usei "Oportunista"/Apoio, a outra função do falso-atacante já usada nas faixas ofensivas deste preset, que tem esse foco de verdade.',
    'PD/PE (Ponta): "Meia Aberto" não existe nesse grupo (só existe no grupo Meia-Lateral) — usei "Armador Aberto"/Armação, a função mais próxima em espírito (um ponta que recua pra ajudar a armar). MD/ME (Meia-Lateral) usou a opção literal do pedido: "Meia Aberto", variando entre Armação e Apoio nos dois slots.',
    'MEI (Meia-Atacante) não foi mencionado nesta faixa — troquei pro "Armador"/Equilibrado, mais contido que o "Atacante Sombra"/Ataque das faixas ofensivas.'
];

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
        ajustes: ['Meia-Atacante (MEI): "Corta pra Dentro" não existe nesse grupo — usei "Atacante Sombra" com foco Ataque, mesma ideia de corrida tardia pra dentro da área.'],
        // ---------------------------------------------------------------------------------
        // REFINAMENTO POR FOCO DA PARTIDA (pedido do treinador) — pra este preset, o "Foco
        // Tático da Partida" (declarar-partida-foco) deixa de ser inerte: passa a decidir,
        // dinamicamente, a formação (regra de ouro), o pacote tático (predefinição/armação/
        // linha) e a matriz de função por posição, tudo amarrado com a Diretriz Estratégica
        // através da Regra de Afinidade Tática (selecionarEscalacaoPorAfinidadeTatica, em
        // chat-ia.js). `refinado: true` é o sinal que declararPartidaIA() usa pra saber que
        // este preset tem essa camada extra — os outros 10 presets continuam do jeito que
        // sempre foram (config fixa, Foco inerte).
        //
        // `estrategiaFormacao` de cada Foco alimenta a "regra de ouro" da Seleção Dinâmica da
        // Formação (escolherEsquemaPorFoco, mais abaixo): 'defensiva' (mais defensores/linha
        // de 5, senão mais volantes), 'equilibrada' (meio-campo mais estruturado) ou
        // 'ofensiva' (mais atacantes/meias ofensivos).
        //
        // Todo combo de predefinição/armação/linha abaixo já foi validado contra as travas
        // reais de PREDEFINICOES_TATICAS (js/taticas.js) — nenhum é corrigido por
        // corrigirTatica() em tempo de execução, mas ela roda mesmo assim como rede de
        // segurança (igual ao preset base acima).
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 75,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: GEGENPRESSING_FUNCOES_TIER1,
                ajustes: GEGENPRESSING_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: GEGENPRESSING_FUNCOES_TIER1,
                ajustes: GEGENPRESSING_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 95,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: GEGENPRESSING_FUNCOES_TIER2,
                ajustes: GEGENPRESSING_AJUSTES_TIER2
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: GEGENPRESSING_FUNCOES_TIER2,
                ajustes: GEGENPRESSING_AJUSTES_TIER2
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'contra-ataque', abordagemDefensiva: 50,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: GEGENPRESSING_FUNCOES_TIER3,
                ajustes: GEGENPRESSING_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 20,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: GEGENPRESSING_FUNCOES_TIER3,
                ajustes: GEGENPRESSING_AJUSTES_TIER3.concat(['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (sair rápido pro ataque assim que recupera a bola).'])
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: GEGENPRESSING_FUNCOES_TIER4,
                ajustes: GEGENPRESSING_AJUSTES_TIER4
            }
        }
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
        ajustes: ['Pontas: "Meia pelas Pontas" não existe nos grupos Meia-Lateral/Ponta — usei "Ala" com foco Equilibrado, o comportamento mais próximo disponível.'],
        // Ver o comentário no preset Gegenpressing acima sobre REFINAMENTO POR FOCO DA
        // PARTIDA — mesmo mecanismo, aqui aplicado ao Tiki-Taka. `estrategiaFormacao` de
        // cada Foco: Defensivo/Ext.Defensivo pesa concentração defensiva ('defensiva'),
        // Equilibrado/Segura o Jogo pesa meio-campo estruturado pra criar triângulos
        // ('equilibrada'), Ofensivo/Ext.Ofensivo/Tudo ou Nada pesa presença ofensiva
        // ('ofensiva') — a mesma "regra de ouro" genérica de escolherEsquemaPorFoco.
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 65,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: TIKITAKA_FUNCOES_TIER1,
                ajustes: TIKITAKA_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 75,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: TIKITAKA_FUNCOES_TIER1,
                ajustes: TIKITAKA_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'passe-curto', abordagemDefensiva: 90,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: TIKITAKA_FUNCOES_TIER2,
                ajustes: TIKITAKA_AJUSTES_TIER2.concat(['Abordagem defensiva: o pedido rotulou 90 como "Extremo Avançada", mas no jogo essa faixa só começa em 91 — 90 cai em "Avançada" (61-90). Mantive o número exato pedido (90); a faixa real que ele ativa é Avançada.'])
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'passe-curto', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: TIKITAKA_FUNCOES_TIER2,
                ajustes: TIKITAKA_AJUSTES_TIER2
            },
            defensivo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 45,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: TIKITAKA_FUNCOES_TIER3,
                ajustes: TIKITAKA_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 25,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: TIKITAKA_FUNCOES_TIER3,
                ajustes: TIKITAKA_AJUSTES_TIER3
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 50,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: TIKITAKA_FUNCOES_TIER4,
                ajustes: TIKITAKA_AJUSTES_TIER4
            }
        }
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
        ajustes: ['Volante: "Armador" não existe nesse grupo — usei "Armador Recuado" com foco Deslocamento, a versão mais defensiva da mesma ideia.'],
        // Ver o comentário no preset Gegenpressing sobre REFINAMENTO POR FOCO DA PARTIDA —
        // mesmo mecanismo, aqui aplicado ao Futebol Relacional. `estrategiaFormacao` de cada
        // Foco: Defensivo/Ext.Defensivo pesa compactação central ('defensiva'), Equilibrado/
        // Segura o Jogo pesa meio-campo estruturado pra formar losangos ('equilibrada'),
        // Ofensivo/Ext.Ofensivo/Tudo ou Nada pesa volume ofensivo ('ofensiva').
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: RELACIONAL_FUNCOES_TIER1,
                ajustes: RELACIONAL_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 75,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: RELACIONAL_FUNCOES_TIER1,
                ajustes: RELACIONAL_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'passe-curto', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: RELACIONAL_FUNCOES_TIER2,
                ajustes: RELACIONAL_AJUSTES_TIER2
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: RELACIONAL_FUNCOES_TIER2,
                ajustes: RELACIONAL_AJUSTES_TIER2
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 45,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: RELACIONAL_FUNCOES_TIER3,
                ajustes: RELACIONAL_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 25,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: RELACIONAL_FUNCOES_TIER3,
                ajustes: RELACIONAL_AJUSTES_TIER3
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 50,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: RELACIONAL_FUNCOES_TIER4,
                ajustes: RELACIONAL_AJUSTES_TIER4
            }
        }
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
        ],
        // Ver o comentário no preset Gegenpressing sobre REFINAMENTO POR FOCO DA PARTIDA —
        // mesmo mecanismo, aqui aplicado ao Catenaccio. `estrategiaFormacao` de cada Foco:
        // Defensivo/Ext.Defensivo/Segura o Jogo pesa concentração defensiva ('defensiva' —
        // linha de 5, senão mais volantes, exatamente a regra de ouro que o pedido descreve),
        // Equilibrado pesa meio-campo estruturado ('equilibrada'), Ofensivo/Ext.Ofensivo/
        // Tudo ou Nada pesa presença ofensiva mantendo solidez ('ofensiva').
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 35,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: CATENACCIO_FUNCOES_TIER1,
                ajustes: CATENACCIO_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 50,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: CATENACCIO_FUNCOES_TIER1,
                ajustes: CATENACCIO_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'padrao', estiloArmacao: 'contra-ataque', abordagemDefensiva: 65,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: CATENACCIO_FUNCOES_TIER2,
                ajustes: CATENACCIO_AJUSTES_TIER2
            },
            tudo_ou_nada: {
                predefinicao: 'padrao', estiloArmacao: 'contra-ataque', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: CATENACCIO_FUNCOES_TIER2,
                ajustes: CATENACCIO_AJUSTES_TIER2.concat(['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (jogo direto, corridas nas costas da defesa).'])
            },
            defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 25,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: CATENACCIO_FUNCOES_TIER3,
                ajustes: CATENACCIO_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 10,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: CATENACCIO_FUNCOES_TIER3,
                ajustes: CATENACCIO_AJUSTES_TIER3.concat(['Armação: o pedido citava "Ligação Direta" de novo aqui — mesmo caso do Foco Tudo ou Nada, usei "Contra-ataque".'])
            },
            segura_o_jogo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 15,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: CATENACCIO_FUNCOES_TIER4,
                ajustes: CATENACCIO_AJUSTES_TIER4
            }
        }
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
        ajustes: [],
        // Ver o comentário no preset Gegenpressing sobre REFINAMENTO POR FOCO DA PARTIDA —
        // mesmo mecanismo, aqui aplicado ao Jogo pelas Pontas. `estrategiaFormacao` de cada
        // Foco: Defensivo/Ext.Defensivo pesa concentração defensiva ('defensiva'), Equilibrado/
        // Segura o Jogo pesa a dobradinha Lateral+Ponta ('equilibrada'), Ofensivo/Ext.Ofensivo/
        // Tudo ou Nada pesa amplitude no terço final ('ofensiva').
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'equilibrado', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: PONTAS_FUNCOES_TIER1,
                ajustes: PONTAS_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'equilibrado', abordagemDefensiva: 75,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: PONTAS_FUNCOES_TIER1,
                ajustes: PONTAS_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'contra-ataque', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: PONTAS_FUNCOES_TIER2,
                ajustes: PONTAS_AJUSTES_TIER2
            },
            tudo_ou_nada: {
                predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: PONTAS_FUNCOES_TIER2,
                ajustes: PONTAS_AJUSTES_TIER2.concat(['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (transição rápida buscando os alas).'])
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 45,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: PONTAS_FUNCOES_TIER3,
                ajustes: PONTAS_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 25,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: PONTAS_FUNCOES_TIER3,
                ajustes: PONTAS_AJUSTES_TIER3.concat(['Armação: o pedido citava "Ligação Direta" de novo aqui — mesmo caso do Foco Tudo ou Nada, usei "Contra-ataque" ("rebate a bola pros pontas correrem" é literalmente uma transição rápida).'])
            },
            segura_o_jogo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: PONTAS_FUNCOES_TIER4,
                ajustes: PONTAS_AJUSTES_TIER4
            }
        }
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
        ajustes: ['A predefinição "Ligação direta" só permite abordagem defensiva na faixa Equilibrada — fixei em 50/100 (a opção "Recuada" não é selecionável junto com ela no jogo).'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'ligacao-direta', estiloArmacao: 'equilibrado', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: LIGACAODIRETA_FUNCOES_TIER1,
                ajustes: LIGACAODIRETA_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'ligacao-direta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 60,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: LIGACAODIRETA_FUNCOES_TIER1,
                ajustes: LIGACAODIRETA_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 80,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: LIGACAODIRETA_FUNCOES_TIER2,
                ajustes: LIGACAODIRETA_AJUSTES_TIER2.concat(['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo (é o próprio nome deste estilo), não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (transição rápida e vertical).'])
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: LIGACAODIRETA_FUNCOES_TIER2,
                ajustes: LIGACAODIRETA_AJUSTES_TIER2.concat(['Armação: o pedido citava "Ligação Direta" de novo aqui — mesmo caso do Foco Extremamente Ofensivo, usei "Contra-ataque" ("chuveirinho no desespero" é literalmente jogo direto e vertical).'])
            },
            defensivo: {
                predefinicao: 'ligacao-direta', estiloArmacao: 'equilibrado', abordagemDefensiva: 35,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: LIGACAODIRETA_FUNCOES_TIER3,
                ajustes: LIGACAODIRETA_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 15,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: LIGACAODIRETA_FUNCOES_TIER3,
                ajustes: LIGACAODIRETA_AJUSTES_TIER3.concat(['Armação: o pedido citava "Ligação Direta" mais uma vez — mesmo caso das outras 2 faixas, usei "Contra-ataque" (a Retranca Total já trava a linha recuada; o time ainda sai rápido assim que rouba a bola).'])
            },
            segura_o_jogo: {
                predefinicao: 'ligacao-direta', estiloArmacao: 'equilibrado', abordagemDefensiva: 40,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: LIGACAODIRETA_FUNCOES_TIER3,
                ajustes: LIGACAODIRETA_AJUSTES_TIER3
            }
        }
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
        ajustes: ['Pontas na função Meia-Lateral (MD/ME): "Corta pra Dentro" não tem foco Deslocamento nesse grupo — usei Equilibrado, o mais próximo do "explorar a lacuna deixada" pedido. Já como Ponta clássica (PD/PE) o foco Deslocamento existe normalmente.'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: TRANSICAOLETAL_FUNCOES_TIER1,
                ajustes: TRANSICAOLETAL_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 55,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: TRANSICAOLETAL_FUNCOES_TIER1,
                ajustes: TRANSICAOLETAL_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 70,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: TRANSICAOLETAL_FUNCOES_TIER2,
                ajustes: TRANSICAOLETAL_AJUSTES_TIER2
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 90,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: TRANSICAOLETAL_FUNCOES_TIER2,
                ajustes: TRANSICAOLETAL_AJUSTES_TIER2.concat(['Linha Defensiva: o pedido rotulou 90 como "Extremo Avançada", mas nas faixas reais do jogo 90 cai em "Avançada" (61-90) — "Extremo Avançada" começa em 91. Mantive o valor literal (90), só corrigindo o rótulo.'])
            },
            defensivo: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 35,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: TRANSICAOLETAL_FUNCOES_TIER3,
                ajustes: TRANSICAOLETAL_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 20,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: TRANSICAOLETAL_FUNCOES_TIER3,
                ajustes: TRANSICAOLETAL_AJUSTES_TIER3
            },
            segura_o_jogo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: TRANSICAOLETAL_FUNCOES_TIER1,
                ajustes: TRANSICAOLETAL_AJUSTES_TIER1.concat(['Segura o Jogo não foi mencionado na Matriz Dinâmica de Funções (seção 3) do pedido — como a Seleção de Formação (seção 1) já agrupa esse Foco com Equilibrado, usei a mesma Matriz da faixa Equilibrado/Ofensivo.'])
            }
        }
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
        ajustes: ['A predefinição "Posse de bola" trava o estilo de armação em Passe Curto — mantém a base de circulação rápida em toques curtos que sustenta as trocas de posição do Futebol Total.'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 75,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: FUTEBOLTOTAL_FUNCOES_TIER1,
                ajustes: FUTEBOLTOTAL_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: FUTEBOLTOTAL_FUNCOES_TIER1,
                ajustes: FUTEBOLTOTAL_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 95,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: FUTEBOLTOTAL_FUNCOES_TIER2,
                ajustes: FUTEBOLTOTAL_AJUSTES_TIER2
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: FUTEBOLTOTAL_FUNCOES_TIER2,
                ajustes: FUTEBOLTOTAL_AJUSTES_TIER2
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 55,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: FUTEBOLTOTAL_FUNCOES_TIER3,
                ajustes: FUTEBOLTOTAL_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 30,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: FUTEBOLTOTAL_FUNCOES_TIER3,
                ajustes: FUTEBOLTOTAL_AJUSTES_TIER3
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: FUTEBOLTOTAL_FUNCOES_TIER1,
                ajustes: FUTEBOLTOTAL_AJUSTES_TIER1.concat(['Segura o Jogo não foi mencionado na Matriz Dinâmica de Funções (seção 3) do pedido — como a Seleção de Formação (seção 1) já agrupa esse Foco com Equilibrado, usei a mesma Matriz da faixa Equilibrado/Ofensivo.'])
            }
        }
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
        ajustes: [],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 80,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: PRESSAOINDIVIDUAL_FUNCOES_TIER1,
                ajustes: PRESSAOINDIVIDUAL_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 90,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: PRESSAOINDIVIDUAL_FUNCOES_TIER1,
                ajustes: PRESSAOINDIVIDUAL_AJUSTES_TIER1.concat(['Linha Defensiva: o pedido rotulou 90 como "Extremo Avançada", mas nas faixas reais do jogo 90 cai em "Avançada" (61-90) — "Extremo Avançada" começa em 91. Mantive o valor literal (90), só corrigindo o rótulo.'])
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: PRESSAOINDIVIDUAL_FUNCOES_TIER2,
                ajustes: PRESSAOINDIVIDUAL_AJUSTES_TIER2
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: PRESSAOINDIVIDUAL_FUNCOES_TIER2,
                ajustes: PRESSAOINDIVIDUAL_AJUSTES_TIER2
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 55,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: PRESSAOINDIVIDUAL_FUNCOES_TIER3,
                ajustes: PRESSAOINDIVIDUAL_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 30,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: PRESSAOINDIVIDUAL_FUNCOES_TIER3,
                ajustes: PRESSAOINDIVIDUAL_AJUSTES_TIER3.concat(['Armação: "Ligação Direta" foi citada como se fosse um Estilo de Armação, mas na verdade é uma Predefinição Tática (id: ligacao-direta) — os 3 Estilos de Armação reais são só Passe Curto/Equilibrado/Contra-ataque. Usei Contra-ataque, o mais próximo em espírito de "recuar e sair rápido pro ataque quando a bola é roubada".'])
            },
            segura_o_jogo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: PRESSAOINDIVIDUAL_FUNCOES_TIER1,
                ajustes: PRESSAOINDIVIDUAL_AJUSTES_TIER1.concat(['Segura o Jogo não foi mencionado na Matriz Dinâmica de Funções (seção 3) do pedido — como a Seleção de Formação (seção 1) já agrupa esse Foco com Equilibrado, usei a mesma Matriz da faixa Equilibrado/Ofensivo.'])
            }
        }
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
        ajustes: [],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: SARRIBALL_FUNCOES_TIER1,
                ajustes: SARRIBALL_AJUSTES_TIER1
            },
            ofensivo: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: SARRIBALL_FUNCOES_TIER1,
                ajustes: SARRIBALL_AJUSTES_TIER1
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: SARRIBALL_FUNCOES_TIER2,
                ajustes: SARRIBALL_AJUSTES_TIER2
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                funcoesPorGrupo: SARRIBALL_FUNCOES_TIER2,
                ajustes: SARRIBALL_AJUSTES_TIER2
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 50,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: SARRIBALL_FUNCOES_TIER3,
                ajustes: SARRIBALL_AJUSTES_TIER3
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 30,
                estrategiaFormacao: 'defensiva',
                funcoesPorGrupo: SARRIBALL_FUNCOES_TIER3,
                ajustes: SARRIBALL_AJUSTES_TIER3
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 50,
                estrategiaFormacao: 'equilibrada',
                funcoesPorGrupo: SARRIBALL_FUNCOES_TIER1,
                ajustes: SARRIBALL_AJUSTES_TIER1.concat(['Segura o Jogo não foi mencionado na Matriz Dinâmica de Funções (seção 3) do pedido — como a Seleção de Formação (seção 1) já agrupa esse Foco com Equilibrado, usei a mesma Matriz da faixa Equilibrado/Ofensivo. A predefinição "Posse de Bola" trava o estilo de armação em Passe Curto — exatamente o que o pedido já pedia pra esse Foco.'])
            }
        }
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
// SELEÇÃO DINÂMICA DA FORMAÇÃO POR FOCO (pedido do treinador, só pra presets `refinado`) —
// entre as até 4 formações priorizadas, escolhe pela "regra de ouro" do Foco ativo em vez de
// por interseção com um "formato ideal" fixo: Defensivo/Ext.Defensivo pesa quem tem mais
// defensores (prioriza linha de 5 se alguma tiver); Equilibrado/Segura o Jogo pesa o
// meio-campo mais estruturado; Ofensivo/Ext.Ofensivo/Tudo ou Nada pesa quem tem mais
// atacantes/meias ofensivos. Empate desfeito pela ordem de prioridade do treinador.
// -------------------------------------------------------------------------------------
function _perfilContagemFormacao(esquema) {
    let coords = coordsFormacoes[esquema] || [];
    let contagem = { defensores: 0, volantes: 0, meioEstruturado: 0, atacantesOuMeiasOfensivos: 0 };
    coords.forEach(c => {
        let grupo = grupoFuncaoDoRole(c.role);
        if (grupo === 'zagueiro' || grupo === 'lateral') contagem.defensores++;
        if (grupo === 'volante') contagem.volantes++;
        if (grupo === 'volante' || grupo === 'meio_campo_central' || grupo === 'meia_atacante') contagem.meioEstruturado++;
        if (grupo === 'atacante' || grupo === 'meia_atacante') contagem.atacantesOuMeiasOfensivos++;
    });
    return contagem;
}

function escolherEsquemaPorFoco(formacoesPreferidas, estrategiaFormacao) {
    let validas = (formacoesPreferidas || []).filter(f => f && coordsFormacoes[f]).slice(0, MAX_FORMACOES_PREFERIDAS);
    if (!validas.length) return { esquema: null, preteridas: [] };

    let comContagem = validas.map((formacao, indice) => ({ formacao, indice, contagem: _perfilContagemFormacao(formacao) }));
    let pontuadas;
    if (estrategiaFormacao === 'defensiva') {
        // "mais defensores ou linha de 5. Se não houver linha de 5, escolhe a que tiver mais volantes."
        let maxDefensores = Math.max(...comContagem.map(c => c.contagem.defensores));
        let temLinhaDeCinco = maxDefensores >= 5;
        pontuadas = comContagem.map(c => ({ formacao: c.formacao, indice: c.indice, pontuacao: temLinhaDeCinco ? c.contagem.defensores : c.contagem.volantes }));
    } else if (estrategiaFormacao === 'ofensiva') {
        pontuadas = comContagem.map(c => ({ formacao: c.formacao, indice: c.indice, pontuacao: c.contagem.atacantesOuMeiasOfensivos }));
    } else { // 'equilibrada'
        pontuadas = comContagem.map(c => ({ formacao: c.formacao, indice: c.indice, pontuacao: c.contagem.meioEstruturado }));
    }
    pontuadas.sort((a, b) => b.pontuacao - a.pontuacao || a.indice - b.indice);
    let [escolhida, ...resto] = pontuadas;

    return {
        esquema: escolhida.formacao,
        preteridas: resto.map(p => ({ formacao: p.formacao, motivo: 'menos indicada que a escolhida pra esta postura tática' }))
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
// RELATÓRIO REFINADO POR FOCO (pedido do treinador) — só pra presets com `refinado: true`
// (hoje só o Gegenpressing). Ponto de entrada usado por declararPartidaIA() quando o Estilo
// de Jogo salvo é um preset refinado E o treinador escolheu um Foco Tático da Partida:
// substitui a escolha de formação por interseção (escolherEsquemaPorPrioridade) pela regra
// de ouro por Foco (escolherEsquemaPorFoco) e o pacote tático/matriz de função fixos do
// preset pela faixa (porFoco[focoId]) correspondente ao Foco ativo.
// -------------------------------------------------------------------------------------
function gerarRelatorioTaticoRefinadoPorFoco(formacoesPreferidas, presetId, focoId) {
    let preset = presetPorId(presetId);
    if (!preset || !preset.refinado || !preset.porFoco || !preset.porFoco[focoId]) return null;
    let tier = preset.porFoco[focoId];

    let { esquema, preteridas } = escolherEsquemaPorFoco(formacoesPreferidas, tier.estrategiaFormacao);
    if (!esquema) return null;

    let { tatica: taticaResultante, ajustes: ajustesRegra } = corrigirTatica({
        predefinicao: tier.predefinicao, esquema: esquema,
        estiloArmacao: tier.estiloArmacao, abordagemDefensiva: tier.abordagemDefensiva
    });

    let presetComoFuncoes = { funcoesPorGrupo: tier.funcoesPorGrupo };
    let funcoesPorRole = {};
    (coordsFormacoes[esquema] || []).forEach(c => {
        let f = resolverFuncaoDoSlot(c.role, esquema, presetComoFuncoes, taticaResultante);
        if (f) funcoesPorRole[c.role] = f;
    });

    let nomeFoco = (typeof FOCOS_TATICOS_PARTIDA !== 'undefined' && FOCOS_TATICOS_PARTIDA[focoId]) ? FOCOS_TATICOS_PARTIDA[focoId] : focoId;
    return {
        esquemaEscolhido: esquema,
        esquemaPreteridas: preteridas,
        formacoesPreferidas: (formacoesPreferidas || []).slice(0, MAX_FORMACOES_PREFERIDAS),
        predefinicao: taticaResultante.predefinicao,
        estiloArmacao: taticaResultante.estiloArmacao,
        abordagemDefensiva: taticaResultante.abordagemDefensiva,
        funcoesPorRole: funcoesPorRole,
        ajustesAutomaticos: (tier.ajustes || []).concat(ajustesRegra),
        justificativa: `${preset.emoji} ${preset.nome} — Foco: ${nomeFoco}: formação e função de cada posição recalculadas pra esta postura específica.`,
        origem: { tipo: 'preset', rotulo: preset.nome },
        focoId: focoId,
        estrategiaFormacao: tier.estrategiaFormacao
    };
}

// Preset refinado (Gegenpressing hoje) ativo no save, se algum — usado por declararPartidaIA()
// pra saber se deve rodar a camada extra de Foco (regra de ouro + Afinidade Tática) ou deixar
// o Foco inerte como sempre foi (comportamento padrão pros outros 10 presets/texto livre).
function presetRefinadoAtivo() {
    let t = db[currentSave] && db[currentSave].taticas;
    let origem = t && t.estiloJogoSelecionado;
    if (!origem || origem.tipo !== 'preset') return null;
    let preset = PLAYSTYLE_PRESETS.find(p => p.nome === origem.rotulo);
    return (preset && preset.refinado) ? preset : null;
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
