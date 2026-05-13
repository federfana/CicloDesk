const LavorazioniService = (() => {

  async function getAll() {
    return DB.getAll('lavorazioni');
  }

  async function findById(id) {
    return DB.findById('lavorazioni', id);
  }

  async function salva(data) {
    const record = {
      nome:        data.nome.trim(),
      prezzo:      parseFloat(data.prezzo) || 0,
      descrizione: (data.descrizione || '').trim(),
    };
    if (data.id) return DB.update('lavorazioni', data.id, { id: data.id, ...record });
    return DB.create('lavorazioni', record);
  }

  async function elimina(id) {
    return DB.remove('lavorazioni', id);
  }

  return { getAll, findById, salva, elimina };
})();