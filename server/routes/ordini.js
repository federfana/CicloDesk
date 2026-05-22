const express     = require('express');
const router      = express.Router();
const db          = require('../db');
const { newId }   = require('../utils');

const STATI_VALIDI = ['accettata', 'in_lavorazione', 'pronto', 'consegnata'];

function parse(row) {
  if (!row) return null;
  return { ...row, voci: JSON.parse(row.voci || '[]'), pagato: Boolean(row.pagato) };
}

// GET /api/ordini
router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT * FROM ordini
    ORDER BY
      CASE stato
        WHEN 'accettata'      THEN 0
        WHEN 'in_lavorazione' THEN 1
        WHEN 'pronto'         THEN 2
        WHEN 'consegnata'     THEN 3
        ELSE 4
      END ASC,
      dataIngresso DESC
  `).all();
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
    clienteId, biciId = null,
    stato = 'accettata',
    dataIngresso, dataUscita = null,
    note = '', voci = [], totale = 0,
    pagato = false,
  } = req.body;

  if (!clienteId) return res.status(400).json({ error: 'clienteId obbligatorio' });

  const statoFinal  = STATI_VALIDI.includes(stato) ? stato : 'accettata';
  const pagatoFinal = pagato ? 1 : 0;
  const id = newId();

  db.prepare(`
    INSERT INTO ordini (id, clienteId, biciId, stato, dataIngresso, dataUscita, note, voci, totale, pagato)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, clienteId, biciId || null, statoFinal,
    dataIngresso || new Date().toISOString(),
    dataUscita, note.trim(), JSON.stringify(voci), totale, pagatoFinal
  );

  res.status(201).json(parse(db.prepare('SELECT * FROM ordini WHERE id = ?').get(id)));
});

// PUT /api/ordini/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM ordini WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Ordine non trovato' });

  const {
    clienteId    = existing.clienteId,
    biciId       = existing.biciId,
    stato        = existing.stato,
    dataIngresso = existing.dataIngresso,
    dataUscita   = existing.dataUscita,
    note         = existing.note,
    voci         = JSON.parse(existing.voci || '[]'),
    totale       = existing.totale,
    pagato       = existing.pagato,
  } = req.body;

  const statoFinal  = STATI_VALIDI.includes(stato) ? stato : existing.stato;
  const pagatoFinal = pagato ? 1 : 0;
  // Imposta dataUscita solo quando si consegna
  const dataUscitaFinal = statoFinal === 'consegnata'
    ? (dataUscita || new Date().toISOString())
    : null;

  db.prepare(`
    UPDATE ordini
    SET clienteId=?, biciId=?, stato=?, dataIngresso=?, dataUscita=?, note=?, voci=?, totale=?, pagato=?
    WHERE id=?
  `).run(
    clienteId, biciId || null, statoFinal,
    dataIngresso, dataUscitaFinal,
    note, JSON.stringify(voci), totale, pagatoFinal, id
  );

  res.json(parse(db.prepare('SELECT * FROM ordini WHERE id = ?').get(id)));
});

// DELETE /api/ordini/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ordini WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
