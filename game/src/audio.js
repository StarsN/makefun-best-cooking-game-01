// audio.js — every sound in the game is synthesised with WebAudio.
// No audio files are loaded, so the game stays fully offline and silent
// until the player first interacts (browsers require a gesture before
// an AudioContext may start).

export class SoundBoard {
  constructor() {
    this.context = null;
    this.muted = false;
    this.sizzleNodes = null;
  }

  // Call from any user gesture; safe to call repeatedly.
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
    } catch {
      this.context = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) this.stopSizzle();
  }

  // One short oscillator blip: frequency, length and shape in, sound out.
  blip(frequency, duration, type = 'sine', volume = 0.12, when = 0) {
    if (this.muted || !this.context) return;
    const ctx = this.context;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  // A burst of filtered noise: the chop thud and the sizzle bed are built on it.
  noiseBurst(duration, volume = 0.1, filterFrequency = 1200) {
    if (this.muted || !this.context) return;
    const ctx = this.context;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  pickUp() {
    this.blip(520, 0.08, 'triangle', 0.1);
  }

  chop() {
    this.noiseBurst(0.09, 0.16, 900);
    this.blip(180, 0.07, 'square', 0.05);
  }

  chopDone() {
    this.blip(660, 0.09, 'triangle', 0.1);
    this.blip(880, 0.12, 'triangle', 0.1, 0.08);
  }

  plate() {
    this.blip(440, 0.07, 'triangle', 0.1);
    this.blip(587, 0.1, 'triangle', 0.1, 0.06);
  }

  serve() {
    // A little rising arpeggio for a happy customer.
    [523, 659, 784, 1047].forEach((freq, i) => this.blip(freq, 0.16, 'triangle', 0.12, i * 0.07));
  }

  error() {
    this.blip(160, 0.18, 'sawtooth', 0.07);
    this.blip(120, 0.22, 'sawtooth', 0.07, 0.1);
  }

  orderArrives() {
    this.blip(784, 0.1, 'sine', 0.09);
    this.blip(988, 0.14, 'sine', 0.09, 0.09);
  }

  orderExpired() {
    this.blip(392, 0.2, 'triangle', 0.1);
    this.blip(311, 0.3, 'triangle', 0.1, 0.15);
  }

  tick() {
    this.blip(980, 0.05, 'square', 0.04);
  }

  levelUp() {
    [392, 523, 659, 784].forEach((freq, i) => this.blip(freq, 0.18, 'triangle', 0.11, i * 0.08));
  }

  gameOver() {
    [523, 440, 349, 262].forEach((freq, i) => this.blip(freq, 0.25, 'triangle', 0.1, i * 0.12));
  }

  // A looping soft sizzle while something cooks on the grill.
  startSizzle() {
    if (this.muted || !this.context || this.sizzleNodes) return;
    const ctx = this.context;
    const length = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    this.sizzleNodes = { source, gain };
  }

  stopSizzle() {
    if (!this.sizzleNodes) return;
    try {
      this.sizzleNodes.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
      this.sizzleNodes.source.stop(this.context.currentTime + 0.2);
    } catch {
      // The context may already be closed; nothing to stop.
    }
    this.sizzleNodes = null;
  }
}
