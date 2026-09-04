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
            renderizarObjetivosStatus();
            document.getElementById('dash-dir-arrecadado-atual').innerText = "€" + (data.arrecadadoAtual || 0).toFixed(2) + "M";
            document.getElementById('dash-dir-gasto-atual').innerText = "€" + (data.gastoAtual || 0).toFixed(2) + "M";
            document.getElementById('dir-objetivos-texto').innerHTML = data.objetivosTemporada || "Nenhuma meta definida.";
            renderizarChat('diretoria');
        }

        // Só re-renderiza o valor já em cache (data.objetivosStatus) — nunca chama a IA sozinho.
        // A avaliação em si só roda quando o treinador clica no 🔄 (avaliarObjetivosTemporada),
        // pra não gastar cota de IA toda vez que a aba Diretoria é aberta/re-renderizada.
        function renderizarObjetivosStatus() {
            let el = document.getElementById('dash-dir-objetivos-status');
            if (!el) return;
            let status = db[currentSave] && db[currentSave].objetivosStatus;
            el.innerText = status ? `${status.cumpridas} de ${status.total} em dia` : '—';
            el.title = status && status.resumo ? status.resumo : 'Clique no 🔄 pra avaliar com o Auxiliar';
        }

        // Objetivos Sendo Cumpridos (pedido do treinador): o orçamento deixou de ser um limite
        // real — o que mede o sucesso da temporada agora são as METAS já definidas em
        // objetivosTemporada (texto livre, gerado no início da temporada por definirMetasDiretoriaIA).
        // Essa função pede pro Auxiliar ler essas metas + o contexto atual do time (momento,
        // posição na liga/copa, etc.) e devolver quantas delas já estão "em dia" agora — o mesmo
        // valor que fica congelado como resultado final quando a temporada é concluída (ver
        // concluirTemporada/finalizarTemporada).
        async function avaliarObjetivosTemporada() {
            let d = db[currentSave];
            if (!d || !d.nome) return;
            let metasTexto = (d.objetivosTemporada || '').replace(/<br\s*\/?>/gi, ' | ').trim();
            if (!metasTexto) {
                d.objetivosStatus = { total: 0, cumpridas: 0, resumo: 'Nenhuma meta definida.' };
                salvarDados(); renderizarObjetivosStatus();
                return;
            }

            let el = document.getElementById('dash-dir-objetivos-status');
            if (el) el.innerText = '⏳ Avaliando...';

            try {
                let promptIA = `Você é ${(typeof nomeAuxiliarExibicao === 'function') ? nomeAuxiliarExibicao() : 'o Auxiliar Técnico'} do "${d.nome}". A diretoria definiu estas metas para a temporada (cada trecho separado por "|" é uma meta distinta): "${metasTexto}"

                ${(typeof gerarResumoContexto === 'function') ? gerarResumoContexto() : ''}

                Com base no momento atual do time (posição/aproveitamento na liga, desempenho na copa, situação financeira, etc.), avalie CADA meta individualmente como cumprida/em dia ou não. Conte quantas metas, do total, estão hoje cumpridas ou em bom caminho pra serem cumpridas até o fim da temporada.

                Responda APENAS com um JSON puro, sem texto fora dele, neste formato exato:
                { "total": <número de metas>, "cumpridas": <quantas estão em dia>, "resumo": "<1-2 frases explicando o placar>" }`;

                const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
                let bruto = (data.candidates[0].content.parts[0].text || '').trim();
                let match = bruto.match(/\{[\s\S]*\}/);
                if (match) {
                    let json = JSON.parse(match[0]);
                    let total = Math.max(0, Math.round(Number(json.total)) || 0);
                    let cumpridas = Math.max(0, Math.min(total, Math.round(Number(json.cumpridas)) || 0));
                    d.objetivosStatus = { total, cumpridas, resumo: String(json.resumo || '').trim() };
                    salvarDados();
                }
            } catch (e) {
                // Falha na IA não trava a tela — o valor em cache (se houver) continua exibido.
            }
            renderizarObjetivosStatus();
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

            // Este é o primeiro contato do treinador com o jogo — cair no fallback genérico logo
            // de cara ("Garantir permanência"/"Disputar com honra" pra qualquer time, sempre
            // igual) é a pior primeira impressão possível, e não existe nenhum botão depois pra
            // regenerar essas metas. Por isso, uma falha (timeout, rede, resposta sem JSON) tenta
            // de novo UMA vez antes de desistir e usar o fallback — só aqui, não em chamarIA()
            // genericamente, pra não duplicar custo de IA em todas as outras 13 telas que a usam.
            async function tentarGerarMetas() {
                const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
                let rawText = data.candidates[0].content.parts[0].text;
                let jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('Resposta da IA sem JSON.');
                return JSON.parse(jsonMatch[0]);
            }

            let res = null;
            try {
                res = await tentarGerarMetas();
            } catch (e1) {
                try {
                    res = await tentarGerarMetas();
                } catch (e2) {
                    res = null;
                }
            }

            if (res) {
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
            } else {
                // Fallback data-driven (nunca a IA falhando duas vezes deveria gerar o MESMO texto
                // genérico pra um time de ponta e um time em situação ruim) — usa a posição média
                // na liga/copa já informada pra pelo menos dar um objetivo minimamente coerente.
                let metaLiga = posicaoMedia <= 3 ? 'Brigar pelo título da liga' : posicaoMedia <= 8 ? 'Terminar entre os 8 primeiros' : 'Garantir a permanência na divisão';
                let metaCopa = /fase inicial|primeira fase|não disputad/i.test(posicaoCopaMedia) ? 'Passar da 1ª fase da Copa Nacional' : `Repetir ou superar o desempenho de "${posicaoCopaMedia}" na Copa Nacional`;
                db[currentSave].orcamento = Math.max(5, Math.round(mediaGasto * 0.6 * 10) / 10) || 20;
                registrarComandoOrcamento(db[currentSave].orcamento, "Orçamento Inicial da Temporada");
                db[currentSave].objetivosTemporada = `⚽ Liga: ${metaLiga}<br>🏆 Copas: ${metaCopa}<br>💰 Finanças: Terminar a temporada com saldo positivo (arrecadação maior que gasto)`;
                db[currentSave].objetivosEstruturados = { liga1: metaLiga, liga2: '', copa: metaCopa, internacional: '' };
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
            let data = db[currentSave];
            if (!data) return;
            // A variação pode chegar da IA como string, null ou campo faltando. Sem saneamento
            // aqui, "undefined * 10" grava NaN no prestígio e trava o indicador pra sempre.
            // O teto de ±3 cobre o pior caso legítimo (avaliação de fim de temporada, ±0,4 por
            // objetivo) e barra qualquer valor absurdo.
            let delta = numeroNaFaixa(variacao, -3, 3, 0);
            if (delta === 0) return;
            let atual = numeroNaFaixa(data.notaDiretoria, 0, 100, 75);
            data.notaDiretoria = Math.max(0, Math.min(100, atual + delta * 10));
            let elNota = document.getElementById('dir-nota-diretoria');
            if (elNota) elNota.innerText = Math.round(data.notaDiretoria) + " / 100";
            registrarComandoPrestigioSeMudou();
        }

        // --- CENTRAL DE COMANDOS PRO JOGO ---
        // Toda vez que o Prestígio ou o Orçamento mudam no site, isso gera uma instrução
        // pra você aplicar manualmente no seu save do EA FC. `categoria` identifica o "tipo" do
        // comando (ex: 'prestigio', 'orcamento') — se já existir um comando pendente da mesma
        // categoria, ele é atualizado no lugar em vez de empilhar um novo a cada pontinho que
        // muda; só o valor mais recente importa, já que é pra aplicar manualmente uma vez só.
        function registrarComandoJogo(texto, categoria) {
            let data = db[currentSave];
            if (!data.comandosJogo) data.comandosJogo = [];
            let existente = categoria ? data.comandosJogo.find(c => c.categoria === categoria && !c.aplicado) : null;
            if (existente) {
                existente.texto = texto;
                existente.temporada = data.temporadaAtual;
            } else {
                data.comandosJogo.unshift({ texto: texto, categoria: categoria || null, temporada: data.temporadaAtual, aplicado: false });
                if (data.comandosJogo.length > 40) data.comandosJogo.length = 40;
            }
            salvarDados();
            renderizarComandosJogo();
        }

        function registrarComandoPrestigioSeMudou() {
            let data = db[currentSave];
            let prestigio = Math.round(data.notaDiretoria || 0);
            if (data.ultimoPrestigioRegistrado === prestigio) return; // já está registrado, evita comando repetido
            data.ultimoPrestigioRegistrado = prestigio;
            registrarComandoJogo(`🎮 Ajuste o Prestígio do Clube no jogo para ${prestigio}/100`, 'prestigio');
        }

        function registrarComandoOrcamento(valor, motivo) {
            registrarComandoJogo(`💰 Ajuste o Orçamento de Transferências no jogo para €${Number(valor).toFixed(2)}M (${motivo})`, 'orcamento');
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

        // Cumulativo (pedido do treinador, na mudança de lugar Diretoria → Mensagens): os
        // comandos pendentes continuam no topo, acionáveis, mas os já aplicados não somem mais
        // — ficam listados embaixo como histórico, riscados, até o limite de 40 itens no save
        // (registrarComandoJogo já cuida desse teto).
        function renderizarComandosJogo() {
            let container = document.getElementById('lista-comandos-jogo');
            if (!container) return;
            let data = db[currentSave];
            let todos = (data.comandosJogo || []).map((c, i) => Object.assign({}, c, { indexOriginal: i }));
            let pendentes = todos.filter(c => !c.aplicado);
            let aplicados = todos.filter(c => c.aplicado);

            if (todos.length === 0) {
                container.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">Nenhum comando pendente.</p>';
                return;
            }

            let htmlPendentes = pendentes.map(c => `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--input-bg); padding:10px 12px; border-radius:8px;">
                    <span style="font-size:13px;">${c.texto}<br><span style="font-size:11px; color:var(--text-muted);">Temporada ${c.temporada}</span></span>
                    <button onclick="marcarComandoAplicado(${c.indexOriginal})" style="background:var(--primary); color:black; font-size:12px; padding:6px 10px; white-space:nowrap;">✅ Feito</button>
                </div>
            `).join('') || '<p style="font-size:13px; color:var(--text-muted);">Nenhum comando pendente.</p>';

            let htmlAplicados = aplicados.length ? `
                <p style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:bold; margin:16px 0 8px 0;">Histórico</p>
                ${aplicados.map(c => `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; background:transparent; padding:8px 12px; border-radius:8px; opacity:0.6;">
                        <span style="font-size:12px; text-decoration:line-through;">${c.texto}<br><span style="font-size:11px; text-decoration:none;">Temporada ${c.temporada}</span></span>
                        <span style="font-size:12px;">✅</span>
                    </div>
                `).join('')}
            ` : '';

            container.innerHTML = htmlPendentes + htmlAplicados;
        }

        // Cache de imagens que falharam na leitura da IA, guardando o base64 já convertido — o
        // "🔄 Tentar Novamente" reenvia exatamente esse mesmo conteúdo pra IA, sem pedir pro
        // treinador escolher o arquivo de novo (reclamação: "reduz a chance da IA não ler uma
        // imagem, eu clico em repetir e ele lê de novo, sem precisar enviar o arquivo de novo").
        let falhasLeituraImagem = [];
        let falhaIdCounter = 0;

        function renderizarFalhasLeituraImagem() {
            ['falhas-leitura-jogador', 'falhas-leitura-partida'].forEach(containerId => {
                let el = document.getElementById(containerId);
                if (!el) return;
                let doContainer = falhasLeituraImagem.filter(f => f.containerId === containerId);
                el.innerHTML = doContainer.map(f => `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; background:rgba(226,75,75,0.1); border:1px solid var(--danger); border-radius:8px; padding:8px 12px; margin-top:8px; font-size:12px;">
                        <span>❌ ${f.descricao}</span>
                        <button style="background:var(--danger); color:white; padding:5px 10px; font-size:11px; border:none; border-radius:5px; cursor:pointer;" onclick="tentarNovamenteLeituraImagem(${f.id})">🔄 Tentar Novamente</button>
                    </div>`).join('');
            });
        }

        async function tentarNovamenteLeituraImagem(id) {
            let falha = falhasLeituraImagem.find(f => f.id === id);
            if (!falha) return;
            falhasLeituraImagem = falhasLeituraImagem.filter(f => f.id !== id);
            renderizarFalhasLeituraImagem();
            await falha.tentar();
        }

        // Lê UMA imagem (base64 já convertido) e tenta encaixar o jogador na lista temporária.
        // Usada tanto no lote inicial quanto pelo "Tentar Novamente" — se falhar de novo, volta
        // pra fila de falhas em vez de exigir reenvio do arquivo.
        //
        // O goleiro manda DOIS prints no MESMO lote (resumo + aba GL, que só existe pra ele) — a
        // IA agora identifica qual tela é cada imagem ("tela": "resumo" ou "gl") em vez de tratar
        // o print da aba GL como se fosse outro jogador. A ordem de upload não importa: se o print
        // "gl" chegar antes do "resumo" (ou vice-versa), o valor de defesas fica em
        // defesasPendentesGoleiro até o outro print do mesmo goleiro aparecer no lote.
        async function lerUmaImagemJogador(base64Data, mimeType, nomeArquivo, listaJogadores) {
            let prompt = `Analise esta tela de estatísticas de UM jogador de uma partida de futebol (EA FC). Ela pode ser de UMA de duas telas diferentes do mesmo jogo — identifique qual é:
            - Tela "resumo": cabeçalho "Desempenho individual", aba "Resumo" selecionada (linha de abas: Resumo | Posse de bola | Finalizações | Passes | Defesa | GL). Mostra "Nota total: X,X" e uma tabela geral (Gols, Assistências, Finalizações, Passes, Dribles, Divididas, Posses de bola, Faltas, Distâncias etc.) — esta tela NUNCA mostra "Defesas".
            - Tela "gl": é a aba GL do MESMO goleiro, mostra "Nota de GL: X,X" e uma tabela "DEFESAS (GERAL)" com Finalizações contra, Finalizações certas, Defesas, Gols sofridos, Taxa de defesas etc. Só existe pra goleiro.
            ⚠️ REGRA CRÍTICA 1: IGNORE o nome grande/completo no topo esquerdo. Extraia APENAS o nome abreviado que está na tabela do lado esquerdo (Ex: "J. Carmona").
            ⚠️ REGRA CRÍTICA 2: Verifique se há um ícone de uma pequena BOLA DE FUTEBOL ao lado do nome do jogador na lista da esquerda. Se houver a bolinha, retorne 1 no campo "mvp". Se não houver, retorne 0. Se for a tela "gl", sempre retorne 0 neste campo.
            ⚠️ REGRA CRÍTICA 3: Na tela "resumo", "distanciaPercorrida" e "distanciaCorrida" são o PRIMEIRO número de cada linha "Distância percorr. x média do time (km)" e "Distância corrida x média do time (km)" — é a distância do PRÓPRIO jogador, não a média do time.
            ⚠️ REGRA CRÍTICA 4: Se for a tela "gl", preencha SÓ "tela", "nome" e "defesas" (o número da linha "Defesas" da tabela DEFESAS (GERAL) — NÃO é "Finalizações contra" nem "Gols sofridos"). Deixe todos os outros campos como 0.
            Procure o nome extraído nesta lista e retorne exatamente como está nela, se existir: [${listaJogadores}].
            Retorne EXATAMENTE este JSON puro sem formatação markdown:
            {"tela": "resumo ou gl", "nome": "Nome Abreviado da Tabela", "overall": numero, "nota": numero, "gols": numero, "assistencias": numero, "finalizacoes": numero, "precisaoFinalizacao": numero, "passes": numero, "precisaoPasse": numero, "dribles": numero, "taxaDribles": numero, "dividas": numero, "taxaDivididas": numero, "possesGanhas": numero, "perdasPosse": numero, "faltas": numero, "defesas": numero, "distanciaPercorrida": numero, "distanciaCorrida": numero, "mvp": numero}`;

            const data = await chamarIA({ contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } } ] }] });
            let rawText = data.candidates[0].content.parts[0].text;
            let jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Resposta da IA não trouxe um JSON reconhecível.');

            let stats = JSON.parse(jsonMatch[0]);
            let nome = stats.nome || "Desconhecido";
            let p = db[currentSave].plantel.find(x => x.nome.toLowerCase() === nome.toLowerCase());
            if (p) nome = p.nome;

            // Print da aba GL: não é um jogador novo, é o segundo print do MESMO goleiro — só funde
            // o total de defesas no registro dele, criado pelo print "resumo" (já lido ou ainda por
            // vir no mesmo lote, em qualquer ordem).
            if (stats.tela === 'gl') {
                let existente = jogadoresPartidaTemp.find(j => j.nome === nome);
                if (existente) existente.defesas = stats.defesas || 0;
                else defesasPendentesGoleiro[nome] = stats.defesas || 0;
                return;
            }

            if (!jogadoresPartidaTemp.find(j => j.nome === nome)) {
                let divTotal = stats.dividas || 0; let taxaDiv = stats.taxaDivididas || 0;
                let defesasJaLidas = defesasPendentesGoleiro[nome];
                let dadosJogador = {
                    idTemp: ++idTempCounter, nome: nome, nota: stats.nota || 7.0, gols: stats.gols || 0, assist: stats.assistencias || 0, fin: stats.finalizacoes || 0, precFin: stats.precisaoFinalizacao || 0, passes: stats.passes || 0, precPasse: stats.precisaoPasse || 0, dribles: stats.dribles || 0, taxaDribles: stats.taxaDribles || 0, dividasTotais: divTotal, taxaDivididas: taxaDiv, dividasGanhas: Math.round(divTotal * (taxaDiv / 100)), posses: stats.possesGanhas || 0, perdasPosse: stats.perdasPosse || 0, faltas: stats.faltas || 0, defesas: (typeof defesasJaLidas === 'number') ? defesasJaLidas : (stats.defesas || 0), distanciaPercorrida: stats.distanciaPercorrida || 0, distanciaCorrida: stats.distanciaCorrida || 0, mvp: stats.mvp || 0, ovrAtualizado: stats.overall || (p ? p.ovr : 70)
                };
                if (typeof defesasJaLidas === 'number') delete defesasPendentesGoleiro[nome];
                jogadoresPartidaTemp.push(dadosJogador);
                if (!p) {
                    let novoP = { nome: nome, posicao: 'Meio-Campo', ovr: dadosJogador.ovrAtualizado, status: 'Ativo', jogosAvaliacao: 0 };
                    if (typeof garantirCamposElenco === 'function') garantirCamposElenco(novoP);
                    db[currentSave].plantel.push(novoP);
                } else if (stats.overall && stats.overall > 0) p.ovr = stats.overall;
            }
        }

        // Monta um item de "falha" com sua própria função de retry — se a nova tentativa falhar
        // de novo, o item se recria (mesmo id) e volta pra fila, então "Tentar Novamente" sempre
        // reflete o estado mais atual sem precisar de arguments.callee nem duplicar a lógica.
        function criarFalhaLeituraJogador(base64Data, file, listaJogadores) {
            let idFalha = ++falhaIdCounter;
            return {
                id: idFalha, containerId: 'falhas-leitura-jogador', descricao: `Não consegui ler "${file.name}".`,
                tentar: async () => {
                    let loaderRetry = document.getElementById('loader-jogador'); if (loaderRetry) loaderRetry.style.display = 'inline-block';
                    try {
                        await lerUmaImagemJogador(base64Data, file.type, file.name, listaJogadores);
                        aplicarRegraMvp(); renderizarListaTemp(); preencherDatalistJogadores();
                    } catch(e2) {
                        console.error("Erro na nova tentativa", e2);
                        let novaFalha = criarFalhaLeituraJogador(base64Data, file, listaJogadores);
                        novaFalha.id = idFalha; // mantém o mesmo id, é a mesma falha
                        falhasLeituraImagem.push(novaFalha);
                    } finally {
                        renderizarFalhasLeituraImagem();
                        if (loaderRetry) loaderRetry.style.display = 'none';
                    }
                }
            };
        }

        function aplicarRegraMvp() {
            if (jogadoresPartidaTemp.length === 0) return;
            // 1. Descobre qual é a maior nota entre os jogadores lidos
            let maiorNota = Math.max(...jogadoresPartidaTemp.map(j => j.nota));
            // 2. Só é MVP se tiver a bolinha (mvp == 1) E tiver a maior nota
            jogadoresPartidaTemp.forEach(j => { j.mvp = (j.mvp === 1 && j.nota === maiorNota) ? 1 : 0; });
        }

        async function lerImagensIAJogadores(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            let loader = document.getElementById('loader-jogador');
            let loaderText = document.getElementById('loader-jogador-text');
            loader.style.display = "inline-block";
            let listaJogadores = db[currentSave].plantel.filter(p => p.status === 'Ativo').map(p => p.nome).join(', ');

            const delay = ms => new Promise(res => setTimeout(res, ms));

            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if(loaderText) loaderText.innerText = `Lendo imagem ${i + 1} de ${files.length}... aguarde`;
                if (i > 0) await delay(1000);

                let base64Data = await new Promise((resolve) => {
                    let reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(file);
                });

                try {
                    await lerUmaImagemJogador(base64Data, file.type, file.name, listaJogadores);
                } catch(e) {
                    console.error("Erro ao ler imagem do jogador", e);
                    falhasLeituraImagem.push(criarFalhaLeituraJogador(base64Data, file, listaJogadores));
                }
            }

            aplicarRegraMvp();
            renderizarFalhasLeituraImagem();
            if(loaderText) loaderText.innerText = ""; loader.style.display = "none"; renderizarListaTemp(); preencherDatalistJogadores(); event.target.value = "";
        }

        // Segundo print, exclusivo do goleiro: o resumo geral (lerImagensIAJogadores) não traz
        // as defesas dele na partida — essa estatística mora numa tela própria dentro do jogo.
        // Aqui só funde o número de defesas no registro já existente, sem tocar no resto da ficha.
        async function lerDefesasGoleiroIA(event, idTemp) {
            const file = event.target.files[0];
            event.target.value = '';
            if (!file) return;

            let jogador = jogadoresPartidaTemp.find(j => j.idTemp === idTemp);
            if (!jogador) return;

            let loader = document.getElementById('loader-jogador');
            let loaderText = document.getElementById('loader-jogador-text');
            if (loader) loader.style.display = 'inline-block';
            if (loaderText) loaderText.innerText = `Lendo defesas de ${jogador.nome}...`;

            try {
                let base64Data = await new Promise((resolve) => {
                    let reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(file);
                });

                let prompt = `Analise esta tela de estatísticas de GOLEIRO de uma partida de futebol. Encontre o número de DEFESAS (saves) que o goleiro fez na partida.
                Retorne EXATAMENTE este JSON puro sem formatação markdown: {"defesas": numero}`;

                const data = await chamarIA({ contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } } ] }] });
                let rawText = data.candidates[0].content.parts[0].text;
                let jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    let stats = JSON.parse(jsonMatch[0]);
                    if (typeof stats.defesas === 'number') {
                        jogador.defesas = stats.defesas;
                        renderizarListaTemp();
                    }
                }
            } catch (e) {
                console.error('Erro ao ler defesas do goleiro', e);
                alert('Não consegui ler o print das defesas. Tente de novo ou preencha manualmente.');
            } finally {
                if (loaderText) loaderText.innerText = '';
                if (loader) loader.style.display = 'none';
            }
        }

        async function processarLeituraPlacar(base64Data, mimeType) {
            let prompt = `Leia estatísticas de jogo. O meu time é "${db[currentSave].nome}". Retorne EXATAMENTE este JSON: {"possePro": numero, "posseAdv": numero, "finPro": numero, "finAdv": numero, "golsPro": numero, "golsAdv": numero, "nomeAdv": "Nome", "mando": "Casa" ou "Fora"}`;
            const data = await chamarIA({ contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } } ] }] });
            let rawText = data.candidates[0].content.parts[0].text;
            let jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Resposta da IA não trouxe um JSON reconhecível.');

            let stats = JSON.parse(jsonMatch[0]);
            document.getElementById('gols-pro').value = stats.golsPro || 0; document.getElementById('gols-contra').value = stats.golsAdv || 0;
            document.getElementById('posse-pro').value = stats.possePro || 0; document.getElementById('posse-adv').value = stats.posseAdv || 0;
            document.getElementById('fin-pro').value = stats.finPro || 0; document.getElementById('fin-adv').value = stats.finAdv || 0;
            // O adversário já foi declarado ao iniciar a partida (aba Salvar Partida);
            // não há mais campo #adversario aqui pra sobrescrever.
            let selMandoPrint = document.getElementById('partida-mando');
            if(stats.mando && selMandoPrint) selMandoPrint.value = stats.mando;

            // Mostra automaticamente o painel para o usuário conferir e editar a partida
            document.getElementById('manual-partida-form').style.display = 'block';
            let btnVid = document.getElementById('btn-toggle-video');
            if(btnVid) {
                btnVid.innerHTML = '👁️ Ocultar Controles';
                btnVid.style.background = 'transparent';
                btnVid.style.color = 'var(--primary)';
                btnVid.style.border = '1px solid var(--primary)';
            }
        }

        // Mesma ideia de criarFalhaLeituraJogador: guarda o base64 já convertido pra "Tentar
        // Novamente" reenviar pra IA sem pedir o arquivo de novo.
        function criarFalhaLeituraPlacar(base64Data, mimeType, tipo, nomeArquivo) {
            let idFalha = ++falhaIdCounter;
            return {
                id: idFalha, containerId: 'falhas-leitura-partida', descricao: `Não consegui ler "${nomeArquivo}".`,
                tentar: async () => {
                    let loaderRetry = document.getElementById(`loader-${tipo}`); if (loaderRetry) loaderRetry.style.display = 'block';
                    try {
                        await processarLeituraPlacar(base64Data, mimeType);
                    } catch(e2) {
                        console.error("Erro na nova tentativa (placar)", e2);
                        let novaFalha = criarFalhaLeituraPlacar(base64Data, mimeType, tipo, nomeArquivo);
                        novaFalha.id = idFalha;
                        falhasLeituraImagem.push(novaFalha);
                    } finally {
                        renderizarFalhasLeituraImagem();
                        if (loaderRetry) loaderRetry.style.display = 'none';
                    }
                }
            };
        }

        async function lerImagemIA(event, tipo) {
            const file = event.target.files[0]; if(!file) return;
            let loader = document.getElementById(`loader-${tipo}`); loader.style.display = "block";
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = async function () {
                const base64Data = reader.result.split(',')[1];
                try {
                    await processarLeituraPlacar(base64Data, file.type);
                } catch(e) {
                    console.error("Erro ao ler imagem do placar", e);
                    falhasLeituraImagem.push(criarFalhaLeituraPlacar(base64Data, file.type, tipo, file.name));
                    renderizarFalhasLeituraImagem();
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
                idTemp: ++idTempCounter, nome: nome, nota: Number(document.getElementById('jog-nota').value), gols: Number(document.getElementById('din-gols')?.value || 0), assist: Number(document.getElementById('din-assist')?.value || 0), fin: Number(document.getElementById('din-fin')?.value || 0), precFin: Number(document.getElementById('din-prec-fin')?.value || 0), passes: Number(document.getElementById('din-passes')?.value || 0), precPasse: Number(document.getElementById('din-prec-passe')?.value || 85), dribles: Number(document.getElementById('din-dribles')?.value || 0), taxaDribles: Number(document.getElementById('din-taxa-drible')?.value || 0), dividasTotais: divTotal, taxaDivididas: taxaDiv, dividasGanhas: Math.round(divTotal * (taxaDiv / 100)), posses: Number(document.getElementById('din-posses')?.value || 0), perdasPosse: Number(document.getElementById('din-perdas-posse')?.value || 0), faltas: Number(document.getElementById('din-faltas')?.value || 0), defesas: Number(document.getElementById('din-defesas')?.value || 0), distanciaPercorrida: Number(document.getElementById('din-dist-percorrida')?.value || 0), distanciaCorrida: Number(document.getElementById('din-dist-corrida')?.value || 0), mvp: document.getElementById('jog-mvp').checked ? 1 : 0
            };
            jogadoresPartidaTemp.push(dadosJogador);
            let o = Number(document.getElementById('jog-ovr-atual').value) || 70; let pos = document.getElementById('jog-pos').value;
            let p = db[currentSave].plantel.find(x => x.nome === nome);
            if(p) { p.ovr = o; p.posicao = pos; } else {
                let novoP = { nome: nome, posicao: pos, ovr: o, status: 'Ativo', jogosAvaliacao: 0 };
                if (typeof garantirCamposElenco === 'function') garantirCamposElenco(novoP);
                db[currentSave].plantel.push(novoP);
            }
            renderizarListaTemp(); preencherDatalistJogadores();
            document.getElementById('jog-nota').value = '7.0'; document.getElementById('jog-mvp').checked = false;
        }

        function renderizarListaTemp() {
            let titulo = document.getElementById('titulo-lista-temp');
            if (titulo) titulo.innerText = `Lista de Jogadores nesta Partida (${jogadoresPartidaTemp.length}):`;

            let div = document.getElementById('lista-jogadores-temp');
            div.innerHTML = jogadoresPartidaTemp.map(j => {
                // O print geral de estatísticas (o mesmo lido pra todo mundo) não mostra as
                // defesas do goleiro nesse jogo — esse número fica numa tela própria dele
                // dentro do jogo. Só pra goleiros do elenco, oferece um segundo print dedicado
                // só a essa estatística, que funde o valor na ficha já lida pelo lote geral.
                let jogadorElenco = db[currentSave].plantel.find(x => x.nome === j.nome);
                let ehGoleiro = jogadorElenco && String(jogadorElenco.posicao).split('/')[0] === 'Goleiro';
                let botaoDefesas = ehGoleiro ? `
                    <label class="btn-upload" style="margin:0; padding:6px 10px; font-size:12px; cursor:pointer;" title="Print da tela de defesas do goleiro (é uma tela separada do resumo geral)">
                        🧤 Defesas: ${j.defesas || 0}
                        <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="lerDefesasGoleiroIA(event, ${j.idTemp})">
                    </label>` : '';
                return `
                <div style="background:rgba(0,255,136,0.05); border: 1px solid var(--border); border-radius:8px; margin-bottom:10px; padding:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <span style="font-size:15px;"><strong>${j.nome}</strong> ${j.mvp ? '⚽ (Melhor em campo)' : ''} | Nota: <span style="color:var(--warning); font-weight:bold;">${j.nota.toFixed(1)}</span></span>
                        <div style="display: flex; gap: 5px; align-items:center;">
                            ${botaoDefesas}
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
                        <div class="grid-2" style="margin-top: 5px;">
                            <div class="linha-form"><label>Distância Percorrida (km)</label><input type="number" step="0.1" id="inline-dist-percorrida-${j.idTemp}" value="${j.distanciaPercorrida || 0}"></div>
                            <div class="linha-form"><label>Distância Corrida/Sprint (km)</label><input type="number" step="0.1" id="inline-dist-corrida-${j.idTemp}" value="${j.distanciaCorrida || 0}"></div>
                        </div>
                        <label style="display:flex; align-items:center; gap:8px; margin: 10px 0; color: var(--warning); font-size: 14px; font-weight:bold; cursor:pointer;">
                            <input type="checkbox" id="inline-mvp-${j.idTemp}" style="width:18px; height:18px;" ${j.mvp ? 'checked' : ''}> Eleito Melhor em Campo (MVP)
                        </label>
                        <button style="width:100%; background:var(--accent); color:white; padding: 10px; font-size: 14px; border:none; border-radius:6px; cursor:pointer;" onclick="salvarEditInline(${j.idTemp})">💾 Salvar Alterações do Jogador</button>
                    </div>
                </div>
            `;
            }).join('');
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
            jog.distanciaPercorrida = Number(document.getElementById('inline-dist-percorrida-'+idTemp).value);
            jog.distanciaCorrida = Number(document.getElementById('inline-dist-corrida-'+idTemp).value);
            jog.mvp = document.getElementById('inline-mvp-'+idTemp).checked ? 1 : 0;
            renderizarListaTemp();
        }

        function removerJogadorTemp(idTemp) { jogadoresPartidaTemp = jogadoresPartidaTemp.filter(x => x.idTemp !== idTemp); renderizarListaTemp(); }

        function editarJogadorTemp(idTemp) { toggleEditInline(idTemp); }

        async function salvarPartida() {
            // Adversário, competição, mando, contexto e dias de descanso são declarados ao
            // Iniciar a Partida — sem partida iniciada não há o que salvar.
            let partidaAberta = db[currentSave].partidaAuxiliar;
            if (!partidaAberta) {
                alert('Inicie a partida antes de registrar o resultado: informe o adversário, a competição e escale o time em "▶️ Iniciar Partida".');
                if (typeof renderizarAbaSalvarPartida === 'function') renderizarAbaSalvarPartida();
                return;
            }

            let golsP = Number(document.getElementById('gols-pro').value); let golsC = Number(document.getElementById('gols-contra').value);
            let penaltis = document.getElementById('vitoria-penaltis').checked;
            let adv = partidaAberta.adversarioNome || "Adversário";
            // Competição, mando, contexto e dias até a próxima partida só são perguntados agora,
            // junto com o print das estatísticas — não mais ao iniciar a partida.
            let comp = document.getElementById('partida-comp').value;
            let mando = document.getElementById('partida-mando').value;
            let contexto = document.getElementById('partida-contexto').value.trim();
            let diasPassados = Math.max(0, Number(document.getElementById('partida-dias-proxima').value) || 3);
            // Pedido do treinador: jogo comum entra num resumo a cada 5 partidas no Feed Social;
            // só final ou clássico ganha post individual na hora (ver registrarResultadoParaFeed).
            let finalOuClassicoEl = document.getElementById('partida-final-classico');
            let finalOuClassico = finalOuClassicoEl ? finalOuClassicoEl.checked : false;

            // Cartão vermelho declarado durante a partida só vira suspensão de verdade agora, ao
            // encerrar — reaproveita o campo suspensoVermelho que o Departamento Médico já usa
            // (inclusive a lógica de "só é cumprida quando o jogador realmente fica de fora").
            (partidaAberta.cartoes || []).filter(c => c.tipo === 'vermelho').forEach(c => {
                let jogadorExpulso = db[currentSave].plantel.find(p => p.nome === c.nome);
                if (jogadorExpulso) { garantirCondicaoFisica(jogadorExpulso); jogadorExpulso.suspensoVermelho = true; }
            });

            // Lesão declarada durante a partida: agora sim pergunta quanto tempo cada jogador fica
            // de fora. O valor entra direto em diasLesao — como isso acontece ANTES de
            // processarCondicaoFisicaPosPartida rodar logo abaixo, os dias até a próxima partida já
            // saem descontados dessa lesão no mesmo cálculo que todo mundo passa.
            for (let nomeLesionado of (partidaAberta.lesoesDeclaradas || [])) {
                let jogadorLesionado = db[currentSave].plantel.find(p => p.nome === nomeLesionado);
                if (!jogadorLesionado) continue;
                let diasStr = await promptModerno(`Quantos dias ${nomeLesionado} vai ficar de fora por causa dessa lesão?`, '', '🏥 Dias de Recuperação');
                let dias = parseInt(diasStr, 10);
                if (diasStr !== null && !isNaN(dias) && dias > 0) {
                    garantirCondicaoFisica(jogadorLesionado);
                    jogadorLesionado.diasLesao = dias;
                    jogadorLesionado.jogosSeguidos = 0;
                }
            }

            // Passa os objetos completos (não só os nomes) pro motor de fadiga poder usar as
            // estatísticas físicas reais de cada jogador (distância percorrida/corrida, dividas,
            // dribles) na fórmula de Fadiga Acumulada — ver calcularFadigaAtualizada.
            processarCondicaoFisicaPosPartida(diasPassados, jogadoresPartidaTemp);

            // A ficha completa da partida vive no próprio registro: escalação do apito inicial,
            // substituições com minuto, tática aplicada e o banco. É o que a aba Dashboard abre
            // quando você clica na partida.
            db[currentSave].partidas.push({
                id: partidaAberta.id || Date.now(), temporada: db[currentSave].temporadaAtual,
                comp: comp, contexto: contexto,
                adversario: adv, mando: mando, golsPro: golsP, golsContra: golsC,
                possePro: Number(document.getElementById('posse-pro').value)||50, posseAdv: Number(document.getElementById('posse-adv').value)||50,
                finPro: Number(document.getElementById('fin-pro').value)||0, finAdv: Number(document.getElementById('fin-adv').value)||0, penaltis: penaltis, jogadores: jogadoresPartidaTemp,
                ficha: {
                    formacaoInicial: partidaAberta.formacaoInicial || partidaAberta.formacaoEscolhida,
                    formacaoFinal: partidaAberta.formacaoEscolhida,
                    escalacaoInicial: partidaAberta.escalacaoInicial || partidaAberta.titulares || {},
                    escalacaoFinal: partidaAberta.titulares || {},
                    bancoInicial: partidaAberta.bancoInicial || partidaAberta.banco || [],
                    substituicoes: partidaAberta.substituicoes || [],
                    cartoes: partidaAberta.cartoes || [],
                    lesoesDeclaradas: partidaAberta.lesoesDeclaradas || [],
                    tatica: partidaAberta.tatica || null,
                    adversarioInfo: partidaAberta.adversarioInfo || '',
                    analiseGeral: partidaAberta.analiseGeral || '',
                    diretriz: partidaAberta.diretriz || '',
                    ajustesFeitos: partidaAberta.ajustesFeitos || [],
                    diasProxima: diasPassados
                }
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
                registrarResultadoParaFeed(manchete, detalheNoticia, 'vitoria', { adversario: adv, golsPro: golsP, golsContra: golsC, finalOuClassico: finalOuClassico });
            }
            else if (golsC > golsP) {
                // Contexto: Derrota
                // Reclamação do treinador: "enfrentamos o Barcelona, o time deles é infinitamente
                // maior que o nosso, perdemos de 1 a 0 apenas, dominamos a posse, fora de casa, e
                // fui cornetado do mesmo jeito que se fosse uma goleada em casa — tem que ser mais
                // realista". A pressão agora reage ao CONTEXTO da derrota, não só ao placar:
                // margem de gols, se o time dominou algum aspecto do jogo mesmo perdendo, e se foi
                // fora de casa (onde perder pesa menos que em casa).
                let margemGols = golsC - golsP;
                let dominouPosse = posseP > posseA;
                let dominouFinalizacoes = finP >= (Number(document.getElementById('fin-adv').value) || 0);
                let jogoDigno = dominouPosse || dominouFinalizacoes;
                let jogoFora = mando === 'Fora';

                let fatorDerrota = 1.0;
                if (margemGols === 1) fatorDerrota *= 0.6; // derrota apertada pesa bem menos que goleada
                else if (margemGols >= 3) fatorDerrota *= 1.4; // goleada pesa mais
                if (jogoDigno) fatorDerrota *= 0.75; // dominou posse ou finalizações mesmo perdendo
                if (jogoFora) fatorDerrota *= 0.75; // perder fora dói bem menos que perder em casa

                let impactoDerrota = (isTierAlto ? -0.2 : (isTierBaixo ? -0.05 : -0.1)) * fatorDerrota;
                if (qtdDerrotasRecentes >= 2) impactoDerrota *= 1.5;
                atualizarNotaDiretoria(impactoDerrota);
                atualizarTermometroTorcida(-Math.max(1, Math.round(gerarNumeroAleatorio(3, 8) * fatorDerrota))); // Torcida reage ao contexto, não só ao placar

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
                registrarResultadoParaFeed(manchete, detalheNoticia, 'derrota', { adversario: adv, golsPro: golsP, golsContra: golsC, finalOuClassico: finalOuClassico });
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
                registrarResultadoParaFeed(manchete, detalheNoticia, 'empate', { adversario: adv, golsPro: golsP, golsContra: golsC, finalOuClassico: finalOuClassico });
            }

            // --- APLICA GATILHOS DE DEMISSÃO ---
            checarRiscoDemissao();

            // O resultado da partida já ganhou o post dele agora mesmo, com uma linha acima
            // (adicionarNoticiaAutomatica). gerarPostsSocial só entra depois de uma derrota, pra
            // simular a torcida cornetando no feed — não mais um post extra a cada partida.
            // O contexto vai enriquecido (mando, domínio, margem de gols) pra o post da torcida
            // reagir à derrota de verdade, não só ao placar — ver "TOM TEM QUE BATER COM O
            // CONTEXTO" no prompt de gerarPostsSocial.
            if (golsC > golsP) {
                let margem = golsC - golsP;
                let dominou = posseP > posseA || finP >= (Number(document.getElementById('fin-adv').value) || 0);
                let contextoDerrota = `Derrota para o ${adv} por ${golsP}x${golsC}` +
                    (margem === 1 ? ' (apertada, por apenas 1 gol de diferença)' : (margem >= 3 ? ' (goleada)' : '')) +
                    (mando === 'Fora' ? ', jogando fora de casa' : ', jogando em casa') +
                    (dominou ? `, mas o ${db[currentSave].nome} dominou a posse de bola/finalizações mesmo perdendo` : '');
                gerarPostsSocial(contextoDerrota);
            }

            // Se havia uma partida declarada no Auxiliar Técnico pra esse jogo, fecha o ciclo:
            // avaliação pós-jogo, arquivo no histórico e limpa a partida em aberto.
            let tinhaPartidaAuxiliar = !!db[currentSave].partidaAuxiliar;
            if (tinhaPartidaAuxiliar && typeof finalizarPartidaAuxiliar === 'function') {
                mostrarCarregandoIA('⏳ O Auxiliar Técnico está avaliando a partida...');
                await finalizarPartidaAuxiliar(golsP, golsC, adv);
                esconderCarregandoIA();
            }

            // A moral do elenco acompanha o resultado: vencer levanta o vestiário, perder derruba.
            if (typeof ajustarMoralElenco === 'function') {
                if (golsP > golsC || penaltis) ajustarMoralElenco(gerarNumeroAleatorio(2, 5));
                else if (golsC > golsP) ajustarMoralElenco(-gerarNumeroAleatorio(3, 6));
            }

            // A partida acabou: zera o formulário e volta a aba pro estado "Iniciar Partida". O campo
            // de adversário do próximo jogo (#inicio-partida-adversario) tinha que ser limpo aqui —
            // como nunca era, o nome do adversário desta partida ficava visível no campo, e
            // usarSugestaoDoAuxiliar só preenche o campo quando ele está vazio, então o adversário
            // NOVO sugerido pelo Auxiliar nunca aparecia: ficava preso no nome antigo pra sempre.
            db[currentSave].sugestaoAuxiliar = null;
            ['gols-pro', 'gols-contra', 'fin-pro', 'fin-adv', 'posse-pro', 'posse-adv'].forEach(id => {
                let el = document.getElementById(id);
                if (el) el.value = (id === 'posse-pro' || id === 'posse-adv') ? '' : '0';
            });
            let elContexto = document.getElementById('partida-contexto'); if (elContexto) elContexto.value = '';
            let elDias = document.getElementById('partida-dias-proxima'); if (elDias) elDias.value = '3';
            let elAdv = document.getElementById('inicio-partida-adversario'); if (elAdv) elAdv.value = '';

            salvarDados(); jogadoresPartidaTemp = []; defesasPendentesGoleiro = {}; renderizarListaTemp(); document.getElementById('vitoria-penaltis').checked = false;
            let elFinalClassico = document.getElementById('partida-final-classico'); if (elFinalClassico) elFinalClassico.checked = false;
            alert(tinhaPartidaAuxiliar ? "Partida salva! Confira a avaliação do Auxiliar Técnico no chat." : "Partida salva!");

            // Ciclos da Central de Mensagens: partida conta como ação (diretoria) e alimenta
            // os contadores do Departamento Médico e das mensagens do elenco.
            if (typeof processarCiclosPosPartida === 'function') processarCiclosPosPartida();
            if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Partida salva vs ${adv}`);

            // Fecha o relatório de qualquer jogador que o Olheiro estava observando — basta UMA
            // partida sua pra simular o tempo que ele levou pra ver o alvo jogar de verdade.
            if (currentSave === 'clube' && typeof scoutAvancarObservacoes === 'function') await scoutAvancarObservacoes();

            if (typeof renderizarAbaSalvarPartida === 'function') renderizarAbaSalvarPartida();
            atualizarFiltroTemporadas(); desenharGraficos(); preencherDatalistJogadores();
        }

