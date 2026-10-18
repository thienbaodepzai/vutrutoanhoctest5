// Background Manager for MathVerse
// Supports Custom Uploads (Images, Animated GIFs, Looping MP4/WebM Videos)
// and Built-in Stunning Thematic Animated Presets with Darkness and Blur Controls.

import {
  saveCustomBackground,
  loadCustomBackground,
  clearCustomBackground,
} from './mediaStorage';

export interface BackgroundPreset {
  id: string;
  name: string;
  description: string;
  category: 'space' | 'cyber' | 'relax' | 'math';
  previewColor: string;
  thumbnailUrl: string;
  videoUrl?: string;
  cssStyle?: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'galaxy',
    name: 'Vũ trụ Tinh vân (Cosmic Nebula)',
    description: 'Hàng triệu vì sao phát sáng cùng tinh vân huyền ảo trong không gian sâu thẳm',
    category: 'space',
    previewColor: 'from-indigo-950 via-purple-950 to-slate-950',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'cyber',
    name: 'Lưới Không gian Neon (Cyberpunk Grid)',
    description: 'Đường chân trời viễn tưởng với lưới tọa độ số học phát sáng',
    category: 'cyber',
    previewColor: 'from-fuchsia-950 via-indigo-950 to-cyan-950',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'aurora',
    name: 'Cực quang Huyền ảo (Aurora Sky)',
    description: 'Ánh sáng cực quang xanh ngọc bích uốn lượn dưới bầu trời đêm yên bình',
    category: 'relax',
    previewColor: 'from-emerald-950 via-teal-950 to-slate-950',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'lofi',
    name: 'Góc học tập Mưa rơi (Lo-Fi Study)',
    description: 'Cửa sổ nhìn ra trời mưa đêm tĩnh lặng, tạo không gian tập trung tuyệt đối',
    category: 'relax',
    previewColor: 'from-slate-950 via-blue-950 to-zinc-950',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'geometry',
    name: 'Bản vẽ Hình học Vàng (Golden Blueprint)',
    description: 'Các vòng tròn tỷ lệ vàng và đường phân giác toán học tinh xảo',
    category: 'math',
    previewColor: 'from-amber-950 via-stone-950 to-black',
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop',
  },
];

export interface BackgroundSettings {
  mode: 'default' | 'preset' | 'custom';
  presetId?: string;
  darkness: number; // 0 to 90% (overlay opacity)
  blur: number; // 0 to 20px
  videoMuted: boolean;
  videoSpeed: number;
}

const SETTINGS_KEY = 'mathverse_bg_settings_v1';
const BG_CHANGED_EVENT = 'mathverse_bg_changed';

export const DEFAULT_BG_SETTINGS: BackgroundSettings = {
  mode: 'default',
  presetId: 'galaxy',
  darkness: 45, // 45% darkness ensures optimal reading contrast for formulas
  blur: 0,
  videoMuted: true,
  videoSpeed: 1,
};

export interface CustomMedia {
  id: string;
  name: string;
  type: 'image' | 'gif' | 'video';
  mimeType: string;
  url: string;
}

export class BackgroundManager {
  private static instance: BackgroundManager;
  private settings: BackgroundSettings;
  private customMedia: CustomMedia | null = null;
  private listeners: ((state: {
    settings: BackgroundSettings;
    customMedia: CustomMedia | null;
  }) => void)[] = [];

  private constructor() {
    this.settings = this.loadSettings();
    this.initCustomMedia();
  }

  public static getInstance(): BackgroundManager {
    if (!BackgroundManager.instance) {
      BackgroundManager.instance = new BackgroundManager();
    }
    return BackgroundManager.instance;
  }

  private loadSettings(): BackgroundSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_BG_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_BG_SETTINGS;
  }

  private saveSettings(next: BackgroundSettings) {
    this.settings = next;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {}
    this.notify();
  }

  private async initCustomMedia() {
    try {
      const loaded = await loadCustomBackground();
      if (loaded) {
        this.customMedia = loaded;
        this.notify();
      }
    } catch (err) {
      console.warn('[BackgroundManager] Error initializing custom background:', err);
    }
  }

  public subscribe(
    cb: (state: {
      settings: BackgroundSettings;
      customMedia: CustomMedia | null;
    }) => void
  ): () => void {
    this.listeners.push(cb);
    cb({ settings: this.settings, customMedia: this.customMedia });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const payload = { settings: this.settings, customMedia: this.customMedia };
    this.listeners.forEach((cb) => cb(payload));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BG_CHANGED_EVENT, { detail: payload }));
    }
  }

  public getState() {
    return {
      settings: this.settings,
      customMedia: this.customMedia,
    };
  }

  public async setCustomFile(file: File) {
    const uploaded = await saveCustomBackground(file);
    this.customMedia = uploaded;
    this.saveSettings({
      ...this.settings,
      mode: 'custom',
    });
  }

  public setPreset(presetId: string) {
    this.saveSettings({
      ...this.settings,
      mode: 'preset',
      presetId,
    });
  }

  public resetToDefault() {
    this.saveSettings({
      ...this.settings,
      mode: 'default',
    });
  }

  public async clearCustom() {
    await clearCustomBackground();
    this.customMedia = null;
    this.saveSettings({
      ...this.settings,
      mode: 'default',
    });
  }

  public updateDarkness(darkness: number) {
    this.saveSettings({
      ...this.settings,
      darkness: Math.max(0, Math.min(90, darkness)),
    });
  }

  public updateBlur(blur: number) {
    this.saveSettings({
      ...this.settings,
      blur: Math.max(0, Math.min(24, blur)),
    });
  }

  public updateVideoMuted(muted: boolean) {
    this.saveSettings({
      ...this.settings,
      videoMuted: muted,
    });
  }
}

export const backgroundManager = BackgroundManager.getInstance();
