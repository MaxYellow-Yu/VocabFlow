import React, { useState, useEffect } from 'react';
// @ts-ignore
import { marked } from 'marked';

interface NoteEditorProps {
  englishWord: string;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ englishWord, initialContent, onSave, onCancel }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    setContent(initialContent || '');
  }, [initialContent]);

  const getMarkdownHtml = (markdown: string) => {
    try {
      return { __html: marked.parse(markdown) };
    } catch (e) {
      return { __html: '<p class="text-red-500">Error parsing markdown</p>' };
    }
  };

  return (
    <div className="flex flex-col h-[70vh]">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          Notes for <span className="text-indigo-600">"{englishWord}"</span>
        </h3>
        <p className="text-sm text-gray-500">Shared across all lists.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-2">Editor (Markdown)</label>
          <textarea
            className="flex-1 w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none font-mono text-sm bg-gray-50"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`# ${englishWord}\n\n- Usage example...\n- Mnemonic...`}
          />
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-sm font-medium text-gray-600 mb-2">Preview</label>
          <div 
            className="flex-1 w-full p-4 border border-gray-200 rounded-lg overflow-y-auto markdown-body bg-white"
            dangerouslySetInnerHTML={getMarkdownHtml(content)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
        <button 
          onClick={() => onSave(content)}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all font-medium"
        >
          Save Note
        </button>
      </div>
    </div>
  );
};