        // A chave da API não fica mais aqui. As chamadas passam pelo seu Worker (proxy) na Cloudflare,
        // que guarda a chave escondida do lado do servidor.
        const API_URL = "https://lyonpromanager.eduardolion.workers.dev/";
        
        let currentSave = 'clube';
        let saveAtualId = null; // id do save carregado no sistema de múltiplos saves (null = nenhum save ativo, estamos no Menu Principal)
        let statusFiltroMercado = 'Vendido';
        let idTempCounter = 0;
        let jogadoresPartidaTemp = [];
        let contadorPartidasEvento = 0;
        let limitePartidasEvento = Math.floor(Math.random() * 7) + 8; // 8 a 14 (mesmo cálculo de gerarNumeroAleatorio, sem depender de outro arquivo)
        let charts = {}; 
        let postsVisiveisSocial = 10; // <-- ADICIONE ESTA LINHA 
        
        let ordemAtualPlantel = { coluna: 'ovr', ascendente: false };
        let ordemPosicoes = { 
    'Goleiro': 1, 
    'Zagueiro/Construtor': 2, 'Zagueiro/Lateral': 2, 'Zagueiro/Versatil': 2, 'Zagueiro/Defesa': 2, 
    'Lateral/Defesa Direito': 3, 'Lateral/Defesa Esquerdo': 3, 'Lateral/Ala Direito': 3, 'Lateral/Ala Esquerdo': 3, 'Lateral/Construtor Direito': 3, 'Lateral/Construtor Esquerdo': 3, 'Lateral/Defesa Versatil': 3, 'Lateral/Ala Versatil': 3, 'Lateral/Construtor Versatil': 3, 
    'Volante/Zaga': 4, 'Volante/Contenção': 4, 'Volante/Armação': 4, 
    'MeioCampo/Equilibrado': 5, 'MeioCampo/Armador': 5, 'MeioCampo/Abertura': 5, 'MeioCampo/Ataque': 5, 'MeioCampo/Versátil': 5, 
    'Ponta/Ala Direita': 6, 'Ponta/Ala Esquerda': 6, 'Ponta/Invertido': 6, 'Ponta/Armador': 6, 'Ponta/Versátil': 6, 
    'Atacante/Aberto': 7, 'Atacante/Fisico': 7, 'Atacante/Armador': 7, 'Atacante/Velocidade': 7, 'Atacante/Versátil': 7 
};

        // Fábrica de um save em branco. Usada tanto para o primeiro carregamento quanto para
        // criar novos saves e resetar slots — mantém uma única fonte de verdade pro "formato" do save.
        function dbPadrao() {
            return {
                clube: { nome: '', saveName: '', nomeTecnico: '', nomeDiretor: '', nomeAuxiliar: '', escalacaoSalvaIA: null, comandosJogo: [], ultimoPrestigioRegistrado: null, aprovacaoTorcida: 50, alvosTorcida: {}, liga: '', temporadaAtual: '25/26', orcamento: 0, gastoAtual: 0, arrecadadoAtual: 0, mediaGastoHistorico: 0, mediaArrecadadoHistorico: 0, competicaoContinental: 'Nenhuma', notaDiretoria: 6.5, objetivosTemporada: '', diretoriaConfigurada: false, exigenciasDiretoria: [], partidas: [], plantel: [], historicoTemporadas: [], socialFeed: [], chatHistory: { diretoria: [], auxiliar: [] } },
                selecao: { nome: '', saveName: '', nomeTecnico: '', nomeDiretor: '', nomeAuxiliar: '', escalacaoSalvaIA: null, comandosJogo: [], ultimoPrestigioRegistrado: null, aprovacaoTorcida: 50, alvosTorcida: {}, liga: 'Seleção Tier 2 (OVR 74)', temporadaAtual: 'Ciclo 2030', orcamento: 0, gastoAtual: 0, arrecadadoAtual: 0, mediaGastoHistorico: 0, mediaArrecadadoHistorico: 0, competicaoContinental: 'Nenhuma', notaDiretoria: 6.5, objetivosTemporada: '', diretoriaConfigurada: false, exigenciasDiretoria: [], partidas: [], plantel: [], historicoTemporadas: [], socialFeed: [], chatHistory: { diretoria: [], auxiliar: [] } }
            };
        }
        let db = dbPadrao();

        const ligaMap = {
            "League Two (OVR 60)": { up: "League One (OVR 64)", down: null, isTop: false },
            "League One (OVR 64)": { up: "Championship (OVR 70)", down: "League Two (OVR 60)", isTop: false },
            "Championship (OVR 70)": { up: "Premier League (OVR 77)", down: "League One (OVR 64)", isTop: false },
            "Premier League (OVR 77)": { up: null, down: "Championship (OVR 70)", isTop: true },
            "Série D (OVR 58)": { up: "Série C (OVR 63)", down: null, isTop: false },
            "Série C (OVR 63)": { up: "Série B (OVR 68)", down: "Série D (OVR 58)", isTop: false },
            "Série B (OVR 68)": { up: "Brasileirão Série A (OVR 74)", down: "Série C (OVR 63)", isTop: false },
            "Brasileirão Série A (OVR 74)": { up: null, down: "Série B (OVR 68)", isTop: true },
            "LaLiga Hypermotion (OVR 70)": { up: "LaLiga (OVR 77)", down: null, isTop: false },
            "LaLiga (OVR 77)": { up: null, down: "LaLiga Hypermotion (OVR 70)", isTop: true },
            "3. Liga (OVR 63)": { up: "2. Bundesliga (OVR 69)", down: null, isTop: false },
            "2. Bundesliga (OVR 69)": { up: "Bundesliga (OVR 76)", down: "3. Liga (OVR 63)", isTop: false },
            "Bundesliga (OVR 76)": { up: null, down: "2. Bundesliga (OVR 69)", isTop: true },
            "Serie B (OVR 69)": { up: "Serie A (OVR 76)", down: null, isTop: false },
            "Serie A (OVR 76)": { up: null, down: "Serie B (OVR 69)", isTop: true },
            "Ligue 2 (OVR 68)": { up: "Ligue 1 (OVR 75)", down: null, isTop: false },
            "Ligue 1 (OVR 75)": { up: null, down: "Ligue 2 (OVR 68)", isTop: true }
        };

        const coordsFormacoes = {
            "4-3-3": [
                {role: 'GOL', top: '90%', left: '50%'}, {role: 'LAD', top: '70%', left: '85%'}, {role: 'ZAD', top: '75%', left: '65%'}, {role: 'ZAE', top: '75%', left: '35%'}, {role: 'LAE', top: '70%', left: '15%'},
                {role: 'VOL', top: '55%', left: '50%'}, {role: 'MCD', top: '40%', left: '70%'}, {role: 'MCE', top: '40%', left: '30%'},
                {role: 'PD', top: '20%', left: '80%'}, {role: 'PE', top: '20%', left: '20%'}, {role: 'ATA', top: '15%', left: '50%'}
            ],
            "4-4-2": [
                {role: 'GOL', top: '90%', left: '50%'}, {role: 'LAD', top: '75%', left: '85%'}, {role: 'ZAD', top: '80%', left: '65%'}, {role: 'ZAE', top: '80%', left: '35%'}, {role: 'LAE', top: '75%', left: '15%'},
                {role: 'MD', top: '45%', left: '85%'}, {role: 'MCD', top: '50%', left: '60%'}, {role: 'MCE', top: '50%', left: '40%'}, {role: 'ME', top: '45%', left: '15%'},
                {role: 'ATD', top: '20%', left: '60%'}, {role: 'ATE', top: '20%', left: '40%'}
            ],
            "3-5-2": [
                {role: 'GOL', top: '90%', left: '50%'}, {role: 'ZAD', top: '75%', left: '75%'}, {role: 'ZAC', top: '80%', left: '50%'}, {role: 'ZAE', top: '75%', left: '25%'},
                {role: 'ALD', top: '50%', left: '90%'}, {role: 'VOLD', top: '60%', left: '65%'}, {role: 'VOLE', top: '60%', left: '35%'}, {role: 'ALE', top: '50%', left: '10%'}, {role: 'MEI', top: '40%', left: '50%'},
                {role: 'ATD', top: '20%', left: '65%'}, {role: 'ATE', top: '20%', left: '35%'}
            ],
            "4-2-3-1": [
                {role: 'GOL', top: '90%', left: '50%'}, {role: 'LAD', top: '75%', left: '85%'}, {role: 'ZAD', top: '80%', left: '65%'}, {role: 'ZAE', top: '80%', left: '35%'}, {role: 'LAE', top: '75%', left: '15%'},
                {role: 'VOLD', top: '60%', left: '60%'}, {role: 'VOLE', top: '60%', left: '40%'},
                {role: 'MD', top: '35%', left: '80%'}, {role: 'MEI', top: '40%', left: '50%'}, {role: 'ME', top: '35%', left: '20%'},
                {role: 'ATA', top: '15%', left: '50%'}
            ],
            "4-1-4-1": [
                {role: 'GOL', top: '90%', left: '50%'}, {role: 'LAD', top: '75%', left: '85%'}, {role: 'ZAD', top: '80%', left: '65%'}, {role: 'ZAE', top: '80%', left: '35%'}, {role: 'LAE', top: '75%', left: '15%'},
                {role: 'VOL', top: '65%', left: '50%'},
                {role: 'MD', top: '45%', left: '85%'}, {role: 'MCD', top: '45%', left: '63%'}, {role: 'MCE', top: '45%', left: '37%'}, {role: 'ME', top: '45%', left: '15%'},
                {role: 'ATA', top: '15%', left: '50%'}
            ],
            "3-4-3": [
                {role: 'GOL', top: '90%', left: '50%'}, {role: 'ZAD', top: '78%', left: '70%'}, {role: 'ZAC', top: '82%', left: '50%'}, {role: 'ZAE', top: '78%', left: '30%'},
                {role: 'MD', top: '50%', left: '85%'}, {role: 'MCD', top: '55%', left: '60%'}, {role: 'MCE', top: '55%', left: '40%'}, {role: 'ME', top: '50%', left: '15%'},
                {role: 'PD', top: '22%', left: '80%'}, {role: 'ATA', top: '15%', left: '50%'}, {role: 'PE', top: '22%', left: '20%'}
            ],
            "5-3-2": [
                {role: 'GOL', top: '90%', left: '50%'}, {role: 'LAD', top: '65%', left: '88%'}, {role: 'ZAD', top: '75%', left: '70%'}, {role: 'ZAC', top: '80%', left: '50%'}, {role: 'ZAE', top: '75%', left: '30%'}, {role: 'LAE', top: '65%', left: '12%'},
                {role: 'MCD', top: '45%', left: '65%'}, {role: 'MC', top: '40%', left: '50%'}, {role: 'MCE', top: '45%', left: '35%'},
                {role: 'ATD', top: '18%', left: '60%'}, {role: 'ATE', top: '18%', left: '40%'}
            ]
        };

        // Cache das vozes para o TTS (para não soar tão robótico)
        window.speechSynthesis.onvoiceschanged = function() {
            window.vozesSalvas = window.speechSynthesis.getVoices();
        };

