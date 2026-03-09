// ═══════════════════════════════════════════════════════
// CONFIG — replace this value only
// ═══════════════════════════════════════════════════════
const GEOJSON_PATH = "urban_health_safety_intelligence.geojson"; // Set this to your GeoJSON file path
console.log("Loading from:", GEOJSON_PATH);
// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let map, gData, curLayer = 'score', filterOn = false, hotOn = false;

// ── Predictive / Resource layer state ──────────────────
let futureRiskOn = false, nearestOn = false;
let shelterData = null, pharmacyData = null, parkData = null;
let communityData = null, fireData = null, policeData = null, poiData = null;
let nearestLine = null;
let chart911 = null;

// ── Paths for all resource layers ──────────────────────
const RESOURCE_PATHS = {
  shelters:  'Tornado_Shelter.geojson',
  pharmacies: 'Pharmacy_Locator.csv',
  parks:     'Park_and_Trail.geojson',
  community: 'Community_Centers.geojson',
  fire:      'Fire Stations.geojson',
  police:    'Police Facilities.geojson',
  poi:       'Point_of_Interest.geojson'
};

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-86.2999, 32.3668],
    zoom: 10,
    pitch: 0,
    bearing: 0,
    antialias: true,
    attributionControl: false,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  map.on('load', fetchData);
  map.on('moveend', updateViewportStats);
});
