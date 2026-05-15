const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'officina.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS clienti (
    id        TEXT PRIMARY KEY,
    nome      TEXT NOT NULL,
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
    FOREIGN KEY (clienteId) REFERENCES clienti(id)
  );
`);

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

module.exports = db;
