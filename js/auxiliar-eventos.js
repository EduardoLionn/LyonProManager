function atualizarKPIsEForma(pFiltradas) {
            // 1. Forma Recente (Últimos 5 jogos) — bolinhas coloridas com tooltip no hover
            // (resultado, placar, adversário e se foi em casa/fora/neutro).
            let formaHTML = "";
            let ultimos5 = pFiltradas.slice(-5);

            ultimos5.forEach(p => {
                let vitoria = p.golsPro > p.golsContra || (p.golsPro === p.golsContra && p.penaltis);
                let derrota = p.golsPro < p.golsContra;
                let resultado = vitoria ? 'Vitória' : (derrota ? 'Derrota' : 'Empate');
                let cor = vitoria ? '#2ecc71' : (derrota ? 'var(--danger)' : 'var(--warning)');
                let letra = vitoria ? 'V' : (derrota ? 'D' : 'E');
                let mandoTxt = { Casa: '🏠 Casa', Fora: '✈️ Fora', Neutro: '🌐 Neutro' }[p.mando] || '';

                formaHTML += `<div class="forma-dot" style="background:${cor};">${letra}
                    <div class="forma-dot-tooltip">
                        <strong>${resultado}</strong> ${p.golsPro} x ${p.golsContra}<br>
                        vs ${p.adversario}${mandoTxt ? ` · ${mandoTxt}` : ''}
                        ${p.comp ? `<br><span style="opacity:0.7;">${p.comp}</span>` : ''}
                    </div>
                </div>`;
            });
            document.getElementById('header-forma-recente').innerHTML = formaHTML;

            document.getElementById('kpi-partidas-jogadas').innerText = pFiltradas.length;

            // Se não tem jogos na temporada, zera os cartões
            if (pFiltradas.length === 0) {
                document.getElementById('kpi-aproveitamento').innerText = "0%";
                document.getElementById('kpi-gols-feitos').innerText = "0";
                document.getElementById('kpi-gols-sofridos').innerText = "0";
                document.getElementById('kpi-saldo').innerText = "0";
                // O estado vazio também precisa da leitura zerada — sem isso a barra e os
                // textos ficavam com os valores da temporada anterior ao trocar de filtro.
                atualizarSituacaoTemporada(pFiltradas, 0, 0, 0);
                return;
            }

            // 2. Aproveitamento (%), Gols Feitos/Sofridos e Saldo de Gols
            let ptsGanhos = 0;
            let golsProTot = 0;
            let golsConTot = 0;

            pFiltradas.forEach(p => {
                golsProTot += p.golsPro;
                golsConTot += p.golsContra;
                let vitoria = p.golsPro > p.golsContra || (p.golsPro === p.golsContra && p.penaltis);
                let empate = p.golsPro === p.golsContra && !p.penaltis;

                if (vitoria) ptsGanhos += 3;
                else if (empate) ptsGanhos += 1;
            });

            let ptsPossiveis = pFiltradas.length * 3;
            let aprov = ((ptsGanhos / ptsPossiveis) * 100).toFixed(1);
            let saldo = golsProTot - golsConTot;

            document.getElementById('kpi-aproveitamento').innerText = aprov + "%";
            document.getElementById('kpi-gols-feitos').innerText = golsProTot;
            document.getElementById('kpi-gols-sofridos').innerText = golsConTot;
            document.getElementById('kpi-saldo').innerText = saldo > 0 ? "+" + saldo : saldo;

            atualizarSituacaoTemporada(pFiltradas, Number(aprov), golsProTot, golsConTot);
        }

// Preenche a leitura que acompanha os números no topo do Dashboard. Os KPIs sozinhos não
// diziam se o time estava bem ou mal — 48% de aproveitamento é bom ou ruim? Aqui entram a
// faixa comparável, a média de gols por jogo, o recorte casa/fora e o estado do elenco.
function atualizarSituacaoTemporada(pFiltradas, aprov, golsPro, golsContra) {
    let el = (id) => document.getElementById(id);

    // --- Aproveitamento: barra + leitura em palavras ---
    let barra = el('barra-aproveitamento-fill');
    let leitura = el('situacao-aprov-leitura');
    if (barra && leitura) {
        let temJogos = pFiltradas.length > 0;
        let pct = temJogos ? Math.max(0, Math.min(100, aprov)) : 0;
        let cor = !temJogos ? 'var(--text-muted)'
            : pct >= 70 ? '#4CAF7A' : pct >= 50 ? 'var(--primary)' : pct >= 30 ? 'var(--warning)' : 'var(--danger)';
        barra.style.width = pct + '%';
        barra.style.background = cor;
        leitura.innerText = !temJogos ? 'sem dados'
            : pct >= 70 ? 'campanha de ponta' : pct >= 50 ? 'campanha regular' : pct >= 30 ? 'campanha abaixo do esperado' : 'campanha de risco';
    }

    // --- Gols: média por jogo diz mais sobre o time do que o total acumulado ---
    let golsLeitura = el('situacao-gols-leitura');
    if (golsLeitura) {
        if (pFiltradas.length === 0) {
            golsLeitura.innerText = 'Sem partidas registradas.';
        } else {
            let mediaPro = (golsPro / pFiltradas.length).toFixed(1);
            let mediaContra = (golsContra / pFiltradas.length).toFixed(1);
            golsLeitura.innerText = `${mediaPro} marcados e ${mediaContra} sofridos por jogo.`;
        }
    }

    // --- Casa × fora: duas barras comparáveis ---
    let mando = el('situacao-mando');
    if (mando) {
        let comMando = pFiltradas.filter(p => p.mando === 'Casa' || p.mando === 'Fora');
        if (comMando.length < 2) {
            mando.innerHTML = '<span class="situacao-card-nota">Poucos jogos pra comparar ainda.</span>';
        } else {
            let linha = (rotulo, icone) => {
                let lista = comMando.filter(p => p.mando === rotulo);
                if (lista.length === 0) return `<div class="mando-linha"><span class="mando-linha-rotulo">${icone}</span><span class="situacao-card-nota">sem jogos</span></div>`;
                let a = (typeof aproveitamentoPartidas === 'function') ? aproveitamentoPartidas(lista) : 0;
                let cor = a >= 70 ? '#4CAF7A' : a >= 50 ? 'var(--primary)' : a >= 30 ? 'var(--warning)' : 'var(--danger)';
                return `<div class="mando-linha">
                    <span class="mando-linha-rotulo">${icone}</span>
                    <span class="mando-linha-barra"><span class="mando-linha-fill" style="width:${a}%; background:${cor};"></span></span>
                    <span class="mando-linha-valor">${a}%</span>
                </div>`;
            };
            mando.innerHTML = linha('Casa', '🏠 Casa') + linha('Fora', '✈️ Fora');
        }
    }

    // --- Elenco: moral do grupo e quem está fora, que é o que decide a escalação ---
    let elencoBox = el('situacao-elenco');
    if (elencoBox) {
        let ativos = (typeof elencoAtivo === 'function') ? elencoAtivo() : [];
        if (ativos.length === 0) {
            elencoBox.innerHTML = '<span class="situacao-card-nota">Sem elenco cadastrado.</span>';
        } else {
            let clima = (typeof calcularClimaVestiario === 'function') ? calcularClimaVestiario() : null;
            let lesionados = ativos.filter(p => (p.diasLesao || 0) > 0).length;
            let suspensos = ativos.filter(p => p.suspensoVermelho).length;
            let desgastados = ativos.filter(p => {
                let c = (typeof condicaoJogador === 'function') ? condicaoJogador(p) : null;
                return c && (c.nivel === 'critico' || c.nivel === 'risco');
            }).length;

            let linhas = [`<span class="situacao-card-nota"><strong style="color:var(--text-main);">${ativos.length}</strong> jogadores disponíveis</span>`];
            if (clima) {
                let m = Math.round(clima.moralMedia);
                let corMoral = m >= 75 ? '#4CAF7A' : m >= 60 ? 'var(--primary)' : m >= 45 ? 'var(--warning)' : 'var(--danger)';
                linhas.push(`<span class="situacao-card-nota">Moral do grupo: <strong style="color:${corMoral};">${m}/100</strong></span>`);
            }
            let baixas = [];
            if (lesionados > 0) baixas.push(`${lesionados} lesionado(s)`);
            if (suspensos > 0) baixas.push(`${suspensos} suspenso(s)`);
            if (desgastados > 0) baixas.push(`${desgastados} desgastado(s)`);
            linhas.push(baixas.length
                ? `<span class="situacao-card-nota" style="color:var(--warning);">⚠️ ${baixas.join(', ')}</span>`
                : `<span class="situacao-card-nota" style="color:#4CAF7A;">✅ Elenco inteiro à disposição</span>`);
            elencoBox.innerHTML = linhas.join('');
        }
    }

    // --- Frase do momento do time, na faixa de identidade ---
    let momento = el('hero-momento');
    if (momento) {
        let txt = (typeof sequenciaAtualTexto === 'function') ? sequenciaAtualTexto() : '';
        momento.innerText = txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : '';
        momento.className = 'clube-hero-momento ' + (
            /vitória|vitórias|invicto/.test(txt) ? 'bom' : /derrota|sem vencer/.test(txt) ? 'ruim' : 'neutro'
        );
    }

    // --- Liga do clube na faixa de identidade ---
    let liga = el('hero-liga');
    if (liga && db[currentSave]) liga.innerText = db[currentSave].liga || '—';
}

// Atualiza o indicador de carregamento tanto na aba "Elenco" quanto na etapa de Elenco do assistente de Novo Jogo
function atualizarLoaderPlantel(texto) {
    let el1 = document.getElementById('loader-plantel-text');
    if (el1) el1.innerText = texto;
    let el2 = document.getElementById('wizard-loader-elenco');
    if (el2) el2.innerText = texto;
}

// Classifica, numa única chamada de texto (sem imagem), a especialidade de um lote de
// jogadores já extraídos das telas. Fica separada da leitura visual de propósito: pedir pra
// IA fazer OCR de uma tabela grande de imagem E aplicar as regras de classificação de scout
// ao mesmo tempo (ver PROMPT_CLASSIFICACAO_ESPECIALIDADE_IA) sobrecarregava o modelo, que
// começava a "esquecer" jogadores da leitura em elencos grandes (28 jogadores viravam 18).
// Separando as duas tarefas, a leitura da imagem fica simples (só copiar o que está na tela)
// e a classificação — que não depende da imagem — roda à parte, em lotes menores.
async function classificarEspecialidadesEmLote(jogadores) {
    const TAMANHO_LOTE = 20;
    let resultado = new Array(jogadores.length).fill(null);

    for (let inicio = 0; inicio < jogadores.length; inicio += TAMANHO_LOTE) {
        let lote = jogadores.slice(inicio, inicio + TAMANHO_LOTE);
        let listaTexto = lote.map((j, idx) => `${idx + 1}. Nome: "${j.nome}" | Posição Base: "${j.posicaoBase || ''}" | OVR: ${j.ovr || '?'}`).join('\n');

        let prompt = `${PROMPT_CLASSIFICACAO_ESPECIALIDADE_IA}

Classifique CADA jogador da lista abaixo (${lote.length} no total) na especialidade correspondente à Posição Base dele. Não pule nenhum jogador — a resposta final deve conter exatamente ${lote.length} itens, um pra cada número da lista, na mesma ordem.

Lista:
${listaTexto}

Retorne APENAS um array JSON puro, sem marcação markdown, com um item por jogador NA MESMA ORDEM da lista acima:
[{"indice": 1, "posicao": "Especialidade classificada"}, {"indice": 2, "posicao": "Especialidade classificada"}]`;

        try {
            const data = await chamarIA({ contents: [{ parts: [{ text: prompt }] }] });
            let rawText = data.candidates[0].content.parts[0].text;
            let jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                let classificados = JSON.parse(jsonMatch[0]);
                classificados.forEach(c => {
                    let idxLote = Number(c.indice) - 1;
                    if (idxLote >= 0 && idxLote < lote.length) resultado[inicio + idxLote] = c.posicao;
                });
            }
        } catch (e) {
            console.error("Erro na classificação de especialidades em lote:", e);
        }
    }

    return resultado;
}

async function lerImagensIAPlantel(event) {
            if (currentSave !== 'clube') return alert("Apenas para o modo Clube!");

            const files = event.target.files;
            if (!files || files.length === 0) return;

            atualizarLoaderPlantel("Iniciando leitura...");

            let extraidos = [];
            let imagensComFalha = [];

            // Loop para ler várias imagens selecionadas de uma vez. Cada chamada só faz a
            // extração "crua" da tabela (nome, posição base, OVR, idade) — sem classificar
            // especialidade — pra manter a tarefa simples o bastante pra IA não pular jogador
            // nenhum mesmo em elencos grandes.
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                atualizarLoaderPlantel(`Lendo imagem ${i + 1} de ${files.length}... aguarde`);

                // Converte a imagem em Base64 para enviar para a IA
                let base64Data = await new Promise((resolve) => {
                    let reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });

                let prompt = `Analise a imagem da tela de "Central do Elenco" de um jogo de futebol.
Existem colunas mostrando a Posição, Nome, GER/OVR e, se disponível, a Idade.

TAREFA CRÍTICA: extraia TODOS os jogadores da lista visíveis na imagem, sem exceção. Não pule, resuma ou omita nenhuma linha — inclusive as que estiverem com texto pequeno, cortado na borda ou com contraste ruim (nesses casos, faça sua melhor leitura em vez de descartar a linha). Percorra a tabela de cima para baixo, linha por linha, contando quantas linhas existem antes de responder: a sua resposta final DEVE conter exatamente uma entrada pra cada linha de jogador visível na imagem.

Para cada jogador retorne:
- "nome": copiado exatamente como está na tela (ex: O. Vlachodimos)
- "posicaoBase": a sigla de posição EXATA como aparece na tela (ex: "ZAG", "LD", "MEI"), sem traduzir ou classificar
- "ovr": o valor de GER/OVR como número
- "idade": se a idade estiver visível na tela, extraia como número. Se não estiver visível, omita o campo (não invente um valor)

Retorne APENAS um array JSON válido e puro, sem marcações markdown como \`\`\`json.
Exemplo do formato exigido:
[
  {"nome": "O. Vlachodimos", "posicaoBase": "GOL", "ovr": 79, "idade": 30},
  {"nome": "Marcão", "posicaoBase": "ZAG", "ovr": 74}
]`;

                try {
                    const data = await chamarIA({ contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } } ] }] });
                    let rawText = data.candidates[0].content.parts[0].text;

                    // Extrai o Array JSON da resposta da IA
                    let jsonMatch = rawText.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        let jogadoresImagem = JSON.parse(jsonMatch[0]);
                        if (Array.isArray(jogadoresImagem) && jogadoresImagem.length > 0) {
                            jogadoresImagem.forEach(j => { if (j && j.nome) extraidos.push(j); });
                        } else {
                            imagensComFalha.push(i + 1);
                        }
                    } else {
                        imagensComFalha.push(i + 1);
                    }
                } catch(e) {
                    console.error("Erro na leitura da imagem do plantel pela IA:", e);
                    imagensComFalha.push(i + 1);
                }
            }

            if (extraidos.length === 0) {
                atualizarLoaderPlantel("");
                event.target.value = "";
                alert("Não foi possível ler nenhum jogador nas imagens enviadas. Tente novamente com prints mais nítidos, de preferência mostrando menos jogadores por imagem.");
                return;
            }

            // Segunda etapa: classifica a especialidade de todos os jogadores extraídos numa
            // (ou poucas) chamada(s) de texto só, separada da leitura visual.
            atualizarLoaderPlantel("Classificando especialidades...");
            let classificacoes = await classificarEspecialidadesEmLote(extraidos);

            extraidos.forEach((j, idx) => {
                let nomeExtraido = String(j.nome || '').trim();
                if (!nomeExtraido) return;
                let posExtraida = ESPECIALIDADES_JOGADOR[classificacoes[idx]] ? classificacoes[idx] : "MeioCampo/Dinâmico";
                let ovrExtraido = Number(j.ovr) || 70;
                let idadeExtraida = j.idade ? Number(j.idade) : null;

                // Verifica se o jogador já existe para atualizar, senão cria um novo
                let jogadorExistente = db.clube.plantel.find(p => p.nome.toLowerCase() === nomeExtraido.toLowerCase());

                if (jogadorExistente) {
                    jogadorExistente.ovr = ovrExtraido;
                    jogadorExistente.posicao = posExtraida;
                    if (idadeExtraida) jogadorExistente.idade = idadeExtraida;
                } else {
                    let novoJog = {
                        nome: nomeExtraido,
                        posicao: posExtraida,
                        ovr: ovrExtraido,
                        status: 'Ativo',
                        jogosAvaliacao: 0
                    };
                    if (idadeExtraida) novoJog.idade = idadeExtraida;
                    if (typeof garantirCamposElenco === 'function') garantirCamposElenco(novoJog);
                    db.clube.plantel.push(novoJog);
                }
            });

            atualizarLoaderPlantel("");
            event.target.value = "";

            if (typeof wizardRenderElenco === 'function' && document.getElementById('wizard-step-elenco') && document.getElementById('wizard-step-elenco').style.display !== 'none') {
                wizardRenderElenco();
            }

            salvarDados();
            atualizarPlantelUI();
            preencherDatalistJogadores();

            let msg = `Leitura de Elenco concluída! ${extraidos.length} jogador(es) lido(s) a partir de ${files.length} imagem(ns).`;
            if (imagensComFalha.length > 0) {
                msg += `\n\n⚠️ Não foi possível ler ${imagensComFalha.length === files.length ? 'nenhuma imagem' : `a(s) imagem(ns) ${imagensComFalha.join(', ')}`} corretamente. Se faltar jogador, tente reenviar essa(s) imagem(ns) sozinha(s) — de preferência com menos jogadores por print.`;
            }
            alert(msg);
        }

        // --- FUNÇÕES DE CONDIÇÃO FÍSICA E AUXILIARES FALTANTES ---

        function atualizarSelectCondicaoAuxiliar() {
            let select = document.getElementById('select-jogador-condicao');
            if(!select) return;
            select.innerHTML = '<option value="">Selecione o jogador...</option>';
            
            if(db[currentSave] && db[currentSave].plantel) {
                let jogadoresAtivos = db[currentSave].plantel.filter(p => p.status === 'Ativo');
                jogadoresAtivos.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(p => {
                    select.innerHTML += `<option value="${p.nome}">${p.nome}</option>`;
                });
            }
        }

        function declararLesao() {
            let nome = document.getElementById('select-jogador-condicao').value;
            let dias = parseInt(document.getElementById('input-dias-lesao').value) || 0;
            
            if(!nome || dias <= 0) return alert("Por favor, selecione um jogador e insira uma quantidade válida de dias.");
            
            let jogador = db[currentSave].plantel.find(p => p.nome === nome);
            if(jogador) {
                garantirCondicaoFisica(jogador);
                jogador.diasLesao = dias;
                jogador.jogosSeguidos = 0;
                salvarDados();
                if(currentSave === 'clube') atualizarPlantelUI();
                atualizarDepartamentoMedicoUI();
                if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Lesão declarada: ${nome} (${dias}d)`);
                alert(`🏥 ${nome} declarado como lesionado por ${dias} dias.`);
                document.getElementById('input-dias-lesao').value = '0';
            }
        }

        function aplicarCartaoVermelho() {
            let nome = document.getElementById('select-jogador-condicao').value;
            if(!nome) return alert("Por favor, selecione um jogador.");
            
            let jogador = db[currentSave].plantel.find(p => p.nome === nome);
            if(jogador) {
                garantirCondicaoFisica(jogador);
                jogador.suspensoVermelho = true;
                salvarDados();
                if(currentSave === 'clube') atualizarPlantelUI();
                atualizarDepartamentoMedicoUI();
                if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Cartão vermelho: ${nome}`);
                alert(`🟥 ${nome} está suspenso pelo próximo jogo devido a um Cartão Vermelho.`);
            }
        }

// Cole AQUI o seu primeiro bloco de código:
        // FUNÇÕES AUXILIARES DE RISCO (Adicione em qualquer lugar no seu JS)
        function game_over_demissao() {
            document.getElementById('modal-demissao').style.display = 'flex';
        }

        function checarRiscoDemissao() {
            let nota = db[currentSave].notaDiretoria;

            if (nota === 0) {
                game_over_demissao();
            } else if (nota >= 10 && nota <= 29) {
                // Alerta Vermelho (Modal de Evento adaptado)
                document.getElementById('evento-texto').innerText = "A diretoria está FURIOSA. Você tem, no máximo, 1 a 2 jogos para reagir ou será sumariamente demitido.";
                document.querySelector('.evento-box h2').innerText = "⚠️ RISCO DE DEMISSÃO ALTÍSSIMO!";
                document.querySelector('.evento-box').style.borderColor = "var(--danger)";
                document.getElementById('modal-evento').style.display = 'flex';
            } else if (nota >= 30 && nota <= 49) {
                // Alerta Amarelo
                document.getElementById('evento-texto').innerText = "⚠️ ALERTA DA DIRETORIA: Resultados inaceitáveis. Reunião de emergência necessária! Seu cargo periga se a fase não mudar logo.";
                document.querySelector('.evento-box h2').innerText = "⚠️ ALERTA DA DIRETORIA";
                document.querySelector('.evento-box').style.borderColor = "var(--warning)";
                document.getElementById('modal-evento').style.display = 'flex';
            }
        }

        // OBS: o antigo processarDiasAposPartida() foi substituído pelo motor completo de
        // condição física em js/departamento-medico.js (função processarCondicaoFisicaPosPartida).

// --- MOTOR DO FEED SOCIAL E CAÇA ÀS BRUXAS ---

        function formatarTextoTweet(texto) {
            return texto.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
        }

        function atualizarTermometroTorcida(variacao) {
            let config = db[currentSave];
            if (!config) return;
            // O valor guardado pode estar corrompido (NaN/null) por um retorno estranho da IA
            // em versões anteriores: sanear aqui conserta o save em vez de propagar o lixo.
            let atual = numeroNaFaixa(config.aprovacaoTorcida, 0, 100, 75);
            // Nenhum evento isolado move a torcida mais que 15 pontos — a IA do Feed Social
            // já devolveu variações absurdas e elas zeravam o termômetro de uma vez.
            let delta = numeroNaFaixa(variacao, -15, 15, 0);
            config.aprovacaoTorcida = Math.max(0, Math.min(100, atual + delta));
            salvarDados();
            renderizarTermometroUI();
        }

        function renderizarTermometroUI() {
            // Atenção ao "|| 75": com aprovação em 0 (ou corrompida) ele mostrava 75 e dava a
            // impressão de que o termômetro tinha travado. Sanear é o certo aqui.
            let val = Math.round(numeroNaFaixa(db[currentSave] && db[currentSave].aprovacaoTorcida, 0, 100, 75));
            let barra = document.getElementById('barra-torcida');
            let texto = document.getElementById('texto-torcida');
            if(!barra || !texto) return;

            barra.style.width = `${val}%`;
            if(val >= 80) { barra.style.background = 'var(--primary)'; texto.innerText = `${val} (Ídolo)`; }
            else if(val >= 50) { barra.style.background = 'var(--warning)'; texto.innerText = `${val} (Dividida)`; }
            else { barra.style.background = 'var(--danger)'; texto.innerText = `${val} (Fúria Total)`; }
        }

