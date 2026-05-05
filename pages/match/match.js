const common = require('../../utils/common.js')
const api = require('../../utils/api.js')
const mockData = require('../../data/mockData.js')
const tabPage = require('../../behaviors/tabPage.js')

Page({
  behaviors: [tabPage(0)],

  onShow() {
    const info = common.loadUserInfo()
    this.setData({ myName: info.name, userAvatar: info.avatar })
    this.checkMatchStatus()
  },

  resetMatch() {
    this.setData({ isMatched: false, showChat: false })
  },

  checkMatchStatus() {
    // 先清理已有定时器，避免重复创建
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }

    // 调 API 获取匹配状态
    api.get('/match/current')
      .then((res) => {
        this.setData({
          isMatchOpen: res.isOpen,
          isMatched: res.hasResult,
        })

        // 如果有已匹配结果，直接加载到页面上
        if (res.match) {
          this.setData({
            matchAvatar: res.match.avatar,
            matchName: res.match.name,
            matchBio: res.match.bio,
            compatibility: res.match.compatibility,
            tags: res.match.tags,
            icebreakers: res.match.icebreakers,
            matchInsight: res.match.insight,
          })
        }

        if (!res.isOpen && res.nextOpenAt) {
          this._nextOpenAt = new Date(res.nextOpenAt)
          this.updateCountdown()
          this.countdownTimer = setInterval(() => this.updateCountdown(), 1000)
        }
      })
      .catch(() => {
        // API 不可用时回退本地判断
        const TEST_MODE = true
        let isOpen
        if (TEST_MODE) {
          isOpen = true
        } else {
          isOpen = new Date().getDay() === 2
        }
        this.setData({ isMatchOpen: isOpen })

        if (!isOpen) {
          this.updateCountdown()
          this.countdownTimer = setInterval(() => this.updateCountdown(), 1000)
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
    const target = this._nextOpenAt || (() => {
      const now = new Date()
      const next = new Date(now)
      const daysUntilTuesday = (2 - now.getDay() + 7) % 7
      next.setDate(now.getDate() + daysUntilTuesday)
      next.setHours(0, 0, 0, 0)
      return next
    })()

    const now = new Date()
    const diff = target - now
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    let text = ''
    if (days > 0) text += `${days}天 `
    text += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

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

    // 当前匹配对象（由 doMatch 填充）
    matchAvatar: '',
    matchName: '',
    matchBio: '',
    compatibility: 0,
    tags: [],
    icebreakers: [],
    matchInsight: '',
    showPayModal: false,
  },

  _nextOpenAt: null,

  doMatch() {
    if (this._matching) return
    this._matching = true

    // 调 API 触发匹配
    api.post('/match/do')
      .then((res) => {
        if (!res.success || !res.match) {
          this._matching = false
          wx.showToast({ title: '暂无可匹配用户', icon: 'none' })
          return
        }
        const match = res.match
        this._startMatchAnimation(match)
      })
      .catch((err) => {
        // API 失败，回退本地 mock 随机抽取
        const candidates = mockData.getMatchCandidates()
        if (candidates.length === 0) {
          this._matching = false
          wx.showToast({ title: '暂无可匹配用户', icon: 'none' })
          return
        }
        let randomIndex
        do {
          randomIndex = Math.floor(Math.random() * candidates.length)
        } while (candidates.length > 1 && candidates[randomIndex].name === this.data.matchName)

        this._startMatchAnimation(candidates[randomIndex])
      })
  },

  _startMatchAnimation(match) {
    this.setData({
      isMatching: true,
      matchPhase: 'shake',
      matchAvatar: match.avatar || '',
      matchName: match.name || '',
      matchBio: match.bio || '',
      compatibility: match.compatibility || 0,
      tags: match.tags || [],
      icebreakers: match.icebreakers || [],
      matchInsight: match.insight || '',
    })

    // 阶段1 → 阶段2：光芒发散（900ms）
    this._animTimer1 = setTimeout(() => {
      this.setData({ matchPhase: 'glow' })
    }, 900)

    // 阶段2 → 阶段3：卡片翻转揭示（1700ms）
    this._animTimer2 = setTimeout(() => {
      this.setData({ matchPhase: 'reveal' })
    }, 1700)

    // 动画结束，显示完整结果页（3000ms）
    this._animTimer3 = setTimeout(() => {
      this._matching = false
      this.setData({ isMatching: false, isMatched: true, matchPhase: '' })
    }, 3000)
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
    const text = e.currentTarget.dataset.text
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
  }
})
