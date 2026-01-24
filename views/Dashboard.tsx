import React, { useState, useRef } from 'react';
// @ts-ignore
import { read, utils } from 'xlsx';
import { WordList, LearningMode, Word } from '../types';
import { Icon } from '../components/Icon';
import { WordEditor } from '../components/WordEditor';
import { ListEditor } from '../components/ListEditor';
import { Modal } from '../components/Modal';
import { getRawDataJson, importRawDataJson, resetToDefaults, getNextReviewTime } from '../services/storageService';

interface DashboardProps {
  lists: WordList[];
  onSelectSession: (listId: string, mode: LearningMode) => void;
  onUpdateLists: (lists: WordList[]) => void;
}

type TabType = 'new' | 'queue' | 'mastered';

export const Dashboard: React.FC<DashboardProps> = ({ lists, onSelectSession, onUpdateLists }) => {
  const [expandedListId, setExpandedListId] = useState<string | null>(lists[0]?.id || null);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  
  // Sorting preference for Mastered list
  const [masteredSortBy, setMasteredSortBy] = useState<'time' | 'count'>('time');

  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Word Modal State
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);
  const [targetListId, setTargetListId] = useState<string | null>(null);

  // Copy Word State
  const [copyingWordData, setCopyingWordData] = useState<{ word: Word, sourceListId: string } | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isCopyCreateListModalOpen, setIsCopyCreateListModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // List Modal State
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<WordList | undefined>(undefined);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importListInputRef = useRef<HTMLInputElement>(null);

  // Excel Import State
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [importTargetId, setImportTargetId] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'list' | 'word', listId: string, wordId?: string } | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedListId === id) {
      setExpandedListId(null);
    } else {
      setExpandedListId(id);
      setActiveTab('new'); // Reset tab when opening a new list
    }
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    // Set opacity or effect if needed, usually browser handles ghost image
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault();
    dragOverItem.current = position;

    // Live reordering logic
    if (dragItem.current !== null && dragItem.current !== position) {
      const newList = [...lists];
      const draggedItemContent = newList[dragItem.current];
      
      // Remove from old pos
      newList.splice(dragItem.current, 1);
      // Insert at new pos
      newList.splice(position, 0, draggedItemContent);
      
      // Update ref to track the item's new position
      dragItem.current = position;
      
      // Update state
      onUpdateLists(newList);
    }
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Necessary to allow dropping
    e.preventDefault();
  };

  // --- Helpers for Display ---

  const formatTimeUntil = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return "Due now";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 1) return `${days} Days`;
    if (days === 1) return `1 Day`;
    if (hours > 0) return `${hours} Hours`;
    return "< 1 Hour";
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportSingleList = (list: WordList) => {
    const jsonString = JSON.stringify(list, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    a.download = `vocabflow_list_${safeName}_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportListClick = () => {
    importListInputRef.current?.click();
  };

  const handleImportListFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content);

            // Basic Validation
            if (!parsed.name || !Array.isArray(parsed.words)) {
                throw new Error("Invalid list format");
            }

            // Create new list with unique ID
            const newList: WordList = {
                ...parsed,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                consolidationQueueIds: Array.isArray(parsed.consolidationQueueIds) ? parsed.consolidationQueueIds : []
            };

            onUpdateLists([...lists, newList]);
            alert(`List "${newList.name}" imported successfully!`);
        } catch (error) {
            console.error("Import error:", error);
            alert("Failed to import list. Please ensure the file is a valid JSON list export.");
        }
    };
    reader.readAsText(file);
    if (importListInputRef.current) importListInputRef.current.value = '';
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
      // @ts-ignore
      const data: any[][] = utils.sheet_to_json(sheet, { header: 1 });

      const newWords: Word[] = [];
      const now = Date.now();

      data.forEach((row, index) => {
        if (!row[0] || typeof row[0] !== 'string') return;
        if (row[0].toLowerCase() === 'english' && index === 0) return;

        const word: Word = {
          id: `${now}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          english: String(row[0]).trim(),
          phonetic: row[1] ? String(row[1]).trim() : '',
          chinese: row[2] ? String(row[2]).trim() : '',
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
        setImportTargetId(null);
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
      const updatedLists = lists.map(l => 
        l.id === editingList.id ? { ...l, name, description } : l
      );
      onUpdateLists(updatedLists);
    } else {
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

  // --- Copy Word Logic ---

  const handleCopyInit = (word: Word, sourceListId: string) => {
    setCopyingWordData({ word, sourceListId });
    setIsCopyModalOpen(true);
  };

  const handleCopyWordToList = (targetListId: string) => {
    if (!copyingWordData) return;

    const newWord: Word = {
      ...copyingWordData.word,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      masteredDates: [],
      incorrectCount: 0
    };

    const updatedLists = lists.map(l => {
      if (l.id === targetListId) {
        return {
          ...l,
          words: [...l.words, newWord]
        };
      }
      return l;
    });

    onUpdateLists(updatedLists);
    
    setCopyFeedback(`Copied to list!`);
    setTimeout(() => {
      setCopyFeedback(null);
      setIsCopyModalOpen(false);
      setCopyingWordData(null);
    }, 1000);
  };

  const handleCreateListAndCopy = (name: string, description: string) => {
    if (!copyingWordData) return;

    const newWord: Word = {
      ...copyingWordData.word,
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

    onUpdateLists([...lists, newList]);
    setIsCopyCreateListModalOpen(false);
    setIsCopyModalOpen(false);
    setCopyingWordData(null);
    alert(`List "${name}" created and word added!`);
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
      currentList.words = currentList.words.map(w => 
        w.id === editingWord.id ? { ...w, ...wordData } : w
      );
    } else {
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

  const WordItem = ({ word, listId, subtitle }: { word: Word, listId: string, subtitle?: React.ReactNode }) => (
    <div className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center group hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-800 truncate">{word.english}</span>
            {word.phonetic && <span className="text-xs font-normal text-gray-400 font-mono truncate hidden sm:inline">{word.phonetic}</span>}
          </div>
          <div className="text-sm text-gray-500 truncate">{word.chinese}</div>
          {subtitle}
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => handleCopyInit(word, listId)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Copy to another list">
            <Icon name="playlist_add" className="text-lg" />
          </button>
          <button onClick={() => handleEditWordClick(listId, word)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
            <Icon name="edit" className="text-lg" />
          </button>
          <button onClick={() => handleDeleteWordClick(listId, word.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
            <Icon name="delete" className="text-lg" />
          </button>
      </div>
    </div>
  );

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
        {lists.map((list, index) => {
          const isExpanded = expandedListId === list.id;
          const total = list.words.length;
          const masteredCount = list.words.filter(w => w.masteredDates.length > 0).length;
          const queueSize = list.consolidationQueueIds.length;

          // --- Classification & Sorting Logic ---
          
          // 1. Unlearned: No mastery dates AND not in queue (fresh words)
          const unlearnedWords = list.words.filter(w => w.masteredDates.length === 0 && !list.consolidationQueueIds.includes(w.id));
          // Keep original order

          // 2. Review Queue: ID is in queue list
          const queueWords = list.words
              .filter(w => list.consolidationQueueIds.includes(w.id))
              .sort((a, b) => b.incorrectCount - a.incorrectCount); // Sort by incorrect count descending

          // 3. Mastered: Has mastery dates AND not in queue
          const masteredWords = list.words
              .filter(w => w.masteredDates.length > 0 && !list.consolidationQueueIds.includes(w.id))
              .sort((a, b) => {
                  if (masteredSortBy === 'count') {
                      return b.incorrectCount - a.incorrectCount;
                  }
                  // Default: Time (Soonest review first)
                  return getNextReviewTime(a) - getNextReviewTime(b);
              });

          return (
            <div 
              key={list.id} 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 group/list"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
            >
              {/* List Header Card */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors relative"
                onClick={() => toggleExpand(list.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div 
                      className="text-gray-300 cursor-move hover:text-gray-500 transition-colors mt-1" 
                      title="Drag to reorder"
                      onClick={(e) => e.stopPropagation()} // Prevent expansion when clicking drag handle
                    >
                      <Icon name="drag_indicator" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{list.name}</h2>
                      <p className="text-sm text-gray-400">{list.description}</p>
                    </div>
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
                    style={{ width: `${total > 0 ? (masteredCount / total) * 100 : 0}%` }} 
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

              {/* Expanded Detailed View */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 pb-8 min-h-[400px] cursor-default" onClick={e => e.stopPropagation()}>
                   
                   {/* ACTION BUTTONS MOVED ABOVE TABS */}
                   <div className="flex justify-end gap-3 mb-4">
                      <button 
                        onClick={() => handleExportSingleList(list)}
                        className="flex items-center gap-1 text-sm text-gray-600 font-medium hover:text-indigo-700 hover:bg-white px-3 py-2 rounded-lg border border-transparent hover:border-gray-200 transition-all shadow-sm"
                        title="Export this list as JSON"
                      >
                        <Icon name="download" className="text-lg" />
                        Export JSON
                      </button>
                      <button 
                        onClick={() => handleImportExcelClick(list.id)}
                        className="flex items-center gap-1 text-sm text-gray-600 font-medium hover:text-emerald-700 hover:bg-white px-3 py-2 rounded-lg border border-transparent hover:border-gray-200 transition-all shadow-sm"
                      >
                        <Icon name="post_add" className="text-lg" />
                        Import Excel
                      </button>
                      <button onClick={() => handleAddWordClick(list.id)} className="flex items-center gap-1 text-sm text-white bg-gray-900 font-medium hover:bg-gray-800 px-3 py-2 rounded-lg shadow-md transition-all">
                        <Icon name="add" className="text-lg" />
                        Add Word
                      </button>
                   </div>

                   {/* Tabs Header */}
                   <div className="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
                     <button 
                       onClick={() => setActiveTab('new')}
                       className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'new' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                     >
                       <Icon name="fiber_new" />
                       New Words <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 ml-1">{unlearnedWords.length}</span>
                     </button>
                     <button 
                       onClick={() => setActiveTab('queue')}
                       className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'queue' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                     >
                       <Icon name="loop" />
                       Review Queue <span className="text-xs bg-amber-50 px-2 py-0.5 rounded-full text-amber-600 ml-1">{queueWords.length}</span>
                     </button>
                     <button 
                       onClick={() => setActiveTab('mastered')}
                       className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'mastered' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                     >
                       <Icon name="verified" />
                       Mastered <span className="text-xs bg-emerald-50 px-2 py-0.5 rounded-full text-emerald-600 ml-1">{masteredWords.length}</span>
                     </button>
                   </div>

                   {/* Description - Context aware */}
                   <div className="flex justify-between items-center mb-6">
                      <div className="text-sm text-gray-500 hidden sm:block">
                        {activeTab === 'new' && "Words waiting to be learned."}
                        {activeTab === 'queue' && "Words you struggled with."}
                        {activeTab === 'mastered' && "Words you have learned."}
                      </div>
                   </div>

                   {/* Tab Content */}
                   <div className="space-y-2 animate-in fade-in duration-300">
                      
                      {/* TAB: NEW WORDS */}
                      {activeTab === 'new' && (
                        <>
                          {unlearnedWords.length === 0 ? (
                             <div className="text-center py-12 text-gray-400">
                               <Icon name="check_circle" className="text-4xl mb-2 text-gray-200" />
                               <p>No new words available.</p>
                             </div>
                          ) : (
                             unlearnedWords.map(word => (
                               <WordItem key={word.id} word={word} listId={list.id} />
                             ))
                          )}
                        </>
                      )}

                      {/* TAB: REVIEW QUEUE */}
                      {activeTab === 'queue' && (
                        <>
                          {queueWords.length === 0 ? (
                             <div className="text-center py-12 text-gray-400">
                               <Icon name="thumb_up" className="text-4xl mb-2 text-gray-200" />
                               <p>Your review queue is empty!</p>
                             </div>
                          ) : (
                             queueWords.map(word => (
                               <WordItem 
                                 key={word.id} 
                                 word={word} 
                                 listId={list.id}
                                 subtitle={
                                   <div className="flex gap-2 mt-1">
                                      {word.incorrectCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                            {word.incorrectCount} Errors
                                        </span>
                                      )}
                                   </div>
                                 } 
                               />
                             ))
                          )}
                        </>
                      )}

                      {/* TAB: MASTERED */}
                      {activeTab === 'mastered' && (
                        <>
                          {masteredWords.length > 0 && (
                            <div className="flex justify-end mb-2">
                                <button 
                                   onClick={() => setMasteredSortBy(prev => prev === 'time' ? 'count' : 'time')}
                                   className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                >
                                   <Icon name="sort" className="text-sm" />
                                   Sort by: {masteredSortBy === 'time' ? 'Review Date' : 'Errors'}
                                </button>
                            </div>
                          )}

                          {masteredWords.length === 0 ? (
                             <div className="text-center py-12 text-gray-400">
                               <Icon name="school" className="text-4xl mb-2 text-gray-200" />
                               <p>No words mastered yet. Start learning!</p>
                             </div>
                          ) : (
                             masteredWords.map(word => {
                               const nextReview = getNextReviewTime(word);
                               const timeLabel = formatTimeUntil(nextReview);
                               const isDue = Date.now() >= nextReview;

                               return (
                                 <WordItem 
                                   key={word.id} 
                                   word={word} 
                                   listId={list.id} 
                                   subtitle={
                                     <div className="flex flex-wrap gap-2 mt-1">
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${isDue ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                           <Icon name="schedule" className="text-[10px]" />
                                           Next: {timeLabel}
                                        </span>
                                        {word.incorrectCount > 0 && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                                              {word.incorrectCount} Errors
                                          </span>
                                        )}
                                     </div>
                                   }
                                 />
                               );
                             })
                          )}
                        </>
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
              <h3 className="text-lg font-medium text-gray-800 mb-2">List Management</h3>
               <button 
                 onClick={handleImportListClick}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
               >
                  <Icon name="playlist_add" />
                  Import List from JSON
               </button>
               <input 
                    type="file" 
                    ref={importListInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleImportListFileChange}
               />
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
             {lists.filter(l => l.id !== copyingWordData?.sourceListId).map(l => (
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
             {lists.filter(l => l.id !== copyingWordData?.sourceListId).length === 0 && (
               <p className="text-center text-gray-400 py-2 text-sm">No other lists available.</p>
             )}
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100">
             <button
               onClick={() => setIsCopyCreateListModalOpen(true)}
               className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
             >
               <Icon name="add_circle" />
               Create New List
             </button>
          </div>

          {copyFeedback && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10 animate-in fade-in">
                <div className="flex flex-col items-center text-emerald-600">
                   <Icon name="check_circle" className="text-4xl mb-1" />
                   <span className="font-bold">{copyFeedback}</span>
                </div>
             </div>
          )}
        </div>
      </Modal>

      {/* Create List Modal (For Copying) */}
      <Modal
         isOpen={isCopyCreateListModalOpen}
         onClose={() => setIsCopyCreateListModalOpen(false)}
         title="Create New List"
      >
         <ListEditor 
           onSave={handleCreateListAndCopy}
           onCancel={() => setIsCopyCreateListModalOpen(false)}
         />
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