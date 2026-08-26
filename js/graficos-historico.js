        // Paleta cíclica usada nos gráficos de doughnut (artilharia/assistências) — cada jogador
        // do ranking pega uma cor, repetindo o ciclo se a lista for maior que a paleta.
        const PALETA_DONUT = ['#E8B84B', '#4B9FE2', '#2ecc71', '#a855f7', '#E24B4B', '#D9822B', '#FFD700', '#22d3ee', '#f472b6', '#94a3b8'];

        // Lista ao lado do doughnut (nome + valor, com a bolinha da cor correspondente à fatia).
        function renderizarListaDonut(containerId, cData, key) {
            let el = document.getElementById(containerId);
            if (!el) return;
            if (cData.length === 0) { el.innerHTML = '<p class="wizard-elenco-vazio" style="padding:0; text-align:left;">Sem dados no período selecionado.</p>'; return; }
            el.innerHTML = cData.map((d, i) => `
                <div class="donut-legend-item">
                    <span class="donut-legend-dot" style="background:${PALETA_DONUT[i % PALETA_DONUT.length]};"></span>
                    <span class="donut-legend-nome">${d.nome}</span>
                    <strong class="donut-legend-valor">${d[key]}</strong>
                </div>`).join('');
        }

        function desenharGraficos() {
    limparGraficos(); 
    let temporadaFiltro = document.getElementById('filtro-temporada').value;
    let pFiltradas = temporadaFiltro === 'Total' ? db[currentSave].partidas : db[currentSave].partidas.filter(p => p.temporada === temporadaFiltro);

    let elUltimos = document.getElementById('filtro-ultimos-jogos');
    if (elUltimos && elUltimos.value !== 'Todas') {
        let n = parseInt(elUltimos.value);
        pFiltradas = pFiltradas.slice(-n);
    }

    atualizarKPIsEForma(pFiltradas);
    // O card fixo de "Partidas Jogadas" mostra só as últimas 3 (sem scroll interno) — o botão
    // "Ver Todas" abre o modal com a lista completa e ampliada.
    renderizarCalendarioPartidas(pFiltradas.slice(-3));
    let btnVerTodas = document.getElementById('btn-ver-todas-partidas');
    if (btnVerTodas) btnVerTodas.style.display = (db[currentSave].partidas.length > 3) ? 'block' : 'none';

    if(currentSave === 'selecao') {
        let datalistRaiox = document.getElementById('datalist-raiox');
        datalistRaiox.innerHTML = '';
        db.selecao.plantel.forEach(j => { datalistRaiox.innerHTML += `<option value="${j.nome}">${j.posicao}</option>`; });
    }

    if(pFiltradas.length === 0) {
        // limparGraficos() só destrói os canvases dos gráficos — sem isso aqui, os painéis de
        // texto ao lado (lista de artilheiros/assistentes e os números no centro do doughnut)
        // ficavam com os dados da última vez que tinham partidas (ex: trocar do Clube pra uma
        // Seleção sem nenhum jogo ainda mostrava os artilheiros do Clube).
        renderizarListaDonut('lista-artilheiros', [], 'gols');
        renderizarListaDonut('lista-assistentes', [], 'assist');
        let elArt = document.getElementById('donut-center-artilheiros');
        if (elArt) elArt.innerHTML = '<strong>0</strong><span>Gols</span>';
        let elAst = document.getElementById('donut-center-assistentes');
        if (elAst) elAst.innerHTML = '<strong>0</strong><span>Assist.</span>';
        return;
    }

    let labelsPartidas = pFiltradas.map((p, i) => `J${i+1} (${p.adversario})`);
    let advData = getAdvancedPlayerAggregates(pFiltradas); // Calcula os novos dados avançados

    // 1. Precisão de Finalização & Domínio (Linha combinada — dois eixos, já que as escalas são diferentes)
    let ctxPD = document.getElementById('graficoPrecisaoDominio');
    if(ctxPD) {
        let dataEfet = pFiltradas.map(p => p.finPro > 0 ? ((p.golsPro / p.finPro) * 100).toFixed(1) : 0);
        // Cálculo de Domínio = (Posse * Finalizações) / 10
        let dataDominio = pFiltradas.map(p => ((p.possePro * p.finPro) / 10).toFixed(1));
        charts.precisaoDominio = new Chart(ctxPD, {
            type: 'line',
            data: {
                labels: labelsPartidas,
                datasets: [
                    { label: 'Conversão em Gol (%)', data: dataEfet, borderColor: '#E8B84B', backgroundColor: 'rgba(232, 184, 75, 0.1)', fill: true, tension: 0.3, yAxisID: 'y' },
                    { label: 'Domínio Score', data: dataDominio, borderColor: '#4B9FE2', backgroundColor: 'rgba(75, 159, 226, 0.1)', fill: true, tension: 0.3, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { type: 'linear', position: 'left', beginAtZero: true, title: { display: true, text: 'Conversão (%)' } },
                    y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Domínio' } }
                }
            }
        });
    }

    // 2. Artilharia — doughnut + lista de artilheiros ao lado
    let ctxArt = document.getElementById('graficoArtilheiros');
    if(ctxArt) {
        let cData = processMultiChartData(advData, 'gols');
        charts.artilheiros = new Chart(ctxArt, {
            type: 'doughnut',
            data: { labels: cData.map(d=>d.nome), datasets: [{ data: cData.map(d=>d.gols), backgroundColor: cData.map((_,i) => PALETA_DONUT[i % PALETA_DONUT.length]), borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
        });
        let elCenter = document.getElementById('donut-center-artilheiros');
        if (elCenter) elCenter.innerHTML = `<strong>${cData.reduce((a,d) => a + d.gols, 0)}</strong><span>Gols</span>`;
        renderizarListaDonut('lista-artilheiros', cData, 'gols');
    }

    // 3. Assistências — doughnut + lista de garçons ao lado
    let ctxAst = document.getElementById('graficoAssistentes');
    if(ctxAst) {
        let cData = processMultiChartData(advData, 'assist');
        charts.assistentes = new Chart(ctxAst, {
            type: 'doughnut',
            data: { labels: cData.map(d=>d.nome), datasets: [{ data: cData.map(d=>d.assist), backgroundColor: cData.map((_,i) => PALETA_DONUT[i % PALETA_DONUT.length]), borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
        });
        let elCenter = document.getElementById('donut-center-assistentes');
        if (elCenter) elCenter.innerHTML = `<strong>${cData.reduce((a,d) => a + d.assist, 0)}</strong><span>Assist.</span>`;
        renderizarListaDonut('lista-assistentes', cData, 'assist');
    }

    // 5. Desgaste físico / notas
    let ctxCri = document.getElementById('graficoCriacao');
    if(ctxCri) {
        let notasMedias = pFiltradas.map(p => {
            if(p.jogadores.length === 0) return 0;
            let soma = p.jogadores.reduce((acc, j) => acc + j.nota, 0);
            return (soma / p.jogadores.length).toFixed(2);
        });
        charts.criacao = new Chart(ctxCri, {
            type: 'line',
            data: { labels: labelsPartidas, datasets: [{ label: 'Média de Notas do Time', data: notasMedias, borderColor: '#D9822B', tension: 0.2 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 5.5 Nota Média por Jogador (Barras, respeita o seletor Top 5/10/Todos)
    let ctxNota = document.getElementById('graficoNotaMedia');
    if(ctxNota) {
        let cData = processMultiChartData(advData, 'mediaNota');
        charts.notaMedia = new Chart(ctxNota, {
            type: 'bar',
            data: { labels: cData.map(d=>d.nome), datasets: [{ label: 'Nota Média', data: cData.map(d=>d.mediaNota), backgroundColor: '#E8B84B', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { suggestedMin: 0, suggestedMax: 10 } } }
        });
    }

    // 6. Defesa (Múltiplos Dados com Ordenação Clicável)
    let ctxDef = document.getElementById('graficoDefesa');
    if(ctxDef) {
        let cData = processMultiChartData(advData, 'posses');
        charts.defesa = new Chart(ctxDef, {
            type: 'bar',
            data: { 
                labels: cData.map(d=>d.nome), 
                datasets: [
                    { label: 'Posses Ganhas (Total)', data: cData.map(d=>d.posses), backgroundColor: '#4B9FE2' },
                    { label: 'Posses Ganhas / Jogo', data: cData.map(d=>d.possesPorJogo), backgroundColor: 'rgba(75, 159, 226, 0.4)' },
                    { label: 'Defesas Goleiro (Total)', data: cData.map(d=>d.defesas), backgroundColor: '#E24B4B' },
                    { label: 'Defesas Goleiro / Jogo', data: cData.map(d=>d.defesasPorJogo), backgroundColor: 'rgba(226, 75, 75, 0.4)' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { onClick: sortableLegendClick } } }
        });
    }

    // 7. Central de Criação (Passes - Tudo em Barra e Ordenável)
    let ctxRad = document.getElementById('graficoRadarSetor');
    if(ctxRad) {
        let cData = processMultiChartData(advData, 'passes');
        charts.radarSetor = new Chart(ctxRad, {
            type: 'bar',
            data: { 
                labels: cData.map(d=>d.nome), 
                datasets: [
                    { label: 'Passes Certos (Total)', data: cData.map(d=>d.passes), backgroundColor: '#E8B84B' },
                    { label: 'Passes Certos / Jogo', data: cData.map(d=>d.passesPorJogo), backgroundColor: 'rgba(232, 184, 75, 0.4)' },
                    { label: 'Precisão Passes %', data: cData.map(d=>d.precPasse), backgroundColor: '#D9822B' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { onClick: sortableLegendClick } } }
        });
    }

    // 8. Finalizações (Tudo em Barra e Ordenável)
    let ctxFin = document.getElementById('graficoFinalizacoes');
    if(ctxFin) {
        let cData = processMultiChartData(advData, 'fin');
        charts.finalizacoes = new Chart(ctxFin, {
            type: 'bar',
            data: { 
                labels: cData.map(d=>d.nome), 
                datasets: [
                    { label: 'Finalizações (Total)', data: cData.map(d=>d.fin), backgroundColor: '#D9822B' },
                    { label: 'Finalizações / Jogo', data: cData.map(d=>d.finPorJogo), backgroundColor: 'rgba(217, 130, 43, 0.4)' },
                    { label: 'Precisão Finalização %', data: cData.map(d=>d.precFin), backgroundColor: '#E8B84B' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { onClick: sortableLegendClick } } }
        });
    }

    // 9. Dribles (Tudo em Barra e Ordenável)
    let ctxDrib = document.getElementById('graficoDribles');
    if(ctxDrib) {
        let cData = processMultiChartData(advData, 'dribles');
        charts.dribles = new Chart(ctxDrib, {
            type: 'bar',
            data: { 
                labels: cData.map(d=>d.nome), 
                datasets: [
                    { label: 'Dribles Certos (Total)', data: cData.map(d=>d.dribles), backgroundColor: '#a855f7' },
                    { label: 'Dribles Certos / Jogo', data: cData.map(d=>d.driblesPorJogo), backgroundColor: 'rgba(168,85,247,0.4)' },
                    { label: 'Acerto Dribles %', data: cData.map(d=>d.taxaDrible), backgroundColor: '#4B9FE2' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { onClick: sortableLegendClick } } }
        });
    }

    let tabBarraAtiva = document.querySelector('#graf-tabs-barra .graf-tab.active');
    if(tabBarraAtiva && tabBarraAtiva.dataset.view === 'view-raiox') acionarRaioXDashboard();
}

        function acionarRaioXDashboard() {
            let nome = document.getElementById('select-raio-x-input').value;
            renderizarDadosRaioX(nome, 'graficoRaioXRadarDash', 'raiox-dados-dash');
        }

        function renderizarDadosRaioX(nome, canvasId, dadosDivId) {
            let canvas = document.getElementById(canvasId); let divDados = document.getElementById(dadosDivId);
            let chartInstance = Chart.getChart(canvas); if(chartInstance) chartInstance.destroy();

            if(!nome) { divDados.innerHTML = '<p>Selecione um jogador</p>'; return; }

            let pFiltradas = document.getElementById('filtro-temporada').value === 'Total' ? db[currentSave].partidas : db[currentSave].partidas.filter(p => p.temporada === document.getElementById('filtro-temporada').value);
            let totalPartidas = 0; 
            let sums = { gols:0, assist:0, fin:0, precFin:0, passes:0, precPasse:0, dribles:0, taxaDribles:0, divGanhas:0, posses:0, defesas:0, nota:0 };
            
            // Variável para armazenar as notas e calcular a média dos últimos 5 jogos
            let notasHistorico = []; 

            pFiltradas.forEach(p => {
                let atuacao = p.jogadores.find(j => j.nome === nome);
                if(atuacao) {
                    totalPartidas++;
                    sums.gols += atuacao.gols || 0; sums.assist += atuacao.assist || 0; sums.fin += atuacao.fin || 0; sums.precFin += atuacao.precFin || 0;
                    sums.passes += atuacao.passes || 0; sums.precPasse += atuacao.precPasse || 0; sums.dribles += atuacao.dribles || 0; sums.taxaDribles += atuacao.taxaDribles || 0;
                    sums.divGanhas += atuacao.dividasGanhas || 0; sums.posses += atuacao.posses || 0; sums.defesas += atuacao.defesas || 0; sums.nota += atuacao.nota || 0;
                    notasHistorico.push(atuacao.nota || 0);
                }
            });

            if(totalPartidas === 0) { divDados.innerHTML = '<p>Sem dados do jogador na temporada.</p>'; return; }
            let avg = {}; for(let k in sums) avg[k] = sums[k] / totalPartidas;

            let jogPlantel = db[currentSave].plantel.find(p => p.nome === nome);
            let oOvr = jogPlantel ? jogPlantel.ovr : 70; let oPos = jogPlantel ? jogPlantel.posicao : 'Meio-Campo';

            // Cálculo da média dos últimos 5 jogos
            let ultimas5 = notasHistorico.slice(-5);
            let media5 = ultimas5.length > 0 ? (ultimas5.reduce((a,b)=>a+b,0) / ultimas5.length).toFixed(2) : "0.00";

            // Painel de Texto de Estatísticas 
            divDados.innerHTML = `
                <h4 style="margin:0 0 15px 0; color:var(--primary); font-size:18px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                    ${nome} 
                    <span style="font-size:13px; color:var(--text-muted); float:right; margin-top:3px;">OVR: ${oOvr} | ${oPos}</span>
                </h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 12px; font-size: 14px;">
                    <div><span style="color:var(--text-muted)">Jogos:</span> <strong style="color:white">${totalPartidas}</strong></div>
                    <div><span style="color:var(--text-muted)">Gols:</span> <strong style="color:white">${sums.gols}</strong></div>
                    <div><span style="color:var(--text-muted)">Assistências:</span> <strong style="color:white">${sums.assist}</strong></div>
                    <div><span style="color:var(--text-muted)">Média Temp:</span> <strong style="color:var(--warning)">${avg.nota.toFixed(2)}</strong></div>
                    <div style="grid-column: span 2;"><span style="color:var(--text-muted)">Média (Últ. 5):</span> <strong style="color:var(--accent)">${media5}</strong></div>
                </div>`;

            // Cálculo para o Gráfico de Teia (Com PESOS para equilibrar o visual)
            let pesoPasses = 2.28;   // Mantém base 2.28
            let pesoPosses = 8;     // Multiplica posses por 8 
            let pesoFin = 32;       // Multiplica finalizações por 32 
            let pesoDribles = 2.31;  // Multiplica dribles por 2.31
            let pesoDefesas = 4.2;    // Multiplica defesas do goleiro por 4.2

            // 1. Calculamos os valores REAIS (sem peso) primeiro
            let realPasses = (avg.passes * (avg.precPasse / 100)).toFixed(1);
            let realPosses = avg.posses.toFixed(1);
            let realDefesas = avg.defesas.toFixed(1);
            let realFin = (avg.fin * (avg.precFin / 100)).toFixed(1);
            let realDribles = (avg.dribles * (avg.taxaDribles / 100)).toFixed(1);

            // 2. Calculamos os valores MULTIPLICADOS para o visual da linha do gráfico
            let passesCertosJogo = (realPasses * pesoPasses).toFixed(1);
            let possesGanhaJogo = (realPosses * pesoPosses).toFixed(1);
            
            let radarLabels = [];
            let radarData = [];
            let radarRealData = []; // Criamos essa nova lista para guardar os valores reais

            // Separação entre Goleiro e Linha
            if (String(oPos).split('/')[0] === 'Goleiro') {
                let defesasJogo = (realDefesas * pesoDefesas).toFixed(1);
                
                // Removidos os textos (x1), (x7), etc.
                radarLabels = ['Passes', 'Posses Ganhas', 'Defesas GL'];
                radarData = [passesCertosJogo, possesGanhaJogo, defesasJogo];
                radarRealData = [realPasses, realPosses, realDefesas]; // Salvamos os reais aqui
            } else {
                let finCertasJogo = (realFin * pesoFin).toFixed(1);
                let driblesCertosJogo = (realDribles * pesoDribles).toFixed(1);
                
                // Removidos os textos (x15), (x7), etc.
                radarLabels = ['Fin. Certas', 'Passes', 'Posses Ganhas', 'Dribles'];
                radarData = [finCertasJogo, passesCertosJogo, possesGanhaJogo, driblesCertosJogo];
                radarRealData = [realFin, realPasses, realPosses, realDribles]; // Salvamos os reais aqui
            }

            // Renderiza o novo Gráfico de Teia
            new Chart(canvas, {
                type: 'radar',
                data: {
                    labels: radarLabels,
                    datasets: [{ 
                        label: 'Ações Bem Sucedidas (Média/Jogo)', 
                        data: radarData, 
                        realData: radarRealData, // Injetamos a lista de dados reais aqui (o gráfico não desenha isso, mas guarda)
                        backgroundColor: 'rgba(75, 159, 226, 0.2)', 
                        borderColor: '#4B9FE2', 
                        pointBackgroundColor: '#4B9FE2' 
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                // Esta função intercepta a caixa preta do mouse e troca o texto
                                label: function(context) {
                                    // Pega o valor real correspondente a este ponto em vez do multiplicado
                                    let valorReal = context.dataset.realData[context.dataIndex];
                                    return ' ' + context.label + ': ' + valorReal;
                                }
                            }
                        }
                    },
                    scales: { 
                        r: { 
                            pointLabels: { color: '#F1EDE4', font: { size: 12, weight: 'bold' } }, 
                            ticks: { display: false, min: 0 } 
                        } 
                    } 
                }
            });
        }

        function atualizarFiltroTemporadas() {
            let sel = document.getElementById('filtro-temporada'); 
            sel.innerHTML = '<option value="Total">Histórico Completo (Total)</option>';
            let setT = new Set(); db[currentSave].partidas.forEach(p => setT.add(p.temporada)); setT.add(db[currentSave].temporadaAtual);
            Array.from(setT).forEach(t => sel.innerHTML += `<option value="${t}" ${t === db[currentSave].temporadaAtual ? 'selected' : ''}>Temporada ${t}</option>`);

            let selHist = document.getElementById('seletor-hist-temporada');
            selHist.innerHTML = '<option value="">Selecione uma temporada...</option>';
            db[currentSave].historicoTemporadas.forEach(h => { selHist.innerHTML += `<option value="${h.temporada}">Temporada ${h.temporada}</option>`; });
        }

        function renderizarHistorico() {
            let galeria = document.getElementById('lista-trofeus-geral'); galeria.innerHTML = ''; let temTrofeu = false;
            db[currentSave].historicoTemporadas.forEach(h => {
                if(h.trofeus && h.trofeus.length > 0) {
                    h.trofeus.forEach(t => {
                        temTrofeu = true;
                        galeria.innerHTML += `<div class="trofeu-item"><div class="trofeu-icon">🏆</div><div style="font-weight:bold; color:var(--primary); font-size: 16px;">${t}</div><div style="font-size:13px; color:var(--text-muted); margin-top:8px;">${h.temporada}</div></div>`;
                    });
                }
            });
            if(!temTrofeu) galeria.innerHTML = '<p style="color:var(--text-muted); width:100%; margin:0;">Nenhum troféu conquistado na galeria ainda.</p>';
        }

        function mostrarDetalhesTemporada(tempStr) {
            let div = document.getElementById('detalhes-temporada-selecionada');
            if(!tempStr) return;
            let hist = db[currentSave].historicoTemporadas.find(h => h.temporada === tempStr);
            if(!hist) return;
            
            let htmlDet = `<h3 style="margin-top:0; font-size: 22px;">Resumo da Temporada ${hist.temporada}</h3><ul style="font-size: 15px; line-height:1.6;">`;
            if(hist.detalhes && hist.detalhes.length > 0) {
                hist.detalhes.forEach(d => { htmlDet += `<li><strong>${d.competicao}:</strong> <span style="color: var(--primary);">${d.fase_final}</span></li>`; });
            }
            htmlDet += `</ul>`; div.innerHTML = htmlDet;
        }

        function adicionarNoticiaAutomatica(texto, detalhe = "Detalhes internos.") {
            let feed = db[currentSave].noticiasFeed || [];
            feed.unshift({ texto: texto, detalhe: detalhe });
            if(feed.length > 30) feed.pop();
            db[currentSave].noticiasFeed = feed; salvarDados();
        }

        function toggleDetalheNoticia(index) {
            let el = document.getElementById(`noticia-detalhe-${index}`); let seta = document.getElementById(`noticia-seta-${index}`);
            if (el.style.display === 'none') { el.style.display = 'block'; seta.innerText = '▲ Ocultar Leitura'; } 
            else { el.style.display = 'none'; seta.innerText = '▼ Ler Mais'; }
        }

        function renderizarNoticiasFeed() {
            let log = document.getElementById('chat-log-noticias');
            let feed = db[currentSave].noticiasFeed || [];
            if(feed.length === 0) { log.innerHTML = '<p>Nenhuma notícia registrada.</p>'; return; }
            log.innerHTML = feed.map((n, idx) => `
                <div class="noticia-box" style="position: relative;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <p style="margin:0; font-size:18px; color:white; font-weight:bold; cursor:pointer; flex:1;" onclick="toggleDetalheNoticia(${idx})">${n.texto}</p>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span id="noticia-seta-${idx}" style="color:var(--primary); font-size:14px; font-weight:bold; cursor:pointer;" onclick="toggleDetalheNoticia(${idx})">▼ Ler Mais</span>
                            <button onclick="apagarNoticia(${idx})" style="background: var(--danger); color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;" title="Apagar Notícia">🗑️</button>
                        </div>
                    </div>
                    <div id="noticia-detalhe-${idx}" style="display:none; margin-top:15px; padding-top:15px; border-top:1px solid var(--border); font-size:15px; color:#cbd5e1; line-height:1.7;">
                        ${formatarNoticia(n.detalhe)}
                    </div>
                </div>
            `).join('');
        }

