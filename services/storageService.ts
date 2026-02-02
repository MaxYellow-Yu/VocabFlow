import { WordList, Word } from '../types';

const STORAGE_KEY = 'vocabflow_data';
const HISTORY_KEY = 'vocabflow_history'; // Changed from DAILY_STATS_KEY
const NOTES_KEY = 'vocabflow_notes';

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

export const getRawDataJson = (): string => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data || JSON.stringify(DEFAULT_DATA);
};

export const importRawDataJson = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    // Basic validation to check if it looks like an array of lists
    if (Array.isArray(parsed) && parsed.length > 0 && 'words' in parsed[0]) {
      localStorage.setItem(STORAGE_KEY, jsonString);
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

export const getNotesJson = (): string => {
  return localStorage.getItem(NOTES_KEY) || '{}';
};

export const importNotesJson = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed === 'object' && parsed !== null) {
      localStorage.setItem(NOTES_KEY, jsonString);
      return true;
    }
  } catch (e) {
    console.error("Invalid Notes JSON", e);
  }
  return false;
};