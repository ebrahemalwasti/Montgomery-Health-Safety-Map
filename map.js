// // ═══════════════════════════════════════════════════════
// // HOVER STATE
// // ═══════════════════════════════════════════════════════
// let hovId = null;
// let tt;

// // ═══════════════════════════════════════════════════════
// // MAP LAYERS
// // ═══════════════════════════════════════════════════════
// function addLayers() {
//   map.addSource('z', { type: 'geojson', data: gData, generateId: true });

//   // SCORE choropleth
//   map.addLayer({
//     id: 'z-score', type: 'fill', source: 'z',
//     paint: {
//       'fill-color': [
//         'interpolate', ['linear'], ['get', 'Score_100'],
//         0, '#dc2626', 30, '#f97316', 50, '#eab308', 70, '#86efac', 85, '#22c55e', 100, '#16a34a'
//       ],
//       'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.88, 0.62]
//     }
//   });

//   // RISK categorical
//   map.addLayer({
//     id: 'z-risk', type: 'fill', source: 'z',
//     layout: { visibility: 'none' },
//     paint: {
//       'fill-color': ['match', ['get', 'RiskLevel'], 'High', '#dc2626', 'Medium', '#f97316', 'Low', '#16a34a', '#94a3b8'],
//       'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.88, 0.62]
//     }
//   });

//   // BORDERS
//   map.addLayer({
//     id: 'z-border', type: 'line', source: 'z',
//     paint: {
//       'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#1e40af', 'rgba(100,120,180,0.25)'],
//       'line-width':  ['case', ['boolean', ['feature-state', 'hover'], false], 1.8, 0.3]
//     }
//   });

//   setupEvents();
// }

// // ═══════════════════════════════════════════════════════
// // HOVER & CLICK
// // ═══════════════════════════════════════════════════════
// function setupEvents() {
//   tt = $('tt');

//   ['z-score', 'z-risk'].forEach(layer => {
//     map.on('mousemove', layer, e => {
//       if (!e.features.length) return;
//       map.getCanvas().style.cursor = 'pointer';
//       const f = e.features[0];
//       if (hovId !== null) map.setFeatureState({ source: 'z', id: hovId }, { hover: false });
//       hovId = f.id;
//       map.setFeatureState({ source: 'z', id: hovId }, { hover: true });
//       const p = f.properties;
//       const s = +p.Score_100 || 0;
//       $('tt-zid').textContent = 'ZONE ' + (p.grid_id ?? p.ZoneID ?? hovId);
//       $('tt-sc').textContent  = s.toFixed(1);
//       $('tt-sc').style.color  = scoreColor(s);
//       const rc = p.RiskLevel === 'High' ? 'var(--danger)' : p.RiskLevel === 'Medium' ? 'var(--warn)' : 'var(--safe)';
//       $('tt-rk').innerHTML = `<span style="color:${rc};font-weight:600">${p.RiskLevel || '—'}</span> Risk`;
//       tt.style.display = 'block';
//       tt.style.left = (e.point.x + 14) + 'px';
//       tt.style.top  = (e.point.y - 14) + 'px';
//     });

//     map.on('mouseleave', layer, () => {
//       map.getCanvas().style.cursor = '';
//       if (hovId !== null) map.setFeatureState({ source: 'z', id: hovId }, { hover: false });
//       hovId = null;
//       tt.style.display = 'none';
//     });

//     map.on('click', layer, e => {
//       if (e.features.length) openPopup(e.features[0], e.lngLat);
//     });
//   });
// }

// function openPopup(feature, lngLat) {
//   const p   = feature.properties;
//   const s   = (+p.Score_100 || 0).toFixed(1);
//   const r   = p.RiskLevel || 'Unknown';
//   const zid = p.grid_id ?? p.ZoneID ?? feature.id;
//   const sc  = scoreColor(+s);
//   const ex  = p.Explanation || 'No explanation available.';
//   const badgeCls = riskBadgeClass(r);

//   new maplibregl.Popup({ closeButton: true, maxWidth: '330px', offset: 8 })
//     .setLngLat(lngLat)
//     .setHTML(`
//       <div class="pu">
//         <div class="pu-top">
//           <div>
//             <div class="pu-zid">ZONE ${zid}</div>
//             <div class="pu-score" style="color:${sc}">${s}</div>
//             <div class="pu-slab">/ 100 HEALTH &amp; SAFETY SCORE</div>
//           </div>
//           <span class="badge ${badgeCls}" style="margin-top:4px">${r.toUpperCase()}</span>
//         </div>
//         <div class="pu-bar"><div class="pu-fill" style="width:${s}%;background:${sc}"></div></div>
//         <div class="pu-sec-hd">AI Analysis</div>
//         <div class="pu-expl">${ex}</div>
//       </div>
//     `).addTo(map);
// }

// // ═══════════════════════════════════════════════════════
// // LAYER SWITCH
// // ═══════════════════════════════════════════════════════
// function setLayer(mode) {
//   curLayer = mode; filterOn = false; hotOn = false;
//   map.setFilter('z-score', null); map.setFilter('z-risk', null);
//   if (mode === 'score') {
//     map.setLayoutProperty('z-score', 'visibility', 'visible');
//     map.setLayoutProperty('z-risk',  'visibility', 'none');
//     $('leg-score').style.display = ''; $('leg-risk').style.display = 'none';
//     $('leg-t').textContent = 'Health & Safety Score';
//   } else {
//     map.setLayoutProperty('z-score', 'visibility', 'none');
//     map.setLayoutProperty('z-risk',  'visibility', 'visible');
//     $('leg-score').style.display = 'none'; $('leg-risk').style.display = '';
//     $('leg-t').textContent = 'Risk Category';
//   }
//   document.querySelectorAll('.cb').forEach(b => b.classList.remove('on'));
//   $(mode === 'score' ? 'c-score' : 'c-risk').classList.add('on');
// }

// // ═══════════════════════════════════════════════════════
// // HOTSPOT
// // ═══════════════════════════════════════════════════════
// function toggleHotspot() {
//   if (!gData) return;
//   hotOn = !hotOn;
//   $('c-hot').classList.toggle('on', hotOn);
//   if (hotOn) {
//     const scores = gData.features.map(f => +f.properties.Score_100 || 0).sort((a, b) => a - b);
//     const thresh = scores[Math.floor(scores.length * .15)];
//     const f = ['<=', ['get', 'Score_100'], thresh];
//     map.setFilter('z-score', f); map.setFilter('z-risk', f);
//   } else {
//     map.setFilter('z-score', null); map.setFilter('z-risk', null);
//   }
// }

// // ═══════════════════════════════════════════════════════
// // FILTER HIGH RISK
// // ═══════════════════════════════════════════════════════
// function toggleFilter() {
//   filterOn = !filterOn;
//   $('c-filter').classList.toggle('on', filterOn);
//   const f = filterOn ? ['==', ['get', 'RiskLevel'], 'High'] : null;
//   map.setFilter('z-score', f); map.setFilter('z-risk', f);
// }

// // ═══════════════════════════════════════════════════════
// // ZOOM HIGH RISK
// // ═══════════════════════════════════════════════════════
// function zoomHighRisk() {
//   if (!gData) return;
//   const hi = gData.features.filter(f => f.properties.RiskLevel === 'High');
//   if (!hi.length) { showErr('No high-risk zones.'); return; }
//   let mn = Infinity, mx = -Infinity, ml = Infinity, xl = -Infinity;
//   hi.forEach(f => {
//     const c = f.geometry.coordinates.flat(Infinity);
//     for (let i = 0; i < c.length; i += 2) {
//       mn = Math.min(mn, c[i]); mx = Math.max(mx, c[i]);
//       ml = Math.min(ml, c[i + 1]); xl = Math.max(xl, c[i + 1]);
//     }
//   });
//   map.fitBounds([[mn, ml], [mx, xl]], { padding: 50, duration: 1300 });
// }

// // ═══════════════════════════════════════════════════════
// // RESET
// // ═══════════════════════════════════════════════════════
// function resetView() {
//   filterOn = false; hotOn = false;
//   map.setFilter('z-score', null); map.setFilter('z-risk', null);
//   setLayer('score');
//   fitCity();
// }






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
  // ADD CITY LIMITS (NEW)
  // ═══════════════════════════════════════════════════════
  map.addSource("city-limit", {
    type: "geojson",
    data: "City_Limit.geojson"   // ← عدّل المسار إذا كان داخل مجلد آخر
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
      $('tt-zid').textContent = 'ZONE ' + (p.grid_id ?? p.ZoneID ?? hovId);
      $('tt-sc').textContent  = s.toFixed(1);
      $('tt-sc').style.color  = scoreColor(s);
      const rc = p.RiskLevel === 'High' ? 'var(--danger)' : p.RiskLevel === 'Medium' ? 'var(--warn)' : 'var(--safe)';
      $('tt-rk').innerHTML = `<span style="color:${rc};font-weight:600">${p.RiskLevel || '—'}</span> Risk`;
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

  new maplibregl.Popup({ closeButton: true, maxWidth: '330px', offset: 8 })
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