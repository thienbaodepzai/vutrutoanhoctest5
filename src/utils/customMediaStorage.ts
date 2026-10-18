// IndexedDB persistent storage for User Custom Audio Tracks and Custom Background Media (Images, GIFs, Videos)

const DB_NAME = 'mathverse_media_db_v1';
const DB_VERSION = 1;
const STORE_AUDIO = 'custom_audio_tracks';
const STORE_BG = 'custom_background';

export interface StoredAudioTrack {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  type: string;
  addedAt: string;
  duration?: number;
}

export interface StoredBackgroundMedia {
  id: string; // 'current_bg'
  mediaType: 'image' | 'video' | 'gif';
  name: string;
  blob: Blob;
  size: number;
  opacity: number; // 0.1 to 1.0
  blur: number; // 0 to 20px
  updatedAt: string;
}

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BG)) {
        db.createObjectStore(STORE_BG, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ----------------- AUDIO STORAGE METHODS -----------------

export async function saveCustomAudioTrack(file: File): Promise<StoredAudioTrack> {
  const db = await openMediaDB();
  const id = `track_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

  const record: StoredAudioTrack = {
    id,
    name: cleanName,
    blob: file,
    size: file.size,
    type: file.type || 'audio/mpeg',
    addedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, 'readwrite');
    const store = tx.objectStore(STORE_AUDIO);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCustomAudioTracks(): Promise<StoredAudioTrack[]> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUDIO, 'readonly');
      const store = tx.objectStore(STORE_AUDIO);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteCustomAudioTrack(id: string): Promise<boolean> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      const store = tx.objectStore(STORE_AUDIO);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ----------------- BACKGROUND STORAGE METHODS -----------------

export async function saveCustomBackgroundMedia(
  file: File,
  options?: { opacity?: number; blur?: number }
): Promise<StoredBackgroundMedia> {
  const db = await openMediaDB();
  let mediaType: 'image' | 'video' | 'gif' = 'image';

  if (file.type.startsWith('video/')) {
    mediaType = 'video';
  } else if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
    mediaType = 'gif';
  }

  const record: StoredBackgroundMedia = {
    id: 'current_bg',
    mediaType,
    name: file.name,
    blob: file,
    size: file.size,
    opacity: options?.opacity !== undefined ? options.opacity : 0.55,
    blur: options?.blur !== undefined ? options.blur : 0,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BG, 'readwrite');
    const store = tx.objectStore(STORE_BG);
    const req = store.put(record);

    req.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mathverse_bg_updated'));
      }
      resolve(record);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateCustomBackgroundSettings(settings: {
  opacity?: number;
  blur?: number;
}): Promise<StoredBackgroundMedia | null> {
  const current = await getCustomBackgroundMedia();
  if (!current) return null;

  const db = await openMediaDB();
  const updated: StoredBackgroundMedia = {
    ...current,
    opacity: settings.opacity !== undefined ? settings.opacity : current.opacity,
    blur: settings.blur !== undefined ? settings.blur : current.blur,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_BG, 'readwrite');
    const store = tx.objectStore(STORE_BG);
    const req = store.put(updated);

    req.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mathverse_bg_updated'));
      }
      resolve(updated);
    };
    req.onerror = () => resolve(null);
  });
}

export async function getCustomBackgroundMedia(): Promise<StoredBackgroundMedia | null> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BG, 'readonly');
      const store = tx.objectStore(STORE_BG);
      const req = store.get('current_bg');

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function removeCustomBackgroundMedia(): Promise<boolean> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BG, 'readwrite');
      const store = tx.objectStore(STORE_BG);
      const req = store.delete('current_bg');

      req.onsuccess = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mathverse_bg_updated'));
        }
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
