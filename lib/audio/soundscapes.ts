import { SoundscapeProfile } from '../types';

export interface SoundscapeOption {
  id: SoundscapeProfile;
  name: string;
  description: string;
  icon: string;
}

export const SOUNDSCAPE_OPTIONS: SoundscapeOption[] = [
  {
    id: 'binaural_40hz',
    name: 'Binaural Alpha 40Hz (Cognitive)',
    description: 'Isochronic 40Hz gamma/alpha frequency for neuroplasticity and deep memory consolidation.',
    icon: '🧠'
  },
  {
    id: 'rain',
    name: 'Deep Focus Rainfall',
    description: 'Soft procedural rain acoustics with natural harmonic frequency diffusion.',
    icon: '🌧️'
  },
  {
    id: 'pink_noise',
    name: 'Pink Noise Sanctuary',
    description: 'Equal energy per octave sound mask for blocking speech and auditory distractions.',
    icon: '🌊'
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Chill Synth Chords',
    description: 'Warm low-passed analog synthesizer ambient drone with subtle tape flutter.',
    icon: '🎹'
  },
  {
    id: 'silent',
    name: 'Silent Void',
    description: 'Mute acoustic background generation.',
    icon: '🔇'
  }
];

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private currentProfile: SoundscapeProfile = 'silent';
  private gainNode: GainNode | null = null;
  private activeNodes: Array<AudioNode | { stop?: () => void }> = [];
  private isPlaying: boolean = false;
  private volume: number = 0.3;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.gainNode.connect(this.ctx.destination);
      }
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public start(profile: SoundscapeProfile) {
    this.initContext();
    if (!this.ctx || !this.gainNode) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stop();
    this.currentProfile = profile;

    if (profile === 'silent') {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    switch (profile) {
      case 'binaural_40hz':
        this.playBinaural40Hz();
        break;
      case 'rain':
        this.playRainfall();
        break;
      case 'pink_noise':
        this.playPinkNoise();
        break;
      case 'lofi':
        this.playLoFiSynth();
        break;
      default:
        break;
    }
  }

  public stop() {
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        }
        if ('disconnect' in node && typeof node.disconnect === 'function') {
          node.disconnect();
        }
      } catch {
        // Safe disposal
      }
    });
    this.activeNodes = [];
    this.isPlaying = false;
  }

  private playBinaural40Hz() {
    if (!this.ctx || !this.gainNode) return;

    // Left channel: 200 Hz
    const oscLeft = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(200, this.ctx.currentTime);

    const panLeft = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panLeft) panLeft.pan.setValueAtTime(-0.8, this.ctx.currentTime);

    // Right channel: 240 Hz (40 Hz difference)
    const oscRight = this.ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(240, this.ctx.currentTime);

    const panRight = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panRight) panRight.pan.setValueAtTime(0.8, this.ctx.currentTime);

    // Soft carrier gain
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    if (panLeft && panRight) {
      oscLeft.connect(panLeft);
      panLeft.connect(subGain);
      oscRight.connect(panRight);
      panRight.connect(subGain);
    } else {
      oscLeft.connect(subGain);
      oscRight.connect(subGain);
    }

    subGain.connect(this.gainNode);

    oscLeft.start();
    oscRight.start();

    this.activeNodes.push(oscLeft, oscRight, subGain);
    if (panLeft) this.activeNodes.push(panLeft);
    if (panRight) this.activeNodes.push(panRight);
  }

  private playPinkNoise() {
    if (!this.ctx || !this.gainNode) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter);
  }

  private playRainfall() {
    if (!this.ctx || !this.gainNode) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    rainSource.connect(filter);
    filter.connect(this.gainNode);

    rainSource.start();
    this.activeNodes.push(rainSource, filter);
  }

  private playLoFiSynth() {
    if (!this.ctx || !this.gainNode) return;

    const freqs = [130.81, 164.81, 196.00]; // C3, E3, G3 triad
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    freqs.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);
      osc.connect(filter);
      osc.start();
      this.activeNodes.push(osc);
    });

    filter.connect(masterGain);
    masterGain.connect(this.gainNode);

    this.activeNodes.push(filter, masterGain);
  }
}

export const soundscapeEngine = new SoundscapeEngine();
