// =============================================================================
//  update-elo.mjs — eloratings.net の World.tsv から最新Eloを取得し elo-live.js を生成
//  GitHub Action (.github/workflows/update-elo.yml) が定期実行。Node 18+。依存なし。
//  Eloは試合ごとに更新されるため、これで実際の結果が自動反映される（LLM不要）。
//  World.tsv 形式: タブ区切り、列3=eloratingsの2文字コード, 列4=Elo。
// =============================================================================
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'elo-live.js');

// eloratings 2文字コード → アプリのチーム名（Elo値で照合して確定済み・コードは不変）
const CODE = {
  ES: 'Spain', AR: 'Argentina', FR: 'France', EN: 'England', PT: 'Portugal', CO: 'Colombia',
  BR: 'Brazil', NL: 'Netherlands', DE: 'Germany', NO: 'Norway', HR: 'Croatia', JP: 'Japan',
  BE: 'Belgium', UY: 'Uruguay', EC: 'Ecuador', MX: 'Mexico', CH: 'Switzerland', SN: 'Senegal',
  TR: 'Turkey', MA: 'Morocco', AU: 'Australia', AT: 'Austria', SQ: 'Scotland', KR: 'South Korea',
  PY: 'Paraguay', US: 'United States', DZ: 'Algeria', IR: 'Iran', CA: 'Canada', SE: 'Sweden',
  CI: 'Ivory Coast', PA: 'Panama', UZ: 'Uzbekistan', CZ: 'Czech Republic', EG: 'Egypt', JO: 'Jordan',
  CD: 'DR Congo', BA: 'Bosnia and Herzegovina', IQ: 'Iraq', TN: 'Tunisia', CV: 'Cape Verde',
  SA: 'Saudi Arabia', NZ: 'New Zealand', HT: 'Haiti', ZA: 'South Africa', GH: 'Ghana', QA: 'Qatar', CW: 'Curacao'
};

async function main() {
  const res = await fetch('https://www.eloratings.net/World.tsv', { headers: { 'User-Agent': 'wc2026-predictor-bot/1.0 (github actions; elo auto-update)' } });
  if (!res.ok) throw new Error('eloratings HTTP ' + res.status);
  const txt = await res.text();
  const out = {};
  for (const line of txt.split('\n')) {
    const f = line.split('\t');
    if (f.length < 4) continue;
    const code = f[2].trim();
    const elo = parseInt(f[3], 10);
    if (CODE[code] && Number.isFinite(elo) && elo > 800 && elo < 2500) out[CODE[code]] = elo;
  }
  const n = Object.keys(out).length;
  if (n < 40) throw new Error('Too few teams mapped (' + n + ') — World.tsv format may have changed');
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const body =
    '/* =============================================================================\n' +
    ' *  elo-live.js — eloratings.net の最新Elo（自動生成・手動編集不要）\n' +
    ' *  GitHub Action (.github/workflows/update-elo.yml) が定期取得。\n' +
    ' *  アプリは data.js の elo にこれを上書き適用（試合結果を自動反映）。\n' +
    ' * ========================================================================== */\n' +
    'window.ELO_LIVE = ' + JSON.stringify(out, null, 1) + ';\n' +
    'window.ELO_LIVE_UPDATED = ' + JSON.stringify(now) + ';\n';
  writeFileSync(OUT, body);
  console.log('update-elo: mapped ' + n + ' / 48 teams, updated ' + now);
}
main().catch((e) => { console.error('update-elo FAILED:', e.message); process.exit(1); });
