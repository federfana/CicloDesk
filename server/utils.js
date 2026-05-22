/**
 * Utilità condivise tra le route server.
 */
const crypto = require('crypto');

/** Genera un ID univoco (timestamp base36 + 8 byte random hex). */
function newId() {
  return Date.now().toString(36) + crypto.randomBytes(8).toString('hex');
}

module.exports = { newId };
