const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// Crea cartella /data se non esiste
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'officina.db'));

// Performance e integrità referenziale
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS clienti (
    id          TEXT PRIMARY KEY,
    nome        TEXT NOT NULL,
    telefono    TEXT DEFAULT '',
    email       TEXT DEFAULT '',
    bici        TEXT DEFAULT '',
    note        TEXT DEFAULT '',
    createdAt   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lavorazioni (
    id          TEXT PRIMARY KEY,
    nome        TEXT NOT NULL,
    prezzo      REAL DEFAULT 0,
    descrizione TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS ordini (
    id           TEXT PRIMARY KEY,
    clienteId    TEXT NOT NULL,
    stato        TEXT DEFAULT 'aperto',
    dataIngresso TEXT,
    dataUscita   TEXT,
    note         TEXT DEFAULT '',
    voci         TEXT DEFAULT '[]',
    totale       REAL DEFAULT 0,
    biciId       TEXT DEFAULT NULL,
    FOREIGN KEY (clienteId) REFERENCES clienti(id),
    FOREIGN KEY (biciId) REFERENCES bici(id)
  );

  CREATE TABLE IF NOT EXISTS bici (
    id            TEXT PRIMARY KEY,
    modello       TEXT NOT NULL,
    numero_seriale TEXT DEFAULT '',
    tipo          TEXT DEFAULT '',
    anno          INTEGER DEFAULT NULL,
    note          TEXT DEFAULT '',
    createdAt     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bici_clienti (
    id                  TEXT PRIMARY KEY,
    bici_id             TEXT NOT NULL,
    cliente_id          TEXT NOT NULL,
    data_associazione   TEXT DEFAULT (datetime('now')),
    data_rimozione      TEXT DEFAULT NULL,
    note_associazione   TEXT DEFAULT '',
    FOREIGN KEY (bici_id) REFERENCES bici(id),
    FOREIGN KEY (cliente_id) REFERENCES clienti(id)
  );

  CREATE INDEX IF NOT EXISTS idx_bici_clienti_cliente ON bici_clienti(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_bici_clienti_bici ON bici_clienti(bici_id);
  CREATE INDEX IF NOT EXISTS idx_ordini_bici ON ordini(biciId);
`);

// ── Seed lavorazioni default (solo se tabella vuota) ───────────
const { n } = db.prepare('SELECT COUNT(*) as n FROM lavorazioni').get();
if (n === 0) {
  const ins = db.prepare(
    'INSERT INTO lavorazioni (id, nome, prezzo, descrizione) VALUES (?, ?, ?, ?)'
  );
  const seed = db.transaction(rows => rows.forEach(r => ins.run(...r)));
  seed([
    ['lav_001', 'Tagliando completo',           35.00, 'Pulizia, lubrificazione, regolazione freni e cambio'],
    ['lav_002', 'Riparazione foratura',          10.00, "Sostituzione camera d'aria"],
    ['lav_003', 'Regolazione freni',             12.00, 'Registrazione pastiglie e cavi'],
    ['lav_004', 'Regolazione cambio',            12.00, 'Regolazione deragliatori ant. e post.'],
    ['lav_005', 'Sostituzione cavo freno',        8.00, ''],
    ['lav_006', 'Sostituzione cavo cambio',       8.00, ''],
    ['lav_007', 'Centratura ruota',              15.00, ''],
    ['lav_008', 'Sostituzione pattini freno',     6.00, ''],
    ['lav_009', 'Pulizia e sgrassaggio',         20.00, 'Lavaggio completo bici'],
    ['lav_010', 'Sostituzione catena',           18.00, 'Include catena standard'],
    ['lav_011', 'Sostituzione copertone',        14.00, 'Senza costo ricambio'],
    ['lav_012', 'Revisione movimento centrale',  22.00, ''],
    ['lav_013', 'Altra lavorazione',              0.00, 'Inserire dettaglio nelle note'],
  ]);
  console.log('✅  Lavorazioni default inserite.');
}

module.exports = db;
