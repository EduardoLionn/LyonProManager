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

async function lerImagensIAPlantel(event) {
            if (currentSave !== 'clube') return alert("Apenas para o modo Clube!");

            const files = event.target.files;
            if (!files || files.length === 0) return;

            atualizarLoaderPlantel("Iniciando leitura...");

            // Loop para ler várias imagens selecionadas de uma vez
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                atualizarLoaderPlantel(`Lendo imagem ${i + 1} de ${files.length}... aguarde`);

                // Converte a imagem em Base64 para enviar para a IA
                let base64Data = await new Promise((resolve) => {
                    let reader = new FileReader(); 
                    reader.onload = () => resolve(reader.result.split(',')[1]); 
                    reader.readAsDataURL(file);
                });

                // Prompt detalhado mapeando exatamente as posições solicitadas
                let prompt = `Analise a imagem da tela de "Central do Elenco" de um jogo de futebol.
Existem colunas mostrando a Posição, Nome, GER/OVR e, se disponível, a Idade.
Extraia TODOS os jogadores da lista visíveis na imagem.

ATENÇÃO AO MAPEAMENTO DE POSIÇÕES (Você deve traduzir a sigla do jogo para as posições do nosso sistema):
- Se a sigla for "GL" -> use "Goleiro/Tradicional"
- Se a sigla for "ZAG", "ZAD", "ZAE", "ZAC" -> use "Zagueiro/Rebatedor"
- Se a sigla for "LD", "LAD" -> use "Lateral/Defensivo Direito"
- Se a sigla for "LE", "LAE" -> use "Lateral/Defensivo Esquerdo"
- Se a sigla for "VOL" -> use "Volante/Cão de Guarda"
- Se a sigla for "MC", "MCD", "MCE" -> use "MeioCampo/Dinâmico"
- Se a sigla for "MD", "PD" -> use "Ponta/Clássico Direito"
- Se a sigla for "ME", "PE" -> use "Ponta/Clássico Esquerdo"
- Se a sigla for "ATA", "MEI", "ATD", "ATE", "SA", "CA" -> use "Atacante/Móvel"

O nome deve ser copiado exatamente como está na tela (ex: O. Vlachodimos).
Se a idade do jogador estiver visível na tela, extraia como número em "idade". Se não estiver visível, omita o campo (não invente um valor).
Retorne APENAS um array JSON válido e puro, sem marcações markdown como \`\`\`json.
Exemplo do formato exigido:
[
  {"nome": "O. Vlachodimos", "posicao": "Goleiro", "ovr": 79, "idade": 30},
  {"nome": "Marcão", "posicao": "Defesa", "ovr": 74}
]`;

                try {
                    const data = await chamarIA({ contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } } ] }] });
                    let rawText = data.candidates[0].content.parts[0].text;

                    // Extrai o Array JSON da resposta da IA
                    let jsonMatch = rawText.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        let jogadoresExtraidos = JSON.parse(jsonMatch[0]);

                        jogadoresExtraidos.forEach(j => {
                            let nomeExtraido = j.nome.trim();
                            let posExtraida = j.posicao || "Meio-Campo";
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
                                db.clube.plantel.push(novoJog);
                            }
                        });
                    }
                } catch(e) {
                    console.error("Erro na leitura da imagem do plantel pela IA:", e);
                }
            }

            atualizarLoaderPlantel("");
            event.target.value = "";

            if (typeof wizardRenderElenco === 'function' && document.getElementById('wizard-step-elenco') && document.getElementById('wizard-step-elenco').style.display !== 'none') {
                wizardRenderElenco();
            }

            salvarDados();
            atualizarPlantelUI();
            preencherDatalistJogadores();
            alert("Leitura de Elenco concluída! O plantel foi atualizado.");
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

