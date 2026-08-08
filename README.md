<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>LyonPro Manager</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --bg-dark: #0f1115; --sidebar-bg: #15181e; --panel-bg: #1a1d24; --input-bg: #252932; 
            --primary: #00ff88; --primary-hover: #00cc6a; --accent: #00a3ff; --warning: #ffb800; 
            --danger: #ff6b6b; --text-main: #f1f5f9; --text-muted: #94a3b8; --border: #334155;
            --gold: #ffd700;
        }

/* Ajuste das caixas de texto do chat para aceitarem múltiplas linhas (textarea) */
.chat-input-row textarea, .reply-box textarea { 
    flex: 1; 
    padding: 12px; 
    font-size: 15px; 
    border-radius: 6px;
    background: var(--input-bg);
    border: 1px solid var(--border);
    color: white;
    font-family: 'Segoe UI', system-ui, sans-serif;
    resize: none; /* Impede que o usuário "estique" a caixa e quebre o layout */
    min-height: 20px;
    height: 24px;
}
.chat-input-row textarea:focus, .reply-box textarea:focus {
    outline: none; 
    border-color: var(--primary); 
    box-shadow: 0 0 5px rgba(0,255,136,0.3);
}

/* Garante que o input antigo da reply box continue com a largura certa se ainda existir */
.reply-box textarea { width: calc(100% - 130px); display: inline-block; vertical-align: top;}

        body { font-family: 'Segoe UI', system-ui, sans-serif; background-color: var(--bg-dark); color: var(--text-main); margin: 0; display: flex; height: 100vh; overflow: hidden; }
        
        .sidebar { width: 260px; background: var(--sidebar-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 0; overflow-y: auto; }
        .sidebar h1 { color: var(--primary); font-size: 20px; text-align: center; margin-bottom: 25px; letter-spacing: 1px; }
        .nav-btn { background: transparent; color: var(--text-muted); border: none; padding: 14px 20px; text-align: left; font-size: 15px; cursor: pointer; border-left: 3px solid transparent; transition: 0.2s; }
        .nav-btn:hover { background: rgba(255,255,255,0.05); color: white; }
        .nav-btn.active { border-left-color: var(--primary); color: white; background: rgba(0, 255, 136, 0.1); font-weight: bold; }
        
        .save-controls { margin-top: auto; padding: 20px; border-top: 1px solid var(--border); }
        .save-controls select { width: 100%; margin-bottom: 10px; font-size:12px; padding:6px; }
        .btn-reset { background: var(--danger); font-size: 12px; padding: 8px; width: 100%; border:none; border-radius:4px; color:white; cursor:pointer;}
        .btn-backup { background: var(--accent); font-size: 12px; padding: 8px; width: 100%; border:none; border-radius:4px; color:white; cursor:pointer; margin-bottom: 5px; transition: 0.2s;}
        .btn-backup:hover { filter: brightness(1.1); }

        .main-content { flex: 1; padding: 30px; overflow-y: auto; }
        .tab-content { display: none; max-width: 1400px; margin: 0 auto; }
        .tab-content.active { display: block; }
        
        h2, h3 { color: var(--primary); margin-top: 0; font-weight: 600; }
        .panel { background: var(--panel-bg); padding: 25px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        
        .linha-form { display: flex; flex-direction: column; margin-bottom: 10px; }
        label { font-size: 11px; margin-bottom: 4px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold;}
        .label-adv { color: var(--danger); } 
        
        input, select { padding: 10px; background: var(--input-bg); border: 1px solid var(--border); color: white; border-radius: 6px; font-size: 14px; transition: 0.2s;}
        input:focus, select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 5px rgba(0,255,136,0.3); }
        
        button { padding: 10px 15px; background: var(--primary); color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        button:hover { background: var(--primary-hover); transform: translateY(-1px); }
        .btn-salvar { background: var(--accent); color: white; width: 100%; margin-top: 15px; padding: 12px; font-size: 15px;}
        .btn-upload { background: transparent; border: 1px dashed var(--accent); color: var(--accent); width: fit-content; padding: 6px 12px; font-size: 12px; border-radius: 4px;}
        .btn-upload:hover { background: rgba(0, 163, 255, 0.1); }
        
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
        th, td { padding: 14px; text-align: left; border-bottom: 1px solid var(--border); }
        th { color: var(--text-muted); font-size: 12px; text-transform: uppercase; background: var(--bg-dark); }
        .th-sortable:hover { color: white; cursor: pointer; background: rgba(255,255,255,0.05); }
        tr:hover { background: rgba(255,255,255,0.03); }
        .badge { padding: 5px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .bg-ativo { background: rgba(0, 255, 136, 0.2); color: var(--primary); }
        .bg-vendido { background: rgba(255, 107, 107, 0.2); color: var(--danger); }
        .bg-emprestado { background: rgba(255, 184, 0, 0.2); color: var(--warning); }
        .bg-aposentado { background: rgba(148, 163, 184, 0.2); color: var(--text-muted); }

        .row-raiox { background: #111318; border-left: 4px solid var(--accent); }
        .row-raiox td { padding: 0 !important; border-bottom: 2px solid var(--border); }
        .raiox-container { padding: 25px; display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: center; }

        .filtros-plantel { display: flex; gap: 10px; margin-bottom: 15px; }
        .btn-filtro { background: var(--input-bg); color: var(--text-muted); border: 1px solid var(--border); }
        .btn-filtro.active { background: var(--primary); color: #000; border-color: var(--primary); }

        .chart-container { display: none; padding: 20px; background: var(--input-bg); border-radius: 8px; border: 1px solid var(--border); margin-top: 20px; }
        .chart-container.active { display: block; }
        canvas { max-height: 450px; width: 100% !important; }

        .stat-card { background: var(--panel-bg); padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary); display: flex; flex-direction: column; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-card span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; font-weight:bold; }
        .stat-card strong { font-size: 22px; color: white; }

        #setup-screen, #modal-evento, #modal-troca-liga, #modal-setup-diretoria, #modal-editar-jogador { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 17, 21, 0.95); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .setup-box, .evento-box { background: var(--panel-bg); padding: 40px; border-radius: 12px; width: 420px; border: 1px solid var(--primary); box-shadow: 0 0 30px rgba(0,255,136,0.15); max-height: 90vh; overflow-y: auto; }
        .evento-box { border-color: var(--warning); box-shadow: 0 0 30px rgba(255,184,0,0.15); text-align: center; }

        .chat-container { display: flex; flex-direction: column; height: 500px; background: var(--input-bg); border-radius: 8px; border: 1px solid var(--border); overflow: hidden;}
        .chat-log { flex: 1; padding: 25px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
        .chat-msg { padding: 14px 20px; border-radius: 12px; font-size: 15px; max-width: 85%; line-height: 1.6; white-space: pre-wrap; box-shadow: 0 2px 5px rgba(0,0,0,0.1); position: relative;}
        .msg-user { background: var(--accent); color: white; align-self: flex-end; border-bottom-right-radius: 2px;}
        .msg-ai { background: var(--panel-bg); color: var(--text-main); border: 1px solid var(--border); align-self: flex-start; border-bottom-left-radius: 2px;}
        
        .chat-input-area { display: flex; flex-direction: column; padding: 15px; background: var(--panel-bg); border-top: 1px solid var(--border); }
        .chat-input-row { display: flex; gap: 10px; align-items: center; }
        .chat-input-row input { flex: 1; padding: 12px; font-size: 15px; }
        
        .loader { border: 3px solid var(--border); border-top: 3px solid var(--primary); border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: none; margin: 10px 0; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .trofeu-item { background: var(--input-bg); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid var(--gold); min-width: 140px; flex: 1; box-shadow: 0 4px 10px rgba(255,215,0,0.05); transition: 0.2s;}
        .trofeu-item:hover { transform: translateY(-3px); border-color: #ffea00; }
        .trofeu-icon { font-size: 35px; margin-bottom: 8px; }

        .match-card { background: var(--input-bg); border-radius: 8px; overflow: hidden; margin-bottom: 12px; border: 1px solid var(--border); transition: 0.2s; }
        .match-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .noticia-box { background: var(--input-bg); padding: 20px; border-radius: 10px; border-left: 4px solid var(--primary); margin-bottom: 15px; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        .noticia-box:hover { background: var(--panel-bg); transform: translateX(5px); }

        .btn-mic { background: var(--bg-dark); border: 1px solid var(--border); color: white; border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; font-size: 18px;}
        .btn-mic:hover { background: var(--primary); color: black; }
        .btn-audio { background: transparent; border: none; font-size: 16px; cursor: pointer; position: absolute; right: 10px; bottom: 10px; opacity: 0.6; }
        .btn-audio:hover { opacity: 1; }
        
        .quick-replies { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
        .btn-quick { background: rgba(0, 163, 255, 0.1); border: 1px solid var(--accent); color: white; padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .btn-quick:hover { background: var(--accent); color: black; }

        .campo-futebol { position: relative; width: 100%; max-width: 600px; height: 450px; background: #1e5631; border: 3px solid #fff; margin: 20px auto; overflow: hidden; border-radius: 8px;}
        .campo-futebol::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.5); transform: translateY(-50%); }
        .campo-futebol::after { content: ''; position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; border: 2px solid rgba(255,255,255,0.5); border-radius: 50%; transform: translate(-50%, -50%); }
        .area-penalti-top { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 250px; height: 100px; border: 2px solid rgba(255,255,255,0.5); border-top: none; }
        .area-penalti-bot { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 250px; height: 100px; border: 2px solid rgba(255,255,255,0.5); border-bottom: none; }
        
        .jogador-campo { position: absolute; transform: translate(-50%, -50%); background: var(--panel-bg); border: 2px solid var(--primary); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-align: center; color: white; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: top 0.5s, left 0.5s; z-index: 10;}
        .jogador-campo span { display: block; font-size: 9px; color: var(--text-muted); }

/* --- NOVOS ESTILOS: KPIs e Forma Recente --- */
        .kpi-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
        .kpi-card { background: var(--panel-bg); padding: 15px; border-radius: 8px; border-top: 3px solid var(--primary); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .kpi-card span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px; }
        .kpi-card strong { font-size: 20px; color: white; }
        .forma-recente { display: inline-flex; gap: 5px; margin-left: 15px; font-size: 14px; align-items: center; background: rgba(0,0,0,0.2); padding: 5px 10px; border-radius: 20px;}
        
        @media screen and (max-width: 1024px) {
            .kpi-container { grid-template-columns: 1fr 1fr; } /* Fica com 2 colunas no celular */
        }
        /* --- RESPONSIVIDADE PARA CELULARES E TELAS PEQUENAS --- */
@media screen and (max-width: 1024px) {
    body {
        flex-direction: column !important;
        height: auto !important;
        overflow: auto !important;
    }
    
    .sidebar {
        width: 100% !important;
        height: auto !important;
        border-right: none !important;
        border-bottom: 1px solid var(--border);
    }
    
    .main-content {
        padding: 15px !important;
        overflow: visible !important;
    }

    /* Transforma os grids de colunas múltiplas em coluna única no mobile */
    .grid-2, .grid-3, .grid-4, .grid-5 {
        grid-template-columns: 1fr !important;
        gap: 10px !important;
    }

    /* Ajusta tabelas para não quebrarem a tela */
    table {
        display: block;
        width: 100%;
        overflow-x: auto;
        white-space: nowrap;
    }

    .raiox-container {
        grid-template-columns: 1fr !important;
    }
}

        /* --- ESTILOS DO NOVO CAMPINHO E TOOLTIP --- */
        .campo-futebol-grande {
            position: relative; width: 100%; max-width: 800px; aspect-ratio: 4/3; 
            background: #1e5631; border: 3px solid #fff; margin: 20px auto; overflow: visible; border-radius: 8px;
        }
        .campo-futebol-grande::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.5); transform: translateY(-50%); }
        .campo-futebol-grande::after { content: ''; position: absolute; top: 50%; left: 50%; width: 120px; height: 120px; border: 2px solid rgba(255,255,255,0.5); border-radius: 50%; transform: translate(-50%, -50%); }
        
        .jogador-tooltip {
            visibility: hidden; opacity: 0; position: absolute; bottom: 130%; left: 50%; transform: translateX(-50%);
            background: rgba(15, 17, 21, 0.95); color: var(--primary); padding: 10px; border-radius: 8px; 
            font-size: 11px; white-space: normal; width: 160px; z-index: 999; transition: 0.2s; 
            border: 1px solid var(--primary); text-align: center; pointer-events: none; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            font-weight: normal;
        }
        /* A setinha do balão */
        .jogador-tooltip::after {
            content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: var(--primary) transparent transparent transparent;
        }
        .jogador-campo:hover .jogador-tooltip { visibility: visible; opacity: 1; bottom: 150%; }
/* ADICIONE ESTA LINHA ABAIXO PARA TRAZER O JOGADOR PARA FRENTE: */
.jogador-campo:hover { z-index: 1000; }

/* --- NOVA ABA: FEED SOCIAL DA TORCIDA --- */
.social-header { display: flex; justify-content: space-between; align-items: center; background: var(--panel-bg); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.termometro-container { flex: 1; margin: 0 30px; text-align: center; }
.termometro-bar { background: var(--bg-dark); height: 12px; border-radius: 6px; overflow: hidden; margin-top: 8px; border: 1px solid var(--border); position: relative; }
.termometro-fill { height: 100%; transition: width 0.5s, background 0.5s; }
.tweet-card { background: var(--panel-bg); padding: 20px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 15px; display: flex; gap: 15px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.tweet-card:hover { border-color: var(--primary); transform: translateX(3px); }
.tweet-avatar { width: 50px; height: 50px; border-radius: 50%; min-width: 50px; display: flex; align-items: center; justify-content: center; font-size: 26px; background: var(--input-bg); border: 1px solid var(--border); }
.tweet-content { flex: 1; }
.tweet-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.tweet-name { font-weight: bold; color: white; font-size: 16px; }
.tweet-handle { color: var(--text-muted); font-size: 13px; }
.tweet-text { font-size: 15px; line-height: 1.5; color: #e2e8f0; margin-bottom: 15px; }
.tweet-text .hashtag { color: var(--accent); font-weight: 500; }
.tweet-actions { display: flex; gap: 20px; color: var(--text-muted); font-size: 13px; margin-bottom: 10px; }
.tweet-action-btn { display: flex; align-items: center; gap: 5px; cursor: pointer; transition: 0.2s; }
.tweet-action-btn:hover { color: var(--primary); }
.reply-box { display: none; margin-top: 10px; padding-top: 15px; border-top: 1px dashed var(--border); }
.reply-box input { width: calc(100% - 130px); display: inline-block; }
.reply-box button { width: 110px; display: inline-block; background: var(--accent); color: white; font-size: 13px; padding: 12px; }
.reply-history { margin-top: 12px; padding: 15px; background: rgba(0, 163, 255, 0.05); border-left: 3px solid var(--accent); border-radius: 6px; font-size: 14px; }
.reply-impact { font-size: 12px; font-weight: bold; margin-top: 8px; display: flex; gap: 15px; }

/* --- NOVOS ESTILOS FEED SOCIAL --- */
.tweet-action-btn.liked { color: var(--danger); font-weight: bold; }
.btn-load-more { width: 100%; padding: 12px; background: transparent; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 8px; cursor: pointer; margin-top: 15px; font-weight: bold; transition: 0.2s; }
.btn-load-more:hover { color: white; border-color: white; background: rgba(255,255,255,0.05); }
    </style>
</head>
<body onload="carregarDados()">

    <!-- 1. MODAL INICIAL CORRIGIDO (APENAS NOME E LIGA) -->
    <div id="setup-screen" style="display: none;">
        <div class="setup-box">
            <h2 style="margin-top:0;">Configuração da Carreira</h2>
            <div class="linha-form">
                <label>Nome do Clube / Seleção</label>
                <input type="text" id="setup-nome-time" placeholder="Ex: Lyon FC">
            </div>
            <div class="linha-form" id="box-setup-temporada">
                <label>Temporada Inicial (Para Clube)</label>
                <select id="setup-temporada"></select>
            </div>
            <div class="linha-form" id="box-setup-ciclo" style="display:none;">
                <label>Ciclo Inicial (Para Seleção)</label>
                <select id="setup-ciclo"></select>
            </div>
            <div class="linha-form" style="margin-top: 10px;">
                <label>Selecione a Divisão / Liga (Média OVR)</label>
                <select id="setup-liga">
                    <optgroup label="Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿">
                        <option value="Premier League (OVR 77)">Premier League (OVR 77)</option>
                        <option value="Championship (OVR 70)">Championship (OVR 70)</option>
                        <option value="League One (OVR 64)">League One (OVR 64)</option>
                        <option value="League Two (OVR 60)">League Two (OVR 60)</option>
                    </optgroup>
                    <optgroup label="Brasil 🇧🇷">
                        <option value="Brasileirão Série A (OVR 74)">Brasileirão Série A (OVR 74)</option>
                        <option value="Série B (OVR 68)">Série B (OVR 68)</option>
                        <option value="Série C (OVR 63)">Série C (OVR 63)</option>
                        <option value="Série D (OVR 58)">Série D (OVR 58)</option>
                    </optgroup>
                    <optgroup label="Espanha 🇪🇸">
                        <option value="LaLiga (OVR 77)">LaLiga (OVR 77)</option>
                        <option value="LaLiga Hypermotion (OVR 70)">LaLiga Hypermotion (OVR 70)</option>
                    </optgroup>
                    <optgroup label="Alemanha 🇩🇪">
                        <option value="Bundesliga (OVR 76)">Bundesliga (OVR 76)</option>
                        <option value="2. Bundesliga (OVR 69)">2. Bundesliga (OVR 69)</option>
                        <option value="3. Liga (OVR 63)">3. Liga (OVR 63)</option>
                    </optgroup>
                    <optgroup label="Itália 🇮🇹">
                        <option value="Serie A (OVR 76)">Serie A (OVR 76)</option>
                        <option value="Serie B (OVR 69)">Serie B (OVR 69)</option>
                    </optgroup>
                    <optgroup label="França 🇫🇷">
                        <option value="Ligue 1 (OVR 75)">Ligue 1 (OVR 75)</option>
                        <option value="Ligue 2 (OVR 68)">Ligue 2 (OVR 68)</option>
                    </optgroup>
                    <optgroup label="Outras (Europa) 🌍">
                        <option value="Portugal - Liga Portugal (OVR 74)">Portugal - Liga Portugal (OVR 74)</option>
                        <option value="Holanda - Eredivisie (OVR 73)">Holanda - Eredivisie (OVR 73)</option>
                        <option value="Turquia - Süper Lig (OVR 72)">Turquia - Süper Lig (OVR 72)</option>
                        <option value="Bélgica - Pro League (OVR 71)">Bélgica - Pro League (OVR 71)</option>
                        <option value="Escócia - Premiership (OVR 70)">Escócia - Premiership (OVR 70)</option>
                    </optgroup>
                    <optgroup label="Seleções Nacionais 🌐">
                        <option value="Seleção Tier 1 Mundial (OVR 82)">Seleção Tier 1 Mundial (OVR 82)</option>
                        <option value="Seleção Tier 1 Continental (OVR 78)">Seleção Tier 1 Continental (OVR 78)</option>
                        <option value="Seleção Tier 2 (OVR 74)">Seleção Tier 2 (OVR 74)</option>
                        <option value="Seleção Tier 3 (OVR 68)">Seleção Tier 3 (OVR 68)</option>
                        <option value="Seleção Tier 4 (OVR 62)">Seleção Tier 4 (OVR 62)</option>
                    </optgroup>
                </select>
            </div>
            <button style="width: 100%; margin-top: 15px;" onclick="iniciarSave()">Salvar e Começar</button>
        </div>
    </div>

    <!-- MODAL TROCA DE LIGA (MANTIDO INTACTO COMO O SEU) -->
    <div id="modal-troca-liga" style="display: none;">
        <div class="setup-box">
            <h2 style="margin-top:0;">Trocar Divisão / Liga</h2>
            <p style="font-size:12px; color:var(--text-muted);">Altere o contexto da sua equipe. Isso mudará a nota exigida nas avaliações de upgrade.</p>
            <div class="linha-form" style="margin-top: 10px;">
                <label>Selecione a Nova Divisão</label>
                <select id="nova-liga-select"></select>
            </div>
            <button style="width: 100%; margin-top: 15px;" onclick="confirmarTrocaLiga()">Salvar Alteração</button>
            <button style="width: 100%; margin-top: 5px; background:transparent; border:1px solid var(--border); color:white;" onclick="document.getElementById('modal-troca-liga').style.display='none'">Cancelar</button>
        </div>
    </div>

    <!-- 2. MODAL DA DIRETORIA (1ª VEZ NO SAVE) CORRIGIDO -->
    <div id="modal-setup-diretoria" style="display: none;">
        <div class="setup-box">
            <h2 style="margin-top:0;">👔 Setup da Diretoria</h2>
            <p style="font-size:13px; color:var(--text-muted);">Informe os dados das últimas 5 temporadas para a IA calcular o orçamento inicial e metas.</p>
            
            <div class="linha-form" style="margin-top: 10px;">
                <label>Média Gasta nas Últimas 5 Temp. (€M)</label>
                <input type="number" id="setup-dir-media-gasto" placeholder="Ex: 50">
            </div>
            <div class="linha-form">
                <label>Média Arrecadada nas Últimas 5 Temp. (€M)</label>
                <input type="number" id="setup-dir-media-arrecadacao" placeholder="Ex: 40">
            </div>
            <div class="linha-form">
                <label>Títulos Conquistados nas Últimas 5 Temp.</label>
                <input type="number" id="setup-dir-titulos" placeholder="Ex: 2">
            </div>
            <div class="linha-form">
                <label>Posição Média na Liga nas Últimas 5 Temp.</label>
                <input type="number" id="setup-dir-posicao" placeholder="Ex: 4 (para 4º lugar)">
            </div>
            <div class="linha-form" id="box-setup-continental">
                <label>Competição Continental Atual (Se houver)</label>
                <select id="setup-dir-continental">
                    <option value="Nenhuma">Nenhuma / Não classificado</option>
                    <optgroup label="América do Sul (CONMEBOL)">
                        <option value="Libertadores">Copa Libertadores</option>
                        <option value="Sul-Americana">Copa Sul-Americana</option>
                    </optgroup>
                    <optgroup label="Europa (UEFA)">
                        <option value="Champions League">Champions League</option>
                        <option value="Europa League">Europa League</option>
                        <option value="Conference League">Conference League</option>
                    </optgroup>
                    <optgroup label="Outros Continentes">
                        <option value="Concacaf Champions Cup">Concacaf Champions</option>
                        <option value="Leagues Cup">Leagues Cup</option>
                        <option value="CAF Champions League">Liga dos Campeões da CAF (África)</option>
                        <option value="AFC Champions League">AFC Champions (Ásia)</option>
                    </optgroup>
                </select>
            </div>
            
            <button style="width: 100%; margin-top: 15px;" onclick="salvarSetupDiretoria()">Analisar e Definir Metas (IA)</button>
        </div>
    </div>

<!-- 4. MODALS DE CRISE E DEMISSÃO -->
    <div id="modal-alerta-crise" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 17, 21, 0.95); justify-content: center; align-items: center; z-index: 2000;">
        <div class="evento-box" style="border-color: var(--warning); box-shadow: 0 0 30px rgba(255,184,0,0.15); text-align: center;">
            <h2 style="color: var(--warning); margin-bottom: 10px;">⚠️ ALERTA DA DIRETORIA</h2>
            <p id="texto-alerta-crise" style="font-size: 16px; margin-bottom: 20px;">Reunião de emergência necessária! Seu cargo periga.</p>
            <button onclick="document.getElementById('modal-alerta-crise').style.display='none'" style="background: var(--warning); color: black;">Entendido. Tentarei melhorar.</button>
        </div>
    </div>

    <div id="modal-demissao" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 17, 21, 0.98); justify-content: center; align-items: center; z-index: 3000;">
        <div class="evento-box" style="border-color: var(--danger); box-shadow: 0 0 30px rgba(255,107,107,0.3); text-align: center;">
            <h2 style="color: var(--danger); margin-bottom: 10px;">❌ VOCÊ FOI DEMITIDO!</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">A diretoria esgotou a paciência. Seu prestígio chegou a zero devido aos péssimos resultados recentes na Liga e falta de evolução técnica.</p>
            <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">Fim da linha. O seu contrato foi rompido antecipadamente.</p>
            <button onclick="resetarSave()" style="background: var(--danger); color: white; width: 100%;">Apagar Carreira e Recomeçar</button>
        </div>
    </div>

    <!-- 3. NOVO MODAL: PLANEJAMENTO PÓS-TEMPORADA -->
    <div id="modal-renovar-diretoria" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 17, 21, 0.95); justify-content: center; align-items: center; z-index: 1000;">
        <div class="setup-box">
            <h2 style="margin-top:0;">👔 Planejamento de Nova Temporada</h2>
            <p style="font-size:13px; color:var(--text-muted);">A temporada anterior acabou. Informe a diretoria sobre sua situação continental para traçar os objetivos deste ano.</p>

            <div class="linha-form" id="box-renovar-continental">
                <label>Você se classificou para qual Competição Continental?</label>
                <select id="renovar-dir-continental">
                    <option value="Nenhuma">Nenhuma / Não classificou</option>
                    <optgroup label="América do Sul (CONMEBOL)">
                        <option value="Libertadores">Copa Libertadores</option>
                        <option value="Sul-Americana">Copa Sul-Americana</option>
                    </optgroup>
                    <optgroup label="Europa (UEFA)">
                        <option value="Champions League">Champions League</option>
                        <option value="Europa League">Europa League</option>
                        <option value="Conference League">Conference League</option>
                    </optgroup>
                </select>
            </div>
            <button id="btn-renovar-dir" style="width: 100%; margin-top: 15px;" onclick="processarRenovacaoDiretoria()">Definir Novas Metas (IA)</button>
        </div>
    </div>

    <div id="modal-editar-jogador" style="display: none;">
        <div class="setup-box">
            <h2 style="margin-top:0; color: var(--warning);">✏️ Editar Jogador</h2>
            <p style="font-size:13px; color:var(--text-muted);">Corrija informações inseridas incorretamente no cadastro ou no meio da temporada.</p>
            
            <input type="hidden" id="edit-jog-nome-original">
            
            <div class="linha-form" style="margin-top: 10px;">
                <label>Nome do Jogador</label>
                <input type="text" id="edit-jog-nome">
            </div>
            <div class="linha-form">
    <label>Posição</label>
    <select id="edit-jog-pos">
        <option value="Goleiro">Goleiro</option>
        <optgroup label="Zagueiros">
            <option value="Zagueiro/Construtor">Zagueiro/Construtor</option>
            <option value="Zagueiro/Lateral">Zagueiro/Lateral</option>
            <option value="Zagueiro/Versatil">Zagueiro/Versatil</option>
            <option value="Zagueiro/Defesa">Zagueiro/Defesa</option>
        </optgroup>
        <optgroup label="Laterais">
            <option value="Lateral/Defesa Direito">Lateral/Defesa Direito</option>
            <option value="Lateral/Defesa Esquerdo">Lateral/Defesa Esquerdo</option>
            <option value="Lateral/Ala Direito">Lateral/Ala Direito</option>
            <option value="Lateral/Ala Esquerdo">Lateral/Ala Esquerdo</option>
            <option value="Lateral/Construtor Direito">Lateral/Construtor Direito</option>
            <option value="Lateral/Construtor Esquerdo">Lateral/Construtor Esquerdo</option>
            <option value="Lateral/Defesa Versatil">Lateral/Defesa Versatil</option>
            <option value="Lateral/Ala Versatil">Lateral/Ala Versatil</option>
            <option value="Lateral/Construtor Versatil">Lateral/Construtor Versatil</option>
        </optgroup>
        <optgroup label="Volantes">
            <option value="Volante/Zaga">Volante/Zaga</option>
            <option value="Volante/Contenção">Volante/Contenção</option>
            <option value="Volante/Armação">Volante/Armação</option>
        </optgroup>
        <optgroup label="Meio-Campo">
            <option value="MeioCampo/Equilibrado">MeioCampo/Equilibrado</option>
            <option value="MeioCampo/Armador">MeioCampo/Armador</option>
            <option value="MeioCampo/Abertura">MeioCampo/Abertura</option>
            <option value="MeioCampo/Ataque">MeioCampo/Ataque</option>
            <option value="MeioCampo/Versátil">MeioCampo/Versátil</option>
        </optgroup>
        <optgroup label="Pontas">
            <option value="Ponta/Ala Direita">Ponta/Ala Direita</option>
            <option value="Ponta/Ala Esquerda">Ponta/Ala Esquerda</option>
            <option value="Ponta/Invertido">Ponta/Invertido</option>
            <option value="Ponta/Armador">Ponta/Armador</option>
            <option value="Ponta/Versátil">Ponta/Versátil</option>
        </optgroup>
        <optgroup label="Atacantes">
            <option value="Atacante/Aberto">Atacante/Aberto</option>
            <option value="Atacante/Fisico">Atacante/Fisico</option>
            <option value="Atacante/Armador">Atacante/Armador</option>
            <option value="Atacante/Velocidade">Atacante/Velocidade</option>
            <option value="Atacante/Versátil">Atacante/Versátil</option>
        </optgroup>
    </select>
</div>
            <div class="linha-form">
                <label>Overall Atual (OVR)</label>
                <input type="number" id="edit-jog-ovr">
            </div>
            
            <button style="width: 100%; margin-top: 15px; background: var(--warning); color: black;" onclick="salvarEdicaoJogador()">Salvar Alterações</button>
            <button style="width: 100%; margin-top: 5px; background:transparent; border:1px solid var(--border); color:white;" onclick="document.getElementById('modal-editar-jogador').style.display='none'">Cancelar</button>
        </div>
    </div>

    <div id="modal-evento" style="display: none;">
        <div class="evento-box">
            <h2 style="color: var(--warning); margin-bottom: 10px;">⚠️ Evento Inesperado</h2>
            <p id="evento-texto" style="font-size: 16px; margin-bottom: 20px;">Um jogador pediu para sair...</p>
            <button onclick="document.getElementById('modal-evento').style.display='none'">Entendido</button>
        </div>
    </div>

    <!-- SIDEBAR -->
    <div class="sidebar">
        <h1>⚽ LyonPro Manager</h1>
        <button class="nav-btn active" onclick="mudarAba('tab-dashboard')">📊 Dashboard & Partidas</button>
        <button class="nav-btn" id="nav-btn-plantel" onclick="mudarAba('tab-plantel')">📋 Elenco do Time</button>
        <button class="nav-btn" id="nav-btn-mercado" onclick="mudarAba('tab-mercado')">💰 Transferências</button>
        <button class="nav-btn" onclick="mudarAba('tab-upgrades')">⭐ Upgrades (OVR)</button>
        <button class="nav-btn" onclick="mudarAba('tab-historico')">🏆 Sala de Troféus</button>
        <button class="nav-btn" onclick="mudarAba('tab-diretoria')">👔 Diretoria (IA)</button>
        <button class="nav-btn" onclick="mudarAba('tab-auxiliar')">🤖 Auxiliar Técnico (IA)</button>
        <button class="nav-btn" onclick="mudarAba('tab-social')">📱 Feed Social & Mídia</button>

        <div class="save-controls">
            <label style="color:white; font-size: 12px;">Slot de Save:</label>
            <select id="select-save" onchange="trocarSave()">
                <option value="clube">Time Principal (Clube)</option>
                <option value="selecao">Seleção Nacional</option>
            </select>
            <button class="btn-backup" onclick="exportarBackup()">📥 Baixar Backup</button>
            <button class="btn-backup" style="background:var(--warning); color:black;" onclick="document.getElementById('input-import').click()">📤 Carregar Save</button>
            <input type="file" id="input-import" style="display:none" accept=".json" onchange="importarBackup(event)">
            <button class="btn-reset" onclick="resetarSave()">Resetar Slot Atual</button>
        </div>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div class="main-content">

        <!-- DASHBOARD -->
        <!-- DASHBOARD -->
        <div id="tab-dashboard" class="tab-content active">
            
            <!-- CABEÇALHO DO DASHBOARD -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap: wrap; gap: 10px;">
                <h2 style="margin:0; font-size:28px; color:white; display: flex; align-items: center;">
                    <span id="header-nome-time">Nome do Time</span>
                    <div id="header-forma-recente" class="forma-recente"></div> <!-- Bolinhas aqui -->
                </h2>
                <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                    <span style="font-size:14px; color:var(--text-muted);">Ciclo/Temporada: <strong id="header-temp-ano" style="color:var(--primary); font-size:16px;">25/26</strong></span>
                    <button onclick="concluirTemporadaAutomatica()" style="background: var(--gold); color: black;">🏁 Concluir Temporada</button>
                    <!-- Botão alterado para começar fechado e verde -->
                    <button id="btn-toggle-video" onclick="toggleModoVideo()" style="background: var(--primary); border: none; color: black; font-weight: bold;">
                        ✏️ Mostrar Controles
                    </button>
                </div>
            </div>

            <!-- NOVOS CARDS DE RESUMO RÁPIDO (KPIs) -->
            <div class="kpi-container" id="dashboard-kpis">
                <div class="kpi-card" style="border-top-color: var(--primary);"><span style="color: var(--primary);">Aproveitamento</span><strong id="kpi-aproveitamento">0%</strong></div>
                <div class="kpi-card" style="border-top-color: var(--accent);"><span style="color: var(--accent);">Saldo de Gols</span><strong id="kpi-saldo">0</strong></div>
                <div class="kpi-card" style="border-top-color: var(--gold);"><span style="color: var(--gold);">Artilheiro</span><strong id="kpi-artilheiro">-</strong></div>
                <div class="kpi-card" style="border-top-color: var(--warning);"><span style="color: var(--warning);">Assistências</span><strong id="kpi-garcom">-</strong></div>
            </div>

            <!-- ÁREA DE INSERÇÃO (IA VISÍVEL, MANUAL ESCONDIDO) -->
            <div class="grid-2" id="controles-insercao">
                
                <!-- 1. JOGADORES -->
                <div class="panel" style="padding: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="font-size: 20px; margin:0;">1. Atuação dos Jogadores</h2>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span id="loader-jogador-text" style="font-size:12px; color:var(--warning); font-weight:bold;"></span>
                            <div class="loader" id="loader-jogador" style="margin:0; display:none; width: 15px; height: 15px;"></div>
                            <!-- Botão IA SEMPRE visível -->
                            <label class="btn-upload" style="margin:0; cursor:pointer; background: rgba(0, 163, 255, 0.1);">
                                📸 Ler Lote de Stats (IA)
                                <input type="file" multiple style="display:none;" accept="image/*" onchange="lerImagensIAJogadores(event)">
                            </label>
                        </div>
                    </div>
                    
                    <!-- ESCONDIDO POR PADRÃO -->
                    <div id="manual-jogador-form" style="display: none;">
                        <div class="grid-3" style="margin-bottom: 12px;">
                            <div class="linha-form" style="grid-column: span 2;">
                                <label>Adição Manual - Buscar Jogador</label>
                                <input type="text" id="jog-nome-input" placeholder="Digite para buscar..." list="datalist-jogadores" oninput="preencherDadosJogador()">
                                <datalist id="datalist-jogadores"></datalist>
                            </div>
                            <div class="linha-form" id="box-jog-ovr"><label>OVR Atual</label><input type="number" id="jog-ovr-atual"></div>
                        </div>
                        
                        <div class="grid-2" style="margin-bottom: 12px;">
    <div class="linha-form">
        <label>Posição</label>
        <select id="jog-pos">
            <option value="Goleiro">Goleiro</option>
            <optgroup label="Zagueiros">
                <option value="Zagueiro/Construtor">Zagueiro/Construtor</option>
                <option value="Zagueiro/Lateral">Zagueiro/Lateral</option>
                <option value="Zagueiro/Versatil">Zagueiro/Versatil</option>
                <option value="Zagueiro/Defesa">Zagueiro/Defesa</option>
            </optgroup>
            <optgroup label="Laterais">
                <option value="Lateral/Defesa Direito">Lateral/Defesa Direito</option>
                <option value="Lateral/Defesa Esquerdo">Lateral/Defesa Esquerdo</option>
                <option value="Lateral/Ala Direito">Lateral/Ala Direito</option>
                <option value="Lateral/Ala Esquerdo">Lateral/Ala Esquerdo</option>
                <option value="Lateral/Construtor Direito">Lateral/Construtor Direito</option>
                <option value="Lateral/Construtor Esquerdo">Lateral/Construtor Esquerdo</option>
                <option value="Lateral/Defesa Versatil">Lateral/Defesa Versatil</option>
                <option value="Lateral/Ala Versatil">Lateral/Ala Versatil</option>
                <option value="Lateral/Construtor Versatil">Lateral/Construtor Versatil</option>
            </optgroup>
            <optgroup label="Volantes">
                <option value="Volante/Zaga">Volante/Zaga</option>
                <option value="Volante/Contenção">Volante/Contenção</option>
                <option value="Volante/Armação">Volante/Armação</option>
            </optgroup>
            <optgroup label="Meio-Campo">
                <option value="MeioCampo/Equilibrado">MeioCampo/Equilibrado</option>
                <option value="MeioCampo/Armador">MeioCampo/Armador</option>
                <option value="MeioCampo/Abertura">MeioCampo/Abertura</option>
                <option value="MeioCampo/Ataque">MeioCampo/Ataque</option>
                <option value="MeioCampo/Versátil">MeioCampo/Versátil</option>
            </optgroup>
            <optgroup label="Pontas">
                <option value="Ponta/Ala Direita">Ponta/Ala Direita</option>
                <option value="Ponta/Ala Esquerda">Ponta/Ala Esquerda</option>
                <option value="Ponta/Invertido">Ponta/Invertido</option>
                <option value="Ponta/Armador">Ponta/Armador</option>
                <option value="Ponta/Versátil">Ponta/Versátil</option>
            </optgroup>
            <optgroup label="Atacantes">
                <option value="Atacante/Aberto">Atacante/Aberto</option>
                <option value="Atacante/Fisico">Atacante/Fisico</option>
                <option value="Atacante/Armador">Atacante/Armador</option>
                <option value="Atacante/Velocidade">Atacante/Velocidade</option>
                <option value="Atacante/Versátil">Atacante/Versátil</option>
            </optgroup>
        </select>
    </div>
    <!-- AQUI ESTÁ O CAMPO DE NOTA E O FECHAMENTO DA DIV QUE HAVIAM SUMIDO -->
    <div class="linha-form"><label>Nota (0-10)</label><input type="number" step="0.1" id="jog-nota" value="7.0"></div>
</div>

                        <div class="grid-5" style="margin-top: 10px;">
                            <div class="linha-form"><label>Gols</label><input type="number" id="din-gols" value="0"></div>
                            <div class="linha-form"><label>Assist.</label><input type="number" id="din-assist" value="0"></div>
                            <div class="linha-form"><label>Finaliz.</label><input type="number" id="din-fin" value="0"></div>
                            <div class="linha-form"><label>Prec. Fin(%)</label><input type="number" id="din-prec-fin" value="0"></div>
                            <div class="linha-form"><label>Passes</label><input type="number" id="din-passes" value="0"></div>
                        </div>

                        <div class="grid-5" style="margin-top: 5px;">
                            <div class="linha-form"><label>Prec. Passe(%)</label><input type="number" id="din-prec-passe" value="85"></div>
                            <div class="linha-form"><label>Dribles</label><input type="number" id="din-dribles" value="0"></div>
                            <div class="linha-form"><label>Taxa Drib(%)</label><input type="number" id="din-taxa-drible" value="0"></div>
                            <div class="linha-form"><label>Divididas</label><input type="number" id="din-div-total" value="0"></div>
                            <div class="linha-form"><label>Taxa Div(%)</label><input type="number" id="din-div-ganhas" value="70"></div>
                        </div>

                        <div class="grid-4" style="margin-top: 5px;">
                            <div class="linha-form"><label>Posses Ganh</label><input type="number" id="din-posses" value="0"></div>
                            <div class="linha-form"><label>Perdas Posse</label><input type="number" id="din-perdas-posse" value="0"></div>
                            <div class="linha-form"><label>Faltas</label><input type="number" id="din-faltas" value="0"></div>
                            <div class="linha-form"><label>Defesas (GL)</label><input type="number" id="din-defesas" value="0"></div>
                        </div>

                        <label style="display:flex; align-items:center; gap:8px; margin: 18px 0; color: var(--warning); font-size: 14px; font-weight:bold; cursor:pointer;">
                            <input type="checkbox" id="jog-mvp" style="width:18px; height:18px;"> Eleito Melhor em Campo (MVP)
                        </label>
                        <button style="width:100%; padding: 12px;" onclick="addJogadorPartida()">+ Inserir Manualmente</button>
                    </div> <!-- FIM DO ESCONDIDO -->
                    
                    <!-- Lista de quem já foi lido (deve aparecer sempre) -->
                    <div id="titulo-lista-temp" style="margin-top: 25px; font-weight: bold; border-bottom: 1px solid var(--border); padding-bottom: 8px; font-size: 16px;">Lista de Jogadores nesta Partida (0):</div>
                    <div id="lista-jogadores-temp" style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;"></div>
                </div>

                <!-- 2. PARTIDA -->
                <div class="panel" style="padding: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="font-size: 20px; margin:0;">2. Estatísticas da Partida</h2>
                        <!-- Botão IA SEMPRE visível -->
                        <label class="btn-upload" style="margin:0; cursor:pointer;">
                            📸 Ler Placar TV (IA)
                            <input type="file" style="display:none;" accept="image/*" onchange="lerImagemIA(event, 'partida')">
                        </label>
                    </div>
                    <div class="loader" id="loader-partida"></div>

                    <!-- ESCONDIDO POR PADRÃO -->
                    <div id="manual-partida-form" style="display: none;">
                        <div class="grid-3">
                            <div class="linha-form"><label>Competição</label><select id="partida-comp"></select></div>
                            <div class="linha-form"><label>Adversário</label><input type="text" id="adversario" placeholder="Ex: Real Madrid"></div>
                            <div class="linha-form"><label>Mando</label><select id="partida-mando"><option>Casa</option><option>Fora</option><option>Neutro</option></select></div>
                        </div>
                        
                        <div class="grid-2">
                            <div class="linha-form"><label>Sua Posição na Tabela / Fase da Copa</label><input type="text" id="partida-contexto" placeholder="Ex: 3º lugar, Quartas de final, Final"></div>
                            <div class="linha-form"><label style="color:var(--warning);">Dias para a Próxima Partida</label><input type="number" id="partida-dias-proxima" value="3" placeholder="Ex: 3"></div>
                        </div>
                        
                        <div class="grid-2">
                            <div class="linha-form"><label style="color:var(--primary)">Gols Pró (Meus)</label><input type="number" id="gols-pro" value="0"></div>
                            <div class="linha-form"><label class="label-adv">Gols Contra (Adv)</label><input type="number" id="gols-contra" value="0"></div>
                            <div class="linha-form"><label style="color:var(--accent)">Fin. Total (Minhas)</label><input type="number" id="fin-pro" value="0"></div>
                            <div class="linha-form"><label class="label-adv">Fin. Total (Adv)</label><input type="number" id="fin-adv" value="0"></div>
                            <div class="linha-form"><label>Minha Posse (%)</label><input type="number" id="posse-pro"></div>
                            <div class="linha-form"><label class="label-adv">Posse Adv (%)</label><input type="number" id="posse-adv"></div>
                        </div>

                        <label style="display:flex; align-items:center; gap:8px; margin-top: 15px; color: #ffb800; font-size: 14px; cursor:pointer; font-weight:bold;">
                            <input type="checkbox" id="vitoria-penaltis" style="width:16px; height:16px;"> Vitória nos Pênaltis (Marque em caso de empate na Copa)
                        </label>
                    </div> <!-- FIM DO ESCONDIDO -->

                    <!-- Botão de Salvar Partida SEMPRE visível -->
                    <button class="btn-salvar" style="padding: 14px; margin-top: 20px; font-size:16px;" onclick="salvarPartida()">💾 Finalizar e Salvar Partida</button>
                </div>
            </div>

            <!-- CENTRAL DE ANÁLISE -->
            <div class="panel" style="padding: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin:0; font-size: 24px;">3. Central de Análise Tática Avançada</h2>
                    <div style="display: flex; gap:10px;">
                        <select id="filtro-top-jogadores" onchange="desenharGraficos()" style="background:var(--bg-dark); color:white; border-radius:8px; padding: 10px;">
                            <option value="5">Top 5 Jogadores</option>
                            <option value="10">Top 10 Jogadores</option>
                            <option value="999">Todos os Jogadores</option>
                        </select>
                        <select id="filtro-ordem-grafico" onchange="desenharGraficos()" style="background:var(--bg-dark); color:white; border-radius:8px; padding: 10px;">
                            <option value="desc">Maiores ⬇️</option>
                            <option value="asc">Menores ⬆️</option>
                        </select>
                        <select id="filtro-temporada" onchange="desenharGraficos()" style="background:var(--bg-dark); color:white; border-radius:8px; padding: 10px;"></select>
                        <select id="seletor-grafico" onchange="mudarGrafico()" style="width: 320px; font-weight: bold; color: var(--primary); border-radius:8px; padding: 10px;">
    <option value="view-calendario">📅 0. Calendário e Detalhes da Partida</option>
    <option value="view-efetividade">🎯 1. Efetividade das Finalizações (%)</option>
    <option value="view-eficiencia">⚡ 2. Domínio (Posse x Finalizações)</option>
    <option value="view-artilheiros">⚽ 3. Artilharia (Gols por Jogador)</option>
    <option value="view-assistentes">🎯 4. Assistentes (Passes para Gol)</option>
    <option value="view-criacao">📈 5. Desgaste Físico & Média Geral</option>
    <option value="view-defesa">🛡️ 6. Muralha Defensiva e Goleiros</option>
    <option value="view-radar">🔍 7. Central de Criação (Passes)</option>
    <option value="view-finalizacoes">🎯 8. Precisão e Volume de Finalizações</option>
    <option value="view-dribles">🤹 9. Habilidade e Dribles</option>
    <option value="view-raiox" id="opt-raiox-dash">🕸️ 10. Raio-X do Atleta (Radar)</option>
</select>
                    </div>
                </div>

                <div id="view-calendario" class="chart-container active">
                    <h3 style="margin-top:0; margin-bottom:20px; font-size:18px;">Últimas Partidas (Ordem Cronológica)</h3>
                    <div id="lista-calendario" style="display: flex; flex-direction: column; gap: 15px;"></div>
                </div>
                <div id="view-efetividade" class="chart-container"><h3>Efetividade das Finalizações (Conversão em Gol %)</h3><canvas id="graficoEfetividade"></canvas></div>
                <div id="view-eficiencia" class="chart-container"><h3>Domínio Geral (Posse x Finalizações)</h3><canvas id="graficoEficiencia"></canvas></div>
                <div id="view-artilheiros" class="chart-container"><h3>Artilharia (Gols por Jogador)</h3><canvas id="graficoArtilheiros"></canvas></div>
                <div id="view-assistentes" class="chart-container"><h3>Assistentes (Líderes em Assistências)</h3><canvas id="graficoAssistentes"></canvas></div>
                <div id="view-criacao" class="chart-container"><h3>Desgaste Físico & Média Geral de Notas do Time</h3><canvas id="graficoCriacao"></canvas></div>
                <div id="view-defesa" class="chart-container"><h3>Muralha Defensiva (Desarmes e Divididas Ganhas por Jogador)</h3><canvas id="graficoDefesa"></canvas></div>
                <div id="view-radar" class="chart-container"><h3>Central de Criação (Passes Certos por Jogador)</h3><canvas id="graficoRadarSetor"></canvas></div>
                <div id="view-finalizacoes" class="chart-container"><h3>Volume de Finalizações por Jogador</h3><canvas id="graficoFinalizacoes"></canvas></div>
                <div id="view-dribles" class="chart-container"><h3>Volume de Dribles por Jogador</h3><canvas id="graficoDribles"></canvas></div>
                
                <div id="view-raiox" class="chart-container">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin:0;">Raio-X de Atributos Médios</h3>
                        <input type="text" id="select-raio-x-input" placeholder="Buscar Jogador..." list="datalist-raiox" onchange="acionarRaioXDashboard()" style="width: 250px;">
                        <datalist id="datalist-raiox"></datalist>
                    </div>
                    <div class="raiox-container">
                        <div id="raiox-dados-dash" style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border); font-size: 14px;">
                            <p style="color:var(--text-muted); text-align:center; margin: 0;">Selecione um jogador acima</p>
                        </div>
                        <div><canvas id="graficoRaioXRadarDash"></canvas></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ABA: ELENCO -->
        <div id="tab-plantel" class="tab-content">
            <div class="panel" style="border-left: 4px solid var(--primary);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0;">Cadastrar Jogador (Base / Elenco Inicial)</h2>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span id="loader-plantel-text" style="font-size:12px; color:var(--warning); font-weight:bold;"></span>
                        <label class="btn-upload" style="margin:0; cursor:pointer; background: rgba(0, 163, 255, 0.1);">
                            📸 Ler Elenco (IA)
                            <input type="file" multiple style="display:none;" accept="image/*" onchange="lerImagensIAPlantel(event)">
                        </label>
                    </div>
                </div>
                <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">Use este campo para criar seu time inicial ou promover garotos da base <strong>sem descontar dinheiro do caixa</strong>.</p>
                <div class="grid-3">
                    <div class="linha-form">
    <label>Posição</label>
    <select id="cad-pos">
        <option value="Goleiro">Goleiro</option>
        <optgroup label="Zagueiros">
            <option value="Zagueiro/Construtor">Zagueiro/Construtor</option>
            <option value="Zagueiro/Lateral">Zagueiro/Lateral</option>
            <option value="Zagueiro/Versatil">Zagueiro/Versatil</option>
            <option value="Zagueiro/Defesa">Zagueiro/Defesa</option>
        </optgroup>
        <optgroup label="Laterais">
            <option value="Lateral/Defesa Direito">Lateral/Defesa Direito</option>
            <option value="Lateral/Defesa Esquerdo">Lateral/Defesa Esquerdo</option>
            <option value="Lateral/Ala Direito">Lateral/Ala Direito</option>
            <option value="Lateral/Ala Esquerdo">Lateral/Ala Esquerdo</option>
            <option value="Lateral/Construtor Direito">Lateral/Construtor Direito</option>
            <option value="Lateral/Construtor Esquerdo">Lateral/Construtor Esquerdo</option>
            <option value="Lateral/Defesa Versatil">Lateral/Defesa Versatil</option>
            <option value="Lateral/Ala Versatil">Lateral/Ala Versatil</option>
            <option value="Lateral/Construtor Versatil">Lateral/Construtor Versatil</option>
        </optgroup>
        <optgroup label="Volantes">
            <option value="Volante/Zaga">Volante/Zaga</option>
            <option value="Volante/Contenção">Volante/Contenção</option>
            <option value="Volante/Armação">Volante/Armação</option>
        </optgroup>
        <optgroup label="Meio-Campo">
            <option value="MeioCampo/Equilibrado">MeioCampo/Equilibrado</option>
            <option value="MeioCampo/Armador">MeioCampo/Armador</option>
            <option value="MeioCampo/Abertura">MeioCampo/Abertura</option>
            <option value="MeioCampo/Ataque">MeioCampo/Ataque</option>
            <option value="MeioCampo/Versátil">MeioCampo/Versátil</option>
        </optgroup>
        <optgroup label="Pontas">
            <option value="Ponta/Ala Direita">Ponta/Ala Direita</option>
            <option value="Ponta/Ala Esquerda">Ponta/Ala Esquerda</option>
            <option value="Ponta/Invertido">Ponta/Invertido</option>
            <option value="Ponta/Armador">Ponta/Armador</option>
            <option value="Ponta/Versátil">Ponta/Versátil</option>
        </optgroup>
        <optgroup label="Atacantes">
            <option value="Atacante/Aberto">Atacante/Aberto</option>
            <option value="Atacante/Fisico">Atacante/Fisico</option>
            <option value="Atacante/Armador">Atacante/Armador</option>
            <option value="Atacante/Velocidade">Atacante/Velocidade</option>
            <option value="Atacante/Versátil">Atacante/Versátil</option>
        </optgroup>
    </select>
</div>
                    <div class="linha-form"><label>Overall (OVR)</label><input type="number" id="cad-ovr" value="70"></div>
                </div>
                <button style="width:100%; margin-top:20px; font-size:15px; padding:12px;" onclick="cadastrarJogadorBase()">+ Cadastrar no Elenco</button>
            </div>

            <div class="panel">
                <h2>📋 Gestão do Elenco Atual</h2>
                <table id="tabela-plantel">
                    <thead><tr>
                        <th class="th-sortable" onclick="ordenarPlantel('posicao')">Posição ↕️</th>
                        <th class="th-sortable" onclick="ordenarPlantel('nome')">Nome ↕️</th>
                        <th class="th-sortable" onclick="ordenarPlantel('ovr')">OVR ↕️</th>
                        <th>Ações / Raio-X</th>
                    </tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <!-- ABA: MERCADO & TRANSFERÊNCIAS -->
        <div id="tab-mercado" class="tab-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <h2 style="margin:0; font-size: 26px;">💰 Central de Negociações</h2>
                <div style="display:flex; gap:15px; align-items:center;">
                    <span style="background:var(--panel-bg); padding:12px 25px; border-radius:10px; border:1px solid var(--primary); font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Saldo em Caixa: <strong id="info-orcamento" style="color:var(--primary);">€0M</strong></span>
                    <button onclick="atualizarOrcamentoMercado()" style="padding: 12px 15px; font-size: 14px;">🔄 Atualizar</button>
                </div>
            </div>

            <div class="grid-2">
                <!-- PAINEL COMPRA -->
                <div class="panel" style="border-top: 4px solid var(--accent); margin-bottom: 0;">
                    <h3 style="margin-top:0;">📥 Comprar Reforço</h3>
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Adiciona o jogador ao elenco e debita do caixa.</p>
                    <div class="grid-2">
                        <div class="linha-form">
    <label>Posição</label>
    <select id="add-pos">
        <option value="Goleiro">Goleiro</option>
        <optgroup label="Zagueiros">
            <option value="Zagueiro/Construtor">Zagueiro/Construtor</option>
            <option value="Zagueiro/Lateral">Zagueiro/Lateral</option>
            <option value="Zagueiro/Versatil">Zagueiro/Versatil</option>
            <option value="Zagueiro/Defesa">Zagueiro/Defesa</option>
        </optgroup>
        <optgroup label="Laterais">
            <option value="Lateral/Defesa Direito">Lateral/Defesa Direito</option>
            <option value="Lateral/Defesa Esquerdo">Lateral/Defesa Esquerdo</option>
            <option value="Lateral/Ala Direito">Lateral/Ala Direito</option>
            <option value="Lateral/Ala Esquerdo">Lateral/Ala Esquerdo</option>
            <option value="Lateral/Construtor Direito">Lateral/Construtor Direito</option>
            <option value="Lateral/Construtor Esquerdo">Lateral/Construtor Esquerdo</option>
            <option value="Lateral/Defesa Versatil">Lateral/Defesa Versatil</option>
            <option value="Lateral/Ala Versatil">Lateral/Ala Versatil</option>
            <option value="Lateral/Construtor Versatil">Lateral/Construtor Versatil</option>
        </optgroup>
        <optgroup label="Volantes">
            <option value="Volante/Zaga">Volante/Zaga</option>
            <option value="Volante/Contenção">Volante/Contenção</option>
            <option value="Volante/Armação">Volante/Armação</option>
        </optgroup>
        <optgroup label="Meio-Campo">
            <option value="MeioCampo/Equilibrado">MeioCampo/Equilibrado</option>
            <option value="MeioCampo/Armador">MeioCampo/Armador</option>
            <option value="MeioCampo/Abertura">MeioCampo/Abertura</option>
            <option value="MeioCampo/Ataque">MeioCampo/Ataque</option>
            <option value="MeioCampo/Versátil">MeioCampo/Versátil</option>
        </optgroup>
        <optgroup label="Pontas">
            <option value="Ponta/Ala Direita">Ponta/Ala Direita</option>
            <option value="Ponta/Ala Esquerda">Ponta/Ala Esquerda</option>
            <option value="Ponta/Invertido">Ponta/Invertido</option>
            <option value="Ponta/Armador">Ponta/Armador</option>
            <option value="Ponta/Versátil">Ponta/Versátil</option>
        </optgroup>
        <optgroup label="Atacantes">
            <option value="Atacante/Aberto">Atacante/Aberto</option>
            <option value="Atacante/Fisico">Atacante/Fisico</option>
            <option value="Atacante/Armador">Atacante/Armador</option>
            <option value="Atacante/Velocidade">Atacante/Velocidade</option>
            <option value="Atacante/Versátil">Atacante/Versátil</option>
        </optgroup>
    </select>
</div>
                        <div class="linha-form"><label>Overall (OVR)</label><input type="number" id="add-ovr" value="70"></div>
                    </div>
                    <!-- NOVO: Formato unificado de Compra/Empréstimo -->
                    <div class="linha-form">
                        <label>Tipo de Negócio</label>
                        <select id="add-tipo" onchange="toggleFormCompra()">
                            <option value="Comprado">Compra Definitiva</option>
                            <option value="EmprestadoIn">Empréstimo (Chegando)</option>
                        </select>
                    </div>

                    <div class="linha-form" id="box-add-custo">
                        <label>Custo da Compra (€M)</label>
                        <input type="number" id="add-custo" value="0">
                    </div>

                    <div class="linha-form" id="box-add-duracao" style="display:none;">
                        <label>Duração do Empréstimo</label>
                        <select id="add-duracao">
                            <option value="1">1 Temporada</option>
                            <option value="2">2 Temporadas</option>
                        </select>
                    </div>

                    <button id="btn-confirmar-compra" style="width:100%; margin-top:20px; background: var(--accent); color: white; padding: 12px; font-size: 15px;" onclick="adicionarAoPlantel()">Confirmar Negócio</button>
                </div>

                <!-- PAINEL VENDA / EMPRÉSTIMO -->
                <div class="panel" style="border-top: 4px solid var(--danger); margin-bottom: 0;">
                    <h3 style="margin-top:0; color:var(--danger)">📤 Saídas (Venda / Empréstimo)</h3>
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">O valor da venda alimenta o <strong>Valor Arrecadado</strong> da temporada na Diretoria. Não vai para o Orçamento Disponível.</p>
                    
                    <!-- CAMPO CORRIGIDO: Busca o jogador no elenco atual -->
                    <div class="linha-form">
                        <label>Buscar Jogador no Elenco</label>
                        <input type="text" id="saida-nome-input" placeholder="Digite para buscar..." list="datalist-jogadores">
                    </div>
                    
                    <div class="linha-form">
                        <label>Tipo de Negócio</label>
                        <select id="saida-tipo" onchange="toggleFormSaida()">
                            <option value="Venda">Venda Definitiva</option>
                            <option value="Emprestimo">Empréstimo</option>
                            <option value="Dispensa">Dispensa (Fim de Contrato)</option>
                        </select>
                    </div>

                    <!-- CAMPO CORRIGIDO: Apenas um valor de venda -->
                    <div class="linha-form" id="box-saida-valor">
                        <label>Valor da Venda (€M) - Vai para Arrecadação</label>
                        <input type="number" id="saida-valor" value="0">
                    </div>

                    <div class="linha-form" id="box-saida-duracao" style="display:none;">
                        <label>Duração do Empréstimo</label>
                        <select id="saida-duracao">
                            <option value="1">1 Temporada</option>
                            <option value="2">2 Temporadas</option>
                        </select>
                    </div>

                    <button style="width:100%; margin-top:20px; background: var(--danger); color: white; padding: 12px; font-size: 15px;" onclick="processarSaida()">Confirmar Saída</button>
                </div>
            </div>

            <!-- HISTÓRICO -->
            <!-- HISTÓRICO -->
   <div class="filtros-plantel" style="flex-wrap: wrap;">
       <button class="btn-filtro active" onclick="filtrarMercado('Vendido', this)">🔴 Vendidos</button>
       <button class="btn-filtro" onclick="filtrarMercado('Emprestado', this)">🟡 Emprestados (Saindo)</button>
       <button class="btn-filtro" onclick="filtrarMercado('Aposentado', this)">⚪ Dispensados / Aposentados</button>
       <button class="btn-filtro" onclick="filtrarMercado('Comprado', this)">🟢 Comprados</button>
       <button class="btn-filtro" onclick="filtrarMercado('EmprestadoIn', this)">🔵 Emprestados (Chegando)</button>
   </div>
   
   <div class="filtros-plantel" id="container-botoes-filtro-transf" style="flex-wrap: wrap; margin-top: 5px; display: none;">
       <span style="align-self: center; font-size: 12px; color: var(--text-muted); margin-right: 5px;">Ordenar por:</span>
       <button class="btn-filtro" onclick="ordenarTransferencias('nome')">Nome ↕️</button>
       <button class="btn-filtro" onclick="ordenarTransferencias('posicao')">Posição ↕️</button>
       <button class="btn-filtro" onclick="ordenarTransferencias('ovr')">OVR ↕️</button>
       <button class="btn-filtro" onclick="ordenarTransferencias('valor')">Valor ↕️</button>
   </div>
                <table id="tabela-mercado">
                    <thead><tr><th>Status</th><th>Posição</th><th>Nome</th><th>OVR</th><th>Ações / Raio-X</th></tr></thead>
                    <tbody></tbody>
                </table>
        </div>

        <!-- ABA: UPGRADES -->
        <div id="tab-upgrades" class="tab-content">
            <div class="panel">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0;">⭐ Upgrades e Downgrades (A cada 5 jogos)</h2>
                    <button style="background:var(--accent); color:white; font-size:13px; padding:10px 15px;" onclick="abrirModalTrocaLiga()">🔄 Trocar Divisão / Liga</button>
                </div>
                <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 25px; margin-top:10px;">O sistema avalia a média das <strong>últimas 5 partidas</strong> e usa as <strong>Prateleiras</strong> (Highest a Lowest) baseadas na liga atual: <span id="info-liga-atual" style="color:var(--primary);font-weight:bold;"></span>.</p>
                
                <div style="background: rgba(255, 184, 0, 0.1); border-left: 4px solid var(--warning); padding: 18px; border-radius: 8px; margin-bottom: 15px; cursor: pointer; transition:0.2s;" onclick="toggleSection('sec-acao')" onmouseover="this.style.background='rgba(255,184,0,0.15)'" onmouseout="this.style.background='rgba(255,184,0,0.1)'">
                    <h3 style="margin:0; color:var(--warning); font-size: 18px;">⚠️ Aguardando Decisão (Alterações Pendentes) ↕️</h3>
                </div>
                <div id="sec-acao" style="display: block;">
                    <table id="tabela-upgrades-acao">
                        <thead><tr><th>Posição</th><th>Jogador</th><th>Prateleira / Meta</th><th>Média (Últ 5)</th><th>OVR Atual</th><th>Ação</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>

                <div style="background: rgba(148, 163, 184, 0.1); border-left: 4px solid var(--text-muted); padding: 18px; border-radius: 8px; margin-top: 30px; margin-bottom: 15px; cursor: pointer; transition:0.2s;" onclick="toggleSection('sec-progresso')" onmouseover="this.style.background='rgba(148,163,184,0.15)'" onmouseout="this.style.background='rgba(148,163,184,0.1)'">
                    <h3 style="margin:0; color:var(--text-muted); font-size: 18px;">⏳ Em Progresso de Avaliação ↕️</h3>
                </div>
                <div id="sec-progresso" style="display: block;">
                    <table id="tabela-upgrades-progresso">
                        <thead><tr><th>Posição</th><th>Jogador</th><th>Progresso</th><th>OVR Atual</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ABA: HISTÓRICO E TROFÉUS -->
        <div id="tab-historico" class="tab-content">
            <div class="panel" style="border-left: 4px solid var(--gold);">
                <h2>🏆 Galeria de Troféus</h2>
                <div id="lista-trofeus-geral" style="display:flex; flex-wrap:wrap; gap:20px; margin-top:20px;">
                    <!-- Trofeus renderizados aqui -->
                </div>
            </div>

            <div class="panel">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin:0;">📖 Histórico de Temporadas / Ciclos</h2>
                    <select id="seletor-hist-temporada" onchange="mostrarDetalhesTemporada(this.value)" style="width: 250px; background:var(--bg-dark); color:white; border-radius: 8px; padding:10px;"></select>
                </div>
                <div id="detalhes-temporada-selecionada" style="background: var(--input-bg); padding: 25px; border-radius: 12px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Detalhes da temporada -->
                </div>
            </div>
        </div>

                <!-- ABAS DE IA -->
        <div id="tab-diretoria" class="tab-content">
            <!-- DASHBOARD DIRETORIA -->
            <div id="diretoria-dashboard" style="display:none;">
                <div class="panel grid-3" style="border-top: 4px solid var(--gold); margin-bottom: 20px;"> 
                    <div>
<span style="font-size:13px; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Orçamento Disponível</span>
                        <div style="font-size:20px; font-weight:bold; color:var(--accent); margin-top:5px;" id="dash-dir-orcamento">€0M</div>
                    </div>
                    <div>
                        <span style="font-size:13px; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Média Gasto (5 Temp)</span>
                        <div style="font-size:20px; font-weight:bold; color:var(--danger); margin-top:5px;" id="dir-media-gasto">€0M</div>
                    </div>
                    <div>
                        <span style="font-size:13px; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Média Arrecadação (5 Temp)</span>
                        <div style="font-size:20px; font-weight:bold; color:var(--primary); margin-top:5px;" id="dir-media-arrecadado">€0M</div>
                    </div>
                    <div>
                        <span style="font-size:13px; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Nota de Prestígio</span>
                        <div style="font-size:20px; font-weight:bold; color:var(--primary); margin-top:5px;" id="dir-nota-diretoria">6.5 / 10</div>
                    </div>
                    <div>
                        <span style="font-size:13px; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Valor Gasto (Nesta Temp.)</span>
                        <div style="font-size:20px; font-weight:bold; color:var(--danger); margin-top:5px;" id="dash-dir-gasto-atual">€0M</div>
                    </div>
                    <div>
                        <span style="font-size:13px; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Valor Arrecadado (Nesta Temp.)</span>
                        <div style="font-size:20px; font-weight:bold; color:var(--primary); margin-top:5px;" id="dash-dir-arrecadado-atual">€0M</div>
                    </div>
                    <div style="grid-column: span 3; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
                        <span style="font-size:13px; color:var(--text-muted); text-transform:uppercase; font-weight:bold;">Metas e Objetivos da Temporada</span>
                        <div style="font-size:16px; color:var(--warning); line-height: 1.6; margin-top: 10px; font-weight: 500;" id="dir-objetivos-texto">---</div>
                    </div>
                </div>

                <!-- BOTÃO PARA EXIBIR/OCULTAR CHAT DA DIRETORIA -->
                <button id="btn-toggle-chat-dir" onclick="toggleChatDiretoria()" style="width: 100%; margin-top: 15px; background: var(--panel-bg); border: 1px solid var(--gold); color: var(--gold); padding: 12px; font-weight: bold; font-size: 14px; border-radius: 8px; cursor: pointer; transition: 0.2s;">
                    👔 Solicitar Reunião com a Diretoria (Chat)
                </button>
            </div>

            <!-- PAINEL DE CHAT DA DIRETORIA (ESCONDIDO POR PADRÃO) -->
            <div id="panel-chat-diretoria" class="panel chat-container" style="height: 400px; margin-top: 20px; display: none;">
                <div style="padding: 15px 20px; background: var(--panel-bg); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size:18px;">👔 Reunião com a Diretoria / Conselho</h2>
                    <button onclick="apagarChat('diretoria')" style="background: var(--danger); color: white; padding: 6px 12px; font-size: 12px;">🗑️ Apagar Conversa</button>
                </div>
                <div class="chat-log" id="chat-log-diretoria"></div>
                <div class="chat-input-area">
                    <div class="quick-replies" id="quick-diretoria"></div>
                    <div class="chat-input-row">
                        <button class="btn-mic" id="mic-btn-diretoria" onclick="iniciarGravacao('input-diretoria', 'mic-btn-diretoria')">🎤</button>
                        <textarea id="input-diretoria" placeholder="Responda à diretoria, negocie verbas ou justifique resultados..." onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); enviarChat('diretoria'); }"></textarea>
                        <button onclick="enviarChat('diretoria')" style="padding: 10px 20px; font-size:14px; background: var(--gold); color: black;">Conversar</button>
                    </div>
                </div>
            </div>
        </div>

                <div id="tab-auxiliar" class="tab-content">
            <div class="panel">
                <h2 style="margin: 0 0 20px 0; font-size:24px;">🤖 Auxiliar Técnico e Táticas</h2>
                
                <div style="background: rgba(0, 255, 136, 0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--primary); margin-bottom: 20px;">
                    <h3 style="margin-top:0; font-size: 16px; color: var(--primary);">📋 Minha Filosofia Tática</h3>
                    <div class="grid-3">
                        <div class="linha-form">
                            <label style="color:var(--primary);">Formação Preferida</label>
                            <select id="tatica-primaria" onchange="salvarPreferenciasTaticas()" style="background: var(--bg-dark);">
                                <option value="4-3-3">4-3-3 (Ofensivo)</option>
                                <option value="4-4-2">4-4-2 (Clássico)</option>
                                <option value="3-5-2">3-5-2 (Alas)</option>
                                <option value="4-2-3-1" selected>4-2-3-1 (Moderna)</option>
                                <option value="4-1-4-1">4-1-4-1 (Equilibrada)</option>
                                <option value="3-4-3">3-4-3 (Agressiva)</option>
                                <option value="5-3-2">5-3-2 (Defensiva)</option>
                            </select>
                        </div>
                        <div class="linha-form">
                            <label style="color:var(--primary);">Formação Secundária</label>
                            <select id="tatica-secundaria" onchange="salvarPreferenciasTaticas()" style="background: var(--bg-dark);">
                                <option value="4-3-3">4-3-3 (Ofensivo)</option>
                                <option value="4-4-2">4-4-2 (Clássico)</option>
                                <option value="3-5-2">3-5-2 (Alas)</option>
                                <option value="4-2-3-1">4-2-3-1 (Moderna)</option>
                                <option value="4-1-4-1">4-1-4-1 (Equilibrada)</option>
                                <option value="3-4-3">3-4-3 (Agressiva)</option>
                                <option value="5-3-2" selected>5-3-2 (Defensiva)</option>
                            </select>
                        </div>
                        <div class="linha-form">
                            <label style="color:var(--primary);">Estilo de Jogo da Equipe</label>
                            <select id="tatica-estilo" onchange="salvarPreferenciasTaticas()" style="background: var(--bg-dark);">
                                <option value="Posse de bola e cadência (Tiki-taka)">Posse de Bola (Tiki-Taka)</option>
                                <option value="Jogadas rápidas pelas laterais e pontas (Amplitude)">Explorar Laterais/Pontas</option>
                                <option value="Transição rápida e jogo vertical direto">Transição Rápida (Vertical)</option>
                                <option value="Contra-ataque letal esperando o adversário">Contra-ataque Letal</option>
                                <option value="Retranca total, linhas baixas e compactas">Retranca Total</option>
                                <option value="Pressão alta sufocante (Gegenpressing)">Pressão Total (Gegenpressing)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(0, 163, 255, 0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--accent); margin-bottom: 20px;">
                    <h3 style="margin-top:0; font-size: 16px; color: var(--accent);">⚔️ Preparação para o Próximo Jogo</h3>
                    <div class="grid-2">
                        <div class="linha-form">
                            <label style="color:var(--accent);">Próximo Adversário</label>
                            <input type="text" id="auxiliar-adv" placeholder="Ex: Real Madrid" style="background: var(--bg-dark);">
                        </div>
                        <div class="linha-form">
                            <label style="color:var(--warning);">Diretriz Estratégica</label>
                            <select id="auxiliar-diretriz" style="background: var(--bg-dark);">
                                <option value="Força máxima dentro do possível (Respeitando limites de cansaço)">Força Máxima Possível (Recomendado)</option>
                                <option value="Rodízio extremo (Poupar os titulares para o jogo seguinte)">Rodízio Extremo (Poupar titulares)</option>
                                <option value="Força total absoluta (Ignorar cansaço, ir pro tudo ou nada)">Força Total Absoluta (Risco de Lesão)</option>
                                <option value="Explorar base e reservas (Dar experiência)">Explorar Jovens/Reservas</option>
                            </select>
                        </div>
                    </div>
                    <button id="btn-pedir-ia" onclick="pedirEscalacaoIA()" style="width: 100%; margin-top: 10px; padding: 12px; font-size: 15px; background: var(--accent); color: white;">
                        ⚙️ Gerar Escalação e Funções Táticas (IA)
                    </button>
                </div>

                <div style="display:flex; gap:10px; margin-bottom: 20px; background: rgba(255, 107, 107, 0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border); flex-wrap: wrap; align-items: flex-end;">
                    <div style="flex:1; min-width: 180px;">
                        <label style="color:var(--danger);">Atleta para Condição</label>
                        <select id="select-jogador-condicao" style="width: 100%; box-sizing: border-box; background: var(--bg-dark);">
                            <option value="">Selecione o jogador...</option>
                        </select>
                    </div>
                    <div style="width: 160px;">
                        <label style="color:var(--danger);">Dias Lesionado</label>
                        <input type="number" id="input-dias-lesao" placeholder="Ex: 7" style="width: 100%; box-sizing: border-box;" value="0">
                    </div>
                    <div>
                        <button onclick="declararLesao()" style="background: var(--danger); color: white; padding: 10px 15px;">🏥 Declarar Lesão</button>
                    </div>
                    <div>
                        <button onclick="aplicarCartaoVermelho()" style="background: var(--warning); color: black; padding: 10px 15px;">🟥 Cartão Vermelho</button>
                    </div>
                </div>

                                <p style="text-align:center; font-size: 13px; color: var(--text-muted); margin-bottom: 5px;">Passe o mouse (ou segure) no jogador para ler as ordens da IA.</p>
                <div class="campo-futebol-grande" id="campo-futebol-ui">
                    <div class="area-penalti-top"></div>
                    <div class="area-penalti-bot"></div>
                </div>

                <!-- BOTÃO PARA EXIBIR/OCULTAR CHAT -->
                <button id="btn-toggle-chat-aux" onclick="toggleChatAuxiliar()" style="width: 100%; margin-top: 15px; background: var(--panel-bg); border: 1px solid var(--accent); color: var(--accent); padding: 12px; font-weight: bold; font-size: 14px; border-radius: 8px; cursor: pointer; transition: 0.2s;">
                    💬 Abrir Painel de Instruções Diretas e Conversa (Chat)
                </button>
            </div>

            <!-- CHAT DO AUXILIAR (AGORA ESCONDIDO POR PADRÃO com display: none) -->
            <div id="panel-chat-auxiliar" class="panel chat-container" style="height: 400px; margin-top: 20px; display: none;">
                <div style="padding: 15px 20px; background: var(--panel-bg); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size:18px;">💬 Dar Ordens ao Auxiliar Técnico</h2>
                    <button onclick="apagarChat('auxiliar')" style="background: var(--danger); color: white; padding: 6px 12px; font-size: 12px;">🗑️ Apagar Conversa</button>
                </div>
                <div class="chat-log" id="chat-log-auxiliar"></div>
                <div class="chat-input-area">
                    <div class="quick-replies" id="quick-auxiliar"></div>
                    <div class="chat-input-row">
                        <button class="btn-mic" id="mic-btn-auxiliar" onclick="iniciarGravacao('input-auxiliar', 'mic-btn-auxiliar')">🎤</button>
                        <textarea id="input-auxiliar" placeholder="Digite ordens ou escolha uma opção rápida acima..." onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); enviarChat('auxiliar'); }"></textarea>
                        <button onclick="enviarChat('auxiliar')" style="padding: 10px 20px; font-size:14px;">Conversar</button>
                    </div>
                </div>
            </div>
        </div>

        
        <!-- ABA: FEED SOCIAL DA TORCIDA (SUBSTITUI IMPRENSA E NOTÍCIAS) -->
        <div id="tab-social" class="tab-content">
            <div class="social-header">
    <div>
        <h2 style="margin: 0; font-size: 24px;">📱 Feed Social</h2>
        <span style="font-size: 13px; color: var(--text-muted);">A voz da torcida e da mídia esportiva</span>
    </div>
    <div class="termometro-container">
        <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">Aprovação da Torcida</span>
        <div class="termometro-bar">
            <div id="barra-torcida" class="termometro-fill" style="width: 50%; background: var(--warning);"></div>
        </div>
        <div id="texto-torcida" style="font-size: 18px; font-weight: bold; color: white; margin-top: 5px;">50% (Dividida)</div>
    </div>
    <div style="display: flex; gap: 10px;">
        <button style="background: var(--bg-dark); color: white; border: 1px solid var(--border);" onclick="apagarSocialFeed()">🗑️ Limpar Feed</button>
        <!-- BOTÃO DE ATUALIZAR FEED FOI REMOVIDO DAQUI -->
    </div>
</div>
            
            <div id="loader-social" class="loader" style="margin: 20px auto; border-top-color: var(--accent);"></div>
            <div id="feed-social-container" style="display: flex; flex-direction: column; gap: 10px;">
                <!-- Os cards do feed vão aparecer aqui -->
            </div>
        </div>

    </div>

    <script>
        // A chave da API não fica mais aqui. As chamadas passam pelo seu Worker (proxy) na Cloudflare,
        // que guarda a chave escondida do lado do servidor.
        const API_URL = "https://lyonpromanager.eduardolion.workers.dev/";
        
        let currentSave = 'clube';
        let statusFiltroMercado = 'Vendido';
        let idTempCounter = 0;
        let jogadoresPartidaTemp = [];
        let contadorPartidasEvento = 0;
        let limitePartidasEvento = gerarNumeroAleatorio(8, 14);
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

        let db = {
            clube: { nome: '', escalacaoSalvaIA: null, aprovacaoTorcida: 50, alvosTorcida: {}, liga: '', temporadaAtual: '25/26', orcamento: 0, gastoAtual: 0, arrecadadoAtual: 0, mediaGastoHistorico: 0, mediaArrecadadoHistorico: 0, competicaoContinental: 'Nenhuma', notaDiretoria: 6.5, objetivosTemporada: '', diretoriaConfigurada: false, exigenciasDiretoria: [], partidas: [], plantel: [], historicoTemporadas: [], socialFeed: [], chatHistory: { diretoria: [], auxiliar: [] } },
            selecao: { nome: '', aprovacaoTorcida: 50, alvosTorcida: {}, liga: 'Seleção Tier 2 (OVR 74)', temporadaAtual: 'Ciclo 2030', orcamento: 0, gastoAtual: 0, arrecadadoAtual: 0, mediaGastoHistorico: 0, mediaArrecadadoHistorico: 0, competicaoContinental: 'Nenhuma', notaDiretoria: 6.5, objetivosTemporada: '', diretoriaConfigurada: false, exigenciasDiretoria: [], partidas: [], plantel: [], historicoTemporadas: [], socialFeed: [], chatHistory: { diretoria: [], auxiliar: [] } }
        };

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

        function iniciarSave() {
            let nome = document.getElementById('setup-nome-time').value.trim();
            if(!nome) return alert("Digite o nome da equipe!");
            db[currentSave].nome = nome;
            db[currentSave].liga = document.getElementById('setup-liga').value;
            db[currentSave].temporadaAtual = currentSave === 'clube' ? document.getElementById('setup-temporada').value : document.getElementById('setup-ciclo').value;
            adicionarNoticiaAutomatica(`🚨 O projeto começa: ${nome} inicia a temporada ${db[currentSave].temporadaAtual}.`, `A diretoria estabeleceu novas diretrizes ambiciosas para o início desta temporada do ${nome}. O planejamento envolve foco total no campeonato e buscar a solidificação tática sob a tutela do novo Manager.`);
            salvarDados(); ajustarInterfaceSave();
            carregarPreferenciasTaticas();
        }

        function resetarSave() {
            if(confirm(`Tem certeza que deseja APAGAR TODO O PROGRESSO do slot: ${currentSave}?`)) {
                if(currentSave === 'clube') db.clube = { nome: '', liga: '', temporadaAtual: '25/26', orcamento: 0, gastoAtual: 0, arrecadadoAtual: 0, notaDiretoria: 6.5, objetivosTemporada: '⚽ Liga: Fazer boa campanha<br>🏆 Copas: Competir bem<br>💰 Finanças: Manter os salários controlados', diretoriaConfigurada: false, exigenciasDiretoria: [], gastosTemporadas: [], arrecadacoesTemporadas: [], partidas: [], plantel: [], historicoTemporadas: [], noticiasFeed: [], chatHistory: { imprensa: [], diretoria: [], auxiliar: [] } };
                else db.selecao = { nome: '', liga: 'Seleção Tier 2 (OVR 74)', temporadaAtual: 'Ciclo 2030', orcamento: 0, gastoAtual: 0, arrecadadoAtual: 0, notaDiretoria: 6.5, objetivosTemporada: '⚽ Liga: Fazer boa campanha<br>🏆 Copas: Competir bem', diretoriaConfigurada: false, exigenciasDiretoria: [], gastosTemporadas: [], arrecadacoesTemporadas: [], partidas: [], plantel: [], historicoTemporadas: [], noticiasFeed: [], chatHistory: { imprensa: [], diretoria: [], auxiliar: [] } };
                salvarDados(); location.reload();
            }
        }

        function atualizarDiretoriaUI() {
            let data = db[currentSave];
            if (!data.diretoriaConfigurada) {
                document.getElementById('modal-setup-diretoria').style.display = 'flex';
                // Oculta a continental se for seleção
                let boxCont = document.getElementById('box-setup-continental');
                if(boxCont) boxCont.style.display = currentSave === 'clube' ? 'flex' : 'none';
                return; 
            }
            document.getElementById('diretoria-dashboard').style.display = 'block';

            document.getElementById('dir-media-gasto').innerText = `€${(data.mediaGastoHistorico || 0).toFixed(1)}M`;
            document.getElementById('dir-media-arrecadado').innerText = `€${(data.mediaArrecadadoHistorico || 0).toFixed(1)}M`;
            let notaFormatada = typeof data.notaDiretoria === 'number' ? data.notaDiretoria.toFixed(1) : "6.5";
            document.getElementById('dir-nota-diretoria').innerText = `${notaFormatada} / 10`;
            document.getElementById('dash-dir-orcamento').innerText = "€" + (data.orcamento || 0).toFixed(2) + "M";
            document.getElementById('dash-dir-arrecadado-atual').innerText = "€" + (data.arrecadadoAtual || 0).toFixed(2) + "M";
            document.getElementById('dash-dir-gasto-atual').innerText = "€" + (data.gastoAtual || 0).toFixed(2) + "M";
            document.getElementById('dir-objetivos-texto').innerHTML = data.objetivosTemporada || "Nenhuma meta definida.";
            renderizarChat('diretoria');
        }

        async function salvarSetupDiretoria() {
            let mediaGasto = Number(document.getElementById('setup-dir-media-gasto').value) || 0;
            let mediaArrecadacao = Number(document.getElementById('setup-dir-media-arrecadacao').value) || 0;
            let titulos = Number(document.getElementById('setup-dir-titulos').value) || 0;
            let posicaoMedia = Number(document.getElementById('setup-dir-posicao').value) || 5;
            let continental = currentSave === 'clube' ? document.getElementById('setup-dir-continental').value : 'Nenhuma';

            db[currentSave].mediaGastoHistorico = mediaGasto;
            db[currentSave].mediaArrecadadoHistorico = mediaArrecadacao;
            db[currentSave].competicaoContinental = continental;
            db[currentSave].notaDiretoria = 6.5;

            let promptIA = `Atue como a Diretoria do clube/seleção "${db[currentSave].nome}" (Liga/Tier atual: ${db[currentSave].liga}).
            Histórico (5 anos): Gasto Médio: €${mediaGasto}M, Arrecadação Média: €${mediaArrecadacao}M, Títulos: ${titulos}, Posição Média: ${posicaoMedia}º. Competição Internacional atual: ${continental}.
            Defina o orçamento inicial e os objetivos. Siga ESTRITAMENTE as regras para NÃO SER GENÉRICO, REDUNDANTE OU IRREAL:
            - CONTEXTO E REALISMO: Se o time está em divisões inferiores ou tem posição média ruim, seja realista. Não exija títulos ou fases avançadas em copas (exija apenas focar na liga ou passar da 1ª fase da copa).
            - DADOS RASTREÁVEIS: O sistema NÃO rastreia idade de jogadores, nem minutos jogados em campo. É PROIBIDO criar metas sobre idade ou minutos. Use apenas métricas visíveis: Gols, Assistências, Saldo de Gols, Contratações, Vendas, Vitórias, e OVR.
            - objLiga1: A meta principal na tabela (ex: Título, Acesso, Top 10, Evitar rebaixamento).
            - objLiga2: Uma meta RASTREÁVEL E DIFERENTE DA PRIMEIRA (ex: Terminar com saldo de gols positivo, Ter o artilheiro, etc. NÃO REPITA A META DA LIGA 1).
            - objCopa e objInternacional: Seja realista conforme o nível do time. NÃO REPITA OS OBJETIVOS ACIMA.
            - objFinanceiro: Um objetivo MATEMÁTICO CLARO baseado nas métricas reais do jogo (Valor Gasto e Valor Arrecadado). Use APENAS exigências como "Arrecadar €X em vendas", "Limitar os gastos a €X" ou "Terminar com Saldo Positivo (Arrecadação maior que Gasto)". NUNCA use termos abstratos como "margem de lucro" ou "lucro de X%".
            Retorne EXATAMENTE um objeto JSON puro:
            { 
              "orcamentoLiberado": 30.0, 
              "objLiga1": "texto", 
              "objLiga2": "texto", 
              "objCopa": "texto", 
              "objInternacional": "texto (ou vazio se Nenhuma)", 
              "objFinanceiro": "texto" 
            }`;

            document.getElementById('modal-setup-diretoria').style.display = 'none';
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
                    db[currentSave].orcamento = Number(res.orcamentoLiberado) || 20;
                    let txt = `⚽ Liga: ${res.objLiga1}<br>⚽ Liga (Secundário): ${res.objLiga2}<br>🏆 Copa Nacional: ${res.objCopa}`;
                    if(res.objInternacional && res.objInternacional.trim() !== "") txt += `<br>🌍 Internacional (${continental}): ${res.objInternacional}`;
                    txt += `<br>💰 Finanças: ${res.objFinanceiro}`;
                    db[currentSave].objetivosTemporada = txt;
                }
            } catch(err) {
                db[currentSave].orcamento = 20;
                db[currentSave].objetivosTemporada = "⚽ Liga: Garantir permanência<br>🏆 Copas: Disputar com honra<br>💰 Finanças: Não gerar prejuízo";
            }
            db[currentSave].diretoriaConfigurada = true; salvarDados(); atualizarDiretoriaUI();
        }

        function atualizarNotaDiretoria(variacao) {
            if (db[currentSave].notaDiretoria !== undefined && variacao !== 0) {
                db[currentSave].notaDiretoria = Math.max(0.0, Math.min(10.0, db[currentSave].notaDiretoria + variacao));
                let elNota = document.getElementById('dir-nota-diretoria');
                if (elNota) elNota.innerText = db[currentSave].notaDiretoria.toFixed(1) + " / 10";
            }
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
                } catch(e) {} loader.style.display = "none";
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

        function salvarPartida() {
            let golsP = Number(document.getElementById('gols-pro').value); let golsC = Number(document.getElementById('gols-contra').value);
            let adv = document.getElementById('adversario').value || "Adversário"; let penaltis = document.getElementById('vitoria-penaltis').checked;
            let diasPassados = parseInt(document.getElementById('partida-dias-proxima')?.value) || 3;
            processarDiasAposPartida(diasPassados);

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

            salvarDados(); jogadoresPartidaTemp = []; renderizarListaTemp(); document.getElementById('vitoria-penaltis').checked = false;
            contadorPartidasEvento++; if(contadorPartidasEvento >= limitePartidasEvento) { gerarEventoAleatorio(); contadorPartidasEvento = 0; limitePartidasEvento = gerarNumeroAleatorio(8, 14); } else { alert("Partida salva!"); }
            atualizarFiltroTemporadas(); desenharGraficos(); preencherDatalistJogadores();
        }

        async function concluirTemporadaAutomatica() {
            if(!confirm(`Deseja encerrar a temporada ${db[currentSave].temporadaAtual}?`)) return;
            let posTabelaInput = prompt("Posição Final exata na tabela da Liga? (Ex: 1º Lugar)", "1º Lugar");
            if(posTabelaInput === null) return;

            // Pergunta sobre classificação continental se for clube
            let novaContinental = 'Nenhuma';
            if (currentSave === 'clube') {
                let classificou = confirm("O clube garantiu classificação para alguma Competição Continental para a PRÓXIMA temporada?");
                if (classificou) {
                    novaContinental = prompt("Qual o nome da competição? (Ex: Libertadores, Champions League, Sul-Americana, etc)", "Libertadores") || 'Nenhuma';
                }
                db.clube.competicaoContinental = novaContinental;
            }
            
            let pFiltradas = db[currentSave].partidas.filter(p => p.temporada === db[currentSave].temporadaAtual);
            let comps = {}; let trofeusGanhos = []; let detalhesComp = [];
            pFiltradas.forEach(p => { comps[p.comp] = p; });

            for(let c in comps) {
                let lastGame = comps[c];
                let isFinal = lastGame.contexto.toLowerCase().includes('final') && !lastGame.contexto.toLowerCase().includes('quartas') && !lastGame.contexto.toLowerCase().includes('oitavas') && !lastGame.contexto.toLowerCase().includes('semi');
                let isPrimeiro = lastGame.contexto.toLowerCase().includes('1º') || lastGame.contexto.toLowerCase().includes('campeão');
                let status = lastGame.contexto || "Fase Desconhecida";

                if (isPrimeiro || (isFinal && (lastGame.golsPro > lastGame.golsContra || (lastGame.golsPro === lastGame.golsContra && lastGame.penaltis)))) {
                    status = "Campeão 🏆"; trofeusGanhos.push(c); adicionarNoticiaAutomatica(`🏆 É CAMPEÃO de ${c}!`, `Toda a cidade está em festa!`);
                } else if (isFinal) { status = "Vice-Campeão 🥈"; }
                detalhesComp.push({ competicao: c, fase_final: status });
            }

            db[currentSave].historicoTemporadas.push({ temporada: db[currentSave].temporadaAtual, posicaoTabela: posTabelaInput, detalhes: detalhesComp, trofeus: trofeusGanhos });

            let gastoTotalTemp = db[currentSave].gastoAtual || 0; let arrecadadoTotalTemp = db[currentSave].arrecadadoAtual || 0;
            let balancoFinanceiro = arrecadadoTotalTemp - gastoTotalTemp;

            // NOVA LÓGICA DE MÉDIA (Média Antiga + Atual) / 2
            db[currentSave].mediaGastoHistorico = (db[currentSave].mediaGastoHistorico + gastoTotalTemp) / 2;
            db[currentSave].mediaArrecadadoHistorico = (db[currentSave].mediaArrecadadoHistorico + arrecadadoTotalTemp) / 2;

            let penalidadePrejuizo = 0;
            if(balancoFinanceiro < 0) { penalidadePrejuizo = 0.5; alert("⚠️ Atenção: Prejuízo na temporada penalizou seu prestígio (-0.5)."); }

            let promptFim = `Temporada ${db[currentSave].temporadaAtual} encerrada. Posição final na Liga: ${posTabelaInput}. Saldo financeiro do ano: €${balancoFinanceiro}M. Próxima competição continental: ${novaContinental}.
            Com base nesses resultados e na Liga atual, avalie o treinador e gere novos objetivos para a próxima temporada. SEJA ESPECÍFICO, REALISTA E NÃO REDUNDANTE.
            REGRAS DE REALISMO E RASTREAMENTO:
            - É PROIBIDO criar metas baseadas em "Idade" ou "Minutos jogados". O sistema não mede isso. Use vitórias, gols, saldo, valores em dinheiro, OVR ou passar de fase.
            - Adapte a exigência à realidade do time: times ruins devem ter metas humildes nas copas e focar em sobrevivência.
            - objLiga1: A meta principal da liga na tabela (ex: Título, Vaga continental, Top 10, Fugir do Z4).
            - objLiga2: Uma meta estatística RASTREÁVEL E DIFERENTE DA PRIMEIRA (ex: Saldo de gols +10, Melhor defesa. NÃO REPITA A META 1).
            - objCopa e objInternacional: Adapte a exigência. NÃO REPITA OBJETIVOS.
            - objFinanceiro: Uma meta numérica baseada nas métricas do jogo (Valor Gasto e Valor Arrecadado). Ex: "Arrecadar €15M em vendas" ou "Não gastar mais que €20M". NUNCA exija "margem de lucro" ou porcentagens.
            Retorne EXATAMENTE JSON: 
            { 
              "novoOrcamento": numero, 
              "novaNota": numero, 
              "objLiga1": "texto", 
              "objLiga2": "texto", 
              "objCopa": "texto", 
              "objInternacional": "texto", 
              "objFinanceiro": "texto" 
            }`;

            try {
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptFim }] }] })
                });
                const data = await response.json();
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                if(match) {
                    let resAI = JSON.parse(match[0]);
                    db[currentSave].orcamento = Number(resAI.novoOrcamento) || 25;
                    db[currentSave].notaDiretoria = (Number(resAI.novaNota) || db[currentSave].notaDiretoria) - penalidadePrejuizo;
                    if(db[currentSave].notaDiretoria < 0) db[currentSave].notaDiretoria = 0;
                    let txt = `⚽ Liga: ${resAI.objLiga1}<br>⚽ Liga (Secundário): ${resAI.objLiga2}<br>🏆 Copa Nacional: ${resAI.objCopa}`;
                    if(resAI.objInternacional && resAI.objInternacional.trim() !== "" && novaContinental !== 'Nenhuma') txt += `<br>🌍 Internacional (${novaContinental}): ${resAI.objInternacional}`;
                    txt += `<br>💰 Finanças: ${resAI.objFinanceiro}`;
                    db[currentSave].objetivosTemporada = txt;
                }
            } catch(e) { db[currentSave].orcamento = 25; db[currentSave].notaDiretoria -= penalidadePrejuizo; }

            db[currentSave].gastoAtual = 0; db[currentSave].arrecadadoAtual = 0;
            db[currentSave].negociacoesDiretoria = 0; // Reseta o limite de negociações da diretoria

            if(currentSave === 'clube') {
                let ano = parseInt(db.clube.temporadaAtual.split('/')[0]); db.clube.temporadaAtual = `${ano+1}/${ano+2}`; 
                
                db.clube.plantel.forEach(p => {
                    if (p.status === 'Emprestado' && p.temporadasEmprestimo > 0) {
                        p.temporadasEmprestimo--; 
                        if (p.temporadasEmprestimo <= 0) {
                            p.status = 'Ativo';
                            adicionarNoticiaAutomatica(`✈️ DE VOLTA: ${p.nome} retorna de empréstimo.`, `O jogador está de volta ao elenco principal após o período cedido e já pode ser escalado.`);
                        }
                    }
                    else if (p.status === 'Ativo' && p.origem === 'EmprestadoIn') {
                        p.status = 'FimEmprestimo'; 
                        adicionarNoticiaAutomatica(`👋 ADEUS (POR ENQUANTO): Fim de empréstimo de ${p.nome}.`, `O contrato de empréstimo encerrou e o jogador deixou o elenco ativo. Caso seja contratado futuramente, seu histórico retornará intacto.`);
                    }
                });
                
                checarPromocaoRebaixamento();
            } else {
                let anoAtual = parseInt(db.selecao.temporadaAtual.replace(/\D/g, '')); db.selecao.temporadaAtual = `Ciclo ${anoAtual + 4}`;
            }
            salvarDados(); alert("Temporada concluída!"); atualizarFiltroTemporadas(); ajustarInterfaceSave(); mudarAba('tab-diretoria');
        }

        function checarPromocaoRebaixamento() {
            let ligObj = ligaMap[db[currentSave].liga];
            if(ligObj) {
                if(!ligObj.isTop && ligObj.up && confirm(`Acesso para a divisão superior (${ligObj.up.split(' (')[0]})?`)) { db[currentSave].liga = ligObj.up; }
                else if(ligObj.down && confirm(`Rebaixado para a divisão inferior (${ligObj.down.split(' (')[0]})?`)) { db[currentSave].liga = ligObj.down; }
            }
        }

        function gerarEventoAleatorio() {
            const eventos = ["Polêmica no vestiário!", "Apoio da diretoria: +€5M no orçamento extra.", "Lesão nos treinos!"];
            let ev = eventos[gerarNumeroAleatorio(0, eventos.length - 1)];
            if(ev.includes("+€5M") && currentSave === 'clube') { db.clube.orcamento += 5; atualizarNotaDiretoria(0.2); }
            document.getElementById('evento-texto').innerText = ev; document.getElementById('modal-evento').style.display = 'flex'; 
        }

        function cadastrarJogadorBase() {
            if(currentSave !== 'clube') return;
            let nome = document.getElementById('cad-nome').value.trim(); if(!nome) return;
            db.clube.plantel.push({ nome: nome, posicao: document.getElementById('cad-pos').value, ovr: Number(document.getElementById('cad-ovr').value), status: 'Ativo', jogosAvaliacao: 0 });
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); document.getElementById('cad-nome').value = '';
        }

// --- NOVO GERADOR DINÂMICO DE NOTÍCIAS DE MERCADO ---
        function gerarNoticiaTransferencia(tipo, nome, valor, extra) {
    let titulos = []; let detalhes = [];
    
    if (tipo === 'Comprado') {
        titulos = [
            `🚨 HERE WE GO! ${nome} é o novo reforço do clube!`,
            `💥 BOMBA NO MERCADO! Diretoria abre os cofres por ${nome}.`,
            `✈️ AEROPORTO LOTADO! Torcida faz a festa com a chegada de ${nome}.`,
            `✍️ TINTA NO PAPEL! ${nome} assina contrato milionário.`
        ];
        detalhes = [
            `A diretoria não poupou esforços e desembolsou pesados €${valor}M. A expectativa é que o jogador chegue com status de titular absoluto e mude o patamar da equipe!`,
            `Após semanas de negociações exaustivas e muita fumaça na imprensa, o martelo foi batido por €${valor}M. O atleta já veste a camisa e manda recado para a torcida!`,
            `Uma cartada de mestre da nossa comissão! Por €${valor}M, garantimos um talento que era cobiçado por rivais diretos. O departamento médico já aprovou os exames.`
        ];
    } else if (tipo === 'EmprestadoIn') {
        titulos = [
            `🤝 REFORÇO CIRÚRGICO! ${nome} chega por empréstimo.`,
            `👀 OPORTUNIDADE DE MERCADO: ${nome} é anunciado!`,
            `📝 NOVO GUERREIRO: ${nome} assina acordo temporário.`
        ];
        detalhes = [
            `O atleta assinou um vínculo válido por ${extra} temporada(s). O treinador pediu e a diretoria entregou uma peça fundamental para a rotação do elenco sem comprometer o orçamento.`,
            `Buscando oxigenar o vestiário, o clube fechou o empréstimo por ${extra} temporada(s). Ele promete dar o sangue em campo para provar seu valor e quem sabe ficar em definitivo.`,
            `Um negócio bom e barato. O empréstimo de ${extra} temporada(s) blinda o time contra lesões e aumenta a competitividade interna nos treinamentos.`
        ];
    } else if (tipo === 'Venda') {
        titulos = [
            `💰 COFRES CHEIOS! Venda de ${nome} é concretizada.`,
            `👋 FIM DE UMA ERA! ${nome} se despede rumo a um novo desafio.`,
            `📉 REFORMULAÇÃO: Diretoria aceita proposta milionária por ${nome}.`
        ];
        detalhes = [
            `É oficial. A transferência injeta €${valor}M aos cofres do clube. A diretoria considerou a oferta "irrecusável" e agora busca repor a ausência no mercado.`,
            `O jogador esvaziou seu armário hoje cedo. Pela quantia de €${valor}M, o negócio foi bom para todas as partes. Ficam as boas memórias e o legado construído!`,
            `Os números falaram mais alto. A venda por €${valor}M alivia as finanças e dá fôlego para novas contratações. Boa sorte ao atleta no seu próximo clube!`
        ];
    } else if (tipo === 'Emprestimo') {
        titulos = [
            `✈️ PARA GANHAR MINUTOS: ${nome} é emprestado.`,
            `🔄 ROTAÇÃO: Sem espaço, ${nome} defenderá outra equipe.`,
            `🎒 DE MALAS PRONTAS: ${nome} sai por empréstimo.`
        ];
        detalhes = [
            `A decisão da comissão técnica foi clara: o jogador precisa jogar. O empréstimo de ${extra} temporada(s) servirá para ele ganhar ritmo, confiança e voltar mais forte.`,
            `Fora dos planos imediatos do esquema tático atual, o atleta passará ${extra} temporada(s) ganhando experiência fora. O clube continuará monitorando seu desenvolvimento de perto.`,
            `Uma pausa temporária na relação. Com o acordo de ${extra} temporada(s), a diretoria alivia a folha salarial e o atleta busca protagonismo em novos ares.`
        ];
    } else if (tipo === 'Dispensa') {
        titulos = [
            `📄 RESCISÃO OFICIAL: ${nome} está livre no mercado.`,
            `🚪 BARCA SAINDO: Fim da linha para ${nome} no clube.`,
            `✂️ CORTE NO ELENCO: Contrato de ${nome} é encerrado.`
        ];
        detalhes = [
            `Após uma reunião a portas fechadas, o vínculo foi rompido amigavelmente. O jogador não fazia mais parte do planejamento e agora está livre para assinar com qualquer equipe a custo zero.`,
            `A temida "barca" começou a passar. A diretoria optou por liberar o atleta, cortando gastos e abrindo espaço na folha salarial para uma reformulação pesada.`,
            `Não rendeu o esperado. O clube decidiu encerrar o contrato antecipadamente. Desejamos sorte ao profissional nos seus próximos passos, longe daqui.`
        ];
    } else if (tipo === 'Aposentadoria') {
        titulos = [
            `🥾 PENDUROU AS CHUTEIRAS! O adeus doloroso de ${nome}.`,
            `😢 FIM DA LINHA! Lenda ${nome} anuncia sua aposentadoria dos gramados.`,
            `👑 O FUTEBOL FICA MAIS TRISTE: ${nome} decide parar de jogar.`
        ];
        detalhes = [
            `Emocionado, o jogador comunicou ao vestiário que o corpo não aguenta mais. É o fim de uma trajetória linda no esporte. A diretoria planeja um jogo de despedida em breve!`,
            `Um dia que todo torcedor teme chegou. O atleta decidiu encerrar sua carreira profissional. Seu nome ficará para sempre marcado na história e nas arquibancadas. OBRIGADO, CRAQUE!`,
            `Fim de jogo. Após anos dedicando sua vida à bola, o desgaste falou mais alto. O clube deixou as portas abertas para ele integrar a comissão técnica no futuro.`
        ];
    }

    let tIdx = Math.floor(Math.random() * titulos.length);
    let dIdx = Math.floor(Math.random() * detalhes.length);
    return { titulo: titulos[tIdx], detalhe: detalhes[dIdx] };
}

        function toggleFormCompra() {
            let tipo = document.getElementById('add-tipo').value;
            document.getElementById('box-add-custo').style.display = tipo === 'Comprado' ? 'flex' : 'none';
            document.getElementById('box-add-duracao').style.display = tipo === 'EmprestadoIn' ? 'flex' : 'none';
        }

        function adicionarAoPlantel() {
            if(currentSave !== 'clube') return;
            let tipoTransicao = document.getElementById('add-tipo') ? document.getElementById('add-tipo').value : 'Comprado';
            let nomeNovo = document.getElementById('add-nome').value.trim();
            let custo = tipoTransicao === 'Comprado' ? (Number(document.getElementById('add-custo').value) || 0) : 0;
            let duracao = tipoTransicao === 'EmprestadoIn' ? Number(document.getElementById('add-duracao').value) : 0;
            
            if(!nomeNovo) return alert("Digite o nome do jogador!");
            if(tipoTransicao === 'Comprado' && db.clube.orcamento < custo) return alert("Orçamento insuficiente!");
            
            if(tipoTransicao === 'Comprado') {
                db.clube.orcamento -= custo; db.clube.gastoAtual += custo; atualizarNotaDiretoria(-0.1);
                // ADICIONE AQUI: Torcida animada com reforço
                atualizarTermometroTorcida(gerarNumeroAleatorio(2, 5));
            }
            
            let jogadorExistente = db.clube.plantel.find(p => p.nome.toLowerCase() === nomeNovo.toLowerCase());
            
            if (jogadorExistente) {
                jogadorExistente.status = 'Ativo';
                jogadorExistente.origem = tipoTransicao;
                jogadorExistente.ovr = Number(document.getElementById('add-ovr').value);
                jogadorExistente.posicao = document.getElementById('add-pos').value;
                jogadorExistente.valor = custo;
                if (tipoTransicao === 'EmprestadoIn') jogadorExistente.temporadasEmprestimo = duracao;
            } else {
                let novoJog = { 
                    nome: nomeNovo, posicao: document.getElementById('add-pos').value, 
                    ovr: Number(document.getElementById('add-ovr').value), status: 'Ativo', 
                    origem: tipoTransicao, valor: custo, jogosAvaliacao: 0 
                };
                if (tipoTransicao === 'EmprestadoIn') novoJog.temporadasEmprestimo = duracao;
                db.clube.plantel.push(novoJog);
            }
            
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); 
            alert(tipoTransicao === 'EmprestadoIn' ? "Jogador adicionado por empréstimo!" : "Contratação realizada!");
            checarEmbargoMercado();

            // Chama o gerador dinâmico de notícias
            let noticiaDin = gerarNoticiaTransferencia(tipoTransicao, nomeNovo, custo, duracao);
            adicionarNoticiaAutomatica(noticiaDin.titulo, noticiaDin.detalhe);
            
            document.getElementById('add-nome').value = '';
        }

        function editarValorTransferencia(nome) {
            let p = db.clube.plantel.find(j => j.nome === nome);
            if (!p) return;
            let novoValor = prompt(`Digite o valor correto (€M) da negociação de ${nome}:`, p.valor || 0);
            if (novoValor !== null && novoValor.trim() !== "") {
                p.valor = Number(novoValor);
                salvarDados();
                filtrarMercado(statusFiltroMercado);
            }
        }

        function excluirJogadorTransferencia(nome) {
            if (confirm(`⚠️ ALERTA: Tem certeza que deseja APAGAR COMPLETAMENTE o jogador ${nome} do save? Isso removerá o histórico dele.`)) {
                db.clube.plantel = db.clube.plantel.filter(p => p.nome !== nome);
                salvarDados();
                filtrarMercado(statusFiltroMercado);
                atualizarPlantelUI();
                preencherDatalistJogadores();
            }
        }

        function toggleFormSaida() {
            let tipo = document.getElementById('saida-tipo').value;
            document.getElementById('box-saida-valor').style.display = tipo === 'Venda' ? 'flex' : 'none';
            document.getElementById('box-saida-duracao').style.display = tipo === 'Emprestimo' ? 'flex' : 'none';
        }

        function processarSaida() {
            if(currentSave !== 'clube') return;
            let nome = document.getElementById('saida-nome-input').value.trim();
            let tipo = document.getElementById('saida-tipo').value;
            let jogador = db.clube.plantel.find(p => p.nome === nome && p.status === 'Ativo');
            if(!jogador) return alert("Jogador não encontrado ativo.");

            // NOVA TRAVA: Impede negociar quem está emprestado ao time
            if (jogador.origem === 'EmprestadoIn' && (tipo === 'Venda' || tipo === 'Emprestimo' || tipo === 'Dispensa')) {
                return alert("⚠️ Você não pode vender, emprestar ou dispensar um jogador que pertence a outro clube! Vá na aba 'Elenco' se quiser encerrar o empréstimo dele.");
            }

            if(tipo === 'Venda') {
                let valor = Number(document.getElementById('saida-valor').value);
                db.clube.arrecadadoAtual += valor;
                jogador.status = 'Vendido'; 
                jogador.valor = valor; 
                atualizarNotaDiretoria(0.1);
                db.clube.exigenciasDiretoria = db.clube.exigenciasDiretoria.filter(n => n !== nome);
                
                // ADICIONE AQUI: Torcida não gosta de perder jogador ativo
                atualizarTermometroTorcida(-gerarNumeroAleatorio(2, 6));
                
                let noticia = gerarNoticiaTransferencia('Venda', nome, valor, 0);
                adicionarNoticiaAutomatica(noticia.titulo, noticia.detalhe);
            } 
            else if(tipo === 'Emprestimo') { 
                jogador.status = 'Emprestado'; 
                jogador.temporadasEmprestimo = Number(document.getElementById('saida-duracao').value); 
                
                let noticia = gerarNoticiaTransferencia('Emprestimo', nome, 0, jogador.temporadasEmprestimo);
                adicionarNoticiaAutomatica(noticia.titulo, noticia.detalhe);
            } 
            else if(tipo === 'Dispensa') { 
                jogador.status = 'Aposentado'; 
                
                let noticia = gerarNoticiaTransferencia('Dispensa', nome, 0, 0);
                adicionarNoticiaAutomatica(noticia.titulo, noticia.detalhe);
            }

            document.getElementById('saida-nome-input').value = ''; document.getElementById('saida-valor').value = '0';
            salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); filtrarMercado(statusFiltroMercado);
            checarEmbargoMercado();
        }

        function checarEmbargoMercado() {
            if(currentSave !== 'clube') return;
            let btn = document.getElementById('btn-confirmar-compra');
            if(!btn) return;
            if(db.clube.notaDiretoria < 5.0 || db.clube.orcamento < -10.0) {
                btn.disabled = true;
                btn.innerText = "BLOQUEADO PELA DIRETORIA (Embargo)";
                btn.style.background = "var(--text-muted)";
            } else {
                btn.disabled = false;
                btn.innerText = "Confirmar Compra";
                btn.style.background = "var(--accent)";
            }
        }

        function alterarStatus(nome, status) {
    if (status === 'Excluir' && confirm(`Apagar ${nome}?`)) {
        db[currentSave].plantel = db[currentSave].plantel.filter(p => p.nome !== nome);
    } else {
        let jog = db[currentSave].plantel.find(p => p.nome === nome);
        if(jog) {
            if(status === 'Vendido' || status === 'Emprestado') {
                let v = prompt(`Valor recebido em €M?`, "0");
                db.clube.orcamento += Number(v) * 0.8; db.clube.arrecadadoAtual += Number(v);
                jog.status = status; 
            } else if (status === 'EncerrarEmprestimo') {
                if(confirm(`Deseja devolver ${nome} antecipadamente ao clube de origem?`)) {
                    jog.status = 'FimEmprestimo';
                    adicionarNoticiaAutomatica(`👋 FIM DE EMPRÉSTIMO: ${nome} devolvido.`, `O clube optou por encerrar o empréstimo antecipadamente e o atleta não faz mais parte do elenco.`);
                } else {
                    return; // Cancela a ação
                }
            } else if (status === 'ChamarDeVolta') {
                if(confirm(`Deseja solicitar o retorno imediato de ${nome} do seu empréstimo?`)) {
                    jog.status = 'Ativo';
                    jog.temporadasEmprestimo = 0;
                    adicionarNoticiaAutomatica(`✈️ DE VOLTA: ${nome} retorna ao clube.`, `O treinador solicitou a volta do jogador antes do fim do empréstimo para compor o elenco atual.`);
                } else {
                    return; // Cancela a ação
                }
            } else {
                jog.status = status;
                if (status === 'Aposentado') {
                    let noticia = gerarNoticiaTransferencia('Aposentadoria', nome, 0, 0);
                    adicionarNoticiaAutomatica(noticia.titulo, noticia.detalhe);
                }
            }
        }
    }
    salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); filtrarMercado(statusFiltroMercado);
}

        function abrirModalEditarJogador(nomeOriginal) {
            let jog = db[currentSave].plantel.find(p => p.nome === nomeOriginal);
            if(jog) {
                document.getElementById('edit-jog-nome-original').value = jog.nome; document.getElementById('edit-jog-nome').value = jog.nome;
                document.getElementById('edit-jog-pos').value = jog.posicao; document.getElementById('edit-jog-ovr').value = jog.ovr;
                document.getElementById('modal-editar-jogador').style.display = 'flex';
            }
        }

        function salvarEdicaoJogador() {
            let nomeOriginal = document.getElementById('edit-jog-nome-original').value;
            let novoNome = document.getElementById('edit-jog-nome').value.trim();
            if(!novoNome) return;
            let jog = db[currentSave].plantel.find(p => p.nome === nomeOriginal);
            if(jog) {
                if(nomeOriginal !== novoNome) {
                    db[currentSave].partidas.forEach(partida => { let jogPartida = partida.jogadores.find(j => j.nome === nomeOriginal); if(jogPartida) jogPartida.nome = novoNome; });
                }
                jog.nome = novoNome; jog.posicao = document.getElementById('edit-jog-pos').value; jog.ovr = Number(document.getElementById('edit-jog-ovr').value);
                salvarDados(); atualizarPlantelUI(); preencherDatalistJogadores(); document.getElementById('modal-editar-jogador').style.display = 'none';
            }
        }

        function ordenarPlantel(coluna) {
            if (ordemAtualPlantel.coluna === coluna) { ordemAtualPlantel.ascendente = !ordemAtualPlantel.ascendente; } 
            else { ordemAtualPlantel.coluna = coluna; ordemAtualPlantel.ascendente = coluna === 'nome' ? true : false; }
            atualizarPlantelUI();
        }

        function atualizarOrcamentoMercado() {
            let el = document.getElementById('info-orcamento');
            if(el) el.innerText = `€${db.clube.orcamento.toFixed(2)}M`;
            checarEmbargoMercado();
        }

        function atualizarPlantelUI() {
            if(currentSave !== 'clube') return;
            atualizarOrcamentoMercado();
            let tbody = document.querySelector('#tabela-plantel tbody'); tbody.innerHTML = '';
            
            let plantelSort = [...db.clube.plantel];
            plantelSort.sort((a, b) => {
                let valA = a[ordemAtualPlantel.coluna]; let valB = b[ordemAtualPlantel.coluna];
                if (ordemAtualPlantel.coluna === 'posicao') { valA = ordemPosicoes[a.posicao] || 6; valB = ordemPosicoes[b.posicao] || 6; }
                if (valA < valB) return ordemAtualPlantel.ascendente ? -1 : 1;
                if (valA > valB) return ordemAtualPlantel.ascendente ? 1 : -1;
                return 0;
            });

            plantelSort.filter(p => p.status === 'Ativo').forEach((p, idx) => {
                let isListado = db.clube.exigenciasDiretoria.includes(p.nome) ? `<span class="badge bg-vendido" style="margin-left:10px;">⚠️ Listado Pela Diretoria</span>` : '';
                
                // --- NOVAS BADGES DE LESÃO E CARTÃO VERMELHO ---
                let badgeCondicao = '';
                if (p.diasLesao && p.diasLesao > 0) {
                    badgeCondicao += ` <span class="badge" style="background: rgba(255, 107, 107, 0.2); color: var(--danger);">🏥 Lesionado (${p.diasLesao} dias)</span>`;
                }
                if (p.suspensoVermelho) {
                    badgeCondicao += ` <span class="badge" style="background: rgba(255, 184, 0, 0.2); color: var(--warning);">🟥 Suspenso</span>`;
                }

                let optionsSelect = `<option>Mover...</option>`;
                if (p.origem === 'EmprestadoIn') {
                    optionsSelect += `<option value="EncerrarEmprestimo">Encerrar Empréstimo</option>`;
                } else {
                    optionsSelect += `<option value="Aposentado">Aposentar</option>`;
                }
                optionsSelect += `<option value="Excluir">Excluir (Erro)</option>`;

                tbody.innerHTML += `
                <tr id="linha-jogador-${idx}">
                    <td>${p.posicao}</td><td><strong>${p.nome}</strong> ${isListado} ${badgeCondicao}</td>
                    <td style="${getOvrClass(p.ovr)} font-weight:bold; font-size:16px;">${p.ovr}</td>
                    <td style="display:flex; gap: 10px; align-items: center;">
                        <button class="btn-upload" style="margin:0; padding:6px 10px; font-weight:bold;" onclick="toggleRaioXPlantel('${p.nome}', ${idx})">📊 Raio-X</button>
                        <button class="btn-upload" style="margin:0; padding:6px 10px; font-weight:bold; border-color: var(--warning); color: var(--warning);" onclick="abrirModalEditarJogador('${p.nome}')">✏️ Editar</button>
                        <select onchange="alterarStatus('${p.nome}', this.value)" style="padding:6px; font-size:13px; width: 120px;">
                            ${optionsSelect}
                        </select>
                    </td>
                </tr>
                <tr id="raiox-row-${idx}" class="row-raiox" style="display:none;">
                    <td colspan="4">
                        <div class="raiox-container">
                            <div id="raiox-dados-plantel-${idx}" style="background: var(--panel-bg); padding: 15px; border-radius: 8px; border: 1px solid var(--border); font-size: 13px;"></div>
                            <div style="height: 350px;"><canvas id="canvas-raiox-plantel-${idx}"></canvas></div>
                        </div>
                    </td>
                </tr>`;
            });
            atualizarSelectCondicaoAuxiliar();
        }

        function toggleRaioXPlantel(nome, idx) {
            let row = document.getElementById(`raiox-row-${idx}`);
            if (row.style.display === 'none') { document.querySelectorAll('.row-raiox').forEach(el => el.style.display = 'none'); row.style.display = 'table-row'; renderizarDadosRaioX(nome, `canvas-raiox-plantel-${idx}`, `raiox-dados-plantel-${idx}`); } 
            else { row.style.display = 'none'; }
        }

        let ordemAtualMercado = { coluna: 'nome', ascendente: true };

   function ordenarTransferencias(coluna) {
       if (ordemAtualMercado.coluna === coluna) { 
           ordemAtualMercado.ascendente = !ordemAtualMercado.ascendente; 
       } else { 
           ordemAtualMercado.coluna = coluna; 
           ordemAtualMercado.ascendente = true; 
       }
       filtrarMercado(statusFiltroMercado);
   }

   function filtrarMercado(status, btn) {
       if(currentSave !== 'clube') return;
       statusFiltroMercado = status;
       if(btn) { document.querySelectorAll('#tab-mercado .btn-filtro').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
       
       let containerFiltros = document.getElementById('container-botoes-filtro-transf');
       if (containerFiltros) {
           containerFiltros.style.display = (status === 'Vendido' || status === 'Comprado') ? 'flex' : 'none';
       }

       let thead = document.querySelector('#tabela-mercado thead');
       let tbody = document.querySelector('#tabela-mercado tbody'); 
       tbody.innerHTML = '';
       
       let mostrarColunaValor = (status === 'Vendido' || status === 'Comprado');
       
       if (mostrarColunaValor) {
           thead.innerHTML = `<tr><th>Status</th><th>Posição</th><th>Nome</th><th>OVR</th><th>Valor (€M)</th><th>Ações / Raio-X</th></tr>`;
       } else {
           thead.innerHTML = `<tr><th>Status</th><th>Posição</th><th>Nome</th><th>OVR</th><th>Ações / Raio-X</th></tr>`;
       }
       
       let achou = false;
       let jogadoresFiltrados = db.clube.plantel.filter(p => {
           if (status === 'Comprado' || status === 'EmprestadoIn') return p.origem === status;
           return p.status === status;
       });

       jogadoresFiltrados.sort((a, b) => {
           let valA = a[ordemAtualMercado.coluna]; 
           let valB = b[ordemAtualMercado.coluna];
           if (ordemAtualMercado.coluna === 'posicao') { valA = ordemPosicoes[a.posicao] || 6; valB = ordemPosicoes[b.posicao] || 6; }
           if (ordemAtualMercado.coluna === 'valor') { valA = a.valor || 0; valB = b.valor || 0; }
           if (valA < valB) return ordemAtualMercado.ascendente ? -1 : 1;
           if (valA > valB) return ordemAtualMercado.ascendente ? 1 : -1;
           return 0;
       });

       jogadoresFiltrados.forEach((p, idx) => {
           achou = true;
           let extraInfo = status === 'Emprestado' ? `<br><span style="font-size:11px; color:var(--text-muted)">Retorna em: ${p.temporadasEmprestimo} temp.</span>` : '';
           let badgeClass = 'bg-aposentado'; 
           if (status === 'Vendido') badgeClass = 'bg-vendido';
           if (status === 'Emprestado') badgeClass = 'bg-emprestado';
           if (status === 'Comprado' || status === 'EmprestadoIn') badgeClass = 'bg-ativo';

           let nomeStatus = p.status;
           if (status === 'Comprado') nomeStatus = 'Comprado';
           if (status === 'EmprestadoIn') nomeStatus = 'Chegou Emp.';

           let tdValor = mostrarColunaValor ? `<td>€${(p.valor || 0).toFixed(1)}M</td>` : '';

            // NOVO: Botões extras para o mercado (Editar Valor e Excluir)
            let btnEdit = mostrarColunaValor ? `<button class="btn-upload" style="margin:0; padding:6px 10px; font-weight:bold; color:var(--warning); border-color:var(--warning);" onclick="editarValorTransferencia('${p.nome}')">✏️ Editar Valor</button>` : '';
            let btnExc = `<button class="btn-upload" style="margin:0; padding:6px 10px; font-weight:bold; color:var(--danger); border-color:var(--danger);" onclick="excluirJogadorTransferencia('${p.nome}')">🗑️ Excluir</button>`;
            
            // NOVO: Botão de Chamar de Volta para quem está Emprestado fora
            let btnChamarVolta = (status === 'Emprestado') ? `<button class="btn-upload" style="margin:0; padding:6px 10px; font-weight:bold; color:var(--primary); border-color:var(--primary);" onclick="alterarStatus('${p.nome}', 'ChamarDeVolta')">🔙 Chamar de Volta</button>` : '';

            tbody.innerHTML += `
            <tr>
                <td><span class="badge ${badgeClass}">${nomeStatus}</span>${extraInfo}</td>
                <td>${p.posicao}</td><td><strong>${p.nome}</strong></td>
                <td><strong style="${getOvrClass(p.ovr)} font-size:15px;">${p.ovr}</strong></td>
                ${tdValor}
                <td style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="btn-upload" style="margin:0; padding:6px 10px; font-weight:bold;" onclick="toggleRaioXMercado('${p.nome}', ${idx})">📊 Raio-X</button>
                    ${btnEdit}
                    ${btnChamarVolta}
                    ${btnExc}
                </td>
            </tr>
            <tr id="raiox-mercado-row-${idx}" class="row-raiox" style="display:none;">
                <td colspan="${mostrarColunaValor ? 6 : 5}">
                    <div class="raiox-container"><div id="raiox-dados-mercado-${idx}"></div><div style="height: 350px;"><canvas id="canvas-raiox-mercado-${idx}"></canvas></div></div>
                </td>
            </tr>`;
       });
       if(!achou) tbody.innerHTML = `<tr><td colspan="${mostrarColunaValor ? 6 : 5}" style="text-align:center; padding: 25px;">Nenhum jogador.</td></tr>`;
   }

        function toggleRaioXMercado(nome, idx) {
            let row = document.getElementById(`raiox-mercado-row-${idx}`);
            if (row.style.display === 'none') { document.querySelectorAll('.row-raiox').forEach(el => el.style.display = 'none'); row.style.display = 'table-row'; renderizarDadosRaioX(nome, `canvas-raiox-mercado-${idx}`, `raiox-dados-mercado-${idx}`); } 
            else { row.style.display = 'none'; }
        }

        function toggleSection(id) { let el = document.getElementById(id); el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
        function abrirModalTrocaLiga() { document.getElementById('nova-liga-select').innerHTML = document.getElementById('setup-liga').innerHTML; document.getElementById('nova-liga-select').value = db[currentSave].liga; document.getElementById('modal-troca-liga').style.display = 'flex'; }
        function confirmarTrocaLiga() { db[currentSave].liga = document.getElementById('nova-liga-select').value; salvarDados(); document.getElementById('modal-troca-liga').style.display = 'none'; atualizarUpgradesUI(); }

        function atualizarUpgradesUI() {
            let tbodyAcao = document.querySelector('#tabela-upgrades-acao tbody'); tbodyAcao.innerHTML = '';
            let tbodyProg = document.querySelector('#tabela-upgrades-progresso tbody'); tbodyProg.innerHTML = '';
            
            let ligaStr = db[currentSave].liga; document.getElementById('info-liga-atual').innerText = ligaStr;
            let ligaInfo = Number(ligaStr.match(/\d+/g)?.pop() || 70); 
            
            let aguardandoCount = 0, progressoCount = 0;
            db[currentSave].plantel.filter(p => p.status === 'Ativo').forEach(jogador => {
                let pJogadas = []; db[currentSave].partidas.forEach(p => { let at = p.jogadores.find(j => j.nome === jogador.nome); if(at) pJogadas.push(at); });
                let nAvaliados = pJogadas.length - (jogador.jogosAvaliacao || 0);
                
                if (nAvaliados >= 5) {
                    let ultimos = pJogadas.slice((jogador.jogosAvaliacao || 0), (jogador.jogosAvaliacao || 0) + 5);
                    let media = ultimos.reduce((a,c) => a + c.nota, 0) / 5;
                    let diff = jogador.ovr - ligaInfo;
                    let tier = ''; let upLimit = 0, downLimit = 0;
                    
                    // --- NOVA LÓGICA: OVR MERECIDO ---
                    // Calcula um OVR hipotético: Cada 0.1 acima de 6.5 de nota equivale a +1 no OVR merecido (ajuste como preferir)
                    let variacaoOVR = (media - 6.5) * 8; 
                    let ovrMerecido = Math.round(jogador.ovr + variacaoOVR);
                    if(ovrMerecido > 99) ovrMerecido = 99; // Teto
                    if(ovrMerecido < 40) ovrMerecido = 40; // Piso
                    
                    let badgeMerecido = media >= 6.5 
                        ? `<span style="font-size:11px; color:var(--primary); font-weight:bold;">Merecido: ${ovrMerecido} 📈</span>` 
                        : `<span style="font-size:11px; color:var(--danger); font-weight:bold;">Merecido: ${ovrMerecido} 📉</span>`;
                    // ---------------------------------
                    
                    if (diff >= 6) { tier = 'Highest'; upLimit = 7.5; downLimit = 6.4; }
                    else if (diff >= 1) { tier = 'High'; upLimit = 7.0; downLimit = 6.1; }
                    else if (diff >= -4) { tier = 'Average'; upLimit = 6.7; downLimit = 5.8; }
                    else if (diff >= -9) { tier = 'Low'; upLimit = 6.4; downLimit = 5.5; }
                    else { tier = 'Lowest'; upLimit = 6.1; downLimit = 5.0; }

                    if(media >= upLimit) { 
                        let btn = `<button style="padding:6px 10px; font-size:12px;" onclick="aplicarUp('${jogador.nome}', 1)">+1 OVR</button>`; 
                        tbodyAcao.innerHTML += `<tr><td>${jogador.posicao}</td><td><strong>${jogador.nome}</strong></td><td>${tier}</td><td><strong>${media.toFixed(2)}</strong></td><td><strong style="${getOvrClass(jogador.ovr)}">${jogador.ovr}</strong><br>${badgeMerecido}</td><td><div style="display:flex; gap:10px;">${btn}</div></td></tr>`;
                        aguardandoCount++;
                    }
                    else if(media <= downLimit) { 
                        let btn = `<button style="background:var(--danger);color:white; padding:6px 10px; font-size:12px;" onclick="aplicarUp('${jogador.nome}', -1)">-1 OVR</button>`; 
                        tbodyAcao.innerHTML += `<tr><td>${jogador.posicao}</td><td><strong>${jogador.nome}</strong></td><td>${tier}</td><td><strong>${media.toFixed(2)}</strong></td><td><strong style="${getOvrClass(jogador.ovr)}">${jogador.ovr}</strong><br>${badgeMerecido}</td><td><div style="display:flex; gap:10px;">${btn}</div></td></tr>`;
                        aguardandoCount++;
                    }
                    else if(media <= downLimit) { 
                        let btn = `<button style="background:var(--danger);color:white; padding:6px 10px; font-size:12px;" onclick="aplicarUp('${jogador.nome}', -1)">-1 OVR</button>`; 
                        tbodyAcao.innerHTML += `<tr><td>${jogador.posicao}</td><td><strong>${jogador.nome}</strong></td><td>${tier}</td><td><strong>${media.toFixed(2)}</strong></td><td><strong style="${getOvrClass(jogador.ovr)}">${jogador.ovr}</strong></td><td><div style="display:flex; gap:10px;">${btn}</div></td></tr>`;
                        aguardandoCount++;
                    }
                    else { 
                        jogador.jogosAvaliacao = (jogador.jogosAvaliacao || 0) + 5; salvarDados();
                        tbodyProg.innerHTML += `<tr><td>${jogador.posicao}</td><td><strong>${jogador.nome}</strong></td><td style="color:var(--primary); font-weight:bold;">${tier}: Mantido ✅</td><td><strong style="${getOvrClass(jogador.ovr)}">${jogador.ovr}</strong></td></tr>`;
                        progressoCount++;
                    }
                } else {
                    tbodyProg.innerHTML += `<tr><td>${jogador.posicao}</td><td>${jogador.nome}</td><td style="color:var(--text-muted)">${nAvaliados} / 5 jg</td><td><strong style="${getOvrClass(jogador.ovr)}">${jogador.ovr}</strong></td></tr>`;
                    progressoCount++;
                }
            });
            if(aguardandoCount === 0) tbodyAcao.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:25px;">Nenhum jogador aguardando.</td></tr>`;
            if(progressoCount === 0) tbodyProg.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:25px;">Nenhum jogador em progresso.</td></tr>`;
        }

        function aplicarUp(nome, val) {
            let j = db[currentSave].plantel.find(p => p.nome === nome);
            if(j) {
                j.ovr += val; j.jogosAvaliacao = (j.jogosAvaliacao || 0) + 5;
                salvarDados(); atualizarUpgradesUI(); atualizarPlantelUI();
            }
        }

        Chart.defaults.color = '#94a3b8'; Chart.defaults.borderColor = '#334155';
        function limparGraficos() { ['efetividade', 'eficiencia', 'artilheiros', 'assistentes', 'criacao', 'defesa', 'radarSetor', 'finalizacoes', 'dribles'].forEach(k => { if(charts[k]) { charts[k].destroy(); charts[k] = null; } }); }

        function mudarGrafico() {
            document.querySelectorAll('.chart-container').forEach(el => el.classList.remove('active'));
            document.getElementById(document.getElementById('seletor-grafico').value).classList.add('active');
            if(document.getElementById('seletor-grafico').value === 'view-raiox') acionarRaioXDashboard();
        }

        function renderizarCalendarioPartidas(pFiltradas) {
    let div = document.getElementById('lista-calendario');
    if(!pFiltradas || pFiltradas.length === 0) { div.innerHTML = '<p style="text-align:center;">Nenhuma partida.</p>'; return; }

    let partidasSort = [...pFiltradas].sort((a,b) => b.id - a.id);
    div.innerHTML = partidasSort.map((p, idx) => {
        let vitoria = p.golsPro > p.golsContra || (p.golsPro === p.golsContra && p.penaltis);
        let empate = p.golsPro === p.golsContra && !p.penaltis;
        let txtColor = vitoria ? 'var(--primary)' : (empate ? 'var(--warning)' : 'var(--danger)');
        
        let tabelaJogadores = `
        <div style="overflow-x:auto;">
            <table style="width:100%; font-size:12px; margin-top:15px; background: rgba(0,0,0,0.2); border-radius:8px;">
                <thead><tr><th>Jogador</th><th>Nota</th><th>Gols</th><th>Ast</th><th>Fin</th><th>Passes</th><th>Posse G.</th><th>Defesas</th></tr></thead>
                <tbody>
                    ${p.jogadores.map(j => `<tr>
                        <td><strong>${j.nome}</strong> ${j.mvp ? '⭐' : ''}</td>
                        <td style="color:var(--warning); font-weight:bold;">${j.nota.toFixed(1)}</td>
                        <td>${j.gols}</td><td>${j.assist}</td><td>${j.fin}</td><td>${j.passes}</td><td>${j.posses}</td><td>${j.defesas}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;

        return `
        <div class="match-card" style="border-left: 5px solid ${txtColor};">
            <div style="padding: 20px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03);">
                <div style="display: flex; align-items: center; gap: 15px; cursor: pointer; flex: 1;" onclick="toggleMatchDetails(${idx})">
                    <span style="font-size: 24px;">${vitoria ? '✅' : (empate ? '➖' : '❌')}</span>
                    <div>
                        <strong style="font-size: 18px; color: white;">vs ${p.adversario}</strong>
                        <div style="font-size: 13px; color: var(--text-muted); margin-top: 5px;">${p.comp} | Clique para ver detalhes</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="font-size: 24px; font-weight: bold; color: ${txtColor}; cursor: pointer;" onclick="toggleMatchDetails(${idx})">${p.golsPro} x ${p.golsContra}</div>
                    <button onclick="excluirPartida(${p.id})" style="background: var(--danger); color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer;" title="Excluir Partida">🗑️</button>
                </div>
            </div>
            <div id="match-details-${idx}" style="display: none; padding: 25px; background: var(--panel-bg); border-top: 1px solid var(--border);">
                <div class="grid-2" style="margin-bottom: 10px;">
                    <div class="stat-card"><span>Posse de Bola</span><strong>Nós ${p.possePro}% x ${p.posseAdv}% Adv</strong></div>
                    <div class="stat-card"><span>Finalizações Totais</span><strong>Nós ${p.finPro} x ${p.finAdv} Adv</strong></div>
                </div>
                <h4 style="margin:20px 0 5px 0; color:var(--accent);">Estatísticas Individuais</h4>
                ${tabelaJogadores}
            </div>
        </div>`;
    }).join('');
}

        function excluirPartida(idPartida) {
            if (confirm("Tem certeza que deseja excluir esta partida do histórico?")) {
                db[currentSave].partidas = db[currentSave].partidas.filter(p => p.id !== idPartida);
                salvarDados();
                desenharGraficos();
            }
        }

        // Função Auxiliar para Processar Dados dos Jogadores nos Gráficos de Barras
        function getPlayerAggregates(pFiltradas, statKey) {
            let map = {};
            pFiltradas.forEach(p => {
                p.jogadores.forEach(j => {
                    map[j.nome] = (map[j.nome] || 0) + (j[statKey] || 0);
                });
            });
            return map;
        }

        function toggleMatchDetails(idx) {
    let el = document.getElementById('match-details-' + idx);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function getAdvancedPlayerAggregates(pFiltradas) {
    let map = {};
    pFiltradas.forEach(p => {
        p.jogadores.forEach(j => {
            if (!map[j.nome]) {
                map[j.nome] = {
                    jogos: 0, passes: 0, sumPrecPasse: 0, fin: 0, sumPrecFin: 0,
                    dribles: 0, sumTaxaDrible: 0, posses: 0, defesas: 0, gols: 0, assist: 0
                };
            }
            map[j.nome].jogos += 1;
            map[j.nome].passes += (j.passes || 0);
            map[j.nome].sumPrecPasse += (j.precPasse || 0);
            map[j.nome].fin += (j.fin || 0);
            map[j.nome].sumPrecFin += (j.precFin || 0);
            map[j.nome].dribles += (j.dribles || 0);
            map[j.nome].sumTaxaDrible += (j.taxaDribles || 0);
            map[j.nome].posses += (j.posses || 0);
            map[j.nome].defesas += (j.defesas || 0);
            map[j.nome].gols += (j.gols || 0);
            map[j.nome].assist += (j.assist || 0);
        });
    });
    return map;
}

function processMultiChartData(advancedMap, mainSortKey) {
    let limit = parseInt(document.getElementById('filtro-top-jogadores').value);
    let order = document.getElementById('filtro-ordem-grafico').value;

    let arr = Object.keys(advancedMap).map(nome => {
        let d = advancedMap[nome];
        
        // Calculando as médias básicas brutas
        let avgPasses = d.jogos > 0 ? (d.passes / d.jogos) : 0;
        let avgPrecPasse = d.jogos > 0 ? (d.sumPrecPasse / d.jogos) : 0;
        
        let avgFin = d.jogos > 0 ? (d.fin / d.jogos) : 0;
        let avgPrecFin = d.jogos > 0 ? (d.sumPrecFin / d.jogos) : 0;
        
        let avgDribles = d.jogos > 0 ? (d.dribles / d.jogos) : 0;
        let avgTaxaDrible = d.jogos > 0 ? (d.sumTaxaDrible / d.jogos) : 0;

        let avgPosses = d.jogos > 0 ? (d.posses / d.jogos) : 0;
        let avgDefesas = d.jogos > 0 ? (d.defesas / d.jogos) : 0;

        return {
            nome: nome,
            jogos: d.jogos,
            gols: d.gols,
            assist: d.assist,
            
            // Totais mantidos (Volume Bruto)
            passes: d.passes,
            fin: d.fin,
            dribles: d.dribles,
            posses: d.posses,
            defesas: d.defesas,
            
            // Percentuais mantidos (Exibição nas labels)
            precPasse: avgPrecPasse.toFixed(1),
            precFin: avgPrecFin.toFixed(1),
            taxaDrible: avgTaxaDrible.toFixed(1),

            // Novos valores "Por Jogo" aplicando a matemática do Raio-X: Média * (Taxa / 100)
            passesPorJogo: d.jogos > 0 ? (avgPasses * (avgPrecPasse / 100)).toFixed(1) : 0,
            finPorJogo: d.jogos > 0 ? (avgFin * (avgPrecFin / 100)).toFixed(1) : 0,
            driblesPorJogo: d.jogos > 0 ? (avgDribles * (avgTaxaDrible / 100)).toFixed(1) : 0,
            
            // Posses e defesas no Raio-X usam a média pura
            possesPorJogo: avgPosses.toFixed(1),
            defesasPorJogo: avgDefesas.toFixed(1)
        };
    });

    arr = arr.filter(x => parseFloat(x[mainSortKey]) > 0);
    arr.sort((a, b) => order === 'desc' ? parseFloat(b[mainSortKey]) - parseFloat(a[mainSortKey]) : parseFloat(a[mainSortKey]) - parseFloat(b[mainSortKey]));
    return arr.slice(0, limit);
}
// Função para reordenar o gráfico ao clicar na legenda
const sortableLegendClick = function(e, legendItem, legend) {
    const index = legendItem.datasetIndex;
    const ci = legend.chart;

    // Esconde ou mostra o item clicado
    if (ci.isDatasetVisible(index)) { ci.hide(index); legendItem.hidden = true; }
    else { ci.show(index); legendItem.hidden = false; }

    // Descobre quais barras estão visíveis na tela
    let visibleIndices = [];
    ci.data.datasets.forEach((ds, i) => { if (ci.isDatasetVisible(i)) visibleIndices.push(i); });
    
    // Se sobrar apenas UMA métrica visível, ordena por ela. Se tiver mais, volta a ordenar pela primeria (Total)
    let sortIndex = (visibleIndices.length === 1) ? visibleIndices[0] : 0;

    let combined = ci.data.labels.map((label, i) => {
        let obj = { label: label, sortVal: parseFloat(ci.data.datasets[sortIndex].data[i]) || 0 };
        ci.data.datasets.forEach((ds, dsIndex) => { obj['val' + dsIndex] = ds.data[i]; });
        return obj;
    });

    // Lê se você quer Maiores (desc) ou Menores (asc) lá do filtro do topo
    let order = document.getElementById('filtro-ordem-grafico').value;
    combined.sort((a, b) => order === 'desc' ? b.sortVal - a.sortVal : a.sortVal - b.sortVal);

    // Aplica a nova ordem ao gráfico
    ci.data.labels = combined.map(c => c.label);
    ci.data.datasets.forEach((ds, dsIndex) => { ds.data = combined.map(c => c['val' + dsIndex]); });
    ci.update();
};
        function desenharGraficos() {
    limparGraficos(); 
    let temporadaFiltro = document.getElementById('filtro-temporada').value;
    let pFiltradas = temporadaFiltro === 'Total' ? db[currentSave].partidas : db[currentSave].partidas.filter(p => p.temporada === temporadaFiltro);
    atualizarKPIsEForma(pFiltradas);
    renderizarCalendarioPartidas(pFiltradas);

    if(currentSave === 'selecao') {
        let datalistRaiox = document.getElementById('datalist-raiox');
        datalistRaiox.innerHTML = '';
        db.selecao.plantel.forEach(j => { datalistRaiox.innerHTML += `<option value="${j.nome}">${j.posicao}</option>`; });
    }

    if(pFiltradas.length === 0) return; 

    let labelsPartidas = pFiltradas.map((p, i) => `J${i+1} (${p.adversario})`);
    let advData = getAdvancedPlayerAggregates(pFiltradas); // Calcula os novos dados avançados

    // 1. Efetividade (Linha)
    let ctxEfet = document.getElementById('graficoEfetividade');
    if(ctxEfet) {
        let dataEfet = pFiltradas.map(p => p.finPro > 0 ? ((p.golsPro / p.finPro) * 100).toFixed(1) : 0);
        charts.efetividade = new Chart(ctxEfet, {
            type: 'line',
            data: { labels: labelsPartidas, datasets: [{ label: 'Conversão em Gol (%)', data: dataEfet, borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.1)', fill: true, tension: 0.3 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Eficiência Tática -> Domínio (Linha Única)
    let ctxEfic = document.getElementById('graficoEficiencia');
    if(ctxEfic) {
        // Cálculo de Domínio = (Posse * Finalizações) / 10
        let dataDominio = pFiltradas.map(p => ((p.possePro * p.finPro) / 10).toFixed(1));
        charts.eficiencia = new Chart(ctxEfic, {
            type: 'line',
            data: { 
                labels: labelsPartidas, 
                datasets: [
                    { label: 'Domínio Score', data: dataDominio, borderColor: '#00a3ff', backgroundColor: 'rgba(0,163,255,0.1)', fill: true, tension: 0.3 }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    // 3. Artilheiros
    let ctxArt = document.getElementById('graficoArtilheiros');
    if(ctxArt) {
        let cData = processMultiChartData(advData, 'gols');
        charts.artilheiros = new Chart(ctxArt, {
            type: 'bar',
            data: { labels: cData.map(d=>d.nome), datasets: [{ label: 'Gols Marcados', data: cData.map(d=>d.gols), backgroundColor: '#ffd700' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 4. Assistentes
    let ctxAst = document.getElementById('graficoAssistentes');
    if(ctxAst) {
        let cData = processMultiChartData(advData, 'assist');
        charts.assistentes = new Chart(ctxAst, {
            type: 'bar',
            data: { labels: cData.map(d=>d.nome), datasets: [{ label: 'Assistências', data: cData.map(d=>d.assist), backgroundColor: '#00ff88' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 5. Desgaste físico / notas
    let ctxCri = document.getElementById('graficoCriacao');
    if(ctxCri) {
        let notasMedias = pFiltradas.map(p => {
            if(p.jogadores.length === 0) return 0;
            let soma = p.jogadores.reduce((acc, j) => acc + j.nota, 0);
            return (soma / p.jogadores.length).toFixed(2);
        });
        charts.criacao = new Chart(ctxCri, {
            type: 'line',
            data: { labels: labelsPartidas, datasets: [{ label: 'Média de Notas do Time', data: notasMedias, borderColor: '#ffb800', tension: 0.2 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 6. Defesa (Múltiplos Dados com Ordenação Clicável)
    let ctxDef = document.getElementById('graficoDefesa');
    if(ctxDef) {
        let cData = processMultiChartData(advData, 'posses');
        charts.defesa = new Chart(ctxDef, {
            type: 'bar',
            data: { 
                labels: cData.map(d=>d.nome), 
                datasets: [
                    { label: 'Posses Ganhas (Total)', data: cData.map(d=>d.posses), backgroundColor: '#00a3ff' },
                    { label: 'Posses Ganhas / Jogo', data: cData.map(d=>d.possesPorJogo), backgroundColor: 'rgba(0,163,255,0.4)' },
                    { label: 'Defesas Goleiro (Total)', data: cData.map(d=>d.defesas), backgroundColor: '#ff6b6b' },
                    { label: 'Defesas Goleiro / Jogo', data: cData.map(d=>d.defesasPorJogo), backgroundColor: 'rgba(255,107,107,0.4)' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { onClick: sortableLegendClick } } }
        });
    }

    // 7. Central de Criação (Passes - Tudo em Barra e Ordenável)
    let ctxRad = document.getElementById('graficoRadarSetor');
    if(ctxRad) {
        let cData = processMultiChartData(advData, 'passes');
        charts.radarSetor = new Chart(ctxRad, {
            type: 'bar',
            data: { 
                labels: cData.map(d=>d.nome), 
                datasets: [
                    { label: 'Passes Certos (Total)', data: cData.map(d=>d.passes), backgroundColor: '#00ff88' },
                    { label: 'Passes Certos / Jogo', data: cData.map(d=>d.passesPorJogo), backgroundColor: 'rgba(0,255,136,0.4)' },
                    { label: 'Precisão Passes %', data: cData.map(d=>d.precPasse), backgroundColor: '#ffb800' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { onClick: sortableLegendClick } } }
        });
    }

    // 8. Finalizações (Tudo em Barra e Ordenável)
    let ctxFin = document.getElementById('graficoFinalizacoes');
    if(ctxFin) {
        let cData = processMultiChartData(advData, 'fin');
        charts.finalizacoes = new Chart(ctxFin, {
            type: 'bar',
            data: { 
                labels: cData.map(d=>d.nome), 
                datasets: [
                    { label: 'Finalizações (Total)', data: cData.map(d=>d.fin), backgroundColor: '#ffb800' },
                    { label: 'Finalizações / Jogo', data: cData.map(d=>d.finPorJogo), backgroundColor: 'rgba(255,184,0,0.4)' },
                    { label: 'Precisão Finalização %', data: cData.map(d=>d.precFin), backgroundColor: '#00ff88' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { onClick: sortableLegendClick } } }
        });
    }

    // 9. Dribles (Tudo em Barra e Ordenável)
    let ctxDrib = document.getElementById('graficoDribles');
    if(ctxDrib) {
        let cData = processMultiChartData(advData, 'dribles');
        charts.dribles = new Chart(ctxDrib, {
            type: 'bar',
            data: { 
                labels: cData.map(d=>d.nome), 
                datasets: [
                    { label: 'Dribles Certos (Total)', data: cData.map(d=>d.dribles), backgroundColor: '#a855f7' },
                    { label: 'Dribles Certos / Jogo', data: cData.map(d=>d.driblesPorJogo), backgroundColor: 'rgba(168,85,247,0.4)' },
                    { label: 'Acerto Dribles %', data: cData.map(d=>d.taxaDrible), backgroundColor: '#00a3ff' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { onClick: sortableLegendClick } } }
        });
    }

    if(document.getElementById('seletor-grafico').value === 'view-raiox') acionarRaioXDashboard();
}

        function acionarRaioXDashboard() {
            let nome = document.getElementById('select-raio-x-input').value;
            renderizarDadosRaioX(nome, 'graficoRaioXRadarDash', 'raiox-dados-dash');
        }

        function renderizarDadosRaioX(nome, canvasId, dadosDivId) {
            let canvas = document.getElementById(canvasId); let divDados = document.getElementById(dadosDivId);
            let chartInstance = Chart.getChart(canvas); if(chartInstance) chartInstance.destroy();

            if(!nome) { divDados.innerHTML = '<p>Selecione um jogador</p>'; return; }

            let pFiltradas = document.getElementById('filtro-temporada').value === 'Total' ? db[currentSave].partidas : db[currentSave].partidas.filter(p => p.temporada === document.getElementById('filtro-temporada').value);
            let totalPartidas = 0; 
            let sums = { gols:0, assist:0, fin:0, precFin:0, passes:0, precPasse:0, dribles:0, taxaDribles:0, divGanhas:0, posses:0, defesas:0, nota:0 };
            
            // Variável para armazenar as notas e calcular a média dos últimos 5 jogos
            let notasHistorico = []; 

            pFiltradas.forEach(p => {
                let atuacao = p.jogadores.find(j => j.nome === nome);
                if(atuacao) {
                    totalPartidas++;
                    sums.gols += atuacao.gols || 0; sums.assist += atuacao.assist || 0; sums.fin += atuacao.fin || 0; sums.precFin += atuacao.precFin || 0;
                    sums.passes += atuacao.passes || 0; sums.precPasse += atuacao.precPasse || 0; sums.dribles += atuacao.dribles || 0; sums.taxaDribles += atuacao.taxaDribles || 0;
                    sums.divGanhas += atuacao.dividasGanhas || 0; sums.posses += atuacao.posses || 0; sums.defesas += atuacao.defesas || 0; sums.nota += atuacao.nota || 0;
                    notasHistorico.push(atuacao.nota || 0);
                }
            });

            if(totalPartidas === 0) { divDados.innerHTML = '<p>Sem dados do jogador na temporada.</p>'; return; }
            let avg = {}; for(let k in sums) avg[k] = sums[k] / totalPartidas;

            let jogPlantel = db[currentSave].plantel.find(p => p.nome === nome);
            let oOvr = jogPlantel ? jogPlantel.ovr : 70; let oPos = jogPlantel ? jogPlantel.posicao : 'Meio-Campo';

            // Cálculo da média dos últimos 5 jogos
            let ultimas5 = notasHistorico.slice(-5);
            let media5 = ultimas5.length > 0 ? (ultimas5.reduce((a,b)=>a+b,0) / ultimas5.length).toFixed(2) : "0.00";

            // Painel de Texto de Estatísticas 
            divDados.innerHTML = `
                <h4 style="margin:0 0 15px 0; color:var(--primary); font-size:18px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                    ${nome} 
                    <span style="font-size:13px; color:var(--text-muted); float:right; margin-top:3px;">OVR: ${oOvr} | ${oPos}</span>
                </h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 12px; font-size: 14px;">
                    <div><span style="color:var(--text-muted)">Jogos:</span> <strong style="color:white">${totalPartidas}</strong></div>
                    <div><span style="color:var(--text-muted)">Gols:</span> <strong style="color:white">${sums.gols}</strong></div>
                    <div><span style="color:var(--text-muted)">Assistências:</span> <strong style="color:white">${sums.assist}</strong></div>
                    <div><span style="color:var(--text-muted)">Média Temp:</span> <strong style="color:var(--warning)">${avg.nota.toFixed(2)}</strong></div>
                    <div style="grid-column: span 2;"><span style="color:var(--text-muted)">Média (Últ. 5):</span> <strong style="color:var(--accent)">${media5}</strong></div>
                </div>`;

            // Cálculo para o Gráfico de Teia (Com PESOS para equilibrar o visual)
            let pesoPasses = 2.28;   // Mantém base 2.28
            let pesoPosses = 8;     // Multiplica posses por 8 
            let pesoFin = 32;       // Multiplica finalizações por 32 
            let pesoDribles = 2.31;  // Multiplica dribles por 2.31
            let pesoDefesas = 4.2;    // Multiplica defesas do goleiro por 4.2

            // 1. Calculamos os valores REAIS (sem peso) primeiro
            let realPasses = (avg.passes * (avg.precPasse / 100)).toFixed(1);
            let realPosses = avg.posses.toFixed(1);
            let realDefesas = avg.defesas.toFixed(1);
            let realFin = (avg.fin * (avg.precFin / 100)).toFixed(1);
            let realDribles = (avg.dribles * (avg.taxaDribles / 100)).toFixed(1);

            // 2. Calculamos os valores MULTIPLICADOS para o visual da linha do gráfico
            let passesCertosJogo = (realPasses * pesoPasses).toFixed(1);
            let possesGanhaJogo = (realPosses * pesoPosses).toFixed(1);
            
            let radarLabels = [];
            let radarData = [];
            let radarRealData = []; // Criamos essa nova lista para guardar os valores reais

            // Separação entre Goleiro e Linha
            if (oPos === 'Goleiro') {
                let defesasJogo = (realDefesas * pesoDefesas).toFixed(1);
                
                // Removidos os textos (x1), (x7), etc.
                radarLabels = ['Passes', 'Posses Ganhas', 'Defesas GL'];
                radarData = [passesCertosJogo, possesGanhaJogo, defesasJogo];
                radarRealData = [realPasses, realPosses, realDefesas]; // Salvamos os reais aqui
            } else {
                let finCertasJogo = (realFin * pesoFin).toFixed(1);
                let driblesCertosJogo = (realDribles * pesoDribles).toFixed(1);
                
                // Removidos os textos (x15), (x7), etc.
                radarLabels = ['Fin. Certas', 'Passes', 'Posses Ganhas', 'Dribles'];
                radarData = [finCertasJogo, passesCertosJogo, possesGanhaJogo, driblesCertosJogo];
                radarRealData = [realFin, realPasses, realPosses, realDribles]; // Salvamos os reais aqui
            }

            // Renderiza o novo Gráfico de Teia
            new Chart(canvas, {
                type: 'radar',
                data: {
                    labels: radarLabels,
                    datasets: [{ 
                        label: 'Ações Bem Sucedidas (Média/Jogo)', 
                        data: radarData, 
                        realData: radarRealData, // Injetamos a lista de dados reais aqui (o gráfico não desenha isso, mas guarda)
                        backgroundColor: 'rgba(0, 163, 255, 0.2)', 
                        borderColor: '#00a3ff', 
                        pointBackgroundColor: '#00a3ff' 
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                // Esta função intercepta a caixa preta do mouse e troca o texto
                                label: function(context) {
                                    // Pega o valor real correspondente a este ponto em vez do multiplicado
                                    let valorReal = context.dataset.realData[context.dataIndex];
                                    return ' ' + context.label + ': ' + valorReal;
                                }
                            }
                        }
                    },
                    scales: { 
                        r: { 
                            pointLabels: { color: '#f1f5f9', font: { size: 12, weight: 'bold' } }, 
                            ticks: { display: false, min: 0 } 
                        } 
                    } 
                }
            });
        }

        function atualizarFiltroTemporadas() {
            let sel = document.getElementById('filtro-temporada'); 
            sel.innerHTML = '<option value="Total">Histórico Completo (Total)</option>';
            let setT = new Set(); db[currentSave].partidas.forEach(p => setT.add(p.temporada)); setT.add(db[currentSave].temporadaAtual);
            Array.from(setT).forEach(t => sel.innerHTML += `<option value="${t}" ${t === db[currentSave].temporadaAtual ? 'selected' : ''}>Temporada ${t}</option>`);

            let selHist = document.getElementById('seletor-hist-temporada');
            selHist.innerHTML = '<option value="">Selecione uma temporada...</option>';
            db[currentSave].historicoTemporadas.forEach(h => { selHist.innerHTML += `<option value="${h.temporada}">Temporada ${h.temporada}</option>`; });
        }

        function renderizarHistorico() {
            let galeria = document.getElementById('lista-trofeus-geral'); galeria.innerHTML = ''; let temTrofeu = false;
            db[currentSave].historicoTemporadas.forEach(h => {
                if(h.trofeus && h.trofeus.length > 0) {
                    h.trofeus.forEach(t => {
                        temTrofeu = true;
                        galeria.innerHTML += `<div class="trofeu-item"><div class="trofeu-icon">🏆</div><div style="font-weight:bold; color:var(--primary); font-size: 16px;">${t}</div><div style="font-size:13px; color:var(--text-muted); margin-top:8px;">${h.temporada}</div></div>`;
                    });
                }
            });
            if(!temTrofeu) galeria.innerHTML = '<p style="color:var(--text-muted); width:100%; margin:0;">Nenhum troféu conquistado na galeria ainda.</p>';
        }

        function mostrarDetalhesTemporada(tempStr) {
            let div = document.getElementById('detalhes-temporada-selecionada');
            if(!tempStr) return;
            let hist = db[currentSave].historicoTemporadas.find(h => h.temporada === tempStr);
            if(!hist) return;
            
            let htmlDet = `<h3 style="margin-top:0; font-size: 22px;">Resumo da Temporada ${hist.temporada}</h3><ul style="font-size: 15px; line-height:1.6;">`;
            if(hist.detalhes && hist.detalhes.length > 0) {
                hist.detalhes.forEach(d => { htmlDet += `<li><strong>${d.competicao}:</strong> <span style="color: var(--primary);">${d.fase_final}</span></li>`; });
            }
            htmlDet += `</ul>`; div.innerHTML = htmlDet;
        }

        function adicionarNoticiaAutomatica(texto, detalhe = "Detalhes internos.") {
            let feed = db[currentSave].noticiasFeed || [];
            feed.unshift({ texto: texto, detalhe: detalhe });
            if(feed.length > 30) feed.pop();
            db[currentSave].noticiasFeed = feed; salvarDados();
        }

        function toggleDetalheNoticia(index) {
            let el = document.getElementById(`noticia-detalhe-${index}`); let seta = document.getElementById(`noticia-seta-${index}`);
            if (el.style.display === 'none') { el.style.display = 'block'; seta.innerText = '▲ Ocultar Leitura'; } 
            else { el.style.display = 'none'; seta.innerText = '▼ Ler Mais'; }
        }

        function renderizarNoticiasFeed() {
            let log = document.getElementById('chat-log-noticias');
            let feed = db[currentSave].noticiasFeed || [];
            if(feed.length === 0) { log.innerHTML = '<p>Nenhuma notícia registrada.</p>'; return; }
            log.innerHTML = feed.map((n, idx) => `
                <div class="noticia-box" style="position: relative;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <p style="margin:0; font-size:18px; color:white; font-weight:bold; cursor:pointer; flex:1;" onclick="toggleDetalheNoticia(${idx})">${n.texto}</p>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span id="noticia-seta-${idx}" style="color:var(--primary); font-size:14px; font-weight:bold; cursor:pointer;" onclick="toggleDetalheNoticia(${idx})">▼ Ler Mais</span>
                            <button onclick="apagarNoticia(${idx})" style="background: var(--danger); color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;" title="Apagar Notícia">🗑️</button>
                        </div>
                    </div>
                    <div id="noticia-detalhe-${idx}" style="display:none; margin-top:15px; padding-top:15px; border-top:1px solid var(--border); font-size:15px; color:#cbd5e1; line-height:1.7;">
                        ${formatarNoticia(n.detalhe)}
                    </div>
                </div>
            `).join('');
        }

        // --- NOVO: Função que faz a IA comentar novidades sozinha ---
        async function checarNovidadesIA(tipo) {
            let feed = db[currentSave].noticiasFeed || [];
            let totalNoticias = feed.length;
            if (totalNoticias === 0) return; // Se não tem histórico nenhum, não faz nada

            let historyConfig = db[currentSave].chatHistory;
            
            // Cria os contadores ocultos se for a primeira vez que essa função roda no save
            if (historyConfig.noticiasLidasDir === undefined) {
                historyConfig.noticiasLidasDir = totalNoticias;
                historyConfig.noticiasLidasAux = totalNoticias;
                salvarDados();
            }

            let lidasChave = tipo === 'diretoria' ? 'noticiasLidasDir' : 'noticiasLidasAux';
            
            // Se o número total de notícias não aumentou, a IA já viu tudo. Cancela a ação.
            if (totalNoticias <= historyConfig[lidasChave]) return;

            let qtdNovas = totalNoticias - historyConfig[lidasChave];
            let novidades = feed.slice(0, qtdNovas).map(n => n.texto).join(" | ");
            historyConfig[lidasChave] = totalNoticias; // Atualiza o contador para a IA não repetir depois
            salvarDados();

            let history = historyConfig[tipo]; if(!history) history = [];
            let quickContainer = document.getElementById(`quick-${tipo}`);
            if(quickContainer) quickContainer.innerHTML = '';

            try {
                let contexto = gerarResumoContexto();
                let personagem = tipo === 'diretoria' ? 'a Diretoria do clube' : 'o Auxiliar Técnico';
                
                let promptFull = `Atue como ${personagem} "${db[currentSave].nome}".\n${contexto}
                INSTRUÇÕES ESPECIAIS: Ocorreram os seguintes eventos no clube desde nossa última conversa: "${novidades}".
                Envie UMA MENSAGEM CURTA E PROATIVA iniciando a conversa e opinando sobre esses eventos. Faça uma observação condizente com a sua posição (A diretoria fala de finanças, contratações e polêmicas; o auxiliar fala de tática, campo e moral do vestiário). Mantenha o conhecimento anterior intacto.
                Retorne EXATAMENTE este formato JSON puro:
                {
                  "mensagem": "Sua mensagem iniciando a conversa.",
                  "opcoes_resposta": ["Opção de resposta curta 1", "Opção de resposta curta 2"]
                }`;

                let log = document.getElementById(`chat-log-${tipo}`);
                if (log) {
                    log.innerHTML += `<div class="chat-msg msg-ai"><i>Analisando movimentações recentes...</i></div>`;
                    log.scrollTop = log.scrollHeight;
                }

                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptFull }] }] })
                });
                const data = await response.json();
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                
                if (match) {
                    let res = JSON.parse(match[0]);
                    history.push({ role: 'ai', text: res.mensagem });
                    if(quickContainer && res.opcoes_resposta) {
                        quickContainer.innerHTML = res.opcoes_resposta.map(op => `<button class="btn-quick" onclick="usarQuickReply('${op.replace(/'/g, "\\'")}', 'input-${tipo}', 'enviarChat${tipo.charAt(0).toUpperCase() + tipo.slice(1)}')">${op}</button>`).join('');
                    }
                }
                historyConfig[tipo] = history; salvarDados(); renderizarChat(tipo);
            } catch(e) {
                renderizarChat(tipo); // Limpa o "analisando" caso dê erro na conexão
            }
        }

        async function enviarChat(tipo) {
            let inputEl = document.getElementById(`input-${tipo}`);
            let texto = inputEl.value.trim();
            if(!texto) return;

            inputEl.value = '';
            let history = db[currentSave].chatHistory[tipo]; if(!history) history = [];
            history.push({ role: 'user', text: texto });
            let quickContainer = document.getElementById(`quick-${tipo}`);
            if(quickContainer) quickContainer.innerHTML = '';
            renderizarChat(tipo);

            try {
                let contexto = gerarResumoContexto();
                let historicoChat = history.map(h => `${h.role === 'user' ? 'Treinador' : tipo}: ${h.text}`).join('\n');
                
                let promptFull = "";

                if (tipo === 'diretoria') {
                    // Mapeamento Dinâmico do Perfil da IA baseado na Nota
                    let notaDir = db[currentSave].notaDiretoria;
                    let perfilDir = "";
                    if (notaDir >= 8) perfilDir = "Você está dócil, prestativa e confia plenamente no treinador. Pode oferecer pequenos bônus financeiros se ele argumentar muito bem.";
                    else if (notaDir >= 5) perfilDir = "Você é estritamente profissional, pragmática e foca apenas nos números, resultados e planilhas.";
                    else perfilDir = "CRISE! Você está rude, impaciente e ameaçadora. O clima é de profunda insatisfação e demissão iminente.";

                    promptFull = `Atue como a Diretoria do clube "${db[currentSave].nome}".\n${contexto}\nHistórico da Conversa:\n${historicoChat}\n
        INSTRUÇÕES DA DIRETORIA E REGRAS DE NEGÓCIO:
        1. PERSONALIDADE ATUAL (Sua Nota de Prestígio é ${notaDir.toFixed(1)}/10): ${perfilDir}
        2. NEGOCIAÇÃO E LIMITE ANUAL ("PIRES NA MÃO"): O clube tem um limite máximo de 2 injeções financeiras extras por temporada (Já foram feitas ${db[currentSave].negociacoesDiretoria || 0} de 2). 
        ⚠️ REGRA DE OURO DO FLUXO: Se o limite estiver esgotado (2/2), retorne 'novoOrcamentoExtra': 0 e avise que o cofre está trancado. 
        Se NÃO estiver esgotado, siga RIGOROSAMENTE DUAS ETAPAS:
        - ETAPA 1 (PRIMEIRA MENSAGEM OU PEDIDO NOVO): Você DEVE recusar o dinheiro imediato, propor uma contraproposta difícil preenchendo 'novaMetaExigida' e obrigatoriamente retornar 'novoOrcamentoExtra': 0 (ZERO!). NUNCA libere dinheiro na primeira mensagem.
        - ETAPA 2 (APENAS SE O TREINADOR ACEITAR CLARAMENTE NA MENSAGEM ANTERIOR): Só agora você preenche 'novoOrcamentoExtra' com o valor combinado (respeitando o teto de 20% da Média de Gasto, que é €${Math.max((db[currentSave].mediaGastoHistorico || 0) * 0.20, 2.0).toFixed(2)}M) e soma +1 ao limite de negociações.
        3. SISTEMA DE PROMESSAS E PRESTÍGIO: A diretoria avalia o desempenho EM CAMPO. É PROIBIDO aumentar o prestígio por palavras (NUNCA retorne variacao_prestigio positivo). Se o treinador der desculpas esfarrapadas ou ofender, REDUZA o prestígio (ex: -0.2, -0.5).
        
        Retorne EXATAMENTE este formato JSON puro:
        {
            "mensagem": "Sua resposta oficial...",
            "opcoes_resposta": ["Opção curta 1", "Opção curta 2"],
            "novoOrcamentoExtra": 0,
            "novaMetaExigida": "",
            "variacao_prestigio": 0.0
        }`;
                } else {
                    promptFull = `Atue como o Auxiliar Técnico "${db[currentSave].nome}".\n${contexto}\nHistórico da Conversa:\n${historicoChat}\n
        INSTRUÇÕES:
        Responda à última mensagem do Treinador de forma coerente. 
        MUDE SUA PERSONALIDADE: Seja extremamente autêntico, cirúrgico e focado em TÁTICA. Dê respostas profundas sobre esquemas, movimentações e ajustes.
        
        Retorne EXATAMENTE este formato JSON puro:
        {
            "mensagem": "Sua resposta oficial.",
            "opcoes_resposta": ["Opção curta 1", "Opção curta 2"]
        }`;
                }

                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptFull }] }] })
                });
                const data = await response.json();
                let rawText = data.candidates[0].content.parts[0].text;
                let jsonMatch = rawText.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    let res = JSON.parse(jsonMatch[0]);
                    history.push({ role: 'ai', text: res.mensagem });
                    
                    if(quickContainer && res.opcoes_resposta) {
                        quickContainer.innerHTML = res.opcoes_resposta.map(op => `<button class="btn-quick" onclick="usarQuickReply('${op.replace(/'/g, "\\'")}', 'input-${tipo}', 'enviarChat${tipo.charAt(0).toUpperCase() + tipo.slice(1)}')">${op}</button>`).join('');
                    }

                    // --- PROCESSAMENTO EXCLUSIVO DA DIRETORIA ---
                    if (tipo === 'diretoria') {
                        // ... (dentro de enviarChat)
if (res.novoOrcamentoExtra && Number(res.novoOrcamentoExtra) > 0) {
    let limiteDinamico = Math.max((db[currentSave].mediaGastoHistorico || 0) * 0.20, 2.0);
    let valorExtra = Math.min(Number(res.novoOrcamentoExtra), limiteDinamico);
    db[currentSave].negociacoesDiretoria = (db[currentSave].negociacoesDiretoria || 0) + 1;
    db[currentSave].orcamento += valorExtra;
    
    let dashOrc = document.getElementById('dash-dir-orcamento');
    if(dashOrc) dashOrc.innerText = "€" + db[currentSave].orcamento.toFixed(2) + "M";
    
    adicionarNoticiaAutomatica(`💰 ACORDO FECHADO: Diretoria libera +€${valorExtra.toFixed(2)}M.`, `Após intensas negociações nos bastidores, o conselho executivo cedeu aos pedidos do treinador e injetou uma verba extraordinária.`);
    
    // MOVIDO PARA CÁ: O ultimato só é registrado se o dinheiro for liberado!
    if (res.novaMetaExigida && res.novaMetaExigida.trim() !== "") {
        db[currentSave].objetivosTemporada = db[currentSave].objetivosTemporada.replace(/<br><span style="color:var\(--warning\)">🔥 ACORDO\/ULTIMATO EXIGIDO:.*?<\/span>/g, "");
        db[currentSave].objetivosTemporada += `<br><span style="color:var(--warning)">🔥 ACORDO/ULTIMATO EXIGIDO: ${res.novaMetaExigida}</span>`;
        
        let dirObjText = document.getElementById('dir-objetivos-texto');
        if(dirObjText) dirObjText.innerHTML = db[currentSave].objetivosTemporada;
    }
}
                        if (res.novaMetaExigida && res.novaMetaExigida.trim() !== "") {
                            // Remove intimatos antigos para não duplicar na tela
                            db[currentSave].objetivosTemporada = db[currentSave].objetivosTemporada.replace(/<br><span style="color:var\(--warning\)">🔥 ACORDO\/ULTIMATO EXIGIDO:.*?<\/span>/g, "");
                            db[currentSave].objetivosTemporada += `<br><span style="color:var(--warning)">🔥 ACORDO/ULTIMATO EXIGIDO: ${res.novaMetaExigida}</span>`;
                            
                            // Atualiza visualmente na tela da diretoria na mesma hora
                            let dirObjText = document.getElementById('dir-objetivos-texto');
                            if(dirObjText) dirObjText.innerHTML = db[currentSave].objetivosTemporada;
                        }
                        if (res.variacao_prestigio && Number(res.variacao_prestigio) !== 0) {
                            let variacao = Number(res.variacao_prestigio);
                            // Nova trava rígida: Só pode perder prestígio na conversa, nunca ganhar.
                            if (variacao > 0) variacao = 0; 
                            if (variacao < 0) atualizarNotaDiretoria(variacao);
                        }
                    }
                }
                db[currentSave].chatHistory[tipo] = history; salvarDados(); renderizarChat(tipo);
            } catch(e) {
                history.push({ role: 'ai', text: "Sem resposta no momento. Conexão interrompida." }); renderizarChat(tipo);
            }
        }

        function renderizarChat(tipo) {
            let log = document.getElementById(`chat-log-${tipo}`);
            if(!log) return;
            let history = db[currentSave].chatHistory[tipo] || [];
            
            log.innerHTML = history.map(h => {
                let btnOuvir = h.role === 'ai' ? `<button class="btn-audio" onclick="lerTexto('${h.text.replace(/'/g, "\\'")}')">🔊</button>` : '';
                return `<div class="chat-msg ${h.role === 'user' ? 'msg-user' : 'msg-ai'}">${h.text}${btnOuvir}</div>`;
            }).join('');
            log.scrollTop = log.scrollHeight;
        }

       function renderizarCampinhoLimpo() {
            let campo = document.getElementById('campo-futebol-ui');
            campo.innerHTML = '<div class="area-penalti-top"></div><div class="area-penalti-bot"></div>';

            let dadosSalvos = db[currentSave].escalacaoSalvaIA;
            if (dadosSalvos && dadosSalvos.formacao && dadosSalvos.escalacao) {
                let positions = coordsFormacoes[dadosSalvos.formacao];
                if (positions) {
                    for (let posObj of positions) {
                        let jogInfo = dadosSalvos.escalacao[posObj.role];
                        let nomeJogador = jogInfo ? jogInfo.nome : "???";
                        let instrucao = jogInfo ? jogInfo.instrucao : "Sem instrução.";
                        
                        let jogBD = db[currentSave].plantel.find(p => p.nome.toLowerCase().includes(nomeJogador.toLowerCase().trim()));
                        let txtOvr = jogBD ? `<br><span style="color:#0f1115; background:var(--primary); border-radius:4px; padding:0 3px;">OVR ${jogBD.ovr}</span>` : '';
                        
                        let tooltipHTML = `<div class="jogador-tooltip"><strong>${nomeJogador}</strong><hr style="border-color:var(--border); margin:5px 0;">${instrucao}</div>`;
                        
                        campo.innerHTML += `<div class="jogador-campo" style="top: ${posObj.top}; left: ${posObj.left};">${nomeJogador}${txtOvr}${tooltipHTML}</div>`;
                    }
                }
            }
        }

              async function pedirEscalacaoIA() {
            let formacaoPri = document.getElementById('tatica-primaria').value;
            let formacaoSec = document.getElementById('tatica-secundaria').value;
            let estiloJogo = document.getElementById('tatica-estilo').value;
            let adv = document.getElementById('auxiliar-adv').value.trim() || "Adversário Desconhecido";
            let diretriz = document.getElementById('auxiliar-diretriz').value;
            let diasDescanso = parseInt(document.getElementById('partida-dias-proxima')?.value) || 3;
            let btn = document.getElementById('btn-pedir-ia');
            
            btn.innerText = "⏳ O Estrategista está montando o plano de jogo..."; btn.disabled = true;

            let plantelAtivo = db[currentSave].plantel.filter(p => p.status === 'Ativo');
            
            // LÓGICA DE AMNÉSIA: PEGAR APENAS PEDIDOS NÃO APLICADOS
            let chatAuxHistorico = db[currentSave].chatHistory['auxiliar'] || [];
            let pedidosPendentes = chatAuxHistorico.filter(h => h.role === 'user' && !h.aplicada);
            let pedidosUsuario = pedidosPendentes.map(h => h.text).join(' | ');
            
            // Marca como aplicada para a IA esquecer essas ordens na próxima escalação
            pedidosPendentes.forEach(h => h.aplicada = true);
            salvarDados();

            let plantelStr = plantelAtivo.map(p => {
                let indisponivelStr = "";
                if (p.diasLesao && p.diasLesao > 0) indisponivelStr = " [INDISPONÍVEL: LESIONADO]";
                if (p.suspensoVermelho) indisponivelStr = " [INDISPONÍVEL: SUSPENSO]";

                let pJogadas = []; 
                db[currentSave].partidas.forEach(partida => { 
                    let at = partida.jogadores.find(j => j.nome === p.nome); 
                    if(at) pJogadas.push(at.nota); 
                });
                let mediaNota = pJogadas.length > 0 ? (pJogadas.reduce((a,b)=>a+b,0)/pJogadas.length).toFixed(1) : "Sem nota";
                return `[Nome: ${p.nome} | Pos: ${p.posicao} | OVR: ${p.ovr} | Nota Média: ${mediaNota}${indisponivelStr}]`;
            }).join(', ');
            
            let formacoesPossiveisStr = JSON.stringify({
                "4-3-3": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOL", "MCD", "MCE", "PD", "PE", "ATA"],
                "4-4-2": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "MD", "MCD", "MCE", "ME", "ATD", "ATE"],
                "3-5-2": ["GOL", "ZAD", "ZAC", "ZAE", "ALD", "VOLD", "VOLE", "ALE", "MEI", "ATD", "ATE"],
                "4-2-3-1": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOLD", "VOLE", "MD", "MEI", "ME", "ATA"],
                "4-1-4-1": ["GOL", "LAD", "ZAD", "ZAE", "LAE", "VOL", "MD", "MCD", "MCE", "ME", "ATA"],
                "3-4-3": ["GOL", "ZAD", "ZAC", "ZAE", "MD", "MCD", "MCE", "ME", "PD", "ATA", "PE"],
                "5-3-2": ["GOL", "LAD", "ZAD", "ZAC", "ZAE", "LAE", "MCD", "MC", "MCE", "ATD", "ATE"]
            });

            let promptIA = `Você é o MENTOR ESTRATÉGICO do "${db[currentSave].nome}". Adversário: ${adv}.
            Elenco: ${plantelStr}
            
            FILOSOFIA TÁTICA E OPÇÕES:
            - Formação Primária: ${formacaoPri}
            - Formação Secundária (Alternativa de Ouro): ${formacaoSec}
            - Estilo de Jogo: ${estiloJogo}
            - Diretriz: ${diretriz}
            
            🚨 ORDENS DIRETAS DO TREINADOR APENAS PARA ESTE JOGO: [${pedidosUsuario ? pedidosUsuario : "Nenhuma ordem extra. Crie a melhor estratégia sozinho."}]
            (Se houver ordens acima, obedeça cegamente. Caso contrário, aja por conta própria).

            🧠 SEU PAPEL COMO ESTRATEGISTA (MUITO IMPORTANTE):
            1. DINÂMICA DE FORMAÇÃO: Você DEVE analisar o adversário (${adv}) e o nível do seu time. Se o adversário for muito forte, ou se for um jogo que exige postura diferente, USE A FORMAÇÃO SECUNDÁRIA (${formacaoSec}). Se o time estiver cansado e os reservas encaixarem melhor na Secundária, use-a. Caso a Primária seja superior para o contexto, mantenha-a.
            2. INSTRUÇÕES CIRÚRGICAS: Para CADA jogador, crie uma instrução tática baseada no adversário (${adv}) e no ${estiloJogo}. Exemplo: Se for o Racing (time menor), exija pressão na saída deles. Se for o Barcelona, instrua o volante a fechar a linha de passe e dobrar marcação. NADA DE INSTRUÇÕES GENÉRICAS.
            3. ROTAÇÃO (${diasDescanso} dias de descanso): Se tiver 3 dias ou menos, POUPE PONTAS E LATERAIS (exceto se a Diretriz for Força Total).

            REGRAS ABSOLUTAS DO JSON:
            1. Escolha UMA das duas formações (A Primária ou a Secundária) e use EXATAMENTE AS SIGLAS DO SEGUINTE MAPA COMO CHAVES: ${formacoesPossiveisStr}
            2. NÃO invente siglas (Ex: não crie "MC" se na formação escolhida tiver apenas "MCD" e "MCE").
            
            Retorne EXATAMENTE este JSON PURO:
            {
                "formacaoEscolhida": "4-2-3-1",
                "escalacao": {
                    "GOL": {"nome": "Nome do Goleiro", "instrucao": "Instrução tática profunda contra o adversário..."},
                    "LAD": {"nome": "Nome do Lateral", "instrucao": "..."}
                }
            }`;

            try {
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptIA }] }] })
                });
                const data = await response.json();
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
                
                if (match) {
                    let res = JSON.parse(match[0]);
                    
                    db[currentSave].escalacaoSalvaIA = {
                        formacao: res.formacaoEscolhida,
                        escalacao: res.escalacao
                    };
                    salvarDados();
                    renderizarCampinhoLimpo();
                }
            } catch (e) {
                alert("Erro ao analisar a tática. Verifique sua chave API ou internet.");
            }
            btn.innerText = "⚙️ Gerar Escalação e Funções Táticas (IA)"; btn.disabled = false;
        }


        function atualizarTemperaturaUI(clima) {
            let el = document.getElementById('status-temperatura');
            el.innerText = `🌡️ Clima: ${clima}`;
            if(clima.toLowerCase().includes('tens') || clima.toLowerCase().includes('cris') || clima.toLowerCase().includes('hostil')) el.style.borderColor = 'var(--danger)';
            else if(clima.toLowerCase().includes('eufóric') || clima.toLowerCase().includes('calm')) el.style.borderColor = 'var(--primary)';
            else el.style.borderColor = 'var(--border)';
        }

        async function responderColetiva() {
            let input = document.getElementById('input-imprensa');
            let texto = input.value.trim(); if(!texto) return;
            input.value = ''; document.getElementById('quick-imprensa').innerHTML = '';

            let history = db[currentSave].chatHistory['imprensa'];
            history.push({ role: 'user', text: texto });
            contadorRespostasColetiva++; renderizarChat('imprensa');

            if(contadorRespostasColetiva >= 5) {
                history.push({ role: 'ai', text: "Assessor: A coletiva foi encerrada. Obrigado!" });
                renderizarChat('imprensa'); window.coletivaAtiva = false; return;
            }

            try {
                                let promptPayload = `${gerarResumoContexto()}\nColetiva (${contadorRespostasColetiva}/5). Histórico:\n` + history.map(h => `${h.role === 'user' ? 'Treinador' : 'Mídia'}: ${h.text}`).join('\n') + `
                INSTRUÇÕES:
                1. Mude o jornalista e o assunto. Avalie o contexto da entrevista.
                2. REGRA DE OURO DA IMPRENSA E DIRETORIA: Discursos simples, rotineiros, profissionais ou pacatos NUNCA penalizam o prestígio (variacao_prestigio DEVE ser 0.0). A diretoria e os jornais entendem clichês de futebol. Mantenha o clima "Neutro" para respostas normais. SÓ aplique variação negativa se o treinador xingar, criar uma crise pública gravíssima ou atacar o clube. Respostas inspiradoras dão +0.1 de prestígio.
                3. Baseado na resposta do Treinador, defina o impacto na diretoria (variacao_prestigio: 0.1, 0.0, ou -0.2 apenas em casos extremos).
                4. NOTÍCIAS DE IMPRENSA: Atue como um portal de fofoca esportiva (estilo The Sun, Marca, GE). Se o treinador der uma resposta forte, irônica ou inspiradora, coloque "gerarNoticia": true. 
                5. Crie um "tituloNoticia" ESCANDALOSO (Ex: "TREINADOR PERDE A LINHA!", "INDIRETA PARA A DIRETORIA?", "TÉCNICO CRAVA TÍTULO!"). No "detalheNoticia", aja como um jornalista corneteiro ou emocionado comentando a fala do treinador.
                6. O limite de notícias por coletiva é 2. Já foram geradas ${window.noticiasGeradasColetiva}.
                
                Retorne EXATAMENTE JSON puro:
                {
                  "mensagem": "Pergunta do novo jornalista",
                  "temperatura": "Clima atual (ex: Hostil)",
                  "opcoes_resposta": ["Opção 1", "Opção 2", "Opção 3"],
                  "variacao_prestigio": 0.0,
                  "gerarNoticia": true/false,
                  "tituloNoticia": "Manchete forte",
                  "detalheNoticia": "Texto da notícia sobre a última fala do treinador"
                }`;

                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptPayload }] }] })
                });
                const data = await response.json();
                let match = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);

                if(match) {
                    let res = JSON.parse(match[0]);
                    atualizarTemperaturaUI(res.temperatura || "Neutro");
                    history.push({ role: 'ai', text: res.mensagem });
                    
                    if (res.variacao_prestigio) atualizarNotaDiretoria(Number(res.variacao_prestigio));

                    if (res.gerarNoticia === true && res.tituloNoticia && window.noticiasGeradasColetiva < 2) {
                        window.noticiasGeradasColetiva++;
                        adicionarNoticiaAutomatica(`🔥 POLÊMICA MÍDIA: ${res.tituloNoticia}`, res.detalheNoticia);
                    }

                    let quickContainer = document.getElementById(`quick-imprensa`);
                    if(res.opcoes_resposta) {
                        quickContainer.innerHTML = res.opcoes_resposta.map(op => `<button class="btn-quick" onclick="usarQuickReply('${op.replace(/'/g, "\\'")}', 'input-imprensa', 'responderColetiva')">${op}</button>`).join('');
                    }
                }
                salvarDados(); renderizarChat('imprensa');
            } catch(e) { }
        }

function apagarChat(tipo) {
            if (confirm(`Tem certeza que deseja apagar o histórico desta conversa?`)) {
                db[currentSave].chatHistory[tipo] = [];
                // Se for diretoria ou auxiliar, reseta também o contador de notícias lidas para reavaliar se precisar
                if (tipo === 'diretoria') db[currentSave].chatHistory.noticiasLidasDir = 0;
                if (tipo === 'auxiliar') db[currentSave].chatHistory.noticiasLidasAux = 0;
                salvarDados();
                renderizarChat(tipo);
                // Se for o auxiliar, limpa o campinho visualmente se quiser
                if (tipo === 'auxiliar') {
                    db[currentSave].escalacaoSalvaIA = null;
                    renderizarCampinhoLimpo();
                }
            }
        }

        function apagarNoticia(index) {
            if (confirm("Deseja apagar esta notícia do feed?")) {
                db[currentSave].noticiasFeed.splice(index, 1);
                salvarDados();
                renderizarNoticiasFeed();
            }
        }

function atualizarKPIsEForma(pFiltradas) {
            // 1. Forma Recente (Últimos 5 jogos)
            let formaHTML = "";
            let ultimos5 = pFiltradas.slice(-5);
            
            ultimos5.forEach(p => {
                let vitoria = p.golsPro > p.golsContra || (p.golsPro === p.golsContra && p.penaltis);
                let derrota = p.golsPro < p.golsContra;
                
                if (vitoria) formaHTML += "🟢";
                else if (derrota) formaHTML += "🔴";
                else formaHTML += "🟡";
            });
            document.getElementById('header-forma-recente').innerHTML = formaHTML;

            // Se não tem jogos na temporada, zera os cartões
            if (pFiltradas.length === 0) {
                document.getElementById('kpi-aproveitamento').innerText = "0%";
                document.getElementById('kpi-saldo').innerText = "0";
                document.getElementById('kpi-artilheiro').innerText = "-";
                document.getElementById('kpi-garcom').innerText = "-";
                return;
            }

            // 2. Aproveitamento (%) e Saldo de Gols
            let ptsGanhos = 0;
            let golsProTot = 0;
            let golsConTot = 0;

            pFiltradas.forEach(p => {
                golsProTot += p.golsPro;
                golsConTot += p.golsContra;
                let vitoria = p.golsPro > p.golsContra || (p.golsPro === p.golsContra && p.penaltis);
                let empate = p.golsPro === p.golsContra && !p.penaltis;
                
                if (vitoria) ptsGanhos += 3;
                else if (empate) ptsGanhos += 1;
            });
            
            let ptsPossiveis = pFiltradas.length * 3;
            let aprov = ((ptsGanhos / ptsPossiveis) * 100).toFixed(1);
            let saldo = golsProTot - golsConTot;

            document.getElementById('kpi-aproveitamento').innerText = aprov + "%";
            document.getElementById('kpi-saldo').innerText = saldo > 0 ? "+" + saldo : saldo;

            // 3. Artilheiro e Assistente usando o agregador existente
            let advData = getAdvancedPlayerAggregates(pFiltradas); 
            let jogadoresArr = Object.keys(advData).map(nome => ({
                nome: nome.split(' ').pop(), // Usando .pop() para pegar sempre o último sobrenome
                gols: advData[nome].gols,
                assist: advData[nome].assist
            }));

            let artilheiro = jogadoresArr.sort((a,b) => b.gols - a.gols)[0];
            let garcom = jogadoresArr.sort((a,b) => b.assist - a.assist)[0];

            document.getElementById('kpi-artilheiro').innerText = artilheiro && artilheiro.gols > 0 ? `${artilheiro.nome} (${artilheiro.gols})` : "-";
            document.getElementById('kpi-garcom').innerText = garcom && garcom.assist > 0 ? `${garcom.nome} (${garcom.assist})` : "-";
        }

async function lerImagensIAPlantel(event) {
            if (currentSave !== 'clube') return alert("Apenas para o modo Clube!");
            
            const files = event.target.files;
            if (!files || files.length === 0) return;

            let loaderText = document.getElementById('loader-plantel-text');
            if (loaderText) loaderText.innerText = "Iniciando leitura...";

            // Loop para ler várias imagens selecionadas de uma vez
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (loaderText) loaderText.innerText = `Lendo imagem ${i + 1} de ${files.length}... aguarde`;

                // Converte a imagem em Base64 para enviar para a IA
                let base64Data = await new Promise((resolve) => {
                    let reader = new FileReader(); 
                    reader.onload = () => resolve(reader.result.split(',')[1]); 
                    reader.readAsDataURL(file);
                });

                // Prompt detalhado mapeando exatamente as posições solicitadas
                let prompt = `Analise a imagem da tela de "Central do Elenco" de um jogo de futebol.
Existem colunas mostrando a Posição, Nome e GER/OVR.
Extraia TODOS os jogadores da lista visíveis na imagem.

ATENÇÃO AO MAPEAMENTO DE POSIÇÕES (Você deve traduzir a sigla do jogo para as posições do nosso sistema):
- Se a sigla for "GL" -> use "Goleiro"
- Se a sigla for "ZAG", "ZAD", "ZAE", "ZAC" -> use "Zagueiro/Defesa"
- Se a sigla for "LD", "LAD" -> use "Lateral/Defesa Direito"
- Se a sigla for "LE", "LAE" -> use "Lateral/Defesa Esquerdo"
- Se a sigla for "VOL" -> use "Volante/Contenção"
- Se a sigla for "MC", "MCD", "MCE" -> use "MeioCampo/Equilibrado"
- Se a sigla for "MD", "PD" -> use "Ponta/Ala Direita"
- Se a sigla for "ME", "PE" -> use "Ponta/Ala Esquerda"
- Se a sigla for "ATA", "MEI", "ATD", "ATE", "SA", "CA" -> use "Atacante/Versátil"

O nome deve ser copiado exatamente como está na tela (ex: O. Vlachodimos).
Retorne APENAS um array JSON válido e puro, sem marcações markdown como \`\`\`json.
Exemplo do formato exigido:
[
  {"nome": "O. Vlachodimos", "posicao": "Goleiro", "ovr": 79},
  {"nome": "Marcão", "posicao": "Defesa", "ovr": 74}
]`;

                try {
                    const response = await fetch(API_URL, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } } ] }] })
                    });
                    const data = await response.json();
                    let rawText = data.candidates[0].content.parts[0].text;
                    
                    // Extrai o Array JSON da resposta da IA
                    let jsonMatch = rawText.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        let jogadoresExtraidos = JSON.parse(jsonMatch[0]);
                        
                        jogadoresExtraidos.forEach(j => {
                            let nomeExtraido = j.nome.trim();
                            let posExtraida = j.posicao || "Meio-Campo";
                            let ovrExtraido = Number(j.ovr) || 70;
                            
                            // Verifica se o jogador já existe para atualizar, senão cria um novo
                            let jogadorExistente = db.clube.plantel.find(p => p.nome.toLowerCase() === nomeExtraido.toLowerCase());
                            
                            if (jogadorExistente) {
                                jogadorExistente.ovr = ovrExtraido;
                                jogadorExistente.posicao = posExtraida;
                            } else {
                                db.clube.plantel.push({
                                    nome: nomeExtraido,
                                    posicao: posExtraida,
                                    ovr: ovrExtraido,
                                    status: 'Ativo',
                                    jogosAvaliacao: 0
                                });
                            }
                        });
                    }
                } catch(e) { 
                    console.error("Erro na leitura da imagem do plantel pela IA:", e);
                }
            }
            
            let loaderTextEl = document.getElementById('loader-plantel-text');
            if (loaderTextEl) loaderTextEl.innerText = "";
            event.target.value = "";
            
            salvarDados();
            atualizarPlantelUI();
            preencherDatalistJogadores();
            alert("Leitura de Elenco concluída! O plantel foi atualizado.");
        }

        // --- FUNÇÕES DE CONDIÇÃO FÍSICA E AUXILIARES FALTANTES ---

        function atualizarSelectCondicaoAuxiliar() {
            let select = document.getElementById('select-jogador-condicao');
            if(!select) return;
            select.innerHTML = '<option value="">Selecione o jogador...</option>';
            
            if(db[currentSave] && db[currentSave].plantel) {
                let jogadoresAtivos = db[currentSave].plantel.filter(p => p.status === 'Ativo');
                jogadoresAtivos.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(p => {
                    select.innerHTML += `<option value="${p.nome}">${p.nome}</option>`;
                });
            }
        }

        function declararLesao() {
            let nome = document.getElementById('select-jogador-condicao').value;
            let dias = parseInt(document.getElementById('input-dias-lesao').value) || 0;
            
            if(!nome || dias <= 0) return alert("Por favor, selecione um jogador e insira uma quantidade válida de dias.");
            
            let jogador = db[currentSave].plantel.find(p => p.nome === nome);
            if(jogador) {
                jogador.diasLesao = dias;
                salvarDados();
                atualizarPlantelUI();
                alert(`🏥 ${nome} declarado como lesionado por ${dias} dias.`);
                document.getElementById('input-dias-lesao').value = '0';
            }
        }

        function aplicarCartaoVermelho() {
            let nome = document.getElementById('select-jogador-condicao').value;
            if(!nome) return alert("Por favor, selecione um jogador.");
            
            let jogador = db[currentSave].plantel.find(p => p.nome === nome);
            if(jogador) {
                jogador.suspensoVermelho = true;
                salvarDados();
                atualizarPlantelUI();
                alert(`🟥 ${nome} está suspenso pelo próximo jogo devido a um Cartão Vermelho.`);
            }
        }

// Cole AQUI o seu primeiro bloco de código:
        // FUNÇÕES AUXILIARES DE RISCO (Adicione em qualquer lugar no seu JS)
        function game_over_demissao() {
            document.getElementById('modal-demissao').style.display = 'flex';
        }

        function checarRiscoDemissao() {
            let nota = db[currentSave].notaDiretoria;
            
            if (nota === 0.0) {
                game_over_demissao();
            } else if (nota >= 1.0 && nota <= 2.9) {
                // Alerta Vermelho (Modal de Evento adaptado)
                document.getElementById('evento-texto').innerText = "A diretoria está FURIOSA. Você tem, no máximo, 1 a 2 jogos para reagir ou será sumariamente demitido.";
                document.querySelector('.evento-box h2').innerText = "⚠️ RISCO DE DEMISSÃO ALTÍSSIMO!";
                document.querySelector('.evento-box').style.borderColor = "var(--danger)";
                document.getElementById('modal-evento').style.display = 'flex';
            } else if (nota >= 3.0 && nota <= 4.9) {
                // Alerta Amarelo
                document.getElementById('evento-texto').innerText = "⚠️ ALERTA DA DIRETORIA: Resultados inaceitáveis. Reunião de emergência necessária! Seu cargo periga se a fase não mudar logo.";
                document.querySelector('.evento-box h2').innerText = "⚠️ ALERTA DA DIRETORIA";
                document.querySelector('.evento-box').style.borderColor = "var(--warning)";
                document.getElementById('modal-evento').style.display = 'flex';
            }
        }

        function processarDiasAposPartida(diasPassados) {
            if(!db[currentSave] || !db[currentSave].plantel) return;
            
            db[currentSave].plantel.forEach(p => {
                // Recuperação de Lesões
                if (p.diasLesao && p.diasLesao > 0) {
                    p.diasLesao -= diasPassados;
                    if (p.diasLesao <= 0) {
                        p.diasLesao = 0;
                        adicionarNoticiaAutomatica(`🏥 DM VAZIO: ${p.nome} está de volta!`, `O atleta se recuperou de sua lesão e já treina normalmente com o resto do elenco principal.`);
                    }
                }
                // Limpeza de suspensão após a partida transcorrer
                if (p.suspensoVermelho) {
                    p.suspensoVermelho = false;
                }
            });
        }

// --- MOTOR DO FEED SOCIAL E CAÇA ÀS BRUXAS ---

        function formatarTextoTweet(texto) {
            return texto.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
        }

        function atualizarTermometroTorcida(variacao) {
            let config = db[currentSave];
            if(config.aprovacaoTorcida === undefined) config.aprovacaoTorcida = 50;
            config.aprovacaoTorcida = Math.max(0, Math.min(100, config.aprovacaoTorcida + variacao));
            salvarDados();
            renderizarTermometroUI();
        }

        function renderizarTermometroUI() {
            let val = db[currentSave].aprovacaoTorcida || 50;
            let barra = document.getElementById('barra-torcida');
            let texto = document.getElementById('texto-torcida');
            if(!barra || !texto) return;

            barra.style.width = `${val}%`;
            if(val >= 80) { barra.style.background = 'var(--primary)'; texto.innerText = `${val}% (Ídolo)`; }
            else if(val >= 50) { barra.style.background = 'var(--warning)'; texto.innerText = `${val}% (Dividida)`; }
            else { barra.style.background = 'var(--danger)'; texto.innerText = `${val}% (Fúria Total)`; }
        }

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
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptDin }] }] })
                });
                const data = await response.json();
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
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptEval }] }] })
                });
                const data = await response.json();
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
            - Aprovação da Torcida: ${db[currentSave].aprovacaoTorcida}% 
            - Últimos Resultados: ${resumoUltimos || "Início de temporada"}

            Gere a "Timeline" de AGORA. Crie 3 postagens HIPER-REALISTAS e ÚNICAS:
            1. Postagem sobre Partida / Desempenho.
            2. Postagem sobre Transferência / Mercado / Diretoria.
            3. Postagem de Corneta / Zoação da torcida.

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
                const response = await fetch(API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptIA }] }] })
                });
                const data = await response.json();
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

function apagarSocialFeed() {
            if (confirm("Deseja apagar todas as postagens do Feed Social?")) {
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

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.05);

            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); 
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05); 

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.05);
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
    </script>
</body>
</html>
