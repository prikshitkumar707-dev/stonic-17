import { AmbientTrack } from '../types/assistant';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientStopper: (() => void) | null = null;
  private currentTrack: AmbientTrack = 'none';
  private volume = 0.7;
  private muted = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(volumePercent: number, muted: boolean) {
    this.volume = Math.max(0, Math.min(1, volumePercent / 100));
    this.muted = muted;
    if (this.ambientGain && this.ctx) {
      const target = this.muted ? 0 : this.volume * 0.28;
      this.ambientGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    }
  }

  public playCue(type: 'start' | 'end' | 'alarm') {
    try {
      const ctx = this.ensureContext();
      if (this.muted && type !== 'alarm') return;

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = (type === 'alarm' ? 0.35 : 0.14) * Math.max(0.25, this.volume);
      master.connect(ctx.destination);

      if (type === 'start') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.12);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(1, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'end') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.9, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + 0.18);
      } else {
        // Pleasant triple chime
        [0, 0.24, 0.48].forEach((offset, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(idx === 2 ? 880 : 660, now + offset);
          g.gain.setValueAtTime(0.001, now + offset);
          g.gain.linearRampToValueAtTime(1, now + offset + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
          osc.connect(g);
          g.connect(master);
          osc.start(now + offset);
          osc.stop(now + offset + 0.24);
        });
      }
    } catch {
      // Ignore Web Audio errors when autoplay is restricted
    }
  }

  public playAmbient(track: AmbientTrack) {
    if (track === this.currentTrack) return;
    this.stopAmbient();
    if (track === 'none') return;

    try {
      const ctx = this.ensureContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume * 0.28,
        ctx.currentTime,
        0.3
      );
      gain.connect(ctx.destination);
      this.ambientGain = gain;
      this.currentTrack = track;

      const cleanups: Array<() => void> = [];

      if (track === 'rain' || track === 'whitenoise' || track === 'ocean') {
        const bufferSize = ctx.sampleRate * 3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (track === 'whitenoise') {
            data[i] = white * 0.35;
          } else {
            // Pink/brownish noise shaping
            b0 = 0.997 * b0 + white * 0.029;
            b1 = 0.985 * b1 + white * 0.032;
            b2 = 0.950 * b2 + white * 0.048;
            data[i] = (b0 + b1 + b2 + white * 0.05) * 0.45;
          }
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = track === 'rain' ? 'bandpass' : 'lowpass';
        filter.frequency.value = track === 'rain' ? 1100 : track === 'ocean' ? 420 : 2800;

        if (track === 'ocean') {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 0.14;
          lfoGain.gain.value = 260;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          lfo.start();
          cleanups.push(() => {
            try { lfo.stop(); } catch {}
          });
        }

        noise.connect(filter);
        filter.connect(gain);
        noise.start();
        cleanups.push(() => {
          try { noise.stop(); } catch {}
        });
      } else if (track === 'focus') {
        // Warm harmonic focus drone (200Hz + 208Hz alpha binaural + 300Hz fifth)
        const freqs = [196, 204, 294];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = f;
          g.gain.value = idx === 2 ? 0.12 : 0.22;
          osc.connect(g);
          g.connect(gain);
          osc.start();
          cleanups.push(() => {
            try { osc.stop(); } catch {}
          });
        });
      } else if (track === 'lofi') {
        // Gentle warm Rhodes-like chord pulse
        const chords = [
          [261.63, 329.63, 392.0, 493.88],
          [220.0, 261.63, 329.63, 392.0],
          [174.61, 220.0, 261.63, 329.63],
          [196.0, 246.94, 293.66, 349.23],
        ];
        let step = 0;
        const oscs = [0, 1, 2, 3].map(() => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const g = ctx.createGain();
          osc.type = 'triangle';
          filter.type = 'lowpass';
          filter.frequency.value = 650;
          g.gain.value = 0.11;
          osc.connect(filter);
          filter.connect(g);
          g.connect(gain);
          osc.start();
          return osc;
        });

        const applyChord = () => {
          const chord = chords[step % chords.length];
          oscs.forEach((osc, i) => {
            osc.frequency.setTargetAtTime(chord[i], ctx.currentTime, 0.15);
          });
          step++;
        };
        applyChord();
        const interval = window.setInterval(applyChord, 2600);
        cleanups.push(() => {
          window.clearInterval(interval);
          oscs.forEach((o) => {
            try { o.stop(); } catch {}
          });
        });
      }

      this.ambientStopper = () => {
        cleanups.forEach((fn) => fn());
        try {
          gain.disconnect();
        } catch {}
      };
    } catch {
      this.currentTrack = 'none';
    }
  }

  public stopAmbient() {
    if (this.ambientStopper) {
      this.ambientStopper();
      this.ambientStopper = null;
    }
    this.ambientGain = null;
    this.currentTrack = 'none';
  }
}

export const soundEngine = new SoundEngine();
