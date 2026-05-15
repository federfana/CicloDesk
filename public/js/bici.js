/**
 * bici.js — Service per gestione bici collegate ai clienti
 */
const BiciService = (() => {

  async function getByCliente(clienteId) {
    return DB.getAll(`bici?clienteId=${clienteId}`);
  }

  async function findById(id) {
    return DB.findById('bici', id);
  }

  async function salva(data) {
    const record = {
      clienteId:             data.clienteId,
      marca:                 (data.marca   || '').trim(),
      modello:               (data.modello || '').trim(),
      tipo:                  data.tipo     || 'strada',
      colore:                (data.colore  || '').trim(),
      seriale_forcella:      (data.seriale_forcella      || '').trim(),
      seriale_ammortizzatore:(data.seriale_ammortizzatore || '').trim(),
      note:                  (data.note    || '').trim(),
    };
    if (data.id) return DB.update('bici', data.id, record);
    return DB.create('bici', record);
  }

  async function elimina(id) {
    return DB.remove('bici', id);
  }

  return { getByCliente, findById, salva, elimina };
})();
