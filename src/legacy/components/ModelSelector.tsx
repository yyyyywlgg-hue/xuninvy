import { useState, useRef, useCallback } from 'react'
import { Upload, Link, Trash2, User, Package, Check, AlertTriangle, X } from 'lucide-react'
import type { DisplayModel } from '../types/model'
import { ModelFormat } from '../types/model'
import { addModelFromZip, addModelFromUrl, removeModel, validateLive2DZip } from '../services/modelService'

interface Props {
  models: DisplayModel[]
  selectedId: string
  onSelect: (id: string) => void
  onModelsChanged: () => void
}

export default function ModelSelector({ models, selectedId, onSelect, onModelsChanged }: Props) {
  const [importMode, setImportMode] = useState<'none' | 'zip' | 'url'>('none')
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationResult, setValidationResult] = useState<{
    warnings: string[]
    modelData?: ArrayBuffer
    fileName?: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setLoading(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const validation = await validateLive2DZip(arrayBuffer)

      if (!validation.valid) {
        setError(validation.errors.join('\n'))
        setLoading(false)
        return
      }

      if (validation.warnings.length > 0) {
        setValidationResult({
          warnings: validation.warnings,
          modelData: arrayBuffer,
          fileName: file.name,
        })
        setLoading(false)
        return
      }

      const fileObj = new File([arrayBuffer], file.name, { type: 'application/zip' })
      await addModelFromZip(fileObj)
      onModelsChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [onModelsChanged])

  const confirmImportWithWarnings = useCallback(async () => {
    if (!validationResult?.modelData) return
    setLoading(true)
    try {
      const fileObj = new File(
        [validationResult.modelData],
        validationResult.fileName || 'model.zip',
        { type: 'application/zip' }
      )
      await addModelFromZip(fileObj)
      setValidationResult(null)
      onModelsChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setLoading(false)
    }
  }, [validationResult, onModelsChanged])

  const handleUrlImport = useCallback(async () => {
    if (!urlInput.trim()) return
    setError('')
    setLoading(true)

    try {
      const model = await addModelFromUrl(urlInput.trim(), urlName.trim() || undefined)
      onSelect(model.id)
      setImportMode('none')
      setUrlInput('')
      setUrlName('')
      onModelsChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setLoading(false)
    }
  }, [urlInput, urlName, onSelect, onModelsChanged])

  const handleDelete = useCallback(async (model: DisplayModel) => {
    if (model.id.startsWith('preset-')) return
    try {
      await removeModel(model.id)
      if (selectedId === model.id) {
        onSelect('preset-hiyori-free')
      }
      onModelsChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }, [selectedId, onSelect, onModelsChanged])

  const formatLabel = (format: ModelFormat) => {
    switch (format) {
      case ModelFormat.Live2DDirectory: return 'Live2D'
      case ModelFormat.Live2DZip: return 'Live2D ZIP'
      default: return format
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="cyber-label">虚拟形象</label>
        <div className="flex gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1 text-[10px] px-2 py-1 border border-[var(--cyber-cyan)]/30 text-[var(--cyber-cyan)]/60 hover:text-[var(--cyber-cyan)] hover:border-[var(--cyber-cyan)]/50 transition-all font-mono tracking-wider"
          >
            <Upload size={10} />
            上传ZIP
          </button>
          <button
            onClick={() => setImportMode(importMode === 'url' ? 'none' : 'url')}
            disabled={loading}
            className="flex items-center gap-1 text-[10px] px-2 py-1 border border-[var(--cyber-cyan)]/30 text-[var(--cyber-cyan)]/60 hover:text-[var(--cyber-cyan)] hover:border-[var(--cyber-cyan)]/50 transition-all font-mono tracking-wider"
          >
            <Link size={10} />
            URL导入
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileSelect}
        className="hidden"
      />

      {importMode === 'url' && (
        <div className="cyber-section p-3 space-y-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="输入 model3.json 或 ZIP 的 URL"
            className="cyber-input-field w-full px-3 py-1.5 text-xs"
          />
          <input
            type="text"
            value={urlName}
            onChange={(e) => setUrlName(e.target.value)}
            placeholder="模型名称（可选）"
            className="cyber-input-field w-full px-3 py-1.5 text-xs"
          />
          <button
            onClick={handleUrlImport}
            disabled={loading || !urlInput.trim()}
            className="w-full py-1.5 bg-[var(--cyber-purple)]/50 text-white text-xs hover:bg-[var(--cyber-purple)]/70 transition-colors disabled:opacity-50 font-mono tracking-wider"
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
          >
            {loading ? '导入中...' : '导入'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-2.5 bg-[var(--cyber-red)]/10 border border-[var(--cyber-red)]/20 text-[11px] text-[var(--cyber-red)]/80 whitespace-pre-wrap">
          {error}
          <button onClick={() => setError('')} className="float-right text-[var(--cyber-red)]/60 hover:text-[var(--cyber-red)]">
            <X size={12} />
          </button>
        </div>
      )}

      {validationResult && (
        <div className="p-2.5 bg-[var(--cyber-yellow)]/10 border border-[var(--cyber-yellow)]/20 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--cyber-yellow)]">
            <AlertTriangle size={12} />
            <span>发现 {validationResult.warnings.length} 个警告</span>
          </div>
          {validationResult.warnings.map((w, i) => (
            <div key={i} className="text-[10px] text-[var(--cyber-yellow)]/70 pl-4">{w}</div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={confirmImportWithWarnings}
              disabled={loading}
              className="flex-1 py-1.5 bg-[var(--cyber-yellow)]/30 text-[var(--cyber-yellow)] text-xs hover:bg-[var(--cyber-yellow)]/50 transition-colors disabled:opacity-50 font-mono tracking-wider"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              仍然导入
            </button>
            <button
              onClick={() => setValidationResult(null)}
              className="flex-1 py-1.5 bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors font-mono tracking-wider"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {models.map((model) => {
          const isSelected = model.id === selectedId
          const isPreset = model.id.startsWith('preset-')

          return (
            <button
              key={model.id}
              onClick={() => onSelect(model.id)}
              className={`relative p-3 border text-left transition-all group ${
                isSelected
                  ? 'cyber-section bg-[var(--cyber-purple)]/15 border-[var(--cyber-purple)]/30'
                  : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'
              }`}
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[var(--cyber-purple)] flex items-center justify-center" style={{ clipPath: 'polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px)' }}>
                  <Check size={10} className="text-white" />
                </div>
              )}

              <div className={`w-8 h-8 flex items-center justify-center mb-2 ${
                isSelected ? 'bg-[var(--cyber-purple)]/20' : 'bg-white/5'
              }`}>
                {model.format === ModelFormat.Live2DDirectory || model.format === ModelFormat.Live2DZip ? (
                  <User size={16} className={isSelected ? 'text-violet-300' : 'text-white/40'} />
                ) : (
                  <Package size={16} className={isSelected ? 'text-violet-300' : 'text-white/40'} />
                )}
              </div>

              <div className={`text-xs font-medium truncate ${isSelected ? 'text-violet-200' : 'text-white/70'}`}>
                {model.name}
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="cyber-tag bg-white/5 text-white/30">
                  {formatLabel(model.format)}
                </span>

                {!isPreset && !isSelected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(model) }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-white/20 hover:text-[var(--cyber-red)] transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-2">
          <div className="w-4 h-4 border-2 border-[var(--cyber-purple)]/30 border-t-[var(--cyber-purple)] rounded-full animate-spin" />
          <span className="ml-2 text-xs text-white/40">处理中...</span>
        </div>
      )}
    </div>
  )
}
