export interface Word {
  id: string;
  english: string;
  phonetic: string;
  partOfSpeech: string;
  chinese: string;
  masteredDates: number[]; // Array of timestamps
  incorrectCount: number;
}

export interface WordList {
  id: string;
  name: string;
  description: string;
  words: Word[];
  consolidationQueueIds: string[]; // IDs of words currently in the consolidation queue
}

export enum LearningMode {
  MEMORIZE = 'MEMORIZE',      // New words
  CONSOLIDATE = 'CONSOLIDATE', // Review queue
  REVIEW = 'REVIEW'           // Ebbinghaus review
}

export enum CardState {
  QUESTION = 'QUESTION',
  ANSWER_FAIL_REVEAL = 'ANSWER_FAIL_REVEAL', // User said "Don't Know"
  ANSWER_PASS_REVEAL = 'ANSWER_PASS_REVEAL', // User said "Know"
}

export enum Direction {
  EN_ZH = 'EN_ZH',
  ZH_EN = 'ZH_EN',
}