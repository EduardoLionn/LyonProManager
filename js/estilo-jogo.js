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
// AS MATRIZES DE FUNÇÃO NÃO MORAM MAIS AQUI
// =====================================================================================
// Pedido do treinador: "os planos devem atuar diretamente nas funções dos jogadores... crie
// regras bem claras pra todos os estilos de jogos e planos". Cada preset (e cada Foco de
// partida) tinha a sua própria tabela de função por posição, escrita à mão e independente do
// painel dos 4 planos — era possível o painel dizer "laterais dando amplitude por fora" e o
// Auxiliar mandar dois alas invertidos pra campo, porque eram duas fontes diferentes.
//
// Agora existe UMA fonte só: o DNA dos 4 planos (js/dna-tatico.js). Cada preset declara o DNA
// dele em DNA_POR_PRESET e a matriz de funções é DERIVADA daquele DNA pelas regras de
// REGRAS_FUNCAO_POR_DNA — o mesmo caminho que o treinador percorre quando ajusta os planos na
// mão. O Foco da Partida também deixou de ter tabela própria: ele desloca os planos
// (dnaAjustadoPorFoco) e a matriz sai das mesmas regras. Ver _derivarMatrizesDosPresets(),
// logo abaixo da lista.

const PLAYSTYLE_PRESETS = [
    {
        id: 'gegenpressing', nome: 'Gegenpressing', emoji: '🔥', apelido: 'Heavy Metal Football',
        contexto: 'Pressão pós-perda imediata, alta intensidade e transição rápida ao recuperar a bola.',
        predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 95,
        formacoesIdeais: ['4-3-3', '4-2-3-1'],
        // ---------------------------------------------------------------------------------
        // REFINAMENTO POR FOCO DA PARTIDA — o "Foco Tático da Partida" (declarar-partida-foco)
        // decide a formação (regra de ouro de escolherEsquemaPorFoco) e o pacote tático
        // (predefinição/armação/linha) desta partida. A MATRIZ DE FUNÇÃO não está mais aqui:
        // ela vem do DNA deslocado pelo Foco (dnaAjustadoPorFoco), pra que a função que cada
        // jogador recebe em campo seja sempre a leitura dos 4 planos que o painel mostra.
        //
        // `estrategiaFormacao` de cada Foco alimenta a "regra de ouro" da Seleção Dinâmica da
        // Formação: 'defensiva' (mais defensores/linha de 5, senão mais volantes),
        // 'equilibrada' (meio-campo mais estruturado) ou 'ofensiva' (mais atacantes).
        //
        // Todo combo de predefinição/armação/linha abaixo já foi validado contra as travas
        // reais de PREDEFINICOES_TATICAS (js/taticas.js) — nenhum é corrigido por
        // corrigirTatica() em tempo de execução, mas ela roda mesmo assim como rede de
        // segurança.
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 75,
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 95,
                estrategiaFormacao: 'ofensiva'
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva'
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'contra-ataque', abordagemDefensiva: 50,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 20,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (sair rápido pro ataque assim que recupera a bola).']
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada'
            }
        }
    },
    {
        id: 'tiki-taka', nome: 'Tiki-Taka', emoji: '🎯', apelido: 'Juego de Posición',
        contexto: 'Posse de bola sufocante, passes curtos, triangulações e pressão alta organizada.',
        predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
        formacoesIdeais: ['4-3-3', '4-2-3-1'],
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
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 75,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'passe-curto', abordagemDefensiva: 90,
                estrategiaFormacao: 'ofensiva',
                ajustes: ['Abordagem defensiva: o pedido rotulou 90 como "Extremo Avançada", mas no jogo essa faixa só começa em 91 — 90 cai em "Avançada" (61-90). Mantive o número exato pedido (90); a faixa real que ele ativa é Avançada.']
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'passe-curto', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva'
            },
            defensivo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 45,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 25,
                estrategiaFormacao: 'defensiva'
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 50,
                estrategiaFormacao: 'equilibrada'
            }
        }
    },
    {
        id: 'futebol-relacional', nome: 'Futebol Relacional', emoji: '🌀', apelido: 'Dinizismo / Aproximação',
        contexto: 'Abandono de posições rígidas, aglomeração no setor da bola, passes curtos constantes.',
        predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
        formacoesIdeais: ['4-2-3-1', '4-3-3'],
        // Ver o comentário no preset Gegenpressing sobre REFINAMENTO POR FOCO DA PARTIDA —
        // mesmo mecanismo, aqui aplicado ao Futebol Relacional. `estrategiaFormacao` de cada
        // Foco: Defensivo/Ext.Defensivo pesa compactação central ('defensiva'), Equilibrado/
        // Segura o Jogo pesa meio-campo estruturado pra formar losangos ('equilibrada'),
        // Ofensivo/Ext.Ofensivo/Tudo ou Nada pesa volume ofensivo ('ofensiva').
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 75,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'passe-curto', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva'
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva'
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 45,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 25,
                estrategiaFormacao: 'defensiva'
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 50,
                estrategiaFormacao: 'equilibrada'
            }
        }
    },
    {
        id: 'catenaccio', nome: 'Catenaccio', emoji: '🛡️', apelido: 'Retranca e Contra-Ataque Fluido',
        contexto: 'Foco absoluto na defesa, bloco baixo, compactação extrema e estocadas rápidas.',
        predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 25,
        formacoesIdeais: ['5-2-3', '3-5-2', '4-4-2'],
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
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 50,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'padrao', estiloArmacao: 'contra-ataque', abordagemDefensiva: 65,
                estrategiaFormacao: 'ofensiva'
            },
            tudo_ou_nada: {
                predefinicao: 'padrao', estiloArmacao: 'contra-ataque', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (jogo direto, corridas nas costas da defesa).']
            },
            defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 25,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 10,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta" de novo aqui — mesmo caso do Foco Tudo ou Nada, usei "Contra-ataque".']
            },
            segura_o_jogo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 15,
                estrategiaFormacao: 'defensiva'
            }
        }
    },
    {
        id: 'jogo-pelas-pontas', nome: 'Jogo pelas Pontas', emoji: '↔️', apelido: 'Wing Play Clássico',
        contexto: 'Exploração máxima da largura do campo, sobrecarga nas laterais e cruzamentos na área.',
        predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'equilibrado', abordagemDefensiva: 50,
        formacoesIdeais: ['4-4-2', '4-2-3-1'],
        // Ver o comentário no preset Gegenpressing sobre REFINAMENTO POR FOCO DA PARTIDA —
        // mesmo mecanismo, aqui aplicado ao Jogo pelas Pontas. `estrategiaFormacao` de cada
        // Foco: Defensivo/Ext.Defensivo pesa concentração defensiva ('defensiva'), Equilibrado/
        // Segura o Jogo pesa a dobradinha Lateral+Ponta ('equilibrada'), Ofensivo/Ext.Ofensivo/
        // Tudo ou Nada pesa amplitude no terço final ('ofensiva').
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'equilibrado', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'equilibrado', abordagemDefensiva: 75,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'contra-ataque', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva'
            },
            tudo_ou_nada: {
                predefinicao: 'jogadas-pelas-pontas', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (transição rápida buscando os alas).']
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 45,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 25,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta" de novo aqui — mesmo caso do Foco Tudo ou Nada, usei "Contra-ataque" ("rebate a bola pros pontas correrem" é literalmente uma transição rápida).']
            },
            segura_o_jogo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada'
            }
        }
    },
    {
        id: 'ligacao-direta', nome: 'Ligação Direta', emoji: '🚀', apelido: 'Route One',
        contexto: 'Salta o meio-campo, passes longos diretos para o ataque buscar a 1ª e a 2ª bola.',
        predefinicao: 'ligacao-direta', estiloArmacao: 'equilibrado', abordagemDefensiva: 50,
        formacoesIdeais: ['4-4-2', '5-2-3'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'ligacao-direta', estiloArmacao: 'equilibrado', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'ligacao-direta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 60,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 80,
                estrategiaFormacao: 'ofensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo (é o próprio nome deste estilo), não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (transição rápida e vertical).']
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta" de novo aqui — mesmo caso do Foco Extremamente Ofensivo, usei "Contra-ataque" ("chuveirinho no desespero" é literalmente jogo direto e vertical).']
            },
            defensivo: {
                predefinicao: 'ligacao-direta', estiloArmacao: 'equilibrado', abordagemDefensiva: 35,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 15,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta" mais uma vez — mesmo caso das outras 2 faixas, usei "Contra-ataque" (a Retranca Total já trava a linha recuada; o time ainda sai rápido assim que rouba a bola).']
            },
            segura_o_jogo: {
                predefinicao: 'ligacao-direta', estiloArmacao: 'equilibrado', abordagemDefensiva: 40,
                estrategiaFormacao: 'equilibrada'
            }
        }
    },
    {
        id: 'transicao-letal', nome: 'Transição Ofensiva Letal', emoji: '🎯', apelido: 'Fast Counter',
        contexto: 'Não se importa em ceder a bola — mantém um bloco médio, atrai o adversário e destrói a defesa rival em segundos com a velocidade das pontas ao roubar a bola.',
        predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 50,
        formacoesIdeais: ['4-4-2', '4-2-3-1'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 55,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 70,
                estrategiaFormacao: 'ofensiva'
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 90,
                estrategiaFormacao: 'ofensiva',
                ajustes: ['Linha Defensiva: o pedido rotulou 90 como "Extremo Avançada", mas nas faixas reais do jogo 90 cai em "Avançada" (61-90) — "Extremo Avançada" começa em 91. Mantive o valor literal (90), só corrigindo o rótulo.']
            },
            defensivo: {
                predefinicao: 'contra-ataque', estiloArmacao: 'contra-ataque', abordagemDefensiva: 35,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 20,
                estrategiaFormacao: 'defensiva'
            },
            segura_o_jogo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 45,
                estrategiaFormacao: 'equilibrada',
                ajustes: ['Segura o Jogo não foi mencionado na Matriz Dinâmica de Funções (seção 3) do pedido — como a Seleção de Formação (seção 1) já agrupa esse Foco com Equilibrado, usei a mesma Matriz da faixa Equilibrado/Ofensivo.']
            }
        }
    },
    {
        id: 'futebol-total', nome: 'Futebol Total', emoji: '🌀', apelido: 'Total Football',
        contexto: 'Inteligência espacial e trocas constantes de posição — se o lateral sobe pelo meio, o volante cobre a lateral. Todo mundo ataca, todo mundo defende.',
        predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
        formacoesIdeais: ['4-3-3', '4-2-3-1'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 75,
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 95,
                estrategiaFormacao: 'ofensiva'
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva'
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 55,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 30,
                estrategiaFormacao: 'defensiva'
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada',
                ajustes: ['Segura o Jogo não foi mencionado na Matriz Dinâmica de Funções (seção 3) do pedido — como a Seleção de Formação (seção 1) já agrupa esse Foco com Equilibrado, usei a mesma Matriz da faixa Equilibrado/Ofensivo.']
            }
        }
    },
    {
        id: 'pressao-individual', nome: 'Pressão Alta Individual', emoji: '🐺', apelido: 'Man-to-Man High Press',
        contexto: 'Marcação homem a homem no campo inteiro, sufocando a saída de bola do goleiro rival pra forçar o erro perto do gol adversário. Estilo de risco altíssimo.',
        predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 95,
        formacoesIdeais: ['3-4-1-2', '4-1-4-1'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 80,
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 90,
                estrategiaFormacao: 'ofensiva',
                ajustes: ['Linha Defensiva: o pedido rotulou 90 como "Extremo Avançada", mas nas faixas reais do jogo 90 cai em "Avançada" (61-90) — "Extremo Avançada" começa em 91. Mantive o valor literal (90), só corrigindo o rótulo.']
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva'
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva'
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 55,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 30,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: "Ligação Direta" foi citada como se fosse um Estilo de Armação, mas na verdade é uma Predefinição Tática (id: ligacao-direta) — os 3 Estilos de Armação reais são só Passe Curto/Equilibrado/Contra-ataque. Usei Contra-ataque, o mais próximo em espírito de "recuar e sair rápido pro ataque quando a bola é roubada".']
            },
            segura_o_jogo: {
                predefinicao: 'padrao', estiloArmacao: 'equilibrado', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada',
                ajustes: ['Segura o Jogo não foi mencionado na Matriz Dinâmica de Funções (seção 3) do pedido — como a Seleção de Formação (seção 1) já agrupa esse Foco com Equilibrado, usei a mesma Matriz da faixa Equilibrado/Ofensivo.']
            }
        }
    },
    {
        id: 'sarriball', nome: 'Passe Vertical Rápido', emoji: '🧭', apelido: 'Sarriball',
        contexto: 'Alta posse de bola jogada a um ou dois toques — não é posse pra descansar, é posse vertical pra furar linhas o mais rápido possível usando triângulos curtos.',
        predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
        formacoesIdeais: ['4-3-3', '4-2-3-1'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 60,
                estrategiaFormacao: 'equilibrada'
            },
            ofensivo: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 70,
                estrategiaFormacao: 'ofensiva'
            },
            extremamente_ofensivo: {
                predefinicao: 'pressao-alta', estiloArmacao: 'equilibrado', abordagemDefensiva: 85,
                estrategiaFormacao: 'ofensiva'
            },
            tudo_ou_nada: {
                predefinicao: 'pressao-alta', estiloArmacao: 'contra-ataque', abordagemDefensiva: 100,
                estrategiaFormacao: 'ofensiva'
            },
            defensivo: {
                predefinicao: 'padrao', estiloArmacao: 'passe-curto', abordagemDefensiva: 50,
                estrategiaFormacao: 'defensiva'
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 30,
                estrategiaFormacao: 'defensiva'
            },
            segura_o_jogo: {
                predefinicao: 'posse-de-bola', estiloArmacao: 'passe-curto', abordagemDefensiva: 50,
                estrategiaFormacao: 'equilibrada',
                ajustes: ['Segura o Jogo não foi mencionado na Matriz Dinâmica de Funções (seção 3) do pedido — como a Seleção de Formação (seção 1) já agrupa esse Foco com Equilibrado, usei a mesma Matriz da faixa Equilibrado/Ofensivo. A predefinição "Posse de Bola" trava o estilo de armação em Passe Curto — exatamente o que o pedido já pedia pra esse Foco.']
            }
        }
    },
    {
        id: 'estacionar-onibus', nome: 'Estacionar o Ônibus', emoji: '🚌', apelido: 'Park the Bus',
        contexto: 'Pra segurar resultado em mata-mata, ou quando o time é muito inferior ao adversário: uma barreira intransponível dentro e na borda da própria área.',
        predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 25,
        formacoesIdeais: ['3-5-2', '4-2-3-1'],
        refinado: true,
        porFoco: {
            equilibrado: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 30,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (chutão pra frente e sair rápido assim que sobra a bola).']
            },
            ofensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 30,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (chutão pra frente e sair rápido assim que sobra a bola).', 'O pedido agrupa Equilibrado e Ofensivo na mesma configuração de motor (seção 2) — mantive os dois idênticos, como pedido.']
            },
            extremamente_ofensivo: {
                predefinicao: 'padrao', estiloArmacao: 'contra-ataque', abordagemDefensiva: 45,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (chutão pra frente e sair rápido assim que sobra a bola).']
            },
            tudo_ou_nada: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 1,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (chutão pra frente e sair rápido assim que sobra a bola).']
            },
            defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 20,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (chutão pra frente e sair rápido assim que sobra a bola).']
            },
            extremamente_defensivo: {
                predefinicao: 'retranca-total', estiloArmacao: 'contra-ataque', abordagemDefensiva: 10,
                estrategiaFormacao: 'defensiva',
                ajustes: ['Armação: o pedido citava "Ligação Direta", mas isso é uma PREDEFINIÇÃO tática diferente no jogo, não um dos 3 Estilos de Armação reais — usei "Contra-ataque", o mais parecido em espírito (chutão pra frente e sair rápido assim que sobra a bola).']
            },
            segura_o_jogo: {
                predefinicao: 'retranca-total', estiloArmacao: 'passe-curto', abordagemDefensiva: 10,
                estrategiaFormacao: 'defensiva'
            }
        }
    }
];

// =====================================================================================
// A MATRIZ DE FUNÇÕES DE TODO ESTILO SAI DO DNA DELE — nunca de uma tabela paralela
// =====================================================================================
// Isto é o que garante o pedido do treinador ("os planos traduzem a função de cada jogador em
// campo"): o painel dos 4 planos e as funções que vão pro campo passam a ser, literalmente, a
// mesma informação lida duas vezes. Cada preset ganha aqui:
//   · `dna`             — os 4 planos que descrevem o estilo (DNA_POR_PRESET, js/dna-tatico.js);
//   · `funcoesPorGrupo` — a matriz derivada desse DNA pelas regras de REGRAS_FUNCAO_POR_DNA;
//   · o mesmo par dentro de cada Foco de partida, com o DNA já deslocado pelo Foco.
// Se amanhã uma regra mudar, muda pros 11 presets, pro Camaleão, pro Personalizado e pro
// ajuste manual de uma vez só — não existe mais lugar onde um estilo possa discordar de si.
function _derivarMatrizesDosPresets() {
    if (typeof DNA_POR_PRESET === 'undefined' || typeof funcoesPorGrupoDoDna !== 'function') return;
    PLAYSTYLE_PRESETS.forEach(preset => {
        preset.dna = DNA_POR_PRESET[preset.id] || (typeof dnaPadrao === 'function' ? dnaPadrao() : null);
        if (!preset.dna) return;
        preset.funcoesPorGrupo = funcoesPorGrupoDoDna(preset.dna);
        Object.keys(preset.porFoco || {}).forEach(focoId => {
            let tier = preset.porFoco[focoId];
            tier.dna = dnaAjustadoPorFoco(preset.dna, focoId);
            tier.funcoesPorGrupo = funcoesPorGrupoDoDna(tier.dna);
        });
    });
}
_derivarMatrizesDosPresets();

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
// SELEÇÃO DINÂMICA DA FORMAÇÃO POR FOCO (pedido do treinador) —
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

// =====================================================================================
// FORMAÇÃO OFENSIVA CALCULADA (pedido do treinador) — no EA FC (e no futebol real), a formação
// escolhida é só a postura DEFENSIVA. Com a bola, o time assume outro desenho de verdade,
// conforme a função de cada jogador: um lateral em Ala Atacante/Ala Invertido empurra e vira um
// meio extra; um volante em Zaga recua e forma linha de três com os zagueiros; um jogador pela
// lateral (MD/ME) que Corta pra Dentro fecha pra virar um atacante/meia extra. Isto NUNCA muda o
// esquema salvo nem a escalação em campo — é só um rótulo informativo (Formação Defensiva →
// Formação Ofensiva) calculado a partir das funções já escolhidas, sem IA e sem inventar uma
// formação fora do catálogo (o resultado é sempre um nome que já existe em coordsFormacoes).
// =====================================================================================

// Banda "crua" de cada grupo quando o time defende — goleiro fica de fora da conta (sempre 1,
// implícito, nunca vira dado de formação).
const _BANDA_PADRAO_POR_GRUPO = {
    zagueiro: 'defesa', lateral: 'defesa',
    volante: 'meio', meio_campo_central: 'meio', meia_lateral: 'meio',
    meia_atacante: 'ataque', ponta: 'ataque', atacante: 'ataque'
};

// Só as funções cujo comportamento real em posse de bola desloca o jogador pra outra linha —
// as demais mantêm a banda padrão do grupo. Nada aqui muda a função/foco em si, só a CONTAGEM
// usada pra calcular o desenho ofensivo.
// O foco muda o significado da função tanto quanto a função em si — é o que o motor do jogo
// realmente faz, e o catálogo (js/funcoes-ea.js) já descreve isso na letra:
//   · "Lateral"/Defesa   -> "entra para formar uma linha de três quando o time estiver com a
//                           posse de bola": ou seja, é um TERCEIRO ZAGUEIRO, não um lateral;
//                           com foco Equilibrado/Versátil o mesmo jogador já sobe e vira ala.
//   · "Meia Aberto"      -> é um ala, quase um lateral: com foco Defesa "recua para o meio de
//                           campo defensivo e protege a defesa"; com Apoio/Armação sobe pro lado.
//   · "Zagueiro Aberto"/Apoio -> "avança pelo lado do campo, dando opção de passe".
// Por isso a tabela é indexada por função E por foco (`_padrao` cobre os focos não citados).
const DESLOCAMENTO_OFENSIVO_POR_FUNCAO = {
    zagueiro: {
        'zagueiro-aberto': { apoio: 'meio' } // só com foco Apoio ele realmente sobe pelo lado
    },
    lateral: {
        // "Lateral" é a função conservadora do grupo: fica na linha em qualquer foco. Com foco
        // Defesa ele fecha por dentro e vira o TERCEIRO ZAGUEIRO; com Equilibrado/Versátil sobe
        // "um pouco mais" (palavras do próprio jogo) sem abandonar a linha de quatro. Quem troca
        // de linha de verdade é o Ala e as versões invertidas.
        'lateral': { _padrao: 'defesa' },
        'lateral-invertido': { _padrao: 'meio' },                 // "funciona como volante com a bola"
        'ala': { _padrao: 'meio' },                               // sobe e é ele quem dá a largura
        'ala-invertido': { _padrao: 'meio' },                     // entra no miolo com a bola
        'ala-atacante': { _padrao: 'meio' }                       // vive como ala, à frente da linha
    },
    volante: {
        'zaga': { _padrao: 'defesa' },                            // entra entre os zagueiros: 3º/5º zagueiro
        'meia-pelas-laterais': { armacao: 'meio', _padrao: 'meio' }
    },
    meio_campo_central: {
        'meia-pelas-pontas': { ataque: 'ataque' }                 // com foco Ataque avança livre
    },
    meia_lateral: {
        'meia-aberto': { defesa: 'defesa', _padrao: 'meio' },     // é um ala: com Defesa recua pra linha
        'corta-pra-dentro': { _padrao: 'ataque' },                // fecha pro miolo pra finalizar
        'ala': { ataque: 'ataque', _padrao: 'meio' },
        'armador-aberto': { ataque: 'ataque', _padrao: 'meio' }
    }
};

// Banda pra onde a função/foco leva o jogador em posse de bola, ou null quando ele fica na
// banda padrão do grupo.
function _deslocamentoDaFuncao(grupo, escolha) {
    let tabelaGrupo = escolha && DESLOCAMENTO_OFENSIVO_POR_FUNCAO[grupo];
    let regra = tabelaGrupo && tabelaGrupo[escolha.funcao];
    if (!regra) return null;
    if (Object.prototype.hasOwnProperty.call(regra, escolha.foco)) return regra[escolha.foco];
    return regra._padrao || null;
}

// Conta quantos jogadores (fora o goleiro) acabam em cada banda — se funcoesPorRole for null,
// devolve o perfil "cru" da formação (só pela posição no campinho, sem nenhum deslocamento),
// usado pra descobrir o perfil de cada formação do catálogo na hora de casar o resultado.
function _bandasEmPosse(esquema, funcoesPorRole) {
    let bandas = { defesa: 0, meio: 0, ataque: 0 };
    (coordsFormacoes[esquema] || []).forEach(c => {
        let grupo = grupoFuncaoDoRole(c.role);
        let bandaPadrao = _BANDA_PADRAO_POR_GRUPO[grupo];
        if (!bandaPadrao) return;
        let escolha = funcoesPorRole && funcoesPorRole[c.role];
        bandas[_deslocamentoDaFuncao(grupo, escolha) || bandaPadrao]++;
    });
    return bandas;
}

// Entre todas as formações do catálogo, acha a que tem o perfil de bandas mais parecido com o
// alvo calculado — sempre devolve um nome que já existe de verdade em coordsFormacoes.
function _formacaoMaisParecidaComBandas(bandasAlvo) {
    let melhor = null, melhorDist = Infinity;
    Object.keys(coordsFormacoes).forEach(nome => {
        let bandas = _bandasEmPosse(nome, null);
        let dist = Math.abs(bandas.defesa - bandasAlvo.defesa) + Math.abs(bandas.meio - bandasAlvo.meio) + Math.abs(bandas.ataque - bandasAlvo.ataque);
        if (dist < melhorDist) { melhorDist = dist; melhor = nome; }
    });
    return melhor;
}

// Ponto de entrada: dado o esquema DEFENSIVO já escolhido e a função/foco de cada titular,
// devolve o nome da formação que o time forma de verdade quando tem a bola — ou null quando
// nenhuma função presente desloca ninguém de linha (mesmo desenho nos dois momentos).
function calcularFormacaoOfensiva(esquema, funcoesPorRole) {
    if (!esquema || !coordsFormacoes[esquema] || !funcoesPorRole) return null;
    let bandasBase = _bandasEmPosse(esquema, null);
    let bandasAtaque = _bandasEmPosse(esquema, funcoesPorRole);
    if (bandasAtaque.defesa === bandasBase.defesa && bandasAtaque.meio === bandasBase.meio && bandasAtaque.ataque === bandasBase.ataque) {
        return null;
    }
    let formacaoOfensiva = _formacaoMaisParecidaComBandas(bandasAtaque);
    return (formacaoOfensiva && formacaoOfensiva !== esquema) ? formacaoOfensiva : null;
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

// -------------------------------------------------------------------------------------
// VARIAÇÃO POR ELENCO (pedido do treinador) — dois clubes com o MESMO estilo não podem sair
// com exatamente a mesma matriz de funções: o estilo define o LEQUE de funções aceitas por
// grupo (a identidade tática), e quem decide qual delas vai pra cada lado é o elenco de
// verdade. Um lateral cadastrado como "Ala Ofensivo" fica com a instrução mais ofensiva do
// leque; o do outro lado, cadastrado como "Defensivo", fica com a mais contida — sem que o
// treinador precise configurar nada. Isso NUNCA muda quem joga (isso continua sendo da
// diretriz/escalação), só qual função cada slot recebe dentro do que o estilo já permite.
// -------------------------------------------------------------------------------------
function _jogadorProvavelDoSlot(role) {
    let plantel = (db[currentSave] && db[currentSave].plantel) || [];
    if (!plantel.length || typeof posicaoCompativelComRole !== 'function') return null;
    let compativeis = plantel.filter(p => p.status === 'Ativo' && posicaoCompativelComRole(role, p.posicao));
    if (!compativeis.length) return null;
    return compativeis.slice().sort((a, b) => (b.ovr || 0) - (a.ovr || 0))[0];
}

// O quanto uma função do estilo combina com a especialidade cadastrada do jogador:
// 2 = é a função PADRÃO dele; 1 = ele sabe exercer, mas não é a principal; 0 = não é dele.
function _pontuacaoFuncaoParaJogador(candidato, grupoKey, jogador) {
    if (!jogador || typeof ESPECIALIDADES_JOGADOR === 'undefined') return 0;
    let especialidade = ESPECIALIDADES_JOGADOR[jogador.posicao];
    let aptas = (especialidade && especialidade.gruposFuncao[grupoKey]) || [];
    let posicaoNaLista = aptas.indexOf(candidato.funcao);
    if (posicaoNaLista === 0) return 2;
    if (posicaoNaLista > 0) return 1;
    return 0;
}

// Monta a matriz inteira de funções (role -> {funcao, foco}) de uma vez, em vez de slot a slot:
// só assim dá pra distribuir as funções de um grupo entre os slots daquele grupo sem repetir a
// mesma instrução nos dois lados quando o estilo oferece mais de uma opção.
function montarFuncoesPorRoleDoPreset(esquema, preset, taticaResultante) {
    let coords = coordsFormacoes[esquema] || [];
    let atribuidas = {};
    let gruposPresentes = [];
    coords.forEach(c => {
        let grupo = grupoFuncaoDoRole(c.role);
        if (grupo && gruposPresentes.indexOf(grupo) === -1) gruposPresentes.push(grupo);
    });

    gruposPresentes.forEach(grupo => {
        let candidatos = preset.funcoesPorGrupo && preset.funcoesPorGrupo[grupo];
        let slots = _ordenarSlotsDoGrupo(grupo, coords).map(c => c.role);
        if (!candidatos || !candidatos.length) {
            // Grupo sem regra no estilo — o motor genérico já dá uma função padrão coerente.
            slots.forEach(role => {
                let escolha = escolherFuncaoJogador(role, null, taticaResultante);
                if (escolha) atribuidas[role] = { funcao: escolha.funcao.id, foco: escolha.foco.id };
            });
            return;
        }
        // A variação por elenco só vale nos grupos em que o lado existe de verdade (lateral,
        // ponta, meia-lateral): ali o slot da direita só pode ser ocupado por um jogador de
        // direita, então dá pra saber com segurança quem vai jogar ali e escolher a instrução
        // pensando nele. Nos grupos sem lado (zagueiro, volante, meio-campo, atacante) qualquer
        // um dos slots aceita qualquer jogador do grupo — o "provável ocupante" seria o mesmo pros
        // dois lados e o palpite pode discordar da escalação real que a diretriz monta depois,
        // fazendo o jogador cair numa função que não é dele. Nesses grupos fica a distribuição
        // determinística de sempre (1º slot -> 1ª opção do estilo).
        if (!(typeof GRUPOS_COM_LADO !== 'undefined' && GRUPOS_COM_LADO.has(grupo))) {
            slots.forEach((role, i) => {
                let escolha = candidatos[Math.min(i, candidatos.length - 1)];
                atribuidas[role] = { funcao: escolha.funcao, foco: escolha.foco };
            });
            return;
        }

        // Distribui as funções do estilo entre os slots do grupo pelo melhor encaixe: o par
        // (slot, função) com a maior pontuação é fechado primeiro, depois o próximo melhor entre
        // o que sobrou. Isso evita que um jogador que não combina com nenhuma das opções
        // "consuma" a função mais característica antes do dono natural dela escolher — e, como
        // cada opção é usada uma vez só, os dois lados nunca recebem a mesma instrução enquanto
        // houver variedade no estilo. Sem elenco cadastrado, todas as pontuações empatam em 0 e
        // o desempate pela ordem devolve exatamente o comportamento antigo (slot 1 -> opção 1).
        let disponiveis = candidatos.map((c, i) => ({ candidato: c, ordem: i }));
        let pendentes = slots.map((role, i) => ({ role: role, ordem: i, jogador: _jogadorProvavelDoSlot(role) }));

        while (pendentes.length && disponiveis.length > 1) {
            let melhor = null;
            pendentes.forEach(slot => {
                disponiveis.forEach(opcao => {
                    let pontos = _pontuacaoFuncaoParaJogador(opcao.candidato, grupo, slot.jogador);
                    if (!melhor || pontos > melhor.pontos) melhor = { slot: slot, opcao: opcao, pontos: pontos };
                });
            });
            atribuidas[melhor.slot.role] = { funcao: melhor.opcao.candidato.funcao, foco: melhor.opcao.candidato.foco };
            pendentes = pendentes.filter(s => s !== melhor.slot);
            disponiveis = disponiveis.filter(o => o !== melhor.opcao);
        }
        // Acabou a variedade: quem sobrou fica com a última opção disponível do estilo.
        let ultima = disponiveis.length ? disponiveis[0].candidato : candidatos[candidatos.length - 1];
        pendentes.forEach(slot => { atribuidas[slot.role] = { funcao: ultima.funcao, foco: ultima.foco }; });
    });
    // Devolve na MESMA ordem das coordenadas da formação. A ordem das chaves importa: o motor
    // de escalação por Afinidade Tática (chat-ia.js) percorre este mapa e usa a ordem como
    // desempate — montar por grupo e devolver fora de ordem trocava jogadores de slot sem que
    // nenhuma função tivesse mudado.
    let funcoesPorRole = {};
    coords.forEach(c => { if (atribuidas[c.role]) funcoesPorRole[c.role] = atribuidas[c.role]; });
    return funcoesPorRole;
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

    let funcoesPorRole = montarFuncoesPorRoleDoPreset(esquema, preset, taticaResultante);

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
        dnaEmVigor: preset.dna || null,
        origem: { tipo: 'preset', rotulo: preset.nome }
    };
}

// -------------------------------------------------------------------------------------
// RELATÓRIO REFINADO POR FOCO — vale pra qualquer preset. Ponto de entrada usado por
// declararPartidaIA() quando o Estilo de Jogo salvo é um preset E o treinador escolheu um Foco
// Tático da Partida: substitui a escolha de formação por interseção
// (escolherEsquemaPorPrioridade) pela regra de ouro por Foco (escolherEsquemaPorFoco), e o
// pacote tático pelo da faixa `porFoco[focoId]`.
//
// A MATRIZ DE FUNÇÃO vem do DNA do estilo deslocado pelo Foco (`tier.dna`, montado em
// _derivarMatrizesDosPresets) — é o que amarra estilo, plano e partida numa coisa só: escolher
// "Extremamente Defensivo" desce o bloco, prende os laterais na base e as funções mudam junto,
// em vez de virem de uma tabela que ninguém vê.
// -------------------------------------------------------------------------------------
function gerarRelatorioTaticoRefinadoPorFoco(formacoesPreferidas, presetId, focoId) {
    let preset = presetPorId(presetId);
    if (!preset || !preset.porFoco || !preset.porFoco[focoId]) return null;
    let tier = preset.porFoco[focoId];

    let { esquema, preteridas } = escolherEsquemaPorFoco(formacoesPreferidas, tier.estrategiaFormacao);
    if (!esquema) return null;

    let { tatica: taticaResultante, ajustes: ajustesRegra } = corrigirTatica({
        predefinicao: tier.predefinicao, esquema: esquema,
        estiloArmacao: tier.estiloArmacao, abordagemDefensiva: tier.abordagemDefensiva
    });

    let presetComoFuncoes = { funcoesPorGrupo: tier.funcoesPorGrupo };
    let funcoesPorRole = montarFuncoesPorRoleDoPreset(esquema, presetComoFuncoes, taticaResultante);

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
        justificativa: `${preset.emoji} ${preset.nome} — Foco: ${nomeFoco}: ${(typeof rotuloAjusteDoFoco === 'function' && rotuloAjusteDoFoco(focoId)) || 'formação e função de cada posição recalculadas pra esta postura'}.`,
        dnaEmVigor: tier.dna || preset.dna || null,
        origem: { tipo: 'preset', rotulo: preset.nome },
        focoId: focoId,
        estrategiaFormacao: tier.estrategiaFormacao
    };
}

// -------------------------------------------------------------------------------------
// MESMA CAMADA DE FOCO, PRA QUEM AJUSTOU OS 4 PLANOS NA MÃO — um estilo "<preset> (ajustado)"
// ou "Personalizado (4 planos)" não tem pacote autoral por Foco, então tudo (formação, pacote
// e funções) sai do próprio DNA deslocado pelo Foco da partida. Sem isso, quem mexeu nos planos
// ficava de fora do refinamento por adversário — justamente o contrário do que o treinador
// pediu ("amarre tudo, respeitando o estilo de jogo selecionado").
// -------------------------------------------------------------------------------------
function gerarRelatorioTaticoPorDnaComFoco(formacoesPreferidas, dna, focoId, rotulo) {
    if (typeof dnaAjustadoPorFoco !== 'function') return null;
    let dnaDoJogo = dnaAjustadoPorFoco(dna, focoId);
    let pacote = dnaParaPacoteTatico(dnaDoJogo);
    let estrategia = (typeof ESTRATEGIA_FORMACAO_POR_FOCO !== 'undefined' && ESTRATEGIA_FORMACAO_POR_FOCO[focoId]) || 'equilibrada';

    let { esquema, preteridas } = escolherEsquemaPorFoco(formacoesPreferidas, estrategia);
    if (!esquema) return null;

    let { tatica: taticaResultante, ajustes: ajustesRegra } = corrigirTatica({
        predefinicao: pacote.predefinicao, esquema: esquema,
        estiloArmacao: pacote.estiloArmacao, abordagemDefensiva: pacote.abordagemDefensiva
    });
    let funcoesPorRole = montarFuncoesPorRoleDoPreset(esquema, { funcoesPorGrupo: pacote.funcoesPorGrupo }, taticaResultante);

    let nomeFoco = (typeof FOCOS_TATICOS_PARTIDA !== 'undefined' && FOCOS_TATICOS_PARTIDA[focoId]) ? FOCOS_TATICOS_PARTIDA[focoId] : focoId;
    return {
        esquemaEscolhido: esquema,
        esquemaPreteridas: preteridas,
        formacoesPreferidas: (formacoesPreferidas || []).slice(0, MAX_FORMACOES_PREFERIDAS),
        predefinicao: taticaResultante.predefinicao,
        estiloArmacao: taticaResultante.estiloArmacao,
        abordagemDefensiva: taticaResultante.abordagemDefensiva,
        funcoesPorRole: funcoesPorRole,
        ajustesAutomaticos: ajustesRegra,
        justificativa: `🎛️ ${rotulo || 'Seus 4 planos'} — Foco: ${nomeFoco}: ${rotuloAjusteDoFoco(focoId) || 'planos deslocados pra esta postura'}.`,
        dnaEmVigor: dnaDoJogo,
        origem: { tipo: 'dna-avancado', rotulo: rotulo || 'Personalizado (4 planos)', dna: dnaDoJogo },
        focoId: focoId,
        estrategiaFormacao: estrategia
    };
}

// Estilo montado nos 4 planos (preset ajustado ou Personalizado avançado) ativo no save, se
// algum — o equivalente de presetRefinadoAtivo() pra esse caminho.
function estiloDnaAtivo() {
    let t = db[currentSave] && db[currentSave].taticas;
    let origem = t && t.estiloJogoSelecionado;
    if (!origem || origem.tipo !== 'dna-avancado' || !origem.dna) return null;
    return { dna: origem.dna, rotulo: origem.rotulo };
}

// Preset ativo no save, se algum — usado por declararPartidaIA() pra saber se deve rodar a
// camada extra de Foco (regra de ouro na formação + pacote tático da faixa + Afinidade Tática).
// `refinado` marca os presets que têm PACOTE TÁTICO autoral por Foco; a matriz de funções vem do
// DNA em todos eles, sempre. Fora daqui a mesma camada existe pra quem ajustou os 4 planos
// (estiloDnaAtivo) e pro Personalizado por texto livre (personalizadoAtivo).
function presetRefinadoAtivo() {
    let t = db[currentSave] && db[currentSave].taticas;
    let origem = t && t.estiloJogoSelecionado;
    if (!origem || origem.tipo !== 'preset') return null;
    let preset = PLAYSTYLE_PRESETS.find(p => p.nome === origem.rotulo);
    return (preset && preset.refinado) ? preset : null;
}

// Estilo "Personalizado" (texto livre) ativo no save, se algum — devolve a descrição ORIGINAL
// que o treinador digitou (nunca muda entre partidas). Usado por declararPartidaIA() pra saber
// se deve chamar gerarRelatorioTaticoPersonalizadoPorFoco() e traduzir essa descrição + o Foco
// Tático da Partida ativo agora pra um pacote tático + Matriz Dinâmica de Funções sob medida —
// a mesma "camada extra de Foco" dos presets refinados, só que a Matriz não é uma tabela fixa
// escrita à mão, é gerada pela IA a cada declaração de partida.
function personalizadoAtivo() {
    let t = db[currentSave] && db[currentSave].taticas;
    let origem = t && t.estiloJogoSelecionado;
    if (!origem || origem.tipo !== 'texto-livre-interpretado') return null;
    return origem.rotulo || null;
}

// =====================================================================================
// CAMALEÃO (pedido do treinador) — estilo dinâmico que lê o elenco de verdade e monta a
// tática em cima das peças que o time tem, em vez de seguir um preset fixo. Duas fases:
//  1. Na declaração inicial (assistente de Início de Jogo), ainda não existe elenco
//     cadastrado — não dá pra analisar peça nenhuma, então só salva a ESCOLHA (tipo:
//     'camaleao') com uma tática neutra provisória.
//  2. Já com o elenco populado, o botão "🔄 Atualizar com o Elenco Atual" no Perfil do
//     Treinador chama esta mesma função de novo: agora ela lê os jogadores reais
//     (posição/especialidade cadastrada, OVR, idade) e pede pra IA montar a tática que
//     melhor aproveita ESSAS peças específicas — validada contra o catálogo real do
//     mesmo jeito que o Personalizado (nunca aceita nada fora do vocabulário).
// declararPartidaIA() (chat-ia.js) também aciona isto a cada nova sugestão do Auxiliar,
// mas só refaz a análise (chamada de IA) quando o elenco realmente mudou desde a última
// vez — ver _fingerprintElenco/atualizarCamaleaoSeElencoMudou logo abaixo.
// O Camaleão fica FORA da camada de Foco Tático Dinâmico (Matriz por Foco de partida):
// o pedido descreve só a leitura do elenco, nunca variação por Foco.
// =====================================================================================
async function gerarRelatorioTaticoCamaleao(formacoesPreferidas) {
    let validas = (formacoesPreferidas || []).filter(f => f && coordsFormacoes[f]).slice(0, MAX_FORMACOES_PREFERIDAS);
    if (!validas.length) return null;

    let plantelAtivo = ((db[currentSave] && db[currentSave].plantel) || []).filter(p => p.status === 'Ativo');

    if (!plantelAtivo.length) {
        // Fase 1: ainda sem elenco (declaração no assistente de Início de Jogo) — tática
        // neutra provisória, corrigida pelo mesmo motor de regras de sempre.
        let { esquema, preteridas } = escolherEsquemaPorPrioridade(validas, []);
        esquema = esquema || validas[0];
        let { tatica: taticaResultante, ajustes: ajustesRegra } = corrigirTatica({
            predefinicao: 'equilibrado', esquema: esquema, estiloArmacao: 'equilibrado', abordagemDefensiva: 50
        });
        let funcoesPorRole = {};
        (coordsFormacoes[esquema] || []).forEach(c => {
            let escolha = escolherFuncaoJogador(c.role, null, taticaResultante);
            if (escolha) funcoesPorRole[c.role] = { funcao: escolha.funcao.id, foco: escolha.foco.id };
        });
        return {
            esquemaEscolhido: esquema,
            esquemaPreteridas: preteridas,
            formacoesPreferidas: validas,
            predefinicao: taticaResultante.predefinicao,
            estiloArmacao: taticaResultante.estiloArmacao,
            abordagemDefensiva: taticaResultante.abordagemDefensiva,
            funcoesPorRole: funcoesPorRole,
            ajustesAutomaticos: ajustesRegra.concat(['Ainda não existe elenco cadastrado — usei uma tática neutra provisória. Volte aqui no Perfil do Treinador e clique em "🔄 Atualizar com o Elenco Atual" depois de montar o time, pra eu analisar de verdade as peças que você tem.']),
            justificativa: '🦎 Camaleão: sem elenco pra analisar ainda, comecei com uma base equilibrada — assim que o elenco estiver completo, atualize aqui pra eu montar a tática certa pras suas peças.',
            origem: { tipo: 'camaleao', rotulo: 'Camaleão' },
            _fingerprintElenco: ''
        };
    }

    // Fase 2: elenco de verdade — a IA analisa as peças específicas deste time.
    let resumoElenco = plantelAtivo.map(p => `${p.nome} (${p.posicao}, OVR ${p.ovr}, ${p.idade || '?'} anos)`).join('; ');

    let promptIA = `Você é o Auxiliar Técnico. Sua tarefa é o estilo "Camaleão": analisar TODOS os jogadores do elenco atual e montar a tática que melhor aproveita as peças específicas que este time tem — não um estilo genérico de mercado, mas a estratégia sob medida pra este grupo (ex: elenco veloz e jovem nas pontas favorece jogo direto pelos lados; meio-campo tecnicamente forte favorece posse de bola; zagueiros lentos favorecem linha mais recuada, etc.).

ELENCO ATUAL (nome, posição/especialidade cadastrada, OVR, idade): ${resumoElenco}

FORMAÇÕES QUE O TREINADOR PRIORIZOU (nesta ordem, a primeira é a preferida): ${validas.join(' > ')}

${regrasTaticasParaIA()}

FUNÇÕES E FOCOS POR GRUPO DE POSIÇÃO (use SÓ estes ids — nunca invente um novo):
${_listarGruposFuncaoParaIA()}

REGRAS:
1. Escolha UMA das formações priorizadas pra virar "esquemaEscolhido" — a que melhor aproveita as peças reais deste elenco.
2. predefinicao, estiloArmacao e abordagemDefensiva têm que respeitar as travas listadas acima e refletir os PONTOS FORTES reais do elenco (nunca um estilo abstrato desligado dos jogadores).
3. Para CADA sigla da formação escolhida, escolha função e foco pensando em quem de verdade tende a ocupar aquela posição neste elenco — os dois ids têm que vir do MESMO grupo daquela sigla.
4. Escreva 2-3 frases em "justificativa" citando pelo menos um ponto forte real do elenco que motivou a escolha.

Retorne EXATAMENTE este JSON puro:
{
  "esquemaEscolhido": "4-2-3-1",
  "predefinicao": "id da predefinição",
  "estiloArmacao": "id do estilo de armação",
  "abordagemDefensiva": 50,
  "funcoesPorRole": { "GOL": { "funcao": "id", "foco": "id" } },
  "justificativa": "..."
}`;

    let bruto = {};
    try {
        const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
        let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
        if (match) bruto = JSON.parse(match[0]);
    } catch (e) {
        bruto = {}; // sem resposta utilizável da IA — normalizarRelatorioTaticoIA já cai pro motor determinístico
    }

    let relatorio = normalizarRelatorioTaticoIA(bruto, validas, 'Camaleão');
    relatorio.origem = { tipo: 'camaleao', rotulo: 'Camaleão' };
    relatorio.justificativa = bruto && bruto.justificativa
        ? `🦎 Camaleão: ${bruto.justificativa}`
        : `🦎 Camaleão: montei esta tática a partir da leitura do elenco atual (${plantelAtivo.length} jogadores ativos).`;
    relatorio._fingerprintElenco = _fingerprintElenco(plantelAtivo);
    return relatorio;
}

// "Assinatura" barata do elenco (nome+OVR+posição de cada ativo, ordenado) — só pra detectar
// SE o elenco mudou desde a última vez que o Camaleão analisou, sem comparar objeto por
// objeto. Pedido do treinador: "se o elenco mantiver o mesmo, ele mantém a tática" — refazer
// a análise (com chamada de IA) só quando isso realmente muda.
function _fingerprintElenco(plantelAtivo) {
    return plantelAtivo.map(p => `${p.nome}:${p.ovr}:${p.posicao}`).sort().join('|');
}

// Estilo "Camaleão" ativo no save, se algum.
function camaleaoAtivo() {
    let t = db[currentSave] && db[currentSave].taticas;
    let origem = t && t.estiloJogoSelecionado;
    return !!(origem && origem.tipo === 'camaleao');
}

// Chamado por declararPartidaIA() quando o Camaleão está ativo: se o elenco (ativos) mudou
// desde a última análise guardada, refaz a tática (chamando a IA de novo) e já aplica no
// save; se não mudou, não faz nada — mantém a tática já calculada, sem gastar uma chamada de
// IA à toa. Devolve true se recalculou.
async function atualizarCamaleaoSeElencoMudou() {
    let t = db[currentSave] && db[currentSave].taticas;
    if (!t || !camaleaoAtivo()) return false;
    let plantelAtivo = ((db[currentSave].plantel) || []).filter(p => p.status === 'Ativo');
    let fingerprintAtual = _fingerprintElenco(plantelAtivo);
    if (fingerprintAtual === t.camaleaoFingerprintElenco) return false;
    let relatorio = await gerarRelatorioTaticoCamaleao(t.formacoesPreferidas);
    if (!relatorio) return false;
    aplicarRelatorioTaticoNoSave(relatorio);
    return true;
}

// Botão dedicado "🔄 Atualizar com o Elenco Atual" no resumo salvo (Perfil do Treinador) —
// atalho de um clique só que já lê o elenco de agora e recalcula, sem precisar reabrir o
// formulário inteiro nem escolher formações de novo.
async function atualizarCamaleaoManual(prefixo, btnEl) {
    let t = db[currentSave] && db[currentSave].taticas;
    if (!t) return;
    if (btnEl) { btnEl.disabled = true; btnEl.innerText = '⏳ Lendo o elenco atual...'; }
    try {
        let relatorio = await gerarRelatorioTaticoCamaleao(t.formacoesPreferidas);
        if (relatorio) aplicarRelatorioTaticoNoSave(relatorio);
    } finally {
        renderizarSeletorEstiloJogo(prefixo);
    }
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
// TRADUTOR TÁTICO PERSONALIZADO POR FOCO (pedido do treinador) — a camada de Foco pro estilo
// "Personalizado" por texto livre. Diferença chave: nos presets e nos 4 planos ajustados à mão a
// matriz de funções sai das regras do DNA, sem IA; aqui não existe preset nem DNA declarado, só a
// descrição livre que o treinador digitou uma vez lá no início —
// então a IA é chamada de novo, ANTES da análise do adversário, só pra cruzar essa descrição
// com o Foco Tático da Partida ativo agora e criar o pacote tático + a Matriz sob medida.
// Devolve EXATAMENTE o mesmo formato de gerarRelatorioTaticoRefinadoPorFoco()/
// normalizarRelatorioTaticoIA() (esquemaEscolhido/predefinicao/estiloArmacao/
// abordagemDefensiva/funcoesPorRole/ajustesAutomaticos/justificativa/origem) — por isso
// declararPartidaIA() (chat-ia.js) trata os dois de forma idêntica dali em diante: a mesma
// pré-seleção de titulares pela Regra de Afinidade Tática, o mesmo bloco de prompt "pacote já
// definido", a mesma trava de função/foco por cima da resposta da IA principal.
// -------------------------------------------------------------------------------------
async function gerarRelatorioTaticoPersonalizadoPorFoco(formacoesPreferidas, descricaoLivre, focoId) {
    let validas = (formacoesPreferidas || []).filter(f => f && coordsFormacoes[f]).slice(0, MAX_FORMACOES_PREFERIDAS);
    if (!validas.length) return null;

    let nomeFoco = (typeof FOCOS_TATICOS_PARTIDA !== 'undefined' && FOCOS_TATICOS_PARTIDA[focoId]) ? FOCOS_TATICOS_PARTIDA[focoId] : focoId;

    let promptIA = `Você é o Auxiliar Técnico, um Cientista de Dados tático do EA FC. O treinador descreveu com as próprias palavras como quer que o time jogue — sua tarefa é traduzir ESSA visão, cruzada com o Foco Tático da Partida ativo agora, pra uma configuração EXATA do motor do jogo e pra uma Matriz Dinâmica de Funções sob medida que faça a ideia funcionar de verdade na prática.

DESCRIÇÃO ORIGINAL DO TREINADOR (a essência do estilo — não muda de partida pra partida): "${descricaoLivre}"

FOCO TÁTICO DESTA PARTIDA (ajusta a intensidade/postura da essência acima, sem trair ela): "${nomeFoco}"

FORMAÇÕES QUE ELE PRIORIZOU (nesta ordem, a primeira é a preferida): ${validas.join(' > ')}

${regrasTaticasParaIA()}

FUNÇÕES E FOCOS POR GRUPO DE POSIÇÃO (use SÓ estes ids ao montar a Matriz — nunca invente um novo):
${_listarGruposFuncaoParaIA()}

ANALISE A DESCRIÇÃO DO TREINADOR NESTES 3 PILARES ANTES DE DECIDIR:
A) Como o time defende? (Alto, baixo, agressivo, passivo?)
B) Como o time constrói a jogada? (Lento, rápido, passes curtos, lançamentos longos?)
C) Por onde o time ataca? (Pelo meio, pelas pontas, com o centroavante, com os meias flutuando?)

REGRAS:
1. Escolha UMA das formações priorizadas pra virar "esquemaEscolhido" — a que melhor serve a ideia descrita PARA ESTE FOCO especificamente. Não invente uma formação fora da lista.
2. predefinicao, estiloArmacao e abordagemDefensiva têm que respeitar rigorosamente as travas listadas acima, e refletir tanto a essência do texto quanto o Foco ativo (ex: um Foco mais ofensivo aumenta a linha defensiva e destrava mais agressividade em cima do que a essência do texto já pede; um Foco mais defensivo recua tudo, sem abandonar a essência).
3. Para CADA sigla da formação escolhida, defina a função e o foco que fazem a ideia do treinador acontecer de verdade naquela posição — os dois ids têm que vir do MESMO grupo daquela sigla (ex: se o treinador quer "meias que pisem na área", exija algo como Atacante Sombra/Ataque ou Box-to-Box/Ataque nos meio-campistas; se ele disse "meus zagueiros são lenhadores", exija Marcador/Defesa). Crie essa Matriz sob medida pra ESTA ideia — nunca copie uma matriz genérica.
4. Escreva 2-3 frases em "justificativa" explicando como você interpretou o texto pra este Foco específico, e o que a Matriz de Funções exige de cada setor do campo.

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
    if (!match) return null;
    let bruto = JSON.parse(match[0]);

    let relatorio = normalizarRelatorioTaticoIA(bruto, validas, descricaoLivre);
    relatorio.focoId = focoId;
    relatorio.justificativa = `✍️ Personalizado — Foco: ${nomeFoco}: ${relatorio.justificativa}`;
    // Aqui a matriz veio da IA (é a natureza do estilo por texto livre), então o DNA é a LEITURA
    // do que ela montou — assim a "Identidade desta partida" no painel do plano descreve o que
    // realmente foi pra campo, do mesmo jeito que descreve nos outros estilos.
    if (typeof dnaDerivadoDaTatica === 'function') {
        relatorio.dnaEmVigor = dnaDerivadoDaTatica({
            funcoesPorRoleSugeridas: relatorio.funcoesPorRole,
            predefinicao: relatorio.predefinicao,
            estiloArmacao: relatorio.estiloArmacao,
            abordagemDefensiva: relatorio.abordagemDefensiva
        });
    }
    return relatorio;
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
    // Guarda o motivo de cada formação preferida que NÃO foi escolhida — sem isso, o resumo
    // salvo (renderizarResumoEstiloJogoSalvo) não tinha como explicar por que o esquema em uso
    // pode ser diferente da 1ª prioridade (ex: uma formação mais abaixo na lista é mais ideal
    // pra este estilo), a mesma explicação que já aparecia na tela de geração (Início de Jogo).
    d.taticas.esquemaPreteridas = relatorio.esquemaPreteridas || [];
    // Camaleão: guarda a "assinatura" do elenco usada nesta análise, pra declararPartidaIA()
    // saber depois se precisa reanalisar (elenco mudou) ou pode reaproveitar esta tática.
    if (relatorio.origem && relatorio.origem.tipo === 'camaleao') {
        d.taticas.camaleaoFingerprintElenco = (typeof relatorio._fingerprintElenco === 'string')
            ? relatorio._fingerprintElenco
            : _fingerprintElenco((d.plantel || []).filter(p => p.status === 'Ativo'));
    }
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
let _estiloJogoDnaEditado = {};  // prefixo -> true quando o treinador mexeu nos 4 planos à mão
let _estiloJogoDnaAberto = {};   // prefixo -> true pra reabrir o painel dos 4 planos já expandido

// Chamado pelo onchange de qualquer select das 4 fases (ver renderizarFormularioDnaAvancado, em
// js/dna-tatico.js): a partir daí o estilo passa a ser gerado pelo DNA ajustado à mão, e não mais
// pela receita pronta do preset.
function marcarDnaEditado(prefixo) {
    _estiloJogoDnaEditado[prefixo] = true;
    _estiloJogoDnaAberto[prefixo] = true;
}

// Repõe o formulário dos 4 planos com o DNA do estilo recém-escolhido — assim escolher
// "Gegenpressing" carrega os 4 planos do Gegenpressing, e o treinador ajusta a partir dali em vez
// de começar do zero.
function _recarregarFormularioDna(prefixo, dna) {
    let alvo = document.getElementById(`${prefixo}dna-form`);
    if (!alvo || typeof renderizarFormularioDnaAvancado !== 'function') return;
    alvo.innerHTML = renderizarFormularioDnaAvancado(prefixo, dna);
    _estiloJogoDnaEditado[prefixo] = false;
}

// DNA de partida de um estilo qualquer: preset tem o dele escrito; Camaleão e Personalizado
// começam do equilibrado (não existe receita pronta pra eles).
function dnaBaseDoEstilo(presetId) {
    if (presetId && typeof DNA_POR_PRESET !== 'undefined' && DNA_POR_PRESET[presetId]) return DNA_POR_PRESET[presetId];
    return (typeof dnaPadrao === 'function') ? dnaPadrao() : null;
}

// -------------------------------------------------------------------------------------
// MODO AVANÇADO — o treinador escolhe cada eixo das 4 fases do jogo e isso vira configuração
// real na hora: predefinição, estilo de armação, abordagem defensiva e matriz de funções.
// Determinístico de ponta a ponta (dnaParaPacoteTatico, em js/dna-tatico.js): nenhuma chamada
// de IA, nenhum id fora dos catálogos reais, e corrigirTatica() ainda roda como rede de
// segurança contra combinações proibidas pela predefinição escolhida.
// -------------------------------------------------------------------------------------
function gerarRelatorioTaticoPorDnaAvancado(formacoesPreferidas, dna, presetBase) {
    let validas = (formacoesPreferidas || []).filter(f => f && coordsFormacoes[f]).slice(0, MAX_FORMACOES_PREFERIDAS);
    if (!validas.length) return null;

    let dnaNormalizado = normalizarDna(dna);
    let pacote = dnaParaPacoteTatico(dnaNormalizado);

    // Aqui quem manda é a ordem de prioridade do treinador — não existe "formato ideal" de
    // preset pra disputar com a escolha dele.
    let { esquema, preteridas } = escolherEsquemaPorPrioridade(validas, []);
    esquema = esquema || validas[0];

    let { tatica: taticaResultante, ajustes: ajustesRegra } = corrigirTatica({
        predefinicao: pacote.predefinicao, esquema: esquema,
        estiloArmacao: pacote.estiloArmacao, abordagemDefensiva: pacote.abordagemDefensiva
    });

    let funcoesPorRole = montarFuncoesPorRoleDoPreset(esquema, { funcoesPorGrupo: pacote.funcoesPorGrupo }, taticaResultante);

    return {
        esquemaEscolhido: esquema,
        esquemaPreteridas: preteridas,
        formacoesPreferidas: validas,
        predefinicao: taticaResultante.predefinicao,
        estiloArmacao: taticaResultante.estiloArmacao,
        abordagemDefensiva: taticaResultante.abordagemDefensiva,
        funcoesPorRole: funcoesPorRole,
        ajustesAutomaticos: ajustesRegra,
        justificativa: presetBase
            ? `${presetBase.emoji} ${presetBase.nome} (ajustado por você): ${resumoCurtoDna(dnaNormalizado)}.`
            : `🎛️ Personalizado (4 planos): ${resumoCurtoDna(dnaNormalizado)}.`,
        dnaEmVigor: dnaNormalizado,
        origem: {
            tipo: 'dna-avancado',
            rotulo: presetBase ? `${presetBase.nome} (ajustado)` : 'Personalizado (4 planos)',
            presetBase: presetBase ? presetBase.id : null,
            dna: dnaNormalizado
        }
    };
}
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

    // Modo Avançado do Personalizado: se já existe uma config salva feita nesse modo, o
    // formulário reabre exatamente com as escolhas do treinador em vez de voltar pro padrão.
    // Editando uma config já salva, os 4 planos abrem com o DNA REAL dela (do preset, do
    // Camaleão ou do ajuste manual anterior) — nunca do zero.
    let dnaInicialAvancado = (salva && typeof dnaDoEstiloSalvo === 'function')
        ? dnaDoEstiloSalvo(salva)
        : ((typeof dnaPadrao === 'function') ? dnaPadrao() : null);

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
    let cardCamaleao = `
        <button type="button" class="tatica-card tatica-card-menor" id="${prefixo}estilo-card-camaleao" onclick="escolherPresetEstiloJogo('${prefixo}', 'camaleao')">
            <span class="tatica-card-nome">🦎 Camaleão</span>
            <span class="tatica-card-desc">Lê o elenco de verdade e monta a tática em cima das peças que o time tem — se atualiza sozinho quando o elenco muda.</span>
        </button>`;
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
        <div class="tatica-grade">${cardsPreset}${cardCamaleao}${cardLivre}</div>
        <div class="linha-form" id="${prefixo}estilo-texto-livre-wrap" style="display:none; margin-top:12px;">
            <label>Descreva o estilo que você quer</label>
            <textarea id="${prefixo}estilo-texto-livre" rows="2" placeholder="Ex: quero jogar recuado mas com muita posse quando recuperar a bola" style="width:100%; background:var(--bg-dark);"></textarea>
        </div>
        <details class="dna-ajuste" id="${prefixo}dna-ajuste" ${_estiloJogoDnaAberto[prefixo] ? 'open' : ''}>
            <summary>🎛️ Ajustar os 4 planos deste estilo</summary>
            <p class="tatica-ajuda">Todo estilo é só um ponto de partida — aqui você mexe fase a fase, como um treinador descreve o time de verdade. O que você mudar vira configuração do jogo na hora, sem passar pela IA.</p>
            <div class="dna-grid" id="${prefixo}dna-form">${(typeof renderizarFormularioDnaAvancado === 'function') ? renderizarFormularioDnaAvancado(prefixo, dnaInicialAvancado) : ''}</div>
        </details>
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
        } else if (origem.tipo === 'camaleao') {
            escolherPresetEstiloJogo(prefixo, 'camaleao');
        } else if (origem.tipo === 'dna-avancado') {
            escolherPresetEstiloJogo(prefixo, origem.presetBase || null);
            _recarregarFormularioDna(prefixo, origem.dna);
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
    let rotuloOrigem = origem.tipo === 'preset' ? origem.rotulo
        : origem.tipo === 'camaleao' ? '🦎 Camaleão'
        : origem.tipo === 'dna-avancado' ? `🎛️ ${origem.rotulo}`
        : `Personalizado: "${origem.rotulo}"`;
    // Marca visualmente qual formação preferida está de fato em uso — sem isso, quando o esquema
    // escolhido não é a 1ª prioridade (porque uma formação mais abaixo na lista é mais ideal pra
    // este estilo), o quadro parecia estar mostrando uma formação "errada"/desatualizada.
    let formacoesTxt = (t.formacoesPreferidas && t.formacoesPreferidas.length)
        ? t.formacoesPreferidas.map(f => f === t.esquema ? `<strong style="color:var(--primary);">${f} ✓</strong>` : f).join(' → ')
        : t.esquema;
    let preteridasHtml = (t.esquemaPreteridas && t.esquemaPreteridas.length)
        ? `<p style="font-size:12px; color:var(--text-muted); margin:6px 0 0 0;">Não usei ${t.esquemaPreteridas.map(p => `<strong>${p.formacao}</strong> (${p.motivo})`).join(', ')}.</p>`
        : '';
    let funcoesHtml = _funcoesPorRoleParaExibicao(t.funcoesPorRoleSugeridas || {}).map(e => `
        <div class="banco-reserva-item"><strong>${e.rotulo}</strong><span>${e.texto}</span>${_htmlExemploFuncao(e.exemplo)}</div>
    `).join('');
    let esquemaOfensivo = calcularFormacaoOfensiva(t.esquema, t.funcoesPorRoleSugeridas);
    let esquemaTxt = esquemaOfensivo
        ? `🛡️ ${t.esquema} (defende) → ⚔️ <strong style="color:var(--accent);">${esquemaOfensivo}</strong> (ataca)`
        : t.esquema;
    // O que descreve o estilo é o DNA das 4 fases do jogo — o detalhamento por posição vira
    // detalhe técnico, escondido atrás de um "ver" (pedido do treinador).
    let dnaHtml = (typeof renderizarDnaTatico === 'function') ? renderizarDnaTatico(dnaDoEstiloSalvo(t)) : '';

    container.innerHTML = `
        <div class="tatica-resumo">
            <strong>📋 Estilo de Jogo: ${rotuloOrigem}</strong>
            <span>${pre.emoji} ${pre.nome} &nbsp;•&nbsp; ${esquemaTxt} &nbsp;•&nbsp; ${est.nome} &nbsp;•&nbsp; ${t.abordagemDefensiva}/100 (${faixa.nome})</span>
        </div>
        <p class="tatica-ajuda" style="margin-top:10px;">Formações preferidas (ordem de prioridade) — ✓ marca a que está em uso: ${formacoesTxt}</p>
        ${preteridasHtml}
        ${dnaHtml}
        ${funcoesHtml ? `<details class="funcoes-detalhe"><summary>🔍 Ver função de cada posição em campo (${t.esquema})</summary><div class="banco-reservas-grid funcoes-campo-grid">${funcoesHtml}</div></details>` : ''}
        <p style="font-size:12px; color:var(--text-muted); line-height:1.6; margin-top:14px;">💡 Isto é a <strong>base</strong> — não é engessado. Partida a partida, o Auxiliar Técnico ajusta a abordagem, a formação (entre as preferidas acima) e a função de cada jogador de acordo com o adversário específico, sempre dentro do espírito deste estilo.</p>
        ${origem.tipo === 'camaleao' ? `<button type="button" onclick="atualizarCamaleaoManual('${prefixo}', this)" style="width:100%; margin-top:10px; background:var(--primary); color:black; padding:10px; font-weight:bold;">🔄 Atualizar com o Elenco Atual</button>` : ''}
        <button type="button" onclick="abrirAjusteDos4Planos('${prefixo}')" style="width:100%; margin-top:10px; background:var(--bg-dark); border:1px solid var(--primary); color:var(--primary); padding:10px; font-weight:bold;">🎛️ Ajustar os 4 planos deste estilo</button>
        <button type="button" onclick="alternarEdicaoEstiloJogo('${prefixo}', true)" style="width:100%; margin-top:10px; background:var(--bg-dark); border:1px solid var(--border); color:var(--text); padding:10px; font-weight:bold;">✏️ Alterar Configuração</button>
    `;
}

// Atalho do resumo salvo: entra em modo de edição já com o painel dos 4 planos aberto, pra quem
// só quer mexer nas fases sem reconfigurar formação/estilo do zero.
function abrirAjusteDos4Planos(prefixo) {
    _estiloJogoDnaAberto[prefixo] = true;
    alternarEdicaoEstiloJogo(prefixo, true);
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
    // Trocar de estilo recarrega os 4 planos com a receita do estilo escolhido (e descarta
    // qualquer ajuste manual que fosse do estilo anterior).
    _recarregarFormularioDna(prefixo, dnaBaseDoEstilo(presetId));
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
        if (_estiloJogoDnaEditado[prefixo]) {
            // O treinador mexeu nos 4 planos: o que vale é o ajuste dele, seja qual for o estilo
            // que serviu de ponto de partida (o nome do estilo original vira o rótulo "ajustado").
            if (loader) { loader.style.display = 'block'; loader.style.color = 'var(--warning)'; loader.innerText = '⏳ Montando a configuração a partir dos 4 planos...'; }
            let presetBase = presetId && presetId !== 'camaleao' ? presetPorId(presetId) : null;
            relatorio = gerarRelatorioTaticoPorDnaAvancado(formacoes, lerFormularioDnaAvancado(prefixo), presetBase);
        } else if (presetId === null) {
            let texto = (document.getElementById(`${prefixo}estilo-texto-livre`) || {}).value;
            texto = (texto || '').trim();
            if (!texto) return alert('Descreva o estilo que você quer.');
            if (loader) { loader.style.display = 'block'; loader.style.color = 'var(--warning)'; loader.innerText = '⏳ Traduzindo o estilo pra configuração do jogo...'; }
            relatorio = await gerarRelatorioTaticoPorTextoLivre(formacoes, texto);
        } else if (presetId === 'camaleao') {
            if (loader) { loader.style.display = 'block'; loader.style.color = 'var(--warning)'; loader.innerText = '⏳ Analisando o elenco atual pra montar uma tática sob medida...'; }
            relatorio = await gerarRelatorioTaticoCamaleao(formacoes);
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

// Pedido do treinador: em vez de tentar "explicar melhor" as regras de posição de cada função
// (texto que ele achava que não condizia com o jogo real) ou usar nome de jogador real (achou
// pouco profissional), mostra uma combinação tática de referência — Formação + Foco Tático da
// Partida + Diretriz + uso ideal — que ilustra quando essa função/foco é a escolha certa. Fica
// oculto por padrão; a pessoa clica pra revelar (ver _funcoesPorRoleParaExibicao / renderização
// dos cards abaixo).
function _exemploFuncaoFoco(role, escolha) {
    let grupo = grupoFuncaoDoRole(role);
    if (!grupo || !escolha) return null;
    let g = GRUPOS_FUNCAO_EA[grupo];
    let f = g.funcoes.find(x => x.id === escolha.funcao);
    return (f && f.exemploTatico) || null;
}

// HTML do "ver exemplo" — clicável, começa oculto (a pessoa clica pra ver a combinação tática).
function _htmlExemploFuncao(exemplo) {
    if (!exemplo) return '';
    return `<span class="funcao-exemplo-toggle" onclick="let n=this.nextElementSibling; n.style.display = n.style.display === 'none' ? 'block' : 'none';">👁️ ver exemplo tático</span><div class="funcao-exemplo-card" style="display:none;">
        <div><strong>Formação:</strong> ${exemplo.formacao}</div>
        <div><strong>Foco da Partida:</strong> ${exemplo.foco}</div>
        <div><strong>Diretriz:</strong> ${exemplo.diretriz}</div>
        <div><strong>Uso ideal:</strong> ${exemplo.usoIdeal}</div>
    </div>`;
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
            saida.push({ rotulo: rotuloGenerico, texto: _nomeFuncaoFoco(itens[0].role, itens[0].escolha), exemplo: _exemploFuncaoFoco(itens[0].role, itens[0].escolha) });
        } else {
            itens.forEach(it => saida.push({ rotulo: it.role, texto: _nomeFuncaoFoco(it.role, it.escolha), exemplo: _exemploFuncaoFoco(it.role, it.escolha) }));
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
        <div class="banco-reserva-item"><strong>${e.rotulo}</strong><span>${e.texto}</span>${_htmlExemploFuncao(e.exemplo)}</div>
    `).join('');
    let esquemaOfensivo = calcularFormacaoOfensiva(relatorio.esquemaEscolhido, relatorio.funcoesPorRole);
    let esquemaTxt = esquemaOfensivo
        ? `🛡️ ${relatorio.esquemaEscolhido} (defende) → ⚔️ <strong style="color:var(--accent);">${esquemaOfensivo}</strong> (ataca)`
        : relatorio.esquemaEscolhido;
    let dnaHtml = (typeof renderizarDnaTatico === 'function') ? renderizarDnaTatico(dnaDoEstiloSalvo({
        estiloJogoSelecionado: relatorio.origem,
        predefinicao: relatorio.predefinicao, estiloArmacao: relatorio.estiloArmacao,
        abordagemDefensiva: relatorio.abordagemDefensiva, funcoesPorRoleSugeridas: relatorio.funcoesPorRole
    })) : '';

    box.innerHTML = `
        <div class="tatica-resumo">
            <strong>📋 ${relatorio.justificativa}</strong>
            <span>${pre.emoji} ${pre.nome} &nbsp;•&nbsp; ${esquemaTxt} &nbsp;•&nbsp; ${est.nome} &nbsp;•&nbsp; ${relatorio.abordagemDefensiva}/100 (${faixa.nome})</span>
        </div>
        ${preteridasHtml}
        ${ajustesHtml}
        ${dnaHtml}
        ${funcoesHtml ? `<details class="funcoes-detalhe"><summary>🔍 Ver função de cada posição em campo</summary><div class="banco-reservas-grid funcoes-campo-grid">${funcoesHtml}</div></details>` : ''}
    `;
}
