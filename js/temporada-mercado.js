        async function concluirTemporadaAutomatica() {
            if(!confirm(`Deseja encerrar a temporada ${db[currentSave].temporadaAtual}?`)) return;
            let posTabelaInput = prompt("Posição Final exata na tabela da Liga? (Ex: 1º Lugar)", "1º Lugar");
            if(posTabelaInput === null) return;

            // Pergunta sobre classificação continental se for clube
            let novaContinental = 'Nenhuma';
            if (currentSave === 'clube') {
                let classificou = confirm("O clube garantiu classificação para alguma Competição Continental para a PRÓXIMA temporada?");
                if (classificou) {
                    novaContinental = prompt("Qual o nome da competição? (Ex: Libertadores, Champions League, Sul-Americana, etc)", "Libertadores") || 'Nenhuma';
                }
                db.clube.competicaoContinental = novaContinental;
            }
            
            let pFiltradas = db[currentSave].partidas.filter(p => p.temporada === db[currentSave].temporadaAtual);
            let comps = {}; let trofeusGanhos = []; let detalhesComp = [];
            pFiltradas.forEach(p => { comps[p.comp] = p; });

            for(let c in comps) {
                let lastGame = comps[c];
                let isFinal = lastGame.contexto.toLowerCase().includes('final') && !lastGame.contexto.toLowerCase().includes('quartas') && !lastGame.contexto.toLowerCase().includes('oitavas') && !lastGame.contexto.toLowerCase().includes('semi');
                let isPrimeiro = lastGame.contexto.toLowerCase().includes('1º') || lastGame.contexto.toLowerCase().includes('campeão');
                let status = lastGame.contexto || "Fase Desconhecida";

                if (isPrimeiro || (isFinal && (lastGame.golsPro > lastGame.golsContra || (lastGame.golsPro === lastGame.golsContra && lastGame.penaltis)))) {
                    status = "Campeão 🏆"; trofeusGanhos.push(c); adicionarNoticiaAutomatica(`🏆 É CAMPEÃO de ${c}!`, `Toda a cidade está em festa!`);
                } else if (isFinal) { status = "Vice-Campeão 🥈"; }
                detalhesComp.push({ competicao: c, fase_final: status });
            }

            db[currentSave].historicoTemporadas.push({ temporada: db[currentSave].temporadaAtual, posicaoTabela: posTabelaInput, detalhes: detalhesComp, trofeus: trofeusGanhos });

            let gastoTotalTemp = db[currentSave].gastoAtual || 0; let arrecadadoTotalTemp = db[currentSave].arrecadadoAtual || 0;
            let balancoFinanceiro = arrecadadoTotalTemp - gastoTotalTemp;

            // NOVA LÓGICA DE MÉDIA (Média Antiga + Atual) / 2
            db[currentSave].mediaGastoHistorico = (db[currentSave].mediaGastoHistorico + gastoTotalTemp) / 2;
            db[currentSave].mediaArrecadadoHistorico = (db[currentSave].mediaArrecadadoHistorico + arrecadadoTotalTemp) / 2;

            let penalidadePrejuizo = 0;
            if(balancoFinanceiro < 0) { penalidadePrejuizo = 0.5; alert("⚠️ Atenção: Prejuízo na temporada penalizou seu prestígio (-0.5)."); }

            let promptFim = `Temporada ${db[currentSave].temporadaAtual} encerrada. Posição final na Liga: ${posTabelaInput}. Saldo financeiro do ano: €${balancoFinanceiro}M. Próxima competição continental: ${novaContinental}.
            Com base nesses resultados e na Liga atual, avalie o treinador e gere novos objetivos para a próxima temporada. SEJA ESPECÍFICO, REALISTA E NÃO REDUNDANTE.
            REGRAS DE REALISMO E RASTREAMENTO:
            - É PROIBIDO criar metas baseadas em "Idade" ou "Minutos jogados". O sistema não mede isso. Use vitórias, gols, saldo, valores em dinheiro, OVR ou passar de fase.
            - Adapte a exigência à realidade do time: times ruins devem ter metas humildes nas copas e focar em sobrevivência.
            - objLiga1: A meta principal da liga na tabela (ex: Título, Vaga continental, Top 10, Fugir do Z4).
            - objLiga2: Uma meta estatística RASTREÁVEL E DIFERENTE DA PRIMEIRA (ex: Saldo de gols +10, Melhor defesa. NÃO REPITA A META 1).
            - objCopa e objInternacional: Adapte a exigência. NÃO REPITA OBJETIVOS.
            - objFinanceiro: Uma meta numérica baseada nas métricas do jogo (Valor Gasto e Valor Arrecadado). Ex: "Arrecadar €15M em vendas" ou "Não gastar mais que €20M". NUNCA exija "margem de lucro" ou porcentagens.
            Retorne EXATAMENTE JSON: 
            { 
              "novoOrcamento": numero, 
              "novaNota": numero, 
              "objLiga1": "texto", 
              "objLiga2": "texto", 
              "objCopa": "texto", 
              "objInternacional": "texto", 
              "objFinanceiro": "texto" 
            }`;

            try {
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptFim }] }] })
                });
                const data = await response.json();
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                if(match) {
                    let resAI = JSON.parse(match[0]);
                    db[currentSave].orcamento = Number(resAI.novoOrcamento) || 25;
                    db[currentSave].notaDiretoria = (Number(resAI.novaNota) || db[currentSave].notaDiretoria) - penalidadePrejuizo;
                    if(db[currentSave].notaDiretoria < 0) db[currentSave].notaDiretoria = 0;
                    let txt = `⚽ Liga: ${resAI.objLiga1}<br>⚽ Liga (Secundário): ${resAI.objLiga2}<br>🏆 Copa Nacional: ${resAI.objCopa}`;
                    if(resAI.objInternacional && resAI.objInternacional.trim() !== "" && novaContinental !== 'Nenhuma') txt += `<br>🌍 Internacional (${novaContinental}): ${resAI.objInternacional}`;
                    txt += `<br>💰 Finanças: ${resAI.objFinanceiro}`;
                    db[currentSave].objetivosTemporada = txt;
                }
            } catch(e) { db[currentSave].orcamento = 25; db[currentSave].notaDiretoria -= penalidadePrejuizo; }

            db[currentSave].gastoAtual = 0; db[currentSave].arrecadadoAtual = 0;
            db[currentSave].negociacoesDiretoria = 0; // Reseta o limite de negociações da diretoria

            if(currentSave === 'clube') {
                let ano = parseInt(db.clube.temporadaAtual.split('/')[0]); db.clube.temporadaAtual = `${ano+1}/${ano+2}`; 
                
                db.clube.plantel.forEach(p => {
                    if (p.status === 'Emprestado' && p.temporadasEmprestimo > 0) {
                        p.temporadasEmprestimo--; 
                        if (p.temporadasEmprestimo <= 0) {
                            p.status = 'Ativo';
                            adicionarNoticiaAutomatica(`✈️ DE VOLTA: ${p.nome} retorna de empréstimo.`, `O jogador está de volta ao elenco principal após o período cedido e já pode ser escalado.`);
                        }
                    }
                    else if (p.status === 'Ativo' && p.origem === 'EmprestadoIn') {
                        p.status = 'FimEmprestimo'; 
                        adicionarNoticiaAutomatica(`👋 ADEUS (POR ENQUANTO): Fim de empréstimo de ${p.nome}.`, `O contrato de empréstimo encerrou e o jogador deixou o elenco ativo. Caso seja contratado futuramente, seu histórico retornará intacto.`);
                    }
                });
                
                checarPromocaoRebaixamento();
            } else {
                let anoAtual = parseInt(db.selecao.temporadaAtual.replace(/\D/g, '')); db.selecao.temporadaAtual = `Ciclo ${anoAtual + 4}`;
            }
            salvarDados(); alert("Temporada concluída!"); atualizarFiltroTemporadas(); ajustarInterfaceSave(); mudarAba('tab-diretoria');
        }

        function checarPromocaoRebaixamento() {
            let ligObj = ligaMap[db[currentSave].liga];
            if(ligObj) {
                if(!ligObj.isTop && ligObj.up && confirm(`Acesso para a divisão superior (${ligObj.up.split(' (')[0]})?`)) { db[currentSave].liga = ligObj.up; }
                else if(ligObj.down && confirm(`Rebaixado para a divisão inferior (${ligObj.down.split(' (')[0]})?`)) { db[currentSave].liga = ligObj.down; }
            }
        }

        function gerarEventoAleatorio() {
            const eventos = ["Polêmica no vestiário!", "Apoio da diretoria: +€5M no orçamento extra.", "Lesão nos treinos!"];
            let ev = eventos[gerarNumeroAleatorio(0, eventos.length - 1)];
            if(ev.includes("+€5M") && currentSave === 'clube') { db.clube.orcamento += 5; atualizarNotaDiretoria(0.2); }
            document.getElementById('evento-texto').innerText = ev; document.getElementById('modal-evento').style.display = 'flex'; 
        }

        function cadastrarJogadorBase() {
            if(currentSave !== 'clube') return;
            let nome = document.getElementById('cad-nome').value.trim(); if(!nome) return;
            db.clube.plantel.push({ nome: nome, posicao: document.getElementById('cad-pos').value, ovr: Number(document.getElementById('cad-ovr').value), status: 'Ativo', jogosAvaliacao: 0 });
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); document.getElementById('cad-nome').value = '';
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
            if(tipoTransicao === 'Comprado' && db.clube.orcamento < custo) return alert("Orçamento insuficiente!");
            
            if(tipoTransicao === 'Comprado') {
                db.clube.orcamento -= custo; db.clube.gastoAtual += custo; atualizarNotaDiretoria(-0.1);
                // ADICIONE AQUI: Torcida animada com reforço
                atualizarTermometroTorcida(gerarNumeroAleatorio(2, 5));
            }
            
            let jogadorExistente = db.clube.plantel.find(p => p.nome.toLowerCase() === nomeNovo.toLowerCase());
            
            if (jogadorExistente) {
                jogadorExistente.status = 'Ativo';
                jogadorExistente.origem = tipoTransicao;
                jogadorExistente.ovr = Number(document.getElementById('add-ovr').value);
                jogadorExistente.posicao = document.getElementById('add-pos').value;
                jogadorExistente.valor = custo;
                if (tipoTransicao === 'EmprestadoIn') jogadorExistente.temporadasEmprestimo = duracao;
            } else {
                let novoJog = { 
                    nome: nomeNovo, posicao: document.getElementById('add-pos').value, 
                    ovr: Number(document.getElementById('add-ovr').value), status: 'Ativo', 
                    origem: tipoTransicao, valor: custo, jogosAvaliacao: 0 
                };
                if (tipoTransicao === 'EmprestadoIn') novoJog.temporadasEmprestimo = duracao;
                db.clube.plantel.push(novoJog);
            }
            
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); 
            alert(tipoTransicao === 'EmprestadoIn' ? "Jogador adicionado por empréstimo!" : "Contratação realizada!");
            checarEmbargoMercado();

            // Chama o gerador dinâmico de notícias
            let noticiaDin = gerarNoticiaTransferencia(tipoTransicao, nomeNovo, custo, duracao);
            adicionarNoticiaAutomatica(noticiaDin.titulo, noticiaDin.detalhe);
            
            document.getElementById('add-nome').value = '';
        }

        function editarValorTransferencia(nome) {
            let p = db.clube.plantel.find(j => j.nome === nome);
            if (!p) return;
            let novoValor = prompt(`Digite o valor correto (€M) da negociação de ${nome}:`, p.valor || 0);
            if (novoValor !== null && novoValor.trim() !== "") {
                p.valor = Number(novoValor);
                salvarDados();
                filtrarMercado(statusFiltroMercado);
            }
        }

        function excluirJogadorTransferencia(nome) {
            if (confirm(`⚠️ ALERTA: Tem certeza que deseja APAGAR COMPLETAMENTE o jogador ${nome} do save? Isso removerá o histórico dele.`)) {
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
            if (jogador.origem === 'EmprestadoIn' && (tipo === 'Venda' || tipo === 'Emprestimo' || tipo === 'Dispensa')) {
                return alert("⚠️ Você não pode vender, emprestar ou dispensar um jogador que pertence a outro clube! Vá na aba 'Elenco' se quiser encerrar o empréstimo dele.");
            }

            if(tipo === 'Venda') {
                let valor = Number(document.getElementById('saida-valor').value);
                db.clube.arrecadadoAtual += valor;
                jogador.status = 'Vendido'; 
                jogador.valor = valor; 
                atualizarNotaDiretoria(0.1);
                db.clube.exigenciasDiretoria = db.clube.exigenciasDiretoria.filter(n => n !== nome);
                
                // ADICIONE AQUI: Torcida não gosta de perder jogador ativo
                atualizarTermometroTorcida(-gerarNumeroAleatorio(2, 6));
                
                let noticia = gerarNoticiaTransferencia('Venda', nome, valor, 0);
                adicionarNoticiaAutomatica(noticia.titulo, noticia.detalhe);
            } 
            else if(tipo === 'Emprestimo') { 
                jogador.status = 'Emprestado'; 
                jogador.temporadasEmprestimo = Number(document.getElementById('saida-duracao').value); 
                
                let noticia = gerarNoticiaTransferencia('Emprestimo', nome, 0, jogador.temporadasEmprestimo);
                adicionarNoticiaAutomatica(noticia.titulo, noticia.detalhe);
            } 
            else if(tipo === 'Dispensa') { 
                jogador.status = 'Aposentado'; 
                
                let noticia = gerarNoticiaTransferencia('Dispensa', nome, 0, 0);
                adicionarNoticiaAutomatica(noticia.titulo, noticia.detalhe);
            }

            document.getElementById('saida-nome-input').value = ''; document.getElementById('saida-valor').value = '0';
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); filtrarMercado(statusFiltroMercado);
            checarEmbargoMercado();
        }

        function checarEmbargoMercado() {
            if(currentSave !== 'clube') return;
            let btn = document.getElementById('btn-confirmar-compra');
            if(!btn) return;
            if(db.clube.notaDiretoria < 5.0 || db.clube.orcamento < -10.0) {
                btn.disabled = true;
                btn.innerText = "BLOQUEADO PELA DIRETORIA (Embargo)";
                btn.style.background = "var(--text-muted)";
            } else {
                btn.disabled = false;
                btn.innerText = "Confirmar Compra";
                btn.style.background = "var(--accent)";
            }
        }

        function alterarStatus(nome, status) {
    if (status === 'Excluir' && confirm(`Apagar ${nome}?`)) {
        db[currentSave].plantel = db[currentSave].plantel.filter(p => p.nome !== nome);
    } else {
        let jog = db[currentSave].plantel.find(p => p.nome === nome);
        if(jog) {
            if(status === 'Vendido' || status === 'Emprestado') {
                let v = prompt(`Valor recebido em €M?`, "0");
                db.clube.orcamento += Number(v) * 0.8; db.clube.arrecadadoAtual += Number(v);
                jog.status = status; 
            } else if (status === 'EncerrarEmprestimo') {
                if(confirm(`Deseja devolver ${nome} antecipadamente ao clube de origem?`)) {
                    jog.status = 'FimEmprestimo';
                    adicionarNoticiaAutomatica(`👋 FIM DE EMPRÉSTIMO: ${nome} devolvido.`, `O clube optou por encerrar o empréstimo antecipadamente e o atleta não faz mais parte do elenco.`);
                } else {
                    return; // Cancela a ação
                }
            } else if (status === 'ChamarDeVolta') {
                if(confirm(`Deseja solicitar o retorno imediato de ${nome} do seu empréstimo?`)) {
                    jog.status = 'Ativo';
                    jog.temporadasEmprestimo = 0;
                    adicionarNoticiaAutomatica(`✈️ DE VOLTA: ${nome} retorna ao clube.`, `O treinador solicitou a volta do jogador antes do fim do empréstimo para compor o elenco atual.`);
                } else {
                    return; // Cancela a ação
                }
            } else {
                jog.status = status;
                if (status === 'Aposentado') {
                    let noticia = gerarNoticiaTransferencia('Aposentadoria', nome, 0, 0);
                    adicionarNoticiaAutomatica(noticia.titulo, noticia.detalhe);
                }
            }
        }
    }
    salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); filtrarMercado(statusFiltroMercado);
}

        function abrirModalEditarJogador(nomeOriginal) {
            let jog = db[currentSave].plantel.find(p => p.nome === nomeOriginal);
            if(jog) {
                document.getElementById('edit-jog-nome-original').value = jog.nome; document.getElementById('edit-jog-nome').value = jog.nome;
                document.getElementById('edit-jog-pos').value = jog.posicao; document.getElementById('edit-jog-ovr').value = jog.ovr;
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
                salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); document.getElementById('modal-editar-jogador').style.display = 'none';
            }
        }

        function ordenarPlantel(coluna) {
            if (ordemAtualPlantel.coluna === coluna) { ordemAtualPlantel.ascendente = !ordemAtualPlantel.ascendente; } 
            else { ordemAtualPlantel.coluna = coluna; ordemAtualPlantel.ascendente = coluna === 'nome' ? true : false; }
            atualizarPlantelUI();
        }

