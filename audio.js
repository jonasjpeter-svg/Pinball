/**
 * Procedural Web Audio API Sound Engine for Indiana Jones Pinball
 */
class PinballAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensureCtx() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, duration, type = 'triangle', volume = 0.14, slideTo = null, delay = 0) {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  playNoise(duration = 0.06, volume = 0.12, highpass = 600) {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  flipperUp() {
    this.playNoise(0.04, 0.16, 450);
    this.playTone(170, 0.055, 'square', 0.08, 70);
  }

  flipperDown() {
    this.playTone(95, 0.04, 'triangle', 0.05, 45);
  }

  bumper() {
    this.playTone(320, 0.09, 'sawtooth', 0.16, 95);
    this.playNoise(0.05, 0.14, 900);
  }

  slingshot() {
    this.playTone(250, 0.08, 'square', 0.12, 110);
    this.playNoise(0.045, 0.12, 700);
  }

  target() {
    this.playTone(740, 0.08, 'triangle', 0.13, 1120);
  }

  dropTarget() {
    this.playTone(540, 0.11, 'square', 0.12, 220);
    this.playNoise(0.05, 0.1, 1200);
  }

  ramp() {
    this.playTone(380, 0.22, 'sine', 0.12, 860);
    this.playTone(520, 0.22, 'triangle', 0.08, 1080, 0.05);
  }

  launch() {
    this.playNoise(0.09, 0.2, 300);
    this.playTone(130, 0.22, 'sawtooth', 0.14, 480);
  }

  idolLock() {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, idx) => this.playTone(n, 0.16, 'triangle', 0.14, null, idx * 0.08));
  }

  modeStart() {
    // Raiders-inspired heroic brass fanfare cadence
    const melody = [
      { f: 329.63, t: 0.0, d: 0.14 },
      { f: 349.23, t: 0.14, d: 0.08 },
      { f: 392.0, t: 0.22, d: 0.18 },
      { f: 523.25, t: 0.42, d: 0.32 }
    ];
    melody.forEach((m) => this.playTone(m.f, m.d, 'sawtooth', 0.11, null, m.t));
  }

  jackpot() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => this.playTone(n, 0.18, 'square', 0.11, null, idx * 0.065));
  }

  ballSave() {
    this.playTone(440, 0.12, 'triangle', 0.15, 660, 0);
    this.playTone(660, 0.18, 'triangle', 0.15, 880, 0.12);
  }

  drain() {
    this.playTone(280, 0.32, 'sawtooth', 0.12, 75);
  }

  tilt() {
    this.playTone(120, 0.35, 'sawtooth', 0.18, 65);
    this.playTone(114, 0.35, 'square', 0.14, 60, 0.05);
  }
}

window.PinballAudio = PinballAudio;
