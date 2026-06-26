const express   = require('express');
const router    = express.Router();
const db        = require('../db');
const { newId, registraMovimento } = require('../utils');

const STATI_VALIDI = ['bozza', 'ordinato', 'in_transito', 'parzialmente_ricevuto', 'ricevuto', 'annullato'];
const STATI_TERMINALI = ['ricevuto', 'annullato'];

function hydratePO(row) {
  if (!row) return null;
  const righe = db.prepare(`
    SELECT r.*,
      c.nome AS componenteNome, c.marca AS componenteMarca,
      c.codice AS componenteCodice, c.giacenza AS componenteGiacenza
    FROM righe_po r
    LEFT JOIN componenti c ON c.id = r.componenteId
    WHERE r.poId = ?
    ORDER BY r.id ASC
  `).all(row.id);
  return { ...row, righe };
}

function nextNumero() {
  const r = db.prepare('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM ordini_fornitore').get();
  return r.n;
}

// ── GET /api/ordini-fornitore ──────────────────────────────────
// Lista PO con conteggio righe e totale aggregati
router.get('/', (req, res) => {
  const { stato, fornitore } = req.query;
  const wh = []; const args = [];
  if (stato)     { wh.push('stato = ?');     args.push(stato); }
  if (fornitore) { wh.push('fornitore = ?'); args.push(fornitore); }
  const where = wh.length ? `WHERE ${wh.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT po.*,
      (SELECT COUNT(*) FROM righe_po WHERE poId = po.id) AS nRighe,
      (SELECT COALESCE(SUM(qtaOrdinata), 0) FROM righe_po WHERE poId = po.id) AS qtaTotOrdinata,
      (SELECT COALESCE(SUM(qtaRicevuta), 0) FROM righe_po WHERE poId = po.id) AS qtaTotRicevuta
    FROM ordini_fornitore po
    ${where}
    ORDER BY po.dataCreazione DESC, po.numero DESC
  `).all(...args);
  res.json(rows);
});

// ── GET /api/ordini-fornitore/riordino/suggerimenti ────────────
// Raggruppa per fornitore: ricambi 🔴 negli ordini cliente (non in cestino, non già su PO)
// + componenti sotto-scorta (giacenza <= soglia_min, esclusi quelli già su PO aperti)
router.get('/riordino/suggerimenti', (_req, res) => {
  // ricambi da ordinare negli ordini cliente
  const ordiniRows = db.prepare(`
    SELECT o.id AS ordineId, o.ricambi,
      TRIM(COALESCE(cl.nome, '') || ' ' || COALESCE(cl.cognome, '')) AS clienteNome
    FROM ordini o
    JOIN clienti cl ON cl.id = o.clienteId
    WHERE o.deletedAt IS NULL AND o.stato <> 'consegnata'
  `).all();

  // componenti su PO non terminali (per non rifare richieste già in corso)
  const compInCorso = new Set(db.prepare(`
    SELECT DISTINCT r.componenteId
    FROM righe_po r
    JOIN ordini_fornitore po ON po.id = r.poId
    WHERE r.componenteId IS NOT NULL AND po.stato NOT IN ('ricevuto', 'annullato')
  `).all().map(r => r.componenteId));

  const gruppi = {}; // fornitore → { ricambiCliente: [], sottoScorta: [] }
  function bucket(fornitore) {
    const key = fornitore || '(Senza fornitore)';
    if (!gruppi[key]) gruppi[key] = { fornitore: key, ricambiCliente: [], sottoScorta: [] };
    return gruppi[key];
  }

  // 1. Ricambi cliente "da_ordinare" senza poId
  ordiniRows.forEach(row => {
    let ricambi;
    try { ricambi = JSON.parse(row.ricambi || '[]'); } catch { ricambi = []; }
    ricambi.forEach((r, idx) => {
      if (r.stato !== 'da_ordinare') return;
      if (r.poId) return; // già su un PO
      let fornitore = '';
      if (r.componenteId) {
        const c = db.prepare('SELECT fornitore FROM componenti WHERE id = ?').get(r.componenteId);
        fornitore = c?.fornitore || '';
      }
      bucket(fornitore).ricambiCliente.push({
        ordineId: row.ordineId,
        clienteNome: row.clienteNome,
        ricambioIdx: idx,
        nome: r.nome,
        qta: r.qta || 1,
        componenteId: r.componenteId || null,
      });
    });
  });

  // 2. Componenti sotto-scorta non ancora su PO in corso
  db.prepare('SELECT * FROM componenti WHERE giacenza <= soglia_min AND soglia_min > 0').all().forEach(c => {
    if (compInCorso.has(c.id)) return;
    const mancanti = Math.max(1, (c.soglia_min || 0) - (c.giacenza || 0));
    bucket(c.fornitore).sottoScorta.push({
      componenteId: c.id,
      nome: c.nome,
      marca: c.marca,
      codice: c.codice,
      giacenza: c.giacenza,
      soglia_min: c.soglia_min,
      qtaSuggerita: mancanti,
      prezzo_acquisto: c.prezzo_acquisto,
    });
  });

  // Ordina e restituisci
  const out = Object.values(gruppi)
    .filter(g => g.ricambiCliente.length || g.sottoScorta.length)
    .sort((a, b) => a.fornitore.localeCompare(b.fornitore));
  res.json(out);
});

// ── GET /api/ordini-fornitore/:id ──────────────────────────────
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ordini_fornitore WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ordine non trovato' });
  res.json(hydratePO(row));
});

// ── POST /api/ordini-fornitore ─────────────────────────────────
// Crea un nuovo PO con le sue righe; se body.righeClienteRefs è fornito,
// aggiorna i ricambi degli ordini cliente collegati con poId/rigaPoId e stato='ordinato'.
// Body: {
//   fornitore, stato?, dataAttesa?, note?,
//   righe: [{ componenteId?, nomeNuovo?, qtaOrdinata, prezzoUnit?, note? }],
//   righeClienteRefs?: [{ ordineId, ricambioIdx, rigaPoIdx }]
// }
router.post('/', (req, res) => {
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const { fornitore, stato = 'bozza', dataAttesa = null, note = '', righe, righeClienteRefs = [] } = body;
  if (!fornitore || !String(fornitore).trim()) return res.status(400).json({ error: 'Fornitore obbligatorio' });
  if (!Array.isArray(righe) || righe.length === 0) return res.status(400).json({ error: 'Almeno una riga obbligatoria' });
  if (!STATI_VALIDI.includes(stato)) return res.status(400).json({ error: 'Stato non valido' });

  const id = newId();
  const numero = nextNumero();
  const dataInvio = (stato === 'ordinato' || stato === 'in_transito') ? new Date().toISOString() : null;

  const insertPO = db.prepare(`
    INSERT INTO ordini_fornitore (id, numero, fornitore, stato, dataInvio, dataAttesa, note, totaleAcquisto)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRiga = db.prepare(`
    INSERT INTO righe_po (id, poId, componenteId, nomeNuovo, qtaOrdinata, prezzoUnit, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCompStmt = db.prepare(`
    INSERT INTO componenti (id, nome, fornitore, prezzo_acquisto)
    VALUES (?, ?, ?, ?)
  `);
  const findCompByNome = db.prepare("SELECT * FROM componenti WHERE LOWER(nome) = LOWER(?)");

  const tx = db.transaction(() => {
    // 1. Crea l'header PO prima delle righe (rispetta FK righe_po.poId)
    insertPO.run(id, numero, String(fornitore).trim(), stato, dataInvio, dataAttesa, String(note || '').trim(), 0);

    const righeIds = [];
    let totale = 0;
    righe.forEach((r) => {
      const qta = parseInt(r.qtaOrdinata) || 0;
      if (qta <= 0) throw new Error('Quantità ordinata non valida');
      const prezzo = Math.max(0, parseFloat(r.prezzoUnit) || 0);

      let compId = r.componenteId || null;
      const nomeNuovo = String(r.nomeNuovo || '').trim();
      // Se componenteId mancante ma nomeNuovo presente, cerca o crea
      if (!compId && nomeNuovo) {
        const exist = findCompByNome.get(nomeNuovo);
        if (exist) {
          compId = exist.id;
        } else {
          compId = newId();
          insertCompStmt.run(compId, nomeNuovo, String(fornitore).trim(), prezzo);
        }
      }

      const rigaId = newId();
      insertRiga.run(rigaId, id, compId, nomeNuovo, qta, prezzo, String(r.note || '').trim());
      righeIds.push(rigaId);
      totale += qta * prezzo;
    });

    // Aggiorna il totale calcolato sull'header
    db.prepare('UPDATE ordini_fornitore SET totaleAcquisto = ? WHERE id = ?').run(totale, id);

    // Aggiorna i ricambi degli ordini cliente collegati
    if (Array.isArray(righeClienteRefs) && righeClienteRefs.length > 0) {
      const updateOrdine = db.prepare('UPDATE ordini SET ricambi = ? WHERE id = ?');
      const getOrdine = db.prepare('SELECT ricambi FROM ordini WHERE id = ?');
      // Raggruppa per ordineId per evitare letture/scritture multiple
      const byOrdine = {};
      righeClienteRefs.forEach(ref => {
        if (!byOrdine[ref.ordineId]) byOrdine[ref.ordineId] = [];
        byOrdine[ref.ordineId].push(ref);
      });
      Object.entries(byOrdine).forEach(([ordineId, refs]) => {
        const row = getOrdine.get(ordineId);
        if (!row) return;
        let ricambi;
        try { ricambi = JSON.parse(row.ricambi || '[]'); } catch { return; }
        refs.forEach(ref => {
          if (ricambi[ref.ricambioIdx]) {
            ricambi[ref.ricambioIdx] = {
              ...ricambi[ref.ricambioIdx],
              stato: 'ordinato',
              poId: id,
              rigaPoId: righeIds[ref.rigaPoIdx] || null,
            };
          }
        });
        updateOrdine.run(JSON.stringify(ricambi), ordineId);
      });
    }
  });

  try {
    tx();
    res.status(201).json(hydratePO(db.prepare('SELECT * FROM ordini_fornitore WHERE id = ?').get(id)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── PUT /api/ordini-fornitore/:id ──────────────────────────────
// Modifica header (stato, date, DDT, note). Righe modificabili solo se in 'bozza'.
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM ordini_fornitore WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Ordine non trovato' });
  if (STATI_TERMINALI.includes(existing.stato)) {
    return res.status(409).json({ error: `Ordine ${existing.stato}: non modificabile` });
  }

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const {
    fornitore      = existing.fornitore,
    stato          = existing.stato,
    dataInvio      = existing.dataInvio,
    dataAttesa     = existing.dataAttesa,
    riferimentoDDT = existing.riferimentoDDT,
    note           = existing.note,
    righe          = null, // se fornito, sostituisce le righe (solo se in bozza)
  } = body;

  if (!STATI_VALIDI.includes(stato)) return res.status(400).json({ error: 'Stato non valido' });

  // Auto-set dataInvio al passaggio a inviato/in_transito
  let dataInvioFinal = dataInvio;
  if ((stato === 'ordinato' || stato === 'in_transito') && !existing.dataInvio) {
    dataInvioFinal = new Date().toISOString();
  }

  const tx = db.transaction(() => {
    // Sostituzione righe (solo se siamo ancora in bozza e righe è fornito)
    if (existing.stato === 'bozza' && Array.isArray(righe)) {
      // Elimina righe precedenti e i loro riferimenti dai ricambi cliente
      const vecchieRighe = db.prepare('SELECT id FROM righe_po WHERE poId = ?').all(id).map(r => r.id);
      if (vecchieRighe.length) {
        // Sgancia eventuali ricambi cliente collegati alle vecchie righe
        const placeholders = vecchieRighe.map(() => '?').join(',');
        const ordiniColl = db.prepare(`
          SELECT DISTINCT id, ricambi FROM ordini
          WHERE ricambi LIKE '%"poId":"${id}"%'
        `).all();
        const updOrdine = db.prepare('UPDATE ordini SET ricambi = ? WHERE id = ?');
        ordiniColl.forEach(o => {
          let r; try { r = JSON.parse(o.ricambi || '[]'); } catch { return; }
          const r2 = r.map(rr => {
            if (rr.poId === id && rr.rigaPoId && vecchieRighe.includes(rr.rigaPoId)) {
              const { poId, rigaPoId, ...rest } = rr;
              return { ...rest, stato: 'da_ordinare' };
            }
            return rr;
          });
          updOrdine.run(JSON.stringify(r2), o.id);
        });
      }
      db.prepare('DELETE FROM righe_po WHERE poId = ?').run(id);

      let totale = 0;
      const insertRiga = db.prepare(`
        INSERT INTO righe_po (id, poId, componenteId, nomeNuovo, qtaOrdinata, prezzoUnit, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      righe.forEach(r => {
        const qta = parseInt(r.qtaOrdinata) || 0;
        if (qta <= 0) throw new Error('Quantità ordinata non valida');
        const prezzo = Math.max(0, parseFloat(r.prezzoUnit) || 0);
        insertRiga.run(newId(), id, r.componenteId || null, String(r.nomeNuovo || '').trim(), qta, prezzo, String(r.note || '').trim());
        totale += qta * prezzo;
      });

      db.prepare(`
        UPDATE ordini_fornitore
        SET fornitore=?, stato=?, dataInvio=?, dataAttesa=?, riferimentoDDT=?, note=?, totaleAcquisto=?
        WHERE id=?
      `).run(
        String(fornitore).trim(), stato, dataInvioFinal, dataAttesa,
        String(riferimentoDDT || '').trim(), String(note || '').trim(), totale, id
      );
    } else {
      // Solo header
      db.prepare(`
        UPDATE ordini_fornitore
        SET fornitore=?, stato=?, dataInvio=?, dataAttesa=?, riferimentoDDT=?, note=?
        WHERE id=?
      `).run(
        String(fornitore).trim(), stato, dataInvioFinal, dataAttesa,
        String(riferimentoDDT || '').trim(), String(note || '').trim(), id
      );
    }
  });

  try {
    tx();
    res.json(hydratePO(db.prepare('SELECT * FROM ordini_fornitore WHERE id = ?').get(id)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── POST /api/ordini-fornitore/:id/ricevi ──────────────────────
// Body: { riferimentoDDT?, righe: [{ rigaId, qtaRicevuta, prezzoUnit? }] }
// Carica la merce in magazzino (transazione), aggiorna stato PO e ricambi clienti.
router.post('/:id/ricevi', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM ordini_fornitore WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Ordine non trovato' });
  if (STATI_TERMINALI.includes(existing.stato)) {
    return res.status(409).json({ error: `Ordine ${existing.stato}: non più ricevibile` });
  }

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const { riferimentoDDT = existing.riferimentoDDT, righe = [] } = body;
  if (!Array.isArray(righe) || righe.length === 0) {
    return res.status(400).json({ error: 'Specificare le quantità ricevute per almeno una riga' });
  }

  const tx = db.transaction(() => {
    const righeDb = db.prepare('SELECT * FROM righe_po WHERE poId = ?').all(id);
    const righeById = Object.fromEntries(righeDb.map(r => [r.id, r]));

    righe.forEach(r => {
      const riga = righeById[r.rigaId];
      if (!riga) throw new Error('Riga PO non trovata: ' + r.rigaId);
      const qtaRicevutaIncr = parseInt(r.qtaRicevuta) || 0;
      if (qtaRicevutaIncr < 0) throw new Error('Quantità ricevuta negativa');
      if (qtaRicevutaIncr === 0) return;
      const nuovaQtaRicevuta = (riga.qtaRicevuta || 0) + qtaRicevutaIncr;
      if (nuovaQtaRicevuta > riga.qtaOrdinata) {
        throw new Error(`Riga "${riga.nomeNuovo || riga.id}": ricevuta (${nuovaQtaRicevuta}) supera ordinata (${riga.qtaOrdinata})`);
      }
      const prezzoFinale = (r.prezzoUnit != null && r.prezzoUnit !== '') ? Math.max(0, parseFloat(r.prezzoUnit) || 0) : riga.prezzoUnit;

      // Carico magazzino (richiede componenteId)
      if (!riga.componenteId) {
        throw new Error(`Riga "${riga.nomeNuovo || riga.id}": non collegata a un componente`);
      }
      const motivo = `ORD-${String(existing.numero).padStart(3, '0')} — ${existing.fornitore}${riferimentoDDT ? ' (DDT ' + String(riferimentoDDT).trim() + ')' : ''}`;
      registraMovimento(db, {
        componenteId: riga.componenteId,
        poId: id,
        tipo: 'carico',
        quantita: qtaRicevutaIncr,
        motivo,
      });
      // Aggiorna prezzo acquisto del componente se diverso (sempre più recente vince)
      if (prezzoFinale !== riga.prezzoUnit) {
        db.prepare('UPDATE componenti SET prezzo_acquisto = ? WHERE id = ?').run(prezzoFinale, riga.componenteId);
      }
      db.prepare('UPDATE righe_po SET qtaRicevuta = ?, prezzoUnit = ? WHERE id = ?')
        .run(nuovaQtaRicevuta, prezzoFinale, riga.id);
    });

    // Ricalcola lo stato del PO e aggiorna i ricambi clienti collegati
    const righeUp = db.prepare('SELECT * FROM righe_po WHERE poId = ?').all(id);
    const tutteRicevute = righeUp.every(r => (r.qtaRicevuta || 0) >= (r.qtaOrdinata || 0));
    const qualcunaRicevuta = righeUp.some(r => (r.qtaRicevuta || 0) > 0);
    const nuovoStato = tutteRicevute ? 'ricevuto' : (qualcunaRicevuta ? 'parzialmente_ricevuto' : existing.stato);

    db.prepare(`
      UPDATE ordini_fornitore
      SET stato=?, dataRicezione=?, riferimentoDDT=?
      WHERE id=?
    `).run(
      nuovoStato,
      tutteRicevute ? new Date().toISOString() : existing.dataRicezione,
      String(riferimentoDDT || '').trim(),
      id
    );

    // Aggiorna ricambi degli ordini cliente: porta a 'ricevuto' quelli collegati a righe complete
    const righeCompleteIds = new Set(righeUp.filter(r => (r.qtaRicevuta || 0) >= (r.qtaOrdinata || 0)).map(r => r.id));
    if (righeCompleteIds.size > 0) {
      const ordiniColl = db.prepare("SELECT id, ricambi FROM ordini WHERE ricambi LIKE ?").all(`%"poId":"${id}"%`);
      const updOrdine = db.prepare('UPDATE ordini SET ricambi = ? WHERE id = ?');
      ordiniColl.forEach(o => {
        let r; try { r = JSON.parse(o.ricambi || '[]'); } catch { return; }
        let dirty = false;
        const r2 = r.map(rr => {
          if (rr.poId === id && rr.rigaPoId && righeCompleteIds.has(rr.rigaPoId) && rr.stato !== 'ricevuto') {
            dirty = true;
            return { ...rr, stato: 'ricevuto' };
          }
          return rr;
        });
        if (dirty) updOrdine.run(JSON.stringify(r2), o.id);
      });
    }
  });

  try {
    tx();
    res.json(hydratePO(db.prepare('SELECT * FROM ordini_fornitore WHERE id = ?').get(id)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── POST /api/ordini-fornitore/:id/annulla ─────────────────────
// Annulla un PO non terminale e ripristina i ricambi cliente collegati a 'da_ordinare'.
router.post('/:id/annulla', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM ordini_fornitore WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Ordine non trovato' });
  if (existing.stato === 'ricevuto') {
    return res.status(409).json({ error: 'Ordine già ricevuto: non annullabile' });
  }
  if (existing.stato === 'annullato') return res.json(hydratePO(existing));

  const tx = db.transaction(() => {
    // Ripristina ricambi cliente
    const ordiniColl = db.prepare("SELECT id, ricambi FROM ordini WHERE ricambi LIKE ?").all(`%"poId":"${id}"%`);
    const updOrdine = db.prepare('UPDATE ordini SET ricambi = ? WHERE id = ?');
    ordiniColl.forEach(o => {
      let r; try { r = JSON.parse(o.ricambi || '[]'); } catch { return; }
      const r2 = r.map(rr => {
        if (rr.poId === id) {
          const { poId, rigaPoId, ...rest } = rr;
          // Mantieni stato 'ricevuto' se già completato, altrimenti torna a 'da_ordinare'
          return { ...rest, stato: rest.stato === 'ricevuto' ? 'ricevuto' : 'da_ordinare' };
        }
        return rr;
      });
      updOrdine.run(JSON.stringify(r2), o.id);
    });
    db.prepare('UPDATE ordini_fornitore SET stato = ? WHERE id = ?').run('annullato', id);
  });

  try {
    tx();
    res.json(hydratePO(db.prepare('SELECT * FROM ordini_fornitore WHERE id = ?').get(id)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── DELETE /api/ordini-fornitore/:id ───────────────────────────
// Elimina definitivamente un PO. Solo bozze o annullati.
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT stato FROM ordini_fornitore WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ordine non trovato' });
  if (!['bozza', 'annullato'].includes(existing.stato)) {
    return res.status(409).json({ error: `Ordine ${existing.stato}: prima annullarlo o impostarlo come bozza` });
  }
  db.prepare('DELETE FROM ordini_fornitore WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
