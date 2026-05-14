const express = require('express');
const router  = express.Router();
const db      = require('../db');

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// GET /api/bici-clienti/cliente/:clienteId - Tutte le bici (attuali + storiche) di un cliente
router.get('/cliente/:clienteId', (req, res) => {
  const rows = db.prepare(`
    SELECT bc.id, bc.bici_id, bc.cliente_id, bc.data_associazione, bc.data_rimozione, bc.note_associazione,
           b.modello, b.createdAt as bici_createdAt
    FROM bici_clienti bc
    JOIN bici b ON bc.bici_id = b.id
    WHERE bc.cliente_id = ?
    ORDER BY bc.data_associazione DESC
  `).all(req.params.clienteId);
  
  res.json(rows);
});

// GET /api/bici-clienti/bici/:biciId - Tutti i clienti associati a una bici
router.get('/bici/:biciId', (req, res) => {
  const rows = db.prepare(`
    SELECT bc.id, bc.bici_id, bc.cliente_id, bc.data_associazione, bc.data_rimozione, bc.note_associazione,
           c.nome, c.telefono
    FROM bici_clienti bc
    JOIN clienti c ON bc.cliente_id = c.id
    WHERE bc.bici_id = ?
    ORDER BY bc.data_associazione DESC
  `).all(req.params.biciId);
  
  res.json(rows);
});

// POST /api/bici-clienti - Associa una bici a un cliente
router.post('/', (req, res) => {
  const { bici_id, cliente_id, note_associazione = '' } = req.body;
  
  if (!bici_id) return res.status(400).json({ error: 'bici_id obbligatorio' });
  if (!cliente_id) return res.status(400).json({ error: 'cliente_id obbligatorio' });

  // Verifica che bici e cliente esistano
  const bici = db.prepare('SELECT * FROM bici WHERE id = ?').get(bici_id);
  if (!bici) return res.status(404).json({ error: 'Bici non trovata' });

  const cliente = db.prepare('SELECT * FROM clienti WHERE id = ?').get(cliente_id);
  if (!cliente) return res.status(404).json({ error: 'Cliente non trovato' });

  const id = newId();
  const data_associazione = new Date().toISOString();

  db.prepare(`
    INSERT INTO bici_clienti (id, bici_id, cliente_id, data_associazione, note_associazione)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, bici_id, cliente_id, data_associazione, note_associazione.trim());

  res.status(201).json({ 
    id, bici_id, cliente_id, data_associazione, 
    data_rimozione: null, note_associazione: note_associazione.trim(),
    modello: bici.modello
  });
});

// DELETE /api/bici-clienti/:id - Rimuovi associazione (soft delete)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const existing = db.prepare('SELECT * FROM bici_clienti WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Associazione non trovata' });

  const data_rimozione = new Date().toISOString();
  
  db.prepare(`
    UPDATE bici_clienti SET data_rimozione = ? WHERE id = ?
  `).run(data_rimozione, id);

  res.json({ ok: true, data_rimozione });
});

module.exports = router;
