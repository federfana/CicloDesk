/**
 * lavorazioni.js — Gestione del catalogo lavorazioni (CRUD).
 */

const LavorazioniService = (() => {

  const LAVORAZIONI_DEFAULT = [
    { id: 'lav_001', nome: 'Tagliando completo',        prezzo: 35.00, descrizione: 'Pulizia, lubrificazione, regolazione freni e cambio' },
    { id: 'lav_002', nome: 'Riparazione foratura',       prezzo: 10.00, descrizione: 'Sostituzione camera d\'aria' },
    { id: 'lav_003', nome: 'Regolazione freni',          prezzo: 12.00, descrizione: 'Registrazione pastiglie e cavi' },
    { id: 'lav_004', nome: 'Regolazione cambio',         prezzo: 12.00, descrizione: 'Regolazione deragliatori anteriore e posteriore' },
    { id: 'lav_005', nome: 'Sostituzione cavo freno',    prezzo: 8.00,  descrizione: '' },
    { id: 'lav_006', nome: 'Sostituzione cavo cambio',   prezzo: 8.00,  descrizione: '' },
    { id: 'lav_007', nome: 'Centratura ruota',           prezzo: 15.00, descrizione: '' },
    { id: 'lav_008', nome: 'Sostituzione pattini freno', prezzo: 6.00,  descrizione: '' },
    { id: 'lav_009', nome: 'Pulizia e sgrassaggio',      prezzo: 20.00, descrizione: 'Lavaggio completo bici' },
    { id: 'lav_010', nome: 'Sostituzione catena',        prezzo: 18.00, descrizione: 'Include catena standard' },
    { id: 'lav_011', nome: 'Sostituzione copertone',     prezzo: 14.00, descrizione: 'Senza costo ricambio' },
    { id: 'lav_012', nome: 'Revisione movimento centrale',prezzo: 22.00, descrizione: '' },
    { id: 'lav_013', nome: 'Altra lavorazione',          prezzo: 0.00,  descrizione: 'Inserire dettaglio nelle note' },
  ];

  /** Inizializza il catalogo con i default se vuoto. */
  function init() {
    const existing = DB.getAll('lavorazioni');
    if (existing.length === 0) {
      DB.saveAll('lavorazioni', LAVORAZIONI_DEFAULT);
    }
  }

  function getAll() {
    return DB.getAll('lavorazioni').sort((a, b) => a.nome.localeCompare(b.nome));
  }

  function findById(id) {
    return DB.findById('lavorazioni', id);
  }

  function salva(data) {
    const record = {
      id:          data.id || DB.newId(),
      nome:        data.nome.trim(),
      prezzo:      parseFloat(data.prezzo) || 0,
      descrizione: (data.descrizione || '').trim(),
    };
    return DB.upsert('lavorazioni', record);
  }

  function elimina(id) {
    DB.remove('lavorazioni', id);
  }

  return { init, getAll, findById, salva, elimina };
})();