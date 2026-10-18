export interface UploadedMediaItem {
  dataUrl: string;
  mimeType: string;
  data: string; // base64 payload without prefix
  name: string;
  mediaType: 'image' | 'gif' | 'video';
  size: number;
}

const CUSTOM_AVATAR_STORAGE_KEY = 'mathverse_custom_avatar_map_v1';
const IDB_NAME = 'mathverse_media_db_v1';
const IDB_STORE = 'custom_avatars';

// In-memory cache so synchronous lookups work immediately during the session
const memoryAvatarCache = new Map<string, string>();

function openMediaDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSetAvatar(key: string, value: string): Promise<void> {
  const db = await openMediaDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      if (value) {
        store.put(value, key);
      } else {
        store.delete(key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbGetAvatar(key: string): Promise<string | null> {
  const db = await openMediaDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result;
        resolve(typeof res === 'string' && res ? res : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Kiểm tra xem chuỗi avatar có phải là URL hoặc Data URL của ảnh/GIF/video không
 */
export function isMediaAvatar(avatar?: string | null): boolean {
  if (!avatar || typeof avatar !== 'string') return false;
  const trimmed = avatar.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('data:video/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
}

/**
 * Kiểm tra xem chuỗi media có phải là video không
 */
export function isVideoMedia(urlOrMime?: string | null): boolean {
  if (!urlOrMime || typeof urlOrMime !== 'string') return false;
  const lower = urlOrMime.trim().toLowerCase();
  return (
    lower.startsWith('data:video/') ||
    lower.startsWith('video/') ||
    /\.(mp4|webm|mov|ogg)(\?.*)?$/.test(lower)
  );
}

/**
 * Kiểm tra xem chuỗi media có phải là ảnh động GIF không
 */
export function isGifMedia(urlOrMime?: string | null): boolean {
  if (!urlOrMime || typeof urlOrMime !== 'string') return false;
  const lower = urlOrMime.trim().toLowerCase();
  return (
    lower.startsWith('data:image/gif') ||
    lower === 'image/gif' ||
    /\.gif(\?.*)?$/.test(lower)
  );
}

/**
 * Lưu avatar tùy chỉnh (ảnh, GIF, video) vào bộ nhớ đệm + IndexedDB (không giới hạn 5MB)
 * và chỉ lưu vào localStorage nếu kích thước nhỏ (< 200KB) để không bao giờ gây lỗi QuotaExceededError.
 */
export function saveCustomAvatarLocally(userKey: string | null | undefined, dataUrl: string): void {
  const key = (userKey || 'default').trim().toLowerCase();
  if (dataUrl) {
    memoryAvatarCache.set(key, dataUrl);
    memoryAvatarCache.set('latest', dataUrl);
  } else {
    memoryAvatarCache.delete(key);
  }

  // Lưu vào IndexedDB (hỗ trợ tệp GIF/Video lớn hàng chục MB)
  void idbSetAvatar(key, dataUrl);
  if (dataUrl) {
    void idbSetAvatar('latest', dataUrl);
  }

  // Chỉ lưu vào localStorage nếu chuỗi nhỏ hơn 200KB
  try {
    const raw = localStorage.getItem(CUSTOM_AVATAR_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (!dataUrl) {
      delete map[key];
      localStorage.setItem(CUSTOM_AVATAR_STORAGE_KEY, JSON.stringify(map));
    } else if (dataUrl.length <= 200 * 1024) {
      map[key] = dataUrl;
      map['latest'] = dataUrl;
      localStorage.setItem(CUSTOM_AVATAR_STORAGE_KEY, JSON.stringify(map));
    } else {
      // Nếu là GIF/Video lớn > 200KB, xóa bản cũ trong localStorage để giải phóng bộ nhớ (đã có IndexedDB lưu trữ)
      delete map[key];
      delete map['latest'];
      localStorage.setItem(CUSTOM_AVATAR_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Nếu localStorage đầy, xóa bớt key map để tránh lỗi QuotaExceededError
    try {
      localStorage.removeItem(CUSTOM_AVATAR_STORAGE_KEY);
    } catch {}
  }
}

/**
 * Đọc nhanh avatar tùy chỉnh từ bộ nhớ đệm hoặc localStorage
 */
export function getCustomAvatarLocally(userKey?: string | null): string | null {
  const key = (userKey || 'default').trim().toLowerCase();
  const fromMem = memoryAvatarCache.get(key) || memoryAvatarCache.get('latest');
  if (fromMem) return fromMem;

  try {
    const raw = localStorage.getItem(CUSTOM_AVATAR_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const found = map[key] || map['latest'] || null;
    if (found) {
      memoryAvatarCache.set(key, found);
    }
    return found;
  } catch {
    return null;
  }
}

/**
 * Đọc bất đồng bộ avatar tùy chỉnh (bao gồm cả GIF/Video dung lượng lớn trong IndexedDB)
 */
export async function loadCustomAvatarAsync(userKey?: string | null): Promise<string | null> {
  const syncFound = getCustomAvatarLocally(userKey);
  if (syncFound) return syncFound;

  const key = (userKey || 'default').trim().toLowerCase();
  const fromIdb = (await idbGetAvatar(key)) || (await idbGetAvatar('latest'));
  if (fromIdb) {
    memoryAvatarCache.set(key, fromIdb);
    memoryAvatarCache.set('latest', fromIdb);
    return fromIdb;
  }
  return null;
}

/**
 * Xử lý tệp người dùng chọn từ máy (hỗ trợ Ảnh tĩnh, GIF động và Video)
 */
export async function processMediaFileFromDevice(
  file: File,
  options?: { maxImageDimension?: number; maxFileSizeMB?: number }
): Promise<UploadedMediaItem> {
  const maxMB = options?.maxFileSizeMB ?? 15;
  const maxBytes = maxMB * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(`Kích thước tệp quá lớn (tối đa ${maxMB}MB). Vui lòng chọn ảnh, GIF hoặc video nhỏ hơn.`);
  }

  const mime = file.type || '';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const isGif = mime === 'image/gif' || ext === 'gif';
  const isVideo =
    mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'ogg', 'm4v'].includes(ext);
  const isImage =
    !isGif &&
    !isVideo &&
    (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'svg'].includes(ext));

  if (!isGif && !isVideo && !isImage) {
    throw new Error('Định dạng tệp không hỗ trợ. Vui lòng chọn Ảnh (PNG, JPG, WebP), ảnh động GIF hoặc Video (MP4, WebM, MOV).');
  }

  // Với GIF hoặc Video: giữ nguyên dữ liệu gốc để không làm mất hiệu ứng chuyển động
  if (isGif || isVideo) {
    const dataUrl = await readFileAsDataUrl(file);
    const commaIdx = dataUrl.indexOf(',');
    const base64Data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : '';
    const resolvedMime =
      mime || (isGif ? 'image/gif' : ext === 'webm' ? 'video/webm' : 'video/mp4');

    return {
      dataUrl,
      mimeType: resolvedMime,
      data: base64Data,
      name: file.name || (isGif ? 'animation.gif' : 'video.mp4'),
      mediaType: isGif ? 'gif' : 'video',
      size: file.size,
    };
  }

  // Với ảnh tĩnh: tối ưu kích thước để lưu trữ mượt mà
  const maxDim = options?.maxImageDimension ?? 720;
  const optimizedDataUrl = await resizeImageFile(file, maxDim);
  const commaIdx = optimizedDataUrl.indexOf(',');
  const base64Data = commaIdx >= 0 ? optimizedDataUrl.slice(commaIdx + 1) : '';
  const headerMatch = optimizedDataUrl.match(/^data:([^;]+);/);
  const resolvedMime = headerMatch ? headerMatch[1] : file.type || 'image/jpeg';

  return {
    dataUrl: optimizedDataUrl,
    mimeType: resolvedMime,
    data: base64Data,
    name: file.name || 'image.jpg',
    mediaType: 'image',
    size: file.size,
  };
}

export const readMediaFile = processMediaFileFromDevice;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc tệp từ thiết bị.'));
    reader.readAsDataURL(file);
  });
}

function resizeImageFile(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const originalDataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size <= 180 * 1024) {
          resolve(originalDataUrl);
          return;
        }
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(originalDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outMime, 0.82));
      };
      img.onerror = () => resolve(originalDataUrl);
      img.src = originalDataUrl;
    };
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Tải ảnh, GIF hoặc video về máy người dùng
 */
export function downloadMediaToDevice(dataUrl: string, suggestedName?: string): void {
  if (!dataUrl) return;
  try {
    let ext = 'png';
    if (isVideoMedia(dataUrl)) {
      ext = dataUrl.includes('webm') ? 'webm' : 'mp4';
    } else if (isGifMedia(dataUrl)) {
      ext = 'gif';
    } else if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) {
      ext = 'jpg';
    } else if (dataUrl.includes('image/webp')) {
      ext = 'webp';
    }

    const cleanName =
      suggestedName && suggestedName.includes('.')
        ? suggestedName
        : `${suggestedName || `mathverse-media-${Date.now()}`}.${ext}`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Lỗi khi tải tệp về máy:', e);
  }
}
