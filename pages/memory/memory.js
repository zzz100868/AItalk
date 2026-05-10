var common = require('../../utils/common.js')
var mockData = require('../../data/mockData.js')
var tabPage = require('../../behaviors/tabPage.js')
var connectPage = require('../../stores/connect.js').connectPage
var appStore = require('../../stores/appStore.js')
var api = require('../../utils/api.js')
var createBatcher = require('../../utils/setDataHelper.js').createBatcher
var storage = common.storage
var memoryData = mockData.getMemoryData()

var WINDOW_SIZE = 50
var LOAD_MORE_SIZE = 20

Page({
  behaviors: [
    tabPage(1),
    connectPage('user', function (state) {
      return {
        userName: state.nickName || mockData.DEFAULT_USER.nickName,
        userAvatar: state.avatar || mockData.DEFAULT_USER.avatarSmall
      }
    })
  ],

  onShow() {
    this._setupKeyboardListener()
    var targetTab = appStore.getState().memoryTargetTab
    if (targetTab) {
      appStore.setState({ memoryTargetTab: null })
      var tabMap = { chat: 0, memory: 100, archive: 200 }
      this.setData({
        activeTab: targetTab,
        tabSliderX: tabMap[targetTab] || 0
      }, () => {
        if (targetTab === 'chat') {
          this.scrollChatToBottom()
        } else {
          this.scrollContentToTop()
        }
      })
    } else if (this.data.activeTab === 'chat') {
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
    filteredInsights: memoryData.insights.slice(),
    chatDays: '12天',
    chatMood: '平静',
    chatTopics: 8,
    visibleMessages: [],
    hasMoreHistory: false,
    loadingHistory: false,
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

  _allMessages: [],
  _msgCounter: 0,

  _nextMsgId() {
    return Date.now() + '_' + (++this._msgCounter)
  },

  _initMessages() {
    this._allMessages = memoryData.messages.slice()
    this._syncVisibleMessages()
  },

  _syncVisibleMessages() {
    var all = this._allMessages
    var start = Math.max(0, all.length - WINDOW_SIZE)
    var visible = all.slice(start)
    this.setData({
      visibleMessages: visible,
      hasMoreHistory: start > 0
    })
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
    var targetTab = options.tab
    if (targetTab) {
      var tabMap = { chat: 0, memory: 100, archive: 200 }
      this.setData({
        activeTab: targetTab,
        tabSliderX: tabMap[targetTab] || 0
      })
    }
    this._batcher = createBatcher(this)
    this._initMessages()
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

  onScrollToTop() {
    if (this.data.loadingHistory || !this.data.hasMoreHistory) return
    this.setData({ loadingHistory: true })

    var all = this._allMessages
    var visible = this.data.visibleMessages
    var firstVisibleId = visible.length > 0 ? visible[0].id : null
    var firstIndex = 0
    if (firstVisibleId) {
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === firstVisibleId) { firstIndex = i; break }
      }
    }

    var loadStart = Math.max(0, firstIndex - LOAD_MORE_SIZE)
    var older = all.slice(loadStart, firstIndex)
    if (older.length === 0) {
      this.setData({ loadingHistory: false, hasMoreHistory: false })
      return
    }

    var newVisible = older.concat(visible)
    // 保持窗口不无限增长：如果超过 WINDOW_SIZE + LOAD_MORE_SIZE，裁剪底部
    var maxVisible = WINDOW_SIZE + LOAD_MORE_SIZE
    if (newVisible.length > maxVisible) {
      newVisible = newVisible.slice(0, maxVisible)
    }

    var anchorId = 'msg-' + firstVisibleId
    this.setData({
      visibleMessages: newVisible,
      hasMoreHistory: loadStart > 0,
      loadingHistory: false,
      scrollIntoView: anchorId
    })
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
    var sysInfo = common.getSystemInfo()
    var rpxRatio = 750 / sysInfo.windowWidth
    var safeRpx = (sysInfo.safeAreaInsets?.bottom || 0) * rpxRatio
    var padding = Math.ceil(188 + safeRpx)
    if (this.data.chatPaddingBottom !== padding) {
      this.setData({ chatPaddingBottom: padding }, () => {
        if (this.data.activeTab === 'chat') {
          this.scrollChatToBottom()
        }
      })
    }
  },

  loadInsights() {
    var stored = storage.get('memoryInsights', null)
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
    var tab = e.currentTarget.dataset.tab
    var tabMap = { chat: 0, memory: 100, archive: 200 }
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
    var category = e.currentTarget.dataset.id
    this.setData({ activeCategory: category }, () => {
      this.filterInsights()
    })
  },

  filterInsights() {
    var activeCategory = this.data.activeCategory
    var insights = this.data.insights
    if (activeCategory === 'all') {
      this.setData({ filteredInsights: insights })
    } else {
      this.setData({ filteredInsights: insights.filter(item => item.category === activeCategory) })
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
    var content = this.data.inputValue.trim()
    if (!content || this.data.isSending) return

    var userMsg = {
      id: this._nextMsgId(),
      sender: 'user',
      content: content
    }

    this._allMessages.push(userMsg)
    var visible = this.data.visibleMessages.concat(userMsg)
    if (visible.length > WINDOW_SIZE) {
      visible = visible.slice(visible.length - WINDOW_SIZE)
    }

    this.setData({
      visibleMessages: visible,
      hasMoreHistory: this._allMessages.length > visible.length,
      inputValue: '',
      isSending: true
    }, () => this.scrollChatToBottom())

    var self = this
    api.sendChatMessage(content).then(function (res) {
      var aiMsg = {
        id: res.id || self._nextMsgId(),
        sender: 'ai',
        content: ''
      }

      self._allMessages.push(aiMsg)
      var vis = self.data.visibleMessages.concat(aiMsg)
      if (vis.length > WINDOW_SIZE) {
        vis = vis.slice(vis.length - WINDOW_SIZE)
      }

      self.setData({
        visibleMessages: vis,
        hasMoreHistory: self._allMessages.length > vis.length
      }, () => self.scrollChatToBottom())

      var reply = res.reply
      var i = 0
      var batchSize = 8
      var visIdx = self.data.visibleMessages.length - 1
      var typeNext = function () {
        if (i >= reply.length) {
          self.setData({ isSending: false })
          return
        }
        var chunk = reply.slice(i, i + batchSize)
        aiMsg.content += chunk
        i += chunk.length
        self._batcher({
          ['visibleMessages[' + visIdx + '].content']: aiMsg.content
        })
        self._scrollThrottle()
        self._typeTimer = setTimeout(typeNext, 80 + Math.random() * 40)
      }
      typeNext()
    }).catch(function (err) {
      console.error('[Chat] sendMessage error:', err)
      self.setData({ isSending: false })
      wx.showToast({ title: '发送失败，请重试', icon: 'none' })
    })
  },

  onInsightLongPress(e) {
    var id = e.currentTarget.dataset.id
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
          var insights = this.data.insights.filter(i => i.id !== id)
          this.setData({ insights: insights }, () => {
            this.filterInsights()
          })
          storage.set('memoryInsights', insights)
          wx.showToast({ title: '已删除', icon: 'none' })
        }
      }
    })
  },

  openEditModal(id) {
    var item = this.data.insights.find(i => i.id === id)
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
    var data = this.data
    if (!data.editTitle.trim() || !data.editContent.trim()) {
      wx.showToast({ title: '标题和内容不能为空', icon: 'none' })
      return
    }
    var insights = data.insights.map(function (item) {
      if (item.id === data.editId) {
        return Object.assign({}, item, {
          title: data.editTitle.trim(),
          content: data.editContent.trim()
        })
      }
      return item
    })
    this.setData({ insights: insights, showEditModal: false, editId: null }, () => {
      this.filterInsights()
    })
    storage.set('memoryInsights', insights)
    wx.showToast({ title: '已保存', icon: 'none' })
  },

  goToUserHome(e) {
    common.goToUserHome(e.detail?.author || e.currentTarget.dataset.author)
  },

  onAvatarError() {
    this.setData({ aiAvatar: '/images/avatar_fallback.png' })
  }
})
