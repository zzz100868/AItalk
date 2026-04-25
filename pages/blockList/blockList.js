const MOCK_USERS = {
  '陈默': { name: '陈默', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=200&backgroundColor=b6e3f4', bio: '晨间冥想爱好者，相信安静的力量。' },
  '林小雨': { name: '林小雨', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=200&backgroundColor=ffd5dc', bio: '喜欢下雨天、旧书店和手写日记。' },
  '阿北': { name: '阿北', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Abei&size=200&backgroundColor=d1d4f9', bio: '重读旧书的人。相信文字的力量。' },
  '周晚': { name: '周晚', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=200&backgroundColor=e8dff5', bio: '数字断舍离践行者。' },
  '方塘': { name: '方塘', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=200&backgroundColor=c0aede', bio: '深夜手冲咖啡师。' },
  'Kael': { name: 'Kael', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Kael&size=200&backgroundColor=e8dff5', bio: '偏好安静的周末与深度的自我对话。' }
}

Page({
  data: {
    blockedList: []
  },

  onShow() {
    this.loadBlockList()
  },

  loadBlockList() {
    const blockData = wx.getStorageSync('blockData') || { blockedUsers: [] }
    const blockedUsers = blockData.blockedUsers || []
    const list = blockedUsers.map(name => {
      const mock = MOCK_USERS[name]
      return {
        name,
        avatar: mock?.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&size=200&backgroundColor=c7e6f5`,
        bio: mock?.bio || ''
      }
    })
    this.setData({ blockedList: list })
  },

  unblockUser(e) {
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '解除拉黑',
      content: `确定将「${name}」从黑名单中移除吗？`,
      confirmColor: '#c4715a',
      success: (res) => {
        if (res.confirm) {
          const blockData = wx.getStorageSync('blockData') || { blockedUsers: [] }
          blockData.blockedUsers = (blockData.blockedUsers || []).filter(n => n !== name)
          wx.setStorageSync('blockData', blockData)
          this.loadBlockList()
          wx.showToast({ title: '已解除拉黑', icon: 'none' })
        }
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
