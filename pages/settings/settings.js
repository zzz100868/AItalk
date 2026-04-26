Page({
  data: {
    userInfo: {
      nickName: '林夕',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=400&backgroundColor=c7e6f5',
      id: 'LX_9527'
    },
    settings: {},
    cacheSize: '12.5 MB',
    version: '1.0.0'
  },

  onLoad() {
    const app = getApp()
    const cache = app.globalData._cache
    const saved = cache?.settings || wx.getStorageSync('userSettings') || {}
    if (saved) {
      this.setData({ settings: { ...this.data.settings, ...saved } })
    }
    this.calcCacheSize()
  },

  onShow() {
    const app = getApp()
    const cache = app.globalData._cache
    const saved = cache?.profile || wx.getStorageSync('userProfile') || {}
    if (saved) {
      this.setData({
        'userInfo.avatar': saved.avatar || this.data.userInfo.avatar,
        'userInfo.nickName': saved.nickName || this.data.userInfo.nickName
      })
    }
  },

  calcCacheSize() {
    // 模拟计算缓存大小
    const size = (Math.random() * 20 + 5).toFixed(1)
    this.setData({ cacheSize: `${size} MB` })
  },

  toggleSetting(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    const settings = { ...this.data.settings, [key]: value }
    this.setData({ settings })
    wx.setStorageSync('userSettings', settings)
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/pages/editProfile/editProfile' })
  },

  goToAccountSecurity() {
    wx.navigateTo({ url: '/pages/accountSecurity/accountSecurity' })
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: `确定要清除 ${this.data.cacheSize} 的缓存吗？`,
      confirmColor: '#c4715a',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.showToast({ title: '缓存已清除', icon: 'success' })
              this.setData({ cacheSize: '0 MB' })
            }
          })
        }
      }
    })
  },

  goToUserAgreement() {
    wx.showToast({ title: '用户协议', icon: 'none' })
  },

  goToPrivacyPolicy() {
    wx.showToast({ title: '隐私政策', icon: 'none' })
  },

  checkUpdate() {
    wx.showLoading({ title: '检查中...' })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '已是最新版本', icon: 'none' })
    }, 800)
  },

  goBack() {
    wx.navigateBack()
  }
})
