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
            inputEl.style.height = ''; // volta pra altura inicial (CSS) — senão fica do tamanho da última mensagem
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
                // Declarado aqui fora (não dentro do "else" do auxiliar) de propósito: é lido mais
                // abaixo, depois que a IA responde, pra validar a sugestão de formação — nesse ponto
                // o bloco if/else já fechou. Só existia como "let" preso dentro do else, então toda
                // vez que a IA sugeria mudar a formação ao vivo isso estourava um ReferenceError, que
                // o catch genérico de então escondia atrás de "Conexão interrompida".
                let formacoesPreferidasChat = [];
                // Idem, só usado quando tipo === 'scout': o pool de candidatos que embasou o
                // prompt desta mensagem, pra validar depois que a IA só sugeriu nomes reais
                // (nunca inventados) e pra pegar os dados confiáveis (clube/liga/idade) direto do
                // nosso pool, sem confiar no que a IA reescreveu.
                let poolScoutAtual = [];

                if (tipo === 'diretoria') {
                    // Mapeamento Dinâmico do Perfil da IA baseado na Nota
                    let notaDir = db[currentSave].notaDiretoria;
                    let perfilDir = "";
                    if (notaDir >= 80) perfilDir = "Você está dócil, prestativa e confia plenamente no treinador. Pode oferecer pequenos bônus financeiros se ele argumentar muito bem.";
                    else if (notaDir >= 50) perfilDir = "Você é estritamente profissional, pragmática e foca apenas nos números, resultados e planilhas.";
                    else perfilDir = "CRISE! Você está rude, impaciente e ameaçadora. O clima é de profunda insatisfação e demissão iminente.";

                    promptFull = `Atue como ${nomeDiretorExibicao()}, o(a) Diretor(a) Executivo(a) do clube "${db[currentSave].nome}".\n${contexto}\nHistórico da Conversa:\n${historicoChat}\n
        ${(typeof personalidadeDiretoriaTexto === 'function') ? personalidadeDiretoriaTexto() : ''}

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
                } else if (tipo === 'scout') {
                    let candidatosScout = scoutMontarCandidatos();
                    poolScoutAtual = candidatosScout.pool;

                    promptFull = `Atue como o Olheiro-Chefe (chefe de observadores) do "${db[currentSave].nome}".\n${contexto}\nHistórico da Conversa:\n${historicoChat}\n

SEU PAPEL: você é um olheiro de futebol experiente, realista e direto — não um vendedor de nomes badalados. O treinador vai perguntar sobre reforços; responda como um scout de verdade conversaria, cruzando o que o elenco precisa com o que é realista pro nosso tamanho de clube.

REGRA MAIS IMPORTANTE DE TODAS: NUNCA escreva um número de OVR/overall/nota/rating na sua resposta, nem repita os números ou o texto "OVR" que aparecem nos dados internos abaixo. Isso estragaria a graça do treinador de descobrir a força real do jogador procurando por ele no próprio jogo de futebol. Fale de nível só de forma qualitativa (ex: "seria uma contratação ambiciosa", "bom custo-benefício pro nosso momento", "uma aposta jovem barata").

REALISMO OBRIGATÓRIO: só sugira nomes que estejam na lista de CANDIDATOS DISPONÍVEIS abaixo — nunca invente um jogador que não esteja nela. Leve em conta o nível do nosso clube (liga: ${db[currentSave].liga}) e o orçamento disponível (€${(db[currentSave].orcamento || 0).toFixed(2)}M) — não empurre um nome claramente fora do nosso alcance a não ser que o treinador peça algo "ousado" ou "acima do nosso nível" explicitamente.

${candidatosScout.resumoNecessidades}

CANDIDATOS DISPONÍVEIS (uso interno pra embasar sua resposta — a pista de nível é só sua, NUNCA repita "OVR" nem números pro treinador):
${candidatosScout.texto || 'Nenhum candidato realista disponível no momento.'}

INSTRUÇÕES:
- Responda à última mensagem do treinador. Se ele ainda não pediu nada específico, pergunte objetivamente o que ele busca (posição, perfil de jogo, faixa de idade, "algo mais barato") antes de despejar nomes à toa.
- Ao sugerir, traga no máximo 3 nomes por resposta, cada um com uma frase de perfil de jogo (estilo, ponto forte, ponto de atenção) — como um relatório de olheiro de verdade, nunca uma lista seca de nomes.
- Preencha "sugestoes" do JSON com os mesmos jogadores citados na mensagem, usando o nome EXATAMENTE como aparece nos candidatos.
- Se não houver nenhum candidato realista pro pedido do treinador, diga isso com honestidade em vez de forçar um nome incompatível.

Retorne EXATAMENTE este formato JSON puro:
{
    "mensagem": "Sua resposta.",
    "opcoes_resposta": ["Opção curta 1", "Opção curta 2"],
    "sugestoes": [{"nome": "Nome Exato", "clube": "Clube Exato", "liga": "Liga Exata", "idade": 24, "posicaoEA": "ST"}]
}
Se não sugerir jogador nenhum nesta resposta, deixe "sugestoes" como um array vazio [].`;
                } else {
                    let partidaAtual = db[currentSave].partidaAuxiliar;
                    // Pra cada reserva do banco, além da posição real, mostra em quais funções ESTE
                    // treinador costuma escalar esse jogador — é o mesmo sinal usado na escalação
                    // pré-jogo (ver regra 10 de regrasEstrategistaTexto), agora também disponível
                    // pra sugestão de substituição AO VIVO.
                    // Substitutos que já entraram nesta partida (pedido do treinador: "um jogador
                    // entra, ele não deve sair... só por lesão") — mostrado à parte pra IA nunca
                    // escolher um deles como "jogadorSai" mais adiante, mesmo estando entre os
                    // "titulares" atuais (que é onde ele aparece depois de entrar em campo).
                    let entrantesSubStr = (partidaAtual && Array.isArray(partidaAtual.substituicoes) && partidaAtual.substituicoes.length)
                        ? partidaAtual.substituicoes.map(s => s.entrou).filter((nome, i, arr) => arr.indexOf(nome) === i && !((partidaAtual.lesoesDeclaradas || []).includes(nome)))
                        : [];
                    let escalacaoStr = (partidaAtual && partidaAtual.titulares)
                        ? `Partida ${partidaAtual.status === 'em_andamento' ? 'EM ANDAMENTO' : 'declarada'} contra ${partidaAtual.adversarioNome}. Formação atual em campo: ${partidaAtual.formacaoEscolhida}. Titulares (sigla da posição no campo: nome): ${Object.entries(partidaAtual.titulares).map(([pos, j]) => `${pos}: ${j.nome}`).join(', ')}. Banco (nome, posição real e histórico de uso do jogador): ${(partidaAtual.banco || []).map(b => { let jogBD = db[currentSave].plantel.find(p => p.nome === b.nome); let posTxt = (jogBD ? jogBD.posicao : b.posicao) || 'posição desconhecida'; let habituaisStr = posicoesHabituaisTexto(b.nome); return `${b.nome} (${posTxt}${habituaisStr ? ' | costuma jogar: ' + habituaisStr : ''})`; }).join(', ') || 'nenhum registrado'}.${(partidaAtual.jogadoresForaDaPartida && partidaAtual.jogadoresForaDaPartida.length > 0) ? ` JÁ SAÍRAM DA PARTIDA E NÃO PODEM MAIS ENTRAR: ${partidaAtual.jogadoresForaDaPartida.join(', ')}.` : ''}${entrantesSubStr.length ? ` JÁ ENTRARAM COMO SUBSTITUTOS NESTA PARTIDA (NUNCA escolha nenhum destes como "jogadorSai" — só saem por lesão real, declarada pelo treinador): ${entrantesSubStr.join(', ')}.` : ''}`
                        : "Nenhuma partida declarada/escalação em campo no momento.";

                    let jogoAoVivo = partidaAtual && partidaAtual.status === 'em_andamento';
                    let subsUsadas = jogoAoVivo ? ((partidaAtual.substituicoes || []).length) : 0;
                    let subsRestantes = Math.max(0, 5 - subsUsadas);

                    let blocoImagem = imagensAnexadas.length > 0 ? `
        📸 ANÁLISE DE ${imagensAnexadas.length > 1 ? `${imagensAnexadas.length} PRINTS` : 'PRINT'} DO JOGO EM ANDAMENTO (MUITO IMPORTANTE): o treinador anexou ${imagensAnexadas.length > 1 ? 'imagens' : 'uma imagem'} — pode ser o campo térmico (mapa de calor), a tela de estatísticas da partida (posse, finalizações, passes, etc.) ou o desempenho individual de um jogador. Analise ${imagensAnexadas.length > 1 ? 'todas as imagens' : 'a imagem'} com atenção e cruze com o texto do treinador e a escalação atual.
        - Aponte o que os dados/imagem mostram (ex: time recuado demais, lado sem criação, adversário dominando um setor, jogador sumido do jogo).
        - SEJA HONESTO: se o time estiver bem e os dados não pedirem mudança nenhuma, DIGA CLARAMENTE que está tudo certo e não force uma alteração só por forçar.` : '';

                    let taticaBaseChat = (typeof taticaDoSave === 'function') ? taticaDoSave() : null;
                    formacoesPreferidasChat = (taticaBaseChat && Array.isArray(taticaBaseChat.formacoesPreferidas) && taticaBaseChat.formacoesPreferidas.length)
                        ? taticaBaseChat.formacoesPreferidas.filter(f => coordsFormacoes[f])
                        : Object.keys(coordsFormacoes);
                    if (!formacoesPreferidasChat.length) formacoesPreferidasChat = Object.keys(coordsFormacoes);

                    let blocoSubstituicao = jogoAoVivo ? `
        🔄 SUBSTITUIÇÕES: já foram usadas ${subsUsadas} de 5 substituições permitidas nesta partida (restam ${subsRestantes}).
        - Se o contexto (texto e/ou imagem) pedir claramente uma substituição e ainda houver substituições disponíveis, preencha o campo "sugestaoSubstituicao" do JSON com um jogador REAL que sai (titular atual) e um jogador REAL que entra (de preferência do banco listado acima), citando os nomes EXATAMENTE como aparecem no contexto, mais uma instrução tática curta pro jogador que entra.
        - FAÇA SENTIDO POSICIONAL (REGRA CRÍTICA): "jogadorEntra" DEVE jogar numa posição compatível com a vaga de quem está saindo — use a posição indicada entre parênteses no Banco acima e a sigla/posição de quem sai pra escolher alguém coerente (ex: não tire um zagueiro pra colocar um atacante, não tire um lateral pra colocar um volante puro). Só foja disso se for uma mudança tática deliberada e MUITO clara pelo pedido do treinador — e nesse caso explique bem o motivo na instrução.
        - Ao escolher entre mais de uma opção coerente no banco, prefira quem estiver rendendo melhor recentemente (nota em campo), não só o de OVR mais alto — se você não souber a nota de cada reserva, baseie-se no contexto e na condição física deles.
        - APRENDA COMO ESTE TREINADOR USA CADA JOGADOR: quando o Banco acima trouxer "costuma jogar: ...", isso é o padrão que ESTE treinador já estabeleceu com esse jogador neste time (ex: um zagueiro que ele sempre usa como volante) — prefira colocá-lo numa das posições desse histórico, sem sair da compatibilidade posicional da vaga que está saindo. Pode variar quando o contexto pedir claramente, mas isso é exceção, não padrão.
        - Se não houver mais substituições disponíveis (restam 0), NÃO sugira substituição — dê apenas orientação tática/posicional.
        - Se a situação não pedir substituição nenhuma, deixe "sugestaoSubstituicao" como null. Não sugira trocas só por sugerir.
        - NUNCA escolha como "jogadorSai" alguém que já entrou como substituto nesta partida (listado acima, se houver) — um substituto que acabou de entrar não é tirado de novo minutos depois só por ajuste tático. A única forma dele sair é uma lesão real, que o treinador declara por fora deste chat.
        - SE você sugerir substituição JUNTO com uma mudança de formação (ambos os campos preenchidos na mesma resposta), pense primeiro em qual vaga da FORMAÇÃO NOVA o jogador que entra vai ocupar — "jogadorSai" tem que ser o titular que, depois de aplicada a formação nova, fica na posição que o jogador que entra pode substituir. Nunca pense a substituição em cima da formação antiga quando as duas mudanças vêm juntas.

        🔄 MUDANÇA DE FORMAÇÃO: você também pode sugerir mudar a formação inteira do time (não gasta substituição, os mesmos 11 jogadores em campo só mudam de esquema). Se a leitura do jogo pedir isso claramente (ex: time sendo dominado no meio, precisa de mais gente na frente, etc), preencha "sugestaoFormacao" com uma formação DIFERENTE da atual (${partidaAtual.formacaoEscolhida}), escolhida EXATAMENTE entre as formações preferidas do treinador: ${formacoesPreferidasChat.join(', ')}. Nunca sugira uma formação fora dessa lista. Caso contrário deixe "sugestaoFormacao" como null. Não sugira isso à toa — é uma mudança grande.` : '';

                    promptFull = `Atue como ${nomeAuxiliarExibicao()}, o Auxiliar Técnico do "${db[currentSave].nome}".\n${contexto}\n${escalacaoStr}\nHistórico da Conversa:\n${historicoChat}\n
        ${(typeof personalidadeAuxiliarTexto === 'function') ? personalidadeAuxiliarTexto() : ''}

        ${(typeof conceitosTaticosTexto === 'function') ? conceitosTaticosTexto() : ''}

        INSTRUÇÕES:
        Responda à última mensagem do Treinador de forma coerente, usando a leitura por fases acima.
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
                    if (tipo === 'auxiliar' && res.sugestaoSubstituicao && res.sugestaoSubstituicao.jogadorSai && res.sugestaoSubstituicao.jogadorEntra
                        && !jogadorTravadoPorJaTerEntrado(db[currentSave].partidaAuxiliar, res.sugestaoSubstituicao.jogadorSai)) {
                        sugestaoSub = { jogadorSai: res.sugestaoSubstituicao.jogadorSai, jogadorEntra: res.sugestaoSubstituicao.jogadorEntra, instrucao: res.sugestaoSubstituicao.instrucao || '', status: 'pendente' };
                    }
                    let sugestaoFormacao = null;
                    if (tipo === 'auxiliar' && res.sugestaoFormacao && res.sugestaoFormacao.novaFormacao
                        && (formacoesPreferidasChat || []).includes(res.sugestaoFormacao.novaFormacao)) {
                        sugestaoFormacao = { novaFormacao: res.sugestaoFormacao.novaFormacao, motivo: res.sugestaoFormacao.motivo || '', status: 'pendente' };
                    }
                    // Nunca confia no que a IA reescreveu (nome pode vir levemente diferente, ou
                    // ela pode "inventar" um jogador fora do pool) — só aceita sugestões cujo nome
                    // bate EXATAMENTE com alguém do pool de candidatos reais que embasou o prompt,
                    // e usa os dados (clube/liga/idade) do NOSSO pool, não os que a IA copiou.
                    let sugestoesScout = null;
                    if (tipo === 'scout' && Array.isArray(res.sugestoes)) {
                        sugestoesScout = res.sugestoes
                            .map(s => s && s.nome ? poolScoutAtual.find(c => c.nome === s.nome) : null)
                            .filter(Boolean)
                            .slice(0, 5);
                    }
                    // Sem texto, a mensagem entraria no histórico com text undefined — e aí
                    // renderizarChat quebrava em TODA renderização seguinte, deixando o chat
                    // inutilizável pro resto do save. Se a IA esqueceu o campo, usa o texto cru.
                    let textoMensagem = (typeof res.mensagem === 'string' && res.mensagem.trim()) ? res.mensagem : rawText;
                    history.push({ role: 'ai', text: textoMensagem, sugestaoSub: sugestaoSub, sugestaoFormacao: sugestaoFormacao, sugestoesJogadores: sugestoesScout });

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
                let cardScout = (tipo === 'scout' && h.sugestoesJogadores && typeof renderizarCardSugestoesScout === 'function') ? renderizarCardSugestoesScout(h.sugestoesJogadores) : '';
                return `<div class="chat-msg ${h.role === 'user' ? 'msg-user' : 'msg-ai'}">${texto || '<i style="color:var(--text-muted)">(mensagem vazia)</i>'}${btnOuvir}${cardSub}${cardFormacao}${cardScout}</div>`;
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
            if (jogadorTravadoPorJaTerEntrado(partida, sug.jogadorSai)) { alert(`${sug.jogadorSai} entrou como substituto nesta partida — só sai por lesão declarada. Essa sugestão ficou desatualizada.`); msg.sugestaoSub.status = 'rejeitada'; salvarDados(); renderizarChat('auxiliar'); return; }

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

            abrirModalTroca(opcoes, [], [], `Quem sai no lugar de ${msg.sugestaoSub.jogadorSai}?`, `${msg.sugestaoSub.jogadorEntra} vai entrar — escolha quem realmente sai de campo.`);
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
            // Calculado uma vez só e reaproveitado pra cada jogador — evita varrer o histórico
            // inteiro de novo dentro do .map() de cada um deles.
            let historicoPosicoes = calcularHistoricoPosicoesJogadores();
            let texto = plantelStr.map(p => {
                let tagReserva = (p.ovr < ovrMedio && p.aparicoes < apMedia) ? " [RESERVA/JOVEM - pouco utilizado]" : "";
                let habituaisStr = posicoesHabituaisTexto(p.nome, historicoPosicoes);
                let tagHabitual = habituaisStr ? ` [Costuma jogar aqui neste time: ${habituaisStr}]` : "";
                // Perfil (papel no grupo, fase, liderança) e números que importam na posição —
                // é o que separa "OVR 74, nota 6.8" de uma leitura de gente do futebol.
                let perfilStr = (typeof perfilJogadorIA === 'function') ? perfilJogadorIA(plantelAtivo.find(x => x.nome === p.nome)) : '';
                let tagPerfil = perfilStr ? ` [Perfil: ${perfilStr}]` : "";
                let numerosStr = (typeof estatisticasDetalhadasJogador === 'function') ? estatisticasDetalhadasJogador(p.nome) : '';
                let tagNumeros = numerosStr ? ` [Números: ${numerosStr}]` : "";
                return `[Nome: ${p.nome} | Pos: ${p.posicao} | OVR: ${p.ovr} | Nota Média: ${p.mediaNota}${p.indisponivelStr}${p.fadigaStr}${tagReserva}${tagHabitual}${tagPerfil}${tagNumeros}]`;
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
            9. APRENDA COM O HISTÓRICO (se houver um bloco de histórico de partidas anteriores no prompt): leve em conta o que já funcionou e o que não funcionou nos jogos passados do treinador com este time. Se uma formação ou abordagem já falhou repetidamente contra adversários parecidos, evite repeti-la sem motivo; se algo deu certo, é um bom sinal para manter ou repetir em contextos parecidos. Isso é conhecimento acumulado do treinador, não regra fixa — use como orientação, não como obrigação cega.
            10. APRENDA COMO ESTE TREINADOR USA CADA JOGADOR (tag "[Costuma jogar aqui neste time: ...]" no elenco acima): alguns jogadores já foram usados repetidamente numa função diferente da posição de carteirinha deles — ex: um zagueiro que esse treinador sempre escala como volante. Isso é um padrão que ESTE treinador já estabeleceu com ESTE jogador, e pesa mais do que a posição de carteirinha sozinha. Ao escalar, prefira colocar o jogador numa das funções que ele já costuma jogar aqui (respeitando ainda a tabela de compatibilidade da regra 6 — nunca fora dela). Você pode variar e escalar numa posição diferente do hábito quando o contexto pedir claramente (lesão, tática específica pro adversário, falta de opção), mas isso deve ser a exceção, não o padrão, e merece uma instrução explicando o motivo da mudança.`;
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
            // Mas os relatórios das partidas JÁ finalizadas continuam existindo embaixo da tela
            // e precisam ser renderizados aqui também, senão o painel "Relatórios do Auxiliar"
            // abre vazio sempre que há uma partida ao vivo (bug reportado pelo treinador).
            if (d.partidaAuxiliar) {
                renderizarEspelhoPartidaAuxiliar(d.partidaAuxiliar);
                renderizarRelatoriosAuxiliar();
                return;
            }

            let sug = d.sugestaoAuxiliar;
            if (!sug) {
                box.style.display = 'none';
                if (pedir) pedir.style.display = 'block';
                renderizarRelatoriosAuxiliar();
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

                    ${(sug.dnaEmVigor && typeof identidadeTaticaEmProsa === 'function') ? `<p style="font-size:13px; line-height:1.6; margin:12px 0 0 0; padding:10px 12px; background:rgba(0,0,0,0.18); border-left:3px solid var(--primary); border-radius:0 6px 6px 0;"><strong style="color:var(--primary);">🧬 Identidade desta partida:</strong> ${identidadeTaticaEmProsa(sug.dnaEmVigor)}</p>` : ''}
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
                    ${(sug.alertasAfinidadeTatica && sug.alertasAfinidadeTatica.length) ? `<p style="font-size:12px; color:var(--warning); line-height:1.6; margin:6px 0 0 0;">🎯 Afinidade Tática: ${sug.alertasAfinidadeTatica.map(a => `${a.nome} (${a.role}) não tem "${a.funcaoExigida}" no perfil — entrou mesmo assim por falta de opção melhor`).join('; ')}.</p>` : ''}

                    <h4 style="margin:18px 0 8px 0; font-size:14px; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Escalação sugerida <span style="font-weight:normal; color:var(--text-muted); font-size:12px; text-transform:none;">(clique num jogador pra ver a função dele)</span></h4>
                    <div class="campo-futebol-grande" id="campo-sugestao-auxiliar"></div>
                    <div id="banco-sugestao-auxiliar" style="margin-top:15px;"></div>

                    <div style="display:flex; gap:10px; margin-top:18px; flex-wrap:wrap;">
                        <button onclick="levarPlanoParaIniciarPartida()" style="flex:1; background:var(--primary); color:black; padding:12px; font-size:15px;">▶️ Iniciar Partida com este Plano</button>
                        <button onclick="declararPartidaIA()" style="background:var(--panel-bg); border:1px solid var(--accent); color:var(--accent);">🔄 Refazer o plano</button>
                    </div>
                </div>`;

            renderizarCampinhoEspelhoLeitura(t.esquema, sug.escalacao, sug.reservas, sug.tatica, null, sug.funcoesPorRole);
            renderizarRelatoriosAuxiliar();
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
                        <button onclick="mudarAba('tab-salvar-partida')" style="flex:1; min-width:170px; background:var(--primary); color:black; padding:12px; font-size:14px;">⚽ Ir pro Dia de Jogo</button>
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
        // Perfil tático de uma especialidade cadastrada (Zagueiro/Híbrido, Volante/Organizador...)
        // — usado pra comparar reserva x titular e dar um motivo de entrada REAL, não um texto
        // genérico igual pra qualquer jogador do mesmo grupo. Baseado só na posição de carteirinha
        // (nunca em atributos escondidos, que o jogo não expõe pra IA/motor). O perfil de cada
        // especialidade vem de ESPECIALIDADES_JOGADOR, em js/funcoes-ea.js.
        function _perfilTaticoDaPosicao(posicao) {
            return (typeof perfilTaticoEspecialidade === 'function') ? perfilTaticoEspecialidade(posicao) : 'equilibrado';
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
                    let fora = partida.jogadoresForaDaPartida || [];
                    let aoVivo = partida.status === 'em_andamento';
                    let disponiveis = partida.banco.filter(r => r.nome && !fora.includes(r.nome)).length;

                    boxBanco.innerHTML = `<div class="banco-cabecalho">
                            <h3>🪑 Banco de Reservas</h3>
                            <span class="banco-contagem">${disponiveis} de ${partida.banco.length} disponíveis · clique pra ${aoVivo ? 'declarar substituição' : 'trocar'}</span>
                        </div>
                        <div class="banco-reservas-grid">
                            ${partida.banco.map((r, idx) => {
                                let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes((r.nome || '').toLowerCase().trim()));
                                // Quem já saiu da partida não volta mais (regra do futebol) — o banco
                                // precisa mostrar isso, senão o treinador clica achando que é opção.
                                let jaSaiu = fora.includes(r.nome);
                                let posTxt = (jogBD ? jogBD.posicao : r.posicao) || '';
                                return `<div class="banco-reserva-item ${jaSaiu ? 'indisponivel' : ''}" ${jaSaiu ? '' : `onclick="abrirSeletorTrocaBanco(${idx})"`}>
                                    <div class="banco-reserva-ovr">${jogBD ? jogBD.ovr : '?'}</div>
                                    <div class="banco-reserva-info">
                                        <strong>${r.nome}</strong>
                                        <span>${posTxt}</span>
                                        ${jaSaiu ? `<span class="banco-reserva-papel" style="color:var(--danger);">Já saiu da partida</span>` : (r.papel ? `<span class="banco-reserva-papel">${r.papel}</span>` : '')}
                                    </div>
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
                if (label) label.innerHTML = `✅ ${file.name}<input type="file" accept="image/*" capture="environment" style="display:none;" onchange="anexarImagemAdversario(event, '${tipo}')">`;
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }

        function removerImagemAdversario(tipo) {
            if (tipo === 'escalacao') imagemAdvEscalacao = null; else imagemAdvTatica = null;
            let label = document.getElementById(tipo === 'escalacao' ? 'label-declarar-escalacao' : 'label-declarar-tatica');
            if (label) label.innerHTML = `📸 Print: ${tipo === 'escalacao' ? 'Escalação Provável do Adversário' : 'Predefinições Táticas do Adversário'}<input type="file" accept="image/*" capture="environment" style="display:none;" onchange="anexarImagemAdversario(event, '${tipo}')">`;
        }

        // =====================================================================================
        // DIRETRIZES ESTRATÉGICAS — reconstruídas do zero a pedido do treinador: "existe hoje,
        // mas não funciona" (a versão antiga era só uma frase de texto que a IA tentava seguir
        // "literalmente", sem garantia nenhuma). A partir de agora, cada diretriz é um ALGORITMO
        // determinístico de verdade, adicionado uma de cada vez — a IA deixa de decidir QUEM joga
        // e passa a só escrever a instrução tática/função de cada titular JÁ definido pelo código.
        // =====================================================================================
        // As funções de pontuação (calcularPontuacaoEfetivaEscalacaoPadrao / ...RotacaoEquilibrada)
        // são "function" tradicionais, içadas pro topo do escopo — podem ser referenciadas aqui
        // mesmo estando declaradas mais abaixo no arquivo.
        const DIRETRIZES_ESTRATEGICAS = {
            'titular-padrao': {
                nome: 'Escalação Titular Padrão (Recomendada)',
                descricaoIA: 'Escalar sempre os titulares com a maior pontuação efetiva no momento — calculada por um algoritmo do clube a partir do OVR, do desempenho recente em campo e de uma penalidade que cresce de forma EXPONENCIAL com a fadiga acumulada (branda até uns 60% de fadiga, agressiva a partir de 70%). Não há rodízio artificial nem preservação além do que a própria fadiga já penaliza — a escalação NÃO é mais uma decisão sua, é um dado já calculado (veja o bloco "TITULARES JÁ DEFINIDOS" abaixo).',
                calcularPontuacaoEfetiva: calcularPontuacaoEfetivaEscalacaoPadrao
            },
            'rotacao-equilibrada': {
                nome: 'Rotação Equilibrada',
                descricaoIA: 'Escalar sempre os titulares com a maior pontuação efetiva no momento — mesmo cálculo da Escalação Titular Padrão (OVR + desempenho recente, descontada a fadiga acumulada), mas com uma penalidade por fadiga mais sensível (curva CÚBICA em vez de exponencial), que já começa a pesar por volta dos 50% de fadiga. Isso força uma rotação natural do elenco na faixa de 50%-70% de cansaço, sem descaracterizar a força do time — um titular levemente cansado pode legitimamente perder a vaga pra um reserva descansado. A escalação NÃO é mais uma decisão sua, é um dado já calculado (veja o bloco "TITULARES JÁ DEFINIDOS" abaixo).',
                calcularPontuacaoEfetiva: calcularPontuacaoEfetivaRotacaoEquilibrada
            },
            'rodizio-extremo': {
                nome: 'Rodízio Extremo (Poupar Titulares)',
                descricaoIA: 'Poupar os titulares de verdade: mesmo cálculo base (OVR + desempenho recente), mas com uma penalidade por fadiga QUADRÁTICA e muito agressiva — já com uns 40% de fadiga o titular perde a vaga pra um reserva/jovem totalmente descansado, mesmo que o reserva tenha um OVR bem menor. É pra ser um rodízio de verdade, não uma escalação otimizada — a força do time cede espaço pro descanso do elenco. A escalação NÃO é mais uma decisão sua, é um dado já calculado (veja o bloco "TITULARES JÁ DEFINIDOS" abaixo).',
                calcularPontuacaoEfetiva: calcularPontuacaoEfetivaRodizioExtremo
            },
            'forca-maxima': {
                nome: 'Força Máxima Possível',
                descricaoIA: 'Priorizar sempre os melhores jogadores tecnicamente do elenco (maior OVR + desempenho recente), deixando a fadiga interferir muito pouco na escalação — mesmo cálculo base, mas com uma penalidade por fadiga de 5º GRAU e teto reduzido (40 em vez de 60/70), que só pesa de verdade lá na reta final do cansaço (acima de 80%). Um titular tecnicamente superior segue titular mesmo bem cansado, a menos que já esteja em estado físico crítico. A escalação NÃO é mais uma decisão sua, é um dado já calculado (veja o bloco "TITULARES JÁ DEFINIDOS" abaixo).',
                calcularPontuacaoEfetiva: calcularPontuacaoEfetivaForcaMaxima
            },
            'oportunidade-jovens': {
                nome: 'Dar Oportunidade à Base/Jovens',
                descricaoIA: 'Priorizar minutos pras joias da base: jogadores até 22 anos com pouca minutagem na temporada (jovens promessas, comparados à média de jogos de todo o elenco) recebem um bônus artificial enorme (+25) na pontuação efetiva — grande o bastante pra superarem titulares consagrados. O objetivo é que cerca de METADE dos relacionados desta partida (titulares + banco) seja formada por essas promessas, mesmo abrindo mão de força técnica pontualmente; o restante das vagas fica com quem sobrou de maior pontuação geral, jovem ou veterano. A escalação NÃO é mais uma decisão sua, é um dado já calculado (veja o bloco "TITULARES JÁ DEFINIDOS" abaixo).',
                selecionarEscalacaoEBanco: montarRelacionadosOportunidadeJovens
            },
            'titulares-todo-custo': {
                nome: 'Titulares a Todo Custo (Risco de Lesão)',
                descricaoIA: 'Escalar sempre os melhores jogadores puramente pela qualidade técnica (OVR + desempenho recente), IGNORANDO COMPLETAMENTE a fadiga acumulada — não existe penalidade nenhuma por cansaço nesta diretriz, o treinador decidiu arriscar tudo pela força máxima em campo. Qualquer titular com 80% de fadiga ou mais entra escalado do mesmo jeito, mas o clube registra um alerta de risco de lesão pra ele (vai pro boletim médico depois da partida). A escalação NÃO é mais uma decisão sua, é um dado já calculado (veja o bloco "TITULARES JÁ DEFINIDOS" abaixo).',
                calcularPontuacaoEfetiva: calcularPontuacaoEfetivaTitularesTodoCusto
            },
            'em-melhor-momento': {
                nome: 'Em Melhor Momento',
                descricaoIA: 'Meritocracia pura de curto prazo: o OVR do jogador é COMPLETAMENTE IGNORADO — a escalação se baseia exclusivamente na nota média das últimas 5 partidas de cada um (o momento atual em campo), com a mesma penalidade por fadiga EXPONENCIAL de 4º grau da Escalação Titular Padrão (branda até uns 60% de fadiga, agressiva a partir de 70%). Um jogador em ótima fase pode e deve tomar a vaga de um nome de peso que está mal fisicamente ou tecnicamente na temporada, mesmo tendo um OVR bem menor. A escalação NÃO é mais uma decisão sua, é um dado já calculado (veja o bloco "TITULARES JÁ DEFINIDOS" abaixo).',
                calcularPontuacaoEfetiva: calcularPontuacaoEfetivaEmMelhorMomento,
                notaMediaFn: notaMediaUltimos5JogosJogador
            }
        };

        // =====================================================================================
        // FOCO TÁTICO DA PARTIDA — pedido do treinador: por enquanto só captura a escolha (o
        // "estado" fica salvo no save, pronto pra alimentar uma lógica futura de formação ideal,
        // altura da linha defensiva e perfis de jogadores por posição). NENHUMA dessas
        // diretrizes/cálculos usa este valor ainda — é só o campo + a persistência dele.
        // =====================================================================================
        const FOCOS_TATICOS_PARTIDA = {
            'equilibrado': 'Equilibrado (Padrão)',
            'ofensivo': 'Ofensivo',
            'extremamente_ofensivo': 'Extremamente Ofensivo',
            'tudo_ou_nada': 'Tudo ou Nada (Desespero)',
            'defensivo': 'Defensivo',
            'extremamente_defensivo': 'Extremamente Defensivo (Retranca)',
            'segura_o_jogo': 'Segurar o Jogo (Matar Tempo)'
        };

        // Chamado pelo onchange do select — grava a escolha no save (currentSave) assim que o
        // treinador muda, sem precisar de nenhum outro botão de salvar.
        function salvarFocoPartidaSelecionado() {
            let select = document.getElementById('declarar-partida-foco');
            if (!select || !db[currentSave]) return;
            db[currentSave].focoPartidaSelecionado = select.value;
            salvarDados();
        }

        // Chamado ao entrar na aba Auxiliar — devolve o select pro valor salvo (sem isso, ele
        // sempre voltaria pro primeiro item da lista a cada troca de aba/recarregamento).
        function restaurarFocoPartidaSelecionado() {
            let select = document.getElementById('declarar-partida-foco');
            if (!select || !db[currentSave]) return;
            let salvo = db[currentSave].focoPartidaSelecionado;
            select.value = (salvo && FOCOS_TATICOS_PARTIDA[salvo]) ? salvo : 'equilibrado';
        }

        // Fase 1 do fluxo "Pedir Plano de Jogo" (pedido do treinador): antes de qualquer coisa,
        // o Auxiliar lê o contexto do time (metas da temporada, momento atual, retrospecto contra
        // o adversário, se é jogo de volta de mata-mata) e RECOMENDA a Diretriz Estratégica e o
        // Foco Tático — sem ainda montar a escalação. O treinador pode aceitar ou trocar a
        // recomendação na Fase 2, que só então libera o botão "Prosseguir com Escalação"
        // (declararPartidaIA, sem nenhuma alteração).
        // Mando de campo (pedido do treinador): casa/fora/neutro muda a leitura real de uma
        // partida — jogar fora costuma pedir mais cautela, em casa dá pra arriscar mais com o
        // apoio da torcida, neutro tira a vantagem de mando dos dois lados. Usado tanto na
        // recomendação de Diretriz/Foco quanto na montagem do plano tático completo.
        function _textoMandoIA(mando) {
            if (mando === 'Fora') return 'Fora de casa — leve em conta a pressão extra da torcida adversária e a ausência do fator casa; times costumam jogar um pouco mais cautelosos fora.';
            if (mando === 'Neutro') return 'Campo neutro — nenhum dos dois lados tem vantagem de mando/torcida.';
            return 'Em casa — o apoio da torcida permite uma postura um pouco mais ousada.';
        }


        // =====================================================================================
        // RECOMENDAÇÃO DE DIRETRIZ + FOCO — decidida por MOTOR, não pela IA (pedido do treinador:
        // "toda sugestão ele entrega diretriz escalação titular padrão e foco ofensivo, quero
        // autenticidade de acordo ao adversário"). Deixar a escolha na mão da IA dava sempre a
        // mesma resposta, porque o prompt não tinha número nenhum pra diferenciar um jogo do
        // outro. Agora os sinais reais da partida decidem, e a IA só escreve o texto explicando —
        // mesma divisão de trabalho que já vale pra escalação (o algoritmo decide QUEM joga, a IA
        // escreve a instrução).
        //
        // Os sinais são todos verificáveis no save: força do elenco x nível da liga, retrospecto
        // direto contra ESTE adversário, momento nos últimos 5 jogos, desgaste do elenco, mando e
        // saldo agregado quando é jogo de volta de mata-mata. Por cima disso entra a postura
        // natural do ESTILO DE JOGO escolhido — é o que amarra a recomendação ao estilo em vez de
        // sugerir um foco que contraria a identidade do time.
        // =====================================================================================
        function _sinaisDaPartida(nomeAdversario, competicaoSelecionada, mando) {
            let d = db[currentSave] || {};
            let partidas = Array.isArray(d.partidas) ? d.partidas : [];
            let ativos = (d.plantel || []).filter(p => p.status === 'Ativo');

            let ovrLiga = Number((String(d.liga || '').match(/\d+/g) || [70]).pop());
            let top11 = ativos.slice().sort((a, b) => (b.ovr || 0) - (a.ovr || 0)).slice(0, 11);
            let ovrTime = top11.length ? top11.reduce((soma, p) => soma + (p.ovr || 0), 0) / top11.length : ovrLiga;

            let alvo = String(nomeAdversario || '').toLowerCase().trim();
            let confrontos = partidas.filter(p => String(p.adversario || '').toLowerCase().trim() === alvo);
            let vitorias = 0, empates = 0, derrotas = 0;
            confrontos.forEach(p => {
                if ((p.golsPro || 0) > (p.golsContra || 0)) vitorias++;
                else if ((p.golsPro || 0) === (p.golsContra || 0)) empates++;
                else derrotas++;
            });

            let ultimos = partidas.slice(-5);
            let pontosUltimos = ultimos.reduce((soma, p) => soma + ((p.golsPro || 0) > (p.golsContra || 0) ? 3 : ((p.golsPro || 0) === (p.golsContra || 0) ? 1 : 0)), 0);

            let cansados = top11.filter(p => (p.fadiga || 0) >= 60).length;
            let criticos = top11.filter(p => (p.fadiga || 0) >= 80 || (p.diasLesao || 0) > 0).length;

            let saldoAgregado = null;
            if (competicaoSelecionada) {
                let ida = partidas.find(p => String(p.adversario || '').toLowerCase().trim() === alvo &&
                    p.comp === competicaoSelecionada && p.temporada === d.temporadaAtual);
                if (ida) saldoAgregado = (ida.golsPro || 0) - (ida.golsContra || 0);
            }

            return {
                ovrTime: Math.round(ovrTime), ovrLiga: ovrLiga, gapLiga: Math.round(ovrTime - ovrLiga),
                confrontos: confrontos.length, vitorias: vitorias, empates: empates, derrotas: derrotas,
                jogosRecentes: ultimos.length, pontosUltimos: pontosUltimos,
                cansados: cansados, criticos: criticos, titularesConsiderados: top11.length,
                saldoAgregado: saldoAgregado, mando: mando || 'Casa'
            };
        }

        // Postura natural do estilo de jogo salvo (-2 bem retrancado ... +2 bem agressivo).
        function _posturaDoEstiloAtivo() {
            let dna = (typeof dnaDoEstiloSalvo === 'function') ? dnaDoEstiloSalvo(db[currentSave] && db[currentSave].taticas) : null;
            if (!dna) return { valor: 0, dna: null };
            let valor = 0;
            valor += ({ alto: 1, medio: 0, baixo: -1 })[dna.altura_bloco] || 0;
            valor += ({ gegenpressing: 1, equilibrio_transicao: 0, recomposicao: -1 })[dna.reacao_perda] || 0;
            valor += ({ vertical: 0.5, situacional: 0, manutencao: -0.5 })[dna.reacao_recuperacao] || 0;
            return { valor: valor, dna: dna };
        }

        const _ESCADA_FOCO = ['extremamente_defensivo', 'defensivo', 'equilibrado', 'ofensivo', 'extremamente_ofensivo'];

        function recomendarDiretrizFoco(nomeAdversario, competicaoSelecionada, mando) {
            let s = _sinaisDaPartida(nomeAdversario, competicaoSelecionada, mando);
            let estilo = _posturaDoEstiloAtivo();
            let motivos = [];

            // ---- FOCO: postura do estilo + contexto real da partida ----
            // A postura do estilo entra com peso LIMITADO (no máximo um degrau e meio da escada):
            // ela inclina a recomendação pro lado da identidade do time, mas não pode saturar a
            // escala sozinha — se saturasse, adversários diferentes cairiam sempre no mesmo foco,
            // que era exatamente a reclamação ("toda sugestão entrega o mesmo").
            let escala = Math.max(-1.5, Math.min(1.5, estilo.valor));
            if (estilo.dna) motivos.push(`o estilo do time joga em ${(opcaoDnaPorId('altura_bloco', estilo.dna.altura_bloco) || {}).nome || 'bloco médio'} e ${((opcaoDnaPorId('reacao_perda', estilo.dna.reacao_perda) || {}).nome || '').toLowerCase()}`);

            if (s.mando === 'Casa') { escala += 1; motivos.push('jogamos em casa'); }
            else if (s.mando === 'Fora') { escala -= 1; motivos.push('jogamos fora'); }

            if (s.gapLiga >= 4) { escala += 1; motivos.push(`nosso elenco está ${s.gapLiga} pontos de OVR acima do nível da liga`); }
            else if (s.gapLiga <= -4) { escala -= 1; motivos.push(`nosso elenco está ${Math.abs(s.gapLiga)} pontos de OVR abaixo do nível da liga`); }

            if (s.confrontos > 0) {
                if (s.vitorias > s.derrotas) { escala += 1; motivos.push(`histórico favorável contra ${nomeAdversario} (${s.vitorias}V ${s.empates}E ${s.derrotas}D)`); }
                else if (s.derrotas > s.vitorias) { escala -= 1; motivos.push(`histórico ruim contra ${nomeAdversario} (${s.vitorias}V ${s.empates}E ${s.derrotas}D)`); }
            }

            if (s.jogosRecentes >= 3) {
                if (s.pontosUltimos >= 10) { escala += 1; motivos.push(`time embalado (${s.pontosUltimos} pontos nos últimos ${s.jogosRecentes})`); }
                else if (s.pontosUltimos <= 4) { escala -= 1; motivos.push(`momento ruim (${s.pontosUltimos} pontos nos últimos ${s.jogosRecentes})`); }
            }

            let indice = Math.max(0, Math.min(_ESCADA_FOCO.length - 1, 2 + Math.round(escala / 2)));
            let foco = _ESCADA_FOCO[indice];

            // Jogo de volta de mata-mata manda em tudo: o placar agregado decide a postura.
            if (s.saldoAgregado !== null) {
                if (s.saldoAgregado <= -2) { foco = 'tudo_ou_nada'; motivos.push(`estamos ${Math.abs(s.saldoAgregado)} gols atrás no agregado`); }
                else if (s.saldoAgregado === -1) { foco = 'extremamente_ofensivo'; motivos.push('estamos 1 gol atrás no agregado'); }
                else if (s.saldoAgregado >= 2) { foco = 'segura_o_jogo'; motivos.push(`temos ${s.saldoAgregado} gols de vantagem no agregado`); }
                else if (s.saldoAgregado === 1) { foco = 'defensivo'; motivos.push('temos 1 gol de vantagem no agregado'); }
            }

            // ---- DIRETRIZ: estado físico do elenco x tamanho do jogo ----
            let jogoDecisivo = s.saldoAgregado !== null || s.gapLiga <= -4 || (s.confrontos > 0 && s.derrotas > s.vitorias);
            let elencoInteiro = s.titularesConsiderados >= 11;
            let diretriz;
            if (jogoDecisivo && s.cansados <= 3) {
                diretriz = 'forca-maxima';
                motivos.push('jogo grande demais pra poupar alguém');
            } else if (jogoDecisivo && s.criticos === 0) {
                diretriz = 'titulares-todo-custo';
                motivos.push('vale o risco de escalar os titulares mesmo cansados');
            } else if (s.criticos >= 3 && elencoInteiro) {
                diretriz = 'rodizio-extremo';
                motivos.push(`${s.criticos} titulares em estado físico crítico`);
            } else if (s.cansados >= 4 && elencoInteiro) {
                diretriz = 'rotacao-equilibrada';
                motivos.push(`${s.cansados} titulares acumulando desgaste`);
            } else if (s.gapLiga >= 6 && s.cansados >= 2 && elencoInteiro) {
                diretriz = 'oportunidade-jovens';
                motivos.push('elenco muito superior ao da liga — dá pra rodar a base sem perder o jogo');
            } else if (s.jogosRecentes >= 3 && s.pontosUltimos <= 4) {
                diretriz = 'em-melhor-momento';
                motivos.push('a sequência ruim pede quem está melhor agora, não quem tem o nome maior');
            } else {
                diretriz = 'titular-padrao';
                motivos.push('elenco inteiro à disposição e sem alerta físico');
            }

            return { diretriz: diretriz, foco: foco, sinais: s, motivos: motivos };
        }

        async function gerarSugestaoDiretrizFoco() {
            let nomeAdvManual = document.getElementById('declarar-adv-nome').value.trim();
            if (!nomeAdvManual) return alert('Digite o nome do adversário antes de pedir a sugestão.');
            let competicaoEl = document.getElementById('declarar-competicao');
            let competicaoSelecionada = competicaoEl ? competicaoEl.value : '';
            let mandoEl = document.getElementById('declarar-mando');
            let mandoSelecionado = mandoEl ? mandoEl.value : 'Casa';
            if (db[currentSave]) db[currentSave].mandoPartidaSelecionado = mandoSelecionado;

            let btn = document.getElementById('btn-gerar-sugestao-diretriz-foco');
            if (btn) { btn.innerText = '⏳ Analisando o contexto do time...'; btn.disabled = true; }
            if (typeof mostrarCarregandoIA === 'function') mostrarCarregandoIA('🧠 O Auxiliar está lendo o contexto da temporada...');

            // Padrão seguro caso a IA falhe ou devolva algo inválido — o treinador ainda pode
            // ajustar tudo manualmente na Fase 2, então uma falha aqui nunca trava o fluxo.
            // O motor decide (sinais reais + postura do estilo); a IA só escreve a explicação.
            let recomendacao = recomendarDiretrizFoco(nomeAdvManual, competicaoSelecionada, mandoSelecionado);
            let diretrizRecomendada = recomendacao.diretriz;
            let focoRecomendado = recomendacao.foco;
            let justificativa = `${DIRETRIZES_ESTRATEGICAS[diretrizRecomendada].nome} com foco ${FOCOS_TATICOS_PARTIDA[focoRecomendado]} — ${recomendacao.motivos.join('; ')}.`;

            try {
                let resumoContexto = (typeof gerarResumoContexto === 'function') ? gerarResumoContexto() : '';
                let retrospecto = (typeof retrospectoContraAdversario === 'function') ? retrospectoContraAdversario(nomeAdvManual) : '';
                let mataMata = (typeof contextoMataMataIA === 'function') ? contextoMataMataIA(nomeAdvManual, competicaoSelecionada) : '';

                let catalogoDiretrizes = Object.entries(DIRETRIZES_ESTRATEGICAS).map(([id, info]) => `- "${id}": ${info.nome} — ${info.descricaoIA}`).join('\n            ');
                let catalogoFocos = Object.entries(FOCOS_TATICOS_PARTIDA).map(([id, nome]) => `- "${id}": ${nome}`).join('\n            ');

                let promptIA = `Você é ${nomeAuxiliarExibicao()}, o Analista de Desempenho e Estrategista do "${db[currentSave].nome}". Antes de montar a escalação completa pro próximo jogo contra ${nomeAdvManual}${competicaoSelecionada ? ` (${competicaoSelecionada})` : ''}, o treinador quer sua RECOMENDAÇÃO de Diretriz Estratégica (quem joga) e Foco Tático (postura da partida) — a escalação em si só vem depois, se ele confirmar ou ajustar sua recomendação.

                ${resumoContexto}
                [MANDO DE CAMPO: ${_textoMandoIA(mandoSelecionado)}]
                ${retrospecto ? `\n[RETROSPECTO CONTRA ESTE ADVERSÁRIO: ${retrospecto}]` : ''}
                ${mataMata ? `\n[ATENÇÃO — MATA-MATA: ${mataMata}]` : ''}

                CATÁLOGO DE DIRETRIZES ESTRATÉGICAS (escolha exatamente um "id" da lista abaixo):
                ${catalogoDiretrizes}

                CATÁLOGO DE FOCOS TÁTICOS DA PARTIDA (escolha exatamente um "id" da lista abaixo):
                ${catalogoFocos}

                Leve em conta principalmente: (1) a prioridade da meta da temporada — se o time está muito distante do objetivo declarado, o jogo é de alta prioridade e pede mais risco; se a meta já está garantida ou tranquila, dá pra poupar/rotacionar; (2) o momento atual (sequência de resultados, fase); (3) se ESTE é o jogo de volta de um mata-mata — nesse caso o placar agregado dita se a postura certa é segurar o resultado ou arriscar tudo; (4) o retrospecto direto contra este adversário específico.

                DECISÃO JÁ TOMADA PELO DEPARTAMENTO DE ANÁLISE (não é sua, não mude):
                - Diretriz Estratégica: "${DIRETRIZES_ESTRATEGICAS[diretrizRecomendada].nome}"
                - Foco Tático da Partida: "${FOCOS_TATICOS_PARTIDA[focoRecomendado]}"
                - Números e fatos que levaram a ela: ${recomendacao.motivos.join('; ')}.
                - Leitura do elenco: OVR médio dos 11 melhores ${recomendacao.sinais.ovrTime} contra nível ${recomendacao.sinais.ovrLiga} da liga; ${recomendacao.sinais.cansados} titulares com desgaste alto e ${recomendacao.sinais.criticos} em estado crítico.

                Sua tarefa é APENAS escrever a justificativa dessa decisão pro treinador, com a sua voz de auxiliar: 2 a 4 frases, em português, citando os números acima e o adversário pelo nome. Não proponha outra diretriz nem outro foco.

                Responda APENAS com um JSON puro, sem nenhum texto fora dele, exatamente neste formato:
                { "justificativa": "<2-4 frases em português explicando a decisão acima>" }`;

                const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
                let bruto = (data.candidates[0].content.parts[0].text || '').trim();
                let match = bruto.match(/\{[\s\S]*\}/);
                if (match) {
                    let json = JSON.parse(match[0]);
                    // Só o texto vem da IA — a diretriz e o foco já foram decididos pelo motor.
                    if (json.justificativa) justificativa = String(json.justificativa).trim();
                }
            } catch (e) {
                // Falha na IA (rede, JSON inválido, etc.) não trava o fluxo — cai pro padrão já
                // definido acima, com uma justificativa genérica.
            }

            if (typeof esconderCarregandoIA === 'function') esconderCarregandoIA();
            if (btn) { btn.innerText = '🧠 Gerar Sugestão de Diretriz e Foco'; btn.disabled = false; }

            document.getElementById('declarar-adv-diretriz').value = diretrizRecomendada;
            document.getElementById('declarar-partida-foco').value = focoRecomendado;
            salvarFocoPartidaSelecionado();

            let justEl = document.getElementById('auxiliar-fase2-justificativa');
            if (justEl) justEl.innerHTML = `🧭 <strong>Recomendação do Auxiliar:</strong> ${justificativa}`;

            let fase2 = document.getElementById('auxiliar-fase2-diretriz-foco');
            if (fase2) fase2.style.display = 'block';
        }

        // Nota média do jogador nas partidas que já disputou, na escala 0-100 (ex: 7.0 vira 70,
        // igual ao OVR) — é a "nota_media" da fórmula da diretriz. Sem nenhuma partida registrada
        // ainda, cai pro próprio OVR: um jogador novo não é penalizado nem favorecido por falta de
        // amostra, a nota base dele fica exatamente igual ao OVR.
        function notaMediaEscaladaJogador(p) {
            let notas = [];
            (db[currentSave].partidas || []).forEach(partida => {
                let at = (partida.jogadores || []).find(j => j.nome === p.nome);
                if (at && typeof at.nota === 'number') notas.push(at.nota);
            });
            if (!notas.length) return p.ovr;
            return (notas.reduce((a, b) => a + b, 0) / notas.length) * 10;
        }

        // Pedido do treinador pra diretriz "Escalação Titular Padrão": uma curva de penalidade
        // EXPONENCIAL por fadiga — branda até uns 60% de fadiga, mas que dispara de forma agressiva
        // a partir de 70%, simulando a queda física AGUDA de um atleta realmente exausto (bem
        // diferente de uma penalidade linear, que penalizaria demais cedo demais).
        //
        //   nota_base  = (ovr + nota_media) / 2          [nota_media já na escala 0-100]
        //   penalidade = (fadiga_atual / 100)^4 * 60      [pow^4 => quase zero até 60%, agressivo depois]
        //   pontuacao_efetiva = nota_base - penalidade    [arredondada pra 1 casa decimal]
        //
        // Comportamento esperado (validado): fadiga 20% ≈ -0.1pt · 50% ≈ -3.7/3.8pt · 70% ≈ -14.4pt
        // · 85% ≈ -31.3pt · 100% = -60pt (o teto: nunca desconta mais que 60 pontos).
        function calcularPontuacaoEfetivaEscalacaoPadrao(ovr, notaMedia, fadigaAtual) {
            let notaBase = (Number(ovr) + Number(notaMedia)) / 2;
            let fadiga = Math.max(0, Math.min(100, Number(fadigaAtual) || 0));
            let penalidade = Math.pow(fadiga / 100, 4) * 60;
            return Math.round((notaBase - penalidade) * 10) / 10;
        }

        // Pedido do treinador pra diretriz "Rotação Equilibrada": a MESMA nota_base da Escalação
        // Titular Padrão, mas com uma curva de penalidade CÚBICA (em vez de à 4ª potência) — mais
        // sensível ao cansaço médio, começando a pesar de verdade já por volta dos 50% de fadiga,
        // pra forçar uma rotação natural do elenco na faixa de 50%-70% (um titular só levemente
        // cansado já pode perder a vaga pra um reserva descansado), sem descaracterizar o time.
        //
        //   penalidade = (fadiga_atual / 100)^3 * 60      [pow^3 => sobe antes e mais rápido que a padrão]
        //
        // Validado com o cenário do pedido: Jogador A (OVR 78, nota 74, fadiga 60%) dá nota_base
        // 76, penalidade 12.96, pontuação efetiva 63.0. Jogador B (OVR 66, nota 66, fadiga 20%) dá
        // nota_base 66, penalidade 0.48, pontuação efetiva 65.5 — o reserva descansado (65.5) bate
        // o titular cansado (63.0) e leva a vaga.
        function calcularPontuacaoEfetivaRotacaoEquilibrada(ovr, notaMedia, fadigaAtual) {
            let notaBase = (Number(ovr) + Number(notaMedia)) / 2;
            let fadiga = Math.max(0, Math.min(100, Number(fadigaAtual) || 0));
            let penalidade = Math.pow(fadiga / 100, 3) * 60;
            return Math.round((notaBase - penalidade) * 10) / 10;
        }

        // Pedido do treinador pra diretriz "Rodízio Extremo (Poupar Titulares)": a MESMA nota_base,
        // mas com uma curva de penalidade QUADRÁTICA e um multiplicador máximo maior (70 em vez de
        // 60) — a mais agressiva das três diretrizes. A fadiga destrói a pontuação muito rápido: já
        // com uns 40% de fadiga o titular perde a vaga, mesmo pra um reserva de OVR bem menor. Não
        // é uma escalação otimizada, é rodízio de verdade: o descanso do elenco pesa mais que a
        // força do time em campo.
        //
        //   penalidade = (fadiga_atual / 100)^2 * 70      [pow^2, teto 70 => a mais agressiva das três]
        //
        // Validado com o cenário do pedido: Jogador A (craque titular, OVR 84, nota 76, fadiga 45%)
        // dá nota_base 80, penalidade 14.17, pontuação efetiva 65.8. Jogador B (reserva/jovem, OVR
        // 67, nota 67, totalmente descansado) dá pontuação efetiva 67.0 — o reserva de OVR bem menor
        // (67.0) bate o craque cansado (65.8) e leva a vaga, cumprindo o rodízio.
        function calcularPontuacaoEfetivaRodizioExtremo(ovr, notaMedia, fadigaAtual) {
            let notaBase = (Number(ovr) + Number(notaMedia)) / 2;
            let fadiga = Math.max(0, Math.min(100, Number(fadigaAtual) || 0));
            let penalidade = Math.pow(fadiga / 100, 2) * 70;
            return Math.round((notaBase - penalidade) * 10) / 10;
        }

        // Pedido do treinador pra diretriz "Força Máxima Possível": a MESMA nota_base, mas com uma
        // curva de penalidade de 5º GRAU e um multiplicador máximo bem menor (40 em vez de 60/70) —
        // a mais tolerante ao cansaço das quatro diretrizes. A fadiga quase não pesa até uns 60%-70%
        // e só dispara de verdade na reta final (acima de 80%), simulando um "jogo decisivo": o
        // craque titular segue em campo mesmo cansado, porque a superioridade técnica dele justifica
        // o risco — a menos que já esteja em estado físico crítico.
        //
        //   penalidade = (fadiga_atual / 100)^5 * 40      [pow^5, teto 40 => a mais branda das quatro]
        //
        // Validado com o cenário do pedido: Jogador A (craque titular muito cansado, OVR 82, nota
        // 78, fadiga 75%) dá nota_base 80, penalidade 9.49, pontuação efetiva 70.5. Jogador B
        // (reserva 100% descansado, OVR 68, nota 68, fadiga 10%) dá pontuação efetiva 68.0 — o
        // craque cansado (70.5) segue na frente do reserva descansado (68.0) e mantém a vaga.
        function calcularPontuacaoEfetivaForcaMaxima(ovr, notaMedia, fadigaAtual) {
            let notaBase = (Number(ovr) + Number(notaMedia)) / 2;
            let fadiga = Math.max(0, Math.min(100, Number(fadigaAtual) || 0));
            let penalidade = Math.pow(fadiga / 100, 5) * 40;
            return Math.round((notaBase - penalidade) * 10) / 10;
        }

        // Pedido do treinador pra diretriz "Titulares a Todo Custo (Risco de Lesão)": ZERO
        // penalidade por fadiga — a pontuação efetiva é a nota técnica pura (OVR + desempenho
        // recente) / 2, sem nenhum desconto por cansaço. O parâmetro fadigaAtual é recebido só
        // pra manter o mesmo contrato das outras diretrizes (calcularPontuacaoEfetivaFn(ovr,
        // notaMedia, fadigaAtual)), mas é ignorado de propósito. O cansaço não some do jogo: ele
        // vira alerta de risco de lesão depois, em jogadoresEmRiscoDeLesao.
        //
        // Validado com o cenário do pedido: Jogador A (craque, OVR 85, nota 80, fadiga 90%) dá
        // pontuação efetiva 82.5 — a fadiga não desconta nada. Jogador B (reserva 100% descansado,
        // OVR 74, nota 70) dá 72.0. O craque cansado (82.5) continua na frente e é escalado.
        function calcularPontuacaoEfetivaTitularesTodoCusto(ovr, notaMedia, fadigaAtual) {
            let notaBase = (Number(ovr) + Number(notaMedia)) / 2;
            return Math.round(notaBase * 10) / 10;
        }

        // Limiar de fadiga (pedido, seção 3) a partir do qual um titular escalado entra em
        // "risco de lesão" — hoje vira um alerta pro treinador; no futuro alimenta a simulação de
        // lesão muscular no pós-jogo. Varre a escalação FINAL, não importa qual diretriz a gerou
        // (um titular exausto é risco de lesão em qualquer diretriz, não só na "Titulares a Todo
        // Custo" — é só que ela é a única que deixa isso acontecer de propósito).
        const LIMIAR_FADIGA_RISCO_LESAO = 80;

        // "escalacao" aceita tanto {ROLE: "Nome"} (o formato cru dos motores de seleção) quanto
        // {ROLE: {nome, instrucao, ...}} (o formato já mesclado com a resposta da IA em
        // declararPartidaIA) — cobre os dois pontos onde essa função é chamada.
        function jogadoresEmRiscoDeLesao(escalacao) {
            if (!db[currentSave] || !escalacao) return [];
            return Object.entries(escalacao).map(([role, info]) => {
                let nome = typeof info === 'string' ? info : (info && info.nome);
                let jogador = nome ? db[currentSave].plantel.find(p => p.nome === nome) : null;
                if (!jogador || (jogador.fadiga || 0) < LIMIAR_FADIGA_RISCO_LESAO) return null;
                return { nome: jogador.nome, posicao: jogador.posicao, role: role, fadiga: jogador.fadiga };
            }).filter(Boolean);
        }

        // Atalho direto pra diretriz — usado pelos testes e por quem quiser calcular só a
        // escalação, sem passar pelo catálogo.
        function selecionarEscalacaoTitularesTodoCusto(esquema) {
            return selecionarEscalacaoPorPontuacao(esquema, calcularPontuacaoEfetivaTitularesTodoCusto);
        }

        // Nota média do jogador só nas ÚLTIMAS 5 partidas que disputou, na escala 0-100 (ex: 7.5
        // vira 75) — a "nota_media_ultimos_5_jogos" da diretriz "Em Melhor Momento". Diferente de
        // notaMediaEscaladaJogador (todo o histórico, cai pro OVR sem partidas), esta função NUNCA
        // usa o OVR — o pedido é explícito: o OVR é ignorado nesta diretriz. Sem nenhuma partida
        // registrada ainda, cai pra 0 (mesma convenção já usada no Raio-X do jogador, em
        // graficos-historico.js, pra essa métrica específica).
        function notaMediaUltimos5JogosJogador(p) {
            let notas = [];
            (db[currentSave].partidas || []).forEach(partida => {
                let at = (partida.jogadores || []).find(j => j.nome === p.nome);
                if (at && typeof at.nota === 'number') notas.push(at.nota);
            });
            if (!notas.length) return 0;
            let ultimas5 = notas.slice(-5);
            return (ultimas5.reduce((a, b) => a + b, 0) / ultimas5.length) * 10;
        }

        // Pedido do treinador pra diretriz "Em Melhor Momento": meritocracia pura — a nota base
        // NÃO divide nada com o OVR, é literalmente o momento do jogador (nota média só das
        // últimas 5 partidas). A penalidade por fadiga segue a MESMA curva exponencial de 4º grau
        // da Escalação Titular Padrão. O parâmetro "ovr" é recebido só pra manter o mesmo
        // contrato das outras diretrizes, mas é ignorado de propósito.
        //
        //   nota_base = nota_media_ultimos_5_jogos
        //   penalidade = (fadiga_atual / 100)^4 * 60      [igual à Escalação Titular Padrão]
        //   pontuacao_efetiva = nota_base - penalidade
        //
        // Validado com o cenário do pedido: Jogador A (craque em má fase, nota últimos 5 = 62,
        // fadiga 20%, OVR 85 ignorado) dá nota_base 62, penalidade 0.09, pontuação efetiva 61.9.
        // Jogador B (reserva/jovem em boa fase, nota últimos 5 = 78, fadiga 40%, OVR 68 ignorado)
        // dá nota_base 78, penalidade 1.53, pontuação efetiva 76.5 — o jogador em melhor fase
        // folga na frente, mesmo com 17 pontos de OVR a menos.
        function calcularPontuacaoEfetivaEmMelhorMomento(ovr, notaMediaUltimos5, fadigaAtual) {
            let notaBase = Number(notaMediaUltimos5);
            let fadiga = Math.max(0, Math.min(100, Number(fadigaAtual) || 0));
            let penalidade = Math.pow(fadiga / 100, 4) * 60;
            return Math.round((notaBase - penalidade) * 10) / 10;
        }

        // Atalho direto pra diretriz — usado pelos testes e por quem quiser calcular só a
        // escalação, sem passar pelo catálogo.
        function selecionarEscalacaoEmMelhorMomento(esquema) {
            return selecionarEscalacaoPorPontuacao(esquema, calcularPontuacaoEfetivaEmMelhorMomento, notaMediaUltimos5JogosJogador);
        }

        // Monta os 11 titulares de uma diretriz de pontuação (Escalação Titular Padrão, Rotação
        // Equilibrada, ou qualquer outra futura que siga o mesmo contrato) pra uma formação:
        // calcula a pontuação efetiva de cada jogador disponível (ativo, sem lesão/suspensão,
        // convocado) usando a função de pontuação recebida, e encontra a escalação de MAIOR
        // pontuação total entre TODAS as combinações que respeitam a tabela de compatibilidade
        // posicional já usada em todo o resto do jogo (POSICOES_COMPATIVEIS_POR_ROLE) — nunca
        // escala ninguém fora de posição.
        //
        // Isso é um problema clássico de emparelhamento bipartido com peso só do lado dos
        // jogadores (cada função aceita 1 jogador, cada jogador ocupa 1 função). Resolvido com o
        // algoritmo de Kuhn (busca de caminho aumentante): processa os jogadores do MAIOR pro
        // MENOR pontuação e, pra cada um, tenta encaixá-lo numa função compatível — remanejando
        // quem já estava alocado ali (recursivamente) quando existe outra função livre pra ele.
        // Processar sempre do maior pro menor garante que o resultado final é o de maior pontuação
        // total possível respeitando as posições — não só "o primeiro que coube em cada vaga".
        //
        // Retorna {ROLE: "Nome do Jogador"} (pode ter menos de 11 chaves só se, mesmo remanejando,
        // não existir gente compatível suficiente no elenco pra alguma função) ou null se a
        // formação não existir/não houver save carregado.
        // Núcleo do algoritmo de Kuhn (busca de caminho aumentante), extraído pra um helper
        // reutilizável: recebe candidatos JÁ ORDENADOS por pontuação efetiva (do maior pro menor)
        // e as funções táticas da formação, e devolve {ROLE: "Nome"}. Usado tanto por
        // selecionarEscalacaoPorPontuacao (candidatos = elenco inteiro disponível) quanto pela
        // diretriz "Dar Oportunidade à Base/Jovens" (candidatos = só quem entrou na cota).
        function alocarPorPosicaoKuhn(candidatosOrdenados, roles) {
            let posicaoPorNome = {};
            candidatosOrdenados.forEach(c => { posicaoPorNome[c.jogador.nome] = c.jogador.posicao; });

            let ocupantePorRole = {}; // role -> nome do jogador titular naquela função

            // Caminho aumentante clássico de Kuhn: tenta alocar "nomeJogador" numa função livre
            // compatível; se todas as compatíveis já estiverem ocupadas, tenta primeiro liberar uma
            // delas realocando o ocupante atual pra outra função compatível dele.
            function tentarAlocar(nomeJogador, visitadas) {
                for (let role of roles) {
                    if (visitadas.has(role) || !posicaoCompativelComRole(role, posicaoPorNome[nomeJogador])) continue;
                    visitadas.add(role);
                    let ocupanteAtual = ocupantePorRole[role];
                    if (!ocupanteAtual || tentarAlocar(ocupanteAtual, visitadas)) {
                        ocupantePorRole[role] = nomeJogador;
                        return true;
                    }
                }
                return false;
            }

            candidatosOrdenados.forEach(c => tentarAlocar(c.jogador.nome, new Set()));
            return ocupantePorRole;
        }

        // =====================================================================================
        // AFINIDADE TÁTICA (Gegenpressing Dinâmico) — pedido do treinador: quando um preset
        // "refinado" (js/estilo-jogo.js, hoje só o Gegenpressing) está ativo com um Foco Tático
        // da Partida selecionado, a Matriz Dinâmica de Funções exige uma função específica pra
        // CADA posição. Um jogador cuja especialidade não cobre a função exigida NAQUELA posição
        // leva -8 na Nota Efetiva antes da escalação ser decidida — mas ele pode cobrir a função
        // perfeitamente numa OUTRA posição do mesmo esquema. Isso é inerentemente por-(jogador,
        // posição), não por-jogador — o motor de Kuhn acima (alocarPorPosicaoKuhn) não serve pra
        // isso, porque calcula UMA pontuação por jogador antes de alocar, não uma por par. É por
        // isso que existe este motor novo e separado (Húngaro/atribuição de peso máximo), em vez
        // de mexer no motor das 7 Diretrizes já em produção — zero risco de regressão nelas.
        // =====================================================================================

        // Algoritmo húngaro O(n³) pra atribuição de custo mínimo (n tarefas <= m agentes) — molde
        // clássico (potenciais u/v + caminhos aumentantes), 1-indexado internamente. Devolve um
        // array 1-indexado `resultado` onde resultado[i] é a coluna (1-indexada) atribuída à
        // linha i, ou 0 se a linha i não recebeu nenhuma (só acontece se n > m, o que este motor
        // nunca deixa acontecer — ver _custoMatrizPadded abaixo).
        function _hungaroMinimo(custo, n, m) {
            const INF = Infinity;
            let u = new Array(n + 1).fill(0);
            let v = new Array(m + 1).fill(0);
            let p = new Array(m + 1).fill(0);
            let way = new Array(m + 1).fill(0);
            for (let i = 1; i <= n; i++) {
                p[0] = i;
                let j0 = 0;
                let minv = new Array(m + 1).fill(INF);
                let usado = new Array(m + 1).fill(false);
                do {
                    usado[j0] = true;
                    let i0 = p[j0], delta = INF, j1 = -1;
                    for (let j = 1; j <= m; j++) {
                        if (!usado[j]) {
                            let atual = custo[i0 - 1][j - 1] - u[i0] - v[j];
                            if (atual < minv[j]) { minv[j] = atual; way[j] = j0; }
                            if (minv[j] < delta) { delta = minv[j]; j1 = j; }
                        }
                    }
                    for (let j = 0; j <= m; j++) {
                        if (usado[j]) { u[p[j]] += delta; v[j] -= delta; }
                        else { minv[j] -= delta; }
                    }
                    j0 = j1;
                } while (p[j0] !== 0);
                do {
                    let j1 = way[j0];
                    p[j0] = p[j1];
                    j0 = j1;
                } while (j0 !== 0);
            }
            let porLinha = new Array(n + 1).fill(0);
            for (let j = 1; j <= m; j++) if (p[j] > 0) porLinha[p[j]] = j;
            return porLinha;
        }

        // Custo (pra minimizar) alto o bastante pra NUNCA ser preferido a uma atribuição real,
        // mesmo somando todas as posições de um esquema inteiro — sinaliza "não existe ninguém
        // compatível pra esta função" (a mesma situação em que alocarPorPosicaoKuhn simplesmente
        // deixa a posição de fora do resultado).
        const _CUSTO_INCOMPATIVEL_AFINIDADE = 1e6;

        // Monta os 11 titulares cruzando a pontuação efetiva da diretriz ativa (empilhada, nunca
        // substituída — "empilhar" foi a decisão confirmada) com a penalidade de -8 por posição
        // sempre que a especialidade do jogador não cobrir a função exigida ali (funcoesPorRole,
        // vinda da Matriz Dinâmica do Foco ativo — ver gerarRelatorioTaticoRefinadoPorFoco). Cada
        // par (função-do-campinho, jogador) tem seu PRÓPRIO peso — daí o Húngaro em vez do Kuhn.
        function selecionarEscalacaoPorAfinidadeTatica(esquema, funcoesPorRole, calcularPontuacaoEfetivaFn, notaMediaFn) {
            let coords = coordsFormacoes[esquema];
            if (!coords || !db[currentSave]) return null;
            let roles = coords.map(c => c.role);
            let obterNotaMedia = notaMediaFn || notaMediaEscaladaJogador;

            let candidatos = db[currentSave].plantel.filter(p => {
                if (p.status !== 'Ativo') return false;
                if (p.diasLesao > 0 || p.suspensoVermelho) return false;
                if (currentSave === 'selecao' && p.convocado === false) return false;
                return true;
            });
            if (!roles.length || !candidatos.length) return {};

            // Peso de cada par (função-do-campinho, jogador): pontuação efetiva da diretriz,
            // menos 8 se a especialidade do jogador não tiver a função exigida ali cadastrada.
            function peso(role, jogador) {
                let base = calcularPontuacaoEfetivaFn(jogador.ovr, obterNotaMedia(jogador), jogador.fadiga || 0);
                let grupo = grupoFuncaoDoRole(role);
                let funcaoExigida = funcoesPorRole[role] && funcoesPorRole[role].funcao;
                if (!funcaoExigida) return base; // Foco sem função definida pra esse grupo — sem penalidade
                let especialidade = ESPECIALIDADES_JOGADOR[jogador.posicao];
                let cobre = especialidade && especialidade.gruposFuncao[grupo] && especialidade.gruposFuncao[grupo].includes(funcaoExigida);
                return cobre ? base : base - 8;
            }

            let n = roles.length, m = Math.max(candidatos.length, roles.length);
            let custo = [];
            for (let i = 0; i < roles.length; i++) {
                let linha = [];
                for (let j = 0; j < m; j++) {
                    let jogador = candidatos[j];
                    if (!jogador || !posicaoCompativelComRole(roles[i], jogador.posicao)) { linha.push(_CUSTO_INCOMPATIVEL_AFINIDADE); continue; }
                    linha.push(-peso(roles[i], jogador));
                }
                custo.push(linha);
            }

            let porLinha = _hungaroMinimo(custo, n, m);
            let escalacao = {};
            for (let i = 1; i <= n; i++) {
                let j = porLinha[i];
                if (!j) continue;
                let jogador = candidatos[j - 1];
                if (!jogador || custo[i - 1][j - 1] >= _CUSTO_INCOMPATIVEL_AFINIDADE) continue; // ninguém compatível de verdade
                escalacao[roles[i - 1]] = jogador.nome;
            }
            return escalacao;
        }

        // Pra cada titular escalado, verifica se ele realmente cobre a função exigida ali —
        // devolve só quem foi barrado (entrou mesmo sem a função no perfil, por falta de opção
        // melhor), pro Auxiliar justificar isso na sugestão, exatamente como o pedido pediu
        // ("justificando rapidamente se alguém foi barrado pela Afinidade Tática").
        function alertasAfinidadeTatica(escalacao, funcoesPorRole) {
            if (!db[currentSave] || !escalacao || !funcoesPorRole) return [];
            return Object.entries(escalacao).map(([role, nome]) => {
                let funcaoExigida = funcoesPorRole[role] && funcoesPorRole[role].funcao;
                if (!funcaoExigida) return null;
                let jogador = db[currentSave].plantel.find(p => p.nome === nome);
                if (!jogador) return null;
                let grupo = grupoFuncaoDoRole(role);
                let especialidade = ESPECIALIDADES_JOGADOR[jogador.posicao];
                let cobre = especialidade && especialidade.gruposFuncao[grupo] && especialidade.gruposFuncao[grupo].includes(funcaoExigida);
                if (cobre) return null;
                let nomeFuncao = (GRUPOS_FUNCAO_EA[grupo] && GRUPOS_FUNCAO_EA[grupo].funcoes.find(f => f.id === funcaoExigida) || {}).nome || funcaoExigida;
                return { role, nome: jogador.nome, posicao: jogador.posicao, funcaoExigida: nomeFuncao };
            }).filter(Boolean);
        }

        // "notaMediaFn" é opcional — por padrão usa notaMediaEscaladaJogador (média de TODO o
        // histórico, cai pro OVR sem partidas). A diretriz "Em Melhor Momento" passa uma função
        // diferente (nota média só das últimas 5 partidas, sem fallback pro OVR) — o resto do
        // motor (posição, Kuhn) não muda nada.
        function selecionarEscalacaoPorPontuacao(esquema, calcularPontuacaoEfetivaFn, notaMediaFn) {
            let coords = coordsFormacoes[esquema];
            if (!coords || !db[currentSave]) return null;
            let roles = coords.map(c => c.role);
            let obterNotaMedia = notaMediaFn || notaMediaEscaladaJogador;

            let candidatos = db[currentSave].plantel.filter(p => {
                if (p.status !== 'Ativo') return false;
                if (p.diasLesao > 0 || p.suspensoVermelho) return false;
                if (currentSave === 'selecao' && p.convocado === false) return false;
                return true;
            }).map(p => ({
                jogador: p,
                pontuacaoEfetiva: calcularPontuacaoEfetivaFn(p.ovr, obterNotaMedia(p), p.fadiga || 0)
            })).sort((a, b) => b.pontuacaoEfetiva - a.pontuacaoEfetiva);

            return alocarPorPosicaoKuhn(candidatos, roles);
        }

        // Atalhos diretos pra cada diretriz — usados pelos testes e por quem quiser calcular uma
        // escalação específica sem passar pelo catálogo DIRETRIZES_ESTRATEGICAS.
        function selecionarEscalacaoTitularPadrao(esquema) {
            return selecionarEscalacaoPorPontuacao(esquema, calcularPontuacaoEfetivaEscalacaoPadrao);
        }
        function selecionarEscalacaoRotacaoEquilibrada(esquema) {
            return selecionarEscalacaoPorPontuacao(esquema, calcularPontuacaoEfetivaRotacaoEquilibrada);
        }
        function selecionarEscalacaoRodizioExtremo(esquema) {
            return selecionarEscalacaoPorPontuacao(esquema, calcularPontuacaoEfetivaRodizioExtremo);
        }
        function selecionarEscalacaoForcaMaxima(esquema) {
            return selecionarEscalacaoPorPontuacao(esquema, calcularPontuacaoEfetivaForcaMaxima);
        }

        // Estrutura FIXA do banco de reservas — vale pra QUALQUER diretriz (pedido do treinador:
        // "isso serve pra todas as diretrizes"): 1 goleiro, 2 de defesa (zagueiro), 1 lateral, 2 de
        // meio-campo/volante, 2 pontas e 1 atacante — 9 reservas no total. O que muda de diretriz
        // pra diretriz é só QUEM preenche cada vaga (calculado com a mesma pontuação efetiva da
        // diretriz ativa) — a composição do banco em si nunca muda.
        const BANCO_RESERVA_ESTRUTURA = [
            { rotulo: 'Goleiro', categorias: ['Goleiro'], vagas: 1 },
            { rotulo: 'Defesa', categorias: ['Zagueiro'], vagas: 2 },
            { rotulo: 'Lateral', categorias: ['Lateral'], vagas: 1 },
            { rotulo: 'Meio-Campo/Volante', categorias: ['Volante', 'MeioCampo'], vagas: 2 },
            { rotulo: 'Ponta', categorias: ['Ponta'], vagas: 2 },
            { rotulo: 'Ataque', categorias: ['Atacante'], vagas: 1 }
        ];

        // Monta o banco de reservas (9 jogadores, na estrutura fixa acima) usando a pontuação
        // efetiva da diretriz ativa: dentro de cada linha (defesa/lateral/meio/ponta/ataque), quem
        // pontua mais entre os que NÃO foram escalados titulares pega a(s) vaga(s) daquela linha —
        // quem sobra fica de fora do banco. "nomesJaEscalados" é a lista dos titulares (pra nunca
        // duplicar um jogador no banco).
        // "notaMediaFn" opcional — mesma lógica de selecionarEscalacaoPorPontuacao acima: por
        // padrão notaMediaEscaladaJogador, mas a diretriz "Em Melhor Momento" passa a versão só
        // dos últimos 5 jogos, sem fallback pro OVR.
        function montarBancoReserva(nomesJaEscalados, calcularPontuacaoEfetivaFn, notaMediaFn) {
            if (!db[currentSave]) return [];
            let usados = new Set(nomesJaEscalados || []);
            let obterNotaMedia = notaMediaFn || notaMediaEscaladaJogador;
            let candidatosBase = db[currentSave].plantel.filter(p => {
                if (usados.has(p.nome)) return false;
                if (p.status !== 'Ativo') return false;
                if (p.diasLesao > 0 || p.suspensoVermelho) return false;
                if (currentSave === 'selecao' && p.convocado === false) return false;
                return true;
            }).map(p => ({
                jogador: p,
                categoria: String(p.posicao).split('/')[0],
                pontuacaoEfetiva: calcularPontuacaoEfetivaFn(p.ovr, obterNotaMedia(p), p.fadiga || 0)
            })).sort((a, b) => b.pontuacaoEfetiva - a.pontuacaoEfetiva);

            let banco = [];
            let usadosNoBanco = new Set();
            BANCO_RESERVA_ESTRUTURA.forEach(grupo => {
                candidatosBase
                    .filter(c => grupo.categorias.includes(c.categoria) && !usadosNoBanco.has(c.jogador.nome))
                    .slice(0, grupo.vagas)
                    .forEach(c => {
                        usadosNoBanco.add(c.jogador.nome);
                        banco.push({ nome: c.jogador.nome, posicao: c.jogador.posicao, papel: `Reserva de ${grupo.rotulo}` });
                    });
            });
            return banco;
        }

        // =====================================================================================
        // DIRETRIZ "DAR OPORTUNIDADE À BASE/JOVENS" — foge do contrato genérico das outras quatro
        // (calcularPontuacaoEfetiva + selecionarEscalacaoPorPontuacao + montarBancoReserva) porque
        // precisa de uma COTA explícita (~50% dos relacionados), não só de um bônus na pontuação:
        // um bônus sozinho não garante a proporção pedida, só empurra na direção certa. Por isso
        // define seu próprio "selecionarEscalacaoEBanco(esquema) => {escalacao, banco}".
        // =====================================================================================

        // "vagas_totais" do pedido: a estrutura do banco (BANCO_RESERVA_ESTRUTURA) é sempre fixa
        // em 9 vagas pra QUALQUER diretriz, então aqui vagas_totais é sempre 11 titulares + 9
        // reservas = 20 (o "18 = 11+7" do pedido era só um exemplo ilustrativo do mecanismo).
        const VAGAS_TOTAIS_RELACIONADOS_JOVENS = 11 + BANCO_RESERVA_ESTRUTURA.reduce((soma, g) => soma + g.vagas, 0);

        // Quantas partidas da temporada atual o jogador já disputou — a "partidas_jogadas" do
        // pedido, usada só nesta diretriz pra medir minutagem.
        function partidasJogadasTemporada(p) {
            return (db[currentSave].partidas || []).filter(partida => (partida.jogadores || []).some(j => j.nome === p.nome)).length;
        }

        // "jovem_promessa" do pedido: idade até 22 anos E partidas jogadas na temporada dentro
        // (ou abaixo) da média de jogos de TODO o elenco.
        function ehJovemPromessa(p, mediaJogosElenco) {
            return Number(p.idade) <= 22 && partidasJogadasTemporada(p) <= mediaJogosElenco;
        }

        // Pedido do treinador pra diretriz "Dar Oportunidade à Base/Jovens": mesma nota_base e
        // mesma penalidade de fadiga da Rotação Equilibrada (curva cúbica, teto 60), mas com um
        // bônus de desenvolvimento GIGANTE (+25) pra quem é jovem promessa — grande o bastante
        // pra um jovem de OVR bem mais baixo superar um titular consagrado na pontuação efetiva.
        //
        //   penalidade = (fadiga_atual / 100)^3 * 60      [igual à Rotação Equilibrada]
        //   bonus = jovem_promessa ? 25 : 0
        //   pontuacao_efetiva = nota_base - penalidade + bonus
        //
        // Validado com o cenário do pedido: Jogador A (titular consagrado, OVR 84, nota 76,
        // fadiga 30%, NÃO jovem) dá nota_base 80, penalidade 1.6, pontuação efetiva 78.4.
        // Jogador B (jovem da base, OVR 62, nota 60, fadiga 10%, jovem promessa) dá nota_base 61,
        // penalidade 0.06, bônus +25, pontuação efetiva 85.9 — o jovem de OVR bem menor supera o
        // craque absoluto na triagem, garantindo minutos pra base.
        function calcularPontuacaoEfetivaOportunidadeJovens(ovr, notaMedia, fadigaAtual, jovemPromessa) {
            let notaBase = (Number(ovr) + Number(notaMedia)) / 2;
            let fadiga = Math.max(0, Math.min(100, Number(fadigaAtual) || 0));
            let penalidade = Math.pow(fadiga / 100, 3) * 60;
            let bonus = jovemPromessa ? 25 : 0;
            return Math.round((notaBase - penalidade + bonus) * 10) / 10;
        }

        // Monta os RELACIONADOS (titulares + banco) da diretriz "Dar Oportunidade à
        // Base/Jovens", aplicando a cota de ~50% de jovens promessas (pedido, passo 4): separa o
        // elenco em Lista_Jovens/Lista_Veteranos por pontuação efetiva (que já embute o bônus),
        // preenche metade das vagas totais com os jovens de maior pontuação e o resto com quem
        // sobrou de maior pontuação geral (jovem ou veterano) — só DEPOIS disso organiza quem
        // joga em qual função tática (Kuhn, igual às outras diretrizes), sempre só entre quem já
        // entrou nos relacionados pela cota.
        function montarRelacionadosOportunidadeJovens(esquema) {
            let coords = coordsFormacoes[esquema];
            if (!coords || !db[currentSave]) return null;
            let roles = coords.map(c => c.role);
            let plantel = db[currentSave].plantel;

            let mediaJogosElenco = plantel.length
                ? plantel.reduce((soma, p) => soma + partidasJogadasTemporada(p), 0) / plantel.length
                : 0;

            let candidatos = plantel.filter(p => {
                if (p.status !== 'Ativo') return false;
                if (p.diasLesao > 0 || p.suspensoVermelho) return false;
                if (currentSave === 'selecao' && p.convocado === false) return false;
                return true;
            }).map(p => {
                let jovemPromessa = ehJovemPromessa(p, mediaJogosElenco);
                return {
                    jogador: p,
                    jovemPromessa,
                    pontuacaoEfetiva: calcularPontuacaoEfetivaOportunidadeJovens(p.ovr, notaMediaEscaladaJogador(p), p.fadiga || 0, jovemPromessa)
                };
            });

            let listaJovens = candidatos.filter(c => c.jovemPromessa).sort((a, b) => b.pontuacaoEfetiva - a.pontuacaoEfetiva);
            let listaVeteranos = candidatos.filter(c => !c.jovemPromessa).sort((a, b) => b.pontuacaoEfetiva - a.pontuacaoEfetiva);
            let listaGeralDesc = candidatos.slice().sort((a, b) => b.pontuacaoEfetiva - a.pontuacaoEfetiva);

            let vagasTotais = Math.min(VAGAS_TOTAIS_RELACIONADOS_JOVENS, candidatos.length);
            let cotaJovens = Math.min(listaJovens.length, Math.round(vagasTotais / 2));

            let relacionados = listaJovens.slice(0, cotaJovens);
            let nomesRelacionados = new Set(relacionados.map(c => c.jogador.nome));

            // Preenche o restante das vagas com quem sobrou de maior pontuação geral — jovem ou
            // veterano, exatamente como o pedido: "os jogadores de maior pontuação geral que sobraram".
            listaGeralDesc.forEach(c => {
                if (relacionados.length >= vagasTotais || nomesRelacionados.has(c.jogador.nome)) return;
                relacionados.push(c);
                nomesRelacionados.add(c.jogador.nome);
            });
            relacionados.sort((a, b) => b.pontuacaoEfetiva - a.pontuacaoEfetiva);

            // Titulares: Kuhn só entre os relacionados já escolhidos pela cota — "os 11 com
            // maiores notas efetivas assumem a titularidade, jovens ou não" (pedido, passo 4).
            let escalacao = alocarPorPosicaoKuhn(relacionados, roles);

            // Caso raro de inviabilidade posicional (a cota deixou de fora o único jogador
            // compatível com alguma função): completa só o que sobrou vazio puxando o resto do
            // elenco disponível, na ordem de pontuação efetiva — nunca deixa uma função tática
            // sem titular só por causa da cota, se existir alguém compatível no elenco.
            if (Object.keys(escalacao).length < roles.length) {
                let foraDosRelacionados = listaGeralDesc.filter(c => !nomesRelacionados.has(c.jogador.nome));
                escalacao = alocarPorPosicaoKuhn(relacionados.concat(foraDosRelacionados), roles);
                Object.values(escalacao).forEach(nome => {
                    if (!nomesRelacionados.has(nome)) {
                        nomesRelacionados.add(nome);
                        let extra = foraDosRelacionados.find(c => c.jogador.nome === nome);
                        if (extra) relacionados.push(extra);
                    }
                });
            }

            // Banco: estrutura fixa de sempre (1 goleiro, 2 zagueiros, 1 lateral, 2 meio-campo/
            // volante, 2 pontas, 1 atacante), priorizando quem já está nos relacionados (dentro
            // da cota) e só recorrendo ao resto do elenco se alguma linha ficar sem candidato
            // compatível na cota.
            let nomesTitulares = new Set(Object.values(escalacao));
            let poolRelacionados = relacionados.filter(c => !nomesTitulares.has(c.jogador.nome));
            let poolResto = candidatos.filter(c => !nomesRelacionados.has(c.jogador.nome) && !nomesTitulares.has(c.jogador.nome));
            let paraCategoria = (lista) => lista
                .slice()
                .sort((a, b) => b.pontuacaoEfetiva - a.pontuacaoEfetiva)
                .map(c => ({ jogador: c.jogador, categoria: String(c.jogador.posicao).split('/')[0], pontuacaoEfetiva: c.pontuacaoEfetiva }));
            let candidatosBanco = paraCategoria(poolRelacionados).concat(paraCategoria(poolResto));

            let banco = [];
            let usadosNoBanco = new Set();
            BANCO_RESERVA_ESTRUTURA.forEach(grupo => {
                candidatosBanco
                    .filter(c => grupo.categorias.includes(c.categoria) && !usadosNoBanco.has(c.jogador.nome))
                    .slice(0, grupo.vagas)
                    .forEach(c => {
                        usadosNoBanco.add(c.jogador.nome);
                        banco.push({ nome: c.jogador.nome, posicao: c.jogador.posicao, papel: `Reserva de ${grupo.rotulo}` });
                    });
            });

            return { escalacao, banco, relacionados, listaJovens, listaVeteranos };
        }

        // Atalho direto pra diretriz — usado pelos testes e por quem quiser calcular só a
        // escalação, sem os detalhes de banco/cota.
        function selecionarEscalacaoOportunidadeJovens(esquema) {
            let resultado = montarRelacionadosOportunidadeJovens(esquema);
            return resultado ? resultado.escalacao : null;
        }

        async function declararPartidaIA() {
            let nomeAdvManual = document.getElementById('declarar-adv-nome').value.trim();
            let diretrizId = document.getElementById('declarar-adv-diretriz').value;
            let diretrizInfo = DIRETRIZES_ESTRATEGICAS[diretrizId] || { nome: diretrizId, descricaoIA: diretrizId };
            // Foco Tático da Partida: sempre captura e persiste a escolha. Pra presets `refinado`
            // E pro Estilo "Personalizado" (texto livre), também dirige a formação/pacote/matriz
            // de função — ver presetRefinadoAtivo()/personalizadoAtivo() mais abaixo. Pros demais
            // presets, continua só sendo capturado/persistido (inerte).
            let focoPartidaEl = document.getElementById('declarar-partida-foco');
            let focoPartidaId = focoPartidaEl ? focoPartidaEl.value : 'equilibrado';
            if (db[currentSave]) db[currentSave].focoPartidaSelecionado = focoPartidaId;
            let mandoEl = document.getElementById('declarar-mando');
            let mandoPartida = mandoEl ? mandoEl.value : (db[currentSave] && db[currentSave].mandoPartidaSelecionado) || 'Casa';
            if (db[currentSave]) db[currentSave].mandoPartidaSelecionado = mandoPartida;
            if (!nomeAdvManual && !imagemAdvEscalacao && !imagemAdvTatica) {
                return alert('Digite o nome do adversário ou anexe pelo menos um print.');
            }

            // Estilo "Camaleão" (pedido do treinador): a cada sugestão do Auxiliar, relê o
            // elenco atual — se ele mudou desde a última análise, refaz a tática sob medida
            // ANTES de montar a sugestão desta partida; se não mudou, não gasta uma chamada de
            // IA à toa e mantém a tática já calculada (ver atualizarCamaleaoSeElencoMudou em
            // estilo-jogo.js).
            if (typeof camaleaoAtivo === 'function' && camaleaoAtivo()) {
                let btnPreCheck = document.getElementById('btn-declarar-partida-ia');
                if (btnPreCheck) { btnPreCheck.innerText = '⏳ Camaleão: relendo o elenco atual...'; btnPreCheck.disabled = true; }
                await atualizarCamaleaoSeElencoMudou();
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

            // FOCO TÁTICO DINÂMICO (pedido do treinador) — dois jeitos de ativar a mesma camada
            // extra de Foco (regra de ouro na formação + Matriz Dinâmica de Funções + Regra de
            // Afinidade Tática nos titulares), dependendo do que o treinador escolheu como Estilo
            // de Jogo:
            //   1. Um preset "refinado" (Gegenpressing, Tiki-Taka, ...) — a Matriz é uma tabela
            //      fixa escrita à mão pra cada Foco (gerarRelatorioTaticoRefinadoPorFoco, síncrono).
            //   2. "Personalizado" (texto livre) — não existe tabela fixa: a IA é chamada de novo
            //      AGORA, ANTES da análise do adversário, só pra traduzir a descrição original do
            //      treinador + o Foco ativo pra um pacote tático + Matriz sob medida
            //      (gerarRelatorioTaticoPersonalizadoPorFoco, assíncrono — por isso o botão já
            //      trava aqui, antes dessa chamada extra).
            // Os dois devolvem exatamente o mesmo formato (`pacoteRefinado`), então todo o resto
            // desta função trata as duas situações de forma idêntica dali em diante. Fora daqui —
            // nenhum preset refinado, nem Personalizado — o Foco continua 100% inerte.
            let btn = document.getElementById('btn-declarar-partida-ia');
            btn.innerText = '⏳ Analisando o adversário e montando o plano...'; btn.disabled = true;

            let presetRefinado = (typeof presetRefinadoAtivo === 'function') ? presetRefinadoAtivo() : null;
            let dnaManual = (!presetRefinado && typeof estiloDnaAtivo === 'function') ? estiloDnaAtivo() : null;
            let descricaoPersonalizada = (!presetRefinado && !dnaManual && typeof personalizadoAtivo === 'function') ? personalizadoAtivo() : null;
            let pacoteRefinado = null;
            if (presetRefinado && focoPartidaId) {
                pacoteRefinado = gerarRelatorioTaticoRefinadoPorFoco(formacoesPreferidasIA, presetRefinado.id, focoPartidaId);
            } else if (dnaManual && focoPartidaId) {
                // Estilo montado nos 4 planos: o Foco desloca os próprios planos do treinador,
                // sem tabela paralela e sem chamada de IA.
                pacoteRefinado = gerarRelatorioTaticoPorDnaComFoco(formacoesPreferidasIA, dnaManual.dna, focoPartidaId, dnaManual.rotulo);
            } else if (descricaoPersonalizada && focoPartidaId) {
                btn.innerText = '⏳ Traduzindo seu estilo personalizado pro Foco desta partida...';
                try {
                    pacoteRefinado = await gerarRelatorioTaticoPersonalizadoPorFoco(formacoesPreferidasIA, descricaoPersonalizada, focoPartidaId);
                } catch (e) {
                    pacoteRefinado = null; // se a tradução falhar, o Foco cai pro comportamento inerte de sempre — a análise principal ainda roda normalmente
                }
                btn.innerText = '⏳ Analisando o adversário e montando o plano...';
            }
            // A Regra de Afinidade Tática (o motor Húngaro abaixo) só entra pras diretrizes de
            // pontuação genérica (calcularPontuacaoEfetiva). A diretriz "Dar Oportunidade à
            // Base/Jovens" tem sua própria cota (selecionarEscalacaoEBanco) — o pacote
            // tático/matriz de função do Foco ativo ainda se aplica nesse caso (formação e
            // função de cada titular seguem a regra de ouro/matriz normalmente), só a escolha de
            // QUEM joga continua vindo da cota de jovens, sem o peso da Afinidade Tática.

            // Toda diretriz do catálogo (Escalação Titular Padrão, Rotação Equilibrada, ...) tem sua
            // própria calcularPontuacaoEfetiva — os titulares NÃO ficam mais a cargo da IA, o
            // algoritmo já decide, pra cada formação preferida, quem entra em campo. A IA só recebe
            // essa escalação já pronta pra escrever a instrução/função de cada um; ela não escolhe
            // (e não pode trocar) nenhum jogador. Calculado uma vez pra cada formação candidata,
            // porque a formação em si ainda é escolhida pela IA de acordo com o adversário.
            // A diretriz "Dar Oportunidade à Base/Jovens" foge desse contrato (precisa de uma cota
            // explícita, não só de uma fórmula de pontuação) e define "selecionarEscalacaoEBanco"
            // no lugar — o banco dela também já sai pronto aqui, junto com a escalação.
            let escalacoesFixasPorFormacao = {};
            let bancosFixosPorFormacao = {};
            let alertasAfinidadeAtivos = [];
            if (pacoteRefinado && diretrizInfo.calcularPontuacaoEfetiva) {
                // Gegenpressing Dinâmico decidiu a formação sozinho — só ELA entra como fixa (a IA
                // não escolhe entre as outras preferidas nesse caso, a formação já não é dela).
                let fixaAfinidade = selecionarEscalacaoPorAfinidadeTatica(pacoteRefinado.esquemaEscolhido, pacoteRefinado.funcoesPorRole, diretrizInfo.calcularPontuacaoEfetiva, diretrizInfo.notaMediaFn);
                if (fixaAfinidade && Object.keys(fixaAfinidade).length) {
                    escalacoesFixasPorFormacao[pacoteRefinado.esquemaEscolhido] = fixaAfinidade;
                    bancosFixosPorFormacao[pacoteRefinado.esquemaEscolhido] = montarBancoReserva(Object.values(fixaAfinidade), diretrizInfo.calcularPontuacaoEfetiva, diretrizInfo.notaMediaFn);
                    alertasAfinidadeAtivos = alertasAfinidadeTatica(fixaAfinidade, pacoteRefinado.funcoesPorRole);
                }
            } else if (diretrizInfo.selecionarEscalacaoEBanco) {
                formacoesPreferidasIA.forEach(esq => {
                    let resultado = diretrizInfo.selecionarEscalacaoEBanco(esq);
                    if (resultado && resultado.escalacao) {
                        escalacoesFixasPorFormacao[esq] = resultado.escalacao;
                        bancosFixosPorFormacao[esq] = resultado.banco;
                    }
                });
            } else if (diretrizInfo.calcularPontuacaoEfetiva) {
                formacoesPreferidasIA.forEach(esq => {
                    let fixa = selecionarEscalacaoPorPontuacao(esq, diretrizInfo.calcularPontuacaoEfetiva, diretrizInfo.notaMediaFn);
                    if (fixa) escalacoesFixasPorFormacao[esq] = fixa;
                });
            }
            let blocoTitularesFixos = Object.keys(escalacoesFixasPorFormacao).length ? `
            🔒 TITULARES JÁ DEFINIDOS PELA DIRETRIZ "${diretrizInfo.nome}" (NÃO É MAIS DECISÃO SUA):
            A escalação titular não é mais escolhida por você — foi calculada por um algoritmo estatístico oficial do clube (${diretrizInfo.descricaoIA}). Para CADA formação abaixo, os titulares já estão fixados. Sua única tarefa em relação a eles é, pra CADA jogador, escrever a instrução tática específica pra ESTE adversário e escolher função/foco coerente (a regra de compatibilidade posicional abaixo continua valendo só pra função/foco, nunca pra trocar quem joga). NUNCA troque nenhum desses jogadores por outro do elenco, mesmo que pareça uma escolha melhor — a substituição, se necessário, é feita depois, manualmente. O BANCO DE RESERVAS também já vem pronto (9 jogadores: 1 goleiro, 2 zagueiros, 1 lateral, 2 meio-campo/volante, 2 pontas, 1 atacante) — não invente reservas diferentes.
            ${Object.entries(escalacoesFixasPorFormacao).map(([esq, mapa]) => `- ${esq}: ${Object.entries(mapa).map(([role, nome]) => `${role}=${nome}`).join(', ')}`).join('\n            ')}
            ` : '';
            let blocoGegenpressingFixo = pacoteRefinado ? `
            ${presetRefinado ? `🔥 ${presetRefinado.emoji || ''} ${presetRefinado.nome.toUpperCase()} DINÂMICO ATIVO` : `🎨 ESTILO PERSONALIZADO ATIVO ("${descricaoPersonalizada}")`} (Foco: "${FOCOS_TATICOS_PARTIDA[focoPartidaId] || focoPartidaId}") — PACOTE TÁTICO TAMBÉM JÁ DEFINIDO (NÃO É MAIS DECISÃO SUA):
            A formação, a predefinição, o estilo de armação e a linha defensiva NÃO são mais escolha sua pra esta partida — foram calculados${presetRefinado ? ' pela regra de ouro do Foco selecionado' : ' pelo próprio Auxiliar, traduzindo a descrição acima pra este Foco'}: formação "${pacoteRefinado.esquemaEscolhido}", predefinição "${predefinicaoPorId(pacoteRefinado.predefinicao).nome}", armação "${estiloArmacaoPorId(pacoteRefinado.estiloArmacao).nome}", linha defensiva ${pacoteRefinado.abordagemDefensiva}/100. A função/foco de CADA titular também já vem fixada${presetRefinado ? ' pela Matriz Dinâmica do preset' : ' pela Matriz sob medida criada pra esta ideia'} — use exatamente os campos "predefinicao"/"estiloArmacao"/"abordagemDefensiva"/"formacaoEscolhida" acima no seu JSON e escreva só a "instrucao" (texto livre) de cada titular, mantendo "funcao"/"foco" como estão.
            ` : '';

            let plantelInfo = montarResumoPlantelIA();

            let blocoImagens = (imagemAdvEscalacao || imagemAdvTatica) ? `
            📸 IMAGENS ANEXADAS: ${imagemAdvEscalacao ? 'a imagem de escalação mostra o plantel/escalação provável do adversário (formação, jogadores, ratings, posição na liga, últimos resultados). ' : ''}${imagemAdvTatica ? 'a imagem de tática mostra as predefinições táticas do adversário.' : ''}
            Extraia dessas imagens: nome do time (se não foi informado manualmente), formação usada, nível aparente (ratings ATA/MED/DEF se visíveis) e qualquer coisa relevante pra montar um plano contra eles.` : `Não há prints anexados — use apenas o nome informado e seu conhecimento geral para montar um plano razoável.`;

            // Retrospecto direto contra ESTE adversário: "não vencemos eles há 3 jogos" muda
            // a preparação de uma partida de verdade, e a IA não tinha esse dado antes.
            let retrospecto = (typeof retrospectoContraAdversario === 'function') ? retrospectoContraAdversario(nomeAdvManual) : '';

            let promptIA = `Você é ${nomeAuxiliarExibicao()}, o Analista de Desempenho e Estrategista do "${db[currentSave].nome}".

            ${(typeof personalidadeAuxiliarTexto === 'function') ? personalidadeAuxiliarTexto() : ''}

            ${(typeof conceitosTaticosTexto === 'function') ? conceitosTaticosTexto() : ''}

            ${gerarResumoContexto()}

            🆚 ADVERSÁRIO DESTA PARTIDA: ${nomeAdvManual || 'a identificar pela imagem'}
            🏟️ MANDO DE CAMPO: ${_textoMandoIA(mandoPartida)}
            ${retrospecto ? `📊 RETROSPECTO CONTRA ELES: ${retrospecto} Leve esse histórico em conta — se o time não vence esse adversário há tempo, algo no plano anterior não funcionou.` : ''}
            ${blocoImagens}

            MEU ELENCO: ${plantelInfo.texto}

            FILOSOFIA TÁTICA E OPÇÕES (a identidade do time — adapte um pouco pra ESTE adversário específico, sem trair a essência):
            - Formações preferidas do treinador, em ordem de prioridade: ${formacoesPreferidasIA.join(' > ')}. A "Formação Primária" de referência é ${formacaoPri}.
            - Estilo de Jogo: ${estiloJogo}
            - Função/foco de cada posição na configuração BASE do treinador (o ponto de partida — ${funcoesBaseTexto})
            - Diretriz: ${diretrizInfo.descricaoIA}
            ${blocoTitularesFixos}
            ${blocoGegenpressingFixo}
            🏥 BOLETIM DO DEPARTAMENTO MÉDICO (LEIA COM ATENÇÃO): ${(typeof gerarRelatorioMedicoTexto === 'function') ? gerarRelatorioMedicoTexto() : "Sem novidades."}
            📚 HISTÓRICO E APRENDIZADO (o conhecimento acumulado deste treinador com este time): ${montarResumoHistoricoAuxiliarIA()}
            ${regrasEstrategistaTexto(nomeAdvManual || 'o adversário', formacaoSec, estiloJogo, diretrizInfo.descricaoIA, diasDescanso)}

            ${regrasTaticasParaIA()}

            FUNÇÕES E FOCOS POR GRUPO DE POSIÇÃO (use SÓ estes ids ao preencher "funcao"/"foco" de cada titular — nunca invente um novo):
            ${_listarGruposFuncaoParaIA()}

            REGRAS ABSOLUTAS DO JSON:
            0. Além da escalação, escolha o PACOTE TÁTICO completo (predefinição, esquema, estilo de armação e abordagem defensiva de 0 a 100) respeitando as travas listadas acima. O treinador vai selecionar exatamente isso dentro do jogo, então uma combinação proibida é inútil. ESTE PACOTE PARTE DA CONFIGURAÇÃO BASE DO TREINADOR, mas você DEVE ajustá-lo pra ESTE adversário específico: contra um time de posse/tiki-taka, reduza a abordagem defensiva e recue mais a linha; contra um time fraco ou que joga muito recuado, pode subir a linha e ser mais agressivo; ajuste o foco de zagueiros/volantes pra "Defesa"/"Roubada de Bola" contra ataques fortes, ou pra "Ataque"/"Armação" contra defesas fracas. A justificativa desse ajuste vai em "justificativaTatica".
            1. Escolha UMA das formações preferidas listadas acima (${formacoesPreferidasIA.join(', ')}) — a mais adequada pra ESTE adversário — e use EXATAMENTE AS SIGLAS DO SEGUINTE MAPA COMO CHAVES: ${plantelInfo.formacoesPossiveisStr}
            2. NÃO invente siglas (Ex: não crie "MC" se na formação escolhida tiver apenas "MCD" e "MCE").
            3. BANCO DE RESERVAS: monte também até 9 jogadores do elenco ativo que NÃO entraram nos 11 titulares. REGRA OBRIGATÓRIA: pelo menos 1 desses 9 TEM que ser um goleiro reserva (nunca deixe o banco sem nenhum goleiro). PROFUNDIDADE REALISTA (REGRA CRÍTICA): um banco de verdade cobre o time inteiro — NUNCA monte um banco dominado por uma linha só (ex: 5 zagueiros/laterais e nenhum atacante). Distribua entre defesa (zagueiro/lateral), meio (volante/meio-campo) e ataque (ponta/atacante) de forma equilibrada, sempre que o elenco tiver opção em cada linha — prefira o melhor OVR disponível dentro de cada linha, não o melhor OVR do elenco inteiro ignorando a posição. Para cada um, diga em poucas palavras qual seria o papel dele se entrasse. Não invente jogadores fora da lista do elenco.
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

                    // Gegenpressing Dinâmico: formação e pacote tático NÃO são mais sugestão da IA —
                    // a regra de ouro do Foco já decidiu tudo isso antes da chamada (pacoteRefinado).
                    // Força por cima de qualquer coisa que a IA tenha respondido.
                    if (pacoteRefinado) {
                        res.formacaoEscolhida = pacoteRefinado.esquemaEscolhido;
                        res.predefinicao = pacoteRefinado.predefinicao;
                        res.estiloArmacao = pacoteRefinado.estiloArmacao;
                        res.abordagemDefensiva = pacoteRefinado.abordagemDefensiva;
                    }
                    // A formação tem que ser uma das preferidas do treinador — nunca uma de fora da lista.
                    if (!formacoesPreferidasIA.includes(res.formacaoEscolhida)) res.formacaoEscolhida = formacoesPreferidasIA[0];

                    // A diretriz ativa NÃO é uma sugestão pra IA seguir — o nome de cada titular é
                    // sempre o que o algoritmo calculou, nunca o que a IA escreveu (mesmo que ela
                    // tenha ignorado o bloco "TITULARES JÁ DEFINIDOS" do prompt). O banco de
                    // reservas segue a mesma regra: estrutura fixa (1 goleiro, 2 zagueiros, 1
                    // lateral, 2 meio-campo/volante, 2 pontas, 1 atacante), preenchida por quem
                    // pontua mais em cada linha usando a fórmula DESTA diretriz.
                    let escalacaoFixaEscolhida = escalacoesFixasPorFormacao[res.formacaoEscolhida];
                    if (escalacaoFixaEscolhida) {
                        res.escalacao = res.escalacao || {};
                        Object.entries(escalacaoFixaEscolhida).forEach(([role, nomeFixo]) => {
                            res.escalacao[role] = Object.assign({}, res.escalacao[role], { nome: nomeFixo });
                        });
                        if (pacoteRefinado) {
                            res.reservas = bancosFixosPorFormacao[res.formacaoEscolhida] || [];
                        } else if (diretrizInfo.selecionarEscalacaoEBanco) {
                            res.reservas = bancosFixosPorFormacao[res.formacaoEscolhida] || [];
                        } else if (diretrizInfo.calcularPontuacaoEfetiva) {
                            res.reservas = montarBancoReserva(Object.values(escalacaoFixaEscolhida), diretrizInfo.calcularPontuacaoEfetiva, diretrizInfo.notaMediaFn);
                        }
                    }

                    // A função/foco de cada titular também vem fixada pela Matriz Dinâmica do
                    // Gegenpressing — não é a IA quem decide isso nesta faixa, é a Regra de
                    // Afinidade Tática (já cravada na escolha de QUEM joga, acima).
                    if (pacoteRefinado) {
                        Object.entries(pacoteRefinado.funcoesPorRole).forEach(([role, f]) => {
                            if (res.escalacao[role]) {
                                res.escalacao[role].funcao = f.funcao;
                                res.escalacao[role].foco = f.foco;
                            }
                        });
                    }

                    // A diretriz "Titulares a Todo Custo (Risco de Lesão)" existe justamente pra
                    // desligar essa rede de segurança médica — o treinador decidiu conscientemente
                    // arriscar a lesão em troca de força máxima em campo, então a rotação
                    // obrigatória por fadiga crítica/risco NÃO se aplica aqui (o aviso vira
                    // "alertasRiscoLesao" mais abaixo, mas ninguém é trocado à força).
                    let rotacoesAutomaticas = diretrizId === 'titulares-todo-custo' ? [] : aplicarRotacaoObrigatoriaEscalacao(res);
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
                        reservas: (() => {
                            let lista = (typeof garantirGoleiroNoBanco === 'function') ? garantirGoleiroNoBanco(res.reservas, res.escalacao) : (Array.isArray(res.reservas) ? res.reservas : []);
                            return (typeof ordenarBancoPorPosicao === 'function') ? ordenarBancoPorPosicao(lista) : lista;
                        })(),
                        alertaRotacao: alertaRotacao,
                        rotacoesAutomaticas: rotacoesAutomaticas,
                        alertasRiscoLesao: jogadoresEmRiscoDeLesao(res.escalacao),
                        alertasAfinidadeTatica: alertasAfinidadeAtivos,
                        // Os 4 planos que valeram PRA ESTA PARTIDA (o estilo do treinador já
                        // deslocado pelo Foco). É o que o painel do plano mostra como
                        // "Identidade desta partida" — a mesma fonte que gerou a função de cada
                        // jogador em campo, pra não existir plano dizendo uma coisa e campo outra.
                        dnaEmVigor: (pacoteRefinado && pacoteRefinado.dnaEmVigor)
                            || ((typeof dnaDoEstiloSalvo === 'function') ? dnaDoEstiloSalvo(taticaBase) : null),
                        diretriz: diretrizInfo.nome,
                        focoPartida: focoPartidaId,
                        criadaEm: Date.now()
                    };
                    imagemAdvEscalacao = null; imagemAdvTatica = null;
                    // Limpa o campo de nome pra não ficar preso no adversário que acabou de ser
                    // declarado — senão a próxima vez que o treinador for declarar OUTRO adversário
                    // vê o nome antigo ainda ali, confundindo qual jogo está sendo planejado.
                    let elAdvNome = document.getElementById('declarar-adv-nome'); if (elAdvNome) elAdvNome.value = '';
                    // Volta o formulário pra Fase 1, pronto pro próximo adversário — sem isso, a
                    // Fase 2 (diretriz/foco recomendados) ficaria visível na próxima vez que o
                    // treinador abrisse "Pedir Plano de Jogo", mesmo já sem sugestão nenhuma pedida.
                    let fase2 = document.getElementById('auxiliar-fase2-diretriz-foco'); if (fase2) fase2.style.display = 'none';
                    salvarDados();
                    renderizarSugestaoAuxiliar();
                } else {
                    alert('Não consegui montar o plano a partir disso. Tente de novo ou digite o nome do adversário.');
                }
            } catch (e) {
                alert('Erro ao analisar o adversário. Verifique sua conexão e tente novamente.');
            }
            btn.innerText = '▶️ Prosseguir com Escalação'; btn.disabled = false;
        }

        // --- TROCAR JOGADOR NA ESCALAÇÃO (clique no campinho) ---

        // Quem pode jogar em cada função do campinho, além da posição "de carteirinha" — reflete como
        // times de verdade improvisam peças parecidas. Usada pro seletor de troca (clique no jogador),
        // pra rotação automática por fadiga e pro próprio prompt de escalação da IA (regrasEstrategistaTexto).
        // A régua em si (ESPECIALIDADES_JOGADOR) e a função posicaoCompativelComRole() vivem em
        // js/funcoes-ea.js — fonte única de verdade, compartilhada também com a escolha de função
        // tática (escolherFuncaoJogador), pra nunca divergir uma da outra.

        // =====================================================================================
        // APRENDIZADO POSICIONAL — como o Auxiliar aprende, com o histórico, em quais posições
        // cada jogador costuma jogar (mesmo quando a "posição de carteirinha" dele é outra —
        // ex: um zagueiro que às vezes vira volante nesse time). Não é uma trava: só um sinal a
        // mais no prompt, pra IA variar dentro do que já vimos funcionar, não fora dele.
        // =====================================================================================

        // Sigla da função no campinho -> nome curto e legível, pra aparecer no prompt/UI.
        const ROLE_GRUPO_NOME = {
            GOL: 'Goleiro', ZAD: 'Zagueiro', ZAE: 'Zagueiro', ZAC: 'Zagueiro',
            LAD: 'Lateral Direito', ALD: 'Lateral Direito', LAE: 'Lateral Esquerdo', ALE: 'Lateral Esquerdo',
            VOL: 'Volante', VOLD: 'Volante', VOLE: 'Volante',
            MCD: 'Meio-Campo', MCE: 'Meio-Campo', MC: 'Meio-Campo',
            MEI: 'Meia-Armador', MEID: 'Meia-Armador', MEIE: 'Meia-Armador',
            PD: 'Ponta Direita', MD: 'Ponta Direita', PE: 'Ponta Esquerda', ME: 'Ponta Esquerda',
            ATA: 'Atacante', ATD: 'Atacante', ATE: 'Atacante'
        };

        // Varre o histórico de partidas já finalizadas (kickoff + escalação final, que já reflete
        // as substituições feitas) e conta, por jogador, quantas vezes ele jogou em cada função do
        // campinho. Recalculado na hora sempre que precisa — não precisa migrar saves antigos nem
        // guardar um contador à parte, e já funciona pro histórico que o save já tinha.
        function calcularHistoricoPosicoesJogadores() {
            let contagem = {}; // { nomeJogador: { roleSigla: quantidade } }
            let historico = (db[currentSave] && db[currentSave].historicoPartidasAuxiliar) || [];

            let contarEscalacao = (escalacao) => {
                if (!escalacao) return;
                Object.entries(escalacao).forEach(([role, info]) => {
                    if (!info || !info.nome || info.nome === '???') return;
                    if (!contagem[info.nome]) contagem[info.nome] = {};
                    contagem[info.nome][role] = (contagem[info.nome][role] || 0) + 1;
                });
            };

            historico.forEach(partida => {
                contarEscalacao(partida.escalacaoInicial); // quem começou, e em qual função
                contarEscalacao(partida.titulares); // escalação final (já reflete quem entrou substituindo, e em qual função)
            });

            return contagem;
        }

        // Texto curto tipo "Zagueiro (7x), Volante (2x)" com as funções mais usadas por esse
        // jogador, ou '' se ainda não há histórico suficiente pra dizer algo útil (menos de 2
        // aparições contadas — com só 1 não dá pra distinguir "hábito" de "acaso").
        function posicoesHabituaisTexto(nomeJogador, historicoPosicoes) {
            let porRole = (historicoPosicoes || calcularHistoricoPosicoesJogadores())[nomeJogador];
            if (!porRole) return '';

            let porGrupo = {};
            Object.entries(porRole).forEach(([role, qtd]) => {
                let grupo = ROLE_GRUPO_NOME[role] || role;
                porGrupo[grupo] = (porGrupo[grupo] || 0) + qtd;
            });

            let totalAparicoes = Object.values(porGrupo).reduce((a, b) => a + b, 0);
            if (totalAparicoes < 2) return '';

            return Object.entries(porGrupo)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([grupo, qtd]) => `${grupo} (${qtd}x)`)
                .join(', ');
        }

        // Grupos de sigla representativos pra montar o texto de regras — um representante por
        // "família" de função (ZAD cobre ZAD/ZAE/ZAC, LAD cobre LAD/ALD, etc.), já que dentro da
        // mesma família a compatibilidade é idêntica (ver ESPECIALIDADES_JOGADOR em funcoes-ea.js).
        const GRUPOS_TEXTO_COMPATIBILIDADE = [
            { rotulo: 'Goleiro (GOL)', role: 'GOL' },
            { rotulo: 'Zagueiro (ZAD/ZAE/ZAC)', role: 'ZAD' },
            { rotulo: 'Lateral Direito (LAD/ALD)', role: 'LAD' },
            { rotulo: 'Lateral Esquerdo (LAE/ALE)', role: 'LAE' },
            { rotulo: 'Volante (VOL/VOLD/VOLE)', role: 'VOL' },
            { rotulo: 'Meio-Campo genérico (MC/MCD/MCE)', role: 'MC' },
            { rotulo: 'Meia Armador (MEI/MEID/MEIE)', role: 'MEI' },
            { rotulo: 'Ponta Direita (PD/MD)', role: 'PD' },
            { rotulo: 'Ponta Esquerda (PE/ME)', role: 'PE' },
            { rotulo: 'Atacante (ATA/ATD/ATE)', role: 'ATA' }
        ];

        // Texto pronto pra alimentar o prompt de escalação da IA — gerado a partir da mesma régua
        // de compatibilidade usada no seletor de troca (ESPECIALIDADES_JOGADOR, em js/funcoes-ea.js),
        // então nunca fica desatualizado em relação a ela, mesmo quando as especialidades mudam.
        function textoRegrasCompatibilidadePosicional() {
            return GRUPOS_TEXTO_COMPATIBILIDADE.map(g => {
                let aceitos = Object.keys(ESPECIALIDADES_JOGADOR).filter(pos => posicaoCompativelComRole(g.role, pos));
                return `- ${g.rotulo}: aceita ${aceitos.join(', ')}.`;
            }).join('\n            ');
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

        let _trocaOpcoesAtuais = []; // [{nome, ovr, posicao, tag, onSelect}] — o que está na tela agora
        let _trocaOpcoesRecomendados = []; // aba "Recomendados": quem faz sentido pra essa posição
        let _trocaOpcoesTodos = []; // aba "Todos os Jogadores": titulares + banco de hoje, GOL -> ATA
        let _trocaOpcoesNaoRelacionados = []; // aba "Não Relacionados": elenco fora da escalação (só pré-jogo)
        let _trocaAbaAtual = 'recomendados';

        // Estado (só visual) de qual card do campinho está mostrando "quem saiu" em vez de "quem está agora" — por role.
        let pitchToggleSubView = {};

        function toggleSubBadge(role, event) {
            if (event) event.stopPropagation();
            pitchToggleSubView[role] = !pitchToggleSubView[role];
            renderizarCampinhoLimpo();
        }

        // opcoesTodos e opcoesNaoRelacionados são opcionais — quando um caller não usa esse conceito
        // (ex: escolher quem sai numa sugestão da IA), passa [] e a aba correspondente some sozinha.
        function abrirModalTroca(opcoesRecomendados, opcoesTodos, opcoesNaoRelacionados, titulo, subtitulo, botaoExtra) {
            _trocaOpcoesRecomendados = opcoesRecomendados || [];
            _trocaOpcoesTodos = opcoesTodos || [];
            _trocaOpcoesNaoRelacionados = opcoesNaoRelacionados || [];
            _trocaAbaAtual = 'recomendados';
            _trocaOpcoesAtuais = _trocaOpcoesRecomendados;

            document.getElementById('modal-trocar-titulo').innerText = `🔄 ${titulo}`;
            let elSub = document.getElementById('modal-trocar-subtitulo');
            if (elSub) elSub.innerText = subtitulo || 'Escolha quem entra no lugar dele.';

            let wrapAbas = document.getElementById('modal-trocar-abas-wrap');
            let temTodos = _trocaOpcoesTodos.length > 0;
            let temNaoRelacionados = _trocaOpcoesNaoRelacionados.length > 0;
            if (wrapAbas) wrapAbas.style.display = (temTodos || temNaoRelacionados) ? 'flex' : 'none';
            let btnTodos = document.getElementById('btn-modal-trocar-todos');
            if (btnTodos) btnTodos.style.display = temTodos ? 'inline-block' : 'none';
            let btnNaoRelacionados = document.getElementById('btn-modal-trocar-nao-relacionados');
            if (btnNaoRelacionados) btnNaoRelacionados.style.display = temNaoRelacionados ? 'inline-block' : 'none';

            _renderizarListaTroca();
            _atualizarAbasAtivasTroca();

            let wrapExtra = document.getElementById('modal-trocar-botao-extra-wrap');
            if (wrapExtra) {
                // botaoExtra aceita um botão único (compatibilidade) ou uma lista de botões
                // (ex: as ações rápidas de cartão/lesão ao clicar num jogador em campo).
                let extras = botaoExtra ? (Array.isArray(botaoExtra) ? botaoExtra : [botaoExtra]) : [];
                if (extras.length) {
                    wrapExtra.style.display = 'flex';
                    wrapExtra.style.flexDirection = 'column';
                    wrapExtra.style.gap = '8px';
                    wrapExtra.innerHTML = extras.map(b => `<button onclick="${b.onclick}" style="width:100%; background:${b.cor || 'var(--warning)'}; color:${b.corTexto || '#14150F'}; padding:11px; font-weight:bold; border-radius:8px; border:none; cursor:pointer;">${b.label}</button>`).join('');
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

        function _atualizarAbasAtivasTroca() {
            ['recomendados', 'todos', 'nao-relacionados'].forEach(aba => {
                let el = document.getElementById(`btn-modal-trocar-${aba}`);
                if (el) el.classList.toggle('active', _trocaAbaAtual === aba);
            });
        }

        function mostrarAbaTroca(aba) {
            _trocaAbaAtual = aba;
            _trocaOpcoesAtuais = aba === 'todos' ? _trocaOpcoesTodos
                : aba === 'nao-relacionados' ? _trocaOpcoesNaoRelacionados
                : _trocaOpcoesRecomendados;
            _renderizarListaTroca();
            _atualizarAbasAtivasTroca();
        }

        function executarTrocaSelecionada(idx) {
            let op = _trocaOpcoesAtuais[idx];
            _trocaOpcoesAtuais = []; _trocaOpcoesRecomendados = []; _trocaOpcoesTodos = []; _trocaOpcoesNaoRelacionados = [];
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
                    return { nome: j.nome, ovr: jogBD ? jogBD.ovr : '?', posicao: jogBD ? jogBD.posicao : r, tag: 'Trocar de posição (' + r + ')', onSelect: () => trocarPosicaoTitulares(role, r), _ordemPos: jogBD ? (ordemPosicoes[jogBD.posicao] || 8) : 8 };
                });
            let posRelevantes = opcoesPosicao.filter(o => posicaoCompativelComRole(role, o.posicao));

            let opcoesRecomendados, opcoesTodos, subtitulo;

            if (!aoVivo) {
                // Pré-jogo: também dá pra trazer alguém do banco pra essa vaga (aí sim vira uma troca de escalação normal).
                let titularesNomes = Object.values(partida.titulares).map(j => j.nome);
                let bancoNomes = (partida.banco || []).map(b => b.nome);
                let candidatosBanco = db[currentSave].plantel.filter(p => p.status === 'Ativo' && !titularesNomes.includes(p.nome) && bancoNomes.includes(p.nome));
                let opcoesBanco = candidatosBanco.map(p => ({ nome: p.nome, ovr: p.ovr, posicao: p.posicao, tag: 'Banco', onSelect: () => trocarJogadorNoCampo(role, p.nome), _ordemPos: ordemPosicoes[p.posicao] || 8 }));
                let bancoRelevantes = opcoesBanco.filter(o => posicaoCompativelComRole(role, o.posicao));
                bancoRelevantes.sort((a, b) => b.ovr - a.ovr);
                posRelevantes.sort((a, b) => b.ovr - a.ovr);
                // O que o treinador mais quer aqui é escalar alguém do banco — isso vem primeiro.
                // Trocar de posição com outro titular é secundário, fica depois.
                opcoesRecomendados = bancoRelevantes.concat(posRelevantes);
                // "Todos os Jogadores": time de hoje inteiro (titulares + banco), do goleiro ao atacante.
                opcoesTodos = opcoesBanco.concat(opcoesPosicao).sort((a, b) => (a._ordemPos - b._ordemPos) || (b.ovr - a.ovr));
                subtitulo = 'Jogadores que fazem sentido pra essa posição. Use as abas acima pra ver o time todo ou puxar alguém de fora da escalação.';
            } else {
                // Ao vivo: a MESMA lista já mistura trocar de posição com quem está em campo (não
                // gasta substituição) e trazer alguém do banco pro lugar dele (gasta 1 das 5 e pede
                // o minuto) — antes eram dois passos separados e o segundo ficava escondido atrás
                // de um botão, então na prática só aparecia quem cruzava de posição (geralmente
                // pontas cobrindo lateral), nunca o lateral reserva de verdade que estava no banco.
                let subsUsadas = (partida.substituicoes || []).length;
                let fora = partida.jogadoresForaDaPartida || [];
                // Expulso (cartão vermelho) não pode ser substituído — regra do futebol, sair por
                // expulsão não abre vaga pro banco. Só resta trocar de posição com outro titular.
                let expulsoAqui = jogadorExpulsoNestaPartida(partida, nomeAtual);
                // Pedido do treinador: quem já entrou como substituto só sai por lesão declarada —
                // nunca oferece trazer mais alguém do banco pra tirá-lo de novo.
                let travadoAqui = jogadorTravadoPorJaTerEntrado(partida, nomeAtual);
                let opcoesBanco = (subsUsadas < 5 && !expulsoAqui && !travadoAqui) ? (partida.banco || []).filter(b => b.nome && !fora.includes(b.nome)).map(b => {
                    let jogBD = db[currentSave].plantel.find(p => p.nome === b.nome);
                    return { nome: b.nome, ovr: jogBD ? jogBD.ovr : '?', posicao: jogBD ? jogBD.posicao : (b.posicao || ''), tag: `Banco — declara substituição (${subsUsadas}/5)`, onSelect: () => iniciarDeclaracaoSubstituicao(role, b.nome), _ordemPos: jogBD ? (ordemPosicoes[jogBD.posicao] || 8) : 8 };
                }) : [];
                let bancoRelevantesVivo = opcoesBanco.filter(o => posicaoCompativelComRole(role, o.posicao));
                bancoRelevantesVivo.sort((a, b) => b.ovr - a.ovr);
                posRelevantes.sort((a, b) => b.ovr - a.ovr);

                opcoesRecomendados = bancoRelevantesVivo.concat(posRelevantes);
                // Ao vivo não existe "fora da escalação" pra puxar — só quem já é do jogo hoje conta.
                opcoesTodos = opcoesBanco.concat(opcoesPosicao).sort((a, b) => (a._ordemPos - b._ordemPos) || (b.ovr - a.ovr));
                subtitulo = expulsoAqui
                    ? `🟥 ${nomeAtual} foi expulso — não pode ser substituído, só trocado de posição com outro titular.`
                    : travadoAqui
                    ? `⛔ ${nomeAtual} entrou como substituto nesta partida — só sai por lesão declarada. Você ainda pode trocá-lo de posição com outro titular.`
                    : (subsUsadas < 5
                        ? `Traga alguém do banco (gasta 1 das ${5 - subsUsadas} substituições restantes e pede o minuto) ou troque de posição com outro titular (não gasta substituição).`
                        : 'Limite de 5 substituições já atingido — só dá pra trocar de posição com outro titular.');
            }

            // Pedido do treinador: em vez de só os botões genéricos lá embaixo (que abrem um
            // seletor com o time inteiro), clicar direto no jogador já oferece declarar
            // cartão/lesão PARA ELE — sem precisar escolher o nome de novo. Cartão amarelo/
            // vermelho some da lista se ele já foi expulso nesta partida (não tem como cartear
            // duas vezes o mesmo jogador).
            let extrasAoVivo = null;
            if (aoVivo && nomeAtual) {
                let nomeEsc = nomeAtual.replace(/'/g, "\\'");
                extrasAoVivo = [];
                if (!jogadorExpulsoNestaPartida(partida, nomeAtual)) {
                    extrasAoVivo.push({ label: '🟨 Cartão Amarelo', cor: 'var(--warning)', corTexto: '#14150F', onclick: `fecharModalTrocaEAbrirCartao('amarelo', '${nomeEsc}')` });
                    extrasAoVivo.push({ label: '🟥 Cartão Vermelho', cor: 'var(--danger)', corTexto: 'white', onclick: `fecharModalTrocaEAbrirCartao('vermelho', '${nomeEsc}')` });
                }
                extrasAoVivo.push({ label: '🏥 Declarar Lesão', cor: 'var(--panel-bg)', corTexto: 'var(--text)', onclick: `fecharModalTrocaEAbrirLesao('${nomeEsc}')` });
            }

            // "Não Relacionados": elenco ativo que nem está no banco de hoje — só faz sentido pré-jogo,
            // já que ao vivo não dá pra chamar alguém que não fazia parte da partida declarada.
            let opcoesNaoRelacionados = [];
            if (!aoVivo) {
                let titularesNomes = Object.values(partida.titulares).map(j => j.nome);
                let bancoNomes = (partida.banco || []).map(b => b.nome);
                opcoesNaoRelacionados = db[currentSave].plantel
                    .filter(p => p.status === 'Ativo' && !titularesNomes.includes(p.nome) && !bancoNomes.includes(p.nome))
                    .map(p => ({ nome: p.nome, ovr: p.ovr, posicao: p.posicao, tag: 'Fora da escalação', onSelect: () => trocarJogadorNoCampo(role, p.nome), _ordemPos: ordemPosicoes[p.posicao] || 8 }))
                    .sort((a, b) => (a._ordemPos - b._ordemPos) || (b.ovr - a.ovr));
            }

            abrirModalTroca(opcoesRecomendados, opcoesTodos, opcoesNaoRelacionados, `Trocar ${nomeAtual || 'vaga (' + role + ')'}`, subtitulo, extrasAoVivo);
        }

        // Fecha o modal de troca antes de abrir o de cartão/lesão (são modais diferentes —
        // sem isso os dois ficariam sobrepostos na tela).
        function fecharModalTrocaEAbrirCartao(tipo, nome) {
            document.getElementById('modal-trocar-jogador').style.display = 'none';
            abrirDeclararCartao(tipo, nome);
        }
        function fecharModalTrocaEAbrirLesao(nome) {
            document.getElementById('modal-trocar-jogador').style.display = 'none';
            abrirDeclararLesao(nome);
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
                // Vaga de quem foi expulso não aparece aqui — expulso não é substituído (só troca de posição).
                // Mesma coisa pra quem já entrou como substituto: só sai por lesão declarada.
                .filter(([r, j]) => j.nome && j.nome !== '???' && !(aoVivo && jogadorExpulsoNestaPartida(partida, j.nome)) && !(aoVivo && jogadorTravadoPorJaTerEntrado(partida, j.nome)))
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

            abrirModalTroca(relevantes, outros, [], `Colocar ${atual.nome || 'reserva'} em campo`, subtitulo, botaoExtra);
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

            abrirModalTroca(relevantes, outros, [], `Trocar ${atual.nome} no banco`, `Escolha quem do elenco assume o lugar de ${atual.nome} no banco — ele não entra em campo.`);
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
            let jogadorSaindo = partida.titulares && partida.titulares[roleSai];
            if (jogadorSaindo && jogadorExpulsoNestaPartida(partida, jogadorSaindo.nome)) { alert(`${jogadorSaindo.nome} foi expulso e não pode ser substituído — só trocado de posição com outro titular.`); return; }
            if (jogadorSaindo && jogadorTravadoPorJaTerEntrado(partida, jogadorSaindo.nome)) { alert(`${jogadorSaindo.nome} entrou como substituto nesta partida — só sai por lesão declarada.`); return; }

            let minutoStr = await promptModerno(`Em que minuto ${nomeEntra} entrou em campo?`, '', '⏱️ Minuto da Substituição');
            if (minutoStr === null) return;
            let minuto = parseInt(minutoStr, 10);
            if (isNaN(minuto) || minuto < 0 || minuto > 130) { alert('Digite um minuto válido (0 a 130).'); return; }

            let ok = efetivarSubstituicao(roleSai, nomeEntra, minuto, instrucao);
            if (!ok) { alert('Não foi possível confirmar essa substituição.'); return; }
            renderizarAuxiliarPartida();
        }

        // --- DECLARAR CARTÃO (amarelo/vermelho) DURANTE A PARTIDA AO VIVO ---
        // Fica registrado na ficha da partida (mesmo lugar das substituições). O cartão vermelho
        // tem uma regra própria: o jogador expulso NÃO pode ser substituído (regra do futebol —
        // sair de campo por expulsão não abre vaga pro banco), só trocado de posição com outro
        // titular. A suspensão pra próxima partida só é aplicada quando a partida é salva
        // (salvarPartida, em js/diretoria-partidas.js), reaproveitando o campo suspensoVermelho
        // que o Departamento Médico já usa.
        let _tipoCartaoAtual = null;

        function abrirDeclararCartao(tipo, nomePreSelecionado) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || partida.status !== 'em_andamento' || !partida.titulares) return;
            _tipoCartaoAtual = tipo;
            let titulo = document.getElementById('modal-cartao-titulo');
            if (titulo) titulo.innerText = tipo === 'vermelho' ? '🟥 Declarar Cartão Vermelho' : '🟨 Declarar Cartão Amarelo';
            let jogadoresEmCampo = Object.values(partida.titulares).filter(j => j && j.nome && j.nome !== '???');
            let selectEl = document.getElementById('modal-cartao-jogador');
            selectEl.innerHTML = jogadoresEmCampo
                .map(j => `<option value="${j.nome}">${j.nome}</option>`).join('');
            // Veio de um clique direto no jogador em campo — já entra selecionado, sem precisar escolher de novo.
            if (nomePreSelecionado) selectEl.value = nomePreSelecionado;
            document.getElementById('modal-declarar-cartao').style.display = 'flex';
        }

        async function confirmarDeclararCartao() {
            let nome = document.getElementById('modal-cartao-jogador').value;
            let tipo = _tipoCartaoAtual;
            document.getElementById('modal-declarar-cartao').style.display = 'none';
            if (!nome || !tipo) return;

            let minutoStr = await promptModerno(`Em que minuto ${nome} recebeu o cartão ${tipo}?`, '', tipo === 'vermelho' ? '🟥 Minuto do Cartão Vermelho' : '🟨 Minuto do Cartão Amarelo');
            if (minutoStr === null) return;
            let minuto = parseInt(minutoStr, 10);
            if (isNaN(minuto) || minuto < 0 || minuto > 130) { alert('Digite um minuto válido (0 a 130).'); return; }

            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;
            if (!partida.cartoes) partida.cartoes = [];
            partida.cartoes.push({ nome: nome, tipo: tipo, minuto: minuto });
            salvarDados();
            if (typeof renderizarAbaSalvarPartida === 'function') renderizarAbaSalvarPartida();
        }

        // Já foi expulso NESTA partida? Usado pra travar a substituição dele (só pode trocar de posição).
        function jogadorExpulsoNestaPartida(partida, nome) {
            return !!(partida && Array.isArray(partida.cartoes) && partida.cartoes.some(c => c.tipo === 'vermelho' && c.nome === nome));
        }

        // Pedido do treinador: "um jogador entra, ele não deve sair... só por lesão" — um
        // substituto que acabou de entrar em campo não é candidato a sair de novo minutos depois
        // por ajuste tático (nem sugerido pelo Auxiliar, nem pelo seletor manual). A única saída
        // válida pra quem já entrou como substituto é uma lesão declarada nesta mesma partida.
        function jogadorEntrouComoSubstituto(partida, nome) {
            return !!(partida && Array.isArray(partida.substituicoes) && partida.substituicoes.some(s => s.entrou === nome));
        }
        function jogadorTravadoPorJaTerEntrado(partida, nome) {
            return jogadorEntrouComoSubstituto(partida, nome) && !((partida.lesoesDeclaradas || []).includes(nome));
        }

        // --- DECLARAR LESÃO DURANTE A PARTIDA AO VIVO ---
        // Diferente do cartão vermelho, não trava nada — o jeito normal de tirar um jogador
        // lesionado é substituí-lo pelo fluxo que já existe. Isto só registra QUEM se machucou;
        // QUANTOS DIAS ele fica de fora só é perguntado ao encerrar a partida (salvarPartida, em
        // js/diretoria-partidas.js) — o valor entra direto em diasLesao, que o Departamento Médico
        // já sabe descontar dos dias até a próxima partida (processarCondicaoFisicaPosPartida).
        function abrirDeclararLesao(nomePreSelecionado) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida || partida.status !== 'em_andamento' || !partida.titulares) return;
            let jogadoresEmCampo = Object.values(partida.titulares).filter(j => j && j.nome && j.nome !== '???');
            let selectEl = document.getElementById('modal-lesao-jogador');
            selectEl.innerHTML = jogadoresEmCampo
                .map(j => `<option value="${j.nome}">${j.nome}</option>`).join('');
            if (nomePreSelecionado) selectEl.value = nomePreSelecionado;
            document.getElementById('modal-declarar-lesao').style.display = 'flex';
        }

        function confirmarDeclararLesao() {
            let nome = document.getElementById('modal-lesao-jogador').value;
            document.getElementById('modal-declarar-lesao').style.display = 'none';
            if (!nome) return;
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;
            if (!partida.lesoesDeclaradas) partida.lesoesDeclaradas = [];
            if (!partida.lesoesDeclaradas.includes(nome)) partida.lesoesDeclaradas.push(nome);
            salvarDados();
            if (typeof renderizarAbaSalvarPartida === 'function') renderizarAbaSalvarPartida();
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

        // --- AJUSTAR TÁTICA COMPLETA (pré-jogo — formação, estilo, armação e defesa de uma vez) ---
        // Antes de Iniciar Partida o treinador só conseguia mexer na formação (o resto do pacote
        // tático — predefinição/armação/abordagem defensiva — só vinha do Auxiliar ou do "Estilo de
        // Jogo" do Perfil do Treinador). Este modal deixa ajustar tudo manualmente pra ESTA partida,
        // reaproveitando o mesmo motor de regras (corrigirTatica) que já valida a sugestão da IA.
        function abrirAjustarTaticaManual() {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;
            let t = Object.assign(taticaPadrao(), partida.tatica || {});
            document.getElementById('modal-tatica-formacao').innerHTML = Object.keys(coordsFormacoes)
                .map(f => `<option value="${f}" ${f === partida.formacaoEscolhida ? 'selected' : ''}>${f}</option>`).join('');
            document.getElementById('modal-tatica-predefinicao').innerHTML = PREDEFINICOES_TATICAS
                .map(p => `<option value="${p.id}" ${p.id === t.predefinicao ? 'selected' : ''}>${p.emoji} ${p.nome}</option>`).join('');
            document.getElementById('modal-tatica-armacao').innerHTML = ESTILOS_ARMACAO
                .map(e => `<option value="${e.id}" ${e.id === t.estiloArmacao ? 'selected' : ''}>${e.nome}</option>`).join('');
            document.getElementById('modal-tatica-defesa').value = t.abordagemDefensiva;
            atualizarAjudaPredefinicaoModal();
            document.getElementById('modal-ajustar-tatica').style.display = 'flex';
        }

        function atualizarAjudaPredefinicaoModal() {
            let sel = document.getElementById('modal-tatica-predefinicao');
            let ajuda = document.getElementById('modal-tatica-ajuda');
            if (sel && ajuda) ajuda.innerText = textoRegraPredefinicao(sel.value);
        }

        function confirmarAjustarTaticaManual() {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;

            let novaFormacao = document.getElementById('modal-tatica-formacao').value;
            let predefinicao = document.getElementById('modal-tatica-predefinicao').value;
            let estiloArmacao = document.getElementById('modal-tatica-armacao').value;
            let abordagemDefensiva = Number(document.getElementById('modal-tatica-defesa').value);

            document.getElementById('modal-ajustar-tatica').style.display = 'none';

            if (novaFormacao !== partida.formacaoEscolhida) aplicarNovaFormacao(novaFormacao);

            let { tatica, ajustes } = corrigirTatica({ predefinicao: predefinicao, estiloArmacao: estiloArmacao, abordagemDefensiva: abordagemDefensiva, esquema: novaFormacao });
            partida.tatica = Object.assign({}, partida.tatica, tatica);
            salvarDados();
            renderizarAbaSalvarPartida();
            if (ajustes.length) alert('A combinação escolhida não é permitida no jogo — corrigi automaticamente:\n\n' + ajustes.join('\n'));
        }

        // --- CICLO DE VIDA DA PARTIDA (iniciar / cancelar / ir registrar) ---

        // Chamada pelo salvarPartida() (Dashboard) quando há uma partida declarada em aberto.
        async function finalizarPartidaAuxiliar(golsPro, golsContra, adversarioTexto) {
            let partida = db[currentSave].partidaAuxiliar;
            if (!partida) return;

            let resultado = golsPro > golsContra ? 'Vitória' : (golsPro < golsContra ? 'Derrota' : 'Empate');
            let nomeAdv = partida.adversarioNome || adversarioTexto || 'o adversário';

            // Reclamação do treinador: "perdemos de 1 a 0 pro Barcelona, dominamos a posse, fora
            // de casa, e o Auxiliar me cornetou do mesmo jeito que numa goleada em casa". O
            // comentário pós-jogo só olhava pro placar — nunca soube se o time jogou bem ou mal de
            // verdade. Agora ele lê a ficha completa da partida que acabou de ser salva (posse,
            // finalizações, mando) pra avaliar a atuação de verdade, não só o resultado seco.
            let ultimaPartida = db[currentSave].partidas[db[currentSave].partidas.length - 1];
            let contextoAtuacao = ultimaPartida ? `Mando: ${ultimaPartida.mando}. Posse de bola: ${ultimaPartida.possePro}% (nosso) x ${ultimaPartida.posseAdv}% (${nomeAdv}). Finalizações: ${ultimaPartida.finPro} (nosso) x ${ultimaPartida.finAdv} (${nomeAdv}).` : '';

            let promptIA = `Você é ${nomeAuxiliarExibicao()}, o Auxiliar Técnico do "${db[currentSave].nome}". A partida contra ${nomeAdv} terminou: ${golsPro} x ${golsContra} (${resultado} para o seu time).
            ${contextoAtuacao}
            Seu plano pré-jogo foi: ${partida.analiseGeral || 'sem análise prévia registrada'}.
            ${partida.ajustesFeitos && partida.ajustesFeitos.length > 0 ? `Durante o jogo você deu ${partida.ajustesFeitos.length} orientação(ões) ao treinador: ${partida.ajustesFeitos.map(a => a.resposta).join(' | ')}` : 'Você não precisou dar nenhuma orientação extra durante o jogo — o plano se manteve do início ao fim.'}
            ⚠️ Um auxiliar técnico de verdade sabe separar resultado de desempenho: se os números acima mostram domínio de posse/finalizações mesmo numa derrota (ainda mais fora de casa ou contra um adversário mais forte), reconheça a boa atuação em vez de cobrar como se o time tivesse jogado mal — o tom só deve ser duro quando o desempenho justificar.

            Escreva o RELATÓRIO PÓS-JOGO desta partida, honesto e no seu estilo de auxiliar técnico, com 4 partes:
            1. "resumo": 2-3 frases avaliando como o time e o plano se saíram — específico ao resultado, nunca genérico.
            2. "pontosFortes": 1-2 frases sobre o que funcionou bem NESTA partida especificamente (um setor do campo, uma escolha tática, um jogador).
            3. "pontosFracos": 1-2 frases sobre o que não funcionou ou faltou NESTA partida.
            4. "orientacao": 1-2 frases de orientação prática e concreta pro próximo jogo, com base no que você observou aqui.

            Retorne EXATAMENTE este JSON puro (sem markdown, sem texto fora do JSON):
            { "resumo": "...", "pontosFortes": "...", "pontosFracos": "...", "orientacao": "..." }`;

            let textoResumo = '', pontosFortes = '', pontosFracos = '', orientacaoAuxiliar = '';
            try {
                const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
                let bruto = (data.candidates[0].content.parts[0].text || '').trim();
                let match = bruto.match(/\{[\s\S]*\}/);
                if (match) {
                    let json = JSON.parse(match[0]);
                    textoResumo = (json.resumo || '').trim();
                    pontosFortes = (json.pontosFortes || '').trim();
                    pontosFracos = (json.pontosFracos || '').trim();
                    orientacaoAuxiliar = (json.orientacao || '').trim();
                }
                // A IA pode devolver texto puro em vez do JSON pedido — nesse caso, o texto
                // inteiro vira o resumo (pontos fortes/fracos/orientação ficam pra depois, via
                // gerarAnaliseRelatorio) em vez de perder o comentário todo.
                if (!textoResumo) textoResumo = bruto.replace(/^["']|["']$/g, '');
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
                substituicoes: partida.substituicoes || [], cartoes: partida.cartoes || [],
                analiseGeral: partida.analiseGeral, ajustesFeitos: partida.ajustesFeitos,
                jogadoresNotas: dadosDashboard ? dadosDashboard.jogadores : [],
                estatisticas: dadosDashboard ? { possePro: dadosDashboard.possePro, posseAdv: dadosDashboard.posseAdv, finPro: dadosDashboard.finPro, finAdv: dadosDashboard.finAdv, comp: dadosDashboard.comp, mando: dadosDashboard.mando } : null,
                golsPro: golsPro, golsContra: golsContra, resultado: resultado, resumoPosJogo: textoResumo,
                pontosFortes: pontosFortes, pontosFracos: pontosFracos, orientacaoAuxiliar: orientacaoAuxiliar,
                finalizadaEm: Date.now()
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

        // --- RELATÓRIOS DO AUXILIAR TÉCNICO ---
        // Pedido do treinador: em vez de duas seções separadas — um "Histórico de Partidas" seco
        // (jogo a jogo, sem analisar nada) e um "Relatório" agregado (só texto genérico sobre
        // várias partidas, sem visual nenhum) — as duas viram UMA seção só: cada partida já
        // finalizada é o próprio "Relatório", no mesmo formato rico que o histórico tinha
        // (formação, campinho tático com quem entrou/saiu, substituições, cartões, notas dos
        // jogadores), mais a leitura qualitativa do Auxiliar sobre AQUELA partida especificamente
        // (pontos fortes, pontos fracos, orientação pro próximo jogo). Essa leitura é gerada
        // automaticamente assim que a partida é salva (finalizarPartidaAuxiliar, acima) — não
        // precisa de nenhum clique. gerarAnaliseRelatorio() só existe pra PREENCHER partidas
        // antigas, salvas antes dessa mudança, que ainda não têm essa análise.
        async function gerarAnaliseRelatorio(idx) {
            let historico = db[currentSave] && db[currentSave].historicoPartidasAuxiliar;
            let p = historico && historico[idx];
            if (!p) return;

            let contextoAtuacao = p.estatisticas ? `Mando: ${p.estatisticas.mando}. Posse de bola: ${p.estatisticas.possePro}% (nosso) x ${p.estatisticas.posseAdv}% (${p.adversarioNome || 'adversário'}). Finalizações: ${p.estatisticas.finPro} (nosso) x ${p.estatisticas.finAdv} (${p.adversarioNome || 'adversário'}).` : '';

            let promptIA = `Você é ${nomeAuxiliarExibicao()}, o Auxiliar Técnico do "${db[currentSave].nome}". Esta partida contra ${p.adversarioNome || 'o adversário'} já terminou: ${p.golsPro} x ${p.golsContra} (${p.resultado}).
            ${contextoAtuacao}
            ${p.resumoPosJogo ? `Sua avaliação na época foi: "${p.resumoPosJogo}"` : ''}

            Escreva uma análise curta com 2 partes sobre ESTA partida especificamente:
            1. "pontosFortes": 1-2 frases sobre o que funcionou bem.
            2. "pontosFracos": 1-2 frases sobre o que não funcionou ou faltou.
            3. "orientacao": 1-2 frases de orientação prática pro próximo jogo.

            Retorne EXATAMENTE este JSON puro: { "pontosFortes": "...", "pontosFracos": "...", "orientacao": "..." }`;

            if (typeof mostrarCarregandoIA === 'function') mostrarCarregandoIA('🧠 O Auxiliar está analisando essa partida...');
            try {
                const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
                let bruto = (data.candidates[0].content.parts[0].text || '').trim();
                let match = bruto.match(/\{[\s\S]*\}/);
                if (match) {
                    let json = JSON.parse(match[0]);
                    p.pontosFortes = (json.pontosFortes || '').trim();
                    p.pontosFracos = (json.pontosFracos || '').trim();
                    p.orientacaoAuxiliar = (json.orientacao || '').trim();
                }
            } catch (e) {
                alert('Não consegui gerar a análise agora — tente de novo em instantes.');
                if (typeof esconderCarregandoIA === 'function') esconderCarregandoIA();
                return;
            }
            if (typeof esconderCarregandoIA === 'function') esconderCarregandoIA();
            salvarDados();
            renderizarRelatoriosAuxiliar();
        }

        function renderizarRelatoriosAuxiliar() {
            let container = document.getElementById('auxiliar-relatorios');
            if (!container || !db[currentSave]) return;
            let historico = db[currentSave].historicoPartidasAuxiliar || [];
            if (historico.length === 0) {
                container.innerHTML = `<p class="wizard-elenco-vazio">Nenhuma partida registrada ainda. O relatório completo aparece aqui assim que você salvar o resultado de uma partida.</p>`;
                return;
            }
            container.innerHTML = historico.map((p, idx) => {
                let cor = p.resultado === 'Vitória' ? 'var(--primary)' : (p.resultado === 'Derrota' ? 'var(--danger)' : 'var(--warning)');
                let icone = p.resultado === 'Vitória' ? '✅' : (p.resultado === 'Derrota' ? '❌' : '➖');
                let temAnalise = p.pontosFortes || p.pontosFracos || p.orientacaoAuxiliar;
                return `
                <div class="historico-partida-card">
                    <div class="historico-partida-header" onclick="toggleRelatorioPartida(${idx})">
                        <span style="color:${cor}; font-weight:bold; font-size:16px;">${icone} ${p.golsPro} x ${p.golsContra}</span>
                        <strong>vs ${p.adversarioNome || 'Adversário'}</strong>
                        <span style="color:var(--text-muted); font-size:12px;">${p.formacaoEscolhida || ''}</span>
                    </div>
                    <div class="historico-partida-detalhes" id="relatorio-detalhe-${idx}" style="display:none;">
                        ${p.adversarioInfo ? `<p><strong>Sobre o adversário:</strong> ${p.adversarioInfo}</p>` : ''}

                        ${gerarHtmlEstatisticasHistorico(p)}

                        <h4 class="historico-secao-titulo">🧩 Campinho Tático — como entrou em campo</h4>
                        ${gerarHtmlCampinhoHistorico(p)}

                        ${gerarHtmlSubstituicoesHistorico(p)}
                        ${gerarHtmlCartoesHistorico(p)}

                        <h4 class="historico-secao-titulo">⭐ Notas dos Jogadores</h4>
                        ${gerarHtmlNotasHistorico(p)}

                        <h4 class="historico-secao-titulo">📝 Leitura do Auxiliar</h4>
                        ${p.resumoPosJogo ? `<p>${p.resumoPosJogo}</p>` : ''}
                        ${temAnalise ? `
                            ${p.pontosFortes ? `<p><strong style="color:var(--primary);">💪 Pontos fortes:</strong> ${p.pontosFortes}</p>` : ''}
                            ${p.pontosFracos ? `<p><strong style="color:var(--danger);">⚠️ Pontos fracos:</strong> ${p.pontosFracos}</p>` : ''}
                            ${p.orientacaoAuxiliar ? `<p><strong style="color:var(--accent);">🧭 Orientação pro próximo jogo:</strong> ${p.orientacaoAuxiliar}</p>` : ''}
                        ` : `<button onclick="event.stopPropagation(); gerarAnaliseRelatorio(${idx})" style="background: var(--accent); color:white; padding:8px 12px; font-size:12px; margin-top:4px;">🧠 Gerar análise completa</button>`}

                        <div class="historico-titulares-grid">
                            <div><strong>Banco (início de jogo)</strong>${(p.bancoInicial || p.banco || []).map(r => `<div>${r.nome}</div>`).join('') || '<div>-</div>'}</div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        function toggleRelatorioPartida(idx) {
            let el = document.getElementById('relatorio-detalhe-' + idx);
            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        // Colapso no nível da SEÇÃO inteira (pedido do treinador): a aba abre só com o cabeçalho
        // "Relatórios do Auxiliar Técnico" visível — clicar nele revela a lista de partidas (cada
        // uma ainda colapsada individualmente, ver toggleRelatorioPartida acima), e só então
        // clicar numa partida específica abre o relatório completo dela. Dois níveis de clique.
        function toggleRelatoriosAuxiliarPanel() {
            let corpo = document.getElementById('auxiliar-relatorios-corpo');
            let seta = document.getElementById('auxiliar-relatorios-seta');
            if (!corpo) return;
            let abrir = corpo.style.display === 'none';
            corpo.style.display = abrir ? 'block' : 'none';
            if (seta) seta.innerText = abrir ? '▾' : '▸';
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

        function gerarHtmlCartoesHistorico(p) {
            let cartoes = p.cartoes || [];
            if (cartoes.length === 0) return '';
            let ordenados = cartoes.slice().sort((a, b) => (a.minuto || 0) - (b.minuto || 0));
            return `<h4 class="historico-secao-titulo">🟨🟥 Cartões</h4>
                <div class="historico-subs-lista">
                    ${ordenados.map(c => `<div class="historico-sub-item"><strong>${c.minuto}'</strong> — ${c.tipo === 'vermelho' ? '🟥' : '🟨'} ${c.nome}</div>`).join('')}
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

