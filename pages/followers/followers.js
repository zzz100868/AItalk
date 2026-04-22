Page({
  data: {
    followers: [
      { id: 1, name: '周晚', handle: '@zhouwan', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=200&backgroundColor=e8dff5', status: 'mutual' },
      { id: 2, name: '方塘', handle: '@fangtang', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=200&backgroundColor=c0aede', status: 'follow_back' },
      { id: 3, name: '林小雨', handle: '@xiaoyu', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=200&backgroundColor=ffd5dc', status: 'mutual' },
      { id: 4, name: '陈默', handle: '@chenmo', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=200&backgroundColor=b6e3f4', status: 'mutual' },
      { id: 5, name: '阿北', handle: '@abeii', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Abei&size=200&backgroundColor=d1d4f9', status: 'follow_back' }
    ]
  },

  goBack() {
    wx.navigateBack()
  },

  toggleFollow(e) {
    const id = e.currentTarget.dataset.id
    const followers = this.data.followers.map(f => {
      if (f.id === id) {
        return { ...f, status: f.status === 'mutual' ? 'follow_back' : 'mutual' }
      }
      return f
    })
    this.setData({ followers })
  }
})
