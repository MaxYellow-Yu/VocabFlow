import { WordList, Word } from '../types';

const STORAGE_KEY = 'vocabflow_data';
const HISTORY_KEY = 'vocabflow_history'; // Changed from DAILY_STATS_KEY
const NOTES_KEY = 'vocabflow_notes';
const RELATIONS_KEY = 'vocabflow_relations';

const DEFAULT_DATA: WordList[] = [
  {
    id: 'list-1',
    name: 'CET-4 Core',
    description: 'Essential words for College English Test Band 4',
    consolidationQueueIds: [],
    words: [
      {
        id: 'w1',
        english: 'abandon',
        phonetic: '/əˈbændən/',
        chinese: 'v. 放弃，遗弃；抛弃',
        masteredDates: [],
        incorrectCount: 0,
      },
      {
        id: 'w2',
        english: 'absolute',
        phonetic: '/ˈæbsəluːt/',
        chinese: 'adj. 绝对的；完全的',
        masteredDates: [],
        incorrectCount: 0,
      },
      {
        id: 'w3',
        english: 'abundant',
        phonetic: '/əˈbʌndənt/',
        chinese: 'adj. 丰富的；充裕的',
        masteredDates: [],
        incorrectCount: 0,
      }
    ],
  },
];

export const loadLists = (): WordList[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : DEFAULT_DATA;
};

export const saveLists = (lists: WordList[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
};

// --- Data Management Helpers ---

// Modified: Exports both Lists and History
export const getRawDataJson = (): string => {
  const listsData = localStorage.getItem(STORAGE_KEY);
  const historyData = localStorage.getItem(HISTORY_KEY);
  
  const exportData = {
    version: 2,
    lists: listsData ? JSON.parse(listsData) : DEFAULT_DATA,
    history: historyData ? JSON.parse(historyData) : {}
  };

  return JSON.stringify(exportData);
};

// Modified: Imports both Lists and History (Supports legacy array format)
export const importRawDataJson = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Check if it's the new bundled format
    if (parsed.lists && parsed.history) {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.lists));
       localStorage.setItem(HISTORY_KEY, JSON.stringify(parsed.history));
       return true;
    }
    
    // Legacy support: Check if it's just an array of lists
    if (Array.isArray(parsed) && parsed.length > 0 && 'words' in parsed[0]) {
      localStorage.setItem(STORAGE_KEY, jsonString);
      // If importing legacy lists only, we keep existing history or init empty
      if (!localStorage.getItem(HISTORY_KEY)) {
        localStorage.setItem(HISTORY_KEY, '{}');
      }
      return true;
    }
  } catch (e) {
    console.error("Invalid JSON", e);
  }
  return false;
};

export const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(NOTES_KEY);
    localStorage.removeItem(RELATIONS_KEY);
}

// Ebbinghaus Intervals in milliseconds (approximate for demo)
const INTERVALS = [
  1 * 24 * 60 * 60 * 1000, // 1 day
  2 * 24 * 60 * 60 * 1000, // 2 days
  4 * 24 * 60 * 60 * 1000, // 4 days
  7 * 24 * 60 * 60 * 1000, // 7 days
  15 * 24 * 60 * 60 * 1000, // 15 days
];

// Helper to get the exact timestamp when the next review is due
export const getNextReviewTime = (word: Word): number => {
  if (word.masteredDates.length === 0) return 0;
  
  const stage = word.masteredDates.length - 1;
  // If mastered more times than intervals defined, default to 30 days
  const interval = stage < INTERVALS.length ? INTERVALS[stage] : 30 * 24 * 60 * 60 * 1000;
  
  const lastMastered = word.masteredDates[word.masteredDates.length - 1];
  return lastMastered + interval;
};

export const isDueForReview = (word: Word): boolean => {
  if (word.masteredDates.length === 0) return false;
  const nextReview = getNextReviewTime(word);
  return Date.now() >= nextReview;
};

// --- Daily History Logic (Beijing Time) ---

// Structure: { [listId: string]: { [date: string]: number } }
interface HistoryData {
  [listId: string]: Record<string, number>;
}

// Helper to get Beijing Date String (YYYY-MM-DD)
const getBeijingDateString = (): string => {
  const now = new Date();
  // Beijing is UTC+8
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const beijingTime = new Date(utc + (3600000 * 8));
  
  const year = beijingTime.getFullYear();
  const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const getHistoryData = (): HistoryData => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Error reading history", e);
    return {};
  }
};

export const getDailyCount = (listId: string): number => {
  const history = getHistoryData();
  const today = getBeijingDateString();
  return history[listId]?.[today] || 0;
};

export const incrementDailyCount = (listId: string) => {
  try {
    const history = getHistoryData();
    const today = getBeijingDateString();
    
    if (!history[listId]) {
      history[listId] = {};
    }
    
    history[listId][today] = (history[listId][today] || 0) + 1;
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Error updating history stats", e);
  }
};

export const getListHistory = (listId: string): Record<string, number> => {
  const history = getHistoryData();
  return history[listId] || {};
};

// NEW: Helper to merge history for a single list (used when importing a list)
export const mergeListHistory = (listId: string, newListHistory: Record<string, number>) => {
  try {
    const history = getHistoryData();
    // Overwrite history for this specific list ID with the imported data
    history[listId] = newListHistory;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Error merging list history", e);
  }
};

// --- Notes Logic ---

export const getNote = (englishWord: string): string => {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) {
      const notes = JSON.parse(raw);
      // Use lowercase key for normalization
      return notes[englishWord.trim().toLowerCase()] || '';
    }
  } catch (e) {
    console.error("Error reading note", e);
  }
  return '';
};

export const saveNote = (englishWord: string, content: string) => {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const notes = raw ? JSON.parse(raw) : {};
    
    const key = englishWord.trim().toLowerCase();
    
    if (content.trim() === '') {
      delete notes[key];
    } else {
      notes[key] = content;
    }
    
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error("Error saving note", e);
  }
};

// Modified: Exports both Notes and Relations
export const getNotesJson = (): string => {
  const notes = localStorage.getItem(NOTES_KEY);
  const relations = localStorage.getItem(RELATIONS_KEY);
  
  const exportData = {
    version: 2,
    notes: notes ? JSON.parse(notes) : {},
    relations: relations ? JSON.parse(relations) : []
  };

  return JSON.stringify(exportData);
};

// Modified: Imports both Notes and Relations (Supports legacy format)
export const importNotesJson = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);

    // New format with relations
    if (parsed.notes && Array.isArray(parsed.relations)) {
      localStorage.setItem(NOTES_KEY, JSON.stringify(parsed.notes));
      localStorage.setItem(RELATIONS_KEY, JSON.stringify(parsed.relations));
      return true;
    }

    // Legacy format (just the notes object)
    if (typeof parsed === 'object' && parsed !== null && !parsed.notes) {
      localStorage.setItem(NOTES_KEY, jsonString);
      // Keep existing relations or init empty
      if (!localStorage.getItem(RELATIONS_KEY)) {
         localStorage.setItem(RELATIONS_KEY, '[]');
      }
      return true;
    }
  } catch (e) {
    console.error("Invalid Notes JSON", e);
  }
  return false;
};

// --- Relations Logic ---

// Returns array of [wordA, wordB]
const getRelationsData = (): [string, string][] => {
  try {
    const raw = localStorage.getItem(RELATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error reading relations", e);
    return [];
  }
};

// Adds a relation between two words if it doesn't exist
export const addWordRelation = (word1: string, word2: string): boolean => {
  const w1 = word1.trim().toLowerCase();
  const w2 = word2.trim().toLowerCase();

  if (!w1 || !w2 || w1 === w2) return false;

  const relations = getRelationsData();
  
  // Sort to ensure order independence: always [alpha, beta]
  const pair = [w1, w2].sort();
  
  // Check existence
  const exists = relations.some(r => r[0] === pair[0] && r[1] === pair[1]);
  
  if (!exists) {
    // @ts-ignore
    relations.push(pair);
    localStorage.setItem(RELATIONS_KEY, JSON.stringify(relations));
    return true; // Added
  }
  return false; // Already exists
};

// Gets list of words related to the target word
export const getRelatedWords = (word: string): string[] => {
  const target = word.trim().toLowerCase();
  const relations = getRelationsData();
  
  const related = new Set<string>();
  
  relations.forEach(pair => {
    if (pair[0] === target) related.add(pair[1]);
    if (pair[1] === target) related.add(pair[0]);
  });
  
  return Array.from(related);
};