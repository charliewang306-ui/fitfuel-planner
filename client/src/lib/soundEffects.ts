/**
 * Sound Effects Library
 * Generates and plays sound effects using Web Audio API
 */

// Create audio context (reusable)
let audioContext: AudioContext | null = null;
let audioContextResumed = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Resume audio context - MUST be called from a user gesture
 * This unlocks audio playback in browsers (Chrome/Safari require user interaction)
 */
export async function resumeAudioContext(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
      audioContextResumed = true;
    }
  } catch (error) {
    console.warn('Failed to resume audio context:', error);
  }
}

/**
 * Play a drinking water sound effect
 * Creates a pleasant, musical water sound with gentle drops
 */
export function playDrinkingSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create pleasant water drop sounds (like gentle rain)
    const dropNotes = [
      { freq: 659.25, time: 0, volume: 0.2 },     // E5
      { freq: 783.99, time: 0.08, volume: 0.18 }, // G5
      { freq: 587.33, time: 0.16, volume: 0.16 }, // D5
      { freq: 698.46, time: 0.24, volume: 0.14 }, // F5
    ];

    dropNotes.forEach(({ freq, time, volume }) => {
      const startTime = now + time;

      // Main tone - clear bell-like water drop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + 0.15);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);

      // Add a subtle high harmonic for sparkle
      const harmonic = ctx.createOscillator();
      const harmonicGain = ctx.createGain();

      harmonic.type = 'sine';
      harmonic.frequency.value = freq * 2;

      harmonicGain.gain.setValueAtTime(0, startTime);
      harmonicGain.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.005);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      harmonic.connect(harmonicGain);
      harmonicGain.connect(ctx.destination);

      harmonic.start(startTime);
      harmonic.stop(startTime + 0.1);
    });

    // Add gentle flowing water sound (subtle background)
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.5;
    }
    
    noise.buffer = noiseBuffer;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 0.5;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.04, now + 0.05);
    noiseGain.gain.linearRampToValueAtTime(0.04, now + 0.3);
    noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.4);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    noise.start(now);
    noise.stop(now + 0.4);

  } catch (error) {
    console.warn('Failed to play drinking sound:', error);
  }
}

/**
 * Play a celebration sound for reaching the goal
 * Creates a cheerful "ding" sound
 */
export function playCelebrationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create a pleasant "ding" sound
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (error) {
    console.warn('Failed to play celebration sound:', error);
  }
}

/**
 * Play a water drop sound (subtle)
 */
export function playDropSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (error) {
    console.warn('Failed to play drop sound:', error);
  }
}
