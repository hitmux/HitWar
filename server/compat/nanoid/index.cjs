const { randomFillSync } = require('crypto');

const DEFAULT_ALPHABET = 'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';

function random(size) {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new TypeError('Expected size to be a non-negative safe integer');
  }

  const bytes = Buffer.allocUnsafe(size);
  randomFillSync(bytes);
  return bytes;
}

function customAlphabet(alphabet, defaultSize = 21) {
  if (typeof alphabet !== 'string' || alphabet.length === 0) {
    throw new TypeError('Expected alphabet to be a non-empty string');
  }

  return (size = defaultSize) => {
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new TypeError('Expected size to be a non-negative safe integer');
    }

    const bytes = random(size);
    let id = '';
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
  };
}

const nanoid = customAlphabet(DEFAULT_ALPHABET);

module.exports = nanoid;
module.exports.nanoid = nanoid;
module.exports.customAlphabet = customAlphabet;
module.exports.random = random;
