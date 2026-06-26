const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const DB_PATH = path.join(dataDir, 'officina.db');

// Rimuovi WAL/SHM orfani se il DB è stato sostituito manualmente
// (evita corruzione quando si importa un .db da un'altra macchina)
// Elimina solo se il .db è più recente del WAL (= il .db è stato sostituito)
const walPath = DB_PATH + '-wal';
const shmPath = DB_PATH + '-shm';
if (fs.existsSync(walPath) && fs.existsSync(DB_PATH)) {
  const dbMtime  = fs.statSync(DB_PATH).mtimeMs;
  const walMtime = fs.statSync(walPath).mtimeMs;
  if (dbMtime > walMtime) {
    try { fs.unlinkSync(walPath); } catch (e) { /* ignore */ }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch (e) { /* ignore */ }
    }
    console.log('🧹  WAL/SHM orfani rimossi (DB sostituito).');
  }
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────────
db.exec(`
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
    tipo                   TEXT DEFAULT 'strada',
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
    stato        TEXT DEFAULT 'accettata',
    dataIngresso TEXT,
    dataUscita   TEXT,
    note         TEXT DEFAULT '',
    voci         TEXT DEFAULT '[]',
    totale       REAL DEFAULT 0,
    pagato       INTEGER DEFAULT 0,
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
    soglia_min      INTEGER DEFAULT 1,
    note            TEXT DEFAULT '',
    createdAt       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS movimenti_magazzino (
    id           TEXT PRIMARY KEY,
    componenteId TEXT NOT NULL,
    ordineId     TEXT DEFAULT NULL,
    tipo         TEXT NOT NULL,
    quantita     INTEGER NOT NULL,
    giacenzaPost INTEGER DEFAULT 0,
    motivo       TEXT DEFAULT '',
    timestamp    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ordini_fornitore (
    id              TEXT PRIMARY KEY,
    numero          INTEGER UNIQUE,
    fornitore       TEXT NOT NULL,
    stato           TEXT NOT NULL DEFAULT 'bozza',
    dataCreazione   TEXT DEFAULT (datetime('now')),
    dataInvio       TEXT DEFAULT NULL,
    dataAttesa      TEXT DEFAULT NULL,
    dataRicezione   TEXT DEFAULT NULL,
    riferimentoDDT  TEXT DEFAULT '',
    totaleAcquisto  REAL DEFAULT 0,
    note            TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS righe_po (
    id            TEXT PRIMARY KEY,
    poId          TEXT NOT NULL,
    componenteId  TEXT DEFAULT NULL,
    nomeNuovo     TEXT DEFAULT '',
    qtaOrdinata   INTEGER NOT NULL,
    qtaRicevuta   INTEGER DEFAULT 0,
    prezzoUnit    REAL DEFAULT 0,
    note          TEXT DEFAULT '',
    FOREIGN KEY (poId) REFERENCES ordini_fornitore(id) ON DELETE CASCADE
  );
`);

// ── Migrazioni (colonne aggiunte dopo il deploy iniziale) ────────
const colonneClienti = db.prepare('PRAGMA table_info(clienti)').all().map(r => r.name);
if (!colonneClienti.includes('cognome')) {
  db.exec("ALTER TABLE clienti ADD COLUMN cognome TEXT DEFAULT ''");
}

const colonneOrdini = db.prepare('PRAGMA table_info(ordini)').all().map(r => r.name);
if (!colonneOrdini.includes('pagato')) {
  db.exec('ALTER TABLE ordini ADD COLUMN pagato INTEGER DEFAULT 0');
}
if (!colonneOrdini.includes('acconto')) {
  db.exec('ALTER TABLE ordini ADD COLUMN acconto REAL DEFAULT 0');
}
if (!colonneOrdini.includes('foto')) {
  db.exec("ALTER TABLE ordini ADD COLUMN foto TEXT DEFAULT '[]'");
}
if (!colonneOrdini.includes('deletedAt')) {
  db.exec("ALTER TABLE ordini ADD COLUMN deletedAt TEXT DEFAULT NULL");
}
if (!colonneOrdini.includes('ricambi')) {
  db.exec("ALTER TABLE ordini ADD COLUMN ricambi TEXT DEFAULT '[]'");
}
if (!colonneOrdini.includes('commenti')) {
  db.exec("ALTER TABLE ordini ADD COLUMN commenti TEXT DEFAULT '[]'");
}

// ── Seed lavorazioni default (solo se tabella vuota) ───────────
const { n } = db.prepare('SELECT COUNT(*) as n FROM lavorazioni').get();
if (n === 0) {
  const ins  = db.prepare('INSERT INTO lavorazioni (id,nome,prezzo,descrizione) VALUES (?,?,?,?)');
  const seed = db.transaction(rows => rows.forEach(r => ins.run(...r)));
  seed([
    ['lav_001', 'Tagliando completo',          35.00, 'Pulizia, lubrificazione, regolazione freni e cambio'],
    ['lav_002', 'Riparazione foratura',         10.00, "Sostituzione camera d'aria"],
    ['lav_003', 'Regolazione freni',            12.00, 'Registrazione pastiglie e cavi'],
    ['lav_004', 'Regolazione cambio',           12.00, 'Regolazione deragliatori ant. e post.'],
    ['lav_005', 'Sostituzione cavo freno',       8.00, ''],
    ['lav_006', 'Sostituzione cavo cambio',      8.00, ''],
    ['lav_007', 'Centratura ruota',             15.00, ''],
    ['lav_008', 'Sostituzione pattini freno',    6.00, ''],
    ['lav_009', 'Pulizia e sgrassaggio',        20.00, 'Lavaggio completo bici'],
    ['lav_010', 'Sostituzione catena',          18.00, 'Include catena standard'],
    ['lav_011', 'Sostituzione copertone',       14.00, 'Senza costo ricambio'],
    ['lav_012', 'Revisione movimento centrale', 22.00, ''],
    ['lav_013', 'Altra lavorazione',             0.00, 'Inserire dettaglio nelle note'],
  ]);
  console.log('✅  Lavorazioni default inserite.');
}

// ── Indici per performance ──────────────────────────────────────
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_bici_clienteId ON bici(clienteId);
  CREATE INDEX IF NOT EXISTS idx_ordini_clienteId ON ordini(clienteId);
  CREATE INDEX IF NOT EXISTS idx_ordini_stato ON ordini(stato);
  CREATE INDEX IF NOT EXISTS idx_ordini_biciId ON ordini(biciId);
  CREATE INDEX IF NOT EXISTS idx_righe_po_poId ON righe_po(poId);
  CREATE INDEX IF NOT EXISTS idx_righe_po_componenteId ON righe_po(componenteId);
  CREATE INDEX IF NOT EXISTS idx_ordini_fornitore_stato ON ordini_fornitore(stato);
`);

// ── Migrazione movimenti_magazzino: colonna poId per link a PO ─
const colonneMov = db.prepare('PRAGMA table_info(movimenti_magazzino)').all().map(r => r.name);
if (!colonneMov.includes('poId')) {
  db.exec('ALTER TABLE movimenti_magazzino ADD COLUMN poId TEXT DEFAULT NULL');
}

module.exports = db;

