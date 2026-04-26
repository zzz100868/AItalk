const common = require('../utils/common.js')
const mockData = require('../data/mockData.js')

const storage = common.storage

function getProfile() {
  const app = getApp()
  const saved = storage.get('userProfile', {})
  return {
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

  storage.set('userProfile', profile)

  const app = getApp()
  app.globalData.userInfo.avatarUrl = profile.avatar
  app.globalData.userInfo.nickName = profile.nickName
  if (app.globalData._cache) {
    app.globalData._cache.profile = profile
  }

  return profile
}

module.exports = {
  getProfile,
  updateProfile
}
