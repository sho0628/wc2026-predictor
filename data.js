/* =============================================================================
 *  data.js — FIFA World Cup 2026 データ
 *  出典: World Football Elo Ratings (2026-06-06), FIFA Ranking (2026-04),
 *        Wikipedia/ESPN/NBC/FIFA 公式（組分け・日程, 2025-12-05 抽選確定）,
 *        各種報道（直近フォーム・負傷, 2026-06 時点）。
 *  チームは「英語表記（組分け・日程準拠）」をキーとする。
 *  code = ISO国コード（flagcdn 用, 英=gb-eng / 蘇=gb-sct）。
 *  elo = World Football Elo / fifa = FIFAポイント / form = 直近フォーム(0-100)
 *  inj = 主な負傷 / star = 主力 （※フォーム評価対象の主要国のみ）
 * ========================================================================== */
window.WC_DATA = {
  meta: {
    title: 'FIFA World Cup 2026 — 6/11開幕（米・加・墨）',
    updated: '2026-06-08',
    sources: [
      'World Football Elo Ratings (eloratings.net, 2026-06-06)',
      'FIFA Men\'s World Ranking (2026-04)',
      '組分け・日程: FIFA公式 / Wikipedia / ESPN / NBC Sports（2025-12-05 最終抽選で確定、検証済）',
      '直近フォーム・負傷情報: ESPN / Al Jazeera / 各国協会発表（2026-06時点）',
      'WINNER仕様: JSC(日本スポーツ振興センター)プレスリリース 2026-05-22 / 楽天toto・各行ヘルプ',
      'toto/mini toto/totoGOAL3仕様・W杯対象: JSC公式・toto-dream.com / 楽天toto / Yahoo!toto（2026-05-22発表で W杯グループステージ対象を確認）',
      '予測手法: World Football Elo / Dixon-Coles(1997) / Davidson(1970) / Kelly基準'
    ]
  },

  // 高地・開催国メタ（会場文脈の自動判定に使用）
  hosts: { 'Mexico': 'MX', 'United States': 'US', 'Canada': 'CA' },
  altitudeAdapted: ['Mexico', 'Ecuador', 'Bolivia', 'Colombia', 'Peru'],
  // 高地会場（都市名で判定）
  highAltitudeCities: ['Mexico City', 'Zapopan', 'Guadalajara'],
  countryOfCity: {
    'Mexico City': 'MX', 'Zapopan': 'MX', 'Guadalajara': 'MX', 'Guadalupe, Nuevo Leon': 'MX', 'Monterrey': 'MX',
    'Toronto': 'CA', 'Vancouver': 'CA'
    /* それ以外の都市はすべて米国 */
  },
  // 各会場都市のUTCオフセット（2026年6-7月。米はDST: 東部-4/中部-5/太平洋-7、加トロント-4/バンクーバー-7、墨はDST廃止で-6）
  cityUtcOffset: {
    'Mexico City': -6, 'Zapopan': -6, 'Guadalajara': -6, 'Guadalupe, Nuevo Leon': -6, 'Monterrey': -6,
    'Atlanta': -4, 'Toronto': -4, 'East Rutherford': -4, 'Foxborough': -4, 'Philadelphia': -4, 'Miami Gardens': -4,
    'Houston': -5, 'Kansas City': -5, 'Arlington': -5,
    'Santa Clara': -7, 'Inglewood': -7, 'Seattle': -7, 'Vancouver': -7
  },

  // JSC指定のtoto対象試合（楽天toto/Yahoo!toto/toto-dream/docomoから抽出→公式日程と照合検証済）。
  // home=印「1」のチーム。toto=13試合、mini toto A=toto1〜5、mini toto B=toto6〜10、goal3=得点数予想3試合。
  // 締切は日本時間(JST)。実購入時は各販売サイトで最終確認を。
  totoCards: [
    {
      round: '第1634回', saleClose: '6/12(金) 19:00 JST', result: '6/17',
      toto: [
        ['Qatar', 'Switzerland'], ['Brazil', 'Morocco'], ['Germany', 'Curacao'], ['Netherlands', 'Japan'],
        ['Belgium', 'Egypt'], ['Canada', 'Bosnia and Herzegovina'], ['Ivory Coast', 'Ecuador'], ['Spain', 'Cape Verde'],
        ['Saudi Arabia', 'Uruguay'], ['Sweden', 'Tunisia'], ['Haiti', 'Scotland'], ['Australia', 'Turkey'], ['United States', 'Paraguay']
      ],
      goal3: [['Brazil', 'Morocco'], ['Netherlands', 'Japan'], ['Belgium', 'Egypt']]
    },
    {
      round: '第1635回', saleClose: '6/16(火) 19:00 JST', result: '6/22',
      toto: [
        ['France', 'Senegal'], ['Argentina', 'Algeria'], ['England', 'Croatia'], ['Mexico', 'South Korea'],
        ['Scotland', 'Morocco'], ['Austria', 'Jordan'], ['Uzbekistan', 'Colombia'], ['Czech Republic', 'South Africa'],
        ['Canada', 'Qatar'], ['Brazil', 'Haiti'], ['Portugal', 'DR Congo'], ['Ghana', 'Panama'], ['Switzerland', 'Bosnia and Herzegovina']
      ],
      goal3: [['England', 'Croatia'], ['Mexico', 'South Korea'], ['Scotland', 'Morocco']]
    },
    {
      round: '第1636回', saleClose: '6/20(土) 19:00 JST', result: '6/25',
      note: 'mini toto A/B の振り分けは確度中（要確認）。',
      toto: [
        ['Germany', 'Ivory Coast'], ['Tunisia', 'Japan'], ['Argentina', 'Austria'], ['Panama', 'Croatia'],
        ['Colombia', 'DR Congo'], ['Netherlands', 'Sweden'], ['Uruguay', 'Cape Verde'], ['Norway', 'Senegal'],
        ['Portugal', 'Uzbekistan'], ['Jordan', 'Algeria'], ['Spain', 'Saudi Arabia'], ['England', 'Ghana'], ['Ecuador', 'Curacao']
      ],
      goal3: [['Tunisia', 'Japan'], ['Argentina', 'Austria'], ['Panama', 'Croatia']]
    },
    {
      round: '第1637回', saleClose: '6/25(木) 19:00 JST', result: '6/29',
      toto: [
        ['Ecuador', 'Germany'], ['Japan', 'Sweden'], ['Uruguay', 'Spain'], ['Colombia', 'Portugal'],
        ['Algeria', 'Austria'], ['Tunisia', 'Netherlands'], ['Paraguay', 'Australia'], ['Norway', 'France'],
        ['Panama', 'England'], ['DR Congo', 'Uzbekistan'], ['Jordan', 'Argentina'], ['New Zealand', 'Belgium'], ['Croatia', 'Ghana']
      ],
      goal3: [['Ecuador', 'Germany'], ['Japan', 'Sweden'], ['Colombia', 'Portugal']]
    }
  ],

  // 決勝トーナメント（公式ブラケット。Wikipedia/FIFA/NBCで一致確認済。番号73-104）。
  // slot: "1A"(A組1位) "2B"(B組2位) "3(C/E/..)"(3位枠の候補) "W73"(第73試合勝者) "L101"(敗者)。
  // 開始時刻は現地・暫定（timeLocal）。表示はJSTに変換。
  knockout: [
    { round: 'R32', matches: [
      { matchNo: 73, date: '2026-06-28', timeLocal: '12:00', city: 'Inglewood', venue: 'SoFi Stadium', slotA: '2A', slotB: '2B' },
      { matchNo: 74, date: '2026-06-29', timeLocal: '16:30', city: 'Foxborough', venue: 'Gillette Stadium', slotA: '1E', slotB: '3(A/B/C/D/F)' },
      { matchNo: 75, date: '2026-06-29', timeLocal: '19:00', city: 'Guadalupe, Nuevo Leon', venue: 'Estadio BBVA', slotA: '1F', slotB: '2C' },
      { matchNo: 76, date: '2026-06-29', timeLocal: '12:00', city: 'Houston', venue: 'NRG Stadium', slotA: '1C', slotB: '2F' },
      { matchNo: 77, date: '2026-06-30', timeLocal: '17:00', city: 'East Rutherford', venue: 'MetLife Stadium', slotA: '1I', slotB: '3(C/D/F/G/H)' },
      { matchNo: 78, date: '2026-06-30', timeLocal: '12:00', city: 'Arlington', venue: 'AT&T Stadium', slotA: '2E', slotB: '2I' },
      { matchNo: 79, date: '2026-06-30', timeLocal: '19:00', city: 'Mexico City', venue: 'Estadio Azteca', slotA: '1A', slotB: '3(C/E/F/H/I)' },
      { matchNo: 80, date: '2026-07-01', timeLocal: '12:00', city: 'Atlanta', venue: 'Mercedes-Benz Stadium', slotA: '1L', slotB: '3(E/H/I/J/K)' },
      { matchNo: 81, date: '2026-07-01', timeLocal: '17:00', city: 'Santa Clara', venue: "Levi's Stadium", slotA: '1D', slotB: '3(B/E/F/I/J)' },
      { matchNo: 82, date: '2026-07-01', timeLocal: '13:00', city: 'Seattle', venue: 'Lumen Field', slotA: '1G', slotB: '3(A/E/H/I/J)' },
      { matchNo: 83, date: '2026-07-02', timeLocal: '19:00', city: 'Toronto', venue: 'BMO Field', slotA: '2K', slotB: '2L' },
      { matchNo: 84, date: '2026-07-02', timeLocal: '12:00', city: 'Inglewood', venue: 'SoFi Stadium', slotA: '1H', slotB: '2J' },
      { matchNo: 85, date: '2026-07-02', timeLocal: '20:00', city: 'Vancouver', venue: 'BC Place', slotA: '1B', slotB: '3(E/F/G/I/J)' },
      { matchNo: 86, date: '2026-07-03', timeLocal: '18:00', city: 'Miami Gardens', venue: 'Hard Rock Stadium', slotA: '1J', slotB: '2H' },
      { matchNo: 87, date: '2026-07-03', timeLocal: '20:30', city: 'Kansas City', venue: 'Arrowhead Stadium', slotA: '1K', slotB: '3(D/E/I/J/L)' },
      { matchNo: 88, date: '2026-07-03', timeLocal: '13:00', city: 'Arlington', venue: 'AT&T Stadium', slotA: '2D', slotB: '2G' }
    ]},
    { round: 'R16', matches: [
      { matchNo: 89, date: '2026-07-04', timeLocal: '17:00', city: 'Philadelphia', venue: 'Lincoln Financial Field', slotA: 'W74', slotB: 'W77' },
      { matchNo: 90, date: '2026-07-04', timeLocal: '12:00', city: 'Houston', venue: 'NRG Stadium', slotA: 'W73', slotB: 'W75' },
      { matchNo: 91, date: '2026-07-05', timeLocal: '16:00', city: 'East Rutherford', venue: 'MetLife Stadium', slotA: 'W76', slotB: 'W78' },
      { matchNo: 92, date: '2026-07-05', timeLocal: '18:00', city: 'Mexico City', venue: 'Estadio Azteca', slotA: 'W79', slotB: 'W80' },
      { matchNo: 93, date: '2026-07-06', timeLocal: '14:00', city: 'Arlington', venue: 'AT&T Stadium', slotA: 'W83', slotB: 'W84' },
      { matchNo: 94, date: '2026-07-06', timeLocal: '17:00', city: 'Seattle', venue: 'Lumen Field', slotA: 'W81', slotB: 'W82' },
      { matchNo: 95, date: '2026-07-07', timeLocal: '12:00', city: 'Atlanta', venue: 'Mercedes-Benz Stadium', slotA: 'W86', slotB: 'W88' },
      { matchNo: 96, date: '2026-07-07', timeLocal: '13:00', city: 'Vancouver', venue: 'BC Place', slotA: 'W85', slotB: 'W87' }
    ]},
    { round: 'QF', matches: [
      { matchNo: 97, date: '2026-07-09', timeLocal: '16:00', city: 'Foxborough', venue: 'Gillette Stadium', slotA: 'W89', slotB: 'W90' },
      { matchNo: 98, date: '2026-07-10', timeLocal: '12:00', city: 'Inglewood', venue: 'SoFi Stadium', slotA: 'W93', slotB: 'W94' },
      { matchNo: 99, date: '2026-07-11', timeLocal: '17:00', city: 'Miami Gardens', venue: 'Hard Rock Stadium', slotA: 'W91', slotB: 'W92' },
      { matchNo: 100, date: '2026-07-11', timeLocal: '20:00', city: 'Kansas City', venue: 'Arrowhead Stadium', slotA: 'W95', slotB: 'W96' }
    ]},
    { round: 'SF', matches: [
      { matchNo: 101, date: '2026-07-14', timeLocal: '14:00', city: 'Arlington', venue: 'AT&T Stadium', slotA: 'W97', slotB: 'W98' },
      { matchNo: 102, date: '2026-07-15', timeLocal: '15:00', city: 'Atlanta', venue: 'Mercedes-Benz Stadium', slotA: 'W99', slotB: 'W100' }
    ]},
    { round: '3rd', matches: [
      { matchNo: 103, date: '2026-07-18', timeLocal: '17:00', city: 'Miami Gardens', venue: 'Hard Rock Stadium', slotA: 'L101', slotB: 'L102' }
    ]},
    { round: 'Final', matches: [
      { matchNo: 104, date: '2026-07-19', timeLocal: '15:00', city: 'East Rutherford', venue: 'MetLife Stadium', slotA: 'W101', slotB: 'W102' }
    ]}
  ],

  teams: {
    // --- ポット級・優勝候補 ---
    'Spain':                  { code: 'es', elo: 2155, fifa: 1876.4,  fifaRank: 2,  form: 84, star: 'Yamal, Pedri, Rodri', inj: 'Yamalハム(開幕戦は微妙)' },
    'Argentina':              { code: 'ar', elo: 2114, fifa: 1874.81, fifaRank: 3,  form: 90, star: 'Messi, L.Martínez', inj: 'Messi軽い疲労(復帰見込)' },
    'France':                 { code: 'fr', elo: 2062, fifa: 1877.32, fifaRank: 1,  form: 86, star: 'Mbappé, Dembélé', inj: 'Mbappé太もも(出場見込/要監視)' },
    'England':                { code: 'gb-eng', elo: 2021, fifa: 1825.97, fifaRank: 4, form: 83, star: 'Kane, Bellingham, Saka', inj: 'Livramento/Spence軽傷' },
    'Brazil':                 { code: 'br', elo: 1991, fifa: 1761.16, fifaRank: 6,  form: 78, star: 'Vinícius Jr, Raphinha', inj: 'Neymarフィットネス不安' },
    'Portugal':               { code: 'pt', elo: 1986, fifa: 1763.83, fifaRank: 5,  form: 80, star: 'Ronaldo, B.Fernandes, Vitinha', inj: '大きな負傷なし' },
    'Colombia':               { code: 'co', elo: 1982, fifa: 1693.09, fifaRank: 13, form: 74, star: 'J.Rodríguez, L.Díaz', inj: 'James軽い痛み' },
    'Netherlands':            { code: 'nl', elo: 1944, fifa: 1757.87, fifaRank: 7,  form: 79, star: 'van Dijk, Gakpo, de Jong', inj: 'X.Simons ACL(離脱)' },
    'Ecuador':                { code: 'ec', elo: 1938, fifa: 1595,    fifaRank: 23, form: 74, star: 'Caicedo, Hincapié', inj: '大きな負傷なし' },
    'Germany':                { code: 'de', elo: 1932, fifa: 1730.37, fifaRank: 10, form: 73, star: 'Wirtz, Musiala, Kimmich' },
    'Norway':                 { code: 'no', elo: 1914, fifa: 1551,    fifaRank: 31, form: 75, star: 'Haaland, Ødegaard', inj: '大きな負傷なし' },
    'Croatia':                { code: 'hr', elo: 1911, fifa: 1717.07, fifaRank: 11, form: 74, star: 'Modrić, Perišić', inj: '高齢化が懸念' },
    'Turkey':                 { code: 'tr', elo: 1911, fifa: 1599,    fifaRank: 22, star: 'Güler, Çalhanoğlu' },
    'Japan':                  { code: 'jp', elo: 1906, fifa: 1660.43, fifaRank: 18, form: 72, star: 'Kubo, Endō, Kamada', inj: '三笘ハム/南野ACL離脱(痛手)' },
    'Belgium':                { code: 'be', elo: 1893, fifa: 1734.71, fifaRank: 9,  form: 75, star: 'De Bruyne, Doku, Courtois', inj: 'De Bruyne/Lukaku軽傷(出場)' },
    'Uruguay':                { code: 'uy', elo: 1892, fifa: 1673.07, fifaRank: 17, form: 76, star: 'Valverde, Núñez, Araújo', inj: 'Núñez実戦不足' },
    'Switzerland':            { code: 'ch', elo: 1891, fifa: 1649.4,  fifaRank: 19, form: 70, star: 'Xhaka, Akanji, Embolo', inj: '大きな負傷なし' },
    'Mexico':                 { code: 'mx', elo: 1875, fifa: 1681.03, fifaRank: 15, form: 70, star: 'E.Álvarez, R.Jiménez, Ochoa', inj: 'Malagón ACL等' },
    'Senegal':                { code: 'sn', elo: 1867, fifa: 1688.99, fifaRank: 14, form: 77, star: 'Mané, N.Jackson, I.Sarr', inj: '大きな負傷なし' },
    'Paraguay':               { code: 'py', elo: 1833, fifa: 1504,    fifaRank: 40, star: 'Almirón, Sanabria' },
    'Austria':                { code: 'at', elo: 1830, fifa: 1593,    fifaRank: 24, star: 'Arnautović, Sabitzer' },
    'Morocco':                { code: 'ma', elo: 1827, fifa: 1755.87, fifaRank: 8,  form: 80, star: 'Hakimi, Brahim Díaz', inj: 'Hakimi軽傷(出場)' },
    'Canada':                 { code: 'ca', elo: 1788, fifa: 1556,    fifaRank: 30, star: 'A.Davies, J.David' },
    'Scotland':               { code: 'gb-sct', elo: 1782, fifa: 1498, fifaRank: 43, star: 'McTominay, Robertson' },
    'Australia':              { code: 'au', elo: 1777, fifa: 1581,    fifaRank: 27, star: 'Irvine, Goodwin' },
    'Iran':                   { code: 'ir', elo: 1772, fifa: 1615,    fifaRank: 21, star: 'Taremi, Azmoun' },
    'Algeria':                { code: 'dz', elo: 1760, fifa: 1564,    fifaRank: 28, star: 'Mahrez, Amoura' },
    'South Korea':            { code: 'kr', elo: 1758, fifa: 1589,    fifaRank: 25, star: 'Son Heung-min, Lee Kang-in' },
    'United States':          { code: 'us', elo: 1726, fifa: 1673.13, fifaRank: 16, form: 68, star: 'Pulisic, T.Adams, McKennie', inj: 'Tessmann離脱(他は健康)' },
    'Panama':                 { code: 'pa', elo: 1730, fifa: 1541,    fifaRank: 33, star: 'Carrasquilla' },
    'Uzbekistan':             { code: 'uz', elo: 1718, fifa: 1465,    fifaRank: 50, star: 'Shomurodov' },
    'Sweden':                 { code: 'se', elo: 1712, fifa: 1515,    fifaRank: 38, star: 'Isak, Gyökeres' },
    'Egypt':                  { code: 'eg', elo: 1696, fifa: 1563,    fifaRank: 29, star: 'M.Salah' },
    'Ivory Coast':            { code: 'ci', elo: 1695, fifa: 1533,    fifaRank: 34, form: 72, star: 'Amad Diallo', inj: '大きな負傷なし(直近で仏に勝利)' },
    'Jordan':                 { code: 'jo', elo: 1680, fifa: 1391,    fifaRank: 63, star: 'Al-Naimat' },
    'DR Congo':               { code: 'cd', elo: 1661, fifa: 1478,    fifaRank: 46, star: 'Bakambu, Wissa' },
    'Tunisia':                { code: 'tn', elo: 1628, fifa: 1483,    fifaRank: 44, star: 'Msakni' },
    'Iraq':                   { code: 'iq', elo: 1618, fifa: 1447,    fifaRank: 57, star: 'Aymen Hussein' },
    'Bosnia and Herzegovina': { code: 'ba', elo: 1595, fifa: 1386,    fifaRank: 65, star: 'Džeko, Tabaković' },
    'Cape Verde':             { code: 'cv', elo: 1578, fifa: 1366,    fifaRank: 69, star: 'Ryan Mendes' },
    'Saudi Arabia':           { code: 'sa', elo: 1569, fifa: 1421,    fifaRank: 61, star: 'Al-Dawsari' },
    'New Zealand':            { code: 'nz', elo: 1562, fifa: 1282,    fifaRank: 85, star: 'C.Wood' },
    'Haiti':                  { code: 'ht', elo: 1548, fifa: 1292,    fifaRank: 83, star: 'Pierrot' },
    'South Africa':           { code: 'za', elo: 1528, fifa: 1430,    fifaRank: 60, star: 'Mofokeng' },
    'Czech Republic':         { code: 'cz', elo: 1740, fifa: 1501,    fifaRank: 41, star: 'Schick, Souček' },
    'Ghana':                  { code: 'gh', elo: 1510, fifa: 1346,    fifaRank: 73, star: 'Kudus, J.Ayew' },
    'Curacao':                { code: 'cw', elo: 1434, fifa: 1295,    fifaRank: 82, star: 'Bacuna' },
    'Qatar':                  { code: 'qa', elo: 1421, fifa: 1455,    fifaRank: 55, star: 'Akram Afif' }
  },

  groups: [
    { group: 'A', teams: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'] },
    { group: 'B', teams: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'] },
    { group: 'C', teams: ['Brazil', 'Morocco', 'Haiti', 'Scotland'] },
    { group: 'D', teams: ['United States', 'Paraguay', 'Australia', 'Turkey'] },
    { group: 'E', teams: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'] },
    { group: 'F', teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'] },
    { group: 'G', teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'] },
    { group: 'H', teams: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'] },
    { group: 'I', teams: ['France', 'Senegal', 'Iraq', 'Norway'] },
    { group: 'J', teams: ['Argentina', 'Algeria', 'Austria', 'Jordan'] },
    { group: 'K', teams: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'] },
    { group: 'L', teams: ['England', 'Croatia', 'Ghana', 'Panama'] }
  ],

  // 全72グループ戦（現地日付・現地時刻）
  schedule: [
    { date: '2026-06-11', timeLocal: '13:00', teamA: 'Mexico', teamB: 'South Africa', group: 'A', city: 'Mexico City', venue: 'Estadio Azteca' },
    { date: '2026-06-11', timeLocal: '20:00', teamA: 'South Korea', teamB: 'Czech Republic', group: 'A', city: 'Zapopan', venue: 'Estadio Akron' },
    { date: '2026-06-18', timeLocal: '12:00', teamA: 'Czech Republic', teamB: 'South Africa', group: 'A', city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { date: '2026-06-18', timeLocal: '19:00', teamA: 'Mexico', teamB: 'South Korea', group: 'A', city: 'Zapopan', venue: 'Estadio Akron' },
    { date: '2026-06-24', timeLocal: '19:00', teamA: 'Czech Republic', teamB: 'Mexico', group: 'A', city: 'Mexico City', venue: 'Estadio Azteca' },
    { date: '2026-06-24', timeLocal: '19:00', teamA: 'South Africa', teamB: 'South Korea', group: 'A', city: 'Guadalupe, Nuevo Leon', venue: 'Estadio BBVA' },

    { date: '2026-06-12', timeLocal: '15:00', teamA: 'Canada', teamB: 'Bosnia and Herzegovina', group: 'B', city: 'Toronto', venue: 'BMO Field' },
    { date: '2026-06-13', timeLocal: '12:00', teamA: 'Qatar', teamB: 'Switzerland', group: 'B', city: 'Santa Clara', venue: "Levi's Stadium" },
    { date: '2026-06-18', timeLocal: '12:00', teamA: 'Switzerland', teamB: 'Bosnia and Herzegovina', group: 'B', city: 'Inglewood', venue: 'SoFi Stadium' },
    { date: '2026-06-18', timeLocal: '15:00', teamA: 'Canada', teamB: 'Qatar', group: 'B', city: 'Vancouver', venue: 'BC Place' },
    { date: '2026-06-24', timeLocal: '12:00', teamA: 'Switzerland', teamB: 'Canada', group: 'B', city: 'Vancouver', venue: 'BC Place' },
    { date: '2026-06-24', timeLocal: '12:00', teamA: 'Bosnia and Herzegovina', teamB: 'Qatar', group: 'B', city: 'Seattle', venue: 'Lumen Field' },

    { date: '2026-06-13', timeLocal: '18:00', teamA: 'Brazil', teamB: 'Morocco', group: 'C', city: 'East Rutherford', venue: 'MetLife Stadium' },
    { date: '2026-06-13', timeLocal: '21:00', teamA: 'Haiti', teamB: 'Scotland', group: 'C', city: 'Foxborough', venue: 'Gillette Stadium' },
    { date: '2026-06-19', timeLocal: '18:00', teamA: 'Scotland', teamB: 'Morocco', group: 'C', city: 'Foxborough', venue: 'Gillette Stadium' },
    { date: '2026-06-19', timeLocal: '21:00', teamA: 'Brazil', teamB: 'Haiti', group: 'C', city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { date: '2026-06-24', timeLocal: '18:00', teamA: 'Scotland', teamB: 'Brazil', group: 'C', city: 'Miami Gardens', venue: 'Hard Rock Stadium' },
    { date: '2026-06-24', timeLocal: '18:00', teamA: 'Morocco', teamB: 'Haiti', group: 'C', city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },

    { date: '2026-06-12', timeLocal: '18:00', teamA: 'United States', teamB: 'Paraguay', group: 'D', city: 'Inglewood', venue: 'SoFi Stadium' },
    { date: '2026-06-13', timeLocal: '21:00', teamA: 'Australia', teamB: 'Turkey', group: 'D', city: 'Vancouver', venue: 'BC Place' },
    { date: '2026-06-19', timeLocal: '12:00', teamA: 'United States', teamB: 'Australia', group: 'D', city: 'Seattle', venue: 'Lumen Field' },
    { date: '2026-06-19', timeLocal: '20:00', teamA: 'Turkey', teamB: 'Paraguay', group: 'D', city: 'Santa Clara', venue: "Levi's Stadium" },
    { date: '2026-06-25', timeLocal: '19:00', teamA: 'Turkey', teamB: 'United States', group: 'D', city: 'Inglewood', venue: 'SoFi Stadium' },
    { date: '2026-06-25', timeLocal: '19:00', teamA: 'Paraguay', teamB: 'Australia', group: 'D', city: 'Santa Clara', venue: "Levi's Stadium" },

    { date: '2026-06-14', timeLocal: '12:00', teamA: 'Germany', teamB: 'Curacao', group: 'E', city: 'Houston', venue: 'NRG Stadium' },
    { date: '2026-06-14', timeLocal: '19:00', teamA: 'Ivory Coast', teamB: 'Ecuador', group: 'E', city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { date: '2026-06-20', timeLocal: '16:00', teamA: 'Germany', teamB: 'Ivory Coast', group: 'E', city: 'Toronto', venue: 'BMO Field' },
    { date: '2026-06-20', timeLocal: '19:00', teamA: 'Ecuador', teamB: 'Curacao', group: 'E', city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { date: '2026-06-25', timeLocal: '16:00', teamA: 'Curacao', teamB: 'Ivory Coast', group: 'E', city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { date: '2026-06-25', timeLocal: '16:00', teamA: 'Ecuador', teamB: 'Germany', group: 'E', city: 'East Rutherford', venue: 'MetLife Stadium' },

    { date: '2026-06-14', timeLocal: '15:00', teamA: 'Netherlands', teamB: 'Japan', group: 'F', city: 'Arlington', venue: 'AT&T Stadium' },
    { date: '2026-06-14', timeLocal: '20:00', teamA: 'Sweden', teamB: 'Tunisia', group: 'F', city: 'Guadalupe, Nuevo Leon', venue: 'Estadio BBVA' },
    { date: '2026-06-20', timeLocal: '12:00', teamA: 'Netherlands', teamB: 'Sweden', group: 'F', city: 'Houston', venue: 'NRG Stadium' },
    { date: '2026-06-20', timeLocal: '22:00', teamA: 'Tunisia', teamB: 'Japan', group: 'F', city: 'Guadalupe, Nuevo Leon', venue: 'Estadio BBVA' },
    { date: '2026-06-25', timeLocal: '18:00', teamA: 'Japan', teamB: 'Sweden', group: 'F', city: 'Arlington', venue: 'AT&T Stadium' },
    { date: '2026-06-25', timeLocal: '18:00', teamA: 'Tunisia', teamB: 'Netherlands', group: 'F', city: 'Kansas City', venue: 'Arrowhead Stadium' },

    { date: '2026-06-15', timeLocal: '12:00', teamA: 'Belgium', teamB: 'Egypt', group: 'G', city: 'Seattle', venue: 'Lumen Field' },
    { date: '2026-06-15', timeLocal: '18:00', teamA: 'Iran', teamB: 'New Zealand', group: 'G', city: 'Inglewood', venue: 'SoFi Stadium' },
    { date: '2026-06-21', timeLocal: '12:00', teamA: 'Belgium', teamB: 'Iran', group: 'G', city: 'Inglewood', venue: 'SoFi Stadium' },
    { date: '2026-06-21', timeLocal: '18:00', teamA: 'New Zealand', teamB: 'Egypt', group: 'G', city: 'Vancouver', venue: 'BC Place' },
    { date: '2026-06-26', timeLocal: '20:00', teamA: 'Egypt', teamB: 'Iran', group: 'G', city: 'Seattle', venue: 'Lumen Field' },
    { date: '2026-06-26', timeLocal: '20:00', teamA: 'New Zealand', teamB: 'Belgium', group: 'G', city: 'Vancouver', venue: 'BC Place' },

    { date: '2026-06-15', timeLocal: '12:00', teamA: 'Spain', teamB: 'Cape Verde', group: 'H', city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { date: '2026-06-15', timeLocal: '18:00', teamA: 'Saudi Arabia', teamB: 'Uruguay', group: 'H', city: 'Miami Gardens', venue: 'Hard Rock Stadium' },
    { date: '2026-06-21', timeLocal: '12:00', teamA: 'Spain', teamB: 'Saudi Arabia', group: 'H', city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { date: '2026-06-21', timeLocal: '18:00', teamA: 'Uruguay', teamB: 'Cape Verde', group: 'H', city: 'Miami Gardens', venue: 'Hard Rock Stadium' },
    { date: '2026-06-26', timeLocal: '18:00', teamA: 'Uruguay', teamB: 'Spain', group: 'H', city: 'Zapopan', venue: 'Estadio Akron' },
    { date: '2026-06-26', timeLocal: '19:00', teamA: 'Cape Verde', teamB: 'Saudi Arabia', group: 'H', city: 'Houston', venue: 'NRG Stadium' },

    { date: '2026-06-16', timeLocal: '15:00', teamA: 'France', teamB: 'Senegal', group: 'I', city: 'East Rutherford', venue: 'MetLife Stadium' },
    { date: '2026-06-16', timeLocal: '18:00', teamA: 'Iraq', teamB: 'Norway', group: 'I', city: 'Foxborough', venue: 'Gillette Stadium' },
    { date: '2026-06-22', timeLocal: '17:00', teamA: 'France', teamB: 'Iraq', group: 'I', city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { date: '2026-06-22', timeLocal: '20:00', teamA: 'Norway', teamB: 'Senegal', group: 'I', city: 'East Rutherford', venue: 'MetLife Stadium' },
    { date: '2026-06-26', timeLocal: '15:00', teamA: 'Norway', teamB: 'France', group: 'I', city: 'Foxborough', venue: 'Gillette Stadium' },
    { date: '2026-06-26', timeLocal: '15:00', teamA: 'Senegal', teamB: 'Iraq', group: 'I', city: 'Toronto', venue: 'BMO Field' },

    { date: '2026-06-16', timeLocal: '20:00', teamA: 'Argentina', teamB: 'Algeria', group: 'J', city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { date: '2026-06-16', timeLocal: '21:00', teamA: 'Austria', teamB: 'Jordan', group: 'J', city: 'Santa Clara', venue: "Levi's Stadium" },
    { date: '2026-06-22', timeLocal: '12:00', teamA: 'Argentina', teamB: 'Austria', group: 'J', city: 'Arlington', venue: 'AT&T Stadium' },
    { date: '2026-06-22', timeLocal: '20:00', teamA: 'Jordan', teamB: 'Algeria', group: 'J', city: 'Santa Clara', venue: "Levi's Stadium" },
    { date: '2026-06-27', timeLocal: '21:00', teamA: 'Algeria', teamB: 'Austria', group: 'J', city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { date: '2026-06-27', timeLocal: '21:00', teamA: 'Jordan', teamB: 'Argentina', group: 'J', city: 'Arlington', venue: 'AT&T Stadium' },

    { date: '2026-06-17', timeLocal: '12:00', teamA: 'Portugal', teamB: 'DR Congo', group: 'K', city: 'Houston', venue: 'NRG Stadium' },
    { date: '2026-06-17', timeLocal: '20:00', teamA: 'Uzbekistan', teamB: 'Colombia', group: 'K', city: 'Mexico City', venue: 'Estadio Azteca' },
    { date: '2026-06-23', timeLocal: '12:00', teamA: 'Portugal', teamB: 'Uzbekistan', group: 'K', city: 'Houston', venue: 'NRG Stadium' },
    { date: '2026-06-23', timeLocal: '20:00', teamA: 'Colombia', teamB: 'DR Congo', group: 'K', city: 'Zapopan', venue: 'Estadio Akron' },
    { date: '2026-06-27', timeLocal: '19:30', teamA: 'Colombia', teamB: 'Portugal', group: 'K', city: 'Miami Gardens', venue: 'Hard Rock Stadium' },
    { date: '2026-06-27', timeLocal: '19:30', teamA: 'DR Congo', teamB: 'Uzbekistan', group: 'K', city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },

    { date: '2026-06-17', timeLocal: '15:00', teamA: 'England', teamB: 'Croatia', group: 'L', city: 'Arlington', venue: 'AT&T Stadium' },
    { date: '2026-06-17', timeLocal: '19:00', teamA: 'Ghana', teamB: 'Panama', group: 'L', city: 'Toronto', venue: 'BMO Field' },
    { date: '2026-06-23', timeLocal: '16:00', teamA: 'England', teamB: 'Ghana', group: 'L', city: 'Foxborough', venue: 'Gillette Stadium' },
    { date: '2026-06-23', timeLocal: '19:00', teamA: 'Panama', teamB: 'Croatia', group: 'L', city: 'Toronto', venue: 'BMO Field' },
    { date: '2026-06-27', timeLocal: '17:00', teamA: 'Panama', teamB: 'England', group: 'L', city: 'East Rutherford', venue: 'MetLife Stadium' },
    { date: '2026-06-27', timeLocal: '17:00', teamA: 'Croatia', teamB: 'Ghana', group: 'L', city: 'Philadelphia', venue: 'Lincoln Financial Field' }
  ]
};
