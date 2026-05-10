function diffMapped(prev, next) {
  const patch = {}
  let hasChange = false
  for (const key in next) {
    if (next[key] !== (prev ? prev[key] : undefined)) {
      patch[key] = next[key]
      hasChange = true
    }
  }
  return hasChange ? patch : null
}

var storage = require('../utils/common.js').storage

class Store {
  constructor(name, initialState, options) {
    options = options || {}
    this._name = name
    this._subscribers = new Map()
    this._subId = 0
    this._batchDepth = 0
    this._batchDirty = false
    this._persistKeys = options.persist || []
    this._computedDefs = options.computed || {}
    this._computedCache = {}
    this._dirtyKeys = new Set()

    var persisted = this._loadPersisted()
    this._raw = Object.assign({}, initialState, persisted)

    var self = this
    this.state = new Proxy(this._raw, {
      get: function (target, key) {
        if (key in self._computedDefs) {
          return self._getComputed(key)
        }
        return target[key]
      },
      set: function (target, key, value) {
        if (target[key] === value) return true
        target[key] = value
        self._dirtyKeys.add(key)
        self._invalidateComputed()
        if (self._batchDepth > 0) {
          self._batchDirty = true
        } else {
          self._persistDirty()
          self._notify()
        }
        return true
      }
    })
  }

  getState() {
    var snapshot = {}
    for (var key in this._raw) {
      snapshot[key] = this._raw[key]
    }
    for (var ck in this._computedDefs) {
      snapshot[ck] = this._getComputed(ck)
    }
    return snapshot
  }

  setState(partial) {
    this._batchDepth++
    try {
      for (var key in partial) {
        this.state[key] = partial[key]
      }
    } finally {
      this._batchDepth--
      if (this._batchDepth === 0 && this._batchDirty) {
        this._batchDirty = false
        this._persistDirty()
        this._notify()
      }
    }
  }

  subscribe(mapState, pageCtx) {
    var id = ++this._subId
    var mapped = mapState(this.state)
    this._subscribers.set(id, {
      mapState: mapState,
      lastMapped: mapped,
      ctx: pageCtx
    })
    if (pageCtx && typeof pageCtx.setData === 'function') {
      pageCtx.setData(mapped)
    }
    return id
  }

  unsubscribe(id) {
    this._subscribers.delete(id)
  }

  _resync(id) {
    var sub = this._subscribers.get(id)
    if (!sub || !sub.ctx) return
    var mapped = sub.mapState(this.state)
    var patch = diffMapped(sub.lastMapped, mapped)
    if (patch) {
      sub.lastMapped = mapped
      sub.ctx.setData(patch)
    }
  }

  _notify() {
    this._subscribers.forEach(function (sub) {
      if (!sub.ctx) return
      var mapped = sub.mapState(this.state)
      var patch = diffMapped(sub.lastMapped, mapped)
      if (patch) {
        sub.lastMapped = mapped
        sub.ctx.setData(patch)
      }
    }.bind(this))
    this._dirtyKeys.clear()
  }

  _getComputed(key) {
    if (key in this._computedCache) return this._computedCache[key]
    var fn = this._computedDefs[key]
    if (!fn) return undefined
    var val = fn(this._raw)
    this._computedCache[key] = val
    return val
  }

  _invalidateComputed() {
    this._computedCache = {}
  }

  _loadPersisted() {
    var result = {}
    for (var i = 0; i < this._persistKeys.length; i++) {
      var key = this._persistKeys[i]
      var storageKey = '_store_' + this._name + '_' + key
      var val = storage.get(storageKey, null)
      if (val !== null) {
        result[key] = val
      }
    }
    return result
  }

  _persistDirty() {
    for (var i = 0; i < this._persistKeys.length; i++) {
      var key = this._persistKeys[i]
      if (this._dirtyKeys.has(key)) {
        var storageKey = '_store_' + this._name + '_' + key
        storage.set(storageKey, this._raw[key])
      }
    }
  }
}

module.exports = Store
