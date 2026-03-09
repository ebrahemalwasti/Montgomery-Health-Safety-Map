// ═══════════════════════════════════════════════════════
// HOVER STATE
// ═══════════════════════════════════════════════════════
let hovId = null;
let tt;

// ═══════════════════════════════════════════════════════
// MAP LAYERS
// ═══════════════════════════════════════════════════════
function addLayers() {

  // MAIN GRID SOURCE
  map.addSource('z', { type: 'geojson', data: gData, generateId: true });

  // SCORE choropleth
  map.addLayer({
    id: 'z-score', type: 'fill', source: 'z',
    paint: {
      'fill-color': [
        'interpolate', ['linear'], ['get', 'Score_100'],
        0, '#dc2626', 30, '#f97316', 50, '#eab308', 70, '#86efac', 85, '#22c55e', 100, '#16a34a'
      ],
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.88, 0.62]
    }
  });

  // RISK categorical
  map.addLayer({
    id: 'z-risk', type: 'fill', source: 'z',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': ['match', ['get', 'RiskLevel'], 'High', '#dc2626', 'Medium', '#f97316', 'Low', '#16a34a', '#94a3b8'],
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.88, 0.62]
    }
  });

  // GRID BORDERS
  map.addLayer({
    id: 'z-border', type: 'line', source: 'z',
    paint: {
      'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#1e40af', 'rgba(100,120,180,0.25)'],
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.8, 0.3]
    }
  });

  // ═══════════════════════════════════════════════════════
  // CITY LIMITS
  // ═══════════════════════════════════════════════════════
  map.addSource("city-limit", {
    type: "geojson",
    data: "City_Limit.geojson"
  });

  map.addLayer({
    id: "city-limit-outline",
    type: "line",
    source: "city-limit",
    paint: {
      "line-color": "#000000",
      "line-width": 2,
      "line-opacity": 0.85
    }
  });

  // EVENTS
  setupEvents();
}

// ═══════════════════════════════════════════════════════
// HOVER & CLICK
// ═══════════════════════════════════════════════════════
function setupEvents() {
  tt = $('tt');

  ['z-score', 'z-risk'].forEach(layer => {
    map.on('mousemove', layer, e => {
      if (!e.features.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features[0];
      if (hovId !== null) map.setFeatureState({ source: 'z', id: hovId }, { hover: false });
      hovId = f.id;
      map.setFeatureState({ source: 'z', id: hovId }, { hover: true });
      const p = f.properties;
      const s = +p.Score_100 || 0;
      const frs = p.Future_Risk_Score != null ? (+p.Future_Risk_Score).toFixed(1) : null;
      $('tt-zid').textContent = 'ZONE ' + (p.grid_id ?? p.ZoneID ?? hovId);
      $('tt-sc').textContent  = s.toFixed(1);
      $('tt-sc').style.color  = scoreColor(s);
      const rc = p.RiskLevel === 'High' ? 'var(--danger)' : p.RiskLevel === 'Medium' ? 'var(--warn)' : 'var(--safe)';
      $('tt-rk').innerHTML = `<span style="color:${rc};font-weight:600">${p.RiskLevel || '—'}</span> Risk`;
      // Show future risk in tooltip if available
      const ttFrs = $('tt-frs');
      if (ttFrs) {
        if (frs !== null) {
          ttFrs.style.display = '';
          ttFrs.innerHTML = `🔮 <span style="color:${futureRiskColor(+frs)};font-weight:600">${frs}</span> predicted`;
        } else {
          ttFrs.style.display = 'none';
        }
      }
      tt.style.display = 'block';
      tt.style.left = (e.point.x + 14) + 'px';
      tt.style.top  = (e.point.y - 14) + 'px';
    });

    map.on('mouseleave', layer, () => {
      map.getCanvas().style.cursor = '';
      if (hovId !== null) map.setFeatureState({ source: 'z', id: hovId }, { hover: false });
      hovId = null;
      tt.style.display = 'none';
    });

    map.on('click', layer, e => {
      if (e.features.length) openPopup(e.features[0], e.lngLat);
    });
  });
}

function openPopup(feature, lngLat) {
  const p   = feature.properties;
  const s   = (+p.Score_100 || 0).toFixed(1);
  const r   = p.RiskLevel || 'Unknown';
  const zid = p.grid_id ?? p.ZoneID ?? feature.id;
  const sc  = scoreColor(+s);
  const ex  = p.Explanation || 'No explanation available.';
  const badgeCls = riskBadgeClass(r);

  // Predictive fields
  const frs  = p.Future_Risk_Score != null ? (+p.Future_Risk_Score).toFixed(1) : null;
  const td   = p.Trend_Direction || null;
  const ai   = p.AI_Insight || null;
  const nPharm = p.nearby_pharmacies ?? '—';
  const nShelt = p.nearby_shelters ?? '—';
  const nPark  = p.nearby_parks ?? '—';
  const dPharm = p.nearest_pharmacy_km != null ? (+p.nearest_pharmacy_km).toFixed(1) + ' km' : '—';
  const dShelt = p.nearest_shelter_km  != null ? (+p.nearest_shelter_km).toFixed(1)  + ' km' : '—';

  const predictiveSection = frs !== null ? `
    <div class="pu-sec-hd">🔮 Predicted Risk</div>
    <div class="pu-pred-row">
      <span class="pu-frs" style="color:${futureRiskColor(+frs)}">${frs}/100</span>
      ${td ? `<span class="pu-trend">${trendIcon(td)} ${td}</span>` : ''}
    </div>
    ${ai ? `<div class="pu-ai">${ai}</div>` : ''}
    <div class="pu-sec-hd">📍 Nearby Resources</div>
    <div class="pu-resources">
      <span>💊 ${nPharm} pharmacies</span><span>🏠 ${nShelt} shelters</span><span>🌳 ${nPark} parks</span>
    </div>
    <div class="pu-resources">
      <span>Nearest pharmacy: ${dPharm}</span><span>Nearest shelter: ${dShelt}</span>
    </div>` : '';

  new maplibregl.Popup({ closeButton: true, maxWidth: '360px', offset: 8 })
    .setLngLat(lngLat)
    .setHTML(`
      <div class="pu">
        <div class="pu-top">
          <div>
            <div class="pu-zid">ZONE ${zid}</div>
            <div class="pu-score" style="color:${sc}">${s}</div>
            <div class="pu-slab">/ 100 HEALTH &amp; SAFETY SCORE</div>
          </div>
          <span class="badge ${badgeCls}" style="margin-top:4px">${r.toUpperCase()}</span>
        </div>
        <div class="pu-bar"><div class="pu-fill" style="width:${s}%;background:${sc}"></div></div>
        <div class="pu-sec-hd">AI Analysis</div>
        <div class="pu-expl">${ex}</div>
        ${predictiveSection}
      </div>
    `).addTo(map);
}

// ═══════════════════════════════════════════════════════
// LAYER SWITCH
// ═══════════════════════════════════════════════════════
function setLayer(mode) {
  curLayer = mode; filterOn = false; hotOn = false;
  map.setFilter('z-score', null); map.setFilter('z-risk', null);
  if (mode === 'score') {
    map.setLayoutProperty('z-score', 'visibility', 'visible');
    map.setLayoutProperty('z-risk',  'visibility', 'none');
    $('leg-score').style.display = ''; $('leg-risk').style.display = 'none';
    $('leg-t').textContent = 'Health & Safety Score';
  } else {
    map.setLayoutProperty('z-score', 'visibility', 'none');
    map.setLayoutProperty('z-risk',  'visibility', 'visible');
    $('leg-score').style.display = 'none'; $('leg-risk').style.display = '';
    $('leg-t').textContent = 'Risk Category';
  }
  document.querySelectorAll('.cb').forEach(b => b.classList.remove('on'));
  $(mode === 'score' ? 'c-score' : 'c-risk').classList.add('on');
}

// ═══════════════════════════════════════════════════════
// HOTSPOT
// ═══════════════════════════════════════════════════════
function toggleHotspot() {
  if (!gData) return;
  hotOn = !hotOn;
  $('c-hot').classList.toggle('on', hotOn);
  if (hotOn) {
    const scores = gData.features.map(f => +f.properties.Score_100 || 0).sort((a, b) => a - b);
    const thresh = scores[Math.floor(scores.length * .15)];
    const f = ['<=', ['get', 'Score_100'], thresh];
    map.setFilter('z-score', f); map.setFilter('z-risk', f);
  } else {
    map.setFilter('z-score', null); map.setFilter('z-risk', null);
  }
}

// ═══════════════════════════════════════════════════════
// FILTER HIGH RISK
// ═══════════════════════════════════════════════════════
function toggleFilter() {
  filterOn = !filterOn;
  $('c-filter').classList.toggle('on', filterOn);
  const f = filterOn ? ['==', ['get', 'RiskLevel'], 'High'] : null;
  map.setFilter('z-score', f); map.setFilter('z-risk', f);
}

// ═══════════════════════════════════════════════════════
// ZOOM HIGH RISK
// ═══════════════════════════════════════════════════════
function zoomHighRisk() {
  if (!gData) return;
  const hi = gData.features.filter(f => f.properties.RiskLevel === 'High');
  if (!hi.length) { showErr('No high-risk zones.'); return; }
  let mn = Infinity, mx = -Infinity, ml = Infinity, xl = -Infinity;
  hi.forEach(f => {
    const c = f.geometry.coordinates.flat(Infinity);
    for (let i = 0; i < c.length; i += 2) {
      mn = Math.min(mn, c[i]); mx = Math.max(mx, c[i]);
      ml = Math.min(ml, c[i + 1]); xl = Math.max(xl, c[i + 1]);
    }
  });
  map.fitBounds([[mn, ml], [mx, xl]], { padding: 50, duration: 1300 });
}

// ═══════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════
function resetView() {
  filterOn = false; hotOn = false;
  map.setFilter('z-score', null); map.setFilter('z-risk', null);
  setLayer('score');
  fitCity();
}

// ═══════════════════════════════════════════════════════
// RESOURCE LAYERS
// ═══════════════════════════════════════════════════════

const RESOURCE_LAYER_CFG = [
  { key: 'shelters',  id: 'rl-shelters',  color: '#dc2626', label: '🏠 Tornado Shelters',    getData: () => shelterData },
  { key: 'pharmacies',id: 'rl-pharmacies',color: '#2563eb', label: '💊 Pharmacies',           getData: () => pharmacyData },
  { key: 'parks',     id: 'rl-parks',     color: '#16a34a', label: '🌳 Parks & Trails',       getData: () => parkData,     polygon: true },
  { key: 'community', id: 'rl-community', color: '#9333ea', label: '🏛 Community Centers',    getData: () => communityData },
  { key: 'fire',      id: 'rl-fire',      color: '#ea580c', label: '🚒 Fire Stations',        getData: () => fireData },
  { key: 'police',    id: 'rl-police',    color: '#1e3a8a', label: '🚔 Police Facilities',    getData: () => policeData },
  { key: 'poi',       id: 'rl-poi',       color: '#64748b', label: '📍 Points of Interest',   getData: () => poiData },
];

function addResourceLayers() {
  RESOURCE_LAYER_CFG.forEach(cfg => {
    const data = cfg.getData();
    if (!data) return;

    const srcId = cfg.id + '-src';
    if (map.getSource(srcId)) return; // already added

    map.addSource(srcId, { type: 'geojson', data });

    if (cfg.polygon) {
      // Park polygons — fill + outline
      map.addLayer({
        id: cfg.id + '-fill', type: 'fill', source: srcId,
        layout: { visibility: 'none' },
        paint: { 'fill-color': cfg.color, 'fill-opacity': 0.25 }
      });
      map.addLayer({
        id: cfg.id, type: 'line', source: srcId,
        layout: { visibility: 'none' },
        paint: { 'line-color': cfg.color, 'line-width': 1.5 }
      });
    } else {
      // Point layers — circle markers
      map.addLayer({
        id: cfg.id, type: 'circle', source: srcId,
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 7,
          'circle-color': cfg.color,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9,
        }
      });
      // Click popup for resource points
      map.on('click', cfg.id, e => {
        if (!e.features.length) return;
        const p = e.features[0].properties;
        const name = p.name || p.SHELTER || p.FACILITYID || p.Facility_Name || cfg.label;
        const addr = p.address || p.ST_NAME || p.FULLADDR || p.Facility_Address || '';
        new maplibregl.Popup({ closeButton: true, offset: 6 })
          .setLngLat(e.lngLat)
          .setHTML(`<div class="pu" style="min-width:200px"><div class="pu-zid">${cfg.label}</div><div style="font-weight:600;margin:4px 0">${name}</div>${addr ? `<div style="font-size:11px;color:#64748b">${addr}</div>` : ''}</div>`)
          .addTo(map);
      });
      map.on('mouseenter', cfg.id, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', cfg.id, () => { map.getCanvas().style.cursor = ''; });
    }
  });
}

/** Toggle a resource layer on/off; sync checkbox state. */
function toggleResourceLayer(layerId) {
  const cfg = RESOURCE_LAYER_CFG.find(c => c.id === layerId);
  if (!cfg) return;
  const vis = map.getLayoutProperty(cfg.id, 'visibility');
  const newVis = (vis === 'visible') ? 'none' : 'visible';
  map.setLayoutProperty(cfg.id, 'visibility', newVis);
  if (cfg.polygon) {
    try { map.setLayoutProperty(cfg.id + '-fill', 'visibility', newVis); } catch {}
  }
  // Sync checkbox
  const cb = $('chk-' + cfg.key);
  if (cb) cb.checked = (newVis === 'visible');
}

// ═══════════════════════════════════════════════════════
// FUTURE RISK HEATMAP
// ═══════════════════════════════════════════════════════

function toggleFutureRisk() {
  if (!gData) return;
  futureRiskOn = !futureRiskOn;
  const btn = $('c-future');
  if (btn) btn.classList.toggle('on', futureRiskOn);

  if (futureRiskOn) {
    if (!map.getSource('z-future')) {
      map.addSource('z-future', { type: 'geojson', data: gData });
    }
    if (!map.getLayer('z-future-fill')) {
      map.addLayer({
        id: 'z-future-fill', type: 'fill', source: 'z-future',
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'Future_Risk_Score'],
            0,  '#16a34a',
            25, '#84cc16',
            45, '#eab308',
            65, '#f97316',
            85, '#dc2626',
          ],
          'fill-opacity': 0.72
        }
      }, 'z-border'); // insert below the border layer
    }
    map.setLayoutProperty('z-future-fill', 'visibility', 'visible');
    map.setLayoutProperty('z-score', 'visibility', 'none');
    map.setLayoutProperty('z-risk',  'visibility', 'none');
    // Show future legend
    const ll = $('leg-future');
    if (ll) ll.style.display = '';
    $('leg-t').textContent = 'Future Risk Score';
  } else {
    if (map.getLayer('z-future-fill')) {
      map.setLayoutProperty('z-future-fill', 'visibility', 'none');
    }
    // Restore active layer
    setLayer(curLayer);
    const ll = $('leg-future');
    if (ll) ll.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════
// NEAREST RESOURCE MODE  (requires Turf.js)
// ═══════════════════════════════════════════════════════

function toggleNearestResource() {
  nearestOn = !nearestOn;
  const btn = $('c-nearest');
  if (btn) btn.classList.toggle('on', nearestOn);
  // Clear any existing line
  _clearNearestLine();
  if (!nearestOn) return;
  showErr('Click a zone to see nearest shelter & pharmacy.');
}

map && (map._nearestClickHandler = null); // placeholder — set after map is ready

function _handleNearestClick(feature, lngLat) {
  if (!nearestOn || !feature) return;
  _clearNearestLine();

  const center = getCentroid(feature);
  const pt = turf.point(center);

  // Build point collections
  const shelterFC = shelterData || { type: 'FeatureCollection', features: [] };
  const pharmFC   = pharmacyData || { type: 'FeatureCollection', features: [] };

  let nearestShelter = null, nearestPharm = null, dS = null, dP = null;

  if (shelterFC.features.length) {
    nearestShelter = turf.nearestPoint(pt, shelterFC);
    dS = turf.distance(pt, nearestShelter, { units: 'kilometers' });
  }
  if (pharmFC.features.length) {
    nearestPharm = turf.nearestPoint(pt, pharmFC);
    dP = turf.distance(pt, nearestPharm, { units: 'kilometers' });
  }

  // Draw lines to nearest resources
  const lineFeatures = [];
  if (nearestShelter) {
    lineFeatures.push(turf.lineString([center, nearestShelter.geometry.coordinates], { type: 'shelter', dist: dS }));
  }
  if (nearestPharm) {
    lineFeatures.push(turf.lineString([center, nearestPharm.geometry.coordinates], { type: 'pharmacy', dist: dP }));
  }

  if (lineFeatures.length) {
    const fc = turf.featureCollection(lineFeatures);
    if (map.getSource('nearest-line-src')) {
      map.getSource('nearest-line-src').setData(fc);
    } else {
      map.addSource('nearest-line-src', { type: 'geojson', data: fc });
      map.addLayer({
        id: 'nearest-line', type: 'line', source: 'nearest-line-src',
        paint: {
          'line-color': ['match', ['get', 'type'], 'shelter', '#dc2626', '#2563eb'],
          'line-width': 2.5,
          'line-dasharray': [4, 2],
        }
      });
    }
    nearestLine = 'nearest-line-src';

    // Popup with distances
    const lines = [
      dS != null ? `🏠 Shelter: ${dS.toFixed(2)} km` : '',
      dP != null ? `💊 Pharmacy: ${dP.toFixed(2)} km` : '',
    ].filter(Boolean).join('<br>');

    new maplibregl.Popup({ closeButton: true, offset: 8 })
      .setLngLat(lngLat)
      .setHTML(`<div class="pu"><div class="pu-sec-hd">📍 Nearest Resources</div><div style="font-size:13px;line-height:1.8">${lines}</div></div>`)
      .addTo(map);
  }
}

function _clearNearestLine() {
  if (nearestLine && map.getSource(nearestLine)) {
    if (map.getLayer('nearest-line')) map.removeLayer('nearest-line');
    map.removeSource(nearestLine);
    nearestLine = null;
  }
}

// Wire up nearest-resource click on main grid layers
// (called after setupEvents so it can piggyback on the existing click)
(function _hookNearestClick() {
  const orig = openPopup;
  window.openPopup = function(feature, lngLat) {
    orig(feature, lngLat);
    if (nearestOn) _handleNearestClick(feature, lngLat);
  };
}());

// ═══════════════════════════════════════════════════════
// VIEWPORT STATS  (called on map.on('moveend'))
// ═══════════════════════════════════════════════════════

function updateViewportStats() {
  if (!gData || !map) return;
  const wrap = $('viewport-stats');
  if (!wrap) return;

  // Query features currently in view using rendered features
  let rendered;
  try {
    rendered = map.queryRenderedFeatures({ layers: ['z-score', 'z-risk'] });
  } catch { rendered = []; }

  // Deduplicate by grid_id (same cell can appear multiple times in tiles)
  const seen = new Set();
  const uniq = [];
  rendered.forEach(f => {
    const key = f.properties.grid_id ?? f.id;
    if (!seen.has(key)) { seen.add(key); uniq.push(f.properties); }
  });

  const n = uniq.length;
  if (!n) { wrap.innerHTML = '<div class="vp-empty">Move map to see viewport analytics</div>'; return; }

  const avgScore = (uniq.reduce((a, p) => a + (+p.Score_100 || 0), 0) / n).toFixed(1);
  const nHigh    = uniq.filter(p => p.RiskLevel === 'High').length;
  const nRising  = uniq.filter(p => p.Trend_Direction === 'Rising').length;
  const avgFrs   = uniq.filter(p => p.Future_Risk_Score != null).length
    ? (uniq.reduce((a, p) => a + (+p.Future_Risk_Score || 0), 0) / n).toFixed(1)
    : '—';

  wrap.innerHTML = `
    <div class="vp-row"><span class="vp-l">Zones in view</span><span class="vp-v">${n}</span></div>
    <div class="vp-row"><span class="vp-l">Avg score</span><span class="vp-v" style="color:${scoreColor(+avgScore)}">${avgScore}</span></div>
    <div class="vp-row"><span class="vp-l">High-risk zones</span><span class="vp-v c-red">${nHigh}</span></div>
    <div class="vp-row"><span class="vp-l">Rising trend</span><span class="vp-v" style="color:#f97316">${nRising} ⬆</span></div>
    <div class="vp-row"><span class="vp-l">Avg predicted risk</span><span class="vp-v">${avgFrs}</span></div>
  `;
}

