/**
 * API 通用模块 — 封装 wx.request，统一管理 token / baseURL / 错误处理
 *
 * 使用方法：
 *   const api = require('../../utils/api.js')
 *   const data = await api.get('/me')
 *   const res = await api.post('/auth/wx-login', { code })
 *
 * 所有接口自动带 Authorization header（wx-login 除外）。
 * 401 时自动清除 token，跳回登录。
 */

const TOKEN_KEY = 'aitalk_token'
const BASE_URL = 'http://localhost:3000/api'
const WS_VOICE_URL = 'ws://localhost:3001/ws/voice'

let _tokenCache = null

/**
 * 读取当前 token（内存缓存 → storage）
 */
function getToken() {
  if (_tokenCache !== null) return _tokenCache
  try {
    _tokenCache = wx.getStorageSync(TOKEN_KEY) || null
  } catch (e) {
    _tokenCache = null
  }
  return _tokenCache
}

/**
 * 保存 token（内存 + storage）
 */
function setToken(token) {
  _tokenCache = token
  if (token) {
    wx.setStorageSync(TOKEN_KEY, token)
  } else {
    try { wx.removeStorageSync(TOKEN_KEY) } catch (e) {}
  }
}

/**
 * 清除 token（登出用）
 */
function clearToken() {
  setToken(null)
}

/**
 * 带认证的请求封装
 * @param {string} method   - HTTP method
 * @param {string} path     - 路径（如 /me），自动拼接 BASE_URL
 * @param {object} [data]   - 请求体（GET 时拼为 query）
 * @param {object} [opts]   - 额外选项 { noAuth: true, loading: false }
 * @returns {Promise<any>}   - 解析后的响应 data
 */
function request(method, path, data, opts = {}) {
  const { noAuth = false, loading = false } = opts
  const url = BASE_URL + path
  const header = { 'Content-Type': 'application/json' }

  if (!noAuth) {
    const token = getToken()
    if (!token) {
      return Promise.reject({ code: 'AUTH_REQUIRED', message: '请先登录' })
    }
    header['Authorization'] = 'Bearer ' + token
  }

  if (loading) {
    wx.showLoading({ title: '加载中...', mask: true })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      header,
      data: method === 'GET' ? data : JSON.stringify(data),
      success(res) {
        if (loading) wx.hideLoading()
        const { statusCode, data: body } = res
        if (statusCode >= 200 && statusCode < 300) {
          resolve(body)
        } else if (statusCode === 401) {
          clearToken()
          wx.showToast({ title: '登录已过期，请重新打开', icon: 'none' })
          reject(body || { code: 'AUTH_REQUIRED' })
        } else {
          const err = body || { code: 'UNKNOWN', message: '请求失败' }
          wx.showToast({ title: err.message || '网络错误', icon: 'none' })
          reject(err)
        }
      },
      fail(err) {
        if (loading) wx.hideLoading()
        wx.showToast({ title: '网络异常，请检查连接', icon: 'none' })
        reject({ code: 'NETWORK_ERROR', message: err.errMsg || '网络异常' })
      },
    })
  })
}

// 快捷方法
function get(path, params, opts)   { return request('GET', path, params, opts) }
function post(path, data, opts)    { return request('POST', path, data, opts) }
function put(path, data, opts)     { return request('PUT', path, data, opts) }
function del(path, opts)           { return request('DELETE', path, null, opts) }

/**
 * 获取语音网关 WebSocket URL（不含 token，token 通过 header 传递）
 */
function getVoiceWsUrl() {
  const token = getToken()
  if (!token) return null
  return WS_VOICE_URL
}

module.exports = {
  getToken,
  setToken,
  clearToken,
  get,
  post,
  put,
  del,
  getVoiceWsUrl,
  BASE_URL,
  WS_VOICE_URL,
}
