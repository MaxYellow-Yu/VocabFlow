import React, { useState, useEffect } from 'react';
import { WordList } from '../types';

interface ListEditorProps {
  initialList?: WordList;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}

export const ListEditor: React.FC<ListEditorProps> = ({ initialList, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialList) {
      setName(initialList.name);
      setDescription(initialList.description);
    }
  }, [initialList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name, description);
  };

  const inputClass = "w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all";
  const labelClass = "block text-sm font-medium text-gray-600 mt-4 first:mt-0";

  return (
    <form onSubmit={handleSubmit}>
      <label className={labelClass}>List Name</label>
      <input required value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="e.g. TOEFL Essential" />

      <label className={labelClass}>Description</label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} min-h-[100px]`} placeholder="Brief description of this vocabulary list..." />

      <div className="flex justify-end gap-3 mt-8">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">
          Cancel
        </button>
        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all font-medium">
          Save List
        </button>
      </div>
    </form>
  );
};