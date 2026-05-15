var Store = require('./store.js')

var appStore = new Store('app', {
  memoryTargetTab: null
})

module.exports = appStore
