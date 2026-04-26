Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/match/match', text: '匹配', icon: 'icon-match' },
      { pagePath: '/pages/memory/memory', text: '记忆库', icon: 'icon-memory' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: 'icon-profile' }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    }
  }
})
