/**
 * db.js — Livello di persistenza su localStorage.
 * Espone un oggetto DB con metodi generici per ogni "collezione".
 */

const DB = (() => {
  const KEYS = {
    clienti:     'co_clienti',
    ordini:      'co_ordini',
    lavorazioni: 'co_lavorazioni',
  };

  /** Carica un array dalla collezione. */
  function getAll(collection) {
    try {
      return JSON.parse(localStorage.getItem(KEYS[collection])) || [];
    } catch {
      return [];
    }
  }

  /** Sovrascrive l'intera collezione. */
  function saveAll(collection, data) {
    localStorage.setItem(KEYS[collection], JSON.stringify(data));
  }

  /** Inserisce o aggiorna un record (cerca per .id). */
  function upsert(collection, record) {
    const items = getAll(collection);
    const idx   = items.findIndex(i => i.id === record.id);
    if (idx >= 0) {
      items[idx] = record;
    } else {
      items.push(record);
    }
    saveAll(collection, items);
    return record;
  }

  /** Elimina un record per id. */
  function remove(collection, id) {
    const items = getAll(collection).filter(i => i.id !== id);
    saveAll(collection, items);
  }

  /** Cerca un record per id. */
  function findById(collection, id) {
    return getAll(collection).find(i => i.id === id) || null;
  }

  /** Genera un ID univoco semplice. */
  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return { getAll, saveAll, upsert, remove, findById, newId };
})();