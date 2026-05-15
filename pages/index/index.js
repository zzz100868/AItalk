const common = require('../../utils/common.js')
const mockData = require('../../data/mockData.js')
const api = require('../../utils/api.js')

Page({
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
    // Voice state
    aiSpeaking: false,
    asrText: '',
    aiText: '',
  },

  socketTask: null,
  recorderManager: null,
  innerAudioContext: null,
  callStartedAt: null,
  timer: null,
  _pcmChunks: [],

  onLoad(options) {
    if (options.mode === 'call') {
      this.setData({ viewMode: 'call' })
    }
  },

  onShow() {
    const info = common.loadUserInfo()
    this.setData({ userName: info.name, userAvatar: info.avatar })
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
    this._stopAudio()
    this._closeSocket()
  },

  enterApp() {
    if (this.data.isTransitioning) return
    this.setData({ isTransitioning: true })
    setTimeout(() => {
      this.setData({ viewMode: 'call', isCalling: false, isTransitioning: false })
    }, 650)
  },

  startCall() {
    this._clearCallTimer()

    const wsUrl = api.getVoiceWsUrl()
    if (!wsUrl) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.callStartedAt = Date.now()
    this._pcmChunks = []
    this.setData({ isCalling: true, callDuration: '00:00', asrText: '', aiText: '' })
    this.startCallTimer()
    this._connectWebSocket(wsUrl)
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
    const seconds = Math.floor((Date.now() - this.callStartedAt) / 1000)
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    this.setData({ callDuration: `${mins}:${secs}` })
  },

  endCall() {
    this._syncCallDuration()
    this._clearCallTimer()
    this._stopRecording()
    this._stopAudio()

    // Send end message to server
    if (this.socketTask) {
      this._sendWs({ type: 'end' })
      // Wait briefly for session_end response, then close
      setTimeout(() => { this._closeSocket() }, 1000)
    }

    if (this._mockInterval) { clearInterval(this._mockInterval); this._mockInterval = null }
    this.callStartedAt = null
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    getApp().globalData.memoryTargetTab = 'archive'
    this.setData({
      viewMode: 'landing',
      isCalling: false,
      callDate: `今天 ${hours}:${minutes}`,
      isMuted: false,
      isSpeakerOn: false,
      aiSpeaking: false,
      asrText: '',
      aiText: '',
    }, () => {
      wx.switchTab({ url: '/pages/memory/memory' })
    })
  },

  toggleMute() {
    this.setData({ isMuted: !this.data.isMuted })
    if (this.data.isMuted) {
      this._stopRecording()
    } else {
      this._startRecording()
    }
    wx.showToast({ title: this.data.isMuted ? '已静音' : '取消静音', icon: 'none' })
  },

  toggleSpeaker() {
    this.setData({ isSpeakerOn: !this.data.isSpeakerOn })
    wx.showToast({ title: this.data.isSpeakerOn ? '免提已开' : '免提已关', icon: 'none' })
  },

  goToUserHome(e) {
    common.goToUserHome(e.detail?.author || e.currentTarget.dataset.author)
  },

  // ============ WebSocket ============

  _connectWebSocket(url) {
    const token = api.getToken()
    const wsUrl = token ? `${url}?token=${token}` : url
    console.log('[Voice] Connecting to:', wsUrl.slice(0, 80) + '...')
    this.socketTask = wx.connectSocket({
      url: wsUrl,
      success: () => {
        console.log('[Voice] WebSocket connecting...')
      },
      fail: (err) => {
        console.error('[Voice] WebSocket connect failed:', err)
        this._fallbackToMock()
      },
    })

    this.socketTask.onOpen(() => {
      console.log('[Voice] WebSocket connected')
      this._sendWs({ type: 'start' })
    })

    this.socketTask.onMessage((res) => {
      this._handleWsMessage(res.data)
    })

    this.socketTask.onClose(() => {
      console.log('[Voice] WebSocket closed')
      this.socketTask = null
    })

    this.socketTask.onError((err) => {
      console.error('[Voice] WebSocket error:', err)
      this._fallbackToMock()
    })
  },

  _handleWsMessage(raw) {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch (e) {
      console.error('[Voice] Invalid message:', raw)
      return
    }

    switch (msg.type) {
      case 'connected':
        console.log('[Voice] Session started:', msg.sessionId)
        break

      case 'asr_partial':
        this.setData({ asrText: msg.text })
        break

      case 'asr_final':
        this.setData({ asrText: msg.text })
        break

      case 'ai_reply_audio':
        this.setData({ aiSpeaking: true, aiText: msg.text || this.data.aiText })
        if (msg.pcmBase64) {
          this._pcmChunks.push(msg.pcmBase64)
        }
        break

      case 'ai_turn_end':
        this.setData({ aiSpeaking: false })
        this._playBufferedAudio()
        if (!this.data.isMuted) {
          this._startRecording()
        }
        break

      case 'session_soft_close':
        wx.showToast({ title: msg.reason, icon: 'none', duration: 3000 })
        break

      case 'session_end':
        console.log('[Voice] Session ended, duration:', msg.duration)
        break

      case 'error':
        console.error('[Voice] Server error:', msg.code, msg.message)
        if (msg.code === 'AUTH_FAILED') {
          wx.showToast({ title: '认证失败，请重新登录', icon: 'none' })
        }
        break
    }
  },

  _sendWs(data) {
    if (this.socketTask) {
      this.socketTask.send({
        data: JSON.stringify(data),
        fail: (err) => { console.error('[Voice] Send failed:', err) },
      })
    }
  },

  _closeSocket() {
    if (this.socketTask) {
      this.socketTask.close()
      this.socketTask = null
    }
  },

  // ============ Recording ============

  _startRecording() {
    if (!this.recorderManager) {
      this.recorderManager = wx.getRecorderManager()
      this.recorderManager.onFrameRecorded((res) => {
        if (res.frameBuffer && this.socketTask && !this.data.isMuted) {
          const base64 = wx.arrayBufferToBase64(res.frameBuffer)
          this._sendWs({ type: 'audio_chunk', seq: Date.now(), pcmBase64: base64 })
        }
      })
      this.recorderManager.onStop(() => {
        console.log('[Voice] Recording stopped')
      })
      this.recorderManager.onError((err) => {
        console.error('[Voice] Recording error:', err)
      })
    }

    this.recorderManager.start({
      format: 'PCM',
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      frameSize: 1, // ~40ms frames at 16kHz
    })
  },

  _stopRecording() {
    if (this.recorderManager) {
      this.recorderManager.stop()
    }
  },

  // ============ Audio Playback ============

  _playBufferedAudio() {
    if (this._pcmChunks.length === 0) return

    const allBase64 = this._pcmChunks.join('')
    this._pcmChunks = []

    const pcmBuffer = wx.base64ToArrayBuffer(allBase64)
    const wavBuffer = this._pcmToWav(pcmBuffer, 24000, 1, 16)

    const fs = wx.getFileSystemManager()
    const tempPath = `${wx.env.USER_DATA_PATH}/tts_${Date.now()}.wav`
    try {
      fs.writeFileSync(tempPath, wavBuffer)
    } catch (e) {
      console.error('[Voice] Failed to write temp audio file:', e)
      return
    }

    this._stopAudio()
    this.innerAudioContext = wx.createInnerAudioContext()
    this.innerAudioContext.src = tempPath
    this.innerAudioContext.autoplay = true
    if (this.data.isSpeakerOn) {
      this.innerAudioContext.obeyMuteSwitch = false
    }
    this.innerAudioContext.onEnded(() => {
      try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
    })
    this.innerAudioContext.onError((err) => {
      console.error('[Voice] Audio playback error:', err)
      try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
    })
  },

  _stopAudio() {
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
      this.innerAudioContext = null
    }
  },

  _pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
    const byteRate = sampleRate * numChannels * bitsPerSample / 8
    const blockAlign = numChannels * bitsPerSample / 8
    const dataSize = pcmBuffer.byteLength
    const headerSize = 44

    const buffer = new ArrayBuffer(headerSize + dataSize)
    const view = new DataView(buffer)

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    writeStr(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeStr(8, 'WAVE')
    writeStr(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)
    writeStr(36, 'data')
    view.setUint32(40, dataSize, true)

    const wavView = new Uint8Array(buffer)
    wavView.set(new Uint8Array(pcmBuffer), 44)

    return buffer
  },

  // ============ Fallback ============

  _fallbackToMock() {
    console.log('[Voice] Falling back to mock mode')
    this.setData({ isCalling: true })

    const MOCK_REPLIES = [
      '你好呀～最近怎么样？',
      '今天天气不错，适合出去走走呢。',
      '我最近读了一本很有趣的书，想不想听听？',
      '有时候安静地待着也挺好的。',
      '你有什么想聊的话题吗？',
    ]

    // Simulate AI greeting after 1s
    setTimeout(() => {
      const opening = '嘿，又来找我聊天啦！今天有什么新鲜事吗？'
      this.setData({ aiText: opening, aiSpeaking: true })
      setTimeout(() => {
        this.setData({ aiSpeaking: false })
      }, 2000)
    }, 1000)

    // Simulate sporadic mock replies
    this._mockInterval = setInterval(() => {
      if (!this.data.isCalling) return
      const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
      this.setData({ aiText: reply, aiSpeaking: true })
      setTimeout(() => {
        this.setData({ aiSpeaking: false })
      }, 2000)
    }, 8000)
  },
})
