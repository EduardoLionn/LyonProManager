// Base de clubes reais por liga/divisão, usada apenas para PREENCHER SUGESTÕES
// na tela de "Novo Jogo". Não trava a temporada: o jogador sempre pode digitar
// o nome de qualquer outro clube (opção "Outro clube..."), então isso funciona
// para qualquer edição/ano de FIFA ou eFootball.
const clubesPorLiga = {
    "Premier League (OVR 77)": [
        "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton & Hove Albion",
        "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich Town",
        "Leicester City", "Liverpool", "Manchester City", "Manchester United", "Newcastle United",
        "Nottingham Forest", "Southampton", "Tottenham Hotspur", "West Ham United", "Wolverhampton Wanderers"
    ],
    "Championship (OVR 70)": [
        "Leeds United", "Burnley", "Sheffield United", "Sheffield Wednesday", "West Bromwich Albion",
        "Sunderland", "Norwich City", "Middlesbrough", "Coventry City", "Hull City",
        "Preston North End", "Bristol City", "Cardiff City", "Swansea City", "Watford",
        "Millwall", "Blackburn Rovers", "Stoke City", "Queens Park Rangers", "Derby County",
        "Plymouth Argyle", "Portsmouth", "Oxford United", "Luton Town"
    ],
    "League One (OVR 64)": [
        "Birmingham City", "Wrexham", "Bolton Wanderers", "Barnsley", "Reading",
        "Wigan Athletic", "Charlton Athletic", "Rotherham United", "Peterborough United", "Lincoln City",
        "Blackpool", "Huddersfield Town", "Stockport County", "Leyton Orient", "Exeter City",
        "Wycombe Wanderers", "Northampton Town", "Mansfield Town", "Cambridge United", "Bristol Rovers",
        "Burton Albion", "Crawley Town", "Stevenage"
    ],
    "League Two (OVR 60)": [
        "Notts County", "Doncaster Rovers", "Port Vale", "Bradford City", "Fleetwood Town",
        "Walsall", "Swindon Town", "Colchester United", "Salford City", "Grimsby Town",
        "Accrington Stanley", "Newport County", "Crewe Alexandra", "Gillingham", "Harrogate Town",
        "Barrow", "Tranmere Rovers", "Milton Keynes Dons", "Morecambe", "Carlisle United",
        "Chesterfield", "Cheltenham Town"
    ],
    "Brasileirão Série A (OVR 74)": [
        "Flamengo", "Palmeiras", "São Paulo", "Corinthians", "Santos",
        "Grêmio", "Internacional", "Atlético Mineiro", "Cruzeiro", "Botafogo",
        "Fluminense", "Vasco da Gama", "Bahia", "Fortaleza", "Ceará",
        "Red Bull Bragantino", "Athletico Paranaense", "Vitória", "Criciúma", "Juventude"
    ],
    "Série B (OVR 68)": [
        "Sport Recife", "Coritiba", "Goiás", "Guarani", "Ponte Preta",
        "Novorizontino", "América-MG", "Avaí", "Chapecoense", "CRB",
        "Operário-PR", "Paysandu", "Amazonas", "Botafogo-SP", "Vila Nova",
        "Mirassol", "Ituano", "Brusque", "Sampaio Corrêa", "CSA"
    ],
    "Série C (OVR 63)": [
        "Remo", "Náutico", "ABC", "Confiança", "Ferroviária",
        "Volta Redonda", "São Bernardo", "Floresta", "Tombense", "Caxias",
        "Botafogo-PB", "Ypiranga-RS", "São José-RS", "Maringá", "Figueirense", "Itabaiana"
    ],
    "Série D (OVR 58)": [
        "Treze", "Central", "Sousa", "Petrolina", "Manaus",
        "Nova Iguaçu", "Cianorte", "Camboriú", "Aparecidense", "Retrô",
        "Barra", "Uniclinic"
    ],
    "LaLiga (OVR 77)": [
        "Real Madrid", "Barcelona", "Atlético Madrid", "Real Sociedad", "Real Betis",
        "Villarreal", "Athletic Bilbao", "Valencia", "Sevilla", "Celta Vigo",
        "Osasuna", "Girona", "Getafe", "Mallorca", "Rayo Vallecano",
        "Las Palmas", "Alavés", "Espanyol", "Leganés", "Valladolid"
    ],
    "LaLiga Hypermotion (OVR 70)": [
        "Levante", "Racing Santander", "Real Zaragoza", "Real Oviedo", "Sporting Gijón",
        "Eibar", "Almería", "Granada", "Cádiz", "Burgos",
        "Mirandés", "Elche", "Córdoba", "Málaga", "Huesca",
        "Albacete", "Castellón", "Tenerife", "Ferrol", "Deportivo La Coruña", "Cartagena", "Eldense"
    ],
    "Bundesliga (OVR 76)": [
        "Bayern de Munique", "Borussia Dortmund", "RB Leipzig", "Bayer Leverkusen", "Eintracht Frankfurt",
        "VfB Stuttgart", "Borussia Mönchengladbach", "Wolfsburg", "Union Berlin", "Werder Bremen",
        "Freiburg", "Mainz 05", "Augsburg", "Hoffenheim", "FC Köln",
        "Heidenheim", "Bochum", "St. Pauli"
    ],
    "2. Bundesliga (OVR 69)": [
        "Hamburger SV", "Hertha BSC", "Schalke 04", "Fortuna Düsseldorf", "Hannover 96",
        "Kaiserslautern", "Karlsruher SC", "Greuther Fürth", "Nürnberg", "Paderborn",
        "Braunschweig", "Elversberg", "Magdeburg", "Preußen Münster", "Darmstadt 98",
        "Ulm", "Regensburg", "Osnabrück"
    ],
    "3. Liga (OVR 63)": [
        "Dynamo Dresden", "Rot-Weiss Essen", "Waldhof Mannheim", "Erzgebirge Aue", "Energie Cottbus",
        "1860 München", "Saarbrücken", "Viktoria Köln", "Hansa Rostock", "Ingolstadt",
        "Unterhaching", "Verl", "Sandhausen", "Wehen Wiesbaden", "Halle",
        "Duisburg", "Alemannia Aachen", "Freiburg II"
    ],
    "Serie A (OVR 76)": [
        "Inter de Milão", "AC Milan", "Juventus", "Napoli", "Roma",
        "Lazio", "Atalanta", "Fiorentina", "Bologna", "Torino",
        "Udinese", "Sassuolo", "Genoa", "Cagliari", "Verona",
        "Empoli", "Lecce", "Parma", "Como", "Venezia"
    ],
    "Serie B (OVR 69)": [
        "Palermo", "Bari", "Sampdoria", "Cremonese", "Pisa",
        "Spezia", "Catanzaro", "Modena", "Cittadella", "Cosenza",
        "Cesena", "Südtirol", "Frosinone", "Salernitana", "Reggiana",
        "Brescia", "Mantova", "Carrarese", "Sudtirol B", "Juve Stabia"
    ],
    "Ligue 1 (OVR 75)": [
        "Paris Saint-Germain", "Marseille", "Monaco", "Lyon", "Lille",
        "Nice", "Rennes", "Lens", "Strasbourg", "Toulouse",
        "Nantes", "Montpellier", "Reims", "Brest", "Le Havre",
        "Angers", "Auxerre", "Metz"
    ],
    "Ligue 2 (OVR 68)": [
        "Saint-Étienne", "Bordeaux", "Guingamp", "Amiens", "Laval",
        "Grenoble", "Troyes", "Pau FC", "Rodez", "Annecy",
        "Dunkerque", "Clermont Foot", "Ajaccio", "Bastia", "Caen",
        "Concarneau", "Red Star", "Martigues"
    ],
    "Portugal - Liga Portugal (OVR 74)": [
        "Benfica", "Porto", "Sporting CP", "Braga", "Vitória de Guimarães",
        "Boavista", "Famalicão", "Gil Vicente", "Rio Ave", "Moreirense",
        "Casa Pia", "Estoril", "Arouca", "Farense", "Nacional",
        "Santa Clara", "Estrela da Amadora", "AVS"
    ],
    "Holanda - Eredivisie (OVR 73)": [
        "Ajax", "PSV Eindhoven", "Feyenoord", "AZ Alkmaar", "FC Twente",
        "FC Utrecht", "Vitesse", "SC Heerenveen", "Sparta Rotterdam", "NEC Nijmegen",
        "Go Ahead Eagles", "PEC Zwolle", "Fortuna Sittard", "Willem II", "Heracles Almelo",
        "RKC Waalwijk", "NAC Breda", "Almere City"
    ],
    "Turquia - Süper Lig (OVR 72)": [
        "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Başakşehir",
        "Adana Demirspor", "Antalyaspor", "Kayserispor", "Konyaspor", "Sivasspor",
        "Alanyaspor", "Kasımpaşa", "Gaziantep FK", "Çaykur Rizespor", "Samsunspor",
        "Göztepe", "Hatayspor", "Eyüpspor", "Bodrumspor", "Kocaelispor"
    ],
    "Bélgica - Pro League (OVR 71)": [
        "Club Brugge", "Anderlecht", "Genk", "Royal Antwerp", "Union Saint-Gilloise",
        "Standard Liège", "Gent", "Charleroi", "Cercle Brugge", "KV Mechelen",
        "OH Leuven", "STVV", "Westerlo", "RWDM", "Dender", "Kortrijk"
    ],
    "Escócia - Premiership (OVR 70)": [
        "Celtic", "Rangers", "Aberdeen", "Hearts", "Hibernian",
        "Dundee United", "Motherwell", "St Mirren", "Kilmarnock", "Dundee",
        "Ross County", "St Johnstone"
    ]
};
