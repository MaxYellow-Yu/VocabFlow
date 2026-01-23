import React, { useState, useRef } from 'react';
// @ts-ignore
import { read, utils } from 'xlsx';
import { WordList, LearningMode, Word } from '../types';
import { Icon } from '../components/Icon';
import { WordEditor } from '../components/WordEditor';
import { ListEditor } from '../components/ListEditor';
import { Modal } from '../components/Modal';
import { getRawDataJson, importRawDataJson, resetToDefaults } from '../services/storageService';

interface DashboardProps {
  lists: WordList[];
  onSelectSession: (listId: string, mode: LearningMode) => void;
  onUpdateLists: (lists: WordList[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ lists, onSelectSession, onUpdateLists }) => {
  const [expandedListId, setExpandedListId] = useState<string | null>(lists[0]?.id || null);
  
  // Word Modal State
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);
  const [targetListId, setTargetListId] = useState<string | null>(null);

  // List Modal State
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<WordList | undefined>(undefined);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Excel Import State
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [importTargetId, setImportTargetId] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'list' | 'word', listId: string, wordId?: string } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedListId(prev => prev === id ? null : id);
  };

  // --- Data Management ---
  const handleExportData = () => {
    const jsonString = getRawDataJson();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `vocabflow_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importRawDataJson(content);
        if (success) {
          alert('Data restored successfully! The page will refresh.');
          window.location.reload();
        } else {
          alert('Failed to import data. Please ensure the file is a valid VocabFlow backup.');
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetData = () => {
    if (confirm("Are you sure? This will delete all your custom data and restore the default demo data.")) {
        resetToDefaults();
        window.location.reload();
    }
  };

  // --- Excel Import Logic ---
  
  const handleImportExcelClick = (listId: string) => {
    setImportTargetId(listId);
    if (excelInputRef.current) {
      excelInputRef.current.value = ''; // Clear previous selection
      excelInputRef.current.click();
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importTargetId) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      // @ts-ignore
      const wb = read(arrayBuffer);
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      // Get raw data as array of arrays [ ['English', 'Phonetic', 'Chinese'], ... ]
      // @ts-ignore
      const data: any[][] = utils.sheet_to_json(sheet, { header: 1 });

      const newWords: Word[] = [];
      const now = Date.now();

      // Iterate rows. Start from 0, check if it's a header. 
      // If row[0] is 'English' or similar, we might skip it, but simplest is to just import everything that looks like a word.
      data.forEach((row, index) => {
        // Ensure row has at least an English word (column 0)
        if (!row[0] || typeof row[0] !== 'string') return;
        
        // Simple heuristic to skip header row "English"
        if (row[0].toLowerCase() === 'english' && index === 0) return;

        const word: Word = {
          id: `${now}-${index}-${Math.random().toString(36).substr(2, 5)}`, // Unique ID
          english: String(row[0]).trim(),
          phonetic: row[1] ? String(row[1]).trim() : '',
          chinese: row[2] ? String(row[2]).trim() : '', // Merged meaning/pos
          masteredDates: [],
          incorrectCount: 0
        };
        newWords.push(word);
      });

      if (newWords.length > 0) {
        const updatedLists = lists.map(list => {
          if (list.id === importTargetId) {
            return {
              ...list,
              words: [...list.words, ...newWords]
            };
          }
          return list;
        });
        onUpdateLists(updatedLists);
        // Clean up
        setImportTargetId(null);
        // Optional: Provide visual feedback without standard alert
        console.log(`Imported ${newWords.length} words.`);
      }
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      alert("Failed to parse Excel file. Please ensure it has 3 columns: English, Phonetic, Meaning.");
    }
  };


  // --- List Management ---

  const handleCreateListClick = () => {
    setEditingList(undefined);
    setIsListModalOpen(true);
  };

  const handleEditListClick = (e: React.MouseEvent, list: WordList) => {
    e.stopPropagation();
    setEditingList(list);
    setIsListModalOpen(true);
  };

  const saveList = (name: string, description: string) => {
    if (editingList) {
      // Edit existing
      const updatedLists = lists.map(l => 
        l.id === editingList.id ? { ...l, name, description } : l
      );
      onUpdateLists(updatedLists);
    } else {
      // Create new
      const newList: WordList = {
        id: Date.now().toString(),
        name,
        description,
        words: [],
        consolidationQueueIds: []
      };
      onUpdateLists([...lists, newList]);
    }
    setIsListModalOpen(false);
  };

  const handleDeleteListClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmation({ type: 'list', listId: id });
  };

  // --- Word Management ---

  const handleAddWordClick = (listId: string) => {
    setTargetListId(listId);
    setEditingWord(undefined);
    setIsWordModalOpen(true);
  };

  const handleEditWordClick = (listId: string, word: Word) => {
    setTargetListId(listId);
    setEditingWord(word);
    setIsWordModalOpen(true);
  };

  const handleDeleteWordClick = (listId: string, wordId: string) => {
    setDeleteConfirmation({ type: 'word', listId, wordId });
  };

  const saveWord = (wordData: Omit<Word, 'id' | 'masteredDates' | 'incorrectCount'>) => {
    if (!targetListId) return;
    const listIndex = lists.findIndex(l => l.id === targetListId);
    if (listIndex === -1) return;
    
    const newLists = [...lists];
    const currentList = { ...newLists[listIndex] };

    if (editingWord) {
      // Edit
      currentList.words = currentList.words.map(w => 
        w.id === editingWord.id ? { ...w, ...wordData } : w
      );
    } else {
      // Add
      const newWord: Word = {
        id: Date.now().toString(),
        ...wordData,
        masteredDates: [],
        incorrectCount: 0,
      };
      currentList.words = [...currentList.words, newWord];
    }
    
    newLists[listIndex] = currentList;
    onUpdateLists(newLists);
    setIsWordModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.type === 'list') {
      onUpdateLists(lists.filter(l => l.id !== deleteConfirmation.listId));
    } else if (deleteConfirmation.type === 'word' && deleteConfirmation.wordId) {
       const listIndex = lists.findIndex(l => l.id === deleteConfirmation.listId);
       if (listIndex !== -1) {
         const newList = { ...lists[listIndex] };
         newList.words = newList.words.filter(w => w.id !== deleteConfirmation.wordId);
         newList.consolidationQueueIds = newList.consolidationQueueIds.filter(id => id !== deleteConfirmation.wordId);
         const newLists = [...lists];
         newLists[listIndex] = newList;
         onUpdateLists(newLists);
       }
    }
    setDeleteConfirmation(null);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      <header className="mb-8 mt-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">VocabFlow</h1>
          <p className="text-gray-500 mt-1">Spaced Repetition System</p>
        </div>
        <div className="flex gap-3">
          <button 
             onClick={() => setIsSettingsOpen(true)}
             className="flex items-center justify-center p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
             title="Settings & Data"
          >
             <Icon name="settings" />
          </button>
          <button 
            onClick={handleCreateListClick}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
          >
            <Icon name="add" className="text-lg" />
            <span>New List</span>
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {lists.map(list => {
          const isExpanded = expandedListId === list.id;
          const total = list.words.length;
          const mastered = list.words.filter(w => w.masteredDates.length > 0).length;
          const queueSize = list.consolidationQueueIds.length;

          return (
            <div key={list.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
              {/* List Header Card */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => toggleExpand(list.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{list.name}</h2>
                    <p className="text-sm text-gray-400">{list.description}</p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={(e) => handleEditListClick(e, list)} className="text-gray-300 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors">
                        <Icon name="edit" />
                     </button>
                     <button onClick={(e) => handleDeleteListClick(e, list.id)} className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors">
                        <Icon name="delete" />
                     </button>
                     <Icon name={isExpanded ? "expand_less" : "expand_more"} className="text-gray-400 p-2" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${total > 0 ? (mastered / total) * 100 : 0}%` }} 
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => onSelectSession(list.id, LearningMode.MEMORIZE)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors font-semibold"
                  >
                    <Icon name="psychology" />
                    Memorize
                  </button>
                  <button 
                     onClick={() => onSelectSession(list.id, LearningMode.CONSOLIDATE)}
                     disabled={queueSize === 0}
                     className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors ${queueSize > 0 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                  >
                    <Icon name="fitness_center" />
                    Review Queue ({queueSize})
                  </button>
                  <button 
                     onClick={() => onSelectSession(list.id, LearningMode.REVIEW)}
                     className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors font-semibold"
                  >
                    <Icon name="history" />
                    Ebbinghaus
                  </button>
                </div>
              </div>

              {/* Word List (Expanded) */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                   <div className="flex justify-between items-center mb-4 px-2">
                      <h3 className="font-semibold text-gray-600">Word List ({total})</h3>
                      <div className="flex gap-3">
                         <button 
                            onClick={() => handleImportExcelClick(list.id)}
                            className="flex items-center gap-1 text-sm text-gray-500 font-medium hover:text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
                            title="Import Excel file (Column 1: English, 2: Phonetic, 3: Definition)"
                         >
                            <Icon name="post_add" className="text-lg" />
                            Import Excel
                         </button>
                         <button onClick={() => handleAddWordClick(list.id)} className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:bg-indigo-50 px-2 py-1 rounded transition-colors">
                            <Icon name="add" className="text-lg" />
                            Add Word
                         </button>
                      </div>
                   </div>
                   <div className="space-y-2">
                      {list.words.length === 0 ? (
                        <div className="text-center text-gray-400 py-4 text-sm">
                            No words yet.<br/>
                            Add words manually or import an Excel file.
                        </div>
                      ) : (
                        list.words.map(word => (
                          <div key={word.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center group">
                            <div>
                               <div className="font-bold text-gray-800">
                                 {word.english} 
                                 <span className="text-xs font-normal text-gray-400 ml-2">{word.phonetic}</span>
                               </div>
                               <div className="text-sm text-gray-500">{word.chinese}</div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => handleEditWordClick(list.id, word)} className="p-1 text-gray-400 hover:text-indigo-600">
                                 <Icon name="edit" className="text-lg" />
                               </button>
                               <button onClick={() => handleDeleteWordClick(list.id, word.id)} className="p-1 text-gray-400 hover:text-red-500">
                                 <Icon name="delete" className="text-lg" />
                               </button>
                            </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden Excel Input */}
      <input 
        type="file" 
        ref={excelInputRef}
        className="hidden" 
        accept=".xlsx, .xls"
        onChange={handleExcelFileChange}
      />

      {/* Word Editor Modal */}
      <Modal 
        isOpen={isWordModalOpen} 
        onClose={() => setIsWordModalOpen(false)} 
        title={editingWord ? "Edit Word" : "Add New Word"}
      >
        <WordEditor 
          initialWord={editingWord} 
          onSave={saveWord} 
          onCancel={() => setIsWordModalOpen(false)} 
        />
      </Modal>

      {/* List Editor Modal */}
      <Modal 
        isOpen={isListModalOpen} 
        onClose={() => setIsListModalOpen(false)} 
        title={editingList ? "Edit List" : "Create New List"}
      >
        <ListEditor 
          initialList={editingList} 
          onSave={saveList} 
          onCancel={() => setIsListModalOpen(false)} 
        />
      </Modal>

      {/* Settings Modal */}
      <Modal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        title="Data & Settings"
      >
        <div className="space-y-6">
           <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Backup & Restore</h3>
              <p className="text-sm text-gray-500 mb-4">
                 Your data is stored locally in your browser. To prevent data loss when switching devices or clearing cache, please export a backup regularly.
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={handleExportData}
                   className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
                 >
                    <Icon name="download" />
                    Export Backup
                 </button>
                 <button 
                   onClick={handleImportClick}
                   className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                 >
                    <Icon name="upload" />
                    Import Backup
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleFileChange}
                 />
              </div>
           </div>

           <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Danger Zone</h3>
              <button 
                 onClick={handleResetData}
                 className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
              >
                 <Icon name="delete_forever" />
                 Reset All Data
              </button>
           </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this {deleteConfirmation?.type}? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
             <button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
             <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md shadow-red-200 font-medium">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};