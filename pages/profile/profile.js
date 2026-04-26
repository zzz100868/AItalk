const common = require('../../utils/common.js')
const userStore = require('../../stores/userStore.js')
const mockData = require('../../data/mockData.js')
const tabPage = require('../../behaviors/tabPage.js')
const storage = common.storage

Page({
  behaviors: [tabPage(2)],

  data: {
    userInfo: {
      nickName: mockData.DEFAULT_USER.nickName,
      avatar: mockData.DEFAULT_USER.avatar,
      id: mockData.DEFAULT_USER.id,
      bio: mockData.DEFAULT_USER.bio
    },
    photos: [],
  },

  onShow() {
    this.loadUserInfo()
  },

  onLoad() {
    this.loadPhotos()
  },

  loadUserInfo() {
    const profile = userStore.getProfile()
    if (profile.avatar !== this.data.userInfo.avatar ||
        profile.nickName !== this.data.userInfo.nickName ||
        profile.bio !== this.data.userInfo.bio) {
      this.setData({
        'userInfo.avatar': profile.avatar,
        'userInfo.nickName': profile.nickName,
        'userInfo.bio': profile.bio
      })
    }
  },

  loadPhotos() {
    const photos = storage.get('profilePhotos', [])
    this.setData({ photos })
  },

  savePhotos(photos) {
    storage.set('profilePhotos', photos)
    this.setData({ photos })
  },

  choosePhoto() {
    const remain = 8 - this.data.photos.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传8张', icon: 'none' })
      return
    }
    common.safeChooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath)
        const photos = [...this.data.photos, ...newPaths].slice(0, 8)
        this.savePhotos(photos)
      }
    })
  },

  previewPhoto(e) {
    const index = e.currentTarget.dataset.index
    common.safePreviewImage(this.data.photos, this.data.photos[index])
  },

  deletePhoto(e) {
    const index = e.currentTarget.dataset.delIndex
    wx.showModal({
      title: '删除照片',
      content: '确定要删除这张照片吗？',
      confirmColor: '#c4715a',
      success: (res) => {
        if (res.confirm) {
          const photos = this.data.photos.filter((_, i) => i !== index)
          this.savePhotos(photos)
        }
      }
    })
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  copyId() {
    common.safeSetClipboardData(this.data.userInfo.id, '已复制 ID')
  },

})
