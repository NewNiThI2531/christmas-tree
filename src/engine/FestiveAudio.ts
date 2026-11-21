import type { MusicBoxMelody } from '../types/studio';

interface NoteStep {
  freq: number; // 0 = rest
  beats: number;
}

// Note frequencies (Hz) for delicate celesta / music-box register
const NOTE = {
  R: 0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  F6: 1396.91,
  G6: 1567.98,
  G4: 392.0,
  A4: 440.0,
} as const;

const MELODIES: Record<MusicBoxMelody, { bpm: number; notes: readonly NoteStep[] }> = {
  'jingle-bells': {
    bpm: 132,
    notes: [
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.E5, beats: 2 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.E5, beats: 2 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.G5, beats: 1 },
      { freq: NOTE.C5, beats: 1.5 },
      { freq: NOTE.D5, beats: 0.5 },
      { freq: NOTE.E5, beats: 3 },
      { freq: NOTE.R, beats: 1 },
      { freq: NOTE.F5, beats: 1 },
      { freq: NOTE.F5, beats: 1 },
      { freq: NOTE.F5, beats: 1.5 },
      { freq: NOTE.F5, beats: 0.5 },
      { freq: NOTE.F5, beats: 1 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.E5, beats: 0.5 },
      { freq: NOTE.E5, beats: 0.5 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.D5, beats: 1 },
      { freq: NOTE.D5, beats: 1 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.D5, beats: 2 },
      { freq: NOTE.G5, beats: 2 },
      { freq: NOTE.R, beats: 2 },
    ],
  },
  'auld-lang-syne': {
    bpm: 96,
    notes: [
      { freq: NOTE.G4, beats: 1 },
      { freq: NOTE.C5, beats: 1.5 },
      { freq: NOTE.C5, beats: 0.5 },
      { freq: NOTE.C5, beats: 1 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.D5, beats: 1.5 },
      { freq: NOTE.C5, beats: 0.5 },
      { freq: NOTE.D5, beats: 1 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.C5, beats: 1.5 },
      { freq: NOTE.C5, beats: 0.5 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.G5, beats: 1 },
      { freq: NOTE.A5, beats: 3 },
      { freq: NOTE.A5, beats: 1 },
      { freq: NOTE.G5, beats: 1.5 },
      { freq: NOTE.E5, beats: 0.5 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.C5, beats: 1 },
      { freq: NOTE.D5, beats: 1.5 },
      { freq: NOTE.C5, beats: 0.5 },
      { freq: NOTE.D5, beats: 1 },
      { freq: NOTE.E5, beats: 1 },
      { freq: NOTE.C5, beats: 1.5 },
      { freq: NOTE.A4, beats: 0.5 },
      { freq: NOTE.A4, beats: 1 },
      { freq: NOTE.G4, beats: 1 },
      { freq: NOTE.C5, beats: 3 },
      { freq: NOTE.R, beats: 2 },
    ],
  },
};

/**
 * Procedural Web Audio API synthesizer for gentle festive chimes, fanfares,
 * fireworks, and a celesta-like Music-Box melody loop.
 * Requires zero external audio assets and stays muted until user enables sound.
 */
export class FestiveAudio {
  public enabled = false;
  public musicPlaying = false;
  private melody: MusicBoxMelody = 'jingle-bells';
  private ctx: AudioContext | null = null;
  private musicMasterGain: GainNode | null = null;
  private schedulerTimer: number | null = null;
  private nextNoteTime = 0;
  private noteIndex = 0;
  private pausedByVisibility = false;
  private disposed = false;

  private readonly scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

  private readonly onVisibilityChange = () => {
    if (this.disposed) return;
    if (document.hidden) {
      if (this.musicPlaying) {
        this.pausedByVisibility = true;
        this.stopSchedulerOnly();
      }
    } else if (this.pausedByVisibility) {
      this.pausedByVisibility = false;
      if (this.enabled && this.musicPlaying) {
        this.startScheduler();
      }
    }
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.musicMasterGain) {
      this.musicMasterGain = this.ctx.createGain();
      this.musicMasterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.musicMasterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public setEnabled(value: boolean): void {
    this.enabled = Boolean(value);
    if (this.enabled) {
      this.ensureContext();
      this.playChime(5, 0.08);
      if (this.musicPlaying) {
        this.startScheduler();
      }
    } else {
      this.stopSchedulerOnly();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    }
  }

  public setMelody(melody: MusicBoxMelody): void {
    if (this.melody === melody) return;
    this.melody = melody;
    this.noteIndex = 0;
    if (this.musicPlaying && this.enabled) {
      this.stopSchedulerOnly();
      this.startScheduler();
    }
  }

  public setMusicPlaying(play: boolean, melody?: MusicBoxMelody): void {
    if (melody) this.melody = melody;
    this.musicPlaying = Boolean(play);

    if (this.musicPlaying) {
      if (!this.enabled) {
        this.enabled = true;
      }
      this.noteIndex = 0;
      this.startScheduler();
    } else {
      this.pausedByVisibility = false;
      this.stopSchedulerOnly();
    }
  }

  private startScheduler(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicMasterGain) return;
    this.stopSchedulerOnly();

    const now = ctx.currentTime;
    this.musicMasterGain.gain.cancelScheduledValues(now);
    this.musicMasterGain.gain.setTargetAtTime(0.9, now, 0.12);

    this.nextNoteTime = now + 0.08;
    const scheduleAheadTime = 0.14;
    const lookaheadMs = 30;

    const tick = () => {
      if (this.disposed || !this.ctx || !this.enabled || !this.musicPlaying) return;
      const track = MELODIES[this.melody];
      const secPerBeat = 60 / track.bpm;

      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        const step = track.notes[this.noteIndex % track.notes.length];
        if (step && step.freq > 0) {
          this.scheduleMusicBoxPluck(step.freq, this.nextNoteTime, Math.min(2.1, step.beats * secPerBeat * 1.45));
        }
        this.nextNoteTime += (step?.beats ?? 1) * secPerBeat;
        this.noteIndex = (this.noteIndex + 1) % track.notes.length;
      }
    };

    tick();
    this.schedulerTimer = window.setInterval(tick, lookaheadMs);
  }

  private stopSchedulerOnly(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.ctx && this.musicMasterGain) {
      const now = this.ctx.currentTime;
      this.musicMasterGain.gain.cancelScheduledValues(now);
      this.musicMasterGain.gain.setTargetAtTime(0.0001, now, 0.08);
    }
  }

  private scheduleMusicBoxPluck(freq: number, startTime: number, decay: number): void {
    if (!this.ctx || !this.musicMasterGain) return;

    const fundamental = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const overtoneGain = this.ctx.createGain();

    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(freq, startTime);

    // Subtle metallic music-box tine overtone (3x harmonic)
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 3, startTime);
    overtoneGain.gain.setValueAtTime(0.08, startTime);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.exponentialRampToValueAtTime(0.048, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

    fundamental.connect(env);
    overtone.connect(overtoneGain);
    overtoneGain.connect(env);
    env.connect(this.musicMasterGain);

    fundamental.onended = () => {
      fundamental.disconnect();
      overtone.disconnect();
      overtoneGain.disconnect();
      env.disconnect();
    };

    fundamental.start(startTime);
    overtone.start(startTime);
    fundamental.stop(startTime + decay + 0.05);
    overtone.stop(startTime + decay + 0.05);
  }

  private playChimeAt(noteIndex: number | null, volume: number, startTime: number): void {
    if (!this.ctx) return;
    const freq =
      noteIndex !== null
        ? this.scale[((noteIndex % this.scale.length) + this.scale.length) % this.scale.length]!
        : this.scale[Math.floor(Math.random() * this.scale.length)]!;

    const osc = this.ctx.createOscillator();
    const harmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const harmonicGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(freq * 2, startTime);
    harmonicGain.gain.setValueAtTime(0.22, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.35);

    osc.connect(gain);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(gain);
    gain.connect(this.ctx.destination);

    osc.onended = () => {
      osc.disconnect();
      harmonic.disconnect();
      harmonicGain.disconnect();
      gain.disconnect();
    };

    osc.start(startTime);
    harmonic.start(startTime);
    osc.stop(startTime + 1.4);
    harmonic.stop(startTime + 1.4);
  }

  public playChime(noteIndex: number | null = null, volume = 0.09): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playChimeAt(noteIndex, volume, ctx.currentTime);
  }

  public playGiftFanfare(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 2, 3, 5].forEach((idx, step) => {
      this.playChimeAt(idx, 0.075, now + step * 0.095);
    });
  }

  public playFireworkBurst(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900 + Math.random() * 600, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    noise.start(now);
  }

  public dispose(): void {
    this.disposed = true;
    this.stopSchedulerOnly();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.musicMasterGain = null;
    }
  }
}
