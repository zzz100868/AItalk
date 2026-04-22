Page({
  data: {
    userInfo: {
      nickName: '林夕',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=400&backgroundColor=c7e6f5',
      id: 'LX_9527',
      bio: '在喧嚣中寻找宁静。🌿✨'
    },
    stats: {
      following: 128,
      followers: '3.2k',
      likes: '15k'
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
  },

  onLoad() {
    const app = getApp()
    this.setData({
      'userInfo.avatar': app.globalData.userInfo.avatarUrl || this.data.userInfo.avatar
    })
  },

  goToFollowers() {
    wx.navigateTo({ url: '/pages/followers/followers' })
  },

  goToFollowing() {
    wx.navigateTo({ url: '/pages/following/following' })
  },

  goToMoments() {
    wx.navigateTo({ url: '/pages/moments/moments' })
  },

  goToAppearance() {
    wx.showToast({ title: '我的形象', icon: 'none' })
  },

  goToSettings() {
    wx.showToast({ title: '设置', icon: 'none' })
  },

  copyId() {
    wx.setClipboardData({
      data: this.data.userInfo.id,
      success: () => {
        wx.showToast({ title: '已复制 ID', icon: 'none' })
      }
    })
  }
})
