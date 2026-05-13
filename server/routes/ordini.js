const express = require('express');
const router  = express.Router();
const db      = require('../db');

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function parse(row) {
  if (!row) return null;
  return { ...row, voci: JSON.parse(row.voci || '[]') };
}

// GET /api/ordini
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM ordini ORDER BY dataIngresso DESC').all();
  res.json(rows.map(parse));
});

// GET /api/ordini/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ordini WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ordine non trovato' });
  res.json(parse(row));
});

// POST /api/ordini
router.post('/', (req, res) => {
  const {
    clienteId, stato = 'aperto',
    dataIngresso, dataUscita = null,
    note = '', voci = [], totale = 0,
  } = req.body;

  if (!clienteId) return res.status(400).json({ error: 'clienteId obbligatorio' });

  const id = newId();
  db.prepare(`
    INSERT INTO ordini (id, clienteId, stato, dataIngresso, dataUscita, note, voci, totale)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, clienteId, stato,
    dataIngresso || new Date().toISOString(),
    dataUscita, note.trim(),
    JSON.stringify(voci), totale
  );

  res.status(201).json(parse(
    db.prepare('SELECT * FROM ordini WHERE id = ?').get(id)
  ));
});

// PUT /api/ordini/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM ordini WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Ordine non trovato' });

  const {
    clienteId    = existing.clienteId,
    stato        = existing.stato,
    dataIngresso = existing.dataIngresso,
    dataUscita   = existing.dataUscita,
    note         = existing.note,
    voci         = JSON.parse(existing.voci || '[]'),
    totale       = existing.totale,
  } = req.body;

  db.prepare(`
    UPDATE ordini
    SET clienteId=?, stato=?, dataIngresso=?, dataUscita=?, note=?, voci=?, totale=?
    WHERE id=?
  `).run(clienteId, stato, dataIngresso, dataUscita, note, JSON.stringify(voci), totale, id);

  res.json(parse(db.prepare('SELECT * FROM ordini WHERE id = ?').get(id)));
});

// DELETE /api/ordini/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ordini WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;