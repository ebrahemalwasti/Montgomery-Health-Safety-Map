// ═══════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════

const $ = id => document.getElementById(id);

const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };

function showErr(msg) {
  const e = $('err-banner');
  e.innerHTML = '⚠️ ' + msg;
  e.style.display = 'block';
  setTimeout(() => e.style.display = 'none', 7000);
}

function scoreColor(s) {
  return s < 30 ? '#dc2626' : s < 50 ? '#f97316' : s < 70 ? '#eab308' : s < 85 ? '#4ade80' : '#16a34a';
}

function riskBadgeClass(r) {
  return r === 'High' ? 'b-high' : r === 'Medium' ? 'b-med' : 'b-low';
}
