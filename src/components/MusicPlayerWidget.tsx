import React, { useState, useEffect } from 'react';
import { musicPlayer, MUSIC_TRACKS, MusicTrack } from '../utils/musicPlayer';
import { useMathVerse } from '../context/MathVerseContext';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Headphones,
  Sliders,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export const MusicPlayerWidget: React.FC = () => {
  const { theme } = useMathVerse();
  const isLight = theme === 'light';

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState('cosmic-nebula');
  const [volume, setVolume] = useState(0.45);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Subscribe to music player state
    const unsubscribe = musicPlayer.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTrackId(state.trackId);
      setVolume(state.volume);
    });

    const initial = musicPlayer.getState();
    setIsPlaying(initial.isPlaying);
    setCurrentTrackId(initial.trackId);
    setVolume(initial.volume);

    return () => {
      unsubscribe();
    };
  }, []);

  const currentTrack = MUSIC_TRACKS.find((t) => t.id === currentTrackId) || MUSIC_TRACKS[0];

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundManager.playClickSound();
    musicPlayer.togglePlay();
  };

  const handleTrackChange = (track: MusicTrack) => {
    soundManager.playClickSound();
    musicPlayer.setTrack(track.id);
    if (!isPlaying) {
      musicPlayer.play();
    }
  };

  const handleNextTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClickSound();
    const currentIndex = MUSIC_TRACKS.findIndex((t) => t.id === currentTrackId);
    const nextIndex = (currentIndex + 1) % MUSIC_TRACKS.length;
    musicPlayer.setTrack(MUSIC_TRACKS[nextIndex].id);
    if (!isPlaying) {
      musicPlayer.play();
    }
  };

  const handlePrevTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClickSound();
    const currentIndex = MUSIC_TRACKS.findIndex((t) => t.id === currentTrackId);
    const prevIndex = (currentIndex - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    musicPlayer.setTrack(MUSIC_TRACKS[prevIndex].id);
    if (!isPlaying) {
      musicPlayer.play();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    musicPlayer.setVolume(val);
  };

  return (
    <>
      {/* Floating Mini Player Widget */}
      <div className="fixed bottom-20 sm:bottom-6 left-4 z-40">
        <div
          onClick={() => {
            setIsOpen(!isOpen);
            soundManager.playClickSound();
          }}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border backdrop-blur-xl shadow-xl transition-all cursor-pointer group ${
            isLight
              ? isPlaying
                ? 'bg-white/95 border-indigo-400 text-slate-800 shadow-indigo-500/15'
                : 'bg-white/95 border-slate-200 hover:border-slate-300 text-slate-700 shadow-slate-200'
              : isPlaying
              ? 'bg-slate-900/90 border-cyan-500/50 shadow-cyan-500/20 text-white'
              : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600 text-slate-200'
          }`}
        >
          {/* Animated Waveform / Icon */}
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
            {isPlaying ? (
              <div className="flex items-end justify-center gap-0.5 h-4 w-4">
                <span className="w-1 bg-white rounded-full animate-bounce [animation-duration:0.6s]" />
                <span className="w-1 bg-white rounded-full animate-bounce [animation-duration:0.9s]" />
                <span className="w-1 bg-white rounded-full animate-bounce [animation-duration:0.7s]" />
              </div>
            ) : (
              <Headphones className="w-4 h-4 text-white" />
            )}
          </div>

          {/* Track Name */}
          <div className="text-left hidden xs:block sm:block max-w-[140px] truncate">
            <div className={`text-[10px] font-semibold flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>Nhạc tập trung</span>
              {isPlaying && <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isLight ? 'bg-indigo-600' : 'bg-cyan-400'}`} />}
            </div>
            <div className={`text-xs font-bold truncate transition-colors ${
              isLight ? 'text-slate-900 group-hover:text-indigo-600' : 'text-white group-hover:text-cyan-300'
            }`}>
              {currentTrack.icon} {currentTrack.title}
            </div>
          </div>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc tập trung'}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isLight
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Music Player Drawer / Modal */}
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in ${
          isLight ? 'bg-slate-950/45' : 'bg-slate-950/60'
        }`}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 card-top-accent transition-all ${
              isLight
                ? 'bg-white border border-slate-200 text-slate-800 shadow-indigo-100/50'
                : 'bg-slate-900 border border-slate-700/90 text-white shadow-2xl'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${
                  isLight
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-indigo-600/30 border-indigo-500/30 text-indigo-300'
                }`}>
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-extrabold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span>Nhạc nền Không gian Tập trung</span>
                    <Sparkles className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Âm thanh sóng não và Lo-fi êm dịu giúp học Toán hiệu quả
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Currently Playing Card */}
            <div className={`p-4 rounded-2xl border text-center space-y-3 transition-colors ${
              isLight
                ? 'bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 border-indigo-200 text-slate-800'
                : 'bg-gradient-to-r from-indigo-950/70 via-slate-950 to-purple-950/70 border-indigo-500/30 text-white'
            }`}>
              <div className="text-4xl animate-pulse">{currentTrack.icon}</div>
              <div>
                <div className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentTrack.title}</div>
                <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{currentTrack.desc}</div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  onClick={handlePrevTrack}
                  title="Bài trước"
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className="p-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 translate-x-0.5 text-white" />
                  )}
                </button>

                <button
                  onClick={handleNextTrack}
                  title="Bài tiếp theo"
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-3 px-3 pt-2">
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <Volume2 className={`w-4 h-4 shrink-0 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
                )}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className={`text-[11px] font-mono w-8 text-right ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            {/* Track Playlist Picker */}
            <div className="space-y-2">
              <div className={`text-xs font-bold uppercase tracking-wider px-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Chọn danh sách bản nhạc:
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {MUSIC_TRACKS.map((track) => {
                  const isCurrent = track.id === currentTrackId;
                  return (
                    <button
                      key={track.id}
                      onClick={() => handleTrackChange(track)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? isLight
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400/40 shadow-xs'
                            : 'bg-indigo-950/60 border-cyan-400/80 text-white ring-1 ring-cyan-400/40'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-xl">{track.icon}</span>
                        <div className="truncate">
                          <div className={`text-xs font-bold truncate ${isCurrent && isLight ? 'text-indigo-900' : ''}`}>{track.title}</div>
                          <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{track.desc}</div>
                        </div>
                      </div>
                      {isCurrent && isPlaying && (
                        <div className="flex items-end gap-0.5 h-3 shrink-0 ml-2">
                          <span className={`w-1 rounded-full animate-bounce [animation-duration:0.6s] ${isLight ? 'bg-indigo-600' : 'bg-cyan-400'}`} />
                          <span className={`w-1 rounded-full animate-bounce [animation-duration:0.9s] ${isLight ? 'bg-indigo-600' : 'bg-cyan-400'}`} />
                          <span className={`w-1 rounded-full animate-bounce [animation-duration:0.7s] ${isLight ? 'bg-indigo-600' : 'bg-cyan-400'}`} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick close button */}
            <button
              onClick={() => setIsOpen(false)}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              Đóng bảng điều khiển
            </button>
          </div>
        </div>
      )}
    </>
  );
};
