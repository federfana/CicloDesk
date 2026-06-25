const ComponentiService = (() => {

  async function getAll() {
    return DB.getAll('componenti');
  }

  async function findById(id) {
    return DB.findById('componenti', id);
  }

  async function getSottoSoglia() {
    const res = await fetch('/api/componenti/sotto-soglia/lista');
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
  }

  async function salva(data) {
    const record = {
      nome:            (data.nome || '').trim(),
      categoria:       (data.categoria || '').trim(),
      marca:           (data.marca || '').trim(),
      codice:          (data.codice || '').trim(),
      prezzo_acquisto: parseFloat(data.prezzo_acquisto) || 0,
      prezzo_vendita:  parseFloat(data.prezzo_vendita) || 0,
      fornitore:       (data.fornitore || '').trim(),
      giacenza:        parseInt(data.giacenza) || 0,
      soglia_min:      parseInt(data.soglia_min) || 0,
      note:            (data.note || '').trim(),
    };
    if (data.id) return DB.update('componenti', data.id, { id: data.id, ...record });
    return DB.create('componenti', record);
  }

  async function aggiornaGiacenza(id, delta) {
    const res = await fetch(`/api/componenti/${id}/giacenza`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    });
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
  }

  async function setGiacenza(id, set) {
    const res = await fetch(`/api/componenti/${id}/giacenza`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set }),
    });
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
  }

  async function elimina(id) {
    return DB.remove('componenti', id);
  }

  async function getMovimenti(id) {
    const res = await fetch(`/api/componenti/${id}/movimenti`);
    if (!res.ok) throw new Error('Errore server ' + res.status);
    return res.json();
  }

  async function importCsv(rows) {
    const res = await fetch('/api/componenti/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore server ' + res.status);
    return data;
  }

  async function caricoMultiplo(fornitore, righe, motivo = '') {
    const res = await fetch('/api/componenti/carico-multiplo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fornitore, righe, motivo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore server ' + res.status);
    return data;
  }

  return { getAll, findById, getSottoSoglia, salva, elimina, aggiornaGiacenza, setGiacenza, getMovimenti, importCsv, caricoMultiplo };
})();
