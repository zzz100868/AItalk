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

  loadStats() {
    const followData = wx.getStorageSync('followData') || { following: [], followerCounts: {} }
    this.setData({
      'stats.following': (followData.following || []).length,
      'stats.followers': followData.followerCounts['林夕'] || '3.2k'
    })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
    this.loadUserInfo()
    this.loadStats()
  },

  onLoad() {
    this.loadUserInfo()
  },

  loadUserInfo() {
    const app = getApp()
    const cache = app.globalData._cache
    const saved = cache?.profile || wx.getStorageSync('userProfile') || {}
    this.setData({
      'userInfo.avatar': saved.avatar || app.globalData.userInfo.avatarUrl || this.data.userInfo.avatar,
      'userInfo.nickName': saved.nickName || app.globalData.userInfo.nickName || this.data.userInfo.nickName,
      'userInfo.bio': saved.bio || this.data.userInfo.bio
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
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  copyId() {
    wx.setClipboardData({
      data: this.data.userInfo.id,
      success: () => {
        wx.showToast({ title: '已复制 ID', icon: 'none' })
      }
    })
  },

  goToMyHome() {
    wx.navigateTo({ url: '/pages/userHome/userHome?author=林夕' })
  }
})
