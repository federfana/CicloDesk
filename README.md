# 🚲 CicloDesk — Documentazione Completa

> Gestionale per ciclo officina: schede clienti, gestione multi-bici, ordini di lavoro, catalogo lavorazioni, storico interventi.
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
13. [Procedura di aggiornamento senza perdita dati](#13-procedura-di-aggiornamento-senza-perdita-dati)
14. [Risoluzione problemi](#14-risoluzione-problemi)
15. [Aggiornamenti futuri consigliati](#15-aggiornamenti-futuri-consigliati)
16. [Note di versione](#16-note-di-versione)

---

## 1. Requisiti di sistema

| Componente | Versione minima | Note |
|---|---|---|
| **Node.js** | 22.x LTS o superiore | https://nodejs.org — versione **LTS** consigliata |
| **npm** | incluso con Node.js | — |
| **Sistema operativo** | Windows 10 / macOS 12 / Ubuntu 20.04 | — |
| **Browser** | Chrome 90+ / Firefox 90+ / Safari 15+ / Edge 90+ | Su tutti i dispositivi |
| **Rete** | Wi-Fi o LAN locale | Per accesso da telefono/tablet |

> ℹ️ Internet serve solo per la prima installazione di Node.js e delle dipendenze npm.
> Il gestionale funziona completamente **offline** in rete locale.

> ⚠️ Usare la versione **22.x LTS** di Node.js. Le versioni 20 e precedenti sono a fine vita (EOL) e non ricevono più aggiornamenti di sicurezza.

---

## 2. Struttura del progetto

```
ciclodesk/
├── package.json              # Dipendenze e script npm
├── start.bat                 # Avvio rapido Windows (doppio clic)
├── start.sh                  # Avvio rapido Mac/Linux
├── README.md                 # Questo file
│
├── data/                     # Creata automaticamente all'avvio
│   └── officina.db           # Database SQLite (tutti i dati)
│
├── server/
│   ├── index.js              # Entry point — server Express
│   ├── db.js                 # Connessione SQLite, schema, seed
│   ├── utils.js              # Utilità condivise (newId)
│   └── routes/
│       ├── clienti.js        # GET/POST/PUT/DELETE /api/clienti
│       ├── ordini.js         # GET/POST/PUT/DELETE /api/ordini
│       ├── lavorazioni.js    # GET/POST/PUT/DELETE /api/lavorazioni
│       └── bici.js           # GET/POST/PUT/DELETE /api/bici
│
└── public/
    ├── index.html            # Pagina principale (SPA)
    ├── img/
    │   └── logo.svg          # Logo Cerica Bikelab
    ├── css/
    │   └── style.css         # Tutti gli stili
    └── js/
        ├── db.js             # Client HTTP (fetch → API server)
        ├── lavorazioni.js    # Logica catalogo lavorazioni
        ├── clienti.js        # Logica schede clienti
        ├── bici.js           # Logica gestione bici per cliente
        ├── ordini.js         # Logica ordini di lavoro
        ├── ui.js             # Rendering interfaccia e modali
        └── app.js            # Bootstrap, navigazione, eventi globali
```

### Flusso dati

```
Browser (PC / Telefono)
        │
        │  HTTP / JSON
        ▼
server/index.js  (Express — porta 3000)
        │
        ├── /api/clienti     → server/routes/clienti.js
        ├── /api/ordini      → server/routes/ordini.js
        ├── /api/lavorazioni → server/routes/lavorazioni.js
        └── /api/bici        → server/routes/bici.js
                                        │
                                        ▼
                               server/db.js  (better-sqlite3)
                                        │
                                        ▼
                               data/officina.db
```

### Relazioni tra le tabelle

```
clienti (1) ──────────────────── (N) bici
    │                                  │
    │ (1)                              │ (N)
    └──────────── (N) ordini ──────────┘
                    biciId (nullable)
```

Ogni bici appartiene direttamente a un cliente (`clienteId`). Gli ordini collegano un cliente a una bici specifica tramite `biciId` (opzionale).

---

## 3. Installazione passo per passo

### Passo 1 — Installa Node.js

1. Vai su **https://nodejs.org** e scarica la versione **LTS** (22.x)
2. Esegui il file e segui l'installazione con le opzioni predefinite
3. **Riavvia il PC**

Verifica nel terminale (usa il **Prompt dei comandi cmd**, non PowerShell):
```bash
node --version   # deve mostrare v22.x.x
npm --version    # 10.x.x o superiore
```

> ⚠️ Se `npm install` dà errore "l'esecuzione di script è disabilitata", usa il **Prompt dei comandi (cmd)** invece di PowerShell. Il cmd non ha questo blocco.

---

### Passo 2 — Copia il progetto

Copia la cartella `ciclodesk` sul PC che farà da server.

Percorso consigliato:
```
Windows:   C:\ciclodesk\
Mac/Linux: /home/tuonome/ciclodesk/
```

---

### Passo 3 — Installa le dipendenze

Apri il **Prompt dei comandi (cmd)**:

```batch
cd C:\ciclodesk
npm install
```

Al termine vedrai:
```
added 42 packages in 8s
```

> ⚠️ Va fatto **una sola volta**. Non serve ripeterlo ai successivi avvii.

---

### Passo 4 — Primo avvio

```bash
npm start
```

Output atteso:
```
🚲  CicloDesk avviato!

   💻  PC locale  → http://localhost:3000
   📱  Telefono   → http://192.168.1.15:3000

   (tutti i dispositivi devono essere sulla stessa rete Wi-Fi)
```

Apri il browser e vai su **http://localhost:3000** — CicloDesk è pronto.

---

## 4. Avvio del server

### Metodo A — Doppio clic (Windows, il più semplice)

Fai doppio clic su **`start.bat`** nella cartella del progetto.
**Non chiudere la finestra nera** finché usi il gestionale.

### Metodo B — Terminale (Mac/Linux o preferenza)

```bash
cd ciclodesk
npm start
```

### Metodo C — Avvio automatico all'accensione del PC (Windows)

1. Premi `Win + R` → digita `shell:startup` → premi Invio
2. Copia `start.bat` nella cartella che si apre
3. Da ora il server parte automaticamente ad ogni accensione

### Arresto del server

Nella finestra del terminale premi **`Ctrl + C`**.

---

## 5. Accesso da telefono o tablet

1. PC e telefono devono essere sulla **stessa rete Wi-Fi**
2. Guarda l'IP mostrato in console all'avvio (es. `192.168.1.15`)
3. Apri il browser sul telefono e digita: **`http://192.168.1.15:3000`**

> 💡 **Aggiungi alla schermata Home per usarla come app:**
> - **Safari (iPhone)** → icona Condividi → "Aggiungi a schermata Home"
> - **Chrome (Android)** → menu ⋮ → "Aggiungi a schermata Home"

> ⚠️ L'IP del PC può cambiare se il router viene riavviato.
> Per un IP fisso, configura un **IP statico** nelle impostazioni di rete del PC.

---

## 6. Tecnologie usate

| Tecnologia | Cos'è | Dove viene usata |
|---|---|---|
| **Node.js** | Runtime JavaScript lato server | Esegue tutto il backend |
| **Express.js** | Framework web per Node.js | Gestisce le route HTTP |
| **SQLite** | Database relazionale in un singolo file | Salva tutti i dati |
| **better-sqlite3** | Libreria Node per SQLite sincrona | `server/db.js` |
| **HTML5** | Linguaggio markup | Struttura della pagina |
| **CSS3** | Fogli di stile con variabili CSS | Layout e grafica |
| **JavaScript ES2020** | Linguaggio frontend moderno | Tutta la logica client |
| **Fetch API** | API browser per chiamate HTTP | `public/js/db.js` |
| **async/await** | Sintassi JavaScript asincrona | Tutti i moduli frontend |

---

## 7. Funzionalità

### Dashboard
- **4 contatori** in tempo reale: clienti registrati, bici in officina, pronte al ritiro (evidenziato in verde), consegnate oggi
- **⚠️ Notifiche automatiche** — banner arancione per ordini fermi da più di 48h con link diretto all'ordine
- **💾 Pulsanti backup** — download diretto del database (.db) o export JSON completo
- **📥 Importa JSON** — ripristina tutti i dati da un file JSON esportato in precedenza (sovrascrive i dati attuali con conferma)
- **📦 Loading spinner** — indicatore visivo durante il caricamento dei dati
- Lista bici attualmente in officina con badge stato colorato e pulsante avanzamento rapido

### 🔍 Ricerca Globale *(v1.7.0)*
- Barra di ricerca nell'header, accessibile da qualsiasi vista
- Cerca in tempo reale (con debounce 250ms) tra clienti, ordini e lavorazioni
- Risultati cliccabili: apre direttamente il modal di modifica dell'elemento trovato

### Schede Clienti
- Anagrafica: nome, **cognome**, telefono, email, note libere
- Data iscrizione "cliente dal DD/MM/YYYY" visibile nella scheda
- Ricerca live su nome, cognome, telefono, email
- Dropdown clienti con suggerimenti custom (uniforme su tutti i browser)
- Totale speso e numero interventi attivi in ogni card
- Accesso rapido a **🚲 Bici**, **📋 Storico**, **+ Ordine**, modifica ed eliminazione
- Conferma eliminazione mostra il conteggio di ordini e bici associate

### 🚲 Gestione Multi-Bici per Cliente *(v1.2.0)*
- Ogni cliente può avere **più bici** registrate
- Campi per ogni bici:
  - **Marca** + **Modello** (obbligatorio) — in quest'ordine
  - **Tipo** — menu a tendina: 🚴 Strada/Gravel · 🏔️ MTB · ⚡🏔️ E-MTB · ⚡ E-Bike
  - **Colore**
  - **Seriale forcella** — numero di serie della forcella ammortizzata
  - **Seriale ammortizzatore** — numero di serie dell'ammortizzatore posteriore
  - **Note** libere
- Badge colorato per ogni tipo di bici nelle card
- Nel form **Nuovo Ordine**, dopo aver selezionato il cliente appare un select dinamico con le sue bici
- Eliminare una bici **non elimina gli ordini** collegati (`biciId` diventa NULL)

### 📋 Storico Interventi per Cliente *(v1.1.0)*
- Aperto dal bottone **"📋 Storico"** nella scheda cliente
- **5 statistiche:** interventi totali, completati, totale speso, spesa media, ultimo ingresso
- Lista ordini dal più recente, con bici associata, stato, lavorazioni, totale
- **Ricerca live** tra gli interventi
- Modifica rapida di ogni ordine direttamente dallo storico
- Dopo il salvataggio, lo storico si riapre aggiornato (non si chiude tutto)

### Ordini di Lavoro
- Selezione cliente + bici specifica + lavorazioni dal catalogo
- Prezzo auto-compilato dal catalogo, modificabile voce per voce
- **📷 Foto allegata** — upload di immagini (max 2MB) per documentare lo stato della bici all'ingresso; preview con thumbnails rimovibili
- **💰 Gestione acconti/caparre** — campo dedicato con calcolo in tempo reale del "Resta da saldare"; info acconto visibile nelle card ordini
- **Note per voce** — ogni lavorazione nell'ordine ha un campo note dedicato
- **4 stati** con avanzamento sequenziale tramite pulsante dedicato:
- **Modifica stato** — select colorato nel modal modifica ordine (visibile solo in modifica, nascosto in creazione)

| Stato | Colore bordo | Badge | Pulsante avanza |
|---|---|---|---|
| 📥 Accettata | Azzurro | `badge-accettata` | 🔧 Inizia |
| 🔧 In lavorazione | Giallo | `badge-in-lavorazione` | ✅ Pronto |
| ✅ Pronto al ritiro | Verde | `badge-pronto` | 📦 Consegna |
| 📦 Consegnata | Grigio | `badge-consegnata` | — |

- Filtro per stato tramite menu a tendina — **filtro salvato tra una sessione e l'altra**
- Ricerca full-text su cliente, bici, lavorazioni, note
- Riapertura ordine consegnato → torna a "In lavorazione"
- **Ordini attivi mostrati prima** (accettati → in lavorazione → pronti), poi consegnati per data
- Obbligatorio aggiungere almeno una lavorazione prima di salvare
- Toast di conferma verde dopo ogni salvataggio
- Pulsante **🖨️ Stampa** su ogni ordine: apre una finestra di stampa con ricevuta formattata (cliente, bici, lavorazioni, totale, stato pagamento). Compatibile con "Salva come PDF" del browser.

### Catalogo Lavorazioni
- Gestione del listino prezzi dell'officina
- 13 lavorazioni predefinite al primo avvio
- Aggiunta, modifica ed eliminazione
- Il prezzo viene proposto automaticamente negli ordini ma è sempre modificabile
- **Eliminazione bloccata** se la lavorazione è presente in uno o più ordini (con conteggio)
- Dropdown lavorazioni con suggerimenti custom (uniforme su tutti i browser)

---

## 8. Descrizione dettagliata dei moduli

### Mappa generale

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER                              │
│  index.html → carica CSS + 7 file JS in sequenza        │
│                                                         │
│  db.js → lavorazioni.js → clienti.js → bici.js         │
│       → ordini.js → ui.js → app.js                     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP fetch() JSON
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                     │
│  index.js → routes/clienti.js ──┐                      │
│           → routes/ordini.js ───┼──► db.js             │
│           → routes/lavoraz..js ─┤      │               │
│           → routes/bici.js ─────┘      │ SQL           │
└────────────────────────────────────────┼───────────────┘
                                         │
                                data/officina.db
```

---

### 🖥️ BACKEND

---

#### `server/index.js` — Il punto di ingresso

**Tecnologie:** Node.js, Express.js, modulo `os` di Node

```
Cosa fa:
1. Crea il server Express
2. Abilita la lettura del JSON in arrivo
3. Serve i file statici della cartella /public
4. Registra le 4 route API (clienti, ordini, lavorazioni, bici)
5. Si mette in ascolto sulla porta 3000
6. Calcola l'IP locale e lo stampa in console
```

**Concetti chiave:**

- **`express()`** — crea l'applicazione web
- **`express.json()`** — middleware che trasforma automaticamente il body JSON delle richieste in oggetto JavaScript
- **`express.static()`** — serve HTML, CSS, JS, immagini dalla cartella `public/` senza scrivere route manualmente
- **`app.listen('0.0.0.0')`** — ascolta su tutte le interfacce di rete, così è raggiungibile anche dal telefono in Wi-Fi
- **`os.networkInterfaces()`** — funzione Node.js che legge le schede di rete del PC per trovare l'IP locale

---

#### `server/db.js` — Il database

**Tecnologie:** better-sqlite3, Node.js (`fs`, `path`)

```
Cosa fa:
1. Crea la cartella /data se non esiste
2. Apre (o crea) il file officina.db
3. Attiva ottimizzazioni di performance (WAL)
4. Crea le 4 tabelle nell'ordine corretto:
   clienti → lavorazioni → bici → ordini
5. Inserisce 13 lavorazioni predefinite al primo avvio
6. Esporta la connessione al database
```

**Concetti chiave:**

- **`better-sqlite3`** — libreria SQLite **sincrona** per Node.js, più semplice e veloce per query semplici rispetto alle alternative asincrone
- **`journal_mode = WAL`** — Write-Ahead Logging: permette letture e scritture simultanee senza blocchi, fondamentale quando telefono e PC accedono insieme
- **`foreign_keys = ON`** — SQLite di default disabilita i vincoli di integrità referenziale, questa riga li forza
- **Ordine delle tabelle** — le tabelle devono essere create nell'ordine giusto: prima quelle referenziate, poi quelle che le referenziano. `clienti` viene prima di `bici`, che viene prima di `ordini`
- **`CREATE TABLE IF NOT EXISTS`** — crea la tabella solo se non esiste, così lo script può girare più volte senza errori
- **`db.transaction()`** — raggruppa i 13 INSERT in una transazione atomica (~50x più veloce di INSERT singoli)
- **`module.exports = db`** — esporta la connessione aperta, così tutti i `routes/*.js` usano **la stessa connessione**
- **Migrazioni automatiche** — al riavvio, `PRAGMA table_info()` verifica le colonne esistenti e aggiunge con `ALTER TABLE` quelle mancanti (`cognome` su `clienti`, `pagato` su `ordini`). I dati esistenti non vengono mai toccati.

---

#### `server/routes/clienti.js` — API Clienti

**Tecnologie:** Express Router, better-sqlite3

```
Espone 5 endpoint HTTP:

GET    /api/clienti       → tutti i clienti (ordinati per cognome, poi nome)
GET    /api/clienti/:id   → singolo cliente
POST   /api/clienti       → crea cliente
PUT    /api/clienti/:id   → aggiorna cliente
DELETE /api/clienti/:id   → elimina cliente, bici e ordini associati
```

**Concetti chiave:**

- **`express.Router()`** — crea un mini-router isolato montato su `/api/clienti`
- **`req.params.id`** — legge il parametro dinamico dall'URL
- **`req.body`** — contiene i dati JSON inviati nel body della richiesta
- **`res.status(404).json()`** — risponde con codice HTTP 404 e messaggio di errore JSON
- **`res.status(201)`** — HTTP 201 = "Created", risposta corretta per una POST
- **DELETE a cascata** — elimina nell'ordine: ordini → bici → cliente. Necessario con foreign keys attive

---

#### `server/routes/bici.js` — API Bici *(v1.2.0)*

**Tecnologie:** Express Router, better-sqlite3

```
Espone 5 endpoint HTTP:

GET    /api/bici?clienteId=xxx → bici di un cliente specifico
GET    /api/bici/:id           → singola bici
POST   /api/bici               → crea bici
PUT    /api/bici/:id           → aggiorna bici
DELETE /api/bici/:id           → elimina bici (biciId=NULL sugli ordini)
```

**Campi gestiti:** `clienteId`\*, `marca`, `modello`\*, `tipo`, `colore`, `seriale_forcella`, `seriale_ammortizzatore`, `note`

**Concetti chiave:**

- **`req.query.clienteId`** — filtro via query string (`?clienteId=abc`) senza route separata
- **`tipo`** — uno dei valori: `strada` | `mtb` | `emtb` | `ebike`. Default: `strada`
- **`seriale_forcella` / `seriale_ammortizzatore`** — numeri di serie per forcelle e ammortizzatori, utili per assistenza e garanzie
- **DELETE non distruttivo** — aggiorna `biciId = NULL` negli ordini prima di eliminare la bici

---

#### `server/routes/ordini.js` — API Ordini

**Tecnologie:** Express Router, better-sqlite3, `JSON.stringify/parse`

```
Espone 5 endpoint HTTP per gestire gli ordini.
Peculiarità: le voci di lavorazione sono un array
salvato come stringa JSON nella colonna "voci".
```

**Stati validi (in ordine sequenziale):**
```
accettata → in_lavorazione → pronto → consegnata
```

**Concetti chiave:**

- **Voci come JSON serializzato** — SQLite non ha tipo "array". Le voci vengono salvate con `JSON.stringify([...])` e rilette con `JSON.parse(...)`
- **Funzione `parse(row)`** — converte automaticamente la stringa JSON delle voci in array JavaScript ad ogni lettura
- **`biciId` nullable** — accetta `NULL` quando l'ordine non è legato a una bici specifica
- **`dataUscita` automatica** — viene impostata solo quando lo stato diventa `consegnata`; per tutti gli altri stati viene azzerata a `null`
- **Validazione stato** — il server accetta solo i 4 stati validi; qualsiasi altro valore viene ignorato e mantenuto lo stato precedente

---

#### `server/routes/lavorazioni.js` — API Catalogo

**Tecnologie:** Express Router, better-sqlite3

```
CRUD completo per il catalogo delle lavorazioni.
È il modulo più semplice: dati piatti, nessuna relazione complessa.
```

> **Nota:** non ha cascade delete perché le lavorazioni negli ordini sono **snapshot** (copia dei dati al momento della creazione). Eliminare una lavorazione dal catalogo non rompe gli ordini già creati.

---

### 🌐 FRONTEND

---

#### `public/js/db.js` — Il client HTTP

**Tecnologie:** Fetch API (browser nativa), async/await, JSON

```
È l'unico file del frontend che "parla" con il server.
Tutti gli altri moduli chiamano questo, mai fetch() direttamente.
Espone: getAll, findById, create, update, upsert, remove, newId
```

**Concetti chiave:**

- **`fetch()`** — API nativa dei browser moderni per richieste HTTP
- **`_req()` privata** — centralizza headers, gestione errori HTTP, parse JSON
- **`throw new Error()`** — errori 4xx/5xx diventano eccezioni JavaScript catturate con `try/catch`
- **`BASE = '/api'`** — path relativo: funziona sia su `localhost:3000` che su `192.168.1.X:3000`
- **`getAll('bici?clienteId=abc')`** — la query string viene passata direttamente nell'URL

---

#### `public/js/lavorazioni.js` — Logica Catalogo

```
Metodi: getAll, findById, salva, elimina
```

**Concetti chiave:**

- **Service layer** — trasforma e valida i dati prima di inviarli al server (`parseFloat`, `.trim()`)

---

#### `public/js/clienti.js` — Logica Clienti

```
Metodi: getAll, findById, cerca, salva, elimina
```

**Concetti chiave:**

- **`cerca()` lato client** — filtra in memoria con `Array.filter()`, zero chiamate HTTP aggiuntive
- **Ricerca multicolonna** — cerca in nome, cognome, telefono ed email contemporaneamente

---

#### `public/js/bici.js` — Logica Bici *(v1.2.0)*

```
Metodi: getByCliente, findById, salva, elimina
```

**Concetti chiave:**

- **`getByCliente(clienteId)`** — chiama `DB.getAll('bici?clienteId=...')`, il server filtra lato DB
- **`salva(data)`** — gestisce sia creazione che aggiornamento, normalizza tutti i campi con `.trim()`
- **Nuovi campi v1.3.0** — `tipo` (menu a tendina), `seriale_forcella`, `seriale_ammortizzatore`, ordine **marca → modello**

---

#### `public/js/ordini.js` — Logica Ordini

```
Metodi: getAll, findById, getByCliente, getAperti,
        getChiusiOggi, salva, avanza, riapri, elimina, calcolaIncasso

Costante esposta: STATI → ['accettata', 'in_lavorazione', 'pronto', 'consegnata']
```

**Concetti chiave:**

- **`getAperti()`** — restituisce tutto ciò che non è `consegnata` (in officina)
- **`getChiusiOggi()`** — filtra gli ordini con stato `consegnata` e `dataUscita` = oggi
- **`avanza(id)`** — sposta l'ordine al prossimo stato nella sequenza; imposta `dataUscita` automaticamente se diventa `consegnata`
- **`riapri(id)`** — torna a `in_lavorazione`, azzera `dataUscita`
- **`calcolaIncasso(ordini)`** — `Array.reduce()` per sommare i totali
- **Snapshot delle voci** — il prezzo viene copiato al momento del salvataggio; modifiche future al catalogo non alterano gli ordini passati

---

#### `public/js/ui.js` — Rendering Interfaccia

**Tecnologie:** JavaScript ES2020, DOM API, async/await, Template Literals

```
Funzioni principali:
- renderDashboard()          → 4 stat card + lista bici in officina
- renderClienti()            → lista clienti con ricerca
- renderOrdini()             → lista ordini con filtro select + ricerca
- renderCatalogo()           → lista lavorazioni
- apriModalCliente()         → form cliente
- apriModalOrdine()          → form ordine con select bici dinamico
- apriModalLavorazione()     → form lavorazione
- apriModalStorico()         → storico con stats e ricerca live
- filtraStorico()            → filtra cache locale, no fetch
- apriModalBiciCliente()     → lista bici del cliente
- renderBiciList()           → renderizza bici con tipo badge e seriali
- apriModalAggiungiBici()    → form bici (crea o modifica)
- aggiornaBiciSelect()       → popola select bici nel form ordine
- aggiungiRigaVoce()         → riga dinamica tabella lavorazioni
- raccogliVoci()             → legge righe → array
- badgeStato(stato)          → HTML badge colorato per lo stato
- btnAvanza(ordine)          → HTML pulsante avanzamento stato
- tagTipo(tipo)              → HTML badge tipo bici colorato
```

**Concetti chiave:**

- **`STATO_CFG`** — dizionario che mappa ogni stato a classe CSS e label. Un solo posto da modificare per cambiare colori o etichette
- **`TIPO_CFG`** — stesso pattern per i tipi bici
- **`openModal(id)`** — se c'è già un modal aperto, il nuovo riceve uno z-index più alto. Risolve il problema dei modal sovrapposti (storico → ordine)
- **`Promise.all([])`** — carica dati in parallelo per velocizzare l'apertura dei modal
- **Cache `_storicoOrdini`** — la ricerca live filtra questa cache senza fetch aggiuntivi
- **`dataset.clienteId` su `modal-storico`** — permette al submit ordine di sapere se riaprire lo storico dopo il salvataggio

---

#### `public/js/app.js` — Bootstrap e Coordinamento

**Tecnologie:** JavaScript ES2020, DOM API, async/await, Event Delegation

```
Gestisce esclusivamente:
1. Navigazione tra le 4 view
2. Event delegation per tutti i click delle card
3. Submit dei 4 form (cliente, ordine, lavorazione, bici)
4. Listener change su select cliente → aggiorna select bici
5. Toast errori (rosso) e toast conferma (verde)
6. Filtro ordini persistente in sessionStorage
7. Validazione client-side (nome/telefono obbligatori, almeno 1 lavorazione per ordine)
```

**Concetti chiave:**

- **Event Delegation** — un solo listener su `document` gestisce: `edit-cliente`, `del-cliente`, `storico-cliente`, `bici-cliente`, `edit-bici`, `del-bici`, `edit-ordine`, `del-ordine`, `avanza-ordine`, `riapri-ordine`, `edit-lavorazione`, `del-lavorazione`
- **`avanza-ordine`** — chiama `OrdiniService.avanza(id)` che calcola autonomamente il prossimo stato
- **Riapertura storico** — dopo il submit ordine, controlla se `modal-storico` era aperto (via `dataset.clienteId`) e lo riapre invece di fare `refreshView()`
- **Filtro ordini persistente** — il filtro selezionato viene salvato in `sessionStorage` e ripristinato al prossimo avvio dell'app
- **Conferma eliminazione cliente** — mostra il numero di ordini e bici associate prima di procedere
- **`currentView`** — traccia la view attiva per `refreshView()` dopo ogni operazione

---

## 9. Come comunicano tra loro

### Schema visivo completo

```
┌──────────────────────────────────────────────────────┐
│  FRONTEND (browser)                                  │
│                                                      │
│  app.js ──────► ui.js ◄─────────────────────┐       │
│    │             │                           │       │
│    │    render   │  apriModal                │       │
│    │             ▼                           │       │
│    │         DOM / HTML                      │       │
│    │                                         │       │
│    ├──► clienti.js ──┐                       │       │
│    ├──► bici.js ─────┼──► db.js (fetch) ─────┘       │
│    ├──► ordini.js ───┤      │                        │
│    └──► lavoraz..js ─┘      │ HTTP JSON              │
└─────────────────────────────┼────────────────────────┘
                              │
┌─────────────────────────────┼────────────────────────┐
│  BACKEND (Node.js)          ▼                        │
│                                                      │
│  index.js ──► routes/clienti.js ──┐                  │
│           ──► routes/bici.js ─────┼──► db.js         │
│           ──► routes/ordini.js ───┤      │           │
│           ──► routes/lavoraz..js ─┘      │ SQL       │
└──────────────────────────────────────────┼───────────┘
                                           │
                                  data/officina.db
```

### Esempio — Avanzamento stato ordine

```
1. Utente clicca "✅ Pronto" su una card ordine in lavorazione
         │
         ▼
2. app.js → event delegation → action: 'avanza-ordine'
            chiama OrdiniService.avanza(id)
         │
         ▼
3. ordini.js → findById(id) → stato attuale: 'in_lavorazione'
               STATI.indexOf('in_lavorazione') = 1
               nuovoStato = STATI[2] = 'pronto'
               DB.update('ordini', id, { stato: 'pronto', dataUscita: null })
         │
         ▼
4. db.js → fetch PUT /api/ordini/xxx { stato: 'pronto' }
         │
         ▼
5. routes/ordini.js → valida stato, UPDATE su SQLite
                      risponde con ordine aggiornato
         │
         ▼
6. app.js → refreshView(currentView)
         │
         ▼
7. ui.js → card aggiornata con badge verde "✅ Pronto al ritiro"
           pulsante diventa "📦 Consegna" ✅
```

### Esempio — Aggiunta bici con seriale

```
1. Utente apre "🚲 Bici" → clicca "+ Aggiungi Bici"
         │
         ▼
2. app.js → btn-aggiungi-bici → UI.apriModalAggiungiBici(clienteId)
         │
         ▼
3. ui.js → resetta form, preimposta clienteId
           apre modal-aggiungi-bici (z-index > modal bici cliente)
         │
         ▼
4. Utente compila:
   Marca: "Fox" | Modello: "34 Float" | Tipo: E-MTB
   Seriale forcella: "FOX-2024-XXXXX"
   Seriale ammortizzatore: "FOX-2024-YYYYY"
         │
         ▼
5. app.js → submit #form-aggiungi-bici
            BiciService.salva({ clienteId, marca, modello, tipo,
                                seriale_forcella, seriale_ammortizzatore })
         │
         ▼
6. bici.js → DB.create('bici', record)
           → fetch POST /api/bici
         │
         ▼
7. routes/bici.js → INSERT INTO bici con tutti i campi
         │
         ▼
8. app.js → closeAllModals()
            UI.apriModalBiciCliente(clienteId)
         │
         ▼
9. Lista bici aggiornata con badge "⚡🏔️ E-MTB" e seriali visibili ✅
```

### Esempio — Apertura Storico e modifica ordine

```
1. Utente clicca "📋 Storico" → apre modal storico
         │
         ▼
2. Utente clicca "✏" su un ordine → apre modal ordine
   (z-index automaticamente più alto del modal storico)
         │
         ▼
3. Utente modifica e salva
         │
         ▼
4. app.js → submit ordine
            storicoModal.dataset.clienteId → esiste!
            closeAllModals()
            UI.apriModalStorico(clienteId)  ← riapre lo storico aggiornato
         │
         ▼
5. Storico aggiornato visibile, nessuna perdita di contesto ✅
```

---

## 10. API REST — Riferimento

Base URL: `http://localhost:3000/api`

Tutte le API accettano e restituiscono **JSON**.

### Clienti

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/clienti` | Lista tutti i clienti (ordinati per cognome, poi nome) |
| `GET` | `/api/clienti/:id` | Dettaglio singolo cliente |
| `POST` | `/api/clienti` | Crea nuovo cliente |
| `PUT` | `/api/clienti/:id` | Aggiorna cliente esistente |
| `DELETE` | `/api/clienti/:id` | Elimina cliente, bici e tutti i suoi ordini |

**Corpo POST/PUT:**
```json
{
  "nome":     "Mario",
  "cognome":  "Rossi",
  "telefono": "+39 333 1234567",
  "email":    "mario@example.com",
  "note":     "Cliente abituale"
}
```

---

### Bici

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/bici?clienteId=xxx` | Lista bici di un cliente |
| `GET` | `/api/bici/:id` | Dettaglio singola bici |
| `POST` | `/api/bici` | Crea nuova bici |
| `PUT` | `/api/bici/:id` | Aggiorna bici |
| `DELETE` | `/api/bici/:id` | Elimina bici (imposta biciId=NULL negli ordini) |

**Corpo POST/PUT:**
```json
{
  "clienteId":              "abc123",
  "marca":                  "Trek",
  "modello":                "Fuel EX 9.8",
  "tipo":                   "emtb",
  "colore":                 "Matte Black",
  "seriale_forcella":       "FOX-2024-12345",
  "seriale_ammortizzatore": "FOX-2024-67890",
  "note":                   "Taglia L, pedivella 175mm"
}
```

**Valori validi per `tipo`:** `strada` · `mtb` · `emtb` · `ebike`

---

### Ordini

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/ordini` | Lista tutti gli ordini (dal più recente) |
| `GET` | `/api/ordini/:id` | Dettaglio singolo ordine |
| `POST` | `/api/ordini` | Crea nuovo ordine |
| `PUT` | `/api/ordini/:id` | Aggiorna / avanza stato / riapri |
| `DELETE` | `/api/ordini/:id` | Elimina ordine |

**Corpo POST/PUT:**
```json
{
  "clienteId":    "abc123",
  "biciId":       "bici456",
  "stato":        "accettata",
  "dataIngresso": "2026-05-15T09:00:00.000Z",
  "dataUscita":   null,
  "note":         "Cambio che salta",
  "voci": [
    {
      "lavorazioneId": "lav_004",
      "nome":          "Regolazione cambio",
      "note":          "Catena consumata",
      "prezzo":        12.00
    }
  ],
  "totale": 12.00,
  "acconto": 5.00,
  "foto": ["data:image/jpeg;base64,..."]
}
```

---

### Backup

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/backup` | Download file .db (SQLite completo) |
| `GET` | `/api/backup/json` | Export tutti i dati in formato JSON |
| `POST` | `/api/import/json` | Importa dati da file JSON (sovrascrive tutto) |

**Corpo POST /api/import/json:**
```json
{
  "clienti": [...],
  "bici": [...],
  "lavorazioni": [...],
  "ordini": [...]
}
```

**Risposta:**
```json
{
  "ok": true,
  "importati": { "clienti": 5, "bici": 3, "lavorazioni": 13, "ordini": 8 }
}
```
```

**Valori validi per `stato`:** `accettata` · `in_lavorazione` · `pronto` · `consegnata`

**Avanzare stato (PUT):**
```json
{ "stato": "in_lavorazione" }
```

**Consegnare (PUT) — imposta dataUscita automaticamente:**
```json
{ "stato": "consegnata" }
```

---

### Lavorazioni

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/lavorazioni` | Lista catalogo (ordinato per nome) |
| `GET` | `/api/lavorazioni/:id` | Dettaglio singola lavorazione |
| `POST` | `/api/lavorazioni` | Aggiunge lavorazione al catalogo |
| `PUT` | `/api/lavorazioni/:id` | Modifica lavorazione |
| `DELETE` | `/api/lavorazioni/:id` | Rimuove dal catalogo |

**Corpo POST/PUT:**
```json
{
  "nome":        "Sostituzione raggi",
  "prezzo":      20.00,
  "descrizione": "Per ruota anteriore o posteriore"
}
```

---

## 11. Database

File: `data/officina.db`

### Schema tabelle

```sql
CREATE TABLE IF NOT EXISTS clienti (
  id        TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  cognome   TEXT DEFAULT '',
  telefono  TEXT DEFAULT '',
  email     TEXT DEFAULT '',
  note      TEXT DEFAULT '',
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lavorazioni (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  prezzo      REAL DEFAULT 0,
  descrizione TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS bici (
  id                     TEXT PRIMARY KEY,
  clienteId              TEXT NOT NULL,
  marca                  TEXT DEFAULT '',
  modello                TEXT NOT NULL,
  tipo                   TEXT DEFAULT 'strada',  -- strada|mtb|emtb|ebike
  colore                 TEXT DEFAULT '',
  seriale_forcella       TEXT DEFAULT '',
  seriale_ammortizzatore TEXT DEFAULT '',
  note                   TEXT DEFAULT '',
  createdAt              TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clienteId) REFERENCES clienti(id)
);

CREATE TABLE IF NOT EXISTS ordini (
  id           TEXT PRIMARY KEY,
  clienteId    TEXT NOT NULL,
  biciId       TEXT DEFAULT NULL,
  stato        TEXT DEFAULT 'accettata',  -- accettata|in_lavorazione|pronto|consegnata
  dataIngresso TEXT,
  dataUscita   TEXT,                      -- valorizzata solo quando stato='consegnata'
  note         TEXT DEFAULT '',
  voci         TEXT DEFAULT '[]',         -- array JSON serializzato
  totale       REAL DEFAULT 0,
  pagato       INTEGER DEFAULT 0,          -- 0 = non pagato, 1 = pagato
  acconto      REAL DEFAULT 0,            -- caparra/acconto versato
  foto         TEXT DEFAULT '[]',         -- array JSON di immagini base64
  FOREIGN KEY (clienteId) REFERENCES clienti(id)
);
```

### Lavorazioni predefinite inserite al primo avvio

| ID | Nome | Prezzo |
|---|---|---|
| lav_001 | Tagliando completo | € 35,00 |
| lav_002 | Riparazione foratura | € 10,00 |
| lav_003 | Regolazione freni | € 12,00 |
| lav_004 | Regolazione cambio | € 12,00 |
| lav_005 | Sostituzione cavo freno | € 8,00 |
| lav_006 | Sostituzione cavo cambio | € 8,00 |
| lav_007 | Centratura ruota | € 15,00 |
| lav_008 | Sostituzione pattini freno | € 6,00 |
| lav_009 | Pulizia e sgrassaggio | € 20,00 |
| lav_010 | Sostituzione catena | € 18,00 |
| lav_011 | Sostituzione copertone | € 14,00 |
| lav_012 | Revisione movimento centrale | € 22,00 |
| lav_013 | Altra lavorazione | € 0,00 |

### Caratteristiche del database

| Proprietà | Valore |
|---|---|
| **Tipo** | SQLite (file singolo) |
| **Posizione** | `data/officina.db` |
| **Limite pratico** | Illimitato per uso officina |
| **Accesso** | Solo tramite il server Node.js |
| **Backup** | Basta copiare il file `.db` |

---

## 12. Backup e ripristino

### Backup dall'interfaccia *(v1.7.0)*

Dalla **Dashboard**, tre pulsanti:
- **💾 Backup Database (.db)** — scarica il file SQLite completo, pronto per il ripristino
- **📄 Export JSON** — scarica tutti i dati (clienti, bici, ordini, lavorazioni) in formato JSON leggibile
- **📥 Importa JSON** — ripristina i dati da un file JSON esportato precedentemente

> ⚠️ L'importazione **sovrascrive tutti i dati attuali**. Viene chiesta conferma prima di procedere.

> 💡 Il backup .db è la soluzione più completa. L'export JSON è utile per importazioni in altri sistemi o per ripristino rapido dall'interfaccia.

### Backup manuale (terminale)

```bash
# Windows
copy C:\ciclodesk\data\officina.db C:\Users\TuoNome\Documents\backup-officina.db

# Mac/Linux
cp ~/ciclodesk/data/officina.db ~/Documents/backup-officina.db
```

### Backup automatico Windows (ogni giorno)

Crea il file `backup.bat`:
```batch
@echo off
set DATA=%date:~6,4%-%date:~3,2%-%date:~0,2%
copy "C:\ciclodesk\data\officina.db" "C:\Users\TuoNome\Documents\backup-officina-%DATA%.db"
echo Backup completato: backup-officina-%DATA%.db
```

Poi pianificalo con **Utilità di pianificazione** di Windows.

### Ripristino

1. Ferma il server (`Ctrl + C`)
2. Sostituisci `data/officina.db` con il file di backup
3. Riavvia con `npm start`

---

## 13. Procedura di aggiornamento senza perdita dati

> Seguire questa procedura ogni volta che viene distribuita una nuova versione di CicloDesk su un'installazione già in uso.

### Perché è sicuro aggiornare

CicloDesk usa **migrazioni automatiche** all'avvio: `server/db.js` controlla con `PRAGMA table_info()` se le colonne nuove esistono già e, se mancano, le aggiunge con `ALTER TABLE`. I dati esistenti non vengono mai cancellati o modificati.

### Passaggi

**Passo 1 — Fai un backup preventivo** *(sempre, prima di qualsiasi aggiornamento)*

```bash
# Windows
copy C:\ciclodesk\data\officina.db C:\Users\TuoNome\Documents\backup-pre-aggiornamento.db

# Mac/Linux
cp ~/ciclodesk/data/officina.db ~/Documents/backup-pre-aggiornamento.db
```

**Passo 2 — Ferma il server**

Nella finestra del terminale premi **`Ctrl + C`**.

**Passo 3 — Copia i nuovi file**

Sostituisci tutti i file del progetto **tranne la cartella `data/`**:

```
✅ Sostituire:   server/   public/   package.json   start.bat   start.sh
❌ NON toccare:  data/officina.db
```

**Passo 4 — Installa eventuali nuove dipendenze**

```bash
npm install
```

> Se `package.json` non è cambiato, questo comando è veloce e non cambia nulla.

**Passo 5 — Riavvia il server**

```bash
npm start
```

Al riavvio, le migrazioni vengono eseguite automaticamente. In console non appare nulla se tutto è già aggiornato. La prima volta che viene aggiunta una colonna nuova si può abilitare un log opzionale nel codice.

**Passo 6 — Verifica**

Apri il browser, controlla che i dati esistenti siano intatti e che le nuove funzionalità siano disponibili.

### Colonne aggiunte per versione

| Versione | Tabella | Colonna | Tipo | Default |
|---|---|---|---|---|
| **1.4.0** | `clienti` | `cognome` | TEXT | `''` |
| **1.4.0** | `ordini` | `pagato` | INTEGER | `0` |
| **1.7.0** | `ordini` | `acconto` | REAL | `0` |
| **1.7.0** | `ordini` | `foto` | TEXT | `'[]'` |

---

## 14. Risoluzione problemi

| Errore | Causa | Soluzione |
|---|---|---|
| `node non riconosciuto` | Node.js non installato | Reinstalla da nodejs.org e riavvia il PC |
| `EADDRINUSE porta 3000` | Porta già in uso | Vedi comandi sotto |
| Telefono non si connette | Rete diversa o firewall | Stessa Wi-Fi + apri porta 3000 nel firewall Windows |
| `Cannot find module` | Dipendenze mancanti | Esegui `npm install` |
| `npm error code 1` con better-sqlite3 | Node.js versione non supportata | Installa Node.js **v22 LTS** |
| "l'esecuzione di script è disabilitata" | PowerShell blocca gli script | Usa il **Prompt dei comandi (cmd)** |
| Select bici vuoto nel form ordine | Nessuna bici registrata | Aggiungi bici dalla scheda cliente (🚲 Bici) |
| Badge tipo bici non appare | Campo `tipo` vuoto nel DB | Modifica la bici e seleziona il tipo |
| Pagina bianca | Errore JavaScript | `F12 → Console` → controlla errori rossi |

### Liberare la porta 3000

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <numero_pid> /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

### Cambiare la porta del server

In `server/index.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

---

## 15. Aggiornamenti futuri consigliati

| Funzionalità | Priorità | Descrizione |
|---|---|---|
| **Login con password** | 🔴 Alta | Proteggere i dati da accessi non autorizzati |
| **Stampa / PDF ordine** | 🔴 Alta | ✅ Implementato in v1.6.0 — pulsante 🖨️ su ogni ordine |
| **Backup automatico su cloud** | 🟡 Media | Copia automatica su Google Drive o Dropbox |
| **Notifiche pronto-ritiro** | 🟡 Media | Pulsante “Notifica WhatsApp” (gratuito, link `wa.me`) o SMS/email via API Twilio/nodemailer |
| **Statistiche mensili** | 🟢 Bassa | Grafici incassi e lavorazioni più frequenti |
| **Numero telaio bici** | 🟢 Bassa | Campo seriale telaio aggiuntivo nella scheda bici |
| **Gestione magazzino ricambi** | 🟢 Bassa | Scorte camere d'aria, catene, pastiglie |
| **Deploy cloud** | 🟢 Bassa | Accesso da fuori rete (Railway, Render) |

---

## 16. Note di versione

| Versione | Data | Modifiche |
|---|---|---|
| **1.8.0** | 2026-05-22 | **Sicurezza:** protezione XSS completa (escape HTML su tutti i dati utente renderizzati con innerHTML); backup .db sicuro in WAL mode (usa `db.backup()` su file temporaneo); validazione foto (solo `data:image/`); `newId()` con `crypto.randomBytes` (64 bit di entropia); validazione acconto server-side ricalcola totale dalle voci. **Bug fix:** `_ordineFoto.map is not a function` (normalizzazione stringa/array); query LIKE su JSON sostituita con `json_each()`; PUT clienti restituisce dati reali dal DB; `raccogliVoci()` segnala errore se righe senza lavorazione selezionata; rimosso dead code (listener change su hidden input). **UX:** tasto Escape chiude i modali; loading spinner durante caricamento dati; conferma chiusura modale se il form ha modifiche non salvate; `aria-label` su tutti i pulsanti emoji (accessibilità); navigazione mobile con scroll orizzontale. **Modifica stato ordine:** select colorato con icone nel modal modifica (nascosto in creazione); colore sfondo/bordo cambia dinamicamente in base allo stato selezionato. **Codice:** alert() rimpiazzati con toast showError() |
| **1.7.0** | 2026-05-22 | **Ricerca globale:** barra nell'header con ricerca live tra clienti, ordini e lavorazioni; risultati cliccabili. **Notifiche dashboard:** alert automatico per ordini fermi da più di 48h con link diretto. **Foto ordine:** upload immagini (max 2MB) con preview e rimozione; salvate come base64 nel DB. **Gestione acconti/caparre:** campo dedicato nel modal ordine, calcolo resto in tempo reale, info visibile nelle card. **Backup da interfaccia:** pulsanti in dashboard per download .db e export JSON. **Conferma cambio cliente:** in modifica ordine, richiesta conferma se si cambia il cliente associato. **Fix:** prezzo lavorazioni non sovrascrive il prezzo salvato nell'ordine; cognome obbligatorio; bici visibile subito dopo selezione cliente in nuovo ordine; nome bici via JOIN SQL (sempre aggiornato). **API:** `GET /api/backup` e `GET /api/backup/json`. **DB:** nuove colonne `acconto` e `foto` su ordini (migrazione automatica) |
| **1.6.0** | 2026-05-22 | **Aggiornamenti tecnici:** Node.js v22 LTS come versione consigliata (v20 EOL); `better-sqlite3` aggiornato a v12.10.0 (supporto nativo Node.js v22, binari precompilati). **Stampa ordine:** pulsante 🖨️ su ogni card ordine — apre finestra di stampa con ricevuta formattata (cliente, bici, lavorazioni, totale, pagamento); compatibile con "Salva come PDF" del browser. **Fix:** doppia bici nel dropdown modifica ordine (race condition tra due chiamate concorrenti ad `aggiornaBiciSelect`). **UX:** clienti ordinati per cognome → nome (stile rubrica) |
| **1.5.0** | 2026-05-22 | **Qualità e UX:** toast verde di conferma dopo ogni salvataggio/eliminazione; ordinamento ordini per urgenza (aperti prima, poi per data); filtro ordini persistente tra sessioni (`sessionStorage`); conferma eliminazione cliente con conteggio ordini e bici; eliminazione lavorazione bloccata se usata in ordini attivi. **Dropdown custom** uniformi per clienti e lavorazioni (stesso stile su tutti i browser; ri-apertura dropdown su voce già selezionata). **Validazioni:** almeno una lavorazione obbligatoria per ordine; prezzo negativo rifiutato lato server. **Codice:** `server/utils.js` con `newId()` centralizzata; campo `bici` rimosso da clienti (era inutilizzato); data iscrizione cliente visibile nella scheda |
| **1.4.0** | 2026-05-22 | **Scheda clienti:** aggiunto campo `cognome` (form, card, storico, modal bici). **Ordini:** aggiunto flag `pagato`. **Migrazioni automatiche** al riavvio per entrambe le colonne (`ALTER TABLE` solo se mancanti — dati esistenti intatti). Aggiunta sezione "Procedura di aggiornamento senza perdita dati" |
| **1.3.0** | 2026-05-15 | **Scheda bici** arricchita: tipo bici con menu a tendina (Strada/MTB/E-MTB/E-Bike), ordine campi invertito marca→modello, seriale forcella e seriale ammortizzatore. **4 stati ordine** con avanzamento sequenziale: accettata → in_lavorazione → pronto → consegnata; `dataUscita` impostata automaticamente alla consegna. **Dashboard** senza incasso: 4 card (clienti, in officina, pronte al ritiro, consegnate oggi). Filtro ordini come menu a tendina. `db.js` ripulito (fase sviluppo, no migrazioni) |
| **1.2.0** | 2026-05-15 | Gestione multi-bici per cliente: architettura semplificata con `clienteId` diretto sulla bici (rimossa tabella pivot). Select bici dinamico nel form ordine. Bici visibile in card ordini e storico. Fix z-index modali sovrapposti. Fix riapertura storico dopo salvataggio ordine |
| **1.1.0** | 2026-05-14 | Storico interventi per cliente: modal con 5 statistiche, lista completa, ricerca live, modifica rapida. Header con logo Cerica Bikelab |
| **1.0.0** | 2026-05-14 | Prima versione: clienti, ordini, catalogo lavorazioni, SQLite, accesso LAN, ricerca e filtri |

---

*🚲 CicloDesk v1.8.0 — Gestionale per ciclo officina Cerica Bikelab*
