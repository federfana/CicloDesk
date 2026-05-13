const express = require('express');
const router  = express.Router();
const db      = require('../db');

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// GET /api/lavorazioni
router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM lavorazioni ORDER BY nome ASC').all());
});

// GET /api/lavorazioni/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Non trovata' });
  res.json(row);
});

// POST /api/lavorazioni
router.post('/', (req, res) => {
  const { nome, prezzo = 0, descrizione = '' } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' });

  const id = newId();
  db.prepare(
    'INSERT INTO lavorazioni (id, nome, prezzo, descrizione) VALUES (?, ?, ?, ?)'
  ).run(id, nome.trim(), parseFloat(prezzo) || 0, descrizione.trim());

  res.status(201).json({ id, nome: nome.trim(), prezzo, descrizione });
});

// PUT /api/lavorazioni/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, prezzo = 0, descrizione = '' } = req.body;

  const existing = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Non trovata' });

  db.prepare(
    'UPDATE lavorazioni SET nome=?, prezzo=?, descrizione=? WHERE id=?'
  ).run(nome?.trim() || existing.nome, parseFloat(prezzo) || 0, descrizione.trim(), id);

  res.json({ id, nome, prezzo, descrizione });
});

// DELETE /api/lavorazioni/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM lavorazioni WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;