function goToUserHome(author) {
  if (!author) return
  wx.navigateTo({ url: `/pages/userHome/userHome?author=${encodeURIComponent(author)}` })
}

function loadUserInfo() {
  const saved = wx.getStorageSync('userProfile')
  const app = getApp()
  return {
    name: saved?.nickName || app.globalData?.userInfo?.nickName || '林夕',
    avatar: saved?.avatar || app.globalData?.userInfo?.avatarUrl || 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5'
  }
}

function getBlockedUsers() {
  try {
    const blockData = wx.getStorageSync('blockData') || { blockedUsers: [] }
    return new Set(blockData.blockedUsers || [])
  } catch (e) {
    return new Set()
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
  wx.previewImage({ urls: urls, current: current })
}

function safeChooseMedia(opts) {
  getApp()._ignoreRelaunch = true
  return wx.chooseMedia(opts)
}

module.exports = {
  goToUserHome: goToUserHome,
  loadUserInfo: loadUserInfo,
  getBlockedUsers: getBlockedUsers,
  showReportSheet: showReportSheet,
  tapGuard: tapGuard,
  safePreviewImage: safePreviewImage,
  safeChooseMedia: safeChooseMedia
}
