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
  wx.navigateTo({ url: `/pkg-social/userHome/userHome?author=${encodeURIComponent(author)}` })
}

function loadUserInfo() {
  var userStore = require('../stores/userStore.js')
  var state = userStore.getState()
  return {
    name: state.nickName || mockData.DEFAULT_USER.nickName,
    avatar: state.avatar || mockData.DEFAULT_USER.avatarSmall
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

function _normalizeSafeArea(info) {
  if (!info.safeAreaInsets && info.safeArea) {
    info.safeAreaInsets = {
      top: Math.max(0, info.safeArea.top),
      right: Math.max(0, info.screenWidth - info.safeArea.right),
      bottom: Math.max(0, info.screenHeight - info.safeArea.bottom),
      left: Math.max(0, info.safeArea.left)
    }
  }
  return info
}

function getSystemInfo(forceRefresh) {
  if (!_systemInfoCache || forceRefresh) {
    _systemInfoCache = wx.getSystemInfoSync()
    _normalizeSafeArea(_systemInfoCache)
  }
  return _systemInfoCache
}

function refreshSystemInfoOnRotate() {
  wx.onWindowResize && wx.onWindowResize(function () {
    _systemInfoCache = null
  })
}

refreshSystemInfoOnRotate()

// iOS 临时文件重启后会被清理，需要复制到本地目录
function saveTempFiles(tempPaths, callback) {
  if (!tempPaths || tempPaths.length === 0) {
    if (callback) callback(null, [])
    return
  }
  var fs = wx.getFileSystemManager()
  var results = []
  var pending = tempPaths.length
  var hasError = false
  tempPaths.forEach(function (tempPath) {
    var fileName = 'file_' + Date.now() + '_' + Math.floor(Math.random() * 10000) + '.jpg'
    var destPath = wx.env.USER_DATA_PATH + '/' + fileName
    fs.copyFile({
      srcPath: tempPath,
      destPath: destPath,
      success: function () {
        results.push(destPath)
      },
      fail: function () {
        results.push(tempPath)
        hasError = true
      },
      complete: function () {
        pending--
        if (pending === 0 && callback) {
          callback(hasError ? new Error('部分文件保存失败') : null, results)
        }
      }
    })
  })
}

function removeSavedFile(filePath) {
  if (!filePath) return
  try {
    var userPath = wx.env.USER_DATA_PATH
    if (filePath.indexOf(userPath) === 0) {
      wx.getFileSystemManager().unlink({ filePath: filePath })
    }
  } catch (e) {}
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
  getSystemInfo,
  saveTempFiles,
  removeSavedFile
}
