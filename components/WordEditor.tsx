import React, { useState, useEffect } from 'react';
import { Word } from '../types';
import { Icon } from './Icon';
import { lookupExactWord } from '../services/dictionaryService';

interface WordEditorProps {
  initialWord?: Word;
  onSave: (word: Omit<Word, 'id' | 'masteredDates' | 'incorrectCount'>) => void;
  onCancel: () => void;
}

export const WordEditor: React.FC<WordEditorProps> = ({ initialWord, onSave, onCancel }) => {
  const [english, setEnglish] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [chinese, setChinese] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    if (initialWord) {
      setEnglish(initialWord.english);
      setPhonetic(initialWord.phonetic);
      setChinese(initialWord.chinese);
    }
  }, [initialWord]);

  // Clear status when user types
  useEffect(() => {
    if (statusMsg) setStatusMsg(null);
  }, [english, phonetic, chinese]);

  const handleAutoFill = async () => {
    if (!english.trim()) return;
    
    setIsAutoFilling(true);
    setStatusMsg(null);
    try {
      const result = await lookupExactWord(english);

      if (result) {
        setChinese(result.meaning);
        setPhonetic(result.phonetic);
        setStatusMsg({ type: 'success', text: 'Auto-fill successful!' });
      } else {
        setStatusMsg({ type: 'error', text: `Word "${english}" not found in offline dictionary.` });
      }

    } catch (error: any) {
      console.error("Auto-fill error:", error);
      setStatusMsg({ type: 'error', text: `Auto-fill failed: ${error.message || 'Unknown error'}` });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ english, phonetic, chinese });
  };

  const inputClass = "w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all";
  const labelClass = "block text-sm font-medium text-gray-600 mt-4 first:mt-0";

  return (
    <form onSubmit={handleSubmit}>
      <label className={labelClass}>English</label>
      <div className="relative mt-1">
        <input 
          required 
          value={english} 
          onChange={e => setEnglish(e.target.value)} 
          className={`${inputClass} mt-0 pr-12`} 
          placeholder="e.g. Ephemeral" 
        />
        <button
          type="button"
          onClick={handleAutoFill}
          disabled={isAutoFilling || !english.trim()}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${
            isAutoFilling || !english.trim() 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'text-indigo-600 hover:bg-indigo-50'
          }`}
          title="Auto-fill from lookup.db" 
        >
          <Icon name={isAutoFilling ? "hourglass_empty" : "auto_fix_high"} className={isAutoFilling ? "animate-spin text-lg" : "text-xl"} />
        </button>
      </div>

      <label className={labelClass}>Phonetic</label>
      <input value={phonetic} onChange={e => setPhonetic(e.target.value)} className={inputClass} placeholder="e.g. /əˈfem.ər.əl/ (Empty for phrases)" />

      <label className={labelClass}>Definition & Part of Speech</label>
      <input required value={chinese} onChange={e => setChinese(e.target.value)} className={inputClass} placeholder="e.g. adj. 短暂的；转瞬即逝的" />

      {statusMsg && (
        <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 break-all ${
          statusMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          <Icon name={statusMsg.type === 'error' ? 'error_outline' : 'check_circle'} className="text-lg flex-shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-8">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">
          Cancel
        </button>
        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all font-medium">
          Save Word
        </button>
      </div>
    </form>
  );
};