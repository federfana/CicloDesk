function renderOrdini(filtro = 'tutti', query = '') {
  let ordini = OrdiniService.getAll();

  // Filtro per stato (tutti / aperto / chiuso)
  if (filtro !== 'tutti') {
    ordini = ordini.filter(o => o.stato === filtro);
  }

  // Filtro testuale
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    ordini = ordini.filter(o => {
      const cliente = ClientiService.findById(o.clienteId);
      const nomeCliente = cliente ? cliente.nome.toLowerCase() : '';
      const bici        = cliente ? (cliente.bici || '').toLowerCase() : '';
      const noteOrdine  = (o.note || '').toLowerCase();
      const vociTesto   = o.voci.map(v =>
        `${v.nome} ${v.note}`.toLowerCase()
      ).join(' ');

      return (
        nomeCliente.includes(q) ||
        bici.includes(q)        ||
        noteOrdine.includes(q)  ||
        vociTesto.includes(q)
      );
    });
  }

  const container = document.getElementById('ordini-list');

  if (ordini.length === 0) {
    container.innerHTML = emptyState('Nessun ordine trovato.');
    return;
  }

  container.innerHTML = ordini.map(o => {
    const cliente     = ClientiService.findById(o.clienteId);
    const nomeCliente = cliente ? cliente.nome : 'Cliente rimosso';
    const vociHtml    = o.voci.map(v =>
      `<span class="tag">${v.nome} — ${fmt(v.prezzo)}${v.note ? ` (${v.note})` : ''}</span>`
    ).join('');

    return `
      <div class="card stato-${o.stato}">
        <div class="card-row">
          <span class="card-title">👤 ${nomeCliente}</span>
          <span class="card-badge badge-${o.stato}">${o.stato === 'aperto' ? '🔧 In officina' : '✅ Completato'}</span>
        </div>
        <span class="card-sub">Ingresso: ${fmtDate(o.dataIngresso)} ${o.dataUscita ? '&nbsp;|&nbsp; Uscita: ' + fmtDate(o.dataUscita) : ''}</span>
        ${o.note ? `<span class="card-sub">📝 ${o.note}</span>` : ''}
        <div>${vociHtml || '<span class="card-sub">Nessuna lavorazione</span>'}</div>
        <div class="card-row">
          <strong>${fmt(o.totale)}</strong>
          <div class="card-actions">
            ${o.stato === 'aperto'
              ? `<button class="btn btn-sm btn-success" data-action="chiudi-ordine" data-id="${o.id}">✔ Chiudi</button>`
              : `<button class="btn btn-sm btn-secondary" data-action="riapri-ordine" data-id="${o.id}">↩ Riapri</button>`}
            <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}">✏</button>
            <button class="btn btn-sm btn-danger" data-action="del-ordine" data-id="${o.id}">🗑</button>
          </div>
        </div>
      </div>`;
  }).join('');
}