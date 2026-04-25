Page({
  data: {
    userInfo: {
      nickName: '林夕',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=400&backgroundColor=c7e6f5',
      id: 'LX_9527'
    },
    phone: '138****8888',
    email: 'linxi@example.com',
    passwordSet: true,
    wechatBound: true,
    devices: [
      { name: 'iPhone 15 Pro', location: '上海', time: '当前在线', isCurrent: true },
      { name: 'iPad Air', location: '上海', time: '3天前', isCurrent: false }
    ],
    loginHistory: [
      { date: '2024-01-15', time: '14:32', location: '上海', device: 'iPhone 15 Pro', type: '登录' },
      { date: '2024-01-14', time: '09:15', location: '上海', device: 'iPad Air', type: '登录' },
      { date: '2024-01-12', time: '22:08', location: '杭州', device: 'iPhone 15 Pro', type: '登录' },
      { date: '2024-01-10', time: '08:45', location: '上海', device: 'iPhone 15 Pro', type: '修改密码' },
      { date: '2024-01-08', time: '19:20', location: '北京', device: 'iPhone 15 Pro', type: '登录' }
    ]
  },

  onShow() {
    const saved = wx.getStorageSync('userProfile') || {}
    if (saved.nickName || saved.avatar) {
      this.setData({
        'userInfo.nickName': saved.nickName || this.data.userInfo.nickName,
        'userInfo.avatar': saved.avatar || this.data.userInfo.avatar
      })
    }
  },

  changePhone() {
    wx.showToast({ title: '手机号更换功能开发中', icon: 'none' })
  },

  changeEmail() {
    wx.showToast({ title: '邮箱更换功能开发中', icon: 'none' })
  },

  changePassword() {
    wx.showToast({ title: '密码修改功能开发中', icon: 'none' })
  },

  manageDevices() {
    wx.showToast({ title: '设备管理功能开发中', icon: 'none' })
  },

  goBack() {
    wx.navigateBack()
  }
})
