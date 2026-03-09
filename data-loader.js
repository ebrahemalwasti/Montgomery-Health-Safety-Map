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

    // Core map setup
    addLayers();
    computeStats();
    buildCharts();
    fitCity();

    // Load all resources in parallel (non-blocking — errors are soft-handled)
    await loadResources();

    dismissLoader();
  } catch (e) {
    showErr('GeoJSON load failed: ' + e.message);
    dismissLoader();
  }
}

// ═══════════════════════════════════════════════════════
// LOAD RESOURCE LAYERS & ANALYTICS DATA
// ═══════════════════════════════════════════════════════
async function loadResources() {
  const load = async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.text();
    } catch { return null; }
  };

  // Fetch GeoJSONs and CSVs in parallel
  const [
    shelterText, parkText, communityText,
    fireText, policeText, poiText,
    pharmacyText, callsText
  ] = await Promise.all([
    load(RESOURCE_PATHS.shelters),
    load(RESOURCE_PATHS.parks),
    load(RESOURCE_PATHS.community),
    load(RESOURCE_PATHS.fire),
    load(RESOURCE_PATHS.police),
    load(RESOURCE_PATHS.poi),
    load(RESOURCE_PATHS.pharmacies),
    load('911_Calls.csv'),
  ]);

  // Parse GeoJSONs
  const tryJSON = txt => { try { return JSON.parse(txt); } catch { return null; } };
  shelterData   = shelterText   ? tryJSON(shelterText)   : null;
  parkData      = parkText      ? tryJSON(parkText)      : null;
  communityData = communityText ? tryJSON(communityText) : null;
  fireData      = fireText      ? tryJSON(fireText)      : null;
  policeData    = policeText    ? tryJSON(policeText)    : null;
  poiData       = poiText       ? tryJSON(poiText)       : null;

  // Parse Pharmacy CSV → GeoJSON FeatureCollection
  if (pharmacyText) {
    const rows = parseCSV(pharmacyText);
    pharmacyData = {
      type: 'FeatureCollection',
      features: rows.filter(r => r.X && r.Y).map(r => {
        const [lon, lat] = projToLatLon(parseFloat(r.X), parseFloat(r.Y));
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: {
            name: r.custCOMPANY_NAME || 'Pharmacy',
            address: r.ADDRESS || '',
            naloxone: r.Naloxone || '',
            vaccination: r.Vaccination || '',
          }
        };
      })
    };
  }

  // Add resource map layers
  addResourceLayers();

  // Build analytics — safe to call even if data is missing
  if (callsText) {
    window._calls911Data = parseCSV(callsText);
  }
  build911Chart();
  buildAIStories();
  computeFutureRiskStats();
  updateViewportStats();
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
