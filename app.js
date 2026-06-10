var api = require('./utils/api.js')
var userStore = require('./stores/userStore.js')

require('./stores/index.js')

App({
  onLaunch() {
    console.log('赛博聊机小程序启动')
    this._hasEntered = false
    this._doLogin()
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

  _doLogin() {
    console.log('[App] _doLogin started')
    console.log('[App] BASE_URL=' + api.BASE_URL)
    console.log('[App] token before wx.login=' + (api.getToken() || 'null'))
    wx.login({
      success: function (res) {
        console.log('[App] wx.login success | errMsg=' + (res.errMsg || 'ok') + ' | code=' + (res.code ? res.code.slice(0, 10) + '...' : 'null') + ' | codeLen=' + (res.code ? res.code.length : 0))
        if (!res.code) {
          console.warn('[App] wx.login code 为空，终止登录')
          return
        }
        api.login(res.code).then(function (data) {
          console.log('[App] 登录成功 | data=' + JSON.stringify(data))
          console.log('[App] 登录成功 userId=' + (data.user && data.user.id))
          console.log('[App] token after login=' + (api.getToken() || 'null').slice(0, 30) + '...')
          if (data.user) {
            var patch = {}
            if (data.user.nickname) patch.nickName = data.user.nickname
            if (data.user.avatar) patch.avatar = data.user.avatar
            if (data.user.bio !== undefined) patch.bio = data.user.bio
            if (data.user.id) patch.id = data.user.id
            console.log('[App] patch=' + JSON.stringify(patch))
            if (Object.keys(patch).length > 0) {
              userStore.setState(patch)
              console.log('[App] userStore updated')
            }
          } else {
            console.log('[App] data.user 为空')
          }
        }).catch(function (err) {
          console.log('[App] 后端不可用 | err=' + JSON.stringify(err))
          console.log('[App] token at failure=' + (api.getToken() || 'null'))
          wx.showModal({ title: '登录失败', content: JSON.stringify(err), showCancel: false })
        })
      },
      fail: function (err) {
        console.log('[App] wx.login FAIL | err=' + JSON.stringify(err))
      }
    })
  },

  globalData: {}
})
