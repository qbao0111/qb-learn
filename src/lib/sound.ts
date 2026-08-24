import { useStore } from '../store';

// Initialize audio context lazily to comply with browser autoplay policies
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSound(type: 'correct' | 'incorrect' | 'flip' | 'complete' | 'select' | 'star' | 'toggle') {
  const { soundEnabled } = useStore.getState();
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  
  switch (type) {
    case 'correct':
      playCorrect(ctx);
      break;
    case 'incorrect':
      playIncorrect(ctx);
      break;
    case 'flip':
      playFlip(ctx);
      break;
    case 'complete':
      playComplete(ctx);
      break;
    case 'select':
      playSelect(ctx);
      break;
    case 'star':
      playStar(ctx);
      break;
    case 'toggle':
      playToggle(ctx);
      break;
  }
}

// ----------------------------------------------------
// Web Audio Procedural Sound Synthesizers
// ----------------------------------------------------

function playSelect(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function playCorrect(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Crystal 3-note harmonic arpeggio: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startTime = now + idx * 0.065;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.14, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  });
}

function playIncorrect(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Soft, low-pass filtered gentle double-thud (non-irritating)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320, now);

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(185, now);
  osc.frequency.setValueAtTime(135, now + 0.08);
  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.24);
}

function playFlip(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(450, now + 0.09);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(680, now + 0.085);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

function playStar(ctx: AudioContext) {
  const now = ctx.currentTime;
  const notes = [880, 1174.66, 1567.98];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startTime = now + idx * 0.055;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.28);
  });
}

function playComplete(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Victory fanfare C5 - E5 - G5 - C6
  const freqs = [523.25, 659.25, 783.99, 1046.50];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + i * 0.09;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.45);
  });
}

function playToggle(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(750, now);
  osc.frequency.exponentialRampToValueAtTime(1100, now + 0.03);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.03);
}
