var api = require('../utils/api.js')

Component({
  data: {
    selected: 0,
    unreadCount: 0,
    list: [
      { pagePath: '/pages/match/match', text: '匹配', icon: 'icon-match' },
      { pagePath: '/pages/memory/memory', text: '记忆库', icon: 'icon-memory' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: 'icon-profile' }
    ]
  },

  ready() {
    var self = this
    this._fetchUnread()
    this._pollTimer = setInterval(function () {
      self._fetchUnread()
    }, 10000)
  },

  detached() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    },

    _fetchUnread() {
      var self = this
      var app = getApp()

      api.getNotifications({ limit: 1 }).then(function (res) {
        var count = (res && res.unreadCount) || 0
        self.setData({ unreadCount: count })
        app.globalData.unreadCount = count
      }).catch(function () {
        // fallback to cached value
        var cached = (getApp().globalData.unreadCount) || 0
        if (cached !== self.data.unreadCount) {
          self.setData({ unreadCount: cached })
        }
      })
    }
  }
})
