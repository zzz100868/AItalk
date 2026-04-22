Page({
  data: {
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
    dimensions: [
      { name: '共情 (Empathy)', value: 85, color: 'primary' },
      { name: '逻辑 (Logic)', value: 62, color: 'secondary' },
      { name: '随性 (Spontaneity)', value: 78, color: 'tertiary' }
    ],
    traits: [
      { name: '深度思考者', color: 'primary' },
      { name: '创意灵魂', color: 'secondary' },
      { name: '夜猫子', color: 'tertiary' }
    ]
  },

  onLoad() {
    wx.switchTab({ url: '/pages/memory/memory' })
  },

  goToMemory() {
    wx.switchTab({ url: '/pages/memory/memory' })
  }
})
