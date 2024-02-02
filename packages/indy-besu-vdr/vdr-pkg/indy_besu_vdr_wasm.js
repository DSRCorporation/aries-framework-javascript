let imports = {}
imports['__wbindgen_placeholder__'] = module.exports
let wasm
const { TextEncoder, TextDecoder } = require(`util`)

const heap = new Array(128).fill(undefined)

heap.push(undefined, null, true, false)

function getObject(idx) {
  return heap[idx]
}

let heap_next = heap.length

function dropObject(idx) {
  if (idx < 132) return
  heap[idx] = heap_next
  heap_next = idx
}

function takeObject(idx) {
  const ret = getObject(idx)
  dropObject(idx)
  return ret
}

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1)
  const idx = heap_next
  heap_next = heap[idx]

  heap[idx] = obj
  return idx
}

function isLikeNone(x) {
  return x === undefined || x === null
}

let cachedFloat64Memory0 = null

function getFloat64Memory0() {
  if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
    cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer)
  }
  return cachedFloat64Memory0
}

let cachedInt32Memory0 = null

function getInt32Memory0() {
  if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer)
  }
  return cachedInt32Memory0
}

let WASM_VECTOR_LEN = 0

let cachedUint8Memory0 = null

function getUint8Memory0() {
  if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer)
  }
  return cachedUint8Memory0
}

let cachedTextEncoder = new TextEncoder('utf-8')

const encodeString =
  typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view)
      }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg)
        view.set(buf)
        return {
          read: arg.length,
          written: buf.length,
        }
      }

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg)
    const ptr = malloc(buf.length, 1) >>> 0
    getUint8Memory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf)
    WASM_VECTOR_LEN = buf.length
    return ptr
  }

  let len = arg.length
  let ptr = malloc(len, 1) >>> 0

  const mem = getUint8Memory0()

  let offset = 0

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset)
    if (code > 0x7f) break
    mem[ptr + offset] = code
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset)
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len)
    const ret = encodeString(arg, view)

    offset += ret.written
  }

  WASM_VECTOR_LEN = offset
  return ptr
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true })

cachedTextDecoder.decode()

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len))
}

let cachedBigInt64Memory0 = null

function getBigInt64Memory0() {
  if (cachedBigInt64Memory0 === null || cachedBigInt64Memory0.byteLength === 0) {
    cachedBigInt64Memory0 = new BigInt64Array(wasm.memory.buffer)
  }
  return cachedBigInt64Memory0
}

function debugString(val) {
  // primitive types
  const type = typeof val
  if (type == 'number' || type == 'boolean' || val == null) {
    return `${val}`
  }
  if (type == 'string') {
    return `"${val}"`
  }
  if (type == 'symbol') {
    const description = val.description
    if (description == null) {
      return 'Symbol'
    } else {
      return `Symbol(${description})`
    }
  }
  if (type == 'function') {
    const name = val.name
    if (typeof name == 'string' && name.length > 0) {
      return `Function(${name})`
    } else {
      return 'Function'
    }
  }
  // objects
  if (Array.isArray(val)) {
    const length = val.length
    let debug = '['
    if (length > 0) {
      debug += debugString(val[0])
    }
    for (let i = 1; i < length; i++) {
      debug += ', ' + debugString(val[i])
    }
    debug += ']'
    return debug
  }
  // Test for built-in
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val))
  let className
  if (builtInMatches.length > 1) {
    className = builtInMatches[1]
  } else {
    // Failed to match the standard '[object ClassName]'
    return toString.call(val)
  }
  if (className == 'Object') {
    // we're a user defined class or Object
    // JSON.stringify avoids problems with cycles, and is generally much
    // easier than looping through ownProperties of `val`.
    try {
      return 'Object(' + JSON.stringify(val) + ')'
    } catch (_) {
      return 'Object'
    }
  }
  // errors
  if (val instanceof Error) {
    return `${val.name}: ${val.message}\n${val.stack}`
  }
  // TODO we could test for more things here, like `Set`s and `Map`s.
  return className
}

function makeMutClosure(arg0, arg1, dtor, f) {
  const state = { a: arg0, b: arg1, cnt: 1, dtor }
  const real = (...args) => {
    // First up with a closure we increment the internal reference
    // count. This ensures that the Rust closure environment won't
    // be deallocated while we're invoking it.
    state.cnt++
    const a = state.a
    state.a = 0
    try {
      return f(a, state.b, ...args)
    } finally {
      if (--state.cnt === 0) {
        wasm.__wbindgen_export_2.get(state.dtor)(a, state.b)
      } else {
        state.a = a
      }
    }
  }
  real.original = state

  return real
}
function __wbg_adapter_48(arg0, arg1) {
  wasm.wasm_bindgen__convert__closures__invoke0_mut__h016b2a322fcc14f7(arg0, arg1)
}

function __wbg_adapter_51(arg0, arg1, arg2) {
  wasm.wasm_bindgen__convert__closures__invoke1_mut__h5a66a0b93350ceb9(arg0, arg1, addHeapObject(arg2))
}

function _assertClass(instance, klass) {
  if (!(instance instanceof klass)) {
    throw new Error(`expected instance of ${klass.name}`)
  }
  return instance.ptr
}

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0
  getUint8Memory0().set(arg, ptr / 1)
  WASM_VECTOR_LEN = arg.length
  return ptr
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0
  return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len)
}

function handleError(f, args) {
  try {
    return f.apply(this, args)
  } catch (e) {
    wasm.__wbindgen_exn_store(addHeapObject(e))
  }
}
function __wbg_adapter_207(arg0, arg1, arg2, arg3) {
  wasm.wasm_bindgen__convert__closures__invoke2_mut__h5b3e9702d4c211f9(
    arg0,
    arg1,
    addHeapObject(arg2),
    addHeapObject(arg3)
  )
}

/**
 */
class CredentialDefinitionRegistry {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_credentialdefinitionregistry_free(ptr)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} id
   * @param {any} cred_def
   * @returns {Promise<Transaction>}
   */
  static buildCreateCredentialDefinitionTransaction(client, from, id, cred_def) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.credentialdefinitionregistry_buildCreateCredentialDefinitionTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      addHeapObject(cred_def)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @param {any} cred_def
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildCreateSchemaEndorsingData(client, id, cred_def) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.credentialdefinitionregistry_buildCreateSchemaEndorsingData(
      client.__wbg_ptr,
      ptr0,
      len0,
      addHeapObject(cred_def)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} id
   * @param {any} cred_def
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildCreateCredentialDefinitionSignedTransaction(client, from, id, cred_def, signature_data) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.credentialdefinitionregistry_buildCreateCredentialDefinitionSignedTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      addHeapObject(cred_def),
      addHeapObject(signature_data)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @returns {Promise<Transaction>}
   */
  static buildGetCredentialDefinitionCreatedTransaction(client, id) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.credentialdefinitionregistry_buildGetCredentialDefinitionCreatedTransaction(
      client.__wbg_ptr,
      ptr0,
      len0
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @param {bigint | undefined} [from_block]
   * @param {bigint | undefined} [to_block]
   * @returns {Promise<EventQuery>}
   */
  static buildGetCredentialDefinitionQuery(client, id, from_block, to_block) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.credentialdefinitionregistry_buildGetCredentialDefinitionQuery(
      client.__wbg_ptr,
      ptr0,
      len0,
      !isLikeNone(from_block),
      isLikeNone(from_block) ? BigInt(0) : from_block,
      !isLikeNone(to_block),
      isLikeNone(to_block) ? BigInt(0) : to_block
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {bigint}
   */
  static parseCredentialDefinitionCreatedResult(client, bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc)
      const len0 = WASM_VECTOR_LEN
      wasm.credentialdefinitionregistry_parseCredentialDefinitionCreatedResult(retptr, client.__wbg_ptr, ptr0, len0)
      var r0 = getBigInt64Memory0()[retptr / 8 + 0]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      var r3 = getInt32Memory0()[retptr / 4 + 3]
      if (r3) {
        throw takeObject(r2)
      }
      return BigInt.asUintN(64, r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseCredentialDefinitionCreatedEvent(client, log) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      wasm.credentialdefinitionregistry_parseCredentialDefinitionCreatedEvent(
        retptr,
        client.__wbg_ptr,
        addHeapObject(log)
      )
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @returns {Promise<any>}
   */
  static resolveCredentialDefinition(client, id) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.credentialdefinitionregistry_resolveCredentialDefinition(client.__wbg_ptr, ptr0, len0)
    return takeObject(ret)
  }
}
module.exports.CredentialDefinitionRegistry = CredentialDefinitionRegistry
/**
 */
class EthrDidRegistry {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_ethrdidregistry_free(ptr)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} new_owner
   * @returns {Promise<Transaction>}
   */
  static buildDidChangeOwnerTransaction(client, sender, did, new_owner) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ptr2 = passStringToWasm0(new_owner, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len2 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidChangeOwnerTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      ptr2,
      len2
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {string} new_owner
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidChangeOwnerEndorsingData(client, did, new_owner) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(new_owner, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidChangeOwnerEndorsingData(client.__wbg_ptr, ptr0, len0, ptr1, len1)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} new_owner
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidChangeOwnerSignedTransaction(client, sender, did, new_owner, signature_data) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ptr2 = passStringToWasm0(new_owner, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len2 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidChangeOwnerSignedTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      ptr2,
      len2,
      addHeapObject(signature_data)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @param {bigint} validity
   * @returns {Promise<Transaction>}
   */
  static buildDidAddDelegateTransaction(client, sender, did, delegate_type, delegate, validity) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ptr2 = passStringToWasm0(delegate_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len2 = WASM_VECTOR_LEN
    const ptr3 = passStringToWasm0(delegate, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len3 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidAddDelegateTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      ptr2,
      len2,
      ptr3,
      len3,
      validity
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @param {bigint} validity
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidAddDelegateEndorsingData(client, did, delegate_type, delegate, validity) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(delegate_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ptr2 = passStringToWasm0(delegate, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len2 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidAddDelegateEndorsingData(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      ptr2,
      len2,
      validity
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @param {bigint} validity
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidAddDelegateSignedTransaction(client, sender, did, delegate_type, delegate, validity, signature_data) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ptr2 = passStringToWasm0(delegate_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len2 = WASM_VECTOR_LEN
    const ptr3 = passStringToWasm0(delegate, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len3 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidAddDelegateSignedTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      ptr2,
      len2,
      ptr3,
      len3,
      validity,
      addHeapObject(signature_data)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @returns {Promise<Transaction>}
   */
  static buildDidRevokeDelegateTransaction(client, sender, did, delegate_type, delegate) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ptr2 = passStringToWasm0(delegate_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len2 = WASM_VECTOR_LEN
    const ptr3 = passStringToWasm0(delegate, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len3 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidRevokeDelegateTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      ptr2,
      len2,
      ptr3,
      len3
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidRevokeDelegateEndorsingData(client, did, delegate_type, delegate) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(delegate_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ptr2 = passStringToWasm0(delegate, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len2 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidRevokeDelegateEndorsingData(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      ptr2,
      len2
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidRevokeDelegateSignedTransaction(client, sender, did, delegate_type, delegate, signature_data) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ptr2 = passStringToWasm0(delegate_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len2 = WASM_VECTOR_LEN
    const ptr3 = passStringToWasm0(delegate, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len3 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidRevokeDelegateSignedTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      ptr2,
      len2,
      ptr3,
      len3,
      addHeapObject(signature_data)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {any} attribute
   * @param {bigint} validity
   * @returns {Promise<Transaction>}
   */
  static buildDidSetAttributeTransaction(client, sender, did, attribute, validity) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidSetAttributeTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      addHeapObject(attribute),
      validity
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {any} attribute
   * @param {bigint} validity
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidSetAttributeEndorsingData(client, did, attribute, validity) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidSetAttributeEndorsingData(
      client.__wbg_ptr,
      ptr0,
      len0,
      addHeapObject(attribute),
      validity
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {any} attribute
   * @param {bigint} validity
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidSetAttributeSignedTransaction(client, sender, did, attribute, validity, signature_data) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidSetAttributeSignedTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      addHeapObject(attribute),
      validity,
      addHeapObject(signature_data)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {any} attribute
   * @returns {Promise<Transaction>}
   */
  static buildDidRevokeAttributeTransaction(client, sender, did, attribute) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidRevokeAttributeTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      addHeapObject(attribute)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {any} attribute
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidRevokeAttributeEndorsingData(client, did, attribute) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidRevokeAttributeEndorsingData(
      client.__wbg_ptr,
      ptr0,
      len0,
      addHeapObject(attribute)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {any} attribute
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidRevokeAttributeSignedTransaction(client, sender, did, attribute, signature_data) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(sender, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildDidRevokeAttributeSignedTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      addHeapObject(attribute),
      addHeapObject(signature_data)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @returns {Promise<Transaction>}
   */
  static buildGetDidOwnerTransaction(client, did) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildGetDidOwnerTransaction(client.__wbg_ptr, ptr0, len0)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @returns {Promise<Transaction>}
   */
  static buildGetDidChangedTransaction(client, did) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildGetDidChangedTransaction(client.__wbg_ptr, ptr0, len0)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} identity
   * @returns {Promise<Transaction>}
   */
  static buildGetIdentityNonceTransaction(client, identity) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(identity, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildGetIdentityNonceTransaction(client.__wbg_ptr, ptr0, len0)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {bigint | undefined} [from_block]
   * @param {bigint | undefined} [to_block]
   * @returns {Promise<EventQuery>}
   */
  static buildGetDidEventsQuery(client, did, from_block, to_block) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_buildGetDidEventsQuery(
      client.__wbg_ptr,
      ptr0,
      len0,
      !isLikeNone(from_block),
      isLikeNone(from_block) ? BigInt(0) : from_block,
      !isLikeNone(to_block),
      isLikeNone(to_block) ? BigInt(0) : to_block
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {bigint}
   */
  static parseDidChangedResult(client, bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc)
      const len0 = WASM_VECTOR_LEN
      wasm.ethrdidregistry_parseDidChangedResult(retptr, client.__wbg_ptr, ptr0, len0)
      var r0 = getBigInt64Memory0()[retptr / 8 + 0]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      var r3 = getInt32Memory0()[retptr / 4 + 3]
      if (r3) {
        throw takeObject(r2)
      }
      return BigInt.asUintN(64, r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  static parseDidOwnerResult(client, bytes) {
    let deferred3_0
    let deferred3_1
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc)
      const len0 = WASM_VECTOR_LEN
      wasm.ethrdidregistry_parseDidOwnerResult(retptr, client.__wbg_ptr, ptr0, len0)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      var r3 = getInt32Memory0()[retptr / 4 + 3]
      var ptr2 = r0
      var len2 = r1
      if (r3) {
        ptr2 = 0
        len2 = 0
        throw takeObject(r2)
      }
      deferred3_0 = ptr2
      deferred3_1 = len2
      return getStringFromWasm0(ptr2, len2)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
      wasm.__wbindgen_free(deferred3_0, deferred3_1, 1)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseDidAttributeChangedEventResponse(client, log) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      wasm.ethrdidregistry_parseDidAttributeChangedEventResponse(retptr, client.__wbg_ptr, addHeapObject(log))
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseDidDelegateChangedEventResponse(client, log) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      wasm.ethrdidregistry_parseDidDelegateChangedEventResponse(retptr, client.__wbg_ptr, addHeapObject(log))
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseDidOwnerChangedEventResponse(client, log) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      wasm.ethrdidregistry_parseDidOwnerChangedEventResponse(retptr, client.__wbg_ptr, addHeapObject(log))
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseDidEventResponse(client, log) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      wasm.ethrdidregistry_parseDidEventResponse(retptr, client.__wbg_ptr, addHeapObject(log))
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {any} options
   * @returns {Promise<any>}
   */
  static resolveDid(client, did, options) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(did, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.ethrdidregistry_resolveDid(client.__wbg_ptr, ptr0, len0, addHeapObject(options))
    return takeObject(ret)
  }
}
module.exports.EthrDidRegistry = EthrDidRegistry
/**
 */
class EventQuery {
  static __wrap(ptr) {
    ptr = ptr >>> 0
    const obj = Object.create(EventQuery.prototype)
    obj.__wbg_ptr = ptr

    return obj
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_eventquery_free(ptr)
  }
}
module.exports.EventQuery = EventQuery
/**
 */
class LedgerClient {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_ledgerclient_free(ptr)
  }
  /**
   * @param {number} chain_id
   * @param {string} node_address
   * @param {any} contract_configs
   * @param {any} quorum_config
   */
  constructor(chain_id, node_address, contract_configs, quorum_config) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      const ptr0 = passStringToWasm0(node_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
      const len0 = WASM_VECTOR_LEN
      wasm.ledgerclient_new(retptr, chain_id, ptr0, len0, addHeapObject(contract_configs), addHeapObject(quorum_config))
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      this.__wbg_ptr = r0 >>> 0
      return this
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @returns {Promise<Promise<any>>}
   */
  ping() {
    const ret = wasm.ledgerclient_ping(this.__wbg_ptr)
    return takeObject(ret)
  }
  /**
   * @param {Transaction} transaction
   * @returns {Promise<Promise<any>>}
   */
  submitTransaction(transaction) {
    _assertClass(transaction, Transaction)
    const ret = wasm.ledgerclient_submitTransaction(this.__wbg_ptr, transaction.__wbg_ptr)
    return takeObject(ret)
  }
  /**
   * @param {EventQuery} query
   * @returns {Promise<Promise<any>>}
   */
  queryEvents(query) {
    _assertClass(query, EventQuery)
    const ret = wasm.ledgerclient_queryEvents(this.__wbg_ptr, query.__wbg_ptr)
    return takeObject(ret)
  }
  /**
   * @param {Uint8Array} hash
   * @returns {Promise<Promise<any>>}
   */
  getReceipt(hash) {
    const ptr0 = passArray8ToWasm0(hash, wasm.__wbindgen_malloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.ledgerclient_getReceipt(this.__wbg_ptr, ptr0, len0)
    return takeObject(ret)
  }
}
module.exports.LedgerClient = LedgerClient
/**
 */
class RoleControl {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_rolecontrol_free(ptr)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {number} role
   * @param {string} account
   * @returns {Promise<Transaction>}
   */
  static buildAssignRoleTransaction(client, from, role, account) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(account, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.rolecontrol_buildAssignRoleTransaction(client.__wbg_ptr, ptr0, len0, role, ptr1, len1)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {number} role
   * @param {string} account
   * @returns {Promise<Transaction>}
   */
  static buildRevokeRoleTransaction(client, from, role, account) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(account, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.rolecontrol_buildRevokeRoleTransaction(client.__wbg_ptr, ptr0, len0, role, ptr1, len1)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {number} role
   * @param {string} account
   * @returns {Promise<Transaction>}
   */
  static buildHasRoleTransaction(client, role, account) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(account, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.rolecontrol_buildHasRoleTransaction(client.__wbg_ptr, role, ptr0, len0)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} account
   * @returns {Promise<Transaction>}
   */
  static buildGetRoleTransaction(client, account) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(account, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.rolecontrol_buildGetRoleTransaction(client.__wbg_ptr, ptr0, len0)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {boolean}
   */
  static parseHasRoleResult(client, bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc)
      const len0 = WASM_VECTOR_LEN
      wasm.rolecontrol_parseHasRoleResult(retptr, client.__wbg_ptr, ptr0, len0)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return r0 !== 0
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {number}
   */
  static parseGetRoleResult(client, bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc)
      const len0 = WASM_VECTOR_LEN
      wasm.rolecontrol_parseGetRoleResult(retptr, client.__wbg_ptr, ptr0, len0)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return r0
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
}
module.exports.RoleControl = RoleControl
/**
 */
class SchemaRegistry {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_schemaregistry_free(ptr)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} id
   * @param {any} schema
   * @returns {Promise<Transaction>}
   */
  static buildCreateSchemaTransaction(client, from, id, schema) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.schemaregistry_buildCreateSchemaTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      addHeapObject(schema)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @param {any} schema
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildCreateSchemaEndorsingData(client, id, schema) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.schemaregistry_buildCreateSchemaEndorsingData(client.__wbg_ptr, ptr0, len0, addHeapObject(schema))
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} id
   * @param {any} schema
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildCreateSchemaSignedTransaction(client, from, id, schema, signature_data) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.schemaregistry_buildCreateSchemaSignedTransaction(
      client.__wbg_ptr,
      ptr0,
      len0,
      ptr1,
      len1,
      addHeapObject(schema),
      addHeapObject(signature_data)
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @returns {Promise<Transaction>}
   */
  static buildGetSchemaCreatedTransaction(client, id) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.schemaregistry_buildGetSchemaCreatedTransaction(client.__wbg_ptr, ptr0, len0)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @param {bigint | undefined} [from_block]
   * @param {bigint | undefined} [to_block]
   * @returns {Promise<EventQuery>}
   */
  static buildGetSchemaQuery(client, id, from_block, to_block) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.schemaregistry_buildGetSchemaQuery(
      client.__wbg_ptr,
      ptr0,
      len0,
      !isLikeNone(from_block),
      isLikeNone(from_block) ? BigInt(0) : from_block,
      !isLikeNone(to_block),
      isLikeNone(to_block) ? BigInt(0) : to_block
    )
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {bigint}
   */
  static parseSchemaCreatedResult(client, bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc)
      const len0 = WASM_VECTOR_LEN
      wasm.schemaregistry_parseSchemaCreatedResult(retptr, client.__wbg_ptr, ptr0, len0)
      var r0 = getBigInt64Memory0()[retptr / 8 + 0]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      var r3 = getInt32Memory0()[retptr / 4 + 3]
      if (r3) {
        throw takeObject(r2)
      }
      return BigInt.asUintN(64, r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseSchemaCreatedEvent(client, log) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      wasm.schemaregistry_parseSchemaCreatedEvent(retptr, client.__wbg_ptr, addHeapObject(log))
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @returns {Promise<any>}
   */
  static resolveSchema(client, id) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ret = wasm.schemaregistry_resolveSchema(client.__wbg_ptr, ptr0, len0)
    return takeObject(ret)
  }
}
module.exports.SchemaRegistry = SchemaRegistry
/**
 */
class Transaction {
  static __wrap(ptr) {
    ptr = ptr >>> 0
    const obj = Object.create(Transaction.prototype)
    obj.__wbg_ptr = ptr

    return obj
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_transaction_free(ptr)
  }
  /**
   * @returns {string}
   */
  to() {
    let deferred2_0
    let deferred2_1
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      wasm.transaction_to(retptr, this.__wbg_ptr)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      var r3 = getInt32Memory0()[retptr / 4 + 3]
      var ptr1 = r0
      var len1 = r1
      if (r3) {
        ptr1 = 0
        len1 = 0
        throw takeObject(r2)
      }
      deferred2_0 = ptr1
      deferred2_1 = len1
      return getStringFromWasm0(ptr1, len1)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1)
    }
  }
  /**
   * @returns {Uint8Array}
   */
  getSigningBytes() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      wasm.transaction_getSigningBytes(retptr, this.__wbg_ptr)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      var r3 = getInt32Memory0()[retptr / 4 + 3]
      if (r3) {
        throw takeObject(r2)
      }
      var v1 = getArrayU8FromWasm0(r0, r1).slice()
      wasm.__wbindgen_free(r0, r1 * 1, 1)
      return v1
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {any} signature_data
   */
  setSignature(signature_data) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      wasm.transaction_setSignature(retptr, this.__wbg_ptr, addHeapObject(signature_data))
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      if (r1) {
        throw takeObject(r0)
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
}
module.exports.Transaction = Transaction
/**
 */
class TransactionEndorsingData {
  static __wrap(ptr) {
    ptr = ptr >>> 0
    const obj = Object.create(TransactionEndorsingData.prototype)
    obj.__wbg_ptr = ptr

    return obj
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_transactionendorsingdata_free(ptr)
  }
  /**
   * @returns {Uint8Array}
   */
  getSigningBytes() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      wasm.transactionendorsingdata_getSigningBytes(retptr, this.__wbg_ptr)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      var r3 = getInt32Memory0()[retptr / 4 + 3]
      if (r3) {
        throw takeObject(r2)
      }
      var v1 = getArrayU8FromWasm0(r0, r1).slice()
      wasm.__wbindgen_free(r0, r1 * 1, 1)
      return v1
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
}
module.exports.TransactionEndorsingData = TransactionEndorsingData
/**
 */
class ValidatorControl {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0

    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_validatorcontrol_free(ptr)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} validator_address
   * @returns {Promise<Transaction>}
   */
  static buildAddValidatorTransaction(client, from, validator_address) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(validator_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.validatorcontrol_buildAddValidatorTransaction(client.__wbg_ptr, ptr0, len0, ptr1, len1)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} validator_address
   * @returns {Promise<Transaction>}
   */
  static buildRemoveValidatorTransaction(client, from, validator_address) {
    _assertClass(client, LedgerClient)
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len0 = WASM_VECTOR_LEN
    const ptr1 = passStringToWasm0(validator_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
    const len1 = WASM_VECTOR_LEN
    const ret = wasm.validatorcontrol_buildRemoveValidatorTransaction(client.__wbg_ptr, ptr0, len0, ptr1, len1)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @returns {Promise<Transaction>}
   */
  static buildGetValidatorsTransaction(client) {
    _assertClass(client, LedgerClient)
    const ret = wasm.validatorcontrol_buildGetValidatorsTransaction(client.__wbg_ptr)
    return takeObject(ret)
  }
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {any}
   */
  static parseGetValidatorsResult(client, bytes) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      _assertClass(client, LedgerClient)
      const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc)
      const len0 = WASM_VECTOR_LEN
      wasm.validatorcontrol_parseGetValidatorsResult(retptr, client.__wbg_ptr, ptr0, len0)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
}
module.exports.ValidatorControl = ValidatorControl

module.exports.__wbg_transaction_new = function (arg0) {
  const ret = Transaction.__wrap(arg0)
  return addHeapObject(ret)
}

module.exports.__wbindgen_object_drop_ref = function (arg0) {
  takeObject(arg0)
}

module.exports.__wbg_transactionendorsingdata_new = function (arg0) {
  const ret = TransactionEndorsingData.__wrap(arg0)
  return addHeapObject(ret)
}

module.exports.__wbg_eventquery_new = function (arg0) {
  const ret = EventQuery.__wrap(arg0)
  return addHeapObject(ret)
}

module.exports.__wbindgen_boolean_get = function (arg0) {
  const v = getObject(arg0)
  const ret = typeof v === 'boolean' ? (v ? 1 : 0) : 2
  return ret
}

module.exports.__wbindgen_is_bigint = function (arg0) {
  const ret = typeof getObject(arg0) === 'bigint'
  return ret
}

module.exports.__wbindgen_bigint_from_i64 = function (arg0) {
  const ret = arg0
  return addHeapObject(ret)
}

module.exports.__wbindgen_jsval_eq = function (arg0, arg1) {
  const ret = getObject(arg0) === getObject(arg1)
  return ret
}

module.exports.__wbindgen_bigint_from_u64 = function (arg0) {
  const ret = BigInt.asUintN(64, arg0)
  return addHeapObject(ret)
}

module.exports.__wbindgen_number_get = function (arg0, arg1) {
  const obj = getObject(arg1)
  const ret = typeof obj === 'number' ? obj : undefined
  getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret
  getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret)
}

module.exports.__wbindgen_string_get = function (arg0, arg1) {
  const obj = getObject(arg1)
  const ret = typeof obj === 'string' ? obj : undefined
  var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
  var len1 = WASM_VECTOR_LEN
  getInt32Memory0()[arg0 / 4 + 1] = len1
  getInt32Memory0()[arg0 / 4 + 0] = ptr1
}

module.exports.__wbindgen_is_object = function (arg0) {
  const val = getObject(arg0)
  const ret = typeof val === 'object' && val !== null
  return ret
}

module.exports.__wbindgen_in = function (arg0, arg1) {
  const ret = getObject(arg0) in getObject(arg1)
  return ret
}

module.exports.__wbindgen_is_string = function (arg0) {
  const ret = typeof getObject(arg0) === 'string'
  return ret
}

module.exports.__wbindgen_is_undefined = function (arg0) {
  const ret = getObject(arg0) === undefined
  return ret
}

module.exports.__wbindgen_cb_drop = function (arg0) {
  const obj = takeObject(arg0).original
  if (obj.cnt-- == 1) {
    obj.a = 0
    return true
  }
  const ret = false
  return ret
}

module.exports.__wbindgen_error_new = function (arg0, arg1) {
  const ret = new Error(getStringFromWasm0(arg0, arg1))
  return addHeapObject(ret)
}

module.exports.__wbindgen_object_clone_ref = function (arg0) {
  const ret = getObject(arg0)
  return addHeapObject(ret)
}

module.exports.__wbindgen_jsval_loose_eq = function (arg0, arg1) {
  const ret = getObject(arg0) == getObject(arg1)
  return ret
}

module.exports.__wbindgen_number_new = function (arg0) {
  const ret = arg0
  return addHeapObject(ret)
}

module.exports.__wbindgen_string_new = function (arg0, arg1) {
  const ret = getStringFromWasm0(arg0, arg1)
  return addHeapObject(ret)
}

module.exports.__wbg_getwithrefkey_15c62c2b8546208d = function (arg0, arg1) {
  const ret = getObject(arg0)[getObject(arg1)]
  return addHeapObject(ret)
}

module.exports.__wbg_set_20cbc34131e76824 = function (arg0, arg1, arg2) {
  getObject(arg0)[takeObject(arg1)] = takeObject(arg2)
}

module.exports.__wbg_new_abda76e883ba8a5f = function () {
  const ret = new Error()
  return addHeapObject(ret)
}

module.exports.__wbg_stack_658279fe44541cf6 = function (arg0, arg1) {
  const ret = getObject(arg1).stack
  const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
  const len1 = WASM_VECTOR_LEN
  getInt32Memory0()[arg0 / 4 + 1] = len1
  getInt32Memory0()[arg0 / 4 + 0] = ptr1
}

module.exports.__wbg_error_f851667af71bcfc6 = function (arg0, arg1) {
  let deferred0_0
  let deferred0_1
  try {
    deferred0_0 = arg0
    deferred0_1 = arg1
    console.error(getStringFromWasm0(arg0, arg1))
  } finally {
    wasm.__wbindgen_free(deferred0_0, deferred0_1, 1)
  }
}

module.exports.__wbg_fetch_27eb4c0a08a9ca04 = function (arg0) {
  const ret = fetch(getObject(arg0))
  return addHeapObject(ret)
}

module.exports.__wbg_fetch_06d656a1b748ac0d = function (arg0, arg1) {
  const ret = getObject(arg0).fetch(getObject(arg1))
  return addHeapObject(ret)
}

module.exports.__wbg_new_a979e9eedc5e81a3 = function () {
  return handleError(function () {
    const ret = new Headers()
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_append_047382169b61373d = function () {
  return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4))
  }, arguments)
}

module.exports.__wbg_instanceof_Response_0d25bb8436a9cefe = function (arg0) {
  let result
  try {
    result = getObject(arg0) instanceof Response
  } catch (_) {
    result = false
  }
  const ret = result
  return ret
}

module.exports.__wbg_url_47f8307501523859 = function (arg0, arg1) {
  const ret = getObject(arg1).url
  const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
  const len1 = WASM_VECTOR_LEN
  getInt32Memory0()[arg0 / 4 + 1] = len1
  getInt32Memory0()[arg0 / 4 + 0] = ptr1
}

module.exports.__wbg_status_351700a30c61ba61 = function (arg0) {
  const ret = getObject(arg0).status
  return ret
}

module.exports.__wbg_headers_e38c00d713e8888c = function (arg0) {
  const ret = getObject(arg0).headers
  return addHeapObject(ret)
}

module.exports.__wbg_arrayBuffer_ec4617b29bb0f61c = function () {
  return handleError(function (arg0) {
    const ret = getObject(arg0).arrayBuffer()
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_newwithstrandinit_9fd2fc855c6327eb = function () {
  return handleError(function (arg0, arg1, arg2) {
    const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_signal_7876560d9d0f914c = function (arg0) {
  const ret = getObject(arg0).signal
  return addHeapObject(ret)
}

module.exports.__wbg_new_fa36281638875de8 = function () {
  return handleError(function () {
    const ret = new AbortController()
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_abort_7792bf3f664d7bb3 = function (arg0) {
  getObject(arg0).abort()
}

module.exports.__wbg_clearTimeout_76877dbc010e786d = function (arg0) {
  const ret = clearTimeout(takeObject(arg0))
  return addHeapObject(ret)
}

module.exports.__wbg_setTimeout_75cb9b6991a4031d = function () {
  return handleError(function (arg0, arg1) {
    const ret = setTimeout(getObject(arg0), arg1)
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbindgen_is_function = function (arg0) {
  const ret = typeof getObject(arg0) === 'function'
  return ret
}

module.exports.__wbg_queueMicrotask_118eeb525d584d9a = function (arg0) {
  queueMicrotask(getObject(arg0))
}

module.exports.__wbg_queueMicrotask_26a89c14c53809c0 = function (arg0) {
  const ret = getObject(arg0).queueMicrotask
  return addHeapObject(ret)
}

module.exports.__wbg_get_c43534c00f382c8a = function (arg0, arg1) {
  const ret = getObject(arg0)[arg1 >>> 0]
  return addHeapObject(ret)
}

module.exports.__wbg_length_d99b680fd68bf71b = function (arg0) {
  const ret = getObject(arg0).length
  return ret
}

module.exports.__wbg_new_34c624469fb1d4fd = function () {
  const ret = new Array()
  return addHeapObject(ret)
}

module.exports.__wbg_newnoargs_5859b6d41c6fe9f7 = function (arg0, arg1) {
  const ret = new Function(getStringFromWasm0(arg0, arg1))
  return addHeapObject(ret)
}

module.exports.__wbg_new_ad4df4628315a892 = function () {
  const ret = new Map()
  return addHeapObject(ret)
}

module.exports.__wbg_next_1938cf110c9491d4 = function (arg0) {
  const ret = getObject(arg0).next
  return addHeapObject(ret)
}

module.exports.__wbg_next_267398d0e0761bf9 = function () {
  return handleError(function (arg0) {
    const ret = getObject(arg0).next()
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_done_506b44765ba84b9c = function (arg0) {
  const ret = getObject(arg0).done
  return ret
}

module.exports.__wbg_value_31485d8770eb06ab = function (arg0) {
  const ret = getObject(arg0).value
  return addHeapObject(ret)
}

module.exports.__wbg_iterator_364187e1ee96b750 = function () {
  const ret = Symbol.iterator
  return addHeapObject(ret)
}

module.exports.__wbg_get_5027b32da70f39b1 = function () {
  return handleError(function (arg0, arg1) {
    const ret = Reflect.get(getObject(arg0), getObject(arg1))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_call_a79f1973a4f07d5e = function () {
  return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_new_87d841e70661f6e9 = function () {
  const ret = new Object()
  return addHeapObject(ret)
}

module.exports.__wbg_self_086b5302bcafb962 = function () {
  return handleError(function () {
    const ret = self.self
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_window_132fa5d7546f1de5 = function () {
  return handleError(function () {
    const ret = window.window
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_globalThis_e5f801a37ad7d07b = function () {
  return handleError(function () {
    const ret = globalThis.globalThis
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_global_f9a61fce4af6b7c1 = function () {
  return handleError(function () {
    const ret = global.global
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_set_379b27f1d5f1bf9c = function (arg0, arg1, arg2) {
  getObject(arg0)[arg1 >>> 0] = takeObject(arg2)
}

module.exports.__wbg_isArray_fbd24d447869b527 = function (arg0) {
  const ret = Array.isArray(getObject(arg0))
  return ret
}

module.exports.__wbg_instanceof_ArrayBuffer_f4521cec1b99ee35 = function (arg0) {
  let result
  try {
    result = getObject(arg0) instanceof ArrayBuffer
  } catch (_) {
    result = false
  }
  const ret = result
  return ret
}

module.exports.__wbg_new_3a66822ed076951c = function (arg0, arg1) {
  const ret = new Error(getStringFromWasm0(arg0, arg1))
  return addHeapObject(ret)
}

module.exports.__wbg_call_f6a2bc58c19c53c6 = function () {
  return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_set_83e83bc2428e50ab = function (arg0, arg1, arg2) {
  const ret = getObject(arg0).set(getObject(arg1), getObject(arg2))
  return addHeapObject(ret)
}

module.exports.__wbg_isSafeInteger_d8c89788832a17bf = function (arg0) {
  const ret = Number.isSafeInteger(getObject(arg0))
  return ret
}

module.exports.__wbg_getTime_af7ca51c0bcefa08 = function (arg0) {
  const ret = getObject(arg0).getTime()
  return ret
}

module.exports.__wbg_new0_c0e40662db0749ee = function () {
  const ret = new Date()
  return addHeapObject(ret)
}

module.exports.__wbg_entries_7a47f5716366056b = function (arg0) {
  const ret = Object.entries(getObject(arg0))
  return addHeapObject(ret)
}

module.exports.__wbg_new_1d93771b84541aa5 = function (arg0, arg1) {
  try {
    var state0 = { a: arg0, b: arg1 }
    var cb0 = (arg0, arg1) => {
      const a = state0.a
      state0.a = 0
      try {
        return __wbg_adapter_207(a, state0.b, arg0, arg1)
      } finally {
        state0.a = a
      }
    }
    const ret = new Promise(cb0)
    return addHeapObject(ret)
  } finally {
    state0.a = state0.b = 0
  }
}

module.exports.__wbg_resolve_97ecd55ee839391b = function (arg0) {
  const ret = Promise.resolve(getObject(arg0))
  return addHeapObject(ret)
}

module.exports.__wbg_then_7aeb7c5f1536640f = function (arg0, arg1) {
  const ret = getObject(arg0).then(getObject(arg1))
  return addHeapObject(ret)
}

module.exports.__wbg_then_5842e4e97f7beace = function (arg0, arg1, arg2) {
  const ret = getObject(arg0).then(getObject(arg1), getObject(arg2))
  return addHeapObject(ret)
}

module.exports.__wbg_buffer_5d1b598a01b41a42 = function (arg0) {
  const ret = getObject(arg0).buffer
  return addHeapObject(ret)
}

module.exports.__wbg_newwithbyteoffsetandlength_d695c7957788f922 = function (arg0, arg1, arg2) {
  const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0)
  return addHeapObject(ret)
}

module.exports.__wbg_new_ace717933ad7117f = function (arg0) {
  const ret = new Uint8Array(getObject(arg0))
  return addHeapObject(ret)
}

module.exports.__wbg_set_74906aa30864df5a = function (arg0, arg1, arg2) {
  getObject(arg0).set(getObject(arg1), arg2 >>> 0)
}

module.exports.__wbg_length_f0764416ba5bb237 = function (arg0) {
  const ret = getObject(arg0).length
  return ret
}

module.exports.__wbg_instanceof_Uint8Array_4f5cffed7df34b2f = function (arg0) {
  let result
  try {
    result = getObject(arg0) instanceof Uint8Array
  } catch (_) {
    result = false
  }
  const ret = result
  return ret
}

module.exports.__wbg_has_a2919659b7b645b3 = function () {
  return handleError(function (arg0, arg1) {
    const ret = Reflect.has(getObject(arg0), getObject(arg1))
    return ret
  }, arguments)
}

module.exports.__wbg_set_37a50e901587b477 = function () {
  return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2))
    return ret
  }, arguments)
}

module.exports.__wbg_stringify_daa6661e90c04140 = function () {
  return handleError(function (arg0) {
    const ret = JSON.stringify(getObject(arg0))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbindgen_bigint_get_as_i64 = function (arg0, arg1) {
  const v = getObject(arg1)
  const ret = typeof v === 'bigint' ? v : undefined
  getBigInt64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? BigInt(0) : ret
  getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret)
}

module.exports.__wbindgen_debug_string = function (arg0, arg1) {
  const ret = debugString(getObject(arg1))
  const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
  const len1 = WASM_VECTOR_LEN
  getInt32Memory0()[arg0 / 4 + 1] = len1
  getInt32Memory0()[arg0 / 4 + 0] = ptr1
}

module.exports.__wbindgen_throw = function (arg0, arg1) {
  throw new Error(getStringFromWasm0(arg0, arg1))
}

module.exports.__wbindgen_memory = function () {
  const ret = wasm.memory
  return addHeapObject(ret)
}

module.exports.__wbindgen_closure_wrapper2662 = function (arg0, arg1, arg2) {
  const ret = makeMutClosure(arg0, arg1, 950, __wbg_adapter_48)
  return addHeapObject(ret)
}

module.exports.__wbindgen_closure_wrapper3111 = function (arg0, arg1, arg2) {
  const ret = makeMutClosure(arg0, arg1, 1096, __wbg_adapter_51)
  return addHeapObject(ret)
}

const path = require('path').join(__dirname, 'indy_besu_vdr_wasm_bg.wasm')
const bytes = require('fs').readFileSync(path)

const wasmModule = new WebAssembly.Module(bytes)
const wasmInstance = new WebAssembly.Instance(wasmModule, imports)
wasm = wasmInstance.exports
module.exports.__wasm = wasm
