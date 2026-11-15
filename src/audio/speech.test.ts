import { describe, expect, it } from 'vitest';
import { SPEECH_LANG, speak, stopSpeaking } from './speech';

interface FakeEngine {
  spoken: { text: string; lang: string; voice: string | null }[];
  cancelled: number;
  speak(u: { text: string; lang: string; voice?: { name: string } | null }): void;
  cancel(): void;
  getVoices(): { lang: string; name: string }[];
}

function fakeWindow(voices: { lang: string; name: string }[], available = true) {
  const engine: FakeEngine = {
    spoken: [],
    cancelled: 0,
    speak(u) {
      this.spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name ?? null });
    },
    cancel() {
      this.cancelled += 1;
    },
    getVoices: () => voices,
  };
  const win = { speechSynthesis: available ? engine : undefined } as unknown as Window;
  // SpeechSynthesisUtterance n'existe pas dans Node : on fournit une version minimale.
  (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = class {
    text: string;
    lang = '';
    voice: { name: string } | null = null;
    constructor(text: string) {
      this.text = text;
    }
  };
  return { win, engine };
}

describe('dictée : lecture locale', () => {
  it('lit le mot en français avec une voix française si elle existe', () => {
    const { win, engine } = fakeWindow([
      { lang: 'en-US', name: 'Samantha' },
      { lang: 'fr-FR', name: 'Thomas' },
    ]);
    expect(speak('motA', win)).toBe(true);
    expect(engine.spoken[0]).toEqual({ text: 'motA', lang: SPEECH_LANG, voice: 'Thomas' });
  });

  it('reste utilisable sans voix française installée', () => {
    const { win, engine } = fakeWindow([{ lang: 'en-US', name: 'Samantha' }]);
    expect(speak('motA', win)).toBe(true);
    expect(engine.spoken[0]?.voice).toBeNull();
  });

  it('ne fait rien sans synthèse vocale ni texte', () => {
    expect(speak('motA', fakeWindow([], false).win)).toBe(false);
    expect(speak('', fakeWindow([]).win)).toBe(false);
  });

  it('arrête la lecture en cours', () => {
    const { win, engine } = fakeWindow([]);
    stopSpeaking(win);
    expect(engine.cancelled).toBe(1);
  });
});
