const express   = require('express');
const router    = express.Router();
const db        = require('../db');
const { newId, registraMovimento } = require('../utils');

// GET /api/componenti
router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM componenti ORDER BY categoria ASC, nome ASC').all());
});

// GET /api/componenti/sotto-soglia — quelli da riordinare
router.get('/sotto-soglia/lista', (_req, res) => {
  res.json(db.prepare('SELECT * FROM componenti WHERE giacenza <= soglia_min ORDER BY giacenza ASC, nome ASC').all());
});

// GET /api/componenti/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM componenti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Componente non trovato' });
  res.json(row);
});

// POST /api/componenti
router.post('/', (req, res) => {
  const {
    nome, categoria = '', marca = '', codice = '',
    prezzo_acquisto = 0, prezzo_vendita = 0,
    fornitore = '', giacenza = 0, soglia_min = 1, note = '',
  } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' });

  const id = newId();
  db.prepare(`
    INSERT INTO componenti (id, nome, categoria, marca, codice, prezzo_acquisto, prezzo_vendita, fornitore, giacenza, soglia_min, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, nome.trim(), categoria.trim(), marca.trim(), codice.trim(),
    parseFloat(prezzo_acquisto) || 0, parseFloat(prezzo_vendita) || 0,
    fornitore.trim(), parseInt(giacenza) || 0, parseInt(soglia_min) || 0, note.trim()
  );

  res.status(201).json(db.prepare('SELECT * FROM componenti WHERE id = ?').get(id));
});

// PUT /api/componenti/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM componenti WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Componente non trovato' });

  const {
    nome            = existing.nome,
    categoria       = existing.categoria,
    marca           = existing.marca,
    codice          = existing.codice,
    prezzo_acquisto = existing.prezzo_acquisto,
    prezzo_vendita  = existing.prezzo_vendita,
    fornitore       = existing.fornitore,
    giacenza        = existing.giacenza,
    soglia_min      = existing.soglia_min,
    note            = existing.note,
  } = req.body;

  if (!nome?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' });

  db.prepare(`
    UPDATE componenti
    SET nome=?, categoria=?, marca=?, codice=?, prezzo_acquisto=?, prezzo_vendita=?, fornitore=?, giacenza=?, soglia_min=?, note=?
    WHERE id=?
  `).run(
    nome.trim(), (categoria || '').trim(), (marca || '').trim(), (codice || '').trim(),
    parseFloat(prezzo_acquisto) || 0, parseFloat(prezzo_vendita) || 0,
    (fornitore || '').trim(), parseInt(giacenza) || 0, parseInt(soglia_min) || 0,
    (note || '').trim(), id
  );

  res.json(db.prepare('SELECT * FROM componenti WHERE id = ?').get(id));
});

// POST /api/componenti/:id/giacenza — regola giacenza (+1/-1/set)
router.post('/:id/giacenza', (req, res) => {
  const { delta, set, motivo } = req.body;
  const row = db.prepare('SELECT * FROM componenti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Componente non trovato' });

  if (typeof set === 'number') {
    const nuova = Math.max(0, parseInt(set) || 0);
    const diff = nuova - (row.giacenza || 0);
    if (diff !== 0) {
      registraMovimento(db, {
        componenteId: req.params.id,
        tipo: 'rettifica',
        quantita: diff,
        motivo: motivo || 'Rettifica manuale',
      });
    }
  } else {
    const d = parseInt(delta) || 0;
    if (d !== 0) {
      registraMovimento(db, {
        componenteId: req.params.id,
        tipo: d > 0 ? 'carico' : 'scarico',
        quantita: d,
        motivo: motivo || (d > 0 ? 'Carico manuale' : 'Scarico manuale'),
      });
    }
  }
  res.json(db.prepare('SELECT * FROM componenti WHERE id = ?').get(req.params.id));
});

// GET /api/componenti/:id/movimenti — storico movimenti del componente
router.get('/:id/movimenti', (req, res) => {
  const rows = db.prepare(`
    SELECT m.*,
      TRIM(COALESCE(c.nome, '') || ' ' || COALESCE(c.cognome, '')) AS clienteNome
    FROM movimenti_magazzino m
    LEFT JOIN ordini o ON o.id = m.ordineId
    LEFT JOIN clienti c ON c.id = o.clienteId
    WHERE m.componenteId = ?
    ORDER BY m.timestamp DESC
    LIMIT 200
  `).all(req.params.id);
  res.json(rows);
});

// DELETE /api/componenti/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM movimenti_magazzino WHERE componenteId = ?').run(req.params.id);
  db.prepare('DELETE FROM componenti WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/componenti/import — import massivo da CSV (rows già parsate lato client)
// Body: { rows: [{ nome, categoria?, marca?, codice?, prezzo_acquisto?, prezzo_vendita?, fornitore?, giacenza?, soglia_min?, note? }] }
// Strategia di matching per aggiornare invece di duplicare:
//   1. Per `codice` (case-insensitive) se valorizzato
//   2. Altrimenti per combinazione `nome+marca` (case-insensitive)
router.post('/import', (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'Nessuna riga da importare' });

  const findByCodice = db.prepare("SELECT * FROM componenti WHERE LOWER(codice) = LOWER(?) AND codice <> ''");
  const findByNomeMarca = db.prepare("SELECT * FROM componenti WHERE LOWER(nome) = LOWER(?) AND LOWER(COALESCE(marca, '')) = LOWER(?)");
  const insertStmt = db.prepare(`
    INSERT INTO componenti (id, nome, categoria, marca, codice, prezzo_acquisto, prezzo_vendita, fornitore, giacenza, soglia_min, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE componenti
    SET categoria=?, marca=?, codice=?, prezzo_acquisto=?, prezzo_vendita=?, fornitore=?, soglia_min=?, note=?
    WHERE id=?
  `);

  const report = { creati: 0, aggiornati: 0, caricati: 0, errori: [] };

  const tx = db.transaction((items) => {
    items.forEach((raw, idx) => {
      const nome = String(raw.nome || '').trim();
      if (!nome) {
        report.errori.push({ riga: idx + 2, errore: 'Nome mancante' });
        return;
      }
      const categoria = String(raw.categoria || '').trim();
      const marca = String(raw.marca || '').trim();
      const codice = String(raw.codice || '').trim();
      const prezzo_acquisto = parseFloat(raw.prezzo_acquisto) || 0;
      const prezzo_vendita = parseFloat(raw.prezzo_vendita) || 0;
      const fornitore = String(raw.fornitore || '').trim();
      const giacenza = parseInt(raw.giacenza) || 0;
      const soglia_min = parseInt(raw.soglia_min) || 0;
      const note = String(raw.note || '').trim();

      let existing = null;
      if (codice) existing = findByCodice.get(codice);
      if (!existing) existing = findByNomeMarca.get(nome, marca);

      if (existing) {
        // Aggiorna metadati ma non sovrascrive la giacenza: la trattiamo come carico
        updateStmt.run(
          categoria || existing.categoria,
          marca     || existing.marca,
          codice    || existing.codice,
          prezzo_acquisto || existing.prezzo_acquisto,
          prezzo_vendita  || existing.prezzo_vendita,
          fornitore || existing.fornitore,
          soglia_min || existing.soglia_min,
          note      || existing.note,
          existing.id
        );
        report.aggiornati++;
        if (giacenza > 0) {
          registraMovimento(db, {
            componenteId: existing.id,
            tipo: 'carico',
            quantita: giacenza,
            motivo: 'Import CSV',
          });
          report.caricati += giacenza;
        }
      } else {
        const id = newId();
        // Crea con giacenza 0, poi se >0 registra un movimento di carico
        insertStmt.run(
          id, nome, categoria, marca, codice,
          prezzo_acquisto, prezzo_vendita, fornitore,
          0, soglia_min, note
        );
        report.creati++;
        if (giacenza > 0) {
          registraMovimento(db, {
            componenteId: id,
            tipo: 'carico',
            quantita: giacenza,
            motivo: 'Import CSV (carico iniziale)',
          });
          report.caricati += giacenza;
        }
      }
    });
  });

  try {
    tx(rows);
    res.json({ ok: true, ...report });
  } catch (e) {
    res.status(500).json({ error: e.message, ...report });
  }
});

// POST /api/componenti/carico-multiplo — registra una bolla di carico merce
// Body: { fornitore?, righe: [{ componenteId?, nomeNuovo?, qta, prezzo_acquisto? }], motivo? }
// Se la riga ha `nomeNuovo` invece di `componenteId`, il componente viene creato al volo.
router.post('/carico-multiplo', (req, res) => {
  const { fornitore = '', righe, motivo = '' } = req.body || {};
  if (!Array.isArray(righe) || !righe.length) return res.status(400).json({ error: 'Nessuna riga di carico' });

  const updatePrezzo = db.prepare("UPDATE componenti SET prezzo_acquisto = ?, fornitore = COALESCE(NULLIF(?, ''), fornitore) WHERE id = ?");
  const findByNome = db.prepare("SELECT * FROM componenti WHERE LOWER(nome) = LOWER(?)");
  const insertNuovo = db.prepare(`
    INSERT INTO componenti (id, nome, categoria, marca, codice, prezzo_acquisto, prezzo_vendita, fornitore, giacenza, soglia_min, note)
    VALUES (?, ?, '', '', '', ?, 0, ?, 0, 1, '')
  `);
  const movimentati = [];
  const creati = [];
  const errori = [];

  const tx = db.transaction((items) => {
    items.forEach((r, idx) => {
      const qta = parseInt(r.qta) || 0;
      if (qta <= 0) {
        errori.push({ riga: idx + 1, errore: 'Quantità non valida' });
        return;
      }

      let componenteId = r.componenteId;
      const prezzoNum = (r.prezzo_acquisto != null && r.prezzo_acquisto !== '') ? parseFloat(r.prezzo_acquisto) : null;
      let creatoOra = false;

      // Creazione al volo se nomeNuovo è fornito — con dedup case-insensitive
      if (!componenteId && r.nomeNuovo && r.nomeNuovo.trim()) {
        const nome = r.nomeNuovo.trim();
        const esistente = findByNome.get(nome);
        if (esistente) {
          componenteId = esistente.id; // riusa il componente esistente
        } else {
          componenteId = newId();
          insertNuovo.run(componenteId, nome, prezzoNum && !isNaN(prezzoNum) ? prezzoNum : 0, fornitore || '');
          creati.push({ id: componenteId, nome });
          creatoOra = true;
        }
      }

      if (!componenteId) {
        errori.push({ riga: idx + 1, errore: 'Componente non specificato' });
        return;
      }

      // Aggiorna prezzo acquisto per componenti esistenti (non creati ora) se fornito
      if (!creatoOra && prezzoNum != null && !isNaN(prezzoNum) && prezzoNum >= 0) {
        updatePrezzo.run(prezzoNum, fornitore || '', componenteId);
      }

      const motivoFinal = motivo || (fornitore ? `Carico merce — ${fornitore}` : 'Carico merce');
      const result = registraMovimento(db, {
        componenteId,
        tipo: 'carico',
        quantita: qta,
        motivo: motivoFinal,
      });
      if (result) movimentati.push(result.movimento);
      else errori.push({ riga: idx + 1, errore: 'Componente non trovato' });
    });
  });

  try {
    tx(righe);
    res.json({ ok: true, movimenti: movimentati.length, creati: creati.length, errori });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
