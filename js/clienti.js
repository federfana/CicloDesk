/**
 * clienti.js — CRUD schede clienti.
 */

const ClientiService = (() => {

  function getAll() {
    return DB.getAll('clienti').sort((a, b) => a.nome.localeCompare(b.nome));
  }

  function findById(id) {
    return DB.findById('clienti', id);
  }

  function cerca(query) {
    const q = query.toLowerCase().trim();
    if (!q) return getAll();
    return getAll().filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.telefono || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.bici || '').toLowerCase().includes(q)
    );
  }

  function salva(data) {
    const record = {
      id:        data.id || DB.newId(),
      nome:      data.nome.trim(),
      telefono:  (data.telefono || '').trim(),
      email:     (data.email || '').trim(),
      bici:      (data.bici || '').trim(),
      note:      (data.note || '').trim(),
      createdAt: data.createdAt || new Date().toISOString(),
    };
    return DB.upsert('clienti', record);
  }

  function elimina(id) {
    // Elimina anche gli ordini associati
    const ordini = DB.getAll('ordini').filter(o => o.clienteId !== id);
    DB.saveAll('ordini', ordini);
    DB.remove('clienti', id);
  }

  return { getAll, findById, cerca, salva, elimina };
})();