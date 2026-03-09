#!/usr/bin/env python3
"""
Montgomery Health & Safety Map — Data Pipeline Upgrade
=======================================================
Enriches urban_health_safety_intelligence.geojson with predictive analytics:
  - Future_Risk_Score  (0–100, weighted composite)
  - Trend_Direction    ("Rising" | "Stable" | "Declining")
  - AI_Insight         (human-readable explanation string)
  - emergency_trend_pct, traffic_risk_density, population_flux, food_safety_score
  - nearby_pharmacies, nearby_shelters, nearby_parks, nearby_community_centers
  - nearest_shelter_km, nearest_pharmacy_km

Methodology:
  Future_Risk_Score = 40% Emergency Trend  +  25% Traffic Risk  +
                      20% Population Flux  +  15% Food Safety

Dependencies: pandas, json, math, csv (all standard / pandas only extra)
"""

import json
import math
import csv
import os
import sys
from collections import defaultdict

# ═══════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

GEOJSON_IN  = os.path.join(BASE_DIR, "urban_health_safety_intelligence.geojson")
GEOJSON_OUT = GEOJSON_IN   # overwrite in place

CALLS_CSV       = os.path.join(BASE_DIR, "911_Calls.csv")
TRAFFIC_CSV     = os.path.join(BASE_DIR, "Traffic_Engineering_Service_Requests.csv")
POPULATION_CSV  = os.path.join(BASE_DIR, "Daily_Population_Trends.csv")
FOOD_CSV        = os.path.join(BASE_DIR, "Food_Scores.csv")
PHARMACY_CSV    = os.path.join(BASE_DIR, "Pharmacy_Locator.csv")
SHELTER_GEOJSON = os.path.join(BASE_DIR, "Tornado_Shelter.geojson")
PARK_GEOJSON    = os.path.join(BASE_DIR, "Park_and_Trail.geojson")
COMMUNITY_GEOJSON = os.path.join(BASE_DIR, "Community_Centers.geojson")

# Proximity radius for counting nearby facilities
PROXIMITY_KM = 2.0   # km — used for bounding-box pre-filter + haversine check

# ═══════════════════════════════════════════════════════
# COORDINATE CONVERSION  (Projected → WGS-84)
# ═══════════════════════════════════════════════════════
# The CSV datasets (Pharmacy, Food, POI) store X,Y in a local
# projected coordinate system (Alabama State Plane West, US Survey Feet).
# We calibrated a simple linear mapping from 53 POI reference points
# where both projected coordinates and WGS-84 coordinates are known.
#
# Residuals < 50 m for all reference points — sufficient for 2 km proximity.

_X_ORIGIN  = 521014.70     # projected X of calibration centre
_Y_ORIGIN  = 679372.69     # projected Y of calibration centre
_LON_ORIGIN = -86.271064   # WGS-84 longitude of calibration centre
_LAT_ORIGIN =  32.366903   # WGS-84 latitude of calibration centre
_SCALE_LON  = 3.2413e-6    # degrees longitude per projected unit (east)
_SCALE_LAT  = 2.7419e-6    # degrees latitude  per projected unit (north)


def proj_to_latlon(x: float, y: float):
    """Convert projected coordinates to (lon, lat) WGS-84."""
    lon = _LON_ORIGIN + _SCALE_LON * (x - _X_ORIGIN)
    lat = _LAT_ORIGIN + _SCALE_LAT * (y - _Y_ORIGIN)
    return lon, lat


# ═══════════════════════════════════════════════════════
# HAVERSINE DISTANCE
# ═══════════════════════════════════════════════════════

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres between two WGS-84 points."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ═══════════════════════════════════════════════════════
# CSV READER (handles UTF-8-BOM)
# ═══════════════════════════════════════════════════════

def read_csv(path: str):
    """Return list-of-dicts for a CSV file; empty list if file missing."""
    if not os.path.exists(path):
        print(f"  [WARN] CSV not found: {path}")
        return []
    with open(path, encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


# ═══════════════════════════════════════════════════════
# POLYGON CENTROID
# ═══════════════════════════════════════════════════════

def polygon_centroid(coordinates, geom_type="Polygon") -> tuple:
    """Return (lon, lat) centroid of a GeoJSON Polygon or MultiPolygon coordinates."""
    if geom_type == "MultiPolygon":
        # coordinates = [ polygon, ... ] where polygon = [ring, ...]
        ring = coordinates[0][0]  # first polygon, outer ring
    else:
        # coordinates = [ring, ...] where ring = [[lon, lat], ...]
        ring = coordinates[0]     # outer ring
    lons = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    return sum(lons) / len(lons), sum(lats) / len(lats)


def feature_centroid(feature) -> tuple:
    """Return (lon, lat) centroid for a Point, Polygon, or MultiPolygon feature."""
    geom = feature["geometry"]
    if geom["type"] == "Point":
        return geom["coordinates"][0], geom["coordinates"][1]
    elif geom["type"] in ("Polygon", "MultiPolygon"):
        return polygon_centroid(geom["coordinates"], geom["type"])
    return 0.0, 0.0


# ═══════════════════════════════════════════════════════
# NORMALISE  (min–max, clamp 0–1)
# ═══════════════════════════════════════════════════════

def normalise(values: list) -> list:
    """Min–max normalise a list of floats to [0, 1]."""
    mn, mx = min(values), max(values)
    if mx == mn:
        return [0.5] * len(values)
    return [(v - mn) / (mx - mn) for v in values]


# ═══════════════════════════════════════════════════════
# STEP 1 — LOAD MAIN GEOJSON
# ═══════════════════════════════════════════════════════

print("Loading GeoJSON …")
with open(GEOJSON_IN, encoding="utf-8") as fh:
    geojson = json.load(fh)

features = geojson["features"]
N = len(features)
print(f"  {N} grid cells loaded.")


# ═══════════════════════════════════════════════════════
# STEP 2 — EMERGENCY TREND COMPONENT  (weight 40%)
# ═══════════════════════════════════════════════════════
#
# Strategy:
#   - Aggregate monthly Emergency call counts (Call_Count_By_Origin, Incoming only).
#   - Compute month-over-month (MoM) change across the available months.
#   - Rising = positive linear slope over the last 3 months.
#   - Produce a city-wide "emergency_trend_pct" (% change per month, −100 … +100).
#   - Each grid cell's emergency component is weighted by its pre-existing
#     N_emergency_pressure value (already normalised 0–1 in the GeoJSON).
# ─────────────────────────────────────────────────────

print("\nProcessing 911 Calls …")
calls_rows = read_csv(CALLS_CSV)

# Map month label → numeric index (1-Jan … 12-Dec)
MONTH_ORDER = {
    "1 - january": 1,  "2 - february": 2, "3 - march": 3,
    "4 - april": 4,    "5 - may": 5,      "6 - june": 6,
    "7 - july": 7,     "8 - august": 8,   "9 - september": 9,
    "10 - october": 10,"11 - november": 11,"12 - december": 12,
}

monthly_emergency = defaultdict(int)   # month_num → total incoming emergency calls

for row in calls_rows:
    category = row.get("Call_Category", "").strip()
    if category.lower() != "emergency":
        continue
    month_raw = row.get("Month", "").strip().lower()
    month_num = MONTH_ORDER.get(month_raw, 0)
    if month_num == 0:
        continue
    try:
        count = int(row.get("Call_Count_By_Origin", 0) or 0)
    except ValueError:
        count = 0
    monthly_emergency[month_num] += count

# Sort available months
months_sorted = sorted(monthly_emergency.keys())
monthly_series = [monthly_emergency[m] for m in months_sorted]

# City-wide emergency trend: % change from first to last month
if len(monthly_series) >= 2:
    # Linear slope via least-squares
    xs = list(range(len(monthly_series)))
    x_mean = sum(xs) / len(xs)
    y_mean = sum(monthly_series) / len(monthly_series)
    num = sum((xs[i] - x_mean) * (monthly_series[i] - y_mean) for i in range(len(xs)))
    den = sum((x - x_mean) ** 2 for x in xs)
    slope = num / den if den else 0.0
    # Trend as % change per month relative to mean call volume
    city_emergency_trend_pct = (slope / y_mean * 100) if y_mean > 0 else 0.0
else:
    city_emergency_trend_pct = 0.0

# Clamp to ±100 %
city_emergency_trend_pct = max(-100.0, min(100.0, city_emergency_trend_pct))

# Determine 3-month trend direction
if len(monthly_series) >= 3:
    last3 = monthly_series[-3:]
    slope3 = (last3[2] - last3[0]) / 2.0
    if slope3 > last3[0] * 0.03:
        city_trend_direction = "Rising"
    elif slope3 < -last3[0] * 0.03:
        city_trend_direction = "Declining"
    else:
        city_trend_direction = "Stable"
else:
    city_trend_direction = "Stable"

print(f"  Monthly emergency series: {dict(zip(months_sorted, monthly_series))}")
print(f"  City-wide trend: {city_emergency_trend_pct:+.1f}%/month  →  {city_trend_direction}")

# Per-cell emergency component (0–100): scale city trend by cell's emergency pressure
# A rising trend raises risk; a falling trend lowers it.
# Base: 50 (neutral).  Emergency pressure amplifies the shift.
def emergency_component(norm_pressure: float) -> float:
    """
    Map city-wide trend + cell's emergency pressure to a 0–100 score.
    Higher pressure AND rising trend → higher component score.
    """
    base = 50.0 + city_emergency_trend_pct * 0.3  # city-wide shift (±30 pts max)
    cell_adj = (norm_pressure - 0.5) * 40.0       # cell-specific offset (±20 pts)
    return max(0.0, min(100.0, base + cell_adj))


# ═══════════════════════════════════════════════════════
# STEP 3 — TRAFFIC INFRASTRUCTURE COMPONENT  (weight 25%)
# ═══════════════════════════════════════════════════════
#
# High-risk request types: Street Light Out, Signal Flash, Leaning Light Pole
# Traffic risk density = ratio of high-risk requests vs total requests (0–1).
# ─────────────────────────────────────────────────────

print("\nProcessing Traffic Service Requests …")
traffic_rows = read_csv(TRAFFIC_CSV)

HIGH_RISK_TYPES = {
    "street light out", "signal flash", "leaning light pole",
    "traffic signal timing", "signal out", "signal malfunction"
}

total_requests = 0
high_risk_requests = 0
for row in traffic_rows:
    try:
        cnt = int(row.get("Count_", 0) or 0)
    except ValueError:
        cnt = 0
    total_requests += cnt
    req_type = row.get("Service_Request_Type", "").strip().lower()
    if any(h in req_type for h in HIGH_RISK_TYPES):
        high_risk_requests += cnt

city_traffic_risk_density = (high_risk_requests / total_requests) if total_requests > 0 else 0.0
print(f"  Total requests: {total_requests}, High-risk: {high_risk_requests}")
print(f"  City traffic risk density: {city_traffic_risk_density:.3f}")

# Per-cell traffic component (0–100): weighted by cell's infrastructure pressure
def traffic_component(norm_infra: float) -> float:
    """
    Map city traffic risk density + cell's infrastructure pressure to 0–100.
    High city density + high local infrastructure pressure → high component.
    """
    city_base = city_traffic_risk_density * 100.0    # 0–100
    cell_adj  = (norm_infra - 0.5) * 40.0            # ±20
    return max(0.0, min(100.0, city_base + cell_adj))


# ═══════════════════════════════════════════════════════
# STEP 4 — POPULATION FLUX COMPONENT  (weight 20%)
# ═══════════════════════════════════════════════════════
#
# Use "Total" type rows.  High daily variance → higher flux → more risk.
# ─────────────────────────────────────────────────────

print("\nProcessing Daily Population Trends …")
pop_rows = read_csv(POPULATION_CSV)

total_series = []
for row in pop_rows:
    if row.get("Type", "").strip().lower() != "total":
        continue
    try:
        val = int(str(row.get("Current_Year", 0) or "0").replace(",", ""))
        total_series.append(val)
    except ValueError:
        pass

if len(total_series) >= 2:
    n_pop = len(total_series)
    # Single-pass mean and variance (Welford's algorithm equivalent via two-pass for clarity)
    mean_pop = sum(total_series) / n_pop
    variance_pop = sum((v - mean_pop) ** 2 for v in total_series) / n_pop
    city_population_flux = math.sqrt(variance_pop) / mean_pop if mean_pop > 0 else 0.0
else:
    city_population_flux = 0.0

print(f"  Total-type observations: {len(total_series)}")
print(f"  City population flux (CV): {city_population_flux:.4f}")

# Per-cell population component (0–100): weighted by cell's population pressure
def population_component(norm_pop: float) -> float:
    """
    Map city population flux + cell's population pressure to 0–100.
    High city flux AND high local population pressure → more risk.
    """
    city_base = min(city_population_flux * 200.0, 100.0)  # CV → 0–100 scale
    cell_adj  = (norm_pop - 0.5) * 40.0
    return max(0.0, min(100.0, city_base + cell_adj))


# ═══════════════════════════════════════════════════════
# STEP 5 — FOOD SAFETY COMPONENT  (weight 15%)
# ═══════════════════════════════════════════════════════
#
# For each grid cell, find food establishments within PROXIMITY_KM.
# Average their inspection score (Score_1, typically 0–100).
# Low average score → higher food safety risk.
# If no nearby establishments → use city-wide average.
# ─────────────────────────────────────────────────────

print("\nProcessing Food Scores …")
food_rows = read_csv(FOOD_CSV)

food_points = []   # (lon, lat, score)
scores_all = []
for row in food_rows:
    try:
        x = float(row.get("X", 0) or 0)
        y = float(row.get("Y", 0) or 0)
        score = float(row.get("Score_1", 0) or 0)
    except ValueError:
        continue
    if x == 0 and y == 0:
        continue
    lon, lat = proj_to_latlon(x, y)
    food_points.append((lon, lat, score))
    scores_all.append(score)

city_food_avg = sum(scores_all) / len(scores_all) if scores_all else 85.0
print(f"  Food establishments: {len(food_points)}, city avg score: {city_food_avg:.1f}")


# ═══════════════════════════════════════════════════════
# STEP 6 — LOAD FACILITY GEOJSONS  (shelters, parks, community)
# ═══════════════════════════════════════════════════════

def load_geojson_points(path: str) -> list:
    """Return list of (lon, lat) tuples from a GeoJSON FeatureCollection."""
    if not os.path.exists(path):
        print(f"  [WARN] GeoJSON not found: {path}")
        return []
    with open(path, encoding="utf-8") as fh:
        gj = json.load(fh)
    pts = []
    for feat in gj.get("features", []):
        lon, lat = feature_centroid(feat)
        if lon != 0.0 or lat != 0.0:
            pts.append((lon, lat))
    return pts


print("\nLoading facility GeoJSONs …")
shelter_pts  = load_geojson_points(SHELTER_GEOJSON)
park_pts     = load_geojson_points(PARK_GEOJSON)
community_pts = load_geojson_points(COMMUNITY_GEOJSON)
print(f"  Shelters: {len(shelter_pts)}, Parks: {len(park_pts)}, Community centers: {len(community_pts)}")

# Pharmacy from CSV
print("Loading Pharmacy CSV …")
pharmacy_rows = read_csv(PHARMACY_CSV)
pharmacy_pts = []
for row in pharmacy_rows:
    try:
        x = float(row.get("X", 0) or 0)
        y = float(row.get("Y", 0) or 0)
    except ValueError:
        continue
    if x == 0 and y == 0:
        continue
    lon, lat = proj_to_latlon(x, y)
    pharmacy_pts.append((lon, lat))
print(f"  Pharmacies: {len(pharmacy_pts)}")


# ═══════════════════════════════════════════════════════
# STEP 7 — NEAREST-FACILITY HELPERS
# ═══════════════════════════════════════════════════════

def count_nearby(cell_lon: float, cell_lat: float, pts: list, radius_km: float) -> int:
    """Count points within radius_km of (cell_lon, cell_lat) using haversine."""
    # Bounding-box pre-filter for speed
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * max(math.cos(math.radians(cell_lat)), 0.01))
    cnt = 0
    for lon, lat in pts:
        if abs(lat - cell_lat) > lat_delta or abs(lon - cell_lon) > lon_delta:
            continue
        if haversine_km(cell_lat, cell_lon, lat, lon) <= radius_km:
            cnt += 1
    return cnt


def nearest_km(cell_lon: float, cell_lat: float, pts: list) -> float:
    """Return distance in km to the nearest point in pts (999 if empty)."""
    if not pts:
        return 999.0
    best = math.inf
    # Start with a 50 km bounding box to pre-filter candidates efficiently;
    # tighten once a candidate is found.
    search_km = 50.0
    lat_delta = search_km / 111.0
    lon_delta = search_km / (111.0 * max(math.cos(math.radians(cell_lat)), 0.01))
    for lon, lat in pts:
        if abs(lat - cell_lat) > lat_delta or abs(lon - cell_lon) > lon_delta:
            continue
        d = haversine_km(cell_lat, cell_lon, lat, lon)
        if d < best:
            best = d
            # Tighten the search box to avoid testing far-away candidates
            lat_delta = best / 111.0
            lon_delta = best / (111.0 * max(math.cos(math.radians(cell_lat)), 0.01))
    return best if math.isfinite(best) else 999.0


def nearby_food_score(cell_lon: float, cell_lat: float) -> float:
    """
    Average food inspection score for establishments within PROXIMITY_KM.
    Falls back to city-wide average if none found.
    """
    lat_delta = PROXIMITY_KM / 111.0
    lon_delta = PROXIMITY_KM / (111.0 * max(math.cos(math.radians(cell_lat)), 0.01))
    local_scores = []
    for lon, lat, score in food_points:
        if abs(lat - cell_lat) > lat_delta or abs(lon - cell_lon) > lon_delta:
            continue
        if haversine_km(cell_lat, cell_lon, lat, lon) <= PROXIMITY_KM:
            local_scores.append(score)
    return sum(local_scores) / len(local_scores) if local_scores else city_food_avg


# ═══════════════════════════════════════════════════════
# STEP 8 — ENRICH EACH GRID CELL
# ═══════════════════════════════════════════════════════

print(f"\nEnriching {N} grid cells …")
future_scores_raw = []

enriched_data = []  # temp storage; we fill features after computing min/max

for i, feat in enumerate(features):
    props = feat["properties"]
    lon, lat = polygon_centroid(feat["geometry"]["coordinates"], feat["geometry"]["type"])

    # Normalised pressure fields (already 0–1 in GeoJSON)
    ne  = float(props.get("N_emergency_pressure",    0.5) or 0.5)
    ni  = float(props.get("N_infrastructure_pressure", 0.5) or 0.5)
    np_ = float(props.get("N_population_pressure",   0.5) or 0.5)

    # ── Component scores (0–100) ──────────────────────────────────
    ec = emergency_component(ne)
    tc = traffic_component(ni)
    pc = population_component(np_)

    local_food = nearby_food_score(lon, lat)
    # Lower food score → higher risk: invert and scale
    fc = max(0.0, min(100.0, (100.0 - local_food)))

    # ── Composite Future Risk Score ───────────────────────────────
    future_raw = 0.40 * ec + 0.25 * tc + 0.20 * pc + 0.15 * fc
    future_scores_raw.append(future_raw)

    # ── Nearby facilities ─────────────────────────────────────────
    n_pharm  = count_nearby(lon, lat, pharmacy_pts,  PROXIMITY_KM)
    n_shelt  = count_nearby(lon, lat, shelter_pts,   PROXIMITY_KM)
    n_park   = count_nearby(lon, lat, park_pts,      PROXIMITY_KM)
    n_comm   = count_nearby(lon, lat, community_pts, PROXIMITY_KM)

    d_shelt  = nearest_km(lon, lat, shelter_pts)
    d_pharm  = nearest_km(lon, lat, pharmacy_pts)

    enriched_data.append({
        "ec": ec, "tc": tc, "pc": pc, "fc": fc,
        "local_food": local_food,
        "n_pharm": n_pharm, "n_shelt": n_shelt, "n_park": n_park, "n_comm": n_comm,
        "d_shelt": d_shelt, "d_pharm": d_pharm,
    })

    if (i + 1) % 500 == 0:
        print(f"  … {i + 1}/{N}")

# ── Normalise Future_Risk_Score to 0–100 ──────────────────────────
print("Normalising Future_Risk_Score …")
mn_r, mx_r = min(future_scores_raw), max(future_scores_raw)


def normalise_score(raw: float) -> float:
    if mx_r == mn_r:
        return 50.0
    return round((raw - mn_r) / (mx_r - mn_r) * 100.0, 2)


# ═══════════════════════════════════════════════════════
# STEP 9 — COMPUTE PER-CELL TREND & AI INSIGHT, WRITE BACK
# ═══════════════════════════════════════════════════════

RISK_THRESHOLDS = {"Rising": 65, "Stable": 40, "Declining": 0}


def trend_direction(frs: float, ne: float) -> str:
    """
    Blend city-wide trend with cell-level emergency pressure to assign a
    per-cell trend direction.
    """
    # Rising city trend + high local pressure → Rising
    if city_trend_direction == "Rising":
        if ne >= 0.6:
            return "Rising"
        elif ne >= 0.3:
            return "Stable"
        else:
            return "Declining"
    elif city_trend_direction == "Declining":
        if ne <= 0.3:
            return "Declining"
        elif ne <= 0.6:
            return "Stable"
        else:
            return "Rising"
    else:
        # Stable city → distribute around 50 using FRS
        if frs >= 65:
            return "Rising"
        elif frs <= 35:
            return "Declining"
        return "Stable"


def ai_insight(props: dict, ed: dict, frs: float, td: str) -> str:
    """
    Generate a concise human-readable insight for the grid cell.
    """
    zid = props.get("grid_id", "?")
    rl  = props.get("RiskLevel", "Unknown")
    s100 = props.get("Score_100", 0)

    factors = []
    if ed["ec"] >= 65:
        factors.append("elevated emergency call pressure")
    if ed["tc"] >= 60:
        factors.append("high infrastructure service demand (street lights/signals)")
    if ed["fc"] >= 55:
        factors.append("below-average food safety scores")
    if ed["n_pharm"] == 0:
        factors.append("no pharmacies within 2 km")
    if ed["n_shelt"] == 0 and ed["d_shelt"] > 5:
        factors.append(f"nearest shelter is {ed['d_shelt']:.1f} km away")
    if ed["n_park"] == 0:
        factors.append("limited park access")

    trend_phrase = {
        "Rising":   "⬆ predicted risk is trending upward",
        "Stable":   "➡ risk trend is stable",
        "Declining": "⬇ predicted risk is declining",
    }[td]

    if factors:
        factor_str = "; ".join(factors[:3])
        return (f"Zone {zid} (Current: {s100}/100, Predicted: {frs}/100). "
                f"{trend_phrase.capitalize()}. Key drivers: {factor_str}.")
    else:
        return (f"Zone {zid} scores {s100}/100 currently; predicted score {frs}/100. "
                f"{trend_phrase.capitalize()}. Service access within normal range.")


print("Writing enriched properties …")
for i, feat in enumerate(features):
    props    = feat["properties"]
    raw      = future_scores_raw[i]
    ed       = enriched_data[i]
    frs      = normalise_score(raw)
    ne       = float(props.get("N_emergency_pressure", 0.5) or 0.5)
    td       = trend_direction(frs, ne)
    insight  = ai_insight(props, ed, frs, td)

    props["Future_Risk_Score"]      = frs
    props["Trend_Direction"]        = td
    props["AI_Insight"]             = insight
    props["emergency_trend_pct"]    = round(city_emergency_trend_pct, 2)
    props["traffic_risk_density"]   = round(city_traffic_risk_density, 4)
    props["population_flux"]        = round(city_population_flux, 6)
    props["food_safety_score"]      = round(ed["local_food"], 2)
    props["nearby_pharmacies"]      = ed["n_pharm"]
    props["nearby_shelters"]        = ed["n_shelt"]
    props["nearby_parks"]           = ed["n_park"]
    props["nearby_community_centers"] = ed["n_comm"]
    props["nearest_shelter_km"]     = round(ed["d_shelt"], 3)
    props["nearest_pharmacy_km"]    = round(ed["d_pharm"], 3)


# ═══════════════════════════════════════════════════════
# STEP 10 — WRITE OUTPUT
# ═══════════════════════════════════════════════════════

print(f"\nWriting enriched GeoJSON → {GEOJSON_OUT}")
with open(GEOJSON_OUT, "w", encoding="utf-8") as fh:
    json.dump(geojson, fh, separators=(",", ":"))

# Quick summary
rising   = sum(1 for f in features if f["properties"].get("Trend_Direction") == "Rising")
stable   = sum(1 for f in features if f["properties"].get("Trend_Direction") == "Stable")
declining= sum(1 for f in features if f["properties"].get("Trend_Direction") == "Declining")
avg_frs  = sum(f["properties"]["Future_Risk_Score"] for f in features) / N

print("\n═══ Pipeline Summary ═══════════════════════════════")
print(f"  Total cells enriched : {N}")
print(f"  Avg Future_Risk_Score: {avg_frs:.1f}")
print(f"  Trend distribution   : Rising={rising}, Stable={stable}, Declining={declining}")
print(f"  City 911 trend       : {city_emergency_trend_pct:+.1f}%/month → {city_trend_direction}")
print(f"  Traffic risk density : {city_traffic_risk_density:.3f}")
print(f"  Population flux (CV) : {city_population_flux:.4f}")
print(f"  Food avg score       : {city_food_avg:.1f}")
print("════════════════════════════════════════════════════")
print("Done ✓")
