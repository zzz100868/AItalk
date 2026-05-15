interface StoreOptions<T> {
  persist?: (keyof T)[]
  computed?: Record<string, (state: T) => any>
}

interface Subscriber<T> {
  mapState: (state: T) => Record<string, any>
  lastMapped: Record<string, any>
  ctx: any
}

function diffMapped(prev: Record<string, any> | null, next: Record<string, any>): Record<string, any> | null {
  const patch: Record<string, any> = {}
  let hasChange = false
  for (const key in next) {
    if (next[key] !== (prev ? prev[key] : undefined)) {
      patch[key] = next[key]
      hasChange = true
    }
  }
  return hasChange ? patch : null
}

const storage = require('../utils/common.js').storage

class Store<T extends Record<string, any>> {
  private _name: string
  private _subscribers: Map<number, Subscriber<T>>
  private _subId: number
  private _batchDepth: number
  private _batchDirty: boolean
  private _persistKeys: (keyof T)[]
  private _computedDefs: Record<string, (state: T) => any>
  private _computedCache: Record<string, any>
  private _dirtyKeys: Set<string>
  private _raw: T
  state: T

  constructor(name: string, initialState: T, options?: StoreOptions<T>) {
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

    const persisted = this._loadPersisted()
    this._raw = Object.assign({}, initialState, persisted)

    const self = this
    this.state = new Proxy(this._raw, {
      get: function (target: T, key: string | symbol) {
        if (typeof key === 'string' && key in self._computedDefs) {
          return self._getComputed(key)
        }
        return target[key as keyof T]
      },
      set: function (target: T, key: string | symbol, value: any) {
        const k = key as string
        if (target[k] === value) return true
        target[k] = value
        self._dirtyKeys.add(k)
        self._invalidateComputed()
        if (self._batchDepth > 0) {
          self._batchDirty = true
        } else {
          self._persistDirty()
          self._notify()
        }
        return true
      }
    }) as T
  }

  getState(): T & Record<string, any> {
    const snapshot: Record<string, any> = {}
    for (const key in this._raw) {
      snapshot[key] = this._raw[key]
    }
    for (const ck in this._computedDefs) {
      snapshot[ck] = this._getComputed(ck)
    }
    return snapshot as T & Record<string, any>
  }

  setState(partial: Partial<T>): void {
    this._batchDepth++
    try {
      for (const key in partial) {
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

  subscribe(mapState: (state: T) => Record<string, any>, pageCtx: any): number {
    const id = ++this._subId
    const mapped = mapState(this.state)
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

  unsubscribe(id: number): void {
    this._subscribers.delete(id)
  }

  _resync(id: number): void {
    const sub = this._subscribers.get(id)
    if (!sub || !sub.ctx) return
    const mapped = sub.mapState(this.state)
    const patch = diffMapped(sub.lastMapped, mapped)
    if (patch) {
      sub.lastMapped = mapped
      sub.ctx.setData(patch)
    }
  }

  _notify(): void {
    this._subscribers.forEach(function (sub: Subscriber<T>) {
      try {
        if (!sub.ctx) return
        const mapped = sub.mapState(this.state)
        const patch = diffMapped(sub.lastMapped, mapped)
        if (patch) {
          sub.lastMapped = mapped
          sub.ctx.setData(patch)
        }
      } catch (e) {
        console.error('[Store] notify error:', e)
      }
    }.bind(this))
    this._dirtyKeys.clear()
  }

  _getComputed(key: string): any {
    if (key in this._computedCache) return this._computedCache[key]
    const fn = this._computedDefs[key]
    if (!fn) return undefined
    const val = fn(this._raw)
    this._computedCache[key] = val
    return val
  }

  _invalidateComputed(): void {
    this._computedCache = {}
  }

  _loadPersisted(): Partial<T> {
    const result: Partial<T> = {}
    for (let i = 0; i < this._persistKeys.length; i++) {
      const key = this._persistKeys[i]
      const storageKey = '_store_' + this._name + '_' + String(key)
      const val = storage.get(storageKey, null)
      if (val !== null) {
        result[key] = val
      }
    }
    return result
  }

  _persistDirty(): void {
    for (let i = 0; i < this._persistKeys.length; i++) {
      const key = this._persistKeys[i]
      if (this._dirtyKeys.has(String(key))) {
        const storageKey = '_store_' + this._name + '_' + String(key)
        storage.set(storageKey, this._raw[key])
      }
    }
  }
}

export = Store
