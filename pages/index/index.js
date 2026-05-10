var common = require('../../utils/common.js')
var mockData = require('../../data/mockData.js')
var connectPage = require('../../stores/connect.js').connectPage
var appStore = require('../../stores/appStore.js')

Page({
  behaviors: [
    connectPage('user', function (state) {
      return {
        userName: state.nickName || mockData.DEFAULT_USER.nickName,
        userAvatar: state.avatar || mockData.DEFAULT_USER.avatarSmall
      }
    })
  ],

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
    userAvatar: mockData.DEFAULT_USER.avatarSmall,
    ageRange: Array.from({ length: 63 }, function (_, i) { return i + 18 }),
    ageIndex: -1,
    genderOptions: ['男', '女', '其他'],
    gender: '',
    orientationOptions: ['异性恋', '同性恋', '双性恋', '其他'],
    orientation: '',
    identityOptions: ['学生', '上班族', '自由职业', '创业者', '其他'],
    identityIndex: -1,
    mbtiOptions: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'],
    mbtiIndex: -1,
    recentStatus: '',
    canStart: false
  },

  onLoad(options) {
    if (options.mode === 'call') {
      this.setData({ viewMode: 'call' })
    }
    var saved = common.storage.get('basicInfo', null)
    if (saved) {
      var ageIndex = this.data.ageRange.indexOf(saved.age)
      var identityIndex = this.data.identityOptions.indexOf(saved.identity)
      var mbtiIndex = this.data.mbtiOptions.indexOf(saved.mbti)
      this.setData({
        ageIndex: ageIndex >= 0 ? ageIndex : -1,
        gender: saved.gender || '',
        orientation: saved.orientation || '',
        identityIndex: identityIndex >= 0 ? identityIndex : -1,
        mbtiIndex: mbtiIndex >= 0 ? mbtiIndex : -1,
        recentStatus: saved.recentStatus || ''
      }, () => this._checkCanStart())
    }
  },

  onShow() {
    if (this.data.isTransitioning) {
      this.setData({ isTransitioning: false })
    }
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
      this.setData({ viewMode: 'form', isTransitioning: false })
    }, 650)
  },

  _checkCanStart() {
    var d = this.data
    var canStart = d.ageIndex !== -1 && d.gender && d.orientation && d.identityIndex !== -1 && d.mbtiIndex !== -1 && d.recentStatus.trim().length > 0
    if (canStart !== d.canStart) {
      this.setData({ canStart: canStart })
    }
  },

  onIdentityChange(e) {
    this.setData({ identityIndex: parseInt(e.detail.value) }, () => this._checkCanStart())
  },

  onMbtiChange(e) {
    this.setData({ mbtiIndex: parseInt(e.detail.value) }, () => this._checkCanStart())
  },

  onStatusInput(e) {
    this.setData({ recentStatus: e.detail.value }, () => this._checkCanStart())
  },

  onAgeChange(e) {
    this.setData({ ageIndex: parseInt(e.detail.value) }, () => this._checkCanStart())
  },

  selectGender(e) {
    this.setData({ gender: e.currentTarget.dataset.value }, () => this._checkCanStart())
  },

  selectOrientation(e) {
    this.setData({ orientation: e.currentTarget.dataset.value }, () => this._checkCanStart())
  },

  submitForm() {
    if (!this.data.canStart) return
    var d = this.data
    common.storage.set('basicInfo', {
      age: d.ageRange[d.ageIndex],
      gender: d.gender,
      orientation: d.orientation,
      identity: d.identityOptions[d.identityIndex],
      mbti: d.mbtiOptions[d.mbtiIndex],
      recentStatus: d.recentStatus.trim()
    })
    this.setData({ viewMode: 'call', isCalling: false })
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
    var seconds = Math.floor((Date.now() - this.callStartedAt) / 1000)
    var mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    var secs = (seconds % 60).toString().padStart(2, '0')
    this.setData({ callDuration: mins + ':' + secs })
  },

  endCall() {
    this._syncCallDuration()
    this._clearCallTimer()
    this.callStartedAt = null
    var now = new Date()
    var hours = now.getHours().toString().padStart(2, '0')
    var minutes = now.getMinutes().toString().padStart(2, '0')
    this.setData({
      viewMode: 'landing',
      isCalling: false,
      callDate: '今天 ' + hours + ':' + minutes,
      isMuted: false,
      isSpeakerOn: false
    }, function () {
      wx.switchTab({ url: '/pages/match/match' })
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
  },

  onAvatarError() {
    this.setData({ aiAvatar: '/images/avatar_fallback.png' })
  }
})
