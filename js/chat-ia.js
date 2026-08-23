        // Prints anexados ao chat do Auxiliar (estatísticas, campo térmico, desempenho individual da partida em andamento)
        let imagensAnexadasAuxiliar = []; // [{ base64, mimeType, nomeArquivo }]

        function anexarImagemAuxiliar(event) {
            let files = Array.from(event.target.files || []);
            if (!files.length) return;
            files.forEach(file => {
                let reader = new FileReader();
                reader.onload = () => {
                    imagensAnexadasAuxiliar.push({ base64: reader.result.split(',')[1], mimeType: file.type, nomeArquivo: file.name });
                    renderizarPreviewImagensAuxiliar();
                };
                reader.readAsDataURL(file);
            });
            event.target.value = '';
        }

        function renderizarPreviewImagensAuxiliar() {
            let preview = document.getElementById('auxiliar-imagem-preview');
            if (!preview) return;
            if (imagensAnexadasAuxiliar.length === 0) {
                preview.style.display = 'none';
                preview.innerHTML = '';
                return;
            }
            preview.style.display = 'flex';
            preview.innerHTML = imagensAnexadasAuxiliar.map((img, idx) => `
                <span class="chip-imagem-anexada">📎 ${img.nomeArquivo} <button onclick="removerImagemAuxiliar(${idx})">✖</button></span>
            `).join('') + `<span style="color:var(--text-muted);">descreva o que está acontecendo e mande</span>`;
        }

        function removerImagemAuxiliar(idx) {
            if (idx === undefined) imagensAnexadasAuxiliar = [];
            else imagensAnexadasAuxiliar.splice(idx, 1);
            renderizarPreviewImagensAuxiliar();
        }

        // =====================================================================================
        // LEITURA DEFENSIVA DA RESPOSTA DA IA
        // =====================================================================================
        // A IA devolve texto livre com um JSON no meio, e nem sempre do jeito combinado: às vezes
        // embrulha em ```json, às vezes escreve um comentário depois (que pode conter chaves), às
        // vezes o Worker devolve erro e nem existe "candidates", às vezes o filtro de conteúdo
        // bloqueia e vem um candidato vazio. Antes, qualquer um desses casos estourava e o chat
        // dizia "Conexão interrompida" — escondendo o motivo real e jogando a resposta fora.

        // Puxa o texto da resposta sem confiar no formato. Quando não dá, lança um erro que EXPLICA
        // o que houve, pra mensagem chegar ao treinador em vez de virar "sem conexão".
        function textoDaRespostaIA(data) {
            if (!data || typeof data !== 'object') throw new Error('A IA não respondeu nada.');
            if (data.error) throw new Error(`A IA recusou a consulta (${data.error.message || data.error.code || 'erro desconhecido'}).`);

            let candidato = Array.isArray(data.candidates) ? data.candidates[0] : null;
            if (!candidato) throw new Error('A IA respondeu sem conteúdo nenhum. Tente mandar de novo.');

            let partes = (candidato.content && Array.isArray(candidato.content.parts)) ? candidato.content.parts : [];
            let texto = partes.map(p => (p && typeof p.text === 'string') ? p.text : '').join('').trim();
            if (texto) return texto;

            // finishReason costuma dizer o porquê: SAFETY (filtro), MAX_TOKENS (cortou), etc.
            let motivo = candidato.finishReason;
            if (motivo === 'SAFETY') throw new Error('A IA bloqueou essa resposta por filtro de conteúdo. Tente reescrever a mensagem.');
            if (motivo === 'MAX_TOKENS') throw new Error('A resposta da IA ficou longa demais e foi cortada. Tente uma pergunta mais curta.');
            throw new Error(`A IA respondeu vazio${motivo ? ` (${motivo})` : ''}. Tente mandar de novo.`);
        }

        // Acha o primeiro objeto JSON COMPLETO do texto, contando chaves e ignorando as que estão
        // dentro de strings. O jeito antigo (uma regex gulosa do primeiro "{" até o ÚLTIMO "}")
        // grudava o JSON com qualquer comentário que viesse depois e o JSON.parse estourava —
        // exatamente o que acontece quando a IA escreve algo como:
        //   {"mensagem": "..."}  Obs: o formato {jogadorSai, jogadorEntra} não se aplica agora.
        // Isso ficou muito mais frequente com o time em campo, porque aí o prompt pede os objetos
        // de sugestão de substituição/formação e a IA tende a comentá-los fora do JSON.
        function extrairJsonDaResposta(rawText) {
            if (typeof rawText !== 'string') return null;
            let texto = rawText.replace(/```(?:json)?/gi, ''); // tira a cerca de markdown

            let inicio = texto.indexOf('{');
            while (inicio !== -1) {
                let profundidade = 0, dentroDeString = false, escapando = false;
                for (let i = inicio; i < texto.length; i++) {
                    let c = texto[i];
                    if (escapando) { escapando = false; continue; }
                    if (c === '\\') { escapando = true; continue; }
                    if (c === '"') { dentroDeString = !dentroDeString; continue; }
                    if (dentroDeString) continue;
                    if (c === '{') profundidade++;
                    else if (c === '}' && --profundidade === 0) {
                        try { return JSON.parse(texto.slice(inicio, i + 1)); } catch (e) { break; }
                    }
                }
                inicio = texto.indexOf('{', inicio + 1); // esse não fechou ou não era válido: tenta o próximo
            }
            return null;
        }

        // Traduz a falha da chamada à IA numa frase útil. chamarIA() já lança textos explicativos
        // (sessão expirada, limite de consultas) — o que não pode é trocá-los por "sem conexão".
        function mensagemErroIA(e) {
            let msg = (e && e.message) ? e.message : String(e || '');
            if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
                return 'Sem conexão com o servidor da IA agora. Confira a internet e tente de novo.';
            }
            return msg || 'Não foi possível falar com a IA agora. Tente de novo.';
        }

        async function enviarChat(tipo) {
            let inputEl = document.getElementById(`input-${tipo}`);
            let texto = inputEl.value.trim();
            let imagensAnexadas = (tipo === 'auxiliar') ? imagensAnexadasAuxiliar.slice() : [];
            if(!texto && imagensAnexadas.length === 0) return;
            if(!texto) texto = imagensAnexadas.length > 1 ? "📸 (prints do jogo anexados, sem mensagem)" : "📸 (print do jogo anexado, sem mensagem)";

            inputEl.value = '';
            let history = db[currentSave].chatHistory[tipo]; if(!history) history = [];
            history.push({ role: 'user', text: imagensAnexadas.length > 0 ? `📸 ${texto}` : texto });
            let quickContainer = document.getElementById(`quick-${tipo}`);
            if(quickContainer) quickContainer.innerHTML = '';
            renderizarChat(tipo);
            removerImagemAuxiliar();

            try {
                let contexto = gerarResumoContexto();
                let historicoChat = history.map(h => `${h.role === 'user' ? 'Treinador' : tipo}: ${h.text || ''}`).join('\n');

                let promptFull = "";

                if (tipo === 'diretoria') {
                    // Mapeamento Dinâmico do Perfil da IA baseado na Nota
                    let notaDir = db[currentSave].notaDiretoria;
                    let perfilDir = "";
                    if (notaDir >= 80) perfilDir = "Você está dócil, prestativa e confia plenamente no treinador. Pode oferecer pequenos bônus financeiros se ele argumentar muito bem.";
                    else if (notaDir >= 50) perfilDir = "Você é estritamente profissional, pragmática e foca apenas nos números, resultados e planilhas.";
                    else perfilDir = "CRISE! Você está rude, impaciente e ameaçadora. O clima é de profunda insatisfação e demissão iminente.";

                    promptFull = `Atue como ${nomeDiretorExibicao()}, o(a) Diretor(a) Executivo(a) do clube "${db[currentSave].nome}".\n${contexto}\nHistórico da Conversa:\n${historicoChat}\n
        INSTRUÇÕES DA DIRETORIA E REGRAS DE NEGÓCIO:
        1. PERSONALIDADE ATUAL (Sua Nota de Prestígio é ${Math.round(notaDir)}/100): ${perfilDir}
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
                        ? `Partida ${partidaAtual.status === 'em_andamento' ? 'EM ANDAMENTO' : 'declarada'} contra ${partidaAtual.adversarioNome}. Formação atual em campo: ${partidaAtual.formacaoEscolhida}. Titulares (sigla da posição no campo: nome): ${Object.entries(partidaAtual.titulares).map(([pos, j]) => `${pos}: ${j.nome}`).join(', ')}. Banco (nome e posição real do jogador): ${(partidaAtual.banco || []).map(b => { let jogBD = db[currentSave].plantel.find(p => p.nome === b.nome); let posTxt = (jogBD ? jogBD.posicao : b.posicao) || 'posição desconhecida'; return `${b.nome} (${posTxt})`; }).join(', ') || 'nenhum registrado'}.${(partidaAtual.jogadoresForaDaPartida && partidaAtual.jogadoresForaDaPartida.length > 0) ? ` JÁ SAÍRAM DA PARTIDA E NÃO PODEM MAIS ENTRAR: ${partidaAtual.jogadoresForaDaPartida.join(', ')}.` : ''}`
                        : "Nenhuma partida declarada/escalação em campo no momento.";

                    let jogoAoVivo = partidaAtual && partidaAtual.status === 'em_andamento';
                    let subsUsadas = jogoAoVivo ? ((partidaAtual.substituicoes || []).length) : 0;
                    let subsRestantes = Math.max(0, 5 - subsUsadas);

                    let blocoImagem = imagensAnexadas.length > 0 ? `
        📸 ANÁLISE DE ${imagensAnexadas.length > 1 ? `${imagensAnexadas.length} PRINTS` : 'PRINT'} DO JOGO EM ANDAMENTO (MUITO IMPORTANTE): o treinador anexou ${imagensAnexadas.length > 1 ? 'imagens' : 'uma imagem'} — pode ser o campo térmico (mapa de calor), a tela de estatísticas da partida (posse, finalizações, passes, etc.) ou o desempenho individual de um jogador. Analise ${imagensAnexadas.length > 1 ? 'todas as imagens' : 'a imagem'} com atenção e cruze com o texto do treinador e a escalação atual.
        - Aponte o que os dados/imagem mostram (ex: time recuado demais, lado sem criação, adversário dominando um setor, jogador sumido do jogo).
        - SEJA HONESTO: se o time estiver bem e os dados não pedirem mudança nenhuma, DIGA CLARAMENTE que está tudo certo e não force uma alteração só por forçar.` : '';

                    let taticaBaseChat = (typeof taticaDoSave === 'function') ? taticaDoSave() : null;
                    let formacoesPreferidasChat = (taticaBaseChat && Array.isArray(taticaBaseChat.formacoesPreferidas) && taticaBaseChat.formacoesPreferidas.length)
                        ? taticaBaseChat.formacoesPreferidas.filter(f => coordsFormacoes[f])
                        : Object.keys(coordsFormacoes);
                    if (!formacoesPreferidasChat.length) formacoesPreferidasChat = Object.keys(coordsFormacoes);

                    let blocoSubstituicao = jogoAoVivo ? `
        🔄 SUBSTITUIÇÕES: já foram usadas ${subsUsadas} de 5 substituições permitidas nesta partida (restam ${subsRestantes}).
        - Se o contexto (texto e/ou imagem) pedir claramente uma substituição e ainda houver substituições disponíveis, preencha o campo "sugestaoSubstituicao" do JSON com um jogador REAL que sai (titular atual) e um jogador REAL que entra (de preferência do banco listado acima), citando os nomes EXATAMENTE como aparecem no contexto, mais uma instrução tática curta pro jogador que entra.
        - FAÇA SENTIDO POSICIONAL (REGRA CRÍTICA): "jogadorEntra" DEVE jogar numa posição compatível com a vaga de quem está saindo — use a posição indicada entre parênteses no Banco acima e a sigla/posição de quem sai pra escolher alguém coerente (ex: não tire um zagueiro pra colocar um atacante, não tire um lateral pra colocar um volante puro). Só foja disso se for uma mudança tática deliberada e MUITO clara pelo pedido do treinador — e nesse caso explique bem o motivo na instrução.
        - Ao escolher entre mais de uma opção coerente no banco, prefira quem estiver rendendo melhor recentemente (nota em campo), não só o de OVR mais alto — se você não souber a nota de cada reserva, baseie-se no contexto e na condição física deles.
        - Se não houver mais substituições disponíveis (restam 0), NÃO sugira substituição — dê apenas orientação tática/posicional.
        - Se a situação não pedir substituição nenhuma, deixe "sugestaoSubstituicao" como null. Não sugira trocas só por sugerir.
        - SE você sugerir substituição JUNTO com uma mudança de formação (ambos os campos preenchidos na mesma resposta), pense primeiro em qual vaga da FORMAÇÃO NOVA o jogador que entra vai ocupar — "jogadorSai" tem que ser o titular que, depois de aplicada a formação nova, fica na posição que o jogador que entra pode substituir. Nunca pense a substituição em cima da formação antiga quando as duas mudanças vêm juntas.

        🔄 MUDANÇA DE FORMAÇÃO: você também pode sugerir mudar a formação inteira do time (não gasta substituição, os mesmos 11 jogadores em campo só mudam de esquema). Se a leitura do jogo pedir isso claramente (ex: time sendo dominado no meio, precisa de mais gente na frente, etc), preencha "sugestaoFormacao" com uma formação DIFERENTE da atual (${partidaAtual.formacaoEscolhida}), escolhida EXATAMENTE entre as formações preferidas do treinador: ${formacoesPreferidasChat.join(', ')}. Nunca sugira uma formação fora dessa lista. Caso contrário deixe "sugestaoFormacao" como null. Não sugira isso à toa — é uma mudança grande.` : '';

                    promptFull = `Atue como ${nomeAuxiliarExibicao()}, o Auxiliar Técnico do "${db[currentSave].nome}".\n${contexto}\n${escalacaoStr}\nHistórico da Conversa:\n${historicoChat}\n
        INSTRUÇÕES:
        Responda à última mensagem do Treinador de forma coerente.
        MUDE SUA PERSONALIDADE: Seja extremamente autêntico, cirúrgico e focado em TÁTICA. Dê respostas profundas sobre esquemas, movimentações e ajustes.
        ${blocoImagem}
        ${blocoSubstituicao}

        Retorne EXATAMENTE este formato JSON puro:
        {
            "mensagem": "Sua resposta oficial.",
            "opcoes_resposta": ["Opção curta 1", "Opção curta 2"],
            "sugestaoSubstituicao": null,
            "sugestaoFormacao": null
        }
        Caso sugira substituição, "sugestaoSubstituicao" deve ser um objeto exatamente assim: {"jogadorSai": "Nome Exato", "jogadorEntra": "Nome Exato", "instrucao": "Instrução tática curta pro jogador que entra"}
        Caso sugira mudança de formação, "sugestaoFormacao" deve ser um objeto exatamente assim: {"novaFormacao": "4-3-3", "motivo": "1 frase justificando a mudança"}`;
                }

                let parts = [{ text: promptFull }];
                imagensAnexadas.forEach(img => parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));

                // A conversa COM a IA fica no seu próprio try: assim uma falha de rede/cota não é
                // confundida com um erro nosso ao montar ou processar a resposta (e vice-versa).
                let rawText;
                try {
                    const data = await chamarIA({ contents: [{ parts: parts }] });
                    rawText = textoDaRespostaIA(data);
                } catch (e) {
                    history.push({ role: 'ai', text: '⚠️ ' + mensagemErroIA(e) });
                    db[currentSave].chatHistory[tipo] = history; salvarDados(); renderizarChat(tipo);
                    return;
                }

                let res = extrairJsonDaResposta(rawText);
                if (res) {
                    let sugestaoSub = null;
                    if (tipo === 'auxiliar' && res.sugestaoSubstituicao && res.sugestaoSubstituicao.jogadorSai && res.sugestaoSubstituicao.jogadorEntra) {
                        sugestaoSub = { jogadorSai: res.sugestaoSubstituicao.jogadorSai, jogadorEntra: res.sugestaoSubstituicao.jogadorEntra, instrucao: res.sugestaoSubstituicao.instrucao || '', status: 'pendente' };
                    }
                    let sugestaoFormacao = null;
                    if (tipo === 'auxiliar' && res.sugestaoFormacao && res.sugestaoFormacao.novaFormacao
                        && (formacoesPreferidasChat || []).includes(res.sugestaoFormacao.novaFormacao)) {
                        sugestaoFormacao = { novaFormacao: res.sugestaoFormacao.novaFormacao, motivo: res.sugestaoFormacao.motivo || '', status: 'pendente' };
                    }
                    // Sem texto, a mensagem entraria no histórico com text undefined — e aí
                    // renderizarChat quebrava em TODA renderização seguinte, deixando o chat
                    // inutilizável pro resto do save. Se a IA esqueceu o campo, usa o texto cru.
                    let textoMensagem = (typeof res.mensagem === 'string' && res.mensagem.trim()) ? res.mensagem : rawText;
                    history.push({ role: 'ai', text: textoMensagem, sugestaoSub: sugestaoSub, sugestaoFormacao: sugestaoFormacao });

                    if(quickContainer && Array.isArray(res.opcoes_resposta)) {
                        quickContainer.innerHTML = res.opcoes_resposta.map(op => String(op)).map(op => `<button class="btn-quick" onclick="usarQuickReply('${op.replace(/'/g, "\\'")}', 'input-${tipo}', 'enviarChat${tipo.charAt(0).toUpperCase() + tipo.slice(1)}')">${op}</button>`).join('');
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
                        db[currentSave].partidaAuxiliar.ajustesFeitos.push({ pergunta: texto, resposta: textoMensagem, teveImagem: imagensAnexadas.length > 0, quando: Date.now() });
                    }
                } else {
                    // A IA respondeu, só que fora do formato combinado. Mostrar o texto dela é
                    // melhor do que descartar a resposta inteira e alegar queda de conexão.
                    history.push({ role: 'ai', text: rawText });
                }
                db[currentSave].chatHistory[tipo] = history; salvarDados(); renderizarChat(tipo);
            } catch(e) {
                // Se caiu aqui, a falha foi NOSSA (montar o prompt, processar a resposta, salvar) —
                // não da conexão. Diz o que houve em vez de culpar a internet do treinador.
                console.error('Erro ao processar a conversa do chat:', e);
                history.push({ role: 'ai', text: '⚠️ Não consegui processar essa resposta. Detalhe: ' + ((e && e.message) ? e.message : e) });
                try { db[currentSave].chatHistory[tipo] = history; salvarDados(); } catch (e2) { console.error('Falha ao salvar o chat:', e2); }
                renderizarChat(tipo);
            }
        }

        function renderizarChat(tipo) {
            let log = document.getElementById(`chat-log-${tipo}`);
            if(!log) return;
            let history = db[currentSave].chatHistory[tipo] || [];

            log.innerHTML = history.map((h, idx) => {
                // Nunca confiar que h.text é string: uma resposta antiga da IA sem o campo
                // "mensagem" gravou text undefined no save, e o .replace abaixo estourava em toda
                // renderização — o chat ficava travado pra sempre, mesmo recarregando a página.
                // Tratar aqui conserta os saves que já foram atingidos por isso.
                let texto = (typeof h.text === 'string') ? h.text : (h.text == null ? '' : String(h.text));
                let btnOuvir = (h.role === 'ai' && texto) ? `<button class="btn-audio" onclick="lerTexto('${texto.replace(/'/g, "\\'")}')">🔊</button>` : '';
                let cardSub = (tipo === 'auxiliar' && h.sugestaoSub) ? renderizarCardSugestaoSub(h.sugestaoSub, idx) : '';
                let cardFormacao = (tipo === 'auxiliar' && h.sugestaoFormacao) ? renderizarCardSugestaoFormacao(h.sugestaoFormacao, idx) : '';
                return `<div class="chat-msg ${h.role === 'user' ? 'msg-user' : 'msg-ai'}">${texto || '<i style="color:var(--text-muted)">(mensagem vazia)</i>'}${btnOuvir}${cardSub}${cardFormacao}</div>`;
            }).join('');
            log.scrollTop = log.scrollHeight;
        }

        // Card de sugestão de substituição embutido numa mensagem do Auxiliar (confirmar / trocar / rejeitar)
        function renderizarCardSugestaoSub(sug, idx) {
            if (sug.status === 'confirmada') {
                return `<div class="sugestao-sub-card sugestao-sub-resolvida sugestao-sub-ok">✅ Substituição confirmada: <strong>${sug.jogadorEntra}</strong> entrou no lugar de <strong>${sug.jogadorSai}</strong> aos ${sug.minutoConfirmado}'.</div>`;
            }
            if (sug.status === 'rejeitada') {
                return `<div class="sugestao-sub-card sugestao-sub-resolvida">✖️ Sugestão não aplicada pelo treinador.</div>`;
            }
            let partida = db[currentSave].partidaAuxiliar;
            let subsUsadas = (partida && partida.status === 'em_andamento') ? (partida.substituicoes || []).length : 5;
            if (!partida || partida.status !== 'em_andamento') {
                return `<div class="sugestao-sub-card sugestao-sub-resolvida">⏸️ Partida não está mais ao vivo.</div>`;
            }
            if (subsUsadas >= 5) {
                return `<div class="sugestao-sub-card sugestao-sub-resolvida">🚫 Limite de 5 substituições já atingido nesta partida.</div>`;
            }
            return `<div class="sugestao-sub-card">
                <div class="ssc-titulo">🔄 Sugestão de Substituição (${subsUsadas}/5 usadas)</div>
                <div class="ssc-troca"><span class="ssc-sai">🔴 ${sug.jogadorSai}</span><span class="ssc-seta">→</span><span class="ssc-entra">🟢 ${sug.jogadorEntra}</span></div>
                ${sug.instrucao ? `<div class="ssc-instrucao">${sug.instrucao}</div>` : ''}
                <div class="ssc-acoes">
                    <button class="btn-ssc-confirmar" onclick="confirmarSugestaoSub(${idx})">✅ Confirmar</button>
                    <button class="btn-ssc-alterar" onclick="alterarSugestaoSub(${idx})">✏️ Trocar quem sai</button>
                    <button class="btn-ssc-rejeitar" onclick="rejeitarSugestaoSub(${idx})">✖️ Não confirmo</button>
                </div>
            </div>`;
        }

        // Card de sugestão de mudança de formação embutido numa mensagem do Auxiliar (aplicar / rejeitar)
        function renderizarCardSugestaoFormacao(sug, idx) {
            if (sug.status === 'confirmada') {
                return `<div class="sugestao-sub-card sugestao-sub-resolvida sugestao-sub-ok">✅ Formação alterada para <strong>${sug.novaFormacao}</strong>.</div>`;
            }
            if (sug.status === 'rejeitada') {
                return `<div class="sugestao-sub-card sugestao-sub-resolvida">✖️ Sugestão de formação não aplicada.</div>`;
            }
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || partida.status !== 'em_andamento') {
                return `<div class="sugestao-sub-card sugestao-sub-resolvida">⏸️ Partida não está mais ao vivo.</div>`;
            }
            return `<div class="sugestao-sub-card">
                <div class="ssc-titulo">🔄 Sugestão de Mudança de Formação</div>
                <div class="ssc-troca"><span class="ssc-sai">${partida.formacaoEscolhida}</span><span class="ssc-seta">→</span><span class="ssc-entra">${sug.novaFormacao}</span></div>
                ${sug.motivo ? `<div class="ssc-instrucao">${sug.motivo}</div>` : ''}
                <div class="ssc-acoes">
                    <button class="btn-ssc-confirmar" onclick="confirmarSugestaoFormacao(${idx})">✅ Aplicar</button>
                    <button class="btn-ssc-rejeitar" onclick="rejeitarSugestaoFormacao(${idx})">✖️ Não confirmo</button>
                </div>
            </div>`;
        }

        function confirmarSugestaoFormacao(idx) {
            let history = db[currentSave].chatHistory.auxiliar;
            let msg = history && history[idx];
            if (!msg || !msg.sugestaoFormacao || msg.sugestaoFormacao.status !== 'pendente') return;
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || partida.status !== 'em_andamento') { renderizarChat('auxiliar'); return; }

            let ok = aplicarNovaFormacao(msg.sugestaoFormacao.novaFormacao);
            if (!ok) { alert('Não foi possível aplicar essa formação.'); return; }
            msg.sugestaoFormacao.status = 'confirmada';
            salvarDados();
            renderizarCampinhoLimpo();
            renderizarChat('auxiliar');
        }

        function rejeitarSugestaoFormacao(idx) {
            let history = db[currentSave].chatHistory.auxiliar;
            let msg = history && history[idx];
            if (!msg || !msg.sugestaoFormacao || msg.sugestaoFormacao.status !== 'pendente') return;
            msg.sugestaoFormacao.status = 'rejeitada';
            salvarDados();
            renderizarChat('auxiliar');
        }

        async function confirmarSugestaoSub(idx) {
            let history = db[currentSave].chatHistory.auxiliar;
            let msg = history && history[idx];
            if (!msg || !msg.sugestaoSub || msg.sugestaoSub.status !== 'pendente') return;
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || partida.status !== 'em_andamento') { alert('A partida não está mais ao vivo.'); renderizarChat('auxiliar'); return; }
            if ((partida.substituicoes || []).length >= 5) { alert('Limite de 5 substituições já atingido nesta partida.'); renderizarChat('auxiliar'); return; }

            // Se essa mesma mensagem também trouxe uma mudança de formação ainda não aplicada, ela
            // TEM que entrar primeiro — senão o jogador que vai entrar cai numa posição pensada pra
            // formação antiga, e não pra formação nova que o Auxiliar quis colocar junto.
            if (msg.sugestaoFormacao && msg.sugestaoFormacao.status === 'pendente') {
                let okFormacao = aplicarNovaFormacao(msg.sugestaoFormacao.novaFormacao);
                if (okFormacao) msg.sugestaoFormacao.status = 'confirmada';
            }

            let sug = msg.sugestaoSub;
            let roleSai = Object.keys(partida.titulares).find(r => partida.titulares[r].nome === sug.jogadorSai);
            if (!roleSai) { alert(`${sug.jogadorSai} não está mais em campo — essa sugestão ficou desatualizada.`); return; }
            let jaEmCampo = Object.values(partida.titulares).some(j => j.nome === sug.jogadorEntra);
            if (jaEmCampo) { alert(`${sug.jogadorEntra} já está em campo.`); return; }
            if ((partida.jogadoresForaDaPartida || []).includes(sug.jogadorEntra)) { alert(`${sug.jogadorEntra} já saiu da partida antes e não pode voltar.`); return; }

            let minutoStr = await promptModerno(`Em que minuto ${sug.jogadorEntra} entrou em campo?`, '', '⏱️ Minuto da Substituição');
            if (minutoStr === null) return;
            let minuto = parseInt(minutoStr, 10);
            if (isNaN(minuto) || minuto < 0 || minuto > 130) { alert('Digite um minuto válido (0 a 130).'); return; }

            let ok = efetivarSubstituicao(roleSai, sug.jogadorEntra, minuto, sug.instrucao);
            if (!ok) { alert('Não foi possível confirmar essa substituição.'); return; }

            sug.status = 'confirmada';
            sug.minutoConfirmado = minuto;

            salvarDados();
            renderizarCampinhoLimpo();
            renderizarChat('auxiliar');
        }

        function rejeitarSugestaoSub(idx) {
            let history = db[currentSave].chatHistory.auxiliar;
            let msg = history && history[idx];
            if (!msg || !msg.sugestaoSub || msg.sugestaoSub.status !== 'pendente') return;
            msg.sugestaoSub.status = 'rejeitada';
            salvarDados();
            renderizarChat('auxiliar');
        }

        function alterarSugestaoSub(idx) {
            let history = db[currentSave].chatHistory.auxiliar;
            let msg = history && history[idx];
            if (!msg || !msg.sugestaoSub || msg.sugestaoSub.status !== 'pendente') return;
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !partida.titulares) return;

            let opcoes = Object.values(partida.titulares)
                .filter(j => j.nome && j.nome !== msg.sugestaoSub.jogadorEntra)
                .map(j => {
                    let jogBD = db[currentSave].plantel.find(p => p.nome === j.nome);
                    return { nome: j.nome, posicao: jogBD ? jogBD.posicao : '', ovr: jogBD ? jogBD.ovr : '?', onSelect: () => {
                        msg.sugestaoSub.jogadorSai = j.nome;
                        salvarDados();
                        renderizarChat('auxiliar');
                    } };
                });

            abrirModalTroca(opcoes, [], `Quem sai no lugar de ${msg.sugestaoSub.jogadorSai}?`, `${msg.sugestaoSub.jogadorEntra} vai entrar — escolha quem realmente sai de campo.`);
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
            // Na seleção, só entram jogadores efetivamente convocados na última leitura da lista
            // de convocação (ver js/convocacao.js) — o resto do elenco fica de fora da escalação,
            // mesmo continuando no plantel com o histórico intacto.
            let plantelAtivo = db[currentSave].plantel.filter(p => p.status === 'Ativo' && (currentSave !== 'selecao' || p.convocado !== false));
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
            6. FLEXIBILIDADE POSICIONAL (REGRA CRÍTICA — SIGA EXATAMENTE ESTA TABELA, NÃO INVENTE OUTRAS IMPROVISAÇÕES): você NÃO é obrigado a escalar só quem tem a posição EXATA cadastrada igual à sigla da vaga. Cada função do campinho abaixo aceita as posições de carteirinha listadas — e SOMENTE essas, nenhuma outra combinação é válida:
${textoRegrasCompatibilidadePosicional()}
               - Prefira o jogador da posição exata SE o OVR dele estiver competitivo com o resto do time titular (até uns 6-8 pontos de diferença da média do time que você está montando).
               - Se o(s) único(s) jogador(es) com a posição exata tiver(em) um OVR MUITO abaixo do nível do resto do time (uma quebra gritante), é MELHOR escalar alguém de posição compatível (segundo a tabela acima) com OVR mais alto do que forçar o "encaixe perfeito" só na etiqueta. Deixe isso explícito na instrução dele (ex: "Improvisado nesta função — priorize a segurança e a posição, evite arriscar demais").
               - Regra de ouro: NUNCA escale alguém com OVR muito inferior à média do time titular só para "bater a posição exata" quando existir uma alternativa compatível (pela tabela acima) com OVR bem melhor.
            7. DESEMPENHO EM CAMPO PESA MAIS QUE O OVR (REGRA CRÍTICA — NÃO IGNORE): cada jogador do elenco acima traz a "Nota Média" dele nas partidas que já disputou ("Sem nota" = ainda não tem amostra suficiente, baseie-se só no OVR nesse caso). OVR é só potencial no papel — quem decide jogos é quem está rendendo bem em campo. Quando dois jogadores concorrerem à mesma posição, NÃO escale automaticamente o de OVR mais alto: compare também a Nota Média deles. Se o jogador de OVR menor tiver uma Nota Média visivelmente melhor (e baseada em pelo menos 3 jogos), ELE deve ser o titular, mesmo tendo alguns pontos de OVR a menos — desempenho recente e consistente em campo vale mais que o número de OVR. Só desconsidere a nota se a amostra for muito pequena (1-2 jogos) ou muito antiga/desatualizada.
            8. ESCOLHA DE JOGADORES CONSIDERANDO O ADVERSÁRIO (não é só a instrução — é QUEM joga): além das instruções táticas, a própria ESCOLHA de quem entra em campo deve mudar de acordo com o adversário (${adv}). Ex: contra um time que ataca muito pelas pontas/aposta em velocidade, priorize laterais e zagueiros mais rápidos e seguros defensivamente nesse lado, mesmo abrindo mão de um pouco de OVR. Contra um time forte fisicamente ou que usa muito jogo aéreo, priorize zagueiros/volantes fortes no desarme e no jogo aéreo. Contra um time que se fecha atrás e joga recuado, priorize criatividade, drible e habilidade em espaços curtos no ataque/meio. Baseie-se no que você souber sobre o estilo do adversário (da análise/imagens) para embasar essas escolhas, não só as instruções.
            9. APRENDA COM O HISTÓRICO (se houver um bloco de histórico de partidas anteriores no prompt): leve em conta o que já funcionou e o que não funcionou nos jogos passados do treinador com este time. Se uma formação ou abordagem já falhou repetidamente contra adversários parecidos, evite repeti-la sem motivo; se algo deu certo, é um bom sinal para manter ou repetir em contextos parecidos. Isso é conhecimento acumulado do treinador, não regra fixa — use como orientação, não como obrigação cega.`;
        }

        // Resume o histórico de partidas do Auxiliar (resultado por formação usada + últimos jogos em detalhe)
        // pra alimentar o "aprendizado" da IA: o que já funcionou e o que não funcionou até agora.
        function montarResumoHistoricoAuxiliarIA() {
            let historico = db[currentSave].historicoPartidasAuxiliar || [];
            if (historico.length === 0) return "Nenhum histórico de partidas do Auxiliar ainda — esta é a primeira partida planejada para este time, não há aprendizado prévio pra usar.";

            let porFormacao = {};
            historico.forEach(p => {
                let f = p.formacaoEscolhida || '?';
                if (!porFormacao[f]) porFormacao[f] = { v: 0, e: 0, d: 0, total: 0 };
                porFormacao[f].total++;
                if (p.resultado === 'Vitória') porFormacao[f].v++;
                else if (p.resultado === 'Empate') porFormacao[f].e++;
                else if (p.resultado === 'Derrota') porFormacao[f].d++;
            });
            let resumoFormacoes = Object.entries(porFormacao)
                .map(([f, r]) => `${f}: ${r.v}V ${r.e}E ${r.d}D em ${r.total} jogo(s)`)
                .join(' | ');

            let ultimasStr = historico.slice(0, 5).map(p => {
                let ajustesTxt = (p.ajustesFeitos && p.ajustesFeitos.length > 0)
                    ? ` Ajustes feitos ao vivo: ${p.ajustesFeitos.map(a => a.resposta).join(' / ')}.`
                    : '';
                return `vs ${p.adversarioNome} (formação ${p.formacaoEscolhida}): ${p.golsPro}x${p.golsContra} (${p.resultado}).${p.resumoPosJogo ? ' Avaliação pós-jogo: ' + p.resumoPosJogo : ''}${ajustesTxt}`;
            }).join(' || ');

            return `DESEMPENHO POR FORMAÇÃO ATÉ AGORA (aprenda com isso — o que rendeu bem e o que não rendeu): ${resumoFormacoes}.
            ÚLTIMAS ${Math.min(5, historico.length)} PARTIDA(S) EM DETALHE (do mais recente pro mais antigo): ${ultimasStr}`;
        }

        // Orquestra qual "estado" da experiência de partida aparece na aba (vazio / declarada / em andamento)
        // A aba do Auxiliar mostra o PLANO que ele recomenda. Quem escala e inicia a partida
        // é a aba "Salvar Partida" — por isso esta função e a do fluxo de partida são separadas.
        function renderizarSugestaoAuxiliar() {
            let d = db[currentSave];
            let box = document.getElementById('auxiliar-sugestao-resultado');
            let pedir = document.getElementById('auxiliar-pedir-sugestao');
            if (!box || !d) return;

            // Com uma partida em aberto (montando ou ao vivo), o que importa é o espelho dela —
            // não o plano que talvez tenha virado essa própria partida ou já esteja desatualizado.
            if (d.partidaAuxiliar) {
                renderizarEspelhoPartidaAuxiliar(d.partidaAuxiliar);
                return;
            }

            let sug = d.sugestaoAuxiliar;
            if (!sug) {
                box.style.display = 'none';
                if (pedir) pedir.style.display = 'block';
                renderizarHistoricoPartidasAuxiliar();
                return;
            }

            let t = sug.tatica || {};
            let pre = predefinicaoPorId(t.predefinicao);
            let est = estiloArmacaoPorId(t.estiloArmacao);
            let faixa = faixaAbordagem(t.abordagemDefensiva);

            box.style.display = 'block';
            if (pedir) pedir.style.display = 'none';
            box.innerHTML = `
                <div style="background: rgba(75,159,226,0.08); border:1px solid var(--accent); border-radius:8px; padding:18px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                        <h3 style="margin:0; font-size:17px; color:var(--accent);">📋 Plano contra ${sug.adversarioNome}</h3>
                        <button onclick="descartarSugestaoAuxiliar()" style="background:transparent; border:1px solid var(--border); color:var(--text-muted); padding:6px 12px; font-size:12px;">🗑️ Descartar plano</button>
                    </div>

                    ${sug.adversarioInfo ? `<p style="font-size:13.5px; line-height:1.6; margin:12px 0 0 0;"><strong>Sobre o adversário:</strong> ${sug.adversarioInfo}</p>` : ''}
                    ${sug.analiseGeral ? `<p style="font-size:13.5px; line-height:1.6; margin:8px 0 0 0;"><strong>A leitura:</strong> ${sug.analiseGeral}</p>` : ''}

                    <h4 style="margin:18px 0 0 0; font-size:14px; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Aplique isto no jogo</h4>
                    <div class="plano-tatico">
                        <div class="plano-tatico-item"><span>Predefinição tática</span><strong>${pre.emoji} ${pre.nome}</strong></div>
                        <div class="plano-tatico-item"><span>Esquema</span><strong>${t.esquema}</strong></div>
                        <div class="plano-tatico-item"><span>Estilo de armação</span><strong>${est.nome}</strong></div>
                        <div class="plano-tatico-item"><span>Abordagem defensiva</span><strong>${t.abordagemDefensiva} — ${faixa.nome}</strong></div>
                    </div>
                    ${sug.alertaRotacao ? `<p style="font-size:13px; color:var(--warning); line-height:1.6; margin:8px 0 0 0;">${sug.alertaRotacao}</p>` : ''}
                    ${(sug.rotacoesAutomaticas && sug.rotacoesAutomaticas.length) ? `<p style="font-size:12px; color:var(--text-muted); line-height:1.6; margin:6px 0 0 0;">🔁 Rotação forçada por fadiga: ${sug.rotacoesAutomaticas.join('; ')}</p>` : ''}

                    <h4 style="margin:18px 0 8px 0; font-size:14px; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Escalação sugerida <span style="font-weight:normal; color:var(--text-muted); font-size:12px; text-transform:none;">(clique num jogador pra ver a função dele)</span></h4>
                    <div class="campo-futebol-grande" id="campo-sugestao-auxiliar"></div>
                    <div id="banco-sugestao-auxiliar" style="margin-top:15px;"></div>

                    <div style="display:flex; gap:10px; margin-top:18px; flex-wrap:wrap;">
                        <button onclick="levarPlanoParaIniciarPartida()" style="flex:1; background:var(--primary); color:black; padding:12px; font-size:15px;">▶️ Iniciar Partida com este Plano</button>
                        <button onclick="declararPartidaIA()" style="background:var(--panel-bg); border:1px solid var(--accent); color:var(--accent);">🔄 Refazer o plano</button>
                    </div>
                </div>`;

            renderizarCampinhoEspelhoLeitura(t.esquema, sug.escalacao, sug.reservas, sug.tatica, null, sug.funcoesPorRole);
            renderizarHistoricoPartidasAuxiliar();
        }

        // -------------------------------------------------------------------------------------
        // ESPELHO MINIMALISTA DA PARTIDA (montando ou ao vivo) — mostra a escalação de verdade
        // e as alterações feitas, sem deixar mexer em nada por aqui (isso é lá em "Salvar Partida").
        // -------------------------------------------------------------------------------------
        function renderizarEspelhoPartidaAuxiliar(partida) {
            let box = document.getElementById('auxiliar-sugestao-resultado');
            let pedir = document.getElementById('auxiliar-pedir-sugestao');
            if (!box) return;
            box.style.display = 'block';
            if (pedir) pedir.style.display = 'none';

            let montando = partida.status === 'montando';
            let t = partida.tatica || {};
            let corDestaque = montando ? 'var(--primary)' : 'var(--danger)';
            let descTatica = (t.predefinicao && typeof predefinicaoPorId === 'function')
                ? `${predefinicaoPorId(t.predefinicao).emoji} ${predefinicaoPorId(t.predefinicao).nome} • ${partida.formacaoEscolhida} • ${estiloArmacaoPorId(t.estiloArmacao).nome} • ${t.abordagemDefensiva}/100 (${faixaAbordagem(t.abordagemDefensiva).nome})`
                : partida.formacaoEscolhida;

            let subs = partida.substituicoes || [];
            let subsHtml = subs.map(s => `
                <div style="background:var(--input-bg); border:1px solid var(--border); border-radius:8px; padding:10px 12px; font-size:13px;">
                    <strong style="color:var(--primary);">${s.minuto}'</strong> — 🟢 <strong>${s.entrou}</strong> entrou no lugar de 🔴 <strong>${s.saiu}</strong>${s.instrucao ? `<br><span style="color:var(--text-muted); font-size:12px;">${s.instrucao}</span>` : ''}
                </div>`).join('');

            box.innerHTML = `
                <div style="background: rgba(226,75,75,0.06); border:1px solid ${corDestaque}; border-radius:8px; padding:18px;">
                    <h3 style="margin:0; font-size:17px; color:${corDestaque};">${montando ? '📋 Montando a escalação' : '🔴 Partida ao vivo'} — vs ${partida.adversarioNome}</h3>
                    <p style="font-size:12.5px; color:var(--text-muted); margin:6px 0 0 0;">${descTatica}</p>

                    <h4 style="margin:18px 0 8px 0; font-size:14px; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Escalação em campo <span style="font-weight:normal; color:var(--text-muted); font-size:12px; text-transform:none;">(clique num jogador pra ver a função dele)</span></h4>
                    <div class="campo-futebol-grande" id="campo-sugestao-auxiliar"></div>
                    <div id="banco-sugestao-auxiliar" style="margin-top:15px;"></div>

                    ${subs.length ? `<h4 style="margin:18px 0 8px 0; font-size:14px; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Alterações (${subs.length}/5)</h4><div style="display:flex; flex-direction:column; gap:6px;">${subsHtml}</div>` : ''}

                    <div style="display:flex; gap:10px; margin-top:18px; flex-wrap:wrap;">
                        <button onclick="mudarAba('tab-salvar-partida')" style="flex:1; min-width:170px; background:var(--primary); color:black; padding:12px; font-size:14px;">💾 Ir pra Salvar Partida</button>
                        ${!montando ? `<button onclick="pedirSugestaoAoVivo()" style="background:var(--accent); color:white;">🤖 Pedir sugestão</button>` : ''}
                    </div>
                </div>`;

            renderizarCampinhoEspelhoLeitura(partida.formacaoEscolhida, partida.titulares, partida.banco, partida.tatica, partida.substituicoes, partida.funcoesPorRoleSugeridas);
        }

        // -------------------------------------------------------------------------------------
        // CAMPINHO SÓ-LEITURA (aba Auxiliar) — usado tanto pra prévia do plano quanto pro espelho
        // da partida ao vivo. Mesma pinta do campinho de verdade (camisa, OVR, nome), mas clicar
        // num jogador não troca ninguém: só mostra a função dele no EA FC (calculada pela
        // especialidade cadastrada + a tática ativa). Editar de verdade só na aba "Salvar Partida".
        // Guarda a última fonte renderizada (plano ou partida) pra o clique no jogador saber onde ler.
        // -------------------------------------------------------------------------------------
        let _fonteCampinhoAuxiliarLeitura = null;
        let _ultimoRenderEspelho = null; // guarda os parâmetros pra toggleSubBadgeEspelho conseguir redesenhar
        let pitchToggleSubViewEspelho = {}; // igual ao pitchToggleSubView do campinho editável, mas pro espelho

        function renderizarCampinhoEspelhoLeitura(formacao, escalacaoMap, reservas, tatica, substituicoes, funcoesPorRoleOverride) {
            _fonteCampinhoAuxiliarLeitura = { escalacao: escalacaoMap || {}, tatica: tatica, reservas: reservas || [], funcoesPorRoleOverride: funcoesPorRoleOverride };
            _ultimoRenderEspelho = { formacao, escalacaoMap, reservas, tatica, substituicoes, funcoesPorRoleOverride };

            let campo = document.getElementById('campo-sugestao-auxiliar');
            if (!campo) return;
            campo.innerHTML = '<div class="area-penalti-top"></div><div class="area-penalti-bot"></div><div class="campo-canto tl"></div><div class="campo-canto tr"></div><div class="campo-canto bl"></div><div class="campo-canto br"></div>';

            let positions = formacao ? coordsFormacoes[formacao] : null;
            if (!positions) return;

            positions.forEach(posObj => {
                let info = (escalacaoMap || {})[posObj.role] || {};
                let nomeJogador = info.nome || '???';

                // Mesma setinha verde/vermelha do campinho editável: quem entrou tem badge, clicar
                // nela mostra quem saiu no lugar dele (só visual, não mexe em nada).
                let subInfo = (substituicoes || []).find(s => s.entrou === nomeJogador);
                let vendoQuemSaiu = subInfo && pitchToggleSubViewEspelho[posObj.role];
                let nomeExibido = vendoQuemSaiu ? subInfo.saiu : nomeJogador;

                let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes(nomeExibido.toLowerCase().trim()));
                let ovrTxt = jogBD ? jogBD.ovr : '?';
                // O Auxiliar já pode ter decidido a função levando o adversário em conta (funcoesPorRoleOverride,
                // vindo do plano de declararPartidaIA) — só cai pro cálculo genérico por especialidade se não tiver isso.
                let overrideFuncao = (!vendoQuemSaiu && funcoesPorRoleOverride && funcoesPorRoleOverride[posObj.role]) || null;
                let escolhaFuncao = overrideFuncao
                    ? escolhaFuncaoDeIds(posObj.role, overrideFuncao.funcao, overrideFuncao.foco)
                    : ((!vendoQuemSaiu && jogBD && typeof escolherFuncaoJogador === 'function') ? escolherFuncaoJogador(posObj.role, jogBD.posicao, tatica) : null);
                let resumo = escolhaFuncao ? resumoFuncaoJogador(escolhaFuncao) : '';

                let tituloBadge = vendoQuemSaiu ? 'Voltar a ver quem está em campo' : `Entrou aos ${subInfo ? subInfo.minuto : ''}' — clique pra ver quem saiu`;
                let badgeSub = subInfo ? `<div class="jc-sub-badge ${vendoQuemSaiu ? 'saiu' : 'entrou'}" onclick="toggleSubBadgeEspelho('${posObj.role}', event)" title="${tituloBadge}">${vendoQuemSaiu ? '▼' : '▲'}</div>` : '';

                campo.innerHTML += `<div class="jogador-campo" style="top: ${posObj.top}; left: ${posObj.left};" onclick="mostrarFuncaoJogadorSugestao('${posObj.role}')">
                    <div class="jc-camisa"><span class="jc-ovr-label">OVR</span><span class="jc-ovr-num">${ovrTxt}</span></div>
                    <div class="jc-nome">${nomeExibido}</div>
                    ${badgeSub}
                    ${resumo ? `<div class="jogador-tooltip"><strong>${nomeJogador}</strong><hr style="border-color:var(--border); margin:5px 0;">${resumo}</div>` : ''}
                </div>`;
            });

            let boxBanco = document.getElementById('banco-sugestao-auxiliar');
            if (boxBanco) {
                let listaReservas = (reservas || []).filter(r => r && r.nome);
                if (listaReservas.length) {
                    boxBanco.innerHTML = `<h4 style="margin:0 0 10px 0; font-size:13px; color:var(--text-muted); text-transform:uppercase;">🪑 Banco <span style="font-weight:normal; text-transform:none;">(clique pra ver como cada um pode entrar)</span></h4>
                        <div class="banco-reservas-grid">
                            ${listaReservas.map((r, idx) => {
                                let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes((r.nome || '').toLowerCase().trim()));
                                let txtOvr = jogBD ? ` · OVR ${jogBD.ovr}` : '';
                                return `<div class="banco-reserva-item" onclick="mostrarEntradasReserva(${idx})">
                                    <strong>${r.nome}</strong>
                                    <span>${r.posicao || (jogBD ? jogBD.posicao : '')}${txtOvr}</span>
                                </div>`;
                            }).join('')}
                        </div>`;
                } else {
                    boxBanco.innerHTML = '';
                }
            }
        }

        // Mesma ideia do toggleSubBadge do campinho editável, mas redesenha o campinho só-leitura.
        function toggleSubBadgeEspelho(role, event) {
            if (event) event.stopPropagation();
            pitchToggleSubViewEspelho[role] = !pitchToggleSubViewEspelho[role];
            if (_ultimoRenderEspelho) {
                let p = _ultimoRenderEspelho;
                renderizarCampinhoEspelhoLeitura(p.formacao, p.escalacaoMap, p.reservas, p.tatica, p.substituicoes);
            }
        }

        // Clique num reserva do banco só-leitura: mostra em quais posições do esquema atual ele
        // pode entrar e a função que faria em cada uma — não abre nenhuma troca de verdade.
        // Perfil tático de uma especialidade cadastrada (Zagueiro/Construtor, Volante/Contenção...)
        // — usado pra comparar reserva x titular e dar um motivo de entrada REAL, não um texto
        // genérico igual pra qualquer jogador do mesmo grupo. Baseado só na posição de carteirinha
        // (nunca em atributos escondidos, que o jogo não expõe pra IA/motor).
        function _perfilTaticoDaPosicao(posicao) {
            let p = _semAcento(String(posicao || '').toLowerCase());
            if (p.includes('defesa') || p.includes('contencao') || p.includes('zaga')) return 'defesa';
            if (p.includes('construtor') || p.includes('armador') || p.includes('armacao') || p.includes('abertura')) return 'criacao';
            if (p.includes('fisico')) return 'fisico';
            if (p.includes('velocidade') || p.includes('ataque') || p.includes('invertido') || p.includes('aberto')) return 'ataque';
            if (p.includes('ala')) return 'amplitude';
            return 'equilibrado';
        }

        const MOTIVO_POR_PERFIL_TATICO = {
            defesa: 'reforçar a marcação e a roubada de bola',
            criacao: 'melhorar a distribuição de jogo e a criação de chances',
            ataque: 'dar mais poder ofensivo e presença no ataque',
            fisico: 'ganhar mais força física e domínio no jogo aéreo',
            amplitude: 'dar mais amplitude e cruzamentos pelo lado'
        };

        // Regra de realismo: OVR muito menor que o titular = a entrada é rotação/fôlego, NUNCA
        // upgrade técnico (não faz sentido dizer que um reserva pior entra "pra melhorar" algo).
        // OVR competitivo + perfil diferente do titular = o motivo é essa característica específica.
        // Perfil parecido = só descanso, sem mudar o padrão de jogo.
        function _motivoEntradaReserva(jogBD, grupoKey, titularNome) {
            if (grupoKey === 'goleiro') return 'se o titular se machucar ou for expulso';
            let titularBD = titularNome ? db[currentSave].plantel.find(p => p.nome === titularNome) : null;
            if (!titularBD) return 'quando o contexto da partida pedir essa característica';

            let diffOvr = (jogBD.ovr || 0) - (titularBD.ovr || 0);
            if (diffOvr <= -5) {
                return `pra dar mais fôlego ao time — o nível de ${titularBD.nome} é bem superior, então não é upgrade técnico, é rotação`;
            }

            let perfilReserva = _perfilTaticoDaPosicao(jogBD.posicao);
            let perfilTitular = _perfilTaticoDaPosicao(titularBD.posicao);
            if (perfilReserva !== perfilTitular && MOTIVO_POR_PERFIL_TATICO[perfilReserva]) {
                return `pra ${MOTIVO_POR_PERFIL_TATICO[perfilReserva]} — um perfil diferente do de ${titularBD.nome}`;
            }

            return `pra dar descanso a ${titularBD.nome} sem mudar muito o padrão de jogo`;
        }

        function mostrarEntradasReserva(idx) {
            let fonte = _fonteCampinhoAuxiliarLeitura;
            if (!fonte) return;
            let r = (fonte.reservas || [])[idx];
            if (!r) return;
            let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes((r.nome || '').toLowerCase().trim()));
            let positions = (_ultimoRenderEspelho && _ultimoRenderEspelho.formacao) ? coordsFormacoes[_ultimoRenderEspelho.formacao] : null;

            let brutas = (jogBD && positions) ? positions
                .filter(p => posicaoCompativelComRole(p.role, jogBD.posicao))
                .map(p => {
                    let grupoKey = grupoFuncaoDoRole(p.role);
                    let escolha = escolherFuncaoJogador(p.role, jogBD.posicao, fonte.tatica);
                    let titular = (fonte.escalacao || {})[p.role];
                    return {
                        role: p.role, grupoKey: grupoKey, escolha: escolha,
                        titularNome: (titular && titular.nome && titular.nome !== '???') ? titular.nome : null
                    };
                }) : [];

            // Nos grupos sem lado (zagueiro/volante/meio-campo/meia-atacante/atacante) a função
            // é idêntica pros dois lados — não repete a mesma leitura duas vezes só trocando a sigla.
            let vistos = new Set();
            let entradas = brutas.filter(b => {
                if (!ROTULO_GENERICO_POR_GRUPO[b.grupoKey]) return true;
                let chave = `${b.grupoKey}:${b.escolha ? b.escolha.funcao.id : ''}:${b.escolha ? b.escolha.foco.id : ''}`;
                if (vistos.has(chave)) return false;
                vistos.add(chave);
                return true;
            });

            let html = entradas.map((e, i) => {
                let resumo = e.escolha ? resumoFuncaoJogador(e.escolha) : e.role;
                let quemSai = e.titularNome ? ` no lugar de <strong>${e.titularNome}</strong>` : '';
                let motivo = _motivoEntradaReserva(jogBD, e.grupoKey, e.titularNome);
                return `<div style="${i === 0 ? '' : 'margin-top:12px; padding-top:10px; border-top:1px solid var(--border);'}">
                    <strong style="color:var(--primary);">${resumo}</strong>${quemSai}
                    <div style="font-size:12.5px; color:var(--text-muted); margin-top:3px;">Entra ${motivo}.</div>
                </div>`;
            }).join('');

            document.getElementById('modal-funcao-titulo').innerText = `⚽ ${r.nome} (banco)`;
            document.getElementById('modal-funcao-resumo').innerText = entradas.length ? 'Plano de entrada:' : 'Nenhuma posição do esquema atual combina com ele.';
            document.getElementById('modal-funcao-descricao').innerHTML = html;
            document.getElementById('modal-funcao-jogador').style.display = 'flex';
        }

        // Clique num jogador do campinho só-leitura (plano ou espelho ao vivo): só mostra a
        // função, não abre troca.
        function mostrarFuncaoJogadorSugestao(role) {
            let fonte = _fonteCampinhoAuxiliarLeitura;
            if (!fonte) return;
            let info = (fonte.escalacao || {})[role] || {};
            let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes((info.nome || '').toLowerCase().trim()));
            let overrideFuncao = fonte.funcoesPorRoleOverride && fonte.funcoesPorRoleOverride[role];
            let escolha = overrideFuncao
                ? escolhaFuncaoDeIds(role, overrideFuncao.funcao, overrideFuncao.foco)
                : (jogBD ? escolherFuncaoJogador(role, jogBD.posicao, fonte.tatica) : null);

            document.getElementById('modal-funcao-titulo').innerText = `⚽ ${info.nome || 'Vaga'} (${role})`;
            document.getElementById('modal-funcao-resumo').innerText = escolha ? resumoFuncaoJogador(escolha) : 'Sem função definida.';
            document.getElementById('modal-funcao-descricao').innerText = escolha ? descricaoFuncaoJogador(escolha) : '';
            document.getElementById('modal-funcao-jogador').style.display = 'flex';
        }

        function descartarSugestaoAuxiliar() {
            db[currentSave].sugestaoAuxiliar = null;
            salvarDados();
            renderizarSugestaoAuxiliar();
        }

        // Leva o plano para a tela de Iniciar Partida já preenchida.
        function levarPlanoParaIniciarPartida() {
            mudarAba('tab-salvar-partida');
            if (typeof usarSugestaoDoAuxiliar === 'function') usarSugestaoDoAuxiliar();
        }

        // Mantida com o nome antigo porque várias telas ainda chamam por aqui: agora ela só
        // reparte o trabalho entre as duas abas (plano no Auxiliar, partida no Salvar Partida).
        function renderizarAuxiliarPartida() {
            renderizarSugestaoAuxiliar();
            if (typeof renderizarAbaSalvarPartida === 'function') renderizarAbaSalvarPartida();
        }

        function renderizarCampinhoLimpo() {
            let campo = document.getElementById('campo-futebol-ui');
            if (!campo) return;
            campo.innerHTML = '<div class="area-penalti-top"></div><div class="area-penalti-bot"></div><div class="campo-canto tl"></div><div class="campo-canto tr"></div><div class="campo-canto bl"></div><div class="campo-canto br"></div>';

            let partida = db[currentSave].partidaAuxiliar;

            let boxAnalise = document.getElementById('partida-alerta-auxiliar');
            if (boxAnalise) {
                if (partida && (partida.analiseGeral || partida.adversarioInfo || partida.alertaRotacao || (partida.rotacoesAutomaticas && partida.rotacoesAutomaticas.length > 0))) {
                    boxAnalise.style.display = 'block';
                    boxAnalise.innerHTML = `
                        ${partida.adversarioInfo ? `<p style="margin:0 0 8px 0;"><strong>🔎 Sobre o ${partida.adversarioNome}:</strong> ${partida.adversarioInfo}</p>` : ''}
                        ${partida.analiseGeral ? `<p style="margin:0 0 8px 0;"><strong>🧠 Análise do Auxiliar:</strong> ${partida.analiseGeral}</p>` : ''}
                        ${(partida.rotacoesAutomaticas && partida.rotacoesAutomaticas.length > 0) ? `<p style="margin:0 0 8px 0; color: var(--primary); font-weight:bold;">🏥 Rotação automática do Departamento Médico: ${partida.rotacoesAutomaticas.join('; ')}.</p>` : ''}
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

                        // Se esse jogador entrou como substituto, mostra um badge — clicar nele alterna
                        // a exibição pra ver quem saiu (só visual, não mexe na escalação).
                        let subInfo = (partida.substituicoes || []).find(s => s.entrou === nomeJogador);
                        let vendoQuemSaiu = subInfo && pitchToggleSubView[posObj.role];
                        let nomeExibido = vendoQuemSaiu ? subInfo.saiu : nomeJogador;

                        let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes(nomeExibido.toLowerCase().trim()));
                        let ovrTxt = jogBD ? jogBD.ovr : '?';

                        // A função (ex: "Defesa-Equilibrado") só existe pra quem continua exatamente
                        // como o Auxiliar sugeriu — troca manual (ou escalação sem plano nenhum) não
                        // tem função pra mostrar. Fica só na aba do balão ao passar o mouse, sem
                        // poluir o campinho com texto fixo.
                        let sugAplicada = partida.escalacaoSugeridaAuxiliar;
                        let seguiuSugestao = !vendoQuemSaiu && sugAplicada && sugAplicada[posObj.role] && sugAplicada[posObj.role].nome === nomeJogador;
                        let funcaoResumo = '';
                        if (seguiuSugestao) {
                            let overrideFuncao = partida.funcoesPorRoleSugeridas && partida.funcoesPorRoleSugeridas[posObj.role];
                            let escolha = overrideFuncao
                                ? escolhaFuncaoDeIds(posObj.role, overrideFuncao.funcao, overrideFuncao.foco)
                                : (jogBD && typeof escolherFuncaoJogador === 'function' ? escolherFuncaoJogador(posObj.role, jogBD.posicao, partida.tatica) : null);
                            if (escolha) funcaoResumo = resumoFuncaoJogador(escolha);
                        }
                        let tooltipHTML = `<div class="jogador-tooltip"><strong>${nomeJogador}</strong>${funcaoResumo ? `<div style="color:var(--primary); font-weight:bold; margin-top:3px;">${funcaoResumo}</div>` : ''}<hr style="border-color:var(--border); margin:5px 0;">${instrucao}</div>`;

                        let tituloBadge = vendoQuemSaiu ? 'Voltar a ver quem está em campo' : `Entrou aos ${subInfo ? subInfo.minuto : ''}' — clique pra ver quem saiu`;
                        let badgeSub = subInfo ? `<div class="jc-sub-badge ${vendoQuemSaiu ? 'saiu' : 'entrou'}" onclick="toggleSubBadge('${posObj.role}', event)" title="${tituloBadge}">${vendoQuemSaiu ? '▼' : '▲'}</div>` : '';

                        campo.innerHTML += `<div class="jogador-campo" style="top: ${posObj.top}; left: ${posObj.left};" onclick="abrirSeletorTroca('${posObj.role}')">
                            <div class="jc-camisa"><span class="jc-ovr-label">OVR</span><span class="jc-ovr-num">${ovrTxt}</span></div>
                            <div class="jc-nome">${nomeExibido}</div>
                            ${badgeSub}
                            ${tooltipHTML}
                        </div>`;
                    }
                }
            }

            let boxBanco = document.getElementById('auxiliar-banco-reservas');
            if (boxBanco) {
                if (partida && Array.isArray(partida.banco) && partida.banco.length > 0) {
                    boxBanco.style.display = 'block';
                    boxBanco.innerHTML = `<h3 style="margin:0 0 12px 0; font-size:15px; color:var(--accent);">🪑 Banco de Reservas <span style="font-weight:normal; color:var(--text-muted); font-size:12px;">(clique pra trocar)</span></h3>
                        <div class="banco-reservas-grid">
                            ${partida.banco.map((r, idx) => {
                                let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes((r.nome || '').toLowerCase().trim()));
                                let txtOvr = jogBD ? ` · OVR ${jogBD.ovr}` : '';
                                return `<div class="banco-reserva-item" onclick="abrirSeletorTrocaBanco(${idx})">
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

            let taticaBase = taticaDoSave();
            let formacaoPri = taticaBase.esquema;
            let formacaoSec = taticaBase.esquemaAlternativo;
            let estiloJogo = descreverTaticaParaIA(taticaBase);
            let diasDescanso = (db[currentSave] && typeof db[currentSave].descansoAntesProxima === 'number') ? db[currentSave].descansoAntesProxima : 3;

            // As formações preferidas (até 4, do Perfil do Treinador) — quando o save ainda não usou
            // o seletor de Estilo de Jogo, cai pras duas formações do painel manual de sempre.
            let formacoesPreferidasIA = (Array.isArray(taticaBase.formacoesPreferidas) && taticaBase.formacoesPreferidas.length)
                ? taticaBase.formacoesPreferidas.filter(f => coordsFormacoes[f])
                : [formacaoPri, formacaoSec].filter(f => f && coordsFormacoes[f]);
            if (!formacoesPreferidasIA.length) formacoesPreferidasIA = [formacaoPri];
            let funcoesBaseTexto = (taticaBase.funcoesPorRoleSugeridas && Object.keys(taticaBase.funcoesPorRoleSugeridas).length)
                ? Object.entries(taticaBase.funcoesPorRoleSugeridas).map(([role, f]) => `${role}: ${f.funcao}/${f.foco}`).join(', ')
                : 'nenhuma definida ainda — decida pela sua própria leitura do adversário';

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

            FILOSOFIA TÁTICA E OPÇÕES (a identidade do time — adapte um pouco pra ESTE adversário específico, sem trair a essência):
            - Formações preferidas do treinador, em ordem de prioridade: ${formacoesPreferidasIA.join(' > ')}. A "Formação Primária" de referência é ${formacaoPri}.
            - Estilo de Jogo: ${estiloJogo}
            - Função/foco de cada posição na configuração BASE do treinador (o ponto de partida — ${funcoesBaseTexto})
            - Diretriz: ${diretriz}

            🏥 BOLETIM DO DEPARTAMENTO MÉDICO (LEIA COM ATENÇÃO): ${(typeof gerarRelatorioMedicoTexto === 'function') ? gerarRelatorioMedicoTexto() : "Sem novidades."}
            📚 HISTÓRICO E APRENDIZADO (o conhecimento acumulado deste treinador com este time): ${montarResumoHistoricoAuxiliarIA()}
            ${regrasEstrategistaTexto(nomeAdvManual || 'o adversário', formacaoSec, estiloJogo, diretriz, diasDescanso)}

            ${regrasTaticasParaIA()}

            FUNÇÕES E FOCOS POR GRUPO DE POSIÇÃO (use SÓ estes ids ao preencher "funcao"/"foco" de cada titular — nunca invente um novo):
            ${_listarGruposFuncaoParaIA()}

            REGRAS ABSOLUTAS DO JSON:
            0. Além da escalação, escolha o PACOTE TÁTICO completo (predefinição, esquema, estilo de armação e abordagem defensiva de 0 a 100) respeitando as travas listadas acima. O treinador vai selecionar exatamente isso dentro do jogo, então uma combinação proibida é inútil. ESTE PACOTE PARTE DA CONFIGURAÇÃO BASE DO TREINADOR, mas você DEVE ajustá-lo pra ESTE adversário específico: contra um time de posse/tiki-taka, reduza a abordagem defensiva e recue mais a linha; contra um time fraco ou que joga muito recuado, pode subir a linha e ser mais agressivo; ajuste o foco de zagueiros/volantes pra "Defesa"/"Roubada de Bola" contra ataques fortes, ou pra "Ataque"/"Armação" contra defesas fracas. A justificativa desse ajuste vai em "justificativaTatica".
            1. Escolha UMA das formações preferidas listadas acima (${formacoesPreferidasIA.join(', ')}) — a mais adequada pra ESTE adversário — e use EXATAMENTE AS SIGLAS DO SEGUINTE MAPA COMO CHAVES: ${plantelInfo.formacoesPossiveisStr}
            2. NÃO invente siglas (Ex: não crie "MC" se na formação escolhida tiver apenas "MCD" e "MCE").
            3. BANCO DE RESERVAS: monte também até 9 jogadores do elenco ativo que NÃO entraram nos 11 titulares, ordenados por relevância. REGRA OBRIGATÓRIA: pelo menos 1 desses 9 TEM que ser um goleiro reserva (nunca deixe o banco sem nenhum goleiro). Para cada um, diga em poucas palavras qual seria o papel dele se entrasse. Não invente jogadores fora da lista do elenco.
            4. Para CADA titular, além da "instrucao" em texto livre, preencha também "funcao" e "foco" com ids REAIS da lista de funções acima, coerentes com o grupo daquela sigla — parta da configuração base do treinador e só desvie quando o adversário realmente pedir.

            Retorne EXATAMENTE este JSON PURO:
            {
                "adversarioNome": "Nome do time adversário",
                "adversarioInfo": "2-3 frases resumindo o que você percebeu sobre o adversário (formação, nível, pontos fortes/fracos) e como isso influenciou seu plano.",
                "analiseGeral": "2 a 3 frases explicando sua lógica: formação escolhida e por quê, quem foi poupado/priorizado (cite o Departamento Médico se pesou) e o plano tático geral.",
                "justificativaTatica": "1 a 2 frases explicando por que ESTE pacote tático contra ESTE adversário, e o que mudou em relação à configuração base.",
                "predefinicao": "id da predefinição tática escolhida",
                "estiloArmacao": "id do estilo de armação escolhido",
                "abordagemDefensiva": 55,
                "formacaoEscolhida": "4-2-3-1",
                "escalacao": {
                    "GOL": {"nome": "Nome do Goleiro", "instrucao": "Instrução tática profunda contra o adversário...", "funcao": "id", "foco": "id"},
                    "LAD": {"nome": "Nome do Lateral", "instrucao": "...", "funcao": "id", "foco": "id"}
                },
                "reservas": [
                    {"nome": "Nome do Jogador", "posicao": "Posição dele no elenco", "papel": "Papel curto se ele entrar"}
                ]
            }`;

            let parts = [{ text: promptIA }];
            if (imagemAdvEscalacao) parts.push({ inlineData: { mimeType: imagemAdvEscalacao.mimeType, data: imagemAdvEscalacao.base64 } });
            if (imagemAdvTatica) parts.push({ inlineData: { mimeType: imagemAdvTatica.mimeType, data: imagemAdvTatica.base64 } });

            try {
                const data = await chamarIA({ contents: [{ parts: parts }] });
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);

                if (match) {
                    let res = JSON.parse(match[0]);
                    // A formação tem que ser uma das preferidas do treinador — nunca uma de fora da lista.
                    if (!formacoesPreferidasIA.includes(res.formacaoEscolhida)) res.formacaoEscolhida = formacoesPreferidasIA[0];
                    let rotacoesAutomaticas = aplicarRotacaoObrigatoriaEscalacao(res);
                    let alertaRotacao = (typeof verificarRotacaoEscalacao === 'function') ? verificarRotacaoEscalacao(res.escalacao) : "";

                    // O que a IA devolve é um PLANO. Quem escala e inicia a partida é a aba
                    // "Salvar Partida" — aqui o Auxiliar só recomenda.
                    let normalizada = normalizarSugestaoTaticaIA({
                        predefinicao: res.predefinicao,
                        estiloArmacao: res.estiloArmacao,
                        abordagemDefensiva: res.abordagemDefensiva,
                        esquema: res.formacaoEscolhida
                    });

                    // Função/foco de cada titular: parte do que a IA sugeriu, mas nunca aceita um id
                    // que não exista no grupo daquela sigla — nesse caso cai pro motor determinístico
                    // usando a especialidade real do jogador escalado ali.
                    let funcoesPorRole = {};
                    (coordsFormacoes[normalizada.tatica.esquema] || []).forEach(c => {
                        let grupo = grupoFuncaoDoRole(c.role);
                        let pedida = res.escalacao && res.escalacao[c.role];
                        let valida = grupo && pedida && pedida.funcao && pedida.foco
                            && GRUPOS_FUNCAO_EA[grupo].funcoes.some(f => f.id === pedida.funcao && f.focos.some(fo => fo.id === pedida.foco));
                        if (valida) {
                            funcoesPorRole[c.role] = { funcao: pedida.funcao, foco: pedida.foco };
                        } else {
                            let jogBD = pedida && pedida.nome ? db[currentSave].plantel.find(p => p.nome === pedida.nome) : null;
                            let escolha = escolherFuncaoJogador(c.role, jogBD ? jogBD.posicao : null, normalizada.tatica);
                            if (escolha) funcoesPorRole[c.role] = { funcao: escolha.funcao.id, foco: escolha.foco.id };
                        }
                    });

                    db[currentSave].sugestaoAuxiliar = {
                        adversarioNome: res.adversarioNome || nomeAdvManual || 'Adversário',
                        adversarioInfo: res.adversarioInfo || '',
                        analiseGeral: res.analiseGeral || '',
                        justificativaTatica: res.justificativaTatica || '',
                        tatica: normalizada.tatica,
                        ajustesTaticos: normalizada.ajustes,
                        escalacao: res.escalacao,
                        funcoesPorRole: funcoesPorRole,
                        reservas: (typeof garantirGoleiroNoBanco === 'function') ? garantirGoleiroNoBanco(res.reservas, res.escalacao) : (Array.isArray(res.reservas) ? res.reservas : []),
                        alertaRotacao: alertaRotacao,
                        rotacoesAutomaticas: rotacoesAutomaticas,
                        diretriz: diretriz,
                        criadaEm: Date.now()
                    };
                    imagemAdvEscalacao = null; imagemAdvTatica = null;
                    salvarDados();
                    renderizarSugestaoAuxiliar();
                } else {
                    alert('Não consegui montar o plano a partir disso. Tente de novo ou digite o nome do adversário.');
                }
            } catch (e) {
                alert('Erro ao analisar o adversário. Verifique sua conexão e tente novamente.');
            }
            btn.innerText = '🔍 Analisar Adversário e Montar Plano (IA)'; btn.disabled = false;
        }

        // --- TROCAR JOGADOR NA ESCALAÇÃO (clique no campinho) ---

        // Quem pode jogar em cada função do campinho, além da posição "de carteirinha" — reflete como
        // times de verdade improvisam peças parecidas. Usada pro seletor de troca (clique no jogador),
        // pra rotação automática por fadiga e pro próprio prompt de escalação da IA (regrasEstrategistaTexto),
        // então as três coisas seguem exatamente a mesma régua de compatibilidade posicional.
        const POS_ZAGUEIRO_TODOS = ['Zagueiro/Construtor', 'Zagueiro/Lateral', 'Zagueiro/Versatil', 'Zagueiro/Defesa'];
        const POS_VOLANTE_TODOS = ['Volante/Zaga', 'Volante/Contenção', 'Volante/Armação'];
        const POS_MEIOCAMPO_TODOS = ['MeioCampo/Equilibrado', 'MeioCampo/Armador', 'MeioCampo/Abertura', 'MeioCampo/Ataque', 'MeioCampo/Versátil'];
        const POS_PONTA_TODOS = ['Ponta/Ala Direita', 'Ponta/Ala Esquerda', 'Ponta/Invertido', 'Ponta/Armador', 'Ponta/Versátil'];
        const POS_ATACANTE_TODOS = ['Atacante/Aberto', 'Atacante/Fisico', 'Atacante/Armador', 'Atacante/Velocidade', 'Atacante/Versátil'];
        const POS_LATERAL_VERSATIL = ['Lateral/Defesa Versatil', 'Lateral/Ala Versatil', 'Lateral/Construtor Versatil'];
        const POS_LATERAL_DIREITO = ['Lateral/Defesa Direito', 'Lateral/Ala Direito', 'Lateral/Construtor Direito'];
        const POS_LATERAL_ESQUERDO = ['Lateral/Defesa Esquerdo', 'Lateral/Ala Esquerdo', 'Lateral/Construtor Esquerdo'];
        const POS_LATERAL_CONSTRUTOR = ['Lateral/Construtor Direito', 'Lateral/Construtor Esquerdo', 'Lateral/Construtor Versatil'];
        const POS_LATERAL_DEFESA = ['Lateral/Defesa Direito', 'Lateral/Defesa Esquerdo', 'Lateral/Defesa Versatil'];
        const POS_LATERAL_ALA = ['Lateral/Ala Direito', 'Lateral/Ala Esquerdo', 'Lateral/Ala Versatil'];

        const ZAGUEIRO_COMPATIVEL = [...POS_ZAGUEIRO_TODOS, ...POS_LATERAL_DEFESA, 'Volante/Zaga'];
        const LATERAL_DIREITO_COMPATIVEL = [...POS_LATERAL_DIREITO, ...POS_LATERAL_VERSATIL, 'Ponta/Ala Direita'];
        const LATERAL_ESQUERDO_COMPATIVEL = [...POS_LATERAL_ESQUERDO, ...POS_LATERAL_VERSATIL, 'Ponta/Ala Esquerda'];
        const VOLANTE_COMPATIVEL = [...POS_VOLANTE_TODOS, 'MeioCampo/Armador', 'MeioCampo/Equilibrado', 'MeioCampo/Versátil', ...POS_LATERAL_CONSTRUTOR, 'Zagueiro/Construtor', 'Zagueiro/Versatil'];
        const MEIOCAMPO_COMPATIVEL = [...POS_MEIOCAMPO_TODOS, ...POS_VOLANTE_TODOS, ...POS_LATERAL_CONSTRUTOR];
        const MEIA_ARMADOR_COMPATIVEL = [...POS_MEIOCAMPO_TODOS, 'Ponta/Armador', 'Ponta/Invertido', 'Atacante/Armador', 'Atacante/Versátil', 'Ponta/Versátil'];
        // PD/MD e PE/ME são todos "pontas" (ala ofensiva) — a única diferença entre eles é o lado do
        // lateral/ala aceito, já que um lateral/ala destro não cobre a ala esquerda e vice-versa.
        const PONTA_DIREITA_COMPATIVEL = [...POS_PONTA_TODOS, 'MeioCampo/Abertura', 'MeioCampo/Versátil', 'Lateral/Ala Direito', 'Lateral/Ala Versatil', 'Atacante/Aberto', 'Atacante/Versátil'];
        const PONTA_ESQUERDA_COMPATIVEL = [...POS_PONTA_TODOS, 'MeioCampo/Abertura', 'MeioCampo/Versátil', 'Lateral/Ala Esquerdo', 'Lateral/Ala Versatil', 'Atacante/Aberto', 'Atacante/Versátil'];
        const ATACANTE_COMPATIVEL = [...POS_ATACANTE_TODOS, 'Ponta/Invertido', 'Ponta/Versátil', 'MeioCampo/Ataque', 'MeioCampo/Versátil'];

        // Sigla de cada função no campinho -> lista de posições de carteirinha aceitas nela.
        const POSICOES_COMPATIVEIS_POR_ROLE = {
            GOL: ['Goleiro'],
            ZAD: ZAGUEIRO_COMPATIVEL, ZAE: ZAGUEIRO_COMPATIVEL, ZAC: ZAGUEIRO_COMPATIVEL,
            LAD: LATERAL_DIREITO_COMPATIVEL, ALD: LATERAL_DIREITO_COMPATIVEL,
            LAE: LATERAL_ESQUERDO_COMPATIVEL, ALE: LATERAL_ESQUERDO_COMPATIVEL,
            VOL: VOLANTE_COMPATIVEL, VOLD: VOLANTE_COMPATIVEL, VOLE: VOLANTE_COMPATIVEL,
            MCD: MEIOCAMPO_COMPATIVEL, MCE: MEIOCAMPO_COMPATIVEL, MC: MEIOCAMPO_COMPATIVEL,
            MEI: MEIA_ARMADOR_COMPATIVEL, MEID: MEIA_ARMADOR_COMPATIVEL, MEIE: MEIA_ARMADOR_COMPATIVEL,
            PD: PONTA_DIREITA_COMPATIVEL, MD: PONTA_DIREITA_COMPATIVEL,
            PE: PONTA_ESQUERDA_COMPATIVEL, ME: PONTA_ESQUERDA_COMPATIVEL,
            ATA: ATACANTE_COMPATIVEL, ATD: ATACANTE_COMPATIVEL, ATE: ATACANTE_COMPATIVEL
        };

        // true se a posição de carteirinha do jogador é aceita na função do campinho (sigla) informada.
        function posicaoCompativelComRole(role, posicaoJogador) {
            if (!posicaoJogador) return false;
            let lista = POSICOES_COMPATIVEIS_POR_ROLE[role];
            return Array.isArray(lista) && lista.includes(posicaoJogador);
        }

        // Texto pronto pra alimentar o prompt de escalação da IA — a mesma régua de compatibilidade
        // usada no seletor de troca, mas em formato de regra pra IA seguir exatamente, sem "inventar" improvisos.
        function textoRegrasCompatibilidadePosicional() {
            return `- Zagueiro (ZAD/ZAE/ZAC): aceita zagueiro de qualquer variação, lateral/defesa (direito, esquerdo ou versátil) e volante/zaga.
            - Lateral Direito (LAD/ALD): aceita lateral direito de qualquer variação (defesa, ala, construtor) e lateral versátil de qualquer variação, além de ponta/ala direita.
            - Lateral Esquerdo (LAE/ALE): aceita lateral esquerdo de qualquer variação (defesa, ala, construtor) e lateral versátil de qualquer variação, além de ponta/ala esquerda.
            - Volante (VOL/VOLD/VOLE): aceita volante de qualquer variação, meio-campo/armador, meio-campo/equilibrado, meio-campo/versátil, lateral/construtor (direito, esquerdo ou versátil), zagueiro/construtor e zagueiro/versátil.
            - Meio-Campo genérico (MCD/MCE/MC): aceita meio-campo de qualquer variação, volante de qualquer variação e lateral/construtor (direito, esquerdo ou versátil).
            - Meia Armador (MEI/MEID/MEIE): aceita meio-campo de qualquer variação, ponta/armador, ponta/invertido, atacante/armador, atacante/versátil e ponta/versátil.
            - Ponta Direita (PD/MD): aceita ponta de qualquer variação, meio-campo/abertura, meio-campo/versátil, lateral/ala direito, lateral/ala versátil, atacante/aberto e atacante/versátil.
            - Ponta Esquerda (PE/ME): aceita ponta de qualquer variação, meio-campo/abertura, meio-campo/versátil, lateral/ala esquerdo, lateral/ala versátil, atacante/aberto e atacante/versátil.
            - Atacante (ATA/ATD/ATE): aceita atacante de qualquer variação, ponta/invertido, ponta/versátil, meio-campo/ataque e meio-campo/versátil.
            - Goleiro (GOL): só aceita goleiro.`;
        }

        // Rede de segurança pra rotação obrigatória: o prompt já instrui a IA a poupar quem está em
        // fadiga crítica/risco de lesão, mas isso é texto — aqui a gente FORÇA a troca em código sempre
        // que existir um jogador saudável disponível na mesma categoria de posição, em vez de confiar
        // 100% na IA seguir a regra. Se não houver alternativa saudável, mantém a escolha da IA
        // (mesma exceção que já existe no prompt). Retorna a lista de trocas feitas, em texto.
        function aplicarRotacaoObrigatoriaEscalacao(res) {
            if (!res || !res.escalacao || !db[currentSave]) return [];
            let trocas = [];
            // Só quem já está escalado noutra posição é intocável (não pode jogar em dois lugares ao
            // mesmo tempo) — quem está no banco (reservas) É candidato válido a ser promovido pra titular.
            let usadosTitulares = new Set(Object.values(res.escalacao).map(j => j && j.nome).filter(Boolean));

            Object.entries(res.escalacao).forEach(([role, info]) => {
                if (!info || !info.nome) return;
                let jogador = db[currentSave].plantel.find(x => x.nome.toLowerCase() === String(info.nome).toLowerCase().trim());
                if (!jogador) return;
                let condicao = (typeof condicaoJogador === 'function') ? condicaoJogador(jogador) : { nivel: 'ok' };
                if (condicao.nivel !== 'critico' && condicao.nivel !== 'risco') return;

                let candidatos = db[currentSave].plantel.filter(p => {
                    if (p.nome === jogador.nome || usadosTitulares.has(p.nome)) return false;
                    if (p.status !== 'Ativo') return false;
                    if (currentSave === 'selecao' && p.convocado === false) return false;
                    if (p.diasLesao > 0 || p.suspensoVermelho) return false;
                    if (!posicaoCompativelComRole(role, p.posicao)) return false;
                    let c = (typeof condicaoJogador === 'function') ? condicaoJogador(p) : { nivel: 'ok' };
                    return c.nivel === 'ok' || c.nivel === 'alerta';
                });
                if (candidatos.length === 0) return; // sem alternativa saudável na posição — mantém a escolha da IA

                candidatos.sort((a, b) => b.ovr - a.ovr);
                let substituto = candidatos[0];
                usadosTitulares.delete(jogador.nome);
                usadosTitulares.add(substituto.nome);

                let motivo = condicao.nivel === 'critico' ? 'fadiga crítica' : 'risco de lesão';
                res.escalacao[role] = { nome: substituto.nome, instrucao: `${info.instrucao || ''} (Rotação automática do Departamento Médico — ${jogador.nome} preservado por ${motivo}.)`.trim() };

                if (!Array.isArray(res.reservas)) res.reservas = [];
                // Se o substituto veio do banco, ele sai de lá (agora é titular) e quem foi poupado assume a vaga dele.
                let idxNoBanco = res.reservas.findIndex(r => r && r.nome === substituto.nome);
                if (idxNoBanco >= 0) res.reservas.splice(idxNoBanco, 1);
                if (!res.reservas.some(r => r && r.nome === jogador.nome)) {
                    res.reservas.unshift({ nome: jogador.nome, posicao: jogador.posicao, papel: `Poupado pelo Departamento Médico (${motivo}).` });
                }

                trocas.push(`${substituto.nome} entrou no lugar de ${jogador.nome} (${motivo})`);
            });

            return trocas;
        }

        let _trocaOpcoesAtuais = []; // [{nome, ovr, posicao, tag, onSelect}]
        let _trocaOpcoesExtras = [];

        // Estado (só visual) de qual card do campinho está mostrando "quem saiu" em vez de "quem está agora" — por role.
        let pitchToggleSubView = {};

        function toggleSubBadge(role, event) {
            if (event) event.stopPropagation();
            pitchToggleSubView[role] = !pitchToggleSubView[role];
            renderizarCampinhoLimpo();
        }

        function abrirModalTroca(opcoesPrincipais, opcoesExtras, titulo, subtitulo, botaoExtra) {
            _trocaOpcoesAtuais = opcoesPrincipais || [];
            _trocaOpcoesExtras = opcoesExtras || [];
            document.getElementById('modal-trocar-titulo').innerText = `🔄 ${titulo}`;
            let elSub = document.getElementById('modal-trocar-subtitulo');
            if (elSub) elSub.innerText = subtitulo || 'Escolha quem entra no lugar dele.';
            _renderizarListaTroca();
            let wrapVerTodos = document.getElementById('modal-trocar-ver-todos-wrap');
            if (wrapVerTodos) wrapVerTodos.style.display = _trocaOpcoesExtras.length > 0 ? 'block' : 'none';
            let wrapExtra = document.getElementById('modal-trocar-botao-extra-wrap');
            if (wrapExtra) {
                if (botaoExtra) {
                    wrapExtra.style.display = 'block';
                    wrapExtra.innerHTML = `<button onclick="${botaoExtra.onclick}" style="width:100%; background:var(--warning); color:#14150F; padding:11px; font-weight:bold; border-radius:8px; border:none; cursor:pointer;">${botaoExtra.label}</button>`;
                } else {
                    wrapExtra.style.display = 'none';
                    wrapExtra.innerHTML = '';
                }
            }
            document.getElementById('modal-trocar-jogador').style.display = 'flex';
        }

        function _renderizarListaTroca() {
            document.getElementById('modal-trocar-lista').innerHTML = _trocaOpcoesAtuais.map((op, idx) => `
                <div class="trocar-jogador-opcao" onclick="executarTrocaSelecionada(${idx})">
                    <div class="tjo-ovr">${op.ovr}</div>
                    <div class="tjo-info">
                        <strong>${op.nome}</strong>
                        <span>${op.posicao || ''}${op.tag ? ' · ' + op.tag : ''}</span>
                    </div>
                    <div class="tjo-seta">›</div>
                </div>`).join('') || '<p style="color:var(--text-muted); text-align:center;">Nenhuma opção disponível.</p>';
        }

        function expandirVerTodosTroca() {
            _trocaOpcoesAtuais = _trocaOpcoesAtuais.concat(_trocaOpcoesExtras);
            _trocaOpcoesExtras = [];
            _renderizarListaTroca();
            let wrapVerTodos = document.getElementById('modal-trocar-ver-todos-wrap');
            if (wrapVerTodos) wrapVerTodos.style.display = 'none';
        }

        function executarTrocaSelecionada(idx) {
            let op = _trocaOpcoesAtuais[idx];
            _trocaOpcoesAtuais = [];
            _trocaOpcoesExtras = [];
            document.getElementById('modal-trocar-jogador').style.display = 'none';
            if (op && typeof op.onSelect === 'function') op.onSelect();
        }

        function abrirSeletorTroca(role) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !partida.titulares) return;
            let atual = partida.titulares[role];
            let nomeAtual = atual ? atual.nome : null;
            let aoVivo = partida.status === 'em_andamento';

            // Grupo 1: trocar de posição com outro titular — sempre disponível (pré-jogo ou ao vivo), não gasta substituição.
            let opcoesPosicao = Object.entries(partida.titulares)
                .filter(([r, j]) => r !== role && j.nome && j.nome !== '???')
                .map(([r, j]) => {
                    let jogBD = db[currentSave].plantel.find(p => p.nome === j.nome);
                    return { nome: j.nome, ovr: jogBD ? jogBD.ovr : '?', posicao: jogBD ? jogBD.posicao : r, tag: 'Trocar de posição (' + r + ')', onSelect: () => trocarPosicaoTitulares(role, r) };
                });
            let posRelevantes = opcoesPosicao.filter(o => posicaoCompativelComRole(role, o.posicao));
            let posOutros = opcoesPosicao.filter(o => !posicaoCompativelComRole(role, o.posicao));

            let opcoesFinal, opcoesExtras, subtitulo;

            if (!aoVivo) {
                // Pré-jogo: também dá pra trazer alguém do banco/elenco pra essa vaga (aí sim vira uma troca de escalação normal).
                let titularesNomes = Object.values(partida.titulares).map(j => j.nome);
                let bancoNomes = (partida.banco || []).map(b => b.nome);
                let candidatosBanco = db[currentSave].plantel.filter(p => p.status === 'Ativo' && !titularesNomes.includes(p.nome));
                let opcoesBanco = candidatosBanco.map(p => ({ nome: p.nome, ovr: p.ovr, posicao: p.posicao, tag: bancoNomes.includes(p.nome) ? 'Banco' : 'Fora da escalação', onSelect: () => trocarJogadorNoCampo(role, p.nome) }));
                let bancoRelevantes = opcoesBanco.filter(o => posicaoCompativelComRole(role, o.posicao));
                let bancoOutros = opcoesBanco.filter(o => !posicaoCompativelComRole(role, o.posicao));
                bancoRelevantes.sort((a, b) => b.ovr - a.ovr);
                bancoOutros.sort((a, b) => b.ovr - a.ovr);
                posRelevantes.sort((a, b) => b.ovr - a.ovr);
                posOutros.sort((a, b) => b.ovr - a.ovr);
                // O que o treinador mais quer aqui é escalar alguém do elenco — isso vem primeiro.
                // Trocar de posição com outro titular é secundário, fica depois.
                opcoesFinal = bancoRelevantes.concat(posRelevantes);
                opcoesExtras = bancoOutros.concat(posOutros);
                subtitulo = 'Escolha alguém do banco/elenco pra essa vaga, ou outro titular pra trocar de posição com ele.';
            } else {
                // Ao vivo: a MESMA lista já mistura trocar de posição com quem está em campo (não
                // gasta substituição) e trazer alguém do banco pro lugar dele (gasta 1 das 5 e pede
                // o minuto) — antes eram dois passos separados e o segundo ficava escondido atrás
                // de um botão, então na prática só aparecia quem cruzava de posição (geralmente
                // pontas cobrindo lateral), nunca o lateral reserva de verdade que estava no banco.
                let subsUsadas = (partida.substituicoes || []).length;
                let fora = partida.jogadoresForaDaPartida || [];
                let opcoesBanco = subsUsadas < 5 ? (partida.banco || []).filter(b => b.nome && !fora.includes(b.nome)).map(b => {
                    let jogBD = db[currentSave].plantel.find(p => p.nome === b.nome);
                    return { nome: b.nome, ovr: jogBD ? jogBD.ovr : '?', posicao: jogBD ? jogBD.posicao : (b.posicao || ''), tag: `Banco — declara substituição (${subsUsadas}/5)`, onSelect: () => iniciarDeclaracaoSubstituicao(role, b.nome) };
                }) : [];
                let bancoRelevantesVivo = opcoesBanco.filter(o => posicaoCompativelComRole(role, o.posicao));
                let bancoOutrosVivo = opcoesBanco.filter(o => !posicaoCompativelComRole(role, o.posicao));
                bancoRelevantesVivo.sort((a, b) => b.ovr - a.ovr);
                bancoOutrosVivo.sort((a, b) => b.ovr - a.ovr);
                posRelevantes.sort((a, b) => b.ovr - a.ovr);
                posOutros.sort((a, b) => b.ovr - a.ovr);

                opcoesFinal = bancoRelevantesVivo.concat(posRelevantes);
                opcoesExtras = bancoOutrosVivo.concat(posOutros);
                subtitulo = subsUsadas < 5
                    ? `Traga alguém do banco (gasta 1 das ${5 - subsUsadas} substituições restantes e pede o minuto) ou troque de posição com outro titular (não gasta substituição).`
                    : 'Limite de 5 substituições já atingido — só dá pra trocar de posição com outro titular.';
            }

            abrirModalTroca(opcoesFinal, opcoesExtras, `Trocar ${nomeAtual || 'vaga (' + role + ')'}`, subtitulo);
        }

        // Troca dois titulares de posição entre si — não mexe no banco, não conta como substituição.
        function trocarPosicaoTitulares(roleA, roleB) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !partida.titulares) return;
            let a = partida.titulares[roleA];
            let b = partida.titulares[roleB];
            partida.titulares[roleA] = b;
            partida.titulares[roleB] = a;
            salvarDados();
            renderizarCampinhoLimpo();
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
            // O jogador que entra pode vir de fora do banco original (do elenco geral), o que
            // faria o banco crescer sem limite a cada troca — mantém o teto de 9 reservas,
            // descartando as opções menos relevantes (as mais antigas, no fim da lista).
            if (partida.banco.length > 9) partida.banco.length = 9;

            salvarDados();
            renderizarCampinhoLimpo();
        }

        // Clicar num jogador do banco escolhe EM QUAL POSIÇÃO ele entra em campo — pré-jogo é uma troca normal
        // (o titular daquela vaga vai pro banco), ao vivo dispara a declaração de substituição de verdade.
        function abrirSeletorTrocaBanco(idx) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !Array.isArray(partida.banco) || !partida.banco[idx]) return;
            let atual = partida.banco[idx];
            let aoVivo = partida.status === 'em_andamento';

            if (aoVivo && (partida.substituicoes || []).length >= 5) { alert('Limite de 5 substituições já atingido nesta partida.'); return; }

            let jogBDAtual = db[currentSave].plantel.find(p => p.nome === atual.nome);
            let posicaoAtual = (jogBDAtual && jogBDAtual.posicao) ? jogBDAtual.posicao : (atual.posicao || '');

            let opcoesSlots = Object.entries(partida.titulares || {})
                .filter(([r, j]) => j.nome && j.nome !== '???')
                .map(([r, j]) => {
                    let jogBD = db[currentSave].plantel.find(p => p.nome === j.nome);
                    let posTxt = jogBD ? jogBD.posicao : r;
                    return {
                        nome: j.nome, ovr: jogBD ? jogBD.ovr : '?', posicao: `${posTxt} (${r})`, tag: '',
                        _role: r,
                        onSelect: () => aoVivo ? iniciarDeclaracaoSubstituicao(r, atual.nome) : trocarJogadorNoCampo(r, atual.nome)
                    };
                });

            let relevantes = opcoesSlots.filter(o => posicaoCompativelComRole(o._role, posicaoAtual));
            let outros = opcoesSlots.filter(o => !posicaoCompativelComRole(o._role, posicaoAtual));
            relevantes.sort((a, b) => b.ovr - a.ovr);
            outros.sort((a, b) => b.ovr - a.ovr);

            let subtitulo = aoVivo
                ? `Escolha quem ${atual.nome} substitui — isso vai gastar uma das 5 substituições e o outro jogador não volta mais pro jogo.`
                : `Escolha em qual posição ${atual.nome} entra no time titular, ou troque-o por outro jogador do elenco sem tirar ninguém de campo.`;

            // Pré-jogo, também dá pra trocar quem ocupa essa vaga do banco por outro nome do
            // elenco, sem mandar ninguém pro campo — só ajusta as opções disponíveis no banco.
            let botaoExtra = !aoVivo ? { label: '🔄 Trocar por outro do elenco (sem entrar em campo)', onclick: `abrirTrocaBancoPorElenco(${idx})` } : null;

            abrirModalTroca(relevantes, outros, `Colocar ${atual.nome || 'reserva'} em campo`, subtitulo, botaoExtra);
        }

        // Substitui quem ocupa esse slot do banco por outro jogador do elenco ativo — só faz
        // sentido pré-jogo (ao vivo, tirar/pôr gente do banco fora de uma substituição de verdade
        // não reflete o que aconteceria numa partida real).
        function abrirTrocaBancoPorElenco(idx) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !Array.isArray(partida.banco) || !partida.banco[idx]) return;
            let atual = partida.banco[idx];
            let titularesNomes = Object.values(partida.titulares || {}).map(j => j.nome);
            let bancoNomes = partida.banco.map(b => b.nome);
            let jogBDAtual = db[currentSave].plantel.find(p => p.nome === atual.nome);
            let categoriaJogador = (jogBDAtual && jogBDAtual.posicao) ? jogBDAtual.posicao.split('/')[0] : null;

            let candidatos = db[currentSave].plantel
                .filter(p => p.status === 'Ativo' && !titularesNomes.includes(p.nome) && !bancoNomes.includes(p.nome))
                .map(p => ({ nome: p.nome, ovr: p.ovr, posicao: p.posicao, tag: 'Elenco', onSelect: () => trocarJogadorNoBanco(idx, p.nome) }));

            let relevantes = candidatos.filter(o => o.posicao && o.posicao.split('/')[0] === categoriaJogador);
            let outros = candidatos.filter(o => !(o.posicao && o.posicao.split('/')[0] === categoriaJogador));
            relevantes.sort((a, b) => b.ovr - a.ovr);
            outros.sort((a, b) => b.ovr - a.ovr);

            abrirModalTroca(relevantes, outros, `Trocar ${atual.nome} no banco`, `Escolha quem do elenco assume o lugar de ${atual.nome} no banco — ele não entra em campo.`);
        }

        function trocarJogadorNoBanco(idx, novoNome) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !Array.isArray(partida.banco) || !partida.banco[idx]) return;
            let jogBD = db[currentSave].plantel.find(p => p.nome === novoNome);
            partida.banco[idx] = { nome: novoNome, posicao: jogBD ? jogBD.posicao : '', papel: 'Adicionado manualmente pelo treinador.' };
            salvarDados();
            renderizarCampinhoLimpo();
        }

        // --- DECLARAR SUBSTITUIÇÃO (a única forma de tirar alguém do banco depois do apito inicial) ---
        // Acessível clicando num titular em campo ("🔁 Declarar Substituição" abaixo da lista de troca de posição)
        // ou clicando num jogador do banco (escolhendo em qual vaga ele entra).

        // Mutação pura do estado — sem prompts. O jogador que sai NÃO volta pro banco: fica fora
        // da partida pro resto do jogo (regra do futebol), registrado em jogadoresForaDaPartida.
        function efetivarSubstituicao(roleSai, nomeEntra, minuto, instrucao) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !partida.titulares) return false;
            let saindo = partida.titulares[roleSai];
            if (!saindo || !saindo.nome || saindo.nome === '???') return false;

            partida.titulares[roleSai] = { nome: nomeEntra, instrucao: instrucao || 'Ajuste manual do treinador.' };
            partida.banco = (partida.banco || []).filter(b => b.nome !== nomeEntra);

            if (!partida.jogadoresForaDaPartida) partida.jogadoresForaDaPartida = [];
            if (!partida.jogadoresForaDaPartida.includes(saindo.nome)) partida.jogadoresForaDaPartida.push(saindo.nome);

            if (!partida.substituicoes) partida.substituicoes = [];
            partida.substituicoes.push({ minuto: minuto, saiu: saindo.nome, entrou: nomeEntra, instrucao: instrucao || '', quando: Date.now() });

            salvarDados();
            return true;
        }

        // Ponto de entrada contextual: pede o minuto e efetiva a troca. Usado tanto ao clicar num
        // titular (escolhendo quem do banco entra) quanto ao clicar num jogador do banco (escolhendo o slot).
        async function iniciarDeclaracaoSubstituicao(roleSai, nomeEntra, instrucao) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || partida.status !== 'em_andamento') return;
            if ((partida.substituicoes || []).length >= 5) { alert('Limite de 5 substituições já atingido nesta partida.'); return; }
            if ((partida.jogadoresForaDaPartida || []).includes(nomeEntra)) { alert(`${nomeEntra} já saiu da partida antes e não pode voltar.`); return; }

            let minutoStr = await promptModerno(`Em que minuto ${nomeEntra} entrou em campo?`, '', '⏱️ Minuto da Substituição');
            if (minutoStr === null) return;
            let minuto = parseInt(minutoStr, 10);
            if (isNaN(minuto) || minuto < 0 || minuto > 130) { alert('Digite um minuto válido (0 a 130).'); return; }

            let ok = efetivarSubstituicao(roleSai, nomeEntra, minuto, instrucao);
            if (!ok) { alert('Não foi possível confirmar essa substituição.'); return; }
            renderizarAuxiliarPartida();
        }

        // --- MUDAR FORMAÇÃO (sugerida pela IA ou manual, pré-jogo ou ao vivo) ---

        // Realoca os titulares atuais pra nova formação de forma coerente com a posição de cada um
        // (mesma régua de compatibilidade do seletor de troca), não só por ordem de profundidade em
        // campo. 1) sigla idêntica entre as duas formações fica onde já estava; 2) o resto é casado
        // com a vaga cujo grupo de função (zagueiro, lateral, volante...) é compatível com a posição
        // de carteirinha do jogador, preferindo o encaixe mais próximo pela profundidade em campo;
        // 3) sobrou jogador sem vaga compatível? cai numa vaga livre qualquer, pra não sumir do time.
        // Não gasta substituição.
        function aplicarNovaFormacao(novaFormacaoKey) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || !partida.titulares) return false;
            let novasPos = coordsFormacoes[novaFormacaoKey];
            if (!novasPos) return false;
            let velhasPos = coordsFormacoes[partida.formacaoEscolhida] || [];

            let jogadoresOrdenados = Object.entries(partida.titulares)
                .filter(([r, j]) => j.nome && j.nome !== '???')
                .map(([r, j]) => {
                    let posObj = velhasPos.find(p => p.role === r);
                    let jogBD = db[currentSave].plantel.find(p => p.nome === j.nome);
                    return { nome: j.nome, instrucao: j.instrucao, roleAntigo: r, posicaoJogador: jogBD ? jogBD.posicao : '', topNum: posObj ? parseFloat(posObj.top) : 50 };
                })
                .sort((a, b) => b.topNum - a.topNum);

            let vagasAbertas = novasPos.slice().sort((a, b) => parseFloat(b.top) - parseFloat(a.top));
            let novosTitulares = {};
            let restantes = jogadoresOrdenados.slice();

            function ocupar(vaga, jog) {
                novosTitulares[vaga.role] = { nome: jog.nome, instrucao: jog.instrucao };
                vagasAbertas = vagasAbertas.filter(v => v.role !== vaga.role);
                restantes = restantes.filter(j => j.nome !== jog.nome);
            }

            // 1ª passada: a mesma sigla existe nas duas formações — o jogador continua na função que já tinha.
            restantes.slice().forEach(jog => {
                let vaga = vagasAbertas.find(v => v.role === jog.roleAntigo);
                if (vaga) ocupar(vaga, jog);
            });

            // 2ª passada: encaixe pela posição de carteirinha (régua de compatibilidade), vaga mais
            // próxima em profundidade primeiro, pra manter quem jogava mais atrás/mais à frente coerente.
            vagasAbertas.slice().forEach(vaga => {
                if (!restantes.length) return;
                let candidato = restantes.find(j => posicaoCompativelComRole(vaga.role, j.posicaoJogador));
                if (candidato) ocupar(vaga, candidato);
            });

            // 3ª passada: quem sobrou sem encaixe de posição vai pras vagas que sobraram, só pra
            // ninguém desaparecer do time — fica marcado na instrução que foi um encaixe forçado.
            vagasAbertas.slice().forEach(vaga => {
                let jog = restantes.shift();
                if (jog) {
                    novosTitulares[vaga.role] = { nome: jog.nome, instrucao: `${jog.instrucao || ''} (Reposicionado sem encaixe exato de posição na nova formação.)`.trim() };
                    vagasAbertas = vagasAbertas.filter(v => v.role !== vaga.role);
                }
            });

            // Vagas que continuam sem ninguém ficam em aberto pro treinador escolher.
            vagasAbertas.forEach(vaga => {
                novosTitulares[vaga.role] = { nome: '???', instrucao: 'Vaga em aberto — escolha um jogador.' };
            });

            // Jogador que sobrou (mais titulares do que vagas na formação nova) vai pro banco.
            if (restantes.length) {
                if (!partida.banco) partida.banco = [];
                restantes.forEach(sobra => {
                    partida.banco.unshift({ nome: sobra.nome, posicao: sobra.posicaoJogador, papel: 'Saiu por mudança de formação' });
                });
            }

            partida.titulares = novosTitulares;
            partida.formacaoEscolhida = novaFormacaoKey;
            salvarDados();
            return true;
        }

        function abrirMudarFormacaoManual() {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;
            document.getElementById('modal-formacao-select').innerHTML = Object.keys(coordsFormacoes)
                .map(f => `<option value="${f}" ${f === partida.formacaoEscolhida ? 'selected' : ''}>${f}</option>`).join('');
            document.getElementById('modal-mudar-formacao').style.display = 'flex';
        }

        function confirmarMudarFormacaoManual() {
            let novaFormacao = document.getElementById('modal-formacao-select').value;
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;
            document.getElementById('modal-mudar-formacao').style.display = 'none';
            if (novaFormacao === partida.formacaoEscolhida) return;
            aplicarNovaFormacao(novaFormacao);
            renderizarAuxiliarPartida();
        }

        // --- CICLO DE VIDA DA PARTIDA (iniciar / cancelar / ir registrar) ---

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
                const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
                textoResumo = (data.candidates[0].content.parts[0].text || '').trim().replace(/^["']|["']$/g, '');
            } catch (e) {
                textoResumo = resultado === 'Vitória' ? 'Grande resultado, mister! O plano funcionou.' : (resultado === 'Derrota' ? 'Fica a lição, vamos corrigir pro próximo jogo.' : 'Resultado dentro do esperado, dava pra mais.');
            }

            if (!db[currentSave].chatHistory.auxiliar) db[currentSave].chatHistory.auxiliar = [];
            db[currentSave].chatHistory.auxiliar.push({ role: 'ai', text: `📋 Pós-jogo vs ${nomeAdv} (${golsPro}x${golsContra}): ${textoResumo}` });

            // Cruza com o registro recém-salvo no Dashboard (notas dos jogadores e estatísticas da partida)
            let partidasArr = db[currentSave].partidas || [];
            let dadosDashboard = partidasArr.length > 0 ? partidasArr[partidasArr.length - 1] : null;

            if (!db[currentSave].historicoPartidasAuxiliar) db[currentSave].historicoPartidasAuxiliar = [];
            db[currentSave].historicoPartidasAuxiliar.unshift({
                id: partida.id, adversarioNome: nomeAdv, adversarioInfo: partida.adversarioInfo,
                formacaoEscolhida: partida.formacaoEscolhida, titulares: partida.titulares, banco: partida.banco,
                formacaoInicial: partida.formacaoInicial || partida.formacaoEscolhida,
                escalacaoInicial: partida.escalacaoInicial || partida.titulares, bancoInicial: partida.bancoInicial || partida.banco,
                substituicoes: partida.substituicoes || [],
                analiseGeral: partida.analiseGeral, ajustesFeitos: partida.ajustesFeitos,
                jogadoresNotas: dadosDashboard ? dadosDashboard.jogadores : [],
                estatisticas: dadosDashboard ? { possePro: dadosDashboard.possePro, posseAdv: dadosDashboard.posseAdv, finPro: dadosDashboard.finPro, finAdv: dadosDashboard.finAdv, comp: dadosDashboard.comp, mando: dadosDashboard.mando } : null,
                golsPro: golsPro, golsContra: golsContra, resultado: resultado, resumoPosJogo: textoResumo, finalizadaEm: Date.now()
            });
            if (db[currentSave].historicoPartidasAuxiliar.length > 30) db[currentSave].historicoPartidasAuxiliar.length = 30;

            db[currentSave].partidaAuxiliar = null;
            renderizarChat('auxiliar');
            if (typeof renderizarAuxiliarPartida === 'function') renderizarAuxiliarPartida();

            // A avaliação pós-jogo também chega na Central de Mensagens, com notificação
            if (typeof notificarAuxiliar === 'function') {
                notificarAuxiliar(`📋 Avaliação pós-jogo vs ${nomeAdv} (${golsPro}x${golsContra})`, `<p>${textoResumo}</p><p style="color:var(--text-muted);">Resultado: <strong>${resultado}</strong>. O relatório completo, com campinho tático e substituições, está na aba do Auxiliar Técnico.</p>`);
            }
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

                        ${gerarHtmlEstatisticasHistorico(p)}

                        <h4 class="historico-secao-titulo">🧩 Campinho Tático — como entrou em campo</h4>
                        ${gerarHtmlCampinhoHistorico(p)}

                        ${gerarHtmlSubstituicoesHistorico(p)}

                        <h4 class="historico-secao-titulo">⭐ Notas dos Jogadores</h4>
                        ${gerarHtmlNotasHistorico(p)}

                        <div class="historico-titulares-grid">
                            <div><strong>Banco (início de jogo)</strong>${(p.bancoInicial || p.banco || []).map(r => `<div>${r.nome}</div>`).join('') || '<div>-</div>'}</div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        function toggleHistoricoPartida(idx) {
            let el = document.getElementById('historico-detalhe-' + idx);
            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        // Mini campinho tático (não interativo) mostrando a escalação inicial da partida arquivada
        function gerarHtmlCampinhoHistorico(p) {
            let escalacao = p.escalacaoInicial || p.titulares || {};
            let positions = coordsFormacoes[p.formacaoInicial || p.formacaoEscolhida];
            if (!positions) return '<p class="wizard-elenco-vazio">Formação não disponível.</p>';

            let notas = p.jogadoresNotas || [];
            let subs = p.substituicoes || [];

            let jogadoresHTML = positions.map(posObj => {
                let jogInfo = escalacao[posObj.role];
                let nome = jogInfo ? jogInfo.nome : '???';
                let notaObj = notas.find(j => j.nome === nome);
                let saiuInfo = subs.find(s => s.saiu === nome);
                let badgeSub = saiuInfo ? `<div class="jc-sub-out">🔻${saiuInfo.minuto}'</div>` : '';
                return `<div class="jogador-campo jogador-campo-historico" style="top:${posObj.top}; left:${posObj.left};">
                    <div class="jc-camisa"><span class="jc-ovr-label">NOTA</span><span class="jc-ovr-num">${notaObj ? notaObj.nota : '?'}</span></div>
                    <div class="jc-nome">${nome}</div>
                    ${badgeSub}
                </div>`;
            }).join('');

            return `<div class="campo-futebol-grande campo-mini">
                <div class="area-penalti-top"></div><div class="area-penalti-bot"></div>
                <div class="campo-canto tl"></div><div class="campo-canto tr"></div><div class="campo-canto bl"></div><div class="campo-canto br"></div>
                ${jogadoresHTML}
            </div>`;
        }

        function gerarHtmlSubstituicoesHistorico(p) {
            let subs = p.substituicoes || [];
            if (subs.length === 0) return '';
            let ordenadas = subs.slice().sort((a, b) => (a.minuto || 0) - (b.minuto || 0));
            return `<h4 class="historico-secao-titulo">🔁 Substituições</h4>
                <div class="historico-subs-lista">
                    ${ordenadas.map(s => `<div class="historico-sub-item"><strong>${s.minuto}'</strong> — 🟢 ${s.entrou} entrou no lugar de 🔴 ${s.saiu}${s.instrucao ? ` <span class="historico-sub-instrucao">(${s.instrucao})</span>` : ''}</div>`).join('')}
                </div>`;
        }

        function gerarHtmlNotasHistorico(p) {
            let notas = p.jogadoresNotas || [];
            if (notas.length === 0) return '<p class="wizard-elenco-vazio">Nenhuma nota registrada pro Dashboard nessa partida.</p>';
            return `<div class="historico-notas-grid">
                ${notas.map(j => `<div class="historico-nota-item${j.mvp ? ' mvp' : ''}"><span>${j.nome}${j.mvp ? ' ⭐' : ''}</span><strong>${j.nota}</strong></div>`).join('')}
            </div>`;
        }

        function gerarHtmlEstatisticasHistorico(p) {
            if (!p.estatisticas) return '';
            let e = p.estatisticas;
            return `<div class="kpi-container" style="grid-template-columns: repeat(2, 1fr); margin: 12px 0;">
                <div class="stat-card"><span>Posse de Bola</span><strong>Nós ${e.possePro}% x ${e.posseAdv}% Adv</strong></div>
                <div class="stat-card"><span>Finalizações</span><strong>Nós ${e.finPro} x ${e.finAdv} Adv</strong></div>
            </div>`;
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
                const data = await chamarIA({ contents: [{ parts: [{ text: promptPayload }] }] });
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);

                if(match) {
                    let res = JSON.parse(match[0]);
                    atualizarTemperaturaUI(res.temperatura || "Neutro");
                    history.push({ role: 'ai', text: res.mensagem });
                    
                    // Mesma trava de segurança do chat da diretoria: uma coletiva de imprensa
                    // não pode virar do avesso o prestígio do clube de uma vez só.
                    if (res.variacao_prestigio) atualizarNotaDiretoria(numeroNaFaixa(res.variacao_prestigio, -0.3, 0.3, 0));

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

