App({
  onLaunch() {
    console.log('赛博聊机小程序启动')
    this._initDefaultPosts()
    this._initFollowData()
    this._prefetchData()
  },

  _initDefaultPosts() {
    const existing = wx.getStorageSync('myPosts')
    if (existing && existing.length > 0) return

    const defaultPosts = [
      {
        id: 1704067200000,
        author: '林夕',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
        time: '3天前',
        content: '周末去了一家藏在巷子深处的独立书店，老板是个沉默寡言的中年人，店里只有轻柔的爵士乐和翻书的声音。待了一下午，读完了《悉达多》的最后两章。出来时天已经黑了，但心里特别亮。',
        likes: 45,
        comments: [
          { id: 1001, author: '陈默', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=100&backgroundColor=b6e3f4', content: '那家店我也去过，氛围确实很好' }
        ],
        liked: false,
        showComments: false
      },
      {
        id: 1704153600000,
        author: '林夕',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
        time: '昨天',
        content: '尝试了一周的数字断舍离：每天只在固定时间段查看消息，睡前一小时不碰手机。睡眠质量明显变好了，早晨醒来头脑也更清醒。推荐给大家试试，不用一步到位，先从睡前半小时开始。',
        likes: 128,
        comments: [
          { id: 1002, author: '周晚', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=100&backgroundColor=e8dff5', content: '我也在尝试，确实有效' },
          { id: 1003, author: '小雨', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=100&backgroundColor=ffd5dc', content: '求具体方法！' }
        ],
        liked: false,
        showComments: false
      },
      {
        id: 1704240000000,
        author: '林夕',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
        time: '今天 10:23',
        content: '雨天。手冲一壶耶加雪菲，窗边发呆。觉得生活里最奢侈的不是物质，而是这种完全属于自己的时间。你们今天过得怎么样？',
        likes: 89,
        comments: [],
        liked: false,
        showComments: false
      }
    ]
    wx.setStorageSync('myPosts', defaultPosts)
  },

  _initFollowData() {
    if (wx.getStorageSync('followData')) return
    wx.setStorageSync('followData', {
      following: ['周晚', '方塘', '林小雨', '陈默'],
      followerCounts: {
        '陈默': 124,
        '林小雨': 342,
        '阿北': 89,
        '周晚': 256,
        '方塘': 512,
        'Kael': 89,
        '赛博聊机官方': 0,
        'Stitch AI': 0
      }
    })
  },

  _prefetchData() {
    const profile = wx.getStorageSync('userProfile') || {}
    const myPosts = wx.getStorageSync('myPosts') || []
    const settings = wx.getStorageSync('userSettings') || {}

    this.globalData.userInfo.nickName = profile.nickName || this.globalData.userInfo.nickName
    this.globalData.userInfo.avatarUrl = profile.avatar || this.globalData.userInfo.avatarUrl

    // 内存缓存，避免页面反复读 storage
    this.globalData._cache = {
      profile,
      myPosts,
      settings,
      myPostsHash: myPosts.length > 0 ? myPosts[myPosts.length - 1].id : 0
    }
  },

  globalData: {
    userInfo: {
      nickName: '林夕',
      avatarUrl: '',
      id: 'LX_9527'
    },
    _cache: null
  }
})
