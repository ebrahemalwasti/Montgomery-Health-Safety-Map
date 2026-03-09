# Montgomery-Health-Safety-Map
A smart map for Montgomery that shows health and safety levels across the city. Explore risk zones, hotspots, and neighborhood insights through an interactive, data‑driven dashboard.
# Montgomery Health & Safety Map

## Project Overview

This project is an **interactive geospatial intelligence platform for Montgomery, Alabama**. 

The platform visualizes health and safety scores across thousands of city zones using spatial data. By mapping these critical metrics at a granular level, the goal of this project is to support:
- Smarter urban planning
- Better risk awareness
- Improved community well-being

## Why We Built This

Cities often lack clear, neighborhood-level insights into health and safety conditions. While macro-level data exists, it is frequently difficult to translate into actionable, localized strategies.

There is a growing need for accessible, data-driven tools designed for city officials, planners, researchers, and residents. This project bridges that gap by helping to easily identify:
- High-risk zones that require immediate attention
- Service gaps in critical urban infrastructure
- Broad urban health patterns and geographic disparities

## Key Features

- **Interactive Map:** Color-coded risk levels across the city grid.
- **Score Map:** Detailed visualization of calculated health and safety scores.
- **Risk Map:** Explicit highlighting of high-risk zones.
- **Hotspot Detection:** Visual clustering of critical areas.
- **City-Wide Statistics Dashboard:** Quick, high-level metrics at a glance.
- **Risk Distribution Charts:** Visual breakdowns of risk categories.
- **Score Distribution Charts:** Statistical spread of zone scores.
- **Deep Inspection:** Ability to zoom into specific neighborhoods and inspect individual zones for detailed metrics.
- **Client-Side Architecture:** Fully browser-based performance with no backend server required.

## Data Sources

The platform is powered by robust **GeoJSON datasets** that contain spatial grid zones fused with various health and safety indicators. 

All heavy geospatial processing and scoring are handled offline. The resulting optimized dataset is then loaded directly into the browser for seamless, high-performance visualization.

## Tech Stack

- **HTML / CSS / JavaScript:** Core frontend structure, styling, and logic.
- **Leaflet (or CARTO):** For rendering the interactive map and geospatial layers.
- **Chart.js:** For rendering dynamic, responsive data charts.
- **GeoJSON:** The primary data format for spatial boundaries and attributes.

## How It Works

1. The map application loads the pre-processed GeoJSON zone data on initialization.
2. Each zone contains a pre-calculated Health & Safety score.
3. Risk categories (e.g., High, Medium, Low) are dynamically derived from established score thresholds.
4. Various map layers render the data into distinct views, such as score maps, risk maps, and hotspots.
5. The UI charts update dynamically based on the loaded dataset to reflect the current visual state.

## Live Demo

Explore the interactive dashboard here:  
**[Montgomery Health & Safety Map - Live Demo](https://ebrahemalwasti.github.io/Montgomery-Health-Safety-Map/)**

We encourage you to interact with the map, toggle layers, and click on individual zones to see the underlying data explanations.

## How to Run Locally

Because the application is fully client-side, running it locally is incredibly simple. No server setup or package installation is required.

1. Clone the repository to your local machine:
   ```bash
   git clone [https://github.com/ebrahemalwasti/Montgomery-Health-Safety-Map.git](https://github.com/ebrahemalwasti/Montgomery-Health-Safety-Map.git)
