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
    try {
      switch (name) {
        case 'dashboard': await UI.renderDashboard(); break;
        case 'clienti':   await UI.renderClienti(document.getElementById('search-clienti').value); break;
        case 'ordini':    await UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery()); break;
        case 'catalogo':  await UI.renderCatalogo(); break;
      }
    } catch (e) { showError(e.message); }
  }

  function getOrdiniFilter() {
    return document.querySelector('input[name="filter-ordini"]:checked')?.value || 'tutti';
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
  document.querySelectorAll('input[name="filter-ordini"]').forEach(r =>
    r.addEventListener('change', () =>
      UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery()).catch(showError)
    )
  );

  // ── Apertura modali ───────────────────────────────────────────
  document.getElementById('btn-nuovo-cliente').addEventListener('click', () =>
    UI.apriModalCliente().catch(showError)
  );

  document.getElementById('btn-nuovo-ordine').addEventListener('click', async () => {
    try {
      const clienti = await ClientiService.getAll();
      if (!clienti.length) {
        alert('⚠ Aggiungi prima almeno un cliente!');
        return showView('clienti');
      }
      await UI.apriModalOrdine();
    } catch (e) { showError(e.message); }
  });

  document.getElementById('btn-aggiungi-voce').addEventListener('click', async () => {
    try {
      const lavorazioni = await LavorazioniService.getAll();
      UI.aggiungiRigaVoce({}, lavorazioni);
    } catch (e) { showError(e.message); }
  });

  document.getElementById('btn-nuova-lavorazione').addEventListener('click', () =>
    UI.apriModalLavorazione().catch(showError)
  );

  // ── Delegazione eventi card ───────────────────────────────────
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    try {
      switch (action) {
        case 'edit-cliente':
          await UI.apriModalCliente(id); break;
        case 'del-cliente':
          if (confirm('Eliminare il cliente e tutti i suoi ordini?')) {
            await ClientiService.elimina(id);
            await refreshView(currentView);
          }
          break;
        case 'nuovo-ordine-cliente':
          await showView('ordini');
          await UI.apriModalOrdine(null, id);
          break;
        case 'edit-ordine':
          await UI.apriModalOrdine(id); break;
        case 'del-ordine':
          if (confirm('Eliminare questo ordine?')) {
            await OrdiniService.elimina(id);
            await refreshView(currentView);
          }
          break;
        case 'chiudi-ordine':
          await OrdiniService.chiudi(id);
          await refreshView(currentView);
          break;
        case 'riapri-ordine':
          await OrdiniService.riapri(id);
          await refreshView(currentView);
          break;
        case 'edit-lavorazione':
          await UI.apriModalLavorazione(id); break;
        case 'del-lavorazione':
          if (confirm('Eliminare questa lavorazione?')) {
            await LavorazioniService.elimina(id);
            await UI.renderCatalogo();
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

  // ── Submit Cliente ────────────────────────────────────────────
  document.getElementById('form-cliente').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('cliente-nome').value.trim();
    const tel  = document.getElementById('cliente-telefono').value.trim();
    if (!nome) return alert('Il nome è obbligatorio.');
    if (!tel)  return alert('Il telefono è obbligatorio.');
    try {
      await ClientiService.salva({
        id:       document.getElementById('cliente-id').value || null,
        nome,     telefono: tel,
        email:    document.getElementById('cliente-email').value,
        bici:     document.getElementById('cliente-bici').value,
        note:     document.getElementById('cliente-note').value,
      });
      UI.closeAllModals();
      await refreshView(currentView);
    } catch (e) { showError(e.message); }
  });

  // ── Submit Ordine ─────────────────────────────────────────────
  document.getElementById('form-ordine').addEventListener('submit', async e => {
    e.preventDefault();
    const clienteId = document.getElementById('ordine-cliente-id').value;
    if (!clienteId) return alert('Seleziona un cliente.');
    try {
      const voci      = UI.raccogliVoci();
      const ordineId  = document.getElementById('ordine-id').value || null;
      const esistente = ordineId ? await OrdiniService.findById(ordineId) : null;

      await OrdiniService.salva({
        id: ordineId, clienteId,
        stato:        esistente?.stato      || 'aperto',
        dataIngresso: document.getElementById('ordine-data-ingresso').value
                      ? new Date(document.getElementById('ordine-data-ingresso').value).toISOString()
                      : new Date().toISOString(),
        dataUscita:   esistente?.dataUscita || null,
        note:         document.getElementById('ordine-note').value,
      }, voci);

      UI.closeAllModals();
      await refreshView(currentView);
    } catch (e) { showError(e.message); }
  });

  // ── Submit Lavorazione ────────────────────────────────────────
  document.getElementById('form-lavorazione').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('lavorazione-nome').value.trim();
    if (!nome) return alert('Il nome è obbligatorio.');
    try {
      await LavorazioniService.salva({
        id:          document.getElementById('lavorazione-id').value || null,
        nome,
        prezzo:      document.getElementById('lavorazione-prezzo').value,
        descrizione: document.getElementById('lavorazione-descrizione').value,
      });
      UI.closeAllModals();
      await UI.renderCatalogo();
    } catch (e) { showError(e.message); }
  });

  // ── Render iniziale ───────────────────────────────────────────
  showView('dashboard');
});
