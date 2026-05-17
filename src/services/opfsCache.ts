const CACHE_DIR = 'live2d-models'
const META_FILE = '__meta.json'

interface CacheMeta {
  sourceUrl: string
  timestamp: number
  files: string[]
}

async function getOPFSRoot(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!navigator.storage?.getDirectory) return null
    const root = await navigator.storage.getDirectory()
    return await root.getDirectoryHandle(CACHE_DIR, { create: true })
  } catch {
    return null
  }
}

async function readDirectoryRecursive(
  dir: FileSystemDirectoryHandle,
  prefix: string = ''
): Promise<Map<string, FileSystemFileHandle>> {
  const files = new Map<string, FileSystemFileHandle>()
  for await (const [name, handle] of dir.entries()) {
    const path = prefix ? `${prefix}/${name}` : name
    if (handle.kind === 'directory') {
      const subFiles = await readDirectoryRecursive(handle as FileSystemDirectoryHandle, path)
      for (const [subPath, subHandle] of subFiles) {
        files.set(subPath, subHandle)
      }
    } else {
      files.set(path, handle as FileSystemFileHandle)
    }
  }
  return files
}

async function readMeta(cacheDir: FileSystemDirectoryHandle): Promise<CacheMeta | null> {
  try {
    const handle = await cacheDir.getFileHandle(META_FILE)
    const file = await handle.getFile()
    const text = await file.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function writeMeta(cacheDir: FileSystemDirectoryHandle, meta: CacheMeta) {
  const handle = await cacheDir.getFileHandle(META_FILE, { create: true })
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(meta))
  await writable.close()
}

async function clearCacheDir(cacheDir: FileSystemDirectoryHandle) {
  const entries: [string, FileSystemHandle][] = []
  for await (const [name, handle] of cacheDir.entries()) {
    entries.push([name, handle])
  }
  for (const [name, handle] of entries) {
    if (handle.kind === 'directory') {
      await cacheDir.removeEntry(name, { recursive: true })
    } else {
      await cacheDir.removeEntry(name)
    }
  }
}

function urlToCacheKey(url: string): string {
  let key = url.replace(/^https?:\/\//, '').replace(/[/?#]/g, '_')
  if (key.length > 100) {
    key = key.substring(0, 100) + '_' + hashCode(url)
  }
  return key
}

function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export async function getCachedModelUrl(sourceUrl: string): Promise<string | null> {
  const cacheDir = await getOPFSRoot()
  if (!cacheDir) return null

  try {
    const cacheKey = urlToCacheKey(sourceUrl)
    const modelDir = await cacheDir.getDirectoryHandle(cacheKey)
    const meta = await readMeta(modelDir)

    if (!meta || meta.sourceUrl !== sourceUrl) return null

    const model3File = meta.files.find(f => f.endsWith('model3.json') || f.endsWith('model.json'))
    if (!model3File) return null

    const fileHandle = await modelDir.getFileHandle(model3File)
    const file = await fileHandle.getFile()
    const blob = new Blob([await file.arrayBuffer()], { type: 'application/json' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export async function cacheModelFromUrl(sourceUrl: string): Promise<boolean> {
  const cacheDir = await getOPFSRoot()
  if (!cacheDir) return false

  try {
    const cacheKey = urlToCacheKey(sourceUrl)

    const response = await fetch(sourceUrl)
    if (!response.ok) return false

    const modelJson = await response.json()
    const baseUrl = sourceUrl.substring(0, sourceUrl.lastIndexOf('/') + 1)

    const filesToCache: string[] = []
    const modelFileName = sourceUrl.substring(sourceUrl.lastIndexOf('/') + 1)
    filesToCache.push(modelFileName)

    if (modelJson.FileReferences) {
      const refs = modelJson.FileReferences
      if (refs.Moc) filesToCache.push(refs.Moc)
      if (refs.Physics) filesToCache.push(refs.Physics)
      if (refs.Pose) filesToCache.push(refs.Pose)
      if (refs.Textures) {
        for (const tex of refs.Textures) filesToCache.push(tex)
      }
      if (refs.Expressions) {
        for (const exp of refs.Expressions) {
          if (exp.File) filesToCache.push(exp.File)
        }
      }
      if (refs.Motions) {
        for (const group of Object.values(refs.Motions)) {
          for (const motion of (group as any[])) {
            if (motion.File) filesToCache.push(motion.File)
            if (motion.Sound) filesToCache.push(motion.Sound)
          }
        }
      }
    }

    let modelDir: FileSystemDirectoryHandle
    try {
      modelDir = await cacheDir.getDirectoryHandle(cacheKey)
      await clearCacheDir(modelDir)
    } catch {
      modelDir = await cacheDir.getDirectoryHandle(cacheKey, { create: true })
    }

    for (const filePath of filesToCache) {
      try {
        const fileUrl = baseUrl + filePath
        const fileResponse = await fetch(fileUrl)
        if (!fileResponse.ok) continue

        const arrayBuffer = await fileResponse.arrayBuffer()

        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
        let targetDir = modelDir
        if (dirPath) {
          const parts = dirPath.split('/')
          for (const part of parts) {
            targetDir = await targetDir.getDirectoryHandle(part, { create: true })
          }
        }

        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
        const fileHandle = await targetDir.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(arrayBuffer)
        await writable.close()
      } catch (err) {
        console.warn(`[OPFS] Failed to cache file ${filePath}:`, err)
      }
    }

    await writeMeta(modelDir, {
      sourceUrl,
      timestamp: Date.now(),
      files: filesToCache,
    })

    return true
  } catch (err) {
    console.warn('[OPFS] Failed to cache model:', err)
    return false
  }
}

export async function isModelCached(sourceUrl: string): Promise<boolean> {
  const cacheDir = await getOPFSRoot()
  if (!cacheDir) return false

  try {
    const cacheKey = urlToCacheKey(sourceUrl)
    const modelDir = await cacheDir.getDirectoryHandle(cacheKey)
    const meta = await readMeta(modelDir)
    return meta?.sourceUrl === sourceUrl
  } catch {
    return false
  }
}
