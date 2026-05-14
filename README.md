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

> ℹ️ Internet serve solo per la prima installazione di Node.js e delle dipendenze npm.
> Il gestionale funziona completamente **offline** in rete locale.

---

## 2. Struttura del progetto

```
ciclodesk/
├── package.json              # Dipendenze e script npm
├── start.bat                 # Avvio rapido Windows (doppio clic)
├── start.sh                  # Avvio rapido Mac/Linux
├── CICLODESK_COMPLETO.md     # Questo file
│
├── data/                     # Creata automaticamente all'avvio
│   └── officina.db           # Database SQLite (tutti i dati)
│
├── server/
│   ├── index.js              # Entry point — server Express
│   ├── db.js                 # Connessione SQLite, schema, seed dati
│   └── routes/
│       ├── clienti.js        # GET/POST/PUT/DELETE /api/clienti
│       ├── ordini.js         # GET/POST/PUT/DELETE /api/ordini
│       └── lavorazioni.js    # GET/POST/PUT/DELETE /api/lavorazioni
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
        └── /api/lavorazioni → server/routes/lavorazioni.js
                                        │
                                        ▼
                               server/db.js  (better-sqlite3)
                                        │
                                        ▼
                               data/officina.db
```

---

## 3. Installazione passo per passo

### Passo 1 — Installa Node.js

1. Vai su **https://nodejs.org** e scarica la versione **LTS**
2. Esegui il file e segui l'installazione con le opzioni predefinite
3. **Riavvia il PC**

Verifica nel terminale:
```bash
node --version   # v20.x.x o superiore
npm --version    # 10.x.x o superiore
```

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

```bash
# Windows
cd C:\ciclodesk
npm install

# Mac/Linux
cd /home/tuonome/ciclodesk
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
- Contatori in tempo reale: clienti registrati, bici in officina, uscite oggi, incasso oggi
- Incasso mascherabile con bottone 👁 (preferenza salvata in localStorage)
- Lista bici attualmente in officina con accesso rapido a modifica e chiusura ordine

### Schede Clienti
- Anagrafica completa: nome, telefono, email, modello bici, note libere
- Ricerca live su tutti i campi (nome, telefono, email, bici)
- Totale speso e numero interventi attivi mostrati in ogni card
- Accesso rapido a **Storico interventi**, **Nuovo ordine**, modifica ed eliminazione

### 📋 Storico Interventi per Cliente
- Aperto dal bottone **"📋 Storico"** nella scheda cliente
- **5 statistiche riepilogative:**
  - Interventi totali
  - Interventi completati
  - Totale speso (solo ordini chiusi)
  - Spesa media per intervento
  - Data ultimo ingresso
- Lista completa di tutti gli ordini del cliente, dal più recente al più vecchio
- Ogni ordine mostra: date ingresso/uscita, stato, lavorazioni, note, totale
- **Ricerca live** tra gli interventi (per lavorazione, note, data)
- Modifica rapida di ogni ordine direttamente dallo storico

### Ordini di Lavoro
- Creazione ordine con selezione cliente e lavorazioni dal catalogo
- Prezzo auto-compilato dal catalogo, modificabile per ogni singola voce
- Note per voce di lavorazione
- Filtro per stato: tutti / in officina / completati
- Ricerca full-text su cliente, bici, lavorazioni, note
- Chiusura e riapertura ordini con un click

### Catalogo Lavorazioni
- Gestione del listino prezzi dell'officina
- 13 lavorazioni predefinite inserite al primo avvio
- Aggiunta, modifica ed eliminazione voci del catalogo
- Il prezzo viene proposto automaticamente negli ordini ma è sempre modificabile

---

## 8. Descrizione dettagliata dei moduli

### Mappa generale

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER                              │
│  index.html → carica CSS + 6 file JS in sequenza        │
│                                                         │
│  db.js → lavorazioni.js → clienti.js                   │
│       → ordini.js → ui.js → app.js                     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP fetch() JSON
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                     │
│  index.js → routes/clienti.js                          │
│           → routes/ordini.js                           │
│           → routes/lavorazioni.js                      │
│                     │                                   │
│                  db.js (SQLite)                         │
└────────────────────┬────────────────────────────────────┘
                     │ lettura/scrittura file
                     ▼
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
4. Registra le 3 route API
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
4. Crea le 3 tabelle se non esistono già
5. Inserisce 13 lavorazioni predefinite al primo avvio
6. Esporta la connessione al database
```

**Concetti chiave:**

- **`better-sqlite3`** — libreria SQLite **sincrona** per Node.js, più semplice e veloce per query semplici rispetto alle alternative asincrone
- **`journal_mode = WAL`** — Write-Ahead Logging: permette letture e scritture simultanee senza blocchi, fondamentale quando telefono e PC accedono insieme
- **`foreign_keys = ON`** — SQLite di default disabilita i vincoli di integrità referenziale, questa riga li forza
- **`CREATE TABLE IF NOT EXISTS`** — crea la tabella solo se non esiste, così lo script può girare più volte senza errori
- **`db.transaction()`** — raggruppa i 13 INSERT in una transazione atomica (~50x più veloce di INSERT singoli)
- **`module.exports = db`** — esporta la connessione aperta, così tutti i `routes/*.js` usano **la stessa connessione**

---

#### `server/routes/clienti.js` — API Clienti

**Tecnologie:** Express Router, better-sqlite3

```
Espone 5 endpoint HTTP:

GET    /api/clienti       → restituisce tutti i clienti (ordinati per nome)
GET    /api/clienti/:id   → restituisce un singolo cliente
POST   /api/clienti       → crea un nuovo cliente
PUT    /api/clienti/:id   → aggiorna un cliente esistente
DELETE /api/clienti/:id   → elimina cliente e tutti i suoi ordini
```

**Concetti chiave:**

- **`express.Router()`** — crea un mini-router isolato. In `index.js` viene montato su `/api/clienti`, qui si scrivono solo le parti finali (`/`, `/:id`)
- **`req.params.id`** — legge il parametro dinamico dall'URL (es. `/api/clienti/abc123` → `id = "abc123"`)
- **`req.body`** — contiene i dati JSON inviati dal client nel body della richiesta
- **`res.status(404).json()`** — risponde con codice HTTP 404 e messaggio di errore JSON
- **`res.status(201)`** — HTTP 201 = "Created", risposta corretta per una POST che crea una risorsa
- **DELETE a cascata** — prima elimina tutti gli ordini del cliente, poi il cliente stesso. Necessario con foreign keys attive

---

#### `server/routes/ordini.js` — API Ordini

**Tecnologie:** Express Router, better-sqlite3, `JSON.stringify/parse`

```
Espone 5 endpoint HTTP per gestire gli ordini.
Peculiarità: le voci di lavorazione sono un array
salvato come stringa JSON nella colonna "voci".
```

**Concetti chiave:**

- **Voci come JSON serializzato** — SQLite non ha un tipo "array". Le voci vengono salvate con `JSON.stringify([...])` e rilette con `JSON.parse(...)`. Alternativa sarebbe una tabella separata `voci_ordine`, ma per questa scala la serializzazione è sufficiente
- **Funzione `parse(row)`** — ogni volta che si legge un ordine dal DB, converte automaticamente la stringa JSON delle voci in array JavaScript
- **PUT per chiusura/riapertura** — non esistono endpoint separati `/chiudi` e `/riapri`. Si usa la PUT passando `stato: "chiuso"` o `stato: "aperto"` insieme a `dataUscita`

---

#### `server/routes/lavorazioni.js` — API Catalogo

**Tecnologie:** Express Router, better-sqlite3

```
CRUD completo per il catalogo delle lavorazioni.
È il modulo più semplice: dati piatti, nessuna relazione complessa.
```

> **Nota:** non ha cascade delete perché le lavorazioni negli ordini sono **snapshot** (copia dei dati al momento della creazione dell'ordine). Eliminare una lavorazione dal catalogo non rompe gli ordini già creati.

---

### 🌐 FRONTEND

---

#### `public/js/db.js` — Il client HTTP

**Tecnologie:** Fetch API (browser nativa), async/await, JSON

```
È l'unico file del frontend che "parla" con il server.
Tutti gli altri moduli chiamano questo, mai fetch() direttamente.
Espone: getAll, findById, create, update, upsert, remove
```

**Concetti chiave:**

- **`fetch()`** — API nativa dei browser moderni per richieste HTTP, restituisce una Promise
- **`async/await`** — sintassi moderna per operazioni asincrone, evita il "callback hell"
- **`_req()` privata** — centralizza tutta la logica: headers, gestione errori HTTP, parse JSON. Le funzioni pubbliche sono una riga ciascuna
- **`throw new Error()`** — se il server risponde con errore (4xx, 5xx), lancia un errore JavaScript catturato con `try/catch` nei moduli superiori
- **`BASE = '/api'`** — path relativo senza dominio: funziona sia su `localhost:3000` che su `192.168.1.X:3000` senza modifiche al codice

---

#### `public/js/lavorazioni.js` — Logica Catalogo

**Tecnologie:** JavaScript ES2020, async/await

```
Fornisce i metodi per lavorare con le lavorazioni.
Strato intermedio tra interfaccia (ui.js) e trasporto dati (db.js).
Metodi: getAll, findById, salva, elimina
```

**Concetti chiave:**

- **Service layer** — contiene la **logica di business**: trasforma e valida i dati prima di inviarli al server (`parseFloat`, `.trim()`). Se si cambia il backend, si modifica solo `db.js` e questo file, non `ui.js` o `app.js`

---

#### `public/js/clienti.js` — Logica Clienti

**Tecnologie:** JavaScript ES2020, async/await

```
Stessa struttura di lavorazioni.js, con in più
il metodo cerca() che filtra i clienti lato client.
Metodi: getAll, findById, cerca, salva, elimina
```

**Concetti chiave:**

- **`cerca()` lato client** — non fa nuove chiamate al server; scarica tutti i clienti una volta e filtra in memoria con `Array.filter()`. Per centinaia di clienti è istantanea e non genera traffico inutile
- **`Array.filter()` + `String.includes()`** — pattern classico per ricerca testuale multicolonna: converte tutto in minuscolo e cerca la query in nome, telefono, email e modello bici contemporaneamente

---

#### `public/js/ordini.js` — Logica Ordini

**Tecnologie:** JavaScript ES2020, async/await

```
Gestisce l'intero ciclo di vita di un ordine:
creazione → modifica voci → chiusura → riapertura → eliminazione.
Contiene anche filtri per stato e calcolo incasso.

Metodi: getAll, findById, getByCliente, getAperti,
        getChiusiOggi, salva, chiudi, riapri, elimina, calcolaIncasso
```

**Concetti chiave:**

- **`getAperti()` e `getChiusiOggi()`** — filtrano l'array già scaricato con `Array.filter()`, senza nuove chiamate HTTP
- **`getByCliente(clienteId)`** — filtra tutti gli ordini per un cliente specifico, usato dallo storico
- **`calcolaIncasso()`** — usa `Array.reduce()` per sommare i totali: pattern funzionale JavaScript per aggregare valori da un array
- **`chiudi()` e `riapri()`** — prima GET per ottenere l'ordine attuale, poi PUT con i campi aggiornati. Garantisce di non sovrascrivere dati cambiati da un altro dispositivo nel frattempo
- **Snapshot delle voci** — le voci contengono `nome` e `prezzo` copiati al momento del salvataggio. Se si modifica il prezzo di una lavorazione nel catalogo, gli ordini passati mostrano sempre il prezzo originale

---

#### `public/js/ui.js` — Rendering Interfaccia

**Tecnologie:** JavaScript ES2020, DOM API, async/await, Template Literals

```
Il modulo più grande. Trasforma i dati in HTML visibile
e gestisce apertura/chiusura dei modali con i form precompilati.

Funzioni principali:
- renderDashboard()       → statistiche e lista bici in officina
- renderClienti()         → lista schede clienti con ricerca
- renderOrdini()          → lista ordini con filtro stato + ricerca testo
- renderCatalogo()        → lista lavorazioni del catalogo
- apriModalCliente()      → apre e precompila il form cliente
- apriModalOrdine()       → apre ordine con select clienti e lavorazioni
- apriModalLavorazione()  → apre e precompila il form lavorazione
- apriModalStorico()      → apre storico interventi con stats e ricerca live
- filtraStorico()         → filtra la lista storico senza nuove chiamate API
- aggiungiRigaVoce()      → aggiunge riga dinamica alla tabella voci
- raccogliVoci()          → legge tutte le righe e le trasforma in array
- aggiornaIncasso()       → aggiorna il valore rispettando la visibilità
```

**Concetti chiave:**

- **Template Literals** (backtick) — HTML multiriga con variabili JavaScript inserite con `${espressione}`. Modo moderno per generare HTML dinamico senza librerie esterne
- **`innerHTML`** — aggiorna intere sezioni del DOM in un colpo solo con una stringa HTML
- **`Promise.all([])`** — esegue più chiamate async **in parallelo**. Es. `apriModalStorico()` carica cliente e ordini contemporaneamente
- **`Object.fromEntries()`** — trasforma l'array clienti in dizionario `{ id: cliente }` per lookup O(1) invece di `find()` ripetuto O(n²)
- **Cache `_storicoOrdini`** — gli ordini dello storico vengono caricati una volta sola e salvati in una variabile del modulo. La ricerca live filtra questa cache senza fare nuove chiamate al server
- **Event listener su righe dinamiche** — i listener di ogni riga voci (`change`, `input`, `click`) vengono aggiunti direttamente all'elemento TR appena creato
- **Modali con classe `hidden`** — i modali esistono sempre nel DOM; aprirli significa solo rimuovere la classe CSS `hidden`

---

#### `public/js/app.js` — Bootstrap e Coordinamento

**Tecnologie:** JavaScript ES2020, DOM API, async/await, Event Delegation

```
Il "direttore d'orchestra". Non contiene logica di business
né rendering. Si occupa esclusivamente di:

1. Aspettare che la pagina sia caricata (DOMContentLoaded)
2. Gestire la navigazione tra le 4 view
3. Collegare i bottoni alle funzioni giuste
4. Gestire i submit dei 3 form
5. Mostrare errori all'utente (toast rosso)
```

**Concetti chiave:**

- **`DOMContentLoaded`** — evento che scatta quando il browser ha finito di costruire il DOM
- **Event Delegation** — un solo listener su `document` gestisce tutti i click delle card dinamiche. Si usa `closest('[data-action]')` per risalire l'albero DOM e trovare il bottone. Gestisce anche `storico-cliente` per aprire il modal storico
- **`data-action` e `data-id`** — attributi HTML personalizzati usati come "messaggi" tra HTML e JavaScript. Il rendering li inserisce nell'HTML, l'event delegation li legge con `btn.dataset.action` e `btn.dataset.id`
- **Toast di errore** — `<div>` creato al volo, aggiunto al DOM, rimosso automaticamente dopo 4 secondi con `setTimeout`. Zero librerie esterne
- **`currentView`** — variabile che traccia la view attiva, usata da `refreshView()` per sapere quale lista aggiornare dopo ogni operazione

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
│    ├──► ordini.js ───┼──► db.js (fetch) ─────┘       │
│    └──► lavoraz..js ─┘      │                        │
│                             │ HTTP JSON               │
└─────────────────────────────┼────────────────────────┘
                              │
┌─────────────────────────────┼────────────────────────┐
│  BACKEND (Node.js)          ▼                        │
│                                                      │
│  index.js ──► routes/clienti.js ──┐                  │
│           ──► routes/ordini.js ───┼──► db.js         │
│           ──► routes/lavoraz..js ─┘      │           │
│                                          │ SQL        │
└──────────────────────────────────────────┼───────────┘
                                           │
                                  data/officina.db
```

### Esempio — Salvataggio di un ordine

```
1. Utente clicca "Salva Ordine"
         │
         ▼
2. app.js → intercetta il submit del form
            raccoglie i dati dal DOM
            chiama OrdiniService.salva(data, voci)
         │
         ▼
3. ordini.js → costruisce l'oggetto record
               calcola il totale con reduce()
               chiama DB.create('ordini', record)
         │
         ▼
4. db.js → fetch('POST', '/api/ordini', record)
           serializza in JSON e invia al server
         │
         ▼  [rete HTTP locale Wi-Fi]
         │
         ▼
5. routes/ordini.js → riceve req.body
                      esegue INSERT su SQLite
                      risponde con l'ordine creato (JSON)
         │
         ▼
6. db.js → riceve la risposta, fa JSON.parse()
           restituisce l'oggetto a ordini.js
         │
         ▼
7. app.js → chiude il modale, chiama refreshView()
         │
         ▼
8. ui.js → rigenera l'HTML della lista ordini
         │
         ▼
9. Utente vede il nuovo ordine nella lista ✅
```

### Esempio — Apertura Storico Cliente

```
1. Utente clicca "📋 Storico" su una card cliente
         │
         ▼
2. app.js → event delegation → action: 'storico-cliente'
            chiama UI.apriModalStorico(clienteId)
         │
         ▼
3. ui.js → Promise.all([
             ClientiService.findById(clienteId),
             OrdiniService.getByCliente(clienteId)
           ])
         │
         ▼
4. ordini.js → getAll() → filtra per clienteId in memoria
         │
         ▼
5. ui.js → ordina per data decrescente
           calcola 5 statistiche (totale, media, ecc.)
           popola header, stats, lista ordini
           apre modal-storico
         │
         ▼
6. Utente cerca "freni" nella casella di ricerca
         │
         ▼
7. app.js → listener su #search-storico
            chiama UI.filtraStorico("freni")
         │
         ▼
8. ui.js → filtra _storicoOrdini (cache, no fetch)
           re-renderizza solo la lista
         │
         ▼
9. Vengono mostrati solo gli interventi con "freni" ✅
```

---

## 10. API REST — Riferimento

Base URL: `http://localhost:3000/api`

Tutte le API accettano e restituiscono **JSON**.

### Clienti

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/clienti` | Lista tutti i clienti (ordinati per nome) |
| `GET` | `/api/clienti/:id` | Dettaglio singolo cliente |
| `POST` | `/api/clienti` | Crea nuovo cliente |
| `PUT` | `/api/clienti/:id` | Aggiorna cliente esistente |
| `DELETE` | `/api/clienti/:id` | Elimina cliente e tutti i suoi ordini |

**Corpo POST/PUT:**
```json
{
  "nome":     "Mario Rossi",
  "telefono": "+39 333 1234567",
  "email":    "mario@example.com",
  "bici":     "Trek FX3",
  "note":     "Cliente abituale"
}
```

---

### Ordini

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/ordini` | Lista tutti gli ordini (dal più recente) |
| `GET` | `/api/ordini/:id` | Dettaglio singolo ordine |
| `POST` | `/api/ordini` | Crea nuovo ordine |
| `PUT` | `/api/ordini/:id` | Aggiorna / chiudi / riapri ordine |
| `DELETE` | `/api/ordini/:id` | Elimina ordine |

**Corpo POST/PUT:**
```json
{
  "clienteId":    "abc123",
  "stato":        "aperto",
  "dataIngresso": "2026-05-14T09:00:00.000Z",
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
  "totale": 12.00
}
```

**Chiudere un ordine (PUT):**
```json
{ "stato": "chiuso", "dataUscita": "2026-05-14T17:30:00.000Z" }
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
CREATE TABLE clienti (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  telefono    TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  bici        TEXT DEFAULT '',
  note        TEXT DEFAULT '',
  createdAt   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE lavorazioni (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  prezzo      REAL DEFAULT 0,
  descrizione TEXT DEFAULT ''
);

CREATE TABLE ordini (
  id           TEXT PRIMARY KEY,
  clienteId    TEXT NOT NULL,
  stato        TEXT DEFAULT 'aperto',  -- 'aperto' | 'chiuso'
  dataIngresso TEXT,
  dataUscita   TEXT,
  note         TEXT DEFAULT '',
  voci         TEXT DEFAULT '[]',      -- array JSON serializzato
  totale       REAL DEFAULT 0,
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

> Tutte le lavorazioni sono modificabili, aggiungibili ed eliminabili dalla sezione **Catalogo Lavorazioni**.

### Caratteristiche del database

| Proprietà | Valore |
|---|---|
| **Tipo** | SQLite (file singolo) |
| **Posizione** | `data/officina.db` |
| **Limite pratico** | Illimitato per uso officina (SQLite gestisce GB di dati) |
| **Accesso** | Solo tramite il server Node.js |
| **Backup** | Basta copiare il file `.db` |

---

## 12. Backup e ripristino

### Backup manuale

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

## 13. Risoluzione problemi

| Errore | Causa | Soluzione |
|---|---|---|
| `node non riconosciuto` | Node.js non installato | Reinstalla da nodejs.org e riavvia il PC |
| `EADDRINUSE porta 3000` | Porta già in uso | Vedi comandi sotto |
| Telefono non si connette | Rete diversa o firewall | Stessa Wi-Fi + apri porta 3000 nel firewall Windows |
| `Cannot find module` | Dipendenze mancanti | Esegui `npm install` |
| Dati non salvati / errore 500 | Cartella `data/` non scrivibile | Verifica permessi sulla cartella |
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

## 14. Aggiornamenti futuri consigliati

| Funzionalità | Priorità | Descrizione |
|---|---|---|
| **Login con password** | 🔴 Alta | Proteggere i dati da accessi non autorizzati |
| **Stampa / PDF ordine** | 🔴 Alta | Ricevuta da consegnare al cliente |
| **Backup automatico su cloud** | 🟡 Media | Copia automatica su Google Drive o Dropbox |
| **Notifiche pronto-ritiro** | 🟡 Media | SMS o WhatsApp tramite API Twilio |
| **Statistiche mensili** | 🟢 Bassa | Grafici incassi e lavorazioni più frequenti |
| **Gestione magazzino ricambi** | 🟢 Bassa | Scorte camere d'aria, catene, pastiglie |
| **Deploy cloud** | 🟢 Bassa | Accesso da fuori rete (Railway, Render) |

---

## 15. Note di versione

| Versione | Data | Modifiche |
|---|---|---|
| **1.1.0** | 2026-05-14 | Aggiunto **Storico interventi per cliente**: modal dedicato con 5 statistiche riepilogative, lista completa ordini ordinata per data, ricerca live, modifica rapida. Aggiornata grafica header con logo Cerica Bikelab e palette slate coerente. Totale speso visibile nelle card clienti |
| **1.0.0** | 2026-05-14 | Prima versione: clienti, ordini, catalogo lavorazioni, persistenza SQLite, accesso LAN multi-dispositivo, ricerca e filtri, toggle incasso |

---

*🚲 CicloDesk v1.1.0 — Gestionale per ciclo officina Cerica Bikelab*
