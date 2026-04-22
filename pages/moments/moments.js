Page({
  data: {
    posts: [],
    myAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
    myName: '林夕'
  },

  onShow() {
    this.loadUserInfo()
    this.loadPosts()
  },

  loadUserInfo() {
    const saved = wx.getStorageSync('userProfile')
    this.setData({
      myAvatar: saved?.avatar || this.data.myAvatar,
      myName: saved?.nickName || this.data.myName
    })
  },

  loadPosts() {
    const posts = wx.getStorageSync('myPosts') || []
    this.setData({ posts })
    this._lastPostsLen = posts.length
  },

  toggleLike(e) {
    const id = e.currentTarget.dataset.id
    const posts = this.data.posts
    const idx = posts.findIndex(p => p.id === id)
    if (idx === -1) return

    const post = posts[idx]
    const newLiked = !post.liked
    post.liked = newLiked
    post.likes = newLiked ? post.likes + 1 : post.likes - 1

    const update = {
      [`posts[${idx}].liked`]: newLiked,
      [`posts[${idx}].likes`]: post.likes
    }
    if (newLiked) {
      post.heartBeating = true
      update[`posts[${idx}].heartBeating`] = true
    }
    this.setData(update)
    wx.setStorage({ key: 'myPosts', data: posts })

    if (newLiked) {
      setTimeout(() => {
        post.heartBeating = false
        this.setData({ [`posts[${idx}].heartBeating`]: false })
      }, 500)
    }
  },

  toggleComments(e) {
    const id = e.currentTarget.dataset.id
    const posts = this.data.posts
    const idx = posts.findIndex(p => p.id === id)
    if (idx === -1) return
    const newShow = !posts[idx].showComments
    posts[idx].showComments = newShow
    this.setData({ [`posts[${idx}].showComments`]: newShow })
    wx.setStorage({ key: 'myPosts', data: posts })
  },

  addComment(e) {
    const postId = e.currentTarget.dataset.id
    const content = e.detail.value
    if (!content || !content.trim()) return

    const posts = this.data.posts
    const idx = posts.findIndex(p => p.id === postId)
    if (idx === -1) return

    const newComment = {
      id: Date.now(),
      author: '林夕',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=100&backgroundColor=c7e6f5',
      content: content.trim()
    }
    posts[idx].comments.push(newComment)
    posts[idx].commentInput = ''

    this.setData({
      [`posts[${idx}].comments`]: posts[idx].comments,
      [`posts[${idx}].commentInput`]: ''
    })
    wx.setStorage({ key: 'myPosts', data: posts })
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
          wx.setStorage({ key: 'myPosts', data: posts })
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

  goToUserHome(e) {
    const author = e.currentTarget.dataset.author
    if (!author) return
    wx.navigateTo({ url: `/pages/userHome/userHome?author=${encodeURIComponent(author)}` })
  },

  goBack() {
    wx.navigateBack()
  }
})
