const _storageCache = {}
const mockData = require('../data/mockData.js')

const storage = {
  get(key, defaultValue) {
    if (key in _storageCache) {
      const cached = _storageCache[key]
      return cached !== undefined && cached !== null ? cached : defaultValue
    }
    try {
      const value = wx.getStorageSync(key)
      _storageCache[key] = value
      return value !== undefined && value !== null ? value : defaultValue
    } catch (e) {
      return defaultValue
    }
  },
  set(key, value) {
    _storageCache[key] = value
    wx.setStorageSync(key, value)
  },
  remove(key) {
    delete _storageCache[key]
    try {
      wx.removeStorageSync(key)
    } catch (e) {
      // ignore
    }
  }
}

function goToUserHome(author) {
  if (!author) return
  wx.navigateTo({ url: `/pages/userHome/userHome?author=${encodeURIComponent(author)}` })
}

function loadUserInfo() {
  const saved = storage.get('userProfile', {})
  const app = getApp()
  return {
    name: saved?.nickName || app.globalData?.userInfo?.nickName || mockData.DEFAULT_USER.nickName,
    avatar: saved?.avatar || app.globalData?.userInfo?.avatarUrl || mockData.DEFAULT_USER.avatarSmall
  }
}

function showReportSheet() {
  wx.showActionSheet({
    itemList: ['色情低俗', '违法违规', '人身攻击', '广告骚扰', '其他'],
    itemColor: '#c45a5a',
    success: () => {
      wx.showToast({ title: '举报成功，我们会尽快处理', icon: 'none' })
    }
  })
}

function tapGuard(ctx, key, fn, interval) {
  interval = interval || 500
  const now = Date.now()
  if (ctx[key] && now - ctx[key] < interval) return
  ctx[key] = now
  fn()
}

function safePreviewImage(urls, current) {
  getApp()._ignoreRelaunch = true
  wx.previewImage({
    urls,
    current,
    fail: () => {
      wx.showToast({ title: '图片预览失败', icon: 'none' })
    }
  })
}

function safeChooseMedia(opts) {
  getApp()._ignoreRelaunch = true
  const originalFail = opts && opts.fail
  return wx.chooseMedia({
    ...opts,
    fail: (err) => {
      if (originalFail) originalFail(err)
      if (!err?.errMsg || !err.errMsg.includes('cancel')) {
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    }
  })
}

function safeSetClipboardData(data, successTitle) {
  wx.setClipboardData({
    data,
    success: () => {
      wx.showToast({ title: successTitle || '已复制', icon: 'none' })
    },
    fail: () => {
      wx.showToast({ title: '复制失败', icon: 'none' })
    }
  })
}

let _systemInfoCache = null
function getSystemInfo() {
  if (!_systemInfoCache) {
    _systemInfoCache = wx.getSystemInfoSync()
  }
  return _systemInfoCache
}

module.exports = {
  storage,
  goToUserHome,
  loadUserInfo,
  showReportSheet,
  tapGuard,
  safePreviewImage,
  safeChooseMedia,
  safeSetClipboardData,
  getSystemInfo
}
