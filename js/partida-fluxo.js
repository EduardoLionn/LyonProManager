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
// ESTADO DO FORMULÁRIO DE INÍCIO
// -------------------------------------------------------------------------------------
// Escalação sendo montada antes do apito inicial. Vive fora do save de propósito: só vira
// partida de verdade quando o treinador clica em Iniciar.
let escalacaoEmMontagem = { formacao: null, titulares: {}, banco: [] };

function _plantelDisponivelParaEscalar() {
    let d = db[currentSave];
    if (!d || !d.plantel) return [];
    if (typeof garantirCondicaoFisicaTodos === 'function') garantirCondicaoFisicaTodos();
    return d.plantel.filter(p => p.status === 'Ativo');
}

// Jogador indisponível (lesionado/suspenso) não deveria entrar em campo — a lista mostra,
// mas deixa claro o motivo, porque no fim quem manda é o que aconteceu no jogo de verdade.
function _rotuloJogadorParaSelect(p) {
    let extra = [];
    if (p.diasLesao > 0) extra.push(`🏥 ${p.diasLesao}d`);
    if (p.suspensoVermelho) extra.push('🟥 suspenso');
    if (p.poupadoRestante > 0) extra.push(`💤 poupado (${p.poupadoRestante})`);
    else if (typeof condicaoJogador === 'function') {
        let c = condicaoJogador(p);
        if (c.nivel === 'critico') extra.push('🚨 risco crítico');
        else if (c.nivel === 'risco') extra.push('⚠️ risco');
    }
    return `${p.nome} — ${p.posicao} (${p.ovr})${extra.length ? ' • ' + extra.join(' ') : ''}`;
}

// -------------------------------------------------------------------------------------
// TELA 1 — INICIAR PARTIDA
// -------------------------------------------------------------------------------------

function _optionsEsquemasPartida(selecionado) {
    return (typeof listaFormacoesDisponiveis === 'function' ? listaFormacoesDisponiveis() : Object.keys(coordsFormacoes))
        .map(f => `<option value="${f}"${f === selecionado ? ' selected' : ''}>${f}</option>`).join('');
}

function renderizarSetupPartida() {
    let d = db[currentSave];
    if (!d || !d.nome) return;

    // Esquema começa no que está definido no Perfil do Treinador
    let selEsquema = document.getElementById('inicio-partida-esquema');
    if (selEsquema) {
        let atual = escalacaoEmMontagem.formacao
            || (typeof taticaDoSave === 'function' ? taticaDoSave().esquema : '4-2-3-1');
        if (selEsquema.options.length === 0 || selEsquema.dataset.render !== 'ok') {
            selEsquema.innerHTML = _optionsEsquemasPartida(atual);
            selEsquema.dataset.render = 'ok';
            selEsquema.onchange = function () { trocarEsquemaDaMontagem(this.value); };
        }
        selEsquema.value = atual;
        escalacaoEmMontagem.formacao = atual;
    }

    // Se o Auxiliar já entregou um plano, oferece aproveitar
    let boxSug = document.getElementById('inicio-sugestao-auxiliar');
    if (boxSug) {
        let sug = d.sugestaoAuxiliar;
        if (sug) {
            boxSug.style.display = 'block';
            boxSug.innerHTML = `🤖 <strong>${(typeof nomeAuxiliarExibicao === 'function' ? nomeAuxiliarExibicao() : 'O Auxiliar')} já montou um plano</strong> contra <strong>${sug.adversarioNome}</strong> (${sug.tatica ? sug.tatica.esquema : '—'}).
                <button onclick="usarSugestaoDoAuxiliar()" style="margin-left:8px; background:var(--accent); color:white; padding:6px 12px; font-size:12px;">📥 Usar este plano</button>`;
        } else {
            boxSug.style.display = 'none';
        }
    }

    renderizarGradeEscalacao();
}

function trocarEsquemaDaMontagem(novoEsquema) {
    escalacaoEmMontagem.formacao = novoEsquema;
    // Mantém quem já foi escolhido nas funções que existem também no esquema novo
    let rolesNovos = (coordsFormacoes[novoEsquema] || []).map(c => c.role);
    let mantidos = {};
    rolesNovos.forEach(r => { if (escalacaoEmMontagem.titulares[r]) mantidos[r] = escalacaoEmMontagem.titulares[r]; });
    escalacaoEmMontagem.titulares = mantidos;
    renderizarGradeEscalacao();
}

function renderizarGradeEscalacao() {
    let grade = document.getElementById('inicio-escalacao-grade');
    if (!grade) return;

    let formacao = escalacaoEmMontagem.formacao || '4-2-3-1';
    let coords = coordsFormacoes[formacao] || [];
    let elenco = _plantelDisponivelParaEscalar();

    if (elenco.length === 0) {
        grade.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:20px;">Nenhum jogador ativo no elenco. Cadastre o elenco na aba "Elenco do Time" antes de iniciar uma partida.</p>`;
        return;
    }

    // Um jogador não pode ocupar duas funções ao mesmo tempo
    let usados = new Set(Object.values(escalacaoEmMontagem.titulares).filter(Boolean));

    let optionsPara = (valorAtual, role) => {
        let compat = [], resto = [];
        elenco.forEach(p => {
            if (usados.has(p.nome) && p.nome !== valorAtual) return;
            let ehCompat = (typeof posicaoCompativelComRole === 'function') ? posicaoCompativelComRole(role, p.posicao) : true;
            (ehCompat ? compat : resto).push(p);
        });
        let ordena = (a, b) => b.ovr - a.ovr;
        compat.sort(ordena); resto.sort(ordena);
        let opt = `<option value="">— escolher —</option>`;
        if (compat.length) opt += `<optgroup label="Posição compatível">${compat.map(p => `<option value="${p.nome}"${p.nome === valorAtual ? ' selected' : ''}>${_rotuloJogadorParaSelect(p)}</option>`).join('')}</optgroup>`;
        if (resto.length) opt += `<optgroup label="Fora de posição">${resto.map(p => `<option value="${p.nome}"${p.nome === valorAtual ? ' selected' : ''}>${_rotuloJogadorParaSelect(p)}</option>`).join('')}</optgroup>`;
        return opt;
    };

    let titularesHtml = coords.map(c => `
        <div class="escalacao-slot">
            <label>${c.role}</label>
            <select onchange="definirTitularMontagem('${c.role}', this.value)">${optionsPara(escalacaoEmMontagem.titulares[c.role] || '', c.role)}</select>
        </div>`).join('');

    // Banco: 9 vagas. Quem já é titular não aparece.
    let usadosBanco = new Set([...usados]);
    escalacaoEmMontagem.banco.forEach(n => { if (n) usadosBanco.add(n); });
    let bancoHtml = Array.from({ length: 9 }, (_, i) => {
        let atual = escalacaoEmMontagem.banco[i] || '';
        let opts = `<option value="">— vazio —</option>` + elenco
            .filter(p => !usadosBanco.has(p.nome) || p.nome === atual)
            .sort((a, b) => b.ovr - a.ovr)
            .map(p => `<option value="${p.nome}"${p.nome === atual ? ' selected' : ''}>${_rotuloJogadorParaSelect(p)}</option>`).join('');
        return `
        <div class="escalacao-slot">
            <label>Banco ${i + 1}</label>
            <select onchange="definirReservaMontagem(${i}, this.value)">${opts}</select>
        </div>`;
    }).join('');

    let preenchidos = Object.values(escalacaoEmMontagem.titulares).filter(Boolean).length;
    grade.innerHTML = `
        <div class="escalacao-cabecalho">
            <strong>Titulares</strong>
            <span style="color:${preenchidos === coords.length ? 'var(--primary)' : 'var(--warning)'};">${preenchidos}/${coords.length} escalados</span>
        </div>
        <div class="escalacao-grade">${titularesHtml}</div>
        <div class="escalacao-cabecalho" style="margin-top:18px;">
            <strong>Reservas</strong>
            <span style="color:var(--text-muted);">${escalacaoEmMontagem.banco.filter(Boolean).length}/9 no banco</span>
        </div>
        <div class="escalacao-grade">${bancoHtml}</div>`;
}

function definirTitularMontagem(role, nome) {
    if (nome) escalacaoEmMontagem.titulares[role] = nome;
    else delete escalacaoEmMontagem.titulares[role];
    // Quem virou titular sai do banco
    escalacaoEmMontagem.banco = escalacaoEmMontagem.banco.map(n => (n === nome ? '' : n));
    renderizarGradeEscalacao();
}

function definirReservaMontagem(idx, nome) {
    while (escalacaoEmMontagem.banco.length < 9) escalacaoEmMontagem.banco.push('');
    escalacaoEmMontagem.banco[idx] = nome || '';
    renderizarGradeEscalacao();
}

// Preenche a escalação com os melhores disponíveis de cada função — atalho pra quem não quer
// montar tudo à mão nem mandar print. Respeita compatibilidade de posição e evita quem está
// indisponível (lesionado, suspenso ou poupado pelo Departamento Médico).
function preencherEscalacaoAutomatica() {
    let formacao = escalacaoEmMontagem.formacao || '4-2-3-1';
    let coords = coordsFormacoes[formacao] || [];
    let elenco = _plantelDisponivelParaEscalar();
    if (elenco.length === 0) return alert('Cadastre o elenco antes de escalar.');

    let indisponivel = p => (p.diasLesao > 0) || p.suspensoVermelho || (p.poupadoRestante > 0);
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
        let saudaveis = candidatos.filter(p => !indisponivel(p));
        let pool = saudaveis.length ? saudaveis : candidatos;
        if (!pool.length) {
            pool = elenco.filter(p => !usados.has(p.nome) && !indisponivel(p));
            if (!pool.length) pool = elenco.filter(p => !usados.has(p.nome));
        }
        if (!pool.length) return;
        pool.sort((a, b) => b.ovr - a.ovr);
        titulares[role] = pool[0].nome;
        usados.add(pool[0].nome);
    });

    escalacaoEmMontagem.titulares = titulares;
    escalacaoEmMontagem.banco = _montarBancoAutomatico(usados, elenco);
    renderizarGradeEscalacao();
}

// Monta o banco por relevância, garantindo SEMPRE um goleiro reserva (ver comentário em
// completarGoleiroReserva) e no máximo 9 nomes.
function _montarBancoAutomatico(usados, elenco) {
    let indisponivel = p => (p.diasLesao > 0) || p.suspensoVermelho || (p.poupadoRestante > 0);
    let restantes = elenco.filter(p => !usados.has(p.nome)).sort((a, b) => {
        if (indisponivel(a) !== indisponivel(b)) return indisponivel(a) ? 1 : -1;
        return b.ovr - a.ovr;
    });
    let banco = [];
    let goleiro = restantes.find(p => String(p.posicao).split('/')[0] === 'Goleiro');
    if (goleiro) banco.push(goleiro.nome);
    restantes.forEach(p => { if (banco.length < 9 && !banco.includes(p.nome)) banco.push(p.nome); });
    while (banco.length < 9) banco.push('');
    return banco.slice(0, 9);
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

    let formacao = (coordsFormacoes[res.formacao]) ? res.formacao : (escalacaoEmMontagem.formacao || '4-2-3-1');
    escalacaoEmMontagem.formacao = formacao;
    let coords = coordsFormacoes[formacao] || [];

    let lidos = (Array.isArray(res.titulares) ? res.titulares : [])
        .map(t => ({ jogador: acharNoElenco(t && t.nome), posicaoPrint: (t && t.posicao) || '' }))
        .filter(x => x.jogador);

    // Casa cada jogador lido com a função mais adequada que ainda estiver livre
    let titulares = {};
    let usados = new Set();
    let rolesLivres = coords.map(c => c.role);

    // Primeira passada: só encaixes compatíveis de verdade
    lidos.forEach(({ jogador }) => {
        if (usados.has(jogador.nome)) return;
        let role = rolesLivres.find(r => posicaoCompativelComRole(r, jogador.posicao));
        if (role) {
            titulares[role] = jogador.nome;
            usados.add(jogador.nome);
            rolesLivres = rolesLivres.filter(r => r !== role);
        }
    });
    // Segunda passada: quem sobrou entra nas funções que restaram
    lidos.forEach(({ jogador }) => {
        if (usados.has(jogador.nome) || rolesLivres.length === 0) return;
        titulares[rolesLivres.shift()] = jogador.nome;
        usados.add(jogador.nome);
    });

    let banco = (Array.isArray(res.reservas) ? res.reservas : [])
        .map(n => acharNoElenco(n))
        .filter(p => p && !usados.has(p.nome))
        .map(p => p.nome);
    banco = [...new Set(banco)].slice(0, 9);

    // O print corta o goleiro reserva — completa aqui
    let { banco: bancoFinal, adicionado } = completarGoleiroReserva(Object.values(titulares), banco);
    while (bancoFinal.length < 9) bancoFinal.push('');

    escalacaoEmMontagem.titulares = titulares;
    escalacaoEmMontagem.banco = bancoFinal.slice(0, 9);

    let selEsquema = document.getElementById('inicio-partida-esquema');
    if (selEsquema) selEsquema.value = formacao;
    renderizarGradeEscalacao();

    if (loader) {
        loader.style.display = 'block';
        loader.style.color = 'var(--primary)';
        let faltando = coords.length - Object.keys(titulares).length;
        let partes = [`✅ Print lido: ${Object.keys(titulares).length} titular(es) e ${bancoFinal.filter(Boolean).length} reserva(s) no esquema ${formacao}.`];
        if (adicionado) partes.push(`🧤 O goleiro reserva não aparece no print — completei com ${adicionado} (maior OVR entre os goleiros que não são titulares).`);
        if (faltando > 0) partes.push(`⚠️ Faltam ${faltando} função(ões) — complete abaixo antes de iniciar.`);
        loader.innerHTML = partes.join('<br>');
    }
}

// -------------------------------------------------------------------------------------
// APROVEITAR O PLANO DO AUXILIAR
// -------------------------------------------------------------------------------------

function usarSugestaoDoAuxiliar() {
    let sug = db[currentSave] && db[currentSave].sugestaoAuxiliar;
    if (!sug) return;

    escalacaoEmMontagem.formacao = (sug.tatica && sug.tatica.esquema) || escalacaoEmMontagem.formacao;
    escalacaoEmMontagem.titulares = {};
    Object.keys(sug.escalacao || {}).forEach(role => {
        let info = sug.escalacao[role];
        if (info && info.nome) escalacaoEmMontagem.titulares[role] = info.nome;
    });
    escalacaoEmMontagem.banco = (sug.reservas || []).map(r => r && r.nome).filter(Boolean).slice(0, 9);
    while (escalacaoEmMontagem.banco.length < 9) escalacaoEmMontagem.banco.push('');

    let campoAdv = document.getElementById('inicio-partida-adversario');
    if (campoAdv && !campoAdv.value.trim() && sug.adversarioNome) campoAdv.value = sug.adversarioNome;

    let selEsquema = document.getElementById('inicio-partida-esquema');
    if (selEsquema) selEsquema.value = escalacaoEmMontagem.formacao;

    renderizarGradeEscalacao();
    let loader = document.getElementById('inicio-escalacao-loader');
    if (loader) {
        loader.style.display = 'block';
        loader.style.color = 'var(--accent)';
        loader.innerText = `📥 Plano do Auxiliar aplicado (${escalacaoEmMontagem.formacao}). Ajuste o que quiser antes de iniciar.`;
    }
}

// -------------------------------------------------------------------------------------
// INICIAR DE FATO
// -------------------------------------------------------------------------------------

function iniciarPartidaDoSetup() {
    let d = db[currentSave];
    if (!d || !d.nome) return;

    let adversario = (document.getElementById('inicio-partida-adversario').value || '').trim();
    if (!adversario) return alert('Informe o adversário antes de iniciar a partida.');

    let formacao = escalacaoEmMontagem.formacao || '4-2-3-1';
    let coords = coordsFormacoes[formacao] || [];
    let faltando = coords.filter(c => !escalacaoEmMontagem.titulares[c.role]);
    if (faltando.length > 0) {
        return alert(`Faltam ${faltando.length} jogador(es) na escalação: ${faltando.map(c => c.role).join(', ')}.`);
    }

    // Guarda o pacote tático que estará valendo em campo (o do Perfil, ou o sugerido se foi aplicado)
    let tatica = (typeof taticaDoSave === 'function') ? Object.assign({}, taticaDoSave()) : null;
    let sug = d.sugestaoAuxiliar;
    if (sug && sug.tatica && sug.tatica.esquema === formacao) tatica = Object.assign({}, sug.tatica);
    if (tatica) tatica.esquema = formacao;

    // As instruções por jogador só existem se o plano veio do Auxiliar
    let instrucoes = (sug && sug.escalacao) ? sug.escalacao : {};
    let titulares = {};
    Object.keys(escalacaoEmMontagem.titulares).forEach(role => {
        let nome = escalacaoEmMontagem.titulares[role];
        let daSugestao = instrucoes[role];
        titulares[role] = {
            nome: nome,
            instrucao: (daSugestao && daSugestao.nome === nome && daSugestao.instrucao) ? daSugestao.instrucao : ''
        };
    });

    let banco = escalacaoEmMontagem.banco.filter(Boolean).map(nome => {
        let p = (d.plantel || []).find(x => x.nome === nome);
        let daSugestao = (sug && sug.reservas || []).find(r => r && r.nome === nome);
        return { nome: nome, posicao: p ? p.posicao : '', papel: daSugestao ? daSugestao.papel : '' };
    });

    d.partidaAuxiliar = {
        id: Date.now(),
        status: 'em_andamento',
        adversarioNome: adversario,
        adversarioInfo: (sug && sug.adversarioNome === adversario) ? sug.adversarioInfo : '',
        analiseGeral: (sug && sug.adversarioNome === adversario) ? sug.analiseGeral : '',
        diretriz: sug ? sug.diretriz : '',
        comp: document.getElementById('inicio-partida-comp').value,
        contexto: (document.getElementById('inicio-partida-contexto').value || '').trim(),
        mando: document.getElementById('inicio-partida-mando').value,
        diasProxima: Math.max(0, parseInt(document.getElementById('inicio-partida-dias').value) || 3),
        formacaoEscolhida: formacao,
        titulares: titulares,
        banco: banco,
        tatica: tatica,
        // Fotografia do apito inicial: o histórico compara isso com o fim do jogo
        escalacaoInicial: JSON.parse(JSON.stringify(titulares)),
        formacaoInicial: formacao,
        bancoInicial: JSON.parse(JSON.stringify(banco)),
        substituicoes: [],
        jogadoresForaDaPartida: [],
        ajustesFeitos: [],
        iniciadaEm: Date.now(),
        criadaEm: Date.now()
    };

    if (typeof pitchToggleSubView !== 'undefined') pitchToggleSubView = {};
    salvarDados();
    renderizarAbaSalvarPartida();
    if (typeof registrarAcaoJogo === 'function') registrarAcaoJogo(`Partida iniciada vs ${adversario}`);
}

async function cancelarPartidaEmAndamento() {
    if (await confirmarModerno('Descartar esta partida? A escalação e as substituições declaradas serão perdidas.', 'Cancelar Partida', { perigo: true, textoConfirmar: 'Descartar' })) {
        db[currentSave].partidaAuxiliar = null;
        escalacaoEmMontagem = { formacao: null, titulares: {}, banco: [] };
        salvarDados();
        renderizarAbaSalvarPartida();
    }
}

// -------------------------------------------------------------------------------------
// ORQUESTRAÇÃO DA ABA
// -------------------------------------------------------------------------------------

function renderizarAbaSalvarPartida() {
    let d = db[currentSave];
    if (!d) return;
    let setup = document.getElementById('partida-setup');
    let andamento = document.getElementById('partida-andamento');
    let resultado = document.getElementById('partida-resultado');
    if (!setup || !andamento || !resultado) return;

    let partida = d.partidaAuxiliar;

    if (!partida) {
        setup.style.display = 'block';
        andamento.style.display = 'none';
        resultado.style.display = 'none';
        renderizarSetupPartida();
        return;
    }

    setup.style.display = 'none';
    andamento.style.display = 'block';
    resultado.style.display = 'block';

    let banner = document.getElementById('partida-banner');
    if (banner) {
        let t = partida.tatica;
        let descTatica = t && typeof predefinicaoPorId === 'function'
            ? `${predefinicaoPorId(t.predefinicao).nome} • ${t.esquema} • ${estiloArmacaoPorId(t.estiloArmacao).nome} • ${t.abordagemDefensiva}/100 (${faixaAbordagem(t.abordagemDefensiva).nome})`
            : partida.formacaoEscolhida;
        banner.style.background = 'rgba(226,75,75,0.1)';
        banner.style.border = '1px solid var(--danger)';
        banner.innerHTML = `🔴 <strong>EM ANDAMENTO:</strong> ${d.nome} ${partida.mando === 'Fora' ? '(fora)' : partida.mando === 'Neutro' ? '(campo neutro)' : '(casa)'} vs <strong>${partida.adversarioNome}</strong> — ${partida.comp}${partida.contexto ? ` · ${partida.contexto}` : ''}
        <br><span style="font-size:12px; color:var(--text-muted);">Tática em campo: ${descTatica}</span>`;
    }

    let alerta = document.getElementById('partida-alerta-auxiliar');
    if (alerta) {
        let textos = [];
        if (partida.analiseGeral) textos.push(`🤖 <strong>Plano do Auxiliar:</strong> ${partida.analiseGeral}`);
        if (partida.alertaRotacao) textos.push(`<span style="color:var(--warning);">${partida.alertaRotacao}</span>`);
        if (textos.length) { alerta.style.display = 'block'; alerta.innerHTML = textos.join('<br>'); }
        else alerta.style.display = 'none';
    }

    let cab = document.getElementById('resultado-cabecalho-partida');
    if (cab) {
        cab.innerHTML = `📋 Registrando o resultado de <strong>${d.nome} vs ${partida.adversarioNome}</strong> — ${partida.comp}${partida.contexto ? ` · ${partida.contexto}` : ''} · ${partida.mando} · ${partida.diasProxima} dia(s) até a próxima.`;
    }

    let acoes = document.getElementById('auxiliar-acoes-partida');
    if (acoes) {
        let subsUsadas = (partida.substituicoes || []).length;
        acoes.innerHTML = `
            <p style="flex:1 1 100%; text-align:center; font-size:12px; color:var(--text-muted); margin: 0 0 4px 0;">Substituições declaradas: ${subsUsadas}/5 — clique num jogador em campo ou no banco pra declarar uma troca.</p>
            <button onclick="abrirMudarFormacaoManual()" style="flex:1; background:var(--panel-bg); border:1px solid var(--accent); color:var(--accent);">🔄 Mudar Formação</button>
            <button onclick="pedirSugestaoAoVivo()" style="flex:1; background:var(--accent); color:white;">🤖 Pedir sugestão ao Auxiliar</button>
            <button class="btn-hero-secundario" onclick="cancelarPartidaEmAndamento()" style="color:var(--danger); border-color:var(--danger);">🗑️ Descartar Partida</button>`;
    }

    if (typeof renderizarCampinhoLimpo === 'function') renderizarCampinhoLimpo();
}

// Atalho do botão da partida em andamento: leva pro chat do Auxiliar já com o contexto pronto.
function pedirSugestaoAoVivo() {
    mudarAba('tab-auxiliar');
    let painel = document.getElementById('panel-chat-auxiliar');
    if (painel && painel.style.display === 'none' && typeof toggleChatAuxiliar === 'function') toggleChatAuxiliar();
    let input = document.getElementById('input-auxiliar');
    if (input && !input.value.trim()) {
        input.value = 'Como está o jogo até aqui na sua leitura? Precisa mexer em alguma coisa? (anexe um print se quiser uma análise mais precisa)';
        input.focus();
    }
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
