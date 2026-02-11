import React, { useState } from 'react';
import { 
  X, Calendar, ChevronDown, CheckSquare, Image as ImageIcon, Check, 
  Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, MoreHorizontal, Sparkles, 
  Eye, Save, ArrowLeft, Globe, Type, Maximize2
} from 'lucide-react';
import { Article } from '../types';

interface ArticleDrawerProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
}

const ArticleDrawer: React.FC<ArticleDrawerProps> = ({ article, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'seo' | 'outline'>('settings');
  
  if (!isOpen || !article) return null;

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'How-To': return 'bg-orange-100 text-orange-700';
      case 'Pillar': return 'bg-pink-100 text-pink-700';
      case 'Listicle': return 'bg-yellow-100 text-yellow-700';
      case 'Leitfaden': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm p-2 md:p-6 font-sans">
      {/* Main Container - maximizing space like a full page app within modal */}
      <div className="bg-[#F9FAFB] w-full h-full max-w-[1600px] rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-scale-in border border-white/50">
        
        {/* Top Navigation Bar */}
        <div className="h-16 px-6 border-b border-gray-200 bg-white flex justify-between items-center flex-shrink-0 z-20">
           {/* Left: Breadcrumbs/Back */}
           <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
                  <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="hover:text-gray-900 cursor-pointer">Articles</span>
                  <span className="text-gray-300">/</span>
                  <span className="truncate max-w-[150px] hover:text-gray-900 cursor-pointer">{article.type}</span>
                  <span className="text-gray-300">/</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[300px]">{article.title}</span>
              </div>
           </div>

           {/* Right: Actions */}
           <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-500">
                   <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                   Saved
               </div>
               <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                   <Eye size={16} /> Preview
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                   <Save size={16} /> Publish
               </button>
           </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* Center: Editor Canvas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F5F5F7]">
                <div className="max-w-4xl mx-auto bg-white min-h-[800px] rounded-xl shadow-sm border border-gray-200 flex flex-col relative">
                    
                    {/* WP Style Toolbar */}
                    <div className="sticky top-0 z-10 flex items-center flex-wrap gap-1 p-2 border-b border-gray-100 bg-white rounded-t-xl">
                         <div className="flex items-center gap-0.5">
                            <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><ArrowLeft size={16} className="rotate-90" /></button>
                            <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><ArrowLeft size={16} className="-rotate-90" /></button>
                         </div>
                         <div className="w-px h-4 bg-gray-200 mx-2"></div>
                         <button className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg">
                             Paragraph <ChevronDown size={12} className="text-gray-400"/>
                         </button>
                         <div className="w-px h-4 bg-gray-200 mx-2"></div>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><Bold size={16} /></button>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><Italic size={16} /></button>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><Underline size={16} /></button>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><LinkIcon size={16} /></button>
                         <div className="w-px h-4 bg-gray-200 mx-2"></div>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><AlignLeft size={16} /></button>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><AlignCenter size={16} /></button>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><AlignRight size={16} /></button>
                         <div className="w-px h-4 bg-gray-200 mx-2"></div>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><List size={16} /></button>
                         <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><ListOrdered size={16} /></button>
                         <div className="flex-1"></div>
                         <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Maximize2 size={16} /></button>
                    </div>

                    {/* Editor Content Area */}
                    <div className="p-8 md:p-12">
                        {/* Title Field */}
                        <input 
                            type="text" 
                            defaultValue={article.title}
                            className="w-full text-3xl md:text-4xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none focus:ring-0 px-0 mb-6 bg-transparent"
                            placeholder="Add Title"
                        />
                        
                        {/* Permalink Preview (WP Style) */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8 bg-gray-50 p-2 rounded-lg border border-gray-100 w-fit">
                            <span className="font-semibold">Permalink:</span>
                            <span className="text-indigo-600 underline cursor-pointer">https://site.com/blog/{article.slug || 'untitled'}</span>
                            <button className="px-2 py-0.5 bg-white border border-gray-200 rounded hover:text-gray-900 transition-colors">Edit</button>
                        </div>

                        {/* Featured Image Placeholder */}
                        <div className="w-full aspect-video bg-[#F9FAFB] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center mb-10 group cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/10 transition-all">
                            {article.image ? (
                                <div className="relative w-full h-full group">
                                     <img src={article.image} alt="Featured" className="w-full h-full object-cover rounded-xl" />
                                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                         <span className="text-white font-medium border border-white/50 px-4 py-2 rounded-lg backdrop-blur-sm">Change Image</span>
                                     </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <ImageIcon size={24} className="text-gray-400 group-hover:text-indigo-500" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-700">Add Featured Image</span>
                                    <span className="text-xs text-gray-400 mt-1">Drag and drop or click to upload</span>
                                </>
                            )}
                        </div>

                        {/* Content Body Simulation */}
                        <div className="prose prose-lg prose-slate max-w-none font-serif leading-relaxed text-gray-700">
                             <p className="text-xl text-gray-400 italic mb-8 border-l-4 border-gray-200 pl-4 py-1">
                                {article.metaDescription || "Start writing or generate content with AI..."}
                            </p>
                            <h2>Introduction</h2>
                            <p>
                                Every company needs a clear strategy. <strong>{article.mainKeyword}</strong> is becoming increasingly important in today's digital landscape. But how do you start?
                            </p>
                            <p>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                            </p>
                            <h3>Key Takeaways</h3>
                            <ul>
                                <li>Understand the basics of {article.type}</li>
                                <li>Analyze your competitor's funnel strategy</li>
                                <li>Implement changes iteratively</li>
                            </ul>
                            <p>
                                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Right: Sidebar */}
            <div className="w-[380px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
                
                {/* Tabs */}
                <div className="flex items-center px-4 border-b border-gray-100">
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Settings
                    </button>
                    <button 
                        onClick={() => setActiveTab('seo')}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'seo' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        SEO
                    </button>
                     <button 
                        onClick={() => setActiveTab('outline')}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'outline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Outline
                    </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    {activeTab === 'settings' && (
                        <>
                            {/* Summary Card */}
                            <div className="space-y-5">
                                <h3 className="text-sm font-bold text-gray-900">Summary</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Status</span>
                                        <div className="relative">
                                            <select className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border-0 cursor-pointer focus:ring-0 ${
                                                article.status === 'Finished' ? 'bg-emerald-50 text-emerald-700' : 
                                                article.status === 'In Progress' ? 'bg-amber-50 text-amber-700' : 
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                <option>Planned</option>
                                                <option>In Progress</option>
                                                <option>Finished</option>
                                            </select>
                                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-50 pointer-events-none"/>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Author</span>
                                        <div className="flex items-center gap-2">
                                            <img src="https://picsum.photos/32/32?random=101" className="w-5 h-5 rounded-full" />
                                            <span className="text-gray-900 font-medium">Sarah</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Type</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(article.type)}`}>{article.type}</span>
                                    </div>
                                     <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Funnel</span>
                                        <span className="text-gray-900 font-medium bg-gray-50 px-2 py-0.5 rounded">{article.funnel}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Publication</span>
                                        <div className="flex items-center gap-2 text-gray-900 font-medium cursor-pointer hover:text-indigo-600">
                                            <Calendar size={14} className="text-gray-400" />
                                            {article.publicationDate || 'Set Date'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                             <div className="h-px bg-gray-100 my-4"></div>
                            
                            {/* Actions Card */}
                             <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                                <div className="flex items-center gap-2 mb-2">
                                     <Sparkles size={16} className="text-indigo-600" />
                                     <h4 className="text-indigo-900 font-bold text-sm">AI Assistant</h4>
                                </div>
                                <p className="text-xs text-indigo-700/80 mb-4 leading-relaxed">
                                    Use our LLM engine to expand your outline, fix grammar, or generate missing sections.
                                </p>
                                <button className="w-full py-2.5 bg-white text-indigo-600 rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 border border-indigo-100">
                                    Apply Suggestions
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === 'seo' && (
                         <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Main Keyword</label>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <span className="text-sm font-bold text-gray-900">{article.mainKeyword}</span>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                                        KD 12
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">URL Slug</label>
                                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                    <Globe size={16} className="text-gray-400 flex-shrink-0"/>
                                    <input 
                                        type="text" 
                                        defaultValue={article.slug || 'untitled-article'}
                                        className="text-sm text-gray-600 w-full outline-none bg-transparent font-mono"
                                    />
                                </div>
                            </div>

                             <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Meta Description</label>
                                <div className="relative">
                                    <textarea 
                                        className="w-full p-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none shadow-sm transition-all"
                                        rows={4}
                                        defaultValue={article.metaDescription}
                                        placeholder="Enter meta description..."
                                    />
                                    <div className="absolute bottom-3 right-3 text-[10px] font-medium text-gray-400 bg-white px-1 rounded">145/160</div>
                                </div>
                            </div>

                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-start gap-3">
                                <div className="bg-white p-1.5 rounded-full text-emerald-500 shadow-sm mt-0.5">
                                    <Check size={14} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-900">SEO Optimized</h4>
                                    <p className="text-xs text-emerald-700 mt-1">Keyword density is good. Meta description length is optimal.</p>
                                </div>
                            </div>
                         </div>
                    )}
                    
                     {activeTab === 'outline' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-gray-900">Structure</h3>
                                <button className="text-xs text-indigo-600 font-medium hover:underline">Regenerate</button>
                            </div>
                            
                            <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm ring-2 ring-indigo-50"></div>
                                    <h4 className="text-sm font-bold text-gray-900">H1: {article.title}</h4>
                                </div>
                                 <div className="relative group cursor-pointer">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white group-hover:bg-indigo-300 transition-colors"></div>
                                    <h4 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors">Introduction</h4>
                                    <p className="text-xs text-gray-500 mt-1">Hook the reader and explain importance of {article.mainKeyword}.</p>
                                </div>
                                <div className="relative group cursor-pointer">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white group-hover:bg-indigo-300 transition-colors"></div>
                                    <h4 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors">Key Benefits</h4>
                                    <ul className="mt-2 space-y-1">
                                        <li className="flex items-center gap-2 text-xs text-gray-600">
                                            <div className="w-1 h-1 rounded-full bg-gray-400"></div> Benefit 1
                                        </li>
                                        <li className="flex items-center gap-2 text-xs text-gray-600">
                                            <div className="w-1 h-1 rounded-full bg-gray-400"></div> Benefit 2
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

            </div>

        </div>
      </div>
    </div>
  );
};

export default ArticleDrawer;