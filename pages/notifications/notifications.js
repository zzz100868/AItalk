Page({
  data: {
    activeFilter: 'all',
    filteredNotifications: [],
    isLoading: true,
    isRefreshing: false,
    loadError: false,
    notifications: [
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
  },

  onLoad() {
    this._updateFilter()
  },

  onShow() {
    this.setData({ isLoading: true, loadError: false })
    setTimeout(() => {
      const notifications = this.data.notifications.map(n => ({ ...n, read: true }))
      this.setData({ notifications, isLoading: false })
      this._updateFilter()
    }, 600)
  },

  onPullDownRefresh() {
    this.setData({ isRefreshing: true })
    setTimeout(() => {
      const notifications = this.data.notifications.map(n => ({ ...n, read: true }))
      this.setData({ notifications, isRefreshing: false })
      this._updateFilter()
      wx.stopPullDownRefresh()
      wx.showToast({ title: '刷新成功', icon: 'none' })
    }, 800)
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
        url: `/pages/userHome/userHome?author=${encodeURIComponent(item.author)}`
      })
    }
  },

  clearAll() {
    wx.showModal({
      title: '清空通知',
      content: '确定要清空所有通知吗？',
      confirmColor: '#c45a5a',
      success: (res) => {
        if (res.confirm) {
          this.setData({ notifications: [] })
          this._updateFilter()
          wx.showToast({ title: '已清空', icon: 'none' })
        }
      }
    })
  }
})
