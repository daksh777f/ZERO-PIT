# ZERO PIT

A motorsport analytics platform that turns raw race timing data into replayable telemetry, comparative race intelligence, and a modern web dashboard.

ZERO PIT is designed for teams, drivers, organizers, and fans who want pit-wall level insights without expensive onboard telemetry hardware.

## What ZERO PIT Does

- Processes race timing files into structured performance reports
- Generates synthetic telemetry for full-race map replay
- Builds event timelines (sectors, deltas, positions, overtakes)
- Produces AI-ready commentary events and race storytelling data
- Visualizes everything in an interactive React application

## Core Capabilities

- Driver and team leaderboards
- Session and weekend performance analysis
- Radar-based driver and team comparison
- Lap-by-lap and sector-by-sector breakdowns
- Interactive race replay with timeline synchronization
- Weekend insights and trend detection

## Tech Stack

### Frontend (main-2)

- React 19 + React Router 7
- Vite 7 build tooling
- OpenLayers for map-based replay visualization
- Apache ECharts and Recharts for analytical charts
- Three.js + GSAP for cinematic and animated UI elements
- Framer Motion and Lucide React for UI motion and iconography
- ESLint for code quality

### Data and Analytics (Python)

- Python 3 for data processing pipelines
- Pandas and NumPy for timing analysis and metrics computation
- PyYAML for weekend/session configuration handling
- JSON-based output artifacts for dashboard and replay consumption

### Project Architecture

- Multi-module repository with clear separation:
  - main for race performance analysis
  - timing-generator for synthetic telemetry and timeline generation
  - main-2 for interactive web visualization

## Current Repository Structure

- docs: documentation, architecture notes, and implementation reports
- images-frame: animation/image frame assets
- main: Python analytics engine and weekend analysis scripts
- main-2: React + Vite frontend dashboard and replay UI
- timing-generator: telemetry, event timeline, and commentary data generation
- track_reconstruct: track reconstruction and integration utilities

## What We Have Built

- End-to-end motorsport analytics pipeline from raw timing data to interactive insights
- Session-level and weekend-level performance reports
- Synthetic telemetry generation without requiring onboard GPS hardware
- Event timeline engine capturing sector events, race positions, deltas, and position changes
- Comparative analytics outputs for multi-driver and multi-session analysis
- Interactive dashboard with leaderboards, comparisons, replay, and insight views
- AI commentary-ready event data pipeline for storytelling and broadcast-style narration

## USP (Unique Selling Proposition)

- Hardware-free telemetry replay: delivers race replay quality insights using timing data plus a reference lap, avoiding expensive per-car telemetry hardware.
- Full-field intelligence: analyzes entire grids (drivers and teams), not just single-car data.
- Unified platform: combines analytics, replay, event timeline, and commentary pipeline in one system.
- Cost-effective scalability: static frontend + generated data artifacts keeps infrastructure simple and affordable.
- Motorsport-first UX: pit-wall inspired presentation designed for engineers, teams, organizers, and fan engagement.


## Architecture at a Glance

1. Ingestion
- Source CSV timing files are ingested from race sessions.

2. Analytics
- main computes lap, sector, consistency, team, and weekend-level metrics.

3. Synthesis
- timing-generator transforms timing + reference lap data into synthetic telemetry and event timelines.

4. Visualization
- main-2 serves the interactive dashboard for replay, comparisons, and insights.

## Quick Start

### 1) Run Analytics Pipeline (Python)

From the repository root:

```bash
cd main
pip install pandas numpy pyyaml
python run_weekend_analysis.py weekend_2025_barber
```

This generates per-session reports and a weekend summary.

### 2) Generate Replay and Timeline Data (Python)

From the repository root:

```bash
cd timing-generator
pip install pandas numpy
python generate_all.py
```

Outputs are written to the `output/` directory in this module.

### 3) Start the Web App (Node.js)

From the repository root:

```bash
cd main-2
npm install
npm run dev
```

For production build:

```bash
npm run build
npm run preview
```

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm 9+

## Suggested Workflow

1. Prepare or update race input data.
2. Run main to compute session/weekend analytics.
3. Run timing-generator to produce telemetry and timeline assets.
4. Launch main-2 and verify dashboards/replay output.

## Documentation

Start here for deeper context:

- docs/QUICKSTART.md
- docs/ARCHITECTURE.md
- docs/FEATURE_OVERVIEW.md
- ZERO_PIT_COMPLETE_GUIDE.md
- main-2/README.md
- timing-generator/README.md

## Use Cases

- Post-race debriefs for drivers and teams
- Session-to-session performance benchmarking
- Race organizer analytics and monitoring
- Fan-facing replay and commentary experiences

## Contributing

Contributions are welcome. For substantial changes, open an issue or proposal first so architecture and data contracts stay aligned across modules.

## License

See `LICENSE` for licensing terms.
