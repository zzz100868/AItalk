var common = require('../../utils/common.js')
var postUtils = require('../../utils/post.js')

const MOCK_USERS = {
  '陈默': {
    name: '陈默',
    handle: '@chenmo',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=400&backgroundColor=b6e3f4',
    bio: '晨间冥想爱好者，相信安静的力量。在喧嚣中寻找内心的秩序。',
    acceptPrivateMessage: true
  },
  '林小雨': {
    name: '林小雨',
    handle: '@xiaoyu',
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=400&backgroundColor=ffd5dc',
    bio: '喜欢下雨天、旧书店和手写日记。偶尔写诗，经常发呆。',
    acceptPrivateMessage: true
  },
  '阿北': {
    name: '阿北',
    handle: '@abeii',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Abei&size=400&backgroundColor=d1d4f9',
    bio: '重读旧书的人。相信文字的力量，也相信沉默的价值。',
    acceptPrivateMessage: true
  },
  '周晚': {
    name: '周晚',
    handle: '@zhouwan',
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=400&backgroundColor=e8dff5',
    bio: '数字断舍离践行者。正在学习如何更少地拥有，更多地存在。',
    acceptPrivateMessage: true
  },
  '方塘': {
    name: '方塘',
    handle: '@fangtang',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=400&backgroundColor=c0aede',
    bio: '深夜手冲咖啡师。用仪式感对抗生活的无序。',
    acceptPrivateMessage: true
  },
  '赛博聊机官方': {
    name: '赛博聊机官方',
    handle: '@stitch_ai',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=StitchAI&size=400&backgroundColor=e8dff5',
    bio: '连接安静灵魂的数字空间。',
    acceptPrivateMessage: true
  },
  'Kael': {
    name: 'Kael',
    handle: '@kael',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Kael&size=400&backgroundColor=e8dff5',
    bio: '偏好安静的周末与深度的自我对话。',
    acceptPrivateMessage: true
  },
  'Stitch AI': {
    name: 'Stitch AI',
    handle: '@stitch_ai',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=StitchAI&size=400&backgroundColor=e8dff5',
    bio: '你的数字记忆伴侣，记录每一次对话中的闪光点。',
    acceptPrivateMessage: true
  }
}

const MOCK_POSTS = [
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

Page({
  data: {
    isMe: false,
    userInfo: {},
    posts: [],
    isFollowing: false,
    _author: '',
    replyingComment: null,
    focusInputPostId: null
  },

  onLoad(options) {
    let author = options.author || ''
    try {
      author = decodeURIComponent(author)
    } catch (e) {}
    if (!author) {
      wx.navigateBack()
      return
    }
    this.setData({ _author: author })

    const app = getApp()
    const isMe = author === common.loadUserInfo().name
    const followData = wx.getStorageSync('followData') || { following: [], followerCounts: {} }

    if (isMe) {
      const saved = wx.getStorageSync('userProfile') || {}
      const myPosts = wx.getStorageSync('myPosts') || []
      this.setData({
        isMe: true,
        userInfo: {
          name: saved.nickName || '林夕',
          handle: '@linxi',
          avatar: saved.avatar || app.globalData.userInfo.avatarUrl || 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=400&backgroundColor=c7e6f5',
          bio: saved.bio || '在喧嚣中寻找宁静。🌿✨'
        },
        posts: myPosts
      })
    } else {
      const mockUser = MOCK_USERS[author]
      const isFollowing = (followData.following || []).includes(author)

      if (!mockUser) {
        this.setData({
          isMe: false,
          isFollowing,
          userInfo: {
            name: author,
            handle: '',
            avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(author)}&size=400&backgroundColor=c7e6f5`,
            bio: ''
          },
          posts: []
        })
        return
      }

      // 读取帖子缓存
      const cacheKey = `postCache_${author}`
      const cachedPosts = wx.getStorageSync(cacheKey)
      const posts = cachedPosts && cachedPosts.length > 0
        ? cachedPosts
        : MOCK_POSTS.filter(p => p.author === author)

      this.setData({
        isMe: false,
        isFollowing,
        userInfo: mockUser,
        posts
      })
    }
  },

  onShow() {
    const author = this.data._author
    if (!author) return

    // 刷新关注状态（从其他页面返回时）
    const followData = wx.getStorageSync('followData') || { following: [], followerCounts: {} }
    const isFollowing = (followData.following || []).includes(author)

    if (this.data.isMe) {
      const myPosts = wx.getStorageSync('myPosts') || []
      this.setData({
        posts: myPosts
      })
    } else {
      this.setData({
        isFollowing,
        posts: this.data.posts
      })
    }
  },

  toggleFollow() {
    const followData = wx.getStorageSync('followData') || { following: [], followerCounts: {} }
    const following = followData.following || []
    const author = this.data._author
    const wasFollowing = following.includes(author)

    if (wasFollowing) {
      followData.following = following.filter(name => name !== author)
      followData.followerCounts[author] = (followData.followerCounts[author] || 1) - 1
    } else {
      followData.following.push(author)
      followData.followerCounts[author] = (followData.followerCounts[author] || 0) + 1
    }

    wx.setStorageSync('followData', followData)

    this.setData({
      isFollowing: !wasFollowing
    })

    wx.showToast({ title: !wasFollowing ? '已关注' : '已取消关注', icon: 'none' })
  },

  // ── 帖子交互 ──
  toggleLike(e) {
    postUtils.toggleLike(this, e, function(posts) { this._savePosts(posts) }.bind(this))
  },

  toggleComments(e) {
    const id = e.currentTarget.dataset.id
    const posts = this.data.posts
    const idx = posts.findIndex(p => p.id === id)
    if (idx === -1) return
    const newShow = !posts[idx].showComments
    posts[idx].showComments = newShow
    this.setData({
      [`posts[${idx}].showComments`]: newShow,
      focusInputPostId: newShow ? id : null,
      replyingComment: null
    })
    this._savePosts(posts)
  },

  doStartReply(postId, commentId, author) {
    postUtils.doStartReply(this, postId, commentId, author)
  },

  cancelReply() {
    postUtils.cancelReply(this)
  },

  onCommentTap(e) {
    postUtils.onCommentTap(this, e, function(posts) { this._savePosts(posts) }.bind(this))
  },

  onReplyTap(e) {
    postUtils.onReplyTap(this, e, function(posts) { this._savePosts(posts) }.bind(this))
  },

  deleteComment(postId, commentId) {
    postUtils.deleteComment(this, postId, commentId, function(posts) { this._savePosts(posts) }.bind(this))
  },

  deleteReply(postId, commentId, replyId) {
    postUtils.deleteReply(this, postId, commentId, replyId, function(posts) { this._savePosts(posts) }.bind(this))
  },

  onInputBlur() {
    this.setData({ focusInputPostId: null })
  },

  onCommentInput(e) {
    const postId = e.currentTarget.dataset.id
    const idx = this.data.posts.findIndex(p => p.id === postId)
    if (idx === -1) return
    this.setData({ [`posts[${idx}].commentInput`]: e.detail.value })
  },

  addComment(e) {
    postUtils.addComment(this, e, function(posts) { this._savePosts(posts) }.bind(this))
  },

  _savePosts(posts) {
    const author = this.data._author
    if (author === common.loadUserInfo().name) {
      wx.setStorage({ key: 'myPosts', data: posts })
    } else {
      wx.setStorage({ key: `postCache_${author}`, data: posts })
    }
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/pages/editProfile/editProfile' })
  },

  goBack() {
    wx.navigateBack()
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    const urls = e.currentTarget.dataset.urls
    common.safePreviewImage(urls, src)
  }
})
