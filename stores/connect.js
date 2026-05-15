var stores = require('./index.js')

function connectPage(storeName, mapState) {
  return Behavior({
    definitionFilter: function (defFields) {
      var origOnLoad = defFields.onLoad
      var origOnShow = defFields.onShow
      var origOnUnload = defFields.onUnload

      defFields.onLoad = function (opts) {
        var store = stores[storeName]
        if (store) {
          this._storeSubIds = this._storeSubIds || {}
          this._storeSubIds[storeName] = store.subscribe(mapState, this)
        }
        if (origOnLoad) origOnLoad.call(this, opts)
      }

      defFields.onShow = function () {
        var store = stores[storeName]
        var subIds = this._storeSubIds
        if (store && subIds && subIds[storeName]) {
          store._resync(subIds[storeName])
        }
        if (origOnShow) origOnShow.call(this)
      }

      defFields.onUnload = function () {
        var store = stores[storeName]
        var subIds = this._storeSubIds
        if (store && subIds && subIds[storeName]) {
          store.unsubscribe(subIds[storeName])
          delete subIds[storeName]
        }
        if (origOnUnload) origOnUnload.call(this)
      }
    }
  })
}

function connectComponent(storeName, mapState) {
  return Behavior({
    lifetimes: {
      attached: function () {
        var store = stores[storeName]
        if (store) {
          this._storeSubIds = this._storeSubIds || {}
          this._storeSubIds[storeName] = store.subscribe(mapState, this)
        }
      },
      detached: function () {
        var store = stores[storeName]
        var subIds = this._storeSubIds
        if (store && subIds && subIds[storeName]) {
          store.unsubscribe(subIds[storeName])
          delete subIds[storeName]
        }
      }
    },
    pageLifetimes: {
      show: function () {
        var store = stores[storeName]
        var subIds = this._storeSubIds
        if (store && subIds && subIds[storeName]) {
          store._resync(subIds[storeName])
        }
      }
    }
  })
}

module.exports = {
  connectPage: connectPage,
  connectComponent: connectComponent
}
