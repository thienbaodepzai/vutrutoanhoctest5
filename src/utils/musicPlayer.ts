// Hybrid Music Engine for MathVerse
// Supports both procedural relaxing ambient synth tracks
// and custom audio files (.mp3, .wav, .m4a, .flac) uploaded from user's computer.

import {
  saveCustomAudioTrack,
  loadAllCustomAudioTracks,
  deleteCustomAudioTrack,
} from './mediaStorage';

export interface MusicTrack {
  id: string;
  title: string;
  desc?: string;
  icon?: string;
  bpm?: number;
  isCustom?: boolean;
  url?: string;
  size?: number;
  duration?: number;
}

export const BUILTIN_TRACKS: MusicTrack[] = [
  {
    id: 'cosmic-nebula',
    title: 'Vũ trụ Êm dịu',
    desc: 'Âm hưởng ngân vang không gian thư giãn, giúp giải tỏa căng thẳng',
    icon: '🌌',
    bpm: 54,
  },
  {
    id: 'lofi-math',
    title: 'Math Lo-Fi Chill',
    desc: 'Hợp âm Rhodes ấm áp nhẹ nhàng, tăng cường sự tập trung suy nghĩ',
    icon: '🎧',
    bpm: 68,
  },
  {
    id: 'starlight',
    title: 'Bầu trời Sao lung linh',
    desc: 'Giai điệu chuông gió và đàn hạc thanh thoát, êm tai',
    icon: '⭐',
    bpm: 60,
  },
  {
    id: 'deep-focus',
    title: 'Sóng tập trung sâu',
    desc: 'Tần số Alpha cộng hưởng 432Hz giúp não bộ ghi nhớ kiến thức tốt hơn',
    icon: '🧘',
    bpm: 48,
  },
];

export const MUSIC_TRACKS = BUILTIN_TRACKS;

// Musical chord tables (frequencies in Hz)
const CHORD_PROGRESSIONS: Record<string, number[][]> = {
  'cosmic-nebula': [
    [130.81, 164.81, 196.0, 246.94],
    [110.0, 146.83, 174.61, 220.0],
    [87.31, 130.81, 174.61, 220.0],
    [98.0, 146.83, 196.0, 246.94],
  ],
  'lofi-math': [
    [174.61, 220.0, 261.63, 329.63],
    [164.81, 196.0, 246.94, 293.66],
    [146.83, 174.61, 220.0, 261.63],
    [130.81, 164.81, 196.0, 246.94],
  ],
  'starlight': [
    [261.63, 329.63, 392.0, 523.25],
    [220.0, 261.63, 329.63, 440.0],
    [174.61, 261.63, 329.63, 392.0],
    [196.0, 246.94, 293.66, 392.0],
  ],
  'deep-focus': [
    [108.0, 162.0, 216.0, 432.0],
    [96.0, 144.0, 192.0, 384.0],
    [86.4, 129.6, 172.8, 345.6],
    [96.0, 144.0, 216.0, 432.0],
  ],
};

const ARPEGGIO_NOTES: Record<string, number[]> = {
  'cosmic-nebula': [261.63, 329.63, 392.0, 493.88, 523.25, 659.25, 783.99],
  'lofi-math': [329.63, 392.0, 440.0, 523.25, 587.33, 659.25],
  'starlight': [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5],
  'deep-focus': [216.0, 324.0, 432.0, 648.0],
};

export type LoopMode = 'all' | 'one' | 'none';

export interface PlayerState {
  isPlaying: boolean;
  trackId: string;
  volume: number;
  currentTime: number;
  duration: number;
  loopMode: LoopMode;
  isShuffle: boolean;
  currentTrack: MusicTrack;
  allTracks: MusicTrack[];
}

class HybridMusicPlayer {
  // Web Audio Context for Procedural ambient
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private chordTimer: any = null;
  private arpTimer: any = null;
  private chordIndex: number = 0;

  // HTML5 Audio Element for Custom Audio Files
  private audioElement: HTMLAudioElement | null = null;

  // State
  private isPlaying: boolean = false;
  private currentTrackId: string = 'cosmic-nebula';
  private volume: number = 0.5;
  private currentTime: number = 0;
  private duration: number = 0;
  private loopMode: LoopMode = 'all';
  private isShuffle: boolean = false;

  private customTracks: MusicTrack[] = [];
  private listeners: ((state: PlayerState) => void)[] = [];
  private timeUpdateInterval: any = null;

  constructor() {
    this.initCustomTracks();
  }

  private async initCustomTracks() {
    try {
      const saved = await loadAllCustomAudioTracks();
      if (saved && saved.length > 0) {
        this.customTracks = saved.map((t) => ({
          id: t.id,
          title: t.name,
          desc: `Nhạc tải từ máy • ${(t.size / (1024 * 1024)).toFixed(1)} MB`,
          icon: '🎵',
          isCustom: true,
          url: t.url,
          size: t.size,
        }));
        this.notify();
      }
    } catch (e) {
      console.warn('[MusicPlayer] Failed to load stored audio tracks:', e);
    }
  }

  private initAudio() {
    // 1. Init Web Audio Context
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(1400, this.ctx.currentTime);

        this.masterGain.connect(this.filterNode);
        this.filterNode.connect(this.ctx.destination);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // 2. Init HTML5 Audio Element for custom uploads
    if (!this.audioElement && typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.volume = this.volume;

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
          this.duration = this.audioElement.duration || 0;
          this.notify();
        }
      });

      this.audioElement.addEventListener('ended', () => {
        this.handleTrackEnded();
      });

      this.audioElement.addEventListener('loadedmetadata', () => {
        if (this.audioElement) {
          this.duration = this.audioElement.duration || 0;
          this.notify();
        }
      });
    }
  }

  private handleTrackEnded() {
    if (this.loopMode === 'one') {
      if (this.audioElement) {
        this.audioElement.currentTime = 0;
        this.audioElement.play().catch(() => {});
      }
    } else {
      this.nextTrack();
    }
  }

  public subscribe(cb: (state: PlayerState) => void) {
    this.listeners.push(cb);
    cb(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  public getAllTracks(): MusicTrack[] {
    return [...this.customTracks, ...BUILTIN_TRACKS];
  }

  public getCurrentTrack(): MusicTrack {
    const all = this.getAllTracks();
    return all.find((t) => t.id === this.currentTrackId) || BUILTIN_TRACKS[0];
  }

  public getState(): PlayerState {
    const all = this.getAllTracks();
    const current = this.getCurrentTrack();
    return {
      isPlaying: this.isPlaying,
      trackId: this.currentTrackId,
      volume: this.volume,
      currentTime: this.currentTime,
      duration: this.duration,
      loopMode: this.loopMode,
      isShuffle: this.isShuffle,
      currentTrack: current,
      allTracks: all,
    };
  }

  public play() {
    this.initAudio();
    this.isPlaying = true;

    const current = this.getCurrentTrack();
    if (current.isCustom && current.url && this.audioElement) {
      this.stopProcedural();
      if (this.audioElement.src !== current.url) {
        this.audioElement.src = current.url;
      }
      this.audioElement.volume = this.volume;
      this.audioElement.play().catch(() => {});
    } else {
      if (this.audioElement) {
        this.audioElement.pause();
      }
      this.startProcedural();
    }

    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    this.stopProcedural();
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setTrack(trackId: string) {
    if (this.currentTrackId === trackId && this.isPlaying) return;
    this.currentTrackId = trackId;
    this.currentTime = 0;
    this.duration = 0;

    const current = this.getCurrentTrack();
    if (this.audioElement) {
      this.audioElement.pause();
      if (current.isCustom && current.url) {
        this.audioElement.src = current.url;
        this.audioElement.currentTime = 0;
      }
    }

    if (this.isPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  public nextTrack() {
    const all = this.getAllTracks();
    if (all.length === 0) return;

    if (this.isShuffle) {
      const otherTracks = all.filter((t) => t.id !== this.currentTrackId);
      if (otherTracks.length > 0) {
        const random = otherTracks[Math.floor(Math.random() * otherTracks.length)];
        this.setTrack(random.id);
        return;
      }
    }

    const currentIndex = all.findIndex((t) => t.id === this.currentTrackId);
    let nextIndex = (currentIndex + 1) % all.length;
    if (nextIndex === 0 && this.loopMode === 'none') {
      this.pause();
      return;
    }
    this.setTrack(all[nextIndex].id);
  }

  public prevTrack() {
    const all = this.getAllTracks();
    if (all.length === 0) return;

    const currentIndex = all.findIndex((t) => t.id === this.currentTrackId);
    const prevIndex = (currentIndex - 1 + all.length) % all.length;
    this.setTrack(all[prevIndex].id);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.05);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    this.notify();
  }

  public seek(seconds: number) {
    const current = this.getCurrentTrack();
    if (current.isCustom && this.audioElement && this.duration > 0) {
      this.audioElement.currentTime = Math.max(0, Math.min(this.duration, seconds));
      this.currentTime = this.audioElement.currentTime;
      this.notify();
    }
  }

  public setLoopMode(mode: LoopMode) {
    this.loopMode = mode;
    this.notify();
  }

  public toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.notify();
  }

  // Add custom track from file
  public async addCustomTrack(file: File): Promise<MusicTrack> {
    const saved = await saveCustomAudioTrack(file);
    const newTrack: MusicTrack = {
      id: saved.id,
      title: saved.name,
      desc: `Nhạc tải từ máy • ${(saved.size / (1024 * 1024)).toFixed(1)} MB`,
      icon: '🎵',
      isCustom: true,
      url: saved.url,
      size: saved.size,
    };

    this.customTracks = [newTrack, ...this.customTracks];
    this.setTrack(newTrack.id);
    this.play();
    return newTrack;
  }

  // Delete custom track
  public async removeCustomTrack(trackId: string): Promise<void> {
    await deleteCustomAudioTrack(trackId);
    this.customTracks = this.customTracks.filter((t) => t.id !== trackId);

    if (this.currentTrackId === trackId) {
      const fallback = this.getAllTracks()[0] || BUILTIN_TRACKS[0];
      this.setTrack(fallback.id);
    } else {
      this.notify();
    }
  }

  // Procedural Generator Controls
  private startProcedural() {
    this.stopProcedural();
    this.chordIndex = 0;

    const track = BUILTIN_TRACKS.find((t) => t.id === this.currentTrackId) || BUILTIN_TRACKS[0];
    const chords = CHORD_PROGRESSIONS[this.currentTrackId] || CHORD_PROGRESSIONS['cosmic-nebula'];
    const chordDurationMs = (60 / (track.bpm || 60)) * 4 * 1000;
    const arpIntervalMs = (60 / (track.bpm || 60)) * 1000 * 0.75;

    this.playChord(chords[0], chordDurationMs / 1000);

    this.chordTimer = setInterval(() => {
      if (!this.isPlaying) return;
      this.chordIndex = (this.chordIndex + 1) % chords.length;
      this.playChord(chords[this.chordIndex], chordDurationMs / 1000);
    }, chordDurationMs);

    this.arpTimer = setInterval(() => {
      if (!this.isPlaying) return;
      this.playRandomArpNote();
    }, arpIntervalMs);
  }

  private stopProcedural() {
    if (this.chordTimer) {
      clearInterval(this.chordTimer);
      this.chordTimer = null;
    }
    if (this.arpTimer) {
      clearInterval(this.arpTimer);
      this.arpTimer = null;
    }
  }

  private playChord(frequencies: number[], durationSec: number) {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    frequencies.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = this.currentTrackId === 'lofi-math' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((idx - 1.5) * 6, now);

      const attack = Math.min(1.8, durationSec * 0.35);
      const decay = Math.min(1.5, durationSec * 0.35);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05 / frequencies.length, now + attack);
      gain.gain.setValueAtTime(0.05 / frequencies.length, now + durationSec - decay);
      gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + durationSec + 0.1);
    });
  }

  private playRandomArpNote() {
    if (!this.ctx || !this.masterGain) return;

    const notes = ARPEGGIO_NOTES[this.currentTrackId] || ARPEGGIO_NOTES['cosmic-nebula'];
    const randomFreq = notes[Math.floor(Math.random() * notes.length)];
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.currentTrackId === 'starlight' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(randomFreq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.85);
  }
}

export const musicPlayer = new HybridMusicPlayer();
