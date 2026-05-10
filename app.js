require('./stores/index.js')

App({
  onLaunch() {
    console.log('赛博聊机小程序启动')
    this._hasEntered = false
  },

  onShow() {
    if (!this._hasEntered) {
      this._hasEntered = true
      return
    }

    if (this._ignoreRelaunch) {
      this._ignoreRelaunch = false
    }
  },

  globalData: {}
})
