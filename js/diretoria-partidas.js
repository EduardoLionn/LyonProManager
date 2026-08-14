        function abrirModalEditarTecnico() {
            document.getElementById('editar-tecnico-nome').value = db[currentSave].nomeTecnico || '';
            document.getElementById('modal-editar-tecnico').style.display = 'flex';
        }

        function salvarEdicaoTecnico() {
            let nome = document.getElementById('editar-tecnico-nome').value.trim();
            if(!nome) return alert("Digite o nome do técnico!");
            if(!nome.includes(' ')) return alert("Digite nome E sobrenome do técnico (ex: Carlo Ancelotti).");
            db[currentSave].nomeTecnico = nome;
            salvarDados();
            ajustarInterfaceSave();
            document.getElementById('modal-editar-tecnico').style.display = 'none';
        }

        // Usado quando o treinador é demitido (modal-demissao): zera só o slot atual (clube OU seleção),
        // mantendo o resto do save intacto, e leva direto pro assistente de Novo Jogo daquele slot.
        async function resetarSave() {
            if(await confirmarModerno(`Tem certeza que deseja APAGAR TODO O PROGRESSO do slot: ${currentSave}?`, "Apagar Todo o Progresso", { perigo: true, textoConfirmar: "Apagar Tudo" })) {
                db[currentSave] = dbPadrao()[currentSave];
                salvarDados();
                let modalDemissao = document.getElementById('modal-demissao');
                if (modalDemissao) modalDemissao.style.display = 'none';
                ajustarInterfaceSave();
            }
        }

        function atualizarDiretoriaUI() {
            let data = db[currentSave];
            if (!data.diretoriaConfigurada) {
                document.getElementById('modal-setup-diretoria').style.display = 'flex';
                // Oculta a continental se for seleção
                let boxCont = document.getElementById('legacy-box-continental');
                if(boxCont) boxCont.style.display = currentSave === 'clube' ? 'flex' : 'none';
                return;
            }
            document.getElementById('diretoria-dashboard').style.display = 'block';

            document.getElementById('dir-media-gasto').innerText = `€${(data.mediaGastoHistorico || 0).toFixed(1)}M`;
            document.getElementById('dir-media-arrecadado').innerText = `€${(data.mediaArrecadadoHistorico || 0).toFixed(1)}M`;
            let notaFormatada = typeof data.notaDiretoria === 'number' ? Math.round(data.notaDiretoria) : 75;
            document.getElementById('dir-nota-diretoria').innerText = `${notaFormatada} / 100`;
            document.getElementById('dash-dir-orcamento').innerText = "€" + (data.orcamento || 0).toFixed(2) + "M";
            document.getElementById('dash-dir-arrecadado-atual').innerText = "€" + (data.arrecadadoAtual || 0).toFixed(2) + "M";
            document.getElementById('dash-dir-gasto-atual').innerText = "€" + (data.gastoAtual || 0).toFixed(2) + "M";
            document.getElementById('dir-objetivos-texto').innerHTML = data.objetivosTemporada || "Nenhuma meta definida.";
            renderizarComandosJogo();
            renderizarChat('diretoria');
        }

        // Função reutilizável: recebe o histórico das últimas 5 temporadas e pede pra IA
        // definir o orçamento inicial + metas da diretoria. Usada tanto pelo assistente de
        // Novo Jogo quanto pelo modal antigo (fallback para saves criados antes dessa versão).
        async function definirMetasDiretoriaIA(mediaGasto, mediaArrecadacao, titulos, posicaoMedia, posicaoCopaMedia, continental) {
            mediaGasto = Number(mediaGasto) || 0;
            mediaArrecadacao = Number(mediaArrecadacao) || 0;
            titulos = Number(titulos) || 0;
            posicaoMedia = Number(posicaoMedia) || 5;
            posicaoCopaMedia = (posicaoCopaMedia || '').toString().trim() || 'Fase inicial';
            continental = currentSave === 'clube' ? (continental || 'Nenhuma') : 'Nenhuma';

            db[currentSave].mediaGastoHistorico = mediaGasto;
            db[currentSave].mediaArrecadadoHistorico = mediaArrecadacao;
            db[currentSave].competicaoContinental = continental;
            db[currentSave].notaDiretoria = 75;
            db[currentSave].notaDiretoriaEscala100 = true;

            let promptIA = `Atue como ${nomeDiretorExibicao()}, o(a) Diretor(a) Executivo(a) do clube/seleção "${db[currentSave].nome}" (Liga/Tier atual: ${db[currentSave].liga}).
            Histórico (5 anos): Gasto Médio: €${mediaGasto}M, Arrecadação Média: €${mediaArrecadacao}M, Títulos: ${titulos}, Posição Média na Liga: ${posicaoMedia}º, Desempenho Médio na Copa Nacional: ${posicaoCopaMedia}. Competição Internacional atual: ${continental}.
            Defina o orçamento inicial e os objetivos. Siga ESTRITAMENTE as regras para NÃO SER GENÉRICO, REDUNDANTE OU IRREAL:
            - CONTEXTO E REALISMO: Se o time está em divisões inferiores ou tem posição média ruim, seja realista. Não exija títulos ou fases avançadas em copas (exija apenas focar na liga ou passar da 1ª fase da copa).
            - DADOS RASTREÁVEIS: O sistema NÃO rastreia idade de jogadores, nem minutos jogados em campo. É PROIBIDO criar metas sobre idade ou minutos. Use apenas métricas visíveis: Gols, Assistências, Saldo de Gols, Contratações, Vendas, Vitórias, e OVR.
            - objLiga1: A meta principal na tabela (ex: Título, Acesso, Top 10, Evitar rebaixamento).
            - objLiga2: Uma meta RASTREÁVEL E DIFERENTE DA PRIMEIRA (ex: Terminar com saldo de gols positivo, Ter o artilheiro, etc. NÃO REPITA A META DA LIGA 1).
            - objCopa: Use o "Desempenho Médio na Copa Nacional" informado como referência de realismo (ex: se historicamente cai nas quartas, não exija título; exija talvez chegar às semifinais). NÃO REPITA OS OBJETIVOS ACIMA.
            - objInternacional: Seja realista conforme o nível do time. NÃO REPITA OS OBJETIVOS ACIMA.
            - objFinanceiro: Um objetivo MATEMÁTICO CLARO baseado nas métricas reais do jogo (Valor Gasto e Valor Arrecadado). Use APENAS exigências como "Arrecadar €X em vendas", "Limitar os gastos a €X" ou "Terminar com Saldo Positivo (Arrecadação maior que Gasto)". NUNCA use termos abstratos como "margem de lucro" ou "lucro de X%".
            Retorne EXATAMENTE um objeto JSON puro (orcamentoLiberado é SEMPRE em milhões de euros, nunca o valor cheio — ex: 30.0 significa €30M, NUNCA escreva 30000000):
            {
              "orcamentoLiberado": 30.0,
              "objLiga1": "texto",
              "objLiga2": "texto",
              "objCopa": "texto",
              "objInternacional": "texto (ou vazio se Nenhuma)",
              "objFinanceiro": "texto"
            }`;

            mostrarCarregandoIA('⏳ A diretoria está definindo o orçamento e as metas...');
            try {
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptIA }] }] })
                });
                const data = await response.json();
                let rawText = data.candidates[0].content.parts[0].text;
                let jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    let res = JSON.parse(jsonMatch[0]);
                    db[currentSave].orcamento = normalizarValorOrcamento(res.orcamentoLiberado) || 20;
                    registrarComandoOrcamento(db[currentSave].orcamento, "Orçamento Inicial da Temporada");
                    let txt = `⚽ Liga: ${res.objLiga1}<br>⚽ Liga (Secundário): ${res.objLiga2}<br>🏆 Copa Nacional: ${res.objCopa}`;
                    if(res.objInternacional && res.objInternacional.trim() !== "") txt += `<br>🌍 Internacional (${continental}): ${res.objInternacional}`;
                    txt += `<br>💰 Finanças: ${res.objFinanceiro}`;
                    db[currentSave].objetivosTemporada = txt;
                    db[currentSave].objetivosEstruturados = {
                        liga1: res.objLiga1 || '',
                        liga2: res.objLiga2 || '',
                        copa: res.objCopa || '',
                        internacional: (res.objInternacional && continental !== 'Nenhuma') ? res.objInternacional : ''
                    };
                }
            } catch(err) {
                db[currentSave].orcamento = 20;
                registrarComandoOrcamento(20, "Orçamento Inicial da Temporada");
                db[currentSave].objetivosTemporada = "⚽ Liga: Garantir permanência<br>🏆 Copas: Disputar com honra<br>💰 Finanças: Não gerar prejuízo";
            }
            esconderCarregandoIA();
            db[currentSave].diretoriaConfigurada = true;
        }

        // Fallback: modal antigo, usado só quando um save já tem "nome" mas ainda não passou
        // pelo novo assistente de Novo Jogo (ex: saves criados antes dessa versão).
        async function salvarSetupDiretoria() {
            let mediaGasto = document.getElementById('legacy-dir-media-gasto').value;
            let mediaArrecadacao = document.getElementById('legacy-dir-media-arrecadacao').value;
            let titulos = document.getElementById('legacy-dir-titulos').value;
            let posicaoMedia = document.getElementById('legacy-dir-posicao').value;
            let posicaoCopaMedia = document.getElementById('legacy-dir-posicao-copa').value;
            let continental = currentSave === 'clube' ? document.getElementById('legacy-dir-continental').value : 'Nenhuma';

            document.getElementById('modal-setup-diretoria').style.display = 'none';
            await definirMetasDiretoriaIA(mediaGasto, mediaArrecadacao, titulos, posicaoMedia, posicaoCopaMedia, continental);
            salvarDados(); atualizarDiretoriaUI();
        }

        // `variacao` continua na mesma escala pequena de sempre (ex: -0.3 a +0.3) — todo o
        // histórico de chamadas espalhado pelo código e nos prompts da IA usa essa escala, então
        // a conversão pra 0-100 (a mesma do jogo) acontece aqui dentro, multiplicando por 10, em
        // vez de mexer em cada chamada.
        function atualizarNotaDiretoria(variacao) {
            if (db[currentSave].notaDiretoria !== undefined && variacao !== 0) {
                db[currentSave].notaDiretoria = Math.max(0, Math.min(100, db[currentSave].notaDiretoria + variacao * 10));
                let elNota = document.getElementById('dir-nota-diretoria');
                if (elNota) elNota.innerText = Math.round(db[currentSave].notaDiretoria) + " / 100";
                registrarComandoPrestigioSeMudou();
            }
        }

        // --- CENTRAL DE COMANDOS PRO JOGO ---
        // Toda vez que o Prestígio ou o Orçamento mudam no site, isso gera uma instrução
        // pra você aplicar manualmente no seu save do EA FC.
        function registrarComandoJogo(texto) {
            let data = db[currentSave];
            if (!data.comandosJogo) data.comandosJogo = [];
            data.comandosJogo.unshift({ texto: texto, temporada: data.temporadaAtual, aplicado: false });
            if (data.comandosJogo.length > 40) data.comandosJogo.length = 40;
            salvarDados();
            renderizarComandosJogo();
        }

        function registrarComandoPrestigioSeMudou() {
            let data = db[currentSave];
            let prestigio = Math.round(data.notaDiretoria || 0);
            if (data.ultimoPrestigioRegistrado === prestigio) return; // já está registrado, evita comando repetido
            data.ultimoPrestigioRegistrado = prestigio;
            registrarComandoJogo(`🎮 Ajuste o Prestígio do Clube no jogo para ${prestigio}/100`);
        }

        function registrarComandoOrcamento(valor, motivo) {
            registrarComandoJogo(`💰 Ajuste o Orçamento de Transferências no jogo para €${Number(valor).toFixed(2)}M (${motivo})`);
            // Aproveita a mudança de orçamento pra também lembrar o prestígio atual, caso ele
            // tenha mudado e ainda não tenha virado um comando por conta própria.
            registrarComandoPrestigioSeMudou();
        }

        function marcarComandoAplicado(index) {
            let data = db[currentSave];
            if (data.comandosJogo && data.comandosJogo[index]) {
                data.comandosJogo[index].aplicado = true;
                salvarDados();
                renderizarComandosJogo();
            }
        }

        function renderizarComandosJogo() {
            let container = document.getElementById('lista-comandos-jogo');
            if (!container) return;
            let data = db[currentSave];
            let pendentes = (data.comandosJogo || []).map((c, i) => Object.assign({}, c, { indexOriginal: i })).filter(c => !c.aplicado);
            if (pendentes.length === 0) {
                container.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">Nenhum comando pendente.</p>';
                return;
            }
            container.innerHTML = pendentes.map(c => `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--input-bg); padding:10px 12px; border-radius:8px;">
                    <span style="font-size:13px;">${c.texto}<br><span style="font-size:11px; color:var(--text-muted);">Temporada ${c.temporada}</span></span>
                    <button onclick="marcarComandoAplicado(${c.indexOriginal})" style="background:var(--primary); color:black; font-size:12px; padding:6px 10px; white-space:nowrap;">✅ Feito</button>
                </div>
            `).join('');
        }

        async function lerImagensIAJogadores(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            let loader = document.getElementById('loader-jogador');
            let loaderText = document.getElementById('loader-jogador-text');
            loader.style.display = "inline-block";
            let listaJogadores = db[currentSave].plantel.filter(p => p.status === 'Ativo').map(p => p.nome).join(', ');

            // 1. ADICIONE A FUNÇÃO DE DELAY AQUI, ANTES DO LOOP
            const delay = ms => new Promise(res => setTimeout(res, ms));

            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if(loaderText) loaderText.innerText = `Lendo imagem ${i + 1} de ${files.length}... aguarde`;
                
                // 2. ADICIONE A PAUSA AQUI DENTRO DO LOOP (Sugiro 1000ms = 1 segundo de pausa)
                if (i > 0) await delay(1000);

                let base64Data = await new Promise((resolve) => {
                    let reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(file);
                });

                // NOVO PROMPT CORRIGIDO
                let prompt = `Analise a tela de estatísticas do jogador. 
                ⚠️ REGRA CRÍTICA 1: IGNORE o nome grande/completo no topo esquerdo. Extraia APENAS o nome abreviado que está na tabela do lado esquerdo (Ex: "J. Carmona").
                ⚠️ REGRA CRÍTICA 2: Verifique se há um ícone de uma pequena BOLA DE FUTEBOL ao lado do nome do jogador na lista da esquerda. Se houver a bolinha, retorne 1 no campo "mvp". Se não houver, retorne 0.
                Procure o nome extraído nesta lista e retorne exatamente como está nela, se existir: [${listaJogadores}].
                Retorne EXATAMENTE este JSON puro sem formatação markdown:
                {"nome": "Nome Abreviado da Tabela", "overall": numero, "nota": numero, "gols": numero, "assistencias": numero, "finalizacoes": numero, "precisaoFinalizacao": numero, "passes": numero, "precisaoPasse": numero, "dribles": numero, "taxaDribles": numero, "dividas": numero, "taxaDivididas": numero, "possesGanhas": numero, "perdasPosse": numero, "faltas": numero, "defesas": numero, "mvp": numero}`;

                try {
                    const response = await fetch(API_URL, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } } ] }] })
                    });
                    const data = await response.json();
                    let rawText = data.candidates[0].content.parts[0].text;
                    let jsonMatch = rawText.match(/\{[\s\S]*\}/);
                    
                    if (jsonMatch) {
                        let stats = JSON.parse(jsonMatch[0]);
                        let nome = stats.nome || "Desconhecido";
                        let p = db[currentSave].plantel.find(x => x.nome.toLowerCase() === nome.toLowerCase());
                        if (p) nome = p.nome;

                        if (!jogadoresPartidaTemp.find(j => j.nome === nome)) {
                            let divTotal = stats.dividas || 0; let taxaDiv = stats.taxaDivididas || 0;
                            let dadosJogador = {
                                idTemp: ++idTempCounter, nome: nome, nota: stats.nota || 7.0, gols: stats.gols || 0, assist: stats.assistencias || 0, fin: stats.finalizacoes || 0, precFin: stats.precisaoFinalizacao || 0, passes: stats.passes || 0, precPasse: stats.precisaoPasse || 0, dribles: stats.dribles || 0, taxaDribles: stats.taxaDribles || 0, dividasTotais: divTotal, taxaDivididas: taxaDiv, dividasGanhas: Math.round(divTotal * (taxaDiv / 100)), posses: stats.possesGanhas || 0, perdasPosse: stats.perdasPosse || 0, faltas: stats.faltas || 0, defesas: stats.defesas || 0, mvp: stats.mvp || 0, ovrAtualizado: stats.overall || (p ? p.ovr : 70)
                            };
                            jogadoresPartidaTemp.push(dadosJogador);
                            if (!p) db[currentSave].plantel.push({ nome: nome, posicao: 'Meio-Campo', ovr: dadosJogador.ovrAtualizado, status: 'Ativo', jogosAvaliacao: 0 });
                            else if (stats.overall && stats.overall > 0) p.ovr = stats.overall;
                        }
                    }
                } catch(e) { console.error("Erro", e); }
            }
            
            // --- NOVA REGRA DO MVP ---
            if (jogadoresPartidaTemp.length > 0) {
                // 1. Descobre qual é a maior nota entre os jogadores lidos
                let maiorNota = Math.max(...jogadoresPartidaTemp.map(j => j.nota));
                
                // 2. Aplica a regra: Só é MVP se tiver a bolinha (mvp == 1) E tiver a maior nota
                jogadoresPartidaTemp.forEach(j => {
                    if (j.mvp === 1 && j.nota === maiorNota) {
                        j.mvp = 1; // Confirma que é o Melhor em Campo
                    } else {
                        j.mvp = 0; // Remove se a IA alucinou a bolinha ou se não tem a maior nota
                    }
                });
            }
            // --------------------------

            if(loaderText) loaderText.innerText = ""; loader.style.display = "none"; renderizarListaTemp(); preencherDatalistJogadores(); event.target.value = ""; 
        }

        async function lerImagemIA(event, tipo) {
            const file = event.target.files[0]; if(!file) return;
            let loader = document.getElementById(`loader-${tipo}`); loader.style.display = "block";
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = async function () {
                const base64Data = reader.result.split(',')[1];
                let prompt = `Leia estatísticas de jogo. O meu time é "${db[currentSave].nome}". Retorne EXATAMENTE este JSON: {"possePro": numero, "posseAdv": numero, "finPro": numero, "finAdv": numero, "golsPro": numero, "golsAdv": numero, "nomeAdv": "Nome", "mando": "Casa" ou "Fora"}`;
                try {
                    const response = await fetch(API_URL, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } } ] }] })
                    });
                    const data = await response.json();
                    let rawText = data.candidates[0].content.parts[0].text;
                    let jsonMatch = rawText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        let stats = JSON.parse(jsonMatch[0]);
                        document.getElementById('gols-pro').value = stats.golsPro || 0; document.getElementById('gols-contra').value = stats.golsAdv || 0;
                        document.getElementById('posse-pro').value = stats.possePro || 0; document.getElementById('posse-adv').value = stats.posseAdv || 0;
                        document.getElementById('fin-pro').value = stats.finPro || 0; document.getElementById('fin-adv').value = stats.finAdv || 0;
                        if(stats.nomeAdv) document.getElementById('adversario').value = stats.nomeAdv;
                        if(stats.mando) document.getElementById('partida-mando').value = stats.mando;
                    }
                    
                    // Mostra automaticamente o painel para o usuário conferir e editar a partida
                    document.getElementById('manual-partida-form').style.display = 'block';
                    let btnVid = document.getElementById('btn-toggle-video');
                    if(btnVid) {
                        btnVid.innerHTML = '👁️ Ocultar Controles';
                        btnVid.style.background = 'transparent';
                        btnVid.style.color = 'var(--primary)';
                        btnVid.style.border = '1px solid var(--primary)';
                    }
                } catch(e) {
                    alert("Não consegui ler essa imagem. Tente novamente ou preencha os campos manualmente.");
                }
                loader.style.display = "none";
            };
        }

        function preencherDadosJogador() {
            let nome = document.getElementById('jog-nome-input').value.trim();
            let jog = db[currentSave].plantel.find(p => p.nome === nome);
            if(jog) { document.getElementById('jog-ovr-atual').value = jog.ovr; document.getElementById('jog-pos').value = jog.posicao; }
        }

        function addJogadorPartida() {
            let nome = document.getElementById('jog-nome-input').value.trim();
            if(!nome) return alert("Selecione ou digite um jogador.");
            if(jogadoresPartidaTemp.find(j => j.nome === nome)) return alert("Já inserido!");
            
            let divTotal = Number(document.getElementById('din-div-total')?.value || 0); let taxaDiv = Number(document.getElementById('din-div-ganhas')?.value || 0);
            let dadosJogador = {
                idTemp: ++idTempCounter, nome: nome, nota: Number(document.getElementById('jog-nota').value), gols: Number(document.getElementById('din-gols')?.value || 0), assist: Number(document.getElementById('din-assist')?.value || 0), fin: Number(document.getElementById('din-fin')?.value || 0), precFin: Number(document.getElementById('din-prec-fin')?.value || 0), passes: Number(document.getElementById('din-passes')?.value || 0), precPasse: Number(document.getElementById('din-prec-passe')?.value || 85), dribles: Number(document.getElementById('din-dribles')?.value || 0), taxaDribles: Number(document.getElementById('din-taxa-drible')?.value || 0), dividasTotais: divTotal, taxaDivididas: taxaDiv, dividasGanhas: Math.round(divTotal * (taxaDiv / 100)), posses: Number(document.getElementById('din-posses')?.value || 0), perdasPosse: Number(document.getElementById('din-perdas-posse')?.value || 0), faltas: Number(document.getElementById('din-faltas')?.value || 0), defesas: Number(document.getElementById('din-defesas')?.value || 0), mvp: document.getElementById('jog-mvp').checked ? 1 : 0
            };
            jogadoresPartidaTemp.push(dadosJogador);
            let o = Number(document.getElementById('jog-ovr-atual').value) || 70; let pos = document.getElementById('jog-pos').value;
            let p = db[currentSave].plantel.find(x => x.nome === nome);
            if(p) { p.ovr = o; p.posicao = pos; } else { db[currentSave].plantel.push({ nome: nome, posicao: pos, ovr: o, status: 'Ativo', jogosAvaliacao: 0 }); }
            renderizarListaTemp(); preencherDatalistJogadores();
            document.getElementById('jog-nota').value = '7.0'; document.getElementById('jog-mvp').checked = false;
        }

        function renderizarListaTemp() {
            let titulo = document.getElementById('titulo-lista-temp');
            if (titulo) titulo.innerText = `Lista de Jogadores nesta Partida (${jogadoresPartidaTemp.length}):`;

            let div = document.getElementById('lista-jogadores-temp');
            div.innerHTML = jogadoresPartidaTemp.map(j => `
                <div style="background:rgba(0,255,136,0.05); border: 1px solid var(--border); border-radius:8px; margin-bottom:10px; padding:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:15px;"><strong>${j.nome}</strong> ${j.mvp ? '⚽ (Melhor em campo)' : ''} | Nota: <span style="color:var(--warning); font-weight:bold;">${j.nota.toFixed(1)}</span></span>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="toggleEditInline(${j.idTemp})" style="padding:6px 10px; background:var(--warning); color:black; border:none; border-radius: 6px; font-weight: bold; cursor:pointer;">✏️</button>
                            <button onclick="removerJogadorTemp(${j.idTemp})" style="padding:6px 10px; background:var(--danger); color:white; border:none; border-radius: 6px; font-weight: bold; cursor:pointer;">X</button>
                        </div>
                    </div>
                    <!-- FORMULÁRIO INLINE -->
                    <div id="edit-inline-${j.idTemp}" style="display:none; margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px;">
                        <div class="grid-5" style="margin-top: 10px;">
                            <div class="linha-form"><label>Nota</label><input type="number" step="0.1" id="inline-nota-${j.idTemp}" value="${j.nota}"></div>
                            <div class="linha-form"><label>Gols</label><input type="number" id="inline-gols-${j.idTemp}" value="${j.gols}"></div>
                            <div class="linha-form"><label>Assist.</label><input type="number" id="inline-assist-${j.idTemp}" value="${j.assist}"></div>
                            <div class="linha-form"><label>Finaliz.</label><input type="number" id="inline-fin-${j.idTemp}" value="${j.fin}"></div>
                            <div class="linha-form"><label>Prec. Fin(%)</label><input type="number" id="inline-prec-fin-${j.idTemp}" value="${j.precFin}"></div>
                        </div>
                        <div class="grid-5" style="margin-top: 5px;">
                            <div class="linha-form"><label>Passes</label><input type="number" id="inline-passes-${j.idTemp}" value="${j.passes}"></div>
                            <div class="linha-form"><label>Prec. Passe(%)</label><input type="number" id="inline-prec-passe-${j.idTemp}" value="${j.precPasse}"></div>
                            <div class="linha-form"><label>Dribles</label><input type="number" id="inline-dribles-${j.idTemp}" value="${j.dribles}"></div>
                            <div class="linha-form"><label>Taxa Drib(%)</label><input type="number" id="inline-taxa-drible-${j.idTemp}" value="${j.taxaDribles}"></div>
                            <div class="linha-form"><label>Divididas</label><input type="number" id="inline-div-total-${j.idTemp}" value="${j.dividasTotais}"></div>
                        </div>
                        <div class="grid-4" style="margin-top: 5px;">
                            <div class="linha-form"><label>Taxa Div(%)</label><input type="number" id="inline-div-ganhas-${j.idTemp}" value="${j.taxaDivididas}"></div>
                            <div class="linha-form"><label>Posses Ganh</label><input type="number" id="inline-posses-${j.idTemp}" value="${j.posses}"></div>
                            <div class="linha-form"><label>Faltas</label><input type="number" id="inline-faltas-${j.idTemp}" value="${j.faltas}"></div>
                            <div class="linha-form"><label>Defesas (GL)</label><input type="number" id="inline-defesas-${j.idTemp}" value="${j.defesas}"></div>
                        </div>
                        <label style="display:flex; align-items:center; gap:8px; margin: 10px 0; color: var(--warning); font-size: 14px; font-weight:bold; cursor:pointer;">
                            <input type="checkbox" id="inline-mvp-${j.idTemp}" style="width:18px; height:18px;" ${j.mvp ? 'checked' : ''}> Eleito Melhor em Campo (MVP)
                        </label>
                        <button style="width:100%; background:var(--accent); color:white; padding: 10px; font-size: 14px; border:none; border-radius:6px; cursor:pointer;" onclick="salvarEditInline(${j.idTemp})">💾 Salvar Alterações do Jogador</button>
                    </div>
                </div>
            `).join('');
        }

        function toggleEditInline(idTemp) {
            let el = document.getElementById('edit-inline-' + idTemp);
            if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        function salvarEditInline(idTemp) {
            let jog = jogadoresPartidaTemp.find(j => j.idTemp === idTemp);
            if(!jog) return;
            jog.nota = Number(document.getElementById('inline-nota-'+idTemp).value);
            jog.gols = Number(document.getElementById('inline-gols-'+idTemp).value);
            jog.assist = Number(document.getElementById('inline-assist-'+idTemp).value);
            jog.fin = Number(document.getElementById('inline-fin-'+idTemp).value);
            jog.precFin = Number(document.getElementById('inline-prec-fin-'+idTemp).value);
            jog.passes = Number(document.getElementById('inline-passes-'+idTemp).value);
            jog.precPasse = Number(document.getElementById('inline-prec-passe-'+idTemp).value);
            jog.dribles = Number(document.getElementById('inline-dribles-'+idTemp).value);
            jog.taxaDribles = Number(document.getElementById('inline-taxa-drible-'+idTemp).value);
            jog.dividasTotais = Number(document.getElementById('inline-div-total-'+idTemp).value);
            jog.taxaDivididas = Number(document.getElementById('inline-div-ganhas-'+idTemp).value);
            jog.dividasGanhas = Math.round(jog.dividasTotais * (jog.taxaDivididas / 100));
            jog.posses = Number(document.getElementById('inline-posses-'+idTemp).value);
            jog.faltas = Number(document.getElementById('inline-faltas-'+idTemp).value);
            jog.defesas = Number(document.getElementById('inline-defesas-'+idTemp).value);
            jog.mvp = document.getElementById('inline-mvp-'+idTemp).checked ? 1 : 0;
            renderizarListaTemp();
        }

        function removerJogadorTemp(idTemp) { jogadoresPartidaTemp = jogadoresPartidaTemp.filter(x => x.idTemp !== idTemp); renderizarListaTemp(); }

        function editarJogadorTemp(idTemp) { toggleEditInline(idTemp); }

        async function salvarPartida() {
            let golsP = Number(document.getElementById('gols-pro').value); let golsC = Number(document.getElementById('gols-contra').value);
            let adv = document.getElementById('adversario').value || "Adversário"; let penaltis = document.getElementById('vitoria-penaltis').checked;
            let diasPassados = parseInt(document.getElementById('partida-dias-proxima')?.value) || 3;
            processarCondicaoFisicaPosPartida(diasPassados, jogadoresPartidaTemp.map(j => j.nome));

            db[currentSave].partidas.push({
                id: Date.now(), temporada: db[currentSave].temporadaAtual, comp: document.getElementById('partida-comp').value, contexto: document.getElementById('partida-contexto').value,
                adversario: adv, mando: document.getElementById('partida-mando').value, golsPro: golsP, golsContra: golsC,
                possePro: Number(document.getElementById('posse-pro').value)||50, posseAdv: Number(document.getElementById('posse-adv').value)||50,
                finPro: Number(document.getElementById('fin-pro').value)||0, finAdv: Number(document.getElementById('fin-adv').value)||0, penaltis: penaltis, jogadores: jogadoresPartidaTemp
            });

            let posseP = Number(document.getElementById('posse-pro').value) || 50;
            let posseA = Number(document.getElementById('posse-adv').value) || 50;
            let finP = Number(document.getElementById('fin-pro').value) || 0;
            
            // --- NOVA MECÂNICA DE PRESTÍGIO POR CONTEXTO E HISTÓRICO ---
            let ligaString = db[currentSave].liga.toLowerCase();
            let isTierAlto = ligaString.includes("premier league") || ligaString.includes("série a") || ligaString.includes("laliga") || ligaString.includes("bundesliga") || ligaString.includes("serie a") || ligaString.includes("ligue 1") || ligaString.includes("tier 1");
            let isTierBaixo = ligaString.includes("league two") || ligaString.includes("league one") || ligaString.includes("série c") || ligaString.includes("série d") || ligaString.includes("3. liga") || ligaString.includes("tier 3") || ligaString.includes("tier 4");

            // Avaliar o momento das últimas 5 partidas (Forma)
            let ultimasPartidasTemp = db[currentSave].partidas.filter(p => p.temporada === db[currentSave].temporadaAtual).slice(-5);
            let qtdDerrotasRecentes = ultimasPartidasTemp.filter(p => p.golsPro < p.golsContra).length;

            let detalheNoticia = "";
            let manchete = "";

            if (golsP > golsC || penaltis) { 
                // Contexto: Vitória
                let ganhoBase = isTierAlto ? 0.08 : (isTierBaixo ? 0.2 : 0.1);
                atualizarNotaDiretoria(ganhoBase); 
                atualizarTermometroTorcida(gerarNumeroAleatorio(2, 6)); // Torcida feliz
                
                let titulosVitoria = [
                    `🔥 VITÓRIA GIGANTE! ${db[currentSave].nome} dá show contra o ${adv}!`,
                    `⚽ TÁTICA PERFEITA: ${db[currentSave].nome} sai de campo com os 3 pontos.`,
                    `👑 DONOS DA BOLA! Vitória incontestável sobre o ${adv}.`,
                    penaltis ? `🧤 HEROICO! ${db[currentSave].nome} avança nos pênaltis em jogo dramático!` : `🚀 ATROPELO! Atuação de gala garante a vitória do ${db[currentSave].nome}.`
                ];
                manchete = titulosVitoria[Math.floor(Math.random() * titulosVitoria.length)];

                let detalhesVitoria = [
                    `A torcida não parou de cantar um minuto! Com <strong>${posseP}% de posse de bola</strong> e massacrando com <strong>${finP} finalizações</strong>, o treinador mostrou que entende do riscado. O vestiário está em festa e a confiança lá no alto!`,
                    `Um verdadeiro nó tático! A equipe engoliu o adversário, controlando as ações e mostrando letalidade na frente. ${penaltis ? "Na disputa de pênaltis, nossos batedores foram frios e garantiram a festa!" : "Três pontos fundamentais para o planejamento da temporada."}`,
                    `Quem viu, viu! Uma partida sólida onde o sistema defensivo funcionou e o ataque foi eficiente. Criar <strong>${finP} chances</strong> não é para qualquer um. O projeto do Manager está rendendo frutos impressionantes.`
                ];
                detalheNoticia = detalhesVitoria[Math.floor(Math.random() * detalhesVitoria.length)];
                adicionarNoticiaAutomatica(manchete, detalheNoticia); 
            } 
            else if (golsC > golsP) { 
                // Contexto: Derrota
                let impactoDerrota = isTierAlto ? -0.2 : (isTierBaixo ? -0.05 : -0.1);
                if (qtdDerrotasRecentes >= 2) impactoDerrota *= 1.5; 
                atualizarNotaDiretoria(impactoDerrota); 
                atualizarTermometroTorcida(-gerarNumeroAleatorio(3, 8)); // Torcida pistola
                
                let titulosDerrota = [
                    `❌ DECEPÇÃO: ${db[currentSave].nome} tropeça feio contra o ${adv}.`,
                    `📉 ALERTA LIGADO! Derrota dolorosa levanta dúvidas sobre a tática.`,
                    `⚠️ NOITE DESASTROSA! Equipe é superada e diretoria cobra reações.`,
                    `😠 TORCIDA NA BRONCA: Desempenho abaixo do esperado resulta em derrota.`
                ];
                manchete = titulosDerrota[Math.floor(Math.random() * titulosDerrota.length)];

                let detalhesDerrota = [
                    `Infelizmente não foi o nosso dia. O adversário controlou <strong>${posseA}% da posse</strong> e expôs falhas bizarras no nosso sistema. Precisamos urgentemente corrigir a marcação e a transição. Vão chover críticas amanhã...`,
                    `Um banho de água fria nos torcedores. Mesmo tentando atacar com <strong>${finP} chutes</strong>, faltou pontaria e sobrou espaço na zaga. O treinador terá muito trabalho durante a semana para resgatar a moral dos jogadores.`,
                    `Apagão em campo! A equipe pareceu desconcentrada e foi engolida pela proposta de jogo do ${adv}. Reuniões tensas no vestiário são esperadas após esse resultado terrível.`
                ];
                detalheNoticia = detalhesDerrota[Math.floor(Math.random() * detalhesDerrota.length)];
                adicionarNoticiaAutomatica(manchete, detalheNoticia); 
            } 
            else { 
                // Contexto: Empate
                let impactoEmpate = isTierAlto ? -0.05 : (isTierBaixo ? 0.05 : 0.0);
                atualizarNotaDiretoria(impactoEmpate);
                atualizarTermometroTorcida(isTierAlto ? -2 : 1); // Empate oscila a torcida
                
                let titulosEmpate = [
                    `➖ TUDO IGUAL! Empate truncado entre ${db[currentSave].nome} e ${adv}.`,
                    `⚖️ MUITA TRANSPIRAÇÃO, POUCA INSPIRAÇÃO: Jogo termina empatado.`,
                    `🧱 PAREDÕES! Defesas brilham e duelo termina sem vencedor.`
                ];
                manchete = titulosEmpate[Math.floor(Math.random() * titulosEmpate.length)];

                let detalhesEmpate = [
                    `Um confronto amarrado no meio-campo! Com <strong>${posseP}% de posse</strong> para nós, o jogo foi um verdadeiro xadrez tático. Faltou aquele último passe para furar o bloqueio adversário e sair com os 3 pontos, mas a equipe mostrou brio.`,
                    `Sabor agridoce ao apito final. O time até criou <strong>${finP} chances</strong>, mas esbarrou num dia pouco inspirado dos atacantes. Um ponto conquistado ou dois perdidos? A imprensa local já começa a debater.`,
                    `Equilíbrio puro! Nenhuma das equipes conseguiu se impor totalmente. Um empate que deixa lições claras sobre onde o time precisa evoluir para quebrar linhas de defesas fechadas.`
                ];
                detalheNoticia = detalhesEmpate[Math.floor(Math.random() * detalhesEmpate.length)];
                adicionarNoticiaAutomatica(manchete, detalheNoticia); 
            }

            // --- APLICA GATILHOS DE DEMISSÃO ---
            checarRiscoDemissao();
            
            // Gera a repercussão do jogo na Rede Social
            gerarPostsSocial("Pós-Jogo contra o " + adv);

            // Se havia uma partida declarada no Auxiliar Técnico pra esse jogo, fecha o ciclo:
            // avaliação pós-jogo, arquivo no histórico e limpa a partida em aberto.
            let tinhaPartidaAuxiliar = !!db[currentSave].partidaAuxiliar;
            if (tinhaPartidaAuxiliar && typeof finalizarPartidaAuxiliar === 'function') {
                mostrarCarregandoIA('⏳ O Auxiliar Técnico está avaliando a partida...');
                await finalizarPartidaAuxiliar(golsP, golsC, adv);
                esconderCarregandoIA();
            }

            salvarDados(); jogadoresPartidaTemp = []; renderizarListaTemp(); document.getElementById('vitoria-penaltis').checked = false;
            contadorPartidasEvento++; if(contadorPartidasEvento >= limitePartidasEvento) { gerarEventoAleatorio(); contadorPartidasEvento = 0; limitePartidasEvento = gerarNumeroAleatorio(8, 14); } else { alert(tinhaPartidaAuxiliar ? "Partida salva! Confira a avaliação do Auxiliar Técnico no chat." : "Partida salva!"); }
            atualizarFiltroTemporadas(); desenharGraficos(); preencherDatalistJogadores();
        }

