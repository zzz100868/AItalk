Page({
  data: {
    viewMode: 'landing',
    isTransitioning: false,
    isCalling: false,
    callDuration: '12:38',
    callDate: '今天 14:20',
    isMuted: false,
    isSpeakerOn: false,
    aiName: '小雅',
    aiAvatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoya&size=400&backgroundColor=e8dff5',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5'
  },

  onLoad(options) {
    if (options.mode === 'call') {
      this.setData({ viewMode: 'call' })
    }
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },

  enterApp() {
    if (this.data.isTransitioning) return
    this.setData({ isTransitioning: true })
    setTimeout(() => {
      this.setData({ viewMode: 'call', isCalling: false, isTransitioning: false })
    }, 650)
  },

  startCall() {
    this.setData({ isCalling: true, callDuration: '00:00' })
    this.startCallTimer()
  },

  startCallTimer() {
    let seconds = 0
    this.timer = setInterval(() => {
      seconds++
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
      const secs = (seconds % 60).toString().padStart(2, '0')
      this.setData({ callDuration: `${mins}:${secs}` })
    }, 1000)
  },

  endCall() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    this.setData({
      viewMode: 'landing',
      isCalling: false,
      callDate: `今天 ${hours}:${minutes}`,
      isMuted: false,
      isSpeakerOn: false
    })
    wx.setStorageSync('memoryTargetTab', 'archive')
    wx.switchTab({ url: '/pages/memory/memory' })
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
    const author = e.currentTarget.dataset.author
    if (!author) return
    wx.navigateTo({ url: `/pages/userHome/userHome?author=${encodeURIComponent(author)}` })
  }
})
