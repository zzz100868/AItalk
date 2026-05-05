const common = require('../../utils/common.js')
const api = require('../../utils/api.js')
const mockData = require('../../data/mockData.js')
const storage = common.storage

Page({
  data: {
    isMe: false,
    userInfo: {},
    authorId: ''
  },

  onLoad(options) {
    let author = options.author || ''
    try {
      author = decodeURIComponent(author)
    } catch (e) {}
    if (!author) {
      wx.navigateBack()
      return
    }
    this.setData({ authorId: author })

    // 从 API 获取主页数据
    api.get('/users/' + encodeURIComponent(author) + '/home')
      .then((data) => {
        this.setData({
          isMe: data.isMe,
          userInfo: {
            name: data.name,
            handle: data.handle,
            avatar: data.avatar,
            bio: data.bio
          }
        })
      })
      .catch(() => {
        // 回落本地 mock
        const app = getApp()
        const saved = storage.get('userProfile', {})
        this.setData({
          isMe: true,
          userInfo: {
            name: saved.nickName || mockData.DEFAULT_USER.nickName,
            handle: mockData.DEFAULT_USER.handle,
            avatar: saved.avatar || app.globalData.userInfo.avatarUrl || mockData.DEFAULT_USER.avatar,
            bio: saved.bio || mockData.DEFAULT_USER.bio
          }
        })
      })
  },

  onShow() {
    const author = this.data.authorId
    if (!author) return

    if (this.data.isMe) {
      const saved = storage.get('userProfile', {})
      const app = getApp()
      this.setData({
        'userInfo.name': saved.nickName || app.globalData.userInfo.nickName || mockData.DEFAULT_USER.nickName,
        'userInfo.avatar': saved.avatar || app.globalData.userInfo.avatarUrl || mockData.DEFAULT_USER.avatar,
        'userInfo.bio': saved.bio || mockData.DEFAULT_USER.bio
      })
    }
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/pages/editProfile/editProfile' })
  },

  goBack() {
    wx.navigateBack()
  }
})
