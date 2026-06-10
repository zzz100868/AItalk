var api = require('../../utils/api.js')

var MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'follow',
    author: '陈默',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=200&backgroundColor=b6e3f4',
    content: '关注了你',
    time: '2小时前',
    read: false
  },
  {
    id: 4,
    type: 'follow',
    author: '周晚',
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=200&backgroundColor=e8dff5',
    content: '关注了你',
    time: '昨天',
    read: true
  }
]

Page({
  data: {
    activeFilter: 'all',
    filteredNotifications: [],
    isLoading: true,
    isRefreshing: false,
    loadError: false,
    notifications: []
  },

  onLoad() {
    this._updateFilter()
  },

  onShow() {
    var self = this
    this.setData({ isLoading: true, loadError: false })
    api.getNotifications().then(function (res) {
      var list = (res && res.data) || (res && Array.isArray(res) ? res : null)
      if (list && list.length > 0) {
        self.setData({ notifications: list, isLoading: false })
      } else {
        self.setData({ notifications: MOCK_NOTIFICATIONS, isLoading: false })
      }
      self._updateFilter()
    }).catch(function () {
      self.setData({ notifications: MOCK_NOTIFICATIONS, isLoading: false })
      self._updateFilter()
    })
    api.markNotificationsRead().catch(function () {})
  },

  onPullDownRefresh() {
    var self = this
    this.setData({ isRefreshing: true })
    api.getNotifications().then(function (res) {
      var list = (res && res.data) || (res && Array.isArray(res) ? res : null)
      if (list && list.length > 0) {
        self.setData({ notifications: list, isRefreshing: false })
      } else {
        self.setData({ isRefreshing: false })
      }
      self._updateFilter()
      wx.stopPullDownRefresh()
    }).catch(function () {
      self.setData({ isRefreshing: false })
      self._updateFilter()
      wx.stopPullDownRefresh()
    })
  },

  _updateFilter() {
    const { notifications, activeFilter } = this.data
    if (activeFilter === 'all') {
      this.setData({ filteredNotifications: notifications })
    } else {
      this.setData({ filteredNotifications: notifications.filter(n => n.type === activeFilter) })
    }
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ activeFilter: filter })
    this._updateFilter()
  },

  goBack() {
    wx.navigateBack()
  },

  handleNotificationTap(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.filteredNotifications[index]
    if (!item) return

    if (item.type === 'follow') {
      wx.navigateTo({
        url: `/pkg-social/userHome/userHome?author=${encodeURIComponent(item.author)}`
      })
    }
  },

  clearAll() {
    var self = this
    wx.showModal({
      title: '清空通知',
      content: '确定要清空所有通知吗？',
      confirmColor: '#c45a5a',
      success: function (res) {
        if (res.confirm) {
          self.setData({ notifications: [] })
          self._updateFilter()
          api.clearNotifications().catch(function () {})
          wx.showToast({ title: '已清空', icon: 'none' })
        }
      }
    })
  }
})
