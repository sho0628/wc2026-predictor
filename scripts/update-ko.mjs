// =============================================================================
//  update-ko.mjs — 決勝トーナメントの確定対戦をWikipediaから取得し ko-results.js を生成
//  GitHub Action から定期実行。Node 18+（global fetch 使用）。依存なし。
//  方針: レンダリングHTMLの football box を「日付＋会場」で公式ブラケットの試合番号に
//        対応付け、確定済みの代表チーム(国)リンクを抽出して書き出す。未確定は無視。
// =============================================================================
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '..', 'ko-results.js');

// 公式ブラケットの試合（番号・日付・会場・都市）。data.js の knockout と一致。
const KNOWN = [
  [73, '2026-06-28', 'SoFi Stadium', 'Inglewood'],
  [74, '2026-06-29', 'Gillette Stadium', 'Foxborough'],
  [75, '2026-06-29', 'Estadio BBVA', 'Guadalupe'],
  [76, '2026-06-29', 'NRG Stadium', 'Houston'],
  [77, '2026-06-30', 'MetLife Stadium', 'East Rutherford'],
  [78, '2026-06-30', 'AT&T Stadium', 'Arlington'],
  [79, '2026-06-30', 'Estadio Azteca', 'Mexico City'],
  [80, '2026-07-01', 'Mercedes-Benz Stadium', 'Atlanta'],
  [81, '2026-07-01', "Levi's Stadium", 'Santa Clara'],
  [82, '2026-07-01', 'Lumen Field', 'Seattle'],
  [83, '2026-07-02', 'BMO Field', 'Toronto'],
  [84, '2026-07-02', 'SoFi Stadium', 'Inglewood'],
  [85, '2026-07-02', 'BC Place', 'Vancouver'],
  [86, '2026-07-03', 'Hard Rock Stadium', 'Miami'],
  [87, '2026-07-03', 'Arrowhead Stadium', 'Kansas City'],
  [88, '2026-07-03', 'AT&T Stadium', 'Arlington'],
  [89, '2026-07-04', 'Lincoln Financial Field', 'Philadelphia'],
  [90, '2026-07-04', 'NRG Stadium', 'Houston'],
  [91, '2026-07-05', 'MetLife Stadium', 'East Rutherford'],
  [92, '2026-07-05', 'Estadio Azteca', 'Mexico City'],
  [93, '2026-07-06', 'AT&T Stadium', 'Arlington'],
  [94, '2026-07-06', 'Lumen Field', 'Seattle'],
  [95, '2026-07-07', 'Mercedes-Benz Stadium', 'Atlanta'],
  [96, '2026-07-07', 'BC Place', 'Vancouver'],
  [97, '2026-07-09', 'Gillette Stadium', 'Foxborough'],
  [98, '2026-07-10', 'SoFi Stadium', 'Inglewood'],
  [99, '2026-07-11', 'Hard Rock Stadium', 'Miami'],
  [100, '2026-07-11', 'Arrowhead Stadium', 'Kansas City'],
  [101, '2026-07-14', 'AT&T Stadium', 'Arlington'],
  [102, '2026-07-15', 'Mercedes-Benz Stadium', 'Atlanta'],
  [103, '2026-07-18', 'Hard Rock Stadium', 'Miami'],
  [104, '2026-07-19', 'MetLife Stadium', 'East Rutherford'],
];

// data.js のチーム名（正準）。Wikipedia表記をこれに正規化する。
const CANON = ['Mexico', 'South Africa', 'South Korea', 'Czech Republic', 'Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland', 'Brazil', 'Morocco', 'Haiti', 'Scotland', 'United States', 'Paraguay', 'Australia', 'Turkey', 'Germany', 'Curacao', 'Ivory Coast', 'Ecuador', 'Netherlands', 'Japan', 'Sweden', 'Tunisia', 'Belgium', 'Egypt', 'Iran', 'New Zealand', 'Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay', 'France', 'Senegal', 'Iraq', 'Norway', 'Argentina', 'Algeria', 'Austria', 'Jordan', 'Portugal', 'DR Congo', 'Uzbekistan', 'Colombia', 'England', 'Croatia', 'Ghana', 'Panama'];

const deaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const CANON_BY_KEY = new Map(CANON.map((c) => [deaccent(c).toLowerCase(), c]));
const ALIAS = {
  'czechia': 'Czech Republic', 'turkiye': 'Turkey', "cote d'ivoire": 'Ivory Coast',
  'cabo verde': 'Cape Verde', 'korea republic': 'South Korea', 'ir iran': 'Iran',
  'democratic republic of the congo': 'DR Congo', 'usa': 'United States',
  'united states of america': 'United States', 'republic of korea': 'South Korea',
};
function canonical(name) {
  if (!name) return null;
  let k = deaccent(name).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
  if (ALIAS[k]) return ALIAS[k];
  if (CANON_BY_KEY.has(k)) return CANON_BY_KEY.get(k);
  return null;
}

async function fetchHtml() {
  const url = 'https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_knockout_stage&prop=text&formatversion=2&format=json';
  const res = await fetch(url, { headers: { 'User-Agent': 'wc2026-predictor-bot/1.0 (github actions; knockout auto-update)' } });
  if (!res.ok) throw new Error('Wikipedia API HTTP ' + res.status);
  const j = await res.json();
  const html = j?.parse?.text;
  if (!html || typeof html !== 'string') throw new Error('No parse.text in API response');
  return html;
}

// football box セグメント内から代表チーム(国)の表示名を最大2件抽出
function teamsInSegment(seg) {
  const re = /title="([^"]*?(?:national (?:association )?(?:football|soccer) team|men's national (?:soccer|football) team)[^"]*?)"[^>]*>([^<]+)</gi;
  const names = [];
  let m;
  while ((m = re.exec(seg)) && names.length < 2) {
    const anchor = m[2].replace(/&amp;/g, '&').trim();
    names.push(anchor);
  }
  return names;
}

function parse(html) {
  const parts = html.split('class="footballbox"');
  const results = {}; // matchNo -> {teamA, teamB}
  let resolvedBoxes = 0;
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i].slice(0, 4000); // 1試合分はこの範囲に収まる
    const dm = seg.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (!dm) continue;
    const date = dm[1];
    // 日付一致の候補
    let cands = KNOWN.filter((k) => k[1] === date);
    if (!cands.length) continue;
    // 会場/都市で一意化
    let match = cands.find((k) => seg.includes(k[2]) || seg.includes(k[3]));
    if (!match) { if (cands.length === 1) match = cands[0]; else continue; }
    const names = teamsInSegment(seg);
    const a = names[0] ? canonical(names[0]) : null;
    const b = names[1] ? canonical(names[1]) : null;
    if (!a && !b) continue; // まだプレースホルダ
    const entry = {};
    if (a) entry.teamA = a;
    if (b) entry.teamB = b;
    results[match[0]] = entry;
    if (a && b) resolvedBoxes++;
  }
  return { results, resolvedBoxes };
}

function write(results) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const body =
    '/* =============================================================================\n' +
    ' *  ko-results.js — 決勝トーナメントの確定対戦（自動生成・手動編集不要）\n' +
    ' *  GitHub Action (.github/workflows/update-knockout.yml) が自動更新。\n' +
    ' *  形式: window.KO_RESULTS = { "73": { teamA, teamB }, ... }\n' +
    ' * ========================================================================== */\n' +
    'window.KO_RESULTS = ' + JSON.stringify(results, null, 2) + ';\n' +
    'window.KO_RESULTS_UPDATED = ' + JSON.stringify(Object.keys(results).length ? now : '') + ';\n';
  writeFileSync(OUT, body);
}

(async () => {
  try {
    const html = await fetchHtml();
    const { results, resolvedBoxes } = parse(html);
    write(results);
    console.log('update-ko: matches with team(s)=' + Object.keys(results).length + ', fully-resolved=' + resolvedBoxes);
  } catch (e) {
    console.error('update-ko FAILED:', e.message);
    process.exit(1); // 失敗時は ko-results.js を書き換えない
  }
})();
