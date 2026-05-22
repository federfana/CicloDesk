const ClientiService = (() => {

  async function getAll() {
    return DB.getAll('clienti');
  }

  async function findById(id) {
    return DB.findById('clienti', id);
  }

  async function cerca(query) {
    const all = await getAll();
    if (!query.trim()) return all;
    const q = query.toLowerCase().trim();
    return all.filter(c =>
      c.nome.toLowerCase().includes(q)                    ||
      (c.cognome  || '').toLowerCase().includes(q)        ||
      (c.telefono || '').includes(q)                      ||
      (c.email    || '').toLowerCase().includes(q)
    );
  }

  async function salva(data) {
    const record = {
      nome:     data.nome.trim(),
      cognome:  (data.cognome  || '').trim(),
      telefono: (data.telefono || '').trim(),
      email:    (data.email    || '').trim(),
      note:     (data.note     || '').trim(),
    };
    if (data.id) return DB.update('clienti', data.id, { id: data.id, ...record });
    return DB.create('clienti', record);
  }

  async function elimina(id) {
    return DB.remove('clienti', id);
  }

  return { getAll, findById, cerca, salva, elimina };
})();