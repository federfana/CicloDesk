const express     = require('express');
const router      = express.Router();
const db          = require('../db');
const { newId }   = require('../utils');

// GET /api/bici?clienteId=xxx
router.get('/', (req, res) => {
  const { clienteId } = req.query;
  const rows = clienteId
    ? db.prepare('SELECT * FROM bici WHERE clienteId = ? ORDER BY marca, modello').all(clienteId)
    : db.prepare('SELECT * FROM bici ORDER BY marca, modello').all();
  res.json(rows);
});

// GET /api/bici/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM bici WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Bici non trovata' });
  res.json(row);
});

// POST /api/bici
router.post('/', (req, res) => {
  const {
    clienteId, marca = '', modello,
    tipo = 'strada', colore = '',
    seriale_forcella = '', seriale_ammortizzatore = '',
    note = '',
  } = req.body;
  if (!clienteId)      return res.status(400).json({ error: 'clienteId obbligatorio' });
  if (!modello?.trim()) return res.status(400).json({ error: 'Modello obbligatorio' });

  const id        = newId();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO bici (id, clienteId, marca, modello, tipo, colore, seriale_forcella, seriale_ammortizzatore, note, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, clienteId,
    marca.trim(), modello.trim(), tipo,
    colore.trim(), seriale_forcella.trim(), seriale_ammortizzatore.trim(),
    note.trim(), createdAt
  );

  res.status(201).json(db.prepare('SELECT * FROM bici WHERE id = ?').get(id));
});

// PUT /api/bici/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM bici WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Bici non trovata' });

  const {
    marca                  = existing.marca,
    modello                = existing.modello,
    tipo                   = existing.tipo,
    colore                 = existing.colore,
    seriale_forcella       = existing.seriale_forcella,
    seriale_ammortizzatore = existing.seriale_ammortizzatore,
    note                   = existing.note,
  } = req.body;

  db.prepare(`
    UPDATE bici
    SET marca=?, modello=?, tipo=?, colore=?, seriale_forcella=?, seriale_ammortizzatore=?, note=?
    WHERE id=?
  `).run(
    (marca || '').trim(), (modello || '').trim(), tipo,
    (colore || '').trim(), (seriale_forcella || '').trim(), (seriale_ammortizzatore || '').trim(),
    (note || '').trim(), id
  );

  res.json(db.prepare('SELECT * FROM bici WHERE id = ?').get(id));
});

// DELETE /api/bici/:id
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE ordini SET biciId = NULL WHERE biciId = ?').run(req.params.id);
  db.prepare('DELETE FROM bici WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
