// ═══════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════

/**
 * Shorthand for document.getElementById.
 * Usage: $('my-id') instead of document.getElementById('my-id')
 * Note: This is NOT jQuery — it's a lightweight DOM helper.
 * @param {string} id - The element ID to look up
 * @returns {HTMLElement|null}
 */
const $ = id => document.getElementById(id);

/** Set text content of element by ID (no-op if element not found) */
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

// ═══════════════════════════════════════════════════════
// EXTENDED UTILS (predictive analytics)
// ═══════════════════════════════════════════════════════

/**
 * Parse a CSV text string into an array of row-objects.
 * Handles quoted fields and UTF-8 BOM.
 */
function parseCSV(text) {
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    if (vals.length === 0) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] ?? '').trim(); });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

/**
 * Haversine great-circle distance in km.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get [lon, lat] centroid from a GeoJSON feature (Point or Polygon).
 */
function getCentroid(feature) {
  const geom = feature.geometry;
  if (geom.type === 'Point') return geom.coordinates.slice(0, 2);
  // Polygon or MultiPolygon — average outer ring
  let ring = geom.type === 'MultiPolygon'
    ? geom.coordinates[0][0]
    : geom.coordinates[0];
  const lons = ring.map(c => c[0]);
  const lats = ring.map(c => c[1]);
  return [
    lons.reduce((a, b) => a + b, 0) / lons.length,
    lats.reduce((a, b) => a + b, 0) / lats.length,
  ];
}

/**
 * Color ramp for Future Risk Score (warm palette: green → yellow → red).
 */
function futureRiskColor(score) {
  if (score < 20) return '#16a34a';
  if (score < 40) return '#84cc16';
  if (score < 55) return '#eab308';
  if (score < 70) return '#f97316';
  return '#dc2626';
}

/** Return trend emoji for a Trend_Direction string. */
function trendIcon(direction) {
  return direction === 'Rising' ? '⬆️' : direction === 'Declining' ? '⬇️' : '➡️';
}

/**
 * Convert projected Alabama State Plane West coordinates to WGS-84 [lon, lat].
 * Calibrated from 53 reference points (residuals < 50 m).
 */
function projToLatLon(x, y) {
  const X_ORIGIN  = 521014.70,  Y_ORIGIN  = 679372.69;
  const LON_ORIGIN = -86.271064, LAT_ORIGIN = 32.366903;
  const SCALE_LON  = 3.2413e-6,  SCALE_LAT  = 2.7419e-6;
  return [
    LON_ORIGIN + SCALE_LON * (x - X_ORIGIN),
    LAT_ORIGIN + SCALE_LAT * (y - Y_ORIGIN),
  ];
}
