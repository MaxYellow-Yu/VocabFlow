import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { searchDictionary, DictionaryResult } from '../services/dictionaryService';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (word: DictionaryResult) => void;
  // Optional: Only used when in Learning Session
  currentLearningWord?: string;
  onAddRelation?: (word: DictionaryResult) => boolean; // Return true if added, false if existed
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddWord,
  currentLearningWord,
  onAddRelation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<DictionaryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Focus input on open
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
      setResults([]);
      setError(null);
      setFeedback(null);
    }
  }, [isOpen]);

  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchDictionary(term);
      setResults(results);
    } catch (err: any) {
      console.error("Dictionary Search Error:", err);
      setError("Failed to search dictionary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    // Debounce search
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (term.trim().length > 0) {
      searchTimeoutRef.current = window.setTimeout(() => {
        performSearch(term);
      }, 500); // 500ms delay
    } else {
      setResults([]);
    }
  };

  const handleRelationClick = (item: DictionaryResult) => {
    if (onAddRelation) {
        const added = onAddRelation(item);
        setFeedback(added ? "Relation Added!" : "Already Related");
        setTimeout(() => setFeedback(null), 1000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dictionary Lookup" maxWidth="max-w-2xl">
      <div className="flex flex-col h-[60vh] relative">
        
        {/* Feedback Overlay */}
        {feedback && (
            <div className="absolute inset-0 z-10 bg-white/90 flex flex-col items-center justify-center animate-in fade-in rounded-xl">
                 <Icon name={feedback === "Relation Added!" ? "link" : "link_off"} className="text-4xl mb-2 text-indigo-600" />
                 <span className="text-xl font-bold text-gray-800">{feedback}</span>
            </div>
        )}

        {currentLearningWord && (
          <div className="mb-3 px-1 text-sm text-gray-500">
             Linking to: <span className="font-bold text-indigo-600">{currentLearningWord}</span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative mb-4">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="Type English or Chinese to search..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
             {isLoading ? <Icon name="hourglass_empty" className="animate-spin" /> : <Icon name="search" />}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50 rounded-xl border border-gray-100 p-2">
          {error && (
            <div className="p-4 text-center text-red-500">
              <Icon name="error_outline" className="text-3xl mb-2" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && searchTerm && results.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Icon name="search_off" className="text-4xl mb-2 text-gray-300" />
                <p>No matches found in database.</p>
             </div>
          )}

          {!isLoading && !searchTerm && (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Icon name="menu_book" className="text-4xl mb-2 text-gray-200" />
                <p>Enter a word to start searching.</p>
             </div>
          )}

          <div className="space-y-2">
            {results.map((item, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-200 transition-colors flex justify-between items-start group">
                 <div className="flex-1 min-w-0 pr-2">
                     <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg font-bold text-gray-800">{item.word}</span>
                        {item.phonetic && <span className="text-sm text-gray-500 font-mono">{item.phonetic}</span>}
                     </div>
                     <div className="text-gray-700">{item.meaning}</div>
                 </div>
                 
                 <div className="flex gap-2 shrink-0">
                    {/* Link Relation Button - Only if context exists */}
                    {currentLearningWord && onAddRelation && (
                      <button 
                        onClick={() => handleRelationClick(item)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        title={`Link "${item.word}" to "${currentLearningWord}"`}
                      >
                         <Icon name="link" className="text-lg" />
                      </button>
                    )}

                    {/* Add to List Button */}
                    <button 
                        onClick={() => onAddWord(item)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Add to List"
                    >
                        <Icon name="playlist_add" className="text-lg" />
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-2 text-right text-xs text-gray-400">
           {results.length > 0 ? `Found ${results.length} results` : 'Offline Dictionary'}
        </div>
      </div>
    </Modal>
  );
};