/**
 * API 业务模块 — 统一封装后端调用 + Mock 回落
 *
 * 策略：每个方法先调后端，catch 时回落 mock 数据。
 * 无后端时前端可完全正常使用。
 */

var mockData = require('../data/mockData.js')

var TOKEN_KEY = 'aitalk_token'

// 开发环境：模拟器用 localhost，真机用电脑 WiFi IP
var IS_DEV_DEVICE = true  // 模拟器时改为 false
var DEV_HOST = IS_DEV_DEVICE ? '172.20.10.3' : 'localhost'
var BASE_URL = 'http://' + DEV_HOST + ':3000/api'
var WS_VOICE_URL = 'ws://' + DEV_HOST + ':3001/ws/voice'
var _tokenCache = null

// ─── Token 管理 ───

function getToken() {
  if (_tokenCache !== null) return _tokenCache
  try {
    _tokenCache = wx.getStorageSync(TOKEN_KEY) || null
  } catch (e) {
    _tokenCache = null
  }
  return _tokenCache
}

function setToken(token) {
  _tokenCache = token
  if (token) {
    wx.setStorageSync(TOKEN_KEY, token)
  } else {
    try { wx.removeStorageSync(TOKEN_KEY) } catch (e) {}
  }
}

function clearToken() {
  setToken(null)
}

// ─── HTTP 基础封装 ───

function request(method, path, data, opts) {
  opts = opts || {}
  var noAuth = opts.noAuth || false
  var url = BASE_URL + path
  var header = { 'Content-Type': 'application/json' }

  if (!noAuth) {
    var token = getToken()
    if (!token) {
      console.log('[API] AUTH_BLOCKED | path=' + path + ' | token=null')
      return Promise.reject({ code: 'AUTH_REQUIRED', message: '请先登录' })
    }
    header['Authorization'] = 'Bearer ' + token
  }

  console.log('[API] REQ | method=' + method + ' | url=' + url + ' | noAuth=' + noAuth + ' | hasToken=' + (getToken() ? 'yes' : 'no'))

  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      method: method,
      header: header,
      data: method === 'GET' ? data : (data ? JSON.stringify(data) : undefined),
      success: function (res) {
        console.log('[API] RES | url=' + url + ' | statusCode=' + res.statusCode + ' | data=' + JSON.stringify(res.data))
        var statusCode = res.statusCode
        var body = res.data
        if (statusCode >= 200 && statusCode < 300) {
          resolve(body)
        } else if (statusCode === 401) {
          clearToken()
          reject(body || { code: 'AUTH_EXPIRED' })
        } else {
          reject(body || { code: 'REQUEST_FAILED', message: '请求失败' })
        }
      },
      fail: function (err) {
        console.log('[API] FAIL | url=' + url + ' | errMsg=' + (err.errMsg || 'unknown'))
        reject({ code: 'NETWORK_ERROR', message: err.errMsg || '网络异常' })
      }
    })
  })
}

function get(path, params, opts) { return request('GET', path, params, opts) }
function post(path, data, opts) { return request('POST', path, data, opts) }
function put(path, data, opts) { return request('PUT', path, data, opts) }
function del(path, opts) { return request('DELETE', path, null, opts) }

// ─── Auth ───

function login(code) {
  console.log('[API] login called | code=' + (code ? code.slice(0, 10) + '...' : 'null/empty') + ' | codeLen=' + (code ? code.length : 0))
  console.log('[API] login URL=' + BASE_URL + '/auth/wx-login')
  console.log('[API] login tokenBefore=' + (getToken() || 'null'))

  return post('/auth/wx-login', { code: code }, { noAuth: true }).then(function (res) {
    console.log('[API] login response | res=' + JSON.stringify(res))
    console.log('[API] login res.token=' + (res.token ? res.token.slice(0, 20) + '...' : 'null/empty'))
    console.log('[API] login res.user=' + (res.user ? JSON.stringify(res.user) : 'null/empty'))
    if (res.token) {
      setToken(res.token)
      console.log('[API] login tokenSaved | tokenAfter=' + (getToken() || 'null').slice(0, 20) + '...')
    } else {
      console.log('[API] login res.token is empty/undefined')
    }
    return res
  }).catch(function (err) {
    console.log('[API] login FAILED | err=' + JSON.stringify(err))
    throw err
  })
}

// ─── Profile ───

function getMe() {
  return get('/me').catch(function () {
    return null
  })
}

function updateMe(data) {
  return put('/me', data).catch(function () {
    return null
  })
}

function getPhotos() {
  return get('/me/photos').catch(function () {
    return { photos: [] }
  })
}

function addPhoto(url) {
  return post('/me/photos', { url: url }).catch(function () {
    return null
  })
}

function deletePhoto(id) {
  return del('/me/photos/' + id).catch(function () {
    return null
  })
}

function getUserHome(author) {
  return get('/users/' + encodeURIComponent(author) + '/home').catch(function () {
    return null
  })
}

// ─── Memory Chat ───

function sendChatMessage(content) {
  return post('/memory/chat', { content: content }).then(function (res) {
    return {
      id: res.reply ? res.reply.id : (Date.now() + '_ai'),
      reply: res.reply ? res.reply.content : '我在听，你继续说。'
    }
  }).catch(function () {
    var memoryData = mockData.getMemoryData()
    var replies = memoryData.replies || mockData.MEMORY_REPLIES || ['我在听，你继续说。']
    var reply = replies[Math.floor(Math.random() * replies.length)]
    return {
      id: Date.now() + '_ai',
      reply: reply || '我在听，你继续说。'
    }
  })
}

function getChatHistory(cursor, limit) {
  var params = { limit: limit || 50 }
  if (cursor) params.cursor = cursor
  return get('/memory/chat', params).catch(function () {
    return { data: [], hasMore: false, cursor: null, meta: { chatDays: '1天', chatMood: '平静', chatTopics: 0 } }
  })
}

// ─── Memory Insights ───

function getInsights(category) {
  var params = {}
  if (category && category !== 'all') params.category = category
  return get('/memory/insights', params).then(function (res) {
    return res.data || []
  }).catch(function () {
    return null
  })
}

function updateInsight(id, data) {
  return put('/memory/insights/' + id, data).catch(function () {
    return null
  })
}

function deleteInsight(id) {
  return del('/memory/insights/' + id).catch(function () {
    return null
  })
}

// ─── Memory Archive ───

function getArchive() {
  return get('/memory/archive').catch(function () {
    var memoryData = mockData.getMemoryData()
    return {
      aboutMe: memoryData.aboutMe,
      personalities: memoryData.personalities,
      traits: memoryData.traits
    }
  })
}

// ─── Match ───

function getMatchCurrent() {
  return get('/match/current').catch(function () {
    return null
  })
}

function doMatch() {
  return post('/match/do').catch(function () {
    var candidates = mockData.getMatchCandidates()
    if (!candidates || candidates.length === 0) {
      return { success: false, match: null }
    }
    var match = candidates[Math.floor(Math.random() * candidates.length)]
    return { success: true, match: match }
  })
}

function submitMatchFeedback(matchId, data) {
  return post('/match/' + matchId + '/feedback', data).catch(function () {
    return null
  })
}

// ─── Notifications ───

function getNotifications(params) {
  return get('/notifications', params).catch(function () {
    return null
  })
}

function markNotificationsRead() {
  return put('/notifications/read-all').catch(function () {
    return null
  })
}

function clearNotifications() {
  return del('/notifications').catch(function () {
    return null
  })
}

// ─── Voice ───

function getVoiceWsUrl() {
  var token = getToken()
  if (!token) return null
  return WS_VOICE_URL + '?token=' + encodeURIComponent(token)
}

// ─── Exports ───

module.exports = {
  // Token
  getToken: getToken,
  setToken: setToken,
  clearToken: clearToken,
  // HTTP
  get: get,
  post: post,
  put: put,
  del: del,
  // Auth
  login: login,
  // Profile
  getMe: getMe,
  updateMe: updateMe,
  getPhotos: getPhotos,
  addPhoto: addPhoto,
  deletePhoto: deletePhoto,
  getUserHome: getUserHome,
  // Memory
  sendChatMessage: sendChatMessage,
  getChatHistory: getChatHistory,
  getInsights: getInsights,
  updateInsight: updateInsight,
  deleteInsight: deleteInsight,
  getArchive: getArchive,
  // Match
  getMatchCurrent: getMatchCurrent,
  doMatch: doMatch,
  submitMatchFeedback: submitMatchFeedback,
  // Notifications
  getNotifications: getNotifications,
  markNotificationsRead: markNotificationsRead,
  clearNotifications: clearNotifications,
  // Voice
  getVoiceWsUrl: getVoiceWsUrl,
  // Constants
  BASE_URL: BASE_URL,
  WS_VOICE_URL: WS_VOICE_URL
}
