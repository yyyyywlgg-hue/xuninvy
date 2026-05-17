import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Save, RotateCcw, Plus, Trash2, Edit3, Mic, Upload, FlaskConical } from 'lucide-react'
import { getConfig, saveConfig, resetConversation, getCharacterCards, setSelectedCharacterId, addCharacterCard, updateCharacterCard, deleteCharacterCard, getSelectedCharacterId, type LLMConfig, type CharacterCard, type Persona, PERSONALITY_TAGS, ATTACHMENT_STYLES, LOVE_LANGUAGES, MBTI_TYPES, ZODIAC_SIGNS } from '../services/llmService'
import { distillFromChatLog } from '../services/distillService'
import { getTTSConfig, saveTTSConfig, type TTSConfig, type TTSProvider } from '../services/ttsService'
import { getSTTConfig, saveSTTConfig, SUPPORTED_LANGUAGES, type STTConfig } from '../services/sttService'
import { useChatStore } from '../store/useChatStore'
import ModelSelector from './ModelSelector'
import { CyberRadio, CyberChipGroup } from './CyberButton'

interface Props {
  visible: boolean
  onClose: () => void
  initialTab?: TabId
  onReset?: () => void
}

type TabId = 'character' | 'voice' | 'model' | 'api'

const TAB_OPTIONS: { value: TabId; label: string; number: string }[] = [
  { value: 'character', label: '角色', number: '01' },
  { value: 'voice', label: '语音', number: '02' },
  { value: 'model', label: '形象', number: '03' },
  { value: 'api', label: 'API', number: '04' },
]

const PRESET_CONFIGS = [
  { label: '智谱 GLM-4-Flash', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { label: '智谱 GLM-4-Plus', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  { label: 'DeepSeek Chat', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'DeepSeek R1', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-reasoner' },
  { label: 'MiniMax M1', baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M1' },
  { label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { label: '小米 MiMo', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'MiMo-V2-Flash' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
]

const OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer']

export default function SettingsPanel({ visible, onClose, initialTab, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab || 'character')

  const [llmConfig, setLlmConfig] = useState<LLMConfig>(getConfig())
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>(getTTSConfig())
  const [sttConfig, setSttConfig] = useState<STTConfig>(getSTTConfig())
  const [characters, setCharacters] = useState<CharacterCard[]>([])
  const [selectedCharId, setSelectedCharId] = useState('')

  const [editingChar, setEditingChar] = useState<CharacterCard | null>(null)
  const [showCharEditor, setShowCharEditor] = useState(false)

  const models = useChatStore((s) => s.models)
  const selectedModelId = useChatStore((s) => s.selectedModelId)
  const reloadModels = useChatStore((s) => s.reloadModels)
  const switchToModel = useChatStore((s) => s.switchToModel)

  useEffect(() => {
    if (visible) {
      setLlmConfig(getConfig())
      setTtsConfig(getTTSConfig())
      setSttConfig(getSTTConfig())
      setCharacters(getCharacterCards())
      setSelectedCharId(getSelectedCharacterId())
      reloadModels()
      if (initialTab) setActiveTab(initialTab)
    }
  }, [visible, reloadModels, initialTab])

  const handleSave = useCallback(() => {
    saveConfig(llmConfig)
    saveTTSConfig(ttsConfig)
    saveSTTConfig(sttConfig)
    setSelectedCharacterId(selectedCharId)
    onClose()
  }, [llmConfig, ttsConfig, sttConfig, selectedCharId, onClose])

  const handleReset = async () => {
    localStorage.removeItem('llm-config')
    localStorage.removeItem('custom-characters')
    localStorage.removeItem('selected-character-id')
    localStorage.removeItem('selected-model-id')
    localStorage.removeItem('tts-config')
    localStorage.removeItem('stt-config')
    indexedDB.deleteDatabase('ai-spirit-realm-chat')
    resetConversation()
    await useChatStore.getState().clearHistory()
    setLlmConfig({ baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', apiKey: '' })
    setTtsConfig(getTTSConfig())
    setSttConfig(getSTTConfig())
    setCharacters(getCharacterCards())
    setSelectedCharId(getSelectedCharacterId())
    setActiveTab('api')
    onReset?.()
  }

  const handleNewCharacter = useCallback(() => {
    setEditingChar({
      id: '',
      name: '',
      personality: '',
      greeting: '你刚刚上线，看到了用户。用你自己的方式跟对方说第一句话。',
      systemPrompt: '',
      isPreset: false,
      persona: {
        layer0: { rules: [] },
        layer1: {},
        layer2: {},
        layer3: {},
        layer4: {},
        tags: [],
      },
    })
    setShowCharEditor(true)
  }, [])

  const handleSaveCharacter = useCallback(() => {
    if (!editingChar) return
    if (!editingChar.name.trim()) return

    const charToSave = {
      ...editingChar,
      greeting: editingChar.greeting || `你刚刚上线，看到了用户。用你${editingChar.personality || '自己'}的方式跟对方说第一句话。`,
      systemPrompt: editingChar.systemPrompt || '',
    }

    if (editingChar.id) {
      updateCharacterCard(editingChar.id, charToSave)
    } else {
      const newCard = addCharacterCard(charToSave)
      setSelectedCharId(newCard.id)
    }
    setCharacters(getCharacterCards())
    setShowCharEditor(false)
    setEditingChar(null)
  }, [editingChar])

  const handleDeleteCharacter = useCallback((id: string) => {
    deleteCharacterCard(id)
    setCharacters(getCharacterCards())
    if (selectedCharId === id) {
      setSelectedCharId('preset-xiaoling')
    }
  }, [selectedCharId])

  const applyPreset = (preset: typeof PRESET_CONFIGS[0]) => {
    setLlmConfig((prev) => ({ ...prev, baseUrl: preset.baseUrl, model: preset.model }))
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl mx-4 cyber-panel max-h-[90vh] flex flex-col animate-glitchReveal" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}>
        <div className="flex items-center justify-between p-5 pb-1">
          <h2 className="cyber-title text-base text-[var(--cyber-cyan)]">SETTINGS</h2>
          <button onClick={onClose} className="text-[var(--cyber-cyan)]/60 hover:text-[var(--cyber-cyan)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2">
          <hr className="cyber-divider" />
          <CyberRadio
            name="settings-tab"
            options={TAB_OPTIONS}
            value={activeTab}
            onChange={(v) => setActiveTab(v as TabId)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {activeTab === 'character' && (
            <CharacterTab
              characters={characters}
              selectedCharId={selectedCharId}
              onSelectChar={setSelectedCharId}
              onNewChar={handleNewCharacter}
              onDeleteChar={handleDeleteCharacter}
              onEditChar={(char) => { setEditingChar(char); setShowCharEditor(true) }}
              editingChar={editingChar}
              showEditor={showCharEditor}
              onSaveChar={handleSaveCharacter}
              onCancelEdit={() => { setShowCharEditor(false); setEditingChar(null) }}
              onEditChange={setEditingChar}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceTab
              ttsConfig={ttsConfig}
              sttConfig={sttConfig}
              onTtsChange={setTtsConfig}
              onSttChange={setSttConfig}
            />
          )}

          {activeTab === 'model' && (
            <ModelSelector
              models={models}
              selectedId={selectedModelId}
              onSelect={(id) => switchToModel(id)}
              onModelsChanged={() => reloadModels()}
            />
          )}

          {activeTab === 'api' && (
            <ApiTab
              config={llmConfig}
              onChange={setLlmConfig}
              onApplyPreset={applyPreset}
              onReset={handleReset}
            />
          )}
        </div>

        <div className="p-5 pt-2">
          <hr className="cyber-divider absolute left-0 right-0" style={{ top: 0 }} />
          <button
            onClick={handleSave}
            className="cyber-btn-action w-full flex items-center justify-center gap-1.5 px-4 py-2 border-[var(--cyber-cyan)]/30 bg-[var(--cyber-cyan)]/10 text-[var(--cyber-cyan)] text-[10px] hover:bg-[var(--cyber-cyan)]/20 hover:border-[var(--cyber-cyan)]/60"
          >
            <Save size={12} />
            SAVE
          </button>
        </div>
      </div>
    </div>
  )
}

function CharacterTab({
  characters, selectedCharId, onSelectChar, onNewChar, onDeleteChar, onEditChar,
  editingChar, showEditor, onSaveChar, onCancelEdit, onEditChange,
}: {
  characters: CharacterCard[]
  selectedCharId: string
  onSelectChar: (id: string) => void
  onNewChar: () => void
  onDeleteChar: (id: string) => void
  onEditChar: (char: CharacterCard) => void
  editingChar: CharacterCard | null
  showEditor: boolean
  onSaveChar: () => void
  onCancelEdit: () => void
  onEditChange: (char: CharacterCard | null) => void
}) {
  const [editorTab, setEditorTab] = useState<'basic' | 'persona' | 'distill'>('basic')
  const [distillStatus, setDistillStatus] = useState('')
  const [distillBusy, setDistillBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updatePersona = (updates: Partial<Persona>) => {
    if (!editingChar) return
    onEditChange({
      ...editingChar,
      persona: { ...DEFAULT_PERSONA, ...editingChar.persona, ...updates },
    })
  }

  const updateLayer0 = (rules: string[]) => updatePersona({ layer0: { rules } })
  const updateLayer1 = (updates: Partial<Persona['layer1']>) => updatePersona({ layer1: { ...editingChar!.persona!.layer1, ...updates } })
  const updateLayer2 = (updates: Partial<Persona['layer2']>) => updatePersona({ layer2: { ...editingChar!.persona!.layer2, ...updates } })
  const updateLayer3 = (updates: Partial<Persona['layer3']>) => updatePersona({ layer3: { ...editingChar!.persona!.layer3, ...updates } })
  const updateLayer4 = (updates: Partial<Persona['layer4']>) => updatePersona({ layer4: { ...editingChar!.persona!.layer4, ...updates } })

  const toggleTag = (tag: string) => {
    if (!editingChar?.persona) return
    const tags = editingChar.persona.tags.includes(tag)
      ? editingChar.persona.tags.filter(t => t !== tag)
      : [...editingChar.persona.tags, tag]
    updatePersona({ tags })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingChar) return
    e.target.value = ''

    setDistillBusy(true)
    setDistillStatus('正在读取文件...')

    try {
      const text = await file.text()
      if (!text.trim()) {
        setDistillStatus('文件内容为空')
        setDistillBusy(false)
        return
      }

      const result = await distillFromChatLog(
        text,
        editingChar.name,
        (status) => setDistillStatus(status)
      )

      onEditChange({
        ...editingChar,
        personality: result.personality || editingChar.personality,
        greeting: result.greeting || editingChar.greeting,
        persona: {
          ...DEFAULT_PERSONA,
          ...editingChar.persona,
          ...result.persona,
          layer0: { ...DEFAULT_PERSONA.layer0, ...editingChar.persona?.layer0, ...result.persona?.layer0 },
          layer1: { ...editingChar.persona?.layer1, ...result.persona?.layer1 },
          layer2: { ...editingChar.persona?.layer2, ...result.persona?.layer2 },
          layer3: { ...editingChar.persona?.layer3, ...result.persona?.layer3 },
          layer4: { ...editingChar.persona?.layer4, ...result.persona?.layer4 },
          tags: result.persona?.tags || editingChar.persona?.tags || [],
        },
      })

      setDistillStatus('蒸馏完成！人格数据已自动填充')
    } catch (err) {
      setDistillStatus(`蒸馏失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setDistillBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="cyber-label">角色卡</label>
        <button
          onClick={onNewChar}
          className="flex items-center gap-1 text-[10px] px-2 py-1 border border-[var(--cyber-cyan)]/30 text-[var(--cyber-cyan)]/60 hover:text-[var(--cyber-cyan)] hover:border-[var(--cyber-cyan)]/50 transition-all font-mono tracking-wider uppercase"
        >
          <Plus size={10} />
          NEW
        </button>
      </div>

      {showEditor && editingChar && (
        <div className="cyber-section p-4 space-y-2">
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setEditorTab('basic')}
              className={`flex-1 text-[10px] py-1.5 font-mono tracking-wider transition-all ${
                editorTab === 'basic'
                  ? 'bg-[var(--cyber-purple)]/30 text-[var(--cyber-purple)] border border-[var(--cyber-purple)]/40'
                  : 'text-white/50 border border-transparent hover:text-white/70'
              }`}
            >基础信息</button>
            <button
              onClick={() => setEditorTab('persona')}
              className={`flex-1 text-[10px] py-1.5 font-mono tracking-wider transition-all ${
                editorTab === 'persona'
                  ? 'bg-[var(--cyber-purple)]/30 text-[var(--cyber-purple)] border border-[var(--cyber-purple)]/40'
                  : 'text-white/50 border border-transparent hover:text-white/70'
              }`}
            >人格定制</button>
            <button
              onClick={() => setEditorTab('distill')}
              className={`flex-1 text-[10px] py-1.5 font-mono tracking-wider transition-all ${
                editorTab === 'distill'
                  ? 'bg-[var(--cyber-purple)]/30 text-[var(--cyber-purple)] border border-[var(--cyber-purple)]/40'
                  : 'text-white/50 border border-transparent hover:text-white/70'
              }`}
            >聊天蒸馏</button>
          </div>

          {editorTab === 'basic' && (
            <>
              <input
                type="text"
                autoComplete="off"
                value={editingChar.name}
                onChange={(e) => onEditChange({ ...editingChar, name: e.target.value })}
                placeholder="角色名称"
                className="cyber-input-field w-full px-3 py-2 text-xs"
              />
              <input
                type="text"
                autoComplete="off"
                value={editingChar.personality}
                onChange={(e) => onEditChange({ ...editingChar, personality: e.target.value })}
                placeholder="性格描述（简短）"
                className="cyber-input-field w-full px-3 py-2 text-xs"
              />
            </>
          )}

          {editorTab === 'persona' && editingChar.persona && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
              <PersonaSection title="Layer 0：硬规则" subtitle="不可违背的核心规则">
                <RuleEditor rules={editingChar.persona!.layer0.rules} onChange={updateLayer0} />
              </PersonaSection>

              <PersonaSection title="Layer 1：身份" subtitle="角色的基本身份信息">
                <div className="grid grid-cols-2 gap-2">
                  <FieldInput label="年龄" value={editingChar.persona.layer1.age} onChange={v => updateLayer1({ age: v })} />
                  <FieldInput label="职业" value={editingChar.persona.layer1.occupation} onChange={v => updateLayer1({ occupation: v })} />
                  <FieldInput label="城市" value={editingChar.persona.layer1.city} onChange={v => updateLayer1({ city: v })} />
                  <FieldInput label="关系" value={editingChar.persona.layer1.relationship} onChange={v => updateLayer1({ relationship: v })} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="cyber-label text-[9px]">MBTI</label>
                    <select
                      value={editingChar.persona.layer1.mbti || ''}
                      onChange={e => updateLayer1({ mbti: e.target.value })}
                      className="cyber-input-field w-full px-2 py-1.5 text-[11px]"
                    >
                      <option value="" className="bg-[#1a1a2e] text-white">未选择</option>
                      {MBTI_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a2e] text-white">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="cyber-label text-[9px]">星座</label>
                    <select
                      value={editingChar.persona.layer1.zodiac || ''}
                      onChange={e => updateLayer1({ zodiac: e.target.value })}
                      className="cyber-input-field w-full px-2 py-1.5 text-[11px]"
                    >
                      <option value="" className="bg-[#1a1a2e] text-white">未选择</option>
                      {ZODIAC_SIGNS.map(z => <option key={z} value={z} className="bg-[#1a1a2e] text-white">{z}</option>)}
                    </select>
                  </div>
                </div>
              </PersonaSection>

              <PersonaSection title="Layer 2：说话风格" subtitle="口头禅、语气词、标点习惯等">
                <div className="grid grid-cols-2 gap-2">
                  <FieldInput label="口头禅" value={editingChar.persona.layer2.catchphrases} onChange={v => updateLayer2({ catchphrases: v })} />
                  <FieldInput label="语气词" value={editingChar.persona.layer2.particles} onChange={v => updateLayer2({ particles: v })} />
                  <FieldInput label="标点风格" value={editingChar.persona.layer2.punctuation} onChange={v => updateLayer2({ punctuation: v })} />
                  <FieldInput label="emoji风格" value={editingChar.persona.layer2.emojiStyle} onChange={v => updateLayer2({ emojiStyle: v })} />
                  <FieldInput label="消息格式" value={editingChar.persona.layer2.msgFormat} onChange={v => updateLayer2({ msgFormat: v })} />
                  <FieldInput label="称呼对方" value={editingChar.persona.layer2.callUser} onChange={v => updateLayer2({ callUser: v })} />
                </div>
              </PersonaSection>

              <PersonaSection title="Layer 3：情感模式" subtitle="依恋类型、情感表达、情绪触发器">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="cyber-label text-[9px]">依恋类型</label>
                    <select
                      value={editingChar.persona.layer3.attachmentStyle || ''}
                      onChange={e => updateLayer3({ attachmentStyle: e.target.value })}
                      className="cyber-input-field w-full px-2 py-1.5 text-[11px]"
                    >
                      <option value="" className="bg-[#1a1a2e] text-white">未选择</option>
                      {ATTACHMENT_STYLES.map(a => <option key={a.value} value={a.value} className="bg-[#1a1a2e] text-white">{a.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="cyber-label text-[9px]">爱的语言</label>
                    <select
                      value={editingChar.persona.layer3.loveLanguage || ''}
                      onChange={e => updateLayer3({ loveLanguage: e.target.value })}
                      className="cyber-input-field w-full px-2 py-1.5 text-[11px]"
                    >
                      <option value="" className="bg-[#1a1a2e] text-white">未选择</option>
                      {LOVE_LANGUAGES.map(l => <option key={l.value} value={l.value} className="bg-[#1a1a2e] text-white">{l.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <FieldInput label="表达爱意" value={editingChar.persona.layer3.loveExpression} onChange={v => updateLayer3({ loveExpression: v })} />
                  <FieldInput label="生气时" value={editingChar.persona.layer3.angerPattern} onChange={v => updateLayer3({ angerPattern: v })} />
                  <FieldInput label="难过时" value={editingChar.persona.layer3.sadnessPattern} onChange={v => updateLayer3({ sadnessPattern: v })} />
                  <FieldInput label="开心时" value={editingChar.persona.layer3.happyPattern} onChange={v => updateLayer3({ happyPattern: v })} />
                  <FieldInput label="吃醋时" value={editingChar.persona.layer3.jealousyPattern} onChange={v => updateLayer3({ jealousyPattern: v })} />
                  <FieldInput label="被惹生气" value={editingChar.persona.layer3.angerTriggers} onChange={v => updateLayer3({ angerTriggers: v })} />
                  <FieldInput label="会开心的事" value={editingChar.persona.layer3.happyTriggers} onChange={v => updateLayer3({ happyTriggers: v })} />
                  <FieldInput label="雷区话题" value={editingChar.persona.layer3.sensitiveTopics} onChange={v => updateLayer3({ sensitiveTopics: v })} />
                </div>
              </PersonaSection>

              <PersonaSection title="Layer 4：关系行为" subtitle="争吵模式、日常互动、边界底线">
                <div className="grid grid-cols-2 gap-2">
                  <FieldInput label="关系角色" value={editingChar.persona.layer4.relationshipRole} onChange={v => updateLayer4({ relationshipRole: v })} />
                  <FieldInput label="争吵起因" value={editingChar.persona.layer4.fightCauses} onChange={v => updateLayer4({ fightCauses: v })} />
                  <FieldInput label="争吵反应" value={editingChar.persona.layer4.fightResponse} onChange={v => updateLayer4({ fightResponse: v })} />
                  <FieldInput label="冷战时长" value={editingChar.persona.layer4.coldWarDuration} onChange={v => updateLayer4({ coldWarDuration: v })} />
                  <FieldInput label="和好方式" value={editingChar.persona.layer4.makeUpPattern} onChange={v => updateLayer4({ makeUpPattern: v })} />
                  <FieldInput label="联系频率" value={editingChar.persona.layer4.contactFrequency} onChange={v => updateLayer4({ contactFrequency: v })} />
                  <FieldInput label="主动程度" value={editingChar.persona.layer4.initiativeLevel} onChange={v => updateLayer4({ initiativeLevel: v })} />
                  <FieldInput label="回复速度" value={editingChar.persona.layer4.replySpeed} onChange={v => updateLayer4({ replySpeed: v })} />
                  <FieldInput label="不能接受" value={editingChar.persona.layer4.dealbreakers} onChange={v => updateLayer4({ dealbreakers: v })} />
                  <FieldInput label="需要空间" value={editingChar.persona.layer4.spaceNeeds} onChange={v => updateLayer4({ spaceNeeds: v })} />
                </div>
              </PersonaSection>

              <PersonaSection title="性格标签" subtitle="选择标签自动生成行为规则">
                <div className="flex flex-wrap gap-1.5">
                  {PERSONALITY_TAGS.map(tag => (
                    <button
                      key={tag.value}
                      onClick={() => toggleTag(tag.value)}
                      className={`cyber-tag transition-all ${
                        editingChar.persona!.tags.includes(tag.value)
                          ? 'bg-[var(--cyber-purple)]/40 text-[var(--cyber-purple)] border border-[var(--cyber-purple)]/50'
                          : 'bg-white/8 text-white/50 border border-white/15 hover:text-white/70 hover:border-white/25'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </PersonaSection>

              <PersonaSection title="自定义记忆" subtitle="角色独有的记忆和经历">
                <textarea
                  value={editingChar.persona.customMemory || ''}
                  onChange={e => updatePersona({ customMemory: e.target.value })}
                  placeholder="写入角色独有的记忆、经历、故事……"
                  rows={3}
                  className="cyber-input-field w-full px-3 py-2 text-[11px] resize-none"
                />
              </PersonaSection>
            </div>
          )}

          {editorTab === 'distill' && (
            <div className="space-y-3">
              <div className="cyber-section p-4 space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-[var(--cyber-cyan)]/70 font-mono tracking-wider mb-1">聊天记录蒸馏</div>
                  <div className="text-[10px] text-white/45 leading-relaxed">
                    上传聊天记录文件（.txt），AI 将自动分析说话人的性格特征，并填充到人格定制中。
                    <br />支持格式：微信导出 txt、QQ 导出 txt、带时间戳的聊天记录、简单的"名字：内容"格式
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={distillBusy}
                  className={`w-full py-3 flex items-center justify-center gap-2 text-[11px] font-mono tracking-wider transition-all border ${
                    distillBusy
                      ? 'border-[var(--cyber-purple)]/20 bg-[var(--cyber-purple)]/5 text-[var(--cyber-purple)]/40 cursor-wait'
                      : 'border-[var(--cyber-purple)]/30 bg-[var(--cyber-purple)]/10 text-[var(--cyber-purple)] hover:bg-[var(--cyber-purple)]/20 hover:border-[var(--cyber-purple)]/50'
                  }`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                >
                  {distillBusy ? (
                    <>
                      <FlaskConical size={14} className="animate-pulse" />
                      蒸馏中...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      上传聊天记录
                    </>
                  )}
                </button>

                {distillStatus && (
                  <div className={`text-[10px] font-mono px-3 py-2 ${
                    distillStatus.includes('失败')
                      ? 'bg-[var(--cyber-red)]/10 text-[var(--cyber-red)]/80 border border-[var(--cyber-red)]/20'
                      : distillStatus.includes('完成')
                        ? 'bg-[var(--cyber-green)]/10 text-[var(--cyber-green)]/80 border border-[var(--cyber-green)]/20'
                        : 'bg-[var(--cyber-cyan)]/10 text-[var(--cyber-cyan)]/70 border border-[var(--cyber-cyan)]/20'
                  }`}>
                    {distillStatus}
                  </div>
                )}
              </div>

              <div className="cyber-section p-4 space-y-2">
                <div className="text-[11px] font-bold text-[var(--cyber-cyan)]/70 font-mono tracking-wider">使用说明</div>
                <div className="text-[10px] text-white/50 space-y-1 leading-relaxed">
                  <div>1. 先在"基础信息"中填写角色名称</div>
                  <div>2. 点击上方按钮上传聊天记录 .txt 文件</div>
                  <div>3. AI 将自动分析并提取人格特征</div>
                  <div>4. 蒸馏完成后可到"人格定制"中查看和微调</div>
                </div>
                <div className="text-[10px] text-white/35 mt-2 font-mono">
                  示例格式：<br />
                  2024-01-15 20:30:45 小明<br />
                  今天好累啊<br />
                  2024-01-15 20:31:02 我<br />
                  怎么了？<br />
                  <br />
                  或简单格式：<br />
                  小明：今天好累啊<br />
                  我：怎么了？
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onSaveChar} className="flex-1 py-2 bg-[var(--cyber-purple)]/50 text-white text-xs hover:bg-[var(--cyber-purple)]/70 transition-colors font-mono tracking-wider" style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>保存</button>
            <button onClick={onCancelEdit} className="flex-1 py-2 bg-white/8 text-white/65 text-xs hover:bg-white/12 transition-colors font-mono tracking-wider" style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>取消</button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {characters.map((char) => (
          <div
            key={char.id}
            onClick={() => onSelectChar(char.id)}
            className={`relative p-3 border cursor-pointer transition-all group ${
              char.id === selectedCharId
                ? 'cyber-section bg-[var(--cyber-purple)]/15 border-[var(--cyber-purple)]/30'
                : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'
            }`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium ${char.id === selectedCharId ? 'text-violet-200' : 'text-white/80'}`}>
                    {char.name}
                  </span>
                  {char.persona && (
                    <span className="cyber-tag bg-[var(--cyber-purple)]/20 text-[var(--cyber-purple)]">PERSONA</span>
                  )}
                </div>
                <div className="text-[11px] text-white/50 mt-0.5">{char.personality}</div>
                {char.persona && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {char.persona.tags.slice(0, 4).map(tag => {
                      const pt = PERSONALITY_TAGS.find(p => p.value === tag)
                      return pt ? (
                        <span key={tag} className="cyber-tag bg-white/8 text-white/45">{pt.label}</span>
                      ) : null
                    })}
                    {char.persona.tags.length > 4 && (
                      <span className="cyber-tag text-white/35">+{char.persona.tags.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                {char.isPreset && (
                  <span className="cyber-tag bg-white/8 text-white/45">预设</span>
                )}
                {!char.isPreset && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditChar(char) }}
                      className="p-1 text-white/35 hover:text-white/70 transition-colors"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteChar(char.id) }}
                      className="p-1 text-white/35 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const DEFAULT_PERSONA: Persona = {
  layer0: { rules: [] },
  layer1: {},
  layer2: {},
  layer3: {},
  layer4: {},
  tags: [],
}

function PersonaSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="cyber-section p-3">
      <div className="mb-2">
        <div className="text-[11px] font-bold text-[var(--cyber-cyan)]/70 font-mono tracking-wider">{title}</div>
        <div className="text-[9px] text-white/45">{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

function FieldInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="cyber-label text-[9px]">{label}</label>
      <input
        type="text"
        autoComplete="off"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="cyber-input-field w-full px-2 py-1.5 text-[11px]"
      />
    </div>
  )
}

function RuleEditor({ rules, onChange }: { rules: string[]; onChange: (rules: string[]) => void }) {
  return (
    <div className="space-y-1">
      {rules.map((rule, i) => (
        <div key={i} className="flex gap-1">
          <span className="text-[9px] text-white/40 mt-2 w-3 shrink-0">{i + 1}.</span>
          <input
            type="text"
            autoComplete="off"
            value={rule}
            onChange={e => {
              const next = [...rules]
              next[i] = e.target.value
              onChange(next)
            }}
            className="cyber-input-field flex-1 px-2 py-1.5 text-[11px]"
          />
          <button
            onClick={() => onChange(rules.filter((_, j) => j !== i))}
            className="text-white/35 hover:text-[var(--cyber-red)] text-[11px] px-1"
          >×</button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rules, ''])}
        className="text-[9px] text-[var(--cyber-cyan)]/50 hover:text-[var(--cyber-cyan)] font-mono tracking-wider"
      >+ 添加规则</button>
    </div>
  )
}

function VoiceTab({
  ttsConfig, sttConfig, onTtsChange, onSttChange,
}: {
  ttsConfig: TTSConfig
  sttConfig: STTConfig
  onTtsChange: (c: TTSConfig) => void
  onSttChange: (c: STTConfig) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="cyber-label">TTS 引擎</label>
        <CyberRadio
          name="tts-provider"
          options={[
            { value: 'none', label: '关闭', number: '00' },
            { value: 'openai-compatible', label: 'TTS', number: '01' },
          ]}
          value={ttsConfig.provider}
          onChange={(v) => onTtsChange({ ...ttsConfig, provider: v as TTSProvider })}
        />
      </div>

      {ttsConfig.provider === 'openai-compatible' && (
        <div className="cyber-section p-4 space-y-3">
          <div>
            <label className="block text-[11px] text-white/55 mb-1">API Base URL</label>
            <input
              type="text"
              autoComplete="off"
              value={ttsConfig.openaiBaseUrl}
              onChange={(e) => onTtsChange({ ...ttsConfig, openaiBaseUrl: e.target.value })}
              className="cyber-input-field w-full px-3 py-2 text-xs"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/55 mb-1">API Key</label>
            <input
              type="password"
              autoComplete="off"
              value={ttsConfig.openaiApiKey}
              onChange={(e) => onTtsChange({ ...ttsConfig, openaiApiKey: e.target.value })}
              className="cyber-input-field w-full px-3 py-2 text-xs"
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/55 mb-1">模型</label>
            <input
              type="text"
              autoComplete="off"
              value={ttsConfig.openaiModel}
              onChange={(e) => onTtsChange({ ...ttsConfig, openaiModel: e.target.value })}
              className="cyber-input-field w-full px-3 py-2 text-xs"
              placeholder="tts-1"
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/55 mb-1">音色</label>
            <CyberChipGroup
              name="tts-voice"
              options={OPENAI_VOICES.map(v => ({ value: v, label: v }))}
              value={ttsConfig.openaiVoice}
              onChange={(v) => onTtsChange({ ...ttsConfig, openaiVoice: v })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/55 mb-1">语速: {ttsConfig.openaiSpeed.toFixed(1)}</label>
            <input
              type="range" min="0.5" max="2" step="0.1"
              value={ttsConfig.openaiSpeed}
              onChange={(e) => onTtsChange({ ...ttsConfig, openaiSpeed: parseFloat(e.target.value) })}
              className="w-full accent-violet-500"
            />
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Mic size={12} className="text-white/55" />
          <label className="cyber-label">语音识别</label>
        </div>
        <div className="cyber-section p-4 space-y-3">
          <div>
            <label className="block text-[11px] text-white/55 mb-1">识别语言</label>
            <select
              value={sttConfig.language}
              onChange={(e) => onSttChange({ ...sttConfig, language: e.target.value })}
              className="cyber-input-field w-full px-3 py-2 text-xs"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-[#1a1a2e] text-white">{lang.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-white/55">连续识别</label>
            <button
              onClick={() => onSttChange({ ...sttConfig, continuous: !sttConfig.continuous })}
              className={`cyber-toggle ${sttConfig.continuous ? 'bg-[var(--cyber-purple)]' : 'bg-white/15'}`}
            >
              <div className={`knob ${sttConfig.continuous ? 'left-[21px]' : 'left-[3px]'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-white/55">识别后自动发送</label>
            <button
              onClick={() => onSttChange({ ...sttConfig, autoSend: !sttConfig.autoSend })}
              className={`cyber-toggle ${sttConfig.autoSend ? 'bg-[var(--cyber-purple)]' : 'bg-white/15'}`}
            >
              <div className={`knob ${sttConfig.autoSend ? 'left-[21px]' : 'left-[3px]'}`} />
            </button>
          </div>
          {sttConfig.autoSend && (
            <div>
              <label className="block text-[11px] text-white/55 mb-1">自动发送延迟: {sttConfig.autoSendDelay}ms</label>
              <input
                type="range" min="500" max="5000" step="500"
                value={sttConfig.autoSendDelay}
                onChange={(e) => onSttChange({ ...sttConfig, autoSendDelay: parseInt(e.target.value) })}
                className="w-full accent-violet-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ApiTab({
  config, onChange, onApplyPreset, onReset,
}: {
  config: LLMConfig
  onChange: (c: LLMConfig) => void
  onApplyPreset: (preset: typeof PRESET_CONFIGS[0]) => void
  onReset?: () => void
}) {
  const hasConfig = config.apiKey.length > 0
  const matchedPreset = PRESET_CONFIGS.find(p => p.baseUrl === config.baseUrl && p.model === config.model)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  return (
    <div className="space-y-4">
      {hasConfig && (
        <div className="cyber-section p-3 space-y-1.5 bg-[var(--cyber-purple)]/8">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyber-green)]" style={{ boxShadow: '0 0 4px var(--cyber-green)' }} />
            <span className="cyber-label text-[var(--cyber-green)]">当前配置</span>
            {matchedPreset && (
              <span className="cyber-tag bg-[var(--cyber-purple)]/20 text-[var(--cyber-purple)]">
                {matchedPreset.label}
              </span>
            )}
          </div>
          <div className="text-[11px] text-white/55 font-mono space-y-0.5">
            <div>URL: <span className="text-white/75">{config.baseUrl}</span></div>
            <div>KEY: <span className="text-white/75">{config.apiKey.slice(0, 6)}{'•'.repeat(Math.max(0, config.apiKey.length - 6))}</span></div>
            <div>MODEL: <span className="text-white/75">{config.model}</span></div>
          </div>
        </div>
      )}

      <div>
        <label className="block cyber-label">快捷配置</label>
        <CyberChipGroup
          name="api-preset"
          options={PRESET_CONFIGS.map(p => ({ value: p.label, label: p.label.split(' ')[0] }))}
          value=""
          onChange={(label) => {
            const preset = PRESET_CONFIGS.find(p => p.label.startsWith(label))
            if (preset) onApplyPreset(preset)
          }}
        />
      </div>

      <div>
        <label className="block cyber-label">API Base URL</label>
        <input
          type="text"
          autoComplete="off"
          value={config.baseUrl}
          onChange={(e) => onChange({ ...config, baseUrl: e.target.value })}
          className="cyber-input-field w-full px-3 py-2 text-xs"
          placeholder="https://open.bigmodel.cn/api/paas/v4"
        />
      </div>

      <div>
        <label className="block cyber-label">API Key</label>
        <input
          type="password"
          autoComplete="off"
          value={config.apiKey}
          onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
          className="cyber-input-field w-full px-3 py-2 text-xs"
          placeholder="sk-..."
        />
      </div>

      <div>
        <label className="block cyber-label">模型名称</label>
        <input
          type="text"
          autoComplete="off"
          value={config.model}
          onChange={(e) => onChange({ ...config, model: e.target.value })}
          className="cyber-input-field w-full px-3 py-2 text-xs"
          placeholder="glm-4-flash"
        />
      </div>

      {hasConfig && onReset && (
        <>
          <div className="pt-2 border-t border-white/8">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="cyber-btn-action w-full flex items-center justify-center gap-1.5 px-4 py-2 border-[var(--cyber-red)]/30 text-[var(--cyber-red)]/60 text-[10px] hover:text-[var(--cyber-red)] hover:border-[var(--cyber-red)]/60"
            >
              <RotateCcw size={12} />
              RESET ALL
            </button>
          </div>

          {showResetConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div
                className="bg-[var(--cyber-surface)] border border-[var(--cyber-red)]/30 p-6 max-w-sm w-full mx-4 relative"
                style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--cyber-red)]/50 to-transparent" />
                <h3 className="text-[var(--cyber-red)] text-sm font-bold tracking-wider mb-3 font-mono">RESET ALL DATA</h3>
                <p className="text-[var(--cyber-text)]/60 text-xs mb-6 leading-relaxed">
                  确定要重置所有数据吗？这将清除 API Key、角色卡、对话记录等所有配置，此操作不可撤销。
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 text-xs border border-[var(--cyber-border)] text-[var(--cyber-text)]/50 hover:text-[var(--cyber-text)] hover:border-[var(--cyber-cyan)]/30 transition-all duration-300 font-mono"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))' }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => { setShowResetConfirm(false); onReset() }}
                    className="px-4 py-2 text-xs border border-[var(--cyber-red)]/40 bg-[var(--cyber-red)]/10 text-[var(--cyber-red)] hover:bg-[var(--cyber-red)]/20 transition-all duration-300 font-mono"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))' }}
                  >
                    RESET
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
