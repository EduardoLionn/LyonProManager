// =====================================================================================
// FUNÇÕES TÁTICAS (estilo EA FC) — o que cada jogador deve fazer na posição dele
// =====================================================================================
// Cada posição do campinho tem um grupo de "funções" reais do jogo (ex: Zagueiro pode ser
// Defesa, Marcador, Zagueiro Aberto ou Sai Jogando), e cada função tem "focos" que ajustam
// o comportamento dela (ex: Defesa com foco Defesa x Defesa com foco Equilibrado).
//
// Isso não é escolhido pela IA (que erra nomenclatura) nem pelo treinador — é calculado aqui,
// de forma determinística, a partir da especialidade cadastrada do jogador (ex: "Zagueiro/
// Construtor") e da tática ativa (predefinição/estilo de armação/abordagem defensiva). Assim
// o resultado é sempre um nome real do EA FC, nunca uma frase inventada.

const GRUPOS_FUNCAO_EA = {
    goleiro: {
        nome: 'Goleiro',
        funcoes: [
            { id: 'goleiro', nome: 'Goleiro', descricao: 'O goleiro tradicional que permanece sobre a linha e tem como foco parar a finalização.', exemploTatico: { formacao: '4-4-2', foco: 'Defensivo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'time que abre mão de jogar com a bola nos pés e prioriza solidez, mantendo o goleiro colado na linha e a defesa compacta.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Com o foco Defesa, o goleiro não sai para buscar bolas longas ou rebotes.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com o foco Equilibrado, o goleiro às vezes sai da área para pegar bolas longas ou rebotes.' }
            ]},
            { id: 'gl-sai-jogando', nome: 'GL que Sai Jogando', descricao: 'Goleiro ao estilo moderno que sai jogando, dando opção de passe para facilitar a armação, mas que permanece na posição quando o time está na defesa.', exemploTatico: { formacao: '4-3-3', foco: 'Equilibrado', diretriz: 'Escalação Titular Padrão', usoIdeal: 'construção de jogo pelo goleiro, dando saída curta pros zagueiros abertos sob pressão baixa do adversário.' }, focos: [
                { id: 'armacao', nome: 'Armação', descricao: 'Com a opção Armação definida, o goleiro que sai jogando sobe mais no campo para apoiar as jogadas.' }
            ]},
            { id: 'goleiro-libero', nome: 'Goleiro-Líbero', descricao: 'GL que assume riscos e se concentra em parar ataques fora da área.', exemploTatico: { formacao: '3-4-3', foco: 'Extremamente Ofensivo', diretriz: 'Força Máxima Possível', usoIdeal: 'linha defensiva muito alta, com o goleiro cobrindo o espaço nas costas da zaga.' }, focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com o foco Equilibrado, o goleiro-líbero sai da área para pegar bolas próximas.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Com o foco em Armação, GL-líbero sobe mais no campo para receber a bola e apoiar as jogadas.' }
            ]}
        ]
    },
    zagueiro: {
        nome: 'Zagueiro',
        funcoes: [
            { id: 'defesa', nome: 'Defesa', descricao: 'Um atleta da zaga eficiente que é excelente na defesa básica, o que inclui manter a linha defensiva.', exemploTatico: { formacao: '4-4-2', foco: 'Defensivo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'bloco baixo e organizado, priorizando zerar espaços antes de arriscar saída de bola.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o atleta de defesa tem como foco apenas as responsabilidades defensivas.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com o foco Equilibrado, o atleta de defesa avança para fechar o ataque quando necessário.' }
            ]},
            { id: 'marcador', nome: 'Marcador', descricao: 'Um atleta da zaga que rouba a bola e se adianta da linha de defesa para entrar em divididas, interceptar passes e liderar a pressão.', exemploTatico: { formacao: '4-3-3', foco: 'Extremamente Defensivo', diretriz: 'Titulares a Todo Custo', usoIdeal: 'marcação individual avançada sobre o centroavante adversário, saindo da linha pra cortar o jogo antes que ele chegue à área.' }, focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com o foco Equilibrado, o atleta na marcação intercepta passes e pressiona atacantes recebendo a bola.' },
                { id: 'combatividade', nome: 'Combatividade', descricao: 'Quando a instrução é Combatividade, o atleta na marcação avança até a base do meio-campo para interceptar passes e fechar atacantes.' }
            ]},
            { id: 'zagueiro-aberto', nome: 'Zagueiro Aberto', descricao: 'Atleta central de defesa que se desloca para o lado, dando cobertura para laterais. Função geralmente usada em esquemas com linha de três.', exemploTatico: { formacao: '3-5-2', foco: 'Equilibrado', diretriz: 'Escalação Titular Padrão', usoIdeal: 'linha de três, dando cobertura de zaga quando o ala avança pra ajudar no ataque.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Com a opção Defesa definida, o Zagueiro Aberto apoia laterais em todas as fases do jogo, mas continua perto da linha de defesa.' },
                { id: 'combatividade', nome: 'Combatividade', descricao: 'Com a opção Combatividade definida, o Zagueiro Aberto também fecha espaços adversários e intercepta passes durante a fase defensiva do jogo.' },
                { id: 'apoio', nome: 'Apoio', descricao: 'Com a opção Apoio definida, o Zagueiro Aberto avança pelo lado do campo, dando opção de passe quando o time precisa desafogar a pressão.' }
            ]},
            { id: 'sai-jogando', nome: 'Sai Jogando', descricao: 'Atleta da zaga ao estilo moderno que, além de defender, sabe jogar com a bola nos pés. Pode avançar ou jogar com mais amplitude, apoiando a construção de jogadas.', exemploTatico: { formacao: '4-3-3', foco: 'Segurar o Jogo', diretriz: 'Rotação Equilibrada', usoIdeal: 'manutenção de posse sob pressão, girando o jogo pra trás com segurança em vez de arriscar o lançamento longo.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a configuração é Defesa, o defensor que sai jogando avança um pouco para apoiar o time durante a posse de bola.' },
                { id: 'armacao', nome: 'Armação', descricao: 'O foco Armação faz com que o defensor que sai jogando fique mais na posição de volante de contenção durante a posse de bola.' },
                { id: 'combatividade', nome: 'Combatividade', descricao: 'Quando a instrução é Combatividade, o defensor que sai jogando tem como foco interceptar passes e fechar oponentes.' }
            ]}
        ]
    },
    lateral: {
        nome: 'Lateral',
        funcoes: [
            { id: 'lateral', nome: 'Lateral', descricao: 'Atleta de defesa com abertura que prioriza a proteção do próprio gol, ficando para trás, mantendo a linha defensiva e oferecendo opção.', exemploTatico: { formacao: '4-4-2', foco: 'Defensivo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'fecha o corredor e evita avançar, priorizando a solidez em jogos fora de casa.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a configuração é Defesa, o lateral entra para formar uma linha de três quando o time estiver com a posse de bola.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando a configuração é Equilibrado, o lateral ganha liberdade para avançar um pouco mais e dar apoio aos ataques.' },
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, o lateral pode se mover para dentro e formar uma linha de três na defesa ou se adiantar e jogar com mais amplitude, apoiando a armação.' }
            ]},
            { id: 'lateral-invertido', nome: 'Lateral Invertido', descricao: 'Uma evolução moderna da zaga, este atleta avança em campo, adotando uma posição central quando o time está com a bola.', exemploTatico: { formacao: '4-3-3', foco: 'Segurar o Jogo', diretriz: 'Rotação Equilibrada', usoIdeal: 'entra pro miolo pra formar um losango de posse quando o time tem a bola, protegendo contra o contra-ataque.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a configuração é Defesa, o lateral invertido funciona como volante quando o time está com a bola.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando a configuração é Equilibrado, o lateral invertido se posiciona como meia quando o time está com a posse de bola.' }
            ]},
            { id: 'ala', nome: 'Ala', descricao: 'A versatilidade e o fôlego fazem este talento avançar no campo e apoiar os ataques antes de voltar à posição defensiva.', exemploTatico: { formacao: '4-2-3-1', foco: 'Equilibrado', diretriz: 'Escalação Titular Padrão', usoIdeal: 'sobe e desce o corredor conforme a fase do jogo, dando amplitude sem abrir mão da cobertura defensiva.' }, focos: [
                { id: 'apoio', nome: 'Apoio', descricao: 'Quando a instrução é Apoio, o ala só pode atacar quando o time está com a posse de bola e só pode defender quando o time está sem a bola.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com Equilibrado, o ala pode ficar na frente mesmo quando o time estiver sem a posse de bola ou voltar para a defesa quando necessário.' }
            ]},
            { id: 'ala-invertido', nome: 'Ala Invertido', descricao: 'Lateral com vocação ofensiva ao estilo moderno que avança e adota uma posição central no campo quando o time está com a bola.', exemploTatico: { formacao: '3-4-3', foco: 'Ofensivo', diretriz: 'Força Máxima Possível', usoIdeal: 'linha de três nas costas, com o ala-invertido ocupando o miolo pra virar peça extra de criação.' }, focos: [
                { id: 'armacao', nome: 'Armação', descricao: 'Com a opção Armação definida, o Ala Invertido age como peça central de criação, ajudando a ditar o ritmo de jogo.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Com a opção Ataque definida, o Ala Invertido age como atacante sombra central, ajudando no último terço.' }
            ]},
            { id: 'ala-atacante', nome: 'Ala Atacante', descricao: 'Apesar de tecnicamente ser da defesa, este atleta se preocupa mais em avançar e oferecer amplitude aos ataques do time.', exemploTatico: { formacao: '3-5-2', foco: 'Extremamente Ofensivo', diretriz: 'Titulares a Todo Custo', usoIdeal: 'linha de três dá segurança pra ele viver praticamente como um ponta, sem preocupação defensiva.' }, focos: [
                { id: 'apoio', nome: 'Apoio', descricao: 'Com a opção Apoio definida, o ala atacante raramente dá um pique para voltar e defender, a menos que o time sofra um contra-ataque.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a instrução é Ataque, o ala atacante sobe ainda mais no campo e realiza menos tarefas defensivas.' }
            ]}
        ]
    },
    volante: {
        nome: 'Volante',
        funcoes: [
            { id: 'contencao', nome: 'Contenção', descricao: 'Com papel fundamental no futebol moderno, este volante tem como foco proteger a linha de defesa durante os ataques e ajudar na defesa no caso de contra-ataques.', exemploTatico: { formacao: '4-2-3-1', foco: 'Equilibrado', diretriz: 'Escalação Titular Padrão', usoIdeal: 'bloco baixo que protege a linha de zaga, quebrando a transição adversária antes que ela chegue ao último terço.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o meio-campista de contenção avança um pouco adiante para oferecer uma opção de passe, mas, normalmente, foca em defender.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Quando a configuração é Deslocamento, o meio-campista de contenção se movimenta pela amplitude do campo para fechar as linhas de passe e se aproxima para pressionar atacantes.' },
                { id: 'roubada-de-bola', nome: 'Roubada de Bola', descricao: 'O foco Roubada de Bola faz o meio-campista de contenção interceptar passes agressivamente como parte do foco defensivo.' }
            ]},
            { id: 'armador-recuado', nome: 'Armador Recuado', descricao: 'A peça-chave para armar a jogada desde a defesa, este meio-campista em posição mais defensiva geralmente será o catalisador para os ataques.', exemploTatico: { formacao: '4-1-4-1', foco: 'Segurar o Jogo', diretriz: 'Rotação Equilibrada', usoIdeal: 'catalisador da saída de bola desde a linha de contenção, girando o jogo com segurança contra pressão alta.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Com o foco Defesa, o atleta na armação recuada tem como foco fechar as linhas de passe e se manter na defesa enquanto o time parte para o ataque.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a configuração é Armação, o atleta na armação recuada avança e oferece opção de passe para apoiar ataques.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'O foco Deslocamento permite que o atleta na armação recuada se mova pela amplitude do campo para apoiar ataques.' }
            ]},
            { id: 'zaga', nome: 'Zaga', descricao: 'Um volante que ficará entre a zaga enquanto o time estiver com a posse de bola para oferecer proteção quando sofrer contra-ataque.', exemploTatico: { formacao: '4-1-4-1', foco: 'Extremamente Defensivo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'entra entre os zagueiros na saída de bola, formando linha de três temporária pra evitar o contra-ataque.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a configuração é Defesa, a zaga tem como foco as tarefas defensivas.' }
            ]},
            { id: 'meia-pelas-laterais', nome: 'Meia pelas Laterais', descricao: 'Um item de volante com a missão de marcar e cobrir as laterais do campo quando necessário.', exemploTatico: { formacao: '3-5-2', foco: 'Equilibrado', diretriz: 'Rotação Equilibrada', usoIdeal: 'cobre o corredor quando o ala avança, evitando o buraco defensivo característico das linhas de três.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o item de meia pelas laterais pode assumir as posições de lateral e ala enquanto o time estiver com a posse de bola.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a instrução é Armação, o item de meia pelas laterais pode abrir para a posição de ala e avançar para a posição de meia com abertura quando o time estiver com a posse de bola.' }
            ]},
            { id: 'volante-oportunista', nome: 'Volante Oportunista', descricao: 'Volante que pode avançar e apoiar as jogadas de ataque, fazendo arrancadas tardias rumo à área quando tiver a oportunidade.', exemploTatico: { formacao: '4-4-2', foco: 'Ofensivo', diretriz: 'Em Melhor Momento', usoIdeal: 'aproveita o jogador em grande fase de finalização pra ganhar uma peça extra de chegada ao ataque, saindo de trás.' }, focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com a opção Equilibrado definida, o Volante Oportunista equilibra suas responsabilidades defensivas e ofensivas.' }
            ]}
        ]
    },
    meio_campo_central: {
        nome: 'Meio-Campo',
        funcoes: [
            { id: 'box-to-box', nome: 'Box-to-Box', descricao: 'Este atleta trabalha entre as duas áreas. Não atua nem na última linha de defesa, nem na parte final do ataque, mas se envolve em tudo que acontece.', exemploTatico: { formacao: '4-4-2', foco: 'Equilibrado', diretriz: 'Força Máxima Possível', usoIdeal: 'cobre as duas áreas ao longo dos 90 minutos, ideal quando o time precisa de intensidade constante no meio.' }, focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando a instrução é ser Equilibrado, o meio-campista Box-to-box cobre o meio do campo no ataque e na defesa.' },
                { id: 'roubada-de-bola', nome: 'Roubada de Bola', descricao: 'Com a opção Roubada de Bola definida, a prioridade dos meio-campistas Box-to-Box é recuperar a bola, além de dar apoio central no ataque e na defesa.' }
            ]},
            { id: 'armador', nome: 'Armador', descricao: 'Este atleta tende a ser a força criativa do meio-campo, com licença para se deslocar e criar espaços e oportunidades de ataque.', exemploTatico: { formacao: '4-1-4-1', foco: 'Ofensivo', diretriz: 'Em Melhor Momento', usoIdeal: 'joga com liberdade pra flutuar e municiar os atacantes, especialmente quando está em grande fase de assistências.' }, focos: [
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Quando a configuração é Deslocamento, o atleta na armação tem liberdade para explorar o campo e encontrar os melhores espaços para apoiar os ataques.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o atleta na armação avança para apoiar ataques em uma posição mais adiantada.' }
            ]},
            { id: 'armador-recuado', nome: 'Armador Recuado', descricao: 'A peça-chave para armar a jogada desde a defesa, este meio-campista em posição mais defensiva geralmente será o catalisador para os ataques.', exemploTatico: { formacao: '4-1-4-1', foco: 'Segurar o Jogo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'organiza a saída de bola desde o meio, priorizando manter a posse contra times que pressionam alto.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Com o foco Defesa, o atleta na armação recuada tem como foco fechar as linhas de passe e se manter na defesa enquanto o time parte para o ataque.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a configuração é Armação, o atleta na armação recuada avança e oferece opção de passe para apoiar ataques.' }
            ]},
            { id: 'meia-pelas-pontas', nome: 'Meia pelas Pontas', descricao: 'Um meio-campista que oferece amplitude quando o time está com a posse de bola, se movendo pelas pontas para oferecer uma opção de passe.', exemploTatico: { formacao: '5-3-2', foco: 'Equilibrado', diretriz: 'Rotação Equilibrada', usoIdeal: 'dá amplitude num meio mais fechado, alternando lado conforme o time tem a posse.' }, focos: [
                { id: 'apoio', nome: 'Apoio', descricao: 'Com a opção Apoio definida, a prioridade do meia pelas pontas é apoiar as jogadas, em vez de simplesmente atacar ou defender.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o meia pelas pontas alterna igualmente entre o ataque e a defesa de forma balanceada.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o meia pelas pontas pode avançar livremente, sacrificando responsabilidades defensivas.' }
            ]},
            { id: 'contencao', nome: 'Contenção', descricao: 'Com papel fundamental no futebol moderno, este volante tem como foco proteger a linha de defesa durante os ataques e ajudar na defesa no caso de contra-ataques.', exemploTatico: { formacao: '5-3-2', foco: 'Extremamente Defensivo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'reforça a proteção da zaga em jogos fora de casa contra adversários mais fortes.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o meio-campista de contenção avança um pouco adiante para oferecer uma opção de passe, mas, normalmente, foca em defender.' },
                { id: 'roubada-de-bola', nome: 'Roubada de Bola', descricao: 'O foco Roubada de Bola faz o meio-campista de contenção interceptar passes agressivamente como parte do foco defensivo.' }
            ]}
        ]
    },
    meia_atacante: {
        nome: 'Meia-Atacante',
        funcoes: [
            { id: 'armador', nome: 'Armador', descricao: 'Este atleta tende a ser a força criativa do meio-campo, com licença para se deslocar e criar espaços e oportunidades de ataque.', exemploTatico: { formacao: '4-2-3-1', foco: 'Ofensivo', diretriz: 'Em Melhor Momento', usoIdeal: 'última peça de criação atrás do centroavante, priorizado quando está em ótima fase de passes decisivos.' }, focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando a instrução é ser Equilibrado, o atleta na armação oferece apoio defensivo quando necessário e organiza ataques.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Quando a configuração é Deslocamento, o atleta na armação tem liberdade para explorar o campo e encontrar os melhores espaços para apoiar os ataques.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Com Armação, o atleta na armação recua para pegar a bola e orquestrar um ataque.' }
            ]},
            { id: 'meia-pelas-pontas', nome: 'Meia pelas Pontas', descricao: 'Um meio-campista que oferece amplitude quando o time está com a posse de bola, se movendo pelas pontas para oferecer uma opção de passe.', exemploTatico: { formacao: '4-2-3-1', foco: 'Equilibrado', diretriz: 'Rotação Equilibrada', usoIdeal: 'alterna de lado pra explorar espaço, útil contra defesas que marcam forte no miolo.' }, focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o meia pelas pontas alterna igualmente entre o ataque e a defesa de forma balanceada.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Com a opção Deslocamento definida, meia-atacante pelas pontas alterna livremente o lado pelo qual ataca, mesmo em bolas paradas.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o meia pelas pontas pode avançar livremente, sacrificando responsabilidades defensivas.' }
            ]},
            { id: 'atacante-sombra', nome: 'Atacante Sombra', descricao: 'Um meio-campista com mentalidade ofensiva que joga no espaço por trás dos atacantes. Suas corridas para a área no momento certo criam oportunidades de gol.', exemploTatico: { formacao: '4-2-3-1', foco: 'Extremamente Ofensivo', diretriz: 'Titulares a Todo Custo', usoIdeal: 'corridas tardias pra dentro da área quando o time precisa de gol a qualquer custo.' }, focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o atacante sombra tem como foco fazer corridas tardias para dentro da área, preenchendo o espaço deixado pelo ataque.' }
            ]},
            { id: 'camisa-10-classico', nome: 'Camisa 10 Clássico', descricao: 'Um item de meia atacante tradicional que vai participar da maior parte das jogadas criativas de ataque.', exemploTatico: { formacao: '4-2-3-1', foco: 'Segurar o Jogo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'referência criativa fixa atrás do ataque, ideal pra administrar o resultado com posse controlada.' }, focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a instrução é Ataque, o item de camisa 10 clássica manterá a posição atrás da linha de ataque, operando como a principal força criativa do time.' },
                { id: 'com-abertura', nome: 'Com Abertura', descricao: 'Quando a instrução é Abertura, o item de camisa 10 clássica pode abrir para a lateral e organizar ataques de qualquer posição em toda a largura do campo.' },
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, Camisa 10 clássica escolhe se fica no meio ou se explora a amplitude do campo durante os ataques.' }
            ]}
        ]
    },
    meia_lateral: {
        nome: 'Meia-Lateral',
        funcoes: [
            { id: 'corta-pra-dentro', nome: 'Corta pra Dentro', descricao: 'Um atacante que começa na ponta, mas costuma cortar para dentro para ajeitar para a perna boa e finalizar ou dar o passe final.', exemploTatico: { formacao: '4-4-2', foco: 'Ofensivo', diretriz: 'Em Melhor Momento', usoIdeal: 'corta pro meio pra finalizar de perna boa, priorizado quando está em fase artilheira.' }, focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando tem foco Ataque, o atacante que Corta para Dentro tem como foco o espaço interno para fazer corridas ofensivas.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o atacante que Corta pra Dentro oferece apoio defensivo mínimo e, às vezes, atrasa a corrida para se colocar como opção de passe.' }
            ]},
            { id: 'meia-aberto', nome: 'Meia Aberto', descricao: 'Um meio-campista que fica na lateral para facilitar o fluxo, oferecer passes e apoiar a defesa.', exemploTatico: { formacao: '3-4-3', foco: 'Equilibrado', diretriz: 'Escalação Titular Padrão', usoIdeal: 'dá largura no meio-campo e ajuda na cobertura defensiva quando o time não tem a bola.' }, focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o meia com abertura recua para o meio de campo defensivo e protege a defesa.' },
                { id: 'apoio', nome: 'Apoio', descricao: 'Com a opção Apoio definida, o meia com abertura joga pelo lado, apoiando a posse de bola e ajudando na defesa quando necessário.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Com a opção Armação definida, o meia com abertura se adianta mais em campo para apoiar as jogadas, mas ainda ajuda na defesa quando necessário.' }
            ]},
            { id: 'armador-aberto', nome: 'Armador Aberto', descricao: 'Uma saída criativa posicionada aberta, mas capaz de se mover por dentro para criar chances de desarmar defesas.', exemploTatico: { formacao: '3-4-3', foco: 'Segurar o Jogo', diretriz: 'Rotação Equilibrada', usoIdeal: 'recebe pela lateral pra armar sem depender só do miolo, útil contra pressão central.' }, focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o atleta na armação aberta avança e recebe passes abertos na ponta.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a configuração é Armação, o atleta na armação aberta se aproxima para oferecer opção de passe, equilibrando a abordagem para apoiar a defesa se necessário.' }
            ]},
            { id: 'ala', nome: 'Ala', descricao: 'Um meia que sempre fica nas pontas, tocando a lateral, oferecendo apoio amplo em todas as fases do jogo.', exemploTatico: { formacao: '4-4-2', foco: 'Defensivo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'mantém amplitude sem abandonar a marcação, essencial em jogos fora de casa.' }, focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o ala oferece apoio tanto na defesa quanto no ataque, misturando corridas até a defesa e avanços como opção de passe.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o ala tem como foco avançar e prefere furar a defesa em vez de receber a bola nos pés.' }
            ]}
        ]
    },
    ponta: {
        nome: 'Ponta',
        funcoes: [
            { id: 'corta-pra-dentro', nome: 'Corta pra Dentro', descricao: 'Um atacante que começa na ponta, mas costuma cortar para dentro para ajeitar para a perna boa e finalizar ou dar o passe final.', exemploTatico: { formacao: '4-3-3', foco: 'Extremamente Ofensivo', diretriz: 'Titulares a Todo Custo', usoIdeal: 'parte da ponta pro meio buscando o gol, ideal quando o time precisa arriscar tudo pelo resultado.' }, focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando tem foco Ataque, o atacante que Corta para Dentro tem como foco o espaço interno para fazer corridas ofensivas.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Quando a configuração é Deslocamento, o atacante que Corta para Dentro pode se movimentar livremente e explorar quaisquer lacunas defensivas que encontrar.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o atacante que Corta pra Dentro oferece apoio defensivo mínimo e, às vezes, atrasa a corrida para se colocar como opção de passe.' }
            ]},
            { id: 'armador-aberto', nome: 'Armador Aberto', descricao: 'Uma saída criativa posicionada aberta, mas capaz de se mover por dentro para criar chances de desarmar defesas.', exemploTatico: { formacao: '4-3-3', foco: 'Ofensivo', diretriz: 'Em Melhor Momento', usoIdeal: 'cria a partir da ponta quando está em grande fase de assistências, aproveitando o 1x1.' }, focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o atleta na armação aberta avança e recebe passes abertos na ponta.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a configuração é Armação, o atleta na armação aberta se aproxima para oferecer opção de passe, equilibrando a abordagem para apoiar a defesa se necessário.' }
            ]},
            { id: 'ala', nome: 'Ala', descricao: 'Um meia que sempre fica nas pontas, tocando a lateral, oferecendo apoio amplo em todas as fases do jogo.', exemploTatico: { formacao: '3-4-3', foco: 'Equilibrado', diretriz: 'Escalação Titular Padrão', usoIdeal: 'alterna entre atacar e ajudar na cobertura, dando equilíbrio numa linha de três avançada.' }, focos: [
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, ponta decide o momento certo para atacar ou defender e pode trocar de lado com colega ponta versátil entre uma fase do jogo e outra.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o ala tem como foco avançar e prefere furar a defesa em vez de receber a bola nos pés.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o ala oferece apoio tanto na defesa quanto no ataque, misturando corridas até a defesa e avanços como opção de passe.' }
            ]}
        ]
    },
    atacante: {
        nome: 'Atacante',
        funcoes: [
            { id: 'oportunista', nome: 'Oportunista', descricao: 'Este atleta tem um objetivo: marcar gols. Fica avançado e tem como foco correr por trás da defesa buscando criar chances de gol.', exemploTatico: { formacao: '4-4-2', foco: 'Extremamente Ofensivo', diretriz: 'Titulares a Todo Custo', usoIdeal: 'vive nas costas da zaga esperando o erro defensivo, decisivo quando o time precisa de gol a qualquer custo.' }, focos: [
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, o oportunista escolhe se volta para dar apoio à equipe ou se faz pressão.' },
                { id: 'apoio', nome: 'Apoio', descricao: 'Quando a configuração é Apoio, o atleta oportunista se aproxima da defesa adversária, pressionando agressivamente com a posse de bola, na esperança de forçar um erro.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o atleta oportunista fica no limite da linha de defesa, pronto para aproveitar lacunas e erros da defesa.' }
            ]},
            { id: 'falso-9', nome: 'Falso 9', descricao: 'Posicionada na linha de ataque, esta pessoa recua para orquestrar a jogada no espaço em frente à defesa. Desta forma, também pode ajudar nas jogadas.', exemploTatico: { formacao: '4-3-3', foco: 'Segurar o Jogo', diretriz: 'Escalação Titular Padrão', usoIdeal: 'recua pra armar e tirar o zagueiro da área, essencial contra defesas de linha alta.' }, focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Com a opção Ataque definida, o atleta falso 9 recua, se distanciando da defesa adversária para iniciar mais de longe arrancadas tardias rumo à área.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Com Armação, o falso 9 recua da defesa adversária e opera como atleta na armação, liderando ataques.' }
            ]},
            { id: 'pivo', nome: 'Pivô', descricao: 'Atleta de ataque com um físico que permite segurar as jogadas, proteger a bola dos adversários e trazer colegas para o ataque.', exemploTatico: { formacao: '4-4-2', foco: 'Ofensivo', diretriz: 'Força Máxima Possível', usoIdeal: 'segura a bola de costas pra meta e sustenta o ataque, ideal pra aliviar a pressão em jogos difíceis.' }, focos: [
                { id: 'com-abertura', nome: 'Com Abertura', descricao: 'Quando a configuração é Abertura, o pivô vai para os limites da área em busca de espaço para fazer a diferença.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o pivô sai da linha de defesa, segura a jogada e passa a bola para colegas de time, sendo responsável por tarefas simples na defesa.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o pivô fica livre para avançar, sem instruções de defesa.' }
            ]},
            { id: 'centroavante', nome: 'Centroavante', descricao: 'Um atacante versátil que geralmente fica perto da linha defensiva do adversário, mas aparece para receber passes na armação e corre por trás.', exemploTatico: { formacao: '4-2-3-1', foco: 'Equilibrado', diretriz: 'Em Melhor Momento', usoIdeal: 'referência de área que também recua pra ligar o jogo, priorizado quando está em fase de gols.' }, focos: [
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, o centroavante tem liberdade de se mover para o lado quando necessário para receber um passe ou gerar espaço com uma corrida.' },
                { id: 'apoio', nome: 'Apoio', descricao: 'Quando a configuração é Apoio, o centroavante tenta correr das posições mais recuadas ou mais abertas e pressionar a defesa.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o centroavante tem como foco oportunidades de gol, geralmente se posicionando na frente e no centro do campo.' }
            ]}
        ]
    }
};

// Sigla do campinho -> grupo de função. GOL/ZAD-ZAE-ZAC/etc. já existem em coordsFormacoes.
const GRUPO_POR_ROLE = {
    GOL: 'goleiro',
    ZAD: 'zagueiro', ZAE: 'zagueiro', ZAC: 'zagueiro',
    LAD: 'lateral', LAE: 'lateral', ALD: 'lateral', ALE: 'lateral',
    VOL: 'volante', VOLD: 'volante', VOLE: 'volante',
    MC: 'meio_campo_central', MCD: 'meio_campo_central', MCE: 'meio_campo_central',
    MEI: 'meia_atacante', MEID: 'meia_atacante', MEIE: 'meia_atacante',
    MD: 'meia_lateral', ME: 'meia_lateral',
    PD: 'ponta', PE: 'ponta',
    ATA: 'atacante', ATD: 'atacante', ATE: 'atacante'
};

function grupoFuncaoDoRole(role) {
    return GRUPO_POR_ROLE[role] || null;
}

// Grupos onde o lado (D/E) é só geometria — a função escolhida NUNCA depende de qual sigla
// específica é (VOLD e VOLE sempre dão a mesma função pro mesmo jogador, por exemplo). Nesses
// grupos, ao exibir função repetida em mais de uma sigla, usa-se este rótulo genérico em vez de
// listar cada sigla separada — evita a repetição sem sentido de "VOLD" e "VOLE" dizendo a mesma
// coisa. Lateral/Ponta/Meia-Lateral ficam de fora de propósito: ali o lado muda a elegibilidade
// de verdade (um lateral-direito não cobre a ala esquerda), então continuam com a sigla exata.
const ROTULO_GENERICO_POR_GRUPO = {
    zagueiro: 'ZAG',
    volante: 'VOL',
    meio_campo_central: 'MC',
    meia_atacante: 'MEI',
    atacante: 'ATA'
};

function _semAcento(txt) {
    return String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// =====================================================================================
// ESPECIALIDADES DO JOGADOR — a posição de carteirinha (p.posicao, ex: "Zagueiro/Híbrido")
// que o treinador escolhe no cadastro. Cada especialidade define, por grupo de função do
// campinho (as mesmas chaves de GRUPOS_FUNCAO_EA), quais funções reais daquele grupo o
// jogador está apto a exercer — a primeira da lista é a função "padrão" dele nesse grupo.
// Isso substitui as duas réguas que existiam separadas (compatibilidade posicional pra
// escalação + escolha de função tática): agora as duas vêm do mesmo lugar, então nunca
// divergem uma da outra.
//
// `lado` só importa pros grupos "com lado de verdade" (lateral/ponta/meia_lateral — um
// lateral-direito não cobre a ala esquerda): 'D', 'E' ou 'ambos' (cobre os dois lados,
// caso de especialidades sem lado fixo que ainda assim jogam de ala/lateral, ex: um
// zagueiro híbrido que cobre qualquer lateral). Nos demais grupos o lado é só geometria
// e essa chave é ignorada.
//
// `perfil` é só pra frases de flavor text (ex: motivo de um reserva entrar no lugar do
// titular) — uma classificação grosseira (defesa/criacao/ataque/fisico/amplitude/equilibrado).
//
// Ajuste fino de QUAL função específica escolher dentro da lista (ex: variar com a tática
// ativa) fica pra depois — por ora a primeira da lista é sempre a função padrão.
// =====================================================================================
const ESPECIALIDADES_JOGADOR = {
    'Goleiro/Tradicional': { perfil: 'equilibrado', gruposFuncao: {
        goleiro: ['goleiro']
    }},
    'Goleiro/Construtor': { perfil: 'criacao', gruposFuncao: {
        goleiro: ['gl-sai-jogando', 'goleiro']
    }},
    'Goleiro/Líbero': { perfil: 'ataque', gruposFuncao: {
        goleiro: ['goleiro-libero', 'goleiro']
    }},

    'Zagueiro/Rebatedor': { perfil: 'defesa', gruposFuncao: {
        zagueiro: ['defesa', 'marcador']
    }},
    'Zagueiro/Construtor': { perfil: 'criacao', gruposFuncao: {
        zagueiro: ['sai-jogando', 'marcador', 'defesa'], volante: ['zaga', 'armador-recuado']
    }},
    'Zagueiro/Cobertura': { perfil: 'defesa', gruposFuncao: {
        zagueiro: ['marcador', 'zagueiro-aberto', 'defesa'], lateral: ['lateral']
    }},
    'Zagueiro/Híbrido': { perfil: 'equilibrado', gruposFuncao: {
        zagueiro: ['defesa', 'marcador', 'zagueiro-aberto', 'sai-jogando'],
        volante: ['contencao', 'zaga', 'armador-recuado'], meio_campo_central: ['contencao'], lateral: ['lateral']
    }},

    // Lado (Direito/Esquerdo) não é mais parte do nome da especialidade — vem do campo
    // "Lado Preferido" do jogador (ver LADO_DA_SIGLA/posicaoCompativelComRole, mais abaixo).
    'Lateral/Defensivo': { perfil: 'defesa', gruposFuncao: {
        lateral: ['lateral'], zagueiro: ['zagueiro-aberto', 'marcador']
    }},
    // "flexivelLado": pedido do treinador — Construtor tem mais facilidade de jogar no lado
    // oposto ao preferido (o "invertido" já é parte do repertório dele), então o lado
    // preferido continua valendo pra elegibilidade, mas nunca bloqueia o lado oposto.
    'Lateral/Construtor': { perfil: 'criacao', flexivelLado: true, gruposFuncao: {
        lateral: ['lateral-invertido', 'lateral'], volante: ['meia-pelas-laterais', 'armador-recuado'], meio_campo_central: ['armador-recuado']
    }},
    'Lateral/Ala Clássico': { perfil: 'amplitude', gruposFuncao: {
        lateral: ['ala', 'lateral'], meia_lateral: ['ala', 'meia-aberto']
    }},
    'Lateral/Ala Ofensivo': { perfil: 'amplitude', gruposFuncao: {
        lateral: ['ala-atacante', 'ala-invertido', 'ala'], ponta: ['ala'], meia_lateral: ['ala', 'meia-aberto']
    }},

    'Volante/Cão de Guarda': { perfil: 'defesa', gruposFuncao: {
        volante: ['contencao', 'zaga'], zagueiro: ['defesa', 'marcador', 'zagueiro-aberto'], meio_campo_central: ['contencao']
    }},
    'Volante/Organizador': { perfil: 'criacao', gruposFuncao: {
        volante: ['armador-recuado'], meio_campo_central: ['armador-recuado', 'armador'], zagueiro: ['sai-jogando']
    }},
    'Volante/Motorzinho': { perfil: 'equilibrado', gruposFuncao: {
        volante: ['volante-oportunista', 'contencao'], meio_campo_central: ['box-to-box', 'contencao'], meia_lateral: ['meia-aberto']
    }},

    'MeioCampo/Dinâmico': { perfil: 'equilibrado', gruposFuncao: {
        meio_campo_central: ['box-to-box', 'contencao', 'armador-recuado'], volante: ['volante-oportunista', 'armador-recuado']
    }},
    'MeioCampo/Armador Clássico': { perfil: 'criacao', gruposFuncao: {
        meia_atacante: ['camisa-10-classico', 'armador'], meio_campo_central: ['armador', 'armador-recuado'], meia_lateral: ['armador-aberto']
    }},
    'MeioCampo/Infiltrador': { perfil: 'ataque', gruposFuncao: {
        meia_atacante: ['atacante-sombra'], meio_campo_central: ['box-to-box'], atacante: ['falso-9'], ponta: ['corta-pra-dentro']
    }},
    'MeioCampo/Aberto': { perfil: 'amplitude', gruposFuncao: {
        meio_campo_central: ['meia-pelas-pontas'], meia_atacante: ['meia-pelas-pontas'], meia_lateral: ['meia-aberto'], lateral: ['lateral']
    }},

    'Ponta/Operário': { perfil: 'amplitude', gruposFuncao: {
        meia_lateral: ['meia-aberto', 'ala'], lateral: ['ala-atacante', 'ala', 'lateral'], ponta: ['ala']
    }},
    'Ponta/Clássico': { perfil: 'amplitude', gruposFuncao: {
        ponta: ['ala'], meia_lateral: ['ala', 'meia-aberto']
    }},
    // Invertido e Construtor: os dois "tem mais facilidade de fazer os dois lados" que o
    // treinador citou — flexivelLado nunca bloqueia o lado oposto ao preferido, só continua
    // dando prioridade pro lado preferido (ver bônus de lado em selecionarEscalacaoPorAfinidadeTatica).
    'Ponta/Invertido': { perfil: 'ataque', flexivelLado: true, gruposFuncao: {
        ponta: ['corta-pra-dentro'], meia_lateral: ['corta-pra-dentro'], atacante: ['oportunista', 'falso-9']
    }},
    'Ponta/Construtor': { perfil: 'criacao', flexivelLado: true, gruposFuncao: {
        ponta: ['armador-aberto'], meia_lateral: ['armador-aberto'], meia_atacante: ['meia-pelas-pontas', 'armador'], meio_campo_central: ['armador']
    }},

    'Atacante/Pivô': { perfil: 'fisico', gruposFuncao: {
        atacante: ['pivo', 'centroavante']
    }},
    'Atacante/Matador': { perfil: 'ataque', gruposFuncao: {
        atacante: ['oportunista', 'centroavante']
    }},
    'Atacante/Falso 9': { perfil: 'criacao', gruposFuncao: {
        atacante: ['falso-9', 'centroavante'], meia_atacante: ['atacante-sombra', 'camisa-10-classico', 'armador']
    }},
    'Atacante/Móvel': { perfil: 'ataque', gruposFuncao: {
        atacante: ['oportunista', 'falso-9', 'centroavante', 'pivo'], ponta: ['corta-pra-dentro'], meia_atacante: ['atacante-sombra']
    }}
};

// =====================================================================================
// AFINIDADE TÁTICA (pedido do treinador) — refinamento sobre ESPECIALIDADES_JOGADOR.gruposFuncao:
// em vez de só "cobre ou não cobre" uma função, cada (especialidade, grupo, função) tem uma nota
// de 0 a 5 (0 = sem afinidade nenhuma, 5 = encaixe perfeito). Usada SÓ pela Afinidade Tática
// (selecionarEscalacaoPorAfinidadeTatica, js/chat-ia.js) — o motor que já lê a função exigida em
// cada posição vinda da Matriz Dinâmica do Estilo de Jogo/Foco ativo — pra transformar o antigo
// desconto fixo de -8 pontos ("não cobre, ponto final") numa régua contínua: quanto mais longe do
// 5, mais a pontuação efetiva do jogador cai naquela função específica. "Na vida real às vezes um
// jogador perde espaço não por ser ruim, mas pela limitação da tática" — ele continua jogável, só
// fica mais caro na conta.
//
// Chaveada por grupo (as mesmas chaves de GRUPOS_FUNCAO_EA) porque a MESMA função (ex: "contencao")
// existe em mais de um grupo (volante e meio_campo_central) com afinidades diferentes pra uma
// mesma especialidade — não dá pra achatar num único mapa função->nota.
//
// Continua valendo só pra ESTA camada — a elegibilidade geral (quem pode ser escalado, cotado no
// banco, trocado manualmente etc.) segue vindo de gruposFuncao, sem mudança.
const AFINIDADE_TATICA = {
    'Goleiro/Tradicional': { goleiro: { goleiro: 5 } },
    'Goleiro/Construtor': { goleiro: { 'gl-sai-jogando': 5, 'goleiro-libero': 4, goleiro: 3 } },
    'Goleiro/Líbero': { goleiro: { 'goleiro-libero': 5, goleiro: 3, 'gl-sai-jogando': 3 } },

    'Zagueiro/Rebatedor': { zagueiro: { defesa: 5, marcador: 4 } },
    'Zagueiro/Construtor': {
        zagueiro: { defesa: 3, marcador: 2, 'sai-jogando': 5 },
        volante: { contencao: 2, zaga: 3, 'armador-recuado': 3 },
        meio_campo_central: { contencao: 2 }
    },
    'Zagueiro/Cobertura': {
        zagueiro: { defesa: 4, marcador: 4, 'zagueiro-aberto': 5 },
        lateral: { lateral: 3 }
    },
    'Zagueiro/Híbrido': {
        zagueiro: { defesa: 4, marcador: 4, 'sai-jogando': 5, 'zagueiro-aberto': 4 },
        volante: { contencao: 3, zaga: 3, 'armador-recuado': 3 },
        meio_campo_central: { contencao: 3 },
        lateral: { lateral: 3, 'lateral-invertido': 2 }
    },

    'Lateral/Defensivo': {
        lateral: { lateral: 5 },
        zagueiro: { defesa: 3, marcador: 4, 'zagueiro-aberto': 4 }
    },
    'Lateral/Construtor': {
        lateral: { lateral: 4, 'lateral-invertido': 5, 'ala-invertido': 5 },
        volante: { contencao: 2, 'armador-recuado': 3, 'meia-pelas-laterais': 3 },
        meio_campo_central: { contencao: 1, 'armador-recuado': 2, 'meia-pelas-pontas': 2 }
    },
    'Lateral/Ala Clássico': {
        lateral: { ala: 5, lateral: 4 },
        meia_lateral: { 'meia-aberto': 4, ala: 3 }
    },
    'Lateral/Ala Ofensivo': {
        lateral: { ala: 4, 'ala-atacante': 5, 'ala-invertido': 3 },
        meia_lateral: { ala: 4, 'meia-aberto': 4 },
        ponta: { ala: 2 }
    },

    'Volante/Cão de Guarda': {
        volante: { contencao: 5, zaga: 5 },
        zagueiro: { defesa: 3, marcador: 4, 'sai-jogando': 4, 'zagueiro-aberto': 3 },
        meio_campo_central: { contencao: 4 }
    },
    'Volante/Organizador': {
        volante: { 'armador-recuado': 5, contencao: 4 },
        meio_campo_central: { 'armador-recuado': 5, contencao: 3, armador: 4 },
        zagueiro: { 'sai-jogando': 2 }
    },
    'Volante/Motorzinho': {
        volante: { contencao: 3, 'volante-oportunista': 5, 'meia-pelas-laterais': 4 },
        meio_campo_central: { contencao: 2, 'box-to-box': 4, 'meia-pelas-pontas': 3 },
        meia_lateral: { 'meia-aberto': 2 }
    },

    'MeioCampo/Dinâmico': {
        meio_campo_central: { 'box-to-box': 5, contencao: 4, 'armador-recuado': 4 },
        volante: { 'volante-oportunista': 4, 'armador-recuado': 3 },
        meia_lateral: { 'meia-aberto': 2, ala: 1 }
    },
    'MeioCampo/Armador Clássico': {
        meio_campo_central: { armador: 5, 'box-to-box': 4, 'armador-recuado': 4 },
        meia_atacante: { armador: 4, 'camisa-10-classico': 2 },
        meia_lateral: { 'armador-aberto': 3 }
    },
    'MeioCampo/Infiltrador': {
        meia_atacante: { 'camisa-10-classico': 5, 'atacante-sombra': 5 },
        meio_campo_central: { armador: 4, 'box-to-box': 4 },
        atacante: { 'falso-9': 3 },
        ponta: { 'corta-pra-dentro': 4 }
    },
    'MeioCampo/Aberto': {
        meio_campo_central: { 'box-to-box': 4, 'meia-pelas-pontas': 5 },
        meia_lateral: { 'armador-aberto': 4, ala: 1, 'meia-aberto': 2 },
        meia_atacante: { 'meia-pelas-pontas': 4 },
        lateral: { lateral: 3 }
    },

    'Ponta/Operário': {
        meia_lateral: { 'meia-aberto': 5, ala: 5 },
        lateral: { ala: 4, 'ala-atacante': 5, lateral: 4 },
        ponta: { ala: 4 }
    },
    'Ponta/Clássico': {
        meia_lateral: { ala: 5, 'meia-aberto': 3 },
        ponta: { ala: 4 }
    },
    'Ponta/Invertido': {
        ponta: { 'corta-pra-dentro': 5, 'armador-aberto': 3 },
        meia_lateral: { 'corta-pra-dentro': 4, 'armador-aberto': 2 },
        meia_atacante: { 'meia-pelas-pontas': 2, 'atacante-sombra': 3 },
        atacante: { 'falso-9': 3, oportunista: 3 }
    },
    'Ponta/Construtor': {
        meia_lateral: { 'armador-aberto': 5 },
        ponta: { 'armador-aberto': 4 },
        meia_atacante: { armador: 3, 'camisa-10-classico': 3, 'meia-pelas-pontas': 4 },
        meio_campo_central: { armador: 3 }
    },

    'Atacante/Pivô': { atacante: { pivo: 5, centroavante: 4 } },
    'Atacante/Matador': { atacante: { oportunista: 5, centroavante: 4 } },
    'Atacante/Falso 9': {
        atacante: { 'falso-9': 5, oportunista: 3, centroavante: 3 },
        meia_atacante: { 'atacante-sombra': 4, 'camisa-10-classico': 3, armador: 3 }
    },
    'Atacante/Móvel': {
        atacante: { centroavante: 5, oportunista: 5, 'falso-9': 5, pivo: 4 },
        meia_atacante: { 'atacante-sombra': 4, 'meia-pelas-pontas': 3 },
        ponta: { 'corta-pra-dentro': 3 }
    }
};

// Nota de afinidade (0-5) de uma especialidade pra uma função específica, dentro de um grupo. Sem
// entrada nenhuma na tabela (especialidade não cadastrada, ou grupo/função fora do que foi dado)
// cai pra 0 — mesmo tratamento de "não tem afinidade nenhuma pra isso".
function afinidadeTatica(posicaoJogador, grupoKey, funcaoId) {
    let porGrupo = AFINIDADE_TATICA[posicaoJogador];
    let nota = porGrupo && porGrupo[grupoKey] && porGrupo[grupoKey][funcaoId];
    return typeof nota === 'number' ? nota : 0;
}

// =====================================================================================
// CLASSIFICAÇÃO DE ESPECIALIDADE POR SCOUT (IA) — pedido do treinador: quando o site lê um
// print do elenco/convocação pra adicionar jogadores automaticamente, a IA não deve mais
// aplicar um mapeamento fixo de "1 sigla -> 1 especialidade sempre igual" (isso ignorava por
// completo as outras 2-3 variantes de cada grupo posicional, ex: todo zagueiro virava
// "Zagueiro/Rebatedor", nunca Construtor/Cobertura/Híbrido). Em vez disso, ela raciocina como
// um scout de verdade — ritmo, passe, defesa, físico, pé bom etc., à la SoFifa — a partir do
// Nome/Posição Base/OVR de cada jogador, e escolhe entre TODAS as especialidades daquele
// grupo. As listas de opções vêm direto de ESPECIALIDADES_JOGADOR (nunca hardcoded soltas),
// então nunca destoam do catálogo real usado pelo resto do jogo.
function _especialidadesComPrefixo(prefixo) {
    return Object.keys(ESPECIALIDADES_JOGADOR).filter(k => k.startsWith(prefixo + '/'));
}

// Lado Preferido ('D'/'E') a partir da Posição Base lida na tela — só existe informação de
// verdade nas siglas de Lateral/Ponta/Meia-Lateral (LD/LAD, MD, PD = Direito; LE/LAE, ME, PE =
// Esquerdo); as demais (ZAG, VOL, MC, ATA...) não indicam lado nenhum, então caem no padrão
// 'D' — o campo é só uma preferência leve pra essas posições (nunca bloqueia escalação), e o
// treinador pode corrigir a qualquer momento editando o jogador.
const LADO_PREFERIDO_POR_POSICAO_BASE = {
    LD: 'D', LAD: 'D', MD: 'D', PD: 'D',
    LE: 'E', LAE: 'E', ME: 'E', PE: 'E'
};
function ladoPreferidoDaPosicaoBase(posicaoBase) {
    return LADO_PREFERIDO_POR_POSICAO_BASE[String(posicaoBase || '').toUpperCase()] || 'D';
}

// Esconde o campo "Lado Preferido" nos formulários de cadastro/edição de jogador quando a
// posição escolhida é Goleiro — o único que fica de fora do Lado Preferido (pedido do
// treinador: "isso eu quero pra todos os jogadores, menos goleiro"). Chamada no onchange do
// select de posição de cada formulário, e uma vez ao abrir/preencher o formulário na mão.
function alternarCampoLadoPreferido(idSelectPosicao, idWrapperLado) {
    let selectPos = document.getElementById(idSelectPosicao);
    let wrapper = document.getElementById(idWrapperLado);
    if (!selectPos || !wrapper) return;
    wrapper.style.display = selectPos.value.startsWith('Goleiro/') ? 'none' : '';
}

const PROMPT_CLASSIFICACAO_ESPECIALIDADE_IA = `Você é um Analista de Desempenho e Scout de Futebol de elite. Sua função é, pra CADA jogador, receber os dados básicos dele (Nome, Posição Base — a sigla mostrada na tela — e OVR) e classificá-lo na especialidade exata que melhor descreve seu estilo de jogo na vida real e no banco de dados do SoFifa (atributos de ritmo, passe, defesa, físico, pé bom etc.). Classifique CADA jogador em OBRIGATORIAMENTE APENAS UMA das especialidades abaixo, correspondente à Posição Base dele — nunca invente uma especialidade fora da lista daquele grupo. Se o jogador for desconhecido (regen/base), deduza a especialidade mais provável só pela Posição Base e pelo OVR. O lado (Direito/Esquerdo) do jogador NÃO faz mais parte da especialidade — é um campo à parte, calculado automaticamente pela Posição Base.

Mapeamento de Posição Base e especialidades permitidas:
- Posição Base "GL": escolha entre ${_especialidadesComPrefixo('Goleiro').join(', ')}. Critério: bom passe = Construtor; alta velocidade/saída = Líbero; resto = Tradicional.
- Posição Base "ZAG", "ZAD", "ZAE" ou "ZAC": escolha entre ${_especialidadesComPrefixo('Zagueiro').join(', ')}. Critério: passe alto = Construtor; ritmo alto = Cobertura; muito físico/defesa e baixo passe = Rebatedor; bons status gerais = Híbrido.
- Posição Base "LD", "LAD", "LE" ou "LAE": escolha entre ${_especialidadesComPrefixo('Lateral').join(', ')}. Critério: alto passe/visão = Construtor; alto ritmo/cruzamento = Ala Clássico; muito ofensivo, quase não volta pra defender = Ala Ofensivo; foco em defesa = Defensivo.
- Posição Base "VOL": escolha entre ${_especialidadesComPrefixo('Volante').join(', ')}. Critério: alta defesa/físico = Cão de Guarda; alto passe = Organizador; alto fôlego, ataque e defesa = Motorzinho.
- Posição Base "MC", "MCD", "MCE", "MEI", "MEID" ou "MEIE": escolha entre ${_especialidadesComPrefixo('MeioCampo').join(', ')}. Critério: alta finalização/posicionamento = Infiltrador; alto passe/visão = Armador Clássico; atributos equilibrados = Dinâmico; alto ritmo/cruzamento pelas pontas = Aberto.
- Posição Base "MD", "PD", "ME" ou "PE": escolha entre ${_especialidadesComPrefixo('Ponta').join(', ')}. Critério: pé bom oposto ao lado que joga (ex: canhoto jogando na direita) e alta finalização = Invertido; alta defesa/fôlego = Operário; alto passe = Construtor; alto ritmo/cruzamento = Clássico.
- Posição Base "ATA", "ATD" ou "ATE": escolha entre ${_especialidadesComPrefixo('Atacante').join(', ')}. Critério: alto físico/força = Pivô; alta finalização pura = Matador; alto passe = Falso 9; alto ritmo/drible = Móvel.`;

// Grupo de função -> lista de siglas do campinho que usam aquele catálogo (inverso de
// GRUPO_POR_ROLE, calculado uma vez só).
const SIGLAS_POR_GRUPO_FUNCAO = {};
Object.entries(GRUPO_POR_ROLE).forEach(([sigla, grupo]) => {
    (SIGLAS_POR_GRUPO_FUNCAO[grupo] = SIGLAS_POR_GRUPO_FUNCAO[grupo] || []).push(sigla);
});

// Grupos onde o lado (D/E) muda a elegibilidade de verdade — um lateral/ponta/meia-lateral
// com Lado Preferido Direito não joga bem do lado esquerdo (pedido do treinador: "pra lateral
// e ponta o lado preferido passa a ter mais peso"). Nos demais grupos (zagueiro/volante/meio-
// campo/meia-atacante/atacante) o lado é só uma PREFERÊNCIA leve — nunca bloqueia elegibilidade,
// só influencia qual sigla (D/E) a escalação tenta primeiro pra cada jogador (ver a ordem de
// tentativa em alocarPorPosicaoKuhn e o bônus de lado em selecionarEscalacaoPorAfinidadeTatica,
// js/chat-ia.js). "flexivelLado" (Lateral/Construtor, Ponta/Invertido, Ponta/Construtor) tem
// mais facilidade nos dois lados — o lado preferido nunca bloqueia essas especialidades.
const GRUPOS_COM_LADO = new Set(['lateral', 'ponta', 'meia_lateral']);
// Sigla do campinho -> lado geométrico ('D'/'E') — cobre TODO grupo com variante D/E, mesmo os
// que hoje só usam isso como preferência leve (zagueiro/volante/meio-campo/meia-atacante/
// atacante). Siglas sem lado (GOL, ZAC, e as versões "sem D/E" como VOL/MC/MEI/ATA) ficam de
// fora — geometria neutra, nenhuma preferência se aplica.
const LADO_DA_SIGLA = {
    LAD: 'D', ALD: 'D', LAE: 'E', ALE: 'E', MD: 'D', ME: 'E', PD: 'D', PE: 'E',
    ZAD: 'D', ZAE: 'E', VOLD: 'D', VOLE: 'E', MCD: 'D', MCE: 'E', MEID: 'D', MEIE: 'E', ATD: 'D', ATE: 'E'
};

// Pra cada especialidade, pré-computa o conjunto de siglas do campinho em que ela é aceita EM
// TESE — sem considerar ainda o Lado Preferido do jogador, que agora é atributo do JOGADOR, não
// da especialidade, e por isso só entra depois, dinamicamente, dentro de posicaoCompativelComRole.
Object.values(ESPECIALIDADES_JOGADOR).forEach(especialidade => {
    let siglas = new Set();
    Object.keys(especialidade.gruposFuncao).forEach(grupoKey => {
        (SIGLAS_POR_GRUPO_FUNCAO[grupoKey] || []).forEach(sigla => siglas.add(sigla));
    });
    especialidade._siglasCompativeis = siglas;
});

// true se a posição de carteirinha do jogador é aceita na função do campinho (sigla) informada.
// Fonte única pra escalação automática, pro seletor de troca e pro prompt de escalação da IA.
// "ladoPreferido" ('D'/'E', opcional): nos 3 grupos com lado de verdade (GRUPOS_COM_LADO), uma
// especialidade sem "flexivelLado" só é aceita no lado que bate com o preferido do jogador.
// Chamadas sem ladoPreferido (nenhum jogador real em jogo — ex: "quais especialidades cobrem
// esta função em geral") continuam permissivas, sem restringir por lado.
function posicaoCompativelComRole(role, posicaoJogador, ladoPreferido) {
    let especialidade = ESPECIALIDADES_JOGADOR[posicaoJogador];
    if (!especialidade || !especialidade._siglasCompativeis.has(role)) return false;
    let grupo = GRUPO_POR_ROLE[role];
    if (!GRUPOS_COM_LADO.has(grupo) || especialidade.flexivelLado || !ladoPreferido) return true;
    let ladoDaSigla = LADO_DA_SIGLA[role];
    return !ladoDaSigla || ladoDaSigla === ladoPreferido;
}

// Texto curto de classificação da especialidade (defesa/criacao/ataque/fisico/amplitude/
// equilibrado) — só pra frases de flavor text, nunca pra travar nada.
function perfilTaticoEspecialidade(posicaoJogador) {
    let especialidade = ESPECIALIDADES_JOGADOR[posicaoJogador];
    return especialidade ? especialidade.perfil : 'equilibrado';
}

// Função neutra de cada grupo, usada quando não há especialidade de jogador pra consultar
// (ex: o assistente de Estilo de Jogo monta um preset de função por sigla ANTES de qualquer
// jogador estar escalado, chamando escolherFuncaoJogador com posicaoJogador null).
const FUNCAO_PADRAO_POR_GRUPO = {
    goleiro: 'goleiro', zagueiro: 'defesa', lateral: 'lateral', volante: 'contencao',
    meio_campo_central: 'box-to-box', meia_atacante: 'camisa-10-classico', meia_lateral: 'meia-aberto',
    ponta: 'ala', atacante: 'centroavante'
};

// Escolhe a função (dentro do grupo da posição) a partir da especialidade cadastrada do
// jogador (ex: "Zagueiro/Construtor" -> zagueiro que Sai Jogando). A primeira função listada
// pra aquele grupo em ESPECIALIDADES_JOGADOR é sempre a escolhida (variar por tática fica
// pra depois). Goleiro não depende da tática mais — a diferença entre os 3 estilos agora
// vem só da especialidade cadastrada.
function _escolherFuncaoBase(grupoKey, role, posicaoJogador, tatica) {
    let grupo = GRUPOS_FUNCAO_EA[grupoKey];
    if (!grupo) return null;
    let especialidade = ESPECIALIDADES_JOGADOR[posicaoJogador];
    let candidatos = especialidade && especialidade.gruposFuncao[grupoKey];
    if (candidatos && candidatos.length) return grupo.funcoes.find(f => f.id === candidatos[0]) || grupo.funcoes[0];
    let padraoId = FUNCAO_PADRAO_POR_GRUPO[grupoKey];
    return (padraoId && grupo.funcoes.find(f => f.id === padraoId)) || grupo.funcoes[0];
}

// Dado o "abordagem defensiva" (0-100) e o "estilo de armação" da tática ativa, escolhe entre
// os focos disponíveis DAQUELA função o que mais combina — nunca inventa foco fora da lista.
function _escolherFoco(funcaoObj, tatica) {
    if (!funcaoObj || !funcaoObj.focos || !funcaoObj.focos.length) return null;
    if (funcaoObj.focos.length === 1) return funcaoObj.focos[0];

    let abordagem = (tatica && typeof tatica.abordagemDefensiva === 'number') ? tatica.abordagemDefensiva : 50;
    let estilo = tatica ? tatica.estiloArmacao : 'equilibrado';

    let prioridades;
    if (abordagem <= 30) prioridades = ['defesa', 'roubada de bola', 'contencao', 'contenção', 'equilibrado'];
    else if (abordagem <= 60) prioridades = ['equilibrado', 'apoio', 'defesa'];
    else if (abordagem <= 90) {
        if (estilo === 'contra-ataque') prioridades = ['deslocamento', 'combatividade', 'roubada de bola', 'ataque', 'equilibrado'];
        else if (estilo === 'passe-curto') prioridades = ['armacao', 'armação', 'apoio', 'ataque', 'equilibrado'];
        else prioridades = ['ataque', 'equilibrado', 'armacao', 'armação'];
    } else {
        prioridades = ['ataque', 'combatividade', 'armacao', 'armação'];
    }

    for (let alvo of prioridades) {
        let achado = funcaoObj.focos.find(f => _semAcento(f.nome).includes(_semAcento(alvo)));
        if (achado) return achado;
    }
    return funcaoObj.focos[0];
}

// Ponto de entrada: dado o papel no campinho (role), a especialidade cadastrada do jogador
// (jogador.posicao) e a tática ativa da partida, devolve {grupoKey, grupoNome, funcao, foco}.
function escolherFuncaoJogador(role, posicaoJogador, tatica) {
    let grupoKey = grupoFuncaoDoRole(role);
    if (!grupoKey) return null;
    let grupo = GRUPOS_FUNCAO_EA[grupoKey];
    let funcao = _escolherFuncaoBase(grupoKey, role, posicaoJogador, tatica);
    if (!funcao) return null;
    let foco = _escolherFoco(funcao, tatica);
    return { grupoKey: grupoKey, grupoNome: grupo.nome, funcao: funcao, foco: foco };
}

// Monta a mesma forma {grupoKey, grupoNome, funcao, foco} a partir de ids já escolhidos (ex: pelo
// Auxiliar, que decidiu função/foco levando o adversário em conta) — sem recalcular nada,
// só valida que os ids existem de fato no grupo daquele role antes de devolver.
function escolhaFuncaoDeIds(role, funcaoId, focoId) {
    let grupoKey = grupoFuncaoDoRole(role);
    if (!grupoKey) return null;
    let grupo = GRUPOS_FUNCAO_EA[grupoKey];
    let funcao = grupo.funcoes.find(f => f.id === funcaoId);
    if (!funcao) return null;
    let foco = funcao.focos.find(f => f.id === focoId) || funcao.focos[0];
    return { grupoKey: grupoKey, grupoNome: grupo.nome, funcao: funcao, foco: foco };
}

// "Zagueiro: Defesa-Equilibrado"
function resumoFuncaoJogador(escolha) {
    if (!escolha) return '';
    let focoTxt = escolha.foco ? `-${escolha.foco.nome}` : '';
    return `${escolha.grupoNome}: ${escolha.funcao.nome}${focoTxt}`;
}

// Texto completo pra tooltip/modal — descrição da função + o que o foco muda.
function descricaoFuncaoJogador(escolha) {
    if (!escolha) return '';
    let partes = [escolha.funcao.descricao];
    if (escolha.foco) partes.push(escolha.foco.descricao);
    return partes.join(' ');
}
