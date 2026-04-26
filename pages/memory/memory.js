Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    const targetTab = wx.getStorageSync('memoryTargetTab')
    if (targetTab) {
      wx.removeStorageSync('memoryTargetTab')
      const tabMap = { chat: 0, memory: 100, archive: 200 }
      this.setData({ activeTab: targetTab, tabSliderX: tabMap[targetTab] || 0 })
    }
    this.loadInsights()
  },

  data: {
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
    aiAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=StitchAI&size=200&backgroundColor=e8dff5',
    activeTab: 'chat',
    tabSliderX: 0,
    activeCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'life', name: '生活' },
      { id: 'emotion', name: '情绪' },
      { id: 'hobby', name: '兴趣' },
      { id: 'growth', name: '成长' }
    ],
    insights: [
      {
        id: 1,
        date: '2024.01.15',
        title: '职业转型期的焦虑与重构',
        content: '你表达了在当前的人生阶段，对于稳定工作与个人创造力之间的矛盾感到焦虑。倾向于寻找能带来更多内驱力，而非仅仅是物质回报的生活方式。建议你先从副业或业余项目入手，逐步验证新的可能性。',
        tag: '生活',
        tagColor: 'secondary',
        category: 'life'
      },
      {
        id: 2,
        date: '2024.01.12',
        title: '建立情感边界',
        content: '在最近的对话中，你开始尝试在人际关系中建立更加明确的情感边界，学会拒绝，不再将周围人的所有情绪期待都背负在自己身上。这是一个非常健康的转变。',
        tag: '情绪',
        tagColor: 'tertiary',
        category: 'emotion'
      },
      {
        id: 3,
        date: '2024.01.08',
        title: '向内探索的渴望',
        content: '你最近对数字断舍离和冥想练习表现出浓厚的兴趣，这反映了你内在对平静、专注以及剔除无效信息的深层渴望。尝试每天固定 15 分钟的「无屏幕时间」。',
        tag: '兴趣',
        tagColor: 'primary',
        category: 'hobby'
      },
      {
        id: 4,
        date: '2024.01.05',
        title: '完美主义的松动',
        content: '你提到开始接受「完成比完美更重要」的想法。这种思维转变将显著降低你的行动阻力，让你更容易开始新项目，而不是被困在无尽的准备阶段。',
        tag: '成长',
        tagColor: 'primary',
        category: 'growth'
      },
      {
        id: 5,
        date: '2024.01.02',
        title: '深夜创作高峰',
        content: '数据显示你在晚间 11 点至凌晨 1 点的表达最为流畅和深刻。这与你提到的「夜深人静时思路最清晰」高度吻合。建议将重要创作任务安排在这个时间段。',
        tag: '生活',
        tagColor: 'secondary',
        category: 'life'
      },
      {
        id: 6,
        date: '2023.12.28',
        title: '对归属感的重新定义',
        content: '你正在从「被一群人接纳」转向「与少数几个人深度连接」。这种转变标志着你从外向型社交需求向内向型质量需求的进化。',
        tag: '情绪',
        tagColor: 'tertiary',
        category: 'emotion'
      },
      {
        id: 7,
        date: '2023.12.20',
        title: '咖啡与灵感的关联',
        content: '你多次提到手冲咖啡带来的仪式感。这种「慢动作」实际上是你给自己创造的心理缓冲带，让大脑从任务模式切换到创意模式。',
        tag: '兴趣',
        tagColor: 'primary',
        category: 'hobby'
      }
    ],
    filteredInsights: [],
    chatDays: '12天',
    chatMood: '平静',
    chatTopics: 8,
    messages: [
      {
        id: 1,
        sender: 'user',
        content: '最近一直在想，我是不是应该给自己放个假，感觉每天都被工作填满了。'
      },
      {
        id: 2,
        sender: 'ai',
        content: '听起来你最近有点累了。给自己留一些「什么都不做」的时间，其实是很重要的。你有没有想过，理想的休息日会是什么样的？'
      },
      {
        id: 3,
        sender: 'user',
        content: '可能就是睡到自然醒，然后泡一杯咖啡，看看书，不用回任何消息。'
      },
      {
        id: 4,
        sender: 'ai',
        content: '这听起来很治愈。其实这种「慢下来」的时刻，往往能让你更清楚地听见自己内心的声音。'
      },
      {
        id: 5,
        sender: 'user',
        content: '嗯，我觉得我最近总是活在别人的期待里，很少问自己真正想要什么。'
      },
      {
        id: 6,
        sender: 'ai',
        content: '能意识到这一点已经很了不起了。或许可以从一件小事开始，比如今天晚餐吃什么，完全按照你自己的喜好来选择。'
      }
    ],

    aboutMe: '你是一个在安静中寻找力量的人。你喜欢手冲咖啡的仪式感，享受深夜独处的时光。你对世界充满好奇，常常沉浸在书本和音乐里。虽然外表看起来有些疏离，但内心深处渴望被真正理解。',
    personalities: [
      { name: '内向而敏感', desc: '你喜欢独处，对周围的情绪变化很敏锐，常常能察觉到别人忽略的细节。' },
      { name: '富有创造力', desc: '你的思维不受常规束缚，总能从独特的角度看待问题，提出让人眼前一亮的想法。' },
      { name: '追求完美', desc: '你对自己要求很高，这让你做事很出色，但也容易因为达不到理想状态而焦虑。' },
      { name: '重视深度', desc: '比起广泛的社交，你更珍惜少数几个能真正理解你的人，讨厌浮于表面的寒暄。' }
    ],
    traits: [
      { name: '深度思考者', color: 'warm' },
      { name: '创意灵魂', color: 'sun' },
      { name: '夜猫子', color: 'night' },
      { name: '细节控', color: 'mint' },
      { name: '慢热型', color: 'bloom' },
      { name: '理想主义者', color: 'sky' }
    ],
    showEditModal: false,
    editId: null,
    editTitle: '',
    editContent: '',
    scrollIntoView: ''
  },

  onLoad(options) {
    if (options.tab) {
      const tabMap = { chat: 0, memory: 100, archive: 200 }
      this.setData({ activeTab: options.tab, tabSliderX: tabMap[options.tab] || 0 })
    }
    this.loadInsights()
  },

  loadInsights() {
    const stored = wx.getStorageSync('memoryInsights')
    if (stored && stored.length > 0) {
      this.setData({ insights: stored }, () => {
        this.filterInsights()
      })
    } else {
      wx.setStorage({ key: 'memoryInsights', data: this.data.insights })
      this.filterInsights()
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    const tabMap = { chat: 0, memory: 100, archive: 200 }
    this.setData({ activeTab: tab, tabSliderX: tabMap[tab] })
  },

  goToChat() {
    this.setData({ activeTab: 'chat', tabSliderX: 0 })
  },

  switchCategory(e) {
    const category = e.currentTarget.dataset.id
    this.setData({ activeCategory: category }, () => {
      this.filterInsights()
    })
  },

  filterInsights() {
    const { activeCategory, insights } = this.data
    if (activeCategory === 'all') {
      this.setData({ filteredInsights: insights })
    } else {
      const filtered = insights.filter(item => item.category === activeCategory)
      this.setData({ filteredInsights: filtered })
    }
  },

  onInputFocus() {
    this.setData({ inputFocused: true })
    // 键盘唤起后滚动到最后一条消息，确保输入框不被遮挡
    setTimeout(() => {
      this.setData({ scrollIntoView: 'msg-last' })
    }, 200)
  },

  onInputBlur() {
    this.setData({ inputFocused: false, scrollIntoView: '' })
  },

  showAttachMenu() {},

  startVoice() {},

  onInsightLongPress(e) {
    const id = e.currentTarget.dataset.id
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.openEditModal(id)
        } else if (res.tapIndex === 1) {
          this.deleteInsight(id)
        }
      }
    })
  },

  deleteInsight(id) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记忆吗？',
      confirmColor: '#c4715a',
      success: (res) => {
        if (res.confirm) {
          const insights = this.data.insights.filter(i => i.id !== id)
          this.setData({ insights }, () => {
            this.filterInsights()
          })
          wx.setStorage({ key: 'memoryInsights', data: insights })
          wx.showToast({ title: '已删除', icon: 'none' })
        }
      }
    })
  },

  openEditModal(id) {
    const item = this.data.insights.find(i => i.id === id)
    if (!item) return
    this.setData({
      showEditModal: true,
      editId: id,
      editTitle: item.title,
      editContent: item.content
    })
  },

  cancelEdit() {
    this.setData({ showEditModal: false, editId: null })
  },

  preventBubble() {},

  onEditTitleInput(e) {
    this.setData({ editTitle: e.detail.value })
  },

  onEditContentInput(e) {
    this.setData({ editContent: e.detail.value })
  },

  saveEdit() {
    const { editId, editTitle, editContent, insights } = this.data
    if (!editTitle.trim() || !editContent.trim()) {
      wx.showToast({ title: '标题和内容不能为空', icon: 'none' })
      return
    }
    const idx = insights.findIndex(i => i.id === editId)
    if (idx === -1) return
    insights[idx].title = editTitle.trim()
    insights[idx].content = editContent.trim()
    this.setData({ insights, showEditModal: false, editId: null }, () => {
      this.filterInsights()
    })
    wx.setStorage({ key: 'memoryInsights', data: insights })
    wx.showToast({ title: '已保存', icon: 'none' })
  },

  goToUserHome(e) {
    const author = e.currentTarget.dataset.author
    if (!author) return
    wx.navigateTo({ url: `/pages/userHome/userHome?author=${encodeURIComponent(author)}` })
  }
})
