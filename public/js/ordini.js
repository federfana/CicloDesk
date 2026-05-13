const OrdiniService = (() => {

  async function getAll() {
    return DB.getAll('ordini');
  }

  async function findById(id) {
    return DB.findById('ordini', id);
  }

  async function getByCliente(clienteId) {
    const all = await getAll();
    return all.filter(o => o.clienteId === clienteId);
  }

  async function getAperti() {
    const all = await getAll();
    return all.filter(o => o.stato === 'aperto');
  }

  async function getChiusiOggi() {
    const oggi = new Date().toDateString();
    const all  = await getAll();
    return all.filter(o =>
      o.stato === 'chiuso' &&
      o.dataUscita &&
      new Date(o.dataUscita).toDateString() === oggi
    );
  }

  async function salva(data, voci) {
    const totale = voci.reduce((s, v) => s + (parseFloat(v.prezzo) || 0), 0);
    const record = {
      clienteId:    data.clienteId,
      stato:        data.stato        || 'aperto',
      dataIngresso: data.dataIngresso || new Date().toISOString(),
      dataUscita:   data.dataUscita   || null,
      note:         (data.note || '').trim(),
      voci: voci.map(v => ({
        lavorazioneId: v.lavorazioneId,
        nome:          v.nome,
        note:          (v.note || '').trim(),
        prezzo:        parseFloat(v.prezzo) || 0,
      })),
      totale,
    };
    if (data.id) return DB.update('ordini', data.id, { id: data.id, ...record });
    return DB.create('ordini', record);
  }

  async function chiudi(id) {
    const o = await findById(id);
    if (!o) return null;
    return DB.update('ordini', id, { ...o, stato: 'chiuso', dataUscita: new Date().toISOString() });
  }

  async function riapri(id) {
    const o = await findById(id);
    if (!o) return null;
    return DB.update('ordini', id, { ...o, stato: 'aperto', dataUscita: null });
  }

  async function elimina(id) {
    return DB.remove('ordini', id);
  }

  function calcolaIncasso(ordini) {
    return ordini.reduce((s, o) => s + (o.totale || 0), 0);
  }

  return {
    getAll, findById, getByCliente, getAperti, getChiusiOggi,
    salva, chiudi, riapri, elimina, calcolaIncasso,
  };
})();