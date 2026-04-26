const common = require('../../utils/common.js')
const storage = common.storage
const userStore = require('../../stores/userStore.js')
const mockData = require('../../data/mockData.js')

Page({
  data: {
    userInfo: {
      nickName: mockData.DEFAULT_USER.nickName,
      avatar: mockData.DEFAULT_USER.avatar,
      id: mockData.DEFAULT_USER.id
    },
    cacheSize: '12.5 MB',
    version: '1.0.0'
  },

  onLoad() {
    this.calcCacheSize()
  },

  onShow() {
    const profile = userStore.getProfile()
    this.setData({
      'userInfo.avatar': profile.avatar,
      'userInfo.nickName': profile.nickName
    })
  },

  calcCacheSize() {
    try {
      const info = wx.getStorageInfoSync()
      const kb = info.currentSize
      const size = kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'
      this.setData({ cacheSize: size })
    } catch (e) {
      this.setData({ cacheSize: '0 KB' })
    }
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
      content: '确定要清除图片和临时缓存吗？你的资料、记忆和照片不会被删除。',
      confirmColor: '#c4715a',
      success: (res) => {
        if (res.confirm) {
          try {
            const info = wx.getStorageInfoSync()
            const keysToKeep = ['userProfile', 'userSettings', 'memoryInsights', 'profilePhotos']
            info.keys.forEach(key => {
              if (!keysToKeep.includes(key)) {
                storage.remove(key)
              }
            })
            wx.showToast({ title: '缓存已清除', icon: 'success' })
            this.calcCacheSize()
          } catch (e) {
            wx.showToast({ title: '清除失败', icon: 'none' })
          }
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
