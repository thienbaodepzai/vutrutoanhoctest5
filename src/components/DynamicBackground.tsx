import React, { useState, useEffect } from 'react';
import {
  backgroundManager,
  BackgroundSettings,
  BACKGROUND_PRESETS,
  DEFAULT_BG_SETTINGS,
} from '../utils/backgroundManager';
import { useMathVerse } from '../context/MathVerseContext';

export const DynamicBackground: React.FC = () => {
  const { theme } = useMathVerse();
  const isLight = theme === 'light';

  const [state, setState] = useState(() => backgroundManager.getState());

  useEffect(() => {
    const unsub = backgroundManager.subscribe((next) => {
      setState({ ...next });
    });
    return () => unsub();
  }, []);

  const { settings, customMedia } = state;
  const isCustom = settings.mode === 'custom' && customMedia?.url;
  const isPreset = settings.mode === 'preset';
  const activePreset = isPreset
    ? BACKGROUND_PRESETS.find((p) => p.id === settings.presetId) || BACKGROUND_PRESETS[0]
    : null;

  // Calculate overlay darkness style (0% to 90%)
  const darknessAlpha = (settings.darkness ?? 45) / 100;
  const blurPx = settings.blur ?? 0;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none transition-all duration-500"
      aria-hidden="true"
    >
      {/* 1. Custom Media Layer (Image, Animated GIF, or Looping Video) */}
      {isCustom && customMedia && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
            transform: blurPx > 0 ? 'scale(1.05)' : undefined, // Prevent border bleed when blurred
          }}
        >
          {customMedia.type === 'video' ? (
            <video
              src={customMedia.url}
              autoPlay
              loop
              muted={settings.videoMuted}
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={customMedia.url}
              alt="Hình nền tùy chỉnh MathVerse"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* 2. Preset Media Layer */}
      {isPreset && activePreset && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
            transform: blurPx > 0 ? 'scale(1.05)' : undefined,
          }}
        >
          {activePreset.videoUrl ? (
            <video
              src={activePreset.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={activePreset.thumbnailUrl}
              alt={activePreset.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* 3. Default Math Cosmic Canvas (shown if mode === 'default' or if custom media failed to load) */}
      {!isCustom && !isPreset && (
        <div className="absolute inset-0 w-full h-full transition-colors duration-500">
          {isLight ? (
            <>
              <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-200/25 rounded-full blur-[130px]" />
              <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-200/25 rounded-full blur-[130px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[150px]" />
            </>
          ) : (
            <>
              <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
              <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px]" />
            </>
          )}
        </div>
      )}

      {/* 4. Adaptive Darkness & Contrast Overlay (guarantees text & math symbols remain 100% legible) */}
      {(isCustom || isPreset) && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundColor: isLight
              ? `rgba(255, 255, 255, ${Math.max(0.2, darknessAlpha)})`
              : `rgba(10, 15, 30, ${darknessAlpha})`,
          }}
        />
      )}

      {/* 5. Ambient Floating Math Glyphs */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <span
          className={`absolute top-20 left-12 text-4xl font-mono font-bold animate-float-slow ${
            isLight ? 'text-cyan-700/25' : 'text-cyan-400/25 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]'
          }`}
        >
          π
        </span>
        <span
          className={`absolute top-36 right-20 text-5xl font-mono font-bold animate-float-delayed ${
            isLight ? 'text-indigo-700/25' : 'text-indigo-400/25 filter drop-shadow-[0_0_8px_rgba(129,140,248,0.3)]'
          }`}
        >
          ∑
        </span>
        <span
          className={`absolute bottom-40 left-16 text-5xl font-mono font-bold animate-float-slow ${
            isLight ? 'text-purple-700/25' : 'text-purple-400/25 filter drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]'
          }`}
        >
          √
        </span>
        <span
          className={`absolute bottom-32 right-24 text-4xl font-mono font-bold animate-float-delayed ${
            isLight ? 'text-pink-700/25' : 'text-pink-400/25 filter drop-shadow-[0_0_8px_rgba(244,114,182,0.3)]'
          }`}
        >
          ∞
        </span>
        <span
          className={`absolute top-1/2 right-12 text-3xl font-mono font-bold animate-float-slow ${
            isLight ? 'text-amber-700/25' : 'text-amber-400/25 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]'
          }`}
        >
          Δ
        </span>
        <span
          className={`absolute top-2/3 left-1/3 text-4xl font-mono font-bold animate-float-delayed ${
            isLight ? 'text-emerald-700/20' : 'text-emerald-400/20'
          }`}
        >
          ∫
        </span>
      </div>
    </div>
  );
};
