var Store = require('./store.js')
var mockData = require('../data/mockData.js')
var storage = require('../utils/common.js').storage

var userStore = new Store('user', {
  avatar: mockData.DEFAULT_USER.avatar,
  nickName: mockData.DEFAULT_USER.nickName,
  bio: mockData.DEFAULT_USER.bio,
  id: mockData.DEFAULT_USER.id,
  photos: []
}, {
  persist: ['avatar', 'nickName', 'bio', 'photos']
})

function _isValidAvatar(url) {
  if (!url || typeof url !== 'string') return false
  if (url.indexOf('http') === 0) return true
  if (url.indexOf('wxfile://') === 0) return true
  if (url.indexOf('/images/') === 0) return true
  return false
}

// 兼容旧版 storage key 迁移：userProfile / profilePhotos
;(function migrate() {
  var oldProfile = storage.get('userProfile', null)
  if (oldProfile && typeof oldProfile === 'object') {
    var patch = {}
    if (oldProfile.avatar && _isValidAvatar(oldProfile.avatar)) {
      patch.avatar = oldProfile.avatar
    }
    if (oldProfile.nickName) patch.nickName = oldProfile.nickName
    if (oldProfile.bio !== undefined) patch.bio = oldProfile.bio
    if (Object.keys(patch).length) userStore.setState(patch)
    storage.remove('userProfile')
  }

  var oldPhotos = storage.get('profilePhotos', null)
  if (Array.isArray(oldPhotos) && oldPhotos.length) {
    userStore.setState({ photos: oldPhotos })
    storage.remove('profilePhotos')
  }
})()

// 清理无效的持久化头像
;(function sanitize() {
  var state = userStore.getState()
  var patch = {}
  if (!_isValidAvatar(state.avatar)) {
    patch.avatar = mockData.DEFAULT_USER.avatar
  }
  if (!state.nickName) {
    patch.nickName = mockData.DEFAULT_USER.nickName
  }
  if (Object.keys(patch).length) {
    userStore.setState(patch)
  }
})()

module.exports = userStore
