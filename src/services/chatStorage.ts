import type { ChatMessage } from '../types'

const DB_NAME = 'ai-spirit-realm'
const DB_VERSION = 1
const STORE_NAME = 'messages'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadMessages(): Promise<ChatMessage[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => {
      const messages = request.result as ChatMessage[]
      messages.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
          if (a.role === 'user' && b.role === 'ai') return -1
          if (a.role === 'ai' && b.role === 'user') return 1
          return 0
        }
        const ta = parseInt(a.id.replace(/[^0-9]/g, '').slice(-13)) || 0
        const tb = parseInt(b.id.replace(/[^0-9]/g, '').slice(-13)) || 0
        if (ta && tb) return ta - tb
        return 0
      })
      resolve(messages)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ ...message, isStreaming: false })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveMessages(messages: ChatMessage[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const msg of messages) {
      store.put({ ...msg, isStreaming: false })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearMessages(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
