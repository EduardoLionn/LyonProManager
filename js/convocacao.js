// ============================================================
// CONVOCAÇÃO DA SELEÇÃO — só existe pro slot "Seleção Nacional" (substitui Diretoria e
// Departamento Médico, que não fazem sentido pra seleção). O treinador envia o print da lista de
// convocados a cada Data FIFA; quem aparece nela fica marcado como Ativo (convocado: true) e entra
// nas sugestões de escalação do Auxiliar Técnico — quem sai da lista vira Inativo, mas continua no
// elenco geral com o histórico de partidas intacto.
// ============================================================

function renderizarConvocacaoUI() {
    if (currentSave !== 'selecao') return;
    let containerAtivos = document.getElementById('convocacao-lista-ativos');
    let containerGeral = document.getElementById('convocacao-lista-geral');
    if (!containerAtivos || !containerGeral) return;

    let plantel = db.selecao.plantel.filter(p => p.status === 'Ativo');
    let ativos = plantel.filter(p => p.convocado !== false);

    containerAtivos.innerHTML = ativos.length > 0
        ? ativos.map(p => cartaoConvocado(p)).join('')
        : '<p style="color:var(--text-muted); font-size:13px;">Nenhum jogador convocado ainda. Envie o print da lista de convocados.</p>';

    containerGeral.innerHTML = plantel.length > 0
        ? plantel.map(p => cartaoConvocado(p)).join('')
        : '<p style="color:var(--text-muted); font-size:13px;">Nenhum jogador cadastrado ainda.</p>';
}

function cartaoConvocado(p) {
    let ativo = p.convocado !== false;
    let nomeEscapado = p.nome.replace(/'/g, "\\'");
    return `
        <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:10px; padding:12px 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <strong style="font-size:14px;">${p.nome}</strong>
                <span class="badge" style="background:rgba(0,0,0,0.2); color:${ativo ? 'var(--primary)' : 'var(--text-muted)'}; white-space:nowrap;">${ativo ? '✅ Ativo' : '⛔ Inativo'}</span>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${p.posicao || '-'} · OVR ${p.ovr}</div>
            <button onclick="alternarConvocacao('${nomeEscapado}')" style="width:100%; margin-top:8px; font-size:12px; padding:6px; background:transparent; border:1px solid var(--border); color:var(--text-muted);">${ativo ? 'Marcar Inativo' : 'Marcar Ativo'}</button>
        </div>
    `;
}

// Ajuste manual, pra corrigir na hora sem precisar reenviar o print inteiro.
function alternarConvocacao(nome) {
    let p = db.selecao.plantel.find(x => x.nome === nome);
    if (!p) return;
    p.convocado = !(p.convocado !== false);
    salvarDados();
    renderizarConvocacaoUI();
}

async function lerImagemConvocacao(event) {
    if (currentSave !== 'selecao') return;
    const files = event.target.files;
    if (!files || files.length === 0) return;
    let loader = document.getElementById('loader-convocacao');
    let loaderText = document.getElementById('loader-convocacao-text');
    loader.style.display = 'inline-block';

    let nomesExistentes = db.selecao.plantel.filter(p => p.status === 'Ativo').map(p => p.nome).join(', ');
    let nomesConvocadosNestaLeitura = new Set();
    const delay = ms => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (loaderText) loaderText.innerText = `Lendo imagem ${i + 1} de ${files.length}... aguarde`;
        if (i > 0) await delay(1000);

        let base64Data = await new Promise((resolve) => {
            let reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });

        let prompt = `Analise esta tela de convocação de uma seleção nacional de futebol. Extraia a lista de nomes dos jogadores convocados que aparecem na imagem.
        Pra cada nome, tente casar com esta lista de jogadores já cadastrados (retorne o nome EXATAMENTE como está nesta lista se encontrar uma correspondência): [${nomesExistentes}].
        Se o jogador não estiver nessa lista, é um jogador novo — retorne o nome como aparece na imagem, e estime a posição (uma destas: Goleiro/Tradicional, Zagueiro/Rebatedor, Lateral/Defensivo Direito, Lateral/Defensivo Esquerdo, Volante/Cão de Guarda, MeioCampo/Armador Clássico, MeioCampo/Dinâmico, Ponta/Clássico Direito, Ponta/Clássico Esquerdo, Atacante/Móvel) e o OVR aproximado se estiver visível na tela (senão estime pelo contexto/liga do jogador).
        Retorne EXATAMENTE este JSON puro, sem formatação markdown:
        {"jogadores": [{"nome": "Nome do Jogador", "posicao": "Posição", "ovr": numero}]}`;

        try {
            const data = await chamarIA({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } }] }] });
            let rawText = data.candidates[0].content.parts[0].text;
            let jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let resultado = JSON.parse(jsonMatch[0]);
                (resultado.jogadores || []).forEach(j => {
                    if (!j.nome) return;
                    let existente = db.selecao.plantel.find(p => p.nome.toLowerCase() === j.nome.toLowerCase());
                    if (existente) {
                        nomesConvocadosNestaLeitura.add(existente.nome);
                    } else {
                        let novoJogador = { nome: j.nome, posicao: j.posicao || 'MeioCampo/Dinâmico', ovr: Number(j.ovr) || 70, status: 'Ativo', jogosAvaliacao: 0, convocado: true };
                        db.selecao.plantel.push(novoJogador);
                        nomesConvocadosNestaLeitura.add(novoJogador.nome);
                    }
                });
            }
        } catch (e) { console.error('Erro ao ler convocação:', e); }
    }

    // Quem apareceu nesta leitura fica (ou continua) Ativo; quem estava Ativo antes e não
    // apareceu mais nesta lista vira Inativo — mas continua no elenco, com histórico intacto.
    db.selecao.plantel.filter(p => p.status === 'Ativo').forEach(p => {
        p.convocado = nomesConvocadosNestaLeitura.has(p.nome);
    });

    salvarDados();
    if (loaderText) loaderText.innerText = '';
    loader.style.display = 'none';
    event.target.value = '';
    renderizarConvocacaoUI();
    alert(`Convocação lida! ${nomesConvocadosNestaLeitura.size} jogador(es) marcado(s) como ativo(s).`);
}
