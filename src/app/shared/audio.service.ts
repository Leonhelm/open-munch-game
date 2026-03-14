import { Injectable } from '@angular/core';

export type AudioEvent = 'level-up' | 'combat-win' | 'combat-lose' | 'card-draw' | 'curse';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  toggle(): void {
    this.enabled = !this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(event: AudioEvent): void {
    if (!this.enabled) return;
    try {
      this.getCtx().then(ctx => {
        if (!ctx) return;
        switch (event) {
          case 'level-up': this.playLevelUp(ctx); break;
          case 'combat-win': this.playCombatWin(ctx); break;
          case 'combat-lose': this.playCombatLose(ctx); break;
          case 'card-draw': this.playCardDraw(ctx); break;
          case 'curse': this.playCurse(ctx); break;
        }
      });
    } catch {
      // Ignore audio errors (browser policy, etc.)
    }
  }

  private async getCtx(): Promise<AudioContext | null> {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, volume = 0.3, type: OscillatorType = 'sine'): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playLevelUp(ctx: AudioContext): void {
    const t = ctx.currentTime;
    // Ascending arpeggio: C5-E5-G5-C6
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => this.playTone(ctx, freq, t + i * 0.12, 0.25, 0.3, 'triangle'));
  }

  private playCombatWin(ctx: AudioContext): void {
    const t = ctx.currentTime;
    // Short fanfare: G4-C5-E5
    this.playTone(ctx, 392, t, 0.15, 0.3, 'square');
    this.playTone(ctx, 523, t + 0.15, 0.15, 0.3, 'square');
    this.playTone(ctx, 659, t + 0.30, 0.3, 0.3, 'square');
  }

  private playCombatLose(ctx: AudioContext): void {
    const t = ctx.currentTime;
    // Descending sad notes: A4-F4-D4
    this.playTone(ctx, 440, t, 0.2, 0.3, 'sine');
    this.playTone(ctx, 349, t + 0.22, 0.2, 0.3, 'sine');
    this.playTone(ctx, 294, t + 0.44, 0.4, 0.3, 'sine');
  }

  private playCardDraw(ctx: AudioContext): void {
    const t = ctx.currentTime;
    // Quick soft click
    this.playTone(ctx, 800, t, 0.06, 0.15, 'sine');
  }

  private playCurse(ctx: AudioContext): void {
    const t = ctx.currentTime;
    // Spooky descending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.5);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t);
    osc.stop(t + 0.5);
  }
}
