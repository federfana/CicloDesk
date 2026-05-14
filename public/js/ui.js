const UI = (() => {

  // ── Helpers ───────────────────────────────────────────────────
  function fmt(num) {
    return '€ ' + (num || 0).toFixed(2).replace('.', ',');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function emptyState(msg) {
    return `<p class="empty-state">${msg}</p>`;
  }

  // ── Incasso toggle ────────────────────────────────────────────
  function incassoVisibile() {
    return localStorage.getItem('incasso_visible') !== 'false';
  }

  function aggiornaIncasso(valore) {
    const el  = document.getElementById('stat-num-revenue');
    const btn = document.getElementById('btn-toggle-incasso');
    if (!el || !btn) return;
    el.dataset.valore  = fmt(valore);
    el.textContent     = incassoVisibile() ? fmt(valore) : '€ ••••';
    btn.textContent    = incassoVisibile() ? '👁' : '🙈';
  }

  // ── Dashboard ─────────────────────────────────────────────────
  async function renderDashboard() {
    const [aperti, chiusiOggi, clienti] = await Promise.all([
      OrdiniService.getAperti(),
      OrdiniService.getChiusiOggi(),
      ClientiService.getAll(),
    ]);
    const incasso = OrdiniService.calcolaIncasso(chiusiOggi);

    document.getElementById('stat-num-clienti').textContent = clienti.length;
    document.getElementById('stat-num-in').textContent      = aperti.length;
    document.getElementById('stat-num-out').textContent     = chiusiOggi.length;
    aggiornaIncasso(incasso);

    const container  = document.getElementById('dashboard-in-list');
    const clientiMap = Object.fromEntries(clienti.map(c => [c.id, c]));

    if (!aperti.length) {
      container.innerHTML = emptyState('Nessuna bici in officina al momento.');
      return;
    }

    container.innerHTML = aperti.map(o => {
      const c = clientiMap[o.clienteId];
      return `
        <div class="card stato-aperto">
          <div class="card-row">
            <span class="card-title">🚲 ${c ? c.nome : 'Cliente sconosciuto'}</span>
            <span class="card-badge badge-aperto">In officina</span>
          </div>
          <span class="card-sub">${c?.bici || '—'} &nbsp;|&nbsp; Ingresso: ${fmtDate(o.dataIngresso)}</span>
          <span class="card-sub">${o.voci.length} lavorazion${o.voci.length === 1 ? 'e' : 'i'} — <strong>${fmt(o.totale)}</strong></span>
          <div class="card-actions">
            <button class="btn btn-sm btn-success"   data-action="chiudi-ordine"   data-id="${o.id}">✔ Segna uscita</button>
            <button class="btn btn-sm btn-secondary" data-action="edit-ordine"     data-id="${o.id}">✏ Modifica</button>
          </div>
        </div>`;
    }).join('');
  }

  // ── Clienti ───────────────────────────────────────────────────
  async function renderClienti(query = '') {
    const [clienti, tuttiOrdini] = await Promise.all([
      ClientiService.cerca(query),
      OrdiniService.getAll(),
    ]);
    const container = document.getElementById('clienti-list');

    if (!clienti.length) {
      container.innerHTML = emptyState('Nessun cliente trovato.');
      return;
    }

    container.innerHTML = clienti.map(c => {
      const ordini = tuttiOrdini.filter(o => o.clienteId === c.id);
      const aperti = ordini.filter(o => o.stato === 'aperto').length;
      const totaleSpeso = OrdiniService.calcolaIncasso(ordini.filter(o => o.stato === 'chiuso'));
      return `
        <div class="card">
          <div class="card-row">
            <span class="card-title">👤 ${c.nome}</span>
            <div class="card-actions">
              <button class="btn btn-sm btn-secondary" data-action="storico-cliente"       data-id="${c.id}">📋 Storico</button>
              <button class="btn btn-sm btn-primary"   data-action="nuovo-ordine-cliente"  data-id="${c.id}">+ Ordine</button>
              <button class="btn btn-sm btn-secondary" data-action="edit-cliente"          data-id="${c.id}">✏</button>
              <button class="btn btn-sm btn-danger"    data-action="del-cliente"           data-id="${c.id}">🗑</button>
            </div>
          </div>
          <div class="card-row">
            <span class="card-sub">📞 ${c.telefono || '—'} &nbsp;|&nbsp; ✉ ${c.email || '—'}</span>
            <span class="card-sub">🚲 ${c.bici || '—'}</span>
          </div>
          ${c.note ? `<span class="card-sub">📝 ${c.note}</span>` : ''}
          <span class="card-sub">
            ${ordini.length} interventi &nbsp;|&nbsp; Speso: ${fmt(totaleSpeso)}
            ${aperti > 0 ? `&nbsp;<span class="card-badge badge-aperto">${aperti} in corso</span>` : ''}
          </span>
        </div>`;
    }).join('');
  }

  // ── Ordini ────────────────────────────────────────────────────
  async function renderOrdini(filtro = 'tutti', query = '') {
    const [tuttiOrdini, clienti] = await Promise.all([
      OrdiniService.getAll(),
      ClientiService.getAll(),
    ]);
    const clientiMap = Object.fromEntries(clienti.map(c => [c.id, c]));

    let ordini = tuttiOrdini;
    if (filtro !== 'tutti') ordini = ordini.filter(o => o.stato === filtro);

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      ordini = ordini.filter(o => {
        const c = clientiMap[o.clienteId];
        return (
          (c?.nome || '').toLowerCase().includes(q) ||
          (c?.bici || '').toLowerCase().includes(q) ||
          (o.note  || '').toLowerCase().includes(q) ||
          o.voci.some(v =>
            v.nome.toLowerCase().includes(q) ||
            (v.note || '').toLowerCase().includes(q)
          )
        );
      });
    }

    const container = document.getElementById('ordini-list');
    if (!ordini.length) {
      container.innerHTML = emptyState('Nessun ordine trovato.');
      return;
    }

    container.innerHTML = ordini.map(o => {
      const c        = clientiMap[o.clienteId];
      const vociHtml = o.voci.map(v =>
        `<span class="tag">${v.nome} — ${fmt(v.prezzo)}${v.note ? ` (${v.note})` : ''}</span>`
      ).join('');
      return `
        <div class="card stato-${o.stato}">
          <div class="card-row">
            <span class="card-title">👤 ${c ? c.nome : 'Cliente rimosso'}</span>
            <span class="card-badge badge-${o.stato}">${o.stato === 'aperto' ? '🔧 In officina' : '✅ Completato'}</span>
          </div>
          <span class="card-sub">
            Ingresso: ${fmtDate(o.dataIngresso)}
            ${o.dataUscita ? '&nbsp;|&nbsp; Uscita: ' + fmtDate(o.dataUscita) : ''}
          </span>
          ${o.note ? `<span class="card-sub">📝 ${o.note}</span>` : ''}
          <div>${vociHtml || '<span class="card-sub">Nessuna lavorazione</span>'}</div>
          <div class="card-row">
            <strong>${fmt(o.totale)}</strong>
            <div class="card-actions">
              ${o.stato === 'aperto'
                ? `<button class="btn btn-sm btn-success"   data-action="chiudi-ordine" data-id="${o.id}">✔ Chiudi</button>`
                : `<button class="btn btn-sm btn-secondary" data-action="riapri-ordine" data-id="${o.id}">↩ Riapri</button>`}
              <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}">✏</button>
              <button class="btn btn-sm btn-danger"    data-action="del-ordine"  data-id="${o.id}">🗑</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Catalogo ──────────────────────────────────────────────────
  async function renderCatalogo() {
    const lavorazioni = await LavorazioniService.getAll();
    const container   = document.getElementById('catalogo-list');

    if (!lavorazioni.length) {
      container.innerHTML = emptyState('Nessuna lavorazione nel catalogo.');
      return;
    }

    container.innerHTML = lavorazioni.map(l => `
      <div class="card">
        <div class="card-row">
          <span class="card-title">🔩 ${l.nome}</span>
          <div class="card-actions">
            <span style="font-weight:700;color:var(--primary)">${fmt(l.prezzo)}</span>
            <button class="btn btn-sm btn-secondary" data-action="edit-lavorazione" data-id="${l.id}">✏</button>
            <button class="btn btn-sm btn-danger"    data-action="del-lavorazione"  data-id="${l.id}">🗑</button>
          </div>
        </div>
        ${l.descrizione ? `<span class="card-sub">${l.descrizione}</span>` : ''}
      </div>`
    ).join('');
  }

  // ── Storico Cliente ───────────────────────────────────────────
  let _storicoOrdini   = [];   // cache per ricerca live
  let _storicoClienteId = null;

  async function apriModalStorico(clienteId) {
    const [cliente, tuttiOrdini] = await Promise.all([
      ClientiService.findById(clienteId),
      OrdiniService.getByCliente(clienteId),
    ]);

    // Ordina dal più recente
    _storicoOrdini    = tuttiOrdini.sort((a, b) =>
      new Date(b.dataIngresso) - new Date(a.dataIngresso)
    );
    _storicoClienteId = clienteId;

    // Header
    document.getElementById('storico-cliente-nome').textContent = cliente.nome;
    document.getElementById('storico-cliente-info').textContent =
      [cliente.bici, cliente.telefono, cliente.email].filter(Boolean).join('  ·  ');

    // Stats
    const chiusi      = _storicoOrdini.filter(o => o.stato === 'chiuso');
    const totaleSpeso = OrdiniService.calcolaIncasso(chiusi);
    const media       = chiusi.length ? totaleSpeso / chiusi.length : 0;

    document.getElementById('storico-stat-ordini').textContent = _storicoOrdini.length;
    document.getElementById('storico-stat-chiusi').textContent = chiusi.length;
    document.getElementById('storico-stat-speso').textContent  = fmt(totaleSpeso);
    document.getElementById('storico-stat-media').textContent  = fmt(media);
    document.getElementById('storico-stat-ultima').textContent =
      _storicoOrdini.length ? fmtDate(_storicoOrdini[0].dataIngresso) : '—';

    // Reset ricerca
    document.getElementById('search-storico').value = '';

    renderStoricoLista(_storicoOrdini);
    openModal('modal-storico');
  }

  function renderStoricoLista(ordini) {
    const container = document.getElementById('storico-ordini-list');

    if (!ordini.length) {
      container.innerHTML = emptyState('Nessun intervento trovato.');
      return;
    }

    container.innerHTML = ordini.map((o, i) => {
      const vociHtml = o.voci.map(v =>
        `<span class="tag">${v.nome} — ${fmt(v.prezzo)}${v.note ? ` (${v.note})` : ''}</span>`
      ).join('');

      return `
        <div class="storico-ordine-card stato-${o.stato}">
          <div class="storico-ordine-header">
            <div>
              <span class="storico-ordine-data">📅 ${fmtDate(o.dataIngresso)}</span>
              ${o.dataUscita
                ? `<span class="storico-ordine-uscita">→ uscita ${fmtDate(o.dataUscita)}</span>`
                : ''}
            </div>
            <div style="display:flex;align-items:center;gap:.6rem;">
              <span class="card-badge badge-${o.stato}">
                ${o.stato === 'aperto' ? '🔧 In corso' : '✅ Completato'}
              </span>
              <span class="storico-ordine-totale">${fmt(o.totale)}</span>
              <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}">✏</button>
            </div>
          </div>
          ${o.note ? `<p class="card-sub" style="margin-bottom:.3rem">📝 ${o.note}</p>` : ''}
          <div class="storico-voci">
            ${vociHtml || '<span class="card-sub">Nessuna lavorazione registrata</span>'}
          </div>
        </div>`;
    }).join('');
  }

  function filtraStorico(query) {
    if (!query.trim()) {
      renderStoricoLista(_storicoOrdini);
      return;
    }
    const q = query.toLowerCase().trim();
    const filtrati = _storicoOrdini.filter(o =>
      (o.note || '').toLowerCase().includes(q) ||
      o.voci.some(v =>
        v.nome.toLowerCase().includes(q) ||
        (v.note || '').toLowerCase().includes(q)
      ) ||
      fmtDate(o.dataIngresso).includes(q)
    );
    renderStoricoLista(filtrati);
  }

  // ── Modal helpers ─────────────────────────────────────────────
  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('overlay').classList.add('hidden');
  }

  // ── Modal Cliente ─────────────────────────────────────────────
  async function apriModalCliente(clienteId = null) {
    const c = clienteId ? await ClientiService.findById(clienteId) : null;

    document.getElementById('modal-cliente-title').textContent = c ? 'Modifica Cliente' : 'Nuovo Cliente';
    document.getElementById('cliente-id').value       = c?.id       || '';
    document.getElementById('cliente-nome').value     = c?.nome     || '';
    document.getElementById('cliente-telefono').value = c?.telefono || '';
    document.getElementById('cliente-email').value    = c?.email    || '';
    document.getElementById('cliente-bici').value     = c?.bici     || '';
    document.getElementById('cliente-note').value     = c?.note     || '';

    openModal('modal-cliente');
    document.getElementById('cliente-nome').focus();
  }

  // ── Modal Ordine ──────────────────────────────────────────────
  async function apriModalOrdine(ordineId = null, preselezionaClienteId = null) {
    const [ordine, clienti, lavorazioni] = await Promise.all([
      ordineId ? OrdiniService.findById(ordineId) : Promise.resolve(null),
      ClientiService.getAll(),
      LavorazioniService.getAll(),
    ]);

    document.getElementById('modal-ordine-title').textContent = ordine ? 'Modifica Ordine' : 'Nuovo Ordine';
    document.getElementById('ordine-id').value   = ordine?.id   || '';
    document.getElementById('ordine-note').value = ordine?.note || '';

    const dtInput = document.getElementById('ordine-data-ingresso');
    dtInput.value = toDatetimeLocal(ordine?.dataIngresso || new Date().toISOString());

    const sel = document.getElementById('ordine-cliente-id');
    sel.innerHTML = '<option value="">— Seleziona cliente —</option>';
    clienti.forEach(c => {
      const opt       = document.createElement('option');
      opt.value       = c.id;
      opt.textContent = `${c.nome}${c.bici ? ' — ' + c.bici : ''}`;
      if (ordine?.clienteId === c.id || preselezionaClienteId === c.id) opt.selected = true;
      sel.appendChild(opt);
    });

    document.getElementById('tbody-voci').innerHTML = '';
    (ordine?.voci || []).forEach(v => aggiungiRigaVoce(v, lavorazioni));
    aggiornaLocale();
    openModal('modal-ordine');
  }

  function aggiungiRigaVoce(voce = {}, lavorazioni = []) {
    const tbody   = document.getElementById('tbody-voci');
    const tr      = document.createElement('tr');
    const opzioni = lavorazioni.map(l =>
      `<option value="${l.id}" data-prezzo="${l.prezzo}"
        ${voce.lavorazioneId === l.id ? 'selected' : ''}>${l.nome}</option>`
    ).join('');

    tr.innerHTML = `
      <td>
        <select class="sel-lavorazione">
          <option value="">— Scegli —</option>
          ${opzioni}
        </select>
      </td>
      <td><input type="text"   class="inp-note-voce"   placeholder="Note…" value="${voce.note   || ''}" /></td>
      <td><input type="number" class="inp-prezzo-voce" step="0.01" min="0"  value="${voce.prezzo || 0}" style="width:90px" /></td>
      <td><button type="button" class="btn btn-sm btn-danger btn-rimuovi-voce">✕</button></td>
    `;

    tr.querySelector('.sel-lavorazione').addEventListener('change', function () {
      const opt = this.options[this.selectedIndex];
      if (opt.dataset.prezzo !== undefined) {
        tr.querySelector('.inp-prezzo-voce').value = parseFloat(opt.dataset.prezzo).toFixed(2);
      }
      aggiornaLocale();
    });
    tr.querySelector('.inp-prezzo-voce').addEventListener('input', aggiornaLocale);
    tr.querySelector('.btn-rimuovi-voce').addEventListener('click', () => {
      tr.remove();
      aggiornaLocale();
    });

    tbody.appendChild(tr);
  }

  function aggiornaLocale() {
    let tot = 0;
    document.querySelectorAll('.inp-prezzo-voce').forEach(i => tot += parseFloat(i.value) || 0);
    document.getElementById('totale-ordine').textContent = fmt(tot);
  }

  function raccogliVoci() {
    const voci = [];
    document.querySelectorAll('#tbody-voci tr').forEach(tr => {
      const sel   = tr.querySelector('.sel-lavorazione');
      const lavId = sel.value;
      if (!lavId) return;
      voci.push({
        lavorazioneId: lavId,
        nome:          sel.options[sel.selectedIndex]?.text || '',
        note:          tr.querySelector('.inp-note-voce').value,
        prezzo:        parseFloat(tr.querySelector('.inp-prezzo-voce').value) || 0,
      });
    });
    return voci;
  }

  // ── Modal Lavorazione ─────────────────────────────────────────
  async function apriModalLavorazione(lavId = null) {
    const l = lavId ? await LavorazioniService.findById(lavId) : null;

    document.getElementById('modal-lavorazione-title').textContent = l ? 'Modifica Lavorazione' : 'Nuova Lavorazione';
    document.getElementById('lavorazione-id').value          = l?.id          || '';
    document.getElementById('lavorazione-nome').value        = l?.nome        || '';
    document.getElementById('lavorazione-prezzo').value      = l ? l.prezzo.toFixed(2) : '';
    document.getElementById('lavorazione-descrizione').value = l?.descrizione || '';

    openModal('modal-lavorazione');
    document.getElementById('lavorazione-nome').focus();
  }

  // ── Utility ───────────────────────────────────────────────────
  function toDatetimeLocal(iso) {
    if (!iso) return '';
    const d   = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return {
    renderDashboard, renderClienti, renderOrdini, renderCatalogo,
    apriModalCliente, apriModalOrdine, apriModalLavorazione,
    apriModalStorico, filtraStorico,
    aggiungiRigaVoce, raccogliVoci, aggiornaIncasso,
    openModal, closeAllModals,
  };
})();