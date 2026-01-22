import React, { useState, useEffect } from 'react';
import { Word } from '../types';

interface WordEditorProps {
  initialWord?: Word;
  onSave: (word: Omit<Word, 'id' | 'masteredDates' | 'incorrectCount'>) => void;
  onCancel: () => void;
}

export const WordEditor: React.FC<WordEditorProps> = ({ initialWord, onSave, onCancel }) => {
  const [english, setEnglish] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [chinese, setChinese] = useState('');

  useEffect(() => {
    if (initialWord) {
      setEnglish(initialWord.english);
      setPhonetic(initialWord.phonetic);
      setPartOfSpeech(initialWord.partOfSpeech);
      setChinese(initialWord.chinese);
    }
  }, [initialWord]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ english, phonetic, partOfSpeech, chinese });
  };

  const inputClass = "w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all";
  const labelClass = "block text-sm font-medium text-gray-600 mt-4 first:mt-0";

  return (
    <form onSubmit={handleSubmit}>
      <label className={labelClass}>English</label>
      <input required value={english} onChange={e => setEnglish(e.target.value)} className={inputClass} placeholder="e.g. Ephemeral" />

      <label className={labelClass}>Phonetic</label>
      <input value={phonetic} onChange={e => setPhonetic(e.target.value)} className={inputClass} placeholder="e.g. /əˈfem.ər.əl/" />

      <label className={labelClass}>Part of Speech</label>
      <input value={partOfSpeech} onChange={e => setPartOfSpeech(e.target.value)} className={inputClass} placeholder="e.g. adj." />

      <label className={labelClass}>Chinese Definition</label>
      <input required value={chinese} onChange={e => setChinese(e.target.value)} className={inputClass} placeholder="e.g. 短暂的" />

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