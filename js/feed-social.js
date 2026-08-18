        function renderizarSocialFeed() {
            renderizarTermometroUI();
            let feed = db[currentSave].socialFeed || [];
            let container = document.getElementById('feed-social-container');
            
            if(feed.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 40px;">O feed está vazio. Avance as partidas ou realize contratações para gerar repercussão.</p>';
                return;
            }

            // Pega apenas a quantidade visível (Paginação)
            let feedExibido = feed.slice(0, postsVisiveisSocial);

            container.innerHTML = feedExibido.map(post => {
                let divResposta = '';
                let btnResponder = '';
                let likedClass = post.curtidoPeloUser ? 'liked' : '';
                let heartIcon = post.curtidoPeloUser ? '❤️' : '🤍';
                
                if (post.respostaUser) {
                    let impTorcida = post.impactoTorcida > 0 ? `<span style="color:var(--primary);">Torcida: +${post.impactoTorcida}%</span>` : `<span style="color:var(--danger);">Torcida: ${post.impactoTorcida}%</span>`;
                    let impDir = post.impactoDiretoria > 0 ? `<span style="color:var(--primary);">Diretoria: +${post.impactoDiretoria}</span>` : `<span style="color:var(--danger);">Diretoria: ${post.impactoDiretoria}</span>`;
                    
                    divResposta = `
                    <div class="reply-history">
                        <strong>🗣️ Sua Resposta:</strong> "${post.respostaUser}"
                        <hr style="border-color: rgba(0, 163, 255, 0.2); margin: 8px 0;">
                        <span style="font-size: 13px; color: var(--text-muted);">Reação da comunidade: <em>"${post.respostaComunidade}"</em></span>
                        <div class="reply-impact">${impTorcida} | ${impDir}</div>
                    </div>`;
                } else {
                    btnResponder = `<div class="tweet-action-btn" onclick="toggleReplyBox('${post.id}')">💬 Responder</div>`;
                }

                return `
                    <div class="tweet-card">
                        <div class="tweet-avatar">${post.emoji_avatar || '👤'}</div>
                        <div class="tweet-content">
                            <div class="tweet-header">
                                <span class="tweet-name">${post.perfil_nome}</span>
                                <span class="tweet-handle">${post.arroba}</span>
                            </div>
                            <div class="tweet-text">${formatarTextoTweet(post.texto)}</div>
                            <div class="tweet-actions">
                                ${btnResponder}
                                <div class="tweet-action-btn ${likedClass}" onclick="curtirPostSocial('${post.id}')">${heartIcon} Curtir</div>
                                <div class="tweet-action-btn">🔄 ${Math.floor((post.likes || 100) / 3)}</div>
                            </div>
                            <div id="reply-box-${post.id}" class="reply-box">
                                <!-- Botões Dinâmicos gerados pela IA para este post específico -->
                                <div class="quick-replies" id="quick-social-${post.id}" style="margin-bottom: 10px;">
                                    ${post.opcoesRapidas ? post.opcoesRapidas.map(op => `<button class="btn-quick" onclick="usarQuickSocial('${post.id}', '${op.replace(/'/g, "\\'")}')">${op}</button>`).join('') : ''}
                                </div>
                                <input type="text" id="input-reply-${post.id}" placeholder="Digite ou escolha uma opção rápida acima...">
                                <button onclick="enviarRespostaSocial('${post.id}')">Enviar 🚀</button>
                            </div>
                            ${divResposta}
                        </div>
                    </div>`;
            }).join('');

            // Botão de carregar mais, se ainda houver posts no histórico
            if (postsVisiveisSocial < feed.length) {
                container.innerHTML += `<button class="btn-load-more" onclick="carregarMaisPostsSocial()">⏬ Mostrar postagens mais antigas do Histórico</button>`;
            }
        }

        function carregarMaisPostsSocial() {
            postsVisiveisSocial += 10;
            renderizarSocialFeed();
        }

        async function usarQuickSocial(postId, postura) {
            let input = document.getElementById(`input-reply-${postId}`);
            if(input) {
                input.disabled = true;
                input.value = `✍️ Redigindo resposta com postura: ${postura}...`;
            }

            let post = db[currentSave].socialFeed.find(p => p.id === postId);
            if(!post) return;

            let promptDin = `Você é o Assessor de Imprensa do Treinador do "${db[currentSave].nome}".
            O Treinador quer responder a este post de um torcedor/jornalista: "${post.texto}"
            A postura escolhida pelo treinador foi: "${postura}"

            Crie UMA resposta autêntica, realista e direta (máximo 2 frases) que o Treinador daria no Twitter, baseada exclusivamente nessa postura escolhida. 
            Em seguida, avalie o impacto dessa sua resposta na comunidade.
            
            ⚠️ REGRA DA DIRETORIA: A nota da diretoria (variacao_diretoria) DEVE SER 0.0 na maioria das vezes. SÓ altere a nota (permitido apenas +0.1 ou -0.1) se o post ou a resposta falarem EXPLICITAMENTE sobre finanças, diretoria, demissão, contratações ou gestão do clube. Caso contrário, obrigatoriamente retorne 0.0!
            
            Retorne EXATAMENTE JSON puro:
            {
              "texto_resposta": "A frase exata da resposta do treinador.",
              "variacao_torcida": numero inteiro (ex: 2, 0, -5),
              "variacao_diretoria": numero decimal (ex: 0.1, 0.0, -0.1),
              "resposta_comunidade": "Reação curta dos fãs à resposta (Ex: 'Apoiado, professor!')."
            }`;

            try {
                const data = await chamarIA({ contents: [{ parts: [{ text: promptDin }] }] });
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);

                if (match) {
                    let res = JSON.parse(match[0]);
                    post.respostaUser = res.texto_resposta;
                    post.respostaComunidade = res.resposta_comunidade;
                    post.impactoTorcida = res.variacao_torcida;
                    post.impactoDiretoria = res.variacao_diretoria;

                    atualizarTermometroTorcida(post.impactoTorcida);
                    atualizarNotaDiretoria(post.impactoDiretoria);
                }
            } catch(e) {
                post.respostaUser = `Minha postura é: ${postura}. Seguimos firmes.`;
                post.respostaComunidade = "Repercussão morna. Ninguém deu muita bola.";
                post.impactoTorcida = 0; post.impactoDiretoria = 0;
            }
            salvarDados(); 
            renderizarSocialFeed();
        }

        function curtirPostSocial(postId) {
            let post = db[currentSave].socialFeed.find(p => p.id === postId);
            if(post) {
                post.curtidoPeloUser = !post.curtidoPeloUser;
                
                // Algoritmo: Guarda as palavras do post curtido para a IA aprender o gosto
                if(post.curtidoPeloUser) {
                    db[currentSave].historicoCurtidas = (db[currentSave].historicoCurtidas || "") + " | " + post.texto;
                    // Limita o tamanho da string para não quebrar o limite de tokens da IA
                    if(db[currentSave].historicoCurtidas.length > 500) {
                        db[currentSave].historicoCurtidas = db[currentSave].historicoCurtidas.substring(db[currentSave].historicoCurtidas.length - 500);
                    }
                }
                salvarDados();
                renderizarSocialFeed();
            }
        }

        function toggleReplyBox(id) {
            let box = document.getElementById(`reply-box-${id}`);
            if(box) box.style.display = box.style.display === 'block' ? 'none' : 'block';
        }

        async function enviarRespostaSocial(postId) {
            let input = document.getElementById(`input-reply-${postId}`);
            let texto = input.value.trim();
            if(!texto) return;

            let post = db[currentSave].socialFeed.find(p => p.id === postId);
            if(!post) return;

            input.disabled = true;
            input.value = "Avaliando repercussão...";

            let promptEval = `Você é o Avaliador de Relações Públicas do clube "${db[currentSave].nome}".
            O Treinador respondeu a este post na rede social:
            Post original: "${post.texto}"
            Resposta do Treinador: "${texto}"
            
            Analise a resposta do Treinador e defina o impacto.
            ⚠️ REGRAS DE EQUILÍBRIO (MUITO IMPORTANTE):
            - Respostas profissionais, motivacionais ou clichês de futebol (ex: "Seguimos trabalhando", "Foco no próximo jogo") SÃO BOAS e devem gerar impacto POSITIVO ou NEUTRO (+1 a +3 na torcida), NUNCA negativo. Os torcedores respeitam trabalho duro.
            - Só aplique impacto NEGATIVO (-3 a -10) na torcida se o treinador for extremamente arrogante, xingar, der desculpas esfarrapadas ou ofender publicamente um jogador.
            - IMPACTO NA DIRETORIA: A nota da diretoria ('variacao_diretoria') DEVE SER 0.0. SÓ ALTERE (máximo +0.1 ou -0.1) se o post original ou a sua resposta envolverem DIRETAMENTE dinheiro, mercado de transferências, gestão do clube ou ultimatos. Posts sobre tática, jogo ou vitórias/derrotas afetam APENAS a torcida, deixe a diretoria em 0.0.
            - A reação da comunidade ("resposta_comunidade") deve refletir o impacto: se for resposta padrão boa, simule torcedores apoiando.
            
            Retorne EXATAMENTE JSON puro:
            {
              "variacao_torcida": numero inteiro (ex: 2, 0, -5),
              "variacao_diretoria": numero decimal (ex: 0.1, 0.0, -0.1),
              "resposta_comunidade": "Reação curta da comunidade à resposta."
            }`;

            try {
                const data = await chamarIA({ contents: [{ parts: [{ text: promptEval }] }] });
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                
                if (match) {
                    let res = JSON.parse(match[0]);
                    post.respostaUser = texto;
                    post.respostaComunidade = res.resposta_comunidade;
                    post.impactoTorcida = res.variacao_torcida;
                    post.impactoDiretoria = res.variacao_diretoria;
                    
                    atualizarTermometroTorcida(post.impactoTorcida);
                    atualizarNotaDiretoria(post.impactoDiretoria);
                }
            } catch(e) {
                post.respostaUser = texto;
                post.respostaComunidade = "Repercussão ignorada pela bolha. Ninguém ligou.";
                post.impactoTorcida = 0; post.impactoDiretoria = 0;
            }
            salvarDados(); renderizarSocialFeed();
        }

        async function gerarPostsSocial(contextoExtra = "Pós-Jogo") {
            let btn = document.getElementById('btn-forcar-posts');
            let loader = document.getElementById('loader-social');
            if(btn) btn.disabled = true;
            if(loader) loader.style.display = 'block';

            let resumoUltimos = db[currentSave].partidas.slice(-2).map(p => `${p.adversario} (${p.golsPro}x${p.golsContra})`).join(' | ');
            let plantelBaixo = db[currentSave].plantel.filter(p => p.status === 'Ativo').slice(0, 5).map(p => `${p.nome} (OVR ${p.ovr})`).join(', ');
            let historicoCurtidas = db[currentSave].historicoCurtidas || "Nenhum dado ainda.";

            let plantelAtivo = db[currentSave].plantel.filter(p => p.status === 'Ativo');
            // Filtra apenas jogadores importantes (OVR >= 72 ou titulares) para a torcida cobrar
            let jogadoresRelevantes = plantelAtivo.filter(p => p.ovr >= 70).map(p => `${p.nome} (OVR ${p.ovr})`).join(', ');

            let promptIA = `Você é o Algoritmo de Rede Social (Twitter/X) focada no time "${db[currentSave].nome}".
            Contexto Atual: 
            - Evento Recente: ${contextoExtra}
            - Aprovação da Torcida: ${db[currentSave].aprovacaoTorcida}/100
            - Últimos Resultados: ${resumoUltimos || "Início de temporada"}
            - Elenco Atual (USE APENAS ESTES NOMES SE FOR CITAR ALGUM JOGADOR): ${jogadoresRelevantes || "Nenhum jogador relevante cadastrado ainda"}

            Gere a "Timeline" de AGORA. Crie 3 postagens HIPER-REALISTAS e ÚNICAS:
            1. Postagem sobre Partida / Desempenho.
            2. Postagem sobre Transferência / Mercado / Diretoria.
            3. Postagem de Corneta / Zoação da torcida.

            ⚠️ REGRA DE OURO SOBRE JOGADORES (MUITO IMPORTANTE): É PROIBIDO inventar ou citar qualquer jogador que não esteja EXATAMENTE na lista "Elenco Atual" acima. Se for pedir a venda de alguém (campo "pede_venda_jogador"), o nome TEM que ser copiado exatamente dessa lista. Se não houver ninguém adequado pra criticar, deixe "pede_venda_jogador" vazio.

            ⚠️ REGRAS PARA AS RESPOSTAS RÁPIDAS (MUITO IMPORTANTE):
            Para cada post gerado, crie um array "opcoesRapidas". EM VEZ DE FRASES, você deve gerar 3 "Posturas/Intenções" curtas com no máximo 3 palavras e 1 emoji.
            Exemplos: ["🎯 Foco total", "🔥 Rebater Crítica", "🧘‍♂️ Calma e tempo", "💼 Decisão da Diretoria", "🙏 Agradecer apoio"].

            Retorne EXATAMENTE este formato JSON PURO, sem formatação markdown:
            {
              "posts": [
                {
                  "perfil_nome": "Nome do Perfil",
                  "arroba": "@arroba_do_perfil",
                  "emoji_avatar": "⚽",
                  "texto": "Postagem aqui...",
                  "likes": 4302,
                  "pede_venda_jogador": "Nome exato do jogador criticado (ou vazio)",
                  "opcoesRapidas": ["Opção 1", "Opção 2", "Opção 3"]
                }
              ]
            }`;

            try {
                const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                
                if (match) {
                    let res = JSON.parse(match[0]);
                    let novosPosts = res.posts;
                    
                    if(!db[currentSave].socialFeed) db[currentSave].socialFeed = [];
                    if(!db[currentSave].alvosTorcida) db[currentSave].alvosTorcida = {};

                    novosPosts.forEach(p => {
                        p.id = 'post_' + Date.now() + Math.random().toString(36).substr(2, 9);
                        // Garante que se a IA esquecer de mandar as opções, o jogo preenche com padrões contextuais
                        if (!p.opcoesRapidas) {
                            p.opcoesRapidas = ["Seguimos trabalhando forte!", "O foco é o próximo desafio.", "Não vou comentar arbitragem/críticas."];
                        }
                        db[currentSave].socialFeed.unshift(p);
                        // ... (continua o restante da lógica de caça às bruxas)
                        
                        // Lógica da Caça às Bruxas
                        if(p.pede_venda_jogador && p.pede_venda_jogador.trim() !== "") {
                            let alvo = p.pede_venda_jogador.trim();
                            // A IA às vezes inventa um nome ou aponta alguém que não é nosso:
                            // só vira exigência quem realmente está ativo no elenco e pode ser
                            // negociado (quem chegou emprestado pertence a outro clube).
                            let alvoReal = db[currentSave].plantel.find(j => j.status === 'Ativo' && j.nome.toLowerCase() === alvo.toLowerCase());
                            if (!alvoReal || jogadorPertenceAOutroClube(alvoReal)) return;
                            alvo = alvoReal.nome;
                            db[currentSave].alvosTorcida[alvo] = (db[currentSave].alvosTorcida[alvo] || 0) + 1;
                            
                            // Se bater 3 exigências seguidas da torcida, a diretoria interfere
                            if(db[currentSave].alvosTorcida[alvo] >= 3) {
                                if(!db[currentSave].exigenciasDiretoria.includes(alvo)) {
                                    db[currentSave].exigenciasDiretoria.push(alvo);
                                    setTimeout(() => {
                                        document.getElementById('evento-texto').innerHTML = `A pressão da torcida no Feed Social ficou insustentável! A diretoria exige a venda/empréstimo de <strong>${alvo}</strong> imediatamente para acalmar os ânimos. Vá até o Mercado.`;
                                        document.querySelector('.evento-box').style.borderColor = "var(--danger)";
                                        document.getElementById('modal-evento').style.display = 'flex';
                                    }, 1500);
                                }
                            }
                        }
                    });

                    // Limita a 50 posts no histórico (5 páginas)
                    if(db[currentSave].socialFeed.length > 50) db[currentSave].socialFeed = db[currentSave].socialFeed.slice(0, 50);
                }
            } catch(e) { console.log("Erro ao gerar feed", e); }
            
            salvarDados(); 
            postsVisiveisSocial = 10; // Reseta para a primeira página ao atualizar o feed
            if(btn) btn.disabled = false;
            if(loader) loader.style.display = 'none';
            renderizarSocialFeed();
        }

        // ADAPTAÇÃO: A antiga função de "notícia automática" (que era gerada em contratações) 
        // agora vira um tweet oficial do Jornalista e entra no Feed Social.
        function adicionarNoticiaAutomatica(titulo, detalhe) {
            if(!db[currentSave].socialFeed) db[currentSave].socialFeed = [];
            
            // 1. Define um perfil de mídia padrão para jogos, resultados e avisos gerais
            let nomePerfil = "Diário Esportivo";
            let arrobaPerfil = "@diario_esporte";
            let emojiPerfil = "📰";
            let tag = "#Futebol";

            // 2. Verifica se o título da notícia tem a ver com transferências
            let tituloUpper = titulo.toUpperCase();
            let isMercado = tituloUpper.includes("REFORÇO") || tituloUpper.includes("HERE WE GO") || 
                            tituloUpper.includes("VEND") || tituloUpper.includes("COFRES") || 
                            tituloUpper.includes("EMPRÉSTIMO") || tituloUpper.includes("ASSINA") || 
                            tituloUpper.includes("CONTRATO") || tituloUpper.includes("LIVRE") ||
                            tituloUpper.includes("CHUTEIRAS");

            // 3. Se for de mercado, chama o Fabrizio
            if (isMercado) {
                nomePerfil = "Fabrizio Transferências";
                arrobaPerfil = "@fabrizio_mercato";
                emojiPerfil = "🚨";
                tag = "#Mercato";
            }

            db[currentSave].socialFeed.unshift({
                id: 'post_' + Date.now() + Math.random().toString(36).substr(2, 9),
                perfil_nome: nomePerfil,
                arroba: arrobaPerfil,
                emoji_avatar: emojiPerfil,
                texto: `EXCLUSIVO: ${titulo} ${detalhe} ${tag}`,
                likes: gerarNumeroAleatorio(5000, 25000),
                pede_venda_jogador: "",
                // 4. CORREÇÃO: Adicionando as opções rápidas que estavam faltando
                opcoesRapidas: ["Seguimos trabalhando forte!", "O foco é no campo.", "Sem comentários no momento."]
            });

            // CORREÇÃO (Claude): também registra em noticiasFeed, que é o que
            // gerarResumoContexto() usa para contar à IA (Diretoria/Auxiliar) as
            // últimas novidades. Sem isso, esse contexto ficava sempre vazio.
            if(!db[currentSave].noticiasFeed) db[currentSave].noticiasFeed = [];
            db[currentSave].noticiasFeed.unshift({ texto: titulo, detalhe: detalhe });
            if(db[currentSave].noticiasFeed.length > 30) db[currentSave].noticiasFeed.pop();

            salvarDados();
        }

async function apagarSocialFeed() {
            if (await confirmarModerno("Deseja apagar todas as postagens do Feed Social?", "Apagar Feed Social", { perigo: true, textoConfirmar: "Apagar Tudo" })) {
                db[currentSave].socialFeed = [];
                salvarDados();
                renderizarSocialFeed();
            }
        }

        // ==========================================
        // MOTOR DE ÁUDIO UI (UX Profissional)
        // ==========================================
        
        // Inicializa o contexto de áudio (espera a primeira interação do usuário)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function playClickSound() {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(720, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(380, audioCtx.currentTime + 0.045);

            gainNode.gain.setValueAtTime(0.11, audioCtx.currentTime); 
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06); 

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.06);
        }

        // Acorde curto e satisfatório pra ações de confirmação (ex: modal moderno)
        function playConfirmSound() {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            [523.25, 659.25].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.04);
                gain.gain.setValueAtTime(0.001, audioCtx.currentTime + i * 0.04);
                gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + i * 0.04 + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.04 + 0.22);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(audioCtx.currentTime + i * 0.04);
                osc.stop(audioCtx.currentTime + i * 0.04 + 0.22);
            });
        }

        // Som curto e neutro pra ações de cancelar/fechar
        function playCancelSound() {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.09);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.09);
        }

        // Ouvinte global que detecta cliques em QUALQUER botão do sistema
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON' || 
                e.target.closest('button') || 
                e.target.classList.contains('nav-btn') || 
                e.target.classList.contains('btn-quick') ||
                e.target.classList.contains('tweet-action-btn')) {
                playClickSound();
            }
        });
