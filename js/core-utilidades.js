// =====================================================================================
// CHAMADA ÚNICA AO PROXY DA IA
// =====================================================================================
// Todas as chamadas à IA passam por aqui em vez de usar fetch(API_URL) espalhado pelo
// código. O motivo é segurança: o endereço do proxy está no JS público, então sem exigir
// prova de login qualquer pessoa poderia usá-lo como um Gemini de graça, na conta do dono
// do site. Este ponto único anexa o token do Firebase do usuário logado; o Worker valida a
// assinatura desse token antes de gastar a cota (ver worker/README.md).
//
// A resposta é devolvida crua (o mesmo objeto que response.json() dava antes), pra não
// mudar o formato que as 14 telas já esperam.
// `timeoutMs` é opcional (padrão 45s — dá folga pra prompts com imagem, que demoram mais que
// texto puro) — sem isso, uma resposta lenta/travada do Worker ou do Gemini deixava a tela
// "carregando" por tempo indefinido (reclamação: "demorou pra caramba iniciar o jogo"),
// sem nunca cair no catch de quem chamou pra mostrar um erro ou tentar de novo.
async function chamarIA(corpo, timeoutMs) {
    let cabecalhos = { 'Content-Type': 'application/json' };
    try {
        let user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
        if (user) cabecalhos['Authorization'] = 'Bearer ' + await user.getIdToken();
    } catch (e) {
        // Sem token: o Worker vai recusar. Melhor recusar do que virar proxy aberto.
    }

    let controlador = new AbortController();
    let timer = setTimeout(() => controlador.abort(), timeoutMs || 45000);
    let resposta;
    try {
        resposta = await fetch(API_URL, {
            method: 'POST',
            headers: cabecalhos,
            body: JSON.stringify(corpo),
            signal: controlador.signal
        });
    } catch (e) {
        if (e.name === 'AbortError') throw new Error('A IA demorou demais pra responder. Tente novamente.');
        throw e;
    } finally {
        clearTimeout(timer);
    }

    if (resposta.status === 401 || resposta.status === 403) {
        throw new Error('Sessão expirada — recarregue a página e entre de novo para usar a IA.');
    }
    if (resposta.status === 429) {
        throw new Error('Muitas consultas à IA em pouco tempo. Espere um instante e tente de novo.');
    }
    return await resposta.json();
}

// =====================================================================================
// SANEAMENTO DE TEXTO VINDO DE FORA
// =====================================================================================
// O app renderiza quase tudo com innerHTML (nomes de jogador, feed social, chat, metas da
// diretoria — que guardam HTML de propósito, tipo <br> e <span style>). Enquanto o dado é
// só do próprio jogador isso não é um problema de verdade, mas existe UMA fronteira em que
// texto de outra pessoa entra: o arquivo de backup .json que alguém pode compartilhar.
// Um backup "presenteado" com <img onerror=...> no nome do clube executaria script na sessão
// de quem importou — com acesso ao token de login e aos saves na nuvem.
//
// Em vez de escapar em centenas de pontos de renderização, a barreira fica na ENTRADA.

const TAGS_HTML_PERMITIDAS = new Set(['BR', 'B', 'STRONG', 'I', 'EM', 'U', 'SMALL', 'SPAN', 'P', 'DIV', 'UL', 'OL', 'LI', 'H3', 'H4', 'H5']);
const ATRIBUTOS_HTML_PERMITIDOS = new Set(['style']);
// Nestas tags o conteúdo é código, não texto pra ler: são descartadas inteiras. Nas outras
// tags proibidas o conteúdo é preservado como texto puro (não se perde o que a pessoa escreveu).
const TAGS_HTML_DESCARTADAS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'HEAD', 'LINK', 'META', 'BASE']);

// Remove o que é perigoso e preserva a formatação legítima. Usa o DOMParser em vez de regex
// porque parsear HTML com expressão regular sempre deixa brecha; 'text/html' num documento
// avulso não executa script nem baixa recurso nenhum.
function limparHtmlUsuario(html) {
    if (typeof html !== 'string') return html;
    if (html.indexOf('<') === -1) return html;                      // caminho rápido: texto puro
    if (typeof DOMParser === 'undefined') return html.replace(/[<>]/g, ''); // fora do navegador

    let doc = new DOMParser().parseFromString('<div id="raiz-saneamento"></div>', 'text/html');
    let raiz = doc.getElementById('raiz-saneamento');
    raiz.innerHTML = html;

    // De baixo pra cima: assim trocar um nó por texto não atrapalha a varredura dos filhos.
    Array.from(raiz.querySelectorAll('*')).reverse().forEach(el => {
        if (TAGS_HTML_DESCARTADAS.has(el.tagName)) { el.remove(); return; }
        if (!TAGS_HTML_PERMITIDAS.has(el.tagName)) {
            // Tag proibida mas com texto legítimo dentro (ex: <a>, <div onmouseover>) —
            // mantém o que estava escrito e joga a tag fora.
            el.replaceWith(doc.createTextNode(el.textContent || ''));
            return;
        }
        Array.from(el.attributes).forEach(attr => {
            let nome = attr.name.toLowerCase();
            // Todo on* (onerror, onclick...) e qualquer coisa fora da lista cai aqui
            if (!ATRIBUTOS_HTML_PERMITIDOS.has(nome)) { el.removeAttribute(attr.name); return; }
            // style é útil pras cores do app, mas não pode carregar recurso externo
            if (/url\s*\(|expression\s*\(|javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
        });
    });

    return raiz.innerHTML;
}

// Para campos que são texto puro (nome de jogador, clube, técnico): nenhum deles precisa de
// < >, então some com eles e com caracteres de controle.
function limparTextoUsuario(valor, limite) {
    if (typeof valor !== 'string') return valor;
    let limpo = valor.replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
    return limite ? limpo.slice(0, limite) : limpo;
}

// Varre em profundidade um save importado de arquivo e limpa cada string. Os limites de
// tamanho/profundidade também evitam que um arquivo enorme ou circular travi o navegador.
function sanearSaveImportado(valor, profundidade) {
    profundidade = profundidade || 0;
    if (profundidade > 14) return null;
    if (typeof valor === 'string') return limparHtmlUsuario(valor).slice(0, 20000);
    if (Array.isArray(valor)) return valor.slice(0, 20000).map(v => sanearSaveImportado(v, profundidade + 1));
    if (valor && typeof valor === 'object') {
        let saida = {};
        Object.keys(valor).slice(0, 2000).forEach(k => {
            saida[limparTextoUsuario(k, 120)] = sanearSaveImportado(valor[k], profundidade + 1);
        });
        return saida;
    }
    if (typeof valor === 'number' && !Number.isFinite(valor)) return 0;
    return valor; // número finito, booleano, null
}

// Converte qualquer coisa num número finito. É a porta de entrada obrigatória pra todo
// valor que vem da IA (que pode devolver string, null, campo faltando) antes de virar
// estado do save. Sem isso, um único retorno estranho grava NaN no save — e NaN vira null
// no JSON.stringify, o que congela indicadores na tela e depois os faz saltar do nada.
function numeroSeguro(valor, padrao) {
    // null/undefined/"" contam como "campo ausente", não como zero. Isso importa porque o
    // JSON.stringify grava NaN como null: sem esse tratamento, um indicador corrompido
    // "curaria" para 0 em vez de voltar ao padrão.
    if (valor === null || valor === undefined || valor === '') return Number.isFinite(padrao) ? padrao : 0;
    let n = Number(valor);
    if (Number.isFinite(n)) return n;
    return Number.isFinite(padrao) ? padrao : 0;
}

// Igual ao numeroSeguro, já preso a uma faixa válida.
function numeroNaFaixa(valor, min, max, padrao) {
    return Math.max(min, Math.min(max, numeroSeguro(valor, padrao)));
}

// Um atleta que está no clube por empréstimo pertence a outro time: não pode ser vendido,
// emprestado de novo nem dispensado. A única saída válida é devolvê-lo (EncerrarEmprestimo).
function jogadorPertenceAOutroClube(jogador) {
    return !!(jogador && jogador.origem === 'EmprestadoIn');
}

// Conserta indicadores numéricos que já foram corrompidos em partidas anteriores (o bug
// clássico: a IA devolvia um valor estranho, o campo virava NaN, o JSON gravava null e o
// número na tela ficava travado até dar um salto do nada). Roda uma vez por save carregado.
function sanearNumerosDoSave() {
    let d = db[currentSave];
    if (!d) return;

    d.aprovacaoTorcida = numeroNaFaixa(d.aprovacaoTorcida, 0, 100, 75);
    d.notaDiretoria = numeroNaFaixa(d.notaDiretoria, 0, 100, 75);
    d.orcamento = numeroSeguro(d.orcamento, 0);
    d.gastoAtual = Math.max(0, numeroSeguro(d.gastoAtual, 0));
    d.arrecadadoAtual = Math.max(0, numeroSeguro(d.arrecadadoAtual, 0));
    d.mediaGastoHistorico = Math.max(0, numeroSeguro(d.mediaGastoHistorico, 0));
    d.mediaArrecadadoHistorico = Math.max(0, numeroSeguro(d.mediaArrecadadoHistorico, 0));
    d.verbaAntecipada = Math.max(0, numeroSeguro(d.verbaAntecipada, 0));

    (d.plantel || []).forEach(p => {
        p.ovr = Math.max(1, Math.round(numeroSeguro(p.ovr, 60)));
        if (p.idade !== undefined && p.idade !== null) p.idade = Math.round(numeroSeguro(p.idade, 24));
        p.stamina = numeroNaFaixa(p.stamina, 0, 100, 100);
        p.moral = numeroNaFaixa(p.moral, 0, 100, 75);
        p.diasLesao = Math.max(0, Math.round(numeroSeguro(p.diasLesao, 0)));
        p.jogosSeguidos = Math.max(0, Math.round(numeroSeguro(p.jogosSeguidos, 0)));
        p.poupadoRestante = Math.max(0, Math.round(numeroSeguro(p.poupadoRestante, 0)));
    });
}

// A IA às vezes devolve o orçamento em euros crus (ex: 15000000) em vez de milhões (15).
// Nenhum clube deveria ter um orçamento de transferências >= 1000 (bilhão de euros), então
// qualquer valor absurdamente alto é reinterpretado como estando na escala errada.
function normalizarValorOrcamento(valor) {
    let n = Number(valor) || 0;
    if (n >= 1000) n = n / 1000000;
    return Math.max(0, n);
}

// Saves antigos guardavam o Prestígio da Diretoria numa escala de 0 a 10 — usada só pela migração
// de uma vez só em ajustarInterfaceSave (gatilho: falta o campo notaDiretoriaEscala100 no save).
function normalizarNotaDiretoria(valor) {
    let n = Number(valor);
    if (!Number.isFinite(n)) return 75;
    return Math.max(0, Math.min(100, n * 10));
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

        // Pedido do treinador: "os chats estão minúsculo pra digitar, deve abrir a barra de
        // digitar, igual WhatsApp" — a caixa de texto do chat cresce sozinha conforme o
        // treinador digita, em vez de ficar travada numa altura fixa de uma linha só.
        // "height:auto" antes de medir é o que permite ENCOLHER de volta ao apagar texto —
        // sem isso, scrollHeight só cresce e nunca diminui.
        function autoAjustarAlturaChat(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
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

            // O momento na competição e o clima do vestiário são metade do trabalho de um
            // treinador de verdade — sem eles a IA falava do time olhando só OVR e placar.
            let momento = (typeof contextoCompeticaoIA === 'function') ? contextoCompeticaoIA() : '';
            let vestiario = (typeof contextoVestiarioIA === 'function') ? contextoVestiarioIA() : '';

            return `[CONTEXTO: Time: ${data.nome} | Temp: ${data.temporadaAtual} | Liga: ${data.liga} | Orçamento: €${data.orcamento.toFixed(2)}M | Prestigio: ${Math.round(data.notaDiretoria)}/100 | Últimos Resultados: ${ultimasPartidas} | Últimas Notícias e Movimentações: ${ultimasNoticias} | Metas: ${objStr} | Departamento Médico: ${boletimMedico || "Sem novidades."}]${momento ? `\n[MOMENTO DO TIME NA TEMPORADA: ${momento}]` : ''}${vestiario ? `\n[CLIMA DO VESTIÁRIO: ${vestiario}]` : ''}`;
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
        
        // --- MENU MOBILE EM GAVETA (pedido do treinador) ---
        // Abaixo de 900px a sidebar vira uma gaveta (ver @media max-width:900px em styles.css) —
        // estas três funções abrem/fecham ela e o fundo escurecido atrás. mudarAba() chama
        // fecharMenuMobile() sempre que uma aba é escolhida, então trocar de tela já fecha o menu
        // sozinho (sem isso, a gaveta ficava aberta cobrindo a tela nova).
        function abrirMenuMobile() {
            let sidebar = document.querySelector('.sidebar');
            let backdrop = document.getElementById('menu-mobile-backdrop');
            if (sidebar) sidebar.classList.add('menu-aberto');
            if (backdrop) backdrop.classList.add('ativo');
            document.body.classList.add('menu-mobile-travado');
        }
        function fecharMenuMobile() {
            let sidebar = document.querySelector('.sidebar');
            let backdrop = document.getElementById('menu-mobile-backdrop');
            if (sidebar) sidebar.classList.remove('menu-aberto');
            if (backdrop) backdrop.classList.remove('ativo');
            document.body.classList.remove('menu-mobile-travado');
        }
        function toggleMenuMobile() {
            let sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.classList.contains('menu-aberto')) fecharMenuMobile();
            else abrirMenuMobile();
        }
        // Girar o celular ou usar um tablet pode cruzar o breakpoint de 900px com o menu aberto —
        // sem isso a gaveta ficaria com o transform de "aberta" mesmo depois de virar sidebar fixa.
        window.addEventListener('resize', () => { if (window.innerWidth > 900) fecharMenuMobile(); });

        function toggleChatAuxiliar() {
            let panel = document.getElementById('panel-chat-auxiliar');
            let btn = document.getElementById('btn-toggle-chat-aux');
            if (panel.style.display === 'none' || !panel.style.display) {
                panel.style.display = 'flex';
                btn.innerHTML = '💬 Ocultar Painel de Instruções e Conversa';
                btn.style.background = 'rgba(0, 163, 255, 0.1)';
                // renderizarChat() já rodou antes do painel abrir (a aba renderiza o chat sempre,
                // mesmo escondido) — com display:none o scrollHeight lido na hora era 0, então o
                // scroll ficava travado no topo (primeira mensagem). Agora que o painel é visível
                // de verdade, o scrollHeight é o real e dá pra ir pro fim da conversa.
                let log = document.getElementById('chat-log-auxiliar');
                if (log) log.scrollTop = log.scrollHeight;
            } else {
                panel.style.display = 'none';
                btn.innerHTML = '💬 Abrir Painel de Instruções Diretas e Conversa (Chat)';
                btn.style.background = 'var(--panel-bg)';
            }
        }

     // As escolhas táticas agora vivem em js/taticas.js (modelo espelhado no jogo, com as
     // travas de cada predefinição). Esta função só garante que o save tem o formato novo.
     function salvarPreferenciasTaticas() {
            if (typeof taticaDoSave === 'function') taticaDoSave();
            salvarDados();
        }

function toggleChatDiretoria() {
    let panel = document.getElementById('panel-chat-diretoria');
    let btn = document.getElementById('btn-toggle-chat-dir');
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'flex';
        btn.innerHTML = '👔 Encerrar Reunião (Ocultar Painel)';
        btn.style.background = 'rgba(255, 215, 0, 0.1)';
        let log = document.getElementById('chat-log-diretoria');
        if (log) log.scrollTop = log.scrollHeight;
    } else {
        panel.style.display = 'none';
        btn.innerHTML = '👔 Solicitar Reunião com a Diretoria (Chat)';
        btn.style.background = 'var(--panel-bg)';
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
            if (typeof _agendarSyncNuvem === 'function') _agendarSyncNuvem(saveAtualId);
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
            if (currentSave === 'selecao' && (abaId === 'tab-diretoria' || abaId === 'tab-medico')) {
                abaId = 'tab-convocacao';
            }
            if (currentSave === 'clube' && abaId === 'tab-convocacao') {
                abaId = 'tab-dashboard';
            }
            // A Central de Mensagens depende de diretoria, departamento médico e elenco de clube —
            // no slot Seleção Nacional esses departamentos não existem.
            if (currentSave === 'selecao' && abaId === 'tab-mensagens') {
                abaId = 'tab-dashboard';
            }
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(abaId).classList.add('active');
            let btn = document.querySelector(`.nav-btn[onclick="mudarAba('${abaId}')"]`);
            if(btn) btn.classList.add('active');
            // Escolher uma aba fecha o menu em gaveta no celular — inofensivo no desktop, onde a
            // sidebar não tem essa classe pra remover.
            if (typeof fecharMenuMobile === 'function') fecharMenuMobile();

            if(abaId === 'tab-menu-principal') {
                if (typeof menuPrincipalResetView === 'function') menuPrincipalResetView();
            }
            if(abaId === 'tab-dashboard') { atualizarFiltroTemporadas(); desenharGraficos(); }
            if(abaId === 'tab-salvar-partida') { preencherDatalistJogadores(); if (typeof renderizarAbaSalvarPartida === 'function') renderizarAbaSalvarPartida(); }
            if(abaId === 'tab-plantel') atualizarPlantelUI();
            if(abaId === 'tab-mercado') { filtrarMercado(statusFiltroMercado); checarEmbargoMercado(); }
            if(abaId === 'tab-upgrades') atualizarUpgradesUI();
            if(abaId === 'tab-historico') renderizarHistorico();
            if(abaId === 'tab-diretoria') { atualizarDiretoriaUI(); }
            if(abaId === 'tab-medico') { atualizarDepartamentoMedicoUI(); }
            if(abaId === 'tab-perfil-treinador') { carregarPerfilTreinador(); if (typeof renderizarSeletorEstiloJogo === 'function') renderizarSeletorEstiloJogo('perfil-'); }
            if(abaId === 'tab-auxiliar') { atualizarDepartamentoMedicoUI(); renderizarSugestaoAuxiliar(); renderizarChat('auxiliar'); if (typeof restaurarFocoPartidaSelecionado === 'function') restaurarFocoPartidaSelecionado(); }
            if(abaId === 'tab-social') { renderizarSocialFeed(); } // <-- NOVO AQUI
            if(abaId === 'tab-convocacao') { renderizarConvocacaoUI(); }
            if(abaId === 'tab-mensagens') { renderizarCaixaMensagens(); if (typeof renderizarComandosJogo === 'function') renderizarComandosJogo(); }
            if(typeof atualizarBadgeMensagens === 'function') atualizarBadgeMensagens();
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
            // Devolve o controle da barra do ☰ pro @media (inline vazio = "usa a regra CSS de novo"),
            // em vez de travar 'flex' fixo, que apareceria até no desktop.
            let topbarMobile = document.querySelector('.mobile-topbar');
            if (topbarMobile) topbarMobile.style.display = '';
            document.querySelectorAll('.sidebar .nav-btn').forEach(b => b.style.display = '');
            let saveControls = document.querySelector('.save-controls');
            if (saveControls) saveControls.style.display = 'block';

            let config = db[currentSave];
            let btnPlantel = document.getElementById('nav-btn-plantel');
            let btnMercado = document.getElementById('nav-btn-mercado');
            let optRaioxDash = document.getElementById('opt-raiox-dash');
            let btnDiretoria = document.getElementById('nav-btn-diretoria');
            let btnMedico = document.getElementById('nav-btn-medico');
            let btnConvocacao = document.getElementById('nav-btn-convocacao');
            let btnMensagens = document.getElementById('nav-btn-mensagens');

            if (currentSave === 'selecao') {
                btnPlantel.style.display = 'none'; btnMercado.style.display = 'none'; optRaioxDash.style.display = 'inline-block';
                btnDiretoria.style.display = 'none'; btnMedico.style.display = 'none'; btnConvocacao.style.display = 'block';
                if (btnMensagens) btnMensagens.style.display = 'none';
                let activeTab = document.querySelector('.tab-content.active');
                if (activeTab && (activeTab.id === 'tab-plantel' || activeTab.id === 'tab-mercado' || activeTab.id === 'tab-diretoria' || activeTab.id === 'tab-medico' || activeTab.id === 'tab-mensagens')) mudarAba('tab-dashboard');
            } else {
                btnPlantel.style.display = 'block'; btnMercado.style.display = 'block'; optRaioxDash.style.display = 'none';
                btnDiretoria.style.display = 'block'; btnMedico.style.display = 'block'; btnConvocacao.style.display = 'none';
                if (btnMensagens) btnMensagens.style.display = 'block';
                let tabBarraAtiva = document.querySelector('#graf-tabs-barra .graf-tab.active');
                if (tabBarraAtiva && tabBarraAtiva.dataset.view === 'view-raiox' && typeof mudarGrafico === 'function') mudarGrafico('view-notamedia', 'graf-tabs-barra', 'grupo-barra');
                let activeTab = document.querySelector('.tab-content.active');
                if (activeTab && activeTab.id === 'tab-convocacao') mudarAba('tab-dashboard');
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

            // Migra saves antigos do Prestígio da Diretoria (escala 0-10) pra 0-100 — só roda uma
            // vez por save, controlado pelo campo notaDiretoriaEscala100. Só se aplica a saves com
            // diretoria já configurada: um save novo em branco já nasce direto na escala certa
            // (dbPadrao), então não pode passar por essa conta de novo.
            if (config.diretoriaConfigurada && !config.notaDiretoriaEscala100 && typeof config.notaDiretoria === 'number') {
                config.notaDiretoria = normalizarNotaDiretoria(config.notaDiretoria);
                config.notaDiretoriaEscala100 = true;
                salvarDados();
            }

            document.getElementById('header-nome-time').innerText = config.nome;
            document.getElementById('header-nome-tecnico').innerText = config.nomeTecnico || '-';
            document.getElementById('header-temp-ano').innerText = config.temporadaAtual;

            let selectComp = document.getElementById('partida-comp');
            let selectDeclararComp = document.getElementById('declarar-competicao');
            if (selectComp || selectDeclararComp) {
                let comps = currentSave === 'clube'
                    ? ["Liga", "Copa Nacional", "Torneio Continental", "Amistoso", "Outros"]
                    : ["Copa do Mundo", "Eliminatórias", "Copa Continental", "Amistoso", "Outros"];
                if (selectComp) {
                    selectComp.innerHTML = '';
                    comps.forEach(c => selectComp.innerHTML += `<option value="${c}">${c}</option>`);
                }
                if (selectDeclararComp) {
                    selectDeclararComp.innerHTML = '';
                    comps.forEach(c => selectDeclararComp.innerHTML += `<option value="${c}">${c}</option>`);
                }
            }

            if (typeof garantirCondicaoFisicaTodos === 'function') garantirCondicaoFisicaTodos();
            if (typeof garantirCentralMensagens === 'function') garantirCentralMensagens();
            if (typeof garantirCamposElencoTodos === 'function') garantirCamposElencoTodos();
            sanearNumerosDoSave();
            // O termômetro fica no HTML com um valor fixo de exemplo até alguém desenhá-lo:
            // sem esta chamada ele só era atualizado ao abrir o Feed Social.
            if (typeof renderizarTermometroUI === 'function') renderizarTermometroUI();
            if (typeof atualizarBadgeMensagens === 'function') atualizarBadgeMensagens();
            if (typeof renderizarLiderancaUI === 'function' && currentSave === 'clube') renderizarLiderancaUI();
            preencherDatalistJogadores(); document.getElementById('jog-nome-input').value = '';
            atualizarFiltroTemporadas(); mudarAba('tab-dashboard');
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
