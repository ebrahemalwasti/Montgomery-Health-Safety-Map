// ═══════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════
function computeStats() {
  const F   = gData.features;
  const sc  = F.map(f => +f.properties.Score_100 || 0);
  const N   = F.length;
  const avg = (sc.reduce((a, b) => a + b, 0) / N).toFixed(1);
  const nH  = F.filter(f => f.properties.RiskLevel === 'High').length;
  const nM  = F.filter(f => f.properties.RiskLevel === 'Medium').length;
  const nL  = F.filter(f => f.properties.RiskLevel === 'Low').length;
  const s   = [...F].sort((a, b) => a.properties.Score_100 - b.properties.Score_100);
  const w   = s[0]?.properties;
  const b   = s[N - 1]?.properties;
  const hs  = F.filter(f => +f.properties.Score_100 < 30).length;
  const mn  = Math.min(...sc).toFixed(1);
  const mx  = Math.max(...sc).toFixed(1);
  const va  = (sc.reduce((a, v) => a + (v - avg) ** 2, 0) / N).toFixed(1);

  // sidebar
  set('s-total', N.toLocaleString());
  set('s-avg',   avg);
  set('s-high',  nH.toLocaleString());
  set('s-low',   nL.toLocaleString());
  // navbar
  set('nb-zones', N.toLocaleString());
  set('nb-avg',   avg);
  set('nb-high',  nH.toLocaleString());
  // top cards
  set('ic-avg',   avg);
  set('ic-worst', 'Zone ' + (w?.grid_id ?? w?.ZoneID ?? '—'));
  set('ic-ws',    'score ' + (+w?.Score_100 || 0).toFixed(1));
  set('ic-best',  'Zone ' + (b?.grid_id ?? b?.ZoneID ?? '—'));
  set('ic-bs',    'score ' + (+b?.Score_100 || 0).toFixed(1));
  set('ic-hs',    hs.toLocaleString());

  // bars
  requestAnimationFrame(() => {
    setBar('rf-h', 'rp-h', nH, N);
    setBar('rf-m', 'rp-m', nM, N);
    setBar('rf-l', 'rp-l', nL, N);
  });
  buildDonut(nH, nM, nL);
  buildZones(s.slice(0, 5));
  buildRecs(s.slice(0, 3));
  buildInsights({ mn, mx, va, w, b, hs });
}

function setBar(fid, pid, n, t) {
  const pct = t ? ((n / t) * 100).toFixed(1) : 0;
  const fe = $(fid); if (fe) fe.style.width = pct + '%';
  set(pid, pct + '%');
}

// ═══════════════════════════════════════════════════════
// DONUT
// ═══════════════════════════════════════════════════════
function buildDonut(h, m, l) {
  const total = h + m + l; if (!total) return;
  const svg = $('donut'); svg.innerHTML = '';
  const cx = 54, cy = 54, r = 36, sw = 13;
  const cols = ['#dc2626', '#f97316', '#16a34a'], vals = [h, m, l];
  let acc = -Math.PI / 2;

  // bg
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', cx); bg.setAttribute('cy', cy); bg.setAttribute('r', r);
  bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#f1f5f9'); bg.setAttribute('stroke-width', sw);
  svg.appendChild(bg);

  vals.forEach((v, i) => {
    if (!v) return;
    const angle = (v / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(acc), y1 = cy + r * Math.sin(acc);
    const x2 = cx + r * Math.cos(acc + angle), y2 = cy + r * Math.sin(acc + angle);
    const lg = angle > Math.PI ? 1 : 0;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2}`);
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', cols[i]); path.setAttribute('stroke-width', sw);
    const len = r * angle;
    path.style.cssText = `stroke-dasharray:${len};stroke-dashoffset:${len};animation:da${i} .9s ${.15 + i * .12}s ease forwards`;
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    st.textContent = `@keyframes da${i}{to{stroke-dashoffset:0}}`;
    svg.appendChild(st); svg.appendChild(path);
    acc += angle;
  });

  const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t1.setAttribute('x', cx); t1.setAttribute('y', cy - 5); t1.setAttribute('text-anchor', 'middle');
  t1.setAttribute('fill', '#0f172a'); t1.setAttribute('font-size', '15'); t1.setAttribute('font-weight', '700'); t1.setAttribute('font-family', 'DM Sans,sans-serif');
  t1.textContent = total.toLocaleString();
  const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t2.setAttribute('x', cx); t2.setAttribute('y', cy + 9); t2.setAttribute('text-anchor', 'middle');
  t2.setAttribute('fill', '#94a3b8'); t2.setAttribute('font-size', '8'); t2.setAttribute('font-family', 'DM Mono,monospace');
  t2.textContent = 'ZONES';
  svg.appendChild(t1); svg.appendChild(t2);
}

// ═══════════════════════════════════════════════════════
// BAR CHART
// ═══════════════════════════════════════════════════════
function buildCharts() {
  const sc = gData.features.map(f => +f.properties.Score_100 || 0);
  const bkts = [['0–30', [0, 30], '#dc2626'], ['30–50', [30, 50], '#f97316'], ['50–70', [50, 70], '#eab308'], ['70–85', [70, 85], '#4ade80'], ['85–100', [85, 101], '#16a34a']];
  const cnts = bkts.map(([, r]) => sc.filter(s => s >= r[0] && s < r[1]).length);
  const mx = Math.max(...cnts) || 1;
  const wrap = $('bc'); wrap.innerHTML = '';
  bkts.forEach(([lbl,, col], i) => {
    const row = document.createElement('div'); row.className = 'bc-r';
    row.innerHTML = `<div class="bc-lb">${lbl}</div><div class="bc-tr"><div class="bc-fi" id="bf${i}" style="background:${col}"></div></div><div class="bc-n">${cnts[i].toLocaleString()}</div>`;
    wrap.appendChild(row);
    requestAnimationFrame(() => setTimeout(() => { const e = $('bf' + i); if (e) e.style.width = ((cnts[i] / mx) * 100) + '%'; }, 150 + i * 60));
  });
}

// ═══════════════════════════════════════════════════════
// ZONE LIST
// ═══════════════════════════════════════════════════════
function buildZones(sorted) {
  const w = $('zone-list'); w.innerHTML = '';
  sorted.forEach((f, i) => {
    const p = f.properties, s = +p.Score_100 || 0;
    const col = scoreColor(s);
    const d = document.createElement('div'); d.className = 'zone-item';
    d.innerHTML = `<div class="zi-n">${i + 1}</div><div class="zi-id">Zone ${p.grid_id ?? p.ZoneID ?? '—'}</div><div class="zi-s" style="color:${col}">${s.toFixed(1)}</div>`;
    d.addEventListener('click', () => flyTo(f));
    w.appendChild(d);
  });
}

// ═══════════════════════════════════════════════════════
// RECOMMENDATIONS
// ═══════════════════════════════════════════════════════
function buildRecs(sorted) {
  const w = $('rec-list'); w.innerHTML = '';
  sorted.forEach((f, i) => {
    const p = f.properties;
    const d = document.createElement('div'); d.className = 'rec-card';
    d.innerHTML = `<div class="rc-rk">${i + 1}</div><div class="rc-body"><div class="rc-zone">Zone ${p.grid_id ?? p.ZoneID ?? '—'}</div><div class="rc-score">Score: ${(+p.Score_100 || 0).toFixed(1)} / 100</div></div><span class="badge ${riskBadgeClass(p.RiskLevel)}">${p.RiskLevel || '—'}</span>`;
    d.addEventListener('click', () => flyTo(f));
    w.appendChild(d);
  });
}

// ═══════════════════════════════════════════════════════
// INSIGHTS
// ═══════════════════════════════════════════════════════
function buildInsights({ mn, mx, va, w, b, hs }) {
  const wrap = $('ins-rows');
  const rows = [
    ['Score Range',   `${mn} → ${mx}`],
    ['Variance',      va],
    ['Hotspot Zones', hs.toLocaleString()],
    ['Safest Zone',   `Zone ${b?.grid_id ?? b?.ZoneID ?? '—'} (${(+b?.Score_100 || 0).toFixed(1)})`],
    ['Most Critical', `Zone ${w?.grid_id ?? w?.ZoneID ?? '—'} (${(+w?.Score_100 || 0).toFixed(1)})`],
  ];
  wrap.innerHTML = '';
  rows.forEach(([l, v]) => {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:6px;background:var(--surface2);border:1px solid var(--border)';
    d.innerHTML = `<span style="font-family:var(--mono);font-size:9px;color:var(--text-3)">${l}</span><span style="font-family:var(--mono);font-size:10px;font-weight:600;color:var(--text-1)">${v}</span>`;
    wrap.appendChild(d);
  });
}

// ═══════════════════════════════════════════════════════
// FLY TO FEATURE
// ═══════════════════════════════════════════════════════
function flyTo(f) {
  const c = f.geometry.coordinates.flat(Infinity);
  const lngs = c.filter((_, i) => i % 2 === 0), lats = c.filter((_, i) => i % 2 === 1);
  map.flyTo({ center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2], zoom: 13, duration: 1100 });
}
