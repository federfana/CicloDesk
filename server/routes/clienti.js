const express = require('express');
const router  = express.Router();
const db      = require('../db');

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// GET /api/clienti
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM clienti ORDER BY nome ASC').all();
  res.json(rows);
});

// GET /api/clienti/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM clienti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Cliente non trovato' });
  res.json(row);
});

// POST /api/clienti
router.post('/', (req, res) => {
  const { nome, telefono = '', email = '', bici = '', note = '' } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' });

  const id        = newId();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO clienti (id, nome, telefono, email, bici, note, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, nome.trim(), telefono.trim(), email.trim(), bici.trim(), note.trim(), createdAt);

  res.status(201).json({ id, nome: nome.trim(), telefono, email, bici, note, createdAt });
});

// PUT /api/clienti/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, telefono = '', email = '', bici = '', note = '' } = req.body;

  const existing = db.prepare('SELECT * FROM clienti WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Cliente non trovato' });

  db.prepare(`
    UPDATE clienti SET nome=?, telefono=?, email=?, bici=?, note=? WHERE id=?
  `).run(nome?.trim() || existing.nome, telefono.trim(), email.trim(), bici.trim(), note.trim(), id);

  res.json({ ...existing, nome, telefono, email, bici, note });
});

// DELETE /api/clienti/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM ordini  WHERE clienteId = ?').run(id);
  db.prepare('DELETE FROM clienti WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
