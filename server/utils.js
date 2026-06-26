/**
 * Utilità condivise tra le route server.
 */
const crypto = require('crypto');

/** Genera un ID univoco (timestamp base36 + 8 byte random hex). */
function newId() {
  return Date.now().toString(36) + crypto.randomBytes(8).toString('hex');
}

/**
 * Registra un movimento di magazzino e aggiorna la giacenza del componente.
 * @param {import('better-sqlite3').Database} db
 * @param {{componenteId: string, ordineId?: string|null, poId?: string|null, tipo: 'carico'|'scarico'|'rettifica', quantita: number, motivo?: string}} params
 * @returns {{movimento: object, componente: object} | null}
 */
function registraMovimento(db, { componenteId, ordineId = null, poId = null, tipo, quantita, motivo = '' }) {
  const comp = db.prepare('SELECT * FROM componenti WHERE id = ?').get(componenteId);
  if (!comp) return null;
  // Per tipo 'scarico' quantita è negativa, per 'carico' positiva; per 'rettifica' può essere entrambe
  const delta = parseInt(quantita) || 0;
  if (delta === 0) return null;
  const nuova = Math.max(0, (comp.giacenza || 0) + delta);
  db.prepare('UPDATE componenti SET giacenza = ? WHERE id = ?').run(nuova, componenteId);
  const movId = newId();
  db.prepare(`
    INSERT INTO movimenti_magazzino (id, componenteId, ordineId, poId, tipo, quantita, giacenzaPost, motivo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(movId, componenteId, ordineId, poId, tipo, delta, nuova, (motivo || '').trim());
  return {
    movimento: db.prepare('SELECT * FROM movimenti_magazzino WHERE id = ?').get(movId),
    componente: db.prepare('SELECT * FROM componenti WHERE id = ?').get(componenteId),
  };
}

module.exports = { newId, registraMovimento };
