import { DimensionId, ProbeCard, ProbeOption, ProbeStage } from './profiling.types';

export const PROBE_CARD_CATALOG_VERSION = 1;
export const OPTION_MAPPING_VERSION = 1;

function option(
  id: string,
  label: string,
  signals: Partial<Record<DimensionId, string>>,
  keywords: string[] = [],
): ProbeOption {
  return {
    id,
    label,
    keywords: [label, ...keywords],
    signals: Object.entries(signals).map(([dimension, signalLabel]) => ({
      dimension: dimension as DimensionId,
      label: signalLabel as string,
    })),
  };
}

function card(
  id: string,
  stage: ProbeStage,
  prompt: string,
  sourceQuestionIds: string[],
  targetDimensions: DimensionId[],
  options: ProbeOption[],
  followUpPrompt = '你可以先选最接近的一项，再补一句为什么。',
): ProbeCard {
  return {
    id,
    version: PROBE_CARD_CATALOG_VERSION,
    optionMappingVersion: OPTION_MAPPING_VERSION,
    stage,
    prompt,
    sourceQuestionIds,
    targetDimensions,
    options,
    followUpPrompt,
  };
}

export const PROBE_CARDS: ProbeCard[] = [
  card('warmup_day_rhythm', 'warmup', '你的日常节奏更接近哪一种', ['Q39', 'Q12'], ['life_rhythm'], [
    option('A', '早睡早起', { life_rhythm: '偏早起规律' }, ['早起', '规律']),
    option('B', '晚睡晚起', { life_rhythm: '偏夜猫子' }, ['晚睡', '夜猫子']),
    option('C', '工作日规律，周末随意', { life_rhythm: '工作日规律、周末弹性' }, ['周末随意']),
    option('D', '每天都不太固定', { life_rhythm: '作息弹性较大' }, ['不固定', '看情况']),
  ]),
  card('warmup_weekend', 'warmup', '空出一个周末，你最想怎么过', ['Q13', 'Q21'], ['life_rhythm', 'interest_map'], [
    option('A', '在家休息或追剧', { life_rhythm: '偏居家休息', interest_map: '偏居家娱乐' }, ['宅家', '追剧']),
    option('B', '逛街吃饭看展', { life_rhythm: '偏城市活动', interest_map: '喜欢城市休闲' }, ['逛街', '看展']),
    option('C', '户外运动或短途出行', { life_rhythm: '偏户外节奏', interest_map: '喜欢户外出行' }, ['户外', '旅行']),
    option('D', '约朋友聚会', { life_rhythm: '周末偏社交', interest_map: '喜欢线下聚会' }, ['聚会', '约朋友']),
  ]),
  card('warmup_recharge', 'warmup', '压力大时，哪种方式最能让你缓过来', ['Q15', 'Q34'], ['social_style', 'communication_style'], [
    option('A', '自己安静一会儿', { social_style: '偏独处充电', communication_style: '压力下先自行消化' }, ['独处', '安静']),
    option('B', '找信任的人说一说', { social_style: '偏倾诉充电', communication_style: '压力下主动沟通' }, ['倾诉', '找人聊']),
    option('C', '运动或做点具体的事', { social_style: '偏行动式调节', communication_style: '用行动处理压力' }, ['运动', '做事']),
    option('D', '睡一觉再说', { social_style: '偏暂时抽离', communication_style: '压力下延后处理' }, ['睡觉', '先睡']),
  ]),
  card('warmup_contact', 'warmup', '平时联系熟人，你最舒服的方式是哪种', ['Q49'], ['social_style', 'communication_style'], [
    option('A', '文字消息', { social_style: '偏文字社交', communication_style: '偏文字表达' }, ['打字', '微信']),
    option('B', '语音或电话', { social_style: '偏语音社交', communication_style: '偏即时口头表达' }, ['语音', '电话']),
    option('C', '见面聊', { social_style: '偏线下社交', communication_style: '偏面对面表达' }, ['见面', '当面']),
    option('D', '看事情混着用', { social_style: '沟通渠道灵活', communication_style: '表达方式随场景调整' }, ['都可以', '混着']),
  ]),
  card('warmup_interest', 'warmup', '下面哪类东西最容易让你投入时间', ['Q23', 'Q37', 'Q44', 'Q57'], ['interest_map'], [
    option('A', '游戏或桌游', { interest_map: '偏游戏互动' }, ['游戏', '桌游']),
    option('B', '书、播客或影视', { interest_map: '偏内容消费' }, ['看书', '播客', '电影', '电视剧']),
    option('C', '运动、旅行或户外', { interest_map: '偏运动出行' }, ['运动', '旅行', '户外']),
    option('D', '数码、AI 或新技术', { interest_map: '关注科技与新事物' }, ['数码', 'AI', '科技']),
  ]),

  card('communication_expression', 'communication', '有不同意见时，你通常怎么表达', ['Q16', 'Q18'], ['communication_style'], [
    option('A', '当场直接说清楚', { communication_style: '偏直接即时表达' }, ['直接说', '当场说']),
    option('B', '想清楚后再说', { communication_style: '偏思考后表达' }, ['想清楚', '晚点说']),
    option('C', '先暗示，看对方反应', { communication_style: '偏暗示表达' }, ['暗示', '试探']),
    option('D', '看关系和场合决定', { communication_style: '表达方式依场景调整' }, ['看场合', '看关系']),
  ]),
  card('communication_repair', 'communication', '和在意的人闹矛盾后，你更接近哪种处理方式', ['Q17'], ['communication_style', 'conflict_fear'], [
    option('A', '尽快把话说开', { communication_style: '倾向及时修复', conflict_fear: '不喜欢矛盾悬置' }, ['马上说', '尽快']),
    option('B', '冷静几小时再谈', { communication_style: '需要短暂冷静期', conflict_fear: '可承受短时冷静' }, ['几小时', '冷静一下']),
    option('C', '隔一天再谈', { communication_style: '需要较长冷静期', conflict_fear: '倾向延后冲突处理' }, ['第二天', '隔天']),
    option('D', '等对方先来找我', { communication_style: '冲突中偏被动修复', conflict_fear: '在冲突中等待确认' }, ['等对方', '对方先']),
  ]),
  card('communication_action', 'communication', '遇到一件新事，你一般怎么开始', ['Q43'], ['communication_style', 'future_plan'], [
    option('A', '先做起来再调整', { communication_style: '偏行动派', future_plan: '边做边调整' }, ['先做', '行动']),
    option('B', '先把计划列清楚', { communication_style: '偏计划派', future_plan: '重视预先规划' }, ['计划', '列清楚']),
    option('C', '先定方向，再边做边改', { communication_style: '行动与计划平衡', future_plan: '方向明确、路径弹性' }, ['定方向', '边做边改']),
    option('D', '临近截止才最有状态', { communication_style: '受期限驱动', future_plan: '短周期推进' }, ['截止', '拖到最后']),
  ]),
  card('relationship_fear', 'communication', '关系里哪种情况最让你难受', ['Q56'], ['conflict_fear'], [
    option('A', '冷处理、突然不回应', { conflict_fear: '在意冷处理和失联' }, ['冷暴力', '不回复', '失联']),
    option('B', '频繁争吵和情绪爆发', { conflict_fear: '在意高强度争吵' }, ['吵架', '发脾气']),
    option('C', '被控制、边界被侵入', { conflict_fear: '重视自主边界' }, ['控制', '边界']),
    option('D', '为了关系慢慢失去自己', { conflict_fear: '担心关系中失去自我' }, ['失去自我', '不像自己']),
  ]),
  card('relationship_strength', 'communication', '如果对方性格比你强势，你通常会怎么感受', ['Q20'], ['conflict_fear', 'communication_style'], [
    option('A', '挺轻松，有人拿主意', { conflict_fear: '可接受伴侣较强势', communication_style: '可让渡部分决策' }, ['轻松', '拿主意']),
    option('B', '小事可以，大事要商量', { conflict_fear: '重视重大事项边界', communication_style: '倾向协商决策' }, ['大事商量', '小事可以']),
    option('C', '会不舒服，更喜欢平等', { conflict_fear: '不适应强势关系', communication_style: '强调平等表达' }, ['不舒服', '平等']),
    option('D', '我自己通常更强势', { conflict_fear: '倾向掌握关系主动权', communication_style: '表达和决策较强势' }, ['我更强势', '我拿主意']),
  ]),

  card('relationship_timing', 'relationship', '对进入长期关系或婚姻的节奏，你更接近哪种想法', ['Q1'], ['marriage_orientation', 'future_plan'], [
    option('A', '遇到合适的人，一两年内可以', { marriage_orientation: '稳定关系节奏较积极', future_plan: '近期考虑稳定关系' }, ['一两年', '尽快']),
    option('B', '三到五年内比较合适', { marriage_orientation: '稳定关系节奏中等', future_plan: '中期考虑稳定关系' }, ['三年', '五年']),
    option('C', '不设时间，看关系发展', { marriage_orientation: '关系节奏随缘', future_plan: '不设婚恋时间表' }, ['不设时间', '看发展']),
    option('D', '目前不太考虑婚姻', { marriage_orientation: '当前婚姻意愿较低', future_plan: '近期无婚姻计划' }, ['不考虑', '不想结婚']),
  ]),
  card('relationship_distance', 'relationship', '如果两个人因为工作需要异地一年，你会怎么选', ['Q3'], ['marriage_orientation'], [
    option('A', '可以，只要联系稳定', { marriage_orientation: '可接受阶段性异地' }, ['可以异地', '保持联系']),
    option('B', '可以，但要有明确结束时间', { marriage_orientation: '有期限时可接受异地' }, ['结束时间', '有期限']),
    option('C', '很难接受，最好在同一座城', { marriage_orientation: '偏好同城关系' }, ['不能异地', '同一个城市']),
    option('D', '取决于关系基础和距离', { marriage_orientation: '异地接受度依情境' }, ['看关系', '看距离']),
  ]),
  card('relationship_children', 'relationship', '关于以后要不要孩子，你现在更接近哪种状态', ['Q2', 'Q52'], ['marriage_orientation', 'family_model'], [
    option('A', '希望有孩子', { marriage_orientation: '倾向生育', family_model: '期待有孩子的家庭' }, ['想要孩子', '要小孩']),
    option('B', '倾向不要孩子', { marriage_orientation: '倾向丁克', family_model: '接受无孩家庭' }, ['不要孩子', '丁克']),
    option('C', '还没想好', { marriage_orientation: '生育意愿未定', family_model: '家庭规划仍开放' }, ['没想好', '不确定']),
    option('D', '需要和伴侣共同决定', { marriage_orientation: '生育决定重视协商', family_model: '家庭规划强调共同决策' }, ['一起决定', '看伴侣']),
  ]),
  card('relationship_finance', 'relationship', '长期生活后，钱怎样管理最让你安心', ['Q55'], ['marriage_orientation', 'family_model'], [
    option('A', '收入放在一起共同管理', { marriage_orientation: '倾向财务共同体', family_model: '偏共同理财' }, ['一起管', '共同账户']),
    option('B', '各管各的，支出 AA', { marriage_orientation: '重视财务独立', family_model: '偏AA分担' }, ['AA', '各管各']),
    option('C', '共同账户加个人账户', { marriage_orientation: '兼顾共同与独立', family_model: '偏混合财务模式' }, ['共同账户', '个人账户']),
    option('D', '由更擅长的人管理', { marriage_orientation: '财务分工依能力', family_model: '偏能力型分工' }, ['会理财的人', '一个人管']),
  ]),
  card('relationship_parents', 'relationship', '长期生活后，和双方父母保持多近最舒服', ['Q4'], ['family_model'], [
    option('A', '住在一起或很近', { family_model: '偏紧密代际家庭' }, ['一起住', '住得近']),
    option('B', '同城但各自生活', { family_model: '偏同城独立家庭' }, ['同一个城市', '各住各的']),
    option('C', '不同城市，定期见面', { family_model: '偏跨城独立家庭' }, ['不同城市', '定期回家']),
    option('D', '看现实条件调整', { family_model: '家庭距离安排弹性' }, ['看情况', '现实条件']),
  ]),
  card('relationship_roles', 'relationship', '两个人分配赚钱、家务和照顾家庭时，你更认同哪种方式', ['Q46'], ['family_model', 'values_core', 'social_stance'], [
    option('A', '尽量平均分担', { family_model: '偏平等分工', values_core: '重视公平', social_stance: '认同平等家庭角色' }, ['平均', '一人一半']),
    option('B', '谁擅长谁多做', { family_model: '偏能力型分工', values_core: '重视效率', social_stance: '家庭角色较灵活' }, ['谁擅长', '按能力']),
    option('C', '可以有主次，但要双方认可', { family_model: '接受协商后的主次分工', values_core: '重视共同认可', social_stance: '对角色分工持协商态度' }, ['有主次', '双方认可']),
    option('D', '各自独立，尽量不互相依赖', { family_model: '偏独立家庭单元', values_core: '重视独立', social_stance: '强调个人自主' }, ['各自独立', '不依赖']),
  ]),
  card('relationship_age_gap', 'relationship', '年龄差这件事，你更接近哪种看法', ['Q63'], ['marriage_orientation'], [
    option('A', '同龄最舒服', { marriage_orientation: '偏好同龄伴侣' }, ['同龄']),
    option('B', '上下三岁都可以', { marriage_orientation: '接受小幅年龄差' }, ['三岁', '差不多']),
    option('C', '年龄不是重点，成熟度更重要', { marriage_orientation: '年龄差接受度较高' }, ['成熟', '年龄不重要']),
    option('D', '要看谁大、差多少', { marriage_orientation: '年龄差偏好有具体条件' }, ['看谁大', '看差多少']),
  ]),
  card('relationship_shared_interests', 'relationship', '你希望伴侣和你有多少共同爱好', ['Q40', 'Q50', 'Q62'], ['marriage_orientation', 'interest_map'], [
    option('A', '越多越好，最好经常一起玩', { marriage_orientation: '期待高兴趣重合', interest_map: '偏共同娱乐' }, ['越多越好', '一起玩']),
    option('B', '有一两个共同爱好就够', { marriage_orientation: '期待适度兴趣重合', interest_map: '保留部分共同活动' }, ['一两个', '有一些']),
    option('C', '各有各的也很好', { marriage_orientation: '可接受兴趣独立', interest_map: '偏独立兴趣空间' }, ['各玩各的', '不需要共同']),
    option('D', '不同反而能互相带着体验', { marriage_orientation: '欣赏兴趣互补', interest_map: '愿意探索伴侣兴趣' }, ['互补', '尝试新东西']),
  ]),

  card('values_bottom_line', 'values', '一段关系里，哪条底线对你最重要', ['Q6', 'Q7'], ['values_core', 'conflict_fear'], [
    option('A', '诚实，不欺骗', { values_core: '把诚实视为关系底线', conflict_fear: '在意欺骗' }, ['诚实', '欺骗']),
    option('B', '尊重，不贬低', { values_core: '把尊重视为关系底线', conflict_fear: '在意贬低和否定' }, ['尊重', '贬低']),
    option('C', '忠诚，不背叛', { values_core: '把忠诚视为关系底线', conflict_fear: '在意背叛' }, ['忠诚', '背叛']),
    option('D', '边界，不控制', { values_core: '把自主边界视为底线', conflict_fear: '在意控制' }, ['边界', '控制']),
  ]),
  card('values_money_love', 'values', '感情很好但经济压力大时，你更看重什么', ['Q41', 'Q64'], ['values_core'], [
    option('A', '先把经济基础稳住', { values_core: '关系中优先经济安全' }, ['经济', '物质']),
    option('B', '感情和陪伴更重要', { values_core: '关系中优先情感陪伴' }, ['感情', '陪伴']),
    option('C', '两边都要有基本线', { values_core: '追求情感与物质平衡' }, ['都重要', '平衡']),
    option('D', '看处于人生哪个阶段', { values_core: '价值取舍依人生阶段' }, ['看阶段', '看情况']),
  ]),
  card('values_freedom', 'values', '长期关系里，个人自由和彼此迁就怎么平衡更合理', ['Q42'], ['values_core', 'conflict_fear'], [
    option('A', '双方都应做一些调整', { values_core: '认同关系中的相互调整', conflict_fear: '可接受适度让渡自由' }, ['互相迁就', '都调整']),
    option('B', '小事迁就，核心边界不让', { values_core: '强调有边界的妥协', conflict_fear: '重视核心自主边界' }, ['核心边界', '小事可以']),
    option('C', '不该为关系牺牲个人选择', { values_core: '优先个人自主', conflict_fear: '担心关系限制自我' }, ['不牺牲', '个人选择']),
    option('D', '取决于事情对谁更重要', { values_core: '按重要程度协商取舍', conflict_fear: '通过协商维护边界' }, ['谁更重要', '具体事情']),
  ]),
  card('values_success', 'values', '你觉得一个人过得成功，最关键的标志是什么', ['Q58'], ['values_core', 'future_plan'], [
    option('A', '稳定、有安全感', { values_core: '重视稳定安全', future_plan: '追求稳定生活' }, ['稳定', '安全感']),
    option('B', '事业有成、被认可', { values_core: '重视成就认可', future_plan: '追求事业成就' }, ['事业', '认可']),
    option('C', '时间自由、能按自己想法生活', { values_core: '重视自由自主', future_plan: '追求自主生活' }, ['自由', '自己想法']),
    option('D', '有亲密关系和可靠的人', { values_core: '重视关系联结', future_plan: '期待稳定亲密关系' }, ['家庭', '亲密关系']),
  ]),
  card('values_effort_luck', 'values', '一个人能走多远，你觉得主要靠什么', ['Q8'], ['values_core', 'future_plan'], [
    option('A', '持续努力和自律', { values_core: '强调个人努力', future_plan: '相信长期投入' }, ['努力', '自律']),
    option('B', '机会和运气', { values_core: '重视机会因素', future_plan: '对机会保持敏感' }, ['运气', '机会']),
    option('C', '努力抓住机会，两者缺一不可', { values_core: '兼顾努力与机遇', future_plan: '主动把握机会' }, ['都有', '抓住机会']),
    option('D', '家庭和环境影响更大', { values_core: '重视结构和环境因素', future_plan: '规划时关注外部条件' }, ['环境', '家庭条件']),
  ]),

  card('social_topics', 'social', '下面这些公共话题里，你平时最容易关注哪类', ['Q31'], ['social_stance'], [
    option('A', '就业、收入和住房', { social_stance: '关注经济民生议题' }, ['就业', '收入', '房价']),
    option('B', '性别、家庭和教育', { social_stance: '关注性别家庭教育议题' }, ['性别', '家庭', '教育']),
    option('C', '环境、健康和公共安全', { social_stance: '关注环境健康安全议题' }, ['环境', '健康', '安全']),
    option('D', '科技、AI 和隐私', { social_stance: '关注科技与隐私议题' }, ['科技', 'AI', '隐私']),
  ]),
  card('social_competition', 'social', '面对现在的竞争压力，你更认同哪种生活态度', ['Q32'], ['social_stance', 'values_core'], [
    option('A', '尽量往上走，多争取机会', { social_stance: '偏积极竞争', values_core: '重视进取' }, ['奋斗', '往上走']),
    option('B', '保持基本努力，但不过度消耗', { social_stance: '偏适度投入', values_core: '重视可持续平衡' }, ['适度', '不内耗']),
    option('C', '降低欲望，舒服更重要', { social_stance: '偏低竞争生活', values_core: '重视舒适自主' }, ['躺平', '舒服']),
    option('D', '不同阶段会切换', { social_stance: '竞争态度依阶段调整', values_core: '价值取舍具有阶段性' }, ['看阶段', '会变化']),
  ]),
  card('social_partner_alignment', 'social', '伴侣对社会话题的看法和你不同，你能接受到什么程度', ['Q33'], ['social_stance', 'marriage_orientation'], [
    option('A', '最好大方向一致', { social_stance: '重视伴侣社会观念一致', marriage_orientation: '关系中重视观念同频' }, ['必须一致', '大方向一致']),
    option('B', '可以不同，但要能讨论', { social_stance: '接受可讨论的观点差异', marriage_orientation: '关系中重视理性沟通' }, ['可以不同', '能讨论']),
    option('C', '互相尊重就行，不必聊太多', { social_stance: '对观点差异较包容', marriage_orientation: '关系中允许观念独立' }, ['尊重就行', '不用一致']),
    option('D', '取决于具体议题', { social_stance: '观点一致性要求依议题', marriage_orientation: '关系边界依具体议题' }, ['具体问题', '看什么话题']),
  ]),
  card('social_privacy', 'social', '公共安全和个人隐私发生冲突时，你更接近哪种取舍', ['Q53'], ['social_stance'], [
    option('A', '隐私边界优先', { social_stance: '公共议题中优先个人隐私' }, ['隐私优先']),
    option('B', '明确规则下可以让渡部分隐私', { social_stance: '接受有规则的有限监督' }, ['部分隐私', '明确规则']),
    option('C', '公共安全优先', { social_stance: '公共议题中优先整体安全' }, ['安全优先']),
    option('D', '要看风险大小和谁来监督', { social_stance: '重视监督权责和情境' }, ['看风险', '谁监督']),
  ]),

  card('future_city', 'future', '未来几年选择生活城市时，你最优先考虑什么', ['Q26', 'Q29'], ['future_plan'], [
    option('A', '工作和收入机会', { future_plan: '城市选择优先职业机会' }, ['工作', '收入']),
    option('B', '离家人或伴侣近', { future_plan: '城市选择优先重要关系' }, ['家人', '伴侣']),
    option('C', '生活成本和舒适度', { future_plan: '城市选择优先生活质量' }, ['成本', '舒服']),
    option('D', '城市资源和发展空间', { future_plan: '城市选择优先长期发展' }, ['资源', '发展']),
  ]),
  card('future_career', 'future', '职业路线里，你更想要哪种状态', ['Q27', 'Q45'], ['future_plan', 'values_core'], [
    option('A', '稳定清晰，风险低一些', { future_plan: '偏稳定职业路线', values_core: '重视确定性' }, ['稳定', '风险低']),
    option('B', '高成长，愿意承担压力', { future_plan: '偏成长型职业路线', values_core: '重视成长成就' }, ['成长', '高薪']),
    option('C', '有机会会创业或做自己的事', { future_plan: '有创业或自主事业倾向', values_core: '重视自主创造' }, ['创业', '自己的事']),
    option('D', '工作够用，把时间留给生活', { future_plan: '职业服务于生活', values_core: '重视生活平衡' }, ['生活更重要', '够用']),
  ]),
  card('future_five_years', 'future', '如果看五年后，你最希望先实现哪件事', ['Q28'], ['future_plan'], [
    option('A', '事业或专业能力上一个台阶', { future_plan: '五年目标偏事业成长' }, ['事业', '能力']),
    option('B', '建立稳定的亲密关系或家庭', { future_plan: '五年目标偏关系家庭' }, ['结婚', '家庭']),
    option('C', '有更稳的资产和生活基础', { future_plan: '五年目标偏经济基础' }, ['买房', '存款', '资产']),
    option('D', '获得更多自由和体验', { future_plan: '五年目标偏自由体验' }, ['自由', '旅行', '体验']),
  ]),
];

export const PROBE_CARD_BY_ID = new Map(PROBE_CARDS.map((item) => [item.id, item]));

export function formatProbeCard(cardToFormat: ProbeCard): string {
  const options = cardToFormat.options.map((item) => `${item.id}，${item.label}`).join('；');
  return `${cardToFormat.prompt.replace(/[？?。]+$/u, '')}？${options}。`;
}
