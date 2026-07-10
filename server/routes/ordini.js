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
    note = '', voci = [],
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
    dataUscita, note.trim(), JSON.stringify(voci), totaleCalcolato, pagatoFinal,
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
    // `totale` non viene letto dal body: è sempre ricalcolato da voci+ricambi
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

  // Scarico automatico magazzino: quando l'ordine entra in fase di lavorazione
  // (in_lavorazione / pronto / consegnata) la giacenza dei ricambi con
  // componenteId collegato viene decrementata. Se l'ordine torna indietro ad
  // 'accettata', o un ricambio viene rimosso, o l'ordine finisce nel cestino,
  // la giacenza viene ricaricata automaticamente. L'intero blocco è atomico.
  const STATI_LAVORATI = ['in_lavorazione', 'pronto', 'consegnata'];
  let ricambiFinali = Array.isArray(ricambi) ? ricambi.map(r => ({ ...r })) : [];
  const magSummary = { scarico: 0, carico: 0, warnings: [] };

  const applicaUpdate = db.transaction(() => {
    // Rileggi ricambi correnti dentro la transazione per evitare race con altri PUT
    const fresh = db.prepare('SELECT ricambi FROM ordini WHERE id = ?').get(id);
    let vecchiRicambi = [];
    try { vecchiRicambi = JSON.parse(fresh?.ricambi || '[]'); } catch { vecchiRicambi = []; }

    // 1) Ricarico dei ricambi rimossi dall'ordine (matching per movimentoId).
    // Usa la quantità effettivamente scaricata (r.qtaPrelevata) per non creare
    // pezzi dal nulla se in fase di scarico c'era stata giacenza insufficiente.
    const movIdsNuovi = new Set(
      ricambiFinali.filter(r => r && r.movimentoId).map(r => r.movimentoId)
    );
    vecchiRicambi.forEach(r => {
      if (r && r.prelevato && r.movimentoId && r.componenteId && !movIdsNuovi.has(r.movimentoId)) {
        const qta = parseInt(r.qtaPrelevata ?? r.qta) || 1;
        if (qta <= 0) return;
        const result = registraMovimento(db, {
          componenteId: r.componenteId,
          ordineId: id,
          tipo: 'carico',
          quantita: qta,
          motivo: 'Ricarico: ricambio rimosso dall\'ordine',
        });
        if (result) magSummary.carico += result.movimento.quantita;
      }
    });

    // 2) Regressione ad 'accettata': ricarico tutti i prelevati e rimuovo il flag
    if (statoFinal === 'accettata') {
      ricambiFinali = ricambiFinali.map(r => {
        if (r && r.prelevato && r.componenteId) {
          const qta = parseInt(r.qtaPrelevata ?? r.qta) || 1;
          if (qta > 0) {
            const result = registraMovimento(db, {
              componenteId: r.componenteId,
              ordineId: id,
              tipo: 'carico',
              quantita: qta,
              motivo: 'Ricarico: ordine tornato ad accettata',
            });
            if (result) magSummary.carico += result.movimento.quantita;
          }
          const { prelevato, movimentoId, qtaPrelevata, ...rest } = r;
          return rest;
        }
        return r;
      });
    }

    // 3) Avanzamento in fase lavorata: scarico i ricambi non ancora prelevati
    if (STATI_LAVORATI.includes(statoFinal)) {
      ricambiFinali = ricambiFinali.map(r => {
        if (r && r.componenteId && !r.prelevato) {
          const qta = parseInt(r.qta) || 1;
          const result = registraMovimento(db, {
            componenteId: r.componenteId,
            ordineId: id,
            tipo: 'scarico',
            quantita: -qta,
            motivo: 'Scarico ordine in lavorazione',
          });
          if (result) {
            const scaricato = -result.movimento.quantita; // quanto realmente scaricato dal magazzino
            magSummary.scarico += scaricato;
            if (result.shortfall !== 0) {
              const mancanti = Math.abs(result.shortfall);
              magSummary.warnings.push(
                `Giacenza insufficiente per "${result.componenteNome}": scaricati ${scaricato} pezz${scaricato === 1 ? 'o' : 'i'} su ${qta} richiest${qta === 1 ? 'o' : 'i'} (${mancanti} mancant${mancanti === 1 ? 'e' : 'i'})`
              );
            }
            return { ...r, prelevato: true, movimentoId: result.movimento.id, qtaPrelevata: scaricato };
          }
        }
        return r;
      });
    }

    // Ricalcolo totale su ricambiFinali (potrebbero essere cambiati oggetti ma non le qta)
    const subRicambiFinal = ricambiFinali.reduce((s, r) => s + ((parseFloat(r.prezzo) || 0) * (parseInt(r.qta) || 1)), 0);
    const totaleFinal = subVoci + subRicambiFinal;

    db.prepare(`
      UPDATE ordini
      SET clienteId=?, biciId=?, stato=?, dataIngresso=?, dataUscita=?, note=?, voci=?, totale=?, pagato=?, acconto=?, foto=?, ricambi=?, commenti=?
      WHERE id=?
    `).run(
      clienteId, biciId || null, statoFinal,
      dataIngresso, dataUscitaFinal,
      note, JSON.stringify(voci), totaleFinal, pagatoFinal,
      parseFloat(acconto) || 0, JSON.stringify(foto), JSON.stringify(ricambiFinali), JSON.stringify(commenti), id
    );
  });
  applicaUpdate();

  const ordineOut = parse(db.prepare('SELECT * FROM ordini WHERE id = ?').get(id));
  res.json({ ...ordineOut, _magazzino: magSummary });
});

// DELETE /api/ordini/:id (soft delete → cestino)
// Ricarica in magazzino tutti i ricambi ancora "prelevati": se poi l'ordine
// viene ripristinato e ri-avanzato, verranno scaricati di nuovo.
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const tx = db.transaction(() => {
    const row = db.prepare('SELECT ricambi FROM ordini WHERE id = ?').get(id);
    if (!row) return;
    let ricambi = [];
    try { ricambi = JSON.parse(row.ricambi || '[]'); } catch { ricambi = []; }
    const ricambiPuliti = ricambi.map(r => {
      if (r && r.prelevato && r.componenteId) {
        const qta = parseInt(r.qtaPrelevata ?? r.qta) || 1;
        if (qta > 0) {
          registraMovimento(db, {
            componenteId: r.componenteId,
            ordineId: id,
            tipo: 'carico',
            quantita: qta,
            motivo: 'Ricarico: ordine spostato nel cestino',
          });
        }
        const { prelevato, movimentoId, qtaPrelevata, ...rest } = r;
        return rest;
      }
      return r;
    });
    db.prepare('UPDATE ordini SET ricambi = ?, deletedAt = ? WHERE id = ?')
      .run(JSON.stringify(ricambiPuliti), new Date().toISOString(), id);
  });
  tx();
  res.json({ ok: true });
});

// POST /api/ordini/:id/ripristina — ripristina dal cestino
// Se lo stato è già una fase "lavorata", riscarica automaticamente il magazzino.
router.post('/:id/ripristina', (req, res) => {
  const { id } = req.params;
  const STATI_LAVORATI = ['in_lavorazione', 'pronto', 'consegnata'];
  const magSummary = { scarico: 0, carico: 0, warnings: [] };
  const tx = db.transaction(() => {
    const row = db.prepare('SELECT stato, ricambi FROM ordini WHERE id = ?').get(id);
    if (!row) return;
    let ricambi = [];
    try { ricambi = JSON.parse(row.ricambi || '[]'); } catch { ricambi = []; }
    let updated = ricambi;
    if (STATI_LAVORATI.includes(row.stato)) {
      updated = ricambi.map(r => {
        if (r && r.componenteId && !r.prelevato) {
          const qta = parseInt(r.qta) || 1;
          const result = registraMovimento(db, {
            componenteId: r.componenteId,
            ordineId: id,
            tipo: 'scarico',
            quantita: -qta,
            motivo: 'Scarico: ordine ripristinato dal cestino',
          });
          if (result) {
            const scaricato = -result.movimento.quantita;
            magSummary.scarico += scaricato;
            if (result.shortfall !== 0) {
              const mancanti = Math.abs(result.shortfall);
              magSummary.warnings.push(
                `Giacenza insufficiente per "${result.componenteNome}": scaricati ${scaricato} pezz${scaricato === 1 ? 'o' : 'i'} su ${qta} richiest${qta === 1 ? 'o' : 'i'} (${mancanti} mancant${mancanti === 1 ? 'e' : 'i'})`
              );
            }
            return { ...r, prelevato: true, movimentoId: result.movimento.id, qtaPrelevata: scaricato };
          }
        }
        return r;
      });
    }
    db.prepare('UPDATE ordini SET ricambi = ?, deletedAt = NULL WHERE id = ?')
      .run(JSON.stringify(updated), id);
  });
  tx();
  res.json({ ok: true, _magazzino: magSummary });
});

// DELETE /api/ordini/:id/permanente — eliminazione definitiva
// Se l'ordine ha ancora ricambi prelevati (raro, es. eliminato senza passare
// dal cestino) li ricaricamo prima di cancellare la riga.
router.delete('/:id/permanente', (req, res) => {
  const { id } = req.params;
  const tx = db.transaction(() => {
    const row = db.prepare('SELECT ricambi FROM ordini WHERE id = ?').get(id);
    if (row) {
      let ricambi = [];
      try { ricambi = JSON.parse(row.ricambi || '[]'); } catch { ricambi = []; }
      ricambi.forEach(r => {
        if (r && r.prelevato && r.componenteId) {
          const qta = parseInt(r.qtaPrelevata ?? r.qta) || 1;
          if (qta > 0) {
            registraMovimento(db, {
              componenteId: r.componenteId,
              ordineId: id,
              tipo: 'carico',
              quantita: qta,
              motivo: 'Ricarico: ordine eliminato definitivamente',
            });
          }
        }
      });
    }
    db.prepare('DELETE FROM ordini WHERE id = ?').run(id);
  });
  tx();
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
