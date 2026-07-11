var common = require('../../utils/common.js')
var mockData = require('../../data/mockData.js')
var api = require('../../utils/api.js')
var connectPage = require('../../stores/connect.js').connectPage
var appStore = require('../../stores/appStore.js')

var MOCK_REPLIES = [
  '我在呢。刚才网络有点不稳定，我们先用模拟通话继续聊。',
  '嗯，我听着。你可以继续说说今天最想被理解的那件事。',
  '这听起来挺重要的。你愿意多讲一点当时的感受吗？',
  '我会先记下这些线索，等连接恢复后再继续完整通话。',
  '不用着急，我们慢慢聊。你现在最想从哪里开始？'
]

Page({
  behaviors: [
    connectPage('user', function (state) {
      return {
        userName: state.nickName || mockData.DEFAULT_USER.nickName,
        userAvatar: state.avatar || mockData.DEFAULT_USER.avatarSmall
      }
    })
  ],

  data: {
    viewMode: 'landing',
    isTransitioning: false,
    isCalling: false,
    callDuration: '12:38',
    callDate: '今天 14:20',
    isMuted: false,
    isSpeakerOn: false,
    aiSpeaking: false,
    asrText: '',
    aiText: '',
    userName: mockData.DEFAULT_USER.nickName,
    aiName: mockData.AI_USERS.xiaoya.name,
    aiAvatar: mockData.AI_USERS.xiaoya.avatar,
    userAvatar: mockData.DEFAULT_USER.avatarSmall,
    ageRange: Array.from({ length: 63 }, function (_, i) { return i + 18 }),
    ageIndex: -1,
    genderOptions: ['男', '女', '其他'],
    gender: '',
    orientationOptions: ['异性恋', '同性恋', '双性恋', '其他'],
    orientation: '',
    identityOptions: ['学生', '上班族', '自由职业', '创业者', '其他'],
    identityIndex: -1,
    mbtiOptions: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'],
    mbtiIndex: -1,
    recentStatus: '',
    canStart: false
  },

  onLoad(options) {
    this.socketTask = null
    this.recorderManager = null
    this.innerAudioContext = null
    this.callStartedAt = null
    this.timer = null
    this._ttsQueue = []
    this._ttsTurnEnded = false
    this._currentTtsTempPath = ''
    this._isRecording = false
    this._isPlayingAiAudio = false
    this._ttsAudioFormat = 'pcm'
    this._ttsSampleRate = 24000
    this._ttsVolume = 0.45
    this._asrReady = false
    this._listenReadySent = false
    this._audioSeq = 0
    this._mockInterval = null
    this._mockSpeakTimer = null

    if (options.mode === 'call') {
      this.setData({ viewMode: 'call' })
    }
    var saved = common.storage.get('basicInfo', null)
    if (saved) {
      var ageIndex = this.data.ageRange.indexOf(saved.age)
      var identityIndex = this.data.identityOptions.indexOf(saved.identity)
      var mbtiIndex = this.data.mbtiOptions.indexOf(saved.mbti)
      this.setData({
        ageIndex: ageIndex >= 0 ? ageIndex : -1,
        gender: saved.gender || '',
        orientation: saved.orientation || '',
        identityIndex: identityIndex >= 0 ? identityIndex : -1,
        mbtiIndex: mbtiIndex >= 0 ? mbtiIndex : -1,
        recentStatus: saved.recentStatus || ''
      }, () => this._checkCanStart())
    }
  },

  onShow() {
    if (this.data.isTransitioning) {
      this.setData({ isTransitioning: false })
    }
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
      this.setData({ viewMode: 'form', isTransitioning: false })
    }, 650)
  },

  _checkCanStart() {
    var d = this.data
    var canStart = d.ageIndex !== -1 && d.gender && d.orientation && d.identityIndex !== -1 && d.mbtiIndex !== -1 && d.recentStatus.trim().length > 0
    if (canStart !== d.canStart) {
      this.setData({ canStart: canStart })
    }
  },

  onIdentityChange(e) {
    this.setData({ identityIndex: parseInt(e.detail.value) }, () => this._checkCanStart())
  },

  onMbtiChange(e) {
    this.setData({ mbtiIndex: parseInt(e.detail.value) }, () => this._checkCanStart())
  },

  onStatusInput(e) {
    this.setData({ recentStatus: e.detail.value }, () => this._checkCanStart())
  },

  onAgeChange(e) {
    this.setData({ ageIndex: parseInt(e.detail.value) }, () => this._checkCanStart())
  },

  selectGender(e) {
    this.setData({ gender: e.currentTarget.dataset.value }, () => this._checkCanStart())
  },

  selectOrientation(e) {
    this.setData({ orientation: e.currentTarget.dataset.value }, () => this._checkCanStart())
  },

  submitForm() {
    if (!this.data.canStart) return
    var d = this.data
    common.storage.set('basicInfo', {
      age: d.ageRange[d.ageIndex],
      gender: d.gender,
      orientation: d.orientation,
      identity: d.identityOptions[d.identityIndex],
      mbti: d.mbtiOptions[d.mbtiIndex],
      recentStatus: d.recentStatus.trim()
    })
    this.setData({ viewMode: 'call', isCalling: false })
  },

  startCall() {
    this._clearCallTimer()

    var wsUrl = api.getVoiceWsUrl()
    if (!wsUrl) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.callStartedAt = Date.now()
    this._ttsQueue = []
    this._ttsTurnEnded = false
    this._currentTtsTempPath = ''
    this._audioSeq = 0
    this._isPlayingAiAudio = false
    this._ttsAudioFormat = 'pcm'
    this._ttsSampleRate = 24000
    this._ttsVolume = 0.45
    this._asrReady = false
    this._listenReadySent = false
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
    var seconds = Math.floor((Date.now() - this.callStartedAt) / 1000)
    var mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    var secs = (seconds % 60).toString().padStart(2, '0')
    this.setData({ callDuration: mins + ':' + secs })
  },

  endCall() {
    this.setData({ isCalling: false, aiSpeaking: false })
    this._asrReady = false
    this._listenReadySent = false
    this._isPlayingAiAudio = false
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
    if (this._mockSpeakTimer) { clearTimeout(this._mockSpeakTimer); this._mockSpeakTimer = null }
    this._ttsQueue = []
    this._ttsTurnEnded = false
    this.callStartedAt = null
    wx.switchTab({ url: '/pages/match/match' })
  },

  toggleMute() {
    this.setData({ isMuted: !this.data.isMuted })
    if (this.data.isMuted) {
      this._stopRecording()
    } else {
      if (this._asrReady) {
        this._resumeRecordingIfAllowed()
      } else {
        this._notifyReadyToListen()
      }
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

  onAvatarError() {
    this.setData({ aiAvatar: '/images/avatar_fallback.png' })
  },

  // ─── WebSocket 语音通话 ───

  _connectWebSocket(wsUrl) {
    var self = this
    this.socketTask = wx.connectSocket({
      url: wsUrl,
      success: function () {
        console.log('[Voice] WebSocket connecting...')
      },
      fail: function (err) {
        console.error('[Voice] WebSocket connect failed:', err)
        wx.showToast({ title: '连接失败', icon: 'none' })
        self._fallbackToMock()
      }
    })

    this.socketTask.onOpen(function () {
      console.log('[Voice] WebSocket connected')
      self._sendWs({ type: 'start' })
    })

    this.socketTask.onMessage(function (res) {
      var msg
      try { msg = JSON.parse(res.data) } catch (e) { return }
      self._handleWsMessage(msg)
    })

    this.socketTask.onError(function (err) {
      console.error('[Voice] WebSocket error:', err)
      self._fallbackToMock()
    })

    this.socketTask.onClose(function () {
      console.log('[Voice] WebSocket closed')
      self.socketTask = null
    })
  },

  _handleWsMessage(msg) {
    switch (msg.type) {
      case 'connected':
        console.log('[Voice] Session:', msg.sessionId)
        break
      case 'asr_partial':
        this.setData({ asrText: msg.text || '…', aiSpeaking: false })
        break
      case 'asr_final':
        this._asrReady = false
        this.setData({ asrText: msg.text || '', aiSpeaking: false })
        break
      case 'asr_ready':
        this._asrReady = true
        this._listenReadySent = false
        this._resumeRecordingIfAllowed()
        break
      case 'ai_reply_audio':
        if (msg.text) {
          this._asrReady = false
          this._listenReadySent = false
          this._ttsQueue = []
          this._ttsTurnEnded = false
          this._ttsAudioFormat = 'pcm'
          this._ttsSampleRate = 24000
          this._stopAudio()
        }
        if (msg.audioFormat) {
          this._ttsAudioFormat = msg.audioFormat
        }
        if (msg.sampleRate) {
          this._ttsSampleRate = msg.sampleRate
        }
        if (msg.pcmBase64) {
          this._enqueueTtsAudio({
            pcmBase64: msg.pcmBase64,
            audioFormat: this._ttsAudioFormat,
            sampleRate: this._ttsSampleRate
          })
        }
        if (msg.text) {
          this.setData({ aiText: msg.text, aiSpeaking: true })
        }
        break
      case 'ai_turn_end':
        this.setData({ aiSpeaking: false })
        this._ttsTurnEnded = true
        if (msg.interrupted) {
          this._ttsQueue = []
          this._stopAudio()
          this._resumeRecordingIfAllowed()
          break
        }
        this._asrReady = false
        this._playNextAudioChunk()
        break
      case 'session_soft_close':
        wx.showToast({ title: '通话即将结束', icon: 'none' })
        break
      case 'session_end':
        this.endCall()
        break
    }
  },

  _sendWs(msg) {
    if (this.socketTask) {
      this.socketTask.send({ data: JSON.stringify(msg) })
    }
  },

  _closeSocket() {
    if (this.socketTask) {
      try { this.socketTask.close() } catch (e) {}
      this.socketTask = null
    }
  },

  // ─── 录音 ───

  _startRecording() {
    var self = this
    if (!this.recorderManager) {
      this.recorderManager = wx.getRecorderManager()
      this.recorderManager.onFrameRecorded(function (res) {
        if (!self._asrReady) return
        if (self.data.isMuted) return
        if (res.frameBuffer && self.socketTask) {
          var base64 = wx.arrayBufferToBase64(res.frameBuffer)
          self._sendWs({ type: 'audio_chunk', seq: self._audioSeq++, pcmBase64: base64 })
        }
      })
      this.recorderManager.onError(function (err) {
        console.error('[Voice] Recorder error:', err)
      })
    }

    if (this._isRecording) return
    this._isRecording = true
    this.recorderManager.start({
      format: 'PCM',
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      frameSize: 6.4
    })
  },

  _stopRecording() {
    if (this.recorderManager && this._isRecording) {
      this._isRecording = false
      try { this.recorderManager.stop() } catch (e) {}
    }
  },

  _resumeRecordingIfAllowed() {
    if (!this._asrReady) return
    if (!this.data.isCalling || this.data.isMuted) return
    this._startRecording()
  },

  _notifyReadyToListen() {
    if (!this.data.isCalling || this._listenReadySent) return
    if (this.data.isMuted || this.data.aiSpeaking || this._isPlayingAiAudio) return
    this._listenReadySent = true
    this._asrReady = false
    this._sendWs({ type: 'listen_ready' })
  },

  // ─── 音频播放（PCM → WAV） ───

  _stopAudio() {
    this._isPlayingAiAudio = false
    if (this.innerAudioContext) {
      try {
        this.innerAudioContext.stop()
        this.innerAudioContext.destroy()
      } catch (e) {}
      this.innerAudioContext = null
    }
    if (this._currentTtsTempPath) {
      this._cleanupTempAudio(this._currentTtsTempPath)
      this._currentTtsTempPath = ''
    }
  },

  _enqueueTtsAudio(item) {
    if (!item || !item.pcmBase64) return
    this._ttsQueue.push(item)
    this._playNextAudioChunk()
  },

  _playNextAudioChunk() {
    if (this._isPlayingAiAudio) return

    var item = this._ttsQueue.shift()
    if (!item) {
      if (this._ttsTurnEnded) {
        this._notifyReadyToListen()
      }
      return
    }

    this._playTtsAudioChunk(item)
  },

  _playTtsAudioChunk(item) {
    var audioBuffer = wx.base64ToArrayBuffer(item.pcmBase64)
    var audioFormat = item.audioFormat || this._ttsAudioFormat || 'pcm'
    var sampleRate = item.sampleRate || this._ttsSampleRate || 24000
    var playableBuffer = audioBuffer
    var fileExt = 'wav'

    if (audioFormat === 'pcm') {
      if (!this._isPcm16Safe(audioBuffer)) {
        console.error('[Voice] Unsafe PCM payload rejected')
        this._playNextAudioChunk()
        return
      }
      playableBuffer = this._pcmToWav(this._limitPcm16(audioBuffer, 0.82), sampleRate, 1, 16)
    } else if (audioFormat === 'wav') {
      fileExt = 'wav'
    } else if (audioFormat === 'mp3') {
      fileExt = 'mp3'
    } else if (audioFormat === 'ogg_opus') {
      fileExt = 'ogg'
    } else {
      console.error('[Voice] Unsupported TTS audio format:', audioFormat)
      this._playNextAudioChunk()
      return
    }

    var fs = wx.getFileSystemManager()
    var tempPath = wx.env.USER_DATA_PATH + '/tts_' + Date.now() + '.' + fileExt
    try {
      fs.writeFileSync(tempPath, playableBuffer)
    } catch (e) {
      console.error('[Voice] Write TTS audio failed:', e)
      this._playNextAudioChunk()
      return
    }

    this._isPlayingAiAudio = true
    this._currentTtsTempPath = tempPath
    var self = this
    this.innerAudioContext = wx.createInnerAudioContext()
    this.innerAudioContext.src = tempPath
    this.innerAudioContext.volume = this._ttsVolume || 0.45
    this.innerAudioContext.autoplay = true
    this.innerAudioContext.onEnded(function () {
      self._cleanupTempAudio(tempPath)
      if (self._currentTtsTempPath !== tempPath) return
      self._currentTtsTempPath = ''
      self.innerAudioContext = null
      self._isPlayingAiAudio = false
      self._playNextAudioChunk()
    })
    this.innerAudioContext.onError(function (err) {
      console.error('[Voice] Audio play error:', err)
      self._cleanupTempAudio(tempPath)
      if (self._currentTtsTempPath !== tempPath) return
      self._currentTtsTempPath = ''
      self.innerAudioContext = null
      self._isPlayingAiAudio = false
      self._playNextAudioChunk()
    })
  },

  _cleanupTempAudio(path) {
    try {
      wx.getFileSystemManager().unlink({ filePath: path })
    } catch (e) {}
  },

  _limitPcm16(pcmBuffer, peakRatio) {
    var bytes = new Uint8Array(pcmBuffer)
    var limited = new ArrayBuffer(bytes.byteLength)
    var input = new DataView(pcmBuffer)
    var output = new DataView(limited)
    var max = Math.max(1, Math.min(32767, Math.floor(32767 * (peakRatio || 0.82))))
    var sampleCount = Math.floor(bytes.byteLength / 2)

    for (var i = 0; i < sampleCount; i++) {
      var offset = i * 2
      var sample = input.getInt16(offset, true)
      if (sample > max) sample = max
      if (sample < -max) sample = -max
      output.setInt16(offset, sample, true)
    }

    if (bytes.byteLength % 2 === 1) {
      new Uint8Array(limited)[bytes.byteLength - 1] = bytes[bytes.byteLength - 1]
    }

    return limited
  },

  _isPcm16Safe(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.byteLength < 2 || pcmBuffer.byteLength % 2 !== 0) return false

    var view = new DataView(pcmBuffer)
    var sampleCount = Math.floor(pcmBuffer.byteLength / 2)
    var peak = 0
    var sumSquares = 0

    for (var i = 0; i < sampleCount; i++) {
      var sample = view.getInt16(i * 2, true)
      var abs = Math.abs(sample)
      if (abs > peak) peak = abs
      sumSquares += sample * sample
    }

    var rms = Math.sqrt(sumSquares / sampleCount)
    var peakRatio = peak / 32768
    var rmsRatio = rms / 32768

    if (peakRatio > 0.98 && rmsRatio > 0.45) {
      console.error('[Voice] PCM level too hot:', peakRatio, rmsRatio)
      return false
    }

    return true
  },

  _pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
    var byteRate = sampleRate * numChannels * bitsPerSample / 8
    var blockAlign = numChannels * bitsPerSample / 8
    var dataSize = pcmBuffer.byteLength
    var headerSize = 44
    var buffer = new ArrayBuffer(headerSize + dataSize)
    var view = new DataView(buffer)

    // RIFF header
    view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46)
    view.setUint32(4, 36 + dataSize, true)
    view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45)

    // fmt sub-chunk
    view.setUint8(12, 0x66); view.setUint8(13, 0x6D); view.setUint8(14, 0x74); view.setUint8(15, 0x20)
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)

    // data sub-chunk
    view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61)
    view.setUint32(40, dataSize, true)

    // PCM data
    var pcmView = new Uint8Array(pcmBuffer)
    var wavView = new Uint8Array(buffer)
    wavView.set(pcmView, headerSize)

    return buffer
  },

  // ─── Mock 降级 ───

  _fallbackToMock() {
    var self = this
    if (this._mockInterval) return
    console.log('[Voice] Falling back to mock mode')

    this._asrReady = false
    this._listenReadySent = false
    this._ttsQueue = []
    this._ttsTurnEnded = false
    this._stopRecording()
    this._stopAudio()
    this._closeSocket()

    var replyIndex = 0
    var speak = function () {
      if (!self.data.isCalling) {
        clearInterval(self._mockInterval)
        self._mockInterval = null
        if (self._mockSpeakTimer) {
          clearTimeout(self._mockSpeakTimer)
          self._mockSpeakTimer = null
        }
        return
      }

      var text = MOCK_REPLIES[replyIndex % MOCK_REPLIES.length]
      replyIndex++
      self.setData({ aiText: text, aiSpeaking: true })

      if (self._mockSpeakTimer) clearTimeout(self._mockSpeakTimer)
      self._mockSpeakTimer = setTimeout(function () {
        if (self.data.isCalling) {
          self.setData({ aiSpeaking: false })
        }
        self._mockSpeakTimer = null
      }, 1000)
    }

    speak()
    this._mockInterval = setInterval(speak, 5000)
  }
})
