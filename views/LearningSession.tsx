import React, { useState, useEffect } from 'react';
import { Word, WordList, LearningMode, CardState, Direction } from '../types';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { ListEditor } from '../components/ListEditor';
import { NoteEditor } from '../components/NoteEditor';
import { DictionaryModal } from '../components/DictionaryModal';
import { isDueForReview, incrementDailyCount, getDailyCount, getNote, saveNote, addWordRelation } from '../services/storageService';
import { DictionaryResult } from '../services/dictionaryService';

interface LearningSessionProps {
  list: WordList;
  allLists: WordList[];
  mode: LearningMode;
  onExit: () => void;
  onUpdateList: (updatedList: WordList) => void;
  onUpdateGlobalLists: (lists: WordList[]) => void;
}

export const LearningSession: React.FC<LearningSessionProps> = ({ list, allLists, mode, onExit, onUpdateList, onUpdateGlobalLists }) => {
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardState, setCardState] = useState<CardState>(CardState.QUESTION);
  const [direction, setDirection] = useState<Direction>(Direction.EN_ZH);
  const [isFinished, setIsFinished] = useState(false);
  
  // Track if we have initialized the queue for the current mode/session
  const [isInitialized, setIsInitialized] = useState(false);

  // Daily Count State
  const [dailyCount, setDailyCount] = useState(0);

  // Copy to List States
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [copyingWordData, setCopyingWordData] = useState<{ word: Word, sourceListId: string } | null>(null);

  // Note States
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState('');

  // Dictionary States
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);

  // Initialize Queue based on Mode
  // IMPORTANT: Do NOT include 'list' in dependencies to avoid resetting the queue 
  // when a word is updated (which updates the list prop).
  useEffect(() => {
    let initialQueue: Word[] = [];

    if (mode === LearningMode.MEMORIZE) {
      // Not mastered yet AND Not currently in consolidation queue
      initialQueue = list.words.filter(w => 
        w.masteredDates.length === 0 && 
        !list.consolidationQueueIds.includes(w.id)
      );
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
    
    // Init daily count
    setDailyCount(getDailyCount(list.id));
    
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

  // --- Copy Word Logic ---

  const handleCopyWordToList = (targetListId: string) => {
    if (!copyingWordData) return;
    const wordToCopy = copyingWordData.word;

    // Check for duplicates in target list
    const targetList = allLists.find(l => l.id === targetListId);
    if (targetList) {
        const isDuplicate = targetList.words.some(w => 
            w.english === wordToCopy.english && 
            w.phonetic === wordToCopy.phonetic && 
            w.chinese === wordToCopy.chinese
        );

        if (isDuplicate) {
             setCopyFeedback("Already in list");
             setTimeout(() => {
                setCopyFeedback(null);
             }, 1000);
             return; // Do not copy
        }
    }

    // Create a deep copy of the word with NEW ID and RESET stats
    const newWord: Word = {
      ...wordToCopy,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      masteredDates: [],
      incorrectCount: 0
    };

    const updatedLists = allLists.map(l => {
      if (l.id === targetListId) {
        return {
          ...l,
          words: [...l.words, newWord]
        };
      }
      return l;
    });

    onUpdateGlobalLists(updatedLists);
    
    setCopyFeedback(`Copied to list!`);
    setTimeout(() => {
      setCopyFeedback(null);
      setIsCopyModalOpen(false);
      setCopyingWordData(null);
    }, 1000);
  };

  const handleCreateListAndCopy = (name: string, description: string) => {
    if (!copyingWordData) return;
    const wordToCopy = copyingWordData.word;

    const newWord: Word = {
      ...wordToCopy,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      masteredDates: [],
      incorrectCount: 0
    };

    const newList: WordList = {
      id: Date.now().toString(),
      name,
      description,
      words: [newWord],
      consolidationQueueIds: []
    };

    onUpdateGlobalLists([...allLists, newList]);
    
    // Feedback handling
    setCopyFeedback("List Created & Word Added!");
    setIsCreateListModalOpen(false);
    
    setTimeout(() => {
       setCopyFeedback(null);
       setIsCopyModalOpen(false);
       setCopyingWordData(null);
    }, 1500);
  };

  const handleDictionaryAdd = (result: DictionaryResult) => {
    const tempWord: Word = {
      id: 'dict-' + Date.now(),
      english: result.word,
      phonetic: result.phonetic,
      chinese: result.meaning,
      masteredDates: [],
      incorrectCount: 0
    };
    
    setCopyingWordData({ word: tempWord, sourceListId: '' });
    setIsCopyModalOpen(true);
  };

  const handleAddRelation = (result: DictionaryResult) => {
    if (!currentWord) return false;
    
    return addWordRelation(currentWord.english, result.word);
  };

  // --- Note Logic ---

  const handleOpenNote = () => {
    if (!currentWord) return;
    const existingNote = getNote(currentWord.english);
    setCurrentNote(existingNote);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = (content: string) => {
    if (!currentWord) return;
    saveNote(currentWord.english, content);
    setIsNoteModalOpen(false);
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

    if (mode === LearningMode.MEMORIZE) {
      incrementDailyCount(list.id);
      setDailyCount(prev => prev + 1);
    }

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

    if (mode === LearningMode.MEMORIZE) {
      incrementDailyCount(list.id);
      setDailyCount(prev => prev + 1);
    }

    nextCard();
  };

  // 5. Logic for "Still Don't Know" / "Not Recognized" (Bu Ren Shi) - Available in Pass Reveal
  const handleActionStillUnknown = () => {
    if (!currentWord) return;
    updateWordInList(currentWord.id, { incorrectCount: currentWord.incorrectCount + 1 }, true, false);
    
    if (mode === LearningMode.MEMORIZE) {
      incrementDailyCount(list.id);
      setDailyCount(prev => prev + 1);
    }

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
  
  // Calculate list progress statistics
  const totalWords = list.words.length;
  // Learned: Words currently in Queue OR Words that have been Mastered at least once
  const learnedCount = list.words.filter(w => list.consolidationQueueIds.includes(w.id) || w.masteredDates.length > 0).length;
  
  // What to show?
  const renderContent = () => {
    return (
      <div className="flex flex-col items-center text-center space-y-6 w-full">
        {/* Main Term */}
        <div className="mt-8">
           {isEnToZh ? (
             <h1 className="text-4xl md:text-5xl font-bold text-gray-800">{currentWord.english}</h1>
           ) : (
             <h1 className="text-4xl md:text-5xl font-bold text-gray-800">{currentWord.chinese}</h1>
           )}
        </div>

        {/* Phonetic - Show if En->Zh OR if Answer Revealed */}
        {(isEnToZh || !isQuestion) && (
           <div className="flex items-center gap-3 text-gray-500 text-lg">
             <span className="font-mono bg-gray-100 px-2 py-1 rounded">{currentWord.phonetic}</span>
           </div>
        )}

        {/* Definition / English - The "Answer" part */}
        {!isQuestion && (
          <div className="p-6 bg-indigo-50 rounded-xl w-full border border-indigo-100 animate-in slide-in-from-bottom-4 duration-300 relative">
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
        <div className="flex items-center gap-3">
            <div className="text-xs font-bold tracking-wider text-gray-400 uppercase">
              {mode} • {learnedCount} / {totalWords}
            </div>
            {mode === LearningMode.MEMORIZE && (
                 <div className="text-xs font-medium text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                    <Icon name="trending_up" className="text-[14px]" />
                    {dailyCount}
                 </div>
            )}
        </div>
        <div className="w-6" /> {/* Spacer */}
      </div>

      {/* Card Area */}
      <div className="flex-1 flex flex-col justify-center p-6 pb-24 relative">
         <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white p-8 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden group">
            
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />
            
            {/* Action Buttons (Only visible when definition is shown) */}
            {!isQuestion && (
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                {/* Dictionary Button - NEW */}
                <button
                  onClick={() => setIsDictionaryOpen(true)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  title="Dictionary"
                >
                  <Icon name="menu_book" className="text-2xl" />
                </button>
                {/* Add Note Button */}
                <button 
                  onClick={handleOpenNote}
                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                  title="Add Note"
                >
                  <Icon name="edit_note" className="text-2xl" />
                </button>
                {/* Add to Other List Button */}
                <button 
                  onClick={() => {
                      if(currentWord) {
                          setCopyingWordData({ word: currentWord, sourceListId: list.id });
                          setIsCopyModalOpen(true);
                      }
                  }}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  title="Add to another list"
                >
                  <Icon name="playlist_add" className="text-2xl" />
                </button>
              </div>
            )}

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

      {/* Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Word Note"
        maxWidth="max-w-4xl"
      >
        <div className="min-w-full md:min-w-[600px]">
          <NoteEditor 
            englishWord={currentWord?.english || ''}
            initialContent={currentNote}
            onSave={handleSaveNote}
            onCancel={() => setIsNoteModalOpen(false)}
          />
        </div>
      </Modal>

      {/* Dictionary Modal */}
      <DictionaryModal 
        isOpen={isDictionaryOpen} 
        onClose={() => setIsDictionaryOpen(false)}
        onAddWord={handleDictionaryAdd}
        currentLearningWord={currentWord?.english}
        onAddRelation={handleAddRelation}
      />

      {/* Copy to List Modal */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => {
           setIsCopyModalOpen(false);
           setCopyingWordData(null);
        }}
        title="Add to List"
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-4">
             Select a list to copy <strong>"{copyingWordData?.word.english}"</strong> into. 
             This will create a fresh copy with 0 errors and no mastery history.
          </p>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
             {allLists.filter(l => l.id !== copyingWordData?.sourceListId).map(l => (
                <button
                   key={l.id}
                   onClick={() => handleCopyWordToList(l.id)}
                   className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                >
                   <div className="min-w-0">
                      <div className="font-medium text-gray-800 group-hover:text-indigo-800 truncate">{l.name}</div>
                      <div className="text-xs text-gray-400 truncate">{l.words.length} words</div>
                   </div>
                   <Icon name="add" className="text-gray-300 group-hover:text-indigo-500" />
                </button>
             ))}
             {allLists.filter(l => l.id !== copyingWordData?.sourceListId).length === 0 && (
               <p className="text-center text-gray-400 py-2 text-sm">No other lists available.</p>
             )}
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100">
             <button
               onClick={() => setIsCreateListModalOpen(true)}
               className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
             >
               <Icon name="add_circle" />
               Create New List
             </button>
          </div>

          {copyFeedback && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10 animate-in fade-in">
                <div className="flex flex-col items-center text-emerald-600">
                   <Icon name={copyFeedback === 'Already in list' ? "error_outline" : "check_circle"} className="text-4xl mb-1" />
                   <span className="font-bold">{copyFeedback}</span>
                </div>
             </div>
          )}
        </div>
      </Modal>

      {/* Create List Modal (Nested) */}
      <Modal
         isOpen={isCreateListModalOpen}
         onClose={() => setIsCreateListModalOpen(false)}
         title="Create New List"
      >
         <ListEditor 
           onSave={handleCreateListAndCopy}
           onCancel={() => setIsCreateListModalOpen(false)}
         />
      </Modal>

    </div>
  );
};