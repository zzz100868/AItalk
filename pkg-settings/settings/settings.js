var common = require('../../utils/common.js')
var storage = common.storage
var mockData = require('../../data/mockData.js')
var connectPage = require('../../stores/connect.js').connectPage

Page({
  behaviors: [
    connectPage('user', function (state) {
      return {
        'userInfo.avatar': state.avatar || mockData.DEFAULT_USER.avatar,
        'userInfo.nickName': state.nickName || mockData.DEFAULT_USER.nickName
      }
    })
  ],

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

  calcCacheSize() {
    try {
      var info = wx.getStorageInfoSync()
      var kb = info.currentSize
      var size = kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'
      this.setData({ cacheSize: size })
    } catch (e) {
      this.setData({ cacheSize: '0 KB' })
    }
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/pkg-settings/editProfile/editProfile' })
  },

  goToAccountSecurity() {
    wx.navigateTo({ url: '/pkg-settings/accountSecurity/accountSecurity' })
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除图片和临时缓存吗？你的资料、记忆和照片不会被删除。',
      confirmColor: '#c4715a',
      success: (res) => {
        if (res.confirm) {
          try {
            var info = wx.getStorageInfoSync()
            var keysToKeep = ['userProfile', 'userSettings', 'memoryInsights', 'profilePhotos',
              '_store_user_avatar', '_store_user_nickName', '_store_user_bio', '_store_user_photos']
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
