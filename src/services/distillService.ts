import { getConfig } from './llmService'
import type { Persona } from './llmService'

export interface DistillResult {
  persona: Partial<Persona>
  personality: string
  greeting: string
}

interface ParsedMessage {
  sender: string
  content: string
}

export function parseChatFile(text: string, targetName?: string): { messages: ParsedMessage[]; targetName: string } {
  const lines = text.split('\n')
  const messages: ParsedMessage[] = []
  const senderPattern = /^(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}(:\d{2})?)\s+(.+)$/
  const simplePattern = /^(.+?)[:：]\s*(.+)$/

  let detectedTarget = targetName || ''
  const senderCounts: Record<string, number> = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let sender = ''
    let content = ''

    const tsMatch = trimmed.match(senderPattern)
    if (tsMatch) {
      const rest = trimmed.slice(tsMatch[1].length).trim()
      const colonIdx = rest.search(/[:：]/)
      if (colonIdx > 0) {
        sender = rest.slice(0, colonIdx).trim()
        content = rest.slice(colonIdx + 1).trim()
      } else {
        sender = rest.trim()
        content = ''
      }
    } else {
      const simpleMatch = trimmed.match(simplePattern)
      if (simpleMatch) {
        sender = simpleMatch[1].trim()
        content = simpleMatch[2].trim()
      } else {
        continue
      }
    }

    if (sender && content) {
      messages.push({ sender, content })
      senderCounts[sender] = (senderCounts[sender] || 0) + 1
    }
  }

  if (!detectedTarget && messages.length > 0) {
    const senders = Object.entries(senderCounts).sort((a, b) => b[1] - a[1])
    if (senders.length >= 2) {
      detectedTarget = senders[1][0]
    } else if (senders.length === 1) {
      detectedTarget = senders[0][0]
    }
  }

  return { messages, targetName: detectedTarget }
}

export function extractSampleMessages(messages: ParsedMessage[], targetName: string, maxCount = 60): string {
  const targetMsgs = messages.filter(m => m.sender === targetName)
  const selected = targetMsgs.slice(0, maxCount)
  return selected.map(m => `${m.sender}：${m.content}`).join('\n')
}

const DISTILL_PROMPT = `你是一个人格蒸馏器。你的任务是从聊天记录中提取说话人的人格特征，输出结构化的 JSON 数据。

## 提取维度

### Layer 0：硬规则
提取该人物绝对不可能做的事、必须保持的性格特征

### Layer 1：身份
从聊天内容推断：年龄段、职业、城市、MBTI倾向、星座倾向

### Layer 2：说话风格
- 口头禅：反复出现的词汇或句式
- 语气词偏好：嗯/哦/哈哈/嘿嘿/唉等
- 标点风格：用不用句号？感叹号多不多？省略号？波浪号～？
- emoji/表情：用什么表情？频率？
- 消息格式：短句连发/长段落/语音风格
- 打字习惯：错别字、缩写
- 称呼方式：怎么叫对方

### Layer 3：情感模式
- 依恋类型：安全型/焦虑型/回避型/混乱型
- 表达爱意的方式
- 生气时的表现
- 难过时的表现
- 开心时的表现
- 吃醋时的表现
- 爱的语言：言语肯定/陪伴时光/礼物/服务行动/身体接触
- 情绪触发器

### Layer 4：关系行为
- 在关系中的角色
- 争吵模式和起因
- 冷战时长
- 和好方式
- 联系频率和回复速度
- 边界和底线

### 性格标签
从以下标签中选择最匹配的（可多选）：
talkative/hidden-warm/tough-soft/cold-violence/clingy/independent/romantic/pragmatic/perfectionist/insecure/fast-reply/slow-reply/night-owl/dominant/workaholic/gentle/sharp-tongued/playful

## 输出格式

严格输出以下 JSON，不要输出任何其他内容：
{
  "personality": "一句话性格描述",
  "greeting": "基于提取的人格，生成一句该角色会说的开场白",
  "layer0": {
    "rules": ["规则1", "规则2", "规则3"]
  },
  "layer1": {
    "age": "年龄段",
    "occupation": "职业",
    "city": "城市（如有）",
    "mbti": "MBTI类型",
    "zodiac": "星座（如有线索）",
    "relationship": "关系定位"
  },
  "layer2": {
    "catchphrases": "口头禅",
    "particles": "语气词",
    "punctuation": "标点风格",
    "emojiStyle": "emoji风格",
    "msgFormat": "消息格式",
    "typos": "打字习惯",
    "abbreviations": "缩写习惯",
    "callUser": "称呼对方"
  },
  "layer3": {
    "attachmentStyle": "secure/anxious/avoidant/disorganized",
    "loveExpression": "表达爱意的方式",
    "angerPattern": "生气时的表现",
    "sadnessPattern": "难过时的表现",
    "happyPattern": "开心时的表现",
    "jealousyPattern": "吃醋时的表现",
    "loveLanguage": "words/time/gifts/service/touch",
    "angerTriggers": "容易被惹生气的事",
    "happyTriggers": "会开心的事",
    "sensitiveTopics": "雷区话题"
  },
  "layer4": {
    "relationshipRole": "在关系中的角色",
    "fightCauses": "争吵起因",
    "fightResponse": "争吵反应",
    "coldWarDuration": "冷战时长",
    "makeUpPattern": "和好方式",
    "contactFrequency": "联系频率",
    "initiativeLevel": "主动程度",
    "replySpeed": "回复速度",
    "activeHours": "活跃时间",
    "dealbreakers": "不能接受的事",
    "spaceNeeds": "需要的空间"
  },
  "tags": ["tag1", "tag2"]
}`

export async function distillFromChatLog(
  chatText: string,
  targetName: string,
  onProgress: (status: string) => void
): Promise<DistillResult> {
  const config = getConfig()
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key')
  }

  onProgress('正在解析聊天记录...')
  const { messages } = parseChatFile(chatText, targetName)
  if (messages.length === 0) {
    throw new Error('未能从文件中解析出聊天记录，请检查文件格式')
  }

  const sampleText = extractSampleMessages(messages, targetName || messages[0].sender)
  if (!sampleText) {
    throw new Error('未能提取目标人物的消息')
  }

  onProgress('正在蒸馏人格特征...')

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: DISTILL_PROMPT },
        { role: 'user', content: `以下是"${targetName || '目标人物'}"的聊天记录片段：\n\n${sampleText}\n\n请从以上聊天记录中蒸馏出该人物的人格特征，严格按照 JSON 格式输出。` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  onProgress('正在解析蒸馏结果...')

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('LLM 返回格式异常，无法解析人格数据')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])

    return {
      personality: parsed.personality || '',
      greeting: parsed.greeting || '',
      persona: {
        layer0: { rules: parsed.layer0?.rules || [] },
        layer1: parsed.layer1 || {},
        layer2: parsed.layer2 || {},
        layer3: parsed.layer3 || {},
        layer4: parsed.layer4 || {},
        tags: parsed.tags || [],
      },
    }
  } catch {
    throw new Error('人格数据 JSON 解析失败')
  }
}
