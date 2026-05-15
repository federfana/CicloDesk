const OrdiniService = (() => {

  // Sequenza stati in ordine di avanzamento
  const STATI = ['accettata', 'in_lavorazione', 'pronto', 'consegnata'];

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

  // Bici ancora in officina = tutto ciò che non è consegnata
  async function getAperti() {
    const all = await getAll();
    return all.filter(o => o.stato !== 'consegnata');
  }

  // Consegnate oggi
  async function getChiusiOggi() {
    const oggi = new Date().toDateString();
    const all  = await getAll();
    return all.filter(o =>
      o.stato === 'consegnata' &&
      o.dataUscita &&
      new Date(o.dataUscita).toDateString() === oggi
    );
  }

  async function salva(data, voci) {
    const totale = voci.reduce((s, v) => s + (parseFloat(v.prezzo) || 0), 0);
    const record = {
      clienteId:    data.clienteId,
      biciId:       data.biciId || null,
      stato:        data.stato        || 'accettata',
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

  // Avanza al prossimo stato
  async function avanza(id) {
    const o = await findById(id);
    if (!o) return null;
    const idx       = STATI.indexOf(o.stato);
    const nuovoStato = STATI[Math.min(idx + 1, STATI.length - 1)];
    return DB.update('ordini', id, {
      ...o,
      stato:     nuovoStato,
      dataUscita: nuovoStato === 'consegnata' ? new Date().toISOString() : null,
    });
  }

  // Riapri: torna a in_lavorazione
  async function riapri(id) {
    const o = await findById(id);
    if (!o) return null;
    return DB.update('ordini', id, { ...o, stato: 'in_lavorazione', dataUscita: null });
  }

  async function elimina(id) {
    return DB.remove('ordini', id);
  }

  function calcolaIncasso(ordini) {
    return ordini.reduce((s, o) => s + (o.totale || 0), 0);
  }

  return {
    STATI,
    getAll, findById, getByCliente, getAperti, getChiusiOggi,
    salva, avanza, riapri, elimina, calcolaIncasso,
  };
})();
