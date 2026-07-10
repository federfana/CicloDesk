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
15. [Sincronizzazione cloud (multi-postazione)](#15-sincronizzazione-cloud-multi-postazione)
16. [Aggiornamenti futuri consigliati](#16-aggiornamenti-futuri-consigliati)
17. [Note di versione](#17-note-di-versione)

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
│   ├── utils.js              # Utilità condivise (newId, registraMovimento)
│   └── routes/
│       ├── clienti.js        # GET/POST/PUT/DELETE /api/clienti
│       ├── ordini.js         # GET/POST/PUT/DELETE /api/ordini
│       ├── lavorazioni.js    # GET/POST/PUT/DELETE /api/lavorazioni
│       ├── bici.js           # GET/POST/PUT/DELETE /api/bici
│       └── componenti.js     # GET/POST/PUT/DELETE /api/componenti (magazzino)
│
└── public/
    ├── index.html            # Pagina principale (SPA)
    ├── manifest.json         # Manifest PWA
    ├── sw.js                 # Service Worker (cache offline)
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
        ├── componenti.js     # Logica magazzino componenti
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

<a id="dashboard"></a>
### Dashboard
- **4 contatori** in tempo reale: clienti registrati, bici in officina, pronte al ritiro (evidenziato in verde), consegnate oggi
- **⚠️ Notifiche automatiche** — banner arancione per ordini fermi da più di 48h con link diretto all'ordine
- **💾 Pulsanti backup** — download diretto del database (.db) o export JSON completo
- **📥 Importa JSON** — ripristina tutti i dati da un file JSON esportato in precedenza (sovrascrive i dati attuali con conferma)
- **📦 Loading spinner** — indicatore visivo durante il caricamento dei dati
- Lista bici attualmente in officina con badge stato colorato e pulsante avanzamento rapido
- **🟢 "Pronto per iniziare" *(v1.13.0)*** — per ogni ordine in stato `accettata` con ricambi collegati al magazzino, la card mostra un badge inline che indica se tutti i pezzi sono disponibili (verde) oppure quanti mancano (rosso, con conteggio esatto)

<a id="ricerca-globale"></a>
### 🔍 Ricerca Globale *(v1.7.0)*
- Barra di ricerca nell'header, accessibile da qualsiasi vista
- Cerca in tempo reale (con debounce 250ms) tra clienti, ordini e lavorazioni
- Risultati cliccabili: apre direttamente il modal di modifica dell'elemento trovato

<a id="schede-clienti"></a>
### Schede Clienti
- Anagrafica: nome, **cognome**, telefono, email, note libere
- Data iscrizione "cliente dal DD/MM/YYYY" visibile nella scheda
- Ricerca live su nome, cognome, telefono, email
- Dropdown clienti con suggerimenti custom (uniforme su tutti i browser)
- Totale speso e numero interventi attivi in ogni card
- Accesso rapido a **🚲 Bici**, **📋 Storico**, **+ Ordine**, modifica ed eliminazione
- Conferma eliminazione mostra il conteggio di ordini e bici associate

<a id="multi-bici"></a>
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

<a id="storico-interventi"></a>
### 📋 Storico Interventi per Cliente *(v1.1.0)*
- Aperto dal bottone **"📋 Storico"** nella scheda cliente
- **5 statistiche:** interventi totali, completati, totale speso, spesa media, ultimo ingresso
- Lista ordini dal più recente, con bici associata, stato, lavorazioni, totale
- **Ricerca live** tra gli interventi
- Modifica rapida di ogni ordine direttamente dallo storico
- Dopo il salvataggio, lo storico si riapre aggiornato (non si chiude tutto)

<a id="ordini-di-lavoro"></a>
### Ordini di Lavoro
- Selezione cliente + bici specifica + lavorazioni dal catalogo
- Prezzo auto-compilato dal catalogo, modificabile voce per voce
- **📷 Foto allegata** — upload di immagini (max 2MB) per documentare lo stato della bici all'ingresso; preview con thumbnails rimovibili
- **💰 Gestione acconti/caparre** — campo dedicato con calcolo in tempo reale del "Resta da saldare"; nelle card ordini lo stato pagamento è mostrato con un **box colorato evidente** (✅ verde "Saldato" / "Coperto da anticipo", 🟡 giallo "Anticipo X · Resto Y", ⚠ rosso "Da incassare") con l'importo dovuto sempre in grassetto grande. Il pulsante "Segna pagato" toggla il flag senza alterare il valore dell'acconto registrato, così l'anticipo originale non viene mai perso.
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

<a id="catalogo-lavorazioni"></a>
### Catalogo Lavorazioni
- Gestione del listino prezzi dell'officina
- 13 lavorazioni predefinite al primo avvio
- Aggiunta, modifica ed eliminazione
- Il prezzo viene proposto automaticamente negli ordini ma è sempre modificabile
- **Eliminazione bloccata** se la lavorazione è presente in uno o più ordini (con conteggio)
- Dropdown lavorazioni con suggerimenti custom (uniforme su tutti i browser)

<a id="ricambi-ordine"></a>
### 📦 Ricambi ordine *(v1.10.0 · v1.11.0 · v1.13.0)*
- Sezione **Ricambi** dentro ogni ordine: pezzi/componenti da procurare per completare il lavoro
- Tre stati: 🔴 **Da ordinare** · 🟡 **Ordinato** · 🟢 **In magazzino**
- **Autocomplete dal magazzino:** scrivendo il nome compare la lista dei componenti con badge giacenza colorato (verde se disponibile, rosso se esaurito); selezione collega il ricambio al componente di magazzino e precompila il prezzo di vendita. Possibilità di testo libero per pezzi una tantum non a magazzino
- Colonna **Disp.** in tabella + colonna **Prezzo** con calcolo automatico del subtotale ricambi (`prezzo × qta`) che concorre al totale dell'ordine e quindi alla validazione dell'acconto
- **Badge a doppio asse sulle card ordini *(v1.13.0)*:**
  - Asse *arrivo merce fornitore*: `📦⏳ N in attesa` (giallo) oppure `📦✅ Ricambi completi` (verde)
  - Asse *consumo magazzino* (solo per ordini in fase lavorata): `🔧 X/Y prelevati dal magazzino` (verde) oppure `📦⚠️ X/Y prelevati (Z mancanti)` (giallo) se la giacenza non è stata sufficiente al momento dello scarico
- Banner dashboard "⚠️ N ordini in attesa di ricambi" con link diretto

<a id="timeline-commenti"></a>
### 💬 Timeline commenti ordine *(v1.10.0)*
- Sezione **Timeline** dentro ogni ordine in modifica: cronologia di note datate (cambi cliente, problemi, decisioni)
- Aggiunta rapida da campo di testo + invio (o pulsante)
- Eliminazione singolo commento
- Badge conteggio commenti sulle card ordini

<a id="magazzino-componenti"></a>
### 🏭 Magazzino Componenti *(v1.10.0 · v1.11.0)*
- Sezione **Magazzino** dedicata alla gestione di tutti i componenti / ricambi dell'officina
- Campi per ogni componente: nome, categoria, marca, codice/SKU, fornitore, prezzo acquisto, prezzo vendita, giacenza, soglia minima, note
- **Raggruppamento per categoria**: le card sotto soglia sono evidenziate inline (bordo giallo "scorta bassa" / rosso "esaurito" + flag *da riordinare* accanto al nome) — niente lista duplicata
- **Statistiche:** numero componenti totali · contatore *Da riordinare* (clic visivo sulle card evidenziate)
- Ricerca live su nome, categoria, marca, codice e fornitore
- Datalist categorie auto-popolato dai valori già usati
- Pulsanti rapidi per card: **−** / **+** giacenza, **📜 Storico**, **✏ Modifica**, **🗑 Elimina**
- **Scorciatoia Ctrl+N** apre il modal Nuovo Componente quando si è nella vista Magazzino

<a id="import-csv"></a>
### 📄 Import CSV componenti *(v1.11.0)*
- Toolbar Magazzino → **📄 Importa CSV**: file `.csv` o incolla diretto
- Colonne riconosciute: `nome, categoria, marca, codice, prezzo_acquisto, prezzo_vendita, fornitore, giacenza, soglia_min, note`
- Separatore auto-detect `,` o `;`, supporto quote, header obbligatorio (solo `nome` è obbligatorio per riga)
- **Upsert intelligente**: matching prima per `codice` (case-insensitive, se valorizzato), altrimenti per `nome + marca`. Se trovato → aggiorna metadati + somma giacenza come carico; altrimenti crea nuovo componente con carico iniziale
- Anteprima fino a 50 righe + report finale (creati / aggiornati / pezzi caricati / errori)
- Pulsante **⬇ Scarica template CSV** con riga d'esempio

<a id="carico-merce"></a>
### 📥 Carico merce *(v1.11.0)*
- Toolbar Magazzino → **📥 Carico merce**: registra in blocco una bolla di consegna fornitore
- Campi fornitore + riferimento bolla, righe dinamiche con autocomplete componenti e giacenza attuale a fianco
- Per ogni riga: quantità + prezzo acquisto opzionale (se valorizzato aggiorna il prezzo del componente e il fornitore)
- **➕ Creazione componenti al volo:** quando il nome digitato non corrisponde a nulla in magazzino, il dropdown autocomplete propone la voce "➕ Crea nuovo: …" che genera il componente in fase di carico (categoria *Da catalogare* di default). Dedup **case-insensitive** lato server (`LOWER(nome)`): se due righe della stessa bolla — o un import precedente — usano lo stesso nome in maiuscolo/minuscolo diverso, il componente viene creato una sola volta
- Submit → crea N movimenti `carico` in transazione con motivo `Carico merce — <fornitore>`

<a id="ordini-fornitore"></a>
### 📤 Approvvigionamenti *(v1.12.0)*
- Nuova sezione **Approvvigionamenti** nella navigazione: gestisce in modo strutturato il ciclo di acquisto tra "ricambio cliente da ordinare" e "merce in magazzino". Ogni documento ha codice `ORD-NNN` (separato dagli ordini di lavoro cliente per evitare confusione)
- **Stati FSM:** 🟦 *bozza* → 🟨 *inviato* → 🚚 *in transito* → 🟧 *parzialmente ricevuto* → ✅ *ricevuto* (oppure 🚫 *annullato* fino a prima della ricezione). Le righe sono modificabili solo finché l'ordine è in `bozza`
- **Suggerimenti di riordino raggruppati per fornitore:** in cima alla pagina compare un blocco con tutti i ricambi cliente con stato `da_ordinare` + i componenti sotto soglia minima, raggruppati per fornitore. Il pulsante **+ Crea ordine** apre il modal pre-compilando le righe (aggrega le quantità per componente, somma ricambi cliente + sotto-scorta)
- **Collegamento bidirezionale ricambio cliente ↔ riga d'ordine:** quando un ricambio cliente viene incluso in un approvvigionamento, il suo stato passa automaticamente a `ordinato` con riferimento al documento; in [storico ordini cliente](#ricambi-ordine) compare quindi *Ordinato* invece di *Da ordinare*. Alla ricezione il ricambio passa a `ricevuto`. All'annullamento torna `da_ordinare`
- **Ricezione atomica con carico magazzino:** la `POST /api/ordini-fornitore/:id/ricevi` gira in un'unica `db.transaction()` che (a) carica il magazzino tramite `registraMovimento` (motivo: `ORD-XXX — fornitore (DDT YYYY)`), (b) aggiorna `qtaRicevuta` su ciascuna riga, (c) ricalcola lo stato del documento in base al rapporto ricevute/ordinate (passa a `parzialmente_ricevuto` se almeno una riga non è completa, a `ricevuto` quando tutte coincidono), (d) propaga `ricevuto` ai ricambi cliente collegati alle righe completate. **Race-safe:** lo stato viene riletto *dentro* la transazione, eliminando il rischio di doppia ricezione concorrente
- **Annullamento sicuro:** consentito solo per documenti non ancora ricevuti (risposta `409` per `ricevuto`); ripristina i ricambi cliente collegati a `da_ordinare` e azzera il riferimento
- **Tracciamento sui movimenti di magazzino:** la colonna `poId` su `movimenti_magazzino` (migrazione automatica) lega ogni movimento di carico all'approvvigionamento di origine, distinguendolo dai carichi manuali via [Carico merce](#carico-merce). Permette di risalire dallo storico movimenti al documento che ha generato il carico

<a id="movimenti-magazzino"></a>
### 📜 Movimenti di magazzino *(v1.10.0 · v1.13.0)*
- Ogni variazione di giacenza viene registrata: **carico** / **scarico** / **rettifica** con timestamp, quantità (segno), giacenza dopo il movimento, motivo e ordine/approvvigionamento collegato
- **Scarico automatico all'inizio lavorazione (v1.13.0):** al passaggio dell'ordine a **In lavorazione** (o `pronto`/`consegnata`, se saltate a stato successivo) tutti i ricambi collegati a un componente vengono scaricati dal magazzino. Il ricambio memorizza `prelevato: true`, `movimentoId` e `qtaPrelevata` (quantità *effettivamente* scaricata, che può essere inferiore a quella richiesta se la giacenza non basta)
- **Ricarico automatico nei percorsi inversi (v1.13.0):** regressione dello stato a `accettata`, rimozione del ricambio dall'ordine, spostamento nel cestino o eliminazione definitiva → la quantità viene rimessa in magazzino usando `qtaPrelevata` (mai `qta`) per evitare di creare pezzi dal nulla. Al ripristino dal cestino, se lo stato è ancora in fase lavorata, avviene un riscarico automatico
- **Giacenza insufficiente (v1.13.0):** il movimento registra il *delta effettivo* (mai negativo la giacenza); la response del `PUT /api/ordini/:id` include `_magazzino: { scarico, carico, warnings }` con avvisi puntuali (`"Giacenza insufficiente per X: scaricati N pezzi su M richiesti"`) che l'UI trasforma in toast dedicati
- **Migrazione retroattiva al primo boot su v1.13.0:** ordini già in `in_lavorazione` / `pronto` / `consegnata` (non nel cestino) i cui ricambi non erano ancora stati prelevati vengono allineati automaticamente al nuovo flusso, con log riassuntivo. Idempotente grazie alla tabella `_meta` che marca la migrazione come completata (nessun re-scan ai boot successivi)
- **Modal storico movimenti** accessibile dal pulsante 📜 nella card componente: tabella ordinata per data con link cliccabile all'ordine che ha generato il movimento
- Alert dashboard automatico "🚨 N componenti sotto soglia" con totale pezzi da riordinare

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
3. Applica rate limiting sulle route /api/* (max 120 req/min per IP)
4. Serve i file statici della cartella /public
5. Registra le 4 route API (clienti, ordini, lavorazioni, bici)
6. Si mette in ascolto sulla porta 3000
7. Calcola l'IP locale e lo stampa in console
```

**Concetti chiave:**

- **`express()`** — crea l'applicazione web
- **`express.json()`** — middleware che trasforma automaticamente il body JSON delle richieste in oggetto JavaScript
- **Rate limiter** — middleware in-memory che traccia le richieste per IP; restituisce HTTP 429 se un client supera 120 richieste al minuto. La mappa viene pulita ogni 5 minuti
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

#### `public/sw.js` — Service Worker *(v1.9.0)*

**Tecnologie:** Service Worker API, Cache API, Fetch API

```
Cosa fa:
1. All'installazione, pre-carica in cache tutti i file statici dell'app
2. All'attivazione, elimina le cache di versioni precedenti
3. Intercetta ogni richiesta di rete e sceglie la strategia:
   - File statici → cache-first (dalla cache, fallback rete)
   - Chiamate API → network-first (rete, fallback cache con scadenza 5 min)
```

**Concetti chiave:**

- **`CACHE_NAME = 'ciclodesk-v1.9.1'`** — nome versionato della cache per asset statici; cambiarlo forza il rinnovo
- **`API_CACHE = 'ciclodesk-api-v1'`** — cache separata per le risposte API con scadenza temporale (5 minuti)
- **`API_MAX_AGE = 5 * 60 * 1000`** — le risposte API in cache scadono dopo 5 minuti; se offline e cache scaduta, i dati vengono comunque restituiti con header `X-Cache-Stale: true`
- **`self.addEventListener('install')`** — evento eseguito una sola volta al primo download del SW; pre-carica 15 asset statici nella cache
- **`self.skipWaiting()`** — attiva il nuovo SW immediatamente senza aspettare la chiusura di tutte le tab
- **`self.clients.claim()`** — prende il controllo delle pagine già aperte dopo l'attivazione
- **Cache-first (asset statici)** — HTML, CSS, JS, logo vengono serviti dalla cache locale; la rete è usata solo se il file non è in cache → caricamento istantaneo dopo la prima visita
- **Network-first (`/api/*`)** — le chiamate API provano sempre la rete per dati freschi; se offline, servono l'ultima risposta GET salvata in cache (solo se non scaduta)
- **Timestamp nella cache** — ogni risposta API cached include l'header custom `sw-cached-at` con il timestamp di salvataggio
- **Pulizia cache** — nell'evento `activate`, le cache con nome diverso da quelli correnti vengono eliminate automaticamente
- **Registrazione** — avviene in `app.js` con `navigator.serviceWorker.register('/sw.js')` alla fine del `DOMContentLoaded`

> ⚠️ Il Service Worker funziona solo su HTTPS o su `localhost`. In rete locale (`http://192.168.x.x`) alcuni browser potrebbero non attivarlo.

---

#### `public/manifest.json` — Manifest PWA *(v1.9.0)*

**Tecnologie:** Web App Manifest (standard W3C)

```
Cosa fa:
1. Dichiara CicloDesk come app installabile
2. Definisce nome, icona, colori e modalità di visualizzazione
3. Abilita il prompt "Aggiungi alla schermata Home" su mobile
```

**Concetti chiave:**

- **`"display": "standalone"`** — l'app si apre senza barra degli indirizzi, con aspetto nativo
- **`"start_url": "/"`** — quando aperta dalla Home, carica la pagina principale
- **`"theme_color": "#334155"`** — colore della barra di stato su Android e title bar su desktop
- **`"background_color": "#f8fafc"`** — sfondo dello splash screen prima che l'app carichi
- **`"icons"`** — logo SVG con `"purpose": "any maskable"`, compatibile con le maschere circolari Android
- **Collegamento** — referenziato in `index.html` tramite `<link rel="manifest" href="manifest.json">`

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
| `GET` | `/api/ordini?limit=50&offset=0` | Lista paginata (restituisce `{data, total, limit, offset}`) |
| `GET` | `/api/ordini?stato=pronto` | Filtra per stato lato server |
| `GET` | `/api/ordini?clienteId=xxx` | Filtra per cliente lato server |
| `GET` | `/api/ordini/:id` | Dettaglio singolo ordine |
| `POST` | `/api/ordini` | Crea nuovo ordine |
| `PUT` | `/api/ordini/:id` | Aggiorna / avanza stato / riapri |
| `DELETE` | `/api/ordini/:id` | Elimina ordine |

> 💡 Senza parametro `limit`, la GET restituisce tutti gli ordini come array (retrocompatibile). Con `limit`, la risposta diventa un oggetto `{ data: [...], total, limit, offset }`.

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

### Componenti Magazzino *(v1.10.0)*

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/componenti` | Lista tutti i componenti |
| `GET` | `/api/componenti/:id` | Dettaglio singolo componente |
| `GET` | `/api/componenti/sotto-soglia/lista` | Componenti con giacenza ≤ soglia minima |
| `GET` | `/api/componenti/:id/movimenti` | Storico movimenti (con nome cliente da JOIN) |
| `POST` | `/api/componenti` | Crea componente |
| `PUT` | `/api/componenti/:id` | Aggiorna componente |
| `POST` | `/api/componenti/:id/giacenza` | Aggiusta giacenza (+/- delta oppure set assoluto) |
| `POST` | `/api/componenti/import` | Import bulk da CSV (rows già parsate lato client) |
| `POST` | `/api/componenti/carico-multiplo` | Registra una bolla di carico merce multi-riga |
| `DELETE` | `/api/componenti/:id` | Elimina componente e i suoi movimenti |

**Corpo POST/PUT `/api/componenti`:**
```json
{
  "nome":            "Copertone 29×2.3",
  "categoria":       "Copertoni",
  "marca":           "Schwalbe",
  "codice":          "SCH-2901",
  "prezzo_acquisto": 22.00,
  "prezzo_vendita":  35.00,
  "fornitore":       "Bike Parts SRL",
  "giacenza":        4,
  "soglia_min":      2,
  "note":            "Scaffale A2"
}
```

**Corpo POST `/api/componenti/:id/giacenza`:**
```json
// modifica relativa (registra movimento 'carico' o 'scarico')
{ "delta": -1, "motivo": "Pezzo difettoso" }
// oppure modifica assoluta (registra movimento 'rettifica')
{ "set": 10, "motivo": "Inventario" }
```

**Corpo POST `/api/componenti/import` *(v1.11.0)*:**
```json
{
  "rows": [
    { "nome": "Copertone 29x2.3", "categoria": "Copertoni", "marca": "Schwalbe",
      "codice": "SCH-2901", "prezzo_acquisto": 18.50, "prezzo_vendita": 32.00,
      "fornitore": "Bike Parts", "giacenza": 4, "soglia_min": 2, "note": "" }
  ]
}
```
- Upsert per `codice` (se presente) o `nome+marca` (case-insensitive)
- Risposta: `{ ok, creati, aggiornati, caricati, errori: [...] }` — la `giacenza` importata diventa un movimento `carico`

**Corpo POST `/api/componenti/carico-multiplo` *(v1.11.0)*:**
```json
{
  "fornitore": "Bike Parts SRL",
  "motivo":    "DDT 1234 del 25/06",
  "righe": [
    { "componenteId": "abc123", "qta": 5, "prezzo_acquisto": 18.50 },
    { "componenteId": "def456", "qta": 2 }
  ]
}
```
- Per ogni riga registra un movimento `carico` con motivo `Carico merce — <fornitore>` (o `motivo` esplicito)
- Se `prezzo_acquisto` è valorizzato aggiorna anche il prezzo del componente e il fornitore

### Commenti ordine *(v1.10.0)*

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `POST` | `/api/ordini/:id/commenti` | Aggiunge un commento alla timeline |
| `DELETE` | `/api/ordini/:id/commenti/:commentoId` | Elimina un commento dalla timeline |

**Corpo POST:**
```json
{ "testo": "Cliente ha richiesto cambio sella" }
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
  ricambi      TEXT DEFAULT '[]',         -- array JSON di ricambi {nome,qta,stato,componenteId?,prelevato?}
  commenti     TEXT DEFAULT '[]',         -- array JSON di commenti timeline {id,testo,timestamp}
  deletedAt    TEXT DEFAULT NULL,         -- soft delete: timestamp eliminazione (cestino)
  FOREIGN KEY (clienteId) REFERENCES clienti(id)
);

CREATE TABLE IF NOT EXISTS componenti (
  id              TEXT PRIMARY KEY,
  nome            TEXT NOT NULL,
  categoria       TEXT DEFAULT '',
  marca           TEXT DEFAULT '',
  codice          TEXT DEFAULT '',
  prezzo_acquisto REAL DEFAULT 0,
  prezzo_vendita  REAL DEFAULT 0,
  fornitore       TEXT DEFAULT '',
  giacenza        INTEGER DEFAULT 0,
  soglia_min      INTEGER DEFAULT 0,
  note            TEXT DEFAULT '',
  createdAt       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS movimenti_magazzino (
  id           TEXT PRIMARY KEY,
  componenteId TEXT NOT NULL,
  ordineId     TEXT DEFAULT NULL,         -- collegato a un ordine se scarico automatico
  tipo         TEXT NOT NULL,             -- carico | scarico | rettifica
  quantita     INTEGER NOT NULL,          -- positivo per carichi, negativo per scarichi
  giacenzaPost INTEGER NOT NULL,          -- giacenza dopo il movimento (audit)
  motivo       TEXT DEFAULT '',
  timestamp    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (componenteId) REFERENCES componenti(id)
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
| **1.9.3** | `ordini` | `deletedAt` | TEXT | `NULL` |
| **1.10.0** | `ordini` | `ricambi` | TEXT | `'[]'` |
| **1.10.0** | `ordini` | `commenti` | TEXT | `'[]'` |
| **1.10.0** | *(nuova)* `componenti` | — | tabella | — |
| **1.10.0** | *(nuova)* `movimenti_magazzino` | — | tabella | — |

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

## 15. Sincronizzazione cloud (multi-postazione)

CicloDesk supporta la sincronizzazione del database tra due postazioni (es. officina e casa) tramite Google Drive, Dropbox o OneDrive. Il meccanismo copia automaticamente il file `officina.db` da/verso una cartella cloud sincronizzata.

### Prerequisiti

1. Installa **Google Drive for Desktop** (o Dropbox / OneDrive) su entrambi i PC
2. Installa CicloDesk normalmente su entrambi i PC
3. Configura il percorso della cartella cloud nello script di avvio

### Configurazione Windows (`start.bat`)

Apri `start.bat` e modifica la riga `SYNC_FOLDER`:

```batch
set SYNC_FOLDER=C:\Users\TuoNome\Google Drive\CicloDesk
```

Altri esempi:
```batch
set SYNC_FOLDER=C:\Users\TuoNome\Dropbox\CicloDesk
set SYNC_FOLDER=C:\Users\TuoNome\OneDrive\CicloDesk
```

### Configurazione Mac/Linux (`start.sh`)

Apri `start.sh` e modifica la riga `SYNC_FOLDER`:

```bash
SYNC_FOLDER="$HOME/Library/CloudStorage/GoogleDrive-tuaemail/Il mio Drive/CicloDesk"
```

### Come funziona

```
AVVIO (start.bat / start.sh)
  ├── Confronta la data del DB locale con quello nel cloud (robocopy /XO)
  ├── Se il cloud è più recente → scarica e sovrascrive il locale
  ├── Elimina file WAL/SHM residui (previene corruzione)
  └── Avvia il server CicloDesk

CHIUSURA (Ctrl+C)
  ├── WAL checkpoint (merge dati nel file .db)
  ├── Copia database nella cartella cloud
  ├── Chiude il database
  └── Il servizio cloud sincronizza in background
```

### Indicatore di stato

In basso a destra nell'app compare una barra di stato:

- **📁 DB aggiornato: 07/06/2026, 14:30** — ultima modifica del database
- **🟢 Cloud: alla chiusura** — indica che il sync è attivo (visibile solo se `SYNC_FOLDER` è configurato)

L'indicatore si aggiorna ogni minuto.

### Struttura file

Nella cartella cloud viene salvato **solo il database**, non tutto il progetto:

```
Google Drive/CicloDesk/
  └── officina.db        ← unico file sincronizzato
```

### ⚠️ Regole importanti

| Regola | Motivo |
|---|---|
| **Mai usare due postazioni contemporaneamente** | SQLite non supporta accesso da più PC — i dati si sovrascrivono |
| **Chiudere sempre con Ctrl+C** | Il salvataggio sul cloud avviene alla chiusura |
| **Aspettare la sincronizzazione cloud** | Dopo la chiusura, attendere qualche secondo prima di aprire sull'altro PC |
| **Lascia `SYNC_FOLDER` vuoto per disattivare** | Se non serve il sync, non configurare nulla — tutto funziona come prima |

> 💡 Se hai bisogno di accesso simultaneo da più postazioni, usa la soluzione **Tailscale**: un solo PC fa da server e tutti gli altri accedono via browser. Vedi la sezione "Accesso da fuori rete" nel README.

---

## 16. Aggiornamenti futuri consigliati

| Funzionalità | Priorità | Descrizione |
|---|---|---|
| **Login con password** | 🔴 Alta | Proteggere i dati da accessi non autorizzati |
| **Stampa / PDF ordine** | — | ✅ Implementato in v1.6.0 |
| **Rate limiting API** | — | ✅ Implementato in v1.9.1 (120 req/min per IP) |
| **Cache API con scadenza** | — | ✅ Implementato in v1.9.1 (TTL 5 min) |
| **Paginazione ordini** | — | ✅ Implementato in v1.9.1 (50 per pagina + "Carica altri") |
| **Sync cloud multi-postazione** | — | ✅ Implementato in v1.9.2 (Google Drive / Dropbox / OneDrive) |
| **Graceful shutdown** | — | ✅ Implementato in v1.9.2 (WAL checkpoint + chiusura DB) |
| **Notifiche pronto-ritiro** | 🟡 Media | Pulsante “Notifica WhatsApp” (gratuito, link `wa.me`) o SMS/email via API Twilio/nodemailer |
| **Gestione magazzino ricambi** | — | ✅ Implementato in v1.10.0 (componenti, giacenze, movimenti, scarico automatico) |
| **Statistiche mensili** | 🟢 Bassa | Grafici incassi e lavorazioni più frequenti |
| **Numero telaio bici** | 🟢 Bassa | Campo seriale telaio aggiuntivo nella scheda bici |
| **Deploy cloud** | 🟢 Bassa | Accesso da fuori rete (Railway, Render) |

---

## 17. Note di versione

| Versione | Data | Modifiche |
|---|---|---|
| **1.13.0** | 2026-07-10 | **Scarico magazzino anticipato all'inizio lavorazione:** la giacenza dei ricambi con `componenteId` viene decrementata al passaggio → `in_lavorazione` (non più solo alla `consegnata`); così il magazzino rispecchia il flusso fisico (pezzo preso dallo scaffale = scaricato). Sui ricambi prelevati viene salvato `qtaPrelevata` con la quantità *effettivamente* rimossa dal magazzino. **Ricarico automatico in tutti i percorsi inversi:** regressione stato → `accettata`, ordine spostato nel cestino (`DELETE /api/ordini/:id`), rimozione di un ricambio già prelevato, eliminazione definitiva; il ricarico usa `qtaPrelevata` per non "creare" pezzi dal nulla in caso di scarico parziale precedente. Riscarico automatico anche al `POST /api/ordini/:id/ripristina` se lo stato è già in fase lavorata. **Warning giacenza insufficiente:** `registraMovimento` ora registra il *delta effettivo* (non quello richiesto), preservando l'integrità storica dei `movimenti_magazzino` (Σ movimenti = giacenza corrente); se la giacenza non basta, la response del PUT include `_magazzino.warnings` con messaggio chiaro `"Giacenza insufficiente per X: scaricati N pezzi su M richiesti"` e il client mostra un toast rosso dedicato. **Feedback UI post-scarico:** ogni `PUT /api/ordini/:id` e `POST /api/ordini/:id/ripristina` restituisce `_magazzino: { scarico, carico, warnings }` che il client trasforma in toast informativo (`🔧 N pezzi prelevati dal magazzino` / `↩️ N pezzi ricaricati`). **Elimina lavorazione non blocca più:** `DELETE /api/lavorazioni/:id` ora sgancia automaticamente la lavorazione dalle voci degli ordini attivi (la voce resta come riga manuale con nome+prezzo) invece di rispondere 409; gli ordini nel cestino non impediscono più l'eliminazione (bug: prima il check contava anche gli ordini soft-deleted). **Approvvigionamenti — rinomina stato `inviato` → `ordinato`:** per distinguere meglio da `in_transito` (`📤 Ordinato` = documento emesso al fornitore; `🚚 In transito` = merce in viaggio); migrazione DB automatica al boot. **Modal Approvvigionamento — visualizza stati non editabili:** aprendo un PO in stato `ricevuto` / `parzialmente_ricevuto` / `annullato` il select stato ora mostra correttamente il valore corrente (in sola lettura) invece di ricadere su "bozza". **Service Worker network-first per JS/CSS:** un semplice F5 dopo un deploy vede subito la versione nuova (prima serviva hard-refresh); fallback su cache solo in offline. Cache-first mantenuto solo per asset immutabili (img/font/manifest). **Badge voci auto-esplicativo:** contatore nero accanto allo stato ordine ora mostra `🔧 N` invece del solo numero, con tooltip pluralizzato. **Bug fix minori:** listener `focus`/`blur` sul modal ordine non si accumulano più (convertiti in proprietà `onfocus`/`onblur`); indice DB `idx_mov_componenteId` aggiunto per velocizzare lo storico movimenti. **Migrazione one-shot al primo boot su v1.13.0:** scansiona tutti gli ordini in stato `in_lavorazione`/`pronto`/`consegnata` (non nel cestino) e scarica retroattivamente i ricambi con `componenteId` non ancora prelevati, allineando il magazzino al nuovo flusso senza intervento manuale. La migrazione è idempotente grazie alla nuova tabella `_meta` con chiave `migration_v113_stock` (marcata al termine della transazione) e log riassuntivo `🔧 Migrazione v1.13.0: scaricati N ricambi da M ordini` — il flag `prelevato:true` sui ricambi già trattati fa da doppia protezione. **Badge ricambi a doppio asse nella card ordine:** oltre allo storico "in attesa dal fornitore" (`📦⏳ N in attesa` / `📦✅ Ricambi completi`), per gli ordini in fase lavorata la card mostra ora anche il consumo magazzino: `🔧 X/Y prelevati dal magazzino` (verde) oppure `📦⚠️ X/Y prelevati (Z mancanti)` (giallo) se `qtaPrelevata < qta` per qualche riga. I due indicatori sono complementari e distinti. **Dashboard — "Pronto per iniziare":** per ogni ordine in stato `accettata` con ricambi collegati a componenti di magazzino, la card mostra un badge inline `🟢 Pronto per iniziare` (giacenza sufficiente per tutti i ricambi) oppure `🔴 Mancano N pezzi in magazzino` (con conteggio esatto degli articoli mancanti), così il meccanico sa a colpo d'occhio quali ordini può prendere in lavorazione senza sorprese |
| **1.12.0** | 2026-06-26 | **[📤 Approvvigionamenti con stati FSM](#ordini-fornitore):** nuova sezione "Approvvigionamenti" nella navigazione (separata dagli ordini di lavoro cliente, identificata con codice `ORD-NNN`). Sistema strutturato che si interpone tra "ricambio richiesto" e "carico merce", per tracciare con precisione l'iter di acquisto. **5 stati FSM:** 🟦 bozza → 🟨 inviato → 🚚 in transito → 🟧 parzialmente ricevuto → ✅ ricevuto, oppure 🚫 annullato. **Suggerimenti di riordino raggruppati per fornitore:** la pagina mostra in cima un blocco con tutti i ricambi cliente `da_ordinare` + i componenti sotto soglia, raggruppati per fornitore, con pulsante "+ Crea ordine" che pre-compila il modal aggregando le quantità per componente. **Collegamento bidirezionale ricambio cliente ↔ riga d'ordine:** quando un ricambio cliente viene incluso in un approvvigionamento, il suo stato passa automaticamente a `ordinato` e ne tiene memoria; alla ricezione passa a `ricevuto`; all'annullamento torna `da_ordinare`. **Ricezione atomica:** la `POST /api/ordini-fornitore/:id/ricevi` gira in un'unica `db.transaction()` che (a) carica il magazzino con `registraMovimento` (motivo: `ORD-XXX — fornitore (DDT YYYY)`), (b) aggiorna `qtaRicevuta` su ciascuna riga, (c) ricalcola lo stato del documento in base al rapporto ricevute/ordinate (parziale o totale), (d) propaga lo stato ai ricambi cliente collegati. **Race-safe:** lo stato viene riletto *dentro* la transazione, eliminando il rischio di doppia ricezione concorrente. **Annullamento sicuro:** consentito solo per ordini non ancora ricevuti (risposta `409` per `ricevuto`); ripristina i ricambi cliente collegati a `da_ordinare`. **Movimenti di magazzino con tracciamento:** nuova colonna `poId` su `movimenti_magazzino` (migrazione automatica) che lega ogni movimento di carico al documento di origine, distinguendolo dai carichi manuali via [Carico merce](#carico-merce). **Endpoint nuovi:** `GET /api/ordini-fornitore`, `GET /api/ordini-fornitore/riordino/suggerimenti`, `GET /api/ordini-fornitore/:id`, `POST /api/ordini-fornitore`, `PUT /api/ordini-fornitore/:id`, `POST /api/ordini-fornitore/:id/ricevi`, `POST /api/ordini-fornitore/:id/annulla`, `DELETE /api/ordini-fornitore/:id`. **Nuove tabelle:** `ordini_fornitore`, `righe_po`. **Nuovi file:** `server/routes/ordiniFornitore.js`, `public/js/ordiniFornitore.js` |
| **1.11.2** | 2026-06-25 | **Seconda passata di audit (lato server + client).** **Atomicità scarico magazzino alla consegna:** il blocco "scarico ricambi + UPDATE ordini" del PUT `/api/ordini/:id` è ora avvolto in una `db.transaction()` che rilegge lo stato dell'ordine *dentro* la transazione, eliminando una race condition teorica in cui due PUT concorrenti con `stato=consegnata` avrebbero potuto scaricare due volte gli stessi ricambi (vedi [↓ Movimenti di magazzino](#movimenti-magazzino)). **`PUT /api/bici/:id` resiliente ai NULL:** se una colonna (`marca`, `colore`, `seriale_*`, `note`) era `NULL` nel DB (possibile su dati legacy o backup importati con valori mancanti), il PUT crashava con 500 *"Cannot read property 'trim' of null"*; ora tutti i campi opzionali sono normalizzati con `(field \|\| '').trim()` come nelle altre route (vedi [↓ Multi-Bici](#multi-bici)). **`POST /api/import/json` robusto:** hardening contro `req.body` non oggetto (es. JSON top-level `null`, `"stringa"`, numero): ora viene normalizzato a `{}` prima del destructuring, evitando un possibile crash interno; il check "nessuna tabella trovata" resta autoritativo e restituisce 400 chiaro. **Stampa ordine: gestione popup-blocker:** `window.open()` per la stampa ora viene controllato; se il browser blocca i popup l'utente vede un alert con la causa invece di una pagina apparentemente "morta" (TypeError silenzioso in console) (vedi [↓ Ordini di Lavoro](#ordini-di-lavoro)). **Modal ordine: parse foto difensivo:** se il campo `foto` arrivasse come stringa malformata (corruzione DB, import manuale), il parse non blocca più l'apertura del modal — fallback a array vuoto. **Rimozione foto: validazione indice:** la rimozione di una foto preview valida l'indice con `Number.isNaN` prima del `splice`, evitando di rimuovere la foto sbagliata se il `data-foto-idx` fosse assente o non numerico |
| **1.11.1** | 2026-06-25 | **Audit di correttezza post-1.11.0.** **Integrità totali ordini:** il server ora ricalcola sempre `totale = Σ voci.prezzo + Σ (ricambio.prezzo × qta)` in INSERT e UPDATE invece di fidarsi del valore mandato dal client; il campo `totale` del body PUT viene ignorato. Risolve il rischio di disallineamento quando ad es. `togglePagato` invia un totale "stantio" mentre voci/ricambi sono cambiati nel frattempo. **Magazzino — protezione referenziale:** [`DELETE /api/componenti/:id`](#magazzino-componenti) ora blocca con 409 se il componente è referenziato in `ricambi` di qualunque ordine (compreso il cestino), evitando id orfani e link rotti nello storico movimenti; messaggio chiaro all'utente. **[Carico merce](#carico-merce) — prezzo negativo:** la creazione al volo arrotonda a 0 prezzi `< 0` (era possibile inserire prezzi negativi se il numero veniva passato dall'autocomplete con valore arbitrario). **[Carico merce](#carico-merce) — aggregazione righe:** se l'utente inserisce nella stessa bolla due righe per lo stesso componente (per id o per `nomeNuovo` case-insensitive) le quantità vengono sommate prima dell'invio, generando un singolo movimento `carico` invece di N movimenti separati. **[Card ordine](#ordini-di-lavoro) — box pagamento più sensato per ordini aperti:** un ordine non ancora consegnato senza acconto mostra ora un riquadro neutro grigio "💶 Da saldare alla consegna" invece dell'allarme rosso "⚠ Da incassare", che resta per gli ordini *consegnati* non pagati; l'icona dell'allarme passa a 🔴 per coerenza colore. Per pagamenti parziali la label distingue tra ordine in corso ("Anticipo X · Mancano Y") e consegnato ("Anticipo X · Resto Y"). **[Import CSV](#import-csv) — `prezzo = 0` esplicito:** un valore di prezzo `0` nel CSV ora aggiorna effettivamente il prezzo del componente esistente a 0 (prima veniva preservato il vecchio valore perché il check era `prezzo \|\| existing`); valore *mancante* (campo vuoto) continua a preservare l'esistente. Negativi → 0. **`findByCodice` — match più rigoroso:** condizione cambiata da `codice <> ''` a `TRIM(codice) <> ''` per ignorare codici composti da soli spazi |
| **1.11.0** | 2026-06-25 | **[📄 Import CSV componenti](#import-csv):** modal dedicato in Magazzino con parser inline (auto-detect separatore `,` o `;`, supporto quote), anteprima fino a 50 righe + report errori, template CSV scaricabile; **upsert intelligente** per `codice` o `nome+marca` (case-insensitive); la giacenza importata genera un movimento `carico`. **[📥 Modal Carico merce](#carico-merce):** registrazione bolla fornitore multi-riga con autocomplete componenti, quantità e prezzo acquisto opzionale (aggiorna anche prezzo + fornitore del componente); crea N movimenti `carico` in transazione. **[Creazione componenti al volo dal carico merce](#carico-merce):** dropdown autocomplete con voce "➕ Crea nuovo: …" quando il nome non è già a magazzino; dedup case-insensitive lato server (`LOWER(nome)`) per evitare duplicati. **Endpoint nuovi:** `POST /api/componenti/import` e `POST /api/componenti/carico-multiplo` (supporta `nomeNuovo` per creazione al volo). **[💰 Box stato pagamento nelle card ordine](#ordini-di-lavoro):** sostituita la riga testuale con un box colorato accanto alle azioni — verde "✅ Saldato · totale", verde "✅ Coperto da anticipo" (acconto ≥ totale), giallo "🟡 Anticipo X · Resto Y", rosso "⚠ Da incassare · totale"; importo sempre evidenziato in grassetto grande. **[💰 Prezzo ricambi → totale ordine](#ricambi-ordine):** colonna prezzo nella tabella ricambi (precompilato da `prezzo_vendita` del componente), subtotale ricambi calcolato in tempo reale, totale ordine = lavorazioni + ricambi; validazione server-side dell'acconto include i ricambi. **[UI Magazzino ripulita](#magazzino-componenti):** rimossa card "Valore magazzino" (calcolo non significativo), rimossa sezione duplicata "🚨 Da riordinare" in cima — le card sotto soglia ora sono evidenziate inline (bordo giallo/rosso + flag "da riordinare" accanto al nome) all'interno del raggruppamento per categoria. **Modal ordine riordinato:** Dati → Lavorazioni → Ricambi → Timeline → 💰 Pagamento in fondo con box totale evidenziato. **Etichetta stato ricambio "Ricevuto" → "🟢 In magazzino"** per coerenza. **Fix:** `togglePagato` ora non sovrascrive più l'`acconto` (precedente regressione faceva perdere l'anticipo originale all'attivazione del flag pagato); fallback automatico nome digitato → `nomeNuovo` nel modal carico merce (riga non più scartata silenziosamente); focus sulla riga corrente dopo selezione autocomplete (non sull'ultima riga). **Fix SQL:** sostituite double-quote con single-quote nelle nuove query SQLite (interpretate come identificatori in SQLite) |
| **1.10.0** | 2026-06-25 | **[📦 Ricambi negli ordini](#ricambi-ordine):** nuova sezione dentro ogni ordine per tracciare i pezzi da procurare, con stati 🔴 Da ordinare / 🟡 Ordinato / 🟢 Ricevuto; badge "📦⏳ N ricambi in attesa" sulle card; alert dashboard. **[💬 Timeline commenti ordine](#timeline-commenti):** cronologia di note datate dentro ogni ordine in modifica, aggiunta da campo testo (Enter o pulsante), eliminazione per singolo commento, badge conteggio sulle card; endpoint `POST /api/ordini/:id/commenti` e `DELETE /api/ordini/:id/commenti/:commentoId`. **[🏭 Gestione Magazzino completa](#magazzino-componenti):** nuova vista "Magazzino" con CRUD componenti (nome, categoria, marca, codice, fornitore, prezzo acquisto/vendita, giacenza, soglia minima, note); raggruppamento per categoria + sezione "🚨 Da riordinare" in cima; statistiche valore totale; ricerca live; datalist categorie. **[🔁 Autocomplete ricambi → magazzino](#ricambi-ordine):** scrivendo un ricambio nell'ordine compare la lista dei componenti con badge giacenza colorato (verde/rosso); selezione collega il ricambio al componente. **[⬇️ Scarico automatico](#movimenti-magazzino):** al passaggio dell'ordine a "Consegnata", i ricambi collegati e non ancora prelevati vengono scaricati dal magazzino con tracciamento completo del movimento (tipo, quantità, giacenza post, ordine di riferimento). **[📜 Storico movimenti](#movimenti-magazzino):** modal con tabella ordinata per data accessibile dal pulsante 📜 sulla card componente, link cliccabile all'ordine che ha generato lo scarico. **Helper server `registraMovimento`** in `utils.js` per aggiornamento atomico giacenza + insert movimento. **Nuovi file:** `server/routes/componenti.js`, `public/js/componenti.js`. **Nuove tabelle:** `componenti`, `movimenti_magazzino`. **Nuove colonne ordini:** `ricambi`, `commenti` (migrazione automatica) |
| **1.9.3** | 2026-06-08 | **Cestino ordini (soft delete):** l'eliminazione di un ordine lo sposta nel cestino anziché cancellarlo; nuova vista "🗑 Cestino" nel filtro [ordini](#ordini-di-lavoro) con opzioni Ripristina ed Elimina definitivamente; endpoint `GET /api/ordini/cestino/lista`, `POST /api/ordini/:id/ripristina`, `DELETE /api/ordini/:id/permanente`; colonna `deletedAt` aggiunta automaticamente. **[Ricerca globale](#ricerca-globale) migliorata:** risultati con contesto — clienti mostrano numero ordini aperti, ordini mostrano badge stato + totale + giorni in officina. **Label acconto più chiara:** campo rinominato "Anticipo versato €"; formula "Resto da saldare: Totale − Anticipo = X" sempre visibile nel form e nelle [card ordini](#ordini-di-lavoro) |
| **1.9.2** | 2026-06-08 | **Sincronizzazione cloud:** sync del database via Google Drive / Dropbox / OneDrive; download all'avvio se il cloud è più recente, upload alla chiusura; configurabile in `start.bat` / `start.sh` con variabile `SYNC_FOLDER`; endpoint `GET /api/db-info` per stato DB. **Indicatore sync:** barra di stato in basso a destra con data ultima modifica DB e stato sync cloud. **Graceful shutdown:** chiusura pulita con WAL checkpoint → sync cloud → close DB; handler `SIGINT`/`SIGTERM`. **Confronto date affidabile:** usa `robocopy /XO` su Windows (sostituisce confronto `%~t` inaffidabile in formato italiano). **Protezione corruzione:** elimina file `-wal` e `-shm` quando si scarica un DB dal cloud. **Fix:** shortcut tastiera usano `e.code` (compatibile con Option su macOS); Service Worker non intercetta più POST/PUT/DELETE (fix "Failed to fetch" su Windows); logo leggibile in dark mode (sfondo bianco con border-radius) |
| **1.9.1** | 2026-05-26 | **Sicurezza e performance:** 1) Rate limiting API — max 120 req/min per IP con risposta 429; 2) Service Worker cache con scadenza — risposte API scadono dopo 5 min (cache separata `ciclodesk-api-v1`); 3) Paginazione ordini — server supporta `?limit=&offset=&stato=&clienteId=`, frontend mostra 50 ordini alla volta con pulsante "Carica altri"; 4) Pulsante ⌨️ guida shortcut in header; 5) Tasto `?` apre la guida scorciatoie (solo fuori da input). **Fix:** shortcut `?` ora ignora i campi input/textarea; versione corretta in stampa (v1.9.0); warning rosso in tempo reale se acconto > totale; debounce 200ms su ricerca storico |
| **1.9.0** | 2026-05-25 | **15 nuove funzionalità:** 1) Toast ovunque — tutti gli alert() rimpiazzati; 2) Ordinamento liste — clienti alfabetici, ordini per data desc; 3) Filtri ordini avanzati — per cliente, data da/a; 4) Badge contatore voci — numero lavorazioni visibile su ogni card ordine; 5) Doppio-click protezione — pulsanti Salva disabilitati durante submit; 6) Animazioni modali — fade-in/slide-up CSS; 7) Empty state illustrato — SVG dedicato per ogni sezione vuota; 8) Badge contatore nav — "Clienti (N)", "Ordini (N)" nella navigazione; 9) Breadcrumb — percorso con icona sotto l'header; 10) Responsive cards tablet — griglia a 2 colonne su tablet, 3 per catalogo desktop; 11) Shortcut tastiera — Ctrl+N nuovo, Ctrl+S salva, Ctrl+F cerca, Ctrl+D dashboard; 12) Kanban drag & drop — vista alternativa ordini con 4 colonne stato, drag per cambiare stato; 13) Suono notifica — beep Web Audio per ordini fermi >48h (1 volta per sessione); 14) PWA offline — service worker con cache-first per asset e network-first per API, manifest.json; 15) Tema scuro — toggle con persistenza localStorage. **Nuovi file:** `public/sw.js`, `public/manifest.json` |
| **1.8.0** | 2026-05-22 | **Sicurezza:** protezione XSS completa (escape HTML su tutti i dati utente renderizzati con innerHTML); backup .db sicuro in WAL mode (usa `db.backup()` su file temporaneo); validazione foto (solo `data:image/`); `newId()` con `crypto.randomBytes` (64 bit di entropia); validazione acconto server-side ricalcola totale dalle voci. **Bug fix:** `_ordineFoto.map is not a function` (normalizzazione stringa/array); query LIKE su JSON sostituita con `json_each()`; PUT clienti restituisce dati reali dal DB; `raccogliVoci()` segnala errore se righe senza lavorazione selezionata; rimosso dead code (listener change su hidden input). **UX:** tasto Escape chiude i modali; loading spinner durante caricamento dati; conferma chiusura modale se il form ha modifiche non salvate; `aria-label` su tutti i pulsanti emoji (accessibilità); navigazione mobile con scroll orizzontale. **Modifica stato ordine:** select colorato con icone nel modal modifica (nascosto in creazione); colore sfondo/bordo cambia dinamicamente in base allo stato selezionato. **Codice:** alert() rimpiazzati con toast showError() |
| **1.7.0** | 2026-05-22 | **[Ricerca globale](#ricerca-globale):** barra nell'header con ricerca live tra clienti, ordini e lavorazioni; risultati cliccabili. **Notifiche [dashboard](#dashboard):** alert automatico per ordini fermi da più di 48h con link diretto. **📷 Foto ordine:** upload immagini (max 2MB) con preview e rimozione; salvate come base64 nel DB (vedi [↓ Ordini di Lavoro](#ordini-di-lavoro)). **💰 Gestione acconti/caparre:** campo dedicato nel modal ordine, calcolo resto in tempo reale, info visibile nelle card (vedi [↓ Ordini di Lavoro](#ordini-di-lavoro)). **Backup da interfaccia:** pulsanti in [dashboard](#dashboard) per download .db e export JSON. **Conferma cambio cliente:** in modifica ordine, richiesta conferma se si cambia il cliente associato. **Fix:** prezzo lavorazioni non sovrascrive il prezzo salvato nell'ordine; cognome obbligatorio; bici visibile subito dopo selezione cliente in nuovo ordine; nome bici via JOIN SQL (sempre aggiornato). **API:** `GET /api/backup` e `GET /api/backup/json`. **DB:** nuove colonne `acconto` e `foto` su ordini (migrazione automatica) |
| **1.6.0** | 2026-05-22 | **Aggiornamenti tecnici:** Node.js v22 LTS come versione consigliata (v20 EOL); `better-sqlite3` aggiornato a v12.10.0 (supporto nativo Node.js v22, binari precompilati). **🖨️ Stampa ordine:** pulsante 🖨️ su ogni card ordine — apre finestra di stampa con ricevuta formattata (cliente, bici, lavorazioni, totale, pagamento); compatibile con "Salva come PDF" del browser (vedi [↓ Ordini di Lavoro](#ordini-di-lavoro)). **Fix:** doppia bici nel dropdown modifica ordine (race condition tra due chiamate concorrenti ad `aggiornaBiciSelect`). **UX:** clienti ordinati per cognome → nome (stile rubrica) |
| **1.5.0** | 2026-05-22 | **Qualità e UX:** toast verde di conferma dopo ogni salvataggio/eliminazione; ordinamento [ordini](#ordini-di-lavoro) per urgenza (aperti prima, poi per data); filtro ordini persistente tra sessioni (`sessionStorage`); conferma eliminazione cliente con conteggio ordini e bici; eliminazione lavorazione bloccata se usata in ordini attivi. **Dropdown custom** uniformi per [clienti](#schede-clienti) e [lavorazioni](#catalogo-lavorazioni) (stesso stile su tutti i browser; ri-apertura dropdown su voce già selezionata). **Validazioni:** almeno una lavorazione obbligatoria per ordine; prezzo negativo rifiutato lato server. **Codice:** `server/utils.js` con `newId()` centralizzata; campo `bici` rimosso da clienti (era inutilizzato); data iscrizione cliente visibile nella scheda |
| **1.4.0** | 2026-05-22 | **[Scheda clienti](#schede-clienti):** aggiunto campo `cognome` (form, card, storico, modal bici). **[Ordini](#ordini-di-lavoro):** aggiunto flag `pagato`. **Migrazioni automatiche** al riavvio per entrambe le colonne (`ALTER TABLE` solo se mancanti — dati esistenti intatti). Aggiunta sezione "Procedura di aggiornamento senza perdita dati" |
| **1.3.0** | 2026-05-15 | **Scheda bici** arricchita: tipo bici con menu a tendina (Strada/MTB/E-MTB/E-Bike), ordine campi invertito marca→modello, seriale forcella e seriale ammortizzatore (vedi [↓ Multi-Bici](#multi-bici)). **4 stati [ordine](#ordini-di-lavoro)** con avanzamento sequenziale: accettata → in_lavorazione → pronto → consegnata; `dataUscita` impostata automaticamente alla consegna. **[Dashboard](#dashboard)** senza incasso: 4 card (clienti, in officina, pronte al ritiro, consegnate oggi). Filtro ordini come menu a tendina. `db.js` ripulito (fase sviluppo, no migrazioni) |
| **1.2.0** | 2026-05-15 | [Gestione multi-bici per cliente](#multi-bici): architettura semplificata con `clienteId` diretto sulla bici (rimossa tabella pivot). Select bici dinamico nel form ordine. Bici visibile in card ordini e storico. Fix z-index modali sovrapposti. Fix riapertura storico dopo salvataggio ordine |
| **1.1.0** | 2026-05-14 | [Storico interventi per cliente](#storico-interventi): modal con 5 statistiche, lista completa, ricerca live, modifica rapida. Header con logo Cerica Bikelab |
| **1.0.0** | 2026-05-14 | Prima versione: [clienti](#schede-clienti), [ordini](#ordini-di-lavoro), [catalogo lavorazioni](#catalogo-lavorazioni), SQLite, accesso LAN, ricerca e filtri |

---

*🚲 CicloDesk v1.13.0 — Gestionale per ciclo officina Cerica Bikelab*
