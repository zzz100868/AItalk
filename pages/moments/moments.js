Page({
  data: {
    posts: [],
    myAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
    myName: '林夕',
    scrollIntoView: '',
    isLoading: true,
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: true,
    loadError: false
  },

  onLoad(options) {
    if (options.highlightPostId) {
      this._highlightPostId = parseInt(options.highlightPostId)
    }
  },

  onShow() {
    this.loadUserInfo()
    this.setData({ isLoading: true, loadError: false })
    setTimeout(() => {
      this.loadPosts()
      this.setData({ isLoading: false })
    }, 600)

    if (this._highlightPostId) {
      const postId = this._highlightPostId
      this._highlightPostId = null
      this.highlightPost(postId)
    }
  },

  onPullDownRefresh() {
    this.setData({ isRefreshing: true })
    setTimeout(() => {
      this.loadPosts()
      this.setData({ isRefreshing: false })
      wx.stopPullDownRefresh()
      wx.showToast({ title: '刷新成功', icon: 'none' })
    }, 800)
  },

  onReachBottom() {
    if (this.data.isLoadingMore || !this.data.hasMore) return
    this.setData({ isLoadingMore: true })
    setTimeout(() => {
      this.setData({ isLoadingMore: false, hasMore: false })
    }, 600)
  },

  highlightPost(postId) {
    const posts = this.data.posts
    const idx = posts.findIndex(p => p.id === postId)
    if (idx === -1) return
    posts[idx].showComments = true
    this.setData({
      [`posts[${idx}].showComments`]: true,
      scrollIntoView: `post-${postId}`
    })
  },

  loadUserInfo() {
    const saved = wx.getStorageSync('userProfile')
    this.setData({
      myAvatar: saved?.avatar || this.data.myAvatar,
      myName: saved?.nickName || this.data.myName
    })
  },

  loadPosts() {
    const saved = wx.getStorageSync('userProfile')
    const myName = saved?.nickName || '林夕'
    let posts = wx.getStorageSync('myPosts') || []
    posts = posts.filter(p => p.author === myName)
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

  showPostMenu(e) {
    const id = e.currentTarget.dataset.id
    const post = this.data.posts.find(p => p.id === id)
    if (!post) return
    const itemList = ['分享给好友', '复制链接', '收藏', '删除']
    wx.showActionSheet({
      itemList,
      itemColor: '#c45a5a',
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showToast({ title: '已准备分享', icon: 'none' })
        } else if (res.tapIndex === 1) {
          wx.setClipboardData({
            data: `${post.author}: ${post.content}`,
            success: () => wx.showToast({ title: '已复制', icon: 'none' })
          })
        } else if (res.tapIndex === 2) {
          wx.showToast({ title: '已收藏', icon: 'none' })
        } else if (res.tapIndex === 3) {
          wx.showModal({
            title: '确认删除',
            content: '确定要删除这条动态吗？',
            confirmColor: '#c4715a',
            success: (modalRes) => {
              if (modalRes.confirm) {
                const posts = this.data.posts.filter(p => p.id !== id)
                this.setData({ posts })
                wx.setStorage({ key: 'myPosts', data: posts })
                wx.showToast({ title: '已删除', icon: 'none' })
              }
            }
          })
        }
      }
    })
  },

  showReportSheet(targetType) {
    wx.showActionSheet({
      itemList: ['色情低俗', '违法违规', '人身攻击', '广告骚扰', '其他'],
      itemColor: '#c45a5a',
      success: () => {
        wx.showToast({ title: '举报成功，我们会尽快处理', icon: 'none' })
      }
    })
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    const urls = e.currentTarget.dataset.urls
    getApp()._ignoreRelaunch = true
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
