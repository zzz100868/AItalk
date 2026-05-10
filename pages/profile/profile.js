var common = require('../../utils/common.js')
var userStore = require('../../stores/userStore.js')
var mockData = require('../../data/mockData.js')
var tabPage = require('../../behaviors/tabPage.js')
var connectPage = require('../../stores/connect.js').connectPage

Page({
  behaviors: [
    tabPage(2),
    connectPage('user', function (state) {
      return {
        'userInfo.avatar': state.avatar || mockData.DEFAULT_USER.avatar,
        'userInfo.nickName': state.nickName || mockData.DEFAULT_USER.nickName,
        'userInfo.bio': state.bio || mockData.DEFAULT_USER.bio,
        photos: state.photos || []
      }
    })
  ],

  data: {
    userInfo: {
      nickName: mockData.DEFAULT_USER.nickName,
      avatar: mockData.DEFAULT_USER.avatar,
      id: mockData.DEFAULT_USER.id,
      bio: mockData.DEFAULT_USER.bio
    },
    photos: []
  },

  choosePhoto() {
    var remain = 8 - this.data.photos.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传8张', icon: 'none' })
      return
    }
    common.safeChooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        var newPaths = res.tempFiles.map(f => f.tempFilePath)
        var photos = [...this.data.photos, ...newPaths].slice(0, 8)
        userStore.setState({ photos: photos })
      }
    })
  },

  previewPhoto(e) {
    var index = e.currentTarget.dataset.index
    common.safePreviewImage(this.data.photos, this.data.photos[index])
  },

  deletePhoto(e) {
    var index = e.currentTarget.dataset.delIndex
    wx.showModal({
      title: '删除照片',
      content: '确定要删除这张照片吗？',
      confirmColor: '#c4715a',
      success: (res) => {
        if (res.confirm) {
          var photos = this.data.photos.filter((_, i) => i !== index)
          userStore.setState({ photos: photos })
        }
      }
    })
  },

  goToSettings() {
    wx.navigateTo({ url: '/pkg-settings/settings/settings' })
  },

  copyId() {
    common.safeSetClipboardData(this.data.userInfo.id, '已复制 ID')
  },

  onAvatarError() {
    this.setData({ 'userInfo.avatar': '/images/avatar_fallback.png' })
  }
})
