# 🚲 CicloDesk — Documentazione

> Gestionale per ciclo officina: schede clienti, ordini di lavoro, catalogo lavorazioni.
> Tecnologie: **Node.js · Express · SQLite · HTML/CSS/JS vanilla**

---

## 📑 Indice

1. [Requisiti di sistema](#1-requisiti-di-sistema)
2. [Struttura del progetto](#2-struttura-del-progetto)
3. [Installazione passo per passo](#3-installazione-passo-per-passo)
4. [Avvio del server](#4-avvio-del-server)
5. [Accesso da telefono o tablet](#5-accesso-da-telefono-o-tablet)
6. [Descrizione dei moduli](#6-descrizione-dei-moduli)
7. [API REST — Riferimento](#7-api-rest--riferimento)
8. [Database](#8-database)
9. [Backup e ripristino](#9-backup-e-ripristino)
10. [Risoluzione problemi](#10-risoluzione-problemi)
11. [Aggiornamenti futuri consigliati](#11-aggiornamenti-futuri-consigliati)

---

## 1. Requisiti di sistema

| Componente | Versione minima | Note |
|---|---|---|
| **Node.js** | 18.x LTS o superiore | https://nodejs.org |
| **npm** | incluso con Node.js | — |
| **Sistema operativo** | Windows 10 / macOS 12 / Ubuntu 20.04 | — |
| **Browser** | Chrome 90+ / Firefox 90+ / Safari 15+ / Edge 90+ | Su tutti i dispositivi |
| **Rete** | Wi-Fi o LAN locale | Per accesso da telefono/tablet |

> ℹ️ Internet serve solo per la prima installazione di Node.js e delle dipendenze npm.

---

## 2. Struttura del progetto

```
ciclodesk/
├── package.json
├── start.bat
├── start.sh
├── DOCUMENTAZIONE.md
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

1. Vai su **https://nodejs.org** e scarica la versione **LTS**
2. Esegui il file e segui l'installazione con le opzioni predefinite
3. Riavvia il PC

Verifica:
```bash
node --version   # v20.x.x o superiore
npm --version    # 10.x.x o superiore
```

### Passo 2 — Copia il progetto

Copia la cartella `ciclodesk` sul PC (es. `C:\ciclodesk`).

### Passo 3 — Installa le dipendenze

```bash
cd C:\ciclodesk
npm install
```

> ⚠️ Va fatto **una sola volta**.

### Passo 4 — Primo avvio

```bash
npm start
```

Output atteso:
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
| **Mac/Linux** | `bash start.sh` nel terminale |
| **Terminale** | `cd ciclodesk && npm start` |

> **Non chiudere la finestra del terminale** mentre usi il gestionale.

### Avvio automatico con Windows

1. `Win + R` → `shell:startup` → Invio
2. Copia `start.bat` nella cartella che si apre

---

## 5. Accesso da telefono o tablet

1. PC e telefono sulla **stessa rete Wi-Fi**
2. Apri il browser sul telefono → `http://192.168.1.X:3000` (IP mostrato in console)

> 💡 Aggiungi alla schermata Home:
> - **Safari** → Condividi → "Aggiungi a schermata Home"
> - **Chrome** → menu ⋮ → "Aggiungi a schermata Home"

---

## 6. Descrizione dei moduli

### Backend

| File | Responsabilità |
|---|---|
| `server/index.js` | Avvia Express, serve i file statici, mostra IP LAN |
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
| `public/js/ordini.js` | Ciclo di vita ordine: apertura → voci → chiusura |
| `public/js/ui.js` | Rendering HTML, modali, form |
| `public/js/app.js` | Bootstrap, navigazione, eventi globali, toast errori |

---

## 7. API REST — Riferimento

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

## 8. Database

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

## 9. Backup e ripristino

### Backup manuale
```bash
# Windows
copy C:\ciclodesk\data\officina.db C:\Users\TuoNome\Documents\backup-officina.db

# Mac/Linux
cp ~/ciclodesk/data/officina.db ~/Documents/backup-officina.db
```

### Ripristino
1. Ferma il server (`Ctrl + C`)
2. Sostituisci `data/officina.db` con il backup
3. Riavvia con `npm start`

---

## 10. Risoluzione problemi

| Errore | Soluzione |
|---|---|
| `node non riconosciuto` | Reinstalla Node.js e riavvia il PC |
| `EADDRINUSE porta 3000` | Cambia porta in `server/index.js` o chiudi l'altro processo |
| Telefono non si connette | Verifica stessa rete Wi-Fi + firewall Windows porta 3000 |
| `Cannot find module` | Esegui `npm install` nella cartella del progetto |
| Dati non salvati / errore 500 | Verifica che la cartella `data/` esista e sia scrivibile |

---

## 11. Aggiornamenti futuri consigliati

| Funzionalità | Priorità |
|---|---|
| Login con password | 🔴 Alta |
| Stampa / PDF ordine | 🔴 Alta |
| Backup automatico | 🟡 Media |
| Storico ordini per cliente | 🟡 Media |
| Statistiche mensili | 🟢 Bassa |
| Deploy cloud (accesso remoto) | 🟢 Bassa |

---

## Note di versione

| Versione | Data | Note |
|---|---|---|
| 1.0.0 | 2026-05-13 | Prima versione: clienti, ordini, catalogo, SQLite, LAN |

---
*CicloDesk v1.0.0*
