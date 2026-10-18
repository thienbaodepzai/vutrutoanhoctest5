import React, { useState, useEffect, useRef } from 'react';
import {
  musicPlayer,
  PlayerState,
  MusicTrack,
  LoopMode,
} from '../utils/musicPlayer';
import { useMathVerse } from '../context/MathVerseContext';
import { soundManager } from '../utils/soundEffects';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Upload,
  Repeat,
  Repeat1,
  Shuffle,
  Music,
  Trash2,
  X,
  ListMusic,
  Disc3,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MusicPlayerWidget: React.FC<Props> = ({ isOpen, onClose }) => {
  const { theme } = useMathVerse();
  const isLight = theme === 'light';

  const [playerState, setPlayerState] = useState<PlayerState>(() => musicPlayer.getState());
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = musicPlayer.subscribe((state) => {
      setPlayerState({ ...state });
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const {
    isPlaying,
    currentTrack,
    volume,
    currentTime,
    duration,
    loopMode,
    isShuffle,
    allTracks,
  } = playerState;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);

    try {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Tệp nhạc quá lớn (tối đa 50MB). Vui lòng chọn tệp nhỏ hơn.');
      }

      await musicPlayer.addCustomTrack(file);
      soundManager.playCorrectSound();
    } catch (err: any) {
      soundManager.playWrongSound();
      setErrorMsg(err.message || 'Không thể tải tệp nhạc lên.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveTrack = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    soundManager.playClickSound();
    await musicPlayer.removeCustomTrack(trackId);
  };

  const toggleLoopMode = () => {
    soundManager.playClickSound();
    const modes: LoopMode[] = ['all', 'one', 'none'];
    const next = modes[(modes.indexOf(loopMode) + 1) % modes.length];
    musicPlayer.setLoopMode(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700/80 text-white'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Trình phát Nhạc Học tập MathVerse</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Tải nhạc từ máy của bạn (.mp3, .wav, .m4a) hoặc nghe nhạc tập trung Alpha 432Hz
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

        {/* Player Vinyl & Track Info Showcase */}
        <div
          className={`p-5 sm:p-6 border-b flex flex-col items-center text-center relative overflow-hidden ${
            isLight
              ? 'bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 border-slate-200'
              : 'bg-gradient-to-b from-indigo-950/30 via-slate-900 to-slate-950 border-slate-800'
          }`}
        >
          {/* Animated Vinyl Disc */}
          <div className="relative mb-4">
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex items-center justify-center shadow-xl transition-transform ${
                isLight ? 'border-slate-200 bg-slate-900 text-white' : 'border-slate-700 bg-slate-950 text-white'
              } ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '8s' }}
            >
              {/* Disc Grooves */}
              <div className="w-16 h-16 rounded-full border border-slate-700 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-inner">
                  {currentTrack.icon || '🎵'}
                </div>
              </div>
            </div>

            {/* Equalizer animation when playing */}
            {isPlaying && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1 h-5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs">
                <span className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ height: '70%', animationDelay: '0ms' }} />
                <span className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce" style={{ height: '50%', animationDelay: '300ms' }} />
                <span className="w-1 bg-purple-400 rounded-full animate-bounce" style={{ height: '85%', animationDelay: '200ms' }} />
              </div>
            )}
          </div>

          <h4 className="font-extrabold text-base sm:text-lg max-w-sm truncate">
            {currentTrack.title}
          </h4>
          <p className={`text-xs mt-0.5 max-w-md ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {currentTrack.desc || 'Giai điệu thư giãn học tập'}
          </p>

          {/* Time Scrubber (only for audio files with known duration) */}
          {currentTrack.isCustom && duration > 0 ? (
            <div className="w-full max-w-md mt-4 space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => musicPlayer.seek(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[11px] font-mono font-semibold text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-[11px] font-medium text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Giai điệu sóng Alpha cộng hưởng liên tục không ngắt quãng</span>
            </div>
          )}

          {/* Player Transport Controls */}
          <div className="flex items-center gap-4 sm:gap-6 mt-4">
            {/* Shuffle */}
            <button
              onClick={() => {
                soundManager.playClickSound();
                musicPlayer.toggleShuffle();
              }}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isShuffle
                  ? 'text-cyan-400 bg-cyan-500/15'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={isShuffle ? 'Xáo trộn ngẫu nhiên: BẬT' : 'Xáo trộn: TẮT'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Prev */}
            <button
              onClick={() => {
                soundManager.playClickSound();
                musicPlayer.prevTrack();
              }}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              title="Bài trước"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => {
                soundManager.playClickSound();
                musicPlayer.togglePlay();
              }}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            {/* Next */}
            <button
              onClick={() => {
                soundManager.playClickSound();
                musicPlayer.nextTrack();
              }}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              title="Bài kế tiếp"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Loop Mode */}
            <button
              onClick={toggleLoopMode}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                loopMode !== 'none'
                  ? 'text-indigo-400 bg-indigo-500/15'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={
                loopMode === 'all'
                  ? 'Lặp lại toàn bộ danh sách'
                  : loopMode === 'one'
                  ? 'Lặp lại 1 bài hát hiện tại'
                  : 'Không lặp'
              }
            >
              {loopMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Volume Control Slider */}
          <div className="flex items-center gap-3 w-full max-w-xs mt-3">
            <button
              onClick={() => musicPlayer.setVolume(volume > 0 ? 0 : 0.5)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => musicPlayer.setVolume(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer h-1.5"
            />
            <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Playlist & Upload Section */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac"
            onChange={handleFileUpload}
            className="hidden"
            id="music-file-upload"
          />
          <label
            htmlFor="music-file-upload"
            className={`border-2 border-dashed rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
              isLight
                ? 'border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80'
                : 'border-indigo-500/30 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-xs sm:text-sm">
                  {isUploading ? 'Đang lưu bài hát...' : 'Tải nhạc từ máy tính lên'}
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Hỗ trợ MP3, WAV, M4A, FLAC, OGG. Tự động lưu trên trình duyệt của bạn.
                </div>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shrink-0 shadow-xs">
              Chọn tệp nhạc
            </span>
          </label>

          {errorMsg && (
            <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Track List */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between px-1">
              <span>Danh sách bài hát ({allTracks.length})</span>
              <span className="text-[10px] text-slate-400">Bấm để phát ngay</span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {allTracks.map((track) => {
                const isCurrent = track.id === currentTrack.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      soundManager.playClickSound();
                      musicPlayer.setTrack(track.id);
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isCurrent
                        ? isLight
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                          : 'bg-indigo-950/60 border-indigo-500/50 text-cyan-300 shadow-md'
                        : isLight
                        ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-sm shrink-0">
                        {isCurrent && isPlaying ? (
                          <Disc3 className="w-4 h-4 animate-spin text-cyan-400" />
                        ) : (
                          track.icon || '🎵'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm truncate">
                            {track.title}
                          </span>
                          {track.isCustom && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400">
                              Từ máy
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {track.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                      {track.isCustom && (
                        <button
                          onClick={(e) => handleRemoveTrack(e, track.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Xóa bài hát này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={() => {
              soundManager.playClickSound();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md hover:from-cyan-400 hover:to-indigo-500 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
