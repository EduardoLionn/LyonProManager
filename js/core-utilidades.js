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
            if (ovr <= 63) return 'color: #ff6b6b;'; 
            if (ovr <= 74) return 'color: #ffb800;'; 
            if (ovr <= 84) return 'color: #00ff88;'; 
            return 'color: #00a3ff;'; 
        }

        function formatarNoticia(texto) {
            let formatado = texto.replace(/"([^"]+)"/g, '<strong style="color:white; font-style:italic;">"$1"</strong>');
            formatado = formatado.replace(/'([^']+)'/g, '<strong style="color:white; font-style:italic;">\'$1\'</strong>');
            formatado = formatado.replace(/(€\d+(\.\d+)?[MB])/g, '<strong style="color:var(--primary); font-size: 110%;"> $1</strong>');
            return formatado;
        }

        function gerarNumeroAleatorio(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

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
            return `[CONTEXTO: Time: ${data.nome} | Temp: ${data.temporadaAtual} | Liga: ${data.liga} | Orçamento: €${data.orcamento.toFixed(2)}M | Prestigio: ${data.notaDiretoria.toFixed(1)}/10 | Últimos Resultados: ${ultimasPartidas} | Últimas Notícias e Movimentações: ${ultimasNoticias} | Metas: ${objStr}]`;
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
            try {
                let saved = localStorage.getItem('manager_fc_v4');
                if (saved) {
                    let loadedDb = JSON.parse(saved);
                    if(loadedDb.clube) db.clube = Object.assign(db.clube, loadedDb.clube);
                    if(loadedDb.selecao) db.selecao = Object.assign(db.selecao, loadedDb.selecao);
                }
            } catch(e) {}
            
            let selectT = document.getElementById('setup-temporada');
            for(let i=25; i<=45; i++) {
                selectT.innerHTML += `<option value="${i}/${i+1}">20${i}/20${i+1}</option>`;
            }
            
            let selectC = document.getElementById('setup-ciclo');
            for(let i=30; i<=70; i+=4) {
                selectC.innerHTML += `<option value="Ciclo 20${i}">Ciclo 20${i}</option>`;
            }

            ajustarInterfaceSave();
            carregarPreferenciasTaticas();
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
        

        function salvarDados() { localStorage.setItem('manager_fc_v4', JSON.stringify(db)); }

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
            downloadAnchor.setAttribute("download", `lyonpro_manager_save_${currentSave}.json`);
            document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
        }

        function importarBackup(event) {
            let fileReader = new FileReader();
            if(event.target.files[0]) {
                fileReader.readAsText(event.target.files[0], "UTF-8");
                fileReader.onload = function(e) {
                    try { db = JSON.parse(e.target.result); salvarDados(); alert("Backup carregado!"); location.reload(); } 
                    catch(err) { alert("Arquivo inválido!"); }
                }
            }
        }

        function mudarAba(abaId) {
            if (currentSave === 'selecao' && (abaId === 'tab-plantel' || abaId === 'tab-mercado')) {
                abaId = 'tab-dashboard';
            }
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(abaId).classList.add('active');
            let btn = document.querySelector(`.nav-btn[onclick="mudarAba('${abaId}')"]`);
            if(btn) btn.classList.add('active');
            
            if(abaId === 'tab-dashboard') { atualizarFiltroTemporadas(); desenharGraficos(); }
            if(abaId === 'tab-plantel') atualizarPlantelUI();
            if(abaId === 'tab-mercado') { filtrarMercado(statusFiltroMercado); checarEmbargoMercado(); }
            if(abaId === 'tab-upgrades') atualizarUpgradesUI();
            if(abaId === 'tab-historico') renderizarHistorico();
            if(abaId === 'tab-diretoria') { atualizarDiretoriaUI(); checarNovidadesIA('diretoria'); }
            if(abaId === 'tab-auxiliar') { renderizarCampinhoLimpo(); renderizarChat('auxiliar'); checarNovidadesIA('auxiliar'); }
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
            let config = db[currentSave];
            let btnPlantel = document.getElementById('nav-btn-plantel');
            let btnMercado = document.getElementById('nav-btn-mercado');
            let optRaioxDash = document.getElementById('opt-raiox-dash');
            
            if (currentSave === 'selecao') {
                btnPlantel.style.display = 'none'; btnMercado.style.display = 'none'; optRaioxDash.style.display = 'block'; 
                let activeTab = document.querySelector('.tab-content.active');
                if (activeTab && (activeTab.id === 'tab-plantel' || activeTab.id === 'tab-mercado')) mudarAba('tab-dashboard');
            } else {
                btnPlantel.style.display = 'block'; btnMercado.style.display = 'block'; optRaioxDash.style.display = 'none'; 
                if(document.getElementById('seletor-grafico').value === 'view-raiox') document.getElementById('seletor-grafico').value = 'view-calendario';
            }

            if (!config.nome) {
                document.getElementById('setup-screen').style.display = 'flex';
                document.getElementById('box-setup-temporada').style.display = currentSave === 'clube' ? 'flex' : 'none';
                document.getElementById('box-setup-ciclo').style.display = currentSave === 'selecao' ? 'flex' : 'none';
                return;
            }

            document.getElementById('setup-screen').style.display = 'none';
            document.getElementById('header-nome-time').innerText = config.nome;
            document.getElementById('header-temp-ano').innerText = config.temporadaAtual;

            let selectComp = document.getElementById('partida-comp');
            selectComp.innerHTML = '';
            let comps = currentSave === 'clube' ? ["Liga", "Copa Nacional", "Torneio Continental", "Amistoso"] : ["Copa do Mundo", "Eliminatórias", "Copa Continental", "Amistoso"];
            comps.forEach(c => selectComp.innerHTML += `<option value="${c}">${c}</option>`);

            preencherDatalistJogadores(); document.getElementById('jog-nome-input').value = '';
            atualizarFiltroTemporadas(); mudarAba('tab-dashboard');
        }

