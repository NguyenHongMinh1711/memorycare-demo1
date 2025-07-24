
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../contexts';

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
  isSupported: boolean;
  resetTranscript: () => void;
}

const useSpeechRecognition = (): SpeechRecognitionHook => {
  const { language } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const newRecognition = new SpeechRecognitionAPI();
      newRecognition.continuous = false; 
      newRecognition.interimResults = true; 
      setRecognition(newRecognition);
    } else {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser.");
    }
  }, []);
  
  useEffect(() => {
    if (recognition) {
        const langMap = {
            en: 'en-US',
            vi: 'vi-VN'
        };
        recognition.lang = langMap[language] || language;
    }
  }, [language, recognition]);

  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    let interimTranscript = '';
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    setTranscript(finalTranscript || interimTranscript);
    if(finalTranscript){
        setIsListening(false); 
    }
  }, []);

  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    setError(`Speech recognition error: ${event.error}. ${event.message || ''}`.trim());
    setIsListening(false);
  }, []);

  const handleEnd = useCallback(() => {
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd; 

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      if (recognition && isListening) { 
        try {
            recognition.stop();
        } catch (e) {
            // console.warn("Error stopping recognition on cleanup:", e);
        }
      }
    };
  }, [recognition, handleResult, handleError, handleEnd, isListening]);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript('');
      setError(null);
      try {
        recognition.start();
        setIsListening(true);
      } catch (e: any) {
        setError(`Failed to start recognition: ${e.message || e.name || 'Unknown error'}. Microphone might be blocked or unavailable.`);
        setIsListening(false);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch (e) {
        // console.warn("Error stopping recognition:", e);
      }
      setIsListening(false); 
    }
  }, [recognition, isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);


  return { isListening, transcript, startListening, stopListening, error, isSupported, resetTranscript };
};

export default useSpeechRecognition;
