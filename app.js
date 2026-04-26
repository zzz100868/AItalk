const mockData = require('./data/mockData.js')

App({
  onLaunch() {
    console.log('赛博聊机小程序启动')
    this._hasEntered = false
    this._prefetchData()
  },

  onShow() {
    // 首次启动不做处理
    if (!this._hasEntered) {
      this._hasEntered = true
      return
    }

    // 清理原生组件调用期间设置的后台返回标记
    if (this._ignoreRelaunch) {
      this._ignoreRelaunch = false
    }
  },

  _prefetchData() {
    const profile = wx.getStorageSync('userProfile') || {}
    const settings = wx.getStorageSync('userSettings') || {}

    this.globalData.userInfo.nickName = profile.nickName || this.globalData.userInfo.nickName
    this.globalData.userInfo.avatarUrl = profile.avatar || this.globalData.userInfo.avatarUrl

    // 内存缓存，避免页面反复读 storage
    this.globalData._cache = {
      profile,
      settings
    }
  },

  globalData: {
    userInfo: {
      nickName: mockData.DEFAULT_USER.nickName,
      avatarUrl: '',
      id: mockData.DEFAULT_USER.id
    },
    _cache: null,
    memoryTargetTab: null
  }
})
