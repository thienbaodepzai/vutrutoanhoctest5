import React, { useState, useEffect } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import { Grade } from '../types/mathverse';
import {
  Settings,
  Volume2,
  VolumeX,
  User,
  RotateCcw,
  LogOut,
  Save,
  Check,
  AlertTriangle,
  Music,
  Headphones,
  Sparkles,
  Lock,
  Bot,
  ThumbsDown,
  ThumbsUp,
  BarChart2,
  MessageSquare,
  ShieldCheck,
  Sun,
  Moon,
  Upload,
  Download,
  Film,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { musicPlayer, MUSIC_TRACKS } from '../utils/musicPlayer';
import { isGradeUnlocked } from '../data/promotionExamsData';
import { useAIFeedbackStats, resetAIFeedbackData } from '../utils/aiFeedback';
import { UserAvatar } from './UserAvatar';
import {
  readMediaFile,
  isMediaAvatar,
  isVideoMedia,
  isGifMedia,
  downloadMediaToDevice,
} from '../utils/mediaUtils';
import {
  checkDisplayNameAvailability,
  registerDisplayNameLocally,
} from '../utils/supabaseDb';

const AVATARS = ['👨‍🚀', '👩‍🚀', '🦉', '🤖', '🦊', '⭐'];

export const SettingsModal: React.FC = () => {
  const {
    user,
    supabaseUserId,
    setActiveTab,
    toggleSound,
    updateGrade,
    updateProfile,
    resetAllData,
    logout,
    setLockedGradeAttempt,
    setViewingPublicProfile,
    theme,
    setTheme,
  } = useMathVerse();

  const isLight = theme === 'light';

  const aiStats = useAIFeedbackStats();
  const [confirmResetAI, setConfirmResetAI] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '👨‍🚀');
  const [selectedGrade, setSelectedGrade] = useState<Grade>(user?.grade || 6);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Music state
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState('cosmic-nebula');
  const [musicVolume, setMusicVolume] = useState(0.45);

  useEffect(() => {
    const unsub = musicPlayer.subscribe((state) => {
      setIsMusicPlaying(state.isPlaying);
      setCurrentTrackId(state.trackId);
      setMusicVolume(state.volume);
    });
    const s = musicPlayer.getState();
    setIsMusicPlaying(s.isPlaying);
    setCurrentTrackId(s.trackId);
    setMusicVolume(s.volume);
    return () => unsub();
  }, []);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Vui lòng nhập họ và tên học sinh.');
      soundManager.playWrongSound();
      return;
    }

    setNameError(null);
    setCheckingName(true);
    try {
      const ownerId = supabaseUserId || (user as any)?.id || user.name;
      const check = await checkDisplayNameAvailability(trimmedName, ownerId, user.name);
      if (!check.available) {
        setNameError(
          check.message || `Tên "${trimmedName}" đã có người sử dụng! Vui lòng đổi sang tên khác nhé.`
        );
        soundManager.playWrongSound();
        return;
      }

      registerDisplayNameLocally(trimmedName, ownerId, user.name);
      updateProfile(trimmedName, avatar);
      updateGrade(selectedGrade);
      soundManager.playClickSound();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setCheckingName(false);
    }
  };

  const handleReset = () => {
    soundManager.playWrongSound();
    resetAllData();
    setConfirmReset(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className={`text-2xl sm:text-3xl font-extrabold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <Settings className={`w-7 h-7 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
          <span>Cài đặt hệ thống</span>
        </h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Tùy chỉnh thông tin cá nhân, khối lớp, nhạc nền tập trung và hiệu ứng âm thanh.
        </p>
      </div>

      <div
        className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors card-top-accent ${
          isLight ? 'bg-white border-slate-200/90 text-slate-800 shadow-indigo-100/40' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Theme Mode Selector (Chế độ Sáng / Chế độ Tối) */}
        <div
          className={`p-5 rounded-2xl border space-y-3 transition-colors ${
            isLight
              ? 'bg-gradient-to-r from-amber-50/70 via-sky-50/50 to-indigo-50/70 border-indigo-200/90'
              : 'bg-gradient-to-r from-indigo-950/60 via-slate-950 to-purple-950/60 border-indigo-500/30'
          }`}
        >
          <div>
            <div className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Sun className={`w-4 h-4 ${isLight ? 'text-amber-500' : 'text-amber-400'}`} />
              <span>Giao diện hiển thị (Chế độ Sáng / Tối)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLight ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-500/20 text-indigo-300'}`}>
                Tùy chọn
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Lựa chọn giao diện sáng sủa, tinh khôi để đọc bài học rõ nét hoặc giao diện tối huyền bí để học tập dịu mắt.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Chế độ Sáng */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setTheme('light');
                try {
                  localStorage.setItem('mathverse_theme_v1', 'light');
                } catch {}
              }}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white border-indigo-500 ring-2 ring-indigo-400 shadow-md text-slate-900'
                  : isLight
                  ? 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center shrink-0">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span>Vũ trụ Rạng đông</span>
                  {theme === 'light' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">Đang bật</span>}
                </div>
                <div className="text-[11px] opacity-75">Sáng sủa, rõ nét, dễ đọc công thức</div>
              </div>
            </button>

            {/* Chế độ Tối */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setTheme('dark');
                try {
                  localStorage.setItem('mathverse_theme_v1', 'dark');
                } catch {}
              }}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-400 shadow-md text-white'
                  : isLight
                  ? 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span>Vũ trụ Huyền bí</span>
                  {theme === 'dark' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-700">Đang bật</span>}
                </div>
                <div className="text-[11px] opacity-75">Huyền ảo, dịu mắt ban đêm</div>
              </div>
            </button>
          </div>
        </div>

        {/* Background Music Section */}
        <div className={`p-5 rounded-2xl border space-y-4 transition-colors ${
          isLight
            ? 'bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 border-indigo-200/80 shadow-xs'
            : 'bg-gradient-to-r from-indigo-950/60 via-slate-950 to-purple-950/60 border-indigo-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Headphones className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
                <span>Nhạc nền Không gian Tập trung</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isLight ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-cyan-500/20 text-cyan-300'
                }`}>
                  MỚI
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Giai điệu Lo-Fi & Ambient thư giãn giúp giảm căng thẳng và tăng khả năng tập trung
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                musicPlayer.togglePlay();
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                isMusicPlaying
                  ? 'bg-cyan-500 justify-end'
                  : isLight
                  ? 'bg-slate-200 justify-start'
                  : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="space-y-1.5 pt-1">
            <div className={`flex justify-between text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <span className="flex items-center gap-1.5 font-medium">
                <Music className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                Âm lượng nhạc nền:
              </span>
              <span className={`font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`}>
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMusicVolume(val);
                musicPlayer.setVolume(val);
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Track selection */}
          <div className="space-y-2 pt-1">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Danh sách bản nhạc nền:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MUSIC_TRACKS.map((t) => {
                const isSelected = t.id === currentTrackId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      soundManager.playClickSound();
                      musicPlayer.setTrack(t.id);
                      if (!isMusicPlaying) musicPlayer.play();
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-sm'
                          : 'bg-cyan-950/50 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-2xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <div className="truncate">
                      <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.title}</div>
                      <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Sound FX Toggle */}
          <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div>
              <div className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {user.soundEnabled ? (
                  <Volume2 className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <span>Hiệu ứng âm thanh khi trả lời câu hỏi</span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Âm thanh vui nhộn khi trả lời đúng, sai và hoàn thành bài thi
              </p>
            </div>

            <button
              type="button"
              onClick={toggleSound}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                user.soundEnabled
                  ? 'bg-cyan-500 justify-end'
                  : isLight
                  ? 'bg-slate-200 justify-start'
                  : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Student Name */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Họ và tên học sinh (Không trùng với thành viên khác)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              className={`w-full px-4 py-3 rounded-xl text-sm focus:ring-2 focus:outline-none transition-colors ${
                nameError
                  ? 'bg-rose-500/10 border border-rose-500 text-rose-500 focus:ring-rose-500'
                  : isLight
                  ? 'bg-white border border-slate-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500'
                  : 'bg-slate-950 border border-slate-700 text-white focus:ring-cyan-500'
              }`}
              maxLength={30}
            />
            {nameError && (
              <div className="mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-500 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{nameError}</span>
              </div>
            )}
          </div>

          {/* Avatar selector + Upload/Download Image, GIF & Video */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className={`block text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Nhân vật đại diện (Emoji / Ảnh / GIF / Video)
              </label>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClickSound();
                  const totalQ = Number(user.answeredQuestionsCount) || 0;
                  const correctQ = Number(user.correctAnswersCount) || 0;
                  const wrongQ = Math.max(0, totalQ - correctQ);
                  const completedCount = Array.isArray(user.completedLessons) ? user.completedLessons.length : 0;
                  const acc =
                    totalQ > 0
                      ? Math.round((correctQ / totalQ) * 100)
                      : completedCount > 0
                      ? 100
                      : null;
                  setViewingPublicProfile({
                    user_id: supabaseUserId || (user as any)?.id || user.name || 'me',
                    display_name: name.trim() || user.name,
                    avatar: avatar,
                    grade: selectedGrade,
                    score: Number(user.xp) || 0,
                    completed_lessons: completedCount,
                    questions_answered: totalQ,
                    correct_count: correctQ,
                    wrong_count: wrongQ,
                    accuracy_rate: acc,
                    updated_at: new Date().toISOString(),
                  });
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                    : 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Xem thử trang cá nhân công khai
              </button>
            </div>

            {/* Current Avatar Preview + Upload from Device + Download to Device */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center overflow-hidden shrink-0 ${
                    isLight ? 'bg-white border-indigo-300 shadow-xs' : 'bg-slate-900 border-cyan-500/40'
                  }`}
                >
                  <UserAvatar avatar={avatar} alt={name} sizeClass="w-full h-full" textClass="text-3xl" />
                </div>
                <div>
                  <div className={`text-sm font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span>Ảnh đại diện hiện tại</span>
                    {isMediaAvatar(avatar) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {isVideoMedia(avatar) ? 'VIDEO' : isGifMedia(avatar) ? 'GIF ĐỘNG' : 'ẢNH TẢI LÊN'}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Hỗ trợ tải ảnh (PNG, JPG, WebP), ảnh động (GIF) hoặc video ngắn (MP4, WebM) từ máy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                <label
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                    isLight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600 shadow-xs'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {uploadingMedia ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Tải ảnh / GIF / Video từ máy</span>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime,.gif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setMediaError(null);
                      setUploadingMedia(true);
                      try {
                        const item = await readMediaFile(file);
                        setAvatar(item.dataUrl);
                        soundManager.playCorrectSound();
                      } catch (err: any) {
                        setMediaError(err?.message || 'Không thể đọc tệp đa phương tiện.');
                        soundManager.playWrongSound();
                      } finally {
                        setUploadingMedia(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>

                {isMediaAvatar(avatar) && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClickSound();
                      downloadMediaToDevice(avatar, `avatar-${name || 'mathverse'}`);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                    title="Tải ảnh/GIF/video đại diện này về máy"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về máy</span>
                  </button>
                )}
              </div>
            </div>

            {mediaError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{mediaError}</span>
              </div>
            )}

            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => {
                    setAvatar(av);
                    setMediaError(null);
                  }}
                  className={`p-3 rounded-xl border text-2xl transition-all cursor-pointer ${
                    avatar === av
                      ? isLight
                        ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-400/40 shadow-sm'
                        : 'bg-indigo-600/30 border-cyan-400 ring-2 ring-cyan-400/30'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Selector */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Lớp đang học (Bộ sách Kết nối tri thức)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([6, 7, 8, 9] as Grade[]).map((g) => {
                const unlocked = isGradeUnlocked(user, g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => {
                      if (unlocked) {
                        setSelectedGrade(g);
                        soundManager.playClickSound();
                      } else {
                        soundManager.playWrongSound();
                        setLockedGradeAttempt(g);
                      }
                    }}
                    className={`p-3 rounded-xl border font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedGrade === g
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : unlocked
                        ? isLight
                          ? 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                        : isLight
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <span>Lớp {g}</span>
                    {!unlocked && <Lock className="w-3 h-3 text-amber-500" />}
                  </button>
                );
              })}
            </div>
            <p className={`text-[11px] mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              * Để mở khóa lớp cao hơn, em cần vượt qua bài tập tổng hợp Kết nối tri thức của các lớp trước đó.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu thay đổi
            </button>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold animate-in fade-in">
                <Check className="w-4 h-4" /> Đã cập nhật thành công!
              </span>
            )}
          </div>
        </form>

        {/* AI Tutor Benchmark & Audit Section (Chuẩn AI 2026) */}
        <div className={`pt-6 border-t space-y-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isLight ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  <span>Kiểm định & Phản biện MathBot AI</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    Chuẩn AI 2026
                  </span>
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Dữ liệu đánh giá từ nút "👍 Hữu ích" và "👎 AI sai rồi" trong MathBot.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-indigo-700 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Xem nhật ký chi tiết</span>
            </button>
          </div>

          {/* 3 KPI metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-2xl border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <div className={`flex items-center justify-between text-[11px] mb-1 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                <span>Tổng câu trả lời</span>
                <MessageSquare className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
              </div>
              <div className={`text-xl sm:text-2xl font-mono font-bold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {aiStats.totalAnswers}
              </div>
              <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                isLight ? 'text-emerald-700 font-medium' : 'text-emerald-400'
              }`}>
                <ThumbsUp className="w-2.5 h-2.5" /> {aiStats.helpfulCount} câu khen
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <div className={`flex items-center justify-between text-[11px] mb-1 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                <span>Số lần báo sai</span>
                <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-rose-500">
                {aiStats.wrongCount}
              </div>
              <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {aiStats.wrongCount === 0 ? 'Chưa có lỗi' : 'Đã ghi nhận'}
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <div className={`flex items-center justify-between text-[11px] mb-1 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                <span>Tỷ lệ báo sai</span>
                <ShieldCheck className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              </div>
              <div
                className={`text-xl sm:text-2xl font-mono font-bold ${
                  aiStats.wrongRate === 0
                    ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                    : aiStats.wrongRate < 10
                    ? isLight ? 'text-indigo-700' : 'text-cyan-400'
                    : 'text-amber-600'
                }`}
              >
                {aiStats.wrongRate}%
              </div>
              <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {aiStats.wrongRate === 0 ? 'Tuyệt đối 100%' : 'Đang hiệu chỉnh'}
              </div>
            </div>
          </div>

          {/* Reset feedback option */}
          {aiStats.records.length > 0 && (
            <div className="flex justify-end">
              {!confirmResetAI ? (
                <button
                  type="button"
                  onClick={() => setConfirmResetAI(true)}
                  className={`text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                    isLight ? 'text-slate-500 hover:text-rose-600' : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" /> Đặt lại dữ liệu phản biện MathBot AI
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-rose-500 font-medium">Xác nhận xóa dữ liệu phản biện AI?</span>
                  <button
                    type="button"
                    onClick={() => {
                      resetAIFeedbackData();
                      setConfirmResetAI(false);
                    }}
                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    Xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetAI(false)}
                    className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone: Reset & Logout */}
        <div className={`pt-6 border-t space-y-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Quản trị dữ liệu tài khoản
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    : 'bg-slate-950 border-rose-500/30 text-rose-300 hover:bg-rose-950/30'
                }`}
              >
                <RotateCcw className="w-4 h-4" /> Đặt lại dữ liệu điểm & tiến độ
              </button>
            ) : (
              <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/40 border-rose-500/40'
              }`}>
                <span className={`text-xs ${isLight ? 'text-rose-800 font-medium' : 'text-rose-200'}`}>
                  Xác nhận đặt lại về 0 XP?
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Đồng ý
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className={`px-3 py-1 rounded-lg text-xs cursor-pointer ${
                    isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Hủy
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <LogOut className="w-4 h-4" /> Đăng xuất tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
