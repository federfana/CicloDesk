/**
 * bici.js — Service per gestione bici
 */

const BiciService = (() => {

  async function getAll() {
    return DB.getAll('bici');
  }

  async function findById(id) {
    return DB.findById('bici', id);
  }

  async function salva(data) {
    const record = {
      modello: (data.modello || '').trim(),
    };
    if (data.id) return DB.update('bici', data.id, { id: data.id, ...record });
    return DB.create('bici', record);
  }

  async function elimina(id) {
    return DB.remove('bici', id);
  }

  return { getAll, findById, salva, elimina };
})();

/**
 * BiciClientiService — Service per associazioni bici-clienti
 */

const BiciClientiService = (() => {

  async function getByCliente(clienteId) {
    return DB.getAll('bici-clienti').then(all => 
      all.filter(bc => bc.cliente_id === clienteId)
    );
  }

  async function getByBici(biciId) {
    return DB.getAll('bici-clienti').then(all => 
      all.filter(bc => bc.bici_id === biciId)
    );
  }

  async function associa(biciId, clienteId, noteAssociazione = '') {
    const record = {
      id: DB.newId(),
      bici_id: biciId,
      cliente_id: clienteId,
      data_associazione: new Date().toISOString(),
      data_rimozione: null,
      note_associazione: (noteAssociazione || '').trim(),
    };
    return DB.create('bici-clienti', record);
  }

  async function rimuovi(associazioneId) {
    const record = DB.findById('bici-clienti', associazioneId);
    if (!record) return null;
    return DB.update('bici-clienti', associazioneId, {
      ...record,
      data_rimozione: new Date().toISOString(),
    });
  }

  return { getByCliente, getByBici, associa, rimuovi };
})();
