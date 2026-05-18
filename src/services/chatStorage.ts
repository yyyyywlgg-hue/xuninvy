import type { ChatMessage } from '../types'

const DB_NAME = 'ai-spirit-realm'
const DB_VERSION = 1
const STORE_NAME = 'messages'
const MAX_MESSAGES = 200

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
      db.close()
      resolve(messages)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ ...message, isStreaming: false })
    tx.oncomplete = () => {
      pruneMessages(db)
      resolve()
    }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function pruneMessages(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const countReq = store.count()
    countReq.onsuccess = () => {
      if (countReq.result <= MAX_MESSAGES) {
        db.close()
        resolve()
        return
      }
      const getAllReq = store.getAll()
      getAllReq.onsuccess = () => {
        const all = getAllReq.result as ChatMessage[]
        all.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        const toDelete = all.slice(0, all.length - MAX_MESSAGES)
        const pruneTx = db.transaction(STORE_NAME, 'readwrite')
        const pruneStore = pruneTx.objectStore(STORE_NAME)
        for (const msg of toDelete) {
          pruneStore.delete(msg.id)
        }
        pruneTx.oncomplete = () => { db.close(); resolve() }
        pruneTx.onerror = () => { db.close(); resolve() }
      }
    }
    countReq.onerror = () => { db.close(); resolve() }
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
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function clearMessages(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}
