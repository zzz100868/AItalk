const MOCK_CHAT_USERS = {
  '陈默': {
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=200&backgroundColor=b6e3f4'
  },
  '林小雨': {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=200&backgroundColor=ffd5dc'
  }
}

const MOCK_MESSAGES = {
  '陈默': [
    { id: 1, content: '最近还在坚持冥想吗？', time: Date.now() - 86400000 * 2, self: false },
    { id: 2, content: '有的，每天早上十五分钟。', time: Date.now() - 86400000 * 2 + 3600000, self: true }
  ],
  '林小雨': [
    { id: 3, content: '周末去山里吗？', time: Date.now() - 86400000, self: false }
  ]
}

Page({
  data: {
    conversations: [],
    userAvatar: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.loadUserInfo()
    this.loadConversations()
  },

  loadUserInfo() {
    const saved = wx.getStorageSync('userProfile')
    const app = getApp()
    this.setData({
      userAvatar: saved?.avatar || app.globalData?.userInfo?.avatarUrl || 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5'
    })
  },

  loadConversations() {
    let messages = wx.getStorageSync('privateMessages') || null
    if (!messages) {
      messages = {}
      for (const name in MOCK_MESSAGES) {
        messages[name] = {
          avatar: MOCK_CHAT_USERS[name]?.avatar || '',
          messages: MOCK_MESSAGES[name]
        }
      }
      wx.setStorageSync('privateMessages', messages)
    }

    const conversations = []
    for (const name in messages) {
      const item = messages[name]
      const msgs = item.messages || []
      const lastMsg = msgs[msgs.length - 1]
      conversations.push({
        name,
        avatar: item.avatar || '',
        lastContent: lastMsg ? (lastMsg.type === 'image' ? '[图片]' : lastMsg.content) : '',
        lastTime: lastMsg ? this._formatTime(lastMsg.time) : '',
        unread: 0
      })
    }

    conversations.sort((a, b) => {
      const msgsA = messages[a.name]?.messages || []
      const msgsB = messages[b.name]?.messages || []
      const timeA = msgsA[msgsA.length - 1]?.time || 0
      const timeB = msgsB[msgsB.length - 1]?.time || 0
      return timeB - timeA
    })

    this.setData({ conversations })
  },

  _formatTime(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 86400000 * 2) return '昨天'
    const d = new Date(timestamp)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  goToChatDetail(e) {
    const user = e.currentTarget.dataset.user
    wx.navigateTo({ url: `/pages/chatDetail/chatDetail?user=${encodeURIComponent(user)}` })
  },

  goToUserHome(e) {
    const author = e.currentTarget.dataset.author
    if (!author) return
    wx.navigateTo({ url: `/pages/userHome/userHome?author=${encodeURIComponent(author)}` })
  },

  onConversationLongPress(e) {
    const user = e.currentTarget.dataset.user
    wx.showActionSheet({
      itemList: ['删除聊天'],
      itemColor: '#ff4d4f',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.deleteConversation(user)
        }
      }
    })
  },

  deleteConversation(user) {
    const all = wx.getStorageSync('privateMessages') || {}
    delete all[user]
    wx.setStorageSync('privateMessages', all)

    const conversations = this.data.conversations.filter(c => c.name !== user)
    this.setData({ conversations })
  }
})
