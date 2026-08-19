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
            { id: 'goleiro', nome: 'Goleiro', descricao: 'O goleiro tradicional que permanece sobre a linha e tem como foco parar a finalização.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Com o foco Defesa, o goleiro não sai para buscar bolas longas ou rebotes.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com o foco Equilibrado, o goleiro às vezes sai da área para pegar bolas longas ou rebotes.' }
            ]},
            { id: 'gl-sai-jogando', nome: 'GL que Sai Jogando', descricao: 'Goleiro ao estilo moderno que sai jogando, dando opção de passe para facilitar a armação, mas que permanece na posição quando o time está na defesa.', focos: [
                { id: 'armacao', nome: 'Armação', descricao: 'Com a opção Armação definida, o goleiro que sai jogando sobe mais no campo para apoiar as jogadas.' }
            ]},
            { id: 'goleiro-libero', nome: 'Goleiro-Líbero', descricao: 'GL que assume riscos e se concentra em parar ataques fora da área.', focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com o foco Equilibrado, o goleiro-líbero sai da área para pegar bolas próximas.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Com o foco em Armação, GL-líbero sobe mais no campo para receber a bola e apoiar as jogadas.' }
            ]}
        ]
    },
    zagueiro: {
        nome: 'Zagueiro',
        funcoes: [
            { id: 'defesa', nome: 'Defesa', descricao: 'Um atleta da zaga eficiente que é excelente na defesa básica, o que inclui manter a linha defensiva.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o atleta de defesa tem como foco apenas as responsabilidades defensivas.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com o foco Equilibrado, o atleta de defesa avança para fechar o ataque quando necessário.' }
            ]},
            { id: 'marcador', nome: 'Marcador', descricao: 'Um atleta da zaga que rouba a bola e se adianta da linha de defesa para entrar em divididas, interceptar passes e liderar a pressão.', focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com o foco Equilibrado, o atleta na marcação intercepta passes e pressiona atacantes recebendo a bola.' },
                { id: 'combatividade', nome: 'Combatividade', descricao: 'Quando a instrução é Combatividade, o atleta na marcação avança até a base do meio-campo para interceptar passes e fechar atacantes.' }
            ]},
            { id: 'zagueiro-aberto', nome: 'Zagueiro Aberto', descricao: 'Atleta central de defesa que se desloca para o lado, dando cobertura para laterais. Função geralmente usada em esquemas com linha de três.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Com a opção Defesa definida, o Zagueiro Aberto apoia laterais em todas as fases do jogo, mas continua perto da linha de defesa.' },
                { id: 'combatividade', nome: 'Combatividade', descricao: 'Com a opção Combatividade definida, o Zagueiro Aberto também fecha espaços adversários e intercepta passes durante a fase defensiva do jogo.' },
                { id: 'apoio', nome: 'Apoio', descricao: 'Com a opção Apoio definida, o Zagueiro Aberto avança pelo lado do campo, dando opção de passe quando o time precisa desafogar a pressão.' }
            ]},
            { id: 'sai-jogando', nome: 'Sai Jogando', descricao: 'Atleta da zaga ao estilo moderno que, além de defender, sabe jogar com a bola nos pés. Pode avançar ou jogar com mais amplitude, apoiando a construção de jogadas.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a configuração é Defesa, o defensor que sai jogando avança um pouco para apoiar o time durante a posse de bola.' },
                { id: 'armacao', nome: 'Armação', descricao: 'O foco Armação faz com que o defensor que sai jogando fique mais na posição de volante de contenção durante a posse de bola.' },
                { id: 'combatividade', nome: 'Combatividade', descricao: 'Quando a instrução é Combatividade, o defensor que sai jogando tem como foco interceptar passes e fechar oponentes.' }
            ]}
        ]
    },
    lateral: {
        nome: 'Lateral',
        funcoes: [
            { id: 'lateral', nome: 'Lateral', descricao: 'Atleta de defesa com abertura que prioriza a proteção do próprio gol, ficando para trás, mantendo a linha defensiva e oferecendo opção.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a configuração é Defesa, o lateral entra para formar uma linha de três quando o time estiver com a posse de bola.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando a configuração é Equilibrado, o lateral ganha liberdade para avançar um pouco mais e dar apoio aos ataques.' },
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, o lateral pode se mover para dentro e formar uma linha de três na defesa ou se adiantar e jogar com mais amplitude, apoiando a armação.' }
            ]},
            { id: 'lateral-invertido', nome: 'Lateral Invertido', descricao: 'Uma evolução moderna da zaga, este atleta avança em campo, adotando uma posição central quando o time está com a bola.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a configuração é Defesa, o lateral invertido funciona como volante quando o time está com a bola.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando a configuração é Equilibrado, o lateral invertido se posiciona como meia quando o time está com a posse de bola.' }
            ]},
            { id: 'ala', nome: 'Ala', descricao: 'A versatilidade e o fôlego fazem este talento avançar no campo e apoiar os ataques antes de voltar à posição defensiva.', focos: [
                { id: 'apoio', nome: 'Apoio', descricao: 'Quando a instrução é Apoio, o ala só pode atacar quando o time está com a posse de bola e só pode defender quando o time está sem a bola.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com Equilibrado, o ala pode ficar na frente mesmo quando o time estiver sem a posse de bola ou voltar para a defesa quando necessário.' }
            ]},
            { id: 'ala-invertido', nome: 'Ala Invertido', descricao: 'Lateral com vocação ofensiva ao estilo moderno que avança e adota uma posição central no campo quando o time está com a bola.', focos: [
                { id: 'armacao', nome: 'Armação', descricao: 'Com a opção Armação definida, o Ala Invertido age como peça central de criação, ajudando a ditar o ritmo de jogo.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Com a opção Ataque definida, o Ala Invertido age como atacante sombra central, ajudando no último terço.' }
            ]},
            { id: 'ala-atacante', nome: 'Ala Atacante', descricao: 'Apesar de tecnicamente ser da defesa, este atleta se preocupa mais em avançar e oferecer amplitude aos ataques do time.', focos: [
                { id: 'apoio', nome: 'Apoio', descricao: 'Com a opção Apoio definida, o ala atacante raramente dá um pique para voltar e defender, a menos que o time sofra um contra-ataque.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a instrução é Ataque, o ala atacante sobe ainda mais no campo e realiza menos tarefas defensivas.' }
            ]}
        ]
    },
    volante: {
        nome: 'Volante',
        funcoes: [
            { id: 'contencao', nome: 'Contenção', descricao: 'Com papel fundamental no futebol moderno, este volante tem como foco proteger a linha de defesa durante os ataques e ajudar na defesa no caso de contra-ataques.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o meio-campista de contenção avança um pouco adiante para oferecer uma opção de passe, mas, normalmente, foca em defender.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Quando a configuração é Deslocamento, o meio-campista de contenção se movimenta pela amplitude do campo para fechar as linhas de passe e se aproxima para pressionar atacantes.' },
                { id: 'roubada-de-bola', nome: 'Roubada de Bola', descricao: 'O foco Roubada de Bola faz o meio-campista de contenção interceptar passes agressivamente como parte do foco defensivo.' }
            ]},
            { id: 'armador-recuado', nome: 'Armador Recuado', descricao: 'A peça-chave para armar a jogada desde a defesa, este meio-campista em posição mais defensiva geralmente será o catalisador para os ataques.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Com o foco Defesa, o atleta na armação recuada tem como foco fechar as linhas de passe e se manter na defesa enquanto o time parte para o ataque.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a configuração é Armação, o atleta na armação recuada avança e oferece opção de passe para apoiar ataques.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'O foco Deslocamento permite que o atleta na armação recuada se mova pela amplitude do campo para apoiar ataques.' }
            ]},
            { id: 'zaga', nome: 'Zaga', descricao: 'Um volante que ficará entre a zaga enquanto o time estiver com a posse de bola para oferecer proteção quando sofrer contra-ataque.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a configuração é Defesa, a zaga tem como foco as tarefas defensivas.' }
            ]},
            { id: 'meia-pelas-laterais', nome: 'Meia pelas Laterais', descricao: 'Um item de volante com a missão de marcar e cobrir as laterais do campo quando necessário.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o item de meia pelas laterais pode assumir as posições de lateral e ala enquanto o time estiver com a posse de bola.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a instrução é Armação, o item de meia pelas laterais pode abrir para a posição de ala e avançar para a posição de meia com abertura quando o time estiver com a posse de bola.' }
            ]},
            { id: 'volante-oportunista', nome: 'Volante Oportunista', descricao: 'Volante que pode avançar e apoiar as jogadas de ataque, fazendo arrancadas tardias rumo à área quando tiver a oportunidade.', focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Com a opção Equilibrado definida, o Volante Oportunista equilibra suas responsabilidades defensivas e ofensivas.' }
            ]}
        ]
    },
    meio_campo_central: {
        nome: 'Meio-Campo',
        funcoes: [
            { id: 'box-to-box', nome: 'Box-to-Box', descricao: 'Este atleta trabalha entre as duas áreas. Não atua nem na última linha de defesa, nem na parte final do ataque, mas se envolve em tudo que acontece.', focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando a instrução é ser Equilibrado, o meio-campista Box-to-box cobre o meio do campo no ataque e na defesa.' },
                { id: 'roubada-de-bola', nome: 'Roubada de Bola', descricao: 'Com a opção Roubada de Bola definida, a prioridade dos meio-campistas Box-to-Box é recuperar a bola, além de dar apoio central no ataque e na defesa.' }
            ]},
            { id: 'armador', nome: 'Armador', descricao: 'Este atleta tende a ser a força criativa do meio-campo, com licença para se deslocar e criar espaços e oportunidades de ataque.', focos: [
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Quando a configuração é Deslocamento, o atleta na armação tem liberdade para explorar o campo e encontrar os melhores espaços para apoiar os ataques.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o atleta na armação avança para apoiar ataques em uma posição mais adiantada.' }
            ]},
            { id: 'armador-recuado', nome: 'Armador Recuado', descricao: 'A peça-chave para armar a jogada desde a defesa, este meio-campista em posição mais defensiva geralmente será o catalisador para os ataques.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Com o foco Defesa, o atleta na armação recuada tem como foco fechar as linhas de passe e se manter na defesa enquanto o time parte para o ataque.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a configuração é Armação, o atleta na armação recuada avança e oferece opção de passe para apoiar ataques.' }
            ]},
            { id: 'meia-pelas-pontas', nome: 'Meia pelas Pontas', descricao: 'Um meio-campista que oferece amplitude quando o time está com a posse de bola, se movendo pelas pontas para oferecer uma opção de passe.', focos: [
                { id: 'apoio', nome: 'Apoio', descricao: 'Com a opção Apoio definida, a prioridade do meia pelas pontas é apoiar as jogadas, em vez de simplesmente atacar ou defender.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o meia pelas pontas alterna igualmente entre o ataque e a defesa de forma balanceada.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o meia pelas pontas pode avançar livremente, sacrificando responsabilidades defensivas.' }
            ]},
            { id: 'contencao', nome: 'Contenção', descricao: 'Com papel fundamental no futebol moderno, este volante tem como foco proteger a linha de defesa durante os ataques e ajudar na defesa no caso de contra-ataques.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o meio-campista de contenção avança um pouco adiante para oferecer uma opção de passe, mas, normalmente, foca em defender.' },
                { id: 'roubada-de-bola', nome: 'Roubada de Bola', descricao: 'O foco Roubada de Bola faz o meio-campista de contenção interceptar passes agressivamente como parte do foco defensivo.' }
            ]}
        ]
    },
    meia_atacante: {
        nome: 'Meia-Atacante',
        funcoes: [
            { id: 'armador', nome: 'Armador', descricao: 'Este atleta tende a ser a força criativa do meio-campo, com licença para se deslocar e criar espaços e oportunidades de ataque.', focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando a instrução é ser Equilibrado, o atleta na armação oferece apoio defensivo quando necessário e organiza ataques.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Quando a configuração é Deslocamento, o atleta na armação tem liberdade para explorar o campo e encontrar os melhores espaços para apoiar os ataques.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Com Armação, o atleta na armação recua para pegar a bola e orquestrar um ataque.' }
            ]},
            { id: 'meia-pelas-pontas', nome: 'Meia pelas Pontas', descricao: 'Um meio-campista que oferece amplitude quando o time está com a posse de bola, se movendo pelas pontas para oferecer uma opção de passe.', focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o meia pelas pontas alterna igualmente entre o ataque e a defesa de forma balanceada.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Com a opção Deslocamento definida, meia-atacante pelas pontas alterna livremente o lado pelo qual ataca, mesmo em bolas paradas.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o meia pelas pontas pode avançar livremente, sacrificando responsabilidades defensivas.' }
            ]},
            { id: 'atacante-sombra', nome: 'Atacante Sombra', descricao: 'Um meio-campista com mentalidade ofensiva que joga no espaço por trás dos atacantes. Suas corridas para a área no momento certo criam oportunidades de gol.', focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o atacante sombra tem como foco fazer corridas tardias para dentro da área, preenchendo o espaço deixado pelo ataque.' }
            ]},
            { id: 'camisa-10-classico', nome: 'Camisa 10 Clássico', descricao: 'Um item de meia atacante tradicional que vai participar da maior parte das jogadas criativas de ataque.', focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a instrução é Ataque, o item de camisa 10 clássica manterá a posição atrás da linha de ataque, operando como a principal força criativa do time.' },
                { id: 'com-abertura', nome: 'Com Abertura', descricao: 'Quando a instrução é Abertura, o item de camisa 10 clássica pode abrir para a lateral e organizar ataques de qualquer posição em toda a largura do campo.' },
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, Camisa 10 clássica escolhe se fica no meio ou se explora a amplitude do campo durante os ataques.' }
            ]}
        ]
    },
    meia_lateral: {
        nome: 'Meia-Lateral',
        funcoes: [
            { id: 'corta-pra-dentro', nome: 'Corta pra Dentro', descricao: 'Um atacante que começa na ponta, mas costuma cortar para dentro para ajeitar para a perna boa e finalizar ou dar o passe final.', focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando tem foco Ataque, o atacante que Corta para Dentro tem como foco o espaço interno para fazer corridas ofensivas.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o atacante que Corta pra Dentro oferece apoio defensivo mínimo e, às vezes, atrasa a corrida para se colocar como opção de passe.' }
            ]},
            { id: 'meia-aberto', nome: 'Meia Aberto', descricao: 'Um meio-campista que fica na lateral para facilitar o fluxo, oferecer passes e apoiar a defesa.', focos: [
                { id: 'defesa', nome: 'Defesa', descricao: 'Quando a instrução é Defesa, o meia com abertura recua para o meio de campo defensivo e protege a defesa.' },
                { id: 'apoio', nome: 'Apoio', descricao: 'Com a opção Apoio definida, o meia com abertura joga pelo lado, apoiando a posse de bola e ajudando na defesa quando necessário.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Com a opção Armação definida, o meia com abertura se adianta mais em campo para apoiar as jogadas, mas ainda ajuda na defesa quando necessário.' }
            ]},
            { id: 'armador-aberto', nome: 'Armador Aberto', descricao: 'Uma saída criativa posicionada aberta, mas capaz de se mover por dentro para criar chances de desarmar defesas.', focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o atleta na armação aberta avança e recebe passes abertos na ponta.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a configuração é Armação, o atleta na armação aberta se aproxima para oferecer opção de passe, equilibrando a abordagem para apoiar a defesa se necessário.' }
            ]},
            { id: 'ala', nome: 'Ala', descricao: 'Um meia que sempre fica nas pontas, tocando a lateral, oferecendo apoio amplo em todas as fases do jogo.', focos: [
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o ala oferece apoio tanto na defesa quanto no ataque, misturando corridas até a defesa e avanços como opção de passe.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o ala tem como foco avançar e prefere furar a defesa em vez de receber a bola nos pés.' }
            ]}
        ]
    },
    ponta: {
        nome: 'Ponta',
        funcoes: [
            { id: 'corta-pra-dentro', nome: 'Corta pra Dentro', descricao: 'Um atacante que começa na ponta, mas costuma cortar para dentro para ajeitar para a perna boa e finalizar ou dar o passe final.', focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando tem foco Ataque, o atacante que Corta para Dentro tem como foco o espaço interno para fazer corridas ofensivas.' },
                { id: 'deslocamento', nome: 'Deslocamento', descricao: 'Quando a configuração é Deslocamento, o atacante que Corta para Dentro pode se movimentar livremente e explorar quaisquer lacunas defensivas que encontrar.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o atacante que Corta pra Dentro oferece apoio defensivo mínimo e, às vezes, atrasa a corrida para se colocar como opção de passe.' }
            ]},
            { id: 'armador-aberto', nome: 'Armador Aberto', descricao: 'Uma saída criativa posicionada aberta, mas capaz de se mover por dentro para criar chances de desarmar defesas.', focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o atleta na armação aberta avança e recebe passes abertos na ponta.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Quando a configuração é Armação, o atleta na armação aberta se aproxima para oferecer opção de passe, equilibrando a abordagem para apoiar a defesa se necessário.' }
            ]},
            { id: 'ala', nome: 'Ala', descricao: 'Um meia que sempre fica nas pontas, tocando a lateral, oferecendo apoio amplo em todas as fases do jogo.', focos: [
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, ponta decide o momento certo para atacar ou defender e pode trocar de lado com colega ponta versátil entre uma fase do jogo e outra.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Quando a configuração é Ataque, o ala tem como foco avançar e prefere furar a defesa em vez de receber a bola nos pés.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o ala oferece apoio tanto na defesa quanto no ataque, misturando corridas até a defesa e avanços como opção de passe.' }
            ]}
        ]
    },
    atacante: {
        nome: 'Atacante',
        funcoes: [
            { id: 'oportunista', nome: 'Oportunista', descricao: 'Este atleta tem um objetivo: marcar gols. Fica avançado e tem como foco correr por trás da defesa buscando criar chances de gol.', focos: [
                { id: 'versatil', nome: 'Versátil', descricao: 'Com a opção Versátil definida, o oportunista escolhe se volta para dar apoio à equipe ou se faz pressão.' },
                { id: 'apoio', nome: 'Apoio', descricao: 'Quando a configuração é Apoio, o atleta oportunista se aproxima da defesa adversária, pressionando agressivamente com a posse de bola, na esperança de forçar um erro.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o atleta oportunista fica no limite da linha de defesa, pronto para aproveitar lacunas e erros da defesa.' }
            ]},
            { id: 'falso-9', nome: 'Falso 9', descricao: 'Posicionada na linha de ataque, esta pessoa recua para orquestrar a jogada no espaço em frente à defesa. Desta forma, também pode ajudar nas jogadas.', focos: [
                { id: 'ataque', nome: 'Ataque', descricao: 'Com a opção Ataque definida, o atleta falso 9 recua, se distanciando da defesa adversária para iniciar mais de longe arrancadas tardias rumo à área.' },
                { id: 'armacao', nome: 'Armação', descricao: 'Com Armação, o falso 9 recua da defesa adversária e opera como atleta na armação, liderando ataques.' }
            ]},
            { id: 'pivo', nome: 'Pivô', descricao: 'Atleta de ataque com um físico que permite segurar as jogadas, proteger a bola dos adversários e trazer colegas para o ataque.', focos: [
                { id: 'com-abertura', nome: 'Com Abertura', descricao: 'Quando a configuração é Abertura, o pivô vai para os limites da área em busca de espaço para fazer a diferença.' },
                { id: 'equilibrado', nome: 'Equilibrado', descricao: 'Quando Equilibrado, o pivô sai da linha de defesa, segura a jogada e passa a bola para colegas de time, sendo responsável por tarefas simples na defesa.' },
                { id: 'ataque', nome: 'Ataque', descricao: 'Com o foco Ataque, o pivô fica livre para avançar, sem instruções de defesa.' }
            ]},
            { id: 'centroavante', nome: 'Centroavante', descricao: 'Um atacante versátil que geralmente fica perto da linha defensiva do adversário, mas aparece para receber passes na armação e corre por trás.', focos: [
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

// Escolhe a função (dentro do grupo da posição) a partir da especialidade cadastrada do
// jogador (ex: "Zagueiro/Construtor" puxa pra "Sai Jogando"). Goleiro não tem especialidade
// cadastrada, então usa a tática pra decidir entre os 3 estilos de goleiro do jogo.
function _escolherFuncaoBase(grupoKey, role, posicaoJogador, tatica) {
    let grupo = GRUPOS_FUNCAO_EA[grupoKey];
    if (!grupo) return null;
    let porId = id => grupo.funcoes.find(f => f.id === id) || grupo.funcoes[0];
    let pos = _semAcento(posicaoJogador);

    if (grupoKey === 'goleiro') {
        let abordagem = (tatica && typeof tatica.abordagemDefensiva === 'number') ? tatica.abordagemDefensiva : 50;
        let estilo = tatica ? tatica.estiloArmacao : '';
        if (estilo === 'passe-curto' || (tatica && (tatica.predefinicao === 'posse-bola' || tatica.predefinicao === 'pressao-alta'))) return porId('gl-sai-jogando');
        if (abordagem >= 91) return porId('goleiro-libero');
        return porId('goleiro');
    }
    if (grupoKey === 'zagueiro') {
        if (pos.includes('construtor')) return porId('sai-jogando');
        if (pos.includes('lateral')) return porId('zagueiro-aberto');
        if (pos.includes('versatil')) return porId('marcador');
        return porId('defesa');
    }
    if (grupoKey === 'lateral') {
        let avancado = role === 'ALD' || role === 'ALE';
        if (pos.includes('construtor')) return porId(avancado ? 'ala-invertido' : 'lateral-invertido');
        if (pos.includes('ala')) return porId(avancado ? 'ala-atacante' : 'ala');
        return porId('lateral');
    }
    if (grupoKey === 'volante') {
        if (pos.includes('zaga')) return porId('zaga');
        if (pos.includes('armacao') || pos.includes('armação')) return porId('armador-recuado');
        return porId('contencao');
    }
    if (grupoKey === 'meio_campo_central') {
        if (pos.includes('armador')) return porId('armador');
        if (pos.includes('abertura')) return porId('meia-pelas-pontas');
        return porId('box-to-box');
    }
    if (grupoKey === 'meia_atacante') {
        if (pos.includes('armador')) return porId('armador');
        if (pos.includes('abertura')) return porId('meia-pelas-pontas');
        if (pos.includes('ataque')) return porId('atacante-sombra');
        return porId('camisa-10-classico');
    }
    if (grupoKey === 'meia_lateral') {
        if (pos.includes('invertido')) return porId('corta-pra-dentro');
        if (pos.includes('armador')) return porId('armador-aberto');
        if (pos.includes('ala')) return porId('ala');
        return porId('meia-aberto');
    }
    if (grupoKey === 'ponta') {
        if (pos.includes('invertido')) return porId('corta-pra-dentro');
        if (pos.includes('armador')) return porId('armador-aberto');
        return porId('ala');
    }
    if (grupoKey === 'atacante') {
        if (pos.includes('fisico') || pos.includes('físico')) return porId('pivo');
        if (pos.includes('armador')) return porId('falso-9');
        if (pos.includes('velocidade')) return porId('oportunista');
        return porId('centroavante');
    }
    return grupo.funcoes[0];
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
