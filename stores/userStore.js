const common = require('../utils/common.js')
const api = require('../utils/api.js')
const mockData = require('../data/mockData.js')

const storage = common.storage

/** 从 API 拉取用户资料，写入缓存 */
let _fetching = false
function fetchProfile() {
  if (_fetching) return Promise.reject('already fetching')
  _fetching = true
  return api.get('/me')
    .then((data) => {
      const profile = {
        id: data.id,
        nickName: data.nickname,
        avatar: data.avatar,
        bio: data.bio,
      }
      storage.set('userProfile', profile)
      const app = getApp()
      app.globalData.userInfo.avatarUrl = profile.avatar
      app.globalData.userInfo.nickName = profile.nickName
      if (app.globalData._cache) {
        app.globalData._cache.profile = profile
      }
      return profile
    })
    .catch(() => {
      // 网络失败时静默回落本地
      return getProfile()
    })
    .finally(() => { _fetching = false })
}

function getProfile() {
  const app = getApp()
  const saved = storage.get('userProfile', {})
  return {
    id: saved.id || app.globalData.userInfo.id || mockData.DEFAULT_USER.id,
    avatar: saved.avatar || app.globalData.userInfo.avatarUrl || mockData.DEFAULT_USER.avatar,
    nickName: saved.nickName || app.globalData.userInfo.nickName || mockData.DEFAULT_USER.nickName,
    bio: saved.bio || mockData.DEFAULT_USER.bio
  }
}

function updateProfile(nextProfile) {
  const profile = {
    avatar: nextProfile.avatar || mockData.DEFAULT_USER.avatar,
    nickName: (nextProfile.nickName || '').trim() || mockData.DEFAULT_USER.nickName,
    bio: (nextProfile.bio || '').trim()
  }

  // 本地先写入，保证 UI 即时响应
  storage.set('userProfile', profile)

  const app = getApp()
  app.globalData.userInfo.avatarUrl = profile.avatar
  app.globalData.userInfo.nickName = profile.nickName
  if (app.globalData._cache) {
    app.globalData._cache.profile = profile
  }

  // 异步同步到后端
  api.put('/me', {
    avatar: profile.avatar,
    nickname: profile.nickName,
    bio: profile.bio,
  }).catch(() => {
    // 静默失败，下次 fetch 会同步
  })

  return profile
}

module.exports = {
  getProfile,
  updateProfile,
  fetchProfile,
}
