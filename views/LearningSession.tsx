import React, { useState, useEffect } from 'react';
import { Word, WordList, LearningMode, CardState, Direction } from '../types';
import { Icon } from '../components/Icon';
import { isDueForReview } from '../services/storageService';

interface LearningSessionProps {
  list: WordList;
  mode: LearningMode;
  onExit: () => void;
  onUpdateList: (updatedList: WordList) => void;
}

export const LearningSession: React.FC<LearningSessionProps> = ({ list, mode, onExit, onUpdateList }) => {
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardState, setCardState] = useState<CardState>(CardState.QUESTION);
  const [direction, setDirection] = useState<Direction>(Direction.EN_ZH);
  const [isFinished, setIsFinished] = useState(false);
  
  // Track if we have initialized the queue for the current mode/session
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Queue based on Mode
  // IMPORTANT: Do NOT include 'list' in dependencies to avoid resetting the queue 
  // when a word is updated (which updates the list prop).
  useEffect(() => {
    let initialQueue: Word[] = [];

    if (mode === LearningMode.MEMORIZE) {
      // Not mastered yet
      initialQueue = list.words.filter(w => w.masteredDates.length === 0);
    } else if (mode === LearningMode.CONSOLIDATE) {
      // In consolidation queue
      initialQueue = list.words.filter(w => list.consolidationQueueIds.includes(w.id));
    } else if (mode === LearningMode.REVIEW) {
      // Mastered at least once AND due
      initialQueue = list.words.filter(w => isDueForReview(w));
    }

    // Shuffle
    initialQueue = initialQueue.sort(() => Math.random() - 0.5);
    setQueue(initialQueue);
    setIsInitialized(true);
  }, [mode]); 

  const currentWord = queue[currentIndex];

  // Helper to update a specific word in the list and persist
  // Note: We use the `list` prop here which is kept fresh by parent updates
  const updateWordInList = (wordId: string, updates: Partial<Word>, addToQueue: boolean = false, removeFromQueue: boolean = false) => {
    const newList = { ...list };
    
    // Update word data
    const wordIndex = newList.words.findIndex(w => w.id === wordId);
    if (wordIndex !== -1) {
      newList.words[wordIndex] = { ...newList.words[wordIndex], ...updates };
    }

    // Update Consolidation Queue List
    if (addToQueue && !newList.consolidationQueueIds.includes(wordId)) {
      newList.consolidationQueueIds = [...newList.consolidationQueueIds, wordId];
    }
    if (removeFromQueue) {
      newList.consolidationQueueIds = newList.consolidationQueueIds.filter(id => id !== wordId);
    }

    onUpdateList(newList);
  };

  const nextCard = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCardState(CardState.QUESTION);
      // Force EN_ZH direction (English to Chinese) always
      setDirection(Direction.EN_ZH);
    } else {
      setIsFinished(true);
    }
  };

  // --- Actions ---

  // 1. User clicks "Know" (Ren Shi)
  const handleKnow = () => {
    setCardState(CardState.ANSWER_PASS_REVEAL);
  };

  // 2. User clicks "Don't Know" (Bu Ren Shi)
  const handleDontKnow = () => {
    setCardState(CardState.ANSWER_FAIL_REVEAL);
  };

  // 3. Logic for "Mastered" (Zhang Wo) - Available in Pass Reveal
  const handleActionMaster = () => {
    if (!currentWord) return;
    const newDates = [...currentWord.masteredDates, Date.now()];
    // Remove from consolidation queue if it was there
    updateWordInList(currentWord.id, { masteredDates: newDates }, false, true);
    nextCard();
  };

  // 4. Logic for "Got it" / "Recognized" (Ren Shi Le) - Available in both reveals
  // Adds to consolidation queue (or keeps it there)
  const handleActionRecognized = () => {
    if (!currentWord) return;
    
    const isFailPath = cardState === CardState.ANSWER_FAIL_REVEAL;
    
    let updates: Partial<Word> = {};
    if (isFailPath) {
       updates.incorrectCount = currentWord.incorrectCount + 1;
    }
    
    updateWordInList(currentWord.id, updates, true, false); // Add/Keep in queue
    nextCard();
  };

  // 5. Logic for "Still Don't Know" / "Not Recognized" (Bu Ren Shi) - Available in Pass Reveal
  const handleActionStillUnknown = () => {
    if (!currentWord) return;
    updateWordInList(currentWord.id, { incorrectCount: currentWord.incorrectCount + 1 }, true, false);
    nextCard();
  };


  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Icon name="hourglass_empty" className="text-4xl mb-2 animate-spin" />
        <p>Initializing...</p>
      </div>
    );
  }

  if (isFinished || queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Icon name="check" className="text-4xl text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Complete!</h2>
        <p className="text-gray-500 mb-8">
           {queue.length === 0 ? "No words available for this mode." : `You have reviewed ${queue.length} words.`}
        </p>
        <button onClick={onExit} className="px-8 py-3 bg-gray-900 text-white rounded-xl shadow-lg hover:scale-105 transition-transform font-medium">
          Back to Dashboard
        </button>
      </div>
    );
  }
  
  // Guard against render errors if queue exists but something went wrong
  if (!currentWord) {
      return (
          <div className="flex flex-col items-center justify-center h-full">
            <p>Error: Word not found.</p>
            <button onClick={onExit} className="mt-4 text-indigo-600 hover:underline">Exit</button>
          </div>
      );
  }

  // Render logic
  const isEnToZh = direction === Direction.EN_ZH;
  const isQuestion = cardState === CardState.QUESTION;
  
  // What to show?
  const renderContent = () => {
    return (
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Main Term */}
        <div className="mt-8">
           {isEnToZh ? (
             <h1 className="text-4xl md:text-5xl font-bold text-gray-800">{currentWord.english}</h1>
           ) : (
             <h1 className="text-4xl md:text-5xl font-bold text-gray-800">{currentWord.chinese}</h1>
           )}
        </div>

        {/* Phonetic / POS - Show if En->Zh OR if Answer Revealed */}
        {(isEnToZh || !isQuestion) && (
           <div className="flex items-center gap-3 text-gray-500 text-lg">
             <span className="font-mono bg-gray-100 px-2 py-1 rounded">{currentWord.phonetic}</span>
             <span className="italic font-serif text-indigo-600 font-medium">{currentWord.partOfSpeech}</span>
           </div>
        )}

        {/* Definition / English - The "Answer" part */}
        {!isQuestion && (
          <div className="p-6 bg-indigo-50 rounded-xl w-full border border-indigo-100 animate-in slide-in-from-bottom-4 duration-300">
             {isEnToZh ? (
               <p className="text-2xl text-indigo-900 font-medium">{currentWord.chinese}</p>
             ) : (
               <p className="text-2xl text-indigo-900 font-bold">{currentWord.english}</p>
             )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <button onClick={onExit} className="text-gray-400 hover:text-gray-600 transition-colors">
          <Icon name="close" className="text-2xl" />
        </button>
        <div className="text-xs font-bold tracking-wider text-gray-400 uppercase">
          {mode} • {currentIndex + 1} / {queue.length}
        </div>
        <div className="w-6" /> {/* Spacer */}
      </div>

      {/* Card Area */}
      <div className="flex-1 flex flex-col justify-center p-6 pb-24 relative">
         <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white p-8 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />
            {renderContent()}
         </div>
      </div>

      {/* Controls - Sticky Bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-6 pb-8 md:pb-6 z-20">
        <div className="max-w-2xl mx-auto flex gap-4 justify-center">
          
          {/* STATE: QUESTION */}
          {cardState === CardState.QUESTION && (
            <>
              <button 
                onClick={handleDontKnow}
                className="flex-1 bg-rose-100 text-rose-700 hover:bg-rose-200 py-4 rounded-xl font-bold text-lg transition-colors shadow-sm"
              >
                Unknown
              </button>
              <button 
                onClick={handleKnow}
                className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-4 rounded-xl font-bold text-lg transition-colors shadow-sm"
              >
                Known
              </button>
            </>
          )}

          {/* STATE: FAILED (User clicked Unknown) */}
          {cardState === CardState.ANSWER_FAIL_REVEAL && (
            <button 
              onClick={handleActionRecognized}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-indigo-200"
            >
              Got it
            </button>
          )}

          {/* STATE: PASSED (User clicked Known) */}
          {cardState === CardState.ANSWER_PASS_REVEAL && (
            <>
               <button 
                onClick={handleActionStillUnknown}
                className="flex-1 bg-rose-100 text-rose-700 hover:bg-rose-200 py-4 rounded-xl font-bold text-lg transition-colors"
              >
                Mistaken
              </button>
              <button 
                onClick={handleActionRecognized}
                className="flex-1 bg-amber-100 text-amber-700 hover:bg-amber-200 py-4 rounded-xl font-bold text-lg transition-colors"
              >
                Review Later
              </button>
              <button 
                onClick={handleActionMaster}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-emerald-200"
              >
                Mastered
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
};