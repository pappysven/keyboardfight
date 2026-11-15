/**
 * Dictée : lecture d'un mot par la synthèse vocale du navigateur.
 * Sur Safari macOS, ce sont les voix installées sur le Mac : la lecture est locale,
 * aucun son ni aucun texte ne sort de l'ordinateur (AGENTS.md, règle 1).
 */

export const SPEECH_LANG = 'fr-FR';

/** Minimum de l'API, pour pouvoir la simuler dans les tests. */
export interface SpeechEngine {
  speak(utterance: SpeechSynthesisUtterance): void;
  cancel(): void;
  getVoices(): SpeechSynthesisVoice[];
}

export function speechEngine(win: Window = window): SpeechEngine | null {
  const engine = (win as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
  return engine ?? null;
}

/** Lit un mot. Renvoie false si la synthèse vocale n'est pas disponible. */
export function speak(text: string, win: Window = window): boolean {
  const engine = speechEngine(win);
  if (!engine || text.length === 0) return false;
  try {
    engine.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG;
    const voice = engine.getVoices().find((v) => v.lang.toLowerCase().startsWith('fr'));
    if (voice) utterance.voice = voice;
    engine.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** Arrête toute lecture en cours (fin de session, sortie de l'écran). */
export function stopSpeaking(win: Window = window): void {
  speechEngine(win)?.cancel();
}
