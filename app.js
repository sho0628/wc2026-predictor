/* =============================================================================
 *  app.js — UI 配線
 * ========================================================================== */
(function () {
  'use strict';
  var D = window.WC_DATA || { teams: {}, groups: [], schedule: [], meta: {} };
  var E = window.Engine;

  var teamNames = Object.keys(D.teams).sort();
  function team(name) { return Object.assign({ name: name }, D.teams[name] || {}); }
  function codeOf(name) { return (D.teams[name] && D.teams[name].code) || ''; }
  function eloOf(name) { return (D.teams[name] && D.teams[name].elo) || 1500; }
  function flag(name) {
    var c = codeOf(name);
    if (!c) return '';
    return '<img class="flagimg" src="https://flagcdn.com/24x18/' + c + '.png" ' +
      'width="24" height="18" alt="" loading="lazy" onerror="this.style.display=\'none\'" />';
  }
  function pct(x) { return (x * 100).toFixed(1) + '%'; }
  function pct0(x) { return Math.round(x * 100) + '%'; }
  function pct2(x) { return (x * 100).toFixed(2) + '%'; }
  function $(id) { return document.getElementById(id); }

  /* ---------- 日本時間(JST)変換 ---------- */
  var JA_WD = ['日', '月', '火', '水', '木', '金', '土'];
  function cityOffset(city) { var o = (D.cityUtcOffset || {})[city]; return o == null ? -4 : o; }
  function kickoffInstant(m) { // 試合開始のUTCインスタント(ms)
    if (!m || !m.date) return 0;
    var dp = m.date.split('-'), tp = (m.timeLocal || '00:00').split(':');
    return Date.UTC(+dp[0], +dp[1] - 1, +dp[2], +tp[0] || 0, +tp[1] || 0) - cityOffset(m.city) * 3600000;
  }
  function toJST(m) {
    var d = new Date(kickoffInstant(m) + 9 * 3600000);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return {
      date: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()),
      md: (d.getUTCMonth() + 1) + '/' + d.getUTCDate(),
      time: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()),
      wd: JA_WD[d.getUTCDay()]
    };
  }

  /* ---------- タブ切替 ---------- */
  document.querySelectorAll('#tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#tabs button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      document.querySelectorAll('section.view').forEach(function (s) { s.classList.remove('active'); });
      $('view-' + b.dataset.view).classList.add('active');
      window.scrollTo(0, 0);
    });
  });
  function gotoView(v) { var btn = document.querySelector('#tabs button[data-view="' + v + '"]'); if (btn) btn.click(); }

  /* ---------- セレクト初期化 ---------- */
  function fillTeamSelect(sel, def) {
    sel.innerHTML = '';
    teamNames.forEach(function (n) {
      var o = document.createElement('option');
      o.value = n; o.textContent = n + '  (Elo ' + Math.round(eloOf(n)) + ')';
      sel.appendChild(o);
    });
    if (def && teamNames.indexOf(def) >= 0) sel.value = def;
  }

  /* ---------- 会場補正 ---------- */
  var autoCtx = null; // {a:{host,altitudeUnfamiliar}, b:{...}}
  function venueCtx() {
    var v = $('venuePreset').value;
    if (v === 'auto' && autoCtx) return autoCtx;
    return {
      a: { host: v === 'hostA', altitudeUnfamiliar: v === 'altA' },
      b: { host: v === 'hostB', altitudeUnfamiliar: v === 'altB' }
    };
  }
  function autoContextFromMatch(m) {
    var city = m.city || '';
    var vCountry = D.countryOfCity[city] || 'US';
    var highAlt = (D.highAltitudeCities || []).indexOf(city) >= 0;
    var aAdapted = (D.altitudeAdapted || []).indexOf(m.teamA) >= 0;
    var bAdapted = (D.altitudeAdapted || []).indexOf(m.teamB) >= 0;
    return {
      a: { host: D.hosts[m.teamA] === vCountry, altitudeUnfamiliar: highAlt && !aAdapted },
      b: { host: D.hosts[m.teamB] === vCountry, altitudeUnfamiliar: highAlt && !bAdapted }
    };
  }
  function ctxNote(ctx, a, b) {
    var bits = [];
    if (ctx.a.host) bits.push(a + ' 開催国ホーム(+)');
    if (ctx.b.host) bits.push(b + ' 開催国ホーム(+)');
    if (ctx.a.altitudeUnfamiliar) bits.push(a + ' 高地不利(-)');
    if (ctx.b.altitudeUnfamiliar) bits.push(b + ' 高地不利(-)');
    return bits.length ? '自動補正: ' + bits.join(' / ') : '';
  }
  function currentWeights() { return { form: parseFloat($('formW').value), host: 70, altitude: 25, heat: 15 }; }

  /* ---------- 予測実行 ---------- */
  var lastPrediction = null;
  var lastWinnerOpts = null;
  function runPredict() {
    var aName = $('teamA').value, bName = $('teamB').value;
    if (aName === bName) { $('result').innerHTML = '<div class="card"><p class="note">異なる2チームを選んでください。</p></div>'; return; }
    var w = currentWeights();
    var ctx = venueCtx();
    var baseTotal = parseFloat($('totalW').value);

    var a = team(aName), b = team(bName);
    a.eloEff = E.buildEffElo(a, ctx.a, w);
    b.eloEff = E.buildEffElo(b, ctx.b, w);

    var pr = E.predict(a, b, { baseTotal: baseTotal });
    lastPrediction = { pr: pr, a: a, b: b };
    renderPrediction(pr, a, b);
    renderWinner(pr, a, b);
    $('winnerCard').style.display = 'block';
    $('evCard').style.display = 'block';
    $('oddsHomeLbl').textContent = a.name + ' 勝ち';
    $('oddsAwayLbl').textContent = b.name + ' 勝ち';
    $('evResult').innerHTML = '';
    var note = ($('venuePreset').value === 'auto') ? ctxNote(ctx, a.name, b.name) : '';
    $('autoCtxNote').textContent = note;
  }

  function confTag(p) {
    if (p >= 0.55) return '<span class="tag green">本命</span>';
    if (p >= 0.42) return '<span class="tag amber">やや有利</span>';
    return '';
  }

  function renderPrediction(pr, a, b) {
    var fav = pr.pHome >= pr.pAway ? a : b;
    var topScore = pr.topScores[0];
    var html = '';
    html += '<div class="card">';
    html += '<div class="predhead">';
    html += '<div class="side left"><div class="nm">' + flag(a.name) + '<span>' + a.name + '</span></div>' +
      '<div class="meta">Elo ' + Math.round(a.eloEff) + (a.form ? ' ・ 調子' + a.form : '') + '</div></div>';
    html += '<div class="scorebox"><div class="lbl">予想スコア</div>' +
      '<div class="sc"><span class="h">' + topScore.x + '</span><span class="dash">-</span><span class="a">' + topScore.y + '</span></div>' +
      '<div class="scp">' + pct(topScore.p) + '</div></div>';
    html += '<div class="side right"><div class="nm"><span>' + b.name + '</span>' + flag(b.name) + '</div>' +
      '<div class="meta">Elo ' + Math.round(b.eloEff) + (b.form ? ' ・ 調子' + b.form : '') + '</div></div>';
    html += '</div>';

    html += '<div class="bar1x2">';
    html += '<div class="seg home" style="width:' + (pr.pHome * 100) + '%">' + pct0(pr.pHome) + '<small>' + a.name + '勝</small></div>';
    html += '<div class="seg draw" style="width:' + (pr.pDraw * 100) + '%">' + pct0(pr.pDraw) + '<small>分</small></div>';
    html += '<div class="seg away" style="width:' + (pr.pAway * 100) + '%">' + pct0(pr.pAway) + '<small>' + b.name + '勝</small></div>';
    html += '</div>';

    html += '<div style="margin-top:10px" class="note">勝敗予想: <b style="color:var(--txt)">' +
      flag(fav.name) + ' ' + fav.name + '</b> ' + confTag(Math.max(pr.pHome, pr.pAway)) +
      ' ／ 期待得点 ' + pr.lambdaA.toFixed(2) + ' - ' + pr.lambdaB.toFixed(2) + '</div>';

    html += '<div class="kpis">';
    html += kpi(pct0(pr.over25), 'Over 2.5');
    html += kpi(pct0(pr.under25), 'Under 2.5');
    html += kpi(pct0(pr.btts), '両者得点');
    html += kpi(pct0(1 - pr.btts), '無失点あり');
    html += '</div>';

    html += '<h3>的中スコア確率 Top</h3><div class="scores">';
    pr.topScores.forEach(function (s) {
      html += '<div class="score"><div class="s">' + s.x + ' - ' + s.y + '</div><div class="p">' + pct(s.p) + '</div></div>';
    });
    html += '</div>';

    // totoGOAL3 用: 各チームの得点数バケット（0/1/2/3+）
    var gb = E.goalBuckets(pr.matrix);
    html += '<h3>totoGOAL3 用 得点数予想（0 / 1 / 2 / 3+）</h3>';
    html += '<div class="grid cols2">' + goalBucketRow(a.name, gb.home) + goalBucketRow(b.name, gb.away) + '</div>';

    html += '</div>';
    $('result').innerHTML = html;
  }
  function kpi(v, l) { return '<div class="kpi"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }
  function goalBucketRow(name, buckets) {
    var top = buckets.indexOf(Math.max.apply(null, buckets));
    var labels = ['0', '1', '2', '3+'];
    var h = '<div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:10px">';
    h += '<div style="font-weight:700;margin-bottom:6px">' + flag(name) + ' ' + name + '</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">';
    buckets.forEach(function (p, i) {
      h += '<div style="text-align:center;padding:6px;border-radius:8px;background:' + (i === top ? 'rgba(245,196,81,.15)' : 'transparent') + '">' +
        '<div style="font-weight:800">' + (i === top ? '<span style="color:var(--gold)">★</span>' : '') + labels[i] + '</div>' +
        '<div class="note" style="font-size:12px">' + Math.round(p * 100) + '%</div></div>';
    });
    h += '</div></div>';
    return h;
  }

  /* ---------- WINNER 18択 ---------- */
  function sideLabel(side, isOther) {
    if (isOther) return side === 'home' ? 'その他のホーム勝ち' : side === 'away' ? 'その他のアウェイ勝ち' : 'その他の引き分け';
    return '';
  }
  function renderWinner(pr, a, b) {
    var opts = E.winnerOptions(pr.matrix);
    lastWinnerOpts = opts;
    var html = '<tr><th>選択肢</th><th class="num">的中確率</th><th class="num">フェア倍率</th><th class="num">払戻倍率(入力)</th><th class="num">期待値</th><th>判定</th></tr>';
    opts.forEach(function (o, i) {
      var name = o.isOther ? sideLabel(o.side, true)
        : (o.side === 'home' ? a.name : o.side === 'away' ? b.name : '引分') + ' ' + o.label;
      var sideColor = o.side === 'home' ? 'var(--accent)' : o.side === 'away' ? 'var(--red)' : 'var(--muted)';
      var fair = o.prob > 0 ? (1 / o.prob) : 0;
      html += '<tr data-idx="' + i + '">';
      html += '<td><span style="color:' + sideColor + ';font-weight:700">' + name + '</span></td>';
      html += '<td class="num">' + pct2(o.prob) + '</td>';
      html += '<td class="num">' + (fair ? fair.toFixed(2) : '—') + '</td>';
      html += '<td class="num"><input type="number" step="0.1" class="oddsIn" data-idx="' + i + '" style="width:80px;text-align:right" /></td>';
      html += '<td class="num evCell">—</td>';
      html += '<td class="verdictCell">—</td>';
      html += '</tr>';
    });
    $('winnerTable').innerHTML = html;
    $('winnerTable').querySelectorAll('.oddsIn').forEach(function (inp) {
      inp.addEventListener('input', function () { recalcWinnerRow(parseInt(inp.dataset.idx, 10)); updateWinnerSummary(); });
    });
    $('winnerSummary').innerHTML = '<p class="note">▶ モデルの最有力: <b style="color:var(--txt)">' +
      topPick(opts, a, b) + '</b>。払戻倍率を入れると期待値で買い目を判定します。</p>';
  }
  function topPick(opts, a, b) {
    var best = opts.slice().sort(function (x, y) { return y.prob - x.prob; })[0];
    var name = best.isOther ? sideLabel(best.side, true)
      : (best.side === 'home' ? a.name : best.side === 'away' ? b.name : '引分') + ' ' + best.label;
    return name + '（' + pct2(best.prob) + '）';
  }
  function recalcWinnerRow(i) {
    var o = lastWinnerOpts[i];
    var row = $('winnerTable').querySelector('tr[data-idx="' + i + '"]');
    var inp = row.querySelector('.oddsIn');
    var odds = parseFloat(inp.value);
    var evCell = row.querySelector('.evCell');
    var vCell = row.querySelector('.verdictCell');
    if (!odds || odds <= 1) { evCell.textContent = '—'; vCell.innerHTML = '—'; row.classList.remove('value'); return; }
    var ev = o.prob * odds - 1;
    evCell.innerHTML = '<b style="color:' + (ev > 0 ? 'var(--green)' : 'var(--red)') + '">' + (ev >= 0 ? '+' : '') + (ev * 100).toFixed(1) + '%</b>';
    if (ev > 0) { vCell.innerHTML = '<span class="tag green">買い目</span>'; row.classList.add('value'); }
    else { vCell.innerHTML = '<span class="tag grey">見送り</span>'; row.classList.remove('value'); }
  }
  function updateWinnerSummary() {
    if (!lastWinnerOpts) return;
    var a = lastPrediction.a, b = lastPrediction.b;
    var best = null;
    $('winnerTable').querySelectorAll('.oddsIn').forEach(function (inp) {
      var i = parseInt(inp.dataset.idx, 10); var odds = parseFloat(inp.value);
      if (odds && odds > 1) { var ev = lastWinnerOpts[i].prob * odds - 1; if (!best || ev > best.ev) best = { i: i, ev: ev }; }
    });
    var html = '<p class="note">▶ モデルの最有力: <b style="color:var(--txt)">' + topPick(lastWinnerOpts, a, b) + '</b>。</p>';
    if (best && best.ev > 0) {
      var o = lastWinnerOpts[best.i];
      var name = o.isOther ? sideLabel(o.side, true) : (o.side === 'home' ? a.name : o.side === 'away' ? b.name : '引分') + ' ' + o.label;
      html += '<p class="note">▶ 入力倍率の中で最も期待値が高い買い目: <b style="color:var(--green)">' + name + '</b>（EV ' + (best.ev >= 0 ? '+' : '') + (best.ev * 100).toFixed(1) + '%）</p>';
    } else if (best) {
      html += '<p class="note">入力した倍率では＋EVの買い目はありません。</p>';
    }
    $('winnerSummary').innerHTML = html;
  }

  /* ---------- 1X2 期待値（参考） ---------- */
  function runEV() {
    if (!lastPrediction) return;
    var pr = lastPrediction.pr, a = lastPrediction.a, b = lastPrediction.b;
    var oh = parseFloat($('oddsHome').value), od = parseFloat($('oddsDraw').value), oa = parseFloat($('oddsAway').value);
    var outcomes = [
      { key: 'home', label: a.name + ' 勝ち', modelProb: pr.pHome, odds: oh || 0 },
      { key: 'draw', label: '引き分け', modelProb: pr.pDraw, odds: od || 0 },
      { key: 'away', label: b.name + ' 勝ち', modelProb: pr.pAway, odds: oa || 0 }
    ];
    var ev = E.evaluateBets(outcomes);
    var anyOdds = outcomes.some(function (o) { return o.odds > 0; });
    var overround = (oh && od && oa) ? (1 / oh + 1 / od + 1 / oa) : null;
    var html = '<div style="overflow:auto"><table>';
    html += '<tr><th>結果</th><th class="num">モデル勝率</th><th class="num">オッズ</th><th class="num">含意確率</th><th class="num">期待値</th><th>判定</th></tr>';
    ev.forEach(function (r) {
      html += '<tr' + (r.value ? ' class="value"' : '') + '><td>' + r.label + '</td>';
      html += '<td class="num">' + pct(r.modelProb) + '</td>';
      html += '<td class="num">' + (r.odds ? r.odds.toFixed(2) : '—') + '</td>';
      html += '<td class="num">' + (r.impliedProb != null ? pct(r.impliedProb) : '—') + '</td>';
      html += '<td class="num">' + (r.ev != null ? '<b style="color:' + (r.ev > 0 ? 'var(--green)' : 'var(--red)') + '">' + (r.ev >= 0 ? '+' : '') + (r.ev * 100).toFixed(1) + '%</b>' : '—') + '</td>';
      html += '<td>' + (r.odds ? (r.value ? '<span class="tag green">買い目</span>' : '<span class="tag grey">見送り</span>') : '—') + '</td></tr>';
    });
    html += '</table></div>';
    if (overround) html += '<p class="note" style="margin-top:10px">控除率: <b style="color:var(--txt)">' + ((overround - 1) * 100).toFixed(1) + '%</b></p>';
    if (!anyOdds) html = '<p class="note">オッズを入力してください。</p>';
    $('evResult').innerHTML = html;
  }

  /* ---------- グループ表示 ---------- */
  function renderGroups() {
    var box = $('groupsBox');
    if (!D.groups || !D.groups.length) { box.innerHTML = '<p class="note">組分けデータ未登録。</p>'; return; }
    var html = '<div class="grid cols2">';
    D.groups.forEach(function (g) {
      html += '<div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:12px">';
      html += '<h3 style="margin:0 0 8px;color:var(--txt)">グループ ' + g.group + '</h3><table class="grouptable">';
      g.teams.map(function (t) { return { t: t, elo: eloOf(t) }; }).sort(function (a, b) { return b.elo - a.elo; })
        .forEach(function (r) {
          html += '<tr><td>' + flag(r.t) + ' ' + r.t + '</td><td class="num" style="text-align:right;color:var(--muted)">Elo ' + Math.round(r.elo) + '</td></tr>';
        });
      html += '</table></div>';
    });
    html += '</div>';
    box.innerHTML = html;
  }

  /* ---------- 日程表示 ---------- */
  function renderSchedule() {
    var sel = $('schedFilter');
    (D.groups || []).forEach(function (g) { var o = document.createElement('option'); o.value = g.group; o.textContent = 'グループ ' + g.group; sel.appendChild(o); });
    sel.addEventListener('change', drawSchedule);
    drawSchedule();
    renderKnockout();
    initSchedToggle();
  }
  function initSchedToggle() {
    var hasKO = (D.knockout || []).length > 0;
    var tog = $('schedToggle');
    if (!tog) return;
    if (!hasKO) { tog.style.display = 'none'; return; }
    function show(sec) {
      var ko = sec === 'ko';
      $('groupsCard').style.display = ko ? 'none' : '';
      $('schedCard').style.display = ko ? 'none' : '';
      $('koCard').style.display = ko ? 'block' : 'none';
      tog.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b.dataset.sec === sec); });
      window.scrollTo(0, 0);
    }
    tog.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { show(b.dataset.sec); });
    });
    show('group'); // 既定はグループステージ
  }

  /* ---------- 決勝トーナメント（ブラケット） ---------- */
  var KO_ROUND_JA = { 'R32': 'ベスト32（ラウンド32）', 'R16': 'ベスト16', 'QF': '準々決勝', 'SF': '準決勝', '3rd': '3位決定戦', 'Final': '決勝' };
  function fmtSlot(s) {
    s = String(s || '').trim();
    var m1 = s.match(/^([123])([A-L])$/i);                 // 1A → グループA 1位
    if (m1) return 'グループ' + m1[2].toUpperCase() + ' ' + m1[1] + '位';
    var t = s.match(/^3\s*\(([^)]+)\)$/);                    // 3(C/E/F) → 3位[C/E/F]
    if (t) return '3位 [' + t[1] + ']';
    var w = s.match(/^W\s*(\d+)$/i);                         // W73 → 第73試合 勝者
    if (w) return '第' + w[1] + '試合 勝者';
    var l = s.match(/^L\s*(\d+)$/i);                         // L101 → 第101試合 敗者
    if (l) return '第' + l[1] + '試合 敗者';
    return s || '?';
  }
  function koSlotHtml(resolvedName, slotStr) {
    if (resolvedName && D.teams[resolvedName]) {
      return '<span class="slot res">' + flag(resolvedName) + '<b>' + resolvedName + '</b>' +
        '<span class="sub">' + fmtSlot(slotStr) + '</span></span>';
    }
    return '<span class="slot">' + fmtSlot(slotStr) + '</span>';
  }
  function renderKnockout() {
    var ko = D.knockout || [];
    if (!ko.length) { $('koCard').style.display = 'none'; return; }
    $('koCard').style.display = 'block';
    var R = window.KO_RESULTS || {};
    var resolvedCount = 0;
    var html = '';
    ko.forEach(function (rd) {
      html += '<h3 style="color:var(--txt);margin:18px 0 8px">' + (KO_ROUND_JA[rd.round] || rd.round) + '</h3>';
      rd.matches.slice().sort(function (a, b) { return kickoffInstant(a) - kickoffInstant(b); }).forEach(function (m) {
        var j = toJST(m);
        var r = R[m.matchNo] || R['' + m.matchNo] || {};
        var aName = (r.teamA && D.teams[r.teamA]) ? r.teamA : null;
        var bName = (r.teamB && D.teams[r.teamB]) ? r.teamB : null;
        var both = aName && bName;
        if (aName) resolvedCount++; if (bName) resolvedCount++;
        html += '<div class="korow' + (both ? ' clickable' : '') + '"' + (both ? ' data-a="' + aName + '" data-b="' + bName + '" data-city="' + (m.city || '') + '"' : '') + '>';
        html += '<div class="date">' + (j.md ? j.md + '(' + j.wd + ')' : '—') + '<br><b style="color:var(--txt)">' + (j.time || '') + '</b> <span style="font-size:10px">JST</span></div>';
        html += '<div class="ko-slots">' + koSlotHtml(aName, m.slotA) + '<span class="ko-vs">vs</span>' + koSlotHtml(bName, m.slotB) + '</div>';
        html += '<div class="pc">' + (m.matchNo ? '第' + m.matchNo + '試合<br>' : '') + (m.city || '') + '</div>';
        html += '</div>';
      });
    });
    $('koBox').innerHTML = html;
    // 両国確定の試合は予測タブへ
    $('koBox').querySelectorAll('.korow.clickable').forEach(function (el) {
      el.addEventListener('click', function () {
        var a = el.dataset.a, b = el.dataset.b;
        if (D.teams[a] && D.teams[b]) {
          $('teamA').value = a; $('teamB').value = b;
          autoCtx = autoContextFromMatch({ teamA: a, teamB: b, city: el.dataset.city });
          $('venuePreset').value = 'auto';
          gotoView('predict'); runPredict();
        }
      });
    });
    // 確定状況のひとことを koCard 見出し下に
    var info = $('koInfo');
    if (info) {
      if (window.KO_RESULTS_UPDATED && resolvedCount > 0) {
        info.textContent = '対戦確定: ' + resolvedCount + ' 枠（自動更新 ' + window.KO_RESULTS_UPDATED + ' UTC）。クリックで予測へ。';
      } else {
        info.textContent = 'グループステージ終了後、確定した対戦国を自動で表示します（現在は組み合わせ枠）。';
      }
    }
  }
  function drawSchedule() {
    var box = $('scheduleBox');
    var filter = $('schedFilter').value;
    var list = (D.schedule || []).map(function (m, i) { return { m: m, i: i }; })
      .filter(function (o) { return !filter || o.m.group === filter; })
      .sort(function (a, b) { return kickoffInstant(a.m) - kickoffInstant(b.m); });
    if (!list.length) { box.innerHTML = '<p class="note">日程データ未登録。</p>'; return; }
    var html = '';
    list.forEach(function (o) {
      var m = o.m, j = toJST(m);
      html += '<div class="fixture" data-i="' + o.i + '">';
      html += '<div class="date">' + j.md + '(' + j.wd + ')<br><b style="color:var(--txt)">' + j.time + '</b> <span style="font-size:10px">JST</span>' +
        (m.timeLocal ? '<br><span style="font-size:10px;opacity:.7">現地' + m.timeLocal + '</span>' : '') + '</div>';
      html += '<div class="tn r">' + m.teamA + ' ' + flag(m.teamA) + '</div>';
      html += '<div class="mid">vs</div>';
      html += '<div class="tn">' + flag(m.teamB) + ' ' + m.teamB + '</div>';
      html += '<div class="pc">G' + m.group + (m.city ? '<br>' + m.city : '') + '</div>';
      html += '</div>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.fixture').forEach(function (el) {
      el.addEventListener('click', function () {
        var m = D.schedule[parseInt(el.dataset.i, 10)];
        if (!m) return;
        if (teamNames.indexOf(m.teamA) >= 0 && teamNames.indexOf(m.teamB) >= 0) {
          $('teamA').value = m.teamA; $('teamB').value = m.teamB;
          autoCtx = autoContextFromMatch(m);
          $('venuePreset').value = 'auto';
          gotoView('predict'); runPredict();
        }
      });
    });
  }

  /* ---------- 順位シミュレーション ---------- */
  function initGroupSim() {
    var sel = $('simGroup');
    (D.groups || []).forEach(function (g) { var o = document.createElement('option'); o.value = g.group; o.textContent = 'グループ ' + g.group; sel.appendChild(o); });
    $('simBtn').addEventListener('click', function () { runSim([$('simGroup').value]); });
    $('simAllBtn').addEventListener('click', function () { runSim((D.groups || []).map(function (g) { return g.group; })); });
  }
  function runSim(groupLetters) {
    var w = currentWeights();
    $('simResult').innerHTML = '<p class="note">計算中…</p>';
    setTimeout(function () {
      var out = '';
      groupLetters.forEach(function (gl) {
        var g = (D.groups || []).find(function (x) { return x.group === gl; });
        if (!g) return;
        var teams = g.teams.map(function (n) { var t = team(n); t.eloEff = E.buildEffElo(t, {}, w); return t; });
        var res = E.simulateGroup(teams, 10000).sort(function (a, b) { return b.pTop2 - a.pTop2; });
        out += '<h3 style="color:var(--txt)">グループ ' + gl + '</h3><div style="overflow:auto"><table>';
        out += '<tr><th>チーム</th><th class="num">平均勝点</th><th class="num">1位</th><th class="num">突破(上位2)</th><th class="num">3位</th></tr>';
        res.forEach(function (r) {
          out += '<tr><td>' + flag(r.name) + ' ' + r.name + '<div class="spark"><i style="width:' + (r.pTop2 * 100) + '%"></i></div></td>';
          out += '<td class="num">' + r.avgPts.toFixed(2) + '</td><td class="num">' + pct0(r.p1) + '</td>';
          out += '<td class="num"><b>' + pct0(r.pTop2) + '</b></td><td class="num">' + pct0(r.p3) + '</td></tr>';
        });
        out += '</table></div>';
      });
      out += '<p class="note" style="margin-top:8px">※各組3位のうち成績上位8チームも決勝T進出。3位確率が高い組はボーダー争いに注目。</p>';
      $('simResult').innerHTML = out;
    }, 30);
  }

  /* ---------- 優勝予想 ---------- */
  function initChampion() { $('champBtn').addEventListener('click', runChampion); }
  function runChampion() {
    var sims = parseInt($('champSims').value, 10) || 5000;
    var w = currentWeights();
    $('champResult').innerHTML = '<p class="note">計算中…（全ペア事前計算＋' + sims.toLocaleString() + '回試行）</p>';
    setTimeout(function () {
      var teams = teamNames.map(function (n) { var t = team(n); t.eloEff = E.buildEffElo(t, {}, w); return t; });
      var t0 = performance.now();
      var res = E.simulateChampion(teams, D.groups, sims).sort(function (a, b) { return b.champ - a.champ; });
      var ms = Math.round(performance.now() - t0);
      var html = '<div style="overflow:auto"><table>';
      html += '<tr><th>#</th><th>チーム</th><th class="num">優勝</th><th class="num">フェア倍率</th><th class="num">決勝</th><th class="num">ベスト4</th><th class="num">ベスト16</th></tr>';
      res.forEach(function (r, i) {
        if (i >= 28 && r.champ < 0.002) return;
        html += '<tr' + (i < 3 ? ' style="background:rgba(245,196,81,.08)"' : '') + '><td class="num">' + (i + 1) + '</td>';
        html += '<td>' + flag(r.name) + ' ' + r.name + '</td>';
        html += '<td class="num"><b>' + pct2(r.champ) + '</b></td>';
        html += '<td class="num">' + (r.champ > 0 ? (1 / r.champ).toFixed(1) : '—') + '</td>';
        html += '<td class="num">' + pct(r.final) + '</td>';
        html += '<td class="num">' + pct(r.sf) + '</td>';
        html += '<td class="num">' + pct(r.r16) + '</td></tr>';
      });
      html += '</table></div>';
      html += '<p class="note" style="margin-top:8px">計算 ' + ms + 'ms。フェア倍率=1÷優勝確率。WINNER優勝予想の払戻倍率がこれを上回れば妙味あり（※近似ブラケット）。</p>';
      $('champResult').innerHTML = html;
    }, 30);
  }

  /* ---------- toto / mini toto（1X2）— カード単位 ---------- */
  var totoCard = [];      // [{home, away, probs:[ph,pd,pa], date, time, group, marks:[b1,b0,b2]}]
  var schedSorted = null;
  function topOf(p) { return p[0] >= p[1] && p[0] >= p[2] ? 0 : (p[1] >= p[2] ? 1 : 2); }

  function findFixture(t1, t2) {
    return (D.schedule || []).find(function (m) {
      return (m.teamA === t1 && m.teamB === t2) || (m.teamA === t2 && m.teamB === t1);
    });
  }
  // home/away を指定して予測（指定試合カードのホーム視点を尊重）
  function predictCardMatch(home, away) {
    if (!D.teams[home] || !D.teams[away]) return null;
    var fx = findFixture(home, away);
    var ctxA = {}, ctxB = {};
    if (fx) {
      var c = autoContextFromMatch(fx);
      if (fx.teamA === home) { ctxA = c.a; ctxB = c.b; } else { ctxA = c.b; ctxB = c.a; }
    }
    var a = team(home), b = team(away);
    a.eloEff = E.buildEffElo(a, ctxA, { form: 40 });
    b.eloEff = E.buildEffElo(b, ctxB, { form: 40 });
    var pr = E.predict(a, b, { baseTotal: 2.6 });
    var j = fx ? toJST(fx) : null;
    var entry = { home: home, away: away, probs: [pr.pHome, pr.pDraw, pr.pAway], jmd: j ? j.md : '', jwd: j ? j.wd : '', jtime: j ? j.time : '', group: fx ? fx.group : '', sortKey: fx ? kickoffInstant(fx) : 0 };
    entry.marks = [false, false, false];
    entry.marks[topOf(entry.probs)] = true;
    return entry;
  }

  function initToto() {
    schedSorted = (D.schedule || []).map(function (_, i) { return i; })
      .sort(function (x, y) { return kickoffInstant(D.schedule[x]) - kickoffInstant(D.schedule[y]); });
    // 指定試合カードのセレクト（ラウンド定義 → toto/mini A/mini B に展開）
    var cardSel = $('totoCardSel');
    var availCards = [];
    (D.totoCards || []).forEach(function (r) {
      var mk = function (pairs) { return pairs.map(function (p) { return { home: p[0], away: p[1] }; }); };
      availCards.push({ round: r.round, product: 'toto（13試合）', saleClose: r.saleClose, note: r.note, matches: mk(r.toto) });
      availCards.push({ round: r.round, product: 'mini toto A（5試合）', saleClose: r.saleClose, note: r.note, matches: mk(r.toto.slice(0, 5)) });
      availCards.push({ round: r.round, product: 'mini toto B（5試合）', saleClose: r.saleClose, note: r.note, matches: mk(r.toto.slice(5, 10)) });
    });
    if (availCards.length) {
      cardSel.innerHTML = '<option value="">— カードを選択 —</option>';
      availCards.forEach(function (c, i) {
        var o = document.createElement('option'); o.value = i;
        o.textContent = c.round + ' ' + c.product + (c.saleClose ? '・締切' + c.saleClose : '');
        cardSel.appendChild(o);
      });
    } else {
      cardSel.innerHTML = '<option value="">（指定試合カード未登録 — 自動作成/手動で作成）</option>';
    }
    cardSel.addEventListener('change', function () {
      if (cardSel.value === '') return;
      loadDesignated(availCards[+cardSel.value]);
    });
    // 追加セレクト（全72試合）
    var addSel = $('totoAddSel');
    addSel.innerHTML = '<option value="">＋ 試合を選んで追加</option>';
    schedSorted.forEach(function (i) {
      var m = D.schedule[i], jj = toJST(m); var o = document.createElement('option'); o.value = i;
      o.textContent = jj.md + '(' + jj.wd + ') ' + jj.time + ' ' + m.teamA + ' vs ' + m.teamB + '（G' + m.group + '）';
      addSel.appendChild(o);
    });
    addSel.addEventListener('change', function () {
      if (addSel.value === '') return;
      var m = D.schedule[+addSel.value];
      if (!totoCard.some(function (e) { return findFixture(e.home, e.away) === m; })) {
        var entry = predictCardMatch(m.teamA, m.teamB);
        if (entry) totoCard.push(entry);
        renderToto();
      }
      addSel.value = '';
    });

    $('totoMini').addEventListener('click', function () { buildNext(5, 'mini toto 相当'); });
    $('totoFull').addEventListener('click', function () { buildNext(13, 'toto 相当'); });
    $('totoOpt').addEventListener('click', optimizeTotoUI);
    $('totoClear').addEventListener('click', function () { totoCard = []; $('totoCardSel').value = ''; $('totoCardInfo').textContent = ''; $('totoNote').textContent = ''; renderToto(); });

    // 既定: 指定カードがあれば先頭を読込、無ければ直近13
    if (availCards.length) { cardSel.value = '0'; loadDesignated(availCards[0]); }
    else buildNext(13, 'toto 相当');
  }

  function buildNext(n, labelTxt) {
    totoCard = [];
    $('totoCardSel').value = '';
    for (var j = 0; j < n && j < schedSorted.length; j++) {
      var m = D.schedule[schedSorted[j]];
      var e = predictCardMatch(m.teamA, m.teamB);
      if (e) totoCard.push(e);
    }
    $('totoCardInfo').innerHTML = '<b style="color:var(--txt)">自動作成（' + labelTxt + '・直近' + n + '試合）</b> — ホームは日程の第1チーム。実際の指定試合は楽天toto等でご確認ください。';
    $('totoNote').textContent = '予算（最大組合せ数）を決めて「最適化」すると、拮抗試合だけ自動でダブル/トリプルに広がります。';
    renderToto();
  }

  function loadDesignated(cardDef) {
    totoCard = [];
    var dropped = [];
    cardDef.matches.forEach(function (mt) {
      var e = predictCardMatch(mt.home, mt.away);
      if (e) totoCard.push(e); else dropped.push(mt.home + ' vs ' + mt.away);
    });
    var info = '<b style="color:var(--txt)">' + cardDef.round + ' ' + cardDef.product + '</b>';
    if (cardDef.saleClose) info += ' ／ 締切: ' + cardDef.saleClose;
    if (cardDef.note) info += '<br><span class="note">' + cardDef.note + '</span>';
    if (dropped.length) info += '<br><span class="tag amber">未対応 ' + dropped.length + '件</span> ' + dropped.join(', ');
    $('totoCardInfo').innerHTML = info;
    $('totoNote').textContent = 'JSC指定の対象試合を読み込みました。予算内で「最適化」して買い目を組み立ててください。';
    renderToto();
  }

  function optimizeTotoUI() {
    if (!totoCard.length) { $('totoNote').textContent = '先にカードを読み込むか自動作成してください。'; return; }
    var budget = parseInt($('totoBudget').value, 10) || 1;
    var res = E.optimizeToto(totoCard.map(function (e) { return e.probs; }), budget);
    res.forEach(function (r, i) { totoCard[i].marks = [false, false, false]; r.idxs.forEach(function (o) { totoCard[i].marks[o] = true; }); });
    var nD = res.filter(function (r) { return r.k === 2; }).length, nT = res.filter(function (r) { return r.k === 3; }).length;
    $('totoNote').textContent = '予算' + budget + '組合せ内で最適化: ダブル' + nD + '試合 / トリプル' + nT + '試合に拡張しました。';
    renderToto();
  }

  function totoMiniBar(p) {
    return '<div class="bar1x2" style="height:15px;border-radius:6px;margin-top:4px">' +
      '<div class="seg home" style="width:' + (p[0] * 100) + '%;font-size:9px">' + Math.round(p[0] * 100) + '</div>' +
      '<div class="seg draw" style="width:' + (p[1] * 100) + '%;font-size:9px">' + Math.round(p[1] * 100) + '</div>' +
      '<div class="seg away" style="width:' + (p[2] * 100) + '%;font-size:9px">' + Math.round(p[2] * 100) + '</div></div>';
  }
  function renderToto() {
    var rows = '<tr><th>#</th><th>日付</th><th>対戦（1=ホーム / 0 / 2=アウェイ ％）</th><th class="num">1</th><th class="num">0</th><th class="num">2</th><th></th></tr>';
    totoCard.forEach(function (e, idx) {
      var p = e.probs, top = topOf(p);
      rows += '<tr>';
      rows += '<td class="num note">' + (idx + 1) + '</td>';
      rows += '<td class="note" style="white-space:nowrap">' + (e.jmd ? e.jmd + '(' + e.jwd + ')' : '—') + '<br><b style="color:var(--txt)">' + (e.jtime || '') + '</b> <span style="font-size:10px">JST</span>' + (e.group ? '<br>G' + e.group : '') + '</td>';
      rows += '<td><div style="display:flex;align-items:center;gap:6px;white-space:nowrap">' + flag(e.home) + '<b>' + e.home + '</b> <span class="note">vs</span> ' + flag(e.away) + '<b>' + e.away + '</b></div>' + totoMiniBar(p) + '</td>';
      [0, 1, 2].forEach(function (o) {
        rows += '<td class="num" style="white-space:nowrap">' + (o === top ? '<span style="color:var(--gold)">★</span>' : '') +
          '<input type="checkbox" class="totoMark" data-i="' + idx + '" data-o="' + o + '" ' + (e.marks[o] ? 'checked' : '') + ' /></td>';
      });
      rows += '<td><button class="totoDel" data-i="' + idx + '" title="削除" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px">×</button></td>';
      rows += '</tr>';
    });
    $('totoTable').innerHTML = rows;
    $('totoTable').querySelectorAll('.totoMark').forEach(function (cb) {
      cb.addEventListener('change', function () { totoCard[+cb.dataset.i].marks[+cb.dataset.o] = cb.checked; updateTotoSummary(); });
    });
    $('totoTable').querySelectorAll('.totoDel').forEach(function (btn) {
      btn.addEventListener('click', function () { totoCard.splice(+btn.dataset.i, 1); renderToto(); });
    });
    updateTotoSummary();
  }
  function updateTotoSummary() {
    var probsList = [], selections = [];
    totoCard.forEach(function (e) {
      if (e.marks[0] || e.marks[1] || e.marks[2]) { probsList.push(e.probs); selections.push(e.marks); }
    });
    var s = E.totoSummary(probsList, selections);
    var html = '<div class="kpis">';
    html += kpi(s.matches, '試合数');
    html += kpi(s.combos.toLocaleString(), '組合せ');
    html += kpi('¥' + s.cost.toLocaleString(), '金額(¥100/口)');
    html += kpi((s.hitProb * 100).toFixed(2) + '%', '全的中確率');
    html += '</div>';
    if (s.matches) html += '<p class="note" style="margin-top:8px">期待的中数: <b style="color:var(--txt)">' + s.expCorrect.toFixed(2) + ' / ' + s.matches + '試合</b>。全的中は難関ですが、totoは1等が高額＆キャリーオーバーがあるため、人気薄の正解を含むほど配当妙味が増します。</p>';
    else html += '<p class="note" style="margin-top:8px">カードが空です。指定試合カードを選ぶか自動作成してください。</p>';
    $('totoSummary').innerHTML = html;
  }

  /* ---------- totoGOAL3（得点数予想） ---------- */
  function initGoal3() {
    var sel = $('goal3Sel');
    var rounds = (D.totoCards || []).filter(function (r) { return r.goal3 && r.goal3.length; });
    if (!rounds.length) { $('goal3Card').style.display = 'none'; return; }
    sel.innerHTML = '';
    rounds.forEach(function (r, i) { var o = document.createElement('option'); o.value = i; o.textContent = r.round + '（締切' + (r.saleClose || '') + '）'; sel.appendChild(o); });
    sel.addEventListener('change', function () { renderGoal3(rounds[+sel.value]); });
    renderGoal3(rounds[0]);
  }
  function predictGoalBuckets(home, away) {
    if (!D.teams[home] || !D.teams[away]) return null;
    var fx = findFixture(home, away), ctxA = {}, ctxB = {};
    if (fx) { var c = autoContextFromMatch(fx); if (fx.teamA === home) { ctxA = c.a; ctxB = c.b; } else { ctxA = c.b; ctxB = c.a; } }
    var a = team(home), b = team(away);
    a.eloEff = E.buildEffElo(a, ctxA, { form: 40 }); b.eloEff = E.buildEffElo(b, ctxB, { form: 40 });
    var gb = E.goalBuckets(E.predict(a, b, { baseTotal: 2.6 }).matrix);
    return { gb: gb, jst: fx ? toJST(fx) : null };
  }
  function renderGoal3(round) {
    var html = '';
    round.goal3.forEach(function (pair, idx) {
      var r = predictGoalBuckets(pair[0], pair[1]);
      if (!r) return;
      html += '<div style="margin-bottom:12px">';
      html += '<div class="note" style="margin-bottom:4px">第' + (idx + 1) + '試合' + (r.jst ? ' ・ ' + r.jst.md + '(' + r.jst.wd + ') ' + r.jst.time + ' JST' : '') + '</div>';
      html += '<div class="grid cols2">' + goalBucketRow(pair[0], r.gb.home) + goalBucketRow(pair[1], r.gb.away) + '</div>';
      html += '</div>';
    });
    $('goal3Box').innerHTML = html;
  }

  /* ---------- レーティング表 ---------- */
  function renderRatings(filter) {
    var rows = teamNames.map(function (n) { return team(n); }).sort(function (a, b) { return (b.elo || 0) - (a.elo || 0); });
    if (filter) { var f = filter.toLowerCase(); rows = rows.filter(function (t) { return t.name.toLowerCase().indexOf(f) >= 0; }); }
    var html = '<tr><th>#</th><th>チーム</th><th class="num">Elo</th><th class="num">FIFA</th><th class="num">調子</th><th>組</th><th>主力 / 負傷</th></tr>';
    rows.forEach(function (t, i) {
      var grp = (D.groups || []).find(function (g) { return g.teams.indexOf(t.name) >= 0; });
      var info = (t.star ? t.star : '') + (t.inj ? ' ／ <span style="color:var(--amber)">' + t.inj + '</span>' : '');
      html += '<tr><td class="num">' + (i + 1) + '</td>';
      html += '<td>' + flag(t.name) + ' ' + t.name + '</td>';
      html += '<td class="num">' + (t.elo ? Math.round(t.elo) : '—') + '</td>';
      html += '<td class="num">' + (t.fifaRank ? '#' + t.fifaRank : '—') + '</td>';
      html += '<td class="num">' + (t.form != null ? t.form : '—') + '</td>';
      html += '<td>' + (grp ? grp.group : '—') + '</td>';
      html += '<td class="note" style="font-size:12px">' + info + '</td></tr>';
    });
    $('ratingsTable').innerHTML = html;
  }

  /* ---------- メタ・出典 ---------- */
  function renderMeta() {
    if (D.meta && D.meta.title) $('metaSub').textContent = D.meta.title;
    $('foot').textContent = 'データ最終更新: ' + (D.meta && D.meta.updated || '—') + '　|　予測は確率です。賭けは自己責任で。';
    if (D.meta && D.meta.sources) $('sourcesBox').innerHTML = '<ul>' + D.meta.sources.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- 初期化 ---------- */
  function init() {
    if (!teamNames.length) { $('result').innerHTML = '<div class="card"><p class="note">チームデータ(data.js)が読み込まれていません。</p></div>'; return; }
    // 会場補正に「自動」を追加
    var opt = document.createElement('option'); opt.value = 'auto'; opt.textContent = '自動（日程から読込時）';
    $('venuePreset').insertBefore(opt, $('venuePreset').firstChild);

    var top = teamNames.slice().sort(function (a, b) { return eloOf(b) - eloOf(a); });
    fillTeamSelect($('teamA'), top[0]);
    fillTeamSelect($('teamB'), top[1]);

    $('predictBtn').addEventListener('click', function () { autoCtx = null; if ($('venuePreset').value === 'auto') $('venuePreset').value = 'neutral'; runPredict(); });
    $('evBtn').addEventListener('click', runEV);
    $('swapBtn').addEventListener('click', function () { var a = $('teamA').value; $('teamA').value = $('teamB').value; $('teamB').value = a; runPredict(); });
    $('venuePreset').addEventListener('change', runPredict);
    $('formW').addEventListener('input', function () { $('formWLbl').textContent = $('formW').value; });
    $('totalW').addEventListener('input', function () { $('totalLbl').textContent = parseFloat($('totalW').value).toFixed(1); });
    $('fillFairBtn').addEventListener('click', function () {
      if (!lastWinnerOpts) return;
      $('winnerTable').querySelectorAll('.oddsIn').forEach(function (inp) {
        var i = parseInt(inp.dataset.idx, 10); var o = lastWinnerOpts[i];
        // フェア倍率を切り捨てて入れる（丸め誤差で見せかけの+EVを出さない）
        inp.value = o.prob > 0 ? (Math.floor((1 / o.prob) * 100) / 100).toFixed(2) : ''; recalcWinnerRow(i);
      });
      updateWinnerSummary();
    });
    $('clearOddsBtn').addEventListener('click', function () {
      $('winnerTable').querySelectorAll('.oddsIn').forEach(function (inp) { inp.value = ''; recalcWinnerRow(parseInt(inp.dataset.idx, 10)); });
      updateWinnerSummary();
    });
    $('ratingSearch').addEventListener('input', function () { renderRatings(this.value); });

    renderGroups();
    renderSchedule();
    initGroupSim();
    initChampion();
    initToto();
    initGoal3();
    renderRatings('');
    renderMeta();
    runPredict();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
