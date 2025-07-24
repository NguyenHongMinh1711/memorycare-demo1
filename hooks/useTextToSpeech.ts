
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../contexts';

interface TextToSpeechHook {
  speak: (text: string, options?: { onLanguageUnavailable?: () => void }) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  error: string | null;
}

const useTextToSpeech = (): TextToSpeechHook => {
  const { language } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const populateVoices = useCallback(() => {
    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length > 0) {
      setVoices(availableVoices);
      window.speechSynthesis.removeEventListener('voiceschanged', populateVoices);
    }
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      populateVoices(); // Try to get voices immediately
      if (voices.length === 0) { // If not available yet, set up the listener
        window.speechSynthesis.addEventListener('voiceschanged', populateVoices);
      }
    } else {
      setIsSupported(false);
      setError("Text-to-speech is not supported in this browser.");
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', populateVoices);
        window.speechSynthesis.cancel();
      }
    };
  }, [populateVoices, voices.length]);

  const speak = useCallback((text: string, options?: { onLanguageUnavailable?: () => void }) => {
    if (!isSupported || !text || voices.length === 0) {
        if (voices.length === 0) {
            console.warn("TTS voices not loaded yet, cannot speak.");
        }
        return;
    }
    
    setError(null);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { en: 'en-US', vi: 'vi-VN' };
    const targetLang = langMap[language] || language;
    utterance.lang = targetLang;

    // Find a voice that EXACTLY matches the language-country code (e.g., 'vi-VN')
    let voice = voices.find(v => v.lang === targetLang);

    // As a fallback, find a voice that starts with the language code (e.g., 'vi')
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith(language));
    }

    if (voice) {
      utterance.voice = voice;
    } else {
      // If no suitable voice is found, do not attempt to speak.
      // Instead, trigger the callback to notify the UI.
      console.warn(`No voice found for language: ${targetLang}. Speech cancelled.`);
      if (options?.onLanguageUnavailable) {
        options.onLanguageUnavailable();
      }
      return;
    }

    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      const errorMessage = typeof event.error === 'string' ? event.error : 'Unknown error';
      setError(`Speech synthesis error: ${errorMessage}`);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, language, voices]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, cancel, isSpeaking, isSupported, error };
};

export default useTextToSpeech;
