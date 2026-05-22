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

  function fmtDay(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function emptyState(msg) {
    return `<p class="empty-state">${msg}</p>`;
  }

  // ── Badge stato ordine ────────────────────────────────────────
  const STATO_CFG = {
    accettata:      { cls: 'badge-accettata',      label: '📥 Accettata'        },
    in_lavorazione: { cls: 'badge-in-lavorazione', label: '🔧 In lavorazione'   },
    pronto:         { cls: 'badge-pronto',         label: '✅ Pronto al ritiro'  },
    consegnata:     { cls: 'badge-consegnata',     label: '📦 Consegnata'        },
  };

  function badgeStato(stato) {
    const cfg = STATO_CFG[stato] || STATO_CFG.accettata;
    return `<span class="card-badge ${cfg.cls}">${cfg.label}</span>`;
  }

  // Pulsante avanza (non mostrato se già consegnata)
  function btnAvanza(o) {
    const labels = {
      accettata:      '🔧 Inizia',
      in_lavorazione: '✅ Pronto',
      pronto:         '📦 Consegna',
    };
    if (!labels[o.stato]) return '';
    return `<button class="btn btn-sm btn-primary" data-action="avanza-ordine" data-id="${o.id}">${labels[o.stato]}</button>`;
  }

  // Tipo bici: etichetta leggibile
  const TIPO_CFG = {
    strada: { label: '🚴 Strada',    cls: 'tag-tipo tag-strada' },
    mtb:    { label: '🏔️ MTB',      cls: 'tag-tipo tag-mtb'    },
    emtb:   { label: '⚡🏔️ E-MTB',  cls: 'tag-tipo tag-emtb'   },
    ebike:  { label: '⚡ E-Bike',    cls: 'tag-tipo tag-ebike'  },
    monopattino_e: { label: '⚡🛴 Monopattino Elett.', cls: 'tag-tipo tag-monopattino-e' },
  };
  function tagTipo(tipo) {
    const t = TIPO_CFG[tipo] || TIPO_CFG.strada;
    return `<span class="${t.cls}">${t.label}</span>`;
  }

  // Mappa lavorazioni per datalist: display -> {id, prezzo, nome}
  let _lavorazioniMap = {};

  // ── Dashboard ─────────────────────────────────────────────────
  async function renderDashboard() {
    const [tutti, clienti] = await Promise.all([
      OrdiniService.getAll(),
      ClientiService.getAll(),
    ]);

    const inOfficina = tutti.filter(o => o.stato !== 'consegnata');
    const pronti     = tutti.filter(o => o.stato === 'pronto');
    const oggi       = new Date().toDateString();
    const consOggi   = tutti.filter(o =>
      o.stato === 'consegnata' && o.dataUscita &&
      new Date(o.dataUscita).toDateString() === oggi
    );

    document.getElementById('stat-num-clienti').textContent = clienti.length;
    document.getElementById('stat-num-in').textContent      = inOfficina.length;
    document.getElementById('stat-num-pronto').textContent  = pronti.length;
    document.getElementById('stat-num-out').textContent     = consOggi.length;

    const container  = document.getElementById('dashboard-in-list');
    const clientiMap = Object.fromEntries(clienti.map(c => [c.id, c]));

    if (!inOfficina.length) {
      container.innerHTML = emptyState('Nessuna bici in officina al momento.');
      return;
    }

    container.innerHTML = inOfficina.map(o => {
      const c = clientiMap[o.clienteId];
      return `
        <div class="card stato-${o.stato}">
          <div class="card-row">
            <span class="card-title">🚲 ${c ? [c.nome, c.cognome].filter(Boolean).join(' ') : 'Cliente sconosciuto'}</span>
            ${badgeStato(o.stato)}
          </div>
          <span class="card-sub">
            ${o.biciNome || '—'} &nbsp;|&nbsp; Ingresso: ${fmtDate(o.dataIngresso)}
          </span>
          <span class="card-sub">
            ${o.voci.length} lavorazion${o.voci.length === 1 ? 'e' : 'i'} —
            <strong>${fmt(o.totale)}</strong>
          </span>
          <div class="card-actions">
            ${btnAvanza(o)}
            <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}">✏ Modifica</button>
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
      const ordini      = tuttiOrdini.filter(o => o.clienteId === c.id);
      const attivi      = ordini.filter(o => o.stato !== 'consegnata').length;
      const totaleSpeso = OrdiniService.calcolaIncasso(ordini.filter(o => o.stato === 'consegnata'));
      return `
        <div class="card">
          <div class="card-row">
            <span class="card-title">👤 ${c.nome}${c.cognome ? ' ' + c.cognome : ''}</span>
            <div class="card-actions">
              <button class="btn btn-sm btn-secondary" data-action="storico-cliente"      data-id="${c.id}">📋 Storico</button>
              <button class="btn btn-sm btn-secondary" data-action="bici-cliente"         data-id="${c.id}">🚲 Bici</button>
              <button class="btn btn-sm btn-primary"   data-action="nuovo-ordine-cliente" data-id="${c.id}">+ Ordine</button>
              <button class="btn btn-sm btn-secondary" data-action="edit-cliente"         data-id="${c.id}">✏</button>
              <button class="btn btn-sm btn-danger"    data-action="del-cliente"          data-id="${c.id}">🗑</button>
            </div>
          </div>
          <div class="card-row">
            <span class="card-sub">📞 ${c.telefono || '—'} &nbsp;|&nbsp; ✉ ${c.email || '—'}</span>
          </div>
          ${c.note ? `<span class="card-sub">📝 ${c.note}</span>` : ''}
          <span class="card-sub">
            ${ordini.length} interventi &nbsp;|&nbsp; Speso: ${fmt(totaleSpeso)}
            ${attivi > 0 ? `&nbsp;<span class="card-badge badge-in-lavorazione">${attivi} in corso</span>` : ''}
            ${c.createdAt ? `&nbsp;|&nbsp; cliente dal ${fmtDay(c.createdAt)}` : ''}
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
          (o.biciNome || '').toLowerCase().includes(q) ||
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
            <span class="card-title">👤 ${c ? [c.nome, c.cognome].filter(Boolean).join(' ') : 'Cliente rimosso'}</span>
            ${badgeStato(o.stato)}
          </div>
          <span class="card-sub">
            ${o.biciNome ? `🚲 ${o.biciNome} &nbsp;|&nbsp; ` : ''}
            Ingresso: ${fmtDate(o.dataIngresso)}
            ${o.dataUscita ? '&nbsp;|&nbsp; Uscita: ' + fmtDate(o.dataUscita) : ''}
          </span>
          ${o.note ? `<span class="card-sub">📝 ${o.note}</span>` : ''}
          <span class="card-sub">${o.pagato ? '✅ Pagato' : '⚠ Non pagato'}</span>
          <div>${vociHtml || '<span class="card-sub">Nessuna lavorazione</span>'}</div>
          <div class="card-row">
            <strong>${fmt(o.totale)}</strong>
            <div class="card-actions">
              ${btnAvanza(o)}
              ${o.pagato
                ? `<button class="btn btn-sm btn-secondary" data-action="toggle-pagato" data-id="${o.id}">Annulla pagato</button>`
                : `<button class="btn btn-sm btn-primary" data-action="toggle-pagato" data-id="${o.id}">Segna pagato</button>`}
              ${o.stato === 'consegnata'
                ? `<button class="btn btn-sm btn-secondary" data-action="riapri-ordine" data-id="${o.id}">↩ Riapri</button>`
                : ''}
              <button class="btn btn-sm btn-secondary" data-action="print-ordine" data-id="${o.id}" title="Stampa / PDF">🖨️</button>
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
  let _storicoOrdini    = [];
  let _storicoClienteId = null;

  async function apriModalStorico(clienteId) {
    const [cliente, tuttiOrdini] = await Promise.all([
      ClientiService.findById(clienteId),
      OrdiniService.getByCliente(clienteId),
    ]);

    document.getElementById('modal-storico').dataset.clienteId = clienteId;

    _storicoOrdini    = tuttiOrdini.sort((a, b) =>
      new Date(b.dataIngresso) - new Date(a.dataIngresso)
    );
    _storicoClienteId = clienteId;

    document.getElementById('storico-cliente-nome').textContent = [cliente.nome, cliente.cognome].filter(Boolean).join(' ');
    document.getElementById('storico-cliente-info').textContent =
      [cliente.telefono, cliente.email].filter(Boolean).join('  ·  ');

    const consegnati  = _storicoOrdini.filter(o => o.stato === 'consegnata');
    const totaleSpeso = OrdiniService.calcolaIncasso(consegnati);
    const media       = consegnati.length ? totaleSpeso / consegnati.length : 0;

    document.getElementById('storico-stat-ordini').textContent = _storicoOrdini.length;
    document.getElementById('storico-stat-chiusi').textContent = consegnati.length;
    document.getElementById('storico-stat-speso').textContent  = fmt(totaleSpeso);
    document.getElementById('storico-stat-media').textContent  = fmt(media);
    document.getElementById('storico-stat-ultima').textContent =
      _storicoOrdini.length ? fmtDate(_storicoOrdini[0].dataIngresso) : '—';

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

    container.innerHTML = ordini.map(o => {
      const vociHtml = o.voci.map(v =>
        `<span class="tag">${v.nome} — ${fmt(v.prezzo)}${v.note ? ` (${v.note})` : ''}</span>`
      ).join('');
      return `
        <div class="storico-ordine-card stato-${o.stato}">
          <div class="storico-ordine-header">
            <div>
              <span class="storico-ordine-data">📅 ${fmtDate(o.dataIngresso)}</span>
              ${o.dataUscita
                ? `<span class="storico-ordine-uscita">→ ${fmtDate(o.dataUscita)}</span>`
                : ''}
              ${o.biciNome ? `<span class="card-sub" style="margin-left:.4rem">🚲 ${o.biciNome}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:.6rem;">
              ${badgeStato(o.stato)}
              <span class="storico-ordine-totale">${fmt(o.totale)}</span>
              <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}">✏</button>
            </div>
          </div>
          ${o.note ? `<p class="card-sub" style="margin-bottom:.3rem">📝 ${o.note}</p>` : ''}
          <p class="card-sub" style="margin-bottom:.3rem">${o.pagato ? '✅ Pagato' : '⚠ Non pagato'}</p>
          <div class="storico-voci">
            ${vociHtml || '<span class="card-sub">Nessuna lavorazione registrata</span>'}
          </div>
        </div>`;
    }).join('');
  }

  function filtraStorico(query) {
    if (!query.trim()) { renderStoricoLista(_storicoOrdini); return; }
    const q        = query.toLowerCase().trim();
    const filtrati = _storicoOrdini.filter(o =>
      (o.note || '').toLowerCase().includes(q) ||
      (o.biciNome || '').toLowerCase().includes(q) ||
      o.voci.some(v =>
        v.nome.toLowerCase().includes(q) ||
        (v.note || '').toLowerCase().includes(q)
      ) ||
      fmtDate(o.dataIngresso).includes(q)
    );
    renderStoricoLista(filtrati);
  }

  // ── Bici Cliente ──────────────────────────────────────────────
  async function apriModalBiciCliente(clienteId) {
    const [cliente, bici] = await Promise.all([
      ClientiService.findById(clienteId),
      BiciService.getByCliente(clienteId),
    ]);
    document.getElementById('bici-cliente-nome').textContent = [cliente.nome, cliente.cognome].filter(Boolean).join(' ');
    document.getElementById('bici-cliente-id-hidden').value  = clienteId;
    renderBiciList(bici);
    openModal('modal-bici-cliente');
  }

  function renderBiciList(bici) {
    const container = document.getElementById('bici-attuali-list');
    if (!bici.length) {
      container.innerHTML = emptyState('Nessuna bici associata. Clicca "+ Aggiungi Bici".');
      return;
    }
    container.innerHTML = bici.map(b => {
      const nome = [b.marca, b.modello].filter(Boolean).join(' ');
      return `
        <div class="card" style="margin-bottom:.5rem">
          <div class="card-row">
            <span class="card-title">🚲 ${nome}</span>
            <div class="card-actions">
              ${tagTipo(b.tipo)}
              <button class="btn btn-sm btn-secondary" data-action="edit-bici" data-id="${b.id}">✏</button>
              <button class="btn btn-sm btn-danger"    data-action="del-bici"  data-id="${b.id}">🗑</button>
            </div>
          </div>
          <div class="card-sub" style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.2rem">
            ${b.colore ? `<span>🎨 ${b.colore}</span>` : ''}
            ${b.seriale_forcella ? `<span>🔧 Forcella: ${b.seriale_forcella}</span>` : ''}
            ${b.seriale_ammortizzatore ? `<span>🔧 Ammortizzatore: ${b.seriale_ammortizzatore}</span>` : ''}
          </div>
          ${b.note ? `<span class="card-sub">📝 ${b.note}</span>` : ''}
        </div>`;
    }).join('');
  }

  async function apriModalAggiungiBici(clienteId, biciId = null) {
    const b = biciId ? await BiciService.findById(biciId) : null;
    document.getElementById('modal-aggiungi-bici-title').textContent = b ? '✏ Modifica Bici' : '➕ Aggiungi Bici';
    document.getElementById('bici-id').value                         = b?.id      || '';
    document.getElementById('bici-cliente-id-hidden').value          = clienteId;
    document.getElementById('bici-marca').value                      = b?.marca   || '';
    document.getElementById('bici-modello').value                    = b?.modello || '';
    document.getElementById('bici-tipo').value                       = b?.tipo    || 'strada';
    document.getElementById('bici-colore').value                     = b?.colore  || '';
    document.getElementById('bici-ser-forcella').value               = b?.seriale_forcella       || '';
    document.getElementById('bici-ser-ammortizzatore').value         = b?.seriale_ammortizzatore || '';
    document.getElementById('bici-note').value                       = b?.note    || '';
    openModal('modal-aggiungi-bici');
    document.getElementById('bici-marca').focus();
  }

  // ── Modal Ordine ──────────────────────────────────────────────
  async function aggiornaBiciSelect(clienteId, biciIdSelezionata = null) {
    const sel = document.getElementById('ordine-bici-id');
    sel.innerHTML = '<option value="">— Nessuna bici specifica —</option>';
    if (!clienteId) return;
    const bici = await BiciService.getByCliente(clienteId);
    bici.forEach(b => {
      const opt       = document.createElement('option');
      opt.value       = b.id;
      opt.textContent = [b.marca, b.modello].filter(Boolean).join(' ');
      if (b.id === biciIdSelezionata) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  async function apriModalOrdine(ordineId = null, preselezionaClienteId = null) {
    const [ordine, clienti, lavorazioni] = await Promise.all([
      ordineId ? OrdiniService.findById(ordineId) : Promise.resolve(null),
      ClientiService.getAll(),
      LavorazioniService.getAll(),
    ]);

    document.getElementById('modal-ordine-title').textContent = ordine ? 'Modifica Ordine' : 'Nuovo Ordine';
    document.getElementById('ordine-id').value   = ordine?.id   || '';
    document.getElementById('ordine-note').value = ordine?.note || '';
    document.getElementById('ordine-pagato').checked = Boolean(ordine?.pagato);

    const dtInput = document.getElementById('ordine-data-ingresso');
    dtInput.value = toDatetimeLocal(ordine?.dataIngresso || new Date().toISOString());

    const inputCliente = document.getElementById('ordine-cliente-input');
    const hiddenCliente = document.getElementById('ordine-cliente-id');
    inputCliente.value = '';
    hiddenCliente.value = '';
    const displayMap = {};
    function displayFor(c) {
      const nome = [c.nome, c.cognome].filter(Boolean).join(' ');
      return `${nome}${c.telefono ? ' — ' + c.telefono : ''}${c.email ? ' • ' + c.email : ''}`;
    }

    const clientiItems = clienti.map(c => {
      const disp = displayFor(c);
      displayMap[disp] = c.id;
      return { id: c.id, display: disp };
    });

    const existingSuggestion = document.getElementById('ordine-clienti-suggestions');
    if (existingSuggestion) existingSuggestion.remove();
    const suggestions = document.createElement('div');
    suggestions.id = 'ordine-clienti-suggestions';
    suggestions.className = 'clienti-suggestions hidden';
    inputCliente.parentElement.style.position = 'relative';
    inputCliente.insertAdjacentElement('afterend', suggestions);

    function renderClientSuggestions(query = '') {
      const q = query.toLowerCase().trim();
      const matches = clientiItems
        .filter(item => !q || item.display.toLowerCase().includes(q))
        .slice(0, 8);
      suggestions.innerHTML = matches.map(item =>
        `<div class="clienti-suggestion" data-id="${item.id}" data-value="${item.display}">${item.display}</div>`
      ).join('');
      suggestions.classList.toggle('hidden', matches.length === 0);
    }

    const originalClienteId      = ordine?.clienteId || null;
    let   originalClienteDisplay  = '';

    function selectCliente(display, id, skipConfirm = false) {
      if (!skipConfirm && originalClienteId && id && id !== originalClienteId) {
        if (!confirm('Stai cambiando il cliente dell\'ordine. Sei sicuro?')) {
          // Ripristina valore originale
          inputCliente.value  = originalClienteDisplay;
          hiddenCliente.value = originalClienteId;
          suggestions.classList.add('hidden');
          return;
        }
      }
      inputCliente.value  = display;
      hiddenCliente.value = id || '';
      suggestions.classList.add('hidden');
      if (!skipConfirm) aggiornaBiciSelect(id || null, ordine?.biciId || null);
    }

    // Preseleziona cliente se necessario
    if (ordine?.clienteId) {
      const c = clienti.find(x => x.id === ordine.clienteId);
      if (c) {
        selectCliente(displayFor(c), c.id, true);
        originalClienteDisplay = displayFor(c);
      }
    } else if (preselezionaClienteId) {
      const c = clienti.find(x => x.id === preselezionaClienteId);
      if (c) selectCliente(displayFor(c), c.id, true);
    }

    inputCliente.oninput = function () {
      const val     = this.value;
      const newId   = displayMap[val] || '';
      // Se in modifica e il testo corrisponde a un cliente diverso, chiedi conferma
      if (originalClienteId && newId && newId !== originalClienteId) {
        if (!confirm('Stai cambiando il cliente dell\'ordine. Sei sicuro?')) {
          inputCliente.value  = originalClienteDisplay;
          hiddenCliente.value = originalClienteId;
          suggestions.classList.add('hidden');
          aggiornaBiciSelect(originalClienteId, ordine?.biciId || null);
          return;
        }
      }
      hiddenCliente.value = newId;
      if (!val.trim()) hiddenCliente.value = '';
      renderClientSuggestions(val);
      aggiornaBiciSelect(hiddenCliente.value || null, ordine?.biciId || null);
    };

    inputCliente.addEventListener('focus', () => {
      renderClientSuggestions('');
    });

    suggestions.addEventListener('mousedown', (ev) => {
      const item = ev.target.closest('.clienti-suggestion');
      if (!item) return;
      selectCliente(item.dataset.value, item.dataset.id);
      ev.preventDefault();
    });

    inputCliente.addEventListener('blur', () => {
      setTimeout(() => suggestions.classList.add('hidden'), 150);
    });

    const clienteIdAttivo = hiddenCliente.value || preselezionaClienteId || ordine?.clienteId || null;
    await aggiornaBiciSelect(clienteIdAttivo, ordine?.biciId || null);

    // Costruisce mappa lavorazioni per il dropdown custom
    _lavorazioniMap = {};
    lavorazioni.forEach(l => {
      const disp = l.nome;
      _lavorazioniMap[disp] = { id: l.id, prezzo: l.prezzo, nome: l.nome, display: disp };
      _lavorazioniMap[l.id] = _lavorazioniMap[disp];
    });

    document.getElementById('tbody-voci').innerHTML = '';
    (ordine?.voci || []).forEach(v => aggiungiRigaVoce(v));
    aggiornaLocale();
    openModal('modal-ordine');
  }

  function aggiungiRigaVoce(voce = {}) {
    const tbody = document.getElementById('tbody-voci');
    const tr    = document.createElement('tr');
    tr.innerHTML = `
      <td style="position:relative">
        <input type="text" class="inp-lavorazione" autocomplete="off" placeholder="— Scegli —" value="${voce.nome || ''}" />
        <input type="hidden" class="hid-lavorazione-id" value="${voce.lavorazioneId || ''}" />
        <div class="lav-suggestions hidden"></div>
      </td>
      <td><input type="text"   class="inp-note-voce"   placeholder="Note…" value="${voce.note   || ''}" /></td>
      <td><input type="number" class="inp-prezzo-voce" step="0.10" min="0"  value="${parseFloat(voce.prezzo || 0).toFixed(2)}" style="width:90px" /></td>
      <td><button type="button" class="btn btn-sm btn-danger btn-rimuovi-voce">✕</button></td>
    `;

    const inpLav = tr.querySelector('.inp-lavorazione');
    const hidLav = tr.querySelector('.hid-lavorazione-id');
    const priceI = tr.querySelector('.inp-prezzo-voce');
    const sugDiv = tr.querySelector('.lav-suggestions');

    // Lista unica ordinata per nome
    const lavList = Object.entries(_lavorazioniMap)
      .filter(([k, v]) => k === v.display)
      .map(([, v]) => v)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    function renderLavSuggestions(query = '') {
      const q = query.toLowerCase().trim();
      const matches = lavList
        .filter(item => !q || item.nome.toLowerCase().includes(q))
        .slice(0, 10);
      sugDiv.innerHTML = matches
        .map(item => `<div class="lav-suggestion" data-id="${item.id}" data-value="${item.display}" data-price="${item.prezzo}">${item.display}</div>`)
        .join('');
      sugDiv.classList.toggle('hidden', matches.length === 0);
    }

    function selectLavorazione(display, id, price) {
      inpLav.value = display;
      hidLav.value = id;
      priceI.value = parseFloat(price || 0).toFixed(2);
      sugDiv.classList.add('hidden');
      aggiornaLocale();
    }

    // Pre-fill se voce esistente: aggiorna solo la label, NON il prezzo
    // (il prezzo salvato nell'ordine è già impostato nell'input via HTML)
    if (hidLav.value && _lavorazioniMap[hidLav.value]) {
      const m = _lavorazioniMap[hidLav.value];
      inpLav.value = m.nome;
    }

    inpLav.addEventListener('focus', () => renderLavSuggestions(''));
    inpLav.addEventListener('input', function () {
      renderLavSuggestions(this.value);
      const m = _lavorazioniMap[this.value];
      hidLav.value = m?.id || '';
      if (m) priceI.value = (m.prezzo || 0).toFixed(2);
      aggiornaLocale();
    });
    inpLav.addEventListener('blur', () => {
      setTimeout(() => sugDiv.classList.add('hidden'), 150);
    });
    sugDiv.addEventListener('mousedown', ev => {
      const item = ev.target.closest('.lav-suggestion');
      if (!item) return;
      selectLavorazione(item.dataset.value, item.dataset.id, item.dataset.price);
      ev.preventDefault();
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
      const hid   = tr.querySelector('.hid-lavorazione-id');
      const lavId = hid ? hid.value : '';
      if (!lavId) return;
      voci.push({
        lavorazioneId: lavId,
        nome:          tr.querySelector('.inp-lavorazione')?.value  || '',
        note:          tr.querySelector('.inp-note-voce')?.value    || '',
        prezzo:        parseFloat(tr.querySelector('.inp-prezzo-voce')?.value) || 0,
      });
    });
    return voci;
  }

  // ── Modal Cliente ─────────────────────────────────────────────
  async function apriModalCliente(clienteId = null) {
    const c = clienteId ? await ClientiService.findById(clienteId) : null;
    document.getElementById('modal-cliente-title').textContent = c ? 'Modifica Cliente' : 'Nuovo Cliente';
    document.getElementById('cliente-id').value       = c?.id       || '';
    document.getElementById('cliente-nome').value     = c?.nome     || '';
    document.getElementById('cliente-cognome').value   = c?.cognome  || '';
    document.getElementById('cliente-telefono').value = c?.telefono || '';
    document.getElementById('cliente-email').value    = c?.email    || '';
    document.getElementById('cliente-note').value     = c?.note     || '';
    openModal('modal-cliente');
    document.getElementById('cliente-nome').focus();
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

  // ── Modal helpers ─────────────────────────────────────────────
  function openModal(id) {
    const openCount = document.querySelectorAll('.modal:not(.hidden)').length;
    const el = document.getElementById(id);
    if (openCount > 0) {
      el.style.zIndex = 500 + (openCount + 1) * 20;
    } else {
      el.style.zIndex = '';
    }
    el.classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => {
      m.classList.add('hidden');
      m.style.zIndex = '';
    });
    document.getElementById('overlay').classList.add('hidden');
  }

  // ── Utility ───────────────────────────────────────────────────
  function toDatetimeLocal(iso) {
    if (!iso) return '';
    const d   = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── Stampa ordine ─────────────────────────────────────────────
  async function printOrdine(id) {
    const [ordine, clienti] = await Promise.all([
      OrdiniService.findById(id),
      ClientiService.getAll(),
    ]);
    const c           = clienti.find(x => x.id === ordine.clienteId);
    const nomeCliente = c ? [c.nome, c.cognome].filter(Boolean).join(' ') : 'Cliente sconosciuto';
    const statoLabel  = { accettata: 'Accettata', in_lavorazione: 'In lavorazione', pronto: 'Pronto al ritiro', consegnata: 'Consegnata' }[ordine.stato] || ordine.stato;
    const fmtEur      = n => '€\u00a0' + (n || 0).toFixed(2).replace('.', ',');
    const fmtDt       = iso => iso ? new Date(iso).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

    const vociRows = ordine.voci.map(v =>
      `<tr><td>${v.nome}</td><td>${v.note || ''}</td><td class="num">${fmtEur(v.prezzo)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Ordine — ${nomeCliente}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#222;padding:28px 32px}
  h1{font-size:19px;margin-bottom:3px}
  .sub{color:#888;font-size:11px;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:16px}
  .field .lbl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#777}
  .field .val{font-size:13px;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  th{background:#f4f4f4;text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #ddd}
  td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top}
  .num{text-align:right;white-space:nowrap}
  .tot td{font-weight:bold;font-size:14px;border-top:2px solid #333;border-bottom:none}
  .badge{display:inline-block;padding:1px 7px;border-radius:3px;font-size:11px;font-weight:bold}
  .pagato{background:#d1fae5;color:#065f46}
  .non-pagato{background:#fef3c7;color:#92400e}
  .footer{margin-top:20px;padding-top:10px;border-top:1px solid #eee;font-size:10px;color:#aaa}
  @media print{body{padding:12px}}
</style></head><body>
<h1>🚲 Cerica Bikelab — Ordine di lavoro</h1>
<div class="sub">Stampato il ${new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })}</div>
<div class="grid">
  <div class="field"><div class="lbl">Cliente</div><div class="val">${nomeCliente}${c?.telefono ? ' &nbsp;·&nbsp; ' + c.telefono : ''}</div></div>
  ${ordine.biciNome ? `<div class="field"><div class="lbl">Bici</div><div class="val">🚲 ${ordine.biciNome}</div></div>` : '<div></div>'}
  <div class="field"><div class="lbl">Stato</div><div class="val">${statoLabel} &nbsp;<span class="badge ${ordine.pagato ? 'pagato' : 'non-pagato'}">${ordine.pagato ? '✅ Pagato' : '⚠ Non pagato'}</span></div></div>
  <div class="field"><div class="lbl">Ingresso</div><div class="val">${fmtDt(ordine.dataIngresso)}${ordine.dataUscita ? ' &nbsp;·&nbsp; Uscita: ' + fmtDt(ordine.dataUscita) : ''}</div></div>
  ${ordine.note ? `<div class="field" style="grid-column:1/-1"><div class="lbl">Note</div><div class="val">${ordine.note}</div></div>` : ''}
</div>
<table>
  <thead><tr><th>Lavorazione</th><th>Note</th><th class="num">Prezzo</th></tr></thead>
  <tbody>
    ${vociRows}
    <tr class="tot"><td colspan="2">Totale</td><td class="num">${fmtEur(ordine.totale)}</td></tr>
  </tbody>
</table>
<div class="footer">CicloDesk v1.6.0</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`;

    const w = window.open('', '_blank', 'width=700,height=820');
    w.document.write(html);
    w.document.close();
  }

  return {
    renderDashboard, renderClienti, renderOrdini, renderCatalogo,
    apriModalCliente, apriModalOrdine, apriModalLavorazione,
    apriModalStorico, filtraStorico,
    apriModalBiciCliente, renderBiciList, apriModalAggiungiBici, aggiornaBiciSelect,
    aggiungiRigaVoce, raccogliVoci,
    openModal, closeAllModals,
    printOrdine,
  };
})();
