const express     = require('express');
const router      = express.Router();
const db          = require('../db');
const { newId }   = require('../utils');

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
  const prezzoNum = parseFloat(prezzo) || 0;
  if (prezzoNum < 0) return res.status(400).json({ error: 'Il prezzo non può essere negativo' });

  const id = newId();
  db.prepare(
    'INSERT INTO lavorazioni (id, nome, prezzo, descrizione) VALUES (?, ?, ?, ?)'
  ).run(id, nome.trim(), prezzoNum, descrizione.trim());

  res.status(201).json({ id, nome: nome.trim(), prezzo: prezzoNum, descrizione });
});

// PUT /api/lavorazioni/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, prezzo = 0, descrizione = '' } = req.body;
  const prezzoNum = parseFloat(prezzo) || 0;
  if (prezzoNum < 0) return res.status(400).json({ error: 'Il prezzo non può essere negativo' });

  const existing = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Non trovata' });

  db.prepare(
    'UPDATE lavorazioni SET nome=?, prezzo=?, descrizione=? WHERE id=?'
  ).run(nome?.trim() || existing.nome, prezzoNum, descrizione.trim(), id);

  res.json({ id, nome, prezzo: prezzoNum, descrizione });
});

// DELETE /api/lavorazioni/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { cnt } = db.prepare(
    "SELECT COUNT(*) as cnt FROM ordini WHERE voci LIKE ?"
  ).get(`%"${id}"%`);
  if (cnt > 0) {
    return res.status(409).json({
      error: `Questa lavorazione è presente in ${cnt} ordin${cnt === 1 ? 'e' : 'i'}. Rimuoverla dagli ordini prima di eliminarla.`
    });
  }
  db.prepare('DELETE FROM lavorazioni WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;