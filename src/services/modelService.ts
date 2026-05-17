import JSZip from 'jszip'
import { ModelFormat, type DisplayModel, type DisplayModelURL, type DisplayModelFile, type ModelValidationResult } from '../types/model'

const DB_NAME = 'ai-spirit-realm-models'
const DB_VERSION = 1
const STORE_NAME = 'models'
const SELECTED_KEY = 'selected-model-id'

const PRESET_MODELS: DisplayModelURL[] = [
  {
    id: 'preset-hiyori-free',
    type: 'url',
    format: ModelFormat.Live2DDirectory,
    name: 'Hiyori (Free)',
    url: `${import.meta.env.BASE_URL}live2d/hiyori/hiyori_free_t08.model3.json`,
    importedAt: 0,
  },
]

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getAllFromDB(): Promise<DisplayModelFile[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as DisplayModelFile[])
    req.onerror = () => reject(req.error)
  })
}

async function putToDB(model: DisplayModelFile): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(model)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function deleteFromDB(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function loadModels(): Promise<DisplayModel[]> {
  const dbModels = await getAllFromDB()
  const all = [...PRESET_MODELS, ...dbModels]
  all.sort((a, b) => a.importedAt - b.importedAt)
  return all
}

export async function addModelFromZip(file: File): Promise<{ model: DisplayModelFile; validation: ModelValidationResult }> {
  const arrayBuffer = await file.arrayBuffer()
  const validation = await validateLive2DZip(arrayBuffer)

  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const name = file.name.replace(/\.zip$/i, '')

  const model: DisplayModelFile = {
    id,
    type: 'file',
    format: ModelFormat.Live2DZip,
    name,
    fileData: arrayBuffer,
    fileName: file.name,
    importedAt: Date.now(),
  }

  await putToDB(model)
  return { model, validation }
}

export async function addModelFromUrl(url: string, name?: string): Promise<DisplayModel> {
  const id = `url-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const displayName = name || extractModelNameFromUrl(url)

  if (url.endsWith('.zip')) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`无法下载模型: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    const validation = await validateLive2DZip(arrayBuffer)
    if (!validation.valid) throw new Error(validation.errors.join('; '))

    const model: DisplayModelFile = {
      id,
      type: 'file',
      format: ModelFormat.Live2DZip,
      name: displayName,
      fileData: arrayBuffer,
      fileName: displayName + '.zip',
      importedAt: Date.now(),
    }
    await putToDB(model)
    return model
  }

  const model: DisplayModelURL = {
    id,
    type: 'url',
    format: ModelFormat.Live2DDirectory,
    name: displayName,
    url,
    importedAt: Date.now(),
  }

  return model
}

export async function removeModel(id: string): Promise<void> {
  const preset = PRESET_MODELS.find(m => m.id === id)
  if (preset) {
    throw new Error('不能删除预设模型')
  }
  await deleteFromDB(id)
}

export function getSelectedModelId(): string | null {
  return localStorage.getItem(SELECTED_KEY)
}

export function setSelectedModelId(id: string): void {
  localStorage.setItem(SELECTED_KEY, id)
}

export function getPresetModels(): DisplayModelURL[] {
  return [...PRESET_MODELS]
}

export async function validateLive2DZip(data: ArrayBuffer): Promise<ModelValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const zip = await JSZip.loadAsync(data)
    const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir)

    const model3Files = paths.filter(p => p.endsWith('.model3.json'))
    const modelFiles = paths.filter(p => p.endsWith('.model.json'))
    const moc3Files = paths.filter(p => p.endsWith('.moc3'))
    const mocFiles = paths.filter(p => p.endsWith('.moc'))

    if (model3Files.length === 0 && modelFiles.length === 0) {
      if (moc3Files.length === 1) {
        warnings.push('未找到 .model3.json，将使用唯一的 .moc3 文件自动生成配置')
      } else if (moc3Files.length > 1) {
        errors.push('未找到 .model3.json 且有多个 .moc3 文件，无法确定入口')
      } else if (mocFiles.length > 0) {
        errors.push('检测到 Cubism 2 模型 (.moc)，当前仅支持 Cubism 4 (.moc3)')
      } else {
        errors.push('ZIP 中未找到任何 Live2D 模型文件')
      }
    }

    if (model3Files.length > 1) {
      warnings.push(`找到 ${model3Files.length} 个 .model3.json 文件，将使用第一个: ${model3Files[0]}`)
    }

    if (moc3Files.length === 0 && model3Files.length > 0) {
      errors.push('找到 .model3.json 但缺少 .moc3 模型文件')
    }

    const textureFiles = paths.filter(p => p.endsWith('.png') || p.endsWith('.jpg'))
    if (textureFiles.length === 0 && moc3Files.length > 0) {
      errors.push('模型缺少纹理图片文件')
    }

    const totalSize = data.byteLength
    if (totalSize > 100 * 1024 * 1024) {
      errors.push(`模型文件过大 (${(totalSize / 1024 / 1024).toFixed(1)}MB)，可能影响性能`)
    } else if (totalSize > 30 * 1024 * 1024) {
      warnings.push(`模型文件较大 (${(totalSize / 1024 / 1024).toFixed(1)}MB)，加载可能较慢`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      entryPoint: model3Files[0] || undefined,
    }
  } catch (err) {
    return {
      valid: false,
      errors: [`无法解析 ZIP 文件: ${err instanceof Error ? err.message : '未知错误'}`],
      warnings: [],
    }
  }
}

export async function extractZipToBlobUrls(data: ArrayBuffer): Promise<{ modelUrl: string; cleanup: () => void }> {
  const zip = await JSZip.loadAsync(data)
  const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir)

  const model3Files = paths.filter(p => p.endsWith('.model3.json'))
  if (model3Files.length === 0) {
    throw new Error('ZIP 中未找到 .model3.json 文件')
  }

  const entryFile = model3Files[0]
  const entryDir = entryFile.includes('/') ? entryFile.substring(0, entryFile.lastIndexOf('/') + 1) : ''

  const blobUrls: string[] = []
  const fileMap = new Map<string, string>()

  for (const path of paths) {
    const blob = await zip.files[path].async('blob')
    const url = URL.createObjectURL(blob)
    blobUrls.push(url)
    const relativePath = path.startsWith(entryDir) ? path.substring(entryDir.length) : path
    fileMap.set(relativePath, url)
    fileMap.set(path, url)
  }

  const modelUrl = fileMap.get(entryFile) || fileMap.get(entryFile.substring(entryDir.length))!

  const settingsResp = await fetch(modelUrl)
  const settingsText = await settingsResp.text()
  const settings = JSON.parse(settingsText)

  if (settings.FileReferences) {
    const rewriteField = (field: string) => {
      if (settings.FileReferences[field]) {
        const ref = settings.FileReferences[field]
        if (typeof ref === 'string') {
          const mapped = fileMap.get(ref) || fileMap.get(entryDir + ref)
          if (mapped) settings.FileReferences[field] = mapped
        }
      }
    }

    rewriteField('Moc')
    if (settings.FileReferences.Textures) {
      settings.FileReferences.Textures = settings.FileReferences.Textures.map((t: string) => {
        const mapped = fileMap.get(t) || fileMap.get(entryDir + t)
        return mapped || t
      })
    }
    rewriteField('Physics')
    if (settings.FileReferences.Expressions) {
      settings.FileReferences.Expressions = settings.FileReferences.Expressions.map((e: any) => {
        const ref = e.File
        const mapped = fileMap.get(ref) || fileMap.get(entryDir + ref)
        return { ...e, File: mapped || ref }
      })
    }
    if (settings.FileReferences.Motions) {
      for (const [group, motions] of Object.entries(settings.FileReferences.Motions)) {
        settings.FileReferences.Motions[group] = (motions as any[]).map((m: any) => {
          const ref = m.File
          const mapped = fileMap.get(ref) || fileMap.get(entryDir + ref)
          return { ...m, File: mapped || ref }
        })
      }
    }
  }

  const rewrittenBlob = new Blob([JSON.stringify(settings)], { type: 'application/json' })
  const rewrittenUrl = URL.createObjectURL(rewrittenBlob)
  blobUrls.push(rewrittenUrl)

  return {
    modelUrl: rewrittenUrl,
    cleanup: () => blobUrls.forEach(u => URL.revokeObjectURL(u)),
  }
}

function extractModelNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/')
    const last = parts[parts.length - 1]
    return last.replace(/\.(model3\.json|zip)$/i, '') || 'Custom Model'
  } catch {
    return 'Custom Model'
  }
}
