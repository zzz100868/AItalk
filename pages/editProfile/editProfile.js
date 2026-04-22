Page({
  data: {
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=400&backgroundColor=c7e6f5',
    nickName: '林夕',
    id: 'LX_9527',
    bio: '在喧嚣中寻找宁静。🌿✨',
    canSave: true,
    original: {}
  },

  onLoad() {
    const app = getApp()
    const cache = app.globalData._cache
    const saved = cache?.profile || wx.getStorageSync('userProfile') || {}
    const avatar = saved.avatar || app.globalData.userInfo.avatarUrl || this.data.avatar
    const nickName = saved.nickName || app.globalData.userInfo.nickName || this.data.nickName
    const bio = saved.bio || this.data.bio

    const data = {
      avatar,
      nickName,
      id: this.data.id,
      bio,
      original: { avatar, nickName, bio }
    }
    this.setData(data)
  },

  onInputNickName(e) {
    this.setData({ nickName: e.detail.value })
  },

  onInputBio(e) {
    this.setData({ bio: e.detail.value })
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ avatar: tempPath })
      }
    })
  },

  saveProfile() {
    const { avatar, nickName, bio } = this.data
    const profile = {
      avatar,
      nickName: nickName.trim() || '林夕',
      bio: bio.trim()
    }

    wx.setStorage({ key: 'userProfile', data: profile })

    const app = getApp()
    app.globalData.userInfo.avatarUrl = profile.avatar
    app.globalData.userInfo.nickName = profile.nickName
    if (app.globalData._cache) {
      app.globalData._cache.profile = profile
    }

    // 同步更新已发布动态的昵称和头像
    const myPosts = wx.getStorageSync('myPosts') || []
    if (myPosts.length > 0) {
      const updated = myPosts.map(p => ({
        ...p,
        author: profile.nickName,
        avatar: profile.avatar
      }))
      wx.setStorage({ key: 'myPosts', data: updated })
      if (app.globalData._cache) {
        app.globalData._cache.myPosts = updated
        app.globalData._cache.myPostsHash = updated.length > 0 ? updated[updated.length - 1].id : 0
      }
    }

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
