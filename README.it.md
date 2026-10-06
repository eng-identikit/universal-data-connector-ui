# Universal Data Connector UI

🇬🇧 [English version](./README.md)

## Panoramica

Interfaccia web di gestione per lo [Universal Data Connector](../universal-data-connector/README.it.md) (UDC). Permette di monitorare, configurare e controllare un'istanza UDC in esecuzione dal browser: gestire i connettori alle sorgenti dati, ispezionare i dispositivi mappati, configurare lo storage e osservare i dati in tempo reale che attraversano il sistema.

Realizzata con **React 18 + TypeScript**, **Vite**, **Material UI (MUI v5)** e **Recharts**.

## 🎯 Funzionalità

- **Dashboard** — stato generale del sistema, salute delle sorgenti e metriche principali a colpo d'occhio
- **Connectors** — creazione, modifica, eliminazione, start/stop/restart delle sorgenti dati (OPC UA, Modbus, MQTT, HTTP, PROFINET, EtherCAT, ...), con template di configurazione pronti
- **Mapping** — esplorazione dei dispositivi/entità prodotti dal mapping engine di UDC
- **Storage** — configurazione dell'adapter di storage (Memory, Redis, TimescaleDB), test della connessione e verifica dello stato. Mostra lo storage effettivamente in uso e avvisa quando il backend è passato al fallback in memoria
- **Live Data** — dashboard in tempo reale alimentata dallo stream WebSocket:
  - **Grafici**: un grafico scorrevole per ogni misura numerica (finestra 1 / 5 / 15 min; i booleani sono disegnati a gradini 0/1)
  - **Valori correnti**: un riquadro per misura con ultimo valore e unità, attenuato se non si aggiorna da 10 s
  - **Stream grezzo**: gli ultimi messaggi così come arrivano
  - filtro per sorgente, ricerca per misura, pausa (la vista si congela ma i dati continuano a essere raccolti), frequenza dei messaggi e stato delle sorgenti
- **History** — consultazione dei dati registrati in TimescaleDB: intervalli predefiniti o personalizzati, zoom trascinando e spostamento, un grafico per misura (linea della media con banda min/max, cursore sincronizzato) e record grezzi paginati
- **Settings** — preferenze UI: lingua e tema chiaro/scuro
- **Internazionalizzazione** — inglese e italiano tramite i18next (default: italiano, salvato in `localStorage` con chiave `udc-language`)

## 📋 Requisiti

- Node.js 18+
- Un backend [Universal Data Connector](../universal-data-connector/README.it.md) in esecuzione (REST API sulla porta `3000` di default)

## 🚀 Avvio Rapido

```bash
# Installa le dipendenze
npm install

# Avvia il dev server (http://localhost:5173)
npm run dev
```

Il dev server di Vite inoltra le richieste `/api` e `/health` al backend UDC su `http://localhost:3000` (vedi [vite.config.ts](./vite.config.ts)), quindi non serve alcuna configurazione CORS durante lo sviluppo.

### Build di Produzione

```bash
# Type-check e build in dist/
npm run build

# Anteprima locale della build di produzione
npm run preview
```

## 📁 Struttura del Progetto

```
universal-data-connector-ui/
├── index.html
├── vite.config.ts            # Dev server + proxy verso il backend UDC
└── src/
    ├── api/
    │   ├── client.ts         # Istanza Axios
    │   ├── endpoints.ts      # Chiamate API tipizzate (status, sources, data, history, mapping, storage)
    │   └── types.ts          # Tipi delle risposte API
    ├── components/
    │   ├── Layout/           # AppLayout, Sidebar, TopBar
    │   ├── ConfirmDialog.tsx
    │   └── StatusChip.tsx
    ├── context/
    │   └── AppContext.tsx    # Stato globale dell'app (tema, ...)
    ├── hooks/
    │   ├── useUDCStatus.ts   # Polling dello stato del backend
    │   └── useWebSocket.ts   # Stream WebSocket con riconnessione automatica
    ├── i18n/
    │   ├── index.ts          # Setup i18next
    │   └── locales/          # en.json, it.json
    ├── pages/
    │   ├── Dashboard/
    │   ├── Connectors/       # Lista sorgenti + dialog di creazione/modifica
    │   ├── Mapping/
    │   ├── Storage/
    │   ├── LiveData/         # Grafici in tempo reale, valori correnti, stream grezzo
│   ├── History/          # Consultazione dello storico TimescaleDB
    │   └── Settings/
    ├── theme/                # Temi MUI chiaro/scuro
    ├── App.tsx               # Route
    └── main.tsx              # Entry point
```

## 🔌 API del Backend Utilizzate

La UI comunica con la REST API di UDC:

| Area | Endpoint |
|------|----------|
| Status | `GET /api/status`, `GET /api/status/health` |
| Sources | `GET /api/sources`, `POST /api/sources/:id/start|stop|restart` |
| Sources CRUD | `POST/PUT/DELETE /api/config/sources[/:id]`, `POST /api/config/reload` |
| Data | `GET /api/data/latest?limit=&source=` |
| History | `GET /api/history/status`, `GET /api/history/sources`, `GET /api/history/measurements`, `GET /api/history/series`, `GET /api/history/records` |
| Mapping | `GET /api/mapping/entities` |
| Storage | `GET/PUT /api/config/storage`, `GET /api/config/storage/types`, `POST /api/config/storage/test`, `GET /api/config/storage/health`, `POST /api/config/storage/configure` |

I dati live usano il WebSocket del backend (`ws://<host>:3001`, cioè l'URL API impostato in Settings con la porta `3000` sostituita da `3001`) con riconnessione automatica. Il WebSocket non passa dal proxy di Vite, quindi la porta `3001` deve essere raggiungibile dal browser. Formato dei messaggi: vedi la [documentazione API](../universal-data-connector/docs/API.it.md#websocket-real-time-stream).

La pagina History richiede TimescaleDB configurato nel backend (come storage attivo oppure in `alternatives.timescaledb` in `config/storage.json`).

## 🛠️ Stack Tecnologico

| Scopo | Libreria |
|-------|----------|
| Framework UI | React 18 + TypeScript |
| Build tool | Vite 5 |
| Componenti | Material UI (MUI) v5 + Emotion |
| Routing | React Router v6 |
| Client HTTP | Axios |
| Grafici | Recharts |
| i18n | i18next + react-i18next |

---

**Universal Data Connector UI** - Industry 5.0 Ready 🚀
