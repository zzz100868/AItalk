const mockData = require('./data/mockData.js')
const api = require('./utils/api.js')

App({
  onLaunch() {
    console.log('赛博聊机小程序启动')
    this._hasEntered = false
    this._prefetchData()
    this._tryLogin()
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

  /** 微信静默登录 -> 拿 JWT + 用户信息 */
  _tryLogin() {
    const existingToken = api.getToken()
    if (existingToken && wx.getStorageSync('userProfile')) {
      // 已有 token 和缓存，跳过重新登录
      return
    }

    wx.login({
      success: (res) => {
        if (!res.code) {
          console.warn('[auth] wx.login failed:', res.errMsg)
          return
        }
        api.post('/auth/wx-login', { code: res.code }, { noAuth: true })
          .then((data) => {
            api.setToken(data.token)
            // 写 storage + globalData
            const profile = {
              id: data.user.id,
              nickName: data.user.nickname,
              avatar: data.user.avatar,
              bio: data.user.bio,
            }
            wx.setStorageSync('userProfile', profile)
            this.globalData.userInfo.nickName = data.user.nickname
            this.globalData.userInfo.avatarUrl = data.user.avatar
            this.globalData.userInfo.id = data.user.id
            if (this.globalData._cache) {
              this.globalData._cache.profile = profile
            }
            console.log('[auth] login ok, user:', data.user.id)
          })
          .catch((err) => {
            console.warn('[auth] wx-login api failed:', err.message || err)
          })
      },
      fail: (err) => {
        console.warn('[auth] wx.login error:', err.errMsg)
      },
    })
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
