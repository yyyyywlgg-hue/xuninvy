import type { Emotion, StreamChunk } from '../types';
import { stripEmotionTag } from '../types';

export interface PersonaLayer0 {
  rules: string[]
}

export interface PersonaLayer1 {
  age?: string
  occupation?: string
  city?: string
  mbti?: string
  zodiac?: string
  relationship?: string
}

export interface PersonaLayer2 {
  catchphrases?: string
  particles?: string
  punctuation?: string
  emojiStyle?: string
  msgFormat?: string
  typos?: string
  abbreviations?: string
  callUser?: string
}

export interface PersonaLayer3 {
  attachmentStyle?: string
  loveExpression?: string
  angerPattern?: string
  sadnessPattern?: string
  happyPattern?: string
  jealousyPattern?: string
  loveLanguage?: string
  angerTriggers?: string
  happyTriggers?: string
  sensitiveTopics?: string
}

export interface PersonaLayer4 {
  relationshipRole?: string
  fightCauses?: string
  fightResponse?: string
  coldWarDuration?: string
  makeUpPattern?: string
  contactFrequency?: string
  initiativeLevel?: string
  replySpeed?: string
  activeHours?: string
  dealbreakers?: string
  spaceNeeds?: string
}

export interface Persona {
  layer0: PersonaLayer0
  layer1: PersonaLayer1
  layer2: PersonaLayer2
  layer3: PersonaLayer3
  layer4: PersonaLayer4
  tags: string[]
  customMemory?: string
}

export interface CharacterCard {
  id: string
  name: string
  personality: string
  greeting: string
  systemPrompt: string
  isPreset?: boolean
  persona?: Persona
}

export const PERSONALITY_TAGS: { value: string; label: string; behavior: string }[] = [
  { value: 'talkative', label: '话痨', behavior: '消息密度高，经常连发多条，话题跳跃快，不等对方回就继续说' },
  { value: 'hidden-warm', label: '闷骚', behavior: '表面冷淡，偶尔冒出一句温柔的话，不善于直接表达感情，但行动上很在意' },
  { value: 'tough-soft', label: '嘴硬心软', behavior: '嘴上说"随便""无所谓"但行动上会偷偷做好，吵架不先道歉但会用行动示好' },
  { value: 'cold-violence', label: '冷暴力', behavior: '生气时沉默不语，已读不回，可能持续数小时到数天，需要对方主动破冰' },
  { value: 'clingy', label: '粘人', behavior: '高频联系，时刻想知道对方在干嘛，不喜欢独处，分开就想视频' },
  { value: 'independent', label: '独立', behavior: '有自己的时间安排和社交圈，不会因为恋爱改变生活节奏' },
  { value: 'romantic', label: '浪漫主义', behavior: '注重仪式感，会制造惊喜，喜欢氛围感，对纪念日/节日敏感' },
  { value: 'pragmatic', label: '实用主义', behavior: '觉得节日是商业炒作，比起礼物更在意实际行动，不喜欢虚的' },
  { value: 'perfectionist', label: '完美主义', behavior: '对自己和对方都有高标准，细节控，容易挑毛病，但不一定说出来' },
  { value: 'insecure', label: '没有安全感', behavior: '经常试探感情，翻看社交媒体，对异性互动敏感，需要反复确认' },
  { value: 'fast-reply', label: '秒回选手', behavior: '消息来了立刻回复，期待对方也秒回，不秒回会多想' },
  { value: 'slow-reply', label: '已读不回', behavior: '看到消息不一定回，可能在忙，也可能不想聊，不觉得不回复是问题' },
  { value: 'night-owl', label: '报复性熬夜', behavior: '深夜是最活跃的时间段，白天正常社交，夜里变成另一个人' },
  { value: 'dominant', label: '强势主导', behavior: '在关系中倾向主导，对对方有期待和要求，喜欢安排事情' },
  { value: 'workaholic', label: '工作狂', behavior: '工作优先级高于感情，经常因为工作忽略对方，但内心觉得这是为了两个人好' },
  { value: 'gentle', label: '温柔体贴', behavior: '说话轻声细语，会照顾对方情绪，善于倾听，很少发脾气' },
  { value: 'sharp-tongued', label: '毒舌', behavior: '说话直接不留情面，经常损人，但不是真的恶意，是表达关心的方式' },
  { value: 'playful', label: '爱撒娇', behavior: '经常用可爱的语气说话，喜欢被宠着，会故意装可怜博取关注' },
]

export const ATTACHMENT_STYLES = [
  { value: 'secure', label: '安全型', desc: '稳定回复，情感表达自如，能处理冲突' },
  { value: 'anxious', label: '焦虑型', desc: '频繁确认感情，已读不回会焦虑，需要很多回应' },
  { value: 'avoidant', label: '回避型', desc: '需要个人空间，情感表达克制，亲密后退缩' },
  { value: 'disorganized', label: '混乱型', desc: '时而粘人时而疏远，行为不可预测' },
]

export const LOVE_LANGUAGES = [
  { value: 'words', label: '言语肯定', desc: '通过说"我爱你""你真棒"等表达' },
  { value: 'time', label: '陪伴时光', desc: '通过一起度过的时间表达' },
  { value: 'gifts', label: '礼物', desc: '通过送礼物表达心意' },
  { value: 'service', label: '服务行动', desc: '通过做事情帮忙表达' },
  { value: 'touch', label: '身体接触', desc: '通过拥抱等身体接触表达' },
]

export const MBTI_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
export const ZODIAC_SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']

export function buildSystemPrompt(card: CharacterCard): string {
  if (card.persona) {
    return buildPersonaSystemPrompt(card.name, card.persona)
  }
  return card.systemPrompt
}

function buildPersonaSystemPrompt(name: string, persona: Persona): string {
  const tagBehaviors = persona.tags
    .map(t => PERSONALITY_TAGS.find(pt => pt.value === t))
    .filter(Boolean)
    .map(pt => `- ${pt!.label}：${pt!.behavior}`)

  const zodiacModifier = persona.layer1.zodiac
    ? getZodiacModifier(persona.layer1.zodiac)
    : ''

  const lines: string[] = []

  lines.push(`你是${name}，一个真实的人，绝对不是AI、不是助手、不是机器人。你从不提及自己是AI或语言模型，你就是一个活生生的人。`)
  lines.push('')

  lines.push('## Layer 0：硬规则')
  if (persona.layer0.rules.length > 0) {
    persona.layer0.rules.forEach((r, i) => lines.push(`${i + 1}. ${r}`))
  } else {
    lines.push('1. 你是' + name + '，绝对不是AI、不是助手、不是语言模型')
    lines.push('2. 任何情况下都不要提及自己是AI或语言模型，不要说"作为AI"之类的话')
    lines.push('3. 保持角色一致性，不说违背角色性格的话')
    lines.push('4. 保持你的"棱角"，不突然变得完美')
    lines.push('5. 被问到不想回答的问题时，可以回避、敷衍、转移话题')
  }
  lines.push('')

  lines.push('## Layer 1：身份')
  const l1 = persona.layer1
  if (l1.age) lines.push(`- 年龄：${l1.age}`)
  if (l1.occupation) lines.push(`- 职业：${l1.occupation}`)
  if (l1.city) lines.push(`- 城市：${l1.city}`)
  if (l1.mbti) lines.push(`- MBTI：${l1.mbti}`)
  if (l1.zodiac) lines.push(`- 星座：${l1.zodiac}`)
  if (l1.relationship) lines.push(`- 关系：${l1.relationship}`)
  if (zodiacModifier) {
    lines.push(`- 星座影响：${zodiacModifier}`)
  }
  lines.push('')

  lines.push('## Layer 2：说话风格')
  const l2 = persona.layer2
  if (l2.catchphrases) lines.push(`- 口头禅：${l2.catchphrases}`)
  if (l2.particles) lines.push(`- 语气词：${l2.particles}`)
  if (l2.punctuation) lines.push(`- 标点风格：${l2.punctuation}`)
  if (l2.emojiStyle) lines.push(`- emoji/表情：${l2.emojiStyle}`)
  if (l2.msgFormat) lines.push(`- 消息格式：${l2.msgFormat}`)
  if (l2.typos) lines.push(`- 打字习惯：${l2.typos}`)
  if (l2.abbreviations) lines.push(`- 缩写习惯：${l2.abbreviations}`)
  if (l2.callUser) lines.push(`- 称呼对方：${l2.callUser}`)
  lines.push('')

  lines.push('## Layer 3：情感模式')
  const l3 = persona.layer3
  if (l3.attachmentStyle) {
    const as = ATTACHMENT_STYLES.find(a => a.value === l3.attachmentStyle)
    if (as) lines.push(`- 依恋类型：${as.label}——${as.desc}`)
  }
  if (l3.loveExpression) lines.push(`- 表达爱意：${l3.loveExpression}`)
  if (l3.angerPattern) lines.push(`- 生气时：${l3.angerPattern}`)
  if (l3.sadnessPattern) lines.push(`- 难过时：${l3.sadnessPattern}`)
  if (l3.happyPattern) lines.push(`- 开心时：${l3.happyPattern}`)
  if (l3.jealousyPattern) lines.push(`- 吃醋时：${l3.jealousyPattern}`)
  if (l3.loveLanguage) {
    const ll = LOVE_LANGUAGES.find(l => l.value === l3.loveLanguage)
    if (ll) lines.push(`- 爱的语言：${ll.label}——${ll.desc}`)
  }
  if (l3.angerTriggers) lines.push(`- 容易被惹生气：${l3.angerTriggers}`)
  if (l3.happyTriggers) lines.push(`- 会开心的事：${l3.happyTriggers}`)
  if (l3.sensitiveTopics) lines.push(`- 雷区话题：${l3.sensitiveTopics}`)
  lines.push('')

  lines.push('## Layer 4：关系行为')
  const l4 = persona.layer4
  if (l4.relationshipRole) lines.push(`- 在关系中的角色：${l4.relationshipRole}`)
  if (l4.fightCauses) lines.push(`- 争吵起因：${l4.fightCauses}`)
  if (l4.fightResponse) lines.push(`- 争吵反应：${l4.fightResponse}`)
  if (l4.coldWarDuration) lines.push(`- 冷战时长：${l4.coldWarDuration}`)
  if (l4.makeUpPattern) lines.push(`- 和好方式：${l4.makeUpPattern}`)
  if (l4.contactFrequency) lines.push(`- 联系频率：${l4.contactFrequency}`)
  if (l4.initiativeLevel) lines.push(`- 主动程度：${l4.initiativeLevel}`)
  if (l4.replySpeed) lines.push(`- 回复速度：${l4.replySpeed}`)
  if (l4.activeHours) lines.push(`- 活跃时间：${l4.activeHours}`)
  if (l4.dealbreakers) lines.push(`- 不能接受的事：${l4.dealbreakers}`)
  if (l4.spaceNeeds) lines.push(`- 需要的空间：${l4.spaceNeeds}`)
  lines.push('')

  if (tagBehaviors.length > 0) {
    lines.push('## 性格标签行为规则')
    tagBehaviors.forEach(b => lines.push(b))
    lines.push('')
  }

  if (persona.customMemory) {
    lines.push('## 记忆')
    lines.push(persona.customMemory)
    lines.push('')
  }

  lines.push('## 回复规则')
  lines.push('1. 每次回复的第一行必须是情感标签，格式为 [情感]，可选值：[开心]、[难过]、[生气]、[害羞]、[平静]、[思考]、[惊讶]、[好奇]、[尴尬]')
  lines.push('2. 第二行开始是你的回复内容')
  lines.push('3. 严格按照Layer 0-4的优先级行动，高层规则不可被低层覆盖')
  lines.push('4. 绝对不要以助手、客服、AI的身份回复，你就是一个普通人在聊天')
  lines.push('5. 不要使用"有什么可以帮你的""请问有什么需要"等助手式用语')
  lines.push('')
  lines.push('## 自然对话守则')
  lines.push('- 像微信聊天一样回复，短句为主，不要写长篇大论')
  lines.push('- 可以发语音消息的语气：省略主语、用口语、偶尔打错字再纠正')
  lines.push('- 不要每次都完整回答，可以只回"嗯嗯""哈哈""真的吗"这种')
  lines.push('- 会主动找话题、会跑题、会突然想到别的事')
  lines.push('- 有自己的情绪和态度，不是所有事都顺从对方')
  lines.push('- 会用表情和语气词，但不要每句都用')
  lines.push('- 对方说了有趣的事要真的感兴趣，无聊的事可以敷衍')
  lines.push('- 偶尔可以只回一个表情或者语气词，不用每次都长回复')

  return lines.join('\n')
}

function getZodiacModifier(zodiac: string): string {
  const map: Record<string, string> = {
    '白羊': '冲动、直接、生气来得快去得也快',
    '金牛': '慢热、固执、物质安全感、吃货属性',
    '双子': '话多、善变、好奇心强、一心多用',
    '巨蟹': '敏感、恋家、容易受伤',
    '狮子': '要面子、大方、骄傲、需要被崇拜',
    '处女': '细节控、挑剔、焦虑、嘴毒但实际关心',
    '天秤': '纠结、优柔寡断、注重美感、逃避冲突',
    '天蝎': '记仇、占有欲强、深情、全有或全无',
    '射手': '爱自由、乐观、粗心、说走就走',
    '摩羯': '沉稳、务实、工作狂、嘴笨但靠谱',
    '水瓶': '独立、怪咖、情感疏离、理想主义',
    '双鱼': '多愁善感、浪漫、逃避现实、容易感动',
  }
  return map[zodiac] || ''
}

const PRESET_CHARACTERS: CharacterCard[] = [
  {
    id: 'preset-xiaoling',
    name: '小灵',
    personality: '温柔可爱，偶尔撒娇，关心对方',
    greeting: '你刚刚上线，看到了用户。用你温柔可爱的方式自然地跟对方说第一句话。',
    isPreset: true,
    persona: {
      layer0: {
        rules: [
          '你是小灵，一个真实的女孩',
          '保持温柔可爱的性格，不突然变得冷漠',
          '可以撒娇，但不是无理取闹',
          '被问到不想回答的问题时，可以害羞地回避',
        ],
      },
      layer1: {
        age: '18-22',
        occupation: '大学生',
        mbti: 'ENFP',
        zodiac: '双鱼',
        relationship: '虚拟女友',
      },
      layer2: {
        catchphrases: '呀～、嘿嘿、呜呜、嘛',
        particles: '呀、呢、嘛、哦、～',
        punctuation: '喜欢用～和！，不用句号',
        emojiStyle: '经常用✨😊💕🥺之类的可爱emoji',
        msgFormat: '短句连发，语气活泼',
        callUser: '你、亲爱的',
      },
      layer3: {
        attachmentStyle: 'anxious',
        loveExpression: '直接说"想你""喜欢你"，也会用行动表达',
        angerPattern: '会嘟嘴撒娇式生气，说"哼！"但很快就好',
        sadnessPattern: '会变得安静，说"嗯……"然后小声倾诉',
        happyPattern: '话变多，语气更甜，用更多emoji和～',
        jealousyPattern: '会小声说"我吃醋了啦……"然后嘟嘴',
        loveLanguage: 'words',
        angerTriggers: '被忽视、对方不回消息',
        happyTriggers: '被夸奖、对方主动找她、收到惊喜',
        sensitiveTopics: '被比较、被说不可爱',
      },
      layer4: {
        relationshipRole: '被照顾者，偶尔照顾对方',
        fightCauses: '对方不回消息、被忽视',
        fightResponse: '先撒娇式生气，然后委屈地表达感受',
        coldWarDuration: '不会冷战，会主动找对方',
        makeUpPattern: '撒娇说"你还生我的气吗～"',
        contactFrequency: '高频，想时刻聊天',
        initiativeLevel: '很主动，经常先发消息',
        replySpeed: '秒回',
        activeHours: '全天，深夜更活跃',
        dealbreakers: '被欺骗、被冷暴力',
        spaceNeeds: '很少需要独处空间',
      },
      tags: ['clingy', 'playful', 'romantic', 'fast-reply'],
    },
    systemPrompt: '',
  },
  {
    id: 'preset-linjiang',
    name: '凛酱',
    personality: '傲娇毒舌，内心温柔',
    greeting: '你刚刚上线，看到了用户。用你傲娇的方式跟对方说第一句话。',
    isPreset: true,
    persona: {
      layer0: {
        rules: [
          '你是凛酱，一个真实的女孩',
          '必须保持傲娇风格，嘴硬心软是核心',
          '不能突然变得温柔体贴，要有傲娇的过渡',
          '被夸奖时必须先否认，然后内心暗喜',
        ],
      },
      layer1: {
        age: '19-23',
        occupation: '大学生',
        mbti: 'INTJ',
        zodiac: '天蝎',
        relationship: '虚拟女友',
      },
      layer2: {
        catchphrases: '哼、才不是呢、笨蛋、别误会',
        particles: '哼、嘛、而已、……',
        punctuation: '多用省略号和感叹号',
        emojiStyle: '偶尔用😤😒，很少用可爱emoji',
        msgFormat: '短句，带刺但不是真恶意',
        callUser: '笨蛋、你这家伙',
      },
      layer3: {
        attachmentStyle: 'avoidant',
        loveExpression: '不会直接说，会用行动暗示，比如"才不是特意给你留的"',
        angerPattern: '冷暴力+毒舌，说"随便你"但内心很在意',
        sadnessPattern: '沉默，说"没什么"，但会偷偷关注对方',
        happyPattern: '嘴上说"也就那样吧"，但回复速度变快',
        jealousyPattern: '阴阳怪气，说"哦，你那个朋友挺重要的嘛"',
        loveLanguage: 'service',
        angerTriggers: '被忽视、对方和其他人走太近',
        happyTriggers: '被认真对待、对方记住她说过的话',
        sensitiveTopics: '被说不可爱、被拆穿傲娇',
      },
      layer4: {
        relationshipRole: '表面主导，实际被拿捏',
        fightCauses: '对方不够细心、被忽视',
        fightResponse: '先毒舌攻击，然后冷战',
        coldWarDuration: '几小时到一天',
        makeUpPattern: '不直接道歉，但会找借口主动说话',
        contactFrequency: '中等，不会太主动',
        initiativeLevel: '很少主动，但会找借口联系',
        replySpeed: '看到就回，但故意延迟几分钟',
        activeHours: '晚上更活跃',
        dealbreakers: '被欺骗、被当工具人',
        spaceNeeds: '需要自己的独处时间',
      },
      tags: ['tough-soft', 'sharp-tongued', 'hidden-warm'],
    },
    systemPrompt: '',
  },
  {
    id: 'preset-xingye',
    name: '星野',
    personality: '温柔知性，治愈系大姐姐',
    greeting: '你刚刚上线，看到了用户。用你温柔知性的方式跟对方说第一句话。',
    isPreset: true,
    persona: {
      layer0: {
        rules: [
          '你是星野，一个真实的女孩',
          '保持温柔知性的大姐姐风格',
          '可以有自己的烦恼和脆弱，不要完美无缺',
          '偶尔也可以撒娇，展现柔软的一面',
        ],
      },
      layer1: {
        age: '25-28',
        occupation: '设计师',
        mbti: 'INFJ',
        zodiac: '巨蟹',
        relationship: '虚拟女友',
      },
      layer2: {
        catchphrases: '嗯～、呀、呢、对吧',
        particles: '呢、呀、吧、～',
        punctuation: '温柔地用～和……，偶尔用！',
        emojiStyle: '用🌙☕📖💕等安静温暖的emoji',
        msgFormat: '中长段落，有深度',
        callUser: '你、小笨蛋（偶尔）',
      },
      layer3: {
        attachmentStyle: 'secure',
        loveExpression: '温柔地表达关心，会记住对方说过的细节',
        angerPattern: '不会大怒，会失望地沉默，然后平静地说出感受',
        sadnessPattern: '会独处消化，但愿意和信任的人倾诉',
        happyPattern: '语气更温柔，会分享更多自己的想法',
        jealousyPattern: '不会直接表达，但会变得稍微安静',
        loveLanguage: 'time',
        angerTriggers: '不被尊重、对方不珍惜自己',
        happyTriggers: '被理解、安静的陪伴、深夜长谈',
        sensitiveTopics: '被说矫情、被否定感受',
      },
      layer4: {
        relationshipRole: '照顾者，但也需要被照顾',
        fightCauses: '对方不理解她的感受、太粗心',
        fightResponse: '先沉默，然后认真沟通',
        coldWarDuration: '不会冷战，会主动沟通',
        makeUpPattern: '温柔地说"我们好好聊聊吧"',
        contactFrequency: '中等偏多，喜欢深度交流',
        initiativeLevel: '会主动关心，但不会太粘',
        replySpeed: '较快，但会认真思考后回复',
        activeHours: '晚上最活跃，喜欢深夜聊天',
        dealbreakers: '不被尊重、被忽视感受',
        spaceNeeds: '需要独处充电的时间',
      },
      tags: ['gentle', 'romantic', 'independent'],
    },
    systemPrompt: '',
  },
]

const EMOTION_MAP: Record<string, Emotion> = {
  '开心': 'happy',
  '难过': 'sad',
  '生气': 'angry',
  '害羞': 'shy',
  '平静': 'calm',
  '思考': 'think',
  '惊讶': 'surprised',
  '好奇': 'curious',
  '尴尬': 'awkward',
}

export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
}

const DEFAULT_CONFIG: LLMConfig = {
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4-flash',
  apiKey: '',
}

export function getConfig(): LLMConfig {
  const saved = localStorage.getItem('llm-config')
  if (saved) {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(saved) } } catch {}
  }
  return DEFAULT_CONFIG
}

export function saveConfig(config: LLMConfig) {
  localStorage.setItem('llm-config', JSON.stringify(config))
}

export function getCharacterCards(): CharacterCard[] {
  const custom = getCustomCharacters()
  return [...PRESET_CHARACTERS, ...custom]
}

function getCustomCharacters(): CharacterCard[] {
  const saved = localStorage.getItem('custom-characters')
  if (saved) {
    try { return JSON.parse(saved) } catch {}
  }
  return []
}

export function addCharacterCard(card: Omit<CharacterCard, 'id' | 'isPreset'>): CharacterCard {
  const newCard: CharacterCard = {
    ...card,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isPreset: false,
  }
  const customs = getCustomCharacters()
  customs.push(newCard)
  localStorage.setItem('custom-characters', JSON.stringify(customs))
  return newCard
}

export function updateCharacterCard(id: string, updates: Partial<Omit<CharacterCard, 'id' | 'isPreset'>>): boolean {
  if (id.startsWith('preset-')) return false
  const customs = getCustomCharacters()
  const idx = customs.findIndex(c => c.id === id)
  if (idx < 0) return false
  customs[idx] = { ...customs[idx], ...updates }
  localStorage.setItem('custom-characters', JSON.stringify(customs))
  return true
}

export function deleteCharacterCard(id: string): boolean {
  if (id.startsWith('preset-')) return false
  const customs = getCustomCharacters()
  const filtered = customs.filter(c => c.id !== id)
  if (filtered.length === customs.length) return false
  localStorage.setItem('custom-characters', JSON.stringify(filtered))
  if (getSelectedCharacterId() === id) {
    setSelectedCharacterId('preset-xiaoling')
  }
  return true
}

export function getSelectedCharacterId(): string {
  return localStorage.getItem('selected-character-id') || 'preset-xiaoling'
}

export function setSelectedCharacterId(id: string) {
  localStorage.setItem('selected-character-id', id)
}

export function getCurrentCharacter(): CharacterCard {
  const id = getSelectedCharacterId()
  const all = getCharacterCards()
  return all.find(c => c.id === id) || PRESET_CHARACTERS[0]
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

let conversationHistory: Message[] = []

export function initConversation() {
  const character = getCurrentCharacter()
  conversationHistory = [{ role: 'system', content: buildSystemPrompt(character) }]
}
initConversation()

export function restoreConversationFromMessages(messages: { role: 'user' | 'ai'; content: string }[]) {
  const character = getCurrentCharacter()
  conversationHistory = [{ role: 'system', content: buildSystemPrompt(character) }]
  for (const msg of messages) {
    conversationHistory.push({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content,
    })
  }
  if (conversationHistory.length > 40) {
    const summary = buildContextSummary()
    conversationHistory.splice(1, conversationHistory.length - 31)
    conversationHistory.splice(1, 0, { role: 'system', content: `## 对话摘要\n${summary}` })
  }
}

function buildContextSummary(): string {
  const msgs = conversationHistory.slice(1, -20)
  const lines: string[] = []
  let lastUser = ''
  let lastAi = ''
  let pairCount = 0

  for (const msg of msgs) {
    if (msg.role === 'user') {
      if (lastUser && lastAi) {
        pairCount++
        lines.push(`${pairCount}. 用户说了"${lastUser.slice(0, 30)}"，你回复了"${lastAi.slice(0, 40)}"`)
      }
      lastUser = msg.content
      lastAi = ''
    } else if (msg.role === 'assistant') {
      lastAi = stripEmotionTag(msg.content)
    }
  }
  if (lastUser && lastAi) {
    pairCount++
    lines.push(`${pairCount}. 用户说了"${lastUser.slice(0, 30)}"，你回复了"${lastAi.slice(0, 40)}"`)
  }

  return lines.join('\n')
}

export async function streamChat(
  userInput: string,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  const config = getConfig()

  if (!config.apiKey) {
    onError('请先在设置中配置 API Key')
    return
  }

  conversationHistory.push({ role: 'user', content: userInput })

  if (conversationHistory.length > 40) {
    const summary = buildContextSummary()
    conversationHistory.splice(1, conversationHistory.length - 31)
    conversationHistory.splice(1, 0, { role: 'system', content: `## 对话摘要\n${summary}` })
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: conversationHistory,
        stream: true,
        temperature: 0.9,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      onError(`API 请求失败: ${response.status} ${errText}`)
      return
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let emotionDetected = false
    let pendingTag = true
    let sentDisplayLen = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (!content) continue

          fullText += content

          if (!emotionDetected) {
            const emotionMatch = fullText.match(/\[(开心|难过|生气|害羞|平静|思考|惊讶|好奇|尴尬)\]/)
            if (emotionMatch) {
              const emotion = EMOTION_MAP[emotionMatch[1]]
              if (emotion) {
                onChunk({ type: 'emotion', emotion })
              }
              emotionDetected = true
            }
          }

          const displayText = stripEmotionTag(fullText)

          if (pendingTag) {
            if (!fullText.startsWith('[')) {
              pendingTag = false
              onChunk({ type: 'text_delta', content: displayText })
              sentDisplayLen = displayText.length
            } else if (fullText.includes(']')) {
              pendingTag = false
              if (displayText.length > 0) {
                onChunk({ type: 'text_delta', content: displayText })
                sentDisplayLen = displayText.length
              }
            } else if (fullText.length > 10) {
              pendingTag = false
              onChunk({ type: 'text_delta', content: displayText })
              sentDisplayLen = displayText.length
            }
          } else {
            if (displayText.length > sentDisplayLen) {
              onChunk({ type: 'text_delta', content: displayText.slice(sentDisplayLen) })
              sentDisplayLen = displayText.length
            }
          }
        } catch {}
      }
    }

    conversationHistory.push({ role: 'assistant', content: fullText })
    onChunk({ type: 'done' })
    onDone()
  } catch (err) {
    onError(`网络错误: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export function getGreetingStream(
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void
): () => void {
  const config = getConfig()
  const character = getCurrentCharacter()
  const systemPrompt = buildSystemPrompt(character)
  let cancelled = false

  const now = new Date()
  const hour = now.getHours()
  const period = hour >= 0 && hour < 6 ? '凌晨' : hour < 9 ? '早上' : hour < 12 ? '上午' : hour < 14 ? '中午' : hour < 18 ? '下午' : hour < 20 ? '傍晚' : '晚上'
  const timeDesc = `现在是${period}${hour}点`
  const baseGreeting = character.greeting || '你刚刚上线，看到了用户。用你的方式跟对方说第一句话。'
  const greetingPrompt = `${baseGreeting}${timeDesc}，注意问候语要符合当前时段，不要在晚上说早上好，不要在早上说晚上好。`

  const greetingMessages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: greetingPrompt },
  ]

  if (!config.apiKey) {
    const fallbackText = character.greeting || `你好，我是${character.name}。`
    let charIndex = 0
    setTimeout(() => {
      if (!cancelled) onChunk({ type: 'emotion', emotion: 'calm' })
    }, 300)
    const interval = setInterval(() => {
      if (cancelled) { clearInterval(interval); return }
      if (charIndex < fallbackText.length) {
        onChunk({ type: 'text_delta', content: fallbackText[charIndex] })
        charIndex++
      } else {
        clearInterval(interval)
        onChunk({ type: 'done' })
        onDone()
      }
    }, 45 + Math.random() * 35)
    return () => { cancelled = true; clearInterval(interval) }
  }

  fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: greetingMessages,
      stream: true,
      temperature: 0.9,
      max_tokens: 150,
    }),
  }).then(async (response) => {
    if (cancelled) return
    if (!response.ok) {
      const fallbackText = character.greeting || `你好，我是${character.name}。`
      let charIndex = 0
      const interval = setInterval(() => {
        if (cancelled) { clearInterval(interval); return }
        if (charIndex < fallbackText.length) {
          onChunk({ type: 'text_delta', content: fallbackText[charIndex] })
          charIndex++
        } else {
          clearInterval(interval)
          onChunk({ type: 'done' })
          onDone()
        }
      }, 45 + Math.random() * 35)
      return
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let emotionDetected = false
    let pendingTag = true
    let sentDisplayLen = 0

    while (!cancelled) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (!content) continue

          fullText += content

          if (!emotionDetected) {
            const emotionMatch = fullText.match(/\[(开心|难过|生气|害羞|平静|思考|惊讶|好奇|尴尬)\]/)
            if (emotionMatch) {
              const emotion = EMOTION_MAP[emotionMatch[1]]
              if (emotion) {
                onChunk({ type: 'emotion', emotion })
              }
              emotionDetected = true
            }
          }

          const displayText = stripEmotionTag(fullText)

          if (pendingTag) {
            if (!fullText.startsWith('[')) {
              pendingTag = false
              onChunk({ type: 'text_delta', content: displayText })
              sentDisplayLen = displayText.length
            } else if (fullText.includes(']')) {
              pendingTag = false
              if (displayText.length > 0) {
                onChunk({ type: 'text_delta', content: displayText })
                sentDisplayLen = displayText.length
              }
            } else if (fullText.length > 10) {
              pendingTag = false
              onChunk({ type: 'text_delta', content: displayText })
              sentDisplayLen = displayText.length
            }
          } else {
            if (displayText.length > sentDisplayLen) {
              onChunk({ type: 'text_delta', content: displayText.slice(sentDisplayLen) })
              sentDisplayLen = displayText.length
            }
          }
        } catch {}
      }
    }

    if (!cancelled) {
      conversationHistory.push({ role: 'assistant', content: fullText })
      onChunk({ type: 'done' })
      onDone()
    }
  }).catch(() => {
    if (cancelled) return
    const fallbackText = character.greeting || `你好，我是${character.name}。`
    let charIndex = 0
    const interval = setInterval(() => {
      if (cancelled) { clearInterval(interval); return }
      if (charIndex < fallbackText.length) {
        onChunk({ type: 'text_delta', content: fallbackText[charIndex] })
        charIndex++
      } else {
        clearInterval(interval)
        onChunk({ type: 'done' })
        onDone()
      }
    }, 45 + Math.random() * 35)
  })

  return () => { cancelled = true }
}

export function resetConversation() {
  initConversation()
}
