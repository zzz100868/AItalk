const EMOJIS = [...new Set([
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇',
  '🥰','😍','🤩','😘','😗','☺️','😚','😙','😋','😛','😜','🤪','😝',
  '🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄',
  '😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧',
  '🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁',
  '☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭',
  '😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈',
  '👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸',
  '😹','😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚','💙','💜',
  '🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟',
  '👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘','👌','🤏','☝️',
  '👆','👇','👉','👈','✋','🤚','🖐️','🖖','👋','🤙','💪','🦾','🖕',
  '✍️','🙏','🦶','🦵','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅',
  '👄','💋','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁',
  '🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤',
  '🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋',
  '🐌','🐞','🐜','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕',
  '🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊',
  '🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃',
  '🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺',
  '🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡',
  '🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳',
  '🌴','🌱','🌿','☘️','🍀','🎍','🎋','🍃','🍂','🍁','🍄','🐚','🌾',
  '💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚',
  '🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌎','🌍','🌏','🪐',
  '💫','⭐','🌟','✨','⚡','🔥','💥','☄️','☀️','🌤️','⛅','🌥️','☁️',
  '🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌪️','🌫️','🌈',
  '☂️','☔','💧','💦','🌊','🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇',
  '🍓','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬',
  '🥒','🌶️','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨',
  '🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔',
  '🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🥫','🍝','🍜','🍲',
  '🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢',
  '🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿',
  '🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🍵','🧃','🥤','🍶','🍺',
  '🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🥣',
  '🥡','🥢','🧂','⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
  '🪀','🏓','🏸','🏒','🏑','🥍','🏏','🥅','⛳','🪁','🏹','🎣','🤿',
  '🥊','🥋','🎽','🛹','🛷','⛸️','🥌','🎿','⛷️','🏂','🏋️‍♀️','🏋️‍♂️',
  '🤼‍♀️','🤼‍♂️','🤸‍♀️','🤸‍♂️','⛹️‍♀️','⛹️‍♂️','🤺','🤾‍♀️','🤾‍♂️','🏌️‍♀️',
  '🏌️‍♂️','🏇','🧘‍♀️','🧘‍♂️','🏄‍♀️','🏄‍♂️','🏊‍♀️','🏊‍♂️','🤽‍♀️','🤽‍♂️',
  '🚣‍♀️','🚣‍♂️','🧗‍♀️','🧗‍♂️','🚵‍♀️','🚵‍♂️','🚴‍♀️','🚴‍♂️','🏆','🥇',
  '🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹‍♀️','🤹‍♂️','🎭',
  '🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻',
  '🎲','♟️','🎯','🎳','🎮','🎰','🧩','🚗','🚕','🚙','🚌','🚎','🏎️',
  '🚓','🚑','🚒','🚐','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵',
  '🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞',
  '🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️',
  '💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛳️','⛴️','🚢','⚓','⛽',
  '🚧','🚦','🚥','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢',
  '🎠','⛲','🎑','🏞️','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙️','🌃',
  '🌌','🌉','🌁','⌚','⏰','⏱️','⏲️','🕰️','🕛','🕧','🕐','🕜','🕑',
  '🕝','🕒','🕞','🕓','🕟','🕔','🕠','🕕','🕡','🕖','🕢','🕗','🕣',
  '🕘','🕤','🕙','🕥','🕚','🕦','🌡️','☀️','🌝','🌞','🪐','⭐','🌟',
  '🌠','☁️','⛅','⛈️','🌤️','🌥️','🌦️','🌧️','🌨️','☃️','⛄','🌬️','💨',
  '🌪️','🌫️','🌈','☂️','☔','💧','💦','🌊','💤','💢','💬','💭','🗯️',
  '💣','💥','💫','💯','🔇','🔈','🔉','🔊','📢','📣','📯','🔔','🔕',
  '🎼','🎵','🎶','🎙️','🎚️','🎛️','📱','📲','☎️','📞','📟','📠','🔋',
  '🔌','💻','🖥️','🖨️','⌨️','🖱️','🖲️','💽','💾','💿','📀','🧮','🎥',
  '🎞️','📽️','📺','📷','📸','📹','📼','🔍','🔎','🕯️','💡','🔦','🏮',
  '🪔','📔','📕','📖','📗','📘','📙','📚','📓','📒','📃','📜','📄',
  '📰','🗞️','📑','🔖','🏷️','💰','🪙','💴','💵','💶','💷','💸','💳',
  '🧾','💹','✉️','📧','📨','📩','📤','📥','📦','📫','📪','📬','📭',
  '📮','🗳️','✏️','✒️','🖋️','🖊️','🖌️','🖍️','📝','💼','📁','📂','🗂️',
  '📅','📆','🗒️','🗓️','📇','📈','📉','📊','📋','📌','📍','📎','🖇️',
  '📏','📐','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨',
  '🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🛡️','🔧','🔩','⚙️','🗜️','⚖️','🦯',
  '🔗','⛓️','🪝','🧰','🧲','🧪','🧫','🧬','🔬','🔭','📡','💉','🩸',
  '💊','🩹','🩺','🚽','🚰','🪥','🪠','🧻','🧼','🧽','🧴','🛁','🛀',
  '🧹','🧺','🪑','🚪','🛋️','🛏️','🧸','🖼️','🪞','🛍️','🛒','🎁','🎈',
  '🎉','🎊','🎋','🎍','🎎','🎏','🎐','🎑','🧧','🎀','🎗️','🎟️','🎫',
  '🎖️','🏅','🥇','🥈','🥉'
])]

Page({
  data: {
    userName: '',
    userAvatar: '',
    myAvatar: '',
    messages: [],
    inputValue: '',
    focusInput: false,
    scrollIntoView: '',
    showEmojiPanel: false,
    areaOffset: 0,
    bottomPaddingPx: 120,
    keyboardHeight: 0,
    emojiPanelOffsetPx: 250,
    emojis: EMOJIS
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

    // 计算 emoji 面板对应的 px 偏移（固定 500rpx）
    const sysInfo = wx.getSystemInfoSync()
    const emojiPanelOffsetPx = Math.round(500 * sysInfo.screenWidth / 750)
    this.setData({ emojiPanelOffsetPx })

    // 监听键盘高度变化
    this._keyboardCallback = (res) => {
      const h = res.height
      if (h > 0) {
        this.setData({ keyboardHeight: h })
        if (!this.data.showEmojiPanel) {
          this.setData({
            areaOffset: h,
            bottomPaddingPx: 120 + h
          })
        }
        this.scrollToBottom()
      } else {
        // 键盘收起
        if (!this.data.showEmojiPanel) {
          this.setData({
            areaOffset: 0,
            bottomPaddingPx: 120
          })
        }
      }
    }
    wx.onKeyboardHeightChange(this._keyboardCallback)
  },

  onUnload() {
    if (this._keyboardCallback) {
      wx.offKeyboardHeightChange(this._keyboardCallback)
    }
  },

  loadMyAvatar() {
    const saved = wx.getStorageSync('userProfile')
    const app = getApp()
    this.setData({
      myAvatar: saved?.avatar || app.globalData?.userInfo?.avatarUrl || 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5'
    })
  },

  loadMessages() {
    const all = wx.getStorageSync('privateMessages') || {}
    const conv = all[this.data.userName] || {}
    this.setData({
      userAvatar: conv.avatar || '',
      messages: conv.messages || []
    })
    this.scrollToBottom()
  },

  scrollToBottom() {
    const msgs = this.data.messages
    if (msgs.length > 0) {
      this.setData({ scrollIntoView: `msg-${msgs[msgs.length - 1].id}` })
    }
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onInputFocus() {
    const h = this.data.keyboardHeight || this.data.emojiPanelOffsetPx
    this.setData({
      showEmojiPanel: false,
      areaOffset: h,
      bottomPaddingPx: 120 + h
    })
  },

  toggleEmojiPanel() {
    const show = !this.data.showEmojiPanel
    const h = this.data.emojiPanelOffsetPx
    this.setData({
      showEmojiPanel: show,
      focusInput: false,
      areaOffset: show ? h : 0,
      bottomPaddingPx: 120 + (show ? h : 0)
    })
    if (show) {
      setTimeout(() => this.scrollToBottom(), 100)
    }
  },

  selectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    const newValue = this.data.inputValue + emoji
    this.setData({ inputValue: newValue })
  },

  sendMessage() {
    const content = this.data.inputValue.trim()
    if (!content) return

    this.pushMessage({
      id: Date.now(),
      content,
      time: Date.now(),
      self: true,
      type: 'text'
    })

    this.setData({ inputValue: '' })

    setTimeout(() => {
      this.simulateReply()
    }, 1500)
  },

  chooseImage() {
    wx.chooseMedia({
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
      }
    })
  },

  pushMessage(msg) {
    const all = wx.getStorageSync('privateMessages') || {}
    if (!all[this.data.userName]) {
      all[this.data.userName] = { avatar: this.data.userAvatar, messages: [] }
    }
    all[this.data.userName].messages.push(msg)
    wx.setStorageSync('privateMessages', all)

    this.setData({
      messages: [...this.data.messages, msg]
    })
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
    wx.previewImage({ urls: [src], current: src })
  },

  goBack() {
    wx.navigateBack()
  },

  goToUserHome() {
    wx.navigateTo({
      url: `/pages/userHome/userHome?author=${encodeURIComponent(this.data.userName)}`
    })
  }
})
