import React, { useState } from 'react';
import { MOCK_AUTHORS, THEMES, THEME_KEYS } from '../constants';
import { AuthorPersona, UserRole } from '../types';
import { Shuffle, Sparkles, User, Settings, Edit, CheckCircle2, ChevronLeft, Download, Bell, Search, Filter, ChevronDown } from 'lucide-react';

interface AuthorRotatorProps {
    userRole: UserRole;
    onBack?: () => void;
}

const PageHeader = ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div className="flex justify-between items-center px-4 sm:px-8 py-5 bg-[#F5F6F8] z-10 sticky top-0">
        <div className="flex items-center gap-3 sm:gap-4">
            {onBack && (
                <>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <ChevronLeft size={14} />
                        Back
                    </button>
                    <div className="h-4 w-px bg-gray-300"></div>
                </>
            )}
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
                <Download size={16} />
                <span>Export</span>
            </button>
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#F5F6F8]"></span>
            </button>
             <div className="w-9 h-9 rounded-full bg-gray-200 p-[2px] shadow-sm overflow-hidden">
                 <img src="https://picsum.photos/100/100?random=101" alt="User" className="w-full h-full rounded-full object-cover" />
             </div>
        </div>
    </div>
);

const FloatingSearchBar = () => (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-30 pointer-events-none">
        <div className="bg-white p-2 rounded-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center gap-2 pl-2 pointer-events-auto">
            <button className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-full hover:bg-black transition-colors shadow-md group">
                <Sparkles size={16} className="group-hover:animate-pulse text-indigo-300" />
                <span className="text-sm font-bold">AI</span>
            </button>
            <div className="flex-1 flex items-center px-3 border-l border-gray-100 ml-1">
                <Search size={18} className="text-gray-400 mr-3" />
                <input 
                    type="text" 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900 placeholder-gray-400 h-10 outline-none"
                    placeholder="Create new persona..."
                />
            </div>
             <button className="hidden md:flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-full text-xs font-bold text-gray-700 transition-colors border border-gray-100">
                <Filter size={14} className="text-gray-400" />
                <span>Active</span>
                <ChevronDown size={12} className="text-gray-400" />
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
                Generate
            </button>
        </div>
    </div>
);

const AuthorRotator: React.FC<AuthorRotatorProps> = ({ userRole, onBack }) => {
    const [hoveredAuthor, setHoveredAuthor] = useState<string | null>(null);
    const [activeAuthorId, setActiveAuthorId] = useState<string>('1');

    const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';

    return (
        <div className="h-full flex flex-col bg-[#F5F6F8] relative font-sans">
            <PageHeader title="Personas" onBack={onBack} />

            <div className="flex-1 overflow-y-auto px-8 pb-32">
                <div className="mb-6 flex items-center justify-between">
                     <p className="text-sm text-gray-500 font-medium">Manage AI identities, tones, and writing styles for automated content generation.</p>
                     <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                        <Shuffle size={14} className="text-indigo-600" />
                        <span>Next Post: <span className="font-semibold text-gray-900">{MOCK_AUTHORS.find(a => a.id === activeAuthorId)?.name}</span></span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {MOCK_AUTHORS.map((author, index) => {
                         const themeKey = THEME_KEYS[index % THEME_KEYS.length];
                         const themeStyle = THEMES[themeKey];
                         const isLight = themeKey === 'cotton-candy';
                         const textColor = isLight ? 'text-gray-900' : 'text-white';
                         const subTextColor = isLight ? 'text-gray-600' : 'text-white/70';

                        return (
                            <div 
                                key={author.id}
                                className={`group relative bg-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 flex flex-col overflow-hidden border border-gray-100 h-[320px] cursor-pointer`}
                                onMouseEnter={() => setHoveredAuthor(author.id)}
                                onMouseLeave={() => setHoveredAuthor(null)}
                            >
                                {/* 3D Header */}
                                <div 
                                    className="relative h-[160px] p-6 flex flex-col justify-between transition-transform duration-700 group-hover:scale-[1.02]"
                                    style={themeStyle}
                                >
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>
                                    
                                    <div className="relative z-10 flex justify-between items-start">
                                         <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isLight ? 'border-gray-200' : 'border-white/20'} shadow-lg`}>
                                            <img src={author.avatarUrl} alt={author.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex gap-2">
                                             {canEdit && (
                                                <button className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors hover:text-white" title="Edit">
                                                    <Settings size={14} className={isLight ? 'text-gray-700' : 'text-white'}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative z-10">
                                        <h3 className={`text-lg font-bold ${textColor} tracking-tight`}>{author.name}</h3>
                                        <p className={`text-xs font-medium ${subTextColor}`}>{author.role}</p>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="flex-1 p-6 bg-white flex flex-col relative">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System Tone</div>
                                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                                        {author.systemPrompt}
                                    </p>

                                    {/* Action Overlay */}
                                    {activeAuthorId !== author.id ? (
                                         <div className={`absolute inset-0 bg-white/90 backdrop-blur-[2px] flex items-center justify-center p-6 transition-opacity duration-300 ${hoveredAuthor === author.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                             {canEdit && (
                                                <button 
                                                    onClick={() => setActiveAuthorId(author.id)}
                                                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:scale-105"
                                                >
                                                    Set Active
                                                </button>
                                             )}
                                         </div>
                                    ) : (
                                        <div className="absolute bottom-6 right-6">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold shadow-sm border border-emerald-200">
                                                <CheckCircle2 size={12} />
                                                Active
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Add New Placeholder */}
                    {canEdit && (
                        <div className="group rounded-[2rem] border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-white transition-all duration-300 cursor-pointer flex flex-col items-center justify-center h-[320px]">
                            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <User size={32} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <span className="font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">Create Persona</span>
                        </div>
                    )}
                </div>
            </div>

            <FloatingSearchBar />
        </div>
    );
};

export default AuthorRotator;