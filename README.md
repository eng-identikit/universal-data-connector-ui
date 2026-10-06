# Universal Data Connector UI

🇮🇹 [Versione italiana](./README.it.md)

## Overview

Web-based management interface for the [Universal Data Connector](../universal-data-connector/README.md) (UDC). It lets you monitor, configure and control a running UDC instance from the browser: manage data source connectors, inspect the mapped devices, configure storage, and watch live data flowing through the system.

Built with **React 18 + TypeScript**, **Vite**, **Material UI (MUI v5)** and **Recharts**.

## 🎯 Features

- **Dashboard** — overall system status, sources health and key metrics at a glance
- **Connectors** — create, edit, delete, start/stop/restart data sources (OPC UA, Modbus, MQTT, HTTP, PROFINET, EtherCAT, ...), with ready-made configuration templates
- **Mapping** — browse the devices/entities produced by the UDC mapping engine
- **Storage** — configure the storage adapter (Memory, Redis, TimescaleDB), test the connection and check its health. Shows the storage actually in use and warns when the backend has fallen back to in-memory storage
- **Live Data** — real-time dashboard fed by the WebSocket stream:
  - **Charts**: one rolling chart per numeric measurement (1 / 5 / 15 min window; booleans drawn as 0/1 steps)
  - **Current values**: one tile per measurement with its latest value and unit, dimmed when it has not updated for 10 s
  - **Raw stream**: the last messages as received
  - filter by source, search by measurement, pause (the view freezes but data keeps being collected), message rate and source status
- **History** — browse the data recorded in TimescaleDB: time range presets or custom range, drag-to-zoom and pan, one chart per measurement (average line with min/max band, synced crosshair) and paginated raw records
- **Settings** — UI preferences: language and light/dark theme
- **Internationalization** — English and Italian via i18next (default: Italian, stored in `localStorage` under `udc-language`)

## 📋 Requirements

- Node.js 18+
- A running [Universal Data Connector](../universal-data-connector/README.md) backend (REST API on port `3000` by default)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:5173)
npm run dev
```

The Vite dev server proxies `/api` and `/health` requests to the UDC backend at `http://localhost:3000` (see [vite.config.ts](./vite.config.ts)), so no CORS configuration is needed during development.

### Production Build

```bash
# Type-check and build to dist/
npm run build

# Preview the production build locally
npm run preview
```

## 📁 Project Structure

```
universal-data-connector-ui/
├── index.html
├── vite.config.ts            # Dev server + proxy to UDC backend
└── src/
    ├── api/
    │   ├── client.ts         # Axios instance
    │   ├── endpoints.ts      # Typed API calls (status, sources, data, history, mapping, storage)
    │   └── types.ts          # API response types
    ├── components/
    │   ├── Layout/           # AppLayout, Sidebar, TopBar
    │   ├── ConfirmDialog.tsx
    │   └── StatusChip.tsx
    ├── context/
    │   └── AppContext.tsx    # Global app state (theme, ...)
    ├── hooks/
    │   ├── useUDCStatus.ts   # Polls backend status
    │   └── useWebSocket.ts   # WebSocket stream with auto-reconnect
    ├── i18n/
    │   ├── index.ts          # i18next setup
    │   └── locales/          # en.json, it.json
    ├── pages/
    │   ├── Dashboard/
    │   ├── Connectors/       # Source list + create/edit dialog
    │   ├── Mapping/
    │   ├── Storage/
    │   ├── LiveData/         # Real-time charts, current values, raw stream
│   ├── History/          # TimescaleDB history browser
    │   └── Settings/
    ├── theme/                # MUI light/dark themes
    ├── App.tsx               # Routes
    └── main.tsx              # Entry point
```

## 🔌 Backend API Used

The UI talks to the UDC REST API:

| Area | Endpoints |
|------|-----------|
| Status | `GET /api/status`, `GET /api/status/health` |
| Sources | `GET /api/sources`, `POST /api/sources/:id/start|stop|restart` |
| Sources CRUD | `POST/PUT/DELETE /api/config/sources[/:id]`, `POST /api/config/reload` |
| Data | `GET /api/data/latest?limit=&source=` |
| History | `GET /api/history/status`, `GET /api/history/sources`, `GET /api/history/measurements`, `GET /api/history/series`, `GET /api/history/records` |
| Mapping | `GET /api/mapping/entities` |
| Storage | `GET/PUT /api/config/storage`, `GET /api/config/storage/types`, `POST /api/config/storage/test`, `GET /api/config/storage/health`, `POST /api/config/storage/configure` |

Live data uses the backend WebSocket (`ws://<host>:3001`, the API URL from Settings with port `3000` replaced by `3001`) with automatic reconnection. The WebSocket is not proxied by Vite, so port `3001` must be reachable from the browser. Message format: see [API documentation](../universal-data-connector/docs/API.md#websocket-real-time-stream).

The History page needs TimescaleDB configured in the backend (as the active storage or under `alternatives.timescaledb` in `config/storage.json`).

## 🛠️ Tech Stack

| Purpose | Library |
|---------|---------|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Components | Material UI (MUI) v5 + Emotion |
| Routing | React Router v6 |
| HTTP client | Axios |
| Charts | Recharts |
| i18n | i18next + react-i18next |

---

**Universal Data Connector UI** - Industry 5.0 Ready 🚀
