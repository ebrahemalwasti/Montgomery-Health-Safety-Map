# 🗺️ Montgomery Urban Health & Safety Navigator

> **AI-powered civic intelligence platform** that analyzes 10+ City of Montgomery datasets to generate neighborhood-level health & safety scores, predictive risk assessments, and actionable intervention recommendations.

![Montgomery Safety Navigator Demo](https://img.shields.io/badge/Status-Live-brightgreen) ![MapLibre GL](https://img.shields.io/badge/Map-MapLibre%20GL%20JS-blue) ![Python](https://img.shields.io/badge/Pipeline-Python%20%7C%20Pandas-yellow) ![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 What It Does

The Montgomery Safety Navigator transforms raw civic open data into an interactive, neighborhood-level intelligence dashboard that:

- **Scores every grid zone** (0–100) based on weighted analysis of emergency calls, traffic infrastructure, population trends, and food safety
- **Predicts future risk** using trend detection and multi-factor heuristic modeling
- **Identifies resource gaps** — pharmacy deserts, park access deficits, shelter coverage blind spots
- **Generates AI insights** — per-zone natural-language explanations of risk drivers and recommended interventions
- **Provides real-time viewport analytics** — stats update dynamically based on what the user is viewing

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                 DATA PIPELINE (Python)           │
│  911 Calls ─┐                                    │
│  Traffic ───┤  Weighted     Spatial    AI        │
│  Population─┤  Composite →  Proximity→ Insight → GeoJSON
│  Food Safety┤  Score        Analysis   Generation│
│  Facilities─┘  (0-100)     (Haversine)           │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              CLIENT APP (Browser)                │
│  MapLibre GL JS  │  Dashboard  │  Analytics      │
│  Choropleth Map  │  Donut/Bar  │  Viewport Stats │
│  Hover/Click     │  Zone List  │  Trend Charts   │
│  Nearest Feature │  Insights   │  Mobile Ready   │
└─────────────────────────────────────────────────┘
```

## 📊 Data Sources

All datasets sourced from the **[City of Montgomery Open Data Portal](https://data.montgomeryal.gov/)**:

| Dataset | Description | Used For |
|---------|-------------|----------|
| 911 Calls | Emergency/non-emergency call volumes by month | Emergency pressure scoring |
| Traffic Engineering Service Requests | Street lights, signs, signals, road markings | Infrastructure risk assessment |
| Daily Population Trends | Population flux patterns | Population density factor |
| Food Scores | Restaurant health inspection scores | Food safety component |
| Fire Stations | Fire station locations | Proximity analysis |
| Police Facilities | Police facility locations | Proximity analysis |
| Community Centers | Community center locations | Resource access scoring |
| Pharmacy Locator | Pharmacy locations | Healthcare access / desert detection |
| Park and Trail | Parks and trails | Green space access analysis |
| Tornado Shelter | Tornado shelter locations | Emergency preparedness |
| Point of Interest | City points of interest | Supplementary context |
| City Limit | Municipal boundary | Map boundary overlay |
| SDE Nuisance | Nuisance complaints | Environmental quality factor |

## 🧠 Scoring Algorithm

Each grid zone receives a **composite Health & Safety Score (0–100)** calculated as:

```
Score = 0.40 × Emergency_Factor
      + 0.25 × Traffic_Factor
      + 0.20 × Population_Factor
      + 0.15 × Food_Safety_Factor
```

**Risk Classification:**
- 🔴 **High Risk**: Score < 40
- 🟡 **Medium Risk**: Score 40–69
- 🟢 **Low Risk**: Score ≥ 70

**Spatial Analysis** uses Haversine distance with bounding-box pre-filtering to compute proximity to nearest:
- Fire Station, Police Facility, Pharmacy, Tornado Shelter, Park, Community Center

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Map Engine** | [MapLibre GL JS](https://maplibre.org/) v4.1.3 |
| **Base Map** | CARTO Positron (light, clean aesthetic) |
| **Data Pipeline** | Python 3.x + Pandas + NumPy |
| **Charts** | SVG (custom donut) + Chart.js (line charts) |
| **Styling** | Custom CSS Design System (CSS Variables, DM Sans/Mono) |
| **Data Format** | GeoJSON (enriched, ~10MB) |
| **Deployment** | Static files — no server required |

## 🚀 Quick Start

### View the Map
1. Clone the repository
2. Open `index.html` in a browser (or use a local server)
3. The app loads the enriched GeoJSON and renders automatically

### Regenerate Data (Optional)
```bash
pip install -r requirements.txt
python data_pipeline_upgrade.py
```

## 📱 Features

- **Score Map** — Continuous color gradient from red (dangerous) to green (safe)
- **Risk Map** — Categorical view (High / Medium / Low)
- **Hotspot Detection** — Highlights bottom 15% zones
- **High Risk Filter** — Isolate only high-risk areas
- **Zoom to High Risk** — Auto-fit map to worst zones
- **Click for Details** — Full AI analysis popup per zone
- **Nearest Facility** — Dashed line to closest shelter/pharmacy
- **Viewport Analytics** — Live stats for visible area
- **Mobile Responsive** — Sidebar collapses on small screens

## 🗺️ Future Roadmap

- [ ] **Real-time data ingestion** — Automated pipeline to pull fresh data from Montgomery's API
- [ ] **ML-based predictions** — Replace heuristic scoring with trained gradient boosting model
- [ ] **Citizen reporting** — Allow residents to flag issues and annotate zones
- [ ] **Historical trend comparison** — Month-over-month and year-over-year analytics
- [ ] **Multi-city support** — Parameterize pipeline for any city with an open data portal
- [ ] **Tile server backend** — Replace static GeoJSON with vector tiles for faster load times
- [ ] **Accessibility audit** — WCAG 2.1 AA compliance for screen readers and keyboard nav
- [ ] **Export/Share** — PDF reports and shareable zone links for city officials

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built for the WWV 2026 Hackathon** | Montgomery, Alabama 🏛️
