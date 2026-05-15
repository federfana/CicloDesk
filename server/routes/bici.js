const express = require('express');
const router  = express.Router();
const db      = require('../db');

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// GET /api/bici?clienteId=xxx
router.get('/', (req, res) => {
  const { clienteId } = req.query;
  const rows = clienteId
    ? db.prepare('SELECT * FROM bici WHERE clienteId = ? ORDER BY modello ASC').all(clienteId)
    : db.prepare('SELECT * FROM bici ORDER BY modello ASC').all();
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
  const { clienteId, modello, marca = '', colore = '', note = '' } = req.body;
  if (!clienteId) return res.status(400).json({ error: 'clienteId obbligatorio' });
  if (!modello?.trim()) return res.status(400).json({ error: 'Modello obbligatorio' });

  const id        = newId();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO bici (id, clienteId, modello, marca, colore, note, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, clienteId, modello.trim(), marca.trim(), colore.trim(), note.trim(), createdAt);

  res.status(201).json(db.prepare('SELECT * FROM bici WHERE id = ?').get(id));
});

// PUT /api/bici/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM bici WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Bici non trovata' });

  const {
    modello = existing.modello,
    marca   = existing.marca,
    colore  = existing.colore,
    note    = existing.note,
  } = req.body;

  db.prepare(`
    UPDATE bici SET modello=?, marca=?, colore=?, note=? WHERE id=?
  `).run(modello.trim(), marca.trim(), colore.trim(), note.trim(), id);

  res.json(db.prepare('SELECT * FROM bici WHERE id = ?').get(id));
});

// DELETE /api/bici/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  // Scollega la bici dagli ordini senza eliminarli
  db.prepare('UPDATE ordini SET biciId = NULL WHERE biciId = ?').run(id);
  db.prepare('DELETE FROM bici WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
