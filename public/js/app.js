document.addEventListener('DOMContentLoaded', () => {

  // ── Toast errori ──────────────────────────────────────────────
  function showError(msg) {
    const t = document.createElement('div');
    t.textContent = '⚠ ' + msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      background: '#dc2626', color: '#fff', padding: '.75rem 1.2rem',
      borderRadius: '8px', fontSize: '.9rem', zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,.3)',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  function showSuccess(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      background: '#16a34a', color: '#fff', padding: '.75rem 1.2rem',
      borderRadius: '8px', fontSize: '.9rem', zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,.3)',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── Loading overlay ───────────────────────────────────────────
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loading-overlay';
  loadingOverlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(loadingOverlay);
  let _loadingCount = 0;
  function showLoading() { _loadingCount++; loadingOverlay.classList.add('visible'); }
  function hideLoading() { _loadingCount = Math.max(0, _loadingCount - 1); if (!_loadingCount) loadingOverlay.classList.remove('visible'); }

  // ── Dirty form tracking ───────────────────────────────────────
  let _formDirty = false;

  // ── Navigazione view ──────────────────────────────────────────
  let currentView = 'dashboard';

  async function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${name}`).classList.add('active');
    document.querySelector(`.nav-btn[data-view="${name}"]`).classList.add('active');
    currentView = name;
    await refreshView(name);
  }

  async function refreshView(name) {
    showLoading();
    try {
      switch (name) {
        case 'dashboard': await UI.renderDashboard(); break;
        case 'clienti':   await UI.renderClienti(document.getElementById('search-clienti').value); break;
        case 'ordini':    await UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery()); break;
        case 'catalogo':  await UI.renderCatalogo(); break;
      }
    } catch (e) { showError(e.message); }
    finally { hideLoading(); }
  }

  function getOrdiniFilter() {
    return document.getElementById('filter-ordini').value || 'tutti';
  }
  function getOrdiniQuery() {
    return document.getElementById('search-ordini').value;
  }

  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => showView(btn.dataset.view))
  );

  // ── Ricerca ───────────────────────────────────────────────────
  document.getElementById('search-clienti').addEventListener('input', e =>
    UI.renderClienti(e.target.value).catch(showError)
  );
  document.getElementById('search-ordini').addEventListener('input', () =>
    UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery()).catch(showError)
  );
  document.getElementById('filter-ordini').addEventListener('change', () => {
    sessionStorage.setItem('ciclo-ordini-filtro', getOrdiniFilter());
    UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery()).catch(showError);
  });
  document.getElementById('search-storico').addEventListener('input', e =>
    UI.filtraStorico(e.target.value)
  );

  // ── Ricerca globale ───────────────────────────────────────────
  let _searchGlobaleTimeout = null;
  const searchGlobaleInput = document.getElementById('search-globale');
  const searchGlobaleResults = document.getElementById('search-globale-results');

  searchGlobaleInput.addEventListener('input', () => {
    clearTimeout(_searchGlobaleTimeout);
    _searchGlobaleTimeout = setTimeout(() => {
      UI.cercaGlobale(searchGlobaleInput.value).catch(showError);
    }, 250);
  });

  searchGlobaleInput.addEventListener('blur', () => {
    setTimeout(() => searchGlobaleResults.classList.add('hidden'), 200);
  });
  searchGlobaleInput.addEventListener('focus', () => {
    if (searchGlobaleInput.value.trim()) UI.cercaGlobale(searchGlobaleInput.value).catch(showError);
  });

  searchGlobaleResults.addEventListener('mousedown', async (ev) => {
    const item = ev.target.closest('.global-search-item');
    if (!item) return;
    ev.preventDefault();
    const { action, id } = item.dataset;
    searchGlobaleResults.classList.add('hidden');
    searchGlobaleInput.value = '';
    try {
      switch (action) {
        case 'edit-cliente':     await UI.apriModalCliente(id); break;
        case 'edit-ordine':      await UI.apriModalOrdine(id); break;
        case 'edit-lavorazione': await UI.apriModalLavorazione(id); break;
      }
    } catch (e) { showError(e.message); }
  });

  // ── Apertura modali principali ────────────────────────────────
  document.getElementById('btn-nuovo-cliente').addEventListener('click', () =>
    UI.apriModalCliente().catch(showError)
  );

  document.getElementById('btn-nuovo-ordine').addEventListener('click', async () => {
    try {
      const clienti = await ClientiService.getAll();
      if (!clienti.length) {
        showError('Aggiungi prima almeno un cliente!');
        return showView('clienti');
      }
      await UI.apriModalOrdine();
    } catch (e) { showError(e.message); }
  });

  document.getElementById('btn-aggiungi-voce').addEventListener('click', () => {
    UI.aggiungiRigaVoce({});
  });

  // ── Upload foto ordine ────────────────────────────────────────
  document.getElementById('ordine-foto-input').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) { showError('Foto troppo grande (max 2MB)'); continue; }
      const reader = new FileReader();
      reader.onload = () => {
        UI.getOrdineFoto().push(reader.result);
        UI.renderFotoPreview();
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  });

  // Rimuovi foto (delegazione)
  document.getElementById('ordine-foto-preview').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-foto-remove');
    if (!btn) return;
    const idx = parseInt(btn.dataset.fotoIdx);
    UI.getOrdineFoto().splice(idx, 1);
    UI.renderFotoPreview();
  });

  // ── Acconto input → aggiorna resto in tempo reale ─────────────
  document.getElementById('ordine-acconto').addEventListener('input', () => {
    UI.aggiornaLocale();
  });

  // ── Backup database ───────────────────────────────────────────
  document.getElementById('btn-backup-db').addEventListener('click', () => {
    window.location.href = '/api/backup';
  });
  document.getElementById('btn-backup-json').addEventListener('click', () => {
    window.location.href = '/api/backup/json';
  });

  // ── Import JSON ───────────────────────────────────────────────
  document.getElementById('btn-import-json').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('⚠️ L\'importazione SOVRASCRIVERÀ tutti i dati attuali.\n\nAssicurati di aver fatto un backup prima.\n\nVuoi continuare?')) {
      e.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res  = await fetch('/api/import/json', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const s = result.importati;
      showSuccess(`✅ Importati: ${s.clienti} clienti, ${s.bici} bici, ${s.lavorazioni} lavorazioni, ${s.ordini} ordini`);
      await refreshView(currentView);
    } catch (err) {
      showError('Errore importazione: ' + err.message);
    }
    e.target.value = '';
  });

  document.getElementById('btn-nuova-lavorazione').addEventListener('click', () =>
    UI.apriModalLavorazione().catch(showError)
  );

  document.getElementById('btn-aggiungi-bici').addEventListener('click', () => {
    const clienteId = document.getElementById('bici-cliente-id-hidden').value;
    UI.apriModalAggiungiBici(clienteId).catch(showError);
  });

  // ── Delegazione eventi card ───────────────────────────────────
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    try {
      switch (action) {

        // ── Clienti
        case 'edit-cliente':
          await UI.apriModalCliente(id); break;
        case 'del-cliente': {
          const [ordiniCliente, biciCliente] = await Promise.all([
            OrdiniService.getByCliente(id),
            BiciService.getByCliente(id),
          ]);
          const parti = [];
          if (ordiniCliente.length) parti.push(`${ordiniCliente.length} ordin${ordiniCliente.length === 1 ? 'e' : 'i'}`);
          if (biciCliente.length)  parti.push(`${biciCliente.length} bici`);
          const dettaglio = parti.length ? ` con ${parti.join(' e ')}` : '';
          if (confirm(`Eliminare il cliente${dettaglio}? L'operazione è irreversibile.`)) {
            await ClientiService.elimina(id);
            await refreshView(currentView);
            showSuccess('✅ Cliente eliminato');
          }
          break;
        }
        case 'nuovo-ordine-cliente':
          await showView('ordini');
          await UI.apriModalOrdine(null, id);
          break;

        // ── Storico
        case 'storico-cliente':
          await UI.apriModalStorico(id); break;

        // ── Bici
        case 'bici-cliente':
          await UI.apriModalBiciCliente(id); break;
        case 'edit-bici': {
          const clienteId = document.getElementById('bici-cliente-id-hidden').value;
          await UI.apriModalAggiungiBici(clienteId, id);
          break;
        }
        case 'del-bici':
          if (confirm('Eliminare questa bici? Gli ordini collegati non verranno eliminati.')) {
            await BiciService.elimina(id);
            const clienteId = document.getElementById('bici-cliente-id-hidden').value;
            const bici      = await BiciService.getByCliente(clienteId);
            UI.renderBiciList(bici);
            showSuccess('✅ Bici eliminata');
          }
          break;

        // ── Ordini
        case 'print-ordine':
          await UI.printOrdine(id); break;
        case 'edit-ordine':
          await UI.apriModalOrdine(id); break;
        case 'del-ordine':
          if (confirm('Eliminare questo ordine?')) {
            await OrdiniService.elimina(id);
            await refreshView(currentView);
            showSuccess('✅ Ordine eliminato');
          }
          break;
        case 'toggle-pagato':
          await OrdiniService.togglePagato(id);
          await refreshView(currentView);
          break;
        case 'avanza-ordine':
          await OrdiniService.avanza(id);
          await refreshView(currentView);
          break;
        case 'riapri-ordine':
          await OrdiniService.riapri(id);
          await refreshView(currentView);
          break;

        // ── Catalogo
        case 'edit-lavorazione':
          await UI.apriModalLavorazione(id); break;
        case 'del-lavorazione':
          if (confirm('Eliminare questa lavorazione dal catalogo?')) {
            await LavorazioniService.elimina(id);
            await UI.renderCatalogo();
            showSuccess('✅ Lavorazione eliminata');
          }
          break;
      }
    } catch (e) { showError(e.message); }
  });

  // ── Chiusura modali ───────────────────────────────────────────
  document.querySelectorAll('.modal-close').forEach(btn =>
    btn.addEventListener('click', UI.closeAllModals)
  );
  document.getElementById('overlay').addEventListener('click', UI.closeAllModals);

  // ── Escape key chiude modali ──────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') UI.closeAllModals();
  });

  // ── Submit Cliente ────────────────────────────────────────────
  document.getElementById('form-cliente').addEventListener('submit', async e => {
    e.preventDefault();
    const nome    = document.getElementById('cliente-nome').value.trim();
    const cognome  = document.getElementById('cliente-cognome').value.trim();
    const tel      = document.getElementById('cliente-telefono').value.trim();
    if (!nome)    return showError('Il nome è obbligatorio.');
    if (!cognome) return showError('Il cognome è obbligatorio.');
    if (!tel)     return showError('Il telefono è obbligatorio.');
    try {
      await ClientiService.salva({
        id:       document.getElementById('cliente-id').value || null,
        nome,
        cognome,
        telefono: tel,
        email:    document.getElementById('cliente-email').value,
        note:     document.getElementById('cliente-note').value,
      });
      _formDirty = false;
      UI.closeAllModals();
      showSuccess('✅ Cliente salvato');
      await refreshView(currentView);
    } catch (e) { showError(e.message); }
  });

  // ── Submit Ordine ─────────────────────────────────────────────
  document.getElementById('form-ordine').addEventListener('submit', async e => {
    e.preventDefault();
    const clienteId = document.getElementById('ordine-cliente-id').value;
    if (!clienteId) return showError('Seleziona un cliente.');
    try {
      const voci = UI.raccogliVoci();
      if (!voci.length) return showError('Aggiungi almeno una lavorazione all\u2019ordine.');
      const ordineId  = document.getElementById('ordine-id').value || null;
      const esistente = ordineId ? await OrdiniService.findById(ordineId) : null;

      await OrdiniService.salva({
        id:           ordineId,
        clienteId,
        biciId:       document.getElementById('ordine-bici-id').value || null,
        stato:        document.getElementById('ordine-stato').value || 'accettata',
        dataIngresso: document.getElementById('ordine-data-ingresso').value
                      ? new Date(document.getElementById('ordine-data-ingresso').value).toISOString()
                      : new Date().toISOString(),
        dataUscita:   esistente?.dataUscita || null,
        note:         document.getElementById('ordine-note').value,
        pagato:       document.getElementById('ordine-pagato').checked,
        acconto:      document.getElementById('ordine-acconto').value || 0,
        foto:         UI.getOrdineFoto(),
      }, voci);

      const storicoModal     = document.getElementById('modal-storico');
      const storicoAperto    = !storicoModal.classList.contains('hidden');
      const storicoClienteId = storicoModal.dataset.clienteId;

      _formDirty = false;
      UI.closeAllModals();

      if (storicoAperto && storicoClienteId) {
        await UI.apriModalStorico(storicoClienteId);
      } else {
        await refreshView(currentView);
      }
      showSuccess('✅ Ordine salvato');
    } catch (e) { showError(e.message); }
  });

  // ── Submit Lavorazione ────────────────────────────────────────
  document.getElementById('form-lavorazione').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('lavorazione-nome').value.trim();
    if (!nome) return showError('Il nome è obbligatorio.');
    try {
      await LavorazioniService.salva({
        id:          document.getElementById('lavorazione-id').value || null,
        nome,
        prezzo:      document.getElementById('lavorazione-prezzo').value,
        descrizione: document.getElementById('lavorazione-descrizione').value,
      });
      _formDirty = false;
      UI.closeAllModals();
      await UI.renderCatalogo();
      showSuccess('✅ Lavorazione salvata');
    } catch (e) { showError(e.message); }
  });

  // ── Submit Bici ───────────────────────────────────────────────
  document.getElementById('form-aggiungi-bici').addEventListener('submit', async e => {
    e.preventDefault();
    const modello = document.getElementById('bici-modello').value.trim();
    if (!modello) return showError('Il modello è obbligatorio.');
    try {
      const clienteId = document.getElementById('bici-cliente-id-hidden').value;
      await BiciService.salva({
        id:                    document.getElementById('bici-id').value || null,
        clienteId,
        marca:                 document.getElementById('bici-marca').value,
        modello,
        tipo:                  document.getElementById('bici-tipo').value,
        colore:                document.getElementById('bici-colore').value,
        seriale_forcella:      document.getElementById('bici-ser-forcella').value,
        seriale_ammortizzatore:document.getElementById('bici-ser-ammortizzatore').value,
        note:                  document.getElementById('bici-note').value,
      });
      _formDirty = false;
      UI.closeAllModals();
      await UI.apriModalBiciCliente(clienteId);
      showSuccess('✅ Bici salvata');
    } catch (e) { showError(e.message); }
  });

  // ── Render iniziale ───────────────────────────────────────────
  // Dirty form — avvisa prima di chiudere se ci sono modifiche
  document.querySelectorAll('#form-ordine input, #form-ordine textarea, #form-ordine select, #form-cliente input, #form-cliente textarea').forEach(el => {
    el.addEventListener('input', () => { _formDirty = true; });
    el.addEventListener('change', () => { _formDirty = true; });
  });
  const _origCloseAll = UI.closeAllModals;
  UI.closeAllModals = () => {
    if (_formDirty) {
      const anyModalOpen = document.querySelector('.modal:not(.hidden)');
      if (anyModalOpen && !confirm('Hai modifiche non salvate. Chiudere comunque?')) return;
    }
    _formDirty = false;
    _origCloseAll();
  };

  // Ripristina filtro ordini dalla sessione precedente
  const savedFilter = sessionStorage.getItem('ciclo-ordini-filtro') || 'tutti';
  document.getElementById('filter-ordini').value = savedFilter;

  showView('dashboard');
});
