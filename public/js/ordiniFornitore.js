const OrdiniFornitoreService = (() => {

  async function _req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch('/api/ordini-fornitore' + (path || ''), opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Errore server ${res.status}`);
    return data;
  }

  const STATI_LABEL = {
    bozza:                 { icon: '📝', label: 'Bozza',                 color: '#6b7280' },
    ordinato:              { icon: '📤', label: 'Ordinato',              color: '#3b82f6' },
    in_transito:           { icon: '🚚', label: 'In transito',           color: '#8b5cf6' },
    parzialmente_ricevuto: { icon: '📦◐', label: 'Parzialmente ricevuto', color: '#f59e0b' },
    ricevuto:              { icon: '✅', label: 'Ricevuto',              color: '#16a34a' },
    annullato:             { icon: '🚫', label: 'Annullato',             color: '#dc2626' },
  };

  return {
    STATI_LABEL,
    list:        (filtri = {}) => {
      const qs = Object.entries(filtri).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      return _req('GET', '?' + qs);
    },
    findById:    (id) => _req('GET', '/' + id),
    suggerimenti: () => _req('GET', '/riordino/suggerimenti'),
    crea:        (data) => _req('POST', '', data),
    aggiorna:    (id, data) => _req('PUT', '/' + id, data),
    ricevi:      (id, payload) => _req('POST', `/${id}/ricevi`, payload),
    annulla:     (id) => _req('POST', `/${id}/annulla`),
    elimina:     (id) => _req('DELETE', '/' + id),
  };
})();
