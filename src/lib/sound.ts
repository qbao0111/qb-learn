import { useStore } from '../store';

// Initialize audio context lazily to comply with browser autoplay policies
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (e.g. by browser policy before first interaction)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSound(type: 'correct' | 'incorrect' | 'flip' | 'complete') {
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
  }
}

// ----------------------------------------------------
// Sound Synthesizers
// ----------------------------------------------------

function playCorrect(ctx: AudioContext) {
  const t = ctx.currentTime;
  
  // High "ting" sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(t);
  osc.stop(t + 0.5);
}

function playIncorrect(ctx: AudioContext) {
  const t = ctx.currentTime;
  
  // Low "bzzzt" sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.linearRampToValueAtTime(120, t + 0.2);
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(t);
  osc.stop(t + 0.3);
}

function playFlip(ctx: AudioContext) {
  const t = ctx.currentTime;
  const duration = 0.1;
  
  // Short noise burst (card flip simulation)
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; // White noise
  }
  
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  
  // Filter the noise to sound more like paper
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, t);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  
  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noiseSource.start(t);
}

function playComplete(ctx: AudioContext) {
  const t = ctx.currentTime;
  
  // Arpeggio C5 E5 G5 C6
  const freqs = [523.25, 659.25, 783.99, 1046.50];
  
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    const startTime = t + i * 0.15;
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + 0.5);
  });
}
