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

  // Notifica gli effetti sul magazzino (scarico/carico automatico) ritornati
  // dal server in response._magazzino. Mostra un toast informativo e, in caso
  // di sotto-scorta, uno di errore separato con i dettagli.
  function notificaMagazzino(mag) {
    if (!mag) return;
    const parts = [];
    if (mag.scarico > 0) parts.push(`🔧 ${mag.scarico} pezz${mag.scarico === 1 ? 'o prelevato' : 'i prelevati'} dal magazzino`);
    if (mag.carico > 0) parts.push(`↩️ ${mag.carico} pezz${mag.carico === 1 ? 'o ricaricato' : 'i ricaricati'} in magazzino`);
    if (parts.length) showSuccess(parts.join(' · '));
    if (Array.isArray(mag.warnings) && mag.warnings.length) {
      showError(mag.warnings.join(' — '));
    }
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

  const BREADCRUMB_CFG = {
    dashboard: { icon: '🏠', label: 'Dashboard' },
    clienti: { icon: '👤', label: 'Schede Clienti' },
    ordini: { icon: '📋', label: 'Ordini di Lavoro' },
    catalogo: { icon: '🔩', label: 'Catalogo Lavorazioni' },
    magazzino: { icon: '📦', label: 'Magazzino Componenti' },
    fornitori: { icon: '📤', label: 'Approvvigionamenti' },
  };

  function aggiornaBreadcrumb(name) {
    const el = document.getElementById('breadcrumb');
    const cfg = BREADCRUMB_CFG[name] || BREADCRUMB_CFG.dashboard;
    el.innerHTML = `<span class="bc-icon">${cfg.icon}</span> CicloDesk › <strong>${cfg.label}</strong>`;
  }

  async function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${name}`).classList.add('active');
    document.querySelector(`.nav-btn[data-view="${name}"]`).classList.add('active');
    currentView = name;
    aggiornaBreadcrumb(name);
    await refreshView(name);
  }

  function getOrdiniFilterExtra() {
    return {
      clienteId: document.getElementById('filter-ordini-cliente')?.value || '',
      da: document.getElementById('filter-ordini-da')?.value || '',
      a: document.getElementById('filter-ordini-a')?.value || '',
    };
  }

  async function refreshView(name) {
    showLoading();
    try {
      switch (name) {
        case 'dashboard': await UI.renderDashboard(); break;
        case 'clienti': await UI.renderClienti(document.getElementById('search-clienti').value); break;
        case 'ordini': await UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery(), getOrdiniFilterExtra()); break;
        case 'catalogo': await UI.renderCatalogo(); break;
        case 'magazzino': await UI.renderMagazzino(document.getElementById('search-magazzino').value); break;
        case 'fornitori': await UI.renderFornitori(document.getElementById('filter-po-stato')?.value || ''); break;
      }
      UI.aggiornaNavBadges();
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

  // ── Ricerca (con debounce) ────────────────────────────────────
  let _searchClientiTimeout = null;
  document.getElementById('search-clienti').addEventListener('input', e => {
    clearTimeout(_searchClientiTimeout);
    _searchClientiTimeout = setTimeout(() => UI.renderClienti(e.target.value).catch(showError), 250);
  });
  let _searchOrdiniTimeout = null;
  document.getElementById('search-ordini').addEventListener('input', () => {
    clearTimeout(_searchOrdiniTimeout);
    _searchOrdiniTimeout = setTimeout(() => UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery(), getOrdiniFilterExtra()).catch(showError), 250);
  });
  document.getElementById('filter-ordini').addEventListener('change', () => {
    sessionStorage.setItem('ciclo-ordini-filtro', getOrdiniFilter());
    UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery(), getOrdiniFilterExtra()).catch(showError);
  });

  // ── Filtri avanzati ordini (#3) ───────────────────────────────
  ['filter-ordini-cliente', 'filter-ordini-da', 'filter-ordini-a'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () =>
      UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery(), getOrdiniFilterExtra()).catch(showError)
    );
  });

  // ── Kanban / Lista toggle (#12) ───────────────────────────────
  document.getElementById('btn-view-list').addEventListener('click', () => {
    document.getElementById('ordini-list').classList.remove('hidden');
    document.getElementById('ordini-kanban').classList.add('hidden');
    document.getElementById('btn-view-list').classList.add('active');
    document.getElementById('btn-view-kanban').classList.remove('active');
    UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery(), getOrdiniFilterExtra()).catch(showError);
  });
  document.getElementById('btn-view-kanban').addEventListener('click', () => {
    document.getElementById('ordini-list').classList.add('hidden');
    document.getElementById('ordini-kanban').classList.remove('hidden');
    document.getElementById('btn-view-list').classList.remove('active');
    document.getElementById('btn-view-kanban').classList.add('active');
    UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery(), getOrdiniFilterExtra()).catch(showError);
  });
  let _searchStoricoTimeout = null;
  document.getElementById('search-storico').addEventListener('input', e => {
    clearTimeout(_searchStoricoTimeout);
    _searchStoricoTimeout = setTimeout(() => UI.filtraStorico(e.target.value), 200);
  });

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
        case 'edit-cliente': await UI.apriModalCliente(id); break;
        case 'edit-ordine': await UI.apriModalOrdine(id); break;
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

  document.getElementById('btn-aggiungi-ricambio').addEventListener('click', () => {
    UI.aggiungiRigaRicambio({});
  });

  // ── Timeline commenti ──────────────────────────────────────────
  async function aggiungiCommentoOrdine() {
    const id = UI.getOrdineCorrenteId();
    if (!id) return;
    const input = document.getElementById('ordine-commento-input');
    const testo = input.value.trim();
    if (!testo) return;
    try {
      const res = await OrdiniService.aggiungiCommento(id, testo);
      input.value = '';
      UI.renderTimeline(res.commenti);
    } catch (err) { showError(err.message); }
  }
  document.getElementById('btn-aggiungi-commento').addEventListener('click', aggiungiCommentoOrdine);
  document.getElementById('ordine-commento-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      aggiungiCommentoOrdine();
    }
  });
  document.getElementById('ordine-timeline-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-timeline-remove');
    if (!btn) return;
    const id = UI.getOrdineCorrenteId();
    if (!id) return;
    if (!confirm('Rimuovere questa nota?')) return;
    try {
      const res = await OrdiniService.rimuoviCommento(id, btn.dataset.commentoId);
      UI.renderTimeline(res.commenti);
    } catch (err) { showError(err.message); }
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
    const idx = parseInt(btn.dataset.fotoIdx, 10);
    if (Number.isNaN(idx) || idx < 0) return;
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
  document.getElementById('btn-backup-json').addEventListener('click', async () => {
    const password = prompt('🔒 Scegli una password per proteggere il backup:');
    if (!password) return;
    if (password.length < 4) { showError('La password deve avere almeno 4 caratteri.'); return; }
    try {
      const res = await fetch('/api/backup/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'ciclo-backup.json';
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('✅ Backup scaricato (protetto da password)');
    } catch (err) { showError(err.message); }
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
      // Se il backup è protetto, chiedi la password
      if (data._auth) {
        const password = prompt('🔒 Questo backup è protetto. Inserisci la password:');
        if (!password) { e.target.value = ''; return; }
        data.password = password;
      }
      const res = await fetch('/api/import/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  document.getElementById('btn-nuovo-componente').addEventListener('click', () =>
    UI.apriModalComponente().catch(showError)
  );

  document.getElementById('btn-import-csv').addEventListener('click', () =>
    UI.apriModalImportCsv()
  );
  document.getElementById('btn-csv-anteprima').addEventListener('click', () =>
    UI.eseguiAnteprimaCsv().catch(showError)
  );
  document.getElementById('btn-csv-importa').addEventListener('click', () =>
    UI.eseguiImportCsv().catch(showError)
  );
  document.getElementById('btn-download-template-csv').addEventListener('click', () =>
    UI.downloadTemplateCsv()
  );
  document.getElementById('csv-file-input').addEventListener('change', () =>
    UI.eseguiAnteprimaCsv().catch(showError)
  );

  document.getElementById('btn-carico-merce').addEventListener('click', () =>
    UI.apriModalCaricoMerce().catch(showError)
  );
  document.getElementById('btn-aggiungi-riga-carico').addEventListener('click', () => {
    UI.aggiungiRigaCarico();
    document.querySelector('#tbody-carico .carico-row:last-child .carico-nome')?.focus();
  });
  document.getElementById('form-carico').addEventListener('submit', (e) => {
    e.preventDefault();
    UI.inviaCarico().catch(showError);
  });

  let _searchMagazzinoTimeout = null;
  document.getElementById('search-magazzino').addEventListener('input', e => {
    clearTimeout(_searchMagazzinoTimeout);
    _searchMagazzinoTimeout = setTimeout(() => UI.renderMagazzino(e.target.value).catch(showError), 250);
  });

  // ── Approvvigionamenti ──────────────────────────────────────────────
  // Espongo gli helper toast per ui.js che li chiama via window._showError
  window._showError = showError;
  window._showSuccess = showSuccess;
  document.getElementById('btn-nuovo-po').addEventListener('click', () =>
    UI.apriModalPO().catch(showError)
  );
  document.getElementById('btn-aggiungi-riga-po').addEventListener('click', () => {
    UI.aggiungiRigaPO();
    document.querySelector('#tbody-po-righe tr:last-child .inp-po-nome')?.focus();
  });
  document.getElementById('form-po').addEventListener('submit', (e) => {
    UI.inviaPO(e).then(() => showSuccess('✅ Approvvigionamento salvato')).catch(err => showError(err.message));
  });
  document.getElementById('btn-po-annulla').addEventListener('click', () => {
    const id = document.getElementById('po-id').value;
    if (id) UI.annullaPO(id).then(() => showSuccess('🚫 Ordine annullato')).catch(err => showError(err.message));
  });
  document.getElementById('form-po-ricevi').addEventListener('submit', (e) => {
    UI.inviaRiceviPO(e).then(() => showSuccess('📥 Ricezione registrata')).catch(err => showError(err.message));
  });
  document.getElementById('filter-po-stato').addEventListener('change', e => {
    UI.renderFornitori(e.target.value).catch(showError);
  });

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
          if (biciCliente.length) parti.push(`${biciCliente.length} bici`);
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
            const bici = await BiciService.getByCliente(clienteId);
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
          if (confirm('Spostare questo ordine nel cestino?')) {
            await OrdiniService.elimina(id);
            await refreshView(currentView);
            showSuccess('🗑 Ordine spostato nel cestino');
          }
          break;
        case 'ripristina-ordine': {
          const rip = await OrdiniService.ripristina(id);
          await refreshView(currentView);
          showSuccess('✅ Ordine ripristinato');
          notificaMagazzino(rip?._magazzino);
          break;
        }
        case 'del-ordine-permanente':
          if (confirm('⚠ Eliminazione DEFINITIVA. Sei sicuro? Questa azione non è reversibile.')) {
            await OrdiniService.eliminaDefinitivamente(id);
            await refreshView(currentView);
            showSuccess('🗑 Ordine eliminato definitivamente');
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
          if (confirm('Eliminare questa lavorazione dal catalogo? Le voci negli ordini esistenti verranno mantenute come righe manuali.')) {
            const res = await LavorazioniService.elimina(id);
            await UI.renderCatalogo();
            const n = res?.sganciatiDa || 0;
            showSuccess(n > 0
              ? `✅ Lavorazione eliminata (sganciata da ${n} ordin${n === 1 ? 'e' : 'i'})`
              : '✅ Lavorazione eliminata');
          }
          break;

        // ── Magazzino
        case 'edit-componente':
          await UI.apriModalComponente(id); break;
        case 'del-componente':
          if (confirm('Eliminare questo componente dal magazzino?')) {
            await ComponentiService.elimina(id);
            await UI.renderMagazzino(document.getElementById('search-magazzino').value);
            showSuccess('✅ Componente eliminato');
          }
          break;
        case 'inc-componente':
          await ComponentiService.aggiornaGiacenza(id, 1);
          await UI.renderMagazzino(document.getElementById('search-magazzino').value);
          break;
        case 'dec-componente':
          await ComponentiService.aggiornaGiacenza(id, -1);
          await UI.renderMagazzino(document.getElementById('search-magazzino').value);
          break;
        case 'storico-componente':
          await UI.apriModalMovimenti(id);
          break;
        case 'apri-ordine-mov':
          e.preventDefault();
          UI.closeAllModals();
          await UI.apriModalOrdine(id);
          break;

        // ── Approvvigionamenti
        case 'apri-po':
          await UI.apriModalPO(id); break;
        case 'ricevi-po':
          await UI.apriModalRiceviPO(id); break;
        case 'crea-po-da-sugg':
          UI.preparaPOdaSuggerimento(parseInt(btn.dataset.idx)); break;
      }
    } catch (e) { showError(e.message); }
  });

  // ── Chiusura modali ───────────────────────────────────────────
  document.querySelectorAll('.modal-close').forEach(btn =>
    btn.addEventListener('click', () => UI.closeAllModals())
  );
  document.getElementById('overlay').addEventListener('click', () => UI.closeAllModals());

  // ── Escape key chiude modali ──────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') UI.closeAllModals();

    // ── Help shortcut ─────────────────────────────────────────
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !document.querySelector('.modal:not(.hidden)') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      document.getElementById('modal-shortcuts').classList.remove('hidden');
      document.getElementById('overlay').classList.remove('hidden');
      return;
    }

    // ── Shortcut tastiera (#11) ───────────────────────────────
    // Ctrl+key su tutte le piattaforme; Alt/Option+key come alternativa su macOS
    if (!e.ctrlKey && !e.altKey) return;
    const code = e.code; // tasto fisico (non influenzato da Option su macOS)
    const map = { KeyF: 'f', KeyD: 'd', KeyN: 'n', KeyS: 's' };
    const key = map[code];
    if (key) {
      e.preventDefault();
      if (key === 'f') {
        document.getElementById('search-globale').focus();
      } else if (key === 'd') {
        showView('dashboard');
      } else if (key === 'n') {
        switch (currentView) {
          case 'clienti': UI.apriModalCliente().catch(showError); break;
          case 'ordini': document.getElementById('btn-nuovo-ordine').click(); break;
          case 'catalogo': UI.apriModalLavorazione().catch(showError); break;
          case 'magazzino': UI.apriModalComponente().catch(showError); break;
          default: document.getElementById('btn-nuovo-ordine').click(); break;
        }
      } else if (key === 's') {
        const openModal = document.querySelector('.modal:not(.hidden) form');
        if (openModal) openModal.requestSubmit();
      }
    }
  });

  // ── Tema scuro (#15) ──────────────────────────────────────────
  const themeBtn = document.getElementById('btn-theme-toggle');
  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('ciclo-theme', theme);
  }
  themeBtn.addEventListener('click', () => {
    const current = document.body.classList.contains('dark') ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
  // Ripristina tema salvato
  applyTheme(localStorage.getItem('ciclo-theme') || 'light');

  // ── Pulsante Help shortcut ────────────────────────────────────
  document.getElementById('btn-help-shortcuts').addEventListener('click', () => {
    document.getElementById('modal-shortcuts').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
  });

  // ── Submit Cliente ────────────────────────────────────────────
  document.getElementById('form-cliente').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    const nome = document.getElementById('cliente-nome').value.trim();
    const cognome = document.getElementById('cliente-cognome').value.trim();
    const tel = document.getElementById('cliente-telefono').value.trim();
    if (!nome) { showError('Il nome è obbligatorio.'); submitBtn.disabled = false; return; }
    if (!cognome) { showError('Il cognome è obbligatorio.'); submitBtn.disabled = false; return; }
    if (!tel) { showError('Il telefono è obbligatorio.'); submitBtn.disabled = false; return; }
    try {
      await ClientiService.salva({
        id: document.getElementById('cliente-id').value || null,
        nome,
        cognome,
        telefono: tel,
        email: document.getElementById('cliente-email').value,
        note: document.getElementById('cliente-note').value,
      });
      _formDirty = false;
      UI.closeAllModals();
      showSuccess('✅ Cliente salvato');
      await refreshView(currentView);
    } catch (e) { showError(e.message); }
    finally { submitBtn.disabled = false; }
  });

  // ── Submit Ordine ─────────────────────────────────────────────
  document.getElementById('form-ordine').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    const clienteId = document.getElementById('ordine-cliente-id').value;
    if (!clienteId) { showError('Seleziona un cliente.'); submitBtn.disabled = false; return; }
    try {
      const voci = UI.raccogliVoci();
      if (!voci.length) { showError('Aggiungi almeno una lavorazione all\u2019ordine.'); submitBtn.disabled = false; return; }
      const ordineId = document.getElementById('ordine-id').value || null;
      const esistente = ordineId ? await OrdiniService.findById(ordineId) : null;

      const salvato = await OrdiniService.salva({
        id: ordineId,
        clienteId,
        biciId: document.getElementById('ordine-bici-id').value || null,
        stato: document.getElementById('ordine-stato').value || 'accettata',
        dataIngresso: document.getElementById('ordine-data-ingresso').value
          ? new Date(document.getElementById('ordine-data-ingresso').value).toISOString()
          : new Date().toISOString(),
        dataUscita: esistente?.dataUscita || null,
        note: document.getElementById('ordine-note').value,
        pagato: document.getElementById('ordine-pagato').checked,
        acconto: document.getElementById('ordine-acconto').value || 0,
        foto: UI.getOrdineFoto(),
        ricambi: UI.raccogliRicambi(),
      }, voci);

      const storicoModal = document.getElementById('modal-storico');
      const storicoAperto = !storicoModal.classList.contains('hidden');
      const storicoClienteId = storicoModal.dataset.clienteId;

      _formDirty = false;
      UI.closeAllModals();

      if (storicoAperto && storicoClienteId) {
        await UI.apriModalStorico(storicoClienteId);
      } else {
        await refreshView(currentView);
      }
      showSuccess('✅ Ordine salvato');
      notificaMagazzino(salvato?._magazzino);
    } catch (e) { showError(e.message); }
    finally { submitBtn.disabled = false; }
  });

  // ── Submit Lavorazione ────────────────────────────────────────
  document.getElementById('form-lavorazione').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    const nome = document.getElementById('lavorazione-nome').value.trim();
    if (!nome) { showError('Il nome è obbligatorio.'); submitBtn.disabled = false; return; }
    try {
      await LavorazioniService.salva({
        id: document.getElementById('lavorazione-id').value || null,
        nome,
        prezzo: document.getElementById('lavorazione-prezzo').value,
        descrizione: document.getElementById('lavorazione-descrizione').value,
      });
      _formDirty = false;
      UI.closeAllModals();
      await UI.renderCatalogo();
      showSuccess('✅ Lavorazione salvata');
    } catch (e) { showError(e.message); }
    finally { submitBtn.disabled = false; }
  });

  // ── Submit Componente Magazzino ───────────────────────────────
  document.getElementById('form-componente').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    const nome = document.getElementById('componente-nome').value.trim();
    if (!nome) { showError('Il nome è obbligatorio.'); submitBtn.disabled = false; return; }
    try {
      await ComponentiService.salva({
        id:              document.getElementById('componente-id').value || null,
        nome,
        categoria:       document.getElementById('componente-categoria').value,
        marca:           document.getElementById('componente-marca').value,
        codice:          document.getElementById('componente-codice').value,
        fornitore:       document.getElementById('componente-fornitore').value,
        prezzo_acquisto: document.getElementById('componente-prezzo-acquisto').value,
        prezzo_vendita:  document.getElementById('componente-prezzo-vendita').value,
        giacenza:        document.getElementById('componente-giacenza').value,
        soglia_min:      document.getElementById('componente-soglia').value,
        note:            document.getElementById('componente-note').value,
      });
      _formDirty = false;
      UI.closeAllModals();
      await UI.renderMagazzino(document.getElementById('search-magazzino').value);
      showSuccess('✅ Componente salvato');
    } catch (e) { showError(e.message); }
    finally { submitBtn.disabled = false; }
  });

  // ── Submit Bici ───────────────────────────────────────────────
  document.getElementById('form-aggiungi-bici').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    const modello = document.getElementById('bici-modello').value.trim();
    if (!modello) { showError('Il modello è obbligatorio.'); submitBtn.disabled = false; return; }
    try {
      const clienteId = document.getElementById('bici-cliente-id-hidden').value;
      await BiciService.salva({
        id: document.getElementById('bici-id').value || null,
        clienteId,
        marca: document.getElementById('bici-marca').value,
        modello,
        tipo: document.getElementById('bici-tipo').value,
        colore: document.getElementById('bici-colore').value,
        seriale_forcella: document.getElementById('bici-ser-forcella').value,
        seriale_ammortizzatore: document.getElementById('bici-ser-ammortizzatore').value,
        note: document.getElementById('bici-note').value,
      });
      _formDirty = false;
      UI.closeAllModals();
      await UI.apriModalBiciCliente(clienteId);
      showSuccess('✅ Bici salvata');
    } catch (e) { showError(e.message); }
    finally { submitBtn.disabled = false; }
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

  // ── Service Worker Registration (PWA #14) ─────────────────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
  }

  // ── DB Sync status bar ────────────────────────────────────────
  async function updateSyncBar() {
    try {
      const res = await fetch('/api/db-info');
      if (!res.ok) return;
      const info = await res.json();
      const bar = document.getElementById('db-sync-bar');
      if (!bar) return;
      const mod = info.lastModified ? new Date(info.lastModified) : null;
      const modStr = mod ? mod.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      let html = `<span>📁 DB aggiornato: ${modStr}</span>`;
      if (info.syncEnabled) {
        const syncStr = info.lastSync ? new Date(info.lastSync).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'alla chiusura';
        html += `<span><span class="sync-dot ${info.lastSync ? 'on' : 'off'}"></span>Cloud: ${syncStr}</span>`;
      }
      bar.innerHTML = html;
    } catch { /* offline */ }
  }
  updateSyncBar();
  setInterval(updateSyncBar, 60_000); // aggiorna ogni minuto
});
