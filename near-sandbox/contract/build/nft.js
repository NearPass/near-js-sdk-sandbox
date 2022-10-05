function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }

  return desc;
}

var PromiseResult;

(function (PromiseResult) {
  PromiseResult[PromiseResult["NotReady"] = 0] = "NotReady";
  PromiseResult[PromiseResult["Successful"] = 1] = "Successful";
  PromiseResult[PromiseResult["Failed"] = 2] = "Failed";
})(PromiseResult || (PromiseResult = {}));

var PromiseError;

(function (PromiseError) {
  PromiseError[PromiseError["Failed"] = 0] = "Failed";
  PromiseError[PromiseError["NotReady"] = 1] = "NotReady";
})(PromiseError || (PromiseError = {}));

function u8ArrayToBytes(array) {
  let ret = "";

  for (let e of array) {
    ret += String.fromCharCode(e);
  }

  return ret;
} // TODO this function is a bit broken and the type can't be string
// TODO for more info: https://github.com/near/near-sdk-js/issues/78

function bytesToU8Array(bytes) {
  let ret = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i++) {
    ret[i] = bytes.charCodeAt(i);
  }

  return ret;
}
function bytes(strOrU8Array) {
  if (typeof strOrU8Array == "string") {
    return checkStringIsBytes(strOrU8Array);
  } else if (strOrU8Array instanceof Uint8Array) {
    return u8ArrayToBytes(strOrU8Array);
  }

  throw new Error("bytes: expected string or Uint8Array");
}

function checkStringIsBytes(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      throw new Error(`string ${str} at index ${i}: ${str[i]} is not a valid byte`);
    }
  }

  return str;
}

function assert(b, str) {
  if (b) {
    return;
  } else {
    throw Error("assertion failed: " + str);
  }
}

/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function assertNumber(n) {
  if (!Number.isSafeInteger(n)) throw new Error(`Wrong integer: ${n}`);
}

function chain(...args) {
  const wrap = (a, b) => c => a(b(c));

  const encode = Array.from(args).reverse().reduce((acc, i) => acc ? wrap(acc, i.encode) : i.encode, undefined);
  const decode = args.reduce((acc, i) => acc ? wrap(acc, i.decode) : i.decode, undefined);
  return {
    encode,
    decode
  };
}

function alphabet(alphabet) {
  return {
    encode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('alphabet.encode input should be an array of numbers');
      return digits.map(i => {
        assertNumber(i);
        if (i < 0 || i >= alphabet.length) throw new Error(`Digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`);
        return alphabet[i];
      });
    },
    decode: input => {
      if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('alphabet.decode input should be array of strings');
      return input.map(letter => {
        if (typeof letter !== 'string') throw new Error(`alphabet.decode: not string element=${letter}`);
        const index = alphabet.indexOf(letter);
        if (index === -1) throw new Error(`Unknown letter: "${letter}". Allowed: ${alphabet}`);
        return index;
      });
    }
  };
}

function join(separator = '') {
  if (typeof separator !== 'string') throw new Error('join separator should be string');
  return {
    encode: from => {
      if (!Array.isArray(from) || from.length && typeof from[0] !== 'string') throw new Error('join.encode input should be array of strings');

      for (let i of from) if (typeof i !== 'string') throw new Error(`join.encode: non-string input=${i}`);

      return from.join(separator);
    },
    decode: to => {
      if (typeof to !== 'string') throw new Error('join.decode input should be string');
      return to.split(separator);
    }
  };
}

function padding(bits, chr = '=') {
  assertNumber(bits);
  if (typeof chr !== 'string') throw new Error('padding chr should be string');
  return {
    encode(data) {
      if (!Array.isArray(data) || data.length && typeof data[0] !== 'string') throw new Error('padding.encode input should be array of strings');

      for (let i of data) if (typeof i !== 'string') throw new Error(`padding.encode: non-string input=${i}`);

      while (data.length * bits % 8) data.push(chr);

      return data;
    },

    decode(input) {
      if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('padding.encode input should be array of strings');

      for (let i of input) if (typeof i !== 'string') throw new Error(`padding.decode: non-string input=${i}`);

      let end = input.length;
      if (end * bits % 8) throw new Error('Invalid padding: string should have whole number of bytes');

      for (; end > 0 && input[end - 1] === chr; end--) {
        if (!((end - 1) * bits % 8)) throw new Error('Invalid padding: string has too much padding');
      }

      return input.slice(0, end);
    }

  };
}

function normalize(fn) {
  if (typeof fn !== 'function') throw new Error('normalize fn should be function');
  return {
    encode: from => from,
    decode: to => fn(to)
  };
}

function convertRadix(data, from, to) {
  if (from < 2) throw new Error(`convertRadix: wrong from=${from}, base cannot be less than 2`);
  if (to < 2) throw new Error(`convertRadix: wrong to=${to}, base cannot be less than 2`);
  if (!Array.isArray(data)) throw new Error('convertRadix: data should be array');
  if (!data.length) return [];
  let pos = 0;
  const res = [];
  const digits = Array.from(data);
  digits.forEach(d => {
    assertNumber(d);
    if (d < 0 || d >= from) throw new Error(`Wrong integer: ${d}`);
  });

  while (true) {
    let carry = 0;
    let done = true;

    for (let i = pos; i < digits.length; i++) {
      const digit = digits[i];
      const digitBase = from * carry + digit;

      if (!Number.isSafeInteger(digitBase) || from * carry / from !== carry || digitBase - digit !== from * carry) {
        throw new Error('convertRadix: carry overflow');
      }

      carry = digitBase % to;
      digits[i] = Math.floor(digitBase / to);
      if (!Number.isSafeInteger(digits[i]) || digits[i] * to + carry !== digitBase) throw new Error('convertRadix: carry overflow');
      if (!done) continue;else if (!digits[i]) pos = i;else done = false;
    }

    res.push(carry);
    if (done) break;
  }

  for (let i = 0; i < data.length - 1 && data[i] === 0; i++) res.push(0);

  return res.reverse();
}

const gcd = (a, b) => !b ? a : gcd(b, a % b);

const radix2carry = (from, to) => from + (to - gcd(from, to));

function convertRadix2(data, from, to, padding) {
  if (!Array.isArray(data)) throw new Error('convertRadix2: data should be array');
  if (from <= 0 || from > 32) throw new Error(`convertRadix2: wrong from=${from}`);
  if (to <= 0 || to > 32) throw new Error(`convertRadix2: wrong to=${to}`);

  if (radix2carry(from, to) > 32) {
    throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`);
  }

  let carry = 0;
  let pos = 0;
  const mask = 2 ** to - 1;
  const res = [];

  for (const n of data) {
    assertNumber(n);
    if (n >= 2 ** from) throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
    carry = carry << from | n;
    if (pos + from > 32) throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
    pos += from;

    for (; pos >= to; pos -= to) res.push((carry >> pos - to & mask) >>> 0);

    carry &= 2 ** pos - 1;
  }

  carry = carry << to - pos & mask;
  if (!padding && pos >= from) throw new Error('Excess padding');
  if (!padding && carry) throw new Error(`Non-zero padding: ${carry}`);
  if (padding && pos > 0) res.push(carry >>> 0);
  return res;
}

function radix(num) {
  assertNumber(num);
  return {
    encode: bytes => {
      if (!(bytes instanceof Uint8Array)) throw new Error('radix.encode input should be Uint8Array');
      return convertRadix(Array.from(bytes), 2 ** 8, num);
    },
    decode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix.decode input should be array of strings');
      return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
    }
  };
}

function radix2(bits, revPadding = false) {
  assertNumber(bits);
  if (bits <= 0 || bits > 32) throw new Error('radix2: bits should be in (0..32]');
  if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32) throw new Error('radix2: carry overflow');
  return {
    encode: bytes => {
      if (!(bytes instanceof Uint8Array)) throw new Error('radix2.encode input should be Uint8Array');
      return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
    },
    decode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix2.decode input should be array of strings');
      return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
    }
  };
}

function unsafeWrapper(fn) {
  if (typeof fn !== 'function') throw new Error('unsafeWrapper fn should be function');
  return function (...args) {
    try {
      return fn.apply(null, args);
    } catch (e) {}
  };
}
const base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
const base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize(s => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')));
const base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
const base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));

const genBase58 = abc => chain(radix(58), alphabet(abc), join(''));

const base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
const base58xmr = {
  encode(data) {
    let res = '';

    for (let i = 0; i < data.length; i += 8) {
      const block = data.subarray(i, i + 8);
      res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
    }

    return res;
  },

  decode(str) {
    let res = [];

    for (let i = 0; i < str.length; i += 11) {
      const slice = str.slice(i, i + 11);
      const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
      const block = base58.decode(slice);

      for (let j = 0; j < block.length - blockLen; j++) {
        if (block[j] !== 0) throw new Error('base58xmr: wrong padding');
      }

      res = res.concat(Array.from(block.slice(block.length - blockLen)));
    }

    return Uint8Array.from(res);
  }

};
const BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(pre) {
  const b = pre >> 25;
  let chk = (pre & 0x1ffffff) << 5;

  for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
    if ((b >> i & 1) === 1) chk ^= POLYMOD_GENERATORS[i];
  }

  return chk;
}

function bechChecksum(prefix, words, encodingConst = 1) {
  const len = prefix.length;
  let chk = 1;

  for (let i = 0; i < len; i++) {
    const c = prefix.charCodeAt(i);
    if (c < 33 || c > 126) throw new Error(`Invalid prefix (${prefix})`);
    chk = bech32Polymod(chk) ^ c >> 5;
  }

  chk = bech32Polymod(chk);

  for (let i = 0; i < len; i++) chk = bech32Polymod(chk) ^ prefix.charCodeAt(i) & 0x1f;

  for (let v of words) chk = bech32Polymod(chk) ^ v;

  for (let i = 0; i < 6; i++) chk = bech32Polymod(chk);

  chk ^= encodingConst;
  return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
}

function genBech32(encoding) {
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;

  const _words = radix2(5);

  const fromWords = _words.decode;
  const toWords = _words.encode;
  const fromWordsUnsafe = unsafeWrapper(fromWords);

  function encode(prefix, words, limit = 90) {
    if (typeof prefix !== 'string') throw new Error(`bech32.encode prefix should be string, not ${typeof prefix}`);
    if (!Array.isArray(words) || words.length && typeof words[0] !== 'number') throw new Error(`bech32.encode words should be array of numbers, not ${typeof words}`);
    const actualLength = prefix.length + 7 + words.length;
    if (limit !== false && actualLength > limit) throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
    prefix = prefix.toLowerCase();
    return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
  }

  function decode(str, limit = 90) {
    if (typeof str !== 'string') throw new Error(`bech32.decode input should be string, not ${typeof str}`);
    if (str.length < 8 || limit !== false && str.length > limit) throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
    const lowered = str.toLowerCase();
    if (str !== lowered && str !== str.toUpperCase()) throw new Error(`String must be lowercase or uppercase`);
    str = lowered;
    const sepIndex = str.lastIndexOf('1');
    if (sepIndex === 0 || sepIndex === -1) throw new Error(`Letter "1" must be present between prefix and data only`);
    const prefix = str.slice(0, sepIndex);

    const _words = str.slice(sepIndex + 1);

    if (_words.length < 6) throw new Error('Data must be at least 6 characters long');
    const words = BECH_ALPHABET.decode(_words).slice(0, -6);
    const sum = bechChecksum(prefix, words, ENCODING_CONST);
    if (!_words.endsWith(sum)) throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
    return {
      prefix,
      words
    };
  }

  const decodeUnsafe = unsafeWrapper(decode);

  function decodeToBytes(str) {
    const {
      prefix,
      words
    } = decode(str, false);
    return {
      prefix,
      words,
      bytes: fromWords(words)
    };
  }

  return {
    encode,
    decode,
    decodeToBytes,
    decodeUnsafe,
    fromWords,
    fromWordsUnsafe,
    toWords
  };
}

genBech32('bech32');
genBech32('bech32m');
const utf8 = {
  encode: data => new TextDecoder().decode(data),
  decode: str => new TextEncoder().encode(str)
};
const hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize(s => {
  if (typeof s !== 'string' || s.length % 2) throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
  return s.toLowerCase();
}));
const CODERS = {
  utf8,
  hex,
  base16,
  base32,
  base64,
  base64url,
  base58,
  base58xmr
};
`Invalid encoding type. Available types: ${Object.keys(CODERS).join(', ')}`;

var CurveType;

(function (CurveType) {
  CurveType[CurveType["ED25519"] = 0] = "ED25519";
  CurveType[CurveType["SECP256K1"] = 1] = "SECP256K1";
})(CurveType || (CurveType = {}));

const U64_MAX = 2n ** 64n - 1n;
const EVICTED_REGISTER = U64_MAX - 1n;
function log(...params) {
  env.log(`${params.map(x => x === undefined ? 'undefined' : x) // Stringify undefined
  .map(x => typeof x === 'object' ? JSON.stringify(x) : x) // Convert Objects to strings
  .join(' ')}` // Convert to string
  );
}
function predecessorAccountId() {
  env.predecessor_account_id(0);
  return env.read_register(0);
}
function attachedDeposit() {
  return env.attached_deposit();
}

function panicUtf8(msg) {
  env.panic_utf8(msg);
}
function storageRead(key) {
  let ret = env.storage_read(key, 0);

  if (ret === 1n) {
    return env.read_register(0);
  } else {
    return null;
  }
}
function storageHasKey(key) {
  let ret = env.storage_has_key(key);

  if (ret === 1n) {
    return true;
  } else {
    return false;
  }
}
function storageGetEvicted() {
  return env.read_register(EVICTED_REGISTER);
}
function currentAccountId() {
  env.current_account_id(0);
  return env.read_register(0);
}
function input() {
  env.input(0);
  return env.read_register(0);
}
function storageUsage() {
  return env.storage_usage();
}
function promiseThen(promiseIndex, accountId, methodName, args, amount, gas) {
  return env.promise_then(promiseIndex, accountId, methodName, args, amount, gas);
}
function promiseBatchCreate(accountId) {
  return env.promise_batch_create(accountId);
}
function promiseBatchActionFunctionCall(promiseIndex, methodName, args, amount, gas) {
  env.promise_batch_action_function_call(promiseIndex, methodName, args, amount, gas);
}
function promiseBatchActionTransfer(promiseIndex, amount) {
  env.promise_batch_action_transfer(promiseIndex, amount);
}
function promiseResult(resultIdx) {
  let status = env.promise_result(resultIdx, 0);

  if (status == PromiseResult.Successful) {
    return env.read_register(0);
  } else {
    throw Error(`Promise result ${status == PromiseResult.Failed ? "Failed" : status == PromiseResult.NotReady ? "NotReady" : status}`);
  }
}
function promiseReturn(promiseIdx) {
  env.promise_return(promiseIdx);
}
function storageWrite(key, value) {
  let exist = env.storage_write(key, value, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}
function storageRemove(key) {
  let exist = env.storage_remove(key, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}
function storageByteCost() {
  return 10000000000000000000n;
}

function initialize({}) {
  return function (target, key, descriptor) {};
}
function call({
  privateFunction = false,
  payableFunction = false
}) {
  return function (target, key, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args) {
      if (privateFunction && predecessorAccountId() !== currentAccountId()) {
        throw Error("Function is private");
      }

      if (!payableFunction && attachedDeposit() > BigInt(0)) {
        throw Error("Function is not payable");
      }

      return originalMethod.apply(this, args);
    };
  };
}
function view({}) {
  return function (target, key, descriptor) {};
}
function NearBindgen({
  requireInit = false
}) {
  return target => {
    return class extends target {
      static _create() {
        return new target();
      }

      static _getState() {
        const rawState = storageRead("STATE");
        return rawState ? this._deserialize(rawState) : null;
      }

      static _saveToStorage(obj) {
        storageWrite("STATE", this._serialize(obj));
      }

      static _getArgs() {
        return JSON.parse(input() || "{}");
      }

      static _serialize(value) {
        return JSON.stringify(value);
      }

      static _deserialize(value) {
        return JSON.parse(value);
      }

      static _reconstruct(classObject, plainObject) {
        for (const item in classObject) {
          if (classObject[item].constructor?.deserialize !== undefined) {
            classObject[item] = classObject[item].constructor.deserialize(plainObject[item]);
          } else {
            classObject[item] = plainObject[item];
          }
        }

        return classObject;
      }

      static _requireInit() {
        return requireInit;
      }

    };
  };
}

class LookupMap {
  constructor(keyPrefix) {
    this.keyPrefix = keyPrefix;
  }

  containsKey(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    return storageHasKey(storageKey);
  }

  get(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    let raw = storageRead(storageKey);

    if (raw !== null) {
      return JSON.parse(raw);
    }

    return null;
  }

  remove(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);

    if (storageRemove(storageKey)) {
      return JSON.parse(storageGetEvicted());
    }

    return null;
  }

  set(key, value) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    let storageValue = JSON.stringify(value);

    if (storageWrite(storageKey, storageValue)) {
      return JSON.parse(storageGetEvicted());
    }

    return null;
  }

  extend(objects) {
    for (let kv of objects) {
      this.set(kv[0], kv[1]);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    return new LookupMap(data.keyPrefix);
  }

}

const ERR_INDEX_OUT_OF_BOUNDS = "Index out of bounds";
const ERR_INCONSISTENT_STATE$2 = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";

function indexToKey(prefix, index) {
  let data = new Uint32Array([index]);
  let array = new Uint8Array(data.buffer);
  let key = u8ArrayToBytes(array);
  return prefix + key;
} /// An iterable implementation of vector that stores its content on the trie.
/// Uses the following map: index -> element


class Vector {
  constructor(prefix) {
    this.length = 0;
    this.prefix = prefix;
  }

  isEmpty() {
    return this.length == 0;
  }

  get(index) {
    if (index >= this.length) {
      return null;
    }

    let storageKey = indexToKey(this.prefix, index);
    return JSON.parse(storageRead(storageKey));
  } /// Removes an element from the vector and returns it in serialized form.
  /// The removed element is replaced by the last element of the vector.
  /// Does not preserve ordering, but is `O(1)`.


  swapRemove(index) {
    if (index >= this.length) {
      throw new Error(ERR_INDEX_OUT_OF_BOUNDS);
    } else if (index + 1 == this.length) {
      return this.pop();
    } else {
      let key = indexToKey(this.prefix, index);
      let last = this.pop();

      if (storageWrite(key, JSON.stringify(last))) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$2);
      }
    }
  }

  push(element) {
    let key = indexToKey(this.prefix, this.length);
    this.length += 1;
    storageWrite(key, JSON.stringify(element));
  }

  pop() {
    if (this.isEmpty()) {
      return null;
    } else {
      let lastIndex = this.length - 1;
      let lastKey = indexToKey(this.prefix, lastIndex);
      this.length -= 1;

      if (storageRemove(lastKey)) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$2);
      }
    }
  }

  replace(index, element) {
    if (index >= this.length) {
      throw new Error(ERR_INDEX_OUT_OF_BOUNDS);
    } else {
      let key = indexToKey(this.prefix, index);

      if (storageWrite(key, JSON.stringify(element))) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$2);
      }
    }
  }

  extend(elements) {
    for (let element of elements) {
      this.push(element);
    }
  }

  [Symbol.iterator]() {
    return new VectorIterator(this);
  }

  clear() {
    for (let i = 0; i < this.length; i++) {
      let key = indexToKey(this.prefix, i);
      storageRemove(key);
    }

    this.length = 0;
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let vector = new Vector(data.prefix);
    vector.length = data.length;
    return vector;
  }

}
class VectorIterator {
  constructor(vector) {
    this.current = 0;
    this.vector = vector;
  }

  next() {
    if (this.current < this.vector.length) {
      let value = this.vector.get(this.current);
      this.current += 1;
      return {
        value,
        done: false
      };
    }

    return {
      value: null,
      done: true
    };
  }

}

const ERR_INCONSISTENT_STATE$1 = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";
class UnorderedMap {
  constructor(prefix) {
    this.prefix = prefix;
    this.keys = new Vector(prefix + 'u'); // intentional different prefix with old UnorderedMap

    this.values = new LookupMap(prefix + 'm');
  }

  get length() {
    let keysLen = this.keys.length;
    return keysLen;
  }

  isEmpty() {
    let keysIsEmpty = this.keys.isEmpty();
    return keysIsEmpty;
  }

  get(key) {
    let valueAndIndex = this.values.get(key);

    if (valueAndIndex === null) {
      return null;
    }

    let value = valueAndIndex[0];
    return value;
  }

  set(key, value) {
    let valueAndIndex = this.values.get(key);

    if (valueAndIndex !== null) {
      let oldValue = valueAndIndex[0];
      valueAndIndex[0] = value;
      this.values.set(key, valueAndIndex);
      return oldValue;
    }

    let nextIndex = this.length;
    this.keys.push(key);
    this.values.set(key, [value, nextIndex]);
    return null;
  }

  remove(key) {
    let oldValueAndIndex = this.values.remove(key);

    if (oldValueAndIndex === null) {
      return null;
    }

    let index = oldValueAndIndex[1];

    if (this.keys.swapRemove(index) === null) {
      throw new Error(ERR_INCONSISTENT_STATE$1);
    } // the last key is swapped to key[index], the corresponding [value, index] need update


    if (this.keys.length > 0 && index != this.keys.length) {
      // if there is still elements and it was not the last element
      let swappedKey = this.keys.get(index);
      let swappedValueAndIndex = this.values.get(swappedKey);

      if (swappedValueAndIndex === null) {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }

      this.values.set(swappedKey, [swappedValueAndIndex[0], index]);
    }

    return oldValueAndIndex[0];
  }

  clear() {
    for (let key of this.keys) {
      // Set instead of remove to avoid loading the value from storage.
      this.values.set(key, null);
    }

    this.keys.clear();
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  [Symbol.iterator]() {
    return new UnorderedMapIterator(this);
  }

  extend(kvs) {
    for (let [k, v] of kvs) {
      this.set(k, v);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let map = new UnorderedMap(data.prefix); // reconstruct keys Vector

    map.keys = new Vector(data.prefix + "u");
    map.keys.length = data.keys.length; // reconstruct values LookupMap

    map.values = new LookupMap(data.prefix + "m");
    return map;
  }

}

class UnorderedMapIterator {
  constructor(unorderedMap) {
    this.keys = new VectorIterator(unorderedMap.keys);
    this.map = unorderedMap.values;
  }

  next() {
    let key = this.keys.next();
    let value;

    if (!key.done) {
      value = this.map.get(key.value);

      if (value === null) {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }
    }

    return {
      value: [key.value, value ? value[0] : value],
      done: key.done
    };
  }

}

const ERR_INCONSISTENT_STATE = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";

function serializeIndex(index) {
  let data = new Uint32Array([index]);
  let array = new Uint8Array(data.buffer);
  return u8ArrayToBytes(array);
}

function deserializeIndex(rawIndex) {
  let array = bytesToU8Array(rawIndex);
  let data = new Uint32Array(array.buffer);
  return data[0];
}

class UnorderedSet {
  constructor(prefix) {
    this.prefix = prefix;
    this.elementIndexPrefix = prefix + "i";
    let elementsPrefix = prefix + "e";
    this.elements = new Vector(elementsPrefix);
  }

  get length() {
    return this.elements.length;
  }

  isEmpty() {
    return this.elements.isEmpty();
  }

  contains(element) {
    let indexLookup = this.elementIndexPrefix + JSON.stringify(element);
    return storageHasKey(indexLookup);
  }

  set(element) {
    let indexLookup = this.elementIndexPrefix + JSON.stringify(element);

    if (storageRead(indexLookup)) {
      return false;
    } else {
      let nextIndex = this.length;
      let nextIndexRaw = serializeIndex(nextIndex);
      storageWrite(indexLookup, nextIndexRaw);
      this.elements.push(element);
      return true;
    }
  }

  remove(element) {
    let indexLookup = this.elementIndexPrefix + JSON.stringify(element);
    let indexRaw = storageRead(indexLookup);

    if (indexRaw) {
      if (this.length == 1) {
        // If there is only one element then swap remove simply removes it without
        // swapping with the last element.
        storageRemove(indexLookup);
      } else {
        // If there is more than one element then swap remove swaps it with the last
        // element.
        let lastElement = this.elements.get(this.length - 1);

        if (!lastElement) {
          throw new Error(ERR_INCONSISTENT_STATE);
        }

        storageRemove(indexLookup); // If the removed element was the last element from keys, then we don't need to
        // reinsert the lookup back.

        if (lastElement != element) {
          let lastLookupElement = this.elementIndexPrefix + JSON.stringify(lastElement);
          storageWrite(lastLookupElement, indexRaw);
        }
      }

      let index = deserializeIndex(indexRaw);
      this.elements.swapRemove(index);
      return true;
    }

    return false;
  }

  clear() {
    for (let element of this.elements) {
      let indexLookup = this.elementIndexPrefix + JSON.stringify(element);
      storageRemove(indexLookup);
    }

    this.elements.clear();
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  [Symbol.iterator]() {
    return this.elements[Symbol.iterator]();
  }

  extend(elements) {
    for (let element of elements) {
      this.set(element);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let set = new UnorderedSet(data.prefix); // reconstruct Vector

    let elementsPrefix = data.prefix + "e";
    set.elements = new Vector(elementsPrefix);
    set.elements.length = data.elements.length;
    return set;
  }

}

//defines the payout type we'll be returning as a part of the royalty standards.
class Token {
  constructor({
    ownerId,
    approvedAccountIds,
    nextApprovalId,
    royalty
  }) {
    //owner of the token
    this.owner_id = ownerId, //list of approved account IDs that have access to transfer the token. This maps an account ID to an approval ID
    this.approved_account_ids = approvedAccountIds, //the next approval ID to give out. 
    this.next_approval_id = nextApprovalId, //keep track of the royalty percentages for the token in a hash map
    this.royalty = royalty;
  }

} //The Json token is what will be returned from view calls. 

class JsonToken {
  constructor({
    tokenId,
    ownerId,
    metadata,
    approvedAccountIds,
    royalty
  }) {
    //token ID
    this.token_id = tokenId, //owner of the token
    this.owner_id = ownerId, //token metadata
    this.metadata = metadata, //list of approved account IDs that have access to transfer the token. This maps an account ID to an approval ID
    this.approved_account_ids = approvedAccountIds, //keep track of the royalty percentages for the token in a hash map
    this.royalty = royalty;
  }

} //get the information for a specific token ID

function internalNftMetadata({
  contract
}) {
  return contract.metadata;
}

function restoreOwners(collection) {
  if (collection == null) {
    return null;
  }

  return UnorderedSet.deserialize(collection);
} //convert the royalty percentage and amount to pay into a payout (U128)

function royaltyToPayout(royaltyPercentage, amountToPay) {
  return (BigInt(royaltyPercentage) * BigInt(amountToPay) / BigInt(10000)).toString();
} //refund the storage taken up by passed in approved account IDs and send the funds to the passed in account ID.

function refundApprovedAccountIdsIter(accountId, approvedAccountIds) {
  //get the storage total by going through and summing all the bytes for each approved account IDs
  let storageReleased = approvedAccountIds.map(e => bytesForApprovedAccountId(e)).reduce((partialSum, a) => partialSum + a, 0);
  let amountToTransfer = BigInt(storageReleased) * storageByteCost().valueOf(); // Send the money to the beneficiary (TODO: don't use batch actions)

  const promise = promiseBatchCreate(accountId);
  promiseBatchActionTransfer(promise, amountToTransfer);
} //refund a map of approved account IDs and send the funds to the passed in account ID

function refundApprovedAccountIds(accountId, approvedAccountIds) {
  //call the refundApprovedAccountIdsIter with the approved account IDs as keys
  refundApprovedAccountIdsIter(accountId, Object.keys(approvedAccountIds));
} //refund the initial deposit based on the amount of storage that was used up

function refundDeposit(storageUsed) {
  //get how much it would cost to store the information
  let requiredCost = storageUsed * storageByteCost().valueOf(); //get the attached deposit

  let attachedDeposit$1 = attachedDeposit().valueOf(); //make sure that the attached deposit is greater than or equal to the required cost

  assert(requiredCost <= attachedDeposit$1, `Must attach ${requiredCost} yoctoNEAR to cover storage`); //get the refund amount from the attached deposit - required cost

  let refund = attachedDeposit$1 - requiredCost;
  log(`Refunding ${refund} yoctoNEAR`); //if the refund is greater than 1 yocto NEAR, we refund the predecessor that amount

  if (refund > 1) {
    // Send the money to the beneficiary (TODO: don't use batch actions)
    const promise = promiseBatchCreate(predecessorAccountId());
    promiseBatchActionTransfer(promise, refund);
  }
} //calculate how many bytes the account ID is taking up

function bytesForApprovedAccountId(accountId) {
  // The extra 4 bytes are coming from Borsh serialization to store the length of the string.
  return accountId.length + 4 + 8;
} //Assert that the user has attached at least 1 yoctoNEAR (for security reasons and to pay for storage)

function assertAtLeastOneYocto() {
  assert(attachedDeposit().valueOf() >= BigInt(1), "Requires attached deposit of at least 1 yoctoNEAR");
} //used to make sure the user attached exactly 1 yoctoNEAR

function assertOneYocto() {
  assert(attachedDeposit().toString() === "1", "Requires attached deposit of exactly 1 yoctoNEAR");
} //add a token to the set of tokens an owner has

function internalAddTokenToOwner(contract, accountId, tokenId) {
  //get the set of tokens for the given account
  let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId));

  if (tokenSet == null) {
    //if the account doesn't have any tokens, we create a new unordered set
    tokenSet = new UnorderedSet("tokensPerOwner" + accountId.toString());
  } //we insert the token ID into the set


  tokenSet.set(tokenId); //we insert that set for the given account ID.

  contract.tokensPerOwner.set(accountId, tokenSet);
} //remove a token from an owner (internal method and can't be called directly via CLI).

function internalRemoveTokenFromOwner(contract, accountId, tokenId) {
  //we get the set of tokens that the owner has
  let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId)); //if there is no set of tokens for the owner, we panic with the following message:

  if (tokenSet == null) {
    panicUtf8("Token should be owned by the sender");
  } //we remove the the token_id from the set of tokens


  tokenSet.remove(tokenId); //if the token set is now empty, we remove the owner from the tokens_per_owner collection

  if (tokenSet.isEmpty()) {
    contract.tokensPerOwner.remove(accountId);
  } else {
    //if the token set is not empty, we simply insert it back for the account ID.
    contract.tokensPerOwner.set(accountId, tokenSet);
  }
} //transfers the NFT to the receiver_id (internal method and can't be called directly via CLI).

function internalTransfer(contract, senderId, receiverId, tokenId, approvalId, memo) {
  //get the token object by passing in the token_id
  let token = contract.tokensById.get(tokenId);

  if (token == null) {
    panicUtf8("no token found");
  } //if the sender doesn't equal the owner, we check if the sender is in the approval list


  if (senderId != token.owner_id) {
    //if the token's approved account IDs doesn't contain the sender, we panic
    if (!token.approved_account_ids.hasOwnProperty(senderId)) {
      panicUtf8("Unauthorized");
    } // If they included an approval_id, check if the sender's actual approval_id is the same as the one included


    if (approvalId != null) {
      //get the actual approval ID
      let actualApprovalId = token.approved_account_ids[senderId]; //if the sender isn't in the map, we panic

      if (actualApprovalId == null) {
        panicUtf8("Sender is not approved account");
      } //make sure that the actual approval ID is the same as the one provided


      assert(actualApprovalId == approvalId, `The actual approval_id ${actualApprovalId} is different from the given approval_id ${approvalId}`);
    }
  } //we make sure that the sender isn't sending the token to themselves


  assert(token.owner_id != receiverId, "The token owner and the receiver should be different"); //we remove the token from it's current owner's set

  internalRemoveTokenFromOwner(contract, token.owner_id, tokenId); //we then add the token to the receiver_id's set

  internalAddTokenToOwner(contract, receiverId, tokenId); //we create a new token struct

  let newToken = new Token({
    ownerId: receiverId,
    //reset the approval account IDs
    approvedAccountIds: {},
    nextApprovalId: token.next_approval_id,
    //we copy over the royalties from the previous token
    royalty: token.royalty
  }); //insert that new token into the tokens_by_id, replacing the old entry

  contract.tokensById.set(tokenId, newToken); //if there was some memo attached, we log it.

  if (memo != null) {
    log(`Memo: ${memo}`);
  } // Default the authorized ID to be None for the logs.


  let authorizedId; //if the approval ID was provided, set the authorized ID equal to the sender

  if (approvalId != null) {
    authorizedId = senderId;
  } // Construct the transfer log as per the events standard.


  let nftTransferLog = {
    // Standard name ("nep171").
    standard: NFT_STANDARD_NAME,
    // Version of the standard ("nft-1.0.0").
    version: NFT_METADATA_SPEC,
    // The data related with the event stored in a vector.
    event: "nft_transfer",
    data: [{
      // The optional authorized account ID to transfer the token on behalf of the old owner.
      authorized_id: authorizedId,
      // The old owner's account ID.
      old_owner_id: token.owner_id,
      // The account ID of the new owner of the token.
      new_owner_id: receiverId,
      // A vector containing the token IDs as strings.
      token_ids: [tokenId],
      // An optional memo to include.
      memo
    }]
  }; // Log the serialized json.

  log(JSON.stringify(nftTransferLog)); //return the previous token object that was transferred.

  return token;
}

// @ts-nocheck
function internalMint({
  contract,
  tokenId,
  metadata,
  receiverId,
  perpetualRoyalties
}) {
  //measure the initial storage being used on the contract TODO
  let initialStorageUsage = storageUsage(); // create a royalty map to store in the token

  let royalty = {}; // if perpetual royalties were passed into the function: TODO: add isUndefined fn

  if (perpetualRoyalties != null) {
    //make sure that the length of the perpetual royalties is below 7 since we won't have enough GAS to pay out that many people
    assert(Object.keys(perpetualRoyalties).length < 7, "Cannot add more than 6 perpetual royalty amounts"); //iterate through the perpetual royalties and insert the account and amount in the royalty map

    Object.entries(perpetualRoyalties).forEach(([account, amount], index) => {
      royalty[account] = amount;
    });
  } //specify the token struct that contains the owner ID 


  let token = new Token({
    //set the owner ID equal to the receiver ID passed into the function
    ownerId: receiverId,
    //we set the approved account IDs to the default value (an empty map)
    approvedAccountIds: {},
    //the next approval ID is set to 0
    nextApprovalId: 0,
    //the map of perpetual royalties for the token (The owner will get 100% - total perpetual royalties)
    royalty
  }); //insert the token ID and token struct and make sure that the token doesn't exist

  assert(!contract.tokensById.containsKey(tokenId), "Token already exists");
  contract.tokensById.set(tokenId, token); //insert the token ID and metadata

  contract.tokenMetadataById.set(tokenId, metadata); //call the internal method for adding the token to the owner

  internalAddTokenToOwner(contract, token.owner_id, tokenId); // Construct the mint log as per the events standard.

  let nftMintLog = {
    // Standard name ("nep171").
    standard: NFT_STANDARD_NAME,
    // Version of the standard ("nft-1.0.0").
    version: NFT_METADATA_SPEC,
    // The data related with the event stored in a vector.
    event: "nft_mint",
    data: [{
      // Owner of the token.
      owner_id: token.owner_id,
      // Vector of token IDs that were minted.
      token_ids: [tokenId]
    }]
  }; // Log the json.

  log(`EVENT_JSON:${JSON.stringify(nftMintLog)}`); //calculate the required storage which was the used - initial TODO

  let requiredStorageInBytes = storageUsage().valueOf() - initialStorageUsage.valueOf(); //refund any excess storage if the user attached too much. Panic if they didn't attach enough to cover the required.

  refundDeposit(requiredStorageInBytes);
}

// @ts-nocheck
const GAS_FOR_RESOLVE_TRANSFER = 40_000_000_000_000;
const GAS_FOR_NFT_ON_TRANSFER = 35_000_000_000_000; //get the information for a specific token ID

function internalNftToken({
  contract,
  tokenId
}) {
  let token = contract.tokensById.get(tokenId); //if there wasn't a token ID in the tokens_by_id collection, we return None

  if (token == null) {
    return null;
  } //if there is some token ID in the tokens_by_id collection
  //we'll get the metadata for that token


  let metadata = contract.tokenMetadataById.get(tokenId); //we return the JsonToken

  let jsonToken = new JsonToken({
    tokenId: tokenId,
    ownerId: token.owner_id,
    metadata,
    approvedAccountIds: token.approved_account_ids,
    royalty: token.royalty
  });
  return jsonToken;
} //implementation of the nft_transfer method. This transfers the NFT from the current owner to the receiver. 

function internalNftTransfer({
  contract,
  receiverId,
  tokenId,
  approvalId,
  memo
}) {
  //assert that the user attached exactly 1 yoctoNEAR. This is for security and so that the user will be redirected to the NEAR wallet. 
  assertOneYocto(); //get the sender to transfer the token from the sender to the receiver

  let senderId = predecessorAccountId(); //call the internal transfer method and get back the previous token so we can refund the approved account IDs

  let previousToken = internalTransfer(contract, senderId, receiverId, tokenId, approvalId, memo); //we refund the owner for releasing the storage used up by the approved account IDs

  refundApprovedAccountIds(previousToken.owner_id, previousToken.approved_account_ids);
} //implementation of the transfer call method. This will transfer the NFT and call a method on the receiver_id contract

function internalNftTransferCall({
  contract,
  receiverId,
  tokenId,
  approvalId,
  memo,
  msg
}) {
  //assert that the user attached exactly 1 yocto for security reasons. 
  assertOneYocto(); //get the sender to transfer the token from the sender to the receiver

  let senderId = predecessorAccountId(); //call the internal transfer method and get back the previous token so we can refund the approved account IDs

  let previousToken = internalTransfer(contract, senderId, receiverId, tokenId, approvalId, memo); // Initiating receiver's call and the callback

  const promise = promiseBatchCreate(receiverId);
  promiseBatchActionFunctionCall(promise, "nft_on_transfer", bytes(JSON.stringify({
    sender_id: senderId,
    previous_owner_id: previousToken.owner_id,
    token_id: tokenId,
    msg
  })), 0, // no deposit 
  GAS_FOR_NFT_ON_TRANSFER); // We then resolve the promise and call nft_resolve_transfer on our own contract

  promiseThen(promise, currentAccountId(), "nft_resolve_transfer", bytes(JSON.stringify({
    owner_id: previousToken.owner_id,
    receiver_id: receiverId,
    token_id: tokenId,
    approved_account_ids: previousToken.approved_account_ids
  })), 0, // no deposit 
  GAS_FOR_RESOLVE_TRANSFER);
  return promiseReturn(promise);
} //resolves the cross contract call when calling nft_on_transfer in the nft_transfer_call method
//returns true if the token was successfully transferred to the receiver_id

function internalResolveTransfer({
  contract,
  authorizedId,
  ownerId,
  receiverId,
  tokenId,
  approvedAccountIds,
  memo
}) {
  assert(currentAccountId() === predecessorAccountId(), "Only the contract itself can call this method"); // Whether receiver wants to return token back to the sender, based on `nft_on_transfer`
  // call result.

  let result = promiseResult(0);

  if (typeof result === 'string') {
    //As per the standard, the nft_on_transfer should return whether we should return the token to it's owner or not
    //if we need don't need to return the token, we simply return true meaning everything went fine
    if (result === 'false') {
      /* 
          since we've already transferred the token and nft_on_transfer returned false, we don't have to 
          revert the original transfer and thus we can just return true since nothing went wrong.
      */
      //we refund the owner for releasing the storage used up by the approved account IDs
      refundApprovedAccountIds(ownerId, approvedAccountIds);
      return true;
    }
  } //get the token object if there is some token object


  let token = contract.tokensById.get(tokenId);

  if (token != null) {
    if (token.owner_id != receiverId) {
      //we refund the owner for releasing the storage used up by the approved account IDs
      refundApprovedAccountIds(ownerId, approvedAccountIds); // The token is not owner by the receiver anymore. Can't return it.

      return true;
    } //if there isn't a token object, it was burned and so we return true

  } else {
    //we refund the owner for releasing the storage used up by the approved account IDs
    refundApprovedAccountIds(ownerId, approvedAccountIds);
    return true;
  } //we remove the token from the receiver


  internalRemoveTokenFromOwner(contract, receiverId, tokenId); //we add the token to the original owner

  internalAddTokenToOwner(contract, ownerId, tokenId); //we change the token struct's owner to be the original owner 

  token.owner_id = ownerId; //we refund the receiver any approved account IDs that they may have set on the token

  refundApprovedAccountIds(receiverId, token.approved_account_ids); //reset the approved account IDs to what they were before the transfer

  token.approved_account_ids = approvedAccountIds; //we inset the token b  ack into the tokens_by_id collection

  contract.tokensById.set(tokenId, token);
  /*
      We need to log that the NFT was reverted back to the original owner.
      The old_owner_id will be the receiver and the new_owner_id will be the
      original owner of the token since we're reverting the transfer.
  */
  // Construct the transfer log as per the events standard.

  let nftTransferLog = {
    // Standard name ("nep171").
    standard: NFT_STANDARD_NAME,
    // Version of the standard ("nft-1.0.0").
    version: NFT_METADATA_SPEC,
    // The data related with the event stored in a vector.
    event: "nft_transfer",
    data: [{
      // The optional authorized account ID to transfer the token on behalf of the old owner.
      authorized_id: authorizedId,
      // The old owner's account ID.
      old_owner_id: receiverId,
      // The account ID of the new owner of the token.
      new_owner_id: ownerId,
      // A vector containing the token IDs as strings.
      token_ids: [tokenId],
      // An optional memo to include.
      memo
    }]
  }; // Log the serialized json.

  log(JSON.stringify(nftTransferLog)); //return false

  return false;
}

// @ts-nocheck

function internalTotalSupply({
  contract
}) {
  //return the length of the token metadata by ID
  return contract.tokenMetadataById.len();
} //Query for nft tokens on the contract regardless of the owner using pagination

function internalNftTokens({
  contract,
  fromIndex,
  limit
}) {
  let tokens = []; //where to start pagination - if we have a fromIndex, we'll use that - otherwise start from 0 index

  let start = fromIndex ? parseInt(fromIndex) : 0; //take the first "limit" elements in the array. If we didn't specify a limit, use 50

  let max = limit ? limit : 50;
  let keys = contract.tokenMetadataById.toArray(); // Paginate through the keys using the fromIndex and limit

  for (let i = start; i < keys.length && i < start + max; i++) {
    // get the token object from the keys
    let jsonToken = internalNftToken({
      contract,
      tokenId: keys[i][0]
    });
    tokens.push(jsonToken);
  }

  return tokens;
} //get the total supply of NFTs for a given owner

function internalSupplyForOwner({
  contract,
  accountId
}) {
  //get the set of tokens for the passed in owner
  let tokens = restoreOwners(contract.tokensPerOwner.get(accountId)); //if there isn't a set of tokens for the passed in account ID, we'll return 0

  if (tokens == null) {
    return 0;
  } //if there is some set of tokens, we'll return the length 


  return tokens.len();
} //Query for all the tokens for an owner

function internalTokensForOwner({
  contract,
  accountId,
  fromIndex,
  limit
}) {
  //get the set of tokens for the passed in owner
  let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId)); //if there isn't a set of tokens for the passed in account ID, we'll return 0

  if (tokenSet == null) {
    return [];
  } //where to start pagination - if we have a fromIndex, we'll use that - otherwise start from 0 index


  let start = fromIndex ? parseInt(fromIndex) : 0; //take the first "limit" elements in the array. If we didn't specify a limit, use 50

  let max = limit ? limit : 50;
  let keys = tokenSet.toArray();
  let tokens = [];

  for (let i = start; i < max; i++) {
    if (i >= keys.length) {
      break;
    }

    let token = internalNftToken({
      contract,
      tokenId: keys[i]
    });
    tokens.push(token);
  }

  return tokens;
}

// @ts-nocheck
const GAS_FOR_NFT_ON_APPROVE = 35_000_000_000_000; //approve an account ID to transfer a token on your behalf

function internalNftApprove({
  contract,
  tokenId,
  accountId,
  msg
}) {
  /*
      assert at least one yocto for security reasons - this will cause a redirect to the NEAR wallet.
      The user needs to attach enough to pay for storage on the contract
  */
  assertAtLeastOneYocto(); //get the token object from the token ID

  let token = contract.tokensById.get(tokenId);

  if (token == null) {
    undefined("no token");
  } //make sure that the person calling the function is the owner of the token


  assert(predecessorAccountId() === token.owner_id, "Predecessor must be the token owner"); //get the next approval ID if we need a new approval

  let approvalId = token.next_approval_id; //check if the account has been approved already for this token

  let isNewApproval = token.approved_account_ids.hasOwnProperty(accountId);
  token.approved_account_ids[accountId] = approvalId; //if it was a new approval, we need to calculate how much storage is being used to add the account.

  let storageUsed = isNewApproval ? bytesForApprovedAccountId(accountId) : 0; //increment the token's next approval ID by 1

  token.next_approval_id += 1; //insert the token back into the tokens_by_id collection

  contract.tokensById.set(tokenId, token); //refund any excess storage attached by the user. If the user didn't attach enough, panic. 

  refundDeposit(BigInt(storageUsed)); //if some message was passed into the function, we initiate a cross contract call on the
  //account we're giving access to. 

  if (msg != null) {
    // Initiating receiver's call and the callback
    const promise = promiseBatchCreate(accountId);
    promiseBatchActionFunctionCall(promise, "nft_on_approve", bytes(JSON.stringify({
      token_id: tokenId,
      owner_id: token.owner_id,
      approval_id: approvalId,
      msg
    })), 0, // no deposit 
    GAS_FOR_NFT_ON_APPROVE);
    promiseReturn(promise);
  }
} //check if the passed in account has access to approve the token ID

function internalNftIsApproved({
  contract,
  tokenId,
  approvedAccountId,
  approvalId
}) {
  //get the token object from the token_id
  let token = contract.tokensById.get(tokenId);

  if (token == null) {
    undefined("no token");
  } //get the approval number for the passed in account ID


  let approval = token.approved_account_ids[approvedAccountId]; //if there was no approval ID found for the account ID, we simply return false

  if (approval == null) {
    return false;
  } //if there was some approval ID found for the account ID
  //if there was no approval_id passed into the function, we simply return true


  if (approvalId == null) {
    return true;
  } //if a specific approval_id was passed into the function
  //return if the approval ID passed in matches the actual approval ID for the account


  return approvalId == approval;
} //revoke a specific account from transferring the token on your behalf

function internalNftRevoke({
  contract,
  tokenId,
  accountId
}) {
  //assert that the user attached exactly 1 yoctoNEAR for security reasons
  assertOneYocto(); //get the token object using the passed in token_id

  let token = contract.tokensById.get(tokenId);

  if (token == null) {
    undefined("no token");
  } //get the caller of the function and assert that they are the owner of the token


  let predecessorAccountId$1 = predecessorAccountId();
  assert(predecessorAccountId$1 == token.owner_id, "only token owner can revoke"); //if the account ID was in the token's approval, we remove it

  if (token.approved_account_ids.hasOwnProperty(accountId)) {
    delete token.approved_account_ids[accountId]; //refund the funds released by removing the approved_account_id to the caller of the function

    refundApprovedAccountIdsIter(predecessorAccountId$1, [accountId]); //insert the token back into the tokens_by_id collection with the account_id removed from the approval list

    contract.tokensById.set(tokenId, token);
  }
} //revoke all accounts from transferring the token on your behalf

function internalNftRevokeAll({
  contract,
  tokenId
}) {
  //assert that the caller attached exactly 1 yoctoNEAR for security
  assertOneYocto(); //get the token object from the passed in token ID

  let token = contract.tokensById.get(tokenId);

  if (token == null) {
    undefined("no token");
  } //get the caller and make sure they are the owner of the tokens


  let predecessorAccountId$1 = predecessorAccountId();
  assert(predecessorAccountId$1 == token.owner_id, "only token owner can revoke"); //only revoke if the approved account IDs for the token is not empty

  if (token.approved_account_ids && Object.keys(token.approved_account_ids).length === 0 && Object.getPrototypeOf(token.approved_account_ids) === Object.prototype) {
    //refund the approved account IDs to the caller of the function
    refundApprovedAccountIds(predecessorAccountId$1, token.approved_account_ids); //clear the approved account IDs

    token.approved_account_ids = {}; //insert the token back into the tokens_by_id collection with the approved account IDs cleared

    contract.tokensById.set(tokenId, token);
  }
}

// @ts-nocheck
//calculates the payout for a token given the passed in balance. This is a view method
function internalNftPayout({
  contract,
  tokenId,
  balance,
  maxLenPayout
}) {
  //get the token object
  let token = contract.tokensById.get(tokenId);

  if (token == null) {
    undefined("no token");
  } //get the owner of the token


  let ownerId = token.owner_id; //keep track of the total perpetual royalties

  let totalPerpetual = 0; //keep track of the payout object to send back

  let payoutObj = {}; //get the royalty object from token

  let royalty = token.royalty; //make sure we're not paying out to too many people (GAS limits this)

  assert(Object.keys(royalty).length <= maxLenPayout, "Market cannot payout to that many receivers"); //go through each key and value in the royalty object

  Object.entries(royalty).forEach(([key, value], index) => {
    //only insert into the payout if the key isn't the token owner (we add their payout at the end)
    if (key != ownerId) {
      payoutObj[key] = royaltyToPayout(value, balance);
      totalPerpetual += value;
    }
  }); // payout to previous owner who gets 100% - total perpetual royalties

  payoutObj[ownerId] = royaltyToPayout(10000 - totalPerpetual, balance); //return the payout object

  return {
    payout: payoutObj
  };
} //transfers the token to the receiver ID and returns the payout object that should be payed given the passed in balance. 

function internalNftTransferPayout({
  contract,
  receiverId,
  tokenId,
  approvalId,
  memo,
  balance,
  maxLenPayout
}) {
  //assert that the user attached 1 yocto NEAR for security reasons
  assertOneYocto(); //get the sender ID

  let senderId = predecessorAccountId(); //transfer the token to the passed in receiver and get the previous token object back

  let previousToken = internalTransfer(contract, senderId, receiverId, tokenId, approvalId, memo); //refund the previous token owner for the storage used up by the previous approved account IDs

  refundApprovedAccountIds(previousToken.owner_id, previousToken.approved_account_ids); //get the owner of the token

  let ownerId = previousToken.owner_id; //keep track of the total perpetual royalties

  let totalPerpetual = 0; //keep track of the payout object to send back

  let payoutObj = {}; //get the royalty object from token

  let royalty = previousToken.royalty; //make sure we're not paying out to too many people (GAS limits this)

  assert(Object.keys(royalty).length <= maxLenPayout, "Market cannot payout to that many receivers"); //go through each key and value in the royalty object

  Object.entries(royalty).forEach(([key, value], index) => {
    //only insert into the payout if the key isn't the token owner (we add their payout at the end)
    if (key != ownerId) {
      payoutObj[key] = royaltyToPayout(value, balance);
      totalPerpetual += value;
    }
  }); // payout to previous owner who gets 100% - total perpetual royalties

  payoutObj[ownerId] = royaltyToPayout(10000 - totalPerpetual, balance); //return the payout object

  return {
    payout: payoutObj
  };
}

var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _dec14, _dec15, _dec16, _dec17, _dec18, _class, _class2;

const NFT_METADATA_SPEC = "nft-1.0.0"; /// This is the name of the NFT standard we're using

const NFT_STANDARD_NAME = "nep171";
let Contract = (_dec = NearBindgen({}), _dec2 = initialize({}), _dec3 = call({}), _dec4 = view({}), _dec5 = call({}), _dec6 = call({}), _dec7 = call({}), _dec8 = view({}), _dec9 = call({}), _dec10 = view({}), _dec11 = call({}), _dec12 = call({}), _dec13 = call({}), _dec14 = view({}), _dec15 = view({}), _dec16 = view({}), _dec17 = view({}), _dec18 = view({}), _dec(_class = (_class2 = class Contract {
  tokensPerOwner = new LookupMap("tokensPerOwner");
  tokensById = new LookupMap("tokensById");
  tokenMetadataById = new UnorderedMap("tokenMetadataById");

  /*
      initialization function (can only be called once).
      this initializes the contract with metadata that was passed in and
      the owner_id. 
  */
  // constructor({
  //     owner_id,
  //     metadata = {
  //         spec: "nft-1.0.0",
  //         name: "NFT Tutorial Contract",
  //         symbol: "GOTEAM",
  //     },
  // }) {
  // }
  init({
    owner_id,
    metadata = {
      spec: "nft-1.0.0",
      name: "NFT Tutorial Contract",
      symbol: "GOTEAM"
    }
  }) {
    this.owner_id = owner_id;
    this.metadata = metadata;
  } // default() {
  //     return new Contract({ owner_id: "" });
  // }

  /*
      MINT
  */


  nft_mint({
    token_id,
    metadata,
    receiver_id,
    perpetual_royalties
  }) {
    return internalMint({
      contract: this,
      tokenId: token_id,
      metadata: metadata,
      receiverId: receiver_id,
      perpetualRoyalties: perpetual_royalties
    });
  }
  /*
      CORE
  */


  //get the information for a specific token ID
  nft_token({
    token_id
  }) {
    return internalNftToken({
      contract: this,
      tokenId: token_id
    });
  }

  //implementation of the nft_transfer method. This transfers the NFT from the current owner to the receiver.
  nft_transfer({
    receiver_id,
    token_id,
    approval_id,
    memo
  }) {
    return internalNftTransfer({
      contract: this,
      receiverId: receiver_id,
      tokenId: token_id,
      approvalId: approval_id,
      memo: memo
    });
  }

  //implementation of the transfer call method. This will transfer the NFT and call a method on the receiver_id contract
  nft_transfer_call({
    receiver_id,
    token_id,
    approval_id,
    memo,
    msg
  }) {
    return internalNftTransferCall({
      contract: this,
      receiverId: receiver_id,
      tokenId: token_id,
      approvalId: approval_id,
      memo: memo,
      msg: msg
    });
  }

  //resolves the cross contract call when calling nft_on_transfer in the nft_transfer_call method
  //returns true if the token was successfully transferred to the receiver_id
  nft_resolve_transfer({
    authorized_id,
    owner_id,
    receiver_id,
    token_id,
    approved_account_ids,
    memo
  }) {
    return internalResolveTransfer({
      contract: this,
      authorizedId: authorized_id,
      ownerId: owner_id,
      receiverId: receiver_id,
      tokenId: token_id,
      approvedAccountIds: approved_account_ids,
      memo: memo
    });
  }
  /*
      APPROVALS
  */


  //check if the passed in account has access to approve the token ID
  nft_is_approved({
    token_id,
    approved_account_id,
    approval_id
  }) {
    return internalNftIsApproved({
      contract: this,
      tokenId: token_id,
      approvedAccountId: approved_account_id,
      approvalId: approval_id
    });
  }

  //approve an account ID to transfer a token on your behalf
  nft_approve({
    token_id,
    account_id,
    msg
  }) {
    return internalNftApprove({
      contract: this,
      tokenId: token_id,
      accountId: account_id,
      msg: msg
    });
  }
  /*
      ROYALTY
  */


  //calculates the payout for a token given the passed in balance. This is a view method
  nft_payout({
    token_id,
    balance,
    max_len_payout
  }) {
    return internalNftPayout({
      contract: this,
      tokenId: token_id,
      balance: balance,
      maxLenPayout: max_len_payout
    });
  }

  //transfers the token to the receiver ID and returns the payout object that should be payed given the passed in balance.
  nft_transfer_payout({
    receiver_id,
    token_id,
    approval_id,
    memo,
    balance,
    max_len_payout
  }) {
    return internalNftTransferPayout({
      contract: this,
      receiverId: receiver_id,
      tokenId: token_id,
      approvalId: approval_id,
      memo: memo,
      balance: balance,
      maxLenPayout: max_len_payout
    });
  }

  //approve an account ID to transfer a token on your behalf
  nft_revoke({
    token_id,
    account_id
  }) {
    return internalNftRevoke({
      contract: this,
      tokenId: token_id,
      accountId: account_id
    });
  }

  //approve an account ID to transfer a token on your behalf
  nft_revoke_all({
    token_id
  }) {
    return internalNftRevokeAll({
      contract: this,
      tokenId: token_id
    });
  }
  /*
      ENUMERATION
  */


  //Query for the total supply of NFTs on the contract
  nft_total_supply() {
    return internalTotalSupply({
      contract: this
    });
  }

  //Query for nft tokens on the contract regardless of the owner using pagination
  nft_tokens({
    from_index,
    limit
  }) {
    return internalNftTokens({
      contract: this,
      fromIndex: from_index,
      limit: limit
    });
  }

  //get the total supply of NFTs for a given owner
  nft_tokens_for_owner({
    account_id,
    from_index,
    limit
  }) {
    return internalTokensForOwner({
      contract: this,
      accountId: account_id,
      fromIndex: from_index,
      limit: limit
    });
  }

  //Query for all the tokens for an owner
  nft_supply_for_owner({
    account_id
  }) {
    return internalSupplyForOwner({
      contract: this,
      accountId: account_id
    });
  }
  /*
      METADATA
  */


  //Query for all the tokens for an owner
  nft_metadata() {
    return internalNftMetadata({
      contract: this
    });
  }

}, (_applyDecoratedDescriptor(_class2.prototype, "init", [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, "init"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_mint", [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_mint"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_token", [_dec4], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_token"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_transfer", [_dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_transfer"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_transfer_call", [_dec6], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_transfer_call"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_resolve_transfer", [_dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_resolve_transfer"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_is_approved", [_dec8], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_is_approved"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_approve", [_dec9], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_approve"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_payout", [_dec10], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_payout"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_transfer_payout", [_dec11], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_transfer_payout"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_revoke", [_dec12], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_revoke"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_revoke_all", [_dec13], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_revoke_all"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_total_supply", [_dec14], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_total_supply"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_tokens", [_dec15], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_tokens"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_tokens_for_owner", [_dec16], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_tokens_for_owner"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_supply_for_owner", [_dec17], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_supply_for_owner"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_metadata", [_dec18], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_metadata"), _class2.prototype)), _class2)) || _class);
function nft_metadata() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_metadata(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_supply_for_owner() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_supply_for_owner(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_tokens_for_owner() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_tokens_for_owner(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_tokens() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_tokens(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_total_supply() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_total_supply(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_revoke_all() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_revoke_all(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_revoke() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_revoke(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_transfer_payout() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_transfer_payout(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_payout() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_payout(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_approve() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_approve(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_is_approved() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_is_approved(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_resolve_transfer() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_resolve_transfer(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_transfer_call() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_transfer_call(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_transfer() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_transfer(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_token() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_token(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function nft_mint() {
  let _state = Contract._getState();

  if (!_state && Contract._requireInit()) {
    throw new Error("Contract must be initialized");
  }

  let _contract = Contract._create();

  if (_state) {
    Contract._reconstruct(_contract, _state);
  }

  let _args = Contract._getArgs();

  let _result = _contract.nft_mint(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}
function init() {
  let _state = Contract._getState();

  if (_state) throw new Error("Contract already initialized");

  let _contract = Contract._create();

  let _args = Contract._getArgs();

  let _result = _contract.init(_args);

  Contract._saveToStorage(_contract);

  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(Contract._serialize(_result));
}

export { Contract, NFT_METADATA_SPEC, NFT_STANDARD_NAME, init, nft_approve, nft_is_approved, nft_metadata, nft_mint, nft_payout, nft_resolve_transfer, nft_revoke, nft_revoke_all, nft_supply_for_owner, nft_token, nft_tokens, nft_tokens_for_owner, nft_total_supply, nft_transfer, nft_transfer_call, nft_transfer_payout };
//# sourceMappingURL=nft.js.map
