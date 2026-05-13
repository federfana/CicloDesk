/**
 * ordini.js — Gestione ordini (entrate/uscite) e voci lavorazione.
 */

const OrdiniService = (() => {

  function getAll() {
    return DB.getAll('ordini').sort((a, b) =>
      new Date(b.dataIngresso) - new Date(a.dataIngresso)
    );
  }

  function findById(id) {
    return DB.findById('ordini', id);
  }

  function getByCliente(clienteId) {
    return getAll().filter(o => o.clienteId === clienteId);
  }

  function getAperti() {
    return getAll().filter(o => o.stato === 'aperto');
  }

  function getChiusiOggi() {
    const oggi = new Date().toDateString();
    return getAll().filter(o =>
      o.stato === 'chiuso' &&
      o.dataUscita &&
      new Date(o.dataUscita).toDateString() === oggi
    );
  }

  /**
   * Crea/aggiorna un ordine.
   * @param {Object} data
   * @param {Array}  voci  — array di {lavorazioneId, note, prezzo}
   */
  function salva(data, voci) {
    const totale = voci.reduce((s, v) => s + (parseFloat(v.prezzo) || 0), 0);

    const record = {
      id:            data.id || DB.newId(),
      clienteId:     data.clienteId,
      stato:         data.stato || 'aperto',
      dataIngresso:  data.dataIngresso || new Date().toISOString(),
      dataUscita:    data.dataUscita || null,
      note:          (data.note || '').trim(),
      voci:          voci.map(v => ({
        lavorazioneId: v.lavorazioneId,
        nome:          v.nome,          // snapshot nome
        note:          (v.note || '').trim(),
        prezzo:        parseFloat(v.prezzo) || 0,
      })),
      totale,
    };
    return DB.upsert('ordini', record);
  }

  /** Chiude un ordine (segna uscita). */
  function chiudi(id) {
    const ordine = findById(id);
    if (!ordine) return null;
    ordine.stato      = 'chiuso';
    ordine.dataUscita = new Date().toISOString();
    return DB.upsert('ordini', ordine);
  }

  /** Riapre un ordine chiuso. */
  function riapri(id) {
    const ordine = findById(id);
    if (!ordine) return null;
    ordine.stato      = 'aperto';
    ordine.dataUscita = null;
    return DB.upsert('ordini', ordine);
  }

  function elimina(id) {
    DB.remove('ordini', id);
  }

  /** Calcola incasso totale di una lista di ordini. */
  function calcolaIncasso(ordini) {
    return ordini.reduce((s, o) => s + (o.totale || 0), 0);
  }

  return { getAll, findById, getByCliente, getAperti, getChiusiOggi,
           salva, chiudi, riapri, elimina, calcolaIncasso };
})();