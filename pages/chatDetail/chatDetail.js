var common = require('../../utils/common.js')

Page({
  data: {
    userName: '',
    userAvatar: '',
    myAvatar: '',
    messages: [],
    inputValue: '',
    focusInput: false,
    scrollTop: 0,
    showEmojiPanel: false,
    areaOffset: 0,
    bottomPad: 130,
    keyboardHeight: 0,
    emojiPanelHeight: 250,
    emojis: []
  },

  onLoad(options) {
    let user = options.user || ''
    try {
      user = decodeURIComponent(user)
    } catch (e) {}
    if (!user) {
      wx.navigateBack()
      return
    }
    this.setData({ userName: user })
    this.loadMyAvatar()
    this.loadMessages()

    const sysInfo = wx.getSystemInfoSync()
    this._defaultPanelH = Math.round(500 * sysInfo.screenWidth / 750)
    const safeBottom = sysInfo.screenHeight - (sysInfo.safeArea ? sysInfo.safeArea.bottom : sysInfo.screenHeight)
    this._inputAreaBase = Math.round(180 * sysInfo.screenWidth / 750) + safeBottom
    this.setData({ emojiPanelHeight: this._defaultPanelH, bottomPad: this._inputAreaBase })

    this._keyboardVisible = false
    this._pendingEmoji = null
    this._choosingImage = false
    this._lastKeyboardH = 0
    this._sendTime = 0
    this._emojisLoaded = false

    this._keyboardCallback = (res) => {
      const h = res.height
      const base = this._inputAreaBase

      if (h > 0) {
        this._keyboardVisible = true
        this._lastKeyboardH = h
        this._sendTime = 0

        if (this._pendingEmoji) return

        this.setData({
          keyboardHeight: h,
          showEmojiPanel: false,
          areaOffset: h,
          bottomPad: base + h
        })
        this.scrollToBottom()
      } else {
        this._keyboardVisible = false

        if (this._sendTime && Date.now() - this._sendTime < 500) {
          this._sendTime = 0
          this.setData({ focusInput: false })
          setTimeout(() => { this.setData({ focusInput: true }) }, 50)
          return
        }

        if (this._pendingEmoji) {
          const panelH = this._pendingEmoji.panelH
          this._pendingEmoji = null
          this.setData({
            showEmojiPanel: true,
            emojiPanelHeight: panelH,
            areaOffset: 0,
            bottomPad: base + panelH
          })
          this.scrollToBottom()
        } else if (this._choosingImage) {
        } else if (this.data.showEmojiPanel) {
        } else {
          this.setData({ areaOffset: 0, bottomPad: base })
        }
      }
    }
    wx.onKeyboardHeightChange(this._keyboardCallback)
  },

  onReady() {
    setTimeout(() => {
      wx.createSelectorQuery().select('.input-area').boundingClientRect((rect) => {
        if (rect && rect.height > 0) {
          this._inputAreaBase = rect.height
          if (!this._keyboardVisible && !this.data.showEmojiPanel) {
            this.setData({ bottomPad: rect.height })
          }
        }
      }).exec()
    }, 200)
  },

  onUnload() {
    if (this._keyboardCallback) {
      wx.offKeyboardHeightChange(this._keyboardCallback)
    }
  },

  loadMyAvatar() {
    const info = common.loadUserInfo()
    this.setData({ myAvatar: info.avatar })
  },

  loadMessages() {
    try {
      const all = wx.getStorageSync('privateMessages') || {}
      const conv = all[this.data.userName] || {}
      this.setData({
        userAvatar: conv.avatar || '',
        messages: conv.messages || []
      })
    } catch (e) {
      this.setData({ messages: [] })
    }
    this.scrollToBottom()
  },

  scrollToBottom() {
    wx.nextTick(() => {
      this.setData({ scrollTop: this.data.scrollTop >= 99999 ? 99998 : 99999 })
    })
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onMessagesTap() {
    this._pendingEmoji = null
    this._sendTime = 0
    wx.hideKeyboard()
    this.setData({
      focusInput: false,
      showEmojiPanel: false,
      areaOffset: 0,
      bottomPad: this._inputAreaBase
    })
  },

  onInputFocus() {
    this._pendingEmoji = null
    this._sendTime = 0
    if (this.data.showEmojiPanel) {
      this.setData({
        showEmojiPanel: false,
        bottomPad: this._inputAreaBase
      })
    }
  },

  toggleEmojiPanel() {
    if (!this._emojisLoaded) {
      this.setData({ emojis: require('../../utils/emojis.js') })
      this._emojisLoaded = true
    }

    const show = !this.data.showEmojiPanel
    if (show) {
      const panelH = this._lastKeyboardH || this._defaultPanelH
      if (this._keyboardVisible) {
        this._pendingEmoji = { panelH }
        this.setData({ focusInput: false })
        wx.hideKeyboard()
      } else {
        this.setData({
          showEmojiPanel: true,
          focusInput: false,
          emojiPanelHeight: panelH,
          areaOffset: 0,
          bottomPad: this._inputAreaBase + panelH
        })
        this.scrollToBottom()
      }
    } else {
      this.setData({
        showEmojiPanel: false,
        areaOffset: 0,
        bottomPad: this._inputAreaBase
      })
    }
  },

  selectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    this.setData({ inputValue: this.data.inputValue + emoji })
  },

  sendMessage() {
    const content = this.data.inputValue.trim()
    if (!content) return
    if (this._sending) return
    this._sending = true

    this.pushMessage({
      id: Date.now(),
      content,
      time: Date.now(),
      self: true,
      type: 'text'
    })

    this._sendTime = Date.now()
    this.setData({ inputValue: '' })
    this._sending = false

    setTimeout(() => {
      this.simulateReply()
    }, 1500)
  },

  chooseImage() {
    this._choosingImage = true
    if (this.data.showEmojiPanel) {
      this.setData({ showEmojiPanel: false, bottomPad: this._inputAreaBase })
    }
    common.safeChooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.pushMessage({
          id: Date.now(),
          content: tempFilePath,
          time: Date.now(),
          self: true,
          type: 'image'
        })

        setTimeout(() => {
          this.simulateImageReply()
        }, 2000)
      },
      complete: () => {
        this._choosingImage = false
        if (!this._keyboardVisible && !this.data.showEmojiPanel) {
          this.setData({ areaOffset: 0, bottomPad: this._inputAreaBase })
        }
      }
    })
  },

  pushMessage(msg) {
    try {
      const all = wx.getStorageSync('privateMessages') || {}
      if (!all[this.data.userName]) {
        all[this.data.userName] = { avatar: this.data.userAvatar, messages: [] }
      }
      all[this.data.userName].messages.push(msg)
      wx.setStorageSync('privateMessages', all)
    } catch (e) {}

    const len = this.data.messages.length
    this.setData({ ['messages[' + len + ']']: msg })
    this.scrollToBottom()
  },

  simulateReply() {
    const replies = [
      '收到，谢谢你的消息！',
      '说得很有道理。',
      '我也这么觉得。',
      '哈哈，确实。',
      '下次再聊~'
    ]
    const reply = replies[Math.floor(Math.random() * replies.length)]
    this.pushMessage({
      id: Date.now(),
      content: reply,
      time: Date.now(),
      self: false,
      type: 'text'
    })
  },

  simulateImageReply() {
    const sampleImages = [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80',
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&q=80',
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&q=80'
    ]
    const img = sampleImages[Math.floor(Math.random() * sampleImages.length)]
    this.pushMessage({
      id: Date.now(),
      content: img,
      time: Date.now(),
      self: false,
      type: 'image'
    })
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    common.safePreviewImage([src], src)
  },

  goBack() {
    wx.navigateBack()
  },

  goToUserHome() {
    common.goToUserHome(this.data.userName)
  }
})
