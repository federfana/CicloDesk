const express = require('express');
const path    = require('path');
const os      = require('os');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Route API ──────────────────────────────────────────────────
app.use('/api/clienti',     require('./routes/clienti'));
app.use('/api/ordini',      require('./routes/ordini'));
app.use('/api/lavorazioni', require('./routes/lavorazioni'));
app.use('/api/bici',        require('./routes/bici'));

// ── Backup / Export database ───────────────────────────────────
app.get('/api/backup', (_req, res) => {
  const db = require('./db');
  const tmpPath = path.join(__dirname, '..', 'data', `backup-${Date.now()}.db`);
  try {
    db.backup(tmpPath);
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

app.get('/api/backup/json', (_req, res) => {
  const db = require('./db');
  const data = {
    exportDate: new Date().toISOString(),
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
  const { clienti, bici, lavorazioni, ordini } = req.body;

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

// ── Fallback SPA ───────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Avvio ──────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const nets  = os.networkInterfaces();
  const ipLan = Object.values(nets)
    .flat()
    .find(n => n.family === 'IPv4' && !n.internal)?.address || 'X.X.X.X';

  console.log('\n🚲  CicloDesk avviato!\n');
  console.log(`   💻  PC locale  → http://localhost:${PORT}`);
  console.log(`   📱  Telefono   → http://${ipLan}:${PORT}`);
  console.log('\n   (tutti i dispositivi devono essere sulla stessa rete Wi-Fi)\n');
});
