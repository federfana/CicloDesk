// Sostituisci getOrdiniFilter con questa versione (aggiunge getter query):
function getOrdiniFilter() {
  const checked = document.querySelector('input[name="filter-ordini"]:checked');
  return checked ? checked.value : 'tutti';
}

function getOrdiniQuery() {
  return document.getElementById('search-ordini').value;
}

// Sostituisci refreshView — passa anche la query agli ordini:
function refreshView(name) {
  switch (name) {
    case 'dashboard': UI.renderDashboard(); break;
    case 'clienti':   UI.renderClienti(document.getElementById('search-clienti').value); break;
    case 'ordini':    UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery()); break;
    case 'catalogo':  UI.renderCatalogo(); break;
  }
}

// Aggiorna il listener filtro ordini (già presente, aggiorna la chiamata):
document.querySelectorAll('input[name="filter-ordini"]').forEach(r => {
  r.addEventListener('change', () => UI.renderOrdini(getOrdiniFilter(), getOrdiniQuery()));
});

// AGGIUNGI questo nuovo listener (cerca ordini in tempo reale):
document.getElementById('search-ordini').addEventListener('input', e => {
  UI.renderOrdini(getOrdiniFilter(), e.target.value);
});