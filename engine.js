/* =============================================================================
 *  engine.js  —  WINNER 予測エンジン（純関数）
 *
 *  予測ロジックの全体像
 *  --------------------------------------------------------------------------
 *  1) チーム強度は World Football Elo を主軸に、FIFAランク・直近フォーム・
 *     ホーム/標高/気候の補正を加えて「実効Elo(effElo)」を作る。
 *  2) Elo差 → 勝点期待値 We = 1/(1+10^(-d/400))  （勝=1, 分=0.5, 負=0 の期待値）
 *  3) 総得点(baseTotal)を固定し、We を満たす「得点差(supremacy)」を
 *     Dixon-Coles 補正付きポアソン行列上で二分探索して求める。
 *  4) 得られた λA, λB からスコア確率行列を構築 → 1X2 / 的中スコア /
 *     Over-Under / BTTS を算出。
 *  5) WINNER のオッズに対する期待値(EV)・ケリー基準で「買い目」を判定。
 *
 *  この方式の利点：引き分け確率や僅差での荒れをモデルが内生的に表現でき、
 *  かつ「予想スコア」まで一貫した確率分布から導ける。
 * ========================================================================== */
(function (global) {
  'use strict';

  var MAXG = 10; // スコア行列の上限（0..10点）

  /* ---- 基本確率分布 ---- */
  function poisson(k, lambda) {
    if (lambda <= 0) return k === 0 ? 1 : 0;
    // exp(k*ln(λ) - λ - ln(k!))
    var logp = k * Math.log(lambda) - lambda - logFactorial(k);
    return Math.exp(logp);
  }

  var _logFactCache = [0, 0];
  function logFactorial(n) {
    if (n < _logFactCache.length) return _logFactCache[n];
    var v = _logFactCache[_logFactCache.length - 1];
    for (var i = _logFactCache.length; i <= n; i++) {
      v += Math.log(i);
      _logFactCache[i] = v;
    }
    return _logFactCache[n];
  }

  /* ---- Dixon-Coles 低スコア補正 τ ---- */
  function tau(x, y, lambda, mu, rho) {
    if (x === 0 && y === 0) return 1 - lambda * mu * rho;
    if (x === 0 && y === 1) return 1 + lambda * rho;
    if (x === 1 && y === 0) return 1 + mu * rho;
    if (x === 1 && y === 1) return 1 - rho;
    return 1;
  }

  /* ---- スコア確率行列の構築（正規化済み） ---- */
  function scoreMatrix(lambdaA, lambdaB, rho) {
    if (rho === undefined) rho = -0.12;
    var m = [];
    var sum = 0;
    var pa = [], pb = [];
    for (var i = 0; i <= MAXG; i++) { pa[i] = poisson(i, lambdaA); pb[i] = poisson(i, lambdaB); }
    for (var x = 0; x <= MAXG; x++) {
      m[x] = [];
      for (var y = 0; y <= MAXG; y++) {
        var p = tau(x, y, lambdaA, lambdaB, rho) * pa[x] * pb[y];
        if (p < 0) p = 0;
        m[x][y] = p;
        sum += p;
      }
    }
    if (sum > 0) for (var a = 0; a <= MAXG; a++) for (var b = 0; b <= MAXG; b++) m[a][b] /= sum;
    return m;
  }

  /* ---- 行列から各種マーケット確率を集計 ---- */
  function marketsFromMatrix(m) {
    var pHome = 0, pDraw = 0, pAway = 0;
    var over15 = 0, over25 = 0, over35 = 0, btts = 0;
    var scores = [];
    for (var x = 0; x <= MAXG; x++) {
      for (var y = 0; y <= MAXG; y++) {
        var p = m[x][y];
        if (x > y) pHome += p; else if (x === y) pDraw += p; else pAway += p;
        if (x + y >= 2) over15 += p;
        if (x + y >= 3) over25 += p;
        if (x + y >= 4) over35 += p;
        if (x > 0 && y > 0) btts += p;
        scores.push({ x: x, y: y, p: p });
      }
    }
    scores.sort(function (a, b) { return b.p - a.p; });
    return {
      pHome: pHome, pDraw: pDraw, pAway: pAway,
      over15: over15, over25: over25, over35: over35,
      under25: 1 - over25, btts: btts,
      topScores: scores.slice(0, 8)
    };
  }

  /* ---- Elo差 → 勝点期待値（A視点, 引き分けを0.5として畳んだ値） ---- */
  function expFromElo(eloDiff) {
    return 1 / (1 + Math.pow(10, -eloDiff / 400));
  }

  /* ---- 行列の「A勝率 + 0.5*引分率」 ---- */
  function pointExp(m) {
    var v = 0;
    for (var x = 0; x <= MAXG; x++) for (var y = 0; y <= MAXG; y++) {
      if (x > y) v += m[x][y]; else if (x === y) v += 0.5 * m[x][y];
    }
    return v;
  }

  /* ---- We(勝点期待値) と総得点から supremacy(得点差) を二分探索 ---- */
  function solveSupremacy(targetWe, total, rho) {
    var lo = -4, hi = 4;
    for (var it = 0; it < 40; it++) {
      var mid = (lo + hi) / 2;
      var la = Math.max(0.04, (total + mid) / 2);
      var lb = Math.max(0.04, (total - mid) / 2);
      var we = pointExp(scoreMatrix(la, lb, rho));
      if (we < targetWe) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ===========================================================================
   *  predict — 2チームの対戦を予測
   *  a, b: { name, eloEff }  ※ eloEff は補正込みの実効Elo（buildEffElo で算出）
   *  opts: { baseTotal, rho }
   * ======================================================================== */
  function predict(a, b, opts) {
    opts = opts || {};
    var baseTotal = opts.baseTotal != null ? opts.baseTotal : 2.6;
    var rho = opts.rho != null ? opts.rho : -0.12;

    var diff = a.eloEff - b.eloEff;
    var we = expFromElo(diff);
    var sup = solveSupremacy(we, baseTotal, rho);
    var lambdaA = Math.max(0.04, (baseTotal + sup) / 2);
    var lambdaB = Math.max(0.04, (baseTotal - sup) / 2);

    var m = scoreMatrix(lambdaA, lambdaB, rho);
    var mk = marketsFromMatrix(m);

    return {
      teamA: a.name, teamB: b.name,
      eloDiff: diff, we: we, supremacy: sup,
      lambdaA: lambdaA, lambdaB: lambdaB,
      pHome: mk.pHome, pDraw: mk.pDraw, pAway: mk.pAway,
      over15: mk.over15, over25: mk.over25, over35: mk.over35,
      under25: mk.under25, btts: mk.btts,
      topScores: mk.topScores,
      matrix: m
    };
  }

  /* ===========================================================================
   *  buildEffElo — 各種要素から実効Eloを合成
   *
   *  base   : World Football Elo
   *  fifa   : FIFAランクポイント（任意・微調整）
   *  form   : 0-100 の直近フォームスコア（任意）
   *  ctx    : { host:bool, altitudeUnfamiliar:bool, heatUnfamiliar:bool, restDays }
   *  weights: 既定の重み（UI から調整可能）
   * ======================================================================== */
  function buildEffElo(team, ctx, weights) {
    ctx = ctx || {};
    weights = weights || {};
    var elo = team.elo || 1500;

    // フォーム補正: 50を中立とし、±50点幅で実効Eloを最大±wForm 動かす
    var wForm = weights.form != null ? weights.form : 40;     // 最大寄与(Elo点)
    if (typeof team.form === 'number') {
      elo += ((team.form - 50) / 50) * wForm;
    }

    // FIFAランク補正: FIFAポイントとEloの整合を弱く取り込む（任意）
    var wFifa = weights.fifa != null ? weights.fifa : 0;      // 既定は0（Elo優先）
    if (wFifa && typeof team.fifa === 'number' && weights.fifaMean) {
      elo += ((team.fifa - weights.fifaMean) / 100) * wFifa;
    }

    // ホーム補正（開催国が自国開催地でプレー）
    if (ctx.host) elo += weights.host != null ? weights.host : 70;

    // 標高補正（高地不慣れな相手にマイナス → 自分視点では相手に課す。ここでは自チームの不利を引く）
    if (ctx.altitudeUnfamiliar) elo -= weights.altitude != null ? weights.altitude : 25;

    // 酷暑補正
    if (ctx.heatUnfamiliar) elo -= weights.heat != null ? weights.heat : 15;

    return elo;
  }

  /* ===========================================================================
   *  期待値・ベッティング系
   * ======================================================================== */
  function impliedProb(odds) { return odds > 0 ? 1 / odds : 0; }

  // ブックメーカー控除(オーバーラウンド)を除いたフェア確率
  function fairProbs(oddsArr) {
    var imp = oddsArr.map(impliedProb);
    var s = imp.reduce(function (a, b) { return a + b; }, 0);
    return { fair: imp.map(function (v) { return s > 0 ? v / s : 0; }), overround: s };
  }

  // 1点あたり期待リターン倍率: odds*p（1.0でブレークイーブン）。EV% = (odds*p - 1)*100
  function expectedValue(modelProb, odds) {
    return modelProb * odds - 1;
  }

  // ケリー基準 f* = (b*p - q)/b,  b=odds-1, q=1-p
  function kelly(modelProb, odds) {
    var b = odds - 1;
    if (b <= 0) return 0;
    var f = (b * modelProb - (1 - modelProb)) / b;
    return Math.max(0, f);
  }

  /* outcomes: [{key:'home'|'draw'|'away', label, modelProb, odds}] を評価 */
  function evaluateBets(outcomes) {
    var oddsArr = outcomes.map(function (o) { return o.odds || 0; });
    var hasOdds = oddsArr.every(function (o) { return o > 0; });
    var fair = hasOdds ? fairProbs(oddsArr) : null;
    return outcomes.map(function (o, i) {
      var ev = o.odds > 0 ? expectedValue(o.modelProb, o.odds) : null;
      return {
        key: o.key, label: o.label,
        modelProb: o.modelProb,
        odds: o.odds || null,
        impliedProb: o.odds > 0 ? impliedProb(o.odds) : null,
        fairProb: fair ? fair.fair[i] : null,
        ev: ev,                                   // 期待値（小数, 0.08 = +8%）
        edge: o.odds > 0 ? o.modelProb - impliedProb(o.odds) : null,
        kelly: o.odds > 0 ? kelly(o.modelProb, o.odds) : null,
        value: ev != null && ev > 0
      };
    });
  }

  /* ===========================================================================
   *  グループ・モンテカルロ（勝ち上がり確率）
   *  teams: [{name, eloEff}] 4チーム / sims 回試行
   *  2026方式: 各組 上位2 + 各組3位のうち上位8 が決勝T進出
   *  ここでは「組1位 / 組2位 / 組3位」確率を返す（3位上位8の判定は呼び出し側で全組横断）
   * ======================================================================== */
  function simulateGroup(teams, sims, opts) {
    sims = sims || 10000;
    var n = teams.length;
    var pos1 = new Array(n).fill(0);
    var pos2 = new Array(n).fill(0);
    var pos3 = new Array(n).fill(0);
    var ptsSum = new Array(n).fill(0);

    // 事前に各対戦の確率を計算（高速化）
    var pre = [];
    for (var i = 0; i < n; i++) {
      pre[i] = [];
      for (var j = 0; j < n; j++) {
        if (i === j) { pre[i][j] = null; continue; }
        pre[i][j] = predict(teams[i], teams[j], opts);
      }
    }

    for (var s = 0; s < sims; s++) {
      var pts = new Array(n).fill(0);
      var gf = new Array(n).fill(0);
      var ga = new Array(n).fill(0);
      for (var x = 0; x < n; x++) {
        for (var y = x + 1; y < n; y++) {
          var pr = pre[x][y];
          var r = Math.random();
          if (r < pr.pHome) { pts[x] += 3; }
          else if (r < pr.pHome + pr.pDraw) { pts[x] += 1; pts[y] += 1; }
          else { pts[y] += 3; }
          // 簡易得失点（期待λで近似サンプル）
          var sgx = samplePoisson(pr.lambdaA), sgy = samplePoisson(pr.lambdaB);
          gf[x] += sgx; ga[x] += sgy; gf[y] += sgy; ga[y] += sgx;
        }
      }
      // 順位付け（勝点→得失点差→総得点→乱数）
      var order = [];
      for (var k = 0; k < n; k++) order.push(k);
      order.sort(function (p, q) {
        if (pts[q] !== pts[p]) return pts[q] - pts[p];
        var gdp = (gf[p] - ga[p]), gdq = (gf[q] - ga[q]);
        if (gdq !== gdp) return gdq - gdp;
        if (gf[q] !== gf[p]) return gf[q] - gf[p];
        return Math.random() - 0.5;
      });
      pos1[order[0]]++; pos2[order[1]]++; pos3[order[2]]++;
      for (var t = 0; t < n; t++) ptsSum[t] += pts[t];
    }

    return teams.map(function (tm, i) {
      return {
        name: tm.name,
        p1: pos1[i] / sims,
        p2: pos2[i] / sims,
        p3: pos3[i] / sims,
        pTop2: (pos1[i] + pos2[i]) / sims,
        avgPts: ptsSum[i] / sims
      };
    });
  }

  function samplePoisson(lambda) {
    if (lambda <= 0) return 0;
    var L = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ===========================================================================
   *  WINNER 18択（1試合予想スコア）— スコア確率行列を 18 の選択肢に集計
   *  ※WINNERサッカー1試合予想の標準18択を想定:
   *    ホーム: 1-0,2-0,2-1,3-0,3-1,3-2,その他 ／ 引分: 0-0,1-1,2-2,その他
   *    アウェイ: 0-1,0-2,1-2,0-3,1-3,2-3,その他
   *    （正確な選択肢は購入時にWINNER商品ページで要確認）
   * ======================================================================== */
  var WINNER_LAYOUT = [
    { side: 'home', scores: [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [3, 2]] },
    { side: 'draw', scores: [[0, 0], [1, 1], [2, 2]] },
    { side: 'away', scores: [[0, 1], [0, 2], [1, 2], [0, 3], [1, 3], [2, 3]] }
  ];

  function winnerOptions(m) {
    var sideTot = { home: 0, draw: 0, away: 0 };
    for (var x = 0; x <= MAXG; x++) for (var y = 0; y <= MAXG; y++) {
      var p = m[x][y];
      if (x > y) sideTot.home += p; else if (x === y) sideTot.draw += p; else sideTot.away += p;
    }
    var out = [];
    WINNER_LAYOUT.forEach(function (grp) {
      var named = 0;
      grp.scores.forEach(function (s) {
        var p = m[s[0]][s[1]];
        named += p;
        out.push({ side: grp.side, x: s[0], y: s[1], label: s[0] + '-' + s[1], prob: p, isOther: false });
      });
      out.push({ side: grp.side, label: 'その他', prob: Math.max(0, sideTot[grp.side] - named), isOther: true });
    });
    return out; // 18件（順序固定）
  }

  /* ===========================================================================
   *  トーナメント優勝シミュレーション（優勝予想向け）
   *  teams: [{name, eloEff}] 48チーム
   *  groupsDef: [{group, teams:[name,...]}]（各4）
   *  方式: グループ総当たり→各組上位2+3位上位8(計32)→ランダム抽選した
   *        単一エリミネーション。引分はPK相当で勝率按分。
   *  ※R32以降の正式な対戦表割当は簡略化（近似）。優勝確率の目安として使用。
   * ======================================================================== */
  function simulateChampion(teams, groupsDef, sims, opts) {
    sims = sims || 3000;
    var n = teams.length;
    var idx = {};
    teams.forEach(function (t, i) { idx[t.name] = i; });

    // 全ペアの確率を事前計算（高速化の要）
    var P = [];
    for (var a = 0; a < n; a++) P[a] = [];
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var pr = predict(teams[i], teams[j], opts);
        P[i][j] = { pi: pr.pHome, pd: pr.pDraw, pj: pr.pAway, li: pr.lambdaA, lj: pr.lambdaB };
        P[j][i] = { pi: pr.pAway, pd: pr.pDraw, pj: pr.pHome, li: pr.lambdaB, lj: pr.lambdaA };
      }
    }

    var champ = new Array(n).fill(0);
    var rF = new Array(n).fill(0), rSF = new Array(n).fill(0), rQF = new Array(n).fill(0), rR16 = new Array(n).fill(0);
    var gmem = groupsDef.map(function (g) { return g.teams.map(function (nm) { return idx[nm]; }); });

    for (var s = 0; s < sims; s++) {
      var qualifiers = [];
      var thirds = [];
      for (var g = 0; g < gmem.length; g++) {
        var mem = gmem[g];
        var pts = {}, gf = {}, ga = {};
        mem.forEach(function (mm) { pts[mm] = 0; gf[mm] = 0; ga[mm] = 0; });
        for (var x2 = 0; x2 < mem.length; x2++) {
          for (var y2 = x2 + 1; y2 < mem.length; y2++) {
            var ia = mem[x2], ib = mem[y2], pr2 = P[ia][ib];
            var r = Math.random();
            if (r < pr2.pi) pts[ia] += 3; else if (r < pr2.pi + pr2.pd) { pts[ia]++; pts[ib]++; } else pts[ib] += 3;
            var gi = samplePoisson(pr2.li), gj = samplePoisson(pr2.lj);
            gf[ia] += gi; ga[ia] += gj; gf[ib] += gj; ga[ib] += gi;
          }
        }
        var ranked = mem.slice().sort(function (p, q) {
          if (pts[q] !== pts[p]) return pts[q] - pts[p];
          var d = (gf[q] - ga[q]) - (gf[p] - ga[p]); if (d) return d;
          if (gf[q] !== gf[p]) return gf[q] - gf[p];
          return Math.random() - 0.5;
        });
        qualifiers.push(ranked[0]); qualifiers.push(ranked[1]);
        thirds.push({ i: ranked[2], pts: pts[ranked[2]], gd: gf[ranked[2]] - ga[ranked[2]], gf: gf[ranked[2]] });
      }
      thirds.sort(function (p, q) {
        if (q.pts !== p.pts) return q.pts - p.pts;
        if (q.gd !== p.gd) return q.gd - p.gd;
        if (q.gf !== p.gf) return q.gf - p.gf;
        return Math.random() - 0.5;
      });
      for (var t3 = 0; t3 < 8 && t3 < thirds.length; t3++) qualifiers.push(thirds[t3].i);

      // ノックアウト（ランダム抽選した固定ブラケット）
      // 延長・PKで番狂わせが増えるため勝率を中央へ軽く回帰(koShrink)
      var koShrink = opts && opts.koShrink != null ? opts.koShrink : 0.88;
      var round = shuffle(qualifiers.slice());
      while (round.length > 1) {
        var next = [];
        for (var k = 0; k < round.length; k += 2) {
          var pa = round[k], pb = round[k + 1], pr3 = P[pa][pb];
          var pwin = (pr3.pi + pr3.pj) > 0 ? pr3.pi / (pr3.pi + pr3.pj) : 0.5;
          pwin = 0.5 + (pwin - 0.5) * koShrink;
          next.push(Math.random() < pwin ? pa : pb);
        }
        if (round.length === 32) next.forEach(function (z) { rR16[z]++; });
        else if (round.length === 16) next.forEach(function (z) { rQF[z]++; });
        else if (round.length === 8) next.forEach(function (z) { rSF[z]++; });
        else if (round.length === 4) next.forEach(function (z) { rF[z]++; });
        round = next;
      }
      champ[round[0]]++;
    }

    return teams.map(function (t, i) {
      return { name: t.name, champ: champ[i] / sims, final: rF[i] / sims, sf: rSF[i] / sims, qf: rQF[i] / sims, r16: rR16[i] / sims };
    });
  }

  /* ---- totoGOAL3 用: 各チームの得点数バケット確率 [0,1,2,3+] ---- */
  function goalBuckets(m) {
    var home = [0, 0, 0, 0], away = [0, 0, 0, 0];
    for (var x = 0; x <= MAXG; x++) {
      for (var y = 0; y <= MAXG; y++) {
        var p = m[x][y];
        home[x >= 3 ? 3 : x] += p;
        away[y >= 3 ? 3 : y] += p;
      }
    }
    return { home: home, away: away };
  }

  /* ===========================================================================
   *  toto（1X2マルチ）支援
   *  probsList: [[pHome,pDraw,pAway], ...]（各試合の勝/分/負確率）
   *  マーク: '1'=ホーム勝ち, '0'=引き分け, '2'=アウェイ勝ち
   * ======================================================================== */
  var TOTO_MARKS = ['1', '0', '2']; // index 0=home,1=draw,2=away に対応

  // 予算（最大組合せ数）内で全的中確率を最大化するマーク配分（貪欲法）
  // 自信のある試合はシングル、拮抗試合はダブル/トリプルへ自動拡張
  function optimizeToto(probsList, maxCombos) {
    maxCombos = maxCombos || 1;
    var picks = probsList.map(function (p) {
      var order = [0, 1, 2].sort(function (a, b) { return p[b] - p[a]; });
      return { order: order, k: 1 };
    });
    function combos() { return picks.reduce(function (c, pk) { return c * pk.k; }, 1); }
    function cover(i) { var p = probsList[i], s = 0; for (var j = 0; j < picks[i].k; j++) s += p[picks[i].order[j]]; return s; }

    while (true) {
      var bestI = -1, bestMetric = 0;
      var cur = combos();
      for (var i = 0; i < picks.length; i++) {
        if (picks[i].k >= 3) continue;
        var comboFactor = (picks[i].k + 1) / picks[i].k;
        if (cur * comboFactor > maxCombos + 1e-9) continue;
        var c0 = cover(i);
        var nextP = probsList[i][picks[i].order[picks[i].k]];
        var c1 = c0 + nextP;
        if (c1 <= c0 || c0 <= 0) continue;
        var metric = Math.log(c1 / c0) / Math.log(comboFactor); // Δlog(確率)/Δlog(組合せ)
        if (metric > bestMetric) { bestMetric = metric; bestI = i; }
      }
      if (bestI < 0) break;
      picks[bestI].k++;
    }
    return picks.map(function (pk, i) {
      return { marks: pk.order.slice(0, pk.k).map(function (o) { return TOTO_MARKS[o]; }), idxs: pk.order.slice(0, pk.k), k: pk.k, cover: cover(i) };
    });
  }

  // 任意のマーク選択に対する集計（全的中確率・組合せ数・期待的中数）
  // selections: [[boolHome,boolDraw,boolAway], ...]
  function totoSummary(probsList, selections) {
    var combos = 1, hit = 1, expCorrect = 0, n = 0;
    for (var i = 0; i < selections.length; i++) {
      var sel = selections[i], p = probsList[i];
      var k = (sel[0] ? 1 : 0) + (sel[1] ? 1 : 0) + (sel[2] ? 1 : 0);
      if (k === 0) continue; // 未選択試合はカードに含めない
      n++;
      combos *= k;
      var c = (sel[0] ? p[0] : 0) + (sel[1] ? p[1] : 0) + (sel[2] ? p[2] : 0);
      hit *= c;
      // 期待的中（その試合で当たる確率＝カバー確率）
      expCorrect += c;
    }
    return { matches: n, combos: combos, cost: combos * 100, hitProb: n ? hit : 0, expCorrect: expCorrect };
  }

  /* ---- 公開 ---- */
  global.Engine = {
    predict: predict,
    buildEffElo: buildEffElo,
    scoreMatrix: scoreMatrix,
    marketsFromMatrix: marketsFromMatrix,
    impliedProb: impliedProb,
    fairProbs: fairProbs,
    expectedValue: expectedValue,
    kelly: kelly,
    evaluateBets: evaluateBets,
    simulateGroup: simulateGroup,
    simulateChampion: simulateChampion,
    winnerOptions: winnerOptions,
    goalBuckets: goalBuckets,
    optimizeToto: optimizeToto,
    totoSummary: totoSummary,
    expFromElo: expFromElo,
    poisson: poisson
  };
})(typeof window !== 'undefined' ? window : this);
