var common = require('../../utils/common.js')
var mockData = require('../../data/mockData.js')
var userStore = require('../../stores/userStore.js')

Page({
  data: {
    isMe: false,
    userInfo: {},
    authorId: ''
  },

  onLoad(options) {
    var author = options.author || ''
    try {
      author = decodeURIComponent(author)
    } catch (e) {}
    if (!author) {
      wx.navigateBack()
      return
    }
    this.setData({ authorId: author })

    var isMe = author === common.loadUserInfo().name

    if (isMe) {
      var state = userStore.getState()
      this.setData({
        isMe: true,
        userInfo: {
          name: state.nickName || mockData.DEFAULT_USER.nickName,
          handle: mockData.DEFAULT_USER.handle,
          avatar: state.avatar || mockData.DEFAULT_USER.avatar,
          bio: state.bio || mockData.DEFAULT_USER.bio
        }
      })
    } else {
      this.setData({
        isMe: false,
        userInfo: {
          name: author,
          handle: '',
          avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=' + encodeURIComponent(author) + '&size=400&backgroundColor=c7e6f5',
          bio: ''
        }
      })
    }
  },

  onShow() {
    var author = this.data.authorId
    if (!author || !this.data.isMe) return

    var state = userStore.getState()
    this.setData({
      'userInfo.name': state.nickName || mockData.DEFAULT_USER.nickName,
      'userInfo.avatar': state.avatar || mockData.DEFAULT_USER.avatar,
      'userInfo.bio': state.bio || mockData.DEFAULT_USER.bio
    })
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/pkg-settings/editProfile/editProfile' })
  },

  goBack() {
    wx.navigateBack()
  }
})
