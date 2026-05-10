var request = require('./request.js')
var mockData = require('../data/mockData.js')

var USE_MOCK = true
var BASE_URL = ''

var http = request.create({
  baseUrl: BASE_URL,
  retry: 2,
  retryDelay: 1000
})

function mockDelay(data, ms) {
  ms = ms || (200 + Math.random() * 300)
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(data)
    }, ms)
  })
}

// ─── 用户相关 ───

function getUserProfile() {
  if (USE_MOCK) {
    var userStore = require('../stores/userStore.js')
    return mockDelay(userStore.getState())
  }
  return http.get('/api/user/profile', null, { silent: true })
}

function updateUserProfile(data) {
  if (USE_MOCK) {
    var userStore = require('../stores/userStore.js')
    userStore.setState(data)
    return mockDelay({ success: true })
  }
  return http.put('/api/user/profile', data)
}

// ─── 聊天相关 ───

function getChatHistory(page, size) {
  if (USE_MOCK) {
    var messages = mockData.getMemoryData().messages
    var start = Math.max(0, messages.length - page * size)
    var end = Math.max(0, messages.length - (page - 1) * size)
    return mockDelay({
      list: messages.slice(start, end),
      total: messages.length,
      hasMore: start > 0
    })
  }
  return http.get('/api/chat/history', { page: page, size: size }, { silent: true })
}

function sendChatMessage(content) {
  if (USE_MOCK) {
    var replies = mockData.MEMORY_REPLIES
    var reply = replies[Math.floor(Math.random() * replies.length)]
    return mockDelay({
      reply: reply,
      id: Date.now() + '_ai'
    }, 600 + Math.random() * 600)
  }
  return http.post('/api/chat/send', { content: content })
}

// ─── 匹配相关 ───

function getMatchCandidates() {
  if (USE_MOCK) {
    return mockDelay(mockData.getMatchCandidates())
  }
  return http.get('/api/match/candidates')
}

// ─── 记忆/洞察相关 ───

function getInsights(category) {
  if (USE_MOCK) {
    var data = mockData.getMemoryData()
    var insights = data.insights
    if (category && category !== 'all') {
      insights = insights.filter(function (i) { return i.category === category })
    }
    return mockDelay(insights)
  }
  return http.get('/api/insights', { category: category }, { silent: true })
}

function updateInsight(id, data) {
  if (USE_MOCK) {
    return mockDelay({ success: true, id: id })
  }
  return http.put('/api/insights/' + id, data)
}

function deleteInsight(id) {
  if (USE_MOCK) {
    return mockDelay({ success: true })
  }
  return http.delete('/api/insights/' + id)
}

// ─── 档案相关 ───

function getArchiveData() {
  if (USE_MOCK) {
    var data = mockData.getMemoryData()
    return mockDelay({
      aboutMe: data.aboutMe,
      personalities: data.personalities,
      traits: data.traits
    })
  }
  return http.get('/api/archive', null, { silent: true })
}

module.exports = {
  getUserProfile: getUserProfile,
  updateUserProfile: updateUserProfile,
  getChatHistory: getChatHistory,
  sendChatMessage: sendChatMessage,
  getMatchCandidates: getMatchCandidates,
  getInsights: getInsights,
  updateInsight: updateInsight,
  deleteInsight: deleteInsight,
  getArchiveData: getArchiveData
}
