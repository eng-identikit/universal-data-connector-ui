# Universal Data Connector UI

🇮🇹 [Versione italiana](./README.it.md)

## Overview

Web orchestrator for [Universal Data Connector](../universal-data-connector/README.md) (UDC) instances. After login it opens a NiFi / Node-RED-style **board** with every registered instance:
- each UDC is a central block with its state;
- its **sources** (connectors: OPC UA, MQTT, Modbus, S7, HTTP...) are on the left;
- its **sinks** are on the right: HTTP, MQTT, NATS or WebSocket subscriptions, with their transformer shown on the link, and the **MCP** endpoint for LLMs.

Adding, changing or deleting a block changes the instance's configuration.

The UI only talks to its backend, [universal-data-connector-ui-api](../universal-data-connector-ui-api/README.md). The backend keeps the catalog of instances and the block positions, authenticates the users (local or Keycloak) and reaches each UDC with a service key.

Built with **React 18 + TypeScript**, **Vite**, **Material UI (MUI v5)**, **React Flow**, **Recharts** and **Leaflet**.

## 🎯 Features

**Board**
- **UDC instances**: one block per registered instance, with reachability, key validity, cluster mode and its number of sources, sinks and tenants. Admins register new instances in one of two ways: with a URL and a service key, or with a UDC superadmin's credentials, used once and never stored. Admins can also edit or remove instances.
- **Block palette**: drag a connector or a channel next to a UDC (or select a UDC and click the block). The connector form or the subscription wizard opens, and the block stays where it was dropped.
- **Inspector** of the selected block:
  - source: state, the cluster replica running it, statistics and configuration (secrets masked for viewers), plus start, stop, restart, edit and delete;
  - sink: target, tenant, transformer, delivery statistics and last error, plus edit, pause/resume and delete;
  - MCP: the URL to give to clients and the available tools.
- **Layout**: moving a UDC moves its blocks too; positions are saved for everyone.
- **Live state**: the board refreshes every 15 seconds. An animated link means a flow is active, a red one an error, a dashed one a disabled block.

**Instance** ("Open instance" on the UDC block): the detail pages of one instance, with a tenant selector.
- **Dashboard**: broker figures for the tenant (entities, subscriptions, deliveries, DLQ) and engine status.
- **Entities**:
  - table with filters and a **map** view;
  - detail with attributes, **history**, relationships, location, **commands** and JSON;
  - creation from a form or from JSON.
- **Subscriptions**: list, 4-step wizard (entities, trigger, filter, channel and output format), detail with test, pause, DLQ and live notifications.
- **Transformers**: library of output formats (JSONata), with an editor and a preview on real entities.
- **History**, **Live data**, **Connectors**, **Mapping**, **Storage**.
- **Administration** (admin): tenant members and API keys, LLM access (MCP), tenants, the instance's users, active sessions, access log and cluster.

**UI users** (user menu, admin, local login): create, set the role, disable and delete.

| Role | Can |
|---|---|
| Viewer | See the board and the instances; secrets are masked |
| Operator | Add, change and remove sources and sinks, move blocks, write entities |
| Admin | Register instances, manage the UI users and, on each instance, tenants, users and keys |

With Keycloak the roles come from realm roles (see the ui-api README).

The user menu also changes the password (local login), the map tile server, the language (IT/EN) and the theme.

## 📋 Requirements

- Node.js 18+
- universal-data-connector-ui-api running. `docker compose up -d` in the `universal-data-connector` repo starts UDC, ui-api and this UI on http://localhost:8080.

## 🚀 Running

```bash
npm install
npm run dev        # http://localhost:5173
```

The Vite dev server proxies `/api` (including the WebSocket stream) to ui-api on `http://localhost:9000`.

### Production

```bash
npm run build      # type-check and build into dist/
```

The `Dockerfile` serves the build with nginx and proxies `/api` (with the WebSocket upgrade for the stream) to `${UI_API_BACKEND}`. The default is `ui-api:9000`; Compose and the Helm chart set it.

## 📁 Project Structure

```
src/
├── api/
│   ├── auth.ts           # Local login (token pair) or Keycloak (keycloak-js), refresh
│   ├── client.ts         # bffClient (ui-api) and apiClient (one UDC instance through ui-api's proxy)
│   ├── bff.ts            # ui-api: users, UDC catalog, flow, layout, blocks
│   ├── broker.ts         # Instance API: entities, subscriptions, history, commands, administration
│   ├── endpoints.ts      # Instance system API (/system): sources, mapping, storage
│   └── session.ts
├── context/              # AppContext (theme, language), AuthContext (UI user), UdcScope (instance and tenant)
├── pages/
│   ├── Board/            # board: graph, nodes, palette, inspector, UDC registration
│   ├── Users/            # UI users
│   └── ...               # pages of one instance: Dashboard, Entities, Subscriptions, Transformers,
│                         # History, LiveData, Connectors, Mapping, Storage, Admin
├── components/ hooks/ i18n/ theme/
```

## 🔌 API

- **ui-api** (`/api/v1/basic`, `/api/v1/auth`): see the [ui-api README](../universal-data-connector-ui-api/README.md).
- **An instance**: the pages call the UDC API ([broker guide](../universal-data-connector/docs/Broker.md)) through `/api/v1/auth/udc/<id>/proxy/...`. The tenant is sent as `X-Tenant`.
- **Live data**: `ws(s)://<host>/api/v1/auth/udc/<id>/stream?access_token=…&tenant=…`. ui-api pipes it to the instance's stream. On close code `4001` the UI refreshes the token and reconnects.

## 🛠️ Tech Stack

| Purpose | Library |
|-------|----------|
| UI framework | React 18 + TypeScript |
| Build | Vite 5 |
| Components | Material UI (MUI) v5 + Emotion |
| Board | React Flow (@xyflow/react) |
| Keycloak login | keycloak-js |
| Routing | React Router v6 |
| HTTP client | Axios |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| i18n | i18next + react-i18next |

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
