const OrdiniService = (() => {

  // Sequenza stati in ordine di avanzamento
  const STATI = ['accettata', 'in_lavorazione', 'pronto', 'consegnata'];

  async function getAll() {
    return DB.getAll('ordini');
  }

  // Paginazione server-side: restituisce {data, total, limit, offset}
  async function getPaginated({ limit = 50, offset = 0, stato, clienteId } = {}) {
    const params = new URLSearchParams();
    params.set('limit', limit);
    params.set('offset', offset);
    if (stato) params.set('stato', stato);
    if (clienteId) params.set('clienteId', clienteId);
    const res = await fetch(`/api/ordini?${params}`);
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
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
      pagato:  Boolean(data.pagato),
      acconto: parseFloat(data.acconto) || 0,
      foto:    data.foto || [],
      ricambi: data.ricambi || [],
      commenti: data.commenti || [],
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

  async function togglePagato(id) {
    const o = await findById(id);
    if (!o) return null;
    return DB.update('ordini', id, { ...o, pagato: !o.pagato });
  }

  async function elimina(id) {
    return DB.remove('ordini', id);
  }

  async function getCestino() {
    const res = await fetch('/api/ordini/cestino/lista');
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
  }

  async function ripristina(id) {
    const res = await fetch(`/api/ordini/${id}/ripristina`, { method: 'POST' });
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
  }

  async function eliminaDefinitivamente(id) {
    const res = await fetch(`/api/ordini/${id}/permanente`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
  }

  async function aggiungiCommento(id, testo) {
    const res = await fetch(`/api/ordini/${id}/commenti`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testo }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore server ' + res.status);
    }
    return res.json();
  }

  async function rimuoviCommento(id, commentoId) {
    const res = await fetch(`/api/ordini/${id}/commenti/${commentoId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
  }

  function calcolaIncasso(ordini) {
    return ordini.reduce((s, o) => s + (o.totale || 0), 0);
  }

  return {
    STATI,
    getAll, getPaginated, findById, getByCliente, getAperti, getChiusiOggi,
    salva, avanza, riapri, togglePagato, elimina, calcolaIncasso,
    getCestino, ripristina, eliminaDefinitivamente,
    aggiungiCommento, rimuoviCommento,
  };
})();
