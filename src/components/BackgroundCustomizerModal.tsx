import React, { useState, useEffect, useRef } from 'react';
import {
  backgroundManager,
  BACKGROUND_PRESETS,
  DEFAULT_BG_SETTINGS,
} from '../utils/backgroundManager';
import { useMathVerse } from '../context/MathVerseContext';
import { soundManager } from '../utils/soundEffects';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Film,
  Sparkles,
  Sliders,
  RotateCcw,
  Check,
  X,
  Volume2,
  VolumeX,
  Eye,
  Trash2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BackgroundCustomizerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { theme } = useMathVerse();
  const isLight = theme === 'light';

  const [bgState, setBgState] = useState(() => backgroundManager.getState());
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'settings'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = backgroundManager.subscribe((state) => {
      setBgState({ ...state });
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const { settings, customMedia } = bgState;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);

    try {
      // Validate file size (max 80MB for videos/gifs/images)
      if (file.size > 80 * 1024 * 1024) {
        throw new Error('Tệp quá lớn (tối đa 80MB). Vui lòng chọn tệp nhỏ hơn để đảm bảo tốc độ mượt mà.');
      }

      await backgroundManager.setCustomFile(file);
      soundManager.playCorrectSound();
    } catch (err: any) {
      soundManager.playWrongSound();
      setErrorMsg(err.message || 'Không thể tải tệp lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectPreset = (id: string) => {
    soundManager.playClickSound();
    backgroundManager.setPreset(id);
  };

  const handleReset = () => {
    soundManager.playClickSound();
    backgroundManager.resetToDefault();
  };

  const handleClearCustom = async () => {
    soundManager.playClickSound();
    await backgroundManager.clearCustom();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700/80 text-white'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Tùy biến Hình nền MathVerse</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Tải ảnh, video MP4, ảnh động GIF từ máy hoặc chọn bộ sưu tập không gian
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2 gap-2">
          {[
            { id: 'upload', label: 'Tải từ máy tính', icon: Upload },
            { id: 'presets', label: 'Bộ sưu tập mẫu', icon: Sparkles },
            { id: 'settings', label: 'Điều chỉnh hiển thị', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundManager.playClickSound();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: UPLOAD TỪ MÁY */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Dropzone / Upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,.gif"
                onChange={handleFileUpload}
                className="hidden"
                id="bg-file-upload"
              />
              <label
                htmlFor="bg-file-upload"
                className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isLight
                    ? 'border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80'
                    : 'border-indigo-500/30 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="font-extrabold text-sm sm:text-base mb-1">
                  {isUploading ? 'Đang xử lý tệp...' : 'Bấm để chọn tệp từ máy của bạn'}
                </div>
                <p className={`text-xs max-w-md ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Hỗ trợ đầy đủ: <strong>Hình ảnh</strong> (PNG, JPG, WEBP), <strong>Ảnh động GIF</strong> (.gif), và <strong>Video lặp mượt mà</strong> (MP4, WEBM). Tối đa 80MB.
                </p>
                <span className="mt-3 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm">
                  Chọn tệp từ máy tính
                </span>
              </label>

              {errorMsg && (
                <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Current Active Custom Media Info */}
              {customMedia && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700/50 shrink-0 bg-black flex items-center justify-center">
                      {customMedia.type === 'video' ? (
                        <video src={customMedia.url} muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={customMedia.url} alt="Nền" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm truncate">{customMedia.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          {customMedia.type}
                        </span>
                      </div>
                      <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {settings.mode === 'custom' ? '✅ Đang được áp dụng làm hình nền chính' : 'Đã lưu trong máy'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {settings.mode !== 'custom' && (
                      <button
                        onClick={() => {
                          soundManager.playClickSound();
                          backgroundManager.setCustomFile({} as any).catch(() => {});
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer hover:bg-indigo-500"
                      >
                        Sử dụng
                      </button>
                    )}
                    <button
                      onClick={handleClearCustom}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                      title="Xóa nền này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BACKGROUND_PRESETS.map((preset) => {
                  const isSelected = settings.mode === 'preset' && settings.presetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all group ${
                        isSelected
                          ? 'border-cyan-400 shadow-lg shadow-cyan-500/20'
                          : 'border-transparent hover:border-slate-500'
                      }`}
                    >
                      <div className="h-28 w-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={preset.thumbnailUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {isSelected && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đang dùng
                          </div>
                        )}
                      </div>
                      <div className={`p-3 ${isLight ? 'bg-slate-50' : 'bg-slate-800'}`}>
                        <div className="font-bold text-xs sm:text-sm">{preset.name}</div>
                        <p className={`text-[11px] line-clamp-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {preset.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS & CONTROLS */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Darkness Overlay Slider */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span>Độ tối lớp phủ (Contrast Darkness)</span>
                  <span className="font-mono text-cyan-400">{settings.darkness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={settings.darkness}
                  onChange={(e) => backgroundManager.updateDarkness(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  💡 Giữ mức <strong>40% - 50%</strong> giúp hình nền video/ảnh hiển thị sống động mà công thức toán học và chữ vẫn rõ ràng 100%.
                </p>
              </div>

              {/* Blur Slider */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span>Độ mờ kính (Glass Blur Effect)</span>
                  <span className="font-mono text-indigo-400">{settings.blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="2"
                  value={settings.blur}
                  onChange={(e) => backgroundManager.updateBlur(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Làm mờ nhẹ (4-8px) tạo phong cách Glassmorphism mờ ảo hiện đại.
                </p>
              </div>

              {/* Video Mute Toggle */}
              {customMedia?.type === 'video' && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs sm:text-sm font-bold">Âm thanh Video nền</div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {settings.videoMuted ? 'Đang tắt tiếng (khuyên dùng)' : 'Đang bật tiếng từ video'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      soundManager.playClickSound();
                      backgroundManager.updateVideoMuted(!settings.videoMuted);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      settings.videoMuted
                        ? 'bg-slate-700 border-slate-600 text-slate-300'
                        : 'bg-emerald-600 border-emerald-500 text-white'
                    }`}
                  >
                    {settings.videoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{settings.videoMuted ? 'Đã tắt tiếng' : 'Có tiếng'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục nền mặc định</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClickSound();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md hover:from-cyan-400 hover:to-indigo-500 cursor-pointer"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
