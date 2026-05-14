# 🚲 CicloDesk — Documentazione Completa

> Gestionale per ciclo officina: schede clienti, ordini di lavoro, catalogo lavorazioni, storico interventi.
> Tecnologie: **Node.js · Express · SQLite · HTML/CSS/JS vanilla**

---

## 📑 Indice

1. [Requisiti di sistema](#1-requisiti-di-sistema)
2. [Struttura del progetto](#2-struttura-del-progetto)
3. [Installazione passo per passo](#3-installazione-passo-per-passo)
4. [Avvio del server](#4-avvio-del-server)
5. [Accesso da telefono o tablet](#5-accesso-da-telefono-o-tablet)
6. [Tecnologie usate](#6-tecnologie-usate)
7. [Funzionalità](#7-funzionalità)
8. [Descrizione dettagliata dei moduli](#8-descrizione-dettagliata-dei-moduli)
9. [Come comunicano tra loro](#9-come-comunicano-tra-loro)
10. [API REST — Riferimento](#10-api-rest--riferimento)
11. [Database](#11-database)
12. [Backup e ripristino](#12-backup-e-ripristino)
13. [Risoluzione problemi](#13-risoluzione-problemi)
14. [Aggiornamenti futuri consigliati](#14-aggiornamenti-futuri-consigliati)
15. [Note di versione](#15-note-di-versione)

---

## 1. Requisiti di sistema

| Componente | Versione minima | Note |
|---|---|---|
| **Node.js** | 18.x LTS o superiore | https://nodejs.org |
| **npm** | incluso con Node.js | — |
| **Sistema operativo** | Windows 10 / macOS 12 / Ubuntu 20.04 | — |
| **Browser** | Chrome 90+ / Firefox 90+ / Safari 15+ / Edge 90+ | Su tutti i dispositivi |
| **Rete** | Wi-Fi o LAN locale | Per accesso da telefono/tablet |

---

## 2. Struttura del progetto

```
ciclodesk/
├── package.json
├── start.bat
├── start.sh
├── CICLODESK_COMPLETO.md
├── data/
│   └── officina.db
├── server/
│   ├── index.js
│   ├── db.js
│   └── routes/
│       ├── clienti.js
│       ├── ordini.js
│       └── lavorazioni.js
└── public/
    ├── index.html
    ├── img/
    │   └── logo.svg
    ├── css/
    │   └── style.css
    └── js/
        ├── db.js
        ├── lavorazioni.js
        ├── clienti.js
        ├── ordini.js
        ├── ui.js
        └── app.js
```

---

## 3. Installazione passo per passo

### Passo 1 — Installa Node.js
1. Vai su **https://nodejs.org** → scarica la versione **LTS**
2. Installa e **riavvia il PC**

```bash
node --version   # v20.x.x
npm --version    # 10.x.x
```

### Passo 2 — Installa le dipendenze
```bash
cd C:\ciclodesk
npm install
```

### Passo 3 — Primo avvio
```bash
npm start
```
```
🚲  CicloDesk avviato!

   💻  PC locale  → http://localhost:3000
   📱  Telefono   → http://192.168.1.15:3000
```

---

## 4. Avvio del server

| Metodo | Come |
|---|---|
| **Windows** | Doppio clic su `start.bat` |
| **Mac/Linux** | `bash start.sh` |
| **Terminale** | `npm start` |
| **All'avvio automatico** | Copia `start.bat` in `shell:startup` |

---

## 5. Accesso da telefono o tablet

1. Stessa rete Wi-Fi del PC
2. Browser → `http://192.168.1.X:3000`
3. Aggiungi alla schermata Home per usarla come app

---

## 6. Tecnologie usate

| Tecnologia | Cos'è | Dove |
|---|---|---|
| **Node.js** | Runtime JS lato server | Backend |
| **Express.js** | Framework HTTP | Route API |
| **SQLite + better-sqlite3** | Database file | `server/db.js` |
| **HTML5 / CSS3** | Markup e stili | `public/` |
| **JavaScript ES2020** | Logica frontend | `public/js/` |
| **Fetch API** | Chiamate HTTP | `public/js/db.js` |

---

## 7. Funzionalità

### Dashboard
- Contatori in tempo reale: clienti, bici in officina, uscite oggi, incasso oggi
- Incasso mascherabile con bottone 👁 (preferenza salvata in localStorage)
- Lista bici attualmente in officina con accesso rapido a modifica e chiusura

### Schede Clienti
- Anagrafica completa: nome, telefono, email, modello bici, note
- Ricerca live su tutti i campi
- Totale speso e interventi attivi mostrati nella card
- Accesso rapido a **Storico interventi** e **Nuovo ordine**

### 📋 Storico Interventi per Cliente *(nuovo in v1.1.0)*
- Aperto dal bottone **"📋 Storico"** nella scheda cliente
- **5 statistiche riepilogative:**
  - Interventi totali
  - Interventi completati
  - Totale speso (solo ordini chiusi)
  - Spesa media per intervento
  - Data ultimo ingresso
- Lista completa di tutti gli ordini del cliente, dal più recente
- Ogni ordine mostra: date ingresso/uscita, stato, lavorazioni, note, totale
- **Ricerca live** tra gli interventi del cliente (per lavorazione, note, data)
- Modifica rapida di ogni ordine direttamente dallo storico

### Ordini di Lavoro
- Creazione ordine con selezione cliente e lavorazioni dal catalogo
- Prezzo auto-compilato dal catalogo, modificabile per ogni voce
- Filtro per stato (tutti / in officina / completati)
- Ricerca full-text su cliente, bici, lavorazioni, note
- Chiusura e riapertura ordini con un click

### Catalogo Lavorazioni
- Gestione del listino prezzi dell'officina
- 13 lavorazioni predefinite al primo avvio
- Aggiunta, modifica ed eliminazione voci

---

## 8. Descrizione dettagliata dei moduli

### Backend

| File | Responsabilità |
|---|---|
| `server/index.js` | Avvia Express, serve file statici, mostra IP LAN |
| `server/db.js` | Schema SQLite, seed lavorazioni predefinite |
| `server/routes/clienti.js` | CRUD clienti, DELETE a cascata sugli ordini |
| `server/routes/ordini.js` | CRUD ordini, voci serializzate in JSON |
| `server/routes/lavorazioni.js` | CRUD catalogo lavorazioni |

### Frontend

| File | Responsabilità |
|---|---|
| `public/js/db.js` | Tutte le chiamate fetch() verso /api/* |
| `public/js/clienti.js` | getAll, findById, cerca, salva, elimina |
| `public/js/lavorazioni.js` | getAll, findById, salva, elimina |
| `public/js/ordini.js` | Ciclo di vita ordine + getByCliente, calcolaIncasso |
| `public/js/ui.js` | Rendering HTML, modali, storico, form |
| `public/js/app.js` | Bootstrap, navigazione, eventi, toast errori |

#### `ui.js` — funzioni principali

| Funzione | Descrizione |
|---|---|
| `renderDashboard()` | Statistiche e bici in officina |
| `renderClienti()` | Lista clienti con ricerca |
| `renderOrdini()` | Lista ordini con filtro e ricerca |
| `renderCatalogo()` | Lista lavorazioni |
| `apriModalCliente()` | Form cliente (nuovo/modifica) |
| `apriModalOrdine()` | Form ordine con voci dinamiche |
| `apriModalLavorazione()` | Form lavorazione catalogo |
| `apriModalStorico()` | **Storico interventi** con stats e ricerca live |
| `filtraStorico()` | Filtra la lista storico senza nuove chiamate API |
| `aggiornaIncasso()` | Aggiorna il valore incasso rispettando la visibilità |

---

## 9. Come comunicano tra loro

```
Utente clicca "📋 Storico" su un cliente
         │
         ▼
app.js → event delegation → action: 'storico-cliente'
         chiama UI.apriModalStorico(clienteId)
         │
         ▼
ui.js → Promise.all([
          ClientiService.findById(clienteId),
          OrdiniService.getByCliente(clienteId)
        ])
         │
         ▼
ordini.js → DB.getAll('ordini') → filtra per clienteId
         │
         ▼
db.js → fetch GET /api/ordini → server restituisce JSON
         │
         ▼
ui.js → ordina per data desc
        calcola 5 statistiche
        renderizza lista con ricerca live
        apre modal-storico
         │
         ▼
Utente vede l'intero storico del cliente ✅
```

---

## 10. API REST — Riferimento

Base URL: `http://localhost:3000/api`

### Clienti
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/api/clienti` | Lista tutti |
| GET | `/api/clienti/:id` | Dettaglio |
| POST | `/api/clienti` | Crea |
| PUT | `/api/clienti/:id` | Aggiorna |
| DELETE | `/api/clienti/:id` | Elimina (+ ordini) |

### Ordini
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/api/ordini` | Lista tutti |
| GET | `/api/ordini/:id` | Dettaglio |
| POST | `/api/ordini` | Crea |
| PUT | `/api/ordini/:id` | Aggiorna / chiudi / riapri |
| DELETE | `/api/ordini/:id` | Elimina |

### Lavorazioni
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/api/lavorazioni` | Lista catalogo |
| GET | `/api/lavorazioni/:id` | Dettaglio |
| POST | `/api/lavorazioni` | Aggiungi |
| PUT | `/api/lavorazioni/:id` | Modifica |
| DELETE | `/api/lavorazioni/:id` | Rimuovi |

---

## 11. Database

File: `data/officina.db`

```sql
CREATE TABLE clienti (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL,
  telefono TEXT, email TEXT, bici TEXT, note TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE lavorazioni (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL,
  prezzo REAL DEFAULT 0, descrizione TEXT
);

CREATE TABLE ordini (
  id TEXT PRIMARY KEY, clienteId TEXT NOT NULL,
  stato TEXT DEFAULT 'aperto',
  dataIngresso TEXT, dataUscita TEXT,
  note TEXT, voci TEXT DEFAULT '[]', totale REAL DEFAULT 0,
  FOREIGN KEY (clienteId) REFERENCES clienti(id)
);
```

---

## 12. Backup e ripristino

```bash
# Windows
copy C:\ciclodesk\data\officina.db C:\Users\TuoNome\Documents\backup-officina.db

# Mac/Linux
cp ~/ciclodesk/data/officina.db ~/Documents/backup-officina.db
```

**Ripristino:** ferma server → sostituisci `officina.db` → riavvia

---

## 13. Risoluzione problemi

| Errore | Soluzione |
|---|---|
| `node non riconosciuto` | Reinstalla Node.js e riavvia il PC |
| `EADDRINUSE porta 3000` | `taskkill /PID <pid> /F` (Windows) |
| Telefono non si connette | Stessa Wi-Fi + apri porta 3000 nel firewall |
| `Cannot find module` | Esegui `npm install` |
| Pagina bianca | `F12 → Console` → controlla errori rossi |

---

## 14. Aggiornamenti futuri consigliati

| Funzionalità | Priorità |
|---|---|
| **Login con password** | 🔴 Alta |
| **Stampa / PDF ordine** | 🔴 Alta |
| **Backup automatico su cloud** | 🟡 Media |
| **Notifiche pronto-ritiro** | 🟡 Media |
| **Statistiche mensili** | 🟢 Bassa |
| **Gestione magazzino ricambi** | 🟢 Bassa |
| **Deploy cloud** | 🟢 Bassa |

---

## 15. Note di versione

| Versione | Data | Modifiche |
|---|---|---|
| **1.1.0** | 2026-05-14 | Aggiunto **Storico interventi per cliente**: modal dedicato con 5 statistiche riepilogative, lista completa ordini, ricerca live, modifica rapida. Aggiornata grafica con palette slate coerente con logo Cerica Bikelab |
| **1.0.0** | 2026-05-14 | Prima versione: clienti, ordini, catalogo, SQLite, accesso LAN |

---

*🚲 CicloDesk v1.1.0 — Gestionale per ciclo officina Cerica Bikelab*
