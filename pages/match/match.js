Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  data: {
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
    matchAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Kael&size=400&backgroundColor=e8dff5',
    matchName: 'Kael',
    matchBio: '偏好安静的周末与深度的自我对话',
    compatibility: 98,
    tags: ['手冲咖啡', '深夜阅读', '安静'],
    icebreakers: [
      '看到你也喜欢在清晨喝手冲咖啡，有什么推荐的豆子吗？',
      '你的主页有一种很安静的力量，周末通常怎么度过？'
    ],
    showChat: false,
    chatMessages: [
      { id: 1, sender: 'match', content: '嗨，很高兴认识你。我是 Kael。' }
    ],
    chatInput: ''
  },

  startChat() {
    this.setData({ showChat: true })
  },

  closeChat() {
    this.setData({ showChat: false })
  },

  onChatInput(e) {
    this.setData({ chatInput: e.detail.value })
  },

  sendMessage() {
    const content = this.data.chatInput.trim()
    if (!content) return

    const newMsg = { id: Date.now(), sender: 'user', content }
    const messages = [...this.data.chatMessages, newMsg]
    this.setData({ chatMessages: messages, chatInput: '' })

    setTimeout(() => {
      const replies = [
        '这个角度很有意思，能再多说说吗？',
        '我也有类似的经历，感觉真的很奇妙。',
        '哈哈哈，完全理解你的感受。',
        '嗯……让我想想，可能是因为我们都喜欢安静吧。',
        '说得太好了，我也一直在思考这个问题。'
      ]
      const reply = replies[Math.floor(Math.random() * replies.length)]
      this.setData({
        chatMessages: [...this.data.chatMessages, { id: Date.now() + 1, sender: 'match', content: reply }]
      })
    }, 1200)
  },

  copyIcebreaker(e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'none' })
      }
    })
  }
})
