        // =====================================================================================
        // FEED SOCIAL — VISUAL TIPO INSTAGRAM
        // =====================================================================================
        // Cada post ganha uma "capa". Duas camadas, nessa ordem de tentativa:
        //   1) assets/social/<categoria>.jpg — se você colocar um arquivo com esse nome no
        //      repositório, ele passa a ser a capa fixa daquela categoria (sua própria foto). Se
        //      o arquivo não existir (404), o onerror do próprio <img> remove a tag.
        //   2) svg — uma ilustração vetorial desenhada pra bater com o tema exato do evento
        //      (troféu, chuva, prancheta médica, megafone...). Antes essa camada buscava foto de
        //      banco livre por palavra-chave (LoremFlickr): a busca não tinha garantia nenhuma de
        //      bater com o assunto do post (podia vir qualquer coisa) e ainda dependia de internet
        //      no navegador de quem joga. O SVG sempre bate com a categoria e nunca depende de rede.
        const CATEGORIAS_POST_SOCIAL = {
            vitoria:     { emoji: '🏆', label: 'Vitória',             grad: 'linear-gradient(155deg, #241a03 0%, #6b4e12 48%, #E8B84B 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M35 20h30v14a15 15 0 0 1-30 0z"/><path d="M35 24h-10a8 8 0 0 0 8 12"/><path d="M65 24h10a8 8 0 0 0-8 12"/><path d="M50 49v10"/><path d="M40 66h20l3 9h-26z"/><path d="M37 75h26"/><path d="M50 8v6M38 10l3 5M62 10l-3 5"/></svg>' },
            campeao:     { emoji: '🏆', label: 'Título',              grad: 'linear-gradient(155deg, #2b1e00 0%, #8a6412 45%, #F2C868 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M33 18h34v16a17 17 0 0 1-34 0z"/><path d="M33 23h-9a7 7 0 0 0 7 11"/><path d="M67 23h9a7 7 0 0 0-7 11"/><path d="M50 51v9"/><path d="M39 68h22l3 9h-28z"/><path d="M36 77h28"/><path d="M50 4l2.4 5 5.6.5-4.3 3.6 1.3 5.4L50 15.7 45 18.5l1.3-5.4L42 9.5l5.6-.5z" fill="currentColor" stroke="none"/></svg>' },
            derrota:     { emoji: '🌧️', label: 'Derrota',             grad: 'linear-gradient(155deg, #04070a 0%, #131c26 55%, #33465a 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><line x1="20" y1="14" x2="14" y2="28"/><line x1="40" y1="10" x2="34" y2="26"/><line x1="60" y1="14" x2="54" y2="30"/><line x1="80" y1="10" x2="74" y2="26"/><circle cx="50" cy="55" r="10"/><path d="M35 90c2-16 10-24 15-24s13 8 15 24"/><path d="M42 55h16"/></svg>' },
            empate:      { emoji: '⚖️', label: 'Empate',              grad: 'linear-gradient(155deg, #0e1317 0%, #223038 55%, #445a5f 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="50" y1="14" x2="50" y2="82"/><line x1="22" y1="30" x2="78" y2="30"/><path d="M22 30l-10 22a10 10 0 0 0 20 0z"/><path d="M78 30l-10 22a10 10 0 0 0 20 0z"/><line x1="36" y1="86" x2="64" y2="86"/><circle cx="50" cy="18" r="5"/></svg>' },
            contratacao: { emoji: '✍️', label: 'Contratação',         grad: 'linear-gradient(155deg, #061711 0%, #10422a 50%, #24b374 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 70c15 4 45 4 60 0"/><path d="M28 66l38-38 8 8-38 38-11 3z"/><path d="M60 34l8 8"/><path d="M20 82h30"/></svg>' },
            venda:       { emoji: '👋', label: 'Saída',                grad: 'linear-gradient(155deg, #060f17 0%, #123049 50%, #3a86c4 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M30 15v70"/><path d="M30 15h20l14 8"/><path d="M30 85h20l14-8"/><path d="M60 30v40"/><path d="M70 40l12 10-12 10"/><line x1="82" y1="50" x2="60" y2="50"/></svg>' },
            lesao:       { emoji: '🏥', label: 'Departamento Médico',  grad: 'linear-gradient(155deg, #190607 0%, #4a1214 50%, #E24B4B 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="18" width="64" height="64" rx="14"/><path d="M20 50h16l6-14 8 24 6-14h14"/></svg>' },
            capitao:     { emoji: '🎖️', label: 'Vestiário',           grad: 'linear-gradient(155deg, #221902 0%, #6b4e12 50%, #E8B84B 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 30c22-10 42-10 64 0v20c-22 10-42 10-64 0z"/><path d="M50 32l3.5 7 7.5.7-5.7 5 1.7 7.3L50 48l-6.5 4 1.7-7.3-5.7-5 7.5-.7z" fill="currentColor" stroke="none"/></svg>' },
            financeiro:  { emoji: '💰', label: 'Bastidores',           grad: 'linear-gradient(155deg, #041213 0%, #0f3a3d 50%, #33b6bd 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="16" y1="84" x2="88" y2="84"/><rect x="24" y="60" width="12" height="24"/><rect x="44" y="46" width="12" height="38"/><rect x="64" y="30" width="12" height="54"/><circle cx="76" cy="18" r="10"/><path d="M72 18h8M76 14v8" stroke-width="3"/></svg>' },
            corneta:     { emoji: '🔥', label: 'Repercussão',          grad: 'linear-gradient(155deg, #190800 0%, #5c1d05 50%, #D9822B 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 46v8l14 4v-16z"/><path d="M34 38v24l32 14V24z"/><path d="M66 34a12 12 0 0 1 0 22"/><path d="M26 58l4 16"/><path d="M78 34c6 4 6 18 0 22" stroke-width="3"/><path d="M84 28c10 8 10 26 0 34" stroke-width="3"/></svg>' },
            geral:       { emoji: '📰', label: 'Notícia',              grad: 'linear-gradient(155deg, #0D1512 0%, #182420 55%, #2A3B34 100%)',
                svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="24" width="68" height="52" rx="4"/><line x1="26" y1="36" x2="46" y2="36"/><line x1="26" y1="44" x2="46" y2="44"/><line x1="26" y1="52" x2="40" y2="52"/><rect x="54" y="34" width="20" height="16"/><line x1="54" y1="58" x2="74" y2="58"/><line x1="54" y1="65" x2="74" y2="65"/></svg>' }
        };

        // =====================================================================================
        // COLETÂNEAS — pedido do treinador: 1 post por transferência e 1 post por partida
        // lotava o feed sem dar motivo real pra abrir a aba. Agora esses dois tipos de evento
        // se acumulam numa fila e só viram post de verdade quando o lote fecha — uma
        // transferência ou um resultado isolado nunca aparece sozinho, exceto quando o
        // treinador marca a partida como Final/Clássico (aí ela é notícia grande o bastante
        // pra não esperar).
        // =====================================================================================
        const LOTE_COLETANEA_TRANSFERENCIAS = 3;
        const LOTE_RESUMO_PARTIDAS = 5;

        const EMOJI_TIPO_TRANSFERENCIA = {
            Comprado: '✍️', EmprestadoIn: '📥', Venda: '💰', Emprestimo: '📤',
            Dispensa: '📄', Aposentadoria: '🥾'
        };

        // Chamado no lugar de adicionarNoticiaAutomatica direto, nos eventos de mercado — vai pra
        // fila em vez de virar post na hora.
        function registrarNoticiaTransferenciaFeed(tipo, nome, noticia) {
            let d = db[currentSave];
            if (!d) return;
            if (!d.pendentesColetaneaTransferencias) d.pendentesColetaneaTransferencias = [];
            d.pendentesColetaneaTransferencias.push({ tipo: tipo, nome: nome, titulo: noticia.titulo });
            if (d.pendentesColetaneaTransferencias.length >= LOTE_COLETANEA_TRANSFERENCIAS) {
                publicarColetaneaTransferencias();
            } else {
                salvarDados();
            }
        }

        function publicarColetaneaTransferencias() {
            let d = db[currentSave];
            if (!d) return;
            let pendentes = d.pendentesColetaneaTransferencias || [];
            if (pendentes.length === 0) return;
            let linhas = pendentes.map(p => `${EMOJI_TIPO_TRANSFERENCIA[p.tipo] || '🔄'} ${p.nome}`).join(' · ');
            let titulo = `📋 Coletânea de Transferências (${pendentes.length})`;
            let detalhe = `O mercado não parou: ${linhas}. Confira os detalhes de cada negociação na aba Transferências.`;
            d.pendentesColetaneaTransferencias = [];
            adicionarNoticiaAutomatica(titulo, detalhe, 'contratacao');
        }

        // Chamado no lugar de adicionarNoticiaAutomatica direto, no resultado de cada partida.
        // dadosPartida = { adversario, golsPro, golsContra, finalOuClassico }
        function registrarResultadoParaFeed(manchete, detalheNoticia, categoria, dadosPartida) {
            let d = db[currentSave];
            if (!d) return;
            if (dadosPartida && dadosPartida.finalOuClassico) {
                // Final ou clássico: notícia grande o bastante pra não esperar o lote.
                adicionarNoticiaAutomatica(manchete, detalheNoticia, categoria);
                return;
            }
            if (!d.pendentesResumoPartidas) d.pendentesResumoPartidas = [];
            d.pendentesResumoPartidas.push({
                adversario: (dadosPartida && dadosPartida.adversario) || 'Adversário',
                golsPro: (dadosPartida && dadosPartida.golsPro) || 0,
                golsContra: (dadosPartida && dadosPartida.golsContra) || 0,
                resultado: categoria // 'vitoria' | 'derrota' | 'empate'
            });
            if (d.pendentesResumoPartidas.length >= LOTE_RESUMO_PARTIDAS) {
                publicarResumoPartidas();
            } else {
                salvarDados();
            }
        }

        function publicarResumoPartidas() {
            let d = db[currentSave];
            if (!d) return;
            let pendentes = d.pendentesResumoPartidas || [];
            if (pendentes.length === 0) return;
            let v = pendentes.filter(p => p.resultado === 'vitoria').length;
            let e = pendentes.filter(p => p.resultado === 'empate').length;
            let der = pendentes.filter(p => p.resultado === 'derrota').length;
            let golsPro = pendentes.reduce((s, p) => s + (p.golsPro || 0), 0);
            let golsContra = pendentes.reduce((s, p) => s + (p.golsContra || 0), 0);
            let categoriaResumo = v > der ? 'vitoria' : (der > v ? 'derrota' : 'empate');
            let icone = categoriaResumo === 'vitoria' ? '📈' : (categoriaResumo === 'derrota' ? '📉' : '➖');
            let titulo = `${icone} Resumo de ${pendentes.length} Jogos: ${v}V ${e}E ${der}D`;
            let linhas = pendentes.map(p => `${p.golsPro}x${p.golsContra} vs ${p.adversario}`).join(' · ');
            let saldo = golsPro - golsContra;
            let detalhe = `${linhas}. Saldo de gols no recorte: ${saldo > 0 ? '+' : ''}${saldo} (${golsPro} pró, ${golsContra} contra).`;
            d.pendentesResumoPartidas = [];
            adicionarNoticiaAutomatica(titulo, detalhe, categoriaResumo);
        }

        // =====================================================================================
        // BADGE DE "NÃO VISTOS" — antes o feed não dava nenhum motivo pra abrir a aba (nada
        // indicava se tinha post novo). Agora funciona igual à Central de Mensagens: conta quem
        // ainda não foi visto e mostra na bolinha do menu; abrir a aba marca tudo como visto.
        // =====================================================================================
        function contarPostsSocialNaoVistos() {
            let feed = (db[currentSave] && db[currentSave].socialFeed) || [];
            return feed.filter(p => !p.vistoPeloUser).length;
        }

        function atualizarBadgeSocial() {
            let badge = document.getElementById('badge-social');
            if (!badge) return;
            let n = contarPostsSocialNaoVistos();
            badge.innerText = n > 99 ? '99+' : String(n);
            badge.style.display = n > 0 ? 'inline-flex' : 'none';
        }

        // Classifica um post pelo texto do título — mesma ideia do isMercado que já existia,
        // só que cobrindo todas as categorias agora (não só mercado). Roda sobre QUALQUER post
        // antigo/novo, então nenhum evento já disparado pelo app precisa ser reescrito.
        function categoriaDoPost(titulo) {
            let t = String(titulo || '').toUpperCase();
            if (t.includes('CAMPEÃO') || t.includes('TROFÉU') || t.includes('TÍTULO')) return 'campeao';
            if (/VIT[ÓO]RIA|GIGANTE|TÁTICA PERFEITA|DONOS DA BOLA|ATROPELO|HEROICO/.test(t)) return 'vitoria';
            if (/DECEP[ÇC][ÃA]O|TROPE[ÇC]|ALERTA LIGADO|NOITE DESASTROSA|TORCIDA NA BRONCA/.test(t)) return 'derrota';
            if (/TUDO IGUAL|TRANSPIRA[ÇC][ÃA]O|PARED[ÕO]ES|EMPATE/.test(t)) return 'empate';
            if (t.includes('LESÃO') || t.includes('LESAO') || t.includes('BAIXA NO ELENCO') || t.includes('RECAÍDA') || t.includes('DM VAZIO') || t.includes('QUEBRA DE COMBINADO') || t.includes('DESCANSO PREVENTIVO') || t.includes('🏥')) return 'lesao';
            if (t.includes('CAPITÃO') || t.includes('BRAÇADEIRA')) return 'capitao';
            if (t.includes('VEND') || t.includes('NEGÓCIO FECHADO') || t.includes('VITRINE') || t.includes('RODAGEM') || t.includes('FIM DE EMPRÉSTIMO') || t.includes('DEVOLVIDO') || t.includes('ADEUS')) return 'venda';
            if (t.includes('REFORÇO') || t.includes('HERE WE GO') || t.includes('ASSINA') || t.includes('RENOVOU') || t.includes('CONTRATO') || t.includes('LIVRE') || t.includes('CHUTEIRAS') || t.includes('DE VOLTA') || t.includes('SEGUE CONOSCO')) return 'contratacao';
            if (t.includes('COFRES') || t.includes('VERBA') || t.includes('ACORDO') || t.includes('INVESTIMENTO') || t.includes('APERTO NO CAIXA') || t.includes('PATROCÍNIO')) return 'financeiro';
            if (t.includes('POLÊMICA') || t.includes('COBRA') || t.includes('PRESSÃO')) return 'corneta';
            return 'geral';
        }

        function heroDoPost(post) {
            let cat = post.categoria && CATEGORIAS_POST_SOCIAL[post.categoria] ? post.categoria : categoriaDoPost(post.legenda || post.texto);
            if (!CATEGORIAS_POST_SOCIAL[cat]) cat = 'geral';
            return Object.assign({ chave: cat }, CATEGORIAS_POST_SOCIAL[cat]);
        }

        // 25000 -> "25 mil" — número de curtidas fica mais Instagram e menos planilha.
        function formatarLikesCompacto(n) {
            n = Number(n) || 0;
            if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace('.', ',') + ' mil';
            return String(n);
        }

        function toggleCaptionPost(id) {
            let el = document.getElementById(`caption-texto-${id}`);
            let btn = document.getElementById(`caption-vermais-${id}`);
            if (!el || !btn) return;
            let aberto = el.classList.toggle('insta-caption-aberta');
            btn.innerText = aberto ? 'ver menos' : 'ver mais';
        }

        function renderizarSocialFeed() {
            renderizarTermometroUI();
            let feed = db[currentSave].socialFeed || [];
            let container = document.getElementById('feed-social-container');

            // Abrir a aba conta como "ler" o feed inteiro — some com a bolinha de não vistos.
            let tinhaNaoVistos = feed.some(p => !p.vistoPeloUser);
            if (tinhaNaoVistos) { feed.forEach(p => { p.vistoPeloUser = true; }); salvarDados(); }
            atualizarBadgeSocial();

            if(feed.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 40px;">O feed está vazio. Avance as partidas ou realize contratações para gerar repercussão.</p>';
                return;
            }

            // Pega apenas a quantidade visível (Paginação)
            let feedExibido = feed.slice(0, postsVisiveisSocial);

            container.innerHTML = feedExibido.map(post => {
                let divResposta = '';
                let likedClass = post.curtidoPeloUser ? 'liked' : '';
                let heartIcon = post.curtidoPeloUser ? '❤️' : '🤍';
                let hero = heroDoPost(post);

                if (post.respostaUser) {
                    let impTorcida = post.impactoTorcida > 0 ? `<span style="color:var(--primary);">Torcida +${post.impactoTorcida}%</span>` : `<span style="color:var(--danger);">Torcida ${post.impactoTorcida}%</span>`;
                    let impDir = post.impactoDiretoria > 0 ? `<span style="color:var(--primary);">Diretoria +${post.impactoDiretoria}</span>` : `<span style="color:var(--danger);">Diretoria ${post.impactoDiretoria}</span>`;

                    divResposta = `
                    <div class="insta-comentarios">
                        <div class="insta-comentario"><span class="insta-comentario-avatar">🧑‍💼</span> <strong>Você</strong> ${post.respostaUser}</div>
                        <div class="insta-comentario insta-comentario-comunidade"><span class="insta-comentario-avatar">💬</span> <strong>Comunidade</strong> ${post.respostaComunidade}</div>
                        <div class="insta-impacto">${impTorcida} · ${impDir}</div>
                    </div>`;
                }

                // Legenda curta em destaque + o texto completo (se existir) escondido atrás de
                // "ver mais" — era um parágrafo inteiro sempre visível, cansativo de rolar.
                let legenda = formatarTextoTweet(post.legenda || post.texto || '');
                let detalheTxt = post.detalhe ? formatarTextoTweet(post.detalhe) : '';

                return `
                    <div class="insta-card">
                        <div class="insta-topo">
                            <div class="insta-avatar">${post.emoji_avatar || '👤'}</div>
                            <div class="insta-topo-nomes">
                                <span class="insta-nome">${post.perfil_nome}</span>
                                <span class="insta-arroba">${post.arroba}</span>
                            </div>
                            <span class="insta-categoria-chip">${hero.emoji} ${hero.label}</span>
                        </div>
                        <div class="insta-hero" style="background:${hero.grad}">
                            <div class="insta-hero-arte">${hero.svg}</div>
                            <img class="insta-hero-img" alt="" loading="lazy" src="assets/social/${hero.chave}.jpg" onerror="this.remove();">
                            <span class="insta-hero-emoji">${hero.emoji}</span>
                        </div>
                        <div class="insta-acoes">
                            <span class="insta-icone ${likedClass}" onclick="curtirPostSocial('${post.id}')" title="Curtir">${heartIcon}</span>
                            <span class="insta-icone" onclick="toggleReplyBox('${post.id}')" title="Comentar">💬</span>
                            <span class="insta-icone-compartilhar">🔁 ${formatarLikesCompacto(Math.floor((post.likes || 100) / 3))}</span>
                        </div>
                        <div class="insta-curtidas">${formatarLikesCompacto(post.likes || 100)} curtidas${post.curtidoPeloUser ? ' · você curtiu' : ''}</div>
                        <div class="insta-caption">
                            <strong>${post.perfil_nome}</strong> ${legenda}${detalheTxt ? ` <span class="insta-detalhe-extra" id="caption-texto-${post.id}">${detalheTxt}</span> <span class="insta-vermais" id="caption-vermais-${post.id}" onclick="toggleCaptionPost('${post.id}')">ver mais</span>` : ''}
                        </div>
                        <div id="reply-box-${post.id}" class="reply-box insta-reply-box">
                            <div class="quick-replies" id="quick-social-${post.id}" style="margin-bottom: 10px;">
                                ${post.opcoesRapidas ? post.opcoesRapidas.map(op => `<button class="btn-quick" onclick="usarQuickSocial('${post.id}', '${op.replace(/'/g, "\\'")}')">${op}</button>`).join('') : ''}
                            </div>
                            <input type="text" id="input-reply-${post.id}" placeholder="Comente como o treinador...">
                            <button onclick="enviarRespostaSocial('${post.id}')">Enviar 🚀</button>
                        </div>
                        ${divResposta}
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

        // Antes gerava 3 posts genéricos (partida/mercado/corneta) TODA VEZ que uma partida
        // terminava — em cima do post de resultado que adicionarNoticiaAutomatica já cria, virava
        // um feed poluído de 4 postagens por jogo, a maioria dizendo a mesma coisa. O resultado em
        // si já tem post garantido (ver salvarPartida); esta função agora só entra em cena depois
        // de uma DERROTA, pra simular a torcida cornetando — e gera só 1 post, curto, tipo legenda
        // de Instagram, não um parágrafo.
        async function gerarPostsSocial(contextoExtra = "Pós-Jogo") {
            let loader = document.getElementById('loader-social');
            if(loader) loader.style.display = 'block';

            let resumoUltimos = db[currentSave].partidas.slice(-2).map(p => `${p.adversario} (${p.golsPro}x${p.golsContra})`).join(' | ');
            let plantelAtivo = db[currentSave].plantel.filter(p => p.status === 'Ativo');
            // Filtra apenas jogadores importantes (OVR >= 70) para a torcida cobrar
            let jogadoresRelevantes = plantelAtivo.filter(p => p.ovr >= 70).map(p => `${p.nome} (OVR ${p.ovr})`).join(', ');

            let promptIA = `Você é um torcedor influente do "${db[currentSave].nome}" reagindo nas redes sociais ao resultado mais recente.
            Contexto:
            - Evento Recente: ${contextoExtra}
            - Aprovação da Torcida: ${db[currentSave].aprovacaoTorcida}/100
            - Últimos Resultados: ${resumoUltimos || "Início de temporada"}
            - Elenco Atual (USE APENAS ESTES NOMES SE FOR CITAR ALGUM JOGADOR): ${jogadoresRelevantes || "Nenhum jogador relevante cadastrado ainda"}

            ⚠️ TOM TEM QUE BATER COM O CONTEXTO (MUITO IMPORTANTE): torcedor de time grande sabe reconhecer uma boa atuação mesmo perdendo. Se o "Evento Recente" descrever uma derrota apertada, fora de casa, contra um adversário claramente mais forte, ou com domínio de posse/finalizações do próprio time, o tom deve ser de reconhecimento ou cobrança leve ("time crescendo", "orgulho apesar do resultado", "seguimos fortes") — NÃO de fúria. Reserve a cornetada pesada (cobrança dura, pedido de venda de jogador) pra derrotas em casa, goleadas, ou sequências ruins repetidas — é isso que o contexto vai te dizer.

            Escreva UMA ÚNICA postagem CURTA (1 frase, no máximo 2) — é uma legenda de post tipo Instagram/Twitter, não um artigo. Sem textão.

            ⚠️ REGRA DE OURO SOBRE JOGADORES (MUITO IMPORTANTE): É PROIBIDO inventar ou citar qualquer jogador que não esteja EXATAMENTE na lista "Elenco Atual" acima. Se for pedir a venda de alguém (campo "pede_venda_jogador"), o nome TEM que ser copiado exatamente dessa lista. Se não houver ninguém adequado pra criticar, deixe "pede_venda_jogador" vazio.

            ⚠️ Para "opcoesRapidas", gere 3 "Posturas/Intenções" curtas com no máximo 3 palavras e 1 emoji. Exemplos: ["🎯 Foco total", "🔥 Rebater Crítica", "🧘‍♂️ Calma e tempo"].

            Retorne EXATAMENTE este formato JSON PURO, sem formatação markdown:
            {
              "perfil_nome": "Nome do Perfil",
              "arroba": "@arroba_do_perfil",
              "emoji_avatar": "😤",
              "texto": "Postagem curta aqui...",
              "likes": 4302,
              "pede_venda_jogador": "Nome exato do jogador criticado (ou vazio)",
              "opcoesRapidas": ["Opção 1", "Opção 2", "Opção 3"]
            }`;

            try {
                const data = await chamarIA({ contents: [{ parts: [{ text: promptIA }] }] });
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);

                if (match) {
                    let p = JSON.parse(match[0]);

                    if(!db[currentSave].socialFeed) db[currentSave].socialFeed = [];
                    if(!db[currentSave].alvosTorcida) db[currentSave].alvosTorcida = {};

                    p.id = 'post_' + Date.now() + Math.random().toString(36).substr(2, 9);
                    p.categoria = 'corneta';
                    p.vistoPeloUser = false;
                    if (!p.opcoesRapidas) p.opcoesRapidas = ["Seguimos trabalhando forte!", "O foco é o próximo desafio.", "Não vou comentar arbitragem/críticas."];
                    db[currentSave].socialFeed.unshift(p);
                    if (typeof atualizarBadgeSocial === 'function') atualizarBadgeSocial();

                    // Lógica da Caça às Bruxas: pressão repetida da torcida por um jogador vira exigência da diretoria
                    if(p.pede_venda_jogador && p.pede_venda_jogador.trim() !== "") {
                        let alvo = p.pede_venda_jogador.trim();
                        // A IA às vezes inventa um nome ou aponta alguém que não é nosso: só vira
                        // exigência quem realmente está ativo no elenco e pode ser negociado
                        // (quem chegou emprestado pertence a outro clube).
                        let alvoReal = plantelAtivo.find(j => j.nome.toLowerCase() === alvo.toLowerCase());
                        if (alvoReal && !jogadorPertenceAOutroClube(alvoReal)) {
                            alvo = alvoReal.nome;
                            db[currentSave].alvosTorcida[alvo] = (db[currentSave].alvosTorcida[alvo] || 0) + 1;

                            // Se bater 3 exigências seguidas da torcida, a diretoria interfere
                            if(db[currentSave].alvosTorcida[alvo] >= 3 && !db[currentSave].exigenciasDiretoria.includes(alvo)) {
                                db[currentSave].exigenciasDiretoria.push(alvo);
                                setTimeout(() => {
                                    document.getElementById('evento-texto').innerHTML = `A pressão da torcida no Feed Social ficou insustentável! A diretoria exige a venda/empréstimo de <strong>${alvo}</strong> imediatamente para acalmar os ânimos. Vá até o Mercado.`;
                                    document.querySelector('.evento-box').style.borderColor = "var(--danger)";
                                    document.getElementById('modal-evento').style.display = 'flex';
                                }, 1500);
                            }
                        }
                    }

                    // Limita a 50 posts no histórico (5 páginas)
                    if(db[currentSave].socialFeed.length > 50) db[currentSave].socialFeed = db[currentSave].socialFeed.slice(0, 50);
                }
            } catch(e) { console.log("Erro ao gerar feed", e); }

            salvarDados();
            postsVisiveisSocial = 10; // Reseta para a primeira página ao atualizar o feed
            if(loader) loader.style.display = 'none';
            renderizarSocialFeed();
        }

        // ADAPTAÇÃO: A antiga função de "notícia automática" (que era gerada em contratações)
        // agora vira um tweet oficial do Jornalista e entra no Feed Social.
        // categoriaForcada é opcional — quando quem chama já sabe o tipo do evento (ex: resultado
        // de partida, que sabe se foi vitória/derrota/empate) passa aqui; senão a categoria é
        // adivinhada pelas palavras do título (categoriaDoPost), cobrindo todo o resto dos mais de
        // 30 lugares do app que já chamavam esta função sem precisar mexer em nenhum deles.
        function adicionarNoticiaAutomatica(titulo, detalhe, categoriaForcada) {
            if(!db[currentSave].socialFeed) db[currentSave].socialFeed = [];

            let categoria = categoriaForcada || categoriaDoPost(titulo);

            // Perfil muda um pouco pelo tipo de notícia — Fabrizio pra mercado/dinheiro,
            // Departamento Médico pra lesão, Diário Esportivo pro resto (jogo, vestiário, etc.)
            let nomePerfil = "Diário Esportivo", arrobaPerfil = "@diario_esporte", emojiPerfil = "📰";
            if (categoria === 'contratacao' || categoria === 'venda' || categoria === 'financeiro') {
                nomePerfil = "Fabrizio Transferências"; arrobaPerfil = "@fabrizio_mercato"; emojiPerfil = "🚨";
            } else if (categoria === 'lesao') {
                nomePerfil = "Departamento Médico"; arrobaPerfil = "@dm_oficial"; emojiPerfil = "🏥";
            }

            db[currentSave].socialFeed.unshift({
                id: 'post_' + Date.now() + Math.random().toString(36).substr(2, 9),
                perfil_nome: nomePerfil,
                arroba: arrobaPerfil,
                emoji_avatar: emojiPerfil,
                categoria: categoria,
                legenda: titulo,
                detalhe: detalhe,
                texto: `${titulo} ${detalhe}`, // mantido só pros prompts de IA (resposta/curtida) lerem o contexto completo
                likes: gerarNumeroAleatorio(5000, 25000),
                pede_venda_jogador: "",
                opcoesRapidas: ["Seguimos trabalhando forte!", "O foco é no campo.", "Sem comentários no momento."],
                vistoPeloUser: false
            });
            if (typeof atualizarBadgeSocial === 'function') atualizarBadgeSocial();

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
                e.target.classList.contains('insta-icone')) {
                playClickSound();
            }
        });
