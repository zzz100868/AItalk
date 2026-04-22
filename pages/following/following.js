Page({
  data: {
    following: [
      { id: 1, name: '周晚', handle: '@zhouwan', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=200&backgroundColor=e8dff5', isFollowing: true },
      { id: 2, name: '方塘', handle: '@fangtang', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=200&backgroundColor=c0aede', isFollowing: true },
      { id: 3, name: '林小雨', handle: '@xiaoyu', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=200&backgroundColor=ffd5dc', isFollowing: true },
      { id: 4, name: '赛博聊机官方', handle: '@stitch_ai', avatar: '', isOfficial: true, isFollowing: true }
    ]
  },

  goBack() {
    wx.navigateBack()
  },

  toggleFollow(e) {
    const id = e.currentTarget.dataset.id
    const following = this.data.following.map(f => {
      if (f.id === id) {
        return { ...f, isFollowing: !f.isFollowing }
      }
      return f
    })
    this.setData({ following })
  }
})
