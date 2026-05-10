const FALLBACK_AVATAR = '/images/avatar_fallback.png'

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

const CHAT_REPLIES = {
  greeting: [
    '嗨，很高兴见到你。今天想聊点什么？',
    '你好呀，我在这里陪着你。有什么想分享的吗？',
    '欢迎回来。最近过得怎么样？',
    '见到你真开心。今天的心情如何？'
  ],
  work: [
    '工作确实会占据我们很多精力。你觉得最让你疲惫的是什么？',
    '听起来工作压力不小。你有想过给自己放个假吗？',
    '在职场上保持自我不容易。你觉得自己最近有在成长吗？',
    '有时候工作的意义不仅仅在于收入，还在于你从中获得了什么。你怎么想？',
    '如果工作让你感到压抑，或许可以试着找一点属于自己的小确幸。'
  ],
  emotion: [
    '情绪是需要被看见的。你愿意多说说现在的感受吗？',
    '我能感受到你的情绪。这种时候，对自己温柔一点很重要。',
    '允许自己难过，也是一种力量。你想聊聊发生了什么吗？',
    '情绪就像天气，会过去。你现在最需要的是什么？',
    '不用急着让自己好起来。我在这里，慢慢来。'
  ],
  relationship: [
    '人际关系有时候很复杂。在这段关系里，你最看重的是什么？',
    '与人相处确实需要很多能量。你现在的边界感怎么样？',
    '每段关系都是一面镜子。你从这段关系里看到了自己什么？',
    '被理解的感觉很珍贵。你觉得对方真的了解你吗？',
    '关系的质量不在于频率，而在于深度。你和谁的连接最深？'
  ],
  future: [
    '对未来的思考说明你很有觉察力。你理想的生活是什么样的？',
    '迷茫的时候，不妨先回到当下。你现在能掌控的一件小事是什么？',
    '未来不是等来的，是一步步走出来的。你想从哪一步开始？',
    '不知道想去哪里的时候，先问问自己不想过什么样的生活。',
    '很多可能性都藏在你还没尝试过的事情里。有什么想试试的吗？'
  ],
  hobby: [
    '有自己的爱好真好。它给你带来了什么样的感觉？',
    '兴趣爱好是我们和世界连接的方式。你最近有在坚持什么吗？',
    '投入到喜欢的事情里，时间都会变慢。你最喜欢它的哪个部分？',
    '爱好是给自己的礼物。你是怎么发现它的？',
    '坚持一件喜欢的事，本身就是一种治愈。'
  ],
  tired: [
    '累了就允许自己休息一下吧。你平时怎么给自己充电？',
    '疲惫是身体在提醒你，该慢下来了。最近睡眠怎么样？',
    '有时候什么都不做，也是在做自己。别想太多，先好好休息。',
    ' burnout 不是软弱，是信号。你最近有没有忽略自己的需求？',
    '给自己一点空白的时间，哪怕只是发发呆，也很好。'
  ],
  sleep: [
    '睡眠质量和情绪状态紧密相关。最近是不是压力有点大？',
    '睡不着的时候，可以试试深呼吸，或者听点白噪音。',
    '熬夜久了，身体和心情都会受影响。试着给自己定个固定的作息时间？',
    '夜晚容易想很多。试着把脑子里的东西写下来，可能会轻松一些。',
    '好的睡眠是最好的自我照顾。你睡前会做什么放松的事吗？'
  ],
  food: [
    '食物不只是填饱肚子，也是一种情绪的慰藉。你最喜欢吃什么？',
    '好好吃饭是对自己最基本的温柔。今天有好好吃饭吗？',
    '美食能治愈很多不开心。要不要试试去做点自己喜欢的？',
    '吃东西的时候，试着把注意力放在味道上，这也是一种正念。',
    '有没有什么味道，一闻到就会让你想起某个人或某段时光？'
  ],
  anxiety: [
    '焦虑的时候，试着把注意力拉回呼吸上。深呼吸三次，感觉会好一点。',
    '焦虑是因为你在乎。把它当作一种信号，而不是敌人。',
    '很多时候我们焦虑的事情，并不会真的发生。你现在最担心的是什么？',
    '焦虑的反义词是具体。把一个模糊的担忧变成一个具体的小行动，可能会好些。',
    '你不需要消除焦虑，只需要学会和它共处。这本身就是一种成长。'
  ],
  default: [
    '这确实是个值得思考的问题。你怎么看？',
    '我明白你的感受，有时候停下来反而能看得更清楚。',
    '你提到的这个角度很有意思，能再多说一些吗？',
    '听起来你最近经历了不少，想聊聊细节吗？',
    '这种想法很有深度，我也有过类似的体会。',
    '或许可以尝试从另一个角度来看待这件事。',
    '你说得对，有时候我们需要给自己多一点耐心。',
    '这让我想起了之前读过的一句话：「慢慢来，比较快」。',
    '你的觉察力很强，能注意到这一点已经很了不起了。',
    '有时候答案不在脑子里，在心里。你闭上眼睛感受一下，身体告诉你什么？'
  ]
}

function _selectReplyCategory(content) {
  if (!content) return 'default'
  var text = content.toLowerCase()
  var keywords = {
    greeting: ['你好', '嗨', 'hello', 'hi', '在吗', '在不在', '在么'],
    work: ['工作', '加班', '老板', '同事', '职场', '辞职', '离职', '项目', ' deadline', '压力', '累', '忙'],
    emotion: ['难过', '开心', '伤心', '失落', '沮丧', '兴奋', '激动', '平静', '烦躁', '郁闷', '痛苦', '幸福', '快乐', '悲伤', '情绪'],
    relationship: ['朋友', '恋爱', '分手', '暧昧', '喜欢', '爱', '感情', '对象', '单身', '约会', '吵架', '复合'],
    future: ['未来', '计划', '目标', '梦想', '迷茫', '方向', '选择', '决定', '规划', '打算'],
    hobby: ['兴趣', '爱好', '看书', '读书', '画画', '音乐', '电影', '游戏', '运动', '健身', '跑步', '摄影', '旅行'],
    tired: ['累', '疲惫', '倦', '不想动', '没劲', '乏力', '精疲力尽', ' burnout', ' burnout'],
    sleep: ['睡不着', '失眠', '熬夜', '晚睡', '早起', '困', ' sleepy', '睡眠', '做梦'],
    food: ['吃', '饭', '美食', '饿', '餐厅', '做菜', '做饭', '零食', '奶茶', '咖啡', '火锅', '烧烤'],
    anxiety: ['焦虑', '担心', '害怕', '紧张', '不安', ' panic', '恐惧', '慌', '压力山大']
  }
  for (var category in keywords) {
    var list = keywords[category]
    for (var i = 0; i < list.length; i++) {
      if (text.indexOf(list[i]) !== -1) {
        return category
      }
    }
  }
  return 'default'
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data))
}

module.exports = {
  DEFAULT_USER,
  AI_USERS,
  FALLBACK_AVATAR,
  MEMORY_REPLIES,
  CHAT_REPLIES,
  selectReplyCategory: _selectReplyCategory,
  getMatchCandidates: () => cloneData(MATCH_CANDIDATES),
  getMemoryData: () => cloneData(MEMORY_DATA)
}
