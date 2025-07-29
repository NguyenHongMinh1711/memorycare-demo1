import React, { useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import { useTranslation } from '../contexts';
import { PencilIcon, MicrophoneIcon } from '../constants';
import { generateMyStory, generateMyStoryQuestion } from '../services/geminiService';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import NotificationBanner from '../components/common/NotificationBanner';

interface StoryAnswer {
  question: string;
  answer: string;
}

const MyStoryPage: React.FC = () => {
  const { t, language } = useTranslation();
  
  const [answers, setAnswers] = useLocalStorage<StoryAnswer[]>('memorycare_mystory_answers', []);
  const [story, setStory] = useLocalStorage<string>('memorycare_mystory_story', '');
  const [currentQuestion, setCurrentQuestion] = useLocalStorage<string>('memorycare_mystory_question', '');
  
  const [userResponse, setUserResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const { isListening, transcript, startListening, stopListening, isSupported: speechSupported, error: speechError, resetTranscript } = useSpeechRecognition();

  const fetchNewQuestion = async () => {
    setIsLoading(true);
    const previousQuestions = answers.map(a => a.question);
    const newQuestion = await generateMyStoryQuestion(previousQuestions, language);
    setCurrentQuestion(newQuestion);
    setIsLoading(false);
  };

  useEffect(() => {
    // On initial load, if there's no question, fetch one.
    if (!currentQuestion) {
      fetchNewQuestion();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (transcript) {
      setUserResponse(transcript);
    }
  }, [transcript]);

  const handleSaveAndUpdate = async () => {
    if (!userResponse.trim() || !currentQuestion) {
        setNotification({ type: 'info', message: 'Please provide an answer before updating.' });
        return;
    }
    setIsLoading(true);
    setNotification(null);

    const newAnswer: StoryAnswer = { question: currentQuestion, answer: userResponse };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setUserResponse('');
    resetTranscript();

    try {
        const [newStory, newQuestion] = await Promise.all([
            generateMyStory(updatedAnswers, language),
            generateMyStoryQuestion(updatedAnswers.map(a => a.question), language)
        ]);
        
        setStory(newStory || story); // Don't blank out story on error
        setCurrentQuestion(newQuestion || t('myStoryLoadingQuestion')); // Don't blank out question
    } catch (error) {
        console.error("Error updating story and question:", error);
        setNotification({ type: 'error', message: 'There was an error updating your story. Please try again.' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      <PageHeader 
        title={t('pageTitleMyStory')} 
        subtitle={t('pageSubtitleMyStory')} 
        icon={<PencilIcon className="w-10 h-10" />} 
      />

      {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
      {speechError && <NotificationBanner message={`Speech Error: ${speechError}`} type="error" onDismiss={() => {}} duration={0} />}
      
      {/* Interaction Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Side: Question and Answer */}
        <div className="space-y-6">
          {/* AI Question */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">{t('myStoryAIQuestionTitle')}</h3>
            <p className="text-lg text-indigo-700 min-h-[5rem] flex items-center">
              {isLoading && !currentQuestion ? t('myStoryLoadingQuestion') : currentQuestion}
            </p>
          </div>

          {/* User Answer */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">{t('myStoryYourAnswerTitle')}</h3>
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              placeholder={t('myStoryAnswerPlaceholder')}
              rows={6}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900 placeholder:text-slate-400"
              disabled={isListening || isLoading}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              {speechSupported && (
                <Button
                  onClick={isListening ? stopListening : startListening}
                  variant={isListening ? 'danger' : 'secondary'}
                  leftIcon={<MicrophoneIcon className="w-5 h-5" />}
                  disabled={isLoading}
                >
                  {isListening ? t('myStoryMicrophoneButtonStop') : t('myStoryMicrophoneButtonStart')}
                </Button>
              )}
              <Button 
                onClick={handleSaveAndUpdate}
                isLoading={isLoading}
                disabled={!userResponse.trim()}
              >
                {t('myStorySaveAndUpdateButton')}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: The Story */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-slate-800 mb-4">{t('myStoryTitle')}</h3>
          <div className="prose prose-lg text-slate-700 max-w-none h-[calc(100%-2.5rem)] overflow-y-auto whitespace-pre-wrap">
            {isLoading && story ? (
                <div className="flex items-center text-slate-500">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('myStoryLoadingStory')}</span>
                </div>
            ) : story ? (
              <p>{story}</p>
            ) : (
              <p className="italic text-slate-500">{t('myStoryInitialStory')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyStoryPage;
