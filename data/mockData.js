const DEFAULT_USER = {
  name: '林夕',
  nickName: '林夕',
  handle: '@linxi',
  id: 'LX_9527',
  avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=400&backgroundColor=c7e6f5',
  avatarSmall: 'https://api.dicebear.com/9.x/notionists/svg?seed=Linxi&size=200&backgroundColor=c7e6f5',
  bio: '在喧嚣中寻找宁静。🌿✨'
}

const AI_USERS = {
  xiaoya: {
    name: '小雅',
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoya&size=400&backgroundColor=e8dff5'
  },
  stitch: {
    name: 'Stitch AI',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=StitchAI&size=400&backgroundColor=e8dff5',
    avatarSmall: 'https://api.dicebear.com/9.x/notionists/svg?seed=StitchAI&size=200&backgroundColor=e8dff5'
  }
}

const MATCH_CANDIDATES = [
  {
    name: 'Kael',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Kael&size=400&backgroundColor=e8dff5',
    bio: '偏好安静的周末与深度的自我对话',
    compatibility: 98,
    tags: ['手冲咖啡', '深夜阅读', '安静'],
    icebreakers: [
      '看到你也喜欢在清晨喝手冲咖啡，有什么推荐的豆子吗？',
      '你的主页有一种很安静的力量，周末通常怎么度过？'
    ],
    insight: '你们同样偏好安静的周末与深度的自我对话，这种对「留白」的共同追求，为建立无压力的灵魂连接提供了土壤。'
  },
  {
    name: '周晚',
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zhouwan&size=400&backgroundColor=d5e8d4',
    bio: '在城市的缝隙里寻找诗意的栖居',
    compatibility: 94,
    tags: ['胶片摄影', '雨天窗边', '黑胶唱片'],
    icebreakers: [
      '你镜头下的雨天总是有种特别的情绪，最近有拍到喜欢的画面吗？',
      '听说你也收藏黑胶，最近循环最多的一张是什么？'
    ],
    insight: '你们都在快节奏的城市生活里保留着一份对旧时光的眷恋，这种对「慢」的执念让你们注定相遇。'
  },
  {
    name: '方塘',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Fangtang&size=400&backgroundColor=ffe6cc',
    bio: '相信文字比语言更接近灵魂',
    compatibility: 91,
    tags: ['手写书信', 'indie音乐', '深夜散步'],
    icebreakers: [
      '在这个即时通讯的时代，还有人愿意写信真的太珍贵了。你最后一次写信是给谁？',
      '深夜散步时耳机里通常会放什么歌？'
    ],
    insight: '你们都是更愿意用文字而不是声音来表达内心的人，这种沉默的共鸣比千言万语更深刻。'
  },
  {
    name: '林小雨',
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Xiaoyu&size=400&backgroundColor=ffd5dc',
    bio: '一颗在雨天发芽的种子',
    compatibility: 89,
    tags: ['植物观察', '烘焙', '早午餐'],
    icebreakers: [
      '你的阳台看起来像个迷你植物园，有什么特别好养的植物推荐吗？',
      '周末的早午餐通常都是自己做吗？看起来很有仪式感。'
    ],
    insight: '你们都在日常的小事里找到了生活的仪式感，一颗植物、一顿早午餐，都是你们与世界温柔相处的方式。'
  },
  {
    name: '陈默',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Chenmo&size=400&backgroundColor=c7e6f5',
    bio: '沉默不是无话可说，而是无需多说',
    compatibility: 96,
    tags: ['攀岩', '冷萃茶', '独处'],
    icebreakers: [
      '攀岩和独处听起来很矛盾，你是怎么在运动中与自己对话的？',
      '冷萃茶和手冲咖啡之间，你更喜欢哪一种？'
    ],
    insight: '你们都在人群中保持着一种克制的疏离感，这种不打扰的温柔反而成了最亲密的引力。'
  },
  {
    name: '阿北',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Abei&size=400&backgroundColor=e1d5e7',
    bio: '在咖啡香和代码之间找平衡',
    compatibility: 87,
    tags: ['手冲咖啡', '开源社区', '深夜编程'],
    icebreakers: [
      '作为开发者，你是怎么保持对代码和生活同等热情的？',
      '手冲咖啡和写代码，哪个更需要耐心？'
    ],
    insight: '你们都在理性的世界里保持着一份感性的坚持，代码和咖啡一样，都需要恰到好处的温度。'
  }
]

const MEMORY_DATA = {
  categories: [
    { id: 'all', name: '全部' },
    { id: 'life', name: '生活' },
    { id: 'emotion', name: '情绪' },
    { id: 'hobby', name: '兴趣' },
    { id: 'growth', name: '成长' }
  ],
  insights: [
    {
      id: 1,
      date: '2024.01.15',
      title: '职业转型期的焦虑与重构',
      content: '你表达了在当前的人生阶段，对于稳定工作与个人创造力之间的矛盾感到焦虑。倾向于寻找能带来更多内驱力，而非仅仅是物质回报的生活方式。建议你先从副业或业余项目入手，逐步验证新的可能性。',
      tag: '生活',
      tagColor: 'secondary',
      category: 'life'
    },
    {
      id: 2,
      date: '2024.01.12',
      title: '建立情感边界',
      content: '在最近的对话中，你开始尝试在人际关系中建立更加明确的情感边界，学会拒绝，不再将周围人的所有情绪期待都背负在自己身上。这是一个非常健康的转变。',
      tag: '情绪',
      tagColor: 'tertiary',
      category: 'emotion'
    },
    {
      id: 3,
      date: '2024.01.08',
      title: '向内探索的渴望',
      content: '你最近对数字断舍离和冥想练习表现出浓厚的兴趣，这反映了你内在对平静、专注以及剔除无效信息的深层渴望。尝试每天固定 15 分钟的「无屏幕时间」。',
      tag: '兴趣',
      tagColor: 'primary',
      category: 'hobby'
    },
    {
      id: 4,
      date: '2024.01.05',
      title: '完美主义的松动',
      content: '你提到开始接受「完成比完美更重要」的想法。这种思维转变将显著降低你的行动阻力，让你更容易开始新项目，而不是被困在无尽的准备阶段。',
      tag: '成长',
      tagColor: 'primary',
      category: 'growth'
    },
    {
      id: 5,
      date: '2024.01.02',
      title: '深夜创作高峰',
      content: '数据显示你在晚间 11 点至凌晨 1 点的表达最为流畅和深刻。这与你提到的「夜深人静时思路最清晰」高度吻合。建议将重要创作任务安排在这个时间段。',
      tag: '生活',
      tagColor: 'secondary',
      category: 'life'
    },
    {
      id: 6,
      date: '2023.12.28',
      title: '对归属感的重新定义',
      content: '你正在从「被一群人接纳」转向「与少数几个人深度连接」。这种转变标志着你从外向型社交需求向内向型质量需求的进化。',
      tag: '情绪',
      tagColor: 'tertiary',
      category: 'emotion'
    },
    {
      id: 7,
      date: '2023.12.20',
      title: '咖啡与灵感的关联',
      content: '你多次提到手冲咖啡带来的仪式感。这种「慢动作」实际上是你给自己创造的心理缓冲带，让大脑从任务模式切换到创意模式。',
      tag: '兴趣',
      tagColor: 'primary',
      category: 'hobby'
    }
  ],
  messages: [
    {
      id: 1,
      sender: 'user',
      content: '最近一直在想，我是不是应该给自己放个假，感觉每天都被工作填满了。'
    },
    {
      id: 2,
      sender: 'ai',
      content: '听起来你最近有点累了。给自己留一些「什么都不做」的时间，其实是很重要的。你有没有想过，理想的休息日会是什么样的？'
    },
    {
      id: 3,
      sender: 'user',
      content: '可能就是睡到自然醒，然后泡一杯咖啡，看看书，不用回任何消息。'
    },
    {
      id: 4,
      sender: 'ai',
      content: '这听起来很治愈。其实这种「慢下来」的时刻，往往能让你更清楚地听见自己内心的声音。'
    },
    {
      id: 5,
      sender: 'user',
      content: '嗯，我觉得我最近总是活在别人的期待里，很少问自己真正想要什么。'
    },
    {
      id: 6,
      sender: 'ai',
      content: '能意识到这一点已经很了不起了。或许可以从一件小事开始，比如今天晚餐吃什么，完全按照你自己的喜好来选择。'
    }
  ],
  aboutMe: '你是一个在安静中寻找力量的人。你喜欢手冲咖啡的仪式感，享受深夜独处的时光。你对世界充满好奇，常常沉浸在书本和音乐里。虽然外表看起来有些疏离，但内心深处渴望被真正理解。',
  personalities: [
    { name: '内向而敏感', desc: '你喜欢独处，对周围的情绪变化很敏锐，常常能察觉到别人忽略的细节。' },
    { name: '富有创造力', desc: '你的思维不受常规束缚，总能从独特的角度看待问题，提出让人眼前一亮的想法。' },
    { name: '追求完美', desc: '你对自己要求很高，这让你做事很出色，但也容易因为达不到理想状态而焦虑。' },
    { name: '重视深度', desc: '比起广泛的社交，你更珍惜少数几个能真正理解你的人，讨厌浮于表面的寒暄。' }
  ],
  traits: [
    { name: '深度思考者', color: 'warm' },
    { name: '创意灵魂', color: 'sun' },
    { name: '夜猫子', color: 'night' },
    { name: '细节控', color: 'mint' },
    { name: '慢热型', color: 'bloom' },
    { name: '理想主义者', color: 'sky' }
  ]
}

const MEMORY_REPLIES = [
  '这确实是个值得思考的问题。你怎么看？',
  '我明白你的感受，有时候停下来反而能看得更清楚。',
  '你提到的这个角度很有意思，能再多说一些吗？',
  '听起来你最近经历了不少，想聊聊细节吗？',
  '这种想法很有深度，我也有过类似的体会。',
  '或许可以尝试从另一个角度来看待这件事。',
  '你说得对，有时候我们需要给自己多一点耐心。',
  '这让我想起了之前读过的一句话：「慢慢来，比较快」。'
]

function cloneData(data) {
  return JSON.parse(JSON.stringify(data))
}

module.exports = {
  DEFAULT_USER,
  AI_USERS,
  MEMORY_REPLIES,
  getMatchCandidates: () => cloneData(MATCH_CANDIDATES),
  getMemoryData: () => cloneData(MEMORY_DATA)
}
