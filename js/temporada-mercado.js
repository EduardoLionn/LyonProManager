        // Abre o questionário único de fim de temporada — nada é processado até o usuário
        // preencher tudo e clicar em "Finalizar Temporada" dentro do próprio modal (em vez da
        // sequência antiga de confirm()/prompt() encadeados, um popup atrás do outro).
        // Calcula o status de fase final (Campeão/Vice/etc) de UMA partida (a última jogada
        // daquela competição na temporada), reaproveitado tanto pela prévia do formulário
        // quanto pelo processamento de verdade — pra não haver divergência entre os dois.
        function calcularStatusFaseFinal(lastGame) {
            let contexto = (lastGame.contexto || '').toLowerCase();
            let isFinal = contexto.includes('final') && !contexto.includes('quartas') && !contexto.includes('oitavas') && !contexto.includes('semi');
            let isPrimeiro = contexto.includes('1º') || contexto.includes('campeão');
            let status = lastGame.contexto || "Fase Desconhecida";
            if (isPrimeiro || (isFinal && (lastGame.golsPro > lastGame.golsContra || (lastGame.golsPro === lastGame.golsContra && lastGame.penaltis)))) {
                status = "Campeão 🏆";
            } else if (isFinal) {
                status = "Vice-Campeão 🥈";
            }
            return status;
        }

        function concluirTemporadaAutomatica() {
            document.getElementById('concluir-temp-nome').innerText = `— ${db[currentSave].temporadaAtual}`;
            document.getElementById('concluir-temp-posicao').value = '1º Lugar';
            let boxContinental = document.getElementById('concluir-temp-box-continental');
            let boxCopa = document.getElementById('concluir-temp-box-copa');
            let boxDivisao = document.getElementById('concluir-temp-box-divisao');
            if (currentSave === 'clube') {
                boxContinental.style.display = 'block';
                document.getElementById('concluir-temp-continental').value = 'Nenhuma';

                // Prévia automática da Copa Nacional — busca a ÚLTIMA partida da Copa jogada na temporada atual
                let pFiltradas = db.clube.partidas.filter(p => p.temporada === db.clube.temporadaAtual && p.comp === 'Copa Nacional');
                let previaCopa = document.getElementById('concluir-temp-copa-preview');
                if (pFiltradas.length > 0) {
                    previaCopa.innerText = calcularStatusFaseFinal(pFiltradas[pFiltradas.length - 1]);
                } else {
                    previaCopa.innerText = 'Não disputada nesta temporada';
                }
                boxCopa.style.display = 'block';

                // Situação na divisão — monta as opções conforme a divisão atual permite acesso/rebaixamento
                let selectDivisao = document.getElementById('concluir-temp-divisao');
                let ligObj = ligaMap[db.clube.liga];
                if (ligObj) {
                    let opcoes = [`<option value="">Permanece na mesma divisão</option>`];
                    if (ligObj.up) opcoes.push(`<option value="${ligObj.up}">🔼 Acesso para ${ligObj.up.split(' (')[0]}</option>`);
                    if (ligObj.down) opcoes.push(`<option value="${ligObj.down}">🔽 Rebaixado para ${ligObj.down.split(' (')[0]}</option>`);
                    selectDivisao.innerHTML = opcoes.join('');
                    boxDivisao.style.display = (ligObj.up || ligObj.down) ? 'block' : 'none';
                } else {
                    boxDivisao.style.display = 'none';
                }
            } else {
                boxContinental.style.display = 'none';
                boxCopa.style.display = 'none';
                boxDivisao.style.display = 'none';
            }
            document.getElementById('modal-concluir-temporada').style.display = 'flex';
        }

        // Lê o formulário do modal, fecha e dispara o processamento de verdade.
        function processarConclusaoTemporadaForm() {
            let posTabelaInput = document.getElementById('concluir-temp-posicao').value.trim();
            if (!posTabelaInput) { alert('Informe a posição final na tabela.'); return; }
            let novaContinental = currentSave === 'clube' ? document.getElementById('concluir-temp-continental').value : 'Nenhuma';
            if (currentSave === 'clube') db.clube.competicaoContinental = novaContinental;
            let novaDivisao = currentSave === 'clube' ? document.getElementById('concluir-temp-divisao').value : '';
            document.getElementById('modal-concluir-temporada').style.display = 'none';
            processarConclusaoTemporada(posTabelaInput, novaContinental, novaDivisao);
        }

        async function processarConclusaoTemporada(posTabelaInput, novaContinental, novaDivisao) {
            // Transferências e partidas ainda esperando o lote fechar (coletânea/resumo) não
            // podem atravessar a virada de temporada em silêncio — publica o que sobrou agora.
            if (typeof publicarColetaneaTransferencias === 'function') publicarColetaneaTransferencias();
            if (typeof publicarResumoPartidas === 'function') publicarResumoPartidas();

            let pFiltradas = db[currentSave].partidas.filter(p => p.temporada === db[currentSave].temporadaAtual);
            let comps = {}; let trofeusGanhos = []; let detalhesComp = [];
            pFiltradas.forEach(p => { comps[p.comp] = p; });

            for(let c in comps) {
                let status = calcularStatusFaseFinal(comps[c]);
                if (status === "Campeão 🏆") { trofeusGanhos.push(c); adicionarNoticiaAutomatica(`🏆 É CAMPEÃO de ${c}!`, `Toda a cidade está em festa!`); }
                detalhesComp.push({ competicao: c, fase_final: status });
            }

            let gastoTotalTemp = db[currentSave].gastoAtual || 0; let arrecadadoTotalTemp = db[currentSave].arrecadadoAtual || 0;

            // O gasto e a arrecadação ficam gravados por temporada: é essa série que a diretoria
            // usa para calcular a verba extraordinária ("X% do total gasto nas últimas 5 temporadas").
            db[currentSave].historicoTemporadas.push({ temporada: db[currentSave].temporadaAtual, posicaoTabela: posTabelaInput, detalhes: detalhesComp, trofeus: trofeusGanhos, gastoTemporada: gastoTotalTemp, arrecadadoTemporada: arrecadadoTotalTemp });

            // Mais uma temporada de casa para quem está no elenco — critério usado pelos eventos
            // da diretoria para identificar as joias formadas no clube.
            if (typeof garantirCamposElencoTodos === 'function') garantirCamposElencoTodos();
            db[currentSave].plantel.filter(p => p.status === 'Ativo').forEach(p => { p.temporadasNoClube = (p.temporadasNoClube || 0) + 1; });

            let balancoFinanceiro = arrecadadoTotalTemp - gastoTotalTemp;

            // NOVA LÓGICA DE MÉDIA (Média Antiga + Atual) / 2
            db[currentSave].mediaGastoHistorico = (db[currentSave].mediaGastoHistorico + gastoTotalTemp) / 2;
            db[currentSave].mediaArrecadadoHistorico = (db[currentSave].mediaArrecadadoHistorico + arrecadadoTotalTemp) / 2;

            // Objetivos que a Diretoria tinha dado NO INÍCIO desta temporada que está terminando agora
            let objAnt = db[currentSave].objetivosEstruturados || null;

            let blocoAvaliacao = "";
            if (objAnt) {
                blocoAvaliacao = `
            AVALIAÇÃO DA TEMPORADA QUE ACABOU DE TERMINAR (responda com base SOMENTE nos fatos reais abaixo, sem inventar):
            - Objetivo de Liga (principal) que foi dado: "${objAnt.liga1 || ''}"
            - Objetivo de Liga (secundário) que foi dado: "${objAnt.liga2 || ''}"
            - Objetivo de Copa que foi dado: "${objAnt.copa || ''}"
            - Objetivo Internacional que foi dado: "${objAnt.internacional || ''}"
            FATOS REAIS DESTA TEMPORADA:
            - Posição final na Liga: ${posTabelaInput}
            - Resultado nas competições de mata-mata: ${JSON.stringify(detalhesComp)}
            - Títulos conquistados: ${trofeusGanhos.length > 0 ? trofeusGanhos.join(', ') : 'Nenhum'}
            Avalie SOMENTE se cada objetivo foi cumprido (true) ou não (false), com base nesses fatos. Seja rigoroso e justo.`;
            }

            let promptFim = `Temporada ${db[currentSave].temporadaAtual} encerrada. Posição final na Liga: ${posTabelaInput}. Saldo financeiro do ano: €${balancoFinanceiro}M. Próxima competição continental: ${novaContinental}.
${blocoAvaliacao}
            Gere também novos objetivos para a próxima temporada. SEJA ESPECÍFICO, REALISTA E NÃO REDUNDANTE.
            REGRAS DE REALISMO E RASTREAMENTO:
            - É PROIBIDO criar metas baseadas em "Idade" ou "Minutos jogados". O sistema não mede isso. Use vitórias, gols, saldo, valores em dinheiro, OVR ou passar de fase.
            - Adapte a exigência à realidade do time: times ruins devem ter metas humildes nas copas e focar em sobrevivência.
            - objLiga1: A meta principal da liga na tabela (ex: Título, Vaga continental, Top 10, Fugir do Z4).
            - objLiga2: Uma meta estatística RASTREÁVEL E DIFERENTE DA PRIMEIRA (ex: Saldo de gols +10, Melhor defesa. NÃO REPITA A META 1).
            - objCopa e objInternacional: Adapte a exigência. NÃO REPITA OBJETIVOS.
            - objFinanceiro: Uma meta numérica baseada nas métricas do jogo (Valor Gasto e Valor Arrecadado). Ex: "Arrecadar €15M em vendas" ou "Não gastar mais que €20M". NUNCA exija "margem de lucro" ou porcentagens.
            Retorne EXATAMENTE JSON (novoOrcamento é SEMPRE em milhões de euros, nunca o valor cheio — ex: 25.0 significa €25M, NUNCA escreva 25000000):
            {
              "novoOrcamento": 25.0,
              ${objAnt ? '"cumpriuLiga1": true, "cumpriuLiga2": true, "cumpriuCopa": true, "cumpriuInternacional": true,' : ''}
              "objLiga1": "texto", 
              "objLiga2": "texto", 
              "objCopa": "texto", 
              "objInternacional": "texto", 
              "objFinanceiro": "texto" 
            }`;

            mostrarCarregandoIA('⏳ Encerrando a temporada e definindo novas metas...');
            let resumoObjetivos = [];
            try {
                const data = await chamarIA({ contents: [{ parts: [{ text: promptFim }] }] });
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                if(match) {
                    let resAI = JSON.parse(match[0]);
                    db[currentSave].orcamento = normalizarValorOrcamento(resAI.novoOrcamento) || 25;
                    registrarComandoOrcamento(db[currentSave].orcamento, "Orçamento da Nova Temporada");

                    // --- NOVO SISTEMA DE NOTA: pontos fixos por objetivo cumprido/não cumprido, nunca "reseta" ---
                    if (objAnt) {
                        let itens = [['Financeiro', balancoFinanceiro >= 0]];
                        if (objAnt.liga1) itens.push(['Liga', resAI.cumpriuLiga1 === true]);
                        if (objAnt.liga2) itens.push(['Liga (Secundário)', resAI.cumpriuLiga2 === true]);
                        if (objAnt.copa) itens.push(['Copa', resAI.cumpriuCopa === true]);
                        if (objAnt.internacional && objAnt.internacional.trim() !== '') itens.push(['Internacional', resAI.cumpriuInternacional === true]);

                        let delta = 0;
                        itens.forEach(([nome, cumpriu]) => {
                            delta += cumpriu ? 0.4 : -0.4;
                            resumoObjetivos.push(`${cumpriu ? '✅' : '❌'} ${nome}`);
                        });
                        atualizarNotaDiretoria(delta);

                        // "Objetivos Sendo Cumpridos" (pedido do treinador, substitui o antigo
                        // "Orçamento Disponível" na aba Diretoria): o valor que ficava sendo
                        // estimado ao longo da temporada (avaliarObjetivosTemporada, botão 🔄) é
                        // SOBRESCRITO agora pelo resultado definitivo e real desta avaliação —
                        // "o valor que estiver ali no fim da temporada é o valor cumprido".
                        let cumpridasReal = itens.filter(([, cumpriu]) => cumpriu).length;
                        db[currentSave].objetivosStatus = { total: itens.length, cumpridas: cumpridasReal, resumo: resumoObjetivos.join(' | ') };
                        let ultimoHist = db[currentSave].historicoTemporadas[db[currentSave].historicoTemporadas.length - 1];
                        if (ultimoHist) ultimoHist.objetivosStatus = { total: itens.length, cumpridas: cumpridasReal };
                    }

                    let txt = `⚽ Liga: ${resAI.objLiga1}<br>⚽ Liga (Secundário): ${resAI.objLiga2}<br>🏆 Copa Nacional: ${resAI.objCopa}`;
                    if(resAI.objInternacional && resAI.objInternacional.trim() !== "" && novaContinental !== 'Nenhuma') txt += `<br>🌍 Internacional (${novaContinental}): ${resAI.objInternacional}`;
                    txt += `<br>💰 Finanças: ${resAI.objFinanceiro}`;
                    db[currentSave].objetivosTemporada = txt;

                    // Guarda os pedaços "crus" (sem HTML) pra poder avaliar de verdade no fim da PRÓXIMA temporada
                    db[currentSave].objetivosEstruturados = {
                        liga1: resAI.objLiga1 || '',
                        liga2: resAI.objLiga2 || '',
                        copa: resAI.objCopa || '',
                        internacional: (resAI.objInternacional && novaContinental !== 'Nenhuma') ? resAI.objInternacional : ''
                    };
                }
            } catch(e) { db[currentSave].orcamento = 25; registrarComandoOrcamento(25, "Orçamento da Nova Temporada"); }
            esconderCarregandoIA();

            // Verba que a diretoria adiantou no meio da temporada passada é descontada agora
            if (db[currentSave].verbaAntecipada > 0) {
                let descontada = db[currentSave].verbaAntecipada;
                db[currentSave].orcamento = Math.max(0, db[currentSave].orcamento - descontada);
                db[currentSave].verbaAntecipada = 0;
                registrarComandoOrcamento(db[currentSave].orcamento, `Desconto da verba antecipada (€${descontada.toFixed(2)}M)`);
                resumoObjetivos.push(`💳 Verba antecipada descontada: -€${descontada.toFixed(2)}M`);
            }

            db[currentSave].gastoAtual = 0; db[currentSave].arrecadadoAtual = 0;
            db[currentSave].negociacoesDiretoria = 0; // Reseta o limite de negociações da diretoria

            if(currentSave === 'clube') {
                let ano = parseInt(db.clube.temporadaAtual.split('/')[0]); db.clube.temporadaAtual = `${ano+1}/${ano+2}`; 
                
                db.clube.plantel.forEach(p => {
                    if (typeof p.idade === 'number') p.idade++; // +1 ano de idade a cada temporada que passa

                    // Preparo Físico não atravessa a virada de temporada — todo jogador volta
                    // "despreparado" (30%) na pré-temporada, mesmo quem terminou "incansável".
                    p.preparoFisico = (typeof PREPARO_FISICO_CFG !== 'undefined') ? PREPARO_FISICO_CFG.INICIAL_TEMPORADA : 30;

                    // Estado de temporada não atravessa a virada: descanso concedido, risco extra
                    // de lesão, promessa de minutos e pedido de saída valiam para a temporada que acabou.
                    p.poupadoRestante = 0;
                    p.riscoExtraLesao = 0;
                    p.promessaMinutos = null;
                    p.pediuSaida = false;

                    if (p.status === 'Emprestado' && p.temporadasEmprestimo > 0) {
                        p.temporadasEmprestimo--;
                        if (p.temporadasEmprestimo <= 0) {
                            p.status = 'Ativo';
                            adicionarNoticiaAutomatica(`✈️ DE VOLTA: ${p.nome} retorna de empréstimo.`, `O jogador está de volta ao elenco principal após o período cedido e já pode ser escalado.`);
                        }
                    }
                    else if (p.status === 'Ativo' && p.origem === 'EmprestadoIn') {
                        // O empréstimo de ENTRADA também tem duração contratada. Antes o atleta ia
                        // embora sempre no fim da primeira temporada, mesmo com contrato de 2.
                        p.temporadasEmprestimo = Math.max(0, (Number(p.temporadasEmprestimo) || 1) - 1);
                        if (p.temporadasEmprestimo <= 0) {
                            p.status = 'FimEmprestimo';
                            adicionarNoticiaAutomatica(`👋 ADEUS (POR ENQUANTO): Fim de empréstimo de ${p.nome}.`, `O contrato de empréstimo encerrou e o jogador deixou o elenco ativo. Caso seja contratado futuramente, seu histórico retornará intacto.`);
                        } else {
                            adicionarNoticiaAutomatica(`🤝 SEGUE CONOSCO: ${p.nome} tem mais ${p.temporadasEmprestimo} temporada(s) de empréstimo.`, `O contrato de cessão do atleta ainda não acabou e ele continua à disposição da comissão técnica.`);
                        }
                    }
                });

                // Quem deixou de estar ativo na virada não pode continuar com a braçadeira
                ['capitao', 'viceCapitao'].forEach(cargo => {
                    let lider = db.clube.plantel.find(p => p.nome === db.clube[cargo]);
                    if (db.clube[cargo] && (!lider || lider.status !== 'Ativo')) db.clube[cargo] = '';
                });

                if (novaDivisao) {
                    let nomeAntiga = db.clube.liga.split(' (')[0];
                    db.clube.liga = novaDivisao;
                    adicionarNoticiaAutomatica(`🔄 MUDANÇA DE DIVISÃO: sai de ${nomeAntiga} para ${novaDivisao.split(' (')[0]}.`, `A diretoria já foi avisada e a expectativa para a próxima temporada muda de patamar.`);
                }
            } else {
                let anoAtual = parseInt(db.selecao.temporadaAtual.replace(/\D/g, '')); db.selecao.temporadaAtual = `Ciclo ${anoAtual + 4}`;
            }

            let msgFinal = "Temporada concluída!";
            if (resumoObjetivos.length > 0) {
                msgFinal += `\n\n📋 Avaliação da Diretoria:\n${resumoObjetivos.join('\n')}\n\nNota atual: ${Math.round(db[currentSave].notaDiretoria)}/100`;
            }
            msgFinal += "\n\n📥 Aproveite e baixe um backup do seu save (botão na barra lateral) — é rápido e evita perder seu progresso.";

            salvarDados(); alert(msgFinal); atualizarFiltroTemporadas(); ajustarInterfaceSave(); mudarAba('tab-diretoria');
        }

        function cadastrarJogadorBase() {
            if(currentSave !== 'clube') return;
            let nome = document.getElementById('cad-nome').value.trim(); if(!nome) return;
            let idadeVal = document.getElementById('cad-idade').value;
            let novoJog = { nome: nome, posicao: document.getElementById('cad-pos').value, ovr: Number(document.getElementById('cad-ovr').value), status: 'Ativo', jogosAvaliacao: 0 };
            if (idadeVal) novoJog.idade = Number(idadeVal);
            if (typeof garantirCamposElenco === 'function') garantirCamposElenco(novoJog);
            db.clube.plantel.push(novoJog);
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); document.getElementById('cad-nome').value = ''; document.getElementById('cad-idade').value = '';
            if (typeof renderizarLiderancaUI === 'function') renderizarLiderancaUI();
            if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Cadastro de ${nome} no elenco`);
        }

// --- NOVO GERADOR DINÂMICO DE NOTÍCIAS DE MERCADO ---
        function gerarNoticiaTransferencia(tipo, nome, valor, extra) {
    let titulos = []; let detalhes = [];
    
    if (tipo === 'Comprado') {
        titulos = [
            `🚨 HERE WE GO! ${nome} é o novo reforço do clube!`,
            `💥 BOMBA NO MERCADO! Diretoria abre os cofres por ${nome}.`,
            `✈️ AEROPORTO LOTADO! Torcida faz a festa com a chegada de ${nome}.`,
            `✍️ TINTA NO PAPEL! ${nome} assina contrato milionário.`
        ];
        detalhes = [
            `A diretoria não poupou esforços e desembolsou pesados €${valor}M. A expectativa é que o jogador chegue com status de titular absoluto e mude o patamar da equipe!`,
            `Após semanas de negociações exaustivas e muita fumaça na imprensa, o martelo foi batido por €${valor}M. O atleta já veste a camisa e manda recado para a torcida!`,
            `Uma cartada de mestre da nossa comissão! Por €${valor}M, garantimos um talento que era cobiçado por rivais diretos. O departamento médico já aprovou os exames.`
        ];
    } else if (tipo === 'EmprestadoIn') {
        titulos = [
            `🤝 REFORÇO CIRÚRGICO! ${nome} chega por empréstimo.`,
            `👀 OPORTUNIDADE DE MERCADO: ${nome} é anunciado!`,
            `📝 NOVO GUERREIRO: ${nome} assina acordo temporário.`
        ];
        detalhes = [
            `O atleta assinou um vínculo válido por ${extra} temporada(s). O treinador pediu e a diretoria entregou uma peça fundamental para a rotação do elenco sem comprometer o orçamento.`,
            `Buscando oxigenar o vestiário, o clube fechou o empréstimo por ${extra} temporada(s). Ele promete dar o sangue em campo para provar seu valor e quem sabe ficar em definitivo.`,
            `Um negócio bom e barato. O empréstimo de ${extra} temporada(s) blinda o time contra lesões e aumenta a competitividade interna nos treinamentos.`
        ];
    } else if (tipo === 'Venda') {
        titulos = [
            `💰 COFRES CHEIOS! Venda de ${nome} é concretizada.`,
            `👋 FIM DE UMA ERA! ${nome} se despede rumo a um novo desafio.`,
            `📉 REFORMULAÇÃO: Diretoria aceita proposta milionária por ${nome}.`
        ];
        detalhes = [
            `É oficial. A transferência injeta €${valor}M aos cofres do clube. A diretoria considerou a oferta "irrecusável" e agora busca repor a ausência no mercado.`,
            `O jogador esvaziou seu armário hoje cedo. Pela quantia de €${valor}M, o negócio foi bom para todas as partes. Ficam as boas memórias e o legado construído!`,
            `Os números falaram mais alto. A venda por €${valor}M alivia as finanças e dá fôlego para novas contratações. Boa sorte ao atleta no seu próximo clube!`
        ];
    } else if (tipo === 'Emprestimo') {
        titulos = [
            `✈️ PARA GANHAR MINUTOS: ${nome} é emprestado.`,
            `🔄 ROTAÇÃO: Sem espaço, ${nome} defenderá outra equipe.`,
            `🎒 DE MALAS PRONTAS: ${nome} sai por empréstimo.`
        ];
        detalhes = [
            `A decisão da comissão técnica foi clara: o jogador precisa jogar. O empréstimo de ${extra} temporada(s) servirá para ele ganhar ritmo, confiança e voltar mais forte.`,
            `Fora dos planos imediatos do esquema tático atual, o atleta passará ${extra} temporada(s) ganhando experiência fora. O clube continuará monitorando seu desenvolvimento de perto.`,
            `Uma pausa temporária na relação. Com o acordo de ${extra} temporada(s), a diretoria alivia a folha salarial e o atleta busca protagonismo em novos ares.`
        ];
    } else if (tipo === 'Dispensa') {
        titulos = [
            `📄 RESCISÃO OFICIAL: ${nome} está livre no mercado.`,
            `🚪 BARCA SAINDO: Fim da linha para ${nome} no clube.`,
            `✂️ CORTE NO ELENCO: Contrato de ${nome} é encerrado.`
        ];
        detalhes = [
            `Após uma reunião a portas fechadas, o vínculo foi rompido amigavelmente. O jogador não fazia mais parte do planejamento e agora está livre para assinar com qualquer equipe a custo zero.`,
            `A temida "barca" começou a passar. A diretoria optou por liberar o atleta, cortando gastos e abrindo espaço na folha salarial para uma reformulação pesada.`,
            `Não rendeu o esperado. O clube decidiu encerrar o contrato antecipadamente. Desejamos sorte ao profissional nos seus próximos passos, longe daqui.`
        ];
    } else if (tipo === 'Aposentadoria') {
        titulos = [
            `🥾 PENDUROU AS CHUTEIRAS! O adeus doloroso de ${nome}.`,
            `😢 FIM DA LINHA! Lenda ${nome} anuncia sua aposentadoria dos gramados.`,
            `👑 O FUTEBOL FICA MAIS TRISTE: ${nome} decide parar de jogar.`
        ];
        detalhes = [
            `Emocionado, o jogador comunicou ao vestiário que o corpo não aguenta mais. É o fim de uma trajetória linda no esporte. A diretoria planeja um jogo de despedida em breve!`,
            `Um dia que todo torcedor teme chegou. O atleta decidiu encerrar sua carreira profissional. Seu nome ficará para sempre marcado na história e nas arquibancadas. OBRIGADO, CRAQUE!`,
            `Fim de jogo. Após anos dedicando sua vida à bola, o desgaste falou mais alto. O clube deixou as portas abertas para ele integrar a comissão técnica no futuro.`
        ];
    }

    let tIdx = Math.floor(Math.random() * titulos.length);
    let dIdx = Math.floor(Math.random() * detalhes.length);
    return { titulo: titulos[tIdx], detalhe: detalhes[dIdx] };
}

        function toggleFormCompra() {
            let tipo = document.getElementById('add-tipo').value;
            document.getElementById('box-add-custo').style.display = tipo === 'Comprado' ? 'flex' : 'none';
            document.getElementById('box-add-duracao').style.display = tipo === 'EmprestadoIn' ? 'flex' : 'none';
        }

        function adicionarAoPlantel() {
            if(currentSave !== 'clube') return;
            let tipoTransicao = document.getElementById('add-tipo') ? document.getElementById('add-tipo').value : 'Comprado';
            let nomeNovo = document.getElementById('add-nome').value.trim();
            let custo = tipoTransicao === 'Comprado' ? (Number(document.getElementById('add-custo').value) || 0) : 0;
            let duracao = tipoTransicao === 'EmprestadoIn' ? Number(document.getElementById('add-duracao').value) : 0;
            
            if(!nomeNovo) return alert("Digite o nome do jogador!");
            // Orçamento não é mais um teto real (pedido do treinador): o time persegue as METAS
            // da temporada, não um saldo em caixa. "Saldo em Caixa" continua sendo debitado só
            // como registro histórico do que foi investido — nunca bloqueia uma contratação.

            if(tipoTransicao === 'Comprado') {
                db.clube.orcamento -= custo; db.clube.gastoAtual += custo; atualizarNotaDiretoria(-0.1);
                // Torcida animada com reforço — contratações de destaque (OVR alto) empolgam bem
                // mais que reforços medianos.
                let ovrContratado = Number(document.getElementById('add-ovr').value) || 70;
                let impactoTorcidaCompra = gerarNumeroAleatorio(2, 5) + (ovrContratado >= 82 ? gerarNumeroAleatorio(3, 6) : 0);
                atualizarTermometroTorcida(impactoTorcidaCompra);
            }
            
            let jogadorExistente = db.clube.plantel.find(p => p.nome.toLowerCase() === nomeNovo.toLowerCase());
            let idadeVal = document.getElementById('add-idade').value;

            if (jogadorExistente) {
                jogadorExistente.status = 'Ativo';
                jogadorExistente.origem = tipoTransicao;
                jogadorExistente.ovr = Number(document.getElementById('add-ovr').value);
                jogadorExistente.posicao = document.getElementById('add-pos').value;
                jogadorExistente.valor = custo;
                if (idadeVal) jogadorExistente.idade = Number(idadeVal);
                if (tipoTransicao === 'EmprestadoIn') jogadorExistente.temporadasEmprestimo = duracao;
            } else {
                let novoJog = {
                    nome: nomeNovo, posicao: document.getElementById('add-pos').value,
                    ovr: Number(document.getElementById('add-ovr').value), status: 'Ativo',
                    origem: tipoTransicao, valor: custo, jogosAvaliacao: 0
                };
                if (idadeVal) novoJog.idade = Number(idadeVal);
                if (tipoTransicao === 'EmprestadoIn') novoJog.temporadasEmprestimo = duracao;
                if (typeof garantirCamposElenco === 'function') garantirCamposElenco(novoJog);
                db.clube.plantel.push(novoJog);
            }

            if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Chegada de ${nomeNovo} (${tipoTransicao})`);
            if (typeof renderizarLiderancaUI === 'function') renderizarLiderancaUI();
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores();
            alert(tipoTransicao === 'EmprestadoIn' ? "Jogador adicionado por empréstimo!" : "Contratação realizada!");
            checarEmbargoMercado();

            // Chama o gerador dinâmico de notícias
            let noticiaDin = gerarNoticiaTransferencia(tipoTransicao, nomeNovo, custo, duracao);
            registrarNoticiaTransferenciaFeed(tipoTransicao, nomeNovo, noticiaDin);
            
            document.getElementById('add-nome').value = '';
            document.getElementById('add-idade').value = '';
        }

        async function editarValorTransferencia(nome) {
            let p = db.clube.plantel.find(j => j.nome === nome);
            if (!p) return;
            let novoValor = await promptModerno(`Digite o valor correto (€M) da negociação de ${nome}:`, p.valor || 0, "Editar Valor");
            if (novoValor !== null && novoValor.trim() !== "") {
                p.valor = Number(novoValor);
                salvarDados();
                filtrarMercado(statusFiltroMercado);
            }
        }

        async function excluirJogadorTransferencia(nome) {
            if (await confirmarModerno(`⚠️ ALERTA: Tem certeza que deseja APAGAR COMPLETAMENTE o jogador ${nome} do save? Isso removerá o histórico dele.`, "Apagar Jogador Permanentemente", { perigo: true, textoConfirmar: "Apagar" })) {
                db.clube.plantel = db.clube.plantel.filter(p => p.nome !== nome);
                salvarDados();
                filtrarMercado(statusFiltroMercado);
                atualizarPlantelUI();
                preencherDatalistJogadores();
            }
        }

        function toggleFormSaida() {
            let tipo = document.getElementById('saida-tipo').value;
            document.getElementById('box-saida-valor').style.display = tipo === 'Venda' ? 'flex' : 'none';
            document.getElementById('box-saida-duracao').style.display = tipo === 'Emprestimo' ? 'flex' : 'none';
        }

        function processarSaida() {
            if(currentSave !== 'clube') return;
            let nome = document.getElementById('saida-nome-input').value.trim();
            let tipo = document.getElementById('saida-tipo').value;
            let jogador = db.clube.plantel.find(p => p.nome === nome && p.status === 'Ativo');
            if(!jogador) return alert("Jogador não encontrado ativo.");

            // NOVA TRAVA: Impede negociar quem está emprestado ao time
            if (jogadorPertenceAOutroClube(jogador) && (tipo === 'Venda' || tipo === 'Emprestimo' || tipo === 'Dispensa')) {
                return alert("⚠️ Você não pode vender, emprestar ou dispensar um jogador que pertence a outro clube! Vá na aba 'Elenco' se quiser encerrar o empréstimo dele.");
            }

            if(tipo === 'Venda') {
                let valor = Number(document.getElementById('saida-valor').value);
                db.clube.arrecadadoAtual += valor;
                jogador.status = 'Vendido'; 
                jogador.valor = valor; 
                atualizarNotaDiretoria(0.1);
                db.clube.exigenciasDiretoria = db.clube.exigenciasDiretoria.filter(n => n !== nome);
                
                // Torcida não gosta de perder jogador ativo — perder um titular importante (OVR
                // alto) pesa bem mais que vender um reserva.
                let impactoVenda = gerarNumeroAleatorio(2, 6) + (jogador.ovr >= 78 ? gerarNumeroAleatorio(4, 8) : 0);
                atualizarTermometroTorcida(-impactoVenda);

                let noticia = gerarNoticiaTransferencia('Venda', nome, valor, 0);
                registrarNoticiaTransferenciaFeed('Venda', nome, noticia);
            }
            else if(tipo === 'Emprestimo') {
                jogador.status = 'Emprestado';
                jogador.temporadasEmprestimo = Number(document.getElementById('saida-duracao').value);

                let noticia = gerarNoticiaTransferencia('Emprestimo', nome, 0, jogador.temporadasEmprestimo);
                registrarNoticiaTransferenciaFeed('Emprestimo', nome, noticia);
            }
            else if(tipo === 'Dispensa') {
                jogador.status = 'Aposentado';
                jogador.motivoSaida = 'Dispensa';

                let noticia = gerarNoticiaTransferencia('Dispensa', nome, 0, 0);
                registrarNoticiaTransferenciaFeed('Dispensa', nome, noticia);
            }

            // Quem sai perde a braçadeira automaticamente
            if (db.clube.capitao === nome) db.clube.capitao = '';
            if (db.clube.viceCapitao === nome) db.clube.viceCapitao = '';

            document.getElementById('saida-nome-input').value = ''; document.getElementById('saida-valor').value = '0';
            if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Saída de ${nome} (${tipo})`);
            if (typeof renderizarLiderancaUI === 'function') renderizarLiderancaUI();
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); filtrarMercado(statusFiltroMercado);
            checarEmbargoMercado();
        }

        function checarEmbargoMercado() {
            if(currentSave !== 'clube') return;
            let btn = document.getElementById('btn-confirmar-compra');
            if(!btn) return;
            // O embargo por orçamento negativo saiu junto com o teto de gastos (pedido do
            // treinador) — só a reprovação da diretoria (nota baixa) ainda trava o mercado.
            if(db.clube.notaDiretoria < 50) {
                btn.disabled = true;
                btn.innerText = "BLOQUEADO PELA DIRETORIA (Embargo)";
                btn.style.background = "var(--text-muted)";
            } else {
                btn.disabled = false;
                btn.innerText = "Confirmar Compra";
                btn.style.background = "var(--accent)";
            }
        }

        async function alterarStatus(nome, status) {
    if (status === 'Excluir') {
        if (await confirmarModerno(`Apagar ${nome}?`, "Remover Jogador", { perigo: true, textoConfirmar: "Apagar" })) {
            db[currentSave].plantel = db[currentSave].plantel.filter(p => p.nome !== nome);
        } else {
            return;
        }
    } else {
        let jog = db[currentSave].plantel.find(p => p.nome === nome);
        if(jog) {
            // Mesma trava de processarSaida(): quem está aqui emprestado pertence a outro
            // clube e só pode ser devolvido. Sem isso, qualquer caminho que chame esta função
            // com um status de saída negociaria um jogador que não é nosso.
            if (jogadorPertenceAOutroClube(jog) && (status === 'Vendido' || status === 'Emprestado' || status === 'Aposentado')) {
                alert(`⚠️ ${nome} está no clube por empréstimo e pertence a outro time. Você só pode encerrar o empréstimo e devolvê-lo.`);
                if (typeof atualizarPlantelUI === 'function') atualizarPlantelUI();
                return;
            }
            if(status === 'Vendido' || status === 'Emprestado') {
                let v = await promptModerno(`Valor recebido em €M?`, "0", "Valor da Negociação");
                if (v === null) return;
                db.clube.orcamento += Number(v) * 0.8; db.clube.arrecadadoAtual += Number(v);
                jog.status = status; 
            } else if (status === 'EncerrarEmprestimo') {
                if(await confirmarModerno(`Deseja devolver ${nome} antecipadamente ao clube de origem?`, "Encerrar Empréstimo")) {
                    jog.status = 'FimEmprestimo';
                    adicionarNoticiaAutomatica(`👋 FIM DE EMPRÉSTIMO: ${nome} devolvido.`, `O clube optou por encerrar o empréstimo antecipadamente e o atleta não faz mais parte do elenco.`);
                } else {
                    return; // Cancela a ação
                }
            } else if (status === 'ChamarDeVolta') {
                if(await confirmarModerno(`Deseja solicitar o retorno imediato de ${nome} do seu empréstimo?`, "Chamar de Volta")) {
                    jog.status = 'Ativo';
                    jog.temporadasEmprestimo = 0;
                    adicionarNoticiaAutomatica(`✈️ DE VOLTA: ${nome} retorna ao clube.`, `O treinador solicitou a volta do jogador antes do fim do empréstimo para compor o elenco atual.`);
                } else {
                    return; // Cancela a ação
                }
            } else {
                jog.status = status;
                if (status === 'Aposentado') {
                    jog.motivoSaida = 'Aposentadoria';
                    let noticia = gerarNoticiaTransferencia('Aposentadoria', nome, 0, 0);
                    registrarNoticiaTransferenciaFeed('Aposentadoria', nome, noticia);
                }
            }
        }
    }
    // Braçadeira não acompanha quem deixa de estar ativo no elenco
    if (db[currentSave].capitao === nome && status !== 'ChamarDeVolta') db[currentSave].capitao = '';
    if (db[currentSave].viceCapitao === nome && status !== 'ChamarDeVolta') db[currentSave].viceCapitao = '';
    if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Alteração de status de ${nome} (${status})`);
    if (typeof renderizarLiderancaUI === 'function') renderizarLiderancaUI();
    salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); filtrarMercado(statusFiltroMercado);
}

        function abrirModalEditarJogador(nomeOriginal) {
            let jog = db[currentSave].plantel.find(p => p.nome === nomeOriginal);
            if(jog) {
                document.getElementById('edit-jog-nome-original').value = jog.nome; document.getElementById('edit-jog-nome').value = jog.nome;
                document.getElementById('edit-jog-pos').value = jog.posicao; document.getElementById('edit-jog-ovr').value = jog.ovr;
                document.getElementById('edit-jog-idade').value = jog.idade || '';
                document.getElementById('modal-editar-jogador').style.display = 'flex';
            }
        }

        function salvarEdicaoJogador() {
            let nomeOriginal = document.getElementById('edit-jog-nome-original').value;
            let novoNome = document.getElementById('edit-jog-nome').value.trim();
            if(!novoNome) return;
            let jog = db[currentSave].plantel.find(p => p.nome === nomeOriginal);
            if(jog) {
                if(nomeOriginal !== novoNome) {
                    db[currentSave].partidas.forEach(partida => { let jogPartida = partida.jogadores.find(j => j.nome === nomeOriginal); if(jogPartida) jogPartida.nome = novoNome; });
                }
                jog.nome = novoNome; jog.posicao = document.getElementById('edit-jog-pos').value; jog.ovr = Number(document.getElementById('edit-jog-ovr').value);
                let idadeVal = document.getElementById('edit-jog-idade').value;
                if (idadeVal) jog.idade = Number(idadeVal); else delete jog.idade;
                salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); document.getElementById('modal-editar-jogador').style.display = 'none';

                if (typeof wizardRenderElenco === 'function' && document.getElementById('wizard-step-elenco') && document.getElementById('wizard-step-elenco').style.display !== 'none') {
                    wizardRenderElenco();
                }
            }
        }

        // =====================================================================================
        // IMPORTAR TRANSFERÊNCIAS POR PRINT — a IA lê o print do Histórico de Transferências do
        // jogo e monta uma lista editável. Nada entra no elenco até o usuário clicar em
        // "Processar Transferências" na lista revisada.
        // =====================================================================================

        let imagensHistoricoTransferencias = []; // [{ base64, mimeType, nomeArquivo }]
        let transferenciasExtraidas = []; // [{ incluir, nome, tipo, posicao, ovr, idade, valor, duracaoEmprestimo, clubeContrario }]

        // A tela de Histórico de Transferências do jogo mostra o nome completo em CAIXA ALTA
        // (ex: "LUCAS CHAVES"), mas o resto do LyonPro Manager usa o padrão "Inicial. Sobrenome"
        // (ex: "L. Chaves") em todo o elenco — sem essa conversão, um jogador que já está
        // cadastrado como "M. Nunes" nunca batia com o "MATHEUS NUNES" extraído do print.
        function normalizarNomeJogadorPrint(nomeCru) {
            let nome = String(nomeCru || '').trim().replace(/\s+/g, ' ');
            if (!nome) return nome;
            let capitalizar = p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
            let partes = nome.split(' ');
            if (partes.length === 1) return capitalizar(partes[0]);
            let inicial = partes[0].charAt(0).toUpperCase();
            let sobrenome = partes.slice(1).map(capitalizar).join(' ');
            return `${inicial}. ${sobrenome}`;
        }

        // Acha o jogador que já está no elenco correspondente ao nome extraído de um print —
        // essencial pra uma SAÍDA (venda/empréstimo): puxa o jogador de verdade (nome, posição,
        // OVR, idade) em vez de confiar no nome cru do print, que nunca bate exatamente com o
        // que já está cadastrado. Tenta o nome já normalizado primeiro e, se não bater, cai pra
        // comparar só o sobrenome (mais tolerante a diferenças de abreviação/grafia) — só usa
        // esse resultado se for único, pra não confundir dois jogadores com o mesmo sobrenome.
        function encontrarJogadorElencoPorNomePrint(nomeCru) {
            let normalizado = normalizarNomeJogadorPrint(nomeCru);
            let porNomeExato = db.clube.plantel.find(p => p.nome.toLowerCase() === normalizado.toLowerCase());
            if (porNomeExato) return porNomeExato;

            let partesCru = String(nomeCru || '').trim().split(/\s+/);
            let sobrenomeCru = (partesCru[partesCru.length - 1] || '').toLowerCase();
            if (!sobrenomeCru) return null;
            let porSobrenome = db.clube.plantel.filter(p => {
                let partesElenco = p.nome.trim().split(/\s+/);
                return (partesElenco[partesElenco.length - 1] || '').toLowerCase() === sobrenomeCru;
            });
            return porSobrenome.length === 1 ? porSobrenome[0] : null;
        }

        const OPCOES_TIPO_TRANSFERENCIA = [
            { v: 'Comprado', l: '📥 Compra' },
            { v: 'EmprestadoIn', l: '📥 Empréstimo (Chegando)' },
            { v: 'Venda', l: '📤 Venda' },
            { v: 'Emprestimo', l: '📤 Empréstimo (Saindo)' },
            { v: 'Dispensa', l: '📤 Dispensa' }
        ];

        function toggleControlesManuaisMercado() {
            let painel = document.getElementById('painel-controles-manuais-mercado');
            let btn = document.getElementById('btn-toggle-controles-mercado');
            if (!painel || !btn) return;
            if (painel.style.display === 'none') {
                painel.style.display = 'grid';
                btn.innerHTML = '👁️ Ocultar Controles Manuais';
            } else {
                painel.style.display = 'none';
                btn.innerHTML = '✏️ Mostrar Controles Manuais';
            }
        }

        function anexarImagensHistoricoTransferencias(event) {
            let files = Array.from(event.target.files || []);
            if (!files.length) return;
            files.forEach(file => {
                let reader = new FileReader();
                reader.onload = () => {
                    imagensHistoricoTransferencias.push({ base64: reader.result.split(',')[1], mimeType: file.type, nomeArquivo: file.name });
                    renderizarPreviewImagensHistoricoTransferencias();
                };
                reader.readAsDataURL(file);
            });
            event.target.value = '';
        }

        function removerImagemHistoricoTransferencias(idx) {
            imagensHistoricoTransferencias.splice(idx, 1);
            renderizarPreviewImagensHistoricoTransferencias();
        }

        function renderizarPreviewImagensHistoricoTransferencias() {
            let preview = document.getElementById('preview-imagens-transferencias');
            let btnAnalisar = document.getElementById('btn-analisar-prints-transferencias');
            if (!preview) return;
            if (imagensHistoricoTransferencias.length === 0) {
                preview.style.display = 'none';
                preview.innerHTML = '';
            } else {
                preview.style.display = 'flex';
                preview.innerHTML = imagensHistoricoTransferencias.map((img, idx) =>
                    `<span class="chip-imagem-anexada">📎 ${limparTextoUsuario(img.nomeArquivo, 60)} <button onclick="removerImagemHistoricoTransferencias(${idx})">✖</button></span>`
                ).join('');
            }
            if (btnAnalisar) btnAnalisar.disabled = imagensHistoricoTransferencias.length === 0;
        }

        async function analisarPrintsTransferencias() {
            if (currentSave !== 'clube') return;
            if (imagensHistoricoTransferencias.length === 0) return;

            let nomesElenco = db.clube.plantel.filter(p => p.status === 'Ativo').map(p => p.nome).join(', ') || 'nenhum jogador cadastrado ainda';

            let promptImport = `Você está vendo ${imagensHistoricoTransferencias.length} print(s) da tela de HISTÓRICO DE TRANSFERÊNCIAS de um jogo de futebol (estilo EA FC Manager/Football Manager). A tabela tem colunas como Data, Nome do jogador, De (clube de origem), Para (clube de destino) e Detalhes (valor em € ou "Loan"/Empréstimo).

MEU CLUBE (o clube do usuário que preenche este save) é: "${db.clube.nome || 'não informado'}" — mas o nome exibido dentro do jogo pode ser um apelido, sigla ou nome ligeiramente diferente do que está aqui. Se não bater exatamente, use o clube que aparece repetido com mais frequência entre "De"/"Para" em todas as linhas como sendo o meu.
Jogadores já ativos no meu elenco atualmente (ajuda a confirmar o lado "meu clube" de cada linha): ${nomesElenco}.

Para CADA linha da tabela em CADA print, extraia:
- "jogador": nome do jogador (como está escrito no print)
- "direcao": "entrada" se o jogador está indo PARA o meu clube, "saida" se está saindo DO meu clube
- "tipoContrato": "emprestimo" se aparece "Loan"/Empréstimo nos detalhes, senão "definitiva"
- "valorM": o valor da negociação em MILHÕES de euros (número, ex: 43.7). Se for empréstimo ou não houver valor visível, use 0.
- "clubeContrario": nome/sigla do outro clube envolvido na linha (o que não é o meu)

IMPORTANTE — NUNCA DESCARTE UMA LINHA POR DÚVIDA: extraia TODAS as linhas visíveis em TODOS os prints, mesmo que não tenha certeza absoluta de qual lado é o seu clube — o usuário revê e edita cada linha manualmente depois, então uma linha incluída com o palpite errado é fácil de corrigir, mas uma linha descartada silenciosamente vira uma transferência que nunca aparece pra ele revisar. Se realmente não conseguir decidir a direção, faça o melhor palpite (não deixe de incluir a linha por causa disso). NÃO invente jogadores que não estejam nos prints.

Retorne EXATAMENTE este JSON puro, sem nenhum texto antes ou depois:
{ "transferencias": [ { "jogador": "Nome", "direcao": "entrada", "tipoContrato": "definitiva", "valorM": 43.7, "clubeContrario": "Brighton" } ] }`;

            let parts = [{ text: promptImport }];
            imagensHistoricoTransferencias.forEach(img => parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));

            mostrarCarregandoIA('⏳ Lendo o histórico de transferências dos prints...');
            try {
                const data = await chamarIA({ contents: [{ parts: parts }] });
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                if (!match) throw new Error('Resposta da IA sem JSON.');
                let res = JSON.parse(match[0]);
                let lista = Array.isArray(res.transferencias) ? res.transferencias : [];

                if (lista.length === 0) {
                    esconderCarregandoIA();
                    return alert('Não consegui identificar nenhuma linha de transferência nos prints enviados. Confira se o print mostra mesmo a tabela do Histórico de Transferências (com as colunas De/Para) e tente de novo — prints mais nítidos e mais próximos da tabela ajudam bastante.');
                }

                transferenciasExtraidas = lista.map(t => {
                    let nomeCru = limparTextoUsuario(String(t.jogador || ''), 80);
                    let direcao = t.direcao === 'saida' ? 'saida' : 'entrada';
                    let tipoContrato = t.tipoContrato === 'emprestimo' ? 'emprestimo' : 'definitiva';
                    let tipo = direcao === 'entrada'
                        ? (tipoContrato === 'emprestimo' ? 'EmprestadoIn' : 'Comprado')
                        : (tipoContrato === 'emprestimo' ? 'Emprestimo' : 'Venda');
                    // Já está no elenco (o caso normal de uma SAÍDA) -> usa o jogador de verdade.
                    // Reforço novo (ENTRADA) sem match -> só normaliza o nome pro padrão do jogo.
                    let existente = encontrarJogadorElencoPorNomePrint(nomeCru);
                    let nome = existente ? existente.nome : normalizarNomeJogadorPrint(nomeCru);
                    return {
                        incluir: true,
                        nome: nome,
                        tipo: tipo,
                        posicao: existente ? existente.posicao : 'MeioCampo/Dinâmico',
                        ovr: existente ? existente.ovr : 70,
                        idade: (existente && existente.idade) ? existente.idade : '',
                        valor: numeroSeguro(t.valorM, 0),
                        duracaoEmprestimo: 1,
                        clubeContrario: limparTextoUsuario(String(t.clubeContrario || ''), 60)
                    };
                });
                renderizarListaTransferenciasExtraidas();
            } catch (e) {
                alert('Não foi possível analisar os prints: ' + e.message);
            }
            esconderCarregandoIA();
        }

        function renderizarListaTransferenciasExtraidas() {
            let box = document.getElementById('box-lista-transferencias-extraidas');
            let corpo = document.getElementById('tabela-transferencias-extraidas-body');
            if (!box || !corpo) return;
            if (transferenciasExtraidas.length === 0) {
                box.style.display = 'none';
                corpo.innerHTML = '';
                return;
            }
            box.style.display = 'block';

            corpo.innerHTML = transferenciasExtraidas.map((t, idx) => `
                <tr>
                    <td><input type="checkbox" ${t.incluir ? 'checked' : ''} onchange="atualizarCampoTransferenciaExtraida(${idx}, 'incluir', this.checked)"></td>
                    <td>
                        <input type="text" value="${t.nome.replace(/"/g, '&quot;')}" style="width:130px;" onchange="atualizarCampoTransferenciaExtraida(${idx}, 'nome', this.value)">
                        ${t.clubeContrario ? `<div style="font-size:10px; color:var(--text-muted);">vs ${t.clubeContrario.replace(/</g, '&lt;')}</div>` : ''}
                    </td>
                    <td>
                        <select onchange="atualizarCampoTransferenciaExtraida(${idx}, 'tipo', this.value)">
                            ${OPCOES_TIPO_TRANSFERENCIA.map(o => `<option value="${o.v}" ${t.tipo === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <select onchange="atualizarCampoTransferenciaExtraida(${idx}, 'posicao', this.value)">
                            ${Object.keys(ordemPosicoes).map(p => `<option value="${p}" ${t.posicao === p ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" value="${t.ovr}" style="width:55px;" onchange="atualizarCampoTransferenciaExtraida(${idx}, 'ovr', this.value)"></td>
                    <td><input type="number" value="${t.idade}" style="width:55px;" onchange="atualizarCampoTransferenciaExtraida(${idx}, 'idade', this.value)"></td>
                    <td><input type="number" value="${t.valor}" style="width:70px;" onchange="atualizarCampoTransferenciaExtraida(${idx}, 'valor', this.value)"></td>
                    <td>
                        ${(t.tipo === 'EmprestadoIn' || t.tipo === 'Emprestimo') ? `
                        <select onchange="atualizarCampoTransferenciaExtraida(${idx}, 'duracaoEmprestimo', this.value)">
                            <option value="1" ${Number(t.duracaoEmprestimo) === 1 ? 'selected' : ''}>1 Temp.</option>
                            <option value="2" ${Number(t.duracaoEmprestimo) === 2 ? 'selected' : ''}>2 Temp.</option>
                        </select>` : '<span style="color:var(--text-muted); font-size:12px;">—</span>'}
                    </td>
                    <td><button onclick="removerLinhaTransferenciaExtraida(${idx})" style="background:transparent; color:var(--danger); border:none; cursor:pointer; font-size:15px;">✖</button></td>
                </tr>
            `).join('');
        }

        function atualizarCampoTransferenciaExtraida(idx, campo, valor) {
            let item = transferenciasExtraidas[idx];
            if (!item) return;
            if (campo === 'incluir') item.incluir = !!valor;
            else if (campo === 'ovr' || campo === 'idade' || campo === 'valor' || campo === 'duracaoEmprestimo') item[campo] = Number(valor) || 0;
            else if (campo === 'nome') item.nome = limparTextoUsuario(valor, 80);
            else item[campo] = valor;
            // Mudar o "tipo" pode abrir/fechar a coluna de duração do empréstimo (só faz sentido
            // pra EmprestadoIn/Emprestimo) — precisa re-renderizar a linha pra refletir isso.
            if (campo === 'tipo') renderizarListaTransferenciasExtraidas();
        }

        function removerLinhaTransferenciaExtraida(idx) {
            transferenciasExtraidas.splice(idx, 1);
            renderizarListaTransferenciasExtraidas();
        }

        // Aplica uma linha já revisada no elenco, espelhando exatamente o que adicionarAoPlantel()/
        // processarSaida() fazem no fluxo manual (mesmo impacto de orçamento, nota da diretoria,
        // termômetro da torcida e notícias) — só que lendo de um objeto em vez do formulário.
        function _processarUmaTransferenciaExtraida(item) {
            let nome = limparTextoUsuario(item.nome, 80);
            if (!nome) return { ok: false, msg: 'Linha com nome vazio foi ignorada.' };
            let tipo = item.tipo;
            let valor = numeroSeguro(item.valor, 0);
            let duracao = numeroSeguro(item.duracaoEmprestimo, 1) || 1;

            if (tipo === 'Comprado' || tipo === 'EmprestadoIn') {
                let posicao = item.posicao || 'MeioCampo/Dinâmico';
                let ovr = Math.max(1, Math.round(numeroSeguro(item.ovr, 70)));
                let idade = item.idade ? Math.round(numeroSeguro(item.idade, 24)) : null;
                let custo = tipo === 'Comprado' ? valor : 0;

                if (tipo === 'Comprado') {
                    db.clube.orcamento -= custo; db.clube.gastoAtual += custo; atualizarNotaDiretoria(-0.1);
                    let impactoTorcidaCompra = gerarNumeroAleatorio(2, 5) + (ovr >= 82 ? gerarNumeroAleatorio(3, 6) : 0);
                    atualizarTermometroTorcida(impactoTorcidaCompra);
                }

                let jogadorExistente = db.clube.plantel.find(p => p.nome.toLowerCase() === nome.toLowerCase());
                if (jogadorExistente) {
                    jogadorExistente.status = 'Ativo';
                    jogadorExistente.origem = tipo;
                    jogadorExistente.ovr = ovr;
                    jogadorExistente.posicao = posicao;
                    jogadorExistente.valor = custo;
                    if (idade) jogadorExistente.idade = idade;
                    if (tipo === 'EmprestadoIn') jogadorExistente.temporadasEmprestimo = duracao;
                } else {
                    let novoJog = { nome: nome, posicao: posicao, ovr: ovr, status: 'Ativo', origem: tipo, valor: custo, jogosAvaliacao: 0 };
                    if (idade) novoJog.idade = idade;
                    if (tipo === 'EmprestadoIn') novoJog.temporadasEmprestimo = duracao;
                    if (typeof garantirCamposElenco === 'function') garantirCamposElenco(novoJog);
                    db.clube.plantel.push(novoJog);
                }

                if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Chegada de ${nome} (${tipo}) via import de print`);
                let noticiaDin = gerarNoticiaTransferencia(tipo, nome, custo, duracao);
                registrarNoticiaTransferenciaFeed(tipo, nome, noticiaDin);
                return { ok: true };
            }

            if (tipo === 'Venda' || tipo === 'Emprestimo' || tipo === 'Dispensa') {
                let jogador = db.clube.plantel.find(p => p.nome.toLowerCase() === nome.toLowerCase() && p.status === 'Ativo');
                if (!jogador) return { ok: false, msg: `${nome}: não encontrado ativo no elenco — linha ignorada.` };
                if (jogadorPertenceAOutroClube(jogador)) return { ok: false, msg: `${nome}: pertence a outro clube (empréstimo) — linha ignorada.` };

                if (tipo === 'Venda') {
                    db.clube.arrecadadoAtual += valor;
                    jogador.status = 'Vendido'; jogador.valor = valor;
                    atualizarNotaDiretoria(0.1);
                    db.clube.exigenciasDiretoria = db.clube.exigenciasDiretoria.filter(n => n !== nome);
                    let impactoVenda = gerarNumeroAleatorio(2, 6) + (jogador.ovr >= 78 ? gerarNumeroAleatorio(4, 8) : 0);
                    atualizarTermometroTorcida(-impactoVenda);
                    let noticia = gerarNoticiaTransferencia('Venda', nome, valor, 0);
                    registrarNoticiaTransferenciaFeed('Venda', nome, noticia);
                } else if (tipo === 'Emprestimo') {
                    jogador.status = 'Emprestado'; jogador.temporadasEmprestimo = duracao;
                    let noticia = gerarNoticiaTransferencia('Emprestimo', nome, 0, duracao);
                    registrarNoticiaTransferenciaFeed('Emprestimo', nome, noticia);
                } else if (tipo === 'Dispensa') {
                    jogador.status = 'Aposentado';
                    jogador.motivoSaida = 'Dispensa';
                    let noticia = gerarNoticiaTransferencia('Dispensa', nome, 0, 0);
                    registrarNoticiaTransferenciaFeed('Dispensa', nome, noticia);
                }

                if (db.clube.capitao === nome) db.clube.capitao = '';
                if (db.clube.viceCapitao === nome) db.clube.viceCapitao = '';
                if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Saída de ${nome} (${tipo}) via import de print`);
                return { ok: true };
            }

            return { ok: false, msg: `${nome}: tipo de negócio desconhecido — linha ignorada.` };
        }

        async function processarTransferenciasExtraidas() {
            if (currentSave !== 'clube') return;
            let incluidos = transferenciasExtraidas.filter(t => t.incluir);
            if (incluidos.length === 0) return alert('Marque ao menos uma transferência para processar.');
            if (!(await confirmarModerno(`Aplicar ${incluidos.length} transferência(s) revisada(s) no elenco?`, 'Processar Transferências'))) return;

            let erros = [];
            incluidos.forEach(item => {
                let r = _processarUmaTransferenciaExtraida(item);
                if (!r.ok) erros.push(r.msg);
            });

            if (typeof renderizarLiderancaUI === 'function') renderizarLiderancaUI();
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); filtrarMercado(statusFiltroMercado);
            checarEmbargoMercado();

            transferenciasExtraidas = [];
            imagensHistoricoTransferencias = [];
            renderizarPreviewImagensHistoricoTransferencias();
            renderizarListaTransferenciasExtraidas();

            alert(erros.length > 0
                ? `Transferências processadas, com ${erros.length} aviso(s):\n${erros.join('\n')}`
                : 'Transferências processadas com sucesso!');
        }

        function ordenarPlantel(coluna) {
            if (ordemAtualPlantel.coluna === coluna) { ordemAtualPlantel.ascendente = !ordemAtualPlantel.ascendente; } 
            else { ordemAtualPlantel.coluna = coluna; ordemAtualPlantel.ascendente = coluna === 'nome' ? true : false; }
            atualizarPlantelUI();
        }

