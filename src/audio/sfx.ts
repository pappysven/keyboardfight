/**
 * Bruitages du combat, synthétisés dans le navigateur (Web Audio).
 * Aucun fichier son, aucun réseau : tout est produit sur l'ordinateur.
 * Désactivables dans l'espace parent (kf.settings.soundEnabled, décision D-031).
 */
export type SfxName = 'hit' | 'riposte' | 'combo' | 'perfect' | 'ko' | 'victory';

interface Note {
  /** Fréquence de départ (Hz). */
  f: number;
  /** Fréquence d'arrivée, pour un glissando. */
  to?: number;
  /** Début (s) et durée (s). */
  t: number;
  d: number;
  type?: OscillatorType;
  /** Volume 0..1. */
  v?: number;
}

export const SOUNDS: Record<SfxName, Note[]> = {
  hit: [{ f: 540, to: 250, t: 0, d: 0.07, type: 'square', v: 0.1 }],
  riposte: [{ f: 170, to: 65, t: 0, d: 0.18, type: 'sawtooth', v: 0.14 }],
  combo: [
    { f: 523, t: 0, d: 0.07 },
    { f: 659, t: 0.07, d: 0.07 },
    { f: 784, t: 0.14, d: 0.07 },
    { f: 1047, t: 0.21, d: 0.16 },
  ],
  perfect: [
    { f: 784, t: 0, d: 0.09, type: 'triangle', v: 0.16 },
    { f: 1175, t: 0.09, d: 0.22, type: 'triangle', v: 0.16 },
  ],
  ko: [{ f: 320, to: 55, t: 0, d: 0.5, type: 'sawtooth', v: 0.16 }],
  victory: [
    { f: 523, t: 0, d: 0.1 },
    { f: 523, t: 0.12, d: 0.1 },
    { f: 784, t: 0.24, d: 0.12 },
    { f: 1047, t: 0.38, d: 0.3 },
  ],
};

export interface Sfx {
  play(name: SfxName): void;
  close(): void;
}

type AudioCtor = new () => AudioContext;

function audioCtor(win: Window): AudioCtor | undefined {
  const w = win as Window & { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext; // webkit : anciens Safari
}

/** `enabled` à false, ou navigateur sans Web Audio : `play` ne fait rien, sans erreur. */
export function createSfx(enabled: boolean, win: Window = window): Sfx {
  let ctx: AudioContext | undefined;

  return {
    play(name) {
      if (!enabled) return;
      try {
        // Créé au premier son : on est alors dans une frappe clavier, ce que Safari exige.
        if (!ctx) {
          const Ctor = audioCtor(win);
          if (!Ctor) return;
          ctx = new Ctor();
        }
        if (ctx.state === 'suspended') void ctx.resume();
        const now = ctx.currentTime;
        for (const note of SOUNDS[name]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + note.t;
          const end = start + note.d;
          osc.type = note.type ?? 'square';
          osc.frequency.setValueAtTime(note.f, start);
          if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, end);
          gain.gain.setValueAtTime(note.v ?? 0.1, start);
          gain.gain.exponentialRampToValueAtTime(0.001, end);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(end + 0.02);
        }
      } catch {
        // Le son est un plus : jamais d'erreur visible pour l'enfant.
      }
    },
    close() {
      void ctx?.close().catch(() => undefined);
      ctx = undefined;
    },
  };
}
