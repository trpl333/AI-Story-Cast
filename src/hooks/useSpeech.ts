import { useCallback, useRef, useEffect } from 'react';
import type { Character } from '../types';

// Detect available voices once and cache them
let voiceCache: SpeechSynthesisVoice[] = [];

function getVoices(): SpeechSynthesisVoice[] {
  if (voiceCache.length > 0) return voiceCache;
  voiceCache = window.speechSynthesis.getVoices();
  return voiceCache;
}

function pickVoice(preferFemale: boolean): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;
  const lang = voices.filter((v) => v.lang.startsWith('en'));
  const pool = lang.length > 0 ? lang : voices;
  // Try to honour gender preference via common voice name heuristics
  const femaleKeywords = ['female', 'woman', 'girl', 'zira', 'susan', 'karen', 'victoria', 'samantha', 'fiona'];
  const maleKeywords   = ['male', 'man', 'boy', 'david', 'mark', 'daniel', 'alex', 'george', 'rishi'];
  const keywords = preferFemale ? femaleKeywords : maleKeywords;
  const match = pool.find((v) => keywords.some((k) => v.name.toLowerCase().includes(k)));
  return match ?? pool[0];
}

export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Ensure voices are loaded (Chrome loads them async)
  useEffect(() => {
    const load = () => { voiceCache = window.speechSynthesis.getVoices(); };
    window.speechSynthesis.addEventListener('voiceschanged', load);
    load();
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', load); };
  }, []);

  const speak = useCallback(
    (
      text: string,
      character: Character,
      onEnd?: () => void,
      onBoundary?: (charIndex: number) => void,
    ) => {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = character.voicePitch;
      utter.rate  = character.voiceRate;

      const preferFemale = ['Alice'].includes(character.name);
      const voice = pickVoice(preferFemale);
      if (voice) utter.voice = voice;

      if (onEnd) utter.onend = onEnd;
      if (onBoundary) {
        utter.onboundary = (e: SpeechSynthesisEvent) => {
          if (e.name === 'word') onBoundary(e.charIndex);
        };
      }

      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
    },
    [],
  );

  const pause  = useCallback(() => { window.speechSynthesis.pause();  }, []);
  const resume = useCallback(() => { window.speechSynthesis.resume(); }, []);
  const cancel = useCallback(() => { window.speechSynthesis.cancel(); utteranceRef.current = null; }, []);

  return { speak, pause, resume, cancel };
}
