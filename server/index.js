const express = require('express');
const path    = require('path');
const os      = require('os');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Rate Limiter semplice (in-memory) ──────────────────────────
const _rateMap = new Map();
const RATE_WINDOW = 60_000;  // 1 minuto
const RATE_MAX    = 120;     // max richieste per finestra

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  let entry = _rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 0 };
    _rateMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_MAX) {
    return res.status(429).json({ error: 'Troppe richieste, riprova tra un minuto.' });
  }
  next();
}
// Pulizia periodica mappa (ogni 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of _rateMap) {
    if (now - entry.start > RATE_WINDOW) _rateMap.delete(ip);
  }
}, 300_000);

app.use(express.json({ limit: '10mb' }));
app.use('/api', rateLimiter);
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Route API ──────────────────────────────────────────────────
app.use('/api/clienti',     require('./routes/clienti'));
app.use('/api/ordini',      require('./routes/ordini'));
app.use('/api/lavorazioni', require('./routes/lavorazioni'));
app.use('/api/bici',        require('./routes/bici'));

// ── Backup / Export database ───────────────────────────────────
app.get('/api/backup', async (_req, res) => {
  const db = require('./db');
  const tmpPath = path.join(__dirname, '..', 'data', `backup-${Date.now()}.db`);
  try {
    await db.backup(tmpPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Disposition', `attachment; filename="ciclo-backup-${timestamp}.db"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    const stream = fs.createReadStream(tmpPath);
    stream.on('end', () => fs.unlink(tmpPath, () => {}));
    stream.on('error', () => fs.unlink(tmpPath, () => {}));
    stream.pipe(res);
  } catch (e) {
    fs.unlink(tmpPath, () => {});
    res.status(500).json({ error: 'Errore backup: ' + e.message });
  }
});

const crypto = require('crypto');
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

app.post('/api/backup/json', (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password obbligatoria (minimo 4 caratteri).' });
  }
  const db = require('./db');
  const data = {
    exportDate: new Date().toISOString(),
    _auth: hashPassword(password),
    clienti:     db.prepare('SELECT * FROM clienti').all(),
    bici:        db.prepare('SELECT * FROM bici').all(),
    lavorazioni: db.prepare('SELECT * FROM lavorazioni').all(),
    ordini:      db.prepare('SELECT * FROM ordini').all().map(r => ({
      ...r, voci: JSON.parse(r.voci || '[]'), pagato: Boolean(r.pagato), acconto: r.acconto || 0,
    })),
  };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Disposition', `attachment; filename="ciclo-backup-${timestamp}.json"`);
  res.json(data);
});

// ── Import da backup JSON ──────────────────────────────────────
app.post('/api/import/json', (req, res) => {
  const db = require('./db');
  const { password, clienti, bici, lavorazioni, ordini, _auth } = req.body;

  // Verifica password
  if (_auth) {
    if (!password) return res.status(401).json({ error: 'Questo backup è protetto da password.' });
    if (hashPassword(password) !== _auth) return res.status(401).json({ error: 'Password errata.' });
  }

  if (!clienti && !bici && !lavorazioni && !ordini) {
    return res.status(400).json({ error: 'File JSON non valido: nessuna tabella trovata' });
  }

  try {
    const importa = db.transaction(() => {
      // Ordine: prima elimina i dati con FK, poi le tabelle base
      db.prepare('DELETE FROM ordini').run();
      db.prepare('DELETE FROM bici').run();
      db.prepare('DELETE FROM lavorazioni').run();
      db.prepare('DELETE FROM clienti').run();

      // Inserisci clienti
      const insCliente = db.prepare(`INSERT INTO clienti (id, nome, cognome, telefono, email, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      (clienti || []).forEach(c => {
        insCliente.run(c.id, c.nome, c.cognome || '', c.telefono || '', c.email || '', c.note || '', c.createdAt || new Date().toISOString());
      });

      // Inserisci lavorazioni
      const insLav = db.prepare(`INSERT INTO lavorazioni (id, nome, prezzo, descrizione) VALUES (?, ?, ?, ?)`);
      (lavorazioni || []).forEach(l => {
        insLav.run(l.id, l.nome, l.prezzo || 0, l.descrizione || '');
      });

      // Inserisci bici
      const insBici = db.prepare(`INSERT INTO bici (id, clienteId, marca, modello, tipo, colore, seriale_forcella, seriale_ammortizzatore, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      (bici || []).forEach(b => {
        insBici.run(b.id, b.clienteId, b.marca || '', b.modello || '', b.tipo || 'strada', b.colore || '', b.seriale_forcella || '', b.seriale_ammortizzatore || '', b.note || '', b.createdAt || new Date().toISOString());
      });

      // Inserisci ordini
      const insOrdine = db.prepare(`INSERT INTO ordini (id, clienteId, biciId, stato, dataIngresso, dataUscita, note, voci, totale, pagato, acconto, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      (ordini || []).forEach(o => {
        insOrdine.run(
          o.id, o.clienteId, o.biciId || null, o.stato || 'accettata',
          o.dataIngresso || new Date().toISOString(), o.dataUscita || null,
          o.note || '', JSON.stringify(o.voci || []), o.totale || 0,
          o.pagato ? 1 : 0, o.acconto || 0, JSON.stringify(o.foto || [])
        );
      });
    });

    importa();

    const stats = {
      clienti:     (clienti || []).length,
      bici:        (bici || []).length,
      lavorazioni: (lavorazioni || []).length,
      ordini:      (ordini || []).length,
    };
    res.json({ ok: true, importati: stats });
  } catch (e) {
    res.status(500).json({ error: 'Errore durante l\'importazione: ' + e.message });
  }
});

// ── DB Info ────────────────────────────────────────────────────
const DB_PATH     = path.join(__dirname, '..', 'data', 'officina.db');
const SYNC_FOLDER = process.env.SYNC_FOLDER || '';

app.get('/api/db-info', (_req, res) => {
  let lastModified = null, size = 0;
  try {
    const stat = fs.statSync(DB_PATH);
    size = stat.size;
    lastModified = stat.mtime;
    // In WAL mode, le scritture vanno nel file -wal (più recente del .db)
    try {
      const walStat = fs.statSync(DB_PATH + '-wal');
      if (walStat.mtime > stat.mtime) lastModified = walStat.mtime;
    } catch {}
  } catch {}
  res.json({ lastModified: lastModified ? lastModified.toISOString() : null, size, syncEnabled: !!SYNC_FOLDER, lastSync: app.locals._lastSync || null });
});

// ── Fallback SPA ───────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Sync cloud ─────────────────────────────────────────────────

// ── Avvio ──────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  const nets  = os.networkInterfaces();
  const ipLan = Object.values(nets)
    .flat()
    .find(n => n.family === 'IPv4' && !n.internal)?.address || 'X.X.X.X';

  console.log('\n🚲  CicloDesk avviato!\n');
  console.log(`   💻  PC locale  → http://localhost:${PORT}`);
  console.log(`   📱  Telefono   → http://${ipLan}:${PORT}`);
  if (SYNC_FOLDER) {
    console.log(`   ☁️  Sync cloud → ${SYNC_FOLDER} (alla chiusura)`);
  }
  console.log('\n   (tutti i dispositivi devono essere sulla stessa rete Wi-Fi)\n');
});

// ── Chiusura pulita ────────────────────────────────────────────
function shutdown() {
  console.log('\n⏹️  Chiusura CicloDesk...');
  server.close(() => {
    const db = require('./db');
    db.pragma('wal_checkpoint(TRUNCATE)');
    // Sync PRIMA di chiudere il DB (syncToCloud non fa più checkpoint)
    if (SYNC_FOLDER) {
      try {
        if (!fs.existsSync(SYNC_FOLDER)) fs.mkdirSync(SYNC_FOLDER, { recursive: true });
        fs.copyFileSync(DB_PATH, path.join(SYNC_FOLDER, 'officina.db'));
        console.log(`   ☁️  Database salvato su: ${SYNC_FOLDER}`);
      } catch (e) {
        console.error('   ⚠️  Errore sync cloud:', e.message);
      }
    }
    db.close();
    console.log('   Database chiuso correttamente.');
    process.exit(0);
  });
  // Forza chiusura dopo 5 secondi se le connessioni non si chiudono
  setTimeout(() => process.exit(0), 5000);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
