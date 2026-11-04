# Universal Data Connector UI

🇮🇹 [Versione italiana](./README.it.md)

## Overview

Web interface for the [Universal Data Connector](../universal-data-connector/README.md) (UDC) context broker. From the browser you can:
- browse and edit entities, on a table or on a map;
- manage subscriptions, follow the attribute history and send commands to devices;
- configure connectors and administer tenants, users, API keys and the cluster.

Built with **React 18 + TypeScript**, **Vite**, **Material UI (MUI v5)**, **Recharts** and **Leaflet**.

## 🎯 Features

- **Login and tenants**: JWT session with automatic refresh, a tenant selector in the top bar, and pages that adapt to the role (viewer, operator, admin, superadmin).
- **Dashboard**: broker figures for the tenant (entities, subscriptions, deliveries, DLQ) plus engine status.
- **Entities**: table with filters (type, id pattern, related to, depth, direction, order) and a **map** view of the visible area. Creation from a form or from JSON.
- **Entity detail**:
  - attributes, with an editor per type, metadata and command configuration;
  - **history** charts (average with min–max band, CSV export, table view);
  - relationship trees in both directions;
  - **location** on the map, settable with a click;
  - **commands** to writable attributes, with their status;
  - the raw JSON.
- **Subscriptions**:
  - list with status and statistics;
  - 4-step wizard (entities with preview, trigger with deadband/throttle/periodic, filter with a visual builder and server-side validation, channel);
  - detail with test, pause/resume, DLQ with replay and purge, and live notifications for websocket subscriptions.
- **History**: attribute history of any entity.
- **Live Data**: realtime charts and values from the authenticated broker stream.
- **Connectors / Mapping / Storage**: connector configuration (including target tenant and entity id prefix), mapped devices and the raw data buffer.
- **Administration**: tenant members, API keys (shown once), tenants and users (superadmin), **cluster** (instances, partitions, connectors, event-loop delay, queue backlogs).
- **Settings**: API URL, map tile server, language (IT/EN) and theme.

## 📋 Requirements

- Node.js 18+
- A running UDC backend (`docker compose up -d` in the backend repo starts everything, this UI included, on http://localhost:8080)

## 🚀 Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
```

The Vite dev server proxies `/api` (including the WebSocket stream) and `/health` to `http://localhost:3000`, so the API URL in Settings can stay empty (same origin).

### Production

```bash
npm run build      # type-check and build to dist/
```

The `Dockerfile` serves the build with nginx and proxies `/api` and `/api/v1/stream` to `${UDC_BACKEND}` (default `udc:3000`, set by Compose and by the Helm chart).

## 📁 Project Structure

```
src/
├── api/
│   ├── client.ts         # Axios instance: base URL, token, X-Tenant, refresh on 401, stream URL
│   ├── session.ts        # Tokens and selected tenant in localStorage
│   ├── broker.ts         # Broker API: entities, subscriptions, history, commands, admin, cluster
│   ├── endpoints.ts      # System API (/api/v1/system): status, sources, mapping, storage
│   └── types.ts
├── components/           # Layout (sidebar, top bar, user menu), EntityHistory, EntityMap, dialogs
├── context/              # AppContext (theme, language, API URL), AuthContext (session, tenant, role)
├── hooks/                # useBrokerStream (authenticated WebSocket), useUDCStatus
├── i18n/locales/         # it.json, en.json
└── pages/                # Login, Dashboard, Entities, Subscriptions, History, LiveData,
                          # Connectors, Mapping, Storage, Admin, Settings
```

## 🔌 Backend API

- **Broker API** (`/api/v1`): see the [broker guide](../universal-data-connector/docs/Broker.md).
- **System API** (`/api/v1/system`): see the [API documentation](../universal-data-connector/docs/API.md).
- **Live data**: `ws(s)://<host>/api/v1/stream?access_token=…&tenant=…`. On close code `4001` (token expired) the UI refreshes the token and reconnects.

## 🛠️ Tech Stack

| Purpose | Library |
|---------|---------|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Components | Material UI (MUI) v5 + Emotion |
| Routing | React Router v6 |
| HTTP client | Axios |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| i18n | i18next + react-i18next |

---

**Universal Data Connector UI** - Industry 5.0 Ready 🚀
