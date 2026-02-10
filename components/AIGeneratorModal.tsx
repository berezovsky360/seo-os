import React, { useState } from 'react';
import { Site, PersonaDB, WritingStyle } from '@/types';
import { usePersonas } from '@/hooks/usePersonas';
import { useGenerateContent } from '@/hooks/useAIWriter';
import { X, Sparkles, Copy, FileText, Loader2, User } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site | null;
}

const STYLES: { value: WritingStyle; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'creative', label: 'Creative' },
];

const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({ isOpen, onClose, site }) => {
  const [topic, setTopic] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [writingStyle, setWritingStyle] = useState<WritingStyle>('balanced');
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const { data: personas = [] } = usePersonas();
  const generateContent = useGenerateContent();
  const toast = useToast();

  if (!isOpen || !site) return null;

  const handleGenerate = async () => {
    if (!topic) return;

    try {
      const result = await generateContent.mutateAsync({
        topic,
        persona_id: selectedPersonaId || undefined,
        site_id: site.id,
        writing_style: writingStyle,
      });
      setGeneratedContent(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed. Check your Gemini API key.');
    }
  };

  const handleCopy = () => {
    if (generatedContent?.content) {
      navigator.clipboard.writeText(generatedContent.content);
      toast.success('Content copied to clipboard');
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
              {/* Persona selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Persona</label>
                {personas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedPersonaId('')}
                      className={`flex items-center space-x-3 p-3 rounded-lg border text-left transition-all ${
                        !selectedPersonaId
                          ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Sparkles size={14} className="text-gray-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">No Persona</div>
                        <div className="text-xs text-gray-500">Default AI voice</div>
                      </div>
                    </button>
                    {personas.map(persona => (
                      <button
                        key={persona.id}
                        onClick={() => setSelectedPersonaId(persona.id)}
                        className={`flex items-center space-x-3 p-3 rounded-lg border text-left transition-all ${
                          selectedPersonaId === persona.id
                            ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {persona.avatar_url ? (
                          <img src={persona.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User size={14} className="text-indigo-500" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{persona.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">{persona.role || persona.writing_style}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No personas configured. Create one in the Personas page.</p>
                )}
              </div>

              {/* Writing style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Writing Style</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setWritingStyle(s.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        writingStyle === s.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
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

          {generateContent.isPending && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <p className="text-sm text-gray-500 font-medium animate-pulse">Generating content with Gemini...</p>
            </div>
          )}

          {generatedContent && (
            <div className="space-y-4">
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SEO Title</span>
                  <p className="text-sm font-medium text-gray-800 mt-1">{generatedContent.seo_title}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Meta Description</span>
                  <p className="text-sm text-gray-700 mt-1">{generatedContent.meta_description}</p>
                </div>
              </div>
              {generatedContent.focus_keywords && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 uppercase">Keywords:</span>
                  {generatedContent.focus_keywords.map((kw: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium">{kw}</span>
                  ))}
                </div>
              )}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                 <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Generated Draft</span>
                    <button onClick={handleCopy} className="text-gray-500 hover:text-indigo-600 transition-colors" title="Copy">
                      <Copy size={16} />
                    </button>
                 </div>
                 <div
                   className="prose prose-sm max-w-none text-gray-800 font-sans"
                   dangerouslySetInnerHTML={{ __html: generatedContent.content }}
                 />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
          {!generatedContent ? (
             <button
                onClick={handleGenerate}
                disabled={!topic || generateContent.isPending}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all ${
                  !topic || generateContent.isPending ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
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
                onClick={handleCopy}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-all"
              >
                <FileText size={16} />
                <span>Copy to Clipboard</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIGeneratorModal;
