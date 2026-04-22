Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.loadMyPosts()
  },

  loadMyPosts() {
    const myPosts = wx.getStorageSync('myPosts') || []
    if (myPosts.length === 0) return
    const existingIds = new Set(this.data.posts.map(p => p.id))
    const newPosts = myPosts.filter(p => !existingIds.has(p.id))
    if (newPosts.length > 0) {
      this.setData({ posts: [...newPosts, ...this.data.posts] })
    }
  },

  updateCanSubmit() {
    const content = this.data.postContent.trim()
    const images = this.data.postImages || []
    this.setData({ canSubmit: !!(content || images.length) })
  },

  data: {
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
    showPostPanel: false,
    postContent: '',
    postImages: [],
    canSubmit: false,
    isSubmitting: false,
    posts: [
      {
        id: 1,
        author: '陈默',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=200&backgroundColor=b6e3f4',
        time: '2小时前',
        content: '今早试了十五分钟的晨间冥想，那种从喧嚣中抽离出来的澄澈感，真的能让一整天都变得不一样。推荐大家也试试，不用什么 App，就坐着，感受呼吸。',
        likes: 124,
        comments: [
          { id: 101, author: '林夕', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=100&backgroundColor=c7e6f5', content: '同意，最近也在坚持。' },
          { id: 102, author: '小雨', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=100&backgroundColor=ffd5dc', content: '求推荐具体方法！' }
        ],
        liked: false,
        showComments: false
      },
      {
        id: 2,
        author: '林小雨',
        avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=200&backgroundColor=ffd5dc',
        time: '5小时前',
        content: '有时候最高效的做事方式，就是什么都不做。让大脑放空，让念头沉淀。周末打算去山里待两天，不带电脑。',
        likes: 89,
        comments: [
          { id: 201, author: '阿北', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Abei&size=100&backgroundColor=d1d4f9', content: '羡慕了，求带' }
        ],
        liked: false,
        showComments: false
      },
      {
        id: 3,
        author: '阿北',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Abei&size=200&backgroundColor=d1d4f9',
        time: '昨天',
        content: '重读《挪威的森林》，发现以前没注意到的细节。渡边在直子死后独自旅行的那段，写得真克制，却字字诛心。好的悲伤从来不是嚎啕大哭。',
        likes: 256,
        comments: [],
        liked: false,
        showComments: false
      },
      {
        id: 4,
        author: '周晚',
        avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=200&backgroundColor=e8dff5',
        time: '昨天',
        content: '今天删掉了手机里五个不常用的社交软件。信息流太满了，满到听不见自己的声音。数字断舍离不是逃避，是为了更清醒地选择。',
        likes: 178,
        comments: [
          { id: 401, author: '陈默', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=100&backgroundColor=b6e3f4', content: '刚做完类似的事，感觉整个世界安静了' },
          { id: 402, author: '林夕', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=100&backgroundColor=c7e6f5', content: '我也在考虑这样做' }
        ],
        liked: false,
        showComments: false
      },
      {
        id: 5,
        author: '方塘',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=200&backgroundColor=c0aede',
        time: '3天前',
        content: '深夜的手冲咖啡，豆子是埃塞俄比亚的耶加雪菲。水温 92 度，闷蒸 30 秒。看着水流画圈的时候，什么都不想。这大概就是我的冥想。',
        likes: 342,
        comments: [
          { id: 501, author: '林小雨', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=100&backgroundColor=ffd5dc', content: '同款豆子！下次交流下冲法' }
        ],
        liked: false,
        showComments: false
      }
    ]
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

    if (triggeredHeartBeat) {
      setTimeout(() => {
        const clearedPosts = this.data.posts.map(p => {
          if (p.id === id) return { ...p, heartBeating: false }
          return p
        })
        this.setData({ posts: clearedPosts })
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
  },

  showShareMenu(e) {
    const id = e.currentTarget.dataset.id
    const post = this.data.posts.find(p => p.id === id)
    wx.showActionSheet({
      itemList: ['分享给好友', '复制链接', '收藏'],
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
        }
      }
    })
  },

  goToProfile() {
    wx.switchTab({ url: '/pages/profile/profile' })
  },

  openPostPanel() {
    this.setData({ showPostPanel: true, postContent: '', postImages: [], canSubmit: false, isSubmitting: false })
  },

  closePostPanel() {
    this.setData({ showPostPanel: false, isSubmitting: false })
  },

  preventClose() {
    // do nothing, just prevent bubbling
  },

  onPostInput(e) {
    this.setData({ postContent: e.detail.value })
    this.updateCanSubmit()
  },

  chooseImage() {
    const remainCount = 9 - (this.data.postImages?.length || 0)
    if (remainCount <= 0) {
      wx.showToast({ title: '最多9张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          postImages: [...(this.data.postImages || []), ...newImages]
        })
        this.updateCanSubmit()
      }
    })
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    wx.previewImage({
      current: src,
      urls: this.data.postImages
    })
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.postImages]
    images.splice(index, 1)
    this.setData({ postImages: images })
    this.updateCanSubmit()
  },

  submitPost() {
    if (this.data.isSubmitting) return

    const content = this.data.postContent.trim()
    const images = this.data.postImages || []
    if (!content && images.length === 0) return

    this.setData({ isSubmitting: true })

    const newPost = {
      id: Date.now(),
      author: '林夕',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
      time: '刚刚',
      content: content,
      images: images,
      likes: 0,
      comments: [],
      liked: false,
      showComments: false
    }

    const myPosts = wx.getStorageSync('myPosts') || []
    myPosts.unshift(newPost)
    wx.setStorageSync('myPosts', myPosts)

    this.setData({
      posts: [newPost, ...this.data.posts],
      showPostPanel: false,
      postContent: '',
      postImages: [],
      canSubmit: false,
      isSubmitting: false
    })

    wx.showToast({ title: '发布成功', icon: 'none' })
  }
})
