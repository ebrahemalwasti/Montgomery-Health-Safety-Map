// ═══════════════════════════════════════════════════════
// LOAD DATA
// ═══════════════════════════════════════════════════════
async function fetchData() {
  try {
    const r = await fetch(GEOJSON_PATH);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    gData = await r.json();
    if (!gData.features?.length) throw new Error('GeoJSON has no features.');
    // validate
    const p = gData.features[0].properties;
    if (!('Score_100' in p)) throw new Error('Missing field: Score_100');
    addLayers();
    computeStats();
    buildCharts();
    fitCity();
    dismissLoader();
  } catch (e) {
    showErr('GeoJSON load failed: ' + e.message);
    dismissLoader();
  }
}

function dismissLoader() {
  setTimeout(() => $('loader').classList.add('gone'), 500);
}

// ═══════════════════════════════════════════════════════
// FIT BOUNDS FROM GEOJSON
// ═══════════════════════════════════════════════════════
function fitCity() {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  gData.features.forEach(f => {
    const coords = f.geometry.coordinates.flat(Infinity);
    for (let i = 0; i < coords.length; i += 2) {
      minLng = Math.min(minLng, coords[i]);   maxLng = Math.max(maxLng, coords[i]);
      minLat = Math.min(minLat, coords[i + 1]); maxLat = Math.max(maxLat, coords[i + 1]);
    }
  });
  if (isFinite(minLng)) {
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 1200 });
  }
}
