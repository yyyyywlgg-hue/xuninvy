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

const TAB_OPTIONS: { value: TabId; label: string }[] = [
  { value: 'character', label: '角色' },
  { value: 'voice', label: '语音' },
  { value: 'model', label: '形象' },
  { value: 'api', label: 'API' },
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

  const initialTabRef = useRef(initialTab)

  useEffect(() => {
    if (visible) {
      setLlmConfig(getConfig())
      setTtsConfig(getTTSConfig())
      setSttConfig(getSTTConfig())
      setCharacters(getCharacterCards())
      setSelectedCharId(getSelectedCharacterId())
      reloadModels()
      if (initialTabRef.current) setActiveTab(initialTabRef.current)
    }
  }, [visible, reloadModels])

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

    setLlmConfig(getConfig())
    setTtsConfig(getTTSConfig())
    setSttConfig(getSTTConfig())
    setCharacters(getCharacterCards())
    setSelectedCharId(getSelectedCharacterId())
    setActiveTab('api')
    onReset?.()

    await useChatStore.getState().clearHistory()
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md h-full glass-panel !rounded-none !border-l animate-slideInRight flex flex-col">
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="text-sm font-semibold text-[var(--accent-rose)]/80 tracking-wide">设置</h2>
          <button onClick={onClose} className="icon-btn !w-8 !h-8">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-2 pb-3">
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

        <div className="p-5 pt-3 border-t border-[var(--border-soft)]">
          <button
            onClick={handleSave}
            className="action-btn action-btn-primary w-full justify-center py-2.5"
          >
            <Save size={14} />
            保存设置
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
        <span className="label-text">角色卡</span>
        <button
          onClick={onNewChar}
          className="action-btn action-btn-ghost !py-1 !px-3 !text-[10px]"
        >
          <Plus size={10} />
          新建
        </button>
      </div>

      {showEditor && editingChar && (
        <div className="section-card p-4 space-y-3">
          <div className="glass-radio-group !text-[10px]">
            {(['basic', 'persona', 'distill'] as const).map(tab => (
              <label
                key={tab}
                className={editorTab === tab ? 'active' : ''}
                onClick={() => setEditorTab(tab)}
              >
                {tab === 'basic' ? '基础信息' : tab === 'persona' ? '人格定制' : '聊天蒸馏'}
              </label>
            ))}
            <div
              className="glass-glider"
              style={{
                width: '33.333%',
                transform: `translateX(${editorTab === 'basic' ? 0 : editorTab === 'persona' ? 100 : 200}%)`,
              }}
            />
          </div>

          {editorTab === 'basic' && (
            <div className="space-y-2">
              <input
                type="text"
                autoComplete="off"
                value={editingChar.name}
                onChange={(e) => onEditChange({ ...editingChar, name: e.target.value })}
                placeholder="角色名称"
                className="glass-input w-full px-3 py-2 text-xs"
              />
              <input
                type="text"
                autoComplete="off"
                value={editingChar.personality}
                onChange={(e) => onEditChange({ ...editingChar, personality: e.target.value })}
                placeholder="性格描述（简短）"
                className="glass-input w-full px-3 py-2 text-xs"
              />
            </div>
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
                    <label className="label-text !text-[9px]">MBTI</label>
                    <select
                      value={editingChar.persona.layer1.mbti || ''}
                      onChange={e => updateLayer1({ mbti: e.target.value })}
                      className="glass-input w-full px-2 py-1.5 text-[11px]"
                    >
                      <option value="" className="bg-[#1a1a2e] text-white">未选择</option>
                      {MBTI_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a2e] text-white">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text !text-[9px]">星座</label>
                    <select
                      value={editingChar.persona.layer1.zodiac || ''}
                      onChange={e => updateLayer1({ zodiac: e.target.value })}
                      className="glass-input w-full px-2 py-1.5 text-[11px]"
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
                    <label className="label-text !text-[9px]">依恋类型</label>
                    <select
                      value={editingChar.persona.layer3.attachmentStyle || ''}
                      onChange={e => updateLayer3({ attachmentStyle: e.target.value })}
                      className="glass-input w-full px-2 py-1.5 text-[11px]"
                    >
                      <option value="" className="bg-[#1a1a2e] text-white">未选择</option>
                      {ATTACHMENT_STYLES.map(a => <option key={a.value} value={a.value} className="bg-[#1a1a2e] text-white">{a.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text !text-[9px]">爱的语言</label>
                    <select
                      value={editingChar.persona.layer3.loveLanguage || ''}
                      onChange={e => updateLayer3({ loveLanguage: e.target.value })}
                      className="glass-input w-full px-2 py-1.5 text-[11px]"
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
                      className={`tag-chip ${
                        editingChar.persona!.tags.includes(tag.value)
                          ? 'bg-[var(--accent-lavender)]/20 text-[var(--accent-lavender)] border border-[var(--accent-lavender)]/30'
                          : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70 hover:border-white/20'
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
                  className="glass-input w-full px-3 py-2 text-[11px] resize-none"
                />
              </PersonaSection>
            </div>
          )}

          {editorTab === 'distill' && (
            <div className="space-y-3">
              <div className="section-card p-4 space-y-3">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--accent-lavender)]/80 mb-1">聊天记录蒸馏</div>
                  <div className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
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
                  className={`action-btn w-full justify-center py-3 ${
                    distillBusy
                      ? 'action-btn-ghost opacity-50 cursor-wait'
                      : 'action-btn-primary'
                  }`}
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
                  <div className={`text-[10px] px-3 py-2 rounded-lg ${
                    distillStatus.includes('失败')
                      ? 'bg-red-500/10 text-red-400/80 border border-red-500/20'
                      : distillStatus.includes('完成')
                        ? 'bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20'
                        : 'bg-[var(--accent-lavender)]/10 text-[var(--accent-lavender)]/70 border border-[var(--accent-lavender)]/20'
                  }`}>
                    {distillStatus}
                  </div>
                )}
              </div>

              <div className="section-card p-4 space-y-2">
                <div className="text-[11px] font-semibold text-[var(--accent-lavender)]/80">使用说明</div>
                <div className="text-[10px] text-[var(--text-secondary)] space-y-1 leading-relaxed">
                  <div>1. 先在"基础信息"中填写角色名称</div>
                  <div>2. 点击上方按钮上传聊天记录 .txt 文件</div>
                  <div>3. AI 将自动分析并提取人格特征</div>
                  <div>4. 蒸馏完成后可到"人格定制"中查看和微调</div>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-2">
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
            <button onClick={onSaveChar} className="action-btn action-btn-primary flex-1 justify-center py-2">保存</button>
            <button onClick={onCancelEdit} className="action-btn action-btn-ghost flex-1 justify-center py-2">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {characters.map((char) => (
          <div
            key={char.id}
            onClick={() => onSelectChar(char.id)}
            className={`char-card ${char.id === selectedCharId ? 'selected' : ''}`}
          >
            <div className="char-card__glow" />
            <div className="char-card__shine" />
            <div className="char-card__badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="char-card__content !flex !flex-row !items-center !gap-3 !py-3">
              <div className="char-card__image !w-12 !h-12 !mb-0 !shrink-0 !rounded-lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="char-card__title !text-[13px]">{char.name}</span>
                  {char.isPreset && (
                    <span className="tag-chip bg-white/5 text-white/45">预设</span>
                  )}
                  {char.persona && (
                    <span className="tag-chip bg-[var(--accent-lavender)]/15 text-[var(--accent-lavender)]">PERSONA</span>
                  )}
                </div>
                <div className="char-card__desc !text-[11px] mt-0.5">{char.personality}</div>
                {char.persona && char.persona.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {char.persona.tags.slice(0, 3).map(tag => {
                      const pt = PERSONALITY_TAGS.find(p => p.value === tag)
                      return pt ? (
                        <span key={tag} className="tag-chip bg-white/5 text-white/45">{pt.label}</span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!char.isPreset && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditChar(char) }}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteChar(char.id) }}
                      className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors rounded"
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
    <div className="section-card p-3">
      <div className="mb-2">
        <div className="text-[11px] font-semibold text-[var(--accent-lavender)]/70">{title}</div>
        <div className="text-[9px] text-[var(--text-muted)]">{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

function FieldInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label-text !text-[9px]">{label}</label>
      <input
        type="text"
        autoComplete="off"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="glass-input w-full px-2 py-1.5 text-[11px]"
      />
    </div>
  )
}

function RuleEditor({ rules, onChange }: { rules: string[]; onChange: (rules: string[]) => void }) {
  return (
    <div className="space-y-1">
      {rules.map((rule, i) => (
        <div key={i} className="flex gap-1">
          <span className="text-[9px] text-[var(--text-muted)] mt-2 w-3 shrink-0">{i + 1}.</span>
          <input
            type="text"
            autoComplete="off"
            value={rule}
            onChange={e => {
              const next = [...rules]
              next[i] = e.target.value
              onChange(next)
            }}
            className="glass-input flex-1 px-2 py-1.5 text-[11px]"
          />
          <button
            onClick={() => onChange(rules.filter((_, j) => j !== i))}
            className="text-[var(--text-muted)] hover:text-red-400 text-[11px] px-1 transition-colors"
          >×</button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rules, ''])}
        className="text-[9px] text-[var(--accent-lavender)]/50 hover:text-[var(--accent-lavender)] transition-colors"
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
        <label className="label-text">TTS 引擎</label>
        <CyberRadio
          name="tts-provider"
          options={[
            { value: 'none', label: '关闭' },
            { value: 'openai-compatible', label: 'TTS API' },
          ]}
          value={ttsConfig.provider}
          onChange={(v) => onTtsChange({ ...ttsConfig, provider: v as TTSProvider })}
        />
      </div>

      {ttsConfig.provider === 'openai-compatible' && (
        <div className="section-card p-4 space-y-3">
          <div>
            <label className="label-text">API Base URL</label>
            <input
              type="text"
              autoComplete="off"
              name="tts-url"
              value={ttsConfig.openaiBaseUrl}
              onChange={(e) => onTtsChange({ ...ttsConfig, openaiBaseUrl: e.target.value })}
              className="glass-input w-full px-3 py-2 text-xs"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div>
            <label className="label-text">API Key</label>
            <input
              type="password"
              autoComplete="new-password"
              name="tts-key"
              data-1p-ignore
              data-lpignore="true"
              value={ttsConfig.openaiApiKey}
              onChange={(e) => onTtsChange({ ...ttsConfig, openaiApiKey: e.target.value })}
              className="glass-input w-full px-3 py-2 text-xs"
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="label-text">模型</label>
            <input
              type="text"
              autoComplete="off"
              value={ttsConfig.openaiModel}
              onChange={(e) => onTtsChange({ ...ttsConfig, openaiModel: e.target.value })}
              className="glass-input w-full px-3 py-2 text-xs"
              placeholder="tts-1"
            />
          </div>
          <div>
            <label className="label-text">音色</label>
            <CyberChipGroup
              name="tts-voice"
              options={OPENAI_VOICES.map(v => ({ value: v, label: v }))}
              value={ttsConfig.openaiVoice}
              onChange={(v) => onTtsChange({ ...ttsConfig, openaiVoice: v })}
            />
          </div>
          <div>
            <label className="label-text">语速: {ttsConfig.openaiSpeed.toFixed(1)}</label>
            <input
              type="range" min="0.5" max="2" step="0.1"
              value={ttsConfig.openaiSpeed}
              onChange={(e) => onTtsChange({ ...ttsConfig, openaiSpeed: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent-lavender)]"
            />
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border-soft)] pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Mic size={12} className="text-[var(--text-secondary)]" />
          <label className="label-text !mb-0">语音识别</label>
        </div>
        <div className="section-card p-4 space-y-3">
          <div>
            <label className="label-text">识别语言</label>
            <select
              value={sttConfig.language}
              onChange={(e) => onSttChange({ ...sttConfig, language: e.target.value })}
              className="glass-input w-full px-3 py-2 text-xs"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-[#1a1a2e] text-white">{lang.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-[var(--text-secondary)]">连续识别</label>
            <button
              onClick={() => onSttChange({ ...sttConfig, continuous: !sttConfig.continuous })}
              className={`toggle-switch ${sttConfig.continuous ? 'bg-[var(--accent-lavender)]' : 'bg-white/15'}`}
            >
              <div className={`knob ${sttConfig.continuous ? 'left-[21px]' : 'left-[3px]'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-[var(--text-secondary)]">识别后自动发送</label>
            <button
              onClick={() => onSttChange({ ...sttConfig, autoSend: !sttConfig.autoSend })}
              className={`toggle-switch ${sttConfig.autoSend ? 'bg-[var(--accent-lavender)]' : 'bg-white/15'}`}
            >
              <div className={`knob ${sttConfig.autoSend ? 'left-[21px]' : 'left-[3px]'}`} />
            </button>
          </div>
          {sttConfig.autoSend && (
            <div>
              <label className="label-text">自动发送延迟: {sttConfig.autoSendDelay}ms</label>
              <input
                type="range" min="500" max="5000" step="500"
                value={sttConfig.autoSendDelay}
                onChange={(e) => onSttChange({ ...sttConfig, autoSendDelay: parseInt(e.target.value) })}
                className="w-full accent-[var(--accent-lavender)]"
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
  const [savedConfig] = useState(() => getConfig())
  const hasConfig = savedConfig.apiKey.length > 0
  const matchedPreset = PRESET_CONFIGS.find(p => p.baseUrl === savedConfig.baseUrl && p.model === savedConfig.model)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  return (
    <div className="space-y-4">
      {hasConfig && (
        <div className="section-card p-3 space-y-1.5 !bg-[var(--accent-lavender)]/5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px rgba(52, 211, 153, 0.5)' }} />
            <span className="text-[11px] font-medium text-emerald-400/80">当前配置</span>
            {matchedPreset && (
              <span className="tag-chip bg-[var(--accent-lavender)]/15 text-[var(--accent-lavender)]">
                {matchedPreset.label}
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] space-y-0.5 overflow-hidden">
            <div className="truncate">URL: <span className="text-[var(--text-primary)]/70">{savedConfig.baseUrl}</span></div>
            <div className="truncate">KEY: <span className="text-[var(--text-primary)]/70">{savedConfig.apiKey.slice(0, 6)}•••</span></div>
            <div className="truncate">MODEL: <span className="text-[var(--text-primary)]/70">{savedConfig.model}</span></div>
          </div>
        </div>
      )}

      <div>
        <label className="label-text">快捷配置</label>
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
        <label className="label-text">API Base URL</label>
        <input
          type="text"
          autoComplete="off"
          name="llm-url"
          value={config.baseUrl}
          onChange={(e) => onChange({ ...config, baseUrl: e.target.value })}
          className="glass-input w-full px-3 py-2 text-xs"
          placeholder="https://open.bigmodel.cn/api/paas/v4"
        />
      </div>

      <div>
        <label className="label-text">API Key</label>
        <input
          type="password"
          autoComplete="new-password"
          name="llm-key"
          data-1p-ignore
          data-lpignore="true"
          value={config.apiKey}
          onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
          className="glass-input w-full px-3 py-2 text-xs"
          placeholder="sk-..."
        />
      </div>

      <div>
        <label className="label-text">模型名称</label>
        <input
          type="text"
          autoComplete="off"
          name="llm-model"
          value={config.model}
          onChange={(e) => onChange({ ...config, model: e.target.value })}
          className="glass-input w-full px-3 py-2 text-xs"
          placeholder="glm-4-flash"
        />
      </div>

      {hasConfig && onReset && (
        <>
          <div className="pt-2 border-t border-[var(--border-soft)]">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="action-btn action-btn-danger w-full justify-center"
            >
              <RotateCcw size={12} />
              重置所有数据
            </button>
          </div>

          {showResetConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="glass-panel p-6 max-w-sm w-full mx-4">
                <h3 className="text-red-400 text-sm font-semibold tracking-wide mb-3">重置所有数据</h3>
                <p className="text-[var(--text-secondary)] text-xs mb-6 leading-relaxed">
                  确定要重置所有数据吗？这将清除 API Key、角色卡、对话记录等所有配置，此操作不可撤销。
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="action-btn action-btn-ghost"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => { setShowResetConfirm(false); onReset() }}
                    className="action-btn action-btn-danger"
                  >
                    重置
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
