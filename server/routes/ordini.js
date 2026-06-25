const express     = require('express');
const router      = express.Router();
const db          = require('../db');
const { newId, registraMovimento }   = require('../utils');

const STATI_VALIDI = ['accettata', 'in_lavorazione', 'pronto', 'consegnata'];

function parse(row) {
  if (!row) return null;
  return { ...row, voci: JSON.parse(row.voci || '[]'), pagato: Boolean(row.pagato), acconto: row.acconto || 0, foto: JSON.parse(row.foto || '[]'), ricambi: JSON.parse(row.ricambi || '[]'), commenti: JSON.parse(row.commenti || '[]') };
}

// GET /api/ordini
router.get('/', (req, res) => {
  const { limit, offset, stato, clienteId } = req.query;

  let sql = `
    SELECT o.*,
      TRIM(COALESCE(b.marca, '') || CASE WHEN b.marca != '' AND b.modello != '' THEN ' ' ELSE '' END || COALESCE(b.modello, '')) AS biciNome
    FROM ordini o
    LEFT JOIN bici b ON b.id = o.biciId
  `;
  const conditions = [];
  const params = [];

  // Escludi ordini nel cestino
  conditions.push('o.deletedAt IS NULL');

  if (stato) {
    conditions.push('o.stato = ?');
    params.push(stato);
  }
  if (clienteId) {
    conditions.push('o.clienteId = ?');
    params.push(clienteId);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

  sql += `
    ORDER BY
      CASE o.stato
        WHEN 'accettata'      THEN 0
        WHEN 'in_lavorazione' THEN 1
        WHEN 'pronto'         THEN 2
        WHEN 'consegnata'     THEN 3
        ELSE 4
      END ASC,
      o.dataIngresso DESC
  `;

  // Conta totale prima di paginare
  let total = null;
  if (limit) {
    const countSql = `SELECT COUNT(*) as cnt FROM ordini o` +
      (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '');
    total = db.prepare(countSql).get(...params).cnt;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10) || 50, parseInt(offset, 10) || 0);
  }

  const rows = db.prepare(sql).all(...params);
  const data = rows.map(parse);

  if (total !== null) {
    res.json({ data, total, limit: parseInt(limit, 10) || 50, offset: parseInt(offset, 10) || 0 });
  } else {
    res.json(data);
  }
});

// GET /api/ordini/cestino — ordini eliminati (ultimi 30 giorni)
router.get('/cestino/lista', (_req, res) => {
  const rows = db.prepare(`
    SELECT o.*,
      TRIM(COALESCE(c.nome, '') || ' ' || COALESCE(c.cognome, '')) AS clienteNome
    FROM ordini o
    LEFT JOIN clienti c ON c.id = o.clienteId
    WHERE o.deletedAt IS NOT NULL
    ORDER BY o.deletedAt DESC
  `).all();
  res.json(rows.map(parse));
});

// GET /api/ordini/:id
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT o.*,
      TRIM(COALESCE(b.marca, '') || CASE WHEN b.marca != '' AND b.modello != '' THEN ' ' ELSE '' END || COALESCE(b.modello, '')) AS biciNome
    FROM ordini o
    LEFT JOIN bici b ON b.id = o.biciId
    WHERE o.id = ?
  `).get(req.params.id);
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
    pagato = false, acconto = 0, foto = [], ricambi = [], commenti = [],
  } = req.body;

  if (!clienteId) return res.status(400).json({ error: 'clienteId obbligatorio' });
  if (!Array.isArray(voci) || voci.length === 0) return res.status(400).json({ error: 'Almeno una lavorazione obbligatoria' });
  const subVoci = voci.reduce((s, v) => s + (parseFloat(v.prezzo) || 0), 0);
  const subRicambi = (Array.isArray(ricambi) ? ricambi : []).reduce((s, r) => s + ((parseFloat(r.prezzo) || 0) * (parseInt(r.qta) || 1)), 0);
  const totaleCalcolato = subVoci + subRicambi;
  if (parseFloat(acconto) > totaleCalcolato) return res.status(400).json({ error: 'Acconto non può superare il totale' });

  const statoFinal  = STATI_VALIDI.includes(stato) ? stato : 'accettata';
  const pagatoFinal = pagato ? 1 : 0;
  const id = newId();

  db.prepare(`
    INSERT INTO ordini (id, clienteId, biciId, stato, dataIngresso, dataUscita, note, voci, totale, pagato, acconto, foto, ricambi, commenti)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, clienteId, biciId || null, statoFinal,
    dataIngresso || new Date().toISOString(),
    dataUscita, note.trim(), JSON.stringify(voci), totale, pagatoFinal,
    parseFloat(acconto) || 0, JSON.stringify(foto), JSON.stringify(ricambi), JSON.stringify(commenti)
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
    acconto      = existing.acconto || 0,
    foto         = JSON.parse(existing.foto || '[]'),
    ricambi      = JSON.parse(existing.ricambi || '[]'),
    commenti     = JSON.parse(existing.commenti || '[]'),
  } = req.body;

  const statoFinal  = STATI_VALIDI.includes(stato) ? stato : existing.stato;
  const pagatoFinal = pagato ? 1 : 0;
  if (!Array.isArray(voci) || voci.length === 0) return res.status(400).json({ error: 'Almeno una lavorazione obbligatoria' });
  const subVoci = voci.reduce((s, v) => s + (parseFloat(v.prezzo) || 0), 0);
  const subRicambi = (Array.isArray(ricambi) ? ricambi : []).reduce((s, r) => s + ((parseFloat(r.prezzo) || 0) * (parseInt(r.qta) || 1)), 0);
  const totaleCalcolato = subVoci + subRicambi;
  if (parseFloat(acconto) > totaleCalcolato) return res.status(400).json({ error: 'Acconto non può superare il totale' });
  // Imposta dataUscita solo quando si consegna; la preserva se torna indietro
  let dataUscitaFinal;
  if (statoFinal === 'consegnata') {
    dataUscitaFinal = dataUscita || existing.dataUscita || new Date().toISOString();
  } else {
    // Preserva la data di consegna storica (non cancellare se era consegnata prima)
    dataUscitaFinal = existing.dataUscita || null;
  }

  // Scarico automatico magazzino: alla consegna, per ogni ricambio collegato a un componente
  // e non ancora prelevato, decrementa la giacenza e registra il movimento.
  let ricambiFinali = Array.isArray(ricambi) ? [...ricambi] : [];
  if (statoFinal === 'consegnata' && existing.stato !== 'consegnata') {
    ricambiFinali = ricambiFinali.map(r => {
      if (r && r.componenteId && !r.prelevato) {
        const qta = parseInt(r.qta) || 1;
        const result = registraMovimento(db, {
          componenteId: r.componenteId,
          ordineId: id,
          tipo: 'scarico',
          quantita: -qta,
          motivo: `Scarico ordine consegnato`,
        });
        if (result) {
          return { ...r, prelevato: true, movimentoId: result.movimento.id };
        }
      }
      return r;
    });
  }

  db.prepare(`
    UPDATE ordini
    SET clienteId=?, biciId=?, stato=?, dataIngresso=?, dataUscita=?, note=?, voci=?, totale=?, pagato=?, acconto=?, foto=?, ricambi=?, commenti=?
    WHERE id=?
  `).run(
    clienteId, biciId || null, statoFinal,
    dataIngresso, dataUscitaFinal,
    note, JSON.stringify(voci), totale, pagatoFinal,
    parseFloat(acconto) || 0, JSON.stringify(foto), JSON.stringify(ricambiFinali), JSON.stringify(commenti), id
  );

  res.json(parse(db.prepare('SELECT * FROM ordini WHERE id = ?').get(id)));
});

// DELETE /api/ordini/:id (soft delete → cestino)
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE ordini SET deletedAt = ? WHERE id = ?').run(new Date().toISOString(), req.params.id);
  res.json({ ok: true });
});

// POST /api/ordini/:id/ripristina — ripristina dal cestino
router.post('/:id/ripristina', (req, res) => {
  db.prepare('UPDATE ordini SET deletedAt = NULL WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// DELETE /api/ordini/:id/permanente — eliminazione definitiva
router.delete('/:id/permanente', (req, res) => {
  db.prepare('DELETE FROM ordini WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/ordini/:id/commenti — aggiunge un commento alla timeline
router.post('/:id/commenti', (req, res) => {
  const { testo } = req.body;
  if (!testo || !testo.trim()) return res.status(400).json({ error: 'Testo obbligatorio' });
  const row = db.prepare('SELECT commenti FROM ordini WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ordine non trovato' });
  const commenti = JSON.parse(row.commenti || '[]');
  commenti.push({ id: newId(), testo: testo.trim(), timestamp: new Date().toISOString() });
  db.prepare('UPDATE ordini SET commenti = ? WHERE id = ?').run(JSON.stringify(commenti), req.params.id);
  res.json({ ok: true, commenti });
});

// DELETE /api/ordini/:id/commenti/:commentoId — rimuove un commento
router.delete('/:id/commenti/:commentoId', (req, res) => {
  const row = db.prepare('SELECT commenti FROM ordini WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ordine non trovato' });
  const commenti = JSON.parse(row.commenti || '[]').filter(c => c.id !== req.params.commentoId);
  db.prepare('UPDATE ordini SET commenti = ? WHERE id = ?').run(JSON.stringify(commenti), req.params.id);
  res.json({ ok: true, commenti });
});

module.exports = router;
