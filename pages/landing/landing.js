Page({
  data: {
    isExiting: false
  },

  onLoad() {
    this.setData({ isExiting: false })
  },

  onShow() {
    this.setData({ isExiting: false })
  },

  enterApp() {
    wx.redirectTo({ url: '/pages/index/index' })
  }
})
