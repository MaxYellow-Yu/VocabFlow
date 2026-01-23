import { WordList, Word } from '../types';

const STORAGE_KEY = 'vocabflow_data';

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
}

// Ebbinghaus Intervals in milliseconds (approximate for demo)
const INTERVALS = [
  1 * 24 * 60 * 60 * 1000, // 1 day
  2 * 24 * 60 * 60 * 1000, // 2 days
  4 * 24 * 60 * 60 * 1000, // 4 days
  7 * 24 * 60 * 60 * 1000, // 7 days
  15 * 24 * 60 * 60 * 1000, // 15 days
];

export const isDueForReview = (word: Word): boolean => {
  if (word.masteredDates.length === 0) return false;
  
  const lastMastered = word.masteredDates[word.masteredDates.length - 1];
  const now = Date.now();
  const timeSince = now - lastMastered;

  // Simple logic: determine "stage" by number of times mastered.
  // If mastered 1 time, use interval[0]. If 2 times, interval[1], etc.
  // If mastered more times than intervals defined, default to 30 days.
  const stage = word.masteredDates.length - 1;
  const interval = stage < INTERVALS.length ? INTERVALS[stage] : 30 * 24 * 60 * 60 * 1000;

  return timeSince >= interval;
};