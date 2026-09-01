// Base de clubes reais por liga/divisão, usada apenas para PREENCHER SUGESTÕES
// na tela de "Novo Jogo". Não trava a temporada: o jogador sempre pode digitar
// o nome de qualquer outro clube (opção "Outro clube..."), então isso funciona
// para qualquer edição/ano de FIFA ou eFootball.
//
// Pedido do treinador: a base estava desatualizada (ainda refletia o FC26 mesmo
// quando o save começava na temporada 26/27, que já é o FC27). Agora existem DUAS
// edições — a temporada inicial escolhida no assistente decide qual usar:
// "25/26" -> FC26, "26/27" -> FC27 (o segundo ano da temporada é sempre o número
// da edição). Cada edição reflete os acessos/rebaixamentos reais daquele ano
// (pesquisado em 01/09/2026 — times de divisões menores, sobretudo na Série D
// brasileira e nas ligas de base europeias, podem ter alguma defasagem pontual).
const clubesPorLigaPorEdicao = {
    fc26: {
        "Premier League (OVR 77)": [
            "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton & Hove Albion",
            "Burnley", "Chelsea", "Crystal Palace", "Everton", "Fulham",
            "Leeds United", "Liverpool", "Manchester City", "Manchester United", "Newcastle United",
            "Nottingham Forest", "Sunderland", "Tottenham Hotspur", "West Ham United", "Wolverhampton Wanderers"
        ],
        "Championship (OVR 70)": [
            "Birmingham City", "Blackburn Rovers", "Bristol City", "Charlton Athletic", "Coventry City",
            "Derby County", "Hull City", "Ipswich Town", "Leicester City", "Middlesbrough",
            "Millwall", "Norwich City", "Oxford United", "Portsmouth", "Preston North End",
            "Queens Park Rangers", "Sheffield United", "Sheffield Wednesday", "Southampton", "Stoke City",
            "Swansea City", "Watford", "West Bromwich Albion", "Wrexham"
        ],
        "League One (OVR 64)": [
            "Barnsley", "Reading", "Wigan Athletic", "Rotherham United", "Peterborough United",
            "Lincoln City", "Blackpool", "Huddersfield Town", "Stockport County", "Leyton Orient",
            "Exeter City", "Wycombe Wanderers", "Northampton Town", "Mansfield Town", "Burton Albion",
            "Stevenage", "Cardiff City", "Plymouth Argyle", "Luton Town", "Doncaster Rovers",
            "Port Vale", "Bradford City", "AFC Wimbledon", "Bolton Wanderers"
        ],
        "League Two (OVR 60)": [
            "Notts County", "Fleetwood Town", "Walsall", "Swindon Town", "Colchester United",
            "Salford City", "Grimsby Town", "Accrington Stanley", "Newport County", "Crewe Alexandra",
            "Gillingham", "Harrogate Town", "Barrow", "Tranmere Rovers", "Milton Keynes Dons",
            "Chesterfield", "Cheltenham Town", "Bromley", "Crawley Town", "Bristol Rovers",
            "Cambridge United", "Shrewsbury Town", "Barnet", "Oldham Athletic"
        ],
        "Brasileirão Série A (OVR 74)": [
            "Flamengo", "Palmeiras", "Cruzeiro", "Mirassol", "Bahia",
            "Botafogo", "Fluminense", "São Paulo", "Red Bull Bragantino", "Corinthians",
            "Grêmio", "Vasco da Gama", "Internacional", "Atlético Mineiro", "Santos",
            "Vitória", "Fortaleza", "Ceará", "Juventude", "Sport Recife"
        ],
        "Série B (OVR 68)": [
            "Coritiba", "Athletico Paranaense", "Chapecoense", "Remo", "América-MG",
            "Athletic", "Atlético-GO", "Avaí", "Botafogo-SP", "CRB",
            "Criciúma", "Cuiabá", "Ferroviária", "Goiás", "Novorizontino",
            "Operário-PR", "Paysandu", "Vila Nova", "Volta Redonda", "Amazonas"
        ],
        "Série C (OVR 63)": [
            "Ponte Preta", "Náutico", "Ituano", "Brusque", "Guarani",
            "CSA", "Figueirense", "Tombense", "Confiança", "ABC",
            "Caxias", "Floresta", "São Bernardo", "Londrina", "Ypiranga-RS",
            "Botafogo-PB", "Anápolis", "Retrô", "Maringá", "Itabaiana"
        ],
        "Série D (OVR 58)": [
            "Barra", "Santa Cruz-PE", "Maranhão", "Inter de Limeira", "Treze",
            "Sousa", "Central", "Manaus", "Nova Iguaçu", "Cianorte",
            "Aparecidense", "Ferroviário-CE", "Portuguesa-SP", "Água Santa", "Goianésia",
            "Cascavel-PR"
        ],
        "LaLiga (OVR 77)": [
            "Real Madrid", "Barcelona", "Atlético Madrid", "Villarreal", "Real Betis",
            "Celta Vigo", "Real Sociedad", "Getafe", "Athletic Bilbao", "Valencia",
            "Sevilla", "Rayo Vallecano", "Osasuna", "Espanyol", "Alavés",
            "Levante", "Elche", "Real Oviedo", "Girona", "Mallorca"
        ],
        "LaLiga Hypermotion (OVR 70)": [
            "Almería", "Burgos", "Cádiz", "Castellón", "Córdoba",
            "Deportivo La Coruña", "Eibar", "Granada", "Huesca", "Málaga",
            "Mirandés", "Racing Santander", "Sporting Gijón", "Real Zaragoza", "Albacete",
            "Las Palmas", "Leganés", "Valladolid", "Ceuta", "Cultural Leonesa",
            "Andorra", "Real Sociedad B"
        ],
        "Bundesliga (OVR 76)": [
            "Bayern de Munique", "Bayer Leverkusen", "RB Leipzig", "Borussia Dortmund", "Eintracht Frankfurt",
            "VfB Stuttgart", "Freiburg", "Borussia Mönchengladbach", "Hoffenheim", "Werder Bremen",
            "Wolfsburg", "Augsburg", "Mainz 05", "Union Berlin", "St. Pauli",
            "Heidenheim", "FC Köln", "Hamburger SV"
        ],
        "2. Bundesliga (OVR 69)": [
            "Fortuna Düsseldorf", "Paderborn", "Greuther Fürth", "Hannover 96", "Schalke 04",
            "Karlsruher SC", "Nürnberg", "Braunschweig", "Hertha BSC", "Magdeburg",
            "Elversberg", "Preußen Münster", "Darmstadt 98", "Kaiserslautern", "Bochum",
            "Holstein Kiel", "Arminia Bielefeld", "Dynamo Dresden"
        ],
        "3. Liga (OVR 63)": [
            "Energie Cottbus", "Verl", "Duisburg", "Rot-Weiss Essen", "Hansa Rostock",
            "Osnabrück", "Hoffenheim II", "1860 München", "Waldhof Mannheim", "VfB Stuttgart II",
            "Wehen Wiesbaden", "Viktoria Köln", "Ingolstadt", "Jahn Regensburg", "Saarbrücken",
            "Erzgebirge Aue", "Alemannia Aachen", "Ulm", "Havelse", "Schweinfurt"
        ],
        "Serie A (OVR 76)": [
            "Atalanta", "Bologna", "Cagliari", "Como", "Cremonese",
            "Fiorentina", "Genoa", "Verona", "Inter de Milão", "Juventus",
            "Lazio", "Lecce", "AC Milan", "Napoli", "Parma",
            "Pisa", "Roma", "Sassuolo", "Torino", "Udinese"
        ],
        "Serie B (OVR 69)": [
            "Venezia", "Monza", "Frosinone", "Palermo", "Catanzaro",
            "Modena", "Juve Stabia", "Cesena", "Sampdoria", "Avellino",
            "Padova", "Virtus Entella", "Empoli", "Südtirol", "Carrarese",
            "Mantova", "Reggiana", "Spezia", "Bari", "Pescara"
        ],
        "Ligue 1 (OVR 75)": [
            "Paris Saint-Germain", "Marseille", "Monaco", "Lyon", "Lille",
            "Nice", "Lens", "Strasbourg", "Toulouse", "Rennes",
            "Brest", "Le Havre", "Angers", "Auxerre", "Nantes",
            "Lorient", "Paris FC", "Metz"
        ],
        "Ligue 2 (OVR 68)": [
            "Amiens", "Annecy", "Bastia", "Boulogne", "Clermont Foot",
            "Dunkerque", "Grenoble", "Guingamp", "Laval", "Le Mans",
            "Montpellier", "Nancy", "Pau FC", "Red Star", "Reims",
            "Rodez", "Saint-Étienne", "Troyes"
        ],
        "Portugal - Liga Portugal (OVR 74)": [
            "Benfica", "Porto", "Sporting CP", "Braga", "Vitória de Guimarães",
            "Famalicão", "Gil Vicente", "Rio Ave", "Moreirense", "Casa Pia",
            "Estoril", "Arouca", "Nacional", "Santa Clara", "Estrela da Amadora",
            "AVS", "Tondela", "Alverca"
        ],
        "Holanda - Eredivisie (OVR 73)": [
            "Ajax", "PSV Eindhoven", "Feyenoord", "AZ Alkmaar", "FC Twente",
            "FC Utrecht", "FC Groningen", "Sparta Rotterdam", "NEC Nijmegen", "PEC Zwolle",
            "Fortuna Sittard", "Go Ahead Eagles", "SC Heerenveen", "FC Volendam", "Excelsior",
            "Telstar", "Heracles Almelo", "NAC Breda"
        ],
        "Turquia - Süper Lig (OVR 72)": [
            "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Başakşehir",
            "Antalyaspor", "Kayserispor", "Konyaspor", "Alanyaspor", "Kasımpaşa",
            "Gaziantep FK", "Çaykur Rizespor", "Samsunspor", "Göztepe", "Eyüpspor",
            "Kocaelispor", "Gençlerbirliği", "Fatih Karagümrük"
        ],
        "Bélgica - Pro League (OVR 71)": [
            "Club Brugge", "Union Saint-Gilloise", "Anderlecht", "Genk", "Royal Antwerp",
            "Standard Liège", "Gent", "Charleroi", "Cercle Brugge", "KV Mechelen",
            "STVV", "Westerlo", "La Louvière", "Zulte Waregem", "OH Leuven", "Dender"
        ],
        "Escócia - Premiership (OVR 70)": [
            "Celtic", "Rangers", "Aberdeen", "Hearts", "Hibernian",
            "Dundee United", "Motherwell", "St Mirren", "Kilmarnock", "Dundee",
            "Livingston", "Falkirk"
        ]
    },
    fc27: {
        "Premier League (OVR 77)": [
            "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton & Hove Albion",
            "Chelsea", "Coventry City", "Crystal Palace", "Everton", "Fulham",
            "Hull City", "Ipswich Town", "Leeds United", "Liverpool", "Manchester City",
            "Manchester United", "Newcastle United", "Nottingham Forest", "Sunderland", "Tottenham Hotspur"
        ],
        "Championship (OVR 70)": [
            "Birmingham City", "Blackburn Rovers", "Bolton Wanderers", "Bristol City", "Burnley",
            "Cardiff City", "Charlton Athletic", "Derby County", "Lincoln City", "Middlesbrough",
            "Millwall", "Norwich City", "Portsmouth", "Preston North End", "Queens Park Rangers",
            "Sheffield United", "Southampton", "Stoke City", "Swansea City", "Watford",
            "West Bromwich Albion", "West Ham United", "Wolverhampton Wanderers", "Wrexham"
        ],
        "League One (OVR 64)": [
            "Barnsley", "Reading", "Wigan Athletic", "Peterborough United", "Blackpool",
            "Huddersfield Town", "Stockport County", "Leyton Orient", "Wycombe Wanderers", "Mansfield Town",
            "Burton Albion", "Stevenage", "Plymouth Argyle", "Luton Town", "Doncaster Rovers",
            "Bradford City", "AFC Wimbledon", "Oxford United", "Leicester City", "Sheffield Wednesday",
            "Bromley", "Milton Keynes Dons", "Cambridge United", "Notts County"
        ],
        "League Two (OVR 60)": [
            "Fleetwood Town", "Walsall", "Swindon Town", "Colchester United", "Salford City",
            "Grimsby Town", "Accrington Stanley", "Newport County", "Crewe Alexandra", "Gillingham",
            "Tranmere Rovers", "Chesterfield", "Cheltenham Town", "Crawley Town", "Bristol Rovers",
            "Shrewsbury Town", "Barnet", "Oldham Athletic", "Exeter City", "Port Vale",
            "Rotherham United", "Northampton Town", "York City", "Rochdale"
        ],
        "Brasileirão Série A (OVR 74)": [
            "Botafogo", "Palmeiras", "Internacional", "Flamengo", "São Paulo",
            "Cruzeiro", "Bahia", "Corinthians", "Vitória", "Vasco da Gama",
            "Grêmio", "Fluminense", "Atlético Mineiro", "Red Bull Bragantino", "Santos",
            "Mirassol", "Coritiba", "Athletico Paranaense", "Chapecoense", "Remo"
        ],
        "Série B (OVR 68)": [
            "América-MG", "Athletic", "Atlético-GO", "Avaí", "Botafogo-SP",
            "Ceará", "CRB", "Criciúma", "Cuiabá", "Fortaleza",
            "Goiás", "Juventude", "Londrina", "Náutico", "Novorizontino",
            "Operário-PR", "Ponte Preta", "São Bernardo", "Sport Recife", "Vila Nova"
        ],
        "Série C (OVR 63)": [
            "Ferroviária", "Amazonas", "Paysandu", "Volta Redonda", "Barra",
            "Santa Cruz-PE", "Maranhão", "Inter de Limeira", "Floresta", "Confiança",
            "Ypiranga-RS", "Maringá", "Ituano", "Botafogo-PB", "Figueirense",
            "Anápolis", "Itabaiana", "Caxias", "Guarani", "Brusque"
        ],
        "Série D (OVR 58)": [
            "Retrô", "Tombense", "ABC", "CSA", "Aparecidense",
            "Nova Iguaçu", "Treze", "Sampaio Corrêa-RJ", "Gama-DF", "ASA-AL",
            "Democrata GV", "Porto-BA", "Serra Branca-PB", "Velo Clube", "Juazeirense-BA",
            "Rio Branco-ES"
        ],
        "LaLiga (OVR 77)": [
            "Real Madrid", "Barcelona", "Atlético Madrid", "Villarreal", "Real Betis",
            "Celta Vigo", "Real Sociedad", "Getafe", "Athletic Bilbao", "Valencia",
            "Sevilla", "Rayo Vallecano", "Osasuna", "Espanyol", "Alavés",
            "Levante", "Elche", "Racing Santander", "Deportivo La Coruña", "Málaga"
        ],
        "LaLiga Hypermotion (OVR 70)": [
            "Almería", "Burgos", "Cádiz", "Castellón", "Córdoba",
            "Eibar", "Granada", "Sporting Gijón", "Albacete", "Las Palmas",
            "Leganés", "Valladolid", "Ceuta", "Andorra", "Real Sociedad B",
            "Mallorca", "Girona", "Real Oviedo", "Tenerife", "Eldense",
            "Celta Fortuna", "Sabadell"
        ],
        "Bundesliga (OVR 76)": [
            "Bayern de Munique", "Bayer Leverkusen", "RB Leipzig", "Borussia Dortmund", "Eintracht Frankfurt",
            "VfB Stuttgart", "Freiburg", "Borussia Mönchengladbach", "Hoffenheim", "Werder Bremen",
            "Augsburg", "Mainz 05", "Union Berlin", "FC Köln", "Hamburger SV",
            "Schalke 04", "Elversberg", "Paderborn"
        ],
        "2. Bundesliga (OVR 69)": [
            "Greuther Fürth", "Hannover 96", "Karlsruher SC", "Nürnberg", "Braunschweig",
            "Hertha BSC", "Magdeburg", "Darmstadt 98", "Kaiserslautern", "Bochum",
            "Holstein Kiel", "Arminia Bielefeld", "Dynamo Dresden", "Wolfsburg", "Heidenheim",
            "St. Pauli", "Osnabrück", "Energie Cottbus"
        ],
        "3. Liga (OVR 63)": [
            "Verl", "Duisburg", "Rot-Weiss Essen", "Hansa Rostock", "Hoffenheim II",
            "1860 München", "Waldhof Mannheim", "VfB Stuttgart II", "Wehen Wiesbaden", "Viktoria Köln",
            "Ingolstadt", "Jahn Regensburg", "Saarbrücken", "Alemannia Aachen", "Fortuna Düsseldorf",
            "Preußen Münster", "Fortuna Köln", "SV Meppen", "Sonnenhof Großaspach", "Würzburger Kickers"
        ],
        "Serie A (OVR 76)": [
            "Atalanta", "Bologna", "Cagliari", "Como", "Fiorentina",
            "Genoa", "Inter de Milão", "Juventus", "Lazio", "Lecce",
            "AC Milan", "Napoli", "Parma", "Roma", "Sassuolo",
            "Torino", "Udinese", "Venezia", "Frosinone", "Monza"
        ],
        "Serie B (OVR 69)": [
            "Palermo", "Catanzaro", "Modena", "Juve Stabia", "Cesena",
            "Sampdoria", "Avellino", "Padova", "Virtus Entella", "Empoli",
            "Südtirol", "Carrarese", "Mantova", "Cremonese", "Verona",
            "Pisa", "Vicenza", "Arezzo", "Benevento", "Ascoli"
        ],
        "Ligue 1 (OVR 75)": [
            "Paris Saint-Germain", "Marseille", "Monaco", "Lyon", "Lille",
            "Nice", "Lens", "Strasbourg", "Toulouse", "Rennes",
            "Brest", "Le Havre", "Angers", "Auxerre", "Lorient",
            "Paris FC", "Troyes", "Le Mans"
        ],
        "Ligue 2 (OVR 68)": [
            "Annecy", "Boulogne", "Clermont Foot", "Dunkerque", "Grenoble",
            "Guingamp", "Laval", "Montpellier", "Nancy", "Pau FC",
            "Red Star", "Reims", "Rodez", "Saint-Étienne", "Nantes",
            "Metz", "Dijon", "Sochaux"
        ],
        "Portugal - Liga Portugal (OVR 74)": [
            "Benfica", "Porto", "Sporting CP", "Braga", "Vitória de Guimarães",
            "Famalicão", "Gil Vicente", "Rio Ave", "Moreirense", "Casa Pia",
            "Estoril", "Arouca", "Nacional", "Santa Clara", "Estrela da Amadora",
            "Alverca", "Marítimo", "Académico de Viseu"
        ],
        "Holanda - Eredivisie (OVR 73)": [
            "Ajax", "PSV Eindhoven", "Feyenoord", "AZ Alkmaar", "FC Twente",
            "FC Utrecht", "FC Groningen", "Sparta Rotterdam", "NEC Nijmegen", "PEC Zwolle",
            "Fortuna Sittard", "Go Ahead Eagles", "SC Heerenveen", "Excelsior", "Telstar",
            "ADO Den Haag", "Cambuur", "Willem II"
        ],
        "Turquia - Süper Lig (OVR 72)": [
            "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Başakşehir",
            "Konyaspor", "Alanyaspor", "Kasımpaşa", "Gaziantep FK", "Çaykur Rizespor",
            "Samsunspor", "Göztepe", "Eyüpspor", "Kocaelispor", "Gençlerbirliği",
            "Erzurumspor", "Amed SFK", "Çorum FK"
        ],
        "Bélgica - Pro League (OVR 71)": [
            "Club Brugge", "Union Saint-Gilloise", "Anderlecht", "Genk", "Royal Antwerp",
            "Standard Liège", "Gent", "Charleroi", "Cercle Brugge", "KV Mechelen",
            "STVV", "Westerlo", "La Louvière", "Zulte Waregem", "OH Leuven",
            "Beveren", "Kortrijk", "Lommel"
        ],
        "Escócia - Premiership (OVR 70)": [
            "Celtic", "Rangers", "Aberdeen", "Hearts", "Hibernian",
            "Dundee United", "Motherwell", "St Mirren", "Kilmarnock", "Dundee",
            "Falkirk", "St Johnstone"
        ]
    }
};

// "25/26" -> "fc26", "26/27" -> "fc27" (o segundo ano da temporada é o número da edição).
// Temporada além do que já foi pesquisado (ex: "27/28" em diante) cai na edição mais recente
// disponível — mais próximo da realidade do que travar ou ficar vazio.
function edicaoFcDaTemporada(temporada) {
    let anoDois = String(temporada || '').split('/')[1];
    let chave = anoDois ? ('fc' + anoDois) : '';
    return clubesPorLigaPorEdicao[chave] ? chave : 'fc27';
}

function clubesPorLigaDaTemporada(temporada) {
    return clubesPorLigaPorEdicao[edicaoFcDaTemporada(temporada)] || clubesPorLigaPorEdicao.fc27;
}

// Mantido por compatibilidade com qualquer código que ainda referencie clubesPorLiga direto
// (sem saber a temporada do save) — usa a edição mais recente por padrão.
const clubesPorLiga = clubesPorLigaPorEdicao.fc27;
