var common = require('../../utils/common.js')
var mockData = require('../../data/mockData.js')
var api = require('../../utils/api.js')
var tabPage = require('../../behaviors/tabPage.js')
var connectPage = require('../../stores/connect.js').connectPage

var MATCH_RESULT_TMPL_ID = '' // 在微信小程序后台配置后填入

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
    this.setData({ isMatched: false, showChat: false, matchId: '', unlocked: false })
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
          matchId: res.match.id || '',
          matchAvatar: res.match.avatar,
          matchName: res.match.name,
          matchBio: res.match.bio,
          compatibility: res.match.compatibility,
          tags: res.match.tags || [],
          icebreakers: res.match.icebreakers || [],
          matchInsight: res.match.insight || '',
          unlocked: res.match.unlocked || false
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
    matchId: '',
    unlocked: false,
    showPayModal: false
  },


  doMatch() {
    if (this._matching) return
    this._matching = true
    var self = this

    this.setData({ isMatching: true, matchPhase: 'shake' })

    // request one-time subscribe message authorization
    if (MATCH_RESULT_TMPL_ID && wx.requestSubscribeMessage) {
      wx.requestSubscribeMessage({
        tmplIds: [MATCH_RESULT_TMPL_ID],
        success: function () {
          api.subscribeNotifications([MATCH_RESULT_TMPL_ID]).catch(function () {})
        },
        fail: function () {}
      })
    }

    api.doMatch().then(function (res) {
      var match = res && res.match
      if (!match) {
        self._matching = false
        self.setData({ isMatching: false, matchPhase: '' })
        wx.showToast({ title: res && res.message || '暂无可匹配用户', icon: 'none' })
        return
      }
      self.setData({
        matchId: match.id || '',
        matchAvatar: match.avatar,
        matchName: match.name,
        matchBio: match.bio,
        compatibility: match.compatibility,
        tags: match.tags || [],
        icebreakers: match.icebreakers || [],
        matchInsight: match.insight || '',
        unlocked: match.unlocked || false
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
    if (this.data.unlocked) {
      wx.showToast({ title: '已解锁，即将开启对话', icon: 'none' })
      return
    }
    this.setData({ showPayModal: true })
  },

  hidePayModal() {
    this.setData({ showPayModal: false })
  },

  preventBubble() {},

  confirmPay() {
    var self = this
    var matchId = this.data.matchId

    if (!matchId) {
      // mock fallback — no real match id
      wx.showToast({ title: '支付功能配置中', icon: 'none' })
      self.setData({ showPayModal: false, unlocked: true })
      return
    }

    wx.showLoading({ title: '下单中...' })

    api.createOrder('unlock_wechat', matchId).then(function (res) {
      wx.hideLoading()

      if (!res || !res.success) {
        wx.showToast({ title: (res && res.message) || '下单失败，请重试', icon: 'none' })
        return
      }

      // mock mode — no WeChat Pay configured
      if (!res.wxPayParams) {
        wx.showToast({ title: '支付功能配置中', icon: 'none' })
        self.setData({ showPayModal: false, unlocked: true })
        return
      }

      // real WeChat Pay flow
      wx.requestPayment({
        timeStamp: res.wxPayParams.timeStamp,
        nonceStr: res.wxPayParams.nonceStr,
        package: res.wxPayParams.package,
        signType: res.wxPayParams.signType,
        paySign: res.wxPayParams.paySign,
        success: function () {
          wx.showToast({ title: '解锁成功', icon: 'success' })
          self.setData({ showPayModal: false, unlocked: true })
        },
        fail: function (err) {
          if (err.errMsg.indexOf('cancel') === -1) {
            wx.showToast({ title: '支付失败，请重试', icon: 'none' })
          }
        }
      })
    }).catch(function () {
      wx.hideLoading()
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    })
  },

  goToUserHome(e) {
    common.goToUserHome(e.detail?.author || e.currentTarget.dataset.author)
  },

  onAvatarError() {
    this.setData({ matchAvatar: '/images/avatar_fallback.png' })
  }
})
