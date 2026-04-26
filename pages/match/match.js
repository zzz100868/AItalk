var common = require('../../utils/common.js')

Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    const info = common.loadUserInfo()
    this.setData({ myName: info.name, userAvatar: info.avatar })
    this.checkMatchStatus()
  },

  resetMatch() {
    this.setData({ isMatched: false, showChat: false })
  },

  checkMatchStatus() {
    // 测试版开关：设为 true 则始终开放匹配，设为 false 则走正式逻辑（每周二开放）
    const TEST_MODE = true

    let isOpen
    if (TEST_MODE) {
      isOpen = true
    } else {
      const now = new Date()
      isOpen = now.getDay() === 2 // 每周二开放
    }

    this.setData({ isMatchOpen: isOpen })

    if (!isOpen) {
      this.updateCountdown()
      this.countdownTimer = setInterval(() => this.updateCountdown(), 1000)
    } else if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  },

  updateCountdown() {
    const now = new Date()
    const nextTuesday = new Date(now)
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7
    nextTuesday.setDate(now.getDate() + daysUntilTuesday)
    nextTuesday.setHours(0, 0, 0, 0)

    const diff = nextTuesday - now
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
    myName: '林夕',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',

    // 当前匹配对象（由 doMatch 填充）
    matchAvatar: '',
    matchName: '',
    matchBio: '',
    compatibility: 0,
    tags: [],
    icebreakers: [],
    matchInsight: '',

    // 盲盒候选池
    candidates: [
      {
        name: 'Kael',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Kael&size=400&backgroundColor=e8dff5',
        bio: '偏好安静的周末与深度的自我对话',
        compatibility: 98,
        tags: ['手冲咖啡', '深夜阅读', '安静'],
        icebreakers: [
          '看到你也喜欢在清晨喝手冲咖啡，有什么推荐的豆子吗？',
          '你的主页有一种很安静的力量，周末通常怎么度过？'
        ],
        insight: '你们同样偏好安静的周末与深度的自我对话，这种对「留白」的共同追求，为建立无压力的灵魂连接提供了土壤。'
      },
      {
        name: '周晚',
        avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=400&backgroundColor=d5e8d4',
        bio: '在城市的缝隙里寻找诗意的栖居',
        compatibility: 94,
        tags: ['胶片摄影', '雨天窗边', '黑胶唱片'],
        icebreakers: [
          '你镜头下的雨天总是有种特别的情绪，最近有拍到喜欢的画面吗？',
          '听说你也收藏黑胶，最近循环最多的一张是什么？'
        ],
        insight: '你们都在快节奏的城市生活里保留着一份对旧时光的眷恋，这种对「慢」的执念让你们注定相遇。'
      },
      {
        name: '方塘',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=400&backgroundColor=ffe6cc',
        bio: '相信文字比语言更接近灵魂',
        compatibility: 91,
        tags: ['手写书信', 'indie音乐', '深夜散步'],
        icebreakers: [
          '在这个即时通讯的时代，还有人愿意写信真的太珍贵了。你最后一次写信是给谁？',
          '深夜散步时耳机里通常会放什么歌？'
        ],
        insight: '你们都是更愿意用文字而不是声音来表达内心的人，这种沉默的共鸣比千言万语更深刻。'
      },
      {
        name: '林小雨',
        avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=400&backgroundColor=ffd5dc',
        bio: '一颗在雨天发芽的种子',
        compatibility: 89,
        tags: ['植物观察', '烘焙', '早午餐'],
        icebreakers: [
          '你的阳台看起来像个迷你植物园，有什么特别好养的植物推荐吗？',
          '周末的早午餐通常都是自己做吗？看起来很有仪式感。'
        ],
        insight: '你们都在日常的小事里找到了生活的仪式感，一颗植物、一顿早午餐，都是你们与世界温柔相处的方式。'
      },
      {
        name: '陈默',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=400&backgroundColor=c7e6f5',
        bio: '沉默不是无话可说，而是无需多说',
        compatibility: 96,
        tags: ['攀岩', '冷萃茶', '独处'],
        icebreakers: [
          '攀岩和独处听起来很矛盾，你是怎么在运动中与自己对话的？',
          '冷萃茶和手冲咖啡之间，你更喜欢哪一种？'
        ],
        insight: '你们都在人群中保持着一种克制的疏离感，这种不打扰的温柔反而成了最亲密的引力。'
      },
      {
        name: '阿北',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Abei&size=400&backgroundColor=e1d5e7',
        bio: '在咖啡香和代码之间找平衡',
        compatibility: 87,
        tags: ['手冲咖啡', '开源社区', '深夜编程'],
        icebreakers: [
          '作为开发者，你是怎么保持对代码和生活同等热情的？',
          '手冲咖啡和写代码，哪个更需要耐心？'
        ],
        insight: '你们都在理性的世界里保持着一份感性的坚持，代码和咖啡一样，都需要恰到好处的温度。'
      }
    ],

  },

  doMatch() {
    if (this._matching) return
    this._matching = true
    const candidates = this.data.candidates
    if (candidates.length === 0) {
      wx.showToast({ title: '暂无可匹配用户', icon: 'none' })
      return
    }
    let randomIndex
    // 避免连续两次匹配到同一个人
    do {
      randomIndex = Math.floor(Math.random() * candidates.length)
    } while (candidates.length > 1 && candidates[randomIndex].name === this.data.matchName)

    const match = candidates[randomIndex]

    const msgId = Date.now()

    // 先准备好匹配数据并进入动画
    this.setData({
      isMatching: true,
      matchPhase: 'shake',
      matchAvatar: match.avatar,
      matchName: match.name,
      matchBio: match.bio,
      compatibility: match.compatibility,
      tags: match.tags,
      icebreakers: match.icebreakers,
      matchInsight: match.insight,
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

  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
    if (this._animTimer1) clearTimeout(this._animTimer1)
    if (this._animTimer2) clearTimeout(this._animTimer2)
    if (this._animTimer3) clearTimeout(this._animTimer3)
  },

  copyIcebreaker(e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'none' })
      }
    })
  },

  goToUserHome(e) {
    common.goToUserHome(e.currentTarget.dataset.author)
  }
})
