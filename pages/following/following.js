Page({
  data: {
    following: [
      { id: 1, name: '周晚', handle: '@zhouwan', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=200&backgroundColor=e8dff5' },
      { id: 2, name: '方塘', handle: '@fangtang', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=200&backgroundColor=c0aede' },
      { id: 3, name: '林小雨', handle: '@xiaoyu', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=200&backgroundColor=ffd5dc' },
      { id: 4, name: '赛博聊机官方', handle: '@stitch_ai', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=StitchAI&size=200&backgroundColor=e8dff5', isOfficial: true }
    ]
  },

  onShow() {
    this.syncFollowStatus()
  },

  getBlockedUsers() {
    const blockData = wx.getStorageSync('blockData') || { blockedUsers: [] }
    return new Set(blockData.blockedUsers || [])
  },

  syncFollowStatus() {
    const followData = wx.getStorageSync('followData') || { following: [] }
    const followingSet = new Set(followData.following || [])
    const blocked = this.getBlockedUsers()
    const following = this.data.following
      .filter(f => !blocked.has(f.name))
      .map(f => ({
        ...f,
        isFollowing: followingSet.has(f.name)
      }))
    this.setData({ following })
  },

  goBack() {
    wx.navigateBack()
  },

  toggleFollow(e) {
    const id = e.currentTarget.dataset.id
    const person = this.data.following.find(f => f.id === id)
    if (!person) return

    const followData = wx.getStorageSync('followData') || { following: [], followerCounts: {} }
    const following = followData.following || []
    const isFollowing = following.includes(person.name)

    if (isFollowing) {
      followData.following = following.filter(name => name !== person.name)
      followData.followerCounts[person.name] = (followData.followerCounts[person.name] || 1) - 1
    } else {
      followData.following.push(person.name)
      followData.followerCounts[person.name] = (followData.followerCounts[person.name] || 0) + 1
    }

    wx.setStorageSync('followData', followData)
    this.syncFollowStatus()
    wx.showToast({ title: !isFollowing ? '已关注' : '已取消关注', icon: 'none' })
  },

  goToUserHome(e) {
    const name = e.currentTarget.dataset.name
    if (!name) return
    wx.navigateTo({ url: `/pages/userHome/userHome?author=${encodeURIComponent(name)}` })
  }
})
