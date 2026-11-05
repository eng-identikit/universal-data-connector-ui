# Universal Data Connector UI

🇬🇧 [English version](./README.md)

## Panoramica

Interfaccia web per il context broker [Universal Data Connector](../universal-data-connector/README.it.md) (UDC). Dal browser puoi:
- consultare e modificare le entità, in tabella o su mappa;
- gestire le subscription, seguire lo storico degli attributi e inviare comandi ai dispositivi;
- configurare i connettori e amministrare tenant, utenti, API key e cluster.

Realizzata con **React 18 + TypeScript**, **Vite**, **Material UI (MUI v5)**, **Recharts** e **Leaflet**.

## 🎯 Funzionalità

- **Login e tenant**: sessione JWT con rinnovo automatico, selettore del tenant nella barra in alto, pagine che si adattano al ruolo (viewer, operator, admin, superadmin).
- **Dashboard**: numeri del broker per il tenant (entità, subscription, consegne, DLQ) e stato del motore.
- **Entità**: tabella con filtri (tipo, pattern dell'id, collegate a, profondità, direzione, ordinamento) e vista **mappa** dell'area visibile. Creazione da modulo o da JSON.
- **Dettaglio entità**:
  - attributi, con un editor per tipo, metadata e configurazione del comando;
  - grafici dello **storico** (media con banda min–max, esportazione CSV, vista tabella);
  - alberi delle relazioni in entrambe le direzioni;
  - **posizione** sulla mappa, impostabile con un clic;
  - **comandi** agli attributi scrivibili, con il loro stato;
  - il JSON completo.
- **Subscription**:
  - elenco con stato e statistiche;
  - wizard in 4 passi (entità con anteprima, trigger con deadband/throttling/invio periodico, filtro con costruttore visuale e validazione lato server, canale e formato in uscita);
  - dettaglio con test, pausa/ripresa, DLQ con reinvio e svuotamento, e notifiche live per le subscription websocket.
- **Transformer**: libreria dei formati di uscita (espressioni JSONata in `config/transformers.json`), con editor e anteprima su entità reali; nel wizard si sceglie un transformer della libreria o se ne scrive uno solo per la subscription.
- **Storico**: storico degli attributi di qualsiasi entità.
- **Dati Live**: grafici e valori in tempo reale dallo stream autenticato del broker.
- **Connettori / Mapping / Archiviazione**: configurazione dei connettori (compresi tenant di destinazione e prefisso dell'id entità), dispositivi mappati e buffer dei dati grezzi.
- **Amministrazione**: membri del tenant, API key (mostrate una sola volta), tenant e utenti (superadmin), **sessioni attive** (chi è collegato, da dove e con quale client, revoca di una sessione o di tutte quelle di un utente), **storico accessi** (login riusciti, falliti e bloccati, logout, revoche) e **cluster** (istanze, partizioni, connettori, ritardo dell'event loop, backlog delle code).
- **Le mie sessioni**: dal menu utente ognuno vede i propri accessi e chiude quelli che non riconosce.
- **Impostazioni**: URL dell'API, tile server della mappa, lingua (IT/EN) e tema.

## 📋 Requisiti

- Node.js 18+
- Un backend UDC in esecuzione (`docker compose up -d` nel repo del backend avvia tutto, compresa questa UI, su http://localhost:8080)

## 🚀 Avvio

```bash
npm install
npm run dev        # http://localhost:5173
```

Il server di sviluppo Vite inoltra `/api` (compreso lo stream WebSocket) e `/health` a `http://localhost:3000`, quindi l'URL dell'API nelle Impostazioni può restare vuoto (stessa origine).

### Produzione

```bash
npm run build      # type-check e build in dist/
```

Il `Dockerfile` serve la build con nginx e inoltra `/api` e `/api/v1/stream` a `${UDC_BACKEND}` (predefinito `udc:3000`, impostato da Compose e dal chart Helm).

## 📁 Struttura del progetto

```
src/
├── api/
│   ├── client.ts         # Istanza Axios: base URL, token, X-Tenant, refresh su 401, URL dello stream
│   ├── session.ts        # Token e tenant selezionato in localStorage
│   ├── broker.ts         # API del broker: entità, subscription, storico, comandi, amministrazione, cluster
│   ├── endpoints.ts      # API di sistema (/api/v1/system): stato, sorgenti, mapping, storage
│   └── types.ts
├── components/           # Layout (sidebar, barra in alto, menu utente), EntityHistory, EntityMap, dialog
├── context/              # AppContext (tema, lingua, URL API), AuthContext (sessione, tenant, ruolo)
├── hooks/                # useBrokerStream (WebSocket autenticato), useUDCStatus
├── i18n/locales/         # it.json, en.json
└── pages/                # Login, Dashboard, Entities, Subscriptions, History, LiveData,
                          # Connectors, Mapping, Storage, Admin, Settings
```

## 🔌 API del backend

- **API del broker** (`/api/v1`): vedi la [guida al broker](../universal-data-connector/docs/Broker.it.md).
- **API di sistema** (`/api/v1/system`): vedi la [documentazione API](../universal-data-connector/docs/API.it.md).
- **Dati live**: `ws(s)://<host>/api/v1/stream?access_token=…&tenant=…`. Alla chiusura con codice `4001` (token scaduto) la UI rinnova il token e si riconnette.

## 🛠️ Stack tecnologico

| Scopo | Libreria |
|-------|----------|
| Framework UI | React 18 + TypeScript |
| Build | Vite 5 |
| Componenti | Material UI (MUI) v5 + Emotion |
| Routing | React Router v6 |
| Client HTTP | Axios |
| Grafici | Recharts |
| Mappe | Leaflet + react-leaflet |
| i18n | i18next + react-i18next |

---

**Universal Data Connector UI** - Industry 5.0 Ready 🚀
