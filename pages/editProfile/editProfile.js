const common = require('../../utils/common.js')
const userStore = require('../../stores/userStore.js')
const mockData = require('../../data/mockData.js')

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
    const profile = userStore.getProfile()
    const avatar = profile.avatar
    const nickName = profile.nickName
    const bio = profile.bio

    const data = {
      avatar,
      nickName,
      id: this.data.id,
      bio,
      original: { avatar, nickName, bio }
    }
    this.setData(data)
  },

  _checkCanSave() {
    const { avatar, nickName, bio, original } = this.data
    const hasChanged = avatar !== original.avatar || nickName !== original.nickName || bio !== original.bio
    const valid = nickName.trim().length > 0
    const canSave = hasChanged && valid
    if (canSave !== this.data.canSave) {
      this.setData({ canSave })
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
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ avatar: tempPath }, () => this._checkCanSave())
      }
    })
  },

  saveProfile() {
    if (!this.data.canSave) return
    const { avatar, nickName, bio } = this.data
    const profile = {
      avatar,
      nickName: nickName.trim() || mockData.DEFAULT_USER.nickName,
      bio: bio.trim()
    }

    userStore.updateProfile(profile)

    wx.showToast({ title: '已保存', icon: 'success' })

    setTimeout(() => {
      wx.navigateBack()
    }, 600)
  },

  goBack() {
    const { avatar, nickName, bio, original } = this.data
    const hasChanged = avatar !== original.avatar || nickName !== original.nickName || bio !== original.bio
    if (hasChanged) {
      wx.showModal({
        title: '放弃修改？',
        content: '你还有未保存的更改',
        confirmText: '放弃',
        confirmColor: '#c45a5a',
        cancelText: '继续编辑',
        success: (res) => {
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
