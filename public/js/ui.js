const UI = (() => {

  // ── Helpers ───────────────────────────────────────────────────
  function esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

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

  function emptyState(msg, type = 'generic') {
    const svgs = {
      generic: `<svg width="64" height="64" fill="none" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M22 34h20M22 28h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
      clienti: `<svg width="64" height="64" fill="none" viewBox="0 0 64 64"><circle cx="32" cy="24" r="10" stroke="currentColor" stroke-width="2" opacity=".4"/><path d="M16 52c0-8.8 7.2-16 16-16s16 7.2 16 16" stroke="currentColor" stroke-width="2" opacity=".3"/></svg>`,
      ordini: `<svg width="64" height="64" fill="none" viewBox="0 0 64 64"><rect x="14" y="10" width="36" height="44" rx="4" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M22 22h20M22 30h14M22 38h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".4"/></svg>`,
      bici: `<svg width="64" height="64" fill="none" viewBox="0 0 64 64"><circle cx="20" cy="42" r="10" stroke="currentColor" stroke-width="2" opacity=".3"/><circle cx="44" cy="42" r="10" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M20 42l12-20h8l4 20M32 22l12 20" stroke="currentColor" stroke-width="2" opacity=".4"/></svg>`,
    };
    return `<div class="empty-state">${svgs[type] || svgs.generic}<p>${msg}</p></div>`;
  }

  // ── Badge stato ordine ────────────────────────────────────────
  const STATO_CFG = {
    accettata: { cls: 'badge-accettata', label: '📥 Accettata' },
    in_lavorazione: { cls: 'badge-in-lavorazione', label: '🔧 In lavorazione' },
    pronto: { cls: 'badge-pronto', label: '✅ Pronto al ritiro' },
    consegnata: { cls: 'badge-consegnata', label: '📦 Consegnata' },
  };

  function aggiornaColorStato() {
    const sel = document.getElementById('ordine-stato');
    sel.className = 'stato-' + sel.value;
  }
  document.getElementById('ordine-stato').addEventListener('change', aggiornaColorStato);

  function badgeStato(stato) {
    const cfg = STATO_CFG[stato] || STATO_CFG.accettata;
    return `<span class="card-badge ${cfg.cls}">${cfg.label}</span>`;
  }

  // Pulsante avanza (non mostrato se già consegnata)
  function btnAvanza(o) {
    const labels = {
      accettata: '🔧 Inizia',
      in_lavorazione: '✅ Pronto',
      pronto: '📦 Consegna',
    };
    if (!labels[o.stato]) return '';
    return `<button class="btn btn-sm btn-primary" data-action="avanza-ordine" data-id="${o.id}">${labels[o.stato]}</button>`;
  }

  // Tipo bici: etichetta leggibile
  const TIPO_CFG = {
    strada: { label: '🚴 Strada', cls: 'tag-tipo tag-strada' },
    mtb: { label: '🏔️ MTB', cls: 'tag-tipo tag-mtb' },
    emtb: { label: '⚡🏔️ E-MTB', cls: 'tag-tipo tag-emtb' },
    ebike: { label: '⚡ E-Bike', cls: 'tag-tipo tag-ebike' },
    monopattino_e: { label: '⚡🛴 Monopattino Elett.', cls: 'tag-tipo tag-monopattino-e' },
  };
  function tagTipo(tipo) {
    const t = TIPO_CFG[tipo] || TIPO_CFG.strada;
    return `<span class="${t.cls}">${t.label}</span>`;
  }

  // Mappa lavorazioni per datalist: display -> {id, prezzo, nome}
  let _lavorazioniMap = {};

  // Mappa componenti per autocomplete ricambi: display/id -> {id, nome, marca, giacenza, prezzo_vendita, display}
  let _componentiMap = {};
  let _componentiList = [];

  // Paginazione ordini
  let _ordiniVisibili = 50;
  let _lastOrdiniFilterKey = '';

  // ── Dashboard ─────────────────────────────────────────────────
  async function renderDashboard() {
    const [tutti, clienti] = await Promise.all([
      OrdiniService.getAll(),
      ClientiService.getAll(),
    ]);

    const inOfficina = tutti.filter(o => o.stato !== 'consegnata');
    const pronti = tutti.filter(o => o.stato === 'pronto');
    const oggi = new Date().toDateString();
    const consOggi = tutti.filter(o =>
      o.stato === 'consegnata' && o.dataUscita &&
      new Date(o.dataUscita).toDateString() === oggi
    );

    document.getElementById('stat-num-clienti').textContent = clienti.length;
    document.getElementById('stat-num-in').textContent = inOfficina.length;
    document.getElementById('stat-num-pronto').textContent = pronti.length;
    document.getElementById('stat-num-out').textContent = consOggi.length;

    // Consegnati non pagati
    const consNonPagati = tutti.filter(o => o.stato === 'consegnata' && !o.pagato);
    document.getElementById('stat-num-non-pagato').textContent = consNonPagati.length;

    // ── Notifiche: ordini fermi da >48h ─────────────────────────
    const alertsContainer = document.getElementById('dashboard-alerts');
    const ORE_SOGLIA = 48;
    const adesso = Date.now();
    const fermi = inOfficina.filter(o => {
      const ingresso = new Date(o.dataIngresso).getTime();
      const orePassate = (adesso - ingresso) / (1000 * 60 * 60);
      return orePassate > ORE_SOGLIA;
    });
    const clientiMap = Object.fromEntries(clienti.map(c => [c.id, c]));

    if (fermi.length) {
      alertsContainer.innerHTML = `
        <div class="alert alert-warning">
          <strong>⚠️ ${fermi.length} ordin${fermi.length === 1 ? 'e fermo' : 'i fermi'} da più di 48h:</strong>
          <ul>${fermi.map(o => {
        const c = clientiMap[o.clienteId];
        const nome = c ? [c.nome, c.cognome].filter(Boolean).join(' ') : 'Cliente sconosciuto';
        const ore = Math.round((adesso - new Date(o.dataIngresso).getTime()) / (1000 * 60 * 60));
        const gg = Math.floor(ore / 24);
        return `<li>${esc(nome)} — ${esc(o.biciNome) || 'ordine'} (${gg}g ${ore % 24}h) <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}">Apri</button></li>`;
      }).join('')}</ul>
        </div>`;
      // Beep notification (#13)
      beepNotifica();
    } else {
      alertsContainer.innerHTML = '';
    }

    // Alert ricambi in attesa
    const ordiniConRicambi = inOfficina.filter(o =>
      o.ricambi && o.ricambi.some(r => r.stato !== 'ricevuto')
    );
    if (ordiniConRicambi.length) {
      alertsContainer.innerHTML += `
        <div class="alert alert-info">
          <strong>📦 ${ordiniConRicambi.length} ordin${ordiniConRicambi.length === 1 ? 'e' : 'i'} con ricambi in attesa:</strong>
          <ul>${ordiniConRicambi.map(o => {
        const c = clientiMap[o.clienteId];
        const nome = c ? [c.nome, c.cognome].filter(Boolean).join(' ') : 'Cliente sconosciuto';
        const pending = o.ricambi.filter(r => r.stato !== 'ricevuto');
        return `<li>${esc(nome)} — ${pending.map(r => esc(r.nome) + (r.stato === 'ordinato' ? ' 🟡' : ' 🔴')).join(', ')} <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}">Apri</button></li>`;
      }).join('')}</ul>
        </div>`;
    }

    // Alert magazzino sotto soglia
    try {
      const sottoSoglia = await ComponentiService.getSottoSoglia();
      if (sottoSoglia.length) {
        alertsContainer.innerHTML += `
          <div class="alert alert-warning">
            <strong>🚨 ${sottoSoglia.length} component${sottoSoglia.length === 1 ? 'e' : 'i'} sotto soglia di riordino:</strong>
            <ul>${sottoSoglia.slice(0, 10).map(c =>
              `<li>${esc(c.nome)}${c.marca ? ' (' + esc(c.marca) + ')' : ''} — ${c.giacenza} disponibil${c.giacenza === 1 ? 'e' : 'i'} (soglia ${c.soglia_min}) <button class="btn btn-sm btn-secondary" data-action="edit-componente" data-id="${c.id}">Apri</button></li>`
            ).join('')}${sottoSoglia.length > 10 ? `<li>… e altri ${sottoSoglia.length - 10}</li>` : ''}</ul>
          </div>`;
      }
    } catch { /* magazzino non disponibile */ }

    const container = document.getElementById('dashboard-in-list');

    if (!inOfficina.length) {
      container.innerHTML = emptyState('Nessuna bici in officina al momento.', 'bici');
      return;
    }

    container.innerHTML = inOfficina.map(o => {
      const c = clientiMap[o.clienteId];
      return `
        <div class="card stato-${o.stato}">
          <div class="card-row">
            <span class="card-title">🚲 ${esc(c ? [c.nome, c.cognome].filter(Boolean).join(' ') : 'Cliente sconosciuto')}</span>
            ${badgeStato(o.stato)}
          </div>
          <span class="card-sub">
            ${esc(o.biciNome) || '—'} &nbsp;|&nbsp; Ingresso: ${fmtDate(o.dataIngresso)}
          </span>
          <span class="card-sub">
            ${o.voci.length} lavorazion${o.voci.length === 1 ? 'e' : 'i'} —
            <strong>${fmt(o.totale)}</strong>
            ${badgeCommenti(o.commenti)}
          </span>
          ${badgeRicambi(o.ricambi)}
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
      container.innerHTML = emptyState('Nessun cliente trovato.', 'clienti');
      return;
    }

    // Ordinamento alfabetico per cognome (#2)
    clienti.sort((a, b) => (a.cognome || '').localeCompare(b.cognome || '') || (a.nome || '').localeCompare(b.nome || ''));

    container.innerHTML = clienti.map(c => {
      const ordini = tuttiOrdini.filter(o => o.clienteId === c.id);
      const attivi = ordini.filter(o => o.stato !== 'consegnata').length;
      const totaleSpeso = OrdiniService.calcolaIncasso(ordini.filter(o => o.stato === 'consegnata'));
      return `
        <div class="card">
          <div class="card-row">
            <span class="card-title">👤 ${esc(c.nome)}${c.cognome ? ' ' + esc(c.cognome) : ''}</span>
            <div class="card-actions">
              <button class="btn btn-sm btn-secondary" data-action="storico-cliente"      data-id="${c.id}" aria-label="Storico">📋 Storico</button>
              <button class="btn btn-sm btn-secondary" data-action="bici-cliente"         data-id="${c.id}" aria-label="Bici">🚲 Bici</button>
              <button class="btn btn-sm btn-primary"   data-action="nuovo-ordine-cliente" data-id="${c.id}">+ Ordine</button>
              <button class="btn btn-sm btn-secondary" data-action="edit-cliente"         data-id="${c.id}" aria-label="Modifica">✏</button>
              <button class="btn btn-sm btn-danger"    data-action="del-cliente"          data-id="${c.id}" aria-label="Elimina">🗑</button>
            </div>
          </div>
          <div class="card-row">
            <span class="card-sub">📞 ${esc(c.telefono) || '—'} &nbsp;|&nbsp; ✉ ${esc(c.email) || '—'}</span>
          </div>
          ${c.note ? `<span class="card-sub">📝 ${esc(c.note)}</span>` : ''}
          <span class="card-sub">
            ${ordini.length} interventi &nbsp;|&nbsp; Speso: ${fmt(totaleSpeso)}
            ${attivi > 0 ? `&nbsp;<span class="card-badge badge-in-lavorazione">${attivi} in corso</span>` : ''}
            ${c.createdAt ? `&nbsp;|&nbsp; cliente dal ${fmtDay(c.createdAt)}` : ''}
          </span>
        </div>`;
    }).join('');
  }

  // ── Ordini ────────────────────────────────────────────────────
  async function renderOrdini(filtro = 'tutti', query = '', filtriExtra = {}) {
    // Reset paginazione se filtri cambiano
    const filterKey = JSON.stringify({ filtro, query, filtriExtra });
    if (filterKey !== _lastOrdiniFilterKey) {
      _ordiniVisibili = 50;
      _lastOrdiniFilterKey = filterKey;
    }

    const [tuttiOrdini, clienti] = await Promise.all([
      OrdiniService.getAll(),
      ClientiService.getAll(),
    ]);
    const clientiMap = Object.fromEntries(clienti.map(c => [c.id, c]));

    // ── Cestino: vista speciale ──
    if (filtro === 'cestino') {
      const cestino = await OrdiniService.getCestino();
      const container = document.getElementById('ordini-list');
      const kanbanContainer = document.getElementById('ordini-kanban');
      if (kanbanContainer) kanbanContainer.classList.add('hidden');
      if (!cestino.length) {
        container.innerHTML = emptyState('Il cestino è vuoto.', 'ordini');
        return;
      }
      container.innerHTML = `<p class="cestino-info">🗑 Ordini eliminati. Puoi ripristinarli o eliminarli definitivamente.</p>` +
        cestino.map(o => {
          const delDate = o.deletedAt ? fmtDate(o.deletedAt) : '';
          return `
          <div class="card stato-deleted">
            <div class="card-row">
              <span class="card-title">👤 ${esc(o.clienteNome || 'Cliente rimosso')}</span>
              <span class="card-sub">Eliminato: ${delDate}</span>
            </div>
            <span class="card-sub">${fmt(o.totale || 0)} — ${badgeStato(o.stato)}</span>
            <div class="card-actions">
              <button class="btn btn-sm btn-primary" data-action="ripristina-ordine" data-id="${o.id}">↩ Ripristina</button>
              <button class="btn btn-sm btn-danger" data-action="del-ordine-permanente" data-id="${o.id}">🗑 Elimina definitivamente</button>
            </div>
          </div>`;
        }).join('');
      return;
    }

    // Popola select filtro cliente (#3)
    const selCliente = document.getElementById('filter-ordini-cliente');
    if (selCliente && selCliente.options.length <= 1) {
      const sorted = [...clienti].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
      sorted.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = [c.cognome, c.nome].filter(Boolean).join(' ');
        selCliente.appendChild(opt);
      });
    }

    let ordini = tuttiOrdini;
    if (filtro === 'consegnata_non_pagato') {
      ordini = ordini.filter(o => o.stato === 'consegnata' && !o.pagato);
    } else if (filtro === 'consegnata_pagato') {
      ordini = ordini.filter(o => o.stato === 'consegnata' && o.pagato);
    } else if (filtro !== 'tutti') {
      ordini = ordini.filter(o => o.stato === filtro);
    }

    // Filtri avanzati (#3)
    if (filtriExtra.clienteId) ordini = ordini.filter(o => o.clienteId === filtriExtra.clienteId);
    if (filtriExtra.da) {
      const da = new Date(filtriExtra.da).getTime();
      ordini = ordini.filter(o => new Date(o.dataIngresso).getTime() >= da);
    }
    if (filtriExtra.a) {
      const a = new Date(filtriExtra.a).getTime() + 86400000;
      ordini = ordini.filter(o => new Date(o.dataIngresso).getTime() <= a);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      ordini = ordini.filter(o => {
        const c = clientiMap[o.clienteId];
        return (
          (c?.nome || '').toLowerCase().includes(q) ||
          (c?.cognome || '').toLowerCase().includes(q) ||
          (o.biciNome || '').toLowerCase().includes(q) ||
          (o.note || '').toLowerCase().includes(q) ||
          o.voci.some(v =>
            v.nome.toLowerCase().includes(q) ||
            (v.note || '').toLowerCase().includes(q)
          )
        );
      });
    }

    // Ordinamento per data ingresso desc (#2)
    ordini.sort((a, b) => new Date(b.dataIngresso) - new Date(a.dataIngresso));

    const container = document.getElementById('ordini-list');
    const kanbanContainer = document.getElementById('ordini-kanban');

    // Se vista kanban attiva, renderizza kanban
    if (kanbanContainer && !kanbanContainer.classList.contains('hidden')) {
      renderKanban(ordini, clientiMap, tuttiOrdini);
      return;
    }

    if (!ordini.length) {
      container.innerHTML = emptyState('Nessun ordine trovato.', 'ordini');
      return;
    }

    // Paginazione client-side: mostra max PAGE_SIZE ordini
    const PAGE_SIZE = 50;
    const totaleOrdini = ordini.length;
    const mostrare = ordini.slice(0, _ordiniVisibili || PAGE_SIZE);

    container.innerHTML = mostrare.map(o => {
      const c = clientiMap[o.clienteId];
      const vociHtml = o.voci.map(v =>
        `<span class="tag">${esc(v.nome)} — ${fmt(v.prezzo)}${v.note ? ` (${esc(v.note)})` : ''}</span>`
      ).join('');
      const nonPagatoCls = (o.stato === 'consegnata' && !o.pagato) ? ' non-pagato' : '';
      const totale = o.totale || 0;
      const acconto = o.acconto || 0;
      const resto = Math.max(0, totale - acconto);
      const consegnato = o.stato === 'consegnata';
      let pagBoxCls, pagBoxIcon, pagBoxLabel, pagBoxAmount;
      if (o.pagato) {
        pagBoxCls = 'pag-box-saldato';
        pagBoxIcon = '✅';
        pagBoxLabel = 'Saldato';
        pagBoxAmount = fmt(totale);
      } else if (acconto > 0 && resto <= 0) {
        // Acconto ≥ totale ma non marcato pagato → di fatto saldato
        pagBoxCls = 'pag-box-saldato';
        pagBoxIcon = '✅';
        pagBoxLabel = 'Coperto da anticipo';
        pagBoxAmount = fmt(totale);
      } else if (acconto > 0) {
        // Acconto parziale: giallo sia prima sia dopo la consegna
        pagBoxCls = 'pag-box-parziale';
        pagBoxIcon = '🟡';
        pagBoxLabel = consegnato ? `Anticipo ${fmt(acconto)} · Resto` : `Anticipo ${fmt(acconto)} · Mancano`;
        pagBoxAmount = fmt(resto);
      } else if (consegnato) {
        // Ordine consegnato senza alcun pagamento → urgenza vera (rosso)
        pagBoxCls = 'pag-box-aperto';
        pagBoxIcon = '🔴';
        pagBoxLabel = 'Da incassare';
        pagBoxAmount = fmt(totale);
      } else {
        // Ordine non ancora consegnato e senza acconto → semplice promemoria (neutro)
        pagBoxCls = 'pag-box-attesa';
        pagBoxIcon = '💶';
        pagBoxLabel = 'Da saldare alla consegna';
        pagBoxAmount = fmt(totale);
      }
      return `
        <div class="card stato-${o.stato}${nonPagatoCls}">
          <div class="card-row">
            <span class="card-title">👤 ${esc(c ? [c.nome, c.cognome].filter(Boolean).join(' ') : 'Cliente rimosso')}</span>
            <div style="display:flex;align-items:center;gap:.3rem">
              <span class="voci-badge" title="${o.voci.length} lavorazioni">${o.voci.length}</span>
              ${badgeCommenti(o.commenti)}
              ${badgeStato(o.stato)}
            </div>
          </div>
          <span class="card-sub">
            ${o.biciNome ? `🚲 ${esc(o.biciNome)} &nbsp;|&nbsp; ` : ''}
            Ingresso: ${fmtDate(o.dataIngresso)}
            ${o.dataUscita ? '&nbsp;|&nbsp; Uscita: ' + fmtDate(o.dataUscita) : ''}
          </span>
          ${o.note ? `<span class="card-sub">📝 ${esc(o.note)}</span>` : ''}
          ${badgeRicambi(o.ricambi)}
          <div>${vociHtml || '<span class="card-sub">Nessuna lavorazione</span>'}</div>
          <div class="card-row card-row-totale">
            <div class="pag-box ${pagBoxCls}">
              <span class="pag-box-icon">${pagBoxIcon}</span>
              <span class="pag-box-label">${pagBoxLabel}</span>
              <span class="pag-box-amount">${pagBoxAmount}</span>
            </div>
            <div class="card-actions">
              ${btnAvanza(o)}
              ${o.pagato
          ? `<button class="btn btn-sm btn-secondary" data-action="toggle-pagato" data-id="${o.id}">Annulla pagato</button>`
          : `<button class="btn btn-sm btn-primary" data-action="toggle-pagato" data-id="${o.id}">Segna pagato</button>`}
              ${o.stato === 'consegnata'
          ? `<button class="btn btn-sm btn-secondary" data-action="riapri-ordine" data-id="${o.id}">↩ Riapri</button>`
          : ''}
              <button class="btn btn-sm btn-secondary" data-action="print-ordine" data-id="${o.id}" title="Stampa / PDF" aria-label="Stampa">🖨️</button>
              <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}" aria-label="Modifica">✏</button>
              <button class="btn btn-sm btn-danger"    data-action="del-ordine"  data-id="${o.id}" aria-label="Elimina">🗑</button>
            </div>
          </div>
        </div>`;
    }).join('');

    // Pulsante "Carica altri" se ci sono più ordini
    if (mostrare.length < totaleOrdini) {
      container.insertAdjacentHTML('beforeend', `
        <div style="text-align:center;padding:1rem">
          <button class="btn btn-secondary" id="btn-carica-altri-ordini">
            📋 Carica altri (${mostrare.length} di ${totaleOrdini})
          </button>
        </div>
      `);
      document.getElementById('btn-carica-altri-ordini').addEventListener('click', () => {
        _ordiniVisibili = (_ordiniVisibili || PAGE_SIZE) + PAGE_SIZE;
        renderOrdini(filtro, query, filtriExtra);
      });
    }
  }

  // ── Catalogo ──────────────────────────────────────────────────
  async function renderCatalogo() {
    const lavorazioni = await LavorazioniService.getAll();
    const container = document.getElementById('catalogo-list');

    if (!lavorazioni.length) {
      container.innerHTML = emptyState('Nessuna lavorazione nel catalogo.', 'generic');
      return;
    }

    container.innerHTML = lavorazioni.map(l => `
      <div class="card">
        <div class="card-row">
          <span class="card-title">🔩 ${esc(l.nome)}</span>
          <div class="card-actions">
            <span style="font-weight:700;color:var(--primary)">${fmt(l.prezzo)}</span>
            <button class="btn btn-sm btn-secondary" data-action="edit-lavorazione" data-id="${l.id}" aria-label="Modifica">✏</button>
            <button class="btn btn-sm btn-danger"    data-action="del-lavorazione"  data-id="${l.id}" aria-label="Elimina">🗑</button>
          </div>
        </div>
        ${l.descrizione ? `<span class="card-sub">${esc(l.descrizione)}</span>` : ''}
      </div>`
    ).join('');
  }

  // ── Magazzino ─────────────────────────────────────────────────
  function stockBadge(c) {
    const g = c.giacenza || 0;
    const s = c.soglia_min || 0;
    if (g <= 0)      return `<span class="stock-badge stock-out">🔴 Esaurito</span>`;
    if (g <= s)     return `<span class="stock-badge stock-low">🟡 Scorta bassa (${g})</span>`;
    return            `<span class="stock-badge stock-ok">🟢 ${g} disponibili</span>`;
  }

  function cardComponente(c) {
    const meta = [c.marca, c.codice].filter(Boolean).join(' · ');
    const g = c.giacenza || 0;
    const s = c.soglia_min || 0;
    let stockCls = '';
    if (g <= 0) stockCls = ' componente-card-out';
    else if (g <= s) stockCls = ' componente-card-low';
    return `
      <div class="card componente-card${stockCls}">
        <div class="card-row">
          <span class="card-title">🔧 ${esc(c.nome)}${g <= s ? ' <span class="riordina-flag">· da riordinare</span>' : ''}</span>
          <div class="card-actions">
            ${stockBadge(c)}
            <button class="btn btn-sm btn-secondary" data-action="dec-componente" data-id="${c.id}" title="Diminuisci giacenza">−</button>
            <button class="btn btn-sm btn-secondary" data-action="inc-componente" data-id="${c.id}" title="Aumenta giacenza">+</button>
            <button class="btn btn-sm btn-secondary" data-action="storico-componente" data-id="${c.id}" title="Storico movimenti">📜</button>
            <button class="btn btn-sm btn-secondary" data-action="edit-componente" data-id="${c.id}" aria-label="Modifica">✏</button>
            <button class="btn btn-sm btn-danger"    data-action="del-componente"  data-id="${c.id}" aria-label="Elimina">🗑</button>
          </div>
        </div>
        <span class="card-sub">
          ${meta ? esc(meta) + ' · ' : ''}
          ${c.fornitore ? '🏭 ' + esc(c.fornitore) + ' · ' : ''}
          Soglia: ${c.soglia_min || 0}
          ${c.prezzo_vendita ? ' · Vendita: ' + fmt(c.prezzo_vendita) : ''}
          ${c.prezzo_acquisto ? ' · Costo: ' + fmt(c.prezzo_acquisto) : ''}
        </span>
        ${c.note ? `<span class="card-sub">📝 ${esc(c.note)}</span>` : ''}
      </div>`;
  }

  async function renderMagazzino(query = '') {
    const tutti = await ComponentiService.getAll();
    const q = query.toLowerCase().trim();
    const componenti = q
      ? tutti.filter(c =>
          (c.nome || '').toLowerCase().includes(q) ||
          (c.categoria || '').toLowerCase().includes(q) ||
          (c.marca || '').toLowerCase().includes(q) ||
          (c.codice || '').toLowerCase().includes(q) ||
          (c.fornitore || '').toLowerCase().includes(q)
        )
      : tutti;

    // Statistiche
    const totItems = tutti.length;
    const sottoSoglia = tutti.filter(c => (c.giacenza || 0) <= (c.soglia_min || 0));
    document.getElementById('magazzino-stats').innerHTML = `
      <div class="stat-card"><span class="stat-num">${totItems}</span><span class="stat-label">Componenti</span></div>
      <div class="stat-card ${sottoSoglia.length ? 'stat-card-non-pagato' : ''}">
        <span class="stat-num">${sottoSoglia.length}</span>
        <span class="stat-label">Da riordinare</span>
      </div>
    `;

    // (Sezione duplicata "Da riordinare" rimossa: le card sotto-soglia sono evidenziate inline)

    // Lista raggruppata per categoria
    const container = document.getElementById('magazzino-list');
    if (!componenti.length) {
      container.innerHTML = emptyState('Nessun componente in magazzino.', 'generic');
      return;
    }

    // Raggruppa per categoria
    const gruppi = {};
    componenti.forEach(c => {
      const cat = c.categoria || '(Senza categoria)';
      if (!gruppi[cat]) gruppi[cat] = [];
      gruppi[cat].push(c);
    });

    const categorieOrdinate = Object.keys(gruppi).sort((a, b) => a.localeCompare(b));
    container.innerHTML = categorieOrdinate.map(cat => `
      <div class="magazzino-section">
        <h3 class="magazzino-section-title">📂 ${esc(cat)} <span class="card-sub">(${gruppi[cat].length})</span></h3>
        <div class="card-list">${gruppi[cat].map(cardComponente).join('')}</div>
      </div>
    `).join('');
  }

  async function apriModalComponente(componenteId = null) {
    const c = componenteId ? await ComponentiService.findById(componenteId) : null;
    document.getElementById('modal-componente-title').textContent = c ? 'Modifica Componente' : 'Nuovo Componente';
    document.getElementById('componente-id').value = c?.id || '';
    document.getElementById('componente-nome').value = c?.nome || '';
    document.getElementById('componente-categoria').value = c?.categoria || '';
    document.getElementById('componente-marca').value = c?.marca || '';
    document.getElementById('componente-codice').value = c?.codice || '';
    document.getElementById('componente-fornitore').value = c?.fornitore || '';
    document.getElementById('componente-prezzo-acquisto').value = c?.prezzo_acquisto ? c.prezzo_acquisto.toFixed(2) : '';
    document.getElementById('componente-prezzo-vendita').value = c?.prezzo_vendita ? c.prezzo_vendita.toFixed(2) : '';
    document.getElementById('componente-giacenza').value = c?.giacenza ?? 0;
    document.getElementById('componente-soglia').value = c?.soglia_min ?? 1;
    document.getElementById('componente-note').value = c?.note || '';

    // Popola datalist categorie
    try {
      const tutti = await ComponentiService.getAll();
      const cats = [...new Set(tutti.map(x => x.categoria).filter(Boolean))].sort();
      document.getElementById('categorie-list').innerHTML = cats.map(cc => `<option value="${esc(cc)}"></option>`).join('');
    } catch { /* ignore */ }

    openModal('modal-componente');
    document.getElementById('componente-nome').focus();
  }

  // ── Storico movimenti magazzino ───────────────────────────────
  const MOVIMENTO_LABELS = {
    carico:         { icon: '⬆️', label: 'Carico' },
    scarico:        { icon: '⬇️', label: 'Scarico' },
    rettifica:      { icon: '🔧', label: 'Rettifica' },
  };

  async function apriModalMovimenti(componenteId) {
    const c = await ComponentiService.findById(componenteId);
    document.getElementById('movimenti-componente-nome').textContent =
      c ? [c.nome, c.marca].filter(Boolean).join(' · ') + ` (giacenza attuale: ${c.giacenza || 0})` : '';
    const wrap = document.getElementById('movimenti-lista-wrap');
    wrap.innerHTML = '<p style="color:#999">Caricamento…</p>';
    openModal('modal-movimenti');

    try {
      const movimenti = await ComponentiService.getMovimenti(componenteId);
      if (!movimenti.length) {
        wrap.innerHTML = '<p style="color:#999">Nessun movimento registrato.</p>';
        return;
      }
      wrap.innerHTML = `
        <table class="tabella-movimenti">
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Q.tà</th><th>Giac. dopo</th><th>Ordine</th><th>Causale / Note</th></tr>
          </thead>
          <tbody>
            ${movimenti.map(m => {
              const t = MOVIMENTO_LABELS[m.tipo] || { icon: '•', label: m.tipo };
              const qSegno = m.quantita > 0 ? `+${m.quantita}` : String(m.quantita);
              const qCls = m.quantita > 0 ? 'mov-pos' : (m.quantita < 0 ? 'mov-neg' : '');
              const ordineLbl = m.ordineId
                ? `<a href="#" data-action="apri-ordine-mov" data-id="${m.ordineId}">${esc(m.clienteNome || m.ordineId.slice(0, 6))}</a>`
                : '—';
              return `<tr>
                <td>${fmtDate(m.timestamp)} ${new Date(m.timestamp).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</td>
                <td>${t.icon} ${t.label}</td>
                <td class="${qCls}"><strong>${qSegno}</strong></td>
                <td>${m.giacenzaPost}</td>
                <td>${ordineLbl}</td>
                <td>${esc(m.motivo || '')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    } catch (e) {
      wrap.innerHTML = `<p style="color:#c00">Errore: ${esc(e.message)}</p>`;
    }
  }

  // ── Import CSV componenti ─────────────────────────────────────
  const CSV_HEADERS = ['nome', 'categoria', 'marca', 'codice', 'prezzo_acquisto', 'prezzo_vendita', 'fornitore', 'giacenza', 'soglia_min', 'note'];
  let _csvParsedRows = [];

  function parseCsv(text) {
    if (!text || !text.trim()) return { headers: [], rows: [], errors: ['Testo vuoto'] };
    const errors = [];
    // Detect separatore: se prima riga ha più ; che , usa ;
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

    // Parser CSV minimale con supporto quote
    const lines = [];
    let buffer = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') { buffer += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === '\n' && !inQuotes) {
        lines.push(buffer); buffer = '';
      } else if (ch === '\r' && !inQuotes) {
        // ignora \r, gestito dal \n successivo
      } else {
        buffer += ch;
      }
    }
    if (buffer.length) lines.push(buffer);

    const splitLine = (line) => {
      const out = [];
      let cur = '';
      let q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (q && line[i + 1] === '"') { cur += '"'; i++; }
          else q = !q;
        } else if (ch === sep && !q) {
          out.push(cur); cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map(s => s.trim());
    };

    const rawHeaders = splitLine(lines.shift() || '').map(h => h.toLowerCase().replace(/^\ufeff/, ''));
    const headers = rawHeaders;
    const unknown = headers.filter(h => h && !CSV_HEADERS.includes(h));
    if (unknown.length) errors.push(`Colonne ignorate: ${unknown.join(', ')}`);
    if (!headers.includes('nome')) errors.push("Colonna 'nome' mancante");

    const rows = [];
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      const cells = splitLine(line);
      const obj = {};
      headers.forEach((h, j) => { if (CSV_HEADERS.includes(h)) obj[h] = cells[j] || ''; });
      if (!obj.nome || !obj.nome.trim()) {
        errors.push(`Riga ${i + 2}: nome mancante`);
        return;
      }
      rows.push(obj);
    });

    return { headers, rows, errors };
  }

  function renderCsvPreview(parsed) {
    const wrap = document.getElementById('csv-preview-wrap');
    const table = document.getElementById('csv-preview-table');
    const count = document.getElementById('csv-preview-count');
    const errBox = document.getElementById('csv-preview-errors');
    const btnImport = document.getElementById('btn-csv-importa');

    if (!parsed.rows.length) {
      wrap.classList.remove('hidden');
      count.textContent = '0';
      table.innerHTML = '<p style="padding:1rem;color:#999">Nessuna riga valida.</p>';
      errBox.textContent = parsed.errors.join(' · ');
      btnImport.disabled = true;
      return;
    }
    wrap.classList.remove('hidden');
    count.textContent = parsed.rows.length;
    errBox.textContent = parsed.errors.join(' · ');

    const cols = CSV_HEADERS.filter(h => parsed.headers.includes(h));
    const head = '<tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
    const body = parsed.rows.slice(0, 50).map(r =>
      '<tr>' + cols.map(c => `<td>${esc(r[c] || '')}</td>`).join('') + '</tr>'
    ).join('');
    const more = parsed.rows.length > 50 ? `<p style="padding:.5rem;color:#999;margin:0">…e altre ${parsed.rows.length - 50} righe</p>` : '';
    table.innerHTML = `<table class="csv-preview-table">${head}${body}</table>${more}`;
    btnImport.disabled = false;
  }

  function apriModalImportCsv() {
    _csvParsedRows = [];
    document.getElementById('csv-file-input').value = '';
    document.getElementById('csv-paste-input').value = '';
    document.getElementById('csv-preview-wrap').classList.add('hidden');
    document.getElementById('btn-csv-importa').disabled = true;
    openModal('modal-import-csv');
  }

  async function eseguiAnteprimaCsv() {
    const file = document.getElementById('csv-file-input').files[0];
    let text = document.getElementById('csv-paste-input').value;
    if (file) {
      text = await file.text();
      document.getElementById('csv-paste-input').value = text;
    }
    const parsed = parseCsv(text);
    _csvParsedRows = parsed.rows;
    renderCsvPreview(parsed);
  }

  async function eseguiImportCsv() {
    if (!_csvParsedRows.length) return;
    const btn = document.getElementById('btn-csv-importa');
    btn.disabled = true;
    btn.textContent = 'Importazione…';
    try {
      const report = await ComponentiService.importCsv(_csvParsedRows);
      const errMsg = report.errori?.length ? `\n${report.errori.length} errori (es. ${report.errori[0]?.errore})` : '';
      alert(`✅ Import completato\n• Creati: ${report.creati}\n• Aggiornati: ${report.aggiornati}\n• Pezzi caricati: ${report.caricati}${errMsg}`);
      closeAllModals();
      const q = document.getElementById('search-magazzino')?.value || '';
      renderMagazzino(q);
      aggiornaNavBadges();
    } catch (e) {
      alert('Errore import: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '📥 Importa';
    }
  }

  function downloadTemplateCsv() {
    const sample = CSV_HEADERS.join(',') + '\n' +
      'Copertone 29x2.3,Copertoni,Schwalbe,SCH-2901,18.50,32.00,Bike Parts,4,2,Scaffale A2\n' +
      'Camera 26",Camere,Continental,CON-26,4.00,8.00,,10,4,\n';
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'template-componenti.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Modal Carico Merce ────────────────────────────────────────
  async function apriModalCaricoMerce() {
    // Carica componenti per autocomplete (riusa _componentiMap/_componentiList)
    const componenti = await ComponentiService.getAll().catch(() => []);
    _componentiMap = {};
    _componentiList = (componenti || []).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    _componentiList.forEach(c => {
      const display = c.marca ? `${c.nome} · ${c.marca}` : c.nome;
      const entry = {
        id: c.id, nome: c.nome, marca: c.marca || '',
        giacenza: c.giacenza || 0, prezzo_vendita: c.prezzo_vendita || 0,
        prezzo_acquisto: c.prezzo_acquisto || 0, display,
      };
      _componentiMap[display] = entry;
      _componentiMap[c.id] = entry;
    });

    document.getElementById('carico-fornitore').value = '';
    document.getElementById('carico-motivo').value = '';
    document.getElementById('tbody-carico').innerHTML = '';
    aggiungiRigaCarico();
    openModal('modal-carico');
  }

  function aggiungiRigaCarico(riga = {}) {
    const tbody = document.getElementById('tbody-carico');
    const tr = document.createElement('tr');
    tr.className = 'carico-row';
    let nomeIniziale = '';
    if (riga.componenteId && _componentiMap[riga.componenteId]) {
      nomeIniziale = _componentiMap[riga.componenteId].display;
    }
    tr.innerHTML = `
      <td class="comp-cell" style="position:relative">
        <input type="text" class="carico-nome" placeholder="Cerca componente…" autocomplete="off" value="${esc(nomeIniziale)}" />
        <input type="hidden" class="carico-componente-id" value="${esc(riga.componenteId || '')}" />
        <div class="comp-suggestions hidden"></div>
      </td>
      <td class="ricambio-disp-cell carico-giac-cell">—</td>
      <td><input type="number" class="carico-qta" min="1" step="1" value="${riga.qta || 1}" style="width:80px" /></td>
      <td><input type="number" class="carico-prezzo" min="0" step="0.01" value="${riga.prezzo_acquisto != null ? riga.prezzo_acquisto : ''}" placeholder="—" style="width:90px" /></td>
      <td><button type="button" class="btn btn-sm btn-danger rimuovi-riga-carico">×</button></td>
    `;
    tbody.appendChild(tr);

    const nomeInput  = tr.querySelector('.carico-nome');
    const idInput    = tr.querySelector('.carico-componente-id');
    const giacCell   = tr.querySelector('.carico-giac-cell');
    const prezzoInput = tr.querySelector('.carico-prezzo');
    const sugDiv     = tr.querySelector('.comp-suggestions');

    function aggiornaGiacUI() {
      const id = idInput.value;
      if (id && _componentiMap[id]) {
        const c = _componentiMap[id];
        const cls = c.giacenza > 0 ? 'comp-ok' : 'comp-ko';
        giacCell.innerHTML = `<span class="${cls}">${c.giacenza}</span>`;
      } else {
        giacCell.textContent = '—';
      }
    }
    aggiornaGiacUI();

    nomeInput.addEventListener('input', () => {
      const qRaw = nomeInput.value.trim();
      const q = qRaw.toLowerCase();
      idInput.value = '';
      idInput.dataset.nuovo = '';
      aggiornaGiacUI();
      if (!qRaw) { sugDiv.classList.add('hidden'); sugDiv.innerHTML = ''; return; }
      const matches = _componentiList
        .filter(c => {
          const s = (c.nome + ' ' + (c.marca || '') + ' ' + (c.codice || '')).toLowerCase();
          return s.includes(q);
        })
        .slice(0, 8);
      const matchHtml = matches.map(c => {
        const display = c.marca ? `${c.nome} · ${c.marca}` : c.nome;
        const giacCls = (c.giacenza || 0) > 0 ? 'comp-ok' : 'comp-ko';
        return `<div class="comp-suggestion" data-id="${c.id}">
          <span>${esc(display)}</span>
          <span class="comp-suggestion-giac ${giacCls}">${c.giacenza || 0}</span>
        </div>`;
      }).join('');
      // Opzione "crea nuovo" sempre disponibile a fine lista (utile se il match non c'è o se l'utente vuole un nuovo pezzo)
      const exactMatch = matches.some(c => (c.nome || '').toLowerCase() === q);
      const createHtml = exactMatch ? '' : `
        <div class="comp-suggestion comp-suggestion-new" data-new="1">
          <span>➕ Crea nuovo: <strong>${esc(qRaw)}</strong></span>
          <span class="comp-suggestion-giac">nuovo</span>
        </div>`;
      sugDiv.innerHTML = matchHtml + createHtml;
      sugDiv.classList.remove('hidden');
    });

    sugDiv.addEventListener('mousedown', (ev) => {
      const item = ev.target.closest('.comp-suggestion');
      if (!item) return;
      ev.preventDefault();
      if (item.dataset.new === '1') {
        // Crea nuovo componente al volo
        const nome = nomeInput.value.trim();
        if (!nome) return;
        idInput.value = '';
        idInput.dataset.nuovo = '1';
        nomeInput.value = nome; // lascia il nome digitato
        giacCell.innerHTML = '<span class="comp-suggestion-giac" title="Nuovo componente">nuovo</span>';
        sugDiv.classList.add('hidden');
        sugDiv.innerHTML = '';
        tr.querySelector('.carico-qta')?.focus();
        return;
      }
      const c = _componentiMap[item.dataset.id];
      if (!c) return;
      nomeInput.value = c.display;
      idInput.value = c.id;
      idInput.dataset.nuovo = '';
      if (!prezzoInput.value && c.prezzo_acquisto) prezzoInput.value = c.prezzo_acquisto;
      sugDiv.classList.add('hidden');
      sugDiv.innerHTML = '';
      aggiornaGiacUI();
      tr.querySelector('.carico-qta')?.focus();
    });

    nomeInput.addEventListener('blur', () => {
      setTimeout(() => sugDiv.classList.add('hidden'), 150);
    });

    tr.querySelector('.rimuovi-riga-carico').addEventListener('click', () => {
      tr.remove();
      if (!tbody.children.length) aggiungiRigaCarico();
    });
  }

  function raccogliRigheCarico() {
    const righe = Array.from(document.querySelectorAll('#tbody-carico .carico-row')).map(tr => {
      const idEl = tr.querySelector('.carico-componente-id');
      const nomeEl = tr.querySelector('.carico-nome');
      const nomeText = nomeEl.value.trim();
      const hasId = !!idEl.value;
      // Auto-fallback: se l'utente ha digitato un nome ma non ha selezionato dal menu,
      // trattalo come nomeNuovo (il server farà dedup case-insensitive per nome).
      const isNuovo = idEl.dataset.nuovo === '1' || (!hasId && nomeText.length > 0);
      return {
        componenteId: hasId ? idEl.value : '',
        nomeNuovo: (!hasId && nomeText) ? nomeText : '',
        qta: parseInt(tr.querySelector('.carico-qta').value) || 0,
        prezzo_acquisto: tr.querySelector('.carico-prezzo').value === '' ? null : parseFloat(tr.querySelector('.carico-prezzo').value),
      };
    }).filter(r => (r.componenteId || r.nomeNuovo) && r.qta > 0);

    // Aggregazione lato client: somma le qta delle righe che puntano allo stesso componente
    // o allo stesso `nomeNuovo` (case-insensitive). Evita movimenti duplicati nello storico.
    const map = new Map();
    righe.forEach(r => {
      const key = r.componenteId
        ? 'id:' + r.componenteId
        : 'nome:' + r.nomeNuovo.toLowerCase();
      const prev = map.get(key);
      if (prev) {
        prev.qta += r.qta;
        // Sul prezzo: tieni il primo valorizzato (non sovrascrivere con null)
        if (prev.prezzo_acquisto == null && r.prezzo_acquisto != null) {
          prev.prezzo_acquisto = r.prezzo_acquisto;
        }
      } else {
        map.set(key, { ...r });
      }
    });
    return Array.from(map.values());
  }

  async function inviaCarico() {
    const fornitore = document.getElementById('carico-fornitore').value.trim();
    const motivo    = document.getElementById('carico-motivo').value.trim();
    const righe = raccogliRigheCarico();
    if (!righe.length) {
      alert('Aggiungi almeno una riga valida: nome componente + quantità (e seleziona dal menu se è un pezzo già a magazzino).');
      return;
    }
    try {
      const report = await ComponentiService.caricoMultiplo(fornitore, righe, motivo);
      const parts = [`• Movimenti registrati: ${report.movimenti}`];
      if (report.creati) parts.push(`• Componenti creati: ${report.creati}`);
      if (report.errori?.length) parts.push(`• Errori: ${report.errori.length}`);
      alert(`✅ Carico completato\n${parts.join('\n')}`);
      closeAllModals();
      const q = document.getElementById('search-magazzino')?.value || '';
      renderMagazzino(q);
      aggiornaNavBadges();
    } catch (e) {
      alert('Errore carico: ' + e.message);
    }
  }

  // ── Storico Cliente ───────────────────────────────────────────
  let _storicoOrdini = [];
  let _storicoClienteId = null;

  async function apriModalStorico(clienteId) {
    const [cliente, tuttiOrdini] = await Promise.all([
      ClientiService.findById(clienteId),
      OrdiniService.getByCliente(clienteId),
    ]);

    document.getElementById('modal-storico').dataset.clienteId = clienteId;

    _storicoOrdini = tuttiOrdini.sort((a, b) =>
      new Date(b.dataIngresso) - new Date(a.dataIngresso)
    );
    _storicoClienteId = clienteId;

    document.getElementById('storico-cliente-nome').textContent = [cliente.nome, cliente.cognome].filter(Boolean).join(' ');
    document.getElementById('storico-cliente-info').textContent =
      [cliente.telefono, cliente.email].filter(Boolean).join('  ·  ');

    const consegnati = _storicoOrdini.filter(o => o.stato === 'consegnata');
    const totaleSpeso = OrdiniService.calcolaIncasso(consegnati);
    const media = consegnati.length ? totaleSpeso / consegnati.length : 0;

    document.getElementById('storico-stat-ordini').textContent = _storicoOrdini.length;
    document.getElementById('storico-stat-chiusi').textContent = consegnati.length;
    document.getElementById('storico-stat-speso').textContent = fmt(totaleSpeso);
    document.getElementById('storico-stat-media').textContent = fmt(media);
    document.getElementById('storico-stat-ultima').textContent =
      _storicoOrdini.length ? fmtDate(_storicoOrdini[0].dataIngresso) : '—';

    document.getElementById('search-storico').value = '';
    renderStoricoLista(_storicoOrdini);
    openModal('modal-storico');
  }

  function renderStoricoLista(ordini) {
    const container = document.getElementById('storico-ordini-list');

    if (!ordini.length) {
      container.innerHTML = emptyState('Nessun intervento trovato.', 'ordini');
      return;
    }

    container.innerHTML = ordini.map(o => {
      const vociHtml = o.voci.map(v =>
        `<span class="tag">${esc(v.nome)} — ${fmt(v.prezzo)}${v.note ? ` (${esc(v.note)})` : ''}</span>`
      ).join('');
      return `
        <div class="storico-ordine-card stato-${o.stato}">
          <div class="storico-ordine-header">
            <div>
              <span class="storico-ordine-data">📅 ${fmtDate(o.dataIngresso)}</span>
              ${o.dataUscita
          ? `<span class="storico-ordine-uscita">→ ${fmtDate(o.dataUscita)}</span>`
          : ''}
              ${o.biciNome ? `<span class="card-sub" style="margin-left:.4rem">🚲 ${esc(o.biciNome)}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:.6rem;">
              ${badgeStato(o.stato)}
              <span class="storico-ordine-totale">${fmt(o.totale)}</span>
              <button class="btn btn-sm btn-secondary" data-action="edit-ordine" data-id="${o.id}" aria-label="Modifica">✏</button>
            </div>
          </div>
          ${o.note ? `<p class="card-sub" style="margin-bottom:.3rem">📝 ${esc(o.note)}</p>` : ''}
          <p class="card-sub" style="margin-bottom:.3rem">${o.pagato ? '✅ Pagato' : '⚠ Non pagato'}</p>
          <div class="storico-voci">
            ${vociHtml || '<span class="card-sub">Nessuna lavorazione registrata</span>'}
          </div>
        </div>`;
    }).join('');
  }

  function filtraStorico(query) {
    if (!query.trim()) { renderStoricoLista(_storicoOrdini); return; }
    const q = query.toLowerCase().trim();
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
    document.getElementById('bici-cliente-id-hidden').value = clienteId;
    renderBiciList(bici);
    openModal('modal-bici-cliente');
  }

  function renderBiciList(bici) {
    const container = document.getElementById('bici-attuali-list');
    if (!bici.length) {
      container.innerHTML = emptyState('Nessuna bici associata. Clicca "+ Aggiungi Bici".', 'bici');
      return;
    }
    container.innerHTML = bici.map(b => {
      const nome = [b.marca, b.modello].filter(Boolean).join(' ');
      return `
        <div class="card" style="margin-bottom:.5rem">
          <div class="card-row">
            <span class="card-title">🚲 ${esc(nome)}</span>
            <div class="card-actions">
              ${tagTipo(b.tipo)}
              <button class="btn btn-sm btn-secondary" data-action="edit-bici" data-id="${b.id}" aria-label="Modifica">✏</button>
              <button class="btn btn-sm btn-danger"    data-action="del-bici"  data-id="${b.id}" aria-label="Elimina">🗑</button>
            </div>
          </div>
          <div class="card-sub" style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.2rem">
            ${b.colore ? `<span>🎨 ${esc(b.colore)}</span>` : ''}
            ${b.seriale_forcella ? `<span>🔧 Forcella: ${esc(b.seriale_forcella)}</span>` : ''}
            ${b.seriale_ammortizzatore ? `<span>🔧 Ammortizzatore: ${esc(b.seriale_ammortizzatore)}</span>` : ''}
          </div>
          ${b.note ? `<span class="card-sub">📝 ${esc(b.note)}</span>` : ''}
        </div>`;
    }).join('');
  }

  async function apriModalAggiungiBici(clienteId, biciId = null) {
    const b = biciId ? await BiciService.findById(biciId) : null;
    document.getElementById('modal-aggiungi-bici-title').textContent = b ? '✏ Modifica Bici' : '➕ Aggiungi Bici';
    document.getElementById('bici-id').value = b?.id || '';
    document.getElementById('bici-cliente-id-hidden').value = clienteId;
    document.getElementById('bici-marca').value = b?.marca || '';
    document.getElementById('bici-modello').value = b?.modello || '';
    document.getElementById('bici-tipo').value = b?.tipo || 'strada';
    document.getElementById('bici-colore').value = b?.colore || '';
    document.getElementById('bici-ser-forcella').value = b?.seriale_forcella || '';
    document.getElementById('bici-ser-ammortizzatore').value = b?.seriale_ammortizzatore || '';
    document.getElementById('bici-note').value = b?.note || '';
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
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = [b.marca, b.modello].filter(Boolean).join(' ');
      if (b.id === biciIdSelezionata) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  async function apriModalOrdine(ordineId = null, preselezionaClienteId = null) {
    const [ordine, clienti, lavorazioni, componenti] = await Promise.all([
      ordineId ? OrdiniService.findById(ordineId) : Promise.resolve(null),
      ClientiService.getAll(),
      LavorazioniService.getAll(),
      ComponentiService.getAll().catch(() => []),
    ]);

    // Mappa componenti per autocomplete ricambi
    _componentiMap = {};
    _componentiList = (componenti || []).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    _componentiList.forEach(c => {
      const display = c.marca ? `${c.nome} · ${c.marca}` : c.nome;
      const entry = {
        id: c.id,
        nome: c.nome,
        marca: c.marca || '',
        giacenza: c.giacenza || 0,
        prezzo_vendita: c.prezzo_vendita || 0,
        display,
      };
      _componentiMap[display] = entry;
      _componentiMap[c.id] = entry;
    });

    document.getElementById('modal-ordine-title').textContent = ordine ? 'Modifica Ordine' : 'Nuovo Ordine';
    document.getElementById('ordine-id').value = ordine?.id || '';
    document.getElementById('ordine-note').value = ordine?.note || '';
    document.getElementById('ordine-pagato').checked = Boolean(ordine?.pagato);
    document.getElementById('ordine-acconto').value = ordine?.acconto ? ordine.acconto.toFixed(2) : '';

    // Stato (visibile solo in modifica)
    const statoWrap = document.getElementById('ordine-stato-wrap');
    const statoSelect = document.getElementById('ordine-stato');
    if (ordine) {
      statoWrap.classList.remove('hidden');
      statoSelect.value = ordine.stato || 'accettata';
    } else {
      statoWrap.classList.add('hidden');
      statoSelect.value = 'accettata';
    }
    aggiornaColorStato();

    // Foto
    const rawFoto = ordine?.foto || [];
    if (Array.isArray(rawFoto)) {
      _ordineFoto = [...rawFoto];
    } else if (typeof rawFoto === 'string') {
      // Difesa contro dati legacy/corrotti: se il parse fallisce non bloccare l'apertura del modal
      try { _ordineFoto = JSON.parse(rawFoto || '[]'); }
      catch { _ordineFoto = []; }
      if (!Array.isArray(_ordineFoto)) _ordineFoto = [];
    } else {
      _ordineFoto = [];
    }
    renderFotoPreview();
    document.getElementById('ordine-foto-input').value = '';

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

    const originalClienteId = ordine?.clienteId || null;
    let originalClienteDisplay = '';

    function selectCliente(display, id, skipConfirm = false) {
      if (!skipConfirm && originalClienteId && id && id !== originalClienteId) {
        if (!confirm('Stai cambiando il cliente dell\'ordine. Sei sicuro?')) {
          // Ripristina valore originale
          inputCliente.value = originalClienteDisplay;
          hiddenCliente.value = originalClienteId;
          suggestions.classList.add('hidden');
          return;
        }
      }
      inputCliente.value = display;
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
      const val = this.value;
      const newId = displayMap[val] || '';
      // Se in modifica e il testo corrisponde a un cliente diverso, chiedi conferma
      if (originalClienteId && newId && newId !== originalClienteId) {
        if (!confirm('Stai cambiando il cliente dell\'ordine. Sei sicuro?')) {
          inputCliente.value = originalClienteDisplay;
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

    inputCliente.onfocus = () => {
      renderClientSuggestions('');
    };

    suggestions.addEventListener('mousedown', (ev) => {
      const item = ev.target.closest('.clienti-suggestion');
      if (!item) return;
      selectCliente(item.dataset.value, item.dataset.id);
      ev.preventDefault();
    });

    inputCliente.onblur = () => {
      setTimeout(() => suggestions.classList.add('hidden'), 150);
    };

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
    document.getElementById('tbody-ricambi').innerHTML = '';
    (ordine?.ricambi || []).forEach(r => aggiungiRigaRicambio(r));

    // Timeline: visibile solo in modifica (l'ordine deve esistere)
    _ordineCorrenteId = ordine?.id || null;
    const tlContainer = document.getElementById('ordine-timeline-aggiungi');
    const tlPlaceholder = document.getElementById('ordine-timeline-placeholder');
    if (ordine?.id) {
      tlContainer.classList.remove('hidden');
      tlPlaceholder.classList.add('hidden');
      document.getElementById('ordine-commento-input').value = '';
      renderTimeline(ordine.commenti || []);
    } else {
      tlContainer.classList.add('hidden');
      tlPlaceholder.classList.remove('hidden');
    }

    aggiornaLocale();
    openModal('modal-ordine');
  }

  function aggiungiRigaVoce(voce = {}) {
    const tbody = document.getElementById('tbody-voci');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="position:relative">
        <input type="text" class="inp-lavorazione" autocomplete="off" placeholder="— Scegli —" value="${voce.nome || ''}" />
        <input type="hidden" class="hid-lavorazione-id" value="${voce.lavorazioneId || ''}" />
        <div class="lav-suggestions hidden"></div>
      </td>
      <td><input type="text"   class="inp-note-voce"   placeholder="Note…" value="${voce.note || ''}" /></td>
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

  // ── Foto ordine ───────────────────────────────────────────────
  let _ordineFoto = [];

  function renderFotoPreview() {
    const container = document.getElementById('ordine-foto-preview');
    if (!Array.isArray(_ordineFoto)) _ordineFoto = [];
    if (!_ordineFoto.length) { container.innerHTML = ''; return; }
    container.innerHTML = _ordineFoto.map((src, i) => {
      if (typeof src !== 'string' || !src.startsWith('data:image/')) return '';
      return `<div class="foto-thumb">
        <img src="${src}" alt="Foto ${i + 1}" />
        <button type="button" class="btn-foto-remove" data-foto-idx="${i}" aria-label="Rimuovi foto">✕</button>
      </div>`;
    }).join('');
  }

  function getOrdineFoto() {
    if (!Array.isArray(_ordineFoto)) _ordineFoto = [];
    return _ordineFoto;
  }

  function aggiornaLocale() {
    let subVoci = 0;
    document.querySelectorAll('.inp-prezzo-voce').forEach(i => subVoci += parseFloat(i.value) || 0);
    let subRicambi = 0;
    document.querySelectorAll('#tbody-ricambi tr').forEach(tr => {
      const qta = parseInt(tr.querySelector('.inp-ricambio-qta')?.value) || 1;
      const prezzo = parseFloat(tr.querySelector('.inp-ricambio-prezzo')?.value) || 0;
      subRicambi += qta * prezzo;
    });
    const tot = subVoci + subRicambi;
    const elSubV = document.getElementById('subtotale-lavorazioni');
    if (elSubV) elSubV.textContent = fmt(subVoci);
    const elSubR = document.getElementById('subtotale-ricambi');
    if (elSubR) elSubR.textContent = fmt(subRicambi);
    document.getElementById('totale-ordine').textContent = fmt(tot);
    // Aggiorna info resto
    const acconto = parseFloat(document.getElementById('ordine-acconto')?.value) || 0;
    const restoLabel = document.getElementById('ordine-resto-label');
    if (restoLabel) {
      if (acconto > 0 && acconto > tot) {
        restoLabel.textContent = `⚠️ Anticipo (${fmt(acconto)}) supera il totale (${fmt(tot)})!`;
        restoLabel.style.color = '#dc2626';
      } else if (acconto > 0) {
        const resto = Math.max(0, tot - acconto);
        restoLabel.textContent = `Resto da saldare: ${fmt(tot)} − ${fmt(acconto)} = ${fmt(resto)}`;
        restoLabel.style.color = '';
      } else {
        restoLabel.textContent = `Resto da saldare: ${fmt(tot)}`;
        restoLabel.style.color = '';
      }
    }
  }

  function raccogliVoci() {
    const voci = [];
    let righeInvalide = 0;
    document.querySelectorAll('#tbody-voci tr').forEach(tr => {
      const hid = tr.querySelector('.hid-lavorazione-id');
      const lavId = hid ? hid.value : '';
      const nome = tr.querySelector('.inp-lavorazione')?.value || '';
      if (!lavId) {
        if (nome.trim()) righeInvalide++;
        return;
      }
      voci.push({
        lavorazioneId: lavId,
        nome,
        note: tr.querySelector('.inp-note-voce')?.value || '',
        prezzo: parseFloat(tr.querySelector('.inp-prezzo-voce')?.value) || 0,
      });
    });
    if (righeInvalide > 0) {
      throw new Error(`${righeInvalide} rig${righeInvalide === 1 ? 'a non valida' : 'he non valide'}: seleziona una lavorazione dal catalogo.`);
    }
    return voci;
  }

  // ── Ricambi e componenti ──────────────────────────────────────
  const RICAMBIO_STATI = {
    da_ordinare: { label: '🔴 Da ordinare',  cls: 'ricambio-da-ordinare' },
    ordinato:    { label: '🟡 Ordinato',     cls: 'ricambio-ordinato' },
    ricevuto:    { label: '🟢 In magazzino', cls: 'ricambio-ricevuto' },
  };

  function aggiungiRigaRicambio(ricambio = {}) {
    const tbody = document.getElementById('tbody-ricambi');
    const tr = document.createElement('tr');
    const statoVal = ricambio.stato || 'da_ordinare';
    const prelevato = Boolean(ricambio.prelevato);
    // Determina display iniziale
    let nomeIniziale = ricambio.nome || '';
    if (ricambio.componenteId && _componentiMap[ricambio.componenteId]) {
      nomeIniziale = _componentiMap[ricambio.componenteId].display;
    }
    tr.innerHTML = `
      <td style="position:relative">
        <input type="text" class="inp-ricambio-nome" autocomplete="off" placeholder="Cerca nel magazzino o scrivi liberamente…" value="${nomeIniziale.replace(/"/g, '&quot;')}" />
        <input type="hidden" class="hid-ricambio-componente" value="${ricambio.componenteId || ''}" />
        <input type="hidden" class="hid-ricambio-prelevato" value="${prelevato ? '1' : ''}" />
        <div class="comp-suggestions hidden"></div>
      </td>
      <td class="ricambio-disp-cell"><span class="ricambio-disp-info"></span></td>
      <td><input type="number" class="inp-ricambio-qta" min="1" value="${ricambio.qta || 1}" style="width:60px" /></td>
      <td><input type="number" class="inp-ricambio-prezzo" min="0" step="0.01" placeholder="0.00" value="${ricambio.prezzo != null ? parseFloat(ricambio.prezzo).toFixed(2) : ''}" style="width:80px" /></td>
      <td>
        <select class="sel-ricambio-stato">
          <option value="da_ordinare" ${statoVal === 'da_ordinare' ? 'selected' : ''}>🔴 Da ordinare</option>
          <option value="ordinato"    ${statoVal === 'ordinato' ? 'selected' : ''}>🟡 Ordinato</option>
          <option value="ricevuto"    ${statoVal === 'ricevuto' ? 'selected' : ''}>🟢 In magazzino</option>
        </select>
      </td>
      <td><button type="button" class="btn btn-sm btn-danger btn-rimuovi-ricambio">✕</button></td>
    `;

    const inpNome = tr.querySelector('.inp-ricambio-nome');
    const hidComp = tr.querySelector('.hid-ricambio-componente');
    const sugDiv  = tr.querySelector('.comp-suggestions');
    const dispEl  = tr.querySelector('.ricambio-disp-info');

    function aggiornaDispInfo() {
      const id = hidComp.value;
      if (id && _componentiMap[id]) {
        const c = _componentiMap[id];
        const cls = c.giacenza > 0 ? 'comp-ok' : 'comp-ko';
        const prelevatoLbl = tr.querySelector('.hid-ricambio-prelevato').value === '1'
          ? ' <span class="tag-scaricato" title="Già scaricato dal magazzino">scaricato</span>'
          : '';
        dispEl.innerHTML = `<span class="${cls}">📦 ${c.giacenza}</span>${prelevatoLbl}`;
      } else {
        dispEl.innerHTML = '<span class="ricambio-libero" title="Non collegato al magazzino">—</span>';
      }
    }

    function renderCompSuggestions(query = '') {
      const q = query.toLowerCase().trim();
      const matches = _componentiList
        .filter(c => {
          if (!q) return true;
          const hay = `${c.nome} ${c.marca || ''} ${c.codice || ''}`.toLowerCase();
          return hay.includes(q);
        })
        .slice(0, 10);
      sugDiv.innerHTML = matches
        .map(c => {
          const display = c.marca ? `${c.nome} · ${c.marca}` : c.nome;
          const cls = (c.giacenza || 0) > 0 ? 'comp-ok' : 'comp-ko';
          return `<div class="comp-suggestion" data-id="${c.id}" data-value="${display.replace(/"/g, '&quot;')}">
            <span class="comp-suggestion-nome">${display}</span>
            <span class="comp-suggestion-giac ${cls}">${c.giacenza || 0} disp.</span>
          </div>`;
        })
        .join('');
      sugDiv.classList.toggle('hidden', matches.length === 0);
    }

    inpNome.addEventListener('focus', () => renderCompSuggestions(inpNome.value));
    inpNome.addEventListener('input', function () {
      // se l'utente modifica manualmente, scollega dal componente
      hidComp.value = '';
      aggiornaDispInfo();
      renderCompSuggestions(this.value);
    });
    inpNome.addEventListener('blur', () => {
      setTimeout(() => sugDiv.classList.add('hidden'), 150);
    });
    sugDiv.addEventListener('mousedown', ev => {
      const item = ev.target.closest('.comp-suggestion');
      if (!item) return;
      const c = _componentiMap[item.dataset.id];
      inpNome.value = item.dataset.value;
      hidComp.value = item.dataset.id;
      sugDiv.classList.add('hidden');
      // Precompila il prezzo di vendita se l'utente non l'ha già inserito
      const inpPrezzo = tr.querySelector('.inp-ricambio-prezzo');
      if (c && (!inpPrezzo.value || parseFloat(inpPrezzo.value) === 0) && c.prezzo_vendita > 0) {
        inpPrezzo.value = parseFloat(c.prezzo_vendita).toFixed(2);
      }
      // Suggerisci stato 'ricevuto' se c'è giacenza disponibile
      const selStato = tr.querySelector('.sel-ricambio-stato');
      if (c && c.giacenza > 0 && selStato.value === 'da_ordinare') {
        selStato.value = 'ricevuto';
      }
      aggiornaDispInfo();
      aggiornaLocale();
      ev.preventDefault();
    });

    tr.querySelector('.inp-ricambio-qta').addEventListener('input', aggiornaLocale);
    tr.querySelector('.inp-ricambio-prezzo').addEventListener('input', aggiornaLocale);
    tr.querySelector('.btn-rimuovi-ricambio').addEventListener('click', () => {
      tr.remove();
      aggiornaLocale();
    });
    aggiornaDispInfo();
    tbody.appendChild(tr);
  }

  function raccogliRicambi() {
    const ricambi = [];
    document.querySelectorAll('#tbody-ricambi tr').forEach(tr => {
      const nome = tr.querySelector('.inp-ricambio-nome')?.value.trim() || '';
      if (!nome) return;
      const componenteId = tr.querySelector('.hid-ricambio-componente')?.value || '';
      const prelevato = tr.querySelector('.hid-ricambio-prelevato')?.value === '1';
      const prezzo = parseFloat(tr.querySelector('.inp-ricambio-prezzo')?.value) || 0;
      const r = {
        nome,
        qta:    parseInt(tr.querySelector('.inp-ricambio-qta')?.value) || 1,
        prezzo,
        stato:  tr.querySelector('.sel-ricambio-stato')?.value || 'da_ordinare',
      };
      if (componenteId) r.componenteId = componenteId;
      if (prelevato) r.prelevato = true;
      ricambi.push(r);
    });
    return ricambi;
  }

  function badgeRicambi(ricambi) {
    if (!ricambi || !ricambi.length) return '';
    const pending = ricambi.filter(r => r.stato !== 'ricevuto').length;
    if (pending === 0) return '<span class="ricambi-badge ricambi-ok">📦✅ Ricambi completi</span>';
    return `<span class="ricambi-badge ricambi-pending">📦⏳ ${pending} ricambi${pending > 1 ? '' : 'o'} in attesa</span>`;
  }

  // ── Timeline commenti ─────────────────────────────────────────
  let _ordineCorrenteId = null;

  function renderTimeline(commenti = []) {
    const container = document.getElementById('ordine-timeline-list');
    if (!container) return;
    if (!commenti.length) {
      container.innerHTML = '<p class="card-sub" style="text-align:center;padding:.5rem">Nessuna nota ancora. Aggiungine una sopra.</p>';
      return;
    }
    const sorted = [...commenti].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    container.innerHTML = sorted.map(c => `
      <div class="timeline-item">
        <div class="timeline-time">📅 ${fmtDate(c.timestamp)}</div>
        <div class="timeline-text">${esc(c.testo)}</div>
        <button type="button" class="btn-timeline-remove" data-commento-id="${c.id}" aria-label="Rimuovi nota" title="Rimuovi">✕</button>
      </div>
    `).join('');
  }

  function badgeCommenti(commenti) {
    if (!commenti || !commenti.length) return '';
    return `<span class="commenti-badge" title="${commenti.length} note">💬 ${commenti.length}</span>`;
  }

  // ── Modal Cliente ─────────────────────────────────────────────
  async function apriModalCliente(clienteId = null) {
    const c = clienteId ? await ClientiService.findById(clienteId) : null;
    document.getElementById('modal-cliente-title').textContent = c ? 'Modifica Cliente' : 'Nuovo Cliente';
    document.getElementById('cliente-id').value = c?.id || '';
    document.getElementById('cliente-nome').value = c?.nome || '';
    document.getElementById('cliente-cognome').value = c?.cognome || '';
    document.getElementById('cliente-telefono').value = c?.telefono || '';
    document.getElementById('cliente-email').value = c?.email || '';
    document.getElementById('cliente-note').value = c?.note || '';
    openModal('modal-cliente');
    document.getElementById('cliente-nome').focus();
  }

  // ── Modal Lavorazione ─────────────────────────────────────────
  async function apriModalLavorazione(lavId = null) {
    const l = lavId ? await LavorazioniService.findById(lavId) : null;
    document.getElementById('modal-lavorazione-title').textContent = l ? 'Modifica Lavorazione' : 'Nuova Lavorazione';
    document.getElementById('lavorazione-id').value = l?.id || '';
    document.getElementById('lavorazione-nome').value = l?.nome || '';
    document.getElementById('lavorazione-prezzo').value = l ? l.prezzo.toFixed(2) : '';
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
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── Stampa ordine ─────────────────────────────────────────────
  async function printOrdine(id) {
    const [ordine, clienti] = await Promise.all([
      OrdiniService.findById(id),
      ClientiService.getAll(),
    ]);
    const c = clienti.find(x => x.id === ordine.clienteId);
    const nomeCliente = c ? [c.nome, c.cognome].filter(Boolean).join(' ') : 'Cliente sconosciuto';
    const statoLabel = { accettata: 'Accettata', in_lavorazione: 'In lavorazione', pronto: 'Pronto al ritiro', consegnata: 'Consegnata' }[ordine.stato] || ordine.stato;
    const fmtEur = n => '€\u00a0' + (n || 0).toFixed(2).replace('.', ',');
    const fmtDt = iso => iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    const vociRows = ordine.voci.map(v =>
      `<tr><td>${esc(v.nome)}</td><td>${esc(v.note)}</td><td class="num">${fmtEur(v.prezzo)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Ordine — ${esc(nomeCliente)}</title>
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
<div class="sub">Stampato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
<div class="grid">
  <div class="field"><div class="lbl">Cliente</div><div class="val">${esc(nomeCliente)}${c?.telefono ? ' &nbsp;·&nbsp; ' + esc(c.telefono) : ''}</div></div>
  ${ordine.biciNome ? `<div class="field"><div class="lbl">Bici</div><div class="val">🚲 ${esc(ordine.biciNome)}</div></div>` : '<div></div>'}
  <div class="field"><div class="lbl">Stato</div><div class="val">${statoLabel} &nbsp;<span class="badge ${ordine.pagato ? 'pagato' : 'non-pagato'}">${ordine.pagato ? '✅ Pagato' : '⚠ Non pagato'}</span></div></div>
  <div class="field"><div class="lbl">Ingresso</div><div class="val">${fmtDt(ordine.dataIngresso)}${ordine.dataUscita ? ' &nbsp;·&nbsp; Uscita: ' + fmtDt(ordine.dataUscita) : ''}</div></div>
  ${ordine.note ? `<div class="field" style="grid-column:1/-1"><div class="lbl">Note</div><div class="val">${esc(ordine.note)}</div></div>` : ''}
</div>
<table>
  <thead><tr><th>Lavorazione</th><th>Note</th><th class="num">Prezzo</th></tr></thead>
  <tbody>
    ${vociRows}
    <tr class="tot"><td colspan="2">Totale</td><td class="num">${fmtEur(ordine.totale)}</td></tr>
  </tbody>
</table>
<div class="footer">CicloDesk v1.9.0</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`;

    const w = window.open('', '_blank', 'width=700,height=820');
    if (!w) {
      alert('Popup bloccato dal browser. Abilita i popup per questo sito per stampare l\'ordine.');
      return;
    }
    w.document.write(html);
    w.document.close();
  }

  // ── Ricerca Globale ────────────────────────────────────────────
  async function cercaGlobale(query) {
    const q = query.toLowerCase().trim();
    const results = document.getElementById('search-globale-results');
    if (!q) { results.classList.add('hidden'); return; }

    const [clienti, ordini, lavorazioni] = await Promise.all([
      ClientiService.getAll(),
      OrdiniService.getAll(),
      LavorazioniService.getAll(),
    ]);

    const hits = [];

    // Clienti
    const clientiMap = Object.fromEntries(clienti.map(c => [c.id, c]));
    clienti.filter(c =>
      [c.nome, c.cognome, c.telefono, c.email].filter(Boolean).join(' ').toLowerCase().includes(q)
    ).slice(0, 5).forEach(c => {
      const ordiniAperti = ordini.filter(o => o.clienteId === c.id && o.stato !== 'consegnata').length;
      const subParts = [c.telefono || c.email || ''];
      if (ordiniAperti > 0) subParts.push(`${ordiniAperti} ordini aperti`);
      hits.push({ icon: '👤', label: [c.nome, c.cognome].filter(Boolean).join(' '), sub: subParts.filter(Boolean).join(' · '), action: 'edit-cliente', id: c.id });
    });

    // Ordini
    ordini.filter(o => {
      const c = clientiMap[o.clienteId];
      return (
        [c?.nome, c?.cognome].filter(Boolean).join(' ').toLowerCase().includes(q) ||
        (o.biciNome || '').toLowerCase().includes(q) ||
        (o.note || '').toLowerCase().includes(q) ||
        o.voci.some(v => v.nome.toLowerCase().includes(q))
      );
    }).slice(0, 5).forEach(o => {
      const c = clientiMap[o.clienteId];
      const giorniIn = Math.floor((Date.now() - new Date(o.dataIngresso).getTime()) / 86400000);
      const subParts = [badgeStato(o.stato), fmt(o.totale)];
      if (o.stato !== 'consegnata' && giorniIn > 0) subParts.push(`${giorniIn}gg in officina`);
      else if (o.biciNome) subParts.push(o.biciNome);
      hits.push({ icon: '📋', label: `Ordine — ${c ? [c.nome, c.cognome].filter(Boolean).join(' ') : '?'}`, sub: subParts.join(' · '), action: 'edit-ordine', id: o.id, html: true });
    });

    // Lavorazioni catalogo
    lavorazioni.filter(l =>
      l.nome.toLowerCase().includes(q) || (l.descrizione || '').toLowerCase().includes(q)
    ).slice(0, 3).forEach(l => {
      hits.push({ icon: '🔩', label: l.nome, sub: fmt(l.prezzo), action: 'edit-lavorazione', id: l.id });
    });

    if (!hits.length) {
      results.innerHTML = '<div class="global-search-empty">Nessun risultato</div>';
    } else {
      results.innerHTML = hits.map(h =>
        `<div class="global-search-item" data-action="${h.action}" data-id="${h.id}">
          <span class="global-search-icon">${h.icon}</span>
          <span class="global-search-label">${esc(h.label)}</span>
          <span class="global-search-sub">${h.html ? h.sub : esc(h.sub)}</span>
        </div>`
      ).join('');
    }
    results.classList.remove('hidden');
  }

  // ── Kanban View (#12) ────────────────────────────────────────
  function renderKanban(ordini, clientiMap, tuttiOrdini) {
    const container = document.getElementById('ordini-kanban');
    const stati = ['accettata', 'in_lavorazione', 'pronto', 'consegnata'];
    const statiLabel = { accettata: '📥 Accettata', in_lavorazione: '🔧 In lavorazione', pronto: '✅ Pronto', consegnata: '📦 Consegnata' };

    // Use all orders grouped by stato (ignore current filter for kanban columns)
    const allByStato = {};
    stati.forEach(s => { allByStato[s] = ordini.filter(o => o.stato === s); });

    container.innerHTML = stati.map(stato => `
      <div class="kanban-col" data-stato="${stato}">
        <div class="kanban-col-title">${statiLabel[stato]} (${allByStato[stato].length})</div>
        ${allByStato[stato].map(o => {
      const c = clientiMap[o.clienteId];
      return `<div class="kanban-card" draggable="true" data-id="${o.id}">
            <div class="kanban-card-nome">${esc(c ? [c.nome, c.cognome].filter(Boolean).join(' ') : '?')}</div>
            <div class="kanban-card-sub">${esc(o.biciNome) || '—'} · ${fmt(o.totale)}</div>
          </div>`;
    }).join('')}
      </div>
    `).join('');

    // Drag & Drop HTML5
    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('click', () => {
        UI.apriModalOrdine(card.dataset.id);
      });
    });

    container.querySelectorAll('.kanban-col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', async e => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const ordineId = e.dataTransfer.getData('text/plain');
        const nuovoStato = col.dataset.stato;
        try {
          const ordine = await OrdiniService.findById(ordineId);
          if (ordine.stato === nuovoStato) return;
          await OrdiniService.salva({
            ...ordine,
            stato: nuovoStato,
            dataUscita: nuovoStato === 'consegnata' ? new Date().toISOString() : null,
          }, ordine.voci);
          // Re-render
          const filtro = document.getElementById('filter-ordini').value || 'tutti';
          const query = document.getElementById('search-ordini').value;
          await renderOrdini(filtro, query);
        } catch (err) { /* handled by caller */ }
      });
    });
  }

  // ── Beep Notification (#13) ────────────────────────────────────
  function beepNotifica() {
    if (sessionStorage.getItem('ciclo-beep-done')) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      sessionStorage.setItem('ciclo-beep-done', '1');
    } catch (e) { /* ignore audio errors */ }
  }

  // ── Approvvigionamenti ────────────────────────────────────────
  let _poCorrente = null;
  let _poRefsPrefill = null;   // refs ricambi cliente in attesa di submit
  let _suggerimentiCache = []; // ultime suggerimenti per "Crea ordine da suggerimenti"

  function poStatoBadge(stato) {
    const cfg = OrdiniFornitoreService.STATI_LABEL[stato] || { icon: '•', label: stato, color: '#999' };
    return `<span class="ricambi-badge" style="background:${cfg.color};color:#fff">${cfg.icon} ${cfg.label}</span>`;
  }

  async function renderFornitori(filtroStato = '') {
    const wrap = document.getElementById('fornitori-list');
    const suggWrap = document.getElementById('riordino-suggerimenti-wrap');
    try {
      const [lista, sugg] = await Promise.all([
        OrdiniFornitoreService.list(filtroStato ? { stato: filtroStato } : {}),
        OrdiniFornitoreService.suggerimenti(),
      ]);
      _suggerimentiCache = sugg;
      // Pannello suggerimenti
      if (!sugg.length) {
        suggWrap.innerHTML = '<div class="card" style="background:#f0fdf4;border-left:4px solid #16a34a;padding:.75rem 1rem"><strong>✅ Nessun riordino da fare:</strong> tutti i ricambi richiesti e i componenti sotto-scorta sono già in un ordine o sopra soglia.</div>';
      } else {
        suggWrap.innerHTML = `
          <h3 style="margin-top:0">🔔 Da riordinare (${sugg.reduce((s, g) => s + g.ricambiCliente.length + g.sottoScorta.length, 0)} articoli su ${sugg.length} fornitor${sugg.length === 1 ? 'e' : 'i'})</h3>
          <div class="card-list">${sugg.map((g, idx) => `
            <div class="card">
              <div class="card-head">
                <h4>🏷 ${esc(g.fornitore)}</h4>
                <button class="btn btn-primary btn-sm" data-action="crea-po-da-sugg" data-idx="${idx}">+ Crea ordine</button>
              </div>
              ${g.ricambiCliente.length ? `
                <div class="card-sub" style="margin-top:.4rem"><strong>📦 Ricambi ordini cliente (${g.ricambiCliente.length}):</strong></div>
                <ul style="margin:.3rem 0;padding-left:1.2rem;font-size:.85rem">
                  ${g.ricambiCliente.slice(0, 6).map(r => `<li>${esc(r.nome)} ×${r.qta} <span class="card-sub">— ${esc(r.clienteNome)}</span></li>`).join('')}
                  ${g.ricambiCliente.length > 6 ? `<li class="card-sub">…+ ${g.ricambiCliente.length - 6} altri</li>` : ''}
                </ul>
              ` : ''}
              ${g.sottoScorta.length ? `
                <div class="card-sub" style="margin-top:.4rem"><strong>📉 Sotto-scorta (${g.sottoScorta.length}):</strong></div>
                <ul style="margin:.3rem 0;padding-left:1.2rem;font-size:.85rem">
                  ${g.sottoScorta.slice(0, 6).map(s => `<li>${esc(s.nome)} <span class="card-sub">— giac. ${s.giacenza}/${s.soglia_min} → suggerite ×${s.qtaSuggerita}</span></li>`).join('')}
                  ${g.sottoScorta.length > 6 ? `<li class="card-sub">…+ ${g.sottoScorta.length - 6} altri</li>` : ''}
                </ul>
              ` : ''}
            </div>
          `).join('')}</div>
        `;
      }
      // Lista approvvigionamenti
      if (!lista.length) {
        wrap.innerHTML = '<p class="card-sub" style="padding:1rem;text-align:center">Nessun approvvigionamento in elenco.</p>';
      } else {
        wrap.innerHTML = `<div class="card-list">${lista.map(po => {
          const dataAttesa = po.dataAttesa ? `<span class="card-sub">📅 attesa: ${fmtDate(po.dataAttesa)}</span>` : '';
          const dataRic = po.dataRicezione ? `<span class="card-sub">✅ ricevuto: ${fmtDate(po.dataRicezione)}</span>` : '';
          const ddt = po.riferimentoDDT ? `<span class="card-sub">📄 DDT: ${esc(po.riferimentoDDT)}</span>` : '';
          const azioneRicevi = ['ordinato', 'in_transito', 'parzialmente_ricevuto'].includes(po.stato)
            ? `<button class="btn btn-primary btn-sm" data-action="ricevi-po" data-id="${po.id}">📥 Ricevi</button>` : '';
          return `<div class="card">
            <div class="card-head">
              <h4>ORD-${String(po.numero).padStart(3, '0')} · ${esc(po.fornitore)}</h4>
              ${poStatoBadge(po.stato)}
            </div>
            <div class="card-meta">
              <span class="card-sub">${po.nRighe} ${po.nRighe === 1 ? 'riga' : 'righe'} · ${po.qtaTotRicevuta}/${po.qtaTotOrdinata} pezzi · € ${(po.totaleAcquisto || 0).toFixed(2)}</span>
              ${dataAttesa} ${dataRic} ${ddt}
            </div>
            <div class="card-actions" style="margin-top:.6rem">
              <button class="btn btn-secondary btn-sm" data-action="apri-po" data-id="${po.id}">✏️ Dettaglio</button>
              ${azioneRicevi}
            </div>
          </div>`;
        }).join('')}</div>`;
      }
    } catch (e) {
      wrap.innerHTML = `<p style="color:#c00">Errore: ${esc(e.message)}</p>`;
    }
  }

  function aggiornaPoTotale() {
    let totale = 0;
    document.querySelectorAll('#tbody-po-righe tr').forEach(tr => {
      const qta = parseInt(tr.querySelector('.inp-po-qta')?.value) || 0;
      const prezzo = parseFloat(tr.querySelector('.inp-po-prezzo')?.value) || 0;
      const sub = qta * prezzo;
      tr.querySelector('.po-subtot').textContent = '€ ' + sub.toFixed(2);
      totale += sub;
    });
    document.getElementById('po-totale').textContent = '€ ' + totale.toFixed(2);
  }

  function aggiungiRigaPO(riga = null) {
    const tbody = document.getElementById('tbody-po-righe');
    const idx = tbody.children.length;
    const tr = document.createElement('tr');
    // Iniziale nome: se collegato a componente usa display, altrimenti nomeNuovo
    let nomeIniziale = riga?.nomeNuovo || '';
    let compIdIniziale = riga?.componenteId || '';
    if (compIdIniziale && _componentiMap[compIdIniziale]) {
      nomeIniziale = _componentiMap[compIdIniziale].display;
    } else if (compIdIniziale && riga?.componenteNome) {
      nomeIniziale = riga.componenteMarca ? `${riga.componenteNome} · ${riga.componenteMarca}` : riga.componenteNome;
    }
    tr.innerHTML = `
      <td style="position:relative">
        <input type="text" class="inp-po-nome" placeholder="Articolo o nuovo nome" value="${esc(nomeIniziale)}" autocomplete="off" />
        <input type="hidden" class="hid-po-componente" value="${esc(compIdIniziale)}" />
        <div class="comp-suggestions hidden"></div>
      </td>
      <td><input type="number" class="inp-po-qta" min="1" step="1" value="${riga?.qtaOrdinata || 1}" /></td>
      <td><input type="number" class="inp-po-prezzo" min="0" step="0.01" value="${riga?.prezzoUnit ? Number(riga.prezzoUnit).toFixed(2) : ''}" placeholder="0.00" /></td>
      <td><span class="po-subtot">€ 0,00</span></td>
      <td><button type="button" class="btn-rimuovi-ricambio" aria-label="Rimuovi">✕</button></td>
    `;
    const inpNome = tr.querySelector('.inp-po-nome');
    const hidComp = tr.querySelector('.hid-po-componente');
    const sugDiv  = tr.querySelector('.comp-suggestions');

    function renderSug(query = '') {
      const q = query.toLowerCase().trim();
      const matches = _componentiList
        .filter(c => !q || (`${c.nome} ${c.marca || ''} ${c.codice || ''}`.toLowerCase().includes(q)))
        .slice(0, 10);
      sugDiv.innerHTML = matches.map(c => {
        const display = c.marca ? `${c.nome} · ${c.marca}` : c.nome;
        return `<div class="comp-suggestion" data-id="${c.id}" data-value="${display.replace(/"/g, '&quot;')}" data-prezzo="${c.prezzo_acquisto || 0}">
          <span class="comp-suggestion-nome">${esc(display)}</span>
          <span class="comp-suggestion-giac">giac. ${c.giacenza || 0}</span>
        </div>`;
      }).join('');
      sugDiv.classList.toggle('hidden', matches.length === 0);
    }
    inpNome.addEventListener('focus', () => renderSug(inpNome.value));
    inpNome.addEventListener('input', function () { hidComp.value = ''; renderSug(this.value); });
    inpNome.addEventListener('blur', () => setTimeout(() => sugDiv.classList.add('hidden'), 150));
    sugDiv.addEventListener('mousedown', ev => {
      const item = ev.target.closest('.comp-suggestion');
      if (!item) return;
      inpNome.value = item.dataset.value;
      hidComp.value = item.dataset.id;
      sugDiv.classList.add('hidden');
      const inpPrezzo = tr.querySelector('.inp-po-prezzo');
      if (!inpPrezzo.value && parseFloat(item.dataset.prezzo) > 0) {
        inpPrezzo.value = parseFloat(item.dataset.prezzo).toFixed(2);
      }
      aggiornaPoTotale();
      ev.preventDefault();
    });
    tr.querySelector('.inp-po-qta').addEventListener('input', aggiornaPoTotale);
    tr.querySelector('.inp-po-prezzo').addEventListener('input', aggiornaPoTotale);
    tr.querySelector('.btn-rimuovi-ricambio').addEventListener('click', () => { tr.remove(); aggiornaPoTotale(); });
    tbody.appendChild(tr);
    aggiornaPoTotale();
  }

  function raccogliPORighe() {
    const out = [];
    document.querySelectorAll('#tbody-po-righe tr').forEach(tr => {
      const nome = tr.querySelector('.inp-po-nome')?.value.trim() || '';
      const componenteId = tr.querySelector('.hid-po-componente')?.value || '';
      const qta = parseInt(tr.querySelector('.inp-po-qta')?.value) || 0;
      const prezzo = parseFloat(tr.querySelector('.inp-po-prezzo')?.value) || 0;
      if (!nome || qta <= 0) return;
      const r = { qtaOrdinata: qta, prezzoUnit: prezzo };
      if (componenteId) r.componenteId = componenteId;
      else r.nomeNuovo = nome;
      out.push(r);
    });
    return out;
  }

  async function apriModalPO(poId = null, prefill = null) {
    // Carica componenti per autocomplete
    try {
      const componenti = await ComponentiService.getAll();
      _componentiList = componenti.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      _componentiMap = {};
      _componentiList.forEach(c => {
        const display = c.marca ? `${c.nome} · ${c.marca}` : c.nome;
        _componentiMap[c.id] = { ...c, display };
      });
    } catch { /* ignore */ }

    document.getElementById('tbody-po-righe').innerHTML = '';
    document.getElementById('po-totale').textContent = '€ 0,00';

    let po = null;
    if (poId) po = await OrdiniFornitoreService.findById(poId);
    _poCorrente = po;
    // Quando si crea da suggerimento, i refs verso ricambi cliente arrivano nel prefill
    _poRefsPrefill = (!po && prefill?.righeClienteRefs) ? prefill.righeClienteRefs : null;

    document.getElementById('modal-po-title').textContent = po ? '✏️ Modifica Approvvigionamento' : '+ Nuovo Approvvigionamento';
    document.getElementById('modal-po-numero').textContent = po ? `ORD-${String(po.numero).padStart(3, '0')} · ${OrdiniFornitoreService.STATI_LABEL[po.stato]?.label || po.stato}` : '';
    document.getElementById('po-id').value = po?.id || '';
    document.getElementById('po-fornitore').value = po?.fornitore || prefill?.fornitore || '';

    // Stato: gli stati editabili sono solo bozza/ordinato/in_transito.
    // Per PO in stato avanzato (parz./ricevuto/annullato) aggiungiamo l'opzione
    // in sola lettura per visualizzarlo correttamente.
    const selectStato = document.getElementById('po-stato');
    const opzioniEditabili = ['bozza', 'ordinato', 'in_transito'];
    selectStato.innerHTML = `
      <option value="bozza">📝 Bozza</option>
      <option value="ordinato">📤 Ordinato</option>
      <option value="in_transito">🚚 In transito</option>
    `;
    const statoCorrente = po?.stato || 'bozza';
    if (po && !opzioniEditabili.includes(statoCorrente)) {
      const info = OrdiniFornitoreService.STATI_LABEL[statoCorrente] || { icon: '', label: statoCorrente };
      const opt = document.createElement('option');
      opt.value = statoCorrente;
      opt.textContent = `${info.icon} ${info.label}`;
      selectStato.appendChild(opt);
    }
    selectStato.value = statoCorrente;
    selectStato.disabled = !!po && !opzioniEditabili.includes(statoCorrente);

    document.getElementById('po-data-attesa').value = po?.dataAttesa ? po.dataAttesa.slice(0, 10) : '';
    document.getElementById('po-ddt').value = po?.riferimentoDDT || '';
    document.getElementById('po-note').value = po?.note || '';

    // Popola righe esistenti o prefill
    if (po && po.righe) {
      po.righe.forEach(r => aggiungiRigaPO(r));
    } else if (prefill?.righe?.length) {
      prefill.righe.forEach(r => aggiungiRigaPO(r));
    } else {
      aggiungiRigaPO();
    }

    // Disabilita modifica righe se PO non più in bozza
    const inBozza = !po || po.stato === 'bozza';
    document.getElementById('btn-aggiungi-riga-po').disabled = !inBozza;
    document.querySelectorAll('#tbody-po-righe input, #tbody-po-righe button').forEach(el => {
      if (!inBozza) el.setAttribute('disabled', 'disabled');
    });
    // Mostra pulsante "Annulla" solo per ordini non terminali
    const btnAnnulla = document.getElementById('btn-po-annulla');
    if (po && !['ricevuto', 'annullato'].includes(po.stato)) {
      btnAnnulla.style.display = '';
    } else {
      btnAnnulla.style.display = 'none';
    }

    openModal('modal-po');
    document.getElementById('po-fornitore').focus();
  }

  function preparaPOdaSuggerimento(idx) {
    const g = _suggerimentiCache[idx];
    if (!g) return;
    // Aggrega per componenteId (somma qta); ricambi senza componenteId restano singoli
    // Tieni traccia degli indici per costruire righeClienteRefs (collegamento bidirezionale)
    const aggregMap = {};   // componenteId → indice in `righe`
    const senzaComp = [];   // { riga, ref }
    const refs = [];        // [{ ordineId, ricambioIdx, rigaPoIdx }]
    const righe = [];

    g.ricambiCliente.forEach(r => {
      if (r.componenteId) {
        let i = aggregMap[r.componenteId];
        if (i == null) {
          i = righe.length;
          aggregMap[r.componenteId] = i;
          righe.push({ componenteId: r.componenteId, qtaOrdinata: 0, prezzoUnit: 0 });
        }
        righe[i].qtaOrdinata += (r.qta || 1);
        refs.push({ ordineId: r.ordineId, ricambioIdx: r.ricambioIdx, rigaPoIdx: i });
      } else {
        const i = righe.length;
        righe.push({ nomeNuovo: r.nome, qtaOrdinata: r.qta || 1, prezzoUnit: 0 });
        refs.push({ ordineId: r.ordineId, ricambioIdx: r.ricambioIdx, rigaPoIdx: i });
      }
    });
    g.sottoScorta.forEach(s => {
      let i = aggregMap[s.componenteId];
      if (i == null) {
        i = righe.length;
        aggregMap[s.componenteId] = i;
        righe.push({ componenteId: s.componenteId, qtaOrdinata: 0, prezzoUnit: s.prezzo_acquisto || 0 });
      }
      righe[i].qtaOrdinata += s.qtaSuggerita;
      if (!righe[i].prezzoUnit) righe[i].prezzoUnit = s.prezzo_acquisto || 0;
    });

    const forn = g.fornitore === '(Senza fornitore)' ? '' : g.fornitore;
    apriModalPO(null, { fornitore: forn, righe, righeClienteRefs: refs });
  }

  async function inviaPO(ev) {
    ev.preventDefault();
    const id = document.getElementById('po-id').value;
    const fornitore = document.getElementById('po-fornitore').value.trim();
    if (!fornitore) { window._showError?.('Fornitore obbligatorio'); return; }
    const stato = document.getElementById('po-stato').value;
    const dataAttesa = document.getElementById('po-data-attesa').value || null;
    const riferimentoDDT = document.getElementById('po-ddt').value.trim();
    const note = document.getElementById('po-note').value.trim();
    const righe = raccogliPORighe();
    if (!righe.length) { window._showError?.('Aggiungi almeno una riga'); return; }

    // Quando si modifica un PO in bozza, includi anche le righe (sostituisce)
    const isBozzaModifica = _poCorrente && _poCorrente.stato === 'bozza';
    const body = { fornitore, stato, dataAttesa, riferimentoDDT, note };
    if (!id || isBozzaModifica) body.righe = righe;
    // Solo in creazione: passa il collegamento ricambi cliente → righe PO
    if (!id && _poRefsPrefill && _poRefsPrefill.length) body.righeClienteRefs = _poRefsPrefill;

    if (id) await OrdiniFornitoreService.aggiorna(id, body);
    else await OrdiniFornitoreService.crea(body);

    _poRefsPrefill = null;
    closeAllModals();
    await renderFornitori(document.getElementById('filter-po-stato').value);
  }

  async function apriModalRiceviPO(poId) {
    const po = await OrdiniFornitoreService.findById(poId);
    document.getElementById('po-ricevi-id').value = po.id;
    document.getElementById('po-ricevi-numero').textContent = `ORD-${String(po.numero).padStart(3, '0')} · ${esc(po.fornitore)}`;
    document.getElementById('po-ricevi-ddt').value = po.riferimentoDDT || '';
    const tbody = document.getElementById('tbody-po-ricevi');
    tbody.innerHTML = po.righe.map(r => {
      const rimanenti = (r.qtaOrdinata || 0) - (r.qtaRicevuta || 0);
      const nome = r.componenteNome ? (r.componenteMarca ? `${r.componenteNome} · ${r.componenteMarca}` : r.componenteNome) : (r.nomeNuovo || r.id.slice(0, 6));
      return `<tr data-riga-id="${r.id}">
        <td>${esc(nome)}</td>
        <td>${r.qtaOrdinata}</td>
        <td>${r.qtaRicevuta || 0}</td>
        <td><input type="number" class="inp-ricevi-qta" min="0" max="${rimanenti}" step="1" value="${rimanenti}" ${rimanenti <= 0 ? 'disabled' : ''} /></td>
        <td><input type="number" class="inp-ricevi-prezzo" min="0" step="0.01" value="${Number(r.prezzoUnit || 0).toFixed(2)}" /></td>
      </tr>`;
    }).join('');
    openModal('modal-po-ricevi');
  }

  async function inviaRiceviPO(ev) {
    ev.preventDefault();
    const id = document.getElementById('po-ricevi-id').value;
    const riferimentoDDT = document.getElementById('po-ricevi-ddt').value.trim();
    const righe = [];
    document.querySelectorAll('#tbody-po-ricevi tr').forEach(tr => {
      const qta = parseInt(tr.querySelector('.inp-ricevi-qta')?.value) || 0;
      const prezzo = parseFloat(tr.querySelector('.inp-ricevi-prezzo')?.value);
      if (qta > 0) {
        const r = { rigaId: tr.dataset.rigaId, qtaRicevuta: qta };
        if (!isNaN(prezzo)) r.prezzoUnit = prezzo;
        righe.push(r);
      }
    });
    if (!righe.length) { window._showError?.('Nessuna quantità da ricevere'); return; }
    await OrdiniFornitoreService.ricevi(id, { riferimentoDDT, righe });
    closeAllModals();
    await renderFornitori(document.getElementById('filter-po-stato').value);
  }

  async function annullaPO(poId) {
    if (!confirm('Annullare questo approvvigionamento? I ricambi cliente collegati torneranno a "🔴 Da ordinare".')) return;
    await OrdiniFornitoreService.annulla(poId);
    closeAllModals();
    await renderFornitori(document.getElementById('filter-po-stato').value);
  }

  // ── Nav Badges (#8) ────────────────────────────────────────────
  async function aggiornaNavBadges() {
    try {
      const [ordini, clienti] = await Promise.all([
        OrdiniService.getAll(),
        ClientiService.getAll(),
      ]);
      const inCorso = ordini.filter(o => o.stato !== 'consegnata').length;
      document.querySelectorAll('.nav-btn').forEach(btn => {
        const existing = btn.querySelector('.nav-badge');
        if (existing) existing.remove();
        const view = btn.dataset.view;
        let count = 0;
        if (view === 'clienti') count = clienti.length;
        else if (view === 'ordini') count = inCorso;
        if (count > 0) {
          const badge = document.createElement('span');
          badge.className = 'nav-badge';
          badge.textContent = count;
          btn.appendChild(badge);
        }
      });
    } catch (e) { /* silent */ }
  }

  return {
    renderDashboard, renderClienti, renderOrdini, renderCatalogo,
    renderMagazzino, apriModalComponente, apriModalMovimenti,
    apriModalImportCsv, eseguiAnteprimaCsv, eseguiImportCsv, downloadTemplateCsv,
    apriModalCaricoMerce, aggiungiRigaCarico, inviaCarico,
    apriModalCliente, apriModalOrdine, apriModalLavorazione,
    apriModalStorico, filtraStorico,
    apriModalBiciCliente, renderBiciList, apriModalAggiungiBici, aggiornaBiciSelect,
    aggiungiRigaVoce, raccogliVoci, getOrdineFoto, renderFotoPreview,
    aggiungiRigaRicambio, raccogliRicambi,
    renderTimeline, getOrdineCorrenteId: () => _ordineCorrenteId,
    openModal, closeAllModals,
    printOrdine, cercaGlobale, aggiornaLocale,
    aggiornaNavBadges, beepNotifica,
    renderFornitori, apriModalPO, apriModalRiceviPO, aggiungiRigaPO,
    inviaPO, inviaRiceviPO, annullaPO, preparaPOdaSuggerimento,
  };
})();
