# Universal Data Connector UI

🇬🇧 [English version](./README.md)

## Panoramica

Orchestratore web delle istanze [Universal Data Connector](../universal-data-connector/README.it.md) (UDC). Dopo il login si apre una **lavagna** in stile NiFi / Node-RED con tutte le istanze registrate:
- ogni UDC è un blocco centrale con il suo stato;
- a sinistra ci sono le **sorgenti** (connettori: OPC UA, MQTT, Modbus, S7, HTTP...);
- a destra ci sono le **destinazioni**: subscription HTTP, MQTT, NATS o WebSocket, con il transformer indicato sul collegamento, e l'endpoint **MCP** per gli LLM.

Aggiungere, modificare o eliminare un blocco cambia la configurazione dell'istanza.

La UI parla solo con il suo backend, [universal-data-connector-ui-api](../universal-data-connector-ui-api/README.it.md). Il backend tiene il catalogo delle istanze e la posizione dei blocchi, autentica gli utenti (locali o Keycloak) e raggiunge ogni UDC con una chiave di servizio.

Realizzata con **React 18 + TypeScript**, **Vite**, **Material UI (MUI v5)**, **React Flow**, **Recharts** e **Leaflet**.

## 🎯 Funzionalità

**Lavagna**
- **Istanze UDC**: un blocco per ogni istanza registrata, con raggiungibilità, validità della chiave, modalità cluster e numero di sorgenti, destinazioni e tenant. Gli admin registrano nuove istanze in due modi: con URL e chiave di servizio, oppure con le credenziali di un superadmin dell'UDC, usate una sola volta e mai salvate. Gli admin possono anche modificarle o rimuoverle.
- **Palette dei blocchi**: si trascina un connettore o un canale vicino a un UDC (oppure si seleziona un UDC e si fa clic sul blocco). Si apre il modulo del connettore o il wizard della subscription, e il blocco resta dove è stato lasciato.
- **Pannello di dettaglio** del blocco selezionato:
  - sorgente: stato, replica del cluster che la esegue, statistiche e configurazione (i segreti sono mascherati per i lettori), più avvio, arresto, riavvio, modifica ed eliminazione;
  - destinazione: target, tenant, transformer, statistiche di consegna e ultimo errore, più modifica, pausa/ripresa ed eliminazione;
  - MCP: URL da dare ai client e tool disponibili.
- **Layout**: spostando un UDC si spostano anche i suoi blocchi; le posizioni sono salvate per tutti.
- **Stato in tempo reale**: la lavagna si aggiorna ogni 15 secondi. Un collegamento animato indica un flusso attivo, uno rosso un errore, uno tratteggiato un blocco disattivato.

**Istanza** (pulsante "Apri istanza" sul blocco UDC): le pagine di dettaglio di un'istanza, con selettore del tenant.
- **Dashboard**: numeri del broker per il tenant (entità, subscription, consegne, DLQ) e stato del motore.
- **Entità**:
  - tabella con filtri e vista **mappa**;
  - dettaglio con attributi, **storico**, relazioni, posizione, **comandi** e JSON;
  - creazione da modulo o da JSON.
- **Subscription**: elenco, wizard in 4 passi (entità, trigger, filtro, canale e formato in uscita), dettaglio con test, pausa, DLQ e notifiche live.
- **Transformer**: libreria dei formati di uscita (JSONata), con editor e anteprima su entità reali.
- **Storico**, **Dati live**, **Connettori**, **Mapping**, **Archiviazione**.
- **Amministrazione** (admin): membri e API key del tenant, accesso LLM (MCP), tenant, utenti dell'istanza, sessioni attive, storico accessi e cluster.

**Utenti della UI** (menu utente, admin, login locale): creazione, ruolo, disattivazione ed eliminazione.

| Ruolo | Può |
|---|---|
| Lettore | Vedere la lavagna e le istanze; i segreti sono mascherati |
| Operatore | Aggiungere, modificare e togliere sorgenti e destinazioni, spostare i blocchi, scrivere entità |
| Admin | Registrare le istanze, gestire gli utenti della UI e, su ogni istanza, tenant, utenti e chiavi |

Con Keycloak i ruoli vengono dai ruoli di realm (vedi il README di ui-api).

Dal menu utente si cambiano anche la password (login locale), il tile server della mappa, la lingua (IT/EN) e il tema.

## 📋 Requisiti

- Node.js 18+
- universal-data-connector-ui-api in esecuzione. Con `docker compose up -d` nel repo `universal-data-connector` partono UDC, ui-api e questa UI su http://localhost:8080.

## 🚀 Avvio

```bash
npm install
npm run dev        # http://localhost:5173
```

Il server di sviluppo Vite inoltra `/api` (compreso lo stream WebSocket) a ui-api su `http://localhost:9000`.

### Produzione

```bash
npm run build      # type-check e build in dist/
```

Il `Dockerfile` serve la build con nginx e inoltra `/api` (con l'upgrade WebSocket per lo stream) a `${UI_API_BACKEND}`. Il valore predefinito è `ui-api:9000`; Compose e il chart Helm lo impostano.

## 📁 Struttura del progetto

```
src/
├── api/
│   ├── auth.ts           # Login locale (coppia di token) o Keycloak (keycloak-js), rinnovo
│   ├── client.ts         # bffClient (ui-api) e apiClient (un'istanza UDC tramite il proxy di ui-api)
│   ├── bff.ts            # API di ui-api: utenti, catalogo UDC, flusso, layout, blocchi
│   ├── broker.ts         # API dell'istanza: entità, subscription, storico, comandi, amministrazione
│   ├── endpoints.ts      # API di sistema dell'istanza (/system): sorgenti, mapping, storage
│   └── session.ts
├── context/              # AppContext (tema, lingua), AuthContext (utente della UI), UdcScope (istanza e tenant)
├── pages/
│   ├── Board/            # lavagna: grafo, nodi, palette, pannello di dettaglio, registrazione UDC
│   ├── Users/            # utenti della UI
│   └── ...               # pagine di un'istanza: Dashboard, Entities, Subscriptions, Transformers,
│                         # History, LiveData, Connectors, Mapping, Storage, Admin
├── components/ hooks/ i18n/ theme/
```

## 🔌 API

- **ui-api** (`/api/v1/basic`, `/api/v1/auth`): vedi il [README di ui-api](../universal-data-connector-ui-api/README.it.md).
- **Un'istanza**: le pagine chiamano l'API dell'UDC ([guida al broker](../universal-data-connector/docs/Broker.it.md)) tramite `/api/v1/auth/udc/<id>/proxy/...`. Il tenant passa come `X-Tenant`.
- **Dati live**: `ws(s)://<host>/api/v1/auth/udc/<id>/stream?access_token=…&tenant=…`. ui-api lo collega allo stream dell'istanza. Alla chiusura con codice `4001` la UI rinnova il token e si riconnette.

## 🛠️ Stack tecnologico

| Scopo | Libreria |
|-------|----------|
| Framework UI | React 18 + TypeScript |
| Build | Vite 5 |
| Componenti | Material UI (MUI) v5 + Emotion |
| Lavagna | React Flow (@xyflow/react) |
| Login Keycloak | keycloak-js |
| Routing | React Router v6 |
| Client HTTP | Axios |
| Grafici | Recharts |
| Mappe | Leaflet + react-leaflet |
| i18n | i18next + react-i18next |
