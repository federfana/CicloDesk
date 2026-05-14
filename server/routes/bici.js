const express = require('express');
const router  = express.Router();
const db      = require('../db');

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// GET /api/bici
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM bici ORDER BY modello ASC').all();
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
  const { modello } = req.body;
  if (!modello?.trim()) return res.status(400).json({ error: 'Modello obbligatorio' });

  const id        = newId();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO bici (id, modello, createdAt)
    VALUES (?, ?, ?)
  `).run(id, modello.trim(), createdAt);

  res.status(201).json({ id, modello: modello.trim(), createdAt });
});

// PUT /api/bici/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { modello } = req.body;

  const existing = db.prepare('SELECT * FROM bici WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Bici non trovata' });

  db.prepare(`
    UPDATE bici SET modello=? WHERE id=?
  `).run(modello?.trim() || existing.modello, id);

  res.json({ ...existing, modello: modello?.trim() || existing.modello });
});

// DELETE /api/bici/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM bici_clienti WHERE bici_id = ?').run(id);
  db.prepare('DELETE FROM bici WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
