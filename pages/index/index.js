const common = require('../../utils/common.js')
const mockData = require('../../data/mockData.js')

Page({
  data: {
    viewMode: 'landing',
    isTransitioning: false,
    isCalling: false,
    callDuration: '12:38',
    callDate: '今天 14:20',
    isMuted: false,
    isSpeakerOn: false,
    userName: mockData.DEFAULT_USER.nickName,
    aiName: mockData.AI_USERS.xiaoya.name,
    aiAvatar: mockData.AI_USERS.xiaoya.avatar,
    userAvatar: mockData.DEFAULT_USER.avatarSmall
  },

  onLoad(options) {
    if (options.mode === 'call') {
      this.setData({ viewMode: 'call' })
    }
  },

  onShow() {
    const info = common.loadUserInfo()
    this.setData({ userName: info.name, userAvatar: info.avatar })
    if (this.data.isCalling && this.callStartedAt) {
      this._syncCallDuration()
      this.startCallTimer()
    }
  },

  onHide() {
    this._clearCallTimer()
  },

  onUnload() {
    this._clearCallTimer()
  },

  enterApp() {
    if (this.data.isTransitioning) return
    this.setData({ isTransitioning: true })
    setTimeout(() => {
      this.setData({ viewMode: 'call', isCalling: false, isTransitioning: false })
    }, 650)
  },

  startCall() {
    this._clearCallTimer()
    this.callStartedAt = Date.now()
    this.setData({ isCalling: true, callDuration: '00:00' })
    this.startCallTimer()
  },

  startCallTimer() {
    this._clearCallTimer()
    this._syncCallDuration()
    this.timer = setInterval(() => {
      this._syncCallDuration()
    }, 1000)
  },

  _clearCallTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  _syncCallDuration() {
    if (!this.callStartedAt) return
    const seconds = Math.floor((Date.now() - this.callStartedAt) / 1000)
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    this.setData({ callDuration: `${mins}:${secs}` })
  },

  endCall() {
    this._syncCallDuration()
    this._clearCallTimer()
    this.callStartedAt = null
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    getApp().globalData.memoryTargetTab = 'archive'
    this.setData({
      viewMode: 'landing',
      isCalling: false,
      callDate: `今天 ${hours}:${minutes}`,
      isMuted: false,
      isSpeakerOn: false
    }, () => {
      wx.switchTab({ url: '/pages/memory/memory' })
    })
  },

  toggleMute() {
    this.setData({ isMuted: !this.data.isMuted })
    wx.showToast({ title: this.data.isMuted ? '已静音' : '取消静音', icon: 'none' })
  },

  toggleSpeaker() {
    this.setData({ isSpeakerOn: !this.data.isSpeakerOn })
    wx.showToast({ title: this.data.isSpeakerOn ? '免提已开' : '免提已关', icon: 'none' })
  },

  goToUserHome(e) {
    common.goToUserHome(e.detail?.author || e.currentTarget.dataset.author)
  }
})
