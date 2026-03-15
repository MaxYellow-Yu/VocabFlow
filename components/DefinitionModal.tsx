import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';

interface DefinitionModalProps {
  word: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }[];
    synonyms?: string[];
    antonyms?: string[];
  }[];
}

export const DefinitionModal: React.FC<DefinitionModalProps> = ({ word, isOpen, onClose }) => {
  const [data, setData] = useState<DictionaryEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDefinition = async (searchWord: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // The Free Dictionary API
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchWord)}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No definitions found for this word.");
        }
        throw new Error("Failed to fetch definition.");
      }
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && word) {
      fetchDefinition(word);
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, word]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detailed Definition" maxWidth="max-w-3xl">
      <div className="flex flex-col h-[70vh]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Icon name="hourglass_empty" className="animate-spin text-4xl mb-4" />
            <p>Loading definitions...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-400">
            <Icon name="error_outline" className="text-4xl mb-4" />
            <p>{error}</p>
          </div>
        ) : data && data.length > 0 ? (
          <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-8 pb-6">
            {data.map((entry, entryIdx) => (
              <div key={entryIdx} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-baseline gap-3 mb-6 pb-4 border-b border-gray-100">
                  <h2 className="text-3xl font-bold text-gray-900">{entry.word}</h2>
                  {entry.phonetic && (
                    <span className="text-lg font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {entry.phonetic}
                    </span>
                  )}
                </div>

                <div className="space-y-6">
                  {entry.meanings.map((meaning, meaningIdx) => (
                    <div key={meaningIdx} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-gray-800 text-white text-sm font-medium rounded-full italic">
                          {meaning.partOfSpeech}
                        </span>
                      </div>

                      <ul className="list-decimal list-outside ml-5 space-y-4 text-gray-700">
                        {meaning.definitions.map((def, defIdx) => (
                          <li key={defIdx} className="pl-2">
                            <p className="text-base leading-relaxed">{def.definition}</p>
                            {def.example && (
                              <p className="mt-1 text-gray-500 italic border-l-2 border-gray-200 pl-3">
                                "{def.example}"
                              </p>
                            )}
                            {/* Definition-level synonyms/antonyms */}
                            {def.synonyms && def.synonyms.length > 0 && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium text-emerald-600 mr-2">Synonyms:</span>
                                <span className="text-gray-600">{def.synonyms.join(', ')}</span>
                              </div>
                            )}
                            {def.antonyms && def.antonyms.length > 0 && (
                              <div className="mt-1 text-sm">
                                <span className="font-medium text-rose-600 mr-2">Antonyms:</span>
                                <span className="text-gray-600">{def.antonyms.join(', ')}</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>

                      {/* Meaning-level synonyms/antonyms */}
                      {meaning.synonyms && meaning.synonyms.length > 0 && (
                        <div className="mt-3 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                          <span className="font-bold text-emerald-700 block mb-1">Synonyms</span>
                          <span className="text-emerald-600">{meaning.synonyms.join(', ')}</span>
                        </div>
                      )}
                      {meaning.antonyms && meaning.antonyms.length > 0 && (
                        <div className="mt-2 text-sm bg-rose-50 p-3 rounded-lg border border-rose-100">
                          <span className="font-bold text-rose-700 block mb-1">Antonyms</span>
                          <span className="text-rose-600">{meaning.antonyms.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
