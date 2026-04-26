var common = require('../../utils/common.js')
var postUtils = require('../../utils/post.js')

Page({
  data: {
    posts: [],
    myAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
    myName: '林夕',
    scrollIntoView: '',
    replyingComment: null,
    focusInputPostId: null,
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
    const info = common.loadUserInfo()
    this.setData({ myAvatar: info.avatar, myName: info.name })
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
    postUtils.toggleLike(this, e, function(posts) {
      wx.setStorage({ key: 'myPosts', data: posts })
    })
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

  doStartReply(postId, commentId, author) {
    postUtils.doStartReply(this, postId, commentId, author)
  },

  cancelReply() {
    postUtils.cancelReply(this)
  },

  onCommentTap(e) {
    postUtils.onCommentTap(this, e, function(posts) {
      wx.setStorage({ key: 'myPosts', data: posts })
    })
  },

  onReplyTap(e) {
    postUtils.onReplyTap(this, e, function(posts) {
      wx.setStorage({ key: 'myPosts', data: posts })
    })
  },

  deleteComment(postId, commentId) {
    postUtils.deleteComment(this, postId, commentId, function(posts) {
      wx.setStorage({ key: 'myPosts', data: posts })
    })
  },

  deleteReply(postId, commentId, replyId) {
    postUtils.deleteReply(this, postId, commentId, replyId, function(posts) {
      wx.setStorage({ key: 'myPosts', data: posts })
    })
  },

  onInputBlur() {
    this.setData({ focusInputPostId: null })
  },

  addComment(e) {
    postUtils.addComment(this, e, function(posts) {
      wx.setStorage({ key: 'myPosts', data: posts })
    })
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

  showReportSheet() {
    common.showReportSheet()
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    const urls = e.currentTarget.dataset.urls
    common.safePreviewImage(urls, src)
  },

  goToUserHome(e) {
    common.goToUserHome(e.currentTarget.dataset.author)
  },

  goBack() {
    wx.navigateBack()
  }
})
