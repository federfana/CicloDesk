/**
 * db.js — Client HTTP verso il server Express.
 * Tutte le chiamate fetch() verso /api/*
 */
const DB = (() => {
  const BASE = '/api';

  async function _req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Errore server ${res.status}`);
    }
    return res.json();
  }

  const getAll   = (col)         => _req('GET',    `/${col}`);
  const findById = (col, id)     => _req('GET',    `/${col}/${id}`);
  const create   = (col, data)   => _req('POST',   `/${col}`, data);
  const update   = (col, id, d)  => _req('PUT',    `/${col}/${id}`, d);
  const remove   = (col, id)     => _req('DELETE', `/${col}/${id}`);

  async function upsert(col, record) {
    return record.id
      ? update(col, record.id, record)
      : create(col, record);
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return { getAll, findById, create, update, upsert, remove, newId };
})();