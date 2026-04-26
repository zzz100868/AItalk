const common = require('../../utils/common.js')
const mockData = require('../../data/mockData.js')
const tabPage = require('../../behaviors/tabPage.js')
const storage = common.storage
const memoryData = mockData.getMemoryData()

Page({
  behaviors: [tabPage(1)],

  onShow() {
    const info = common.loadUserInfo()
    this.setData({ userName: info.name, userAvatar: info.avatar })
    const app = getApp()
    const targetTab = app.globalData.memoryTargetTab
    console.log('[memory] onShow, targetTab:', targetTab, 'current activeTab:', this.data.activeTab)
    if (targetTab) {
      app.globalData.memoryTargetTab = null
      const tabMap = { chat: 0, memory: 100, archive: 200 }
      console.log('[memory] switching to tab:', targetTab, 'sliderX:', tabMap[targetTab])
      this.setData({
        activeTab: targetTab,
        tabSliderX: tabMap[targetTab] || 0
      }, () => {
        console.log('[memory] setData callback, activeTab:', this.data.activeTab)
        if (targetTab === 'chat') {
          this.scrollChatToBottom()
        } else {
          this.scrollContentToTop()
        }
      })
    }
    this.loadInsights()
    this._setupKeyboardListener()
    if (this.data.activeTab === 'chat') {
      setTimeout(() => this.scrollChatToBottom(), 100)
    }
  },

  onHide() {
    this._removeKeyboardListener()
  },

  data: {
    userAvatar: mockData.DEFAULT_USER.avatarSmall,
    aiAvatar: mockData.AI_USERS.stitch.avatarSmall,
    userName: mockData.DEFAULT_USER.nickName,
    activeTab: 'chat',
    tabSliderX: 0,
    activeCategory: 'all',
    categories: memoryData.categories,
    insights: memoryData.insights,
    filteredInsights: [],
    chatDays: '12天',
    chatMood: '平静',
    chatTopics: 8,
    messages: memoryData.messages,
    aboutMe: memoryData.aboutMe,
    personalities: memoryData.personalities,
    traits: memoryData.traits,
    showEditModal: false,
    editId: null,
    editTitle: '',
    editContent: '',
    scrollIntoView: '',
    inputValue: '',
    isSending: false,
    chatPaddingBottom: 188
  },

  _msgCounter: 0,

  _nextMsgId() {
    return Date.now() + '_' + (++this._msgCounter)
  },

  _scrollThrottle() {
    if (this._scrollPending) return
    this._scrollPending = true
    setTimeout(() => {
      this._scrollPending = false
      this.scrollChatToBottom()
    }, 200)
  },

  mockReplies: mockData.MEMORY_REPLIES,

  onLoad(options) {
    console.log('[memory] onLoad, options:', options, 'current activeTab:', this.data.activeTab)
    const app = getApp()
    const tab = app.globalData.memoryTargetTab || options.tab
    if (tab) {
      app.globalData.memoryTargetTab = null
      const tabMap = { chat: 0, memory: 100, archive: 200 }
      this.setData({
        activeTab: tab,
        tabSliderX: tabMap[tab] || 0
      }, () => {
        if (tab === 'chat') {
          this.scrollChatToBottom()
        } else {
          this.scrollContentToTop()
        }
      })
    }
    this.loadInsights()
    this._setupKeyboardListener()
    if (this.data.activeTab === 'chat') {
      setTimeout(() => this.scrollChatToBottom(), 100)
    }
  },

  onUnload() {
    this._removeKeyboardListener()
    if (this._typeTimer) {
      clearTimeout(this._typeTimer)
      this._typeTimer = null
    }
  },

  _setupKeyboardListener() {
    if (this._keyboardListener) return
    this._keyboardListener = () => {
      setTimeout(() => this._calcChatPadding(), 100)
    }
    wx.onKeyboardHeightChange(this._keyboardListener)
    setTimeout(() => this._calcChatPadding(), 500)
  },

  _removeKeyboardListener() {
    if (this._keyboardListener) {
      wx.offKeyboardHeightChange(this._keyboardListener)
      this._keyboardListener = null
    }
  },

  _calcChatPadding() {
    const sysInfo = common.getSystemInfo()
    const rpxRatio = 750 / sysInfo.windowWidth
    const safeRpx = (sysInfo.safeAreaInsets?.bottom || 0) * rpxRatio
    // Reserve just enough room for the fixed input footer so the latest
    // message sits close to the composer without being covered.
    const padding = Math.ceil(188 + safeRpx)
    if (this.data.chatPaddingBottom !== padding) {
      this.setData({ chatPaddingBottom: padding }, () => {
        if (this.data.activeTab === 'chat') {
          this.scrollChatToBottom()
        }
      })
    }
  },

  loadInsights() {
    const stored = storage.get('memoryInsights', null)
    if (stored && stored.length > 0) {
      this.setData({ insights: stored }, () => {
        this.filterInsights()
      })
    } else {
      storage.set('memoryInsights', this.data.insights)
      this.filterInsights()
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    const tabMap = { chat: 0, memory: 100, archive: 200 }
    console.log('[memory] manual switchTab to:', tab)
    this.setData({
      activeTab: tab,
      tabSliderX: tabMap[tab]
    }, () => {
      if (tab === 'chat') {
        setTimeout(() => this.scrollChatToBottom(), 100)
      } else {
        this.scrollContentToTop()
      }
    })
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
    setTimeout(() => this.scrollChatToBottom(), 200)
  },

  onInputBlur() {
    this.setData({ inputFocused: false })
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },

  scrollChatToBottom() {
    this.scrollToAnchor('chat-scroll-bottom')
  },

  scrollContentToTop() {
    this.scrollToAnchor('memory-scroll-top')
  },

  scrollToAnchor(anchor) {
    this.setData({ scrollIntoView: '' }, () => {
      setTimeout(() => {
        this.setData({ scrollIntoView: anchor })
      }, 0)
    })
  },

  sendMessage() {
    const content = this.data.inputValue.trim()
    if (!content || this.data.isSending) return

    const messages = [...this.data.messages, {
      id: this._nextMsgId(),
      sender: 'user',
      content: content
    }]

    this.setData({
      messages,
      inputValue: '',
      isSending: true
    }, () => this.scrollChatToBottom())

    const delay = 600 + Math.random() * 600
    this._typeTimer = setTimeout(() => {
      const reply = this.mockReplies[Math.floor(Math.random() * this.mockReplies.length)]
      const aiMsg = {
        id: this._nextMsgId(),
        sender: 'ai',
        content: ''
      }
      const newMessages = [...messages, aiMsg]
      this.setData({
        messages: newMessages
      }, () => this.scrollChatToBottom())

      let i = 0
      const batchSize = 3
      const typeNext = () => {
        if (i >= reply.length) {
          this.setData({ isSending: false })
          return
        }
        const chunk = reply.slice(i, i + batchSize)
        aiMsg.content += chunk
        i += chunk.length
        this.setData({
          [`messages[${newMessages.length - 1}].content`]: aiMsg.content
        })
        this._scrollThrottle()
        this._typeTimer = setTimeout(typeNext, 80 + Math.random() * 40)
      }
      typeNext()
    }, delay)
  },

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
          storage.set('memoryInsights', insights)
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
    storage.set('memoryInsights', insights)
    wx.showToast({ title: '已保存', icon: 'none' })
  },

  goToUserHome(e) {
    common.goToUserHome(e.detail?.author || e.currentTarget.dataset.author)
  }
})
