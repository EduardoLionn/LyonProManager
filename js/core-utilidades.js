        // A IA às vezes devolve o orçamento em euros crus (ex: 15000000) em vez de milhões (15).
// Nenhum clube deveria ter um orçamento de transferências >= 1000 (bilhão de euros), então
// qualquer valor absurdamente alto é reinterpretado como estando na escala errada.
function normalizarValorOrcamento(valor) {
    let n = Number(valor) || 0;
    if (n >= 1000) n = n / 1000000;
    return Math.max(0, n);
}

function lerTexto(texto) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                let limpo = texto.replace(/[\*\[\]\(\)_]/g, ''); 
                let msg = new SpeechSynthesisUtterance(limpo);
                msg.lang = 'pt-BR';
                msg.rate = 1.35; // Um pouco mais rápido, ajuda a soar menos arrastado
                msg.pitch = 1.1; // Levemente mais agudo para clareza
                
                // Tenta achar a voz nativa do Google que é mais natural, se disponível
                let vozes = window.vozesSalvas || window.speechSynthesis.getVoices();
                let vozPreferida = vozes.find(v => v.lang === 'pt-BR' && v.name.toLowerCase().includes('google')) 
                                || vozes.find(v => v.lang === 'pt-BR');
                if(vozPreferida) msg.voice = vozPreferida;
                
                window.speechSynthesis.speak(msg);
            }
        }

        // Variável global para manter a instância do microfone ativa (Evita alguns prompts repetidos)
        let globalSpeechRec = null;

        function iniciarGravacao(inputId, btnId) {
            let SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRec) return alert('Seu navegador não suporta ditado por voz.');
            
            let btn = document.getElementById(btnId);
            
            if (!globalSpeechRec) {
                globalSpeechRec = new SpeechRec();
                globalSpeechRec.lang = 'pt-BR';
            }
            
            globalSpeechRec.onstart = function() { btn.style.color = 'var(--danger)'; btn.style.borderColor = 'var(--danger)'; };
            globalSpeechRec.onresult = function(event) {
                let input = document.getElementById(inputId);
                // Adiciona o texto falado ao invés de substituir, caso o usuário pause e fale de novo
                input.value += (input.value ? ' ' : '') + event.results[0][0].transcript; 
            };
            globalSpeechRec.onerror = function(e) { btn.style.color = 'white'; btn.style.borderColor = 'var(--border)'; console.error("Mic erro:", e); };
            globalSpeechRec.onend = function() { btn.style.color = 'white'; btn.style.borderColor = 'var(--border)'; };
            
            try {
                globalSpeechRec.start();
            } catch (err) {
                console.log("Microfone já em uso ou erro ao iniciar.", err);
            }
        }

        function usarQuickReply(texto, targetInputId, actionCallbackName) {
            document.getElementById(targetInputId).value = texto;
            if (actionCallbackName === 'responderColetiva') responderColetiva();
            else if (actionCallbackName === 'enviarChatDiretoria') enviarChat('diretoria');
            else if (actionCallbackName === 'enviarChatAuxiliar') enviarChat('auxiliar');
        }

        function getOvrClass(ovr) {
            if (ovr <= 63) return 'color: #E24B4B;'; 
            if (ovr <= 74) return 'color: #D9822B;'; 
            if (ovr <= 84) return 'color: #E8B84B;'; 
            return 'color: #4B9FE2;'; 
        }

        function formatarNoticia(texto) {
            let formatado = texto.replace(/"([^"]+)"/g, '<strong style="color:white; font-style:italic;">"$1"</strong>');
            formatado = formatado.replace(/'([^']+)'/g, '<strong style="color:white; font-style:italic;">\'$1\'</strong>');
            formatado = formatado.replace(/(€\d+(\.\d+)?[MB])/g, '<strong style="color:var(--primary); font-size: 110%;"> $1</strong>');
            return formatado;
        }

        function gerarNumeroAleatorio(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

        // Nome de exibição do Diretor/Auxiliar do save atual, com um fallback genérico caso o
        // treinador não tenha dado um nome a eles no assistente de Novo Jogo.
        function nomeDiretorExibicao() {
            let n = db[currentSave] && db[currentSave].nomeDiretor;
            return (n && n.trim()) ? n.trim() : 'Diretor(a) Executivo(a)';
        }
        function nomeAuxiliarExibicao() {
            let n = db[currentSave] && db[currentSave].nomeAuxiliar;
            return (n && n.trim()) ? n.trim() : 'Auxiliar Técnico';
        }

        function gerarResumoContexto() {
            let data = db[currentSave];
            if (!data || !data.nome) return "";
            
            let ultimasPartidas = data.partidas.slice(-3).map(p => `${p.adversario} (${p.golsPro}x${p.golsContra})`).join(' | ');
            if(!ultimasPartidas) ultimasPartidas = "Nenhuma partida recente disputada.";

            // --- NOVO: Adicionando as últimas notícias/transferências ao contexto ---
            let ultimasNoticias = data.noticiasFeed && data.noticiasFeed.length > 0 
                ? data.noticiasFeed.slice(0, 3).map(n => n.texto).join(' | ') 
                : "Nenhuma novidade recente.";

            let objStr = data.objetivosTemporada ? data.objetivosTemporada.replace(/<br>/g, " ") : "Sem metas definidas.";

            // --- NOVO: Boletim do Departamento Médico (lesões, suspensões e fadiga do elenco) ---
            let boletimMedico = (typeof gerarRelatorioMedicoTexto === 'function') ? gerarRelatorioMedicoTexto() : "";

            return `[CONTEXTO: Time: ${data.nome} | Temp: ${data.temporadaAtual} | Liga: ${data.liga} | Orçamento: €${data.orcamento.toFixed(2)}M | Prestigio: ${data.notaDiretoria.toFixed(1)}/10 | Últimos Resultados: ${ultimasPartidas} | Últimas Notícias e Movimentações: ${ultimasNoticias} | Metas: ${objStr} | Departamento Médico: ${boletimMedico || "Sem novidades."}]`;
        }

        function toggleModoVideo() {
            let formJog = document.getElementById('manual-jogador-form');
            let formPart = document.getElementById('manual-partida-form');
            let btn = document.getElementById('btn-toggle-video');

            if (formJog.style.display === 'none') {
                // Se está invisível, vamos MOSTRAR
                formJog.style.display = 'block';
                formPart.style.display = 'block';
                btn.innerHTML = '👁️ Ocultar Controles';
                btn.style.background = 'transparent';
                btn.style.color = 'var(--primary)';
                btn.style.border = '1px solid var(--primary)';
            } else {
                // Se está visível, vamos ESCONDER
                formJog.style.display = 'none';
                formPart.style.display = 'none';
                btn.innerHTML = '✏️ Mostrar Controles';
                btn.style.background = 'var(--primary)';
                btn.style.color = 'black';
                btn.style.border = 'none';
            }
        }

        function carregarDados() {
            let selectT = document.getElementById('setup-temporada');
            for(let i=25; i<=45; i++) {
                selectT.innerHTML += `<option value="${i}/${i+1}">20${i}/20${i+1}</option>`;
            }

            let selectC = document.getElementById('setup-ciclo');
            for(let i=30; i<=70; i+=4) {
                selectC.innerHTML += `<option value="Ciclo 20${i}">Ciclo 20${i}</option>`;
            }

            // Migra um save antigo (formato de slot único) se for a primeira vez que este navegador
            // abre a versão com múltiplos saves. Depois disso, o site sempre abre no Menu Principal.
            migrarSaveAntigoSeNecessario();
            mostrarMenuPrincipal();
        }
        
        function toggleChatAuxiliar() {
            let panel = document.getElementById('panel-chat-auxiliar');
            let btn = document.getElementById('btn-toggle-chat-aux');
            if (panel.style.display === 'none' || !panel.style.display) {
                panel.style.display = 'flex';
                btn.innerHTML = '💬 Ocultar Painel de Instruções e Conversa';
                btn.style.background = 'rgba(0, 163, 255, 0.1)';
            } else {
                panel.style.display = 'none';
                btn.innerHTML = '💬 Abrir Painel de Instruções Diretas e Conversa (Chat)';
                btn.style.background = 'var(--panel-bg)';
            }
        }

        function toggleHistoricoAuxiliarPanel() {
            let panel = document.getElementById('auxiliar-historico-partidas');
            let btn = document.getElementById('btn-toggle-historico-aux');
            if (panel.style.display === 'none' || !panel.style.display) {
                panel.style.display = 'block';
                btn.innerText = '📂 Ocultar Histórico de Partidas';
            } else {
                panel.style.display = 'none';
                btn.innerText = '📂 Ver Histórico de Partidas';
            }
        }

     function salvarPreferenciasTaticas() {
            if(!db[currentSave].taticas) db[currentSave].taticas = {};
            db[currentSave].taticas.primaria = document.getElementById('tatica-primaria').value;
            db[currentSave].taticas.secundaria = document.getElementById('tatica-secundaria').value;
            db[currentSave].taticas.estilo = document.getElementById('tatica-estilo').value;
            salvarDados();
        }

function toggleChatDiretoria() {
    let panel = document.getElementById('panel-chat-diretoria');
    let btn = document.getElementById('btn-toggle-chat-dir');
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'flex';
        btn.innerHTML = '👔 Encerrar Reunião (Ocultar Painel)';
        btn.style.background = 'rgba(255, 215, 0, 0.1)';
    } else {
        panel.style.display = 'none';
        btn.innerHTML = '👔 Solicitar Reunião com a Diretoria (Chat)';
        btn.style.background = 'var(--panel-bg)';
    }
}

   function carregarPreferenciasTaticas() {
            if(db[currentSave].taticas) {
                if(db[currentSave].taticas.primaria) document.getElementById('tatica-primaria').value = db[currentSave].taticas.primaria;
                if(db[currentSave].taticas.secundaria) document.getElementById('tatica-secundaria').value = db[currentSave].taticas.secundaria;
                if(db[currentSave].taticas.estilo) document.getElementById('tatica-estilo').value = db[currentSave].taticas.estilo;
            }
        }

        function carregarPerfilTreinador() {
            document.getElementById('perfil-nome-tecnico').value = db[currentSave].nomeTecnico || '';
            document.getElementById('perfil-nome-diretor').value = db[currentSave].nomeDiretor || '';
            document.getElementById('perfil-nome-auxiliar').value = db[currentSave].nomeAuxiliar || '';
        }

        function salvarPerfilTreinador() {
            let nome = document.getElementById('perfil-nome-tecnico').value.trim();
            if (!nome) return alert("Digite o nome do técnico!");
            if (!nome.includes(' ')) return alert("Digite nome E sobrenome do técnico (ex: Carlo Ancelotti).");
            db[currentSave].nomeTecnico = nome;
            db[currentSave].nomeDiretor = document.getElementById('perfil-nome-diretor').value.trim();
            db[currentSave].nomeAuxiliar = document.getElementById('perfil-nome-auxiliar').value.trim();
            salvarDados();
            document.getElementById('header-nome-tecnico').innerText = nome;
            alert("Perfil salvo!");
        }


        function salvarDados() {
            if (!saveAtualId) return; // nenhum save carregado ainda (estamos no Menu Principal)
            localStorage.setItem('lyonpro_save_data_' + saveAtualId, JSON.stringify(db));
            let indice = _lerIndiceSaves();
            let entrada = indice.find(s => s.id === saveAtualId);
            if (entrada) {
                entrada.atualizadoEm = Date.now();
                entrada.resumo = _resumoDeDb(db);
                _gravarIndiceSaves(indice);
            }
        }

        // Indicador genérico de carregamento (usado pelas chamadas de IA que não têm loader próprio)
        function mostrarCarregandoIA(texto) {
            let el = document.getElementById('loader-ia-global');
            if(el) { el.innerText = texto || '⏳ Consultando a IA...'; el.style.display = 'block'; }
        }
        function esconderCarregandoIA() {
            let el = document.getElementById('loader-ia-global');
            if(el) el.style.display = 'none';
        }

        function exportarBackup() {
            let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
            let downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            let nomeArquivo = (db.clube.saveName || db.clube.nome || db.selecao.saveName || db.selecao.nome || 'save').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
            downloadAnchor.setAttribute("download", `lyonpro_manager_${nomeArquivo}.json`);
            document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
        }


        function mudarAba(abaId) {
            // Sem save carregado, só o Menu Principal existe (evita cair numa aba "vazia")
            if (abaId !== 'tab-menu-principal' && !saveAtualId) abaId = 'tab-menu-principal';
            if (currentSave === 'selecao' && (abaId === 'tab-plantel' || abaId === 'tab-mercado')) {
                abaId = 'tab-dashboard';
            }
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(abaId).classList.add('active');
            let btn = document.querySelector(`.nav-btn[onclick="mudarAba('${abaId}')"]`);
            if(btn) btn.classList.add('active');

            if(abaId === 'tab-menu-principal') {
                if (typeof menuPrincipalResetView === 'function') menuPrincipalResetView();
            }
            if(abaId === 'tab-dashboard') { atualizarFiltroTemporadas(); desenharGraficos(); }
            if(abaId === 'tab-salvar-partida') preencherDatalistJogadores();
            if(abaId === 'tab-plantel') atualizarPlantelUI();
            if(abaId === 'tab-mercado') { filtrarMercado(statusFiltroMercado); checarEmbargoMercado(); }
            if(abaId === 'tab-upgrades') atualizarUpgradesUI();
            if(abaId === 'tab-historico') renderizarHistorico();
            if(abaId === 'tab-diretoria') { atualizarDiretoriaUI(); checarNovidadesIA('diretoria'); }
            if(abaId === 'tab-medico') { atualizarDepartamentoMedicoUI(); }
            if(abaId === 'tab-perfil-treinador') { carregarPerfilTreinador(); carregarPreferenciasTaticas(); }
            if(abaId === 'tab-auxiliar') { atualizarDepartamentoMedicoUI(); renderizarAuxiliarPartida(); renderizarChat('auxiliar'); checarNovidadesIA('auxiliar'); }
            if(abaId === 'tab-social') { renderizarSocialFeed(); } // <-- NOVO AQUI
        }

        function trocarSave() { currentSave = document.getElementById('select-save').value; ajustarInterfaceSave(); }

        function preencherDatalistJogadores() {
            let datalist = document.getElementById('datalist-jogadores');
            datalist.innerHTML = '';
            let plantelOrdenado = [...db[currentSave].plantel].sort((a,b) => (ordemPosicoes[a.posicao] || 6) - (ordemPosicoes[b.posicao] || 6));
            plantelOrdenado.forEach(p => {
                if(p.status === 'Ativo') datalist.innerHTML += `<option value="${p.nome}">${p.posicao} | OVR ${p.ovr}</option>`;
            });
        }

        function ajustarInterfaceSave() {
            // Restaura a navegação completa (o Menu Principal esconde tudo, inclusive a barra lateral)
            let sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.style.display = 'flex';
            document.querySelectorAll('.sidebar .nav-btn').forEach(b => b.style.display = '');
            let saveControls = document.querySelector('.save-controls');
            if (saveControls) saveControls.style.display = 'block';

            let config = db[currentSave];
            let btnPlantel = document.getElementById('nav-btn-plantel');
            let btnMercado = document.getElementById('nav-btn-mercado');
            let optRaioxDash = document.getElementById('opt-raiox-dash');

            if (currentSave === 'selecao') {
                btnPlantel.style.display = 'none'; btnMercado.style.display = 'none'; optRaioxDash.style.display = 'inline-block';
                let activeTab = document.querySelector('.tab-content.active');
                if (activeTab && (activeTab.id === 'tab-plantel' || activeTab.id === 'tab-mercado')) mudarAba('tab-dashboard');
            } else {
                btnPlantel.style.display = 'block'; btnMercado.style.display = 'block'; optRaioxDash.style.display = 'none';
                let tabBarraAtiva = document.querySelector('#graf-tabs-barra .graf-tab.active');
                if (tabBarraAtiva && tabBarraAtiva.dataset.view === 'view-raiox' && typeof mudarGrafico === 'function') mudarGrafico('view-notamedia', 'graf-tabs-barra', 'grupo-barra');
            }

            if (!config.nome) {
                if (typeof iniciarTelaNovoJogo === 'function') iniciarTelaNovoJogo();
                return;
            }

            // Autocorrige saves antigos em que a IA guardou o orçamento em euros crus (ex: 15000000)
            // em vez de milhões (15), o que fazia o valor aparecer como "€15000000.00M" na tela.
            if (typeof normalizarValorOrcamento === 'function') {
                let orcamentoCorrigido = normalizarValorOrcamento(config.orcamento);
                if (orcamentoCorrigido !== config.orcamento) { config.orcamento = orcamentoCorrigido; salvarDados(); }
            }

            document.getElementById('header-nome-time').innerText = config.nome;
            document.getElementById('header-nome-tecnico').innerText = config.nomeTecnico || '-';
            document.getElementById('header-temp-ano').innerText = config.temporadaAtual;

            let selectComp = document.getElementById('partida-comp');
            selectComp.innerHTML = '';
            let comps = currentSave === 'clube' ? ["Liga", "Copa Nacional", "Torneio Continental", "Amistoso"] : ["Copa do Mundo", "Eliminatórias", "Copa Continental", "Amistoso"];
            comps.forEach(c => selectComp.innerHTML += `<option value="${c}">${c}</option>`);

            if (typeof garantirCondicaoFisicaTodos === 'function') garantirCondicaoFisicaTodos();
            preencherDatalistJogadores(); document.getElementById('jog-nome-input').value = '';
            atualizarFiltroTemporadas(); carregarPreferenciasTaticas(); mudarAba('tab-dashboard');
        }


        // --- MODAL MODERNO: substitui confirm()/prompt() do navegador ---
        let _modalModernoResolve = null;

        function _fecharModalModerno(valor) {
            document.getElementById('modal-moderno').style.display = 'none';
            let input = document.getElementById('modal-moderno-input');
            input.onkeydown = null;
            let foiConfirmado = valor === true || (typeof valor === 'string' && valor !== null);
            if (typeof playConfirmSound === 'function') {
                if (foiConfirmado) playConfirmSound(); else playCancelSound();
            }
            if (_modalModernoResolve) { let r = _modalModernoResolve; _modalModernoResolve = null; r(valor); }
        }

        // Substitui confirm(mensagem) — resolve true (confirmar) ou false (cancelar)
        function confirmarModerno(mensagem, titulo, opcoes) {
            titulo = titulo || "Confirmar Ação";
            opcoes = opcoes || {};
            return new Promise((resolve) => {
                _modalModernoResolve = resolve;
                document.getElementById('modal-moderno-titulo').innerText = titulo;
                document.getElementById('modal-moderno-mensagem').innerText = mensagem;
                document.getElementById('modal-moderno-input').style.display = 'none';
                let btnOk = document.getElementById('modal-moderno-confirmar');
                btnOk.innerText = opcoes.textoConfirmar || 'Confirmar';
                btnOk.style.background = opcoes.perigo ? 'var(--danger)' : 'var(--primary)';
                btnOk.style.color = opcoes.perigo ? 'white' : '#14150F';
                btnOk.onclick = () => _fecharModalModerno(true);
                document.getElementById('modal-moderno-cancelar').onclick = () => _fecharModalModerno(false);
                document.getElementById('modal-moderno').style.display = 'flex';
            });
        }

        // Substitui prompt(mensagem, valorPadrao) — resolve o texto digitado, ou null se cancelar
        function promptModerno(mensagem, valorPadrao, titulo) {
            titulo = titulo || "Informe um valor";
            return new Promise((resolve) => {
                _modalModernoResolve = resolve;
                document.getElementById('modal-moderno-titulo').innerText = titulo;
                document.getElementById('modal-moderno-mensagem').innerText = mensagem;
                let input = document.getElementById('modal-moderno-input');
                input.style.display = 'block';
                input.value = (valorPadrao !== undefined && valorPadrao !== null) ? valorPadrao : '';
                let btnOk = document.getElementById('modal-moderno-confirmar');
                btnOk.innerText = 'Confirmar';
                btnOk.style.background = 'var(--primary)';
                btnOk.style.color = '#14150F';
                btnOk.onclick = () => _fecharModalModerno(input.value);
                document.getElementById('modal-moderno-cancelar').onclick = () => _fecharModalModerno(null);
                input.onkeydown = (e) => { if (e.key === 'Enter') _fecharModalModerno(input.value); };
                document.getElementById('modal-moderno').style.display = 'flex';
                setTimeout(() => { input.focus(); input.select(); }, 50);
            });
        }
