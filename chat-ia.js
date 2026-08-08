        async function enviarChat(tipo) {
            let inputEl = document.getElementById(`input-${tipo}`);
            let texto = inputEl.value.trim();
            if(!texto) return;

            inputEl.value = '';
            let history = db[currentSave].chatHistory[tipo]; if(!history) history = [];
            history.push({ role: 'user', text: texto });
            let quickContainer = document.getElementById(`quick-${tipo}`);
            if(quickContainer) quickContainer.innerHTML = '';
            renderizarChat(tipo);

            try {
                let contexto = gerarResumoContexto();
                let historicoChat = history.map(h => `${h.role === 'user' ? 'Treinador' : tipo}: ${h.text}`).join('\n');
                
                let promptFull = "";

                if (tipo === 'diretoria') {
                    // Mapeamento Dinâmico do Perfil da IA baseado na Nota
                    let notaDir = db[currentSave].notaDiretoria;
                    let perfilDir = "";
                    if (notaDir >= 8) perfilDir = "Você está dócil, prestativa e confia plenamente no treinador. Pode oferecer pequenos bônus financeiros se ele argumentar muito bem.";
                    else if (notaDir >= 5) perfilDir = "Você é estritamente profissional, pragmática e foca apenas nos números, resultados e planilhas.";
                    else perfilDir = "CRISE! Você está rude, impaciente e ameaçadora. O clima é de profunda insatisfação e demissão iminente.";

                    promptFull = `Atue como a Diretoria do clube "${db[currentSave].nome}".\n${contexto}\nHistórico da Conversa:\n${historicoChat}\n
        INSTRUÇÕES DA DIRETORIA E REGRAS DE NEGÓCIO:
        1. PERSONALIDADE ATUAL (Sua Nota de Prestígio é ${notaDir.toFixed(1)}/10): ${perfilDir}
        2. NEGOCIAÇÃO E LIMITE ANUAL ("PIRES NA MÃO"): O clube tem um limite máximo de 2 injeções financeiras extras por temporada (Já foram feitas ${db[currentSave].negociacoesDiretoria || 0} de 2). 
        ⚠️ REGRA DE OURO DO FLUXO: Se o limite estiver esgotado (2/2), retorne 'novoOrcamentoExtra': 0 e avise que o cofre está trancado. 
        Se NÃO estiver esgotado, siga RIGOROSAMENTE DUAS ETAPAS:
        - ETAPA 1 (PRIMEIRA MENSAGEM OU PEDIDO NOVO): Você DEVE recusar o dinheiro imediato, propor uma contraproposta difícil preenchendo 'novaMetaExigida' e obrigatoriamente retornar 'novoOrcamentoExtra': 0 (ZERO!). NUNCA libere dinheiro na primeira mensagem.
        - ETAPA 2 (APENAS SE O TREINADOR ACEITAR CLARAMENTE NA MENSAGEM ANTERIOR): Só agora você preenche 'novoOrcamentoExtra' com o valor combinado (respeitando o teto de 20% da Média de Gasto, que é €${Math.max((db[currentSave].mediaGastoHistorico || 0) * 0.20, 2.0).toFixed(2)}M) e soma +1 ao limite de negociações.
        3. SISTEMA DE PRESTÍGIO NA CONVERSA: A diretoria avalia principalmente o desempenho EM CAMPO, mas uma conversa muito bem argumentada pode render uma pequena recuperação (no máximo +0.1). Se o treinador recusar um pedido de forma educada e razoável, isso NÃO deve ser punido — reserve variação negativa (no máximo -0.2, e só em casos realmente graves) para quando ele der desculpas esfarrapadas, for grosseiro ou ofender.
        4. VARIEDADE: Não repita frases, aberturas ou expressões que você já usou no histórico da conversa acima. Elabore um pouco mais a resposta (2-3 frases), evitando respostas curtas e genéricas demais.
        
        Retorne EXATAMENTE este formato JSON puro:
        {
            "mensagem": "Sua resposta oficial...",
            "opcoes_resposta": ["Opção curta 1", "Opção curta 2"],
            "novoOrcamentoExtra": 0,
            "novaMetaExigida": "",
            "variacao_prestigio": 0.0
        }`;
                } else {
                    promptFull = `Atue como o Auxiliar Técnico "${db[currentSave].nome}".\n${contexto}\nHistórico da Conversa:\n${historicoChat}\n
        INSTRUÇÕES:
        Responda à última mensagem do Treinador de forma coerente. 
        MUDE SUA PERSONALIDADE: Seja extremamente autêntico, cirúrgico e focado em TÁTICA. Dê respostas profundas sobre esquemas, movimentações e ajustes.
        
        Retorne EXATAMENTE este formato JSON puro:
        {
            "mensagem": "Sua resposta oficial.",
            "opcoes_resposta": ["Opção curta 1", "Opção curta 2"]
        }`;
                }

                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptFull }] }] })
                });
                const data = await response.json();
                let rawText = data.candidates[0].content.parts[0].text;
                let jsonMatch = rawText.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    let res = JSON.parse(jsonMatch[0]);
                    history.push({ role: 'ai', text: res.mensagem });
                    
                    if(quickContainer && res.opcoes_resposta) {
                        quickContainer.innerHTML = res.opcoes_resposta.map(op => `<button class="btn-quick" onclick="usarQuickReply('${op.replace(/'/g, "\\'")}', 'input-${tipo}', 'enviarChat${tipo.charAt(0).toUpperCase() + tipo.slice(1)}')">${op}</button>`).join('');
                    }

                    // --- PROCESSAMENTO EXCLUSIVO DA DIRETORIA ---
                    if (tipo === 'diretoria') {
                        // ... (dentro de enviarChat)
if (res.novoOrcamentoExtra && Number(res.novoOrcamentoExtra) > 0) {
    let limiteDinamico = Math.max((db[currentSave].mediaGastoHistorico || 0) * 0.20, 2.0);
    let valorExtra = Math.min(Number(res.novoOrcamentoExtra), limiteDinamico);
    db[currentSave].negociacoesDiretoria = (db[currentSave].negociacoesDiretoria || 0) + 1;
    db[currentSave].orcamento += valorExtra;
    
    let dashOrc = document.getElementById('dash-dir-orcamento');
    if(dashOrc) dashOrc.innerText = "€" + db[currentSave].orcamento.toFixed(2) + "M";
    
    adicionarNoticiaAutomatica(`💰 ACORDO FECHADO: Diretoria libera +€${valorExtra.toFixed(2)}M.`, `Após intensas negociações nos bastidores, o conselho executivo cedeu aos pedidos do treinador e injetou uma verba extraordinária.`);
    
    // MOVIDO PARA CÁ: O ultimato só é registrado se o dinheiro for liberado!
    if (res.novaMetaExigida && res.novaMetaExigida.trim() !== "") {
        db[currentSave].objetivosTemporada = db[currentSave].objetivosTemporada.replace(/<br><span style="color:var\(--warning\)">🔥 ACORDO\/ULTIMATO EXIGIDO:.*?<\/span>/g, "");
        db[currentSave].objetivosTemporada += `<br><span style="color:var(--warning)">🔥 ACORDO/ULTIMATO EXIGIDO: ${res.novaMetaExigida}</span>`;
        
        let dirObjText = document.getElementById('dir-objetivos-texto');
        if(dirObjText) dirObjText.innerHTML = db[currentSave].objetivosTemporada;
    }
}
                        if (res.variacao_prestigio && Number(res.variacao_prestigio) !== 0) {
                            let variacao = Number(res.variacao_prestigio);
                            // Trava de segurança: no máximo +0.1 de recuperação, ou -0.3 de queda por mensagem
                            variacao = Math.max(-0.3, Math.min(0.1, variacao));
                            atualizarNotaDiretoria(variacao);
                        }
                    }
                }
                db[currentSave].chatHistory[tipo] = history; salvarDados(); renderizarChat(tipo);
            } catch(e) {
                history.push({ role: 'ai', text: "Sem resposta no momento. Conexão interrompida." }); renderizarChat(tipo);
            }
        }

        function renderizarChat(tipo) {
            let log = document.getElementById(`chat-log-${tipo}`);
            if(!log) return;
            let history = db[currentSave].chatHistory[tipo] || [];
            
            log.innerHTML = history.map(h => {
                let btnOuvir = h.role === 'ai' ? `<button class="btn-audio" onclick="lerTexto('${h.text.replace(/'/g, "\\'")}')">🔊</button>` : '';
                return `<div class="chat-msg ${h.role === 'user' ? 'msg-user' : 'msg-ai'}">${h.text}${btnOuvir}</div>`;
            }).join('');
            log.scrollTop = log.scrollHeight;
        }

       function renderizarCampinhoLimpo() {
            let campo = document.getElementById('campo-futebol-ui');
            campo.innerHTML = '<div class="area-penalti-top"></div><div class="area-penalti-bot"></div>';

            let dadosSalvos = db[currentSave].escalacaoSalvaIA;
            if (dadosSalvos && dadosSalvos.formacao && dadosSalvos.escalacao) {
                let positions = coordsFormacoes[dadosSalvos.formacao];
                if (positions) {
                    for (let posObj of positions) {
                        let jogInfo = dadosSalvos.escalacao[posObj.role];
                        let nomeJogador = jogInfo ? jogInfo.nome : "???";
                        let instrucao = jogInfo ? jogInfo.instrucao : "Sem instrução.";
                        
                        let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes(nomeJogador.toLowerCase().trim()));
                        let txtOvr = jogBD ? `<br><span style="color:#0D1512; background:var(--primary); border-radius:4px; padding:0 3px;">OVR ${jogBD.ovr}</span>` : '';
                        
                        let tooltipHTML = `<div class="jogador-tooltip"><strong>${nomeJogador}</strong><hr style="border-color:var(--border); margin:5px 0;">${instrucao}</div>`;
                        
                        campo.innerHTML += `<div class="jogador-campo" style="top: ${posObj.top}; left: ${posObj.left};">${nomeJogador}${txtOvr}${tooltipHTML}</div>`;
                    }
                }
            }
        }

              async function pedirEscalacaoIA() {
            let formacaoPri = document.getElementById('tatica-primaria').value;
            let formacaoSec = document.getElementById('tatica-secundaria').value;
            let estiloJogo = document.getElementById('tatica-estilo').value;
            let adv = document.getElementById('auxiliar-adv').value.trim() || "Adversário Desconhecido";
            let diretriz = document.getElementById('auxiliar-diretriz').value;
            let diasDescanso = parseInt(document.getElementById('partida-dias-proxima')?.value) || 3;
            let btn = document.getElementById('btn-pedir-ia');
            
            btn.innerText = "⏳ O Estrategista está montando o plano de jogo..."; btn.disabled = true;

            let plantelAtivo = db[currentSave].plantel.filter(p => p.status === 'Ativo');
            
            // LÓGICA DE AMNÉSIA: PEGAR APENAS PEDIDOS NÃO APLICADOS
            let chatAuxHistorico = db[currentSave].chatHistory['auxiliar'] || [];
            let pedidosPendentes = chatAuxHistorico.filter(h => h.role === 'user' && !h.aplicada);
            let pedidosUsuario = pedidosPendentes.map(h => h.text).join(' | ');
            
            // Marca como aplicada para a IA esquecer essas ordens na próxima escalação
            pedidosPendentes.forEach(h => h.aplicada = true);
            salvarDados();

            let plantelStr = plantelAtivo.map(p => {
                let indisponivelStr = "";
                if (p.diasLesao && p.diasLesao > 0) indisponivelStr = " [INDISPONÍVEL: LESIONADO]";
                if (p.suspensoVermelho) indisponivelStr = " [INDISPONÍVEL: SUSPENSO]";

                let pJogadas = []; 
                db[currentSave].partidas.forEach(partida => { 
                    let at = partida.jogadores.find(j => j.nome === p.nome); 
                    if(at) pJogadas.push(at.nota); 
                });
                let mediaNota = pJogadas.length > 0 ? (pJogadas.reduce((a,b)=>a+b,0)/pJogadas.length).toFixed(1) : "Sem nota";
                return { nome: p.nome, posicao: p.posicao, ovr: p.ovr, aparicoes: pJogadas.length, mediaNota, indisponivelStr };
            });

            // Proxy de "jovem/reserva" (o sistema não tem idade): OVR abaixo da média do elenco E poucas aparições
            let ovrMedio = plantelStr.reduce((soma, p) => soma + p.ovr, 0) / (plantelStr.length || 1);
            let apMedia = plantelStr.reduce((soma, p) => soma + p.aparicoes, 0) / (plantelStr.length || 1);
            let plantelStrTexto = plantelStr.map(p => {
                let tagReserva = (p.ovr < ovrMedio && p.aparicoes < apMedia) ? " [RESERVA/JOVEM - pouco utilizado]" : "";
                return `[Nome: ${p.nome} | Pos: ${p.posicao} | OVR: ${p.ovr} | Nota Média: ${p.mediaNota}${p.indisponivelStr}${tagReserva}]`;
            }).join(', ');
            
            let formacoesPossiveisStr = JSON.stringify({
                "4-3-3": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOL", "MCD", "MCE", "PD", "PE", "ATA"],
                "4-4-2": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "MD", "MCD", "MCE", "ME", "ATD", "ATE"],
                "3-5-2": ["GOL", "ZAD", "ZAC", "ZAE", "ALD", "VOLD", "VOLE", "ALE", "MEI", "ATD", "ATE"],
                "4-2-3-1": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOLD", "VOLE", "MD", "MEI", "ME", "ATA"],
                "4-1-4-1": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOL", "MD", "MCD", "MCE", "ME", "ATA"],
                "3-4-3": ["GOL", "ZAD", "ZAC", "ZAE", "MD", "MCD", "MCE", "ME", "PD", "ATA", "PE"],
                "5-3-2": ["GOL", "LAD", "ZAD", "ZAC", "ZAE", "LAE", "MCD", "MC", "MCE", "ATD", "ATE"]
            });

            let promptIA = `Você é o MENTOR ESTRATÉGICO do "${db[currentSave].nome}". Adversário: ${adv}.
            Elenco: ${plantelStrTexto}
            
            FILOSOFIA TÁTICA E OPÇÕES:
            - Formação Primária: ${formacaoPri}
            - Formação Secundária (Alternativa de Ouro): ${formacaoSec}
            - Estilo de Jogo: ${estiloJogo}
            - Diretriz: ${diretriz}
            
            🚨 ORDENS DIRETAS DO TREINADOR APENAS PARA ESTE JOGO: [${pedidosUsuario ? pedidosUsuario : "Nenhuma ordem extra. Crie a melhor estratégia sozinho."}]
            (Se houver ordens acima, obedeça cegamente. Caso contrário, aja por conta própria).

            🧠 SEU PAPEL COMO ESTRATEGISTA (MUITO IMPORTANTE):
            1. DINÂMICA DE FORMAÇÃO: Você DEVE analisar o adversário (${adv}) e o nível do seu time. Se o adversário for muito forte, ou se for um jogo que exige postura diferente, USE A FORMAÇÃO SECUNDÁRIA (${formacaoSec}). Se o time estiver cansado e os reservas encaixarem melhor na Secundária, use-a. Caso a Primária seja superior para o contexto, mantenha-a.
            2. INSTRUÇÕES CIRÚRGICAS: Para CADA jogador, crie uma instrução tática baseada no adversário (${adv}) e no ${estiloJogo}. Exemplo: Se for o Racing (time menor), exija pressão na saída deles. Se for o Barcelona, instrua o volante a fechar a linha de passe e dobrar marcação. NADA DE INSTRUÇÕES GENÉRICAS.
            3. ROTAÇÃO (${diasDescanso} dias de descanso): Se tiver 3 dias ou menos, POUPE PONTAS E LATERAIS (exceto se a Diretriz for Força Total).
            4. CUMPRIMENTO OBRIGATÓRIO DE DIRETRIZ E ESTILO (NÃO É SUGESTÃO, É REGRA): Traduza literalmente o texto da Diretriz e do Estilo de Jogo em ações concretas na escalação:
               - Se mencionar "jovens", "reservas", "dar oportunidade" ou "rodar o elenco": você DEVE escalar preferencialmente jogadores marcados como [RESERVA/JOVEM] acima, nas posições onde eles existirem, mesmo que o OVR seja menor.
               - Se mencionar "explorar laterais", "explorar as pontas" ou "jogar pelos lados": as instruções dos jogadores em LAD/LAE/PD/PE/ALD/ALE DEVEM pedir explicitamente para avançar constantemente, cruzar com frequência e buscar a linha de fundo.
               - Se mencionar qualquer outro pedido específico (ex: "marcação alta", "jogo mais defensivo", "time mais ofensivo"), reflita isso nas instruções individuais de forma clara e verificável, não apenas no estilo geral.

            REGRAS ABSOLUTAS DO JSON:
            1. Escolha UMA das duas formações (A Primária ou a Secundária) e use EXATAMENTE AS SIGLAS DO SEGUINTE MAPA COMO CHAVES: ${formacoesPossiveisStr}
            2. NÃO invente siglas (Ex: não crie "MC" se na formação escolhida tiver apenas "MCD" e "MCE").
            
            Retorne EXATAMENTE este JSON PURO:
            {
                "formacaoEscolhida": "4-2-3-1",
                "escalacao": {
                    "GOL": {"nome": "Nome do Goleiro", "instrucao": "Instrução tática profunda contra o adversário..."},
                    "LAD": {"nome": "Nome do Lateral", "instrucao": "..."}
                }
            }`;

            try {
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptIA }] }] })
                });
                const data = await response.json();
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                
                if (match) {
                    let res = JSON.parse(match[0]);
                    
                    db[currentSave].escalacaoSalvaIA = {
                        formacao: res.formacaoEscolhida,
                        escalacao: res.escalacao
                    };
                    salvarDados();
                    renderizarCampinhoLimpo();
                }
            } catch (e) {
                alert("Erro ao analisar a tática. Verifique sua chave API ou internet.");
            }
            btn.innerText = "⚙️ Gerar Escalação e Funções Táticas (IA)"; btn.disabled = false;
        }


        function atualizarTemperaturaUI(clima) {
            let el = document.getElementById('status-temperatura');
            el.innerText = `🌡️ Clima: ${clima}`;
            if(clima.toLowerCase().includes('tens') || clima.toLowerCase().includes('cris') || clima.toLowerCase().includes('hostil')) el.style.borderColor = 'var(--danger)';
            else if(clima.toLowerCase().includes('eufóric') || clima.toLowerCase().includes('calm')) el.style.borderColor = 'var(--primary)';
            else el.style.borderColor = 'var(--border)';
        }

        async function responderColetiva() {
            let input = document.getElementById('input-imprensa');
            let texto = input.value.trim(); if(!texto) return;
            input.value = ''; document.getElementById('quick-imprensa').innerHTML = '';

            let history = db[currentSave].chatHistory['imprensa'];
            history.push({ role: 'user', text: texto });
            contadorRespostasColetiva++; renderizarChat('imprensa');

            if(contadorRespostasColetiva >= 5) {
                history.push({ role: 'ai', text: "Assessor: A coletiva foi encerrada. Obrigado!" });
                renderizarChat('imprensa'); window.coletivaAtiva = false; return;
            }

            try {
                                let promptPayload = `${gerarResumoContexto()}\nColetiva (${contadorRespostasColetiva}/5). Histórico:\n` + history.map(h => `${h.role === 'user' ? 'Treinador' : 'Mídia'}: ${h.text}`).join('\n') + `
                INSTRUÇÕES:
                1. Mude o jornalista e o assunto. Avalie o contexto da entrevista.
                2. REGRA DE OURO DA IMPRENSA E DIRETORIA: Discursos simples, rotineiros, profissionais ou pacatos NUNCA penalizam o prestígio (variacao_prestigio DEVE ser 0.0). A diretoria e os jornais entendem clichês de futebol. Mantenha o clima "Neutro" para respostas normais. SÓ aplique variação negativa se o treinador xingar, criar uma crise pública gravíssima ou atacar o clube. Respostas inspiradoras dão +0.1 de prestígio.
                3. Baseado na resposta do Treinador, defina o impacto na diretoria (variacao_prestigio: 0.1, 0.0, ou -0.2 apenas em casos extremos).
                4. NOTÍCIAS DE IMPRENSA: Atue como um portal de fofoca esportiva (estilo The Sun, Marca, GE). Se o treinador der uma resposta forte, irônica ou inspiradora, coloque "gerarNoticia": true. 
                5. Crie um "tituloNoticia" ESCANDALOSO (Ex: "TREINADOR PERDE A LINHA!", "INDIRETA PARA A DIRETORIA?", "TÉCNICO CRAVA TÍTULO!"). No "detalheNoticia", aja como um jornalista corneteiro ou emocionado comentando a fala do treinador.
                6. O limite de notícias por coletiva é 2. Já foram geradas ${window.noticiasGeradasColetiva}.
                
                Retorne EXATAMENTE JSON puro:
                {
                  "mensagem": "Pergunta do novo jornalista",
                  "temperatura": "Clima atual (ex: Hostil)",
                  "opcoes_resposta": ["Opção 1", "Opção 2", "Opção 3"],
                  "variacao_prestigio": 0.0,
                  "gerarNoticia": true/false,
                  "tituloNoticia": "Manchete forte",
                  "detalheNoticia": "Texto da notícia sobre a última fala do treinador"
                }`;

                mostrarCarregandoIA('⏳ O jornalista está preparando a próxima pergunta...');
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptPayload }] }] })
                });
                const data = await response.json();
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);

                if(match) {
                    let res = JSON.parse(match[0]);
                    atualizarTemperaturaUI(res.temperatura || "Neutro");
                    history.push({ role: 'ai', text: res.mensagem });
                    
                    if (res.variacao_prestigio) atualizarNotaDiretoria(Number(res.variacao_prestigio));

                    if (res.gerarNoticia === true && res.tituloNoticia && window.noticiasGeradasColetiva < 2) {
                        window.noticiasGeradasColetiva++;
                        adicionarNoticiaAutomatica(`🔥 POLÊMICA MÍDIA: ${res.tituloNoticia}`, res.detalheNoticia);
                    }

                    let quickContainer = document.getElementById(`quick-imprensa`);
                    if(res.opcoes_resposta) {
                        quickContainer.innerHTML = res.opcoes_resposta.map(op => `<button class="btn-quick" onclick="usarQuickReply('${op.replace(/'/g, "\\'")}', 'input-imprensa', 'responderColetiva')">${op}</button>`).join('');
                    }
                }
                salvarDados(); renderizarChat('imprensa');
            } catch(e) {
                history.push({ role: 'ai', text: "Assessor: Perdemos a conexão com a sala de imprensa por um instante. Tente responder de novo." });
                renderizarChat('imprensa');
            }
            esconderCarregandoIA();
        }

function apagarChat(tipo) {
            if (confirm(`Tem certeza que deseja apagar o histórico desta conversa?`)) {
                db[currentSave].chatHistory[tipo] = [];
                // Se for diretoria ou auxiliar, reseta também o contador de notícias lidas para reavaliar se precisar
                if (tipo === 'diretoria') db[currentSave].chatHistory.noticiasLidasDir = 0;
                if (tipo === 'auxiliar') db[currentSave].chatHistory.noticiasLidasAux = 0;
                salvarDados();
                renderizarChat(tipo);
                // Se for o auxiliar, limpa o campinho visualmente se quiser
                if (tipo === 'auxiliar') {
                    db[currentSave].escalacaoSalvaIA = null;
                    renderizarCampinhoLimpo();
                }
            }
        }

        function apagarNoticia(index) {
            if (confirm("Deseja apagar esta notícia do feed?")) {
                db[currentSave].noticiasFeed.splice(index, 1);
                salvarDados();
                renderizarNoticiasFeed();
            }
        }

