        function atualizarOrcamentoMercado() {
            checarEmbargoMercado();
        }

        function atualizarPlantelUI() {
            if(currentSave !== 'clube') return;
            if (typeof garantirCamposElencoTodos === 'function') garantirCamposElencoTodos();
            atualizarOrcamentoMercado();
            let lista = document.getElementById('tabela-plantel'); lista.innerHTML = '';

            let plantelSort = [...db.clube.plantel];
            plantelSort.sort((a, b) => {
                let valA = a[ordemAtualPlantel.coluna]; let valB = b[ordemAtualPlantel.coluna];
                if (ordemAtualPlantel.coluna === 'posicao') { valA = ordemPosicoes[a.posicao] || 6; valB = ordemPosicoes[b.posicao] || 6; }
                if (valA < valB) return ordemAtualPlantel.ascendente ? -1 : 1;
                if (valA > valB) return ordemAtualPlantel.ascendente ? 1 : -1;
                return 0;
            });

            let ativos = plantelSort.filter(p => p.status === 'Ativo');
            if (ativos.length === 0) {
                lista.innerHTML = `<div style="text-align:center; padding:25px; color:var(--text-muted);">Nenhum jogador cadastrado ainda.</div>`;
                atualizarSelectCondicaoAuxiliar();
                if (typeof renderizarLiderancaUI === 'function') renderizarLiderancaUI();
                return;
            }

            ativos.forEach((p, idx) => {
                let isListado = db.clube.exigenciasDiretoria.includes(p.nome) ? `<span class="badge bg-vendido">⚠️ Listado Pela Diretoria</span>` : '';

                // Braçadeira e moral vêm da Central de Mensagens (capitão/vice e eventos do elenco)
                let badgeLideranca = '';
                if (db.clube.capitao === p.nome) badgeLideranca = `<span class="badge" style="background: rgba(255,215,0,0.18); color: var(--gold);">🎖️ Capitão</span>`;
                else if (db.clube.viceCapitao === p.nome) badgeLideranca = `<span class="badge" style="background: rgba(232,184,75,0.14); color: var(--primary);">🅥 Vice-capitão</span>`;

                let badgeMoral = '';
                if (typeof p.moral === 'number') {
                    if (p.moral < 40) badgeMoral = `<span class="badge" style="background: rgba(226,75,75,0.15); color: var(--danger);">😠 Moral ${Math.round(p.moral)}</span>`;
                    else if (p.moral < 55) badgeMoral = `<span class="badge" style="background: rgba(217,130,43,0.15); color: var(--warning);">😕 Moral ${Math.round(p.moral)}</span>`;
                    else if (p.moral >= 85) badgeMoral = `<span class="badge" style="background: rgba(75,159,226,0.15); color: var(--accent);">😄 Moral ${Math.round(p.moral)}</span>`;
                }
                if (p.poupadoRestante > 0) badgeMoral += ` <span class="badge" style="background: rgba(75,159,226,0.18); color: var(--accent);">💤 Poupado (${p.poupadoRestante})</span>`;
                if (p.pediuSaida) badgeMoral += ` <span class="badge" style="background: rgba(226,75,75,0.15); color: var(--danger);">🚪 Pediu para sair</span>`;

                // --- NOVAS BADGES DE LESÃO E CARTÃO VERMELHO ---
                let badgeCondicao = '';
                if (p.diasLesao && p.diasLesao > 0) {
                    badgeCondicao += `<span class="badge" style="background: rgba(255, 107, 107, 0.2); color: var(--danger);">🏥 Lesionado (${p.diasLesao} dias)</span>`;
                }
                if (p.suspensoVermelho) {
                    badgeCondicao += `<span class="badge" style="background: rgba(255, 184, 0, 0.2); color: var(--warning);">🟥 Suspenso</span>`;
                }
                // --- BADGE DE FÔLEGO BAIXO / RISCO DE LESÃO (Departamento Médico) ---
                if (!badgeCondicao && typeof condicaoJogador === 'function') {
                    let condFisica = condicaoJogador(p);
                    if (condFisica.nivel === 'critico') {
                        badgeCondicao += `<span class="badge" style="background: rgba(226, 75, 75, 0.2); color: var(--danger);">🚨 Risco Crítico (${p.jogosSeguidos || 0}j)</span>`;
                    } else if (condFisica.nivel === 'risco') {
                        badgeCondicao += `<span class="badge" style="background: rgba(226, 75, 75, 0.15); color: var(--danger);">⚠️ Risco de Lesão (${p.jogosSeguidos || 0}j)</span>`;
                    } else if (condFisica.nivel === 'alerta') {
                        // Fôlego = 100 - fadiga, calculado direto de p.fadiga (não de p.stamina,
                        // que só é resincronizado dentro de processarCondicaoFisicaPosPartida).
                        badgeCondicao += `<span class="badge" style="background: rgba(217, 130, 43, 0.15); color: var(--warning);">🟡 Fôlego Baixo (${Math.round(100 - (Number(p.fadiga) || 0))}%)</span>`;
                    }
                }

                let optionsSelect = `<option>Mover...</option>`;
                if (p.origem === 'EmprestadoIn') {
                    optionsSelect += `<option value="EncerrarEmprestimo">Encerrar Empréstimo</option>`;
                } else {
                    optionsSelect += `<option value="Aposentado">Aposentar</option>`;
                }
                optionsSelect += `<option value="Excluir">Excluir (Erro)</option>`;

                // Reaproveita o mesmo card compacto da aba Transferências (.transfer-card) — pedido
                // do treinador: a tabela genérica "rótulo: valor" do Elenco também ficava feia e
                // gigante, principalmente no celular, igual o que já tinha sido resolvido lá.
                let card = document.createElement('div');
                card.className = 'transfer-card';
                card.id = `linha-jogador-${idx}`;
                card.innerHTML = `
                    <div class="transfer-card-ovr" style="${getOvrClass(p.ovr)}">${p.ovr}</div>
                    <div class="transfer-card-main">
                        <div class="transfer-card-nome-linha">
                            <span class="transfer-card-nome">${p.nome}</span>${badgeLideranca}${isListado}${badgeCondicao}${badgeMoral}
                        </div>
                        <div class="transfer-card-meta"><span>${p.posicao}</span><span>${p.idade ? p.idade + ' anos' : 'idade -'}</span></div>
                    </div>
                    <div class="transfer-card-acoes">
                        <button class="transfer-card-acao-btn" onclick="toggleRaioXPlantel('${p.nome.replace(/'/g, "\\'")}', ${idx})">📊 Raio-X</button>
                        <button class="transfer-card-acao-btn" onclick="abrirModalEditarJogador('${p.nome.replace(/'/g, "\\'")}')">✏️ Editar</button>
                        <select onchange="alterarStatus('${p.nome.replace(/'/g, "\\'")}', this.value)" style="padding:5px 8px; font-size:11px; font-weight:bold; border-radius:8px; background:transparent; border:1px solid var(--border); color:var(--text-muted);">
                            ${optionsSelect}
                        </select>
                    </div>
                    <div id="raiox-row-${idx}" class="transfer-card-expand" style="display:none;">
                        <div class="raiox-container">
                            <div id="raiox-dados-plantel-${idx}" style="background: var(--panel-bg); padding: 15px; border-radius: 8px; border: 1px solid var(--border); font-size: 13px;"></div>
                            <div style="height: 350px;"><canvas id="canvas-raiox-plantel-${idx}"></canvas></div>
                        </div>
                    </div>`;
                lista.appendChild(card);
            });
            atualizarSelectCondicaoAuxiliar();
            if (typeof renderizarLiderancaUI === 'function') renderizarLiderancaUI();
        }

        function toggleRaioXPlantel(nome, idx) {
            let painel = document.getElementById(`raiox-row-${idx}`);
            // O Elenco agora é uma grade de "quadrados" (3 por linha, ver #tabela-plantel em
            // styles.css) — um cartão expandido pro Raio-X precisa ocupar a linha inteira sozinho,
            // senão o gráfico fica espremido e os outros 2 cartões da mesma linha esticam vazios
            // até a altura dele. Só pode ter 1 expandido por vez (a linha abaixo já fecha os
            // outros), então isso nunca deixa 2 cartões "linha inteira" ao mesmo tempo.
            document.querySelectorAll('#tabela-plantel .transfer-card.expandido').forEach(el => el.classList.remove('expandido'));
            if (painel.style.display === 'none') {
                document.querySelectorAll('#tabela-plantel .transfer-card-expand').forEach(el => el.style.display = 'none');
                painel.style.display = 'block';
                let card = painel.closest('.transfer-card');
                if (card) card.classList.add('expandido');
                renderizarDadosRaioX(nome, `canvas-raiox-plantel-${idx}`, `raiox-dados-plantel-${idx}`);
            } else {
                painel.style.display = 'none';
            }
        }

        let ordemAtualMercado = { coluna: 'nome', ascendente: true };

   function ordenarTransferencias(coluna) {
       if (ordemAtualMercado.coluna === coluna) {
           ordemAtualMercado.ascendente = !ordemAtualMercado.ascendente;
       } else {
           ordemAtualMercado.coluna = coluna;
           ordemAtualMercado.ascendente = coluna === 'nome' ? true : false;
       }
       filtrarMercado(statusFiltroMercado);
   }

   function filtrarMercado(status, btn) {
       if(currentSave !== 'clube') return;
       statusFiltroMercado = status;
       if(btn) { document.querySelectorAll('#tab-mercado .btn-filtro').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }

       let lista = document.getElementById('tabela-mercado');
       lista.innerHTML = '';

       let mostrarColunaValor = (status === 'Vendido' || status === 'Comprado');
       let btnOrdenarValor = document.getElementById('btn-ordenar-valor-mercado');
       if (btnOrdenarValor) btnOrdenarValor.style.display = mostrarColunaValor ? 'inline-flex' : 'none';

       let jogadoresFiltrados = db.clube.plantel.filter(p => {
           if (status === 'Comprado' || status === 'EmprestadoIn') return p.origem === status;
           return p.status === status;
       });

       jogadoresFiltrados.sort((a, b) => {
           let valA = a[ordemAtualMercado.coluna];
           let valB = b[ordemAtualMercado.coluna];
           if (ordemAtualMercado.coluna === 'posicao') { valA = ordemPosicoes[a.posicao] || 6; valB = ordemPosicoes[b.posicao] || 6; }
           if (ordemAtualMercado.coluna === 'valor') { valA = a.valor || 0; valB = b.valor || 0; }
           if (valA < valB) return ordemAtualMercado.ascendente ? -1 : 1;
           if (valA > valB) return ordemAtualMercado.ascendente ? 1 : -1;
           return 0;
       });

       if (jogadoresFiltrados.length === 0) {
           lista.innerHTML = `<div style="text-align:center; padding: 25px; color:var(--text-muted);">Nenhum jogador.</div>`;
           return;
       }

       jogadoresFiltrados.forEach((p, idx) => {
           let extraInfo = status === 'Emprestado' ? `<span>Retorna em: ${p.temporadasEmprestimo} temp.</span>` : '';
           let badgeClass = 'bg-aposentado', corClass = 'tc-aposentado';
           if (status === 'Vendido') { badgeClass = 'bg-vendido'; corClass = 'tc-vendido'; }
           if (status === 'Emprestado') { badgeClass = 'bg-emprestado'; corClass = 'tc-emprestado'; }
           if (status === 'Comprado' || status === 'EmprestadoIn') { badgeClass = 'bg-ativo'; corClass = 'tc-ativo'; }

           let nomeStatus = p.status;
           if (status === 'Comprado') nomeStatus = 'Comprado';
           if (status === 'EmprestadoIn') nomeStatus = 'Chegou Emp.';
           // "Aposentado" é usado internamente pra qualquer saída sem venda/empréstimo, mas o
           // motivo real pode ser bem diferente (o treinador reclamou que rescisão de contrato
           // aparecia igual a aposentadoria de verdade) — motivoSaida guarda a distinção.
           if (status === 'Aposentado') nomeStatus = p.motivoSaida === 'Dispensa' ? 'Dispensado' : 'Aposentado';

           let pillValor = mostrarColunaValor ? `<div class="transfer-card-valor">€${(p.valor || 0).toFixed(1)}M</div>` : '';

            // NOVO: Botões extras para o mercado (Editar Valor e Excluir)
            let btnEdit = mostrarColunaValor ? `<button class="transfer-card-acao-btn" onclick="editarValorTransferencia('${p.nome.replace(/'/g, "\\'")}')">✏️ Editar Valor</button>` : '';
            let btnExc = `<button class="transfer-card-acao-btn tca-perigo" onclick="excluirJogadorTransferencia('${p.nome.replace(/'/g, "\\'")}')">🗑️ Excluir</button>`;

            // NOVO: Botão de Chamar de Volta para quem está Emprestado fora
            let btnChamarVolta = (status === 'Emprestado') ? `<button class="transfer-card-acao-btn" onclick="alterarStatus('${p.nome.replace(/'/g, "\\'")}', 'ChamarDeVolta')">🔙 Chamar de Volta</button>` : '';

            let card = document.createElement('div');
            card.className = `transfer-card ${corClass}`;
            card.innerHTML = `
                <div class="transfer-card-ovr" style="${getOvrClass(p.ovr)}">${p.ovr}</div>
                <div class="transfer-card-main">
                    <div class="transfer-card-nome-linha">
                        <span class="transfer-card-nome">${p.nome}</span>
                        <span class="badge ${badgeClass}">${nomeStatus}</span>
                    </div>
                    <div class="transfer-card-meta"><span>${p.posicao}</span><span>${p.idade ? p.idade + ' anos' : 'idade -'}</span>${extraInfo}</div>
                </div>
                ${pillValor}
                <div class="transfer-card-acoes">
                    <button class="transfer-card-acao-btn" onclick="toggleRaioXMercado('${p.nome.replace(/'/g, "\\'")}', ${idx})">📊 Raio-X</button>
                    ${btnEdit}
                    ${btnChamarVolta}
                    ${btnExc}
                </div>
                <div id="raiox-mercado-row-${idx}" class="transfer-card-expand" style="display:none;">
                    <div class="raiox-container"><div id="raiox-dados-mercado-${idx}"></div><div style="height: 350px;"><canvas id="canvas-raiox-mercado-${idx}"></canvas></div></div>
                </div>`;
            lista.appendChild(card);
       });
   }

        function toggleRaioXMercado(nome, idx) {
            let painel = document.getElementById(`raiox-mercado-row-${idx}`);
            if (painel.style.display === 'none') { document.querySelectorAll('#tabela-mercado .transfer-card-expand').forEach(el => el.style.display = 'none'); painel.style.display = 'block'; renderizarDadosRaioX(nome, `canvas-raiox-mercado-${idx}`, `raiox-dados-mercado-${idx}`); }
            else { painel.style.display = 'none'; }
        }

        function toggleSection(id) { let el = document.getElementById(id); el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
        function abrirModalTrocaLiga() { document.getElementById('nova-liga-select').innerHTML = document.getElementById('setup-liga').innerHTML; document.getElementById('nova-liga-select').value = db[currentSave].liga; document.getElementById('modal-troca-liga').style.display = 'flex'; }
        function confirmarTrocaLiga() { db[currentSave].liga = document.getElementById('nova-liga-select').value; salvarDados(); document.getElementById('modal-troca-liga').style.display = 'none'; atualizarUpgradesUI(); }

        // Pedido do treinador: "caso o jogador não queira alterar o OVR de cada jogador no
        // Upgrade, ele pode ir deixando acumulando, e a cada variação, ou soma ou subtrai aos
        // pontos que devem ser acrescentados ou retirados, e ao final da temporada ou qualquer
        // momento ele faça as alterações". Antes, toda vez que uma janela de 5 jogos cruzava um
        // limite, a avaliação TRAVAVA esperando um clique em "+1 OVR"/"-1 OVR" — enquanto o
        // treinador não clicava, jogosAvaliacao não avançava e a mesmíssima janela de 5 jogos
        // ficava reavaliada pra sempre, travando o resto da temporada daquele jogador. Agora a
        // avaliação nunca trava: cada janela de 5 jogos sempre gera o veredito e sempre avança
        // (igual ao "Mantido" já fazia), só que a variação vira um saldo acumulado em
        // jogador.ovrPendente em vez de um botão bloqueante — o treinador aplica quando quiser.
        function atualizarUpgradesUI() {
            let tbodyAcao = document.querySelector('#tabela-upgrades-acao tbody'); tbodyAcao.innerHTML = '';
            let tbodyProg = document.querySelector('#tabela-upgrades-progresso tbody'); tbodyProg.innerHTML = '';

            let ligaStr = db[currentSave].liga; document.getElementById('info-liga-atual').innerText = ligaStr;
            let ligaInfo = Number(ligaStr.match(/\d+/g)?.pop() || 70);

            let ativos = db[currentSave].plantel.filter(p => p.status === 'Ativo');

            // Passo 1: processa TODAS as janelas de 5 jogos já disponíveis, de uma vez, sem
            // esperar clique nenhum — acumula em ovrPendente e sempre avança jogosAvaliacao.
            ativos.forEach(jogador => {
                if (jogador.ovrPendente === undefined) jogador.ovrPendente = 0;
                let pJogadas = []; db[currentSave].partidas.forEach(p => { let at = p.jogadores.find(j => j.nome === jogador.nome); if(at) pJogadas.push(at); });

                while (pJogadas.length - (jogador.jogosAvaliacao || 0) >= 5) {
                    let ultimos = pJogadas.slice((jogador.jogosAvaliacao || 0), (jogador.jogosAvaliacao || 0) + 5);
                    let media = ultimos.reduce((a,c) => a + c.nota, 0) / 5;
                    let diff = jogador.ovr - ligaInfo;
                    let upLimit, downLimit;
                    if (diff >= 6) { upLimit = 7.5; downLimit = 6.4; }
                    else if (diff >= 1) { upLimit = 7.0; downLimit = 6.1; }
                    else if (diff >= -4) { upLimit = 6.7; downLimit = 5.8; }
                    else if (diff >= -9) { upLimit = 6.4; downLimit = 5.5; }
                    else { upLimit = 6.1; downLimit = 5.0; }

                    if (media >= upLimit) jogador.ovrPendente += 1;
                    else if (media <= downLimit) jogador.ovrPendente -= 1;
                    jogador.jogosAvaliacao = (jogador.jogosAvaliacao || 0) + 5;
                }
            });
            salvarDados();

            // Passo 2: renderiza — quem tem saldo acumulado aparece em "Ajustes Acumulados" com
            // botão pra aplicar quando o treinador quiser; todo mundo aparece em "Progresso" com
            // o contador pra próxima janela de 5 jogos.
            let acumuladosCount = 0, progressoCount = 0;
            ativos.forEach(jogador => {
                let pJogadas = []; db[currentSave].partidas.forEach(p => { let at = p.jogadores.find(j => j.nome === jogador.nome); if(at) pJogadas.push(at); });
                let nAvaliados = pJogadas.length - (jogador.jogosAvaliacao || 0);

                if (jogador.ovrPendente) {
                    let final = Math.max(40, Math.min(99, jogador.ovr + jogador.ovrPendente));
                    let cor = jogador.ovrPendente > 0 ? 'var(--primary)' : 'var(--danger)';
                    let sinal = jogador.ovrPendente > 0 ? '+' : '';
                    let btn = `<button style="padding:6px 10px; font-size:12px;" onclick="aplicarUpgradePendente('${jogador.nome.replace(/'/g, "\\'")}')">✅ Aplicar</button>`;
                    tbodyAcao.innerHTML += `<tr><td data-label="Posição">${jogador.posicao}</td><td class="tc-titulo"><strong>${jogador.nome}</strong></td><td data-label="OVR Atual"><strong style="${getOvrClass(jogador.ovr)}">${jogador.ovr}</strong></td><td data-label="Acumulado"><strong style="color:${cor};">${sinal}${jogador.ovrPendente}</strong></td><td data-label="OVR se Aplicar"><strong style="${getOvrClass(final)}">${final}</strong></td><td class="tc-acoes">${btn}</td></tr>`;
                    acumuladosCount++;
                }

                tbodyProg.innerHTML += `<tr><td data-label="Posição">${jogador.posicao}</td><td class="tc-titulo">${jogador.nome}</td><td data-label="Progresso" style="color:var(--text-muted)">${nAvaliados} / 5 jg</td><td data-label="OVR Atual"><strong style="${getOvrClass(jogador.ovr)}">${jogador.ovr}</strong></td></tr>`;
                progressoCount++;
            });
            if(acumuladosCount === 0) tbodyAcao.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:25px;">Nenhum ajuste acumulado aguardando aplicação.</td></tr>`;
            if(progressoCount === 0) tbodyProg.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:25px;">Nenhum jogador em progresso.</td></tr>`;

            let btnTodos = document.getElementById('btn-aplicar-todos-upgrades');
            if (btnTodos) btnTodos.style.display = acumuladosCount > 0 ? 'inline-block' : 'none';
        }

        function aplicarUpgradePendente(nome) {
            let j = db[currentSave].plantel.find(p => p.nome === nome);
            if (j && j.ovrPendente) {
                let delta = j.ovrPendente;
                j.ovr = Math.max(40, Math.min(99, j.ovr + delta));
                j.ovrPendente = 0;
                if (typeof garantirCamposElenco === 'function') garantirCamposElenco(j);
                if (typeof ajustarMoral === 'function' && delta > 0) ajustarMoral(j, 5); // evoluir anima o atleta
                salvarDados(); atualizarUpgradesUI(); atualizarPlantelUI();
                if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Upgrade de OVR aplicado: ${nome} (${delta > 0 ? '+' : ''}${delta})`);
            }
        }

        function aplicarTodosUpgradesPendentes() {
            let aplicados = [];
            db[currentSave].plantel.filter(p => p.status === 'Ativo' && p.ovrPendente).forEach(j => {
                let delta = j.ovrPendente;
                j.ovr = Math.max(40, Math.min(99, j.ovr + delta));
                j.ovrPendente = 0;
                if (typeof garantirCamposElenco === 'function') garantirCamposElenco(j);
                if (typeof ajustarMoral === 'function' && delta > 0) ajustarMoral(j, 5);
                aplicados.push(j.nome);
            });
            if (aplicados.length === 0) return;
            salvarDados(); atualizarUpgradesUI(); atualizarPlantelUI();
            if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Aplicou todos os ajustes de OVR pendentes (${aplicados.length} jogador(es))`);
        }

        Chart.defaults.color = '#93A39A'; Chart.defaults.borderColor = 'rgba(42, 59, 52, 0.6)';
        Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.tooltip.backgroundColor = '#182420';
        Chart.defaults.plugins.tooltip.borderColor = '#2A3B34';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.titleFont = { family: "'Oswald', sans-serif", weight: '600' };
        Chart.defaults.elements.bar.borderRadius = 4;
        Chart.defaults.elements.bar.borderSkipped = false;
        Chart.defaults.elements.line.borderWidth = 2.5;
        Chart.defaults.elements.point.radius = 3;
        function limparGraficos() { ['precisaoDominio', 'artilheiros', 'assistentes', 'criacao', 'notaMedia', 'defesa', 'radarSetor', 'finalizacoes', 'dribles'].forEach(k => { if(charts[k]) { charts[k].destroy(); charts[k] = null; } }); }

        // O Dashboard tem dois grupos de abas independentes (o card de gráficos de linha e o card de
        // gráficos de barra) — tabsId/contentId escopam a troca só dentro do grupo clicado, pra um não
        // interferir no estado do outro.
        function mudarGrafico(viewId, tabsId, contentId) {
            let tabsContainer = document.getElementById(tabsId);
            let contentContainer = document.getElementById(contentId);
            if (!tabsContainer || !contentContainer) return;
            contentContainer.querySelectorAll('.chart-container').forEach(el => el.classList.remove('active'));
            let alvo = document.getElementById(viewId);
            if (alvo) alvo.classList.add('active');
            tabsContainer.querySelectorAll('.graf-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
            if (viewId === 'view-raiox') acionarRaioXDashboard();
        }

        // containerId/idPrefix permitem renderizar essa mesma lista em outro lugar (ex: o modal
        // "Ver Todas as Partidas") sem colidir com os ids/onclick da lista principal do Dashboard.
        function renderizarCalendarioPartidas(pFiltradas, containerId, idPrefix) {
    containerId = containerId || 'lista-calendario';
    idPrefix = idPrefix || 'match';
    let div = document.getElementById(containerId);
    if (!div) return;
    if(!pFiltradas || pFiltradas.length === 0) { div.innerHTML = '<p style="text-align:center;">Nenhuma partida.</p>'; return; }

    let partidasSort = [...pFiltradas].sort((a,b) => b.id - a.id);
    div.innerHTML = partidasSort.map((p, idx) => {
        let vitoria = p.golsPro > p.golsContra || (p.golsPro === p.golsContra && p.penaltis);
        let empate = p.golsPro === p.golsContra && !p.penaltis;
        let txtColor = vitoria ? 'var(--primary)' : (empate ? 'var(--warning)' : 'var(--danger)');
        let mandoTxt = { Casa: '🏠 Casa', Fora: '✈️ Fora', Neutro: '🌐 Neutro' }[p.mando] || '';
        let mandoBadge = mandoTxt ? `<span class="match-mando-badge">${mandoTxt}</span>` : '';

        let tabelaJogadores = `
        <div style="overflow-x:auto;">
            <table style="width:100%; font-size:12px; margin-top:15px; background: rgba(0,0,0,0.2); border-radius:8px;">
                <thead><tr><th>Jogador</th><th>Nota</th><th>Gols</th><th>Ast</th><th>Fin</th><th>Passes</th><th>Posse G.</th><th>Defesas</th></tr></thead>
                <tbody>
                    ${p.jogadores.map(j => `<tr>
                        <td><strong>${j.nome}</strong> ${j.mvp ? '⭐' : ''}</td>
                        <td style="color:var(--warning); font-weight:bold;">${j.nota.toFixed(1)}</td>
                        <td>${j.gols}</td><td>${j.assist}</td><td>${j.fin}</td><td>${j.passes}</td><td>${j.posses}</td><td>${j.defesas}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;

        return `
        <div class="match-card" style="border-left: 5px solid ${txtColor};">
            <div class="match-card-header" onclick="toggleMatchDetails('${idPrefix}', ${idx})">
                <div style="display: flex; align-items: center; gap: 15px; flex: 1; min-width: 200px;">
                    <span style="font-size: 24px;">${vitoria ? '✅' : (empate ? '➖' : '❌')}</span>
                    <div>
                        <strong style="font-size: 18px; color: white;">vs ${p.adversario}</strong>
                        <div style="font-size: 13px; color: var(--text-muted); margin-top: 5px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span>${p.comp}</span>${mandoBadge}
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="font-size: 24px; font-weight: bold; color: ${txtColor};">${p.golsPro} x ${p.golsContra}</div>
                    <button onclick="event.stopPropagation(); excluirPartida(${p.id})" class="match-delete-btn" title="Excluir Partida">🗑️</button>
                    <span class="match-chevron">▾</span>
                </div>
            </div>
            <div class="match-details" id="${idPrefix}-details-${idx}">
                <div class="match-details-inner">
                    <div class="grid-2" style="margin-bottom: 10px;">
                        <div class="stat-card"><span>Posse de Bola</span><strong>Nós ${p.possePro}% x ${p.posseAdv}% Adv</strong></div>
                        <div class="stat-card"><span>Finalizações Totais</span><strong>Nós ${p.finPro} x ${p.finAdv} Adv</strong></div>
                    </div>
                    <!-- Ficha da partida: escalação, substituições com minuto e tática aplicada.
                         Gravada no registro quando a partida é salva (ver salvarPartida). -->
                    ${(typeof gerarHtmlFichaPartida === 'function') ? gerarHtmlFichaPartida(p) : ''}
                    <button class="btn-stats-toggle" onclick="toggleFullStats('${idPrefix}', ${idx})">📊 Ver Estatísticas Completas dos Jogadores <span id="${idPrefix}-stats-chevron-${idx}">▾</span></button>
                    <div class="match-full-stats" id="${idPrefix}-full-stats-${idx}">
                        <h4 style="margin:20px 0 5px 0; color:var(--accent);">Estatísticas Individuais</h4>
                        ${tabelaJogadores}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

        async function excluirPartida(idPartida) {
            if (await confirmarModerno("Tem certeza que deseja excluir esta partida do histórico?", "Excluir Partida", { perigo: true, textoConfirmar: "Excluir" })) {
                db[currentSave].partidas = db[currentSave].partidas.filter(p => p.id !== idPartida);
                salvarDados();
                desenharGraficos();
            }
        }

        // Função Auxiliar para Processar Dados dos Jogadores nos Gráficos de Barras
        function getPlayerAggregates(pFiltradas, statKey) {
            let map = {};
            pFiltradas.forEach(p => {
                p.jogadores.forEach(j => {
                    map[j.nome] = (map[j.nome] || 0) + (j[statKey] || 0);
                });
            });
            return map;
        }

        function toggleMatchDetails(idPrefix, idx) {
    let el = document.getElementById(idPrefix + '-details-' + idx);
    let card = el && el.closest('.match-card');
    if (card) card.classList.toggle('open');
}

// Tabela completa por jogador só é revelada sob demanda — mantém o card compacto/dinâmico
// por padrão em vez de despejar a tabela inteira assim que a partida é expandida.
function toggleFullStats(idPrefix, idx) {
    let el = document.getElementById(idPrefix + '-full-stats-' + idx);
    let chevron = document.getElementById(idPrefix + '-stats-chevron-' + idx);
    if (!el) return;
    let aberto = el.classList.toggle('open');
    if (chevron) chevron.innerText = aberto ? '▴' : '▾';
}

// Modal "Ver Todas as Partidas": reaproveita o mesmo card de partida, mas sem o limite de altura
// da lista fixa do Dashboard — mostra TODAS as partidas (ignora o filtro de "últimos jogos").
function abrirTodasPartidas() {
    let partidas = db[currentSave].partidas || [];
    renderizarCalendarioPartidas(partidas, 'lista-calendario-completa', 'modalpartida');
    document.getElementById('modal-todas-partidas').style.display = 'flex';
}

// Os gráficos de barra ficam visíveis (compactos) direto no Dashboard. "Ampliar" move o MESMO
// bloco (tabs + canvases) pra dentro do modal — sem duplicar canvases nem recriar os charts — e
// "Fechar" devolve ele pro lugar de origem. Só precisa mandar cada Chart.js recalcular o tamanho
// (chart.resize()) porque o container mudou de dimensão.
function abrirGraficosBarraModal() {
    document.getElementById('modal-graficos-barra-slot').appendChild(document.getElementById('graficos-barra-conteudo'));
    document.getElementById('painel-graficos-barra-home').style.display = 'none';
    document.getElementById('modal-graficos-barra').style.display = 'flex';
    setTimeout(_redimensionarGraficosBarra, 50);
}

function fecharGraficosBarraModal() {
    document.getElementById('painel-graficos-barra-home').appendChild(document.getElementById('graficos-barra-conteudo'));
    document.getElementById('modal-graficos-barra').style.display = 'none';
    document.getElementById('painel-graficos-barra-home').style.display = '';
    setTimeout(_redimensionarGraficosBarra, 50);
}

function _redimensionarGraficosBarra() {
    ['notaMedia', 'defesa', 'radarSetor', 'finalizacoes', 'dribles', 'raioXRadarDash'].forEach(k => {
        if (charts[k] && typeof charts[k].resize === 'function') charts[k].resize();
    });
}

function getAdvancedPlayerAggregates(pFiltradas) {
    let map = {};
    pFiltradas.forEach(p => {
        p.jogadores.forEach(j => {
            if (!map[j.nome]) {
                map[j.nome] = {
                    jogos: 0, passes: 0, sumPrecPasse: 0, fin: 0, sumPrecFin: 0,
                    dribles: 0, sumTaxaDrible: 0, posses: 0, defesas: 0, gols: 0, assist: 0, sumNota: 0
                };
            }
            map[j.nome].jogos += 1;
            map[j.nome].passes += (j.passes || 0);
            map[j.nome].sumPrecPasse += (j.precPasse || 0);
            map[j.nome].fin += (j.fin || 0);
            map[j.nome].sumPrecFin += (j.precFin || 0);
            map[j.nome].dribles += (j.dribles || 0);
            map[j.nome].sumTaxaDrible += (j.taxaDribles || 0);
            map[j.nome].posses += (j.posses || 0);
            map[j.nome].defesas += (j.defesas || 0);
            map[j.nome].gols += (j.gols || 0);
            map[j.nome].assist += (j.assist || 0);
            map[j.nome].sumNota += (j.nota || 0);
        });
    });
    return map;
}

function processMultiChartData(advancedMap, mainSortKey) {
    let limit = parseInt(document.getElementById('filtro-top-jogadores').value);
    let order = document.getElementById('filtro-ordem-grafico').value;

    let arr = Object.keys(advancedMap).map(nome => {
        let d = advancedMap[nome];
        
        // Calculando as médias básicas brutas
        let avgPasses = d.jogos > 0 ? (d.passes / d.jogos) : 0;
        let avgPrecPasse = d.jogos > 0 ? (d.sumPrecPasse / d.jogos) : 0;
        
        let avgFin = d.jogos > 0 ? (d.fin / d.jogos) : 0;
        let avgPrecFin = d.jogos > 0 ? (d.sumPrecFin / d.jogos) : 0;
        
        let avgDribles = d.jogos > 0 ? (d.dribles / d.jogos) : 0;
        let avgTaxaDrible = d.jogos > 0 ? (d.sumTaxaDrible / d.jogos) : 0;

        let avgPosses = d.jogos > 0 ? (d.posses / d.jogos) : 0;
        let avgDefesas = d.jogos > 0 ? (d.defesas / d.jogos) : 0;
        let mediaNota = d.jogos > 0 ? (d.sumNota / d.jogos) : 0;

        return {
            nome: nome,
            jogos: d.jogos,
            gols: d.gols,
            assist: d.assist,
            
            // Totais mantidos (Volume Bruto)
            passes: d.passes,
            fin: d.fin,
            dribles: d.dribles,
            posses: d.posses,
            defesas: d.defesas,
            
            // Percentuais mantidos (Exibição nas labels)
            precPasse: avgPrecPasse.toFixed(1),
            precFin: avgPrecFin.toFixed(1),
            taxaDrible: avgTaxaDrible.toFixed(1),

            // Novos valores "Por Jogo" aplicando a matemática do Raio-X: Média * (Taxa / 100)
            passesPorJogo: d.jogos > 0 ? (avgPasses * (avgPrecPasse / 100)).toFixed(1) : 0,
            finPorJogo: d.jogos > 0 ? (avgFin * (avgPrecFin / 100)).toFixed(1) : 0,
            driblesPorJogo: d.jogos > 0 ? (avgDribles * (avgTaxaDrible / 100)).toFixed(1) : 0,
            
            // Posses e defesas no Raio-X usam a média pura
            possesPorJogo: avgPosses.toFixed(1),
            defesasPorJogo: avgDefesas.toFixed(1),

            // Nota média do jogador no recorte selecionado (temporada / últimos jogos)
            mediaNota: mediaNota.toFixed(2)
        };
    });

    arr = arr.filter(x => parseFloat(x[mainSortKey]) > 0);
    arr.sort((a, b) => order === 'desc' ? parseFloat(b[mainSortKey]) - parseFloat(a[mainSortKey]) : parseFloat(a[mainSortKey]) - parseFloat(b[mainSortKey]));
    return arr.slice(0, limit);
}
// Função para reordenar o gráfico ao clicar na legenda
const sortableLegendClick = function(e, legendItem, legend) {
    const index = legendItem.datasetIndex;
    const ci = legend.chart;

    // Esconde ou mostra o item clicado
    if (ci.isDatasetVisible(index)) { ci.hide(index); legendItem.hidden = true; }
    else { ci.show(index); legendItem.hidden = false; }

    // Descobre quais barras estão visíveis na tela
    let visibleIndices = [];
    ci.data.datasets.forEach((ds, i) => { if (ci.isDatasetVisible(i)) visibleIndices.push(i); });
    
    // Se sobrar apenas UMA métrica visível, ordena por ela. Se tiver mais, volta a ordenar pela primeria (Total)
    let sortIndex = (visibleIndices.length === 1) ? visibleIndices[0] : 0;

    let combined = ci.data.labels.map((label, i) => {
        let obj = { label: label, sortVal: parseFloat(ci.data.datasets[sortIndex].data[i]) || 0 };
        ci.data.datasets.forEach((ds, dsIndex) => { obj['val' + dsIndex] = ds.data[i]; });
        return obj;
    });

    // Lê se você quer Maiores (desc) ou Menores (asc) lá do filtro do topo
    let order = document.getElementById('filtro-ordem-grafico').value;
    combined.sort((a, b) => order === 'desc' ? b.sortVal - a.sortVal : a.sortVal - b.sortVal);

    // Aplica a nova ordem ao gráfico
    ci.data.labels = combined.map(c => c.label);
    ci.data.datasets.forEach((ds, dsIndex) => { ds.data = combined.map(c => c['val' + dsIndex]); });
    ci.update();
};
