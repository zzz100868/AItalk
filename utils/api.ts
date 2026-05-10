const request = require('./request.js')
const mockData = require('../data/mockData.js')

const USE_MOCK = true
const BASE_URL = ''

interface HttpInstance {
  get: (url: string, data?: any, config?: any) => Promise<any>
  post: (url: string, data?: any, config?: any) => Promise<any>
  put: (url: string, data?: any, config?: any) => Promise<any>
  delete: (url: string, data?: any, config?: any) => Promise<any>
}

const http: HttpInstance = request.create({
  baseUrl: BASE_URL,
  retry: 2,
  retryDelay: 1000
})

interface ChatMessage {
  id: number | string
  sender: 'user' | 'ai'
  content: string
}

interface ChatHistoryResponse {
  list: ChatMessage[]
  total: number
  hasMore: boolean
}

interface SendChatMessageResponse {
  reply: string
  id: string
}

interface InsightItem {
  id: number
  date: string
  title: string
  content: string
  tag: string
  tagColor: string
  category: string
}

interface ArchiveData {
  aboutMe: string
  personalities: Array<{ name: string; desc: string }>
  traits: Array<{ name: string; color: string }>
}

interface ApiSuccess {
  success: boolean
}

interface ApiSuccessWithId extends ApiSuccess {
  id: number | string
}

function mockDelay<T>(data: T, ms?: number): Promise<T> {
  ms = ms || (200 + Math.random() * 300)
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(data)
    }, ms)
  })
}

// ─── 用户相关 ───

function getUserProfile(): Promise<any> {
  if (USE_MOCK) {
    const userStore = require('../stores/userStore.js')
    return mockDelay(userStore.getState())
  }
  return http.get('/api/user/profile', null, { silent: true })
}

function updateUserProfile(data: any): Promise<ApiSuccess> {
  if (USE_MOCK) {
    const userStore = require('../stores/userStore.js')
    userStore.setState(data)
    return mockDelay({ success: true })
  }
  return http.put('/api/user/profile', data)
}

// ─── 聊天相关 ───

function getChatHistory(page: number, size: number): Promise<ChatHistoryResponse> {
  if (USE_MOCK) {
    const messages = mockData.getMemoryData().messages as ChatMessage[]
    const start = Math.max(0, messages.length - page * size)
    const end = Math.max(0, messages.length - (page - 1) * size)
    return mockDelay({
      list: messages.slice(start, end),
      total: messages.length,
      hasMore: start > 0
    })
  }
  return http.get('/api/chat/history', { page: page, size: size }, { silent: true })
}

function _pickMockReply(content: string): string {
  try {
    const category: string = mockData.selectReplyCategory(content)
    let replies: string[] = mockData.CHAT_REPLIES[category] || mockData.CHAT_REPLIES.default
    if (!replies || replies.length === 0) {
      replies = mockData.MEMORY_REPLIES
    }
    const reply = replies[Math.floor(Math.random() * replies.length)]
    if (!reply) {
      return '我在听，你继续说。'
    }
    return reply
  } catch (e) {
    return '我在听，你继续说。'
  }
}

function sendChatMessage(content: string): Promise<SendChatMessageResponse> {
  if (USE_MOCK) {
    const reply = _pickMockReply(content)
    return mockDelay({
      reply: reply,
      id: Date.now() + '_ai'
    }, 600 + Math.random() * 600)
  }
  return http.post('/api/chat/send', { content: content })
}

// ─── 匹配相关 ───

function getMatchCandidates(): Promise<any[]> {
  if (USE_MOCK) {
    return mockDelay(mockData.getMatchCandidates())
  }
  return http.get('/api/match/candidates')
}

// ─── 记忆/洞察相关 ───

function getInsights(category: string): Promise<InsightItem[]> {
  if (USE_MOCK) {
    const data = mockData.getMemoryData()
    let insights: InsightItem[] = data.insights
    if (category && category !== 'all') {
      insights = insights.filter(function (i: InsightItem) { return i.category === category })
    }
    return mockDelay(insights)
  }
  return http.get('/api/insights', { category: category }, { silent: true })
}

function updateInsight(id: number | string, data: any): Promise<ApiSuccessWithId> {
  if (USE_MOCK) {
    return mockDelay({ success: true, id: id })
  }
  return http.put('/api/insights/' + id, data)
}

function deleteInsight(id: number | string): Promise<ApiSuccess> {
  if (USE_MOCK) {
    return mockDelay({ success: true })
  }
  return http.delete('/api/insights/' + id)
}

// ─── 档案相关 ───

function getArchiveData(): Promise<ArchiveData> {
  if (USE_MOCK) {
    const data = mockData.getMemoryData()
    return mockDelay({
      aboutMe: data.aboutMe,
      personalities: data.personalities,
      traits: data.traits
    })
  }
  return http.get('/api/archive', null, { silent: true })
}

export = {
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
