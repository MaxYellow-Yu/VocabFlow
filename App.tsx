import React, { useState, useEffect } from 'react';
import { WordList, LearningMode } from './types';
import { loadLists, saveLists } from './services/storageService';
import { initializeDictionary } from './services/dictionaryService';
import { Dashboard } from './views/Dashboard';
import { LearningSession } from './views/LearningSession';

const App: React.FC = () => {
  const [lists, setLists] = useState<WordList[]>([]);
  const [currentSession, setCurrentSession] = useState<{ listId: string; mode: LearningMode } | null>(null);

  useEffect(() => {
    const data = loadLists();
    setLists(data);
    
    // Preload dictionary database for faster lookups
    initializeDictionary();
  }, []);

  const handleUpdateLists = (newLists: WordList[]) => {
    setLists(newLists);
    saveLists(newLists);
  };

  const handleUpdateSingleList = (updatedList: WordList) => {
    const newLists = lists.map(l => l.id === updatedList.id ? updatedList : l);
    handleUpdateLists(newLists);
  };

  const startSession = (listId: string, mode: LearningMode) => {
    setCurrentSession({ listId, mode });
  };

  const endSession = () => {
    setCurrentSession(null);
  };

  if (currentSession) {
    const activeList = lists.find(l => l.id === currentSession.listId);
    if (activeList) {
      return (
        <LearningSession 
          list={activeList} 
          allLists={lists}
          mode={currentSession.mode} 
          onExit={endSession}
          onUpdateList={handleUpdateSingleList}
          onUpdateGlobalLists={handleUpdateLists}
        />
      );
    }
  }

  return (
    <Dashboard 
      lists={lists} 
      onSelectSession={startSession} 
      onUpdateLists={handleUpdateLists} 
    />
  );
};

export default App;