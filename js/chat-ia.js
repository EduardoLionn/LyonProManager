        // Print anexado ao chat do Auxiliar (campo térmico / estatísticas da partida em andamento)
        let imagemAnexadaAuxiliar = null; // { base64, mimeType, nomeArquivo }

        function anexarImagemAuxiliar(event) {
            let file = event.target.files[0];
            if (!file) return;
            let reader = new FileReader();
            reader.onload = () => {
                imagemAnexadaAuxiliar = { base64: reader.result.split(',')[1], mimeType: file.type, nomeArquivo: file.name };
                let preview = document.getElementById('auxiliar-imagem-preview');
                if (preview) {
                    preview.style.display = 'block';
                    preview.innerHTML = `📎 ${file.name} anexado — descreva o que está acontecendo no jogo e mande. <button onclick="removerImagemAuxiliar()" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:bold; text-decoration:underline;">remover</button>`;
                }
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }

        function removerImagemAuxiliar() {
            imagemAnexadaAuxiliar = null;
            let preview = document.getElementById('auxiliar-imagem-preview');
            if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
        }

        async function enviarChat(tipo) {
            let inputEl = document.getElementById(`input-${tipo}`);
            let texto = inputEl.value.trim();
            let imagemAnexada = (tipo === 'auxiliar') ? imagemAnexadaAuxiliar : null;
            if(!texto && !imagemAnexada) return;
            if(!texto) texto = "📸 (print do jogo anexado, sem mensagem)";

            inputEl.value = '';
            let history = db[currentSave].chatHistory[tipo]; if(!history) history = [];
            history.push({ role: 'user', text: imagemAnexada ? `📸 ${texto}` : texto });
            let quickContainer = document.getElementById(`quick-${tipo}`);
            if(quickContainer) quickContainer.innerHTML = '';
            renderizarChat(tipo);
            removerImagemAuxiliar();

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

                    promptFull = `Atue como ${nomeDiretorExibicao()}, o(a) Diretor(a) Executivo(a) do clube "${db[currentSave].nome}".\n${contexto}\nHistórico da Conversa:\n${historicoChat}\n
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
                    let partidaAtual = db[currentSave].partidaAuxiliar;
                    let escalacaoStr = (partidaAtual && partidaAtual.titulares)
                        ? `Partida ${partidaAtual.status === 'em_andamento' ? 'EM ANDAMENTO' : 'declarada'} contra ${partidaAtual.adversarioNome}. Formação atual em campo: ${partidaAtual.formacaoEscolhida}. Titulares: ${Object.entries(partidaAtual.titulares).map(([pos, j]) => `${pos}: ${j.nome}`).join(', ')}. Banco: ${(partidaAtual.banco || []).map(b => b.nome).join(', ') || 'nenhum registrado'}.`
                        : "Nenhuma partida declarada/escalação em campo no momento.";

                    let blocoImagem = imagemAnexada ? `
        📸 ANÁLISE DE PRINT DO JOGO EM ANDAMENTO (MUITO IMPORTANTE): o treinador anexou uma imagem — pode ser o campo térmico (mapa de calor), a tela de estatísticas da partida (posse, finalizações, passes, etc.) ou o placar. Analise a imagem com atenção e cruze com o texto do treinador e a escalação atual.
        - Aponte o que os dados/imagem mostram (ex: time recuado demais, lado sem criação, adversário dominando um setor, jogador sumido do jogo).
        - SEJA HONESTO: se o time estiver bem e os dados não pedirem mudança nenhuma, DIGA CLARAMENTE que está tudo certo e não force uma alteração só por forçar.
        - Se realmente precisar de ajuste, sugira UMA mudança concreta e acionável para AGORA (substituição citando um jogador REAL do elenco ativo — de preferência do banco listado acima —, troca de posicionamento, ou ajuste de instrução), nunca um conselho vago como "melhore a posse de bola".
        - Se recomendar substituição, cite o nome de quem sai e de quem entra usando SOMENTE nomes do elenco ativo listado no contexto.` : '';

                    promptFull = `Atue como ${nomeAuxiliarExibicao()}, o Auxiliar Técnico do "${db[currentSave].nome}".\n${contexto}\n${escalacaoStr}\nHistórico da Conversa:\n${historicoChat}\n
        INSTRUÇÕES:
        Responda à última mensagem do Treinador de forma coerente.
        MUDE SUA PERSONALIDADE: Seja extremamente autêntico, cirúrgico e focado em TÁTICA. Dê respostas profundas sobre esquemas, movimentações e ajustes.
        ${blocoImagem}

        Retorne EXATAMENTE este formato JSON puro:
        {
            "mensagem": "Sua resposta oficial.",
            "opcoes_resposta": ["Opção curta 1", "Opção curta 2"]
        }`;
                }

                let parts = [{ text: promptFull }];
                if (imagemAnexada) parts.push({ inlineData: { mimeType: imagemAnexada.mimeType, data: imagemAnexada.base64 } });

                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: parts }] })
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
    registrarComandoOrcamento(db[currentSave].orcamento, "Verba Extra Liberada pela Diretoria");
    
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

                    // Registra a conversa como um "ajuste" da partida em andamento, pro resumo pós-jogo
                    if (tipo === 'auxiliar' && db[currentSave].partidaAuxiliar && db[currentSave].partidaAuxiliar.status === 'em_andamento') {
                        if (!db[currentSave].partidaAuxiliar.ajustesFeitos) db[currentSave].partidaAuxiliar.ajustesFeitos = [];
                        db[currentSave].partidaAuxiliar.ajustesFeitos.push({ pergunta: texto, resposta: res.mensagem, teveImagem: !!imagemAnexada, quando: Date.now() });
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

        // ============================================================
        // AUXILIAR TÉCNICO — DECLARAR PARTIDA, ESCALAÇÃO, TROCAS E HISTÓRICO
        // ============================================================

        const FORMACOES_SIGLAS = {
            "4-3-3": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOL", "MCD", "MCE", "PD", "PE", "ATA"],
            "4-4-2": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "MD", "MCD", "MCE", "ME", "ATD", "ATE"],
            "3-5-2": ["GOL", "ZAD", "ZAC", "ZAE", "ALD", "VOLD", "VOLE", "ALE", "MEI", "ATD", "ATE"],
            "4-2-3-1": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOLD", "VOLE", "MD", "MEI", "ME", "ATA"],
            "4-1-4-1": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOL", "MD", "MCD", "MCE", "ME", "ATA"],
            "3-4-3": ["GOL", "ZAD", "ZAC", "ZAE", "MD", "MCD", "MCE", "ME", "PD", "ATA", "PE"],
            "5-3-2": ["GOL", "LAD", "ZAD", "ZAC", "ZAE", "LAE", "MCD", "MC", "MCE", "ATD", "ATE"]
        };

        // Monta o resumo textual do elenco ativo (lesão/fadiga/tag de reserva) pra qualquer prompt
        // de IA que precise escalar o time. Sem efeito colateral.
        function montarResumoPlantelIA() {
            let plantelAtivo = db[currentSave].plantel.filter(p => p.status === 'Ativo');
            let plantelStr = plantelAtivo.map(p => {
                let indisponivelStr = "";
                if (p.diasLesao && p.diasLesao > 0) indisponivelStr = " [INDISPONÍVEL: LESIONADO]";
                if (p.suspensoVermelho) indisponivelStr = " [INDISPONÍVEL: SUSPENSO]";

                let condFisica = (typeof condicaoJogador === 'function') ? condicaoJogador(p) : { nivel: 'ok' };
                let fadigaStr = "";
                if (!indisponivelStr) {
                    if (condFisica.nivel === 'critico') fadigaStr = ` [FADIGA CRÍTICA - ${p.jogosSeguidos || 0} jogos seguidos - condição ${Math.round(p.stamina)}% - ROTAÇÃO OBRIGATÓRIA]`;
                    else if (condFisica.nivel === 'risco') fadigaStr = ` [RISCO DE LESÃO - ${p.jogosSeguidos || 0} jogos seguidos - condição ${Math.round(p.stamina)}% - evitar escalar se houver opção]`;
                    else if (condFisica.nivel === 'alerta') fadigaStr = ` [fadiga moderada - condição ${Math.round(p.stamina)}%]`;
                }

                let pJogadas = [];
                db[currentSave].partidas.forEach(partida => {
                    let at = partida.jogadores.find(j => j.nome === p.nome);
                    if (at) pJogadas.push(at.nota);
                });
                let mediaNota = pJogadas.length > 0 ? (pJogadas.reduce((a, b) => a + b, 0) / pJogadas.length).toFixed(1) : "Sem nota";
                return { nome: p.nome, posicao: p.posicao, ovr: p.ovr, aparicoes: pJogadas.length, mediaNota, indisponivelStr, fadigaStr };
            });

            let ovrMedio = plantelStr.reduce((soma, p) => soma + p.ovr, 0) / (plantelStr.length || 1);
            let apMedia = plantelStr.reduce((soma, p) => soma + p.aparicoes, 0) / (plantelStr.length || 1);
            let texto = plantelStr.map(p => {
                let tagReserva = (p.ovr < ovrMedio && p.aparicoes < apMedia) ? " [RESERVA/JOVEM - pouco utilizado]" : "";
                return `[Nome: ${p.nome} | Pos: ${p.posicao} | OVR: ${p.ovr} | Nota Média: ${p.mediaNota}${p.indisponivelStr}${p.fadigaStr}${tagReserva}]`;
            }).join(', ');

            return { texto: texto, formacoesPossiveisStr: JSON.stringify(FORMACOES_SIGLAS) };
        }

        // Bloco de regras compartilhado do "cérebro tático" do Auxiliar.
        function regrasEstrategistaTexto(adv, formacaoSec, estiloJogo, diretriz, diasDescanso) {
            return `
            🧠 SEU PAPEL COMO ESTRATEGISTA (MUITO IMPORTANTE):
            1. DINÂMICA DE FORMAÇÃO: Você DEVE analisar o adversário (${adv}) e o nível do seu time. Se o adversário for muito forte, ou se for um jogo que exige postura diferente, USE A FORMAÇÃO SECUNDÁRIA (${formacaoSec}). Se o time estiver cansado e os reservas encaixarem melhor na Secundária, use-a. Caso a Primária seja superior para o contexto, mantenha-a.
            2. INSTRUÇÕES CIRÚRGICAS: Para CADA jogador, crie uma instrução tática baseada no adversário (${adv}) e no ${estiloJogo}. Exemplo: Se for um time menor, exija pressão na saída deles. Se for um time forte tecnicamente, instrua o volante a fechar a linha de passe e dobrar marcação. NADA DE INSTRUÇÕES GENÉRICAS.
            3. DESCANSO GERAL DO ELENCO (${diasDescanso} dia(s) até este jogo): Se forem 2 dias ou menos, reduza o esforço físico do time como um todo e priorize poupar pontas e laterais (exceto se a Diretriz for Força Total Absoluta).
            4. ROTAÇÃO INTELIGENTE OBRIGATÓRIA (REGRA DE OURO — SIGA À RISCA): jogadores marcados no elenco com [FADIGA CRÍTICA] ou "ROTAÇÃO OBRIGATÓRIA" NÃO PODEM ser escalados, a menos que literalmente não exista NENHUM outro jogador apto para aquela posição — nesse caso, escale mesmo assim, mas deixe isso claro na instrução dele (ex: "Jogando no limite físico por falta de opções no elenco"). Jogadores marcados como [RISCO DE LESÃO] só devem ser escalados se não houver alternativa minimamente aceitável na posição; prefira sempre o jogador saudável, mesmo com OVR menor. A ÚNICA exceção a esta regra é se a Diretriz Estratégica for "Força Total Absoluta" — nesse caso o treinador assume o risco conscientemente e você pode escalar o time ideal mesmo cansado.
            5. CUMPRIMENTO OBRIGATÓRIO DE DIRETRIZ E ESTILO (NÃO É SUGESTÃO, É REGRA): Traduza literalmente o texto da Diretriz e do Estilo de Jogo em ações concretas na escalação:
               - Se mencionar "jovens", "reservas", "dar oportunidade" ou "rodar o elenco": você DEVE escalar preferencialmente jogadores marcados como [RESERVA/JOVEM] acima, nas posições onde eles existirem, mesmo que o OVR seja menor.
               - Se mencionar "explorar laterais", "explorar as pontas" ou "jogar pelos lados": as instruções dos jogadores em LAD/LAE/PD/PE/ALD/ALE DEVEM pedir explicitamente para avançar constantemente, cruzar com frequência e buscar a linha de fundo.
               - Se mencionar qualquer outro pedido específico (ex: "marcação alta", "jogo mais defensivo", "time mais ofensivo"), reflita isso nas instruções individuais de forma clara e verificável, não apenas no estilo geral.
            6. FLEXIBILIDADE POSICIONAL (REGRA CRÍTICA — TIMES REAIS NÃO SÃO ENGESSADOS): você NÃO é obrigado a escalar só quem tem a posição EXATA cadastrada igual à sigla da vaga. Times de verdade improvisam peças o tempo todo.
               - Prefira o jogador da posição exata SE o OVR dele estiver competitivo com o resto do time titular (até uns 6-8 pontos de diferença da média do time que você está montando).
               - Se o(s) único(s) jogador(es) com a posição exata tiver(em) um OVR MUITO abaixo do nível do resto do time (uma quebra gritante), é MELHOR improvisar alguém de posição parecida (ex: um lateral/ala do mesmo lado, uma ponta do lado espelhado, um meio-campista versátil) com OVR mais alto do que forçar o "encaixe perfeito" só na etiqueta. Deixe isso explícito na instrução dele (ex: "Improvisado nesta função — priorize a segurança e a posição, evite arriscar demais").
               - Regra de ouro: NUNCA escale alguém com OVR muito inferior à média do time titular só para "bater a posição exata" quando existir uma alternativa razoável (mesmo que fora de posição) com OVR bem melhor.`;
        }

        // Orquestra qual "estado" da experiência de partida aparece na aba (vazio / declarada / em andamento)
        function renderizarAuxiliarPartida() {
            let partida = db[currentSave].partidaAuxiliar;
            let elVazio = document.getElementById('auxiliar-estado-vazio');
            let elAtiva = document.getElementById('auxiliar-partida-ativa');
            if (!elVazio || !elAtiva) return;

            if (!partida) {
                elVazio.style.display = 'block';
                elAtiva.style.display = 'none';
                renderizarCampinhoLimpo();
                renderizarHistoricoPartidasAuxiliar();
                return;
            }

            elVazio.style.display = 'none';
            elAtiva.style.display = 'block';

            let banner = document.getElementById('auxiliar-banner-partida');
            if (partida.status === 'em_andamento') {
                banner.style.background = 'rgba(226,75,75,0.1)'; banner.style.border = '1px solid var(--danger)';
                banner.innerHTML = `🔴 <strong>AO VIVO:</strong> ${db[currentSave].nome} vs ${partida.adversarioNome} — Formação ${partida.formacaoEscolhida}. Manda print do jogo no chat pra pedir ajuda em tempo real.`;
            } else {
                banner.style.background = 'rgba(232,184,75,0.1)'; banner.style.border = '1px solid var(--primary)';
                banner.innerHTML = `📋 <strong>Partida declarada:</strong> ${db[currentSave].nome} vs ${partida.adversarioNome} — revise a escalação (clique num jogador pra trocar) e clique em Iniciar quando estiver pronto.`;
            }

            let acoes = document.getElementById('auxiliar-acoes-partida');
            if (partida.status === 'declarada') {
                acoes.innerHTML = `
                    <button onclick="iniciarPartidaDeclarada()" style="flex:1; background:var(--primary); color:black; padding:12px;">▶️ Iniciar Partida</button>
                    <button class="btn-hero-secundario" onclick="cancelarPartidaDeclarada()" style="color:var(--danger); border-color:var(--danger);">🗑️ Cancelar</button>`;
            } else {
                acoes.innerHTML = `
                    <button onclick="irRegistrarResultado()" style="flex:1; background:var(--accent); color:white; padding:12px;">🏁 Ir Registrar Resultado no Dashboard</button>
                    <button class="btn-hero-secundario" onclick="cancelarPartidaDeclarada()" style="color:var(--danger); border-color:var(--danger);">🗑️ Descartar Partida</button>`;
            }

            renderizarCampinhoLimpo();
            renderizarHistoricoPartidasAuxiliar();
        }

        function renderizarCampinhoLimpo() {
            let campo = document.getElementById('campo-futebol-ui');
            if (!campo) return;
            campo.innerHTML = '<div class="area-penalti-top"></div><div class="area-penalti-bot"></div>';

            let partida = db[currentSave].partidaAuxiliar;

            let boxAnalise = document.getElementById('auxiliar-analise-ia');
            if (boxAnalise) {
                if (partida && (partida.analiseGeral || partida.adversarioInfo || partida.alertaRotacao)) {
                    boxAnalise.style.display = 'block';
                    boxAnalise.innerHTML = `
                        ${partida.adversarioInfo ? `<p style="margin:0 0 8px 0;"><strong>🔎 Sobre o ${partida.adversarioNome}:</strong> ${partida.adversarioInfo}</p>` : ''}
                        ${partida.analiseGeral ? `<p style="margin:0 0 8px 0;"><strong>🧠 Análise do Auxiliar:</strong> ${partida.analiseGeral}</p>` : ''}
                        ${partida.alertaRotacao ? `<p style="margin:0; color: var(--danger); font-weight:bold;">${partida.alertaRotacao}</p>` : ''}
                    `;
                } else {
                    boxAnalise.style.display = 'none';
                    boxAnalise.innerHTML = '';
                }
            }

            if (partida && partida.formacaoEscolhida && partida.titulares) {
                let positions = coordsFormacoes[partida.formacaoEscolhida];
                if (positions) {
                    for (let posObj of positions) {
                        let jogInfo = partida.titulares[posObj.role];
                        let nomeJogador = jogInfo ? jogInfo.nome : "???";
                        let instrucao = jogInfo ? jogInfo.instrucao : "Sem instrução.";

                        let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes(nomeJogador.toLowerCase().trim()));
                        let txtOvr = jogBD ? `<br><span style="color:#0D1512; background:var(--primary); border-radius:4px; padding:0 3px;">OVR ${jogBD.ovr}</span>` : '';

                        let tooltipHTML = `<div class="jogador-tooltip"><strong>${nomeJogador}</strong><hr style="border-color:var(--border); margin:5px 0;">${instrucao}</div>`;

                        campo.innerHTML += `<div class="jogador-campo" style="top: ${posObj.top}; left: ${posObj.left};" onclick="abrirSeletorTroca('${posObj.role}')">${nomeJogador}${txtOvr}${tooltipHTML}</div>`;
                    }
                }
            }

            let boxBanco = document.getElementById('auxiliar-banco-reservas');
            if (boxBanco) {
                if (partida && Array.isArray(partida.banco) && partida.banco.length > 0) {
                    boxBanco.style.display = 'block';
                    boxBanco.innerHTML = `<h3 style="margin:0 0 12px 0; font-size:15px; color:var(--accent);">🪑 Banco de Reservas</h3>
                        <div class="banco-reservas-grid">
                            ${partida.banco.map(r => {
                                let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes((r.nome || '').toLowerCase().trim()));
                                let txtOvr = jogBD ? ` · OVR ${jogBD.ovr}` : '';
                                return `<div class="banco-reserva-item">
                                    <strong>${r.nome}</strong>
                                    <span>${r.posicao || ''}${txtOvr}</span>
                                    ${r.papel ? `<span class="banco-reserva-papel">${r.papel}</span>` : ''}
                                </div>`;
                            }).join('')}
                        </div>`;
                } else {
                    boxBanco.style.display = 'none';
                    boxBanco.innerHTML = '';
                }
            }
        }

        // --- DECLARAR PARTIDA (scouting do adversário via print) ---

        let imagemAdvEscalacao = null;
        let imagemAdvTatica = null;

        function abrirDeclararPartida() {
            document.getElementById('auxiliar-estado-vazio').style.display = 'none';
            document.getElementById('auxiliar-declarar-partida').style.display = 'block';
            document.getElementById('declarar-adv-nome').value = '';
            removerImagemAdversario('escalacao');
            removerImagemAdversario('tatica');
        }

        function fecharDeclararPartida() {
            document.getElementById('auxiliar-declarar-partida').style.display = 'none';
            renderizarAuxiliarPartida();
        }

        function anexarImagemAdversario(event, tipo) {
            let file = event.target.files[0];
            if (!file) return;
            let reader = new FileReader();
            reader.onload = () => {
                let dados = { base64: reader.result.split(',')[1], mimeType: file.type, nomeArquivo: file.name };
                if (tipo === 'escalacao') imagemAdvEscalacao = dados; else imagemAdvTatica = dados;
                let label = document.getElementById(tipo === 'escalacao' ? 'label-declarar-escalacao' : 'label-declarar-tatica');
                if (label) label.innerHTML = `✅ ${file.name}<input type="file" accept="image/*" style="display:none;" onchange="anexarImagemAdversario(event, '${tipo}')">`;
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }

        function removerImagemAdversario(tipo) {
            if (tipo === 'escalacao') imagemAdvEscalacao = null; else imagemAdvTatica = null;
            let label = document.getElementById(tipo === 'escalacao' ? 'label-declarar-escalacao' : 'label-declarar-tatica');
            if (label) label.innerHTML = `📸 Print: ${tipo === 'escalacao' ? 'Escalação Provável do Adversário' : 'Predefinições Táticas do Adversário'}<input type="file" accept="image/*" style="display:none;" onchange="anexarImagemAdversario(event, '${tipo}')">`;
        }

        async function declararPartidaIA() {
            let nomeAdvManual = document.getElementById('declarar-adv-nome').value.trim();
            let diretriz = document.getElementById('declarar-adv-diretriz').value;
            if (!nomeAdvManual && !imagemAdvEscalacao && !imagemAdvTatica) {
                return alert('Digite o nome do adversário ou anexe pelo menos um print.');
            }

            let formacaoPri = document.getElementById('tatica-primaria').value;
            let formacaoSec = document.getElementById('tatica-secundaria').value;
            let estiloJogo = document.getElementById('tatica-estilo').value;
            let diasDescanso = (db[currentSave] && typeof db[currentSave].descansoAntesProxima === 'number') ? db[currentSave].descansoAntesProxima : 3;

            let btn = document.getElementById('btn-declarar-partida-ia');
            btn.innerText = '⏳ Analisando o adversário e montando o plano...'; btn.disabled = true;

            let plantelInfo = montarResumoPlantelIA();

            let blocoImagens = (imagemAdvEscalacao || imagemAdvTatica) ? `
            📸 IMAGENS ANEXADAS: ${imagemAdvEscalacao ? 'a imagem de escalação mostra o plantel/escalação provável do adversário (formação, jogadores, ratings, posição na liga, últimos resultados). ' : ''}${imagemAdvTatica ? 'a imagem de tática mostra as predefinições táticas do adversário.' : ''}
            Extraia dessas imagens: nome do time (se não foi informado manualmente), formação usada, nível aparente (ratings ATA/MED/DEF se visíveis) e qualquer coisa relevante pra montar um plano contra eles.` : `Não há prints anexados — use apenas o nome informado e seu conhecimento geral para montar um plano razoável.`;

            let promptIA = `Você é ${nomeAuxiliarExibicao()}, o Analista de Desempenho e Estrategista do "${db[currentSave].nome}".

            🆚 ADVERSÁRIO DESTA PARTIDA: ${nomeAdvManual || 'a identificar pela imagem'}
            ${blocoImagens}

            MEU ELENCO: ${plantelInfo.texto}

            FILOSOFIA TÁTICA E OPÇÕES:
            - Formação Primária: ${formacaoPri}
            - Formação Secundária (Alternativa de Ouro): ${formacaoSec}
            - Estilo de Jogo: ${estiloJogo}
            - Diretriz: ${diretriz}

            🏥 BOLETIM DO DEPARTAMENTO MÉDICO (LEIA COM ATENÇÃO): ${(typeof gerarRelatorioMedicoTexto === 'function') ? gerarRelatorioMedicoTexto() : "Sem novidades."}
            ${regrasEstrategistaTexto(nomeAdvManual || 'o adversário', formacaoSec, estiloJogo, diretriz, diasDescanso)}

            REGRAS ABSOLUTAS DO JSON:
            1. Escolha UMA das duas formações (A Primária ou a Secundária) e use EXATAMENTE AS SIGLAS DO SEGUINTE MAPA COMO CHAVES: ${plantelInfo.formacoesPossiveisStr}
            2. NÃO invente siglas (Ex: não crie "MC" se na formação escolhida tiver apenas "MCD" e "MCE").
            3. BANCO DE RESERVAS: monte também até 9 jogadores do elenco ativo que NÃO entraram nos 11 titulares, ordenados por relevância. Para cada um, diga em poucas palavras qual seria o papel dele se entrasse. Não invente jogadores fora da lista do elenco.

            Retorne EXATAMENTE este JSON PURO:
            {
                "adversarioNome": "Nome do time adversário",
                "adversarioInfo": "2-3 frases resumindo o que você percebeu sobre o adversário (formação, nível, pontos fortes/fracos) e como isso influenciou seu plano.",
                "analiseGeral": "2 a 3 frases explicando sua lógica: formação escolhida e por quê, quem foi poupado/priorizado (cite o Departamento Médico se pesou) e o plano tático geral.",
                "formacaoEscolhida": "4-2-3-1",
                "escalacao": {
                    "GOL": {"nome": "Nome do Goleiro", "instrucao": "Instrução tática profunda contra o adversário..."},
                    "LAD": {"nome": "Nome do Lateral", "instrucao": "..."}
                },
                "reservas": [
                    {"nome": "Nome do Jogador", "posicao": "Posição dele no elenco", "papel": "Papel curto se ele entrar"}
                ]
            }`;

            let parts = [{ text: promptIA }];
            if (imagemAdvEscalacao) parts.push({ inlineData: { mimeType: imagemAdvEscalacao.mimeType, data: imagemAdvEscalacao.base64 } });
            if (imagemAdvTatica) parts.push({ inlineData: { mimeType: imagemAdvTatica.mimeType, data: imagemAdvTatica.base64 } });

            try {
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: parts }] })
                });
                const data = await response.json();
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);

                if (match) {
                    let res = JSON.parse(match[0]);
                    let alertaRotacao = (typeof verificarRotacaoEscalacao === 'function') ? verificarRotacaoEscalacao(res.escalacao) : "";

                    db[currentSave].partidaAuxiliar = {
                        id: Date.now(),
                        status: 'declarada',
                        adversarioNome: res.adversarioNome || nomeAdvManual || 'Adversário',
                        adversarioInfo: res.adversarioInfo || '',
                        formacaoEscolhida: res.formacaoEscolhida,
                        titulares: res.escalacao,
                        banco: Array.isArray(res.reservas) ? res.reservas : [],
                        analiseGeral: res.analiseGeral || '',
                        alertaRotacao: alertaRotacao,
                        diretriz: diretriz,
                        ajustesFeitos: [],
                        criadaEm: Date.now()
                    };
                    imagemAdvEscalacao = null; imagemAdvTatica = null;
                    salvarDados();
                    document.getElementById('auxiliar-declarar-partida').style.display = 'none';
                    renderizarAuxiliarPartida();
                } else {
                    alert('Não consegui montar a escalação a partir disso. Tente de novo ou digite o nome do adversário.');
                }
            } catch (e) {
                alert('Erro ao analisar o adversário. Verifique sua conexão e tente novamente.');
            }
            btn.innerText = '🔍 Analisar Adversário e Montar Escalação (IA)'; btn.disabled = false;
        }

        // --- TROCAR JOGADOR NA ESCALAÇÃO (clique no campinho) ---

        function abrirSeletorTroca(role) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !partida.titulares) return;
            let atual = partida.titulares[role];
            let nomeAtual = atual ? atual.nome : null;

            let titularesNomes = Object.values(partida.titulares).map(j => j.nome);
            let bancoNomes = (partida.banco || []).map(b => b.nome);

            let candidatos = db[currentSave].plantel.filter(p => p.status === 'Ativo' && !titularesNomes.includes(p.nome));
            candidatos.sort((a, b) => {
                let aNoBanco = bancoNomes.includes(a.nome) ? 0 : 1;
                let bNoBanco = bancoNomes.includes(b.nome) ? 0 : 1;
                if (aNoBanco !== bNoBanco) return aNoBanco - bNoBanco;
                return b.ovr - a.ovr;
            });

            document.getElementById('modal-trocar-titulo').innerText = `🔄 Trocar ${nomeAtual || 'vaga (' + role + ')'}`;
            document.getElementById('modal-trocar-lista').innerHTML = candidatos.map(p => `
                <div class="trocar-jogador-opcao" onclick="trocarJogadorNoCampo('${role}', '${p.nome.replace(/'/g, "\\'")}')">
                    <strong>${p.nome}</strong>
                    <span>${p.posicao} · OVR ${p.ovr}${bancoNomes.includes(p.nome) ? ' · Banco' : ''}</span>
                </div>`).join('') || '<p style="color:var(--text-muted); text-align:center;">Nenhum outro jogador ativo disponível.</p>';
            document.getElementById('modal-trocar-jogador').style.display = 'flex';
        }

        function trocarJogadorNoCampo(role, novoNome) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;
            let saindo = partida.titulares[role];
            partida.titulares[role] = { nome: novoNome, instrucao: 'Ajuste manual do treinador.' };

            partida.banco = (partida.banco || []).filter(b => b.nome !== novoNome);
            if (saindo && saindo.nome && saindo.nome !== '???') {
                let jogBD = db[currentSave].plantel.find(p => p.nome === saindo.nome);
                partida.banco.unshift({ nome: saindo.nome, posicao: jogBD ? jogBD.posicao : '', papel: 'Saiu da titular — opção no banco' });
            }

            document.getElementById('modal-trocar-jogador').style.display = 'none';
            salvarDados();
            renderizarCampinhoLimpo();
        }

        // --- CICLO DE VIDA DA PARTIDA (iniciar / cancelar / ir registrar) ---

        function iniciarPartidaDeclarada() {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;
            partida.status = 'em_andamento';
            salvarDados();
            renderizarAuxiliarPartida();
        }

        async function cancelarPartidaDeclarada() {
            if (await confirmarModerno('Descartar esta partida declarada? A escalação montada será perdida.', 'Cancelar Partida', { perigo: true, textoConfirmar: 'Descartar' })) {
                db[currentSave].partidaAuxiliar = null;
                salvarDados();
                renderizarAuxiliarPartida();
            }
        }

        function irRegistrarResultado() {
            let partida = db[currentSave].partidaAuxiliar;
            if (partida && partida.adversarioNome) {
                let advInput = document.getElementById('adversario');
                if (advInput) advInput.value = partida.adversarioNome;
            }
            mudarAba('tab-dashboard');
            let formPart = document.getElementById('manual-partida-form');
            if (formPart && formPart.style.display === 'none' && typeof toggleModoVideo === 'function') toggleModoVideo();
        }

        // Chamada pelo salvarPartida() (Dashboard) quando há uma partida declarada em aberto.
        async function finalizarPartidaAuxiliar(golsPro, golsContra, adversarioTexto) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;

            let resultado = golsPro > golsContra ? 'Vitória' : (golsPro < golsContra ? 'Derrota' : 'Empate');
            let nomeAdv = partida.adversarioNome || adversarioTexto || 'o adversário';

            let promptIA = `Você é ${nomeAuxiliarExibicao()}, o Auxiliar Técnico do "${db[currentSave].nome}". A partida contra ${nomeAdv} terminou: ${golsPro} x ${golsContra} (${resultado} para o seu time).
            Seu plano pré-jogo foi: ${partida.analiseGeral || 'sem análise prévia registrada'}.
            ${partida.ajustesFeitos && partida.ajustesFeitos.length > 0 ? `Durante o jogo você deu ${partida.ajustesFeitos.length} orientação(ões) ao treinador: ${partida.ajustesFeitos.map(a => a.resposta).join(' | ')}` : 'Você não precisou dar nenhuma orientação extra durante o jogo — o plano se manteve do início ao fim.'}
            Dê um comentário curto (2-3 frases), honesto e no seu estilo de auxiliar técnico, avaliando como o time e o plano se saíram. Seja específico ao resultado (não genérico) e diga se o plano funcionou ou não.
            Retorne APENAS o texto do comentário puro, sem JSON, sem aspas ao redor.`;

            let textoResumo = '';
            try {
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptIA }] }] })
                });
                const data = await response.json();
                textoResumo = (data.candidates[0].content.parts[0].text || '').trim().replace(/^["']|["']$/g, '');
            } catch (e) {
                textoResumo = resultado === 'Vitória' ? 'Grande resultado, mister! O plano funcionou.' : (resultado === 'Derrota' ? 'Fica a lição, vamos corrigir pro próximo jogo.' : 'Resultado dentro do esperado, dava pra mais.');
            }

            if (!db[currentSave].chatHistory.auxiliar) db[currentSave].chatHistory.auxiliar = [];
            db[currentSave].chatHistory.auxiliar.push({ role: 'ai', text: `📋 Pós-jogo vs ${nomeAdv} (${golsPro}x${golsContra}): ${textoResumo}` });

            if (!db[currentSave].historicoPartidasAuxiliar) db[currentSave].historicoPartidasAuxiliar = [];
            db[currentSave].historicoPartidasAuxiliar.unshift({
                id: partida.id, adversarioNome: nomeAdv, adversarioInfo: partida.adversarioInfo,
                formacaoEscolhida: partida.formacaoEscolhida, titulares: partida.titulares, banco: partida.banco,
                analiseGeral: partida.analiseGeral, ajustesFeitos: partida.ajustesFeitos,
                golsPro: golsPro, golsContra: golsContra, resultado: resultado, resumoPosJogo: textoResumo, finalizadaEm: Date.now()
            });
            if (db[currentSave].historicoPartidasAuxiliar.length > 30) db[currentSave].historicoPartidasAuxiliar.length = 30;

            db[currentSave].partidaAuxiliar = null;
            renderizarChat('auxiliar');
            if (typeof renderizarAuxiliarPartida === 'function') renderizarAuxiliarPartida();
        }

        // --- HISTÓRICO DE PARTIDAS ---

        function renderizarHistoricoPartidasAuxiliar() {
            let container = document.getElementById('auxiliar-historico-partidas');
            if (!container) return;
            let historico = db[currentSave].historicoPartidasAuxiliar || [];
            if (historico.length === 0) {
                container.innerHTML = `<p class="wizard-elenco-vazio">Nenhuma partida registrada ainda pelo Auxiliar.</p>`;
                return;
            }
            container.innerHTML = historico.map((p, idx) => {
                let cor = p.resultado === 'Vitória' ? 'var(--primary)' : (p.resultado === 'Derrota' ? 'var(--danger)' : 'var(--warning)');
                let icone = p.resultado === 'Vitória' ? '✅' : (p.resultado === 'Derrota' ? '❌' : '➖');
                return `
                <div class="historico-partida-card">
                    <div class="historico-partida-header" onclick="toggleHistoricoPartida(${idx})">
                        <span style="color:${cor}; font-weight:bold; font-size:16px;">${icone} ${p.golsPro} x ${p.golsContra}</span>
                        <strong>vs ${p.adversarioNome || 'Adversário'}</strong>
                        <span style="color:var(--text-muted); font-size:12px;">${p.formacaoEscolhida || ''}</span>
                    </div>
                    <div class="historico-partida-detalhes" id="historico-detalhe-${idx}" style="display:none;">
                        ${p.adversarioInfo ? `<p><strong>Sobre o adversário:</strong> ${p.adversarioInfo}</p>` : ''}
                        ${p.resumoPosJogo ? `<p><strong>Avaliação pós-jogo:</strong> ${p.resumoPosJogo}</p>` : ''}
                        <div class="historico-titulares-grid">
                            <div><strong>Titulares</strong>${Object.entries(p.titulares || {}).map(([pos, j]) => `<div>${pos}: ${j.nome}</div>`).join('') || '<div>-</div>'}</div>
                            <div><strong>Banco</strong>${(p.banco || []).map(r => `<div>${r.nome}</div>`).join('') || '<div>-</div>'}</div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        function toggleHistoricoPartida(idx) {
            let el = document.getElementById('historico-detalhe-' + idx);
            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
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

async function apagarChat(tipo) {
            if (await confirmarModerno(`Tem certeza que deseja apagar o histórico desta conversa?`, "Apagar Conversa", { perigo: true, textoConfirmar: "Apagar" })) {
                db[currentSave].chatHistory[tipo] = [];
                // Se for diretoria ou auxiliar, reseta também o contador de notícias lidas para reavaliar se precisar
                if (tipo === 'diretoria') db[currentSave].chatHistory.noticiasLidasDir = 0;
                if (tipo === 'auxiliar') db[currentSave].chatHistory.noticiasLidasAux = 0;
                salvarDados();
                renderizarChat(tipo);
            }
        }

        async function apagarNoticia(index) {
            if (await confirmarModerno("Deseja apagar esta notícia do feed?", "Apagar Notícia", { perigo: true, textoConfirmar: "Apagar" })) {
                db[currentSave].noticiasFeed.splice(index, 1);
                salvarDados();
                renderizarNoticiasFeed();
            }
        }

