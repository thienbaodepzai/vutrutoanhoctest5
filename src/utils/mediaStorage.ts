// MathVerse Media IndexedDB Storage Engine
// Supports persistent storage of custom audio tracks (mp3, wav, m4a, flac)
// and custom dynamic backgrounds (images, gifs, mp4/webm videos).

const DB_NAME = 'MathVerse_Media_v1';
const DB_VERSION = 1;
const BG_STORE = 'backgrounds';
const AUDIO_STORE = 'audio_tracks';

export interface StoredBackground {
  id: string; // 'active_custom_bg'
  name: string;
  type: 'image' | 'gif' | 'video';
  mimeType: string;
  blob: Blob;
  updatedAt: number;
}

export interface StoredAudioTrack {
  id: string;
  name: string;
  size: number;
  duration?: number;
  mimeType: string;
  blob: Blob;
  addedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB không được hỗ trợ trên trình duyệt này'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BG_STORE)) {
        db.createObjectStore(BG_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Không thể mở cơ sở dữ liệu IndexedDB'));
    };
  });

  return dbPromise;
}

// ================= BACKGROUND STORAGE =================

export async function saveCustomBackground(file: File): Promise<{
  id: string;
  name: string;
  type: 'image' | 'gif' | 'video';
  mimeType: string;
  url: string;
}> {
  const mimeType = file.type.toLowerCase();
  let type: 'image' | 'gif' | 'video' = 'image';

  if (mimeType.includes('gif')) {
    type = 'gif';
  } else if (mimeType.includes('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm')) {
    type = 'video';
  }

  const record: StoredBackground = {
    id: 'active_custom_bg',
    name: file.name,
    type,
    mimeType: mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
    blob: file,
    updatedAt: Date.now(),
  };

  const db = await getDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BG_STORE, 'readwrite');
    const store = tx.objectStore(BG_STORE);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  const url = URL.createObjectURL(file);
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    mimeType: record.mimeType,
    url,
  };
}

export async function loadCustomBackground(): Promise<{
  id: string;
  name: string;
  type: 'image' | 'gif' | 'video';
  mimeType: string;
  url: string;
} | null> {
  try {
    const db = await getDb();
    const record = await new Promise<StoredBackground | undefined>((resolve, reject) => {
      const tx = db.transaction(BG_STORE, 'readonly');
      const store = tx.objectStore(BG_STORE);
      const req = store.get('active_custom_bg');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!record || !record.blob) return null;
    const url = URL.createObjectURL(record.blob);
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      mimeType: record.mimeType,
      url,
    };
  } catch (err) {
    console.warn('[MediaStorage] Failed to load custom background:', err);
    return null;
  }
}

export async function clearCustomBackground(): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BG_STORE, 'readwrite');
      const store = tx.objectStore(BG_STORE);
      const req = store.delete('active_custom_bg');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[MediaStorage] Failed to clear custom background:', err);
  }
}

// ================= CUSTOM AUDIO STORAGE =================

export async function saveCustomAudioTrack(file: File): Promise<{
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
}> {
  const id = `track_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

  const record: StoredAudioTrack = {
    id,
    name: cleanName || 'Bài hát không tên',
    size: file.size,
    mimeType: file.type || 'audio/mpeg',
    blob: file,
    addedAt: Date.now(),
  };

  const db = await getDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  const url = URL.createObjectURL(file);
  return {
    id,
    name: record.name,
    size: record.size,
    mimeType: record.mimeType,
    url,
  };
}

export async function loadAllCustomAudioTracks(): Promise<
  Array<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    url: string;
    addedAt: number;
  }>
> {
  try {
    const db = await getDb();
    const records = await new Promise<StoredAudioTrack[]>((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    return records.map((r) => ({
      id: r.id,
      name: r.name,
      size: r.size,
      mimeType: r.mimeType,
      url: URL.createObjectURL(r.blob),
      addedAt: r.addedAt,
    }));
  } catch (err) {
    console.warn('[MediaStorage] Failed to load audio tracks:', err);
    return [];
  }
}

export async function deleteCustomAudioTrack(id: string): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, 'readwrite');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[MediaStorage] Failed to delete audio track:', err);
  }
}
