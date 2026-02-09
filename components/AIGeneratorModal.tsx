import React, { useState } from 'react';
import { Site, AuthorPersona } from '@/types';
import { MOCK_AUTHORS } from '@/constants';
import { generateBlogPost } from '@/lib/services/geminiService';
import { X, Sparkles, Send, Copy, FileText, Loader2 } from 'lucide-react';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site | null;
}

const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({ isOpen, onClose, site }) => {
  const [topic, setTopic] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState(MOCK_AUTHORS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  if (!isOpen || !site) return null;

  const handleGenerate = async () => {
    if (!topic) return;
    
    setIsGenerating(true);
    setGeneratedContent(null);

    const author = MOCK_AUTHORS.find(a => a.id === selectedAuthorId);
    if (!author) return;

    try {
      const content = await generateBlogPost(topic, author.name, author.systemPrompt);
      setGeneratedContent(content);
    } catch (e) {
      setGeneratedContent("Error generating content. Please check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-1.5 rounded-md text-indigo-600">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Content Generator</h3>
              <p className="text-xs text-gray-500">Drafting for {site.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {!generatedContent && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Persona</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MOCK_AUTHORS.slice(0, 4).map(author => (
                    <button
                      key={author.id}
                      onClick={() => setSelectedAuthorId(author.id)}
                      className={`flex items-center space-x-3 p-3 rounded-lg border text-left transition-all ${
                        selectedAuthorId === author.id 
                          ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={author.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{author.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{author.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Keyword</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., The future of programmatic SEO in 2025..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <p className="text-sm text-gray-500 font-medium animate-pulse">Consulting the oracle...</p>
            </div>
          )}

          {generatedContent && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Generated Draft</span>
                  <button className="text-gray-500 hover:text-indigo-600" title="Copy">
                    <Copy size={16} />
                  </button>
               </div>
               <div className="prose prose-sm max-w-none text-gray-800 font-sans whitespace-pre-line">
                 {generatedContent}
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
          {!generatedContent ? (
             <button
                onClick={handleGenerate}
                disabled={!topic || isGenerating}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all ${
                  !topic || isGenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
                }`}
              >
                <Sparkles size={16} />
                <span>Generate Draft</span>
              </button>
          ) : (
            <div className="flex space-x-3">
               <button
                onClick={() => setGeneratedContent(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Discard
              </button>
              <button
                className="flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-all"
              >
                <FileText size={16} />
                <span>Save to CMS</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIGeneratorModal;