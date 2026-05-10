var common = require('../../utils/common.js')
var userStore = require('../../stores/userStore.js')
var mockData = require('../../data/mockData.js')

Page({
  data: {
    avatar: mockData.DEFAULT_USER.avatar,
    nickName: mockData.DEFAULT_USER.nickName,
    id: mockData.DEFAULT_USER.id,
    bio: mockData.DEFAULT_USER.bio,
    canSave: false,
    original: {}
  },

  onLoad() {
    var state = userStore.getState()
    var avatar = state.avatar || mockData.DEFAULT_USER.avatar
    var nickName = state.nickName || mockData.DEFAULT_USER.nickName
    var bio = state.bio || mockData.DEFAULT_USER.bio

    this.setData({
      avatar: avatar,
      nickName: nickName,
      bio: bio,
      original: { avatar: avatar, nickName: nickName, bio: bio }
    })
  },

  _checkCanSave() {
    var data = this.data
    var hasChanged = data.avatar !== data.original.avatar ||
      data.nickName !== data.original.nickName ||
      data.bio !== data.original.bio
    var valid = data.nickName.trim().length > 0
    var canSave = hasChanged && valid
    if (canSave !== data.canSave) {
      this.setData({ canSave: canSave })
    }
  },

  onInputNickName(e) {
    this.setData({ nickName: e.detail.value }, () => this._checkCanSave())
  },

  onInputBio(e) {
    this.setData({ bio: e.detail.value }, () => this._checkCanSave())
  },

  chooseAvatar() {
    common.safeChooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        var tempPath = res.tempFiles[0].tempFilePath
        this.setData({ avatar: tempPath }, () => this._checkCanSave())
      }
    })
  },

  saveProfile() {
    if (!this.data.canSave) return
    var data = this.data
    userStore.setState({
      avatar: data.avatar,
      nickName: data.nickName.trim() || mockData.DEFAULT_USER.nickName,
      bio: data.bio.trim()
    })

    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(function () {
      wx.navigateBack()
    }, 600)
  },

  goBack() {
    var data = this.data
    var hasChanged = data.avatar !== data.original.avatar ||
      data.nickName !== data.original.nickName ||
      data.bio !== data.original.bio
    if (hasChanged) {
      wx.showModal({
        title: '放弃修改？',
        content: '你还有未保存的更改',
        confirmText: '放弃',
        confirmColor: '#c45a5a',
        cancelText: '继续编辑',
        success: function (res) {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  }
})
