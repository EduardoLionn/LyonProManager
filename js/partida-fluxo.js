// =====================================================================================
// FLUXO DA PARTIDA — Iniciar → Jogar → Salvar
// =====================================================================================
// A partida agora tem um começo explícito. Antes de registrar qualquer resultado é preciso
// Iniciar a Partida na aba "Salvar Partida": ali se declara o adversário, a competição e a
// escalação (à mão, pelo print da tela do jogo, ou aproveitando o plano do Auxiliar).
//
// Por que isso importa: com a partida iniciada, o Auxiliar sabe exatamente quem entrou em
// campo e em que esquema — então as sugestões de substituição durante o jogo passam a ser
// sobre os jogadores certos, e o histórico guarda a escalação real com os minutos das trocas.
//
// A aba do Auxiliar Técnico não escala mais ninguém: lá fica só o plano que ele sugere.

// -------------------------------------------------------------------------------------
// COMO A ESCALAÇÃO É MONTADA
// -------------------------------------------------------------------------------------
// A escalação é montada no MESMO campinho que se usa durante o jogo — clicando no jogador
// pra trocar, com camisa, OVR e nome. Pra isso a partida nasce já como objeto real, com
// status 'montando', e o "Iniciar Partida" só vira a chave pra 'em_andamento'.
//
// A vantagem de não ter um formulário paralelo: todo o maquinário que já existia (seletor
// de troca por compatibilidade de posição, mudar formação, banco clicável) funciona igual
// antes e depois do apito inicial, sem código duplicado.

function _plantelDisponivelParaEscalar() {
    let d = db[currentSave];
    if (!d || !d.plantel) return [];
    if (typeof garantirCondicaoFisicaTodos === 'function') garantirCondicaoFisicaTodos();
    return d.plantel.filter(p => p.status === 'Ativo');
}

function _jogadorIndisponivel(p) {
    return (p.diasLesao > 0) || p.suspensoVermelho || (p.poupadoRestante > 0);
}

// Escolhe os melhores disponíveis pra cada função da formação, respeitando compatibilidade
// de posição e evitando quem está lesionado, suspenso ou poupado pelo Departamento Médico.
function _montarTitularesAutomaticos(formacao) {
    let coords = coordsFormacoes[formacao] || [];
    let elenco = _plantelDisponivelParaEscalar();
    let usados = new Set();
    let titulares = {};

    // Funções mais específicas primeiro (menos candidatos) pra não sobrar buraco no fim
    let ordemRoles = coords.map(c => c.role).sort((a, b) => {
        let na = elenco.filter(p => posicaoCompativelComRole(a, p.posicao)).length;
        let nb = elenco.filter(p => posicaoCompativelComRole(b, p.posicao)).length;
        return na - nb;
    });

    ordemRoles.forEach(role => {
        let candidatos = elenco.filter(p => !usados.has(p.nome) && posicaoCompativelComRole(role, p.posicao));
        let saudaveis = candidatos.filter(p => !_jogadorIndisponivel(p));
        let pool = saudaveis.length ? saudaveis : candidatos;
        if (!pool.length) {
            pool = elenco.filter(p => !usados.has(p.nome) && !_jogadorIndisponivel(p));
            if (!pool.length) pool = elenco.filter(p => !usados.has(p.nome));
        }
        if (!pool.length) return;
        pool.sort((a, b) => b.ovr - a.ovr);
        titulares[role] = { nome: pool[0].nome, instrucao: '' };
        usados.add(pool[0].nome);
    });

    return { titulares, usados };
}

// Agrupa a posição de carteirinha numa das 3 grandes linhas do time — só serve pra montar o
// banco com profundidade realista (defesa/meio/ataque bem representados), não pra escalar
// (isso é posicaoCompativelComRole, que é mais fino). Goleiro fica de fora: tem regra própria.
function _linhaAmplaDaPosicao(posicao) {
    let prefixo = String(posicao || '').split('/')[0];
    if (prefixo === 'Zagueiro' || prefixo === 'Lateral') return 'DEF';
    if (prefixo === 'Volante' || prefixo === 'MeioCampo') return 'MEI';
    if (prefixo === 'Ponta' || prefixo === 'Atacante') return 'ATA';
    return null;
}

// Banco com profundidade realista, sempre com um goleiro reserva e no máximo 9 nomes.
// Um banco de verdade cobre o time inteiro — antes esta função só pegava os melhores OVRs
// restantes na ordem em que apareciam no elenco, então times com elenco forte na zaga
// acabavam com o banco inteiro de zagueiro e nenhuma opção de ataque. Agora as 8 vagas de
// linha (fora o goleiro) são distribuídas em rodízio entre defesa/meio/ataque — sempre o
// melhor OVR disponível DENTRO de cada linha — e uma linha sem mais opções simplesmente cede
// a vaga às outras, sem deixar o banco mais curto que precisa.
function _montarBancoAutomatico(usados) {
    let elenco = _plantelDisponivelParaEscalar();
    let restantes = elenco.filter(p => !usados.has(p.nome)).sort((a, b) => {
        if (_jogadorIndisponivel(a) !== _jogadorIndisponivel(b)) return _jogadorIndisponivel(a) ? 1 : -1;
        return b.ovr - a.ovr;
    });

    let banco = [];
    let goleiro = restantes.find(p => String(p.posicao).split('/')[0] === 'Goleiro');
    if (goleiro) banco.push(goleiro);

    let jaNoBanco = new Set(banco.map(p => p.nome));
    let porLinha = { DEF: [], MEI: [], ATA: [] };
    restantes.forEach(p => {
        let linha = _linhaAmplaDaPosicao(p.posicao);
        if (linha && !jaNoBanco.has(p.nome)) porLinha[linha].push(p);
    });

    let ordemLinhas = ['DEF', 'MEI', 'ATA'];
    let ponteiro = { DEF: 0, MEI: 0, ATA: 0 };
    let seguiu = true;
    while (banco.length < 9 && seguiu) {
        seguiu = false;
        for (let linha of ordemLinhas) {
            if (banco.length >= 9) break;
            let lista = porLinha[linha];
            if (ponteiro[linha] < lista.length) {
                banco.push(lista[ponteiro[linha]]);
                ponteiro[linha]++;
                seguiu = true;
            }
        }
    }

    return ordenarBancoPorPosicao(banco.map(p => ({
        nome: p.nome, posicao: p.posicao,
        papel: String(p.posicao).split('/')[0] === 'Goleiro' ? 'Goleiro reserva' : ''
    })));
}

// Cria a partida em modo "montando" — a partir daqui tudo acontece no campinho.
function _criarPartidaEmMontagem(dados) {
    let d = db[currentSave];
    let adversario = (document.getElementById('inicio-partida-adversario').value || '').trim();
    if (!adversario) { alert('Informe o adversário antes de montar a escalação.'); return null; }

    let tatica = (typeof taticaDoSave === 'function') ? Object.assign({}, taticaDoSave()) : null;
    let formacao = (dados && dados.formacao) || (tatica ? tatica.esquema : '4-2-3-1');
    if (!coordsFormacoes[formacao]) formacao = '4-2-3-1';
    if (tatica) tatica.esquema = formacao;

    d.partidaAuxiliar = {
        id: Date.now(),
        status: 'montando',
        adversarioNome: adversario,
        adversarioInfo: (dados && dados.adversarioInfo) || '',
        analiseGeral: (dados && dados.analiseGeral) || '',
        diretriz: (dados && dados.diretriz) || '',
        formacaoEscolhida: formacao,
        titulares: (dados && dados.titulares) || {},
        banco: (dados && dados.banco) || [],
        tatica: tatica,
        substituicoes: [],
        jogadoresForaDaPartida: [],
        ajustesFeitos: [],
        criadaEm: Date.now()
    };
    if (typeof pitchToggleSubView !== 'undefined') pitchToggleSubView = {};
    salvarDados();
    return d.partidaAuxiliar;
}

function montarEscalacaoAutomatica() {
    let tatica = (typeof taticaDoSave === 'function') ? taticaDoSave() : null;
    let formacao = tatica ? tatica.esquema : '4-2-3-1';
    if (!coordsFormacoes[formacao]) formacao = '4-2-3-1';

    if (_plantelDisponivelParaEscalar().length === 0) return alert('Cadastre o elenco na aba "Elenco do Time" antes de iniciar uma partida.');

    let { titulares, usados } = _montarTitularesAutomaticos(formacao);
    let criada = _criarPartidaEmMontagem({ formacao, titulares, banco: _montarBancoAutomatico(usados) });
    if (criada) renderizarAbaSalvarPartida();
}

// O print da tela de Gerenciamento do Time mostra 11 titulares e só 8 reservas: o goleiro
// reserva fica fora do enquadramento. Esta função fecha esse buraco escolhendo o goleiro de
// maior OVR que não esteja entre os titulares.
function completarGoleiroReserva(titularesNomes, banco) {
    let elenco = _plantelDisponivelParaEscalar();
    let jaTemGoleiroNoBanco = banco.some(n => {
        let p = elenco.find(x => x.nome === n);
        return p && String(p.posicao).split('/')[0] === 'Goleiro';
    });
    if (jaTemGoleiroNoBanco) return { banco: banco, adicionado: null };

    let goleiro = elenco
        .filter(p => String(p.posicao).split('/')[0] === 'Goleiro' && !titularesNomes.includes(p.nome) && !banco.includes(p.nome))
        .sort((a, b) => b.ovr - a.ovr)[0];
    if (!goleiro) return { banco: banco, adicionado: null };

    let novo = banco.filter(Boolean);
    novo.unshift(goleiro.nome);
    return { banco: novo.slice(0, 9), adicionado: goleiro.nome };
}

// Mesma regra de ouro do banco automático (sempre 1 goleiro reserva), mas pro formato que o
// plano de partida da IA usa: reservas como {nome, posicao, papel}, não só nomes. A IA às vezes
// esquece de incluir um goleiro no banco — isso corrige isso sem depender dela lembrar.
function garantirGoleiroNoBanco(reservas, escalacao) {
    let lista = Array.isArray(reservas) ? reservas.filter(r => r && r.nome) : [];
    if (!db[currentSave]) return lista;

    let jaTemGoleiro = lista.some(r => {
        let p = db[currentSave].plantel.find(x => x.nome === r.nome);
        return p && String(p.posicao).split('/')[0] === 'Goleiro';
    });
    if (jaTemGoleiro) return lista;

    let titularesNomes = new Set(Object.values(escalacao || {}).map(j => j && j.nome).filter(Boolean));
    let nomesNoBanco = new Set(lista.map(r => r.nome));
    let elenco = (typeof _plantelDisponivelParaEscalar === 'function') ? _plantelDisponivelParaEscalar() : db[currentSave].plantel;
    let goleiro = elenco
        .filter(p => String(p.posicao).split('/')[0] === 'Goleiro' && !titularesNomes.has(p.nome) && !nomesNoBanco.has(p.nome))
        .sort((a, b) => b.ovr - a.ovr)[0];
    if (!goleiro) return lista;

    let novo = lista.slice();
    novo.unshift({ nome: goleiro.nome, posicao: goleiro.posicao, papel: 'Goleiro reserva' });
    return novo.slice(0, 9);
}

// Reordena qualquer lista de reservas do goleiro ao atacante (mesmo padrão da aba "Todos os
// Jogadores" do seletor de troca). Aplicado tanto no banco automático quanto no banco que a IA
// sugere — a IA pode devolver a ordem que quiser, mas a leitura na tela sempre sai organizada.
function ordenarBancoPorPosicao(reservas) {
    if (!Array.isArray(reservas)) return reservas;
    return reservas.slice().sort((a, b) => (ordemPosicoes[a && a.posicao] || 8) - (ordemPosicoes[b && b.posicao] || 8));
}

// -------------------------------------------------------------------------------------
// LEITURA DA ESCALAÇÃO POR PRINT
// -------------------------------------------------------------------------------------

async function lerEscalacaoDoPrint(event) {
    let file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    let loader = document.getElementById('inicio-escalacao-loader');
    if (loader) { loader.style.display = 'block'; loader.innerText = '⏳ Lendo a escalação do print...'; }

    try {
        let base64 = await new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        let elenco = _plantelDisponivelParaEscalar();
        let nomesElenco = elenco.map(p => `${p.nome} (${p.posicao}, ${p.ovr})`).join('; ');
        let formacoes = (typeof listaFormacoesDisponiveis === 'function') ? listaFormacoesDisponiveis().join(', ') : '';

        let prompt = `Você está lendo um print da tela "Gerenciamento do Time" de um jogo de futebol. Extraia a escalação.

MEU ELENCO (use EXATAMENTE estes nomes — o print mostra sobrenomes, faça a correspondência com o nome completo da lista): ${nomesElenco}

O que extrair:
1. A formação/esquema em campo, se estiver visível. Use um destes nomes: ${formacoes}
2. Os 11 titulares que aparecem no campinho, com a posição de cada um.
3. Os jogadores que aparecem na área de "Reservas".

REGRAS:
- Só use nomes que existem na lista do elenco acima. Se um nome do print não bater com ninguém da lista, ignore-o.
- Não invente jogadores nem repita o mesmo jogador em dois lugares.
- É normal a lista de reservas do print vir incompleta; devolva só o que você conseguir ver.

Retorne EXATAMENTE este JSON puro:
{
  "formacao": "4-2-3-1",
  "titulares": [{"nome": "Nome exato da lista", "posicao": "GOL/ZAG/LAT/VOL/MEI/PON/ATA"}],
  "reservas": ["Nome exato da lista"]
}`;

        const data = await chamarIA({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64 } }] }]
        });
        let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('A IA não devolveu um JSON legível.');
        let res = JSON.parse(match[0]);

        aplicarEscalacaoLida(res, loader);
    } catch (e) {
        if (loader) { loader.style.display = 'block'; loader.style.color = 'var(--danger)'; loader.innerText = `❌ Não consegui ler o print: ${e.message}`; }
    }
}

// Encaixa o que foi lido do print nas funções da formação, respeitando compatibilidade.
function aplicarEscalacaoLida(res, loader) {
    let elenco = _plantelDisponivelParaEscalar();
    let acharNoElenco = (nome) => {
        if (!nome) return null;
        let alvo = String(nome).toLowerCase().trim();
        return elenco.find(p => p.nome.toLowerCase() === alvo)
            || elenco.find(p => p.nome.toLowerCase().includes(alvo) || alvo.includes(p.nome.toLowerCase()));
    };

    let tatica = (typeof taticaDoSave === 'function') ? taticaDoSave() : null;
    let formacao = coordsFormacoes[res.formacao] ? res.formacao : (tatica ? tatica.esquema : '4-2-3-1');
    if (!coordsFormacoes[formacao]) formacao = '4-2-3-1';
    let coords = coordsFormacoes[formacao] || [];

    let lidos = (Array.isArray(res.titulares) ? res.titulares : [])
        .map(t => acharNoElenco(t && t.nome))
        .filter(Boolean);

    // Casa cada jogador lido com a função mais adequada que ainda estiver livre
    let titulares = {};
    let usados = new Set();
    let rolesLivres = coords.map(c => c.role);

    lidos.forEach(jogador => {
        if (usados.has(jogador.nome)) return;
        let role = rolesLivres.find(r => posicaoCompativelComRole(r, jogador.posicao));
        if (role) {
            titulares[role] = { nome: jogador.nome, instrucao: '' };
            usados.add(jogador.nome);
            rolesLivres = rolesLivres.filter(r => r !== role);
        }
    });
    lidos.forEach(jogador => {
        if (usados.has(jogador.nome) || rolesLivres.length === 0) return;
        titulares[rolesLivres.shift()] = { nome: jogador.nome, instrucao: '' };
        usados.add(jogador.nome);
    });

    let bancoNomes = (Array.isArray(res.reservas) ? res.reservas : [])
        .map(n => acharNoElenco(n))
        .filter(p => p && !usados.has(p.nome))
        .map(p => p.nome);
    bancoNomes = [...new Set(bancoNomes)].slice(0, 9);

    // O print corta o goleiro reserva — completa aqui
    let { banco: bancoFinal, adicionado } = completarGoleiroReserva(Object.values(titulares).map(t => t.nome), bancoNomes);
    let banco = ordenarBancoPorPosicao(bancoFinal.filter(Boolean).map(nome => {
        let p = elenco.find(x => x.nome === nome);
        return { nome: nome, posicao: p ? p.posicao : '', papel: nome === adicionado ? 'Goleiro reserva (completado)' : '' };
    }));

    // Se faltou alguém pra fechar os 11, completa pelo elenco em vez de deixar buraco
    let faltando = coords.filter(c => !titulares[c.role]);
    let completados = [];
    if (faltando.length) {
        let auto = _montarTitularesAutomaticos(formacao);
        faltando.forEach(c => {
            let escolha = auto.titulares[c.role];
            if (escolha && !usados.has(escolha.nome) && !banco.some(b => b.nome === escolha.nome)) {
                titulares[c.role] = escolha;
                usados.add(escolha.nome);
                completados.push(`${c.role}: ${escolha.nome}`);
            }
        });
    }

    let criada = _criarPartidaEmMontagem({ formacao, titulares, banco });
    if (!criada) return;
    renderizarAbaSalvarPartida();

    if (loader) {
        loader.style.display = 'block';
        loader.style.color = 'var(--primary)';
        let partes = [`✅ Print lido: ${lidos.length} titular(es) e ${bancoNomes.length} reserva(s) no esquema ${formacao}.`];
        if (adicionado) partes.push(`🧤 O goleiro reserva não aparece no print — completei com ${adicionado} (maior OVR entre os goleiros que não são titulares).`);
        if (completados.length) partes.push(`⚡ Completei o que faltava pelo elenco: ${completados.join(', ')}. Clique no campinho pra ajustar.`);
        loader.innerHTML = partes.join('<br>');
    }
}

// -------------------------------------------------------------------------------------
// APROVEITAR O PLANO DO AUXILIAR
// -------------------------------------------------------------------------------------

function usarSugestaoDoAuxiliar() {
    let d = db[currentSave];
    let sug = d && d.sugestaoAuxiliar;
    if (!sug) return;

    let campoAdv = document.getElementById('inicio-partida-adversario');
    if (campoAdv && !campoAdv.value.trim() && sug.adversarioNome) campoAdv.value = sug.adversarioNome;

    let elenco = _plantelDisponivelParaEscalar();
    let banco = ordenarBancoPorPosicao((sug.reservas || []).filter(r => r && r.nome).slice(0, 9).map(r => {
        let p = elenco.find(x => x.nome === r.nome);
        return { nome: r.nome, posicao: p ? p.posicao : (r.posicao || ''), papel: r.papel || '' };
    }));

    let criada = _criarPartidaEmMontagem({
        formacao: sug.tatica ? sug.tatica.esquema : null,
        titulares: JSON.parse(JSON.stringify(sug.escalacao || {})),
        banco: banco,
        adversarioInfo: sug.adversarioInfo,
        analiseGeral: sug.analiseGeral,
        diretriz: sug.diretriz
    });
    if (!criada) return;

    // O plano do Auxiliar traz o pacote tático dele — é o que vale nesta partida
    if (sug.tatica) criada.tatica = Object.assign({}, sug.tatica);
    criada.alertaRotacao = sug.alertaRotacao || '';
    criada.rotacoesAutomaticas = sug.rotacoesAutomaticas || [];

    // Fotografia da escalação ORIGINAL sugerida pelo Auxiliar — não muda mais depois disso.
    // É o que permite mostrar a função (ex: "Defesa-Equilibrado") em cima de quem o treinador
    // manteve como o Auxiliar sugeriu, e nada em cima de quem foi trocado manualmente.
    criada.escalacaoSugeridaAuxiliar = JSON.parse(JSON.stringify(criada.titulares));

    // A função de cada posição que o Auxiliar decidiu PARA ESTE ADVERSÁRIO específico (pode
    // divergir do cálculo genérico por especialidade — ex: foco de Defesa contra um time de posse).
    if (sug.funcoesPorRole) criada.funcoesPorRoleSugeridas = JSON.parse(JSON.stringify(sug.funcoesPorRole));

    salvarDados();
    renderizarAbaSalvarPartida();
}

// -------------------------------------------------------------------------------------
// INICIAR DE FATO
// -------------------------------------------------------------------------------------

function iniciarPartidaDoSetup() {
    let d = db[currentSave];
    let partida = d && d.partidaAuxiliar;
    if (!partida || partida.status !== 'montando') return;

    let coords = coordsFormacoes[partida.formacaoEscolhida] || [];
    let faltando = coords.filter(c => !partida.titulares[c.role] || !partida.titulares[c.role].nome);
    if (faltando.length > 0) {
        return alert(`Faltam ${faltando.length} jogador(es) na escalação: ${faltando.map(c => c.role).join(', ')}. Clique nas vagas vazias do campinho pra preencher.`);
    }

    partida.status = 'em_andamento';
    // Fotografia do apito inicial: é o que separa a escalação original das trocas do jogo.
    // A formação vai junto porque, se ela mudar no meio do jogo, formacaoEscolhida passa a
    // apontar pra final — e o campinho do histórico precisa da formação original.
    partida.escalacaoInicial = JSON.parse(JSON.stringify(partida.titulares));
    partida.formacaoInicial = partida.formacaoEscolhida;
    partida.bancoInicial = JSON.parse(JSON.stringify(partida.banco || []));
    partida.substituicoes = [];
    partida.jogadoresForaDaPartida = [];
    partida.iniciadaEm = Date.now();

    if (typeof pitchToggleSubView !== 'undefined') pitchToggleSubView = {};
    salvarDados();
    renderizarAbaSalvarPartida();
    if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Partida iniciada vs ${partida.adversarioNome}`);
}

async function cancelarPartidaEmAndamento() {
    let partida = db[currentSave].partidaAuxiliar;
    let montando = partida && partida.status === 'montando';
    let msg = montando
        ? 'Descartar esta escalação e começar de novo?'
        : 'Descartar esta partida? A escalação e as substituições declaradas serão perdidas.';
    if (await confirmarModerno(msg, montando ? 'Descartar Escalação' : 'Cancelar Partida', { perigo: true, textoConfirmar: 'Descartar' })) {
        db[currentSave].partidaAuxiliar = null;
        // Descartar também limpa o nome do adversário — senão ele fica preso no campo e
        // atrapalha a próxima escalação (ver salvarPartida, mesmo motivo).
        let elAdv = document.getElementById('inicio-partida-adversario'); if (elAdv) elAdv.value = '';
        salvarDados();
        renderizarAbaSalvarPartida();
    }
}

// -------------------------------------------------------------------------------------
// ORQUESTRAÇÃO DA ABA
// -------------------------------------------------------------------------------------

// Placar de confronto no topo da partida. Antes era uma caixa colorida com uma frase corrida
// ("EM ANDAMENTO: Time vs Adversário") e a tática espremida numa linha separada por bolinhas —
// ilegível e sem nada de dia de jogo. Agora: faixa de estado, os dois times frente a frente e
// o pacote tático em fichas, cada escolha na sua.
function montarPlacarConfronto(elemento, dados, partida, montando) {
    elemento.className = 'matchday-header';
    // O elemento nasce com estilos inline no HTML; zera pra classe assumir o visual.
    elemento.style.background = '';
    elemento.style.border = '';
    elemento.style.padding = '';

    let subsUsadas = (partida.substituicoes || []).length;
    let faixa = montando
        ? `<span class="matchday-estado">📋 Montando a escalação</span>
           <span class="matchday-subs">Ainda dá pra mexer à vontade</span>`
        : `<span class="matchday-estado"><span class="matchday-ponto-vivo"></span> Ao vivo</span>
           <span class="matchday-subs ${subsUsadas >= 5 ? 'esgotado' : ''}">Substituições <strong>${subsUsadas}/5</strong></span>`;

    // Cada escolha tática vira uma ficha própria — a formação em destaque, que é o que o
    // treinador mais olha durante o jogo.
    let t = partida.tatica;
    let chips = [`<span class="matchday-chip matchday-chip-destaque">${partida.formacaoEscolhida || '—'}</span>`];
    if (t && typeof predefinicaoPorId === 'function') {
        let pre = predefinicaoPorId(t.predefinicao);
        let est = (typeof estiloArmacaoPorId === 'function') ? estiloArmacaoPorId(t.estiloArmacao) : null;
        let faixaDef = (typeof faixaAbordagem === 'function') ? faixaAbordagem(t.abordagemDefensiva) : null;
        if (pre && pre.nome) chips.push(`<span class="matchday-chip"><span>Estilo</span> ${pre.nome}</span>`);
        if (est && est.nome) chips.push(`<span class="matchday-chip"><span>Armação</span> ${est.nome}</span>`);
        if (faixaDef && faixaDef.nome) chips.push(`<span class="matchday-chip"><span>Defesa</span> ${faixaDef.nome} (${t.abordagemDefensiva})</span>`);
    }
    if (partida.diretriz) chips.push(`<span class="matchday-chip"><span>Diretriz</span> ${partida.diretriz}</span>`);

    elemento.innerHTML = `
        <div class="matchday-faixa ${montando ? 'matchday-faixa-montando' : 'matchday-faixa-aovivo'}">${faixa}</div>
        <div class="matchday-confronto">
            <div class="matchday-time">
                <span class="matchday-time-rotulo">Nosso time</span>
                <span class="matchday-time-nome">${dados.nome || '—'}</span>
            </div>
            <span class="matchday-vs">VS</span>
            <div class="matchday-time matchday-time-adv">
                <span class="matchday-time-rotulo">Adversário</span>
                <span class="matchday-time-nome">${partida.adversarioNome || '—'}</span>
            </div>
        </div>
        <div class="matchday-tatica">${chips.join('')}</div>`;
}

function renderizarAbaSalvarPartida() {
    let d = db[currentSave];
    if (!d) return;
    let setup = document.getElementById('partida-setup');
    let andamento = document.getElementById('partida-andamento');
    let resultado = document.getElementById('partida-resultado');
    if (!setup || !andamento || !resultado) return;

    let partida = d.partidaAuxiliar;

    // Sem partida: só a pergunta do adversário e como montar a escalação
    if (!partida) {
        setup.style.display = 'block';
        andamento.style.display = 'none';
        resultado.style.display = 'none';

        let boxSug = document.getElementById('inicio-sugestao-auxiliar');
        if (boxSug) {
            let sug = d.sugestaoAuxiliar;
            if (sug) {
                boxSug.style.display = 'block';
                boxSug.innerHTML = `🤖 <strong>${(typeof nomeAuxiliarExibicao === 'function' ? nomeAuxiliarExibicao() : 'O Auxiliar')} já montou um plano</strong> contra <strong>${sug.adversarioNome}</strong> (${sug.tatica ? sug.tatica.esquema : '—'}).
                    <button onclick="usarSugestaoDoAuxiliar()" style="margin-left:8px; background:var(--accent); color:white; padding:6px 12px; font-size:12px;">📥 Escalar com este plano</button>`;
            } else {
                boxSug.style.display = 'none';
            }
        }
        return;
    }

    let montando = partida.status === 'montando';
    setup.style.display = 'none';
    andamento.style.display = 'block';
    resultado.style.display = montando ? 'none' : 'block';

    let banner = document.getElementById('partida-banner');
    if (banner) montarPlacarConfronto(banner, d, partida, montando);

    let dica = document.getElementById('partida-dica-campinho');
    if (dica) {
        dica.innerText = montando
            ? 'Clique num jogador pra trocar. Vagas vazias abrem a lista do elenco.'
            : 'Clique num jogador em campo pra trocar de posição ou declarar substituição. A setinha verde ▲ mostra quem entrou — clique nela pra ver quem saiu.';
    }

    let cab = document.getElementById('resultado-cabecalho-partida');
    if (cab) cab.innerHTML = `📋 Registrando o resultado de <strong>${d.nome} vs ${partida.adversarioNome}</strong>. Preencha abaixo o contexto do jogo e as estatísticas — dá pra ler tudo de um print.`;

    let acoes = document.getElementById('auxiliar-acoes-partida');
    if (acoes) {
        if (montando) {
            acoes.innerHTML = `
                <button onclick="abrirMudarFormacaoManual()" style="flex:1; min-width:180px; background:var(--panel-bg); border:1px solid var(--accent); color:var(--accent);">🔄 Mudar Formação</button>
                <button class="btn-hero-secundario" onclick="cancelarPartidaEmAndamento()" style="color:var(--danger); border-color:var(--danger);">🗑️ Descartar</button>
                <button onclick="iniciarPartidaDoSetup()" style="flex:1 1 100%; background:var(--primary); color:black; padding:14px; font-size:16px;">▶️ Iniciar Partida</button>`;
        } else {
            let subsUsadas = (partida.substituicoes || []).length;
            acoes.innerHTML = `
                <p style="flex:1 1 100%; text-align:center; font-size:12px; color:var(--text-muted); margin: 0 0 4px 0;">Substituições: <strong style="color:${subsUsadas >= 5 ? 'var(--danger)' : 'var(--primary)'};">${subsUsadas}/5</strong> — quem sai não volta mais nesta partida.</p>
                <button onclick="abrirMudarFormacaoManual()" style="flex:1; min-width:160px; background:var(--panel-bg); border:1px solid var(--accent); color:var(--accent);">🔄 Mudar Formação</button>
                <button onclick="pedirSugestaoAoVivo()" style="flex:1; min-width:160px; background:var(--accent); color:white;">🤖 Pedir sugestão ao Auxiliar</button>
                <button class="btn-hero-secundario" onclick="cancelarPartidaEmAndamento()" style="color:var(--danger); border-color:var(--danger);">🗑️ Descartar Partida</button>`;
        }
    }

    if (typeof renderizarCampinhoLimpo === 'function') renderizarCampinhoLimpo();
}

// Atalho do botão da partida em andamento: leva pro chat do Auxiliar e deixa pronto pro
// treinador escrever. Antes preenchia uma pergunta genérica e enviava na hora — o Auxiliar
// então respondia (às vezes sugerindo substituição) sem o treinador ter dito nada de verdade
// sobre o jogo. Agora só abre e foca a caixa: o treinador escreve o que quiser e/ou anexa um
// print (📸) e só sai alguma coisa quando ELE clicar em "Conversar".
function pedirSugestaoAoVivo() {
    mudarAba('tab-auxiliar');
    let painel = document.getElementById('panel-chat-auxiliar');
    if (painel && painel.style.display === 'none' && typeof toggleChatAuxiliar === 'function') toggleChatAuxiliar();
    let input = document.getElementById('input-auxiliar');
    if (input) input.focus();
}

// -------------------------------------------------------------------------------------
// FICHA COMPLETA DA PARTIDA (aba Dashboard)
// -------------------------------------------------------------------------------------
// Ao clicar numa partida no Dashboard, além das estatísticas já mostradas, aparece a ficha
// que foi gravada quando a partida foi salva: tática aplicada, escalação do apito inicial,
// substituições com o minuto exato e o banco. Reaproveita os mesmos renderizadores do
// histórico do Auxiliar (campinho e lista de trocas) pra não existirem duas versões disso.
function gerarHtmlFichaPartida(partida) {
    let f = partida && partida.ficha;
    if (!f) {
        return `<p style="font-size:12.5px; color:var(--text-muted); margin-top:18px;">Esta partida foi registrada antes do novo fluxo (Iniciar Partida), então não tem escalação e substituições guardadas.</p>`;
    }

    // Adaptador: os renderizadores do histórico esperam os campos com estes nomes
    let paraRenderizar = {
        escalacaoInicial: f.escalacaoInicial,
        formacaoInicial: f.formacaoInicial,
        substituicoes: f.substituicoes,
        jogadoresNotas: partida.jogadores || []
    };

    let blocoTatica = '';
    if (f.tatica && typeof predefinicaoPorId === 'function') {
        let t = f.tatica;
        let pre = predefinicaoPorId(t.predefinicao);
        let est = estiloArmacaoPorId(t.estiloArmacao);
        let faixa = faixaAbordagem(t.abordagemDefensiva);
        blocoTatica = `
            <h4 class="historico-secao-titulo">🎛️ Tática aplicada</h4>
            <div class="plano-tatico">
                <div class="plano-tatico-item"><span>Predefinição</span><strong>${pre.emoji} ${pre.nome}</strong></div>
                <div class="plano-tatico-item"><span>Esquema</span><strong>${f.formacaoInicial}${f.formacaoFinal && f.formacaoFinal !== f.formacaoInicial ? ` → ${f.formacaoFinal}` : ''}</strong></div>
                <div class="plano-tatico-item"><span>Estilo de armação</span><strong>${est.nome}</strong></div>
                <div class="plano-tatico-item"><span>Abordagem defensiva</span><strong>${t.abordagemDefensiva} — ${faixa.nome}</strong></div>
            </div>`;
    }

    let bancoHtml = '';
    let banco = (f.bancoInicial || []).filter(b => b && b.nome);
    if (banco.length) {
        let entraram = new Set((f.substituicoes || []).map(s => s.entrou));
        bancoHtml = `
            <h4 class="historico-secao-titulo">🪑 Banco</h4>
            <div class="historico-subs-lista">
                ${banco.map(b => `<div class="historico-sub-item">${entraram.has(b.nome) ? '🟢' : '⚪'} <strong>${b.nome}</strong>${b.posicao ? ` — ${b.posicao}` : ''}${entraram.has(b.nome) ? ' <em>(entrou)</em>' : ''}</div>`).join('')}
            </div>`;
    }

    let contexto = [];
    if (f.diretriz) contexto.push(`<p style="margin:0 0 6px 0;"><strong>Diretriz:</strong> ${f.diretriz}</p>`);
    if (f.adversarioInfo) contexto.push(`<p style="margin:0 0 6px 0;"><strong>Sobre o adversário:</strong> ${f.adversarioInfo}</p>`);
    if (f.analiseGeral) contexto.push(`<p style="margin:0 0 6px 0;"><strong>Plano do Auxiliar:</strong> ${f.analiseGeral}</p>`);

    return `
        ${blocoTatica}
        ${contexto.length ? `<div style="font-size:13px; line-height:1.6; margin:12px 0;">${contexto.join('')}</div>` : ''}
        <h4 class="historico-secao-titulo">🧩 Escalação do apito inicial</h4>
        ${(typeof gerarHtmlCampinhoHistorico === 'function') ? gerarHtmlCampinhoHistorico(paraRenderizar) : ''}
        ${(typeof gerarHtmlSubstituicoesHistorico === 'function') ? gerarHtmlSubstituicoesHistorico(paraRenderizar) : ''}
        ${bancoHtml}`;
}
