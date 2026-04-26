var common = require('../../utils/common.js')

Page({
  data: {
    followers: [
      { id: 1, name: '周晚', handle: '@zhouwan', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=200&backgroundColor=e8dff5' },
      { id: 2, name: '方塘', handle: '@fangtang', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=200&backgroundColor=c0aede' },
      { id: 3, name: '林小雨', handle: '@xiaoyu', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=200&backgroundColor=ffd5dc' },
      { id: 4, name: '陈默', handle: '@chenmo', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=200&backgroundColor=b6e3f4' },
      { id: 5, name: '阿北', handle: '@abeii', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Abei&size=200&backgroundColor=d1d4f9' }
    ]
  },

  onShow() {
    this.syncFollowStatus()
  },

  syncFollowStatus() {
    const followData = wx.getStorageSync('followData') || { following: [] }
    const followingSet = new Set(followData.following || [])
    const blocked = common.getBlockedUsers()
    const followers = this.data.followers
      .filter(f => !blocked.has(f.name))
      .map(f => ({
        ...f,
        status: followingSet.has(f.name) ? 'mutual' : 'follow_back'
      }))
    this.setData({ followers })
  },

  goBack() {
    wx.navigateBack()
  },

  toggleFollow(e) {
    const id = e.currentTarget.dataset.id
    const person = this.data.followers.find(f => f.id === id)
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
    common.goToUserHome(e.currentTarget.dataset.name)
  }
})
