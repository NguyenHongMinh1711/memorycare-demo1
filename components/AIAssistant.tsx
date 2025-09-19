import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SparklesIcon, XCircleIcon, MicrophoneIcon, PaperAirplaneIcon } from '../constants';
import Button from './common/Button';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useTextToSpeech from '../hooks/useTextToSpeech';
import { streamMessageInChat } from '../services/geminiService';
import { useTranslation } from '../contexts';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AIAssistantProps {
  systemInstruction: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ systemInstruction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  const { t } = useTranslation();
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();
  const { speak, isSpeaking, cancel } = useTextToSpeech();
  const chatEndRef = useRef<null | HTMLDivElement>(null);
  const textAreaRef = useRef<null | HTMLTextAreaElement>(null);

  const initialMessage: Message = { role: 'model', text: t('aiWelcomeMessage') };

  useEffect(() => {
    if (transcript) {
      setUserInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);
  
  // Auto-resize textarea
  useEffect(() => {
    const el = textAreaRef.current;
    if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }
  }, [userInput]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => {
      const closing = prev;
      if (closing) {
        cancel();
        stopListening();
      } else { // if opening
        setMessages([initialMessage]);
        setUserInput('');
        resetTranscript();
        setTimeout(() => textAreaRef.current?.focus(), 100);
      }
      return !prev;
    });
  }, [cancel, stopListening, resetTranscript, initialMessage]);

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || isThinking) return;
    const userMessage: Message = { role: 'user', text: userInput };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = userInput;
    setUserInput('');
    resetTranscript();
    setIsThinking(true);

    let fullResponse = '';
    let responseStarted = false;

    await streamMessageInChat(
      currentInput,
      (chunkText) => {
        fullResponse += chunkText;
        if (!responseStarted) {
          responseStarted = true;
          setMessages(prev => [...prev, { role: 'model', text: chunkText }]);
        } else {
          setMessages(prev => prev.map((msg, index) => 
            index === prev.length - 1 ? { ...msg, text: msg.text + chunkText } : msg
          ));
        }
      },
      systemInstruction
    );

    setIsThinking(false);
    if(fullResponse) {
        speak(fullResponse);
    }
  }, [userInput, isThinking, resetTranscript, systemInstruction, speak]);

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-[88px] right-4 md:bottom-8 md:right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-500/50 z-50"
        aria-label="Open AI Assistant"
      >
        <SparklesIcon className="w-8 h-8" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-lg h-full sm:h-[90vh] max-h-[700px] flex flex-col animate-scaleIn">
        <header className="flex justify-between items-center p-4 border-b border-slate-200 flex-shrink-0 bg-slate-100 rounded-t-xl">
          <h2 className="text-lg font-semibold text-indigo-800 flex items-center">
            <SparklesIcon className="w-6 h-6 mr-2" />
            AI Assistant
          </h2>
          <button onClick={toggleOpen} className="text-slate-500 hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full" aria-label="Close Assistant">
            <XCircleIcon className="w-8 h-8" />
          </button>
        </header>

        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
          {messages.map((msg, index) => (
            <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm ${
                msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-slate-200 text-slate-800 rounded-bl-none'
              }`}>
                <p className="text-base whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
            </div>
          ))}
          {isThinking && (
             <div className="flex justify-start">
               <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-slate-200 text-slate-800 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-2 sm:p-3 border-t border-slate-200 flex-shrink-0 bg-slate-100 rounded-b-xl">
          <div className="flex items-end space-x-2 bg-white rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 p-1">
            <textarea
              ref={textAreaRef}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder={t('aiPlaceholder')}
              rows={1}
              className="flex-1 px-2 py-1.5 border-none bg-transparent resize-none focus:ring-0 text-base text-slate-900 placeholder:text-slate-500 max-h-24"
              disabled={isListening || isThinking}
            />
            {isSupported && (
                 <Button
                    onClick={isListening ? stopListening : startListening}
                    variant={isListening ? 'danger' : 'secondary'}
                    size="sm"
                    className="p-2.5 aspect-square h-10 shadow-none"
                    aria-label={isListening ? 'Stop recording' : 'Start recording'}
                    disabled={isThinking || isSpeaking}
                >
                    <MicrophoneIcon className="w-5 h-5" />
                </Button>
            )}
            <Button
              onClick={handleSendMessage}
              size="sm"
              className="p-2.5 aspect-square h-10"
              aria-label="Send message"
              isLoading={isThinking}
              disabled={!userInput.trim()}
            >
              {!isThinking && <PaperAirplaneIcon className="w-5 h-5" />}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AIAssistant;
