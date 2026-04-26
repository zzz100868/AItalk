const common = require('../../utils/common.js')
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

    const app = getApp()
    const isMe = author === common.loadUserInfo().name

    if (isMe) {
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
    } else {
      this.setData({
        isMe: false,
        userInfo: {
          name: author,
          handle: '',
          avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(author)}&size=400&backgroundColor=c7e6f5`,
          bio: ''
        }
      })
    }
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
