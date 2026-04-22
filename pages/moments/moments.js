Page({
  data: {
    posts: [],
    myAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
    myName: '林夕'
  },

  onShow() {
    this.loadPosts()
  },

  loadPosts() {
    const posts = wx.getStorageSync('myPosts') || []
    this.setData({ posts })
  },

  toggleLike(e) {
    const id = e.currentTarget.dataset.id
    let triggeredHeartBeat = false
    const posts = this.data.posts.map(p => {
      if (p.id === id) {
        const newLiked = !p.liked
        triggeredHeartBeat = newLiked
        return {
          ...p,
          liked: newLiked,
          likes: p.liked ? p.likes - 1 : p.likes + 1,
          heartBeating: newLiked
        }
      }
      return p
    })
    this.setData({ posts })
    wx.setStorageSync('myPosts', posts)

    if (triggeredHeartBeat) {
      setTimeout(() => {
        const clearedPosts = this.data.posts.map(p => {
          if (p.id === id) return { ...p, heartBeating: false }
          return p
        })
        this.setData({ posts: clearedPosts })
        wx.setStorageSync('myPosts', clearedPosts)
      }, 500)
    }
  },

  toggleComments(e) {
    const id = e.currentTarget.dataset.id
    const posts = this.data.posts.map(p => {
      if (p.id === id) {
        return { ...p, showComments: !p.showComments }
      }
      return p
    })
    this.setData({ posts })
    wx.setStorageSync('myPosts', posts)
  },

  addComment(e) {
    const postId = e.currentTarget.dataset.id
    const content = e.detail.value
    if (!content || !content.trim()) return

    const posts = this.data.posts.map(p => {
      if (p.id === postId) {
        const newComment = {
          id: Date.now(),
          author: '林夕',
          avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=100&backgroundColor=c7e6f5',
          content: content.trim()
        }
        return { ...p, comments: [...p.comments, newComment], commentInput: '' }
      }
      return p
    })
    this.setData({ posts })
    wx.setStorageSync('myPosts', posts)
  },

  deletePost(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条动态吗？',
      confirmColor: '#c4715a',
      success: (res) => {
        if (res.confirm) {
          const posts = this.data.posts.filter(p => p.id !== id)
          this.setData({ posts })
          wx.setStorageSync('myPosts', posts)
          wx.showToast({ title: '已删除', icon: 'none' })
        }
      }
    })
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    const urls = e.currentTarget.dataset.urls
    wx.previewImage({
      current: src,
      urls: urls
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
