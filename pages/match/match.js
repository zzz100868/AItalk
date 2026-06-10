var common = require('../../utils/common.js')
var mockData = require('../../data/mockData.js')
var api = require('../../utils/api.js')
var tabPage = require('../../behaviors/tabPage.js')
var connectPage = require('../../stores/connect.js').connectPage

Page({
  behaviors: [
    tabPage(0),
    connectPage('user', function (state) {
      return {
        myName: state.nickName || mockData.DEFAULT_USER.nickName,
        userAvatar: state.avatar || mockData.DEFAULT_USER.avatarSmall
      }
    })
  ],

  onShow() {
    this.checkMatchStatus()
  },

  resetMatch() {
    this.setData({ isMatched: false, showChat: false })
  },

  checkMatchStatus() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }

    var self = this
    api.getMatchCurrent().then(function (res) {
      if (!res) throw new Error('no response')
      self.setData({ isMatchOpen: res.isOpen })
      if (res.hasResult && res.match) {
        self.setData({
          isMatched: true,
          matchAvatar: res.match.avatar,
          matchName: res.match.name,
          matchBio: res.match.bio,
          compatibility: res.match.compatibility,
          tags: res.match.tags || [],
          icebreakers: res.match.icebreakers || [],
          matchInsight: res.match.insight || ''
        })
      } else if (!res.isOpen) {
        self.updateCountdown()
        self.countdownTimer = setInterval(function () { self.updateCountdown() }, 1000)
      }
    }).catch(function () {
      var TEST_MODE = true
      var isOpen = TEST_MODE ? true : new Date().getDay() === 2
      self.setData({ isMatchOpen: isOpen })
      if (!isOpen) {
        self.updateCountdown()
        self.countdownTimer = setInterval(function () { self.updateCountdown() }, 1000)
      }
    })
  },

  onHide() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
    this._clearAnimTimers()
  },

  updateCountdown() {
    var now = new Date()
    var nextTuesday = new Date(now)
    var daysUntilTuesday = (2 - now.getDay() + 7) % 7
    nextTuesday.setDate(now.getDate() + daysUntilTuesday)
    nextTuesday.setHours(0, 0, 0, 0)

    var diff = nextTuesday - now
    var days = Math.floor(diff / (1000 * 60 * 60 * 24))
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    var seconds = Math.floor((diff % (1000 * 60)) / 1000)

    var text = ''
    if (days > 0) text += days + '天 '
    text += hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0')

    this.setData({ countdownText: text })
  },

  data: {
    isMatchOpen: true,
    isMatched: false,
    isMatching: false,
    matchPhase: '',
    countdownText: '',
    myName: mockData.DEFAULT_USER.nickName,
    userAvatar: mockData.DEFAULT_USER.avatarSmall,

    matchAvatar: '',
    matchName: '',
    matchBio: '',
    compatibility: 0,
    tags: [],
    icebreakers: [],
    matchInsight: '',
    showPayModal: false
  },


  doMatch() {
    if (this._matching) return
    this._matching = true
    var self = this

    this.setData({ isMatching: true, matchPhase: 'shake' })

    api.doMatch().then(function (res) {
      var match = res && res.match
      if (!match) {
        self._matching = false
        self.setData({ isMatching: false, matchPhase: '' })
        wx.showToast({ title: res && res.message || '暂无可匹配用户', icon: 'none' })
        return
      }
      self.setData({
        matchAvatar: match.avatar,
        matchName: match.name,
        matchBio: match.bio,
        compatibility: match.compatibility,
        tags: match.tags || [],
        icebreakers: match.icebreakers || [],
        matchInsight: match.insight || ''
      })
      self._animTimer1 = setTimeout(function () {
        self.setData({ matchPhase: 'glow' })
      }, 900)
      self._animTimer2 = setTimeout(function () {
        self.setData({ matchPhase: 'reveal' })
      }, 1700)
      self._animTimer3 = setTimeout(function () {
        self._matching = false
        self.setData({ isMatching: false, isMatched: true, matchPhase: '' })
      }, 3000)
    }).catch(function () {
      self._matching = false
      self.setData({ isMatching: false, matchPhase: '' })
      wx.showToast({ title: '匹配失败，请重试', icon: 'none' })
    })
  },

  _clearAnimTimers() {
    if (this._animTimer1) { clearTimeout(this._animTimer1); this._animTimer1 = null }
    if (this._animTimer2) { clearTimeout(this._animTimer2); this._animTimer2 = null }
    if (this._animTimer3) { clearTimeout(this._animTimer3); this._animTimer3 = null }
    this._matching = false
  },

  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
    this._clearAnimTimers()
  },

  copyIcebreaker(e) {
    var text = e.currentTarget.dataset.text
    common.safeSetClipboardData(text)
  },

  showPayModal() {
    this.setData({ showPayModal: true })
  },

  hidePayModal() {
    this.setData({ showPayModal: false })
  },

  preventBubble() {},

  confirmPay() {
    wx.showToast({ title: '支付功能开发中', icon: 'none' })
    this.setData({ showPayModal: false })
  },

  goToUserHome(e) {
    common.goToUserHome(e.detail?.author || e.currentTarget.dataset.author)
  },

  onAvatarError() {
    this.setData({ matchAvatar: '/images/avatar_fallback.png' })
  }
})
