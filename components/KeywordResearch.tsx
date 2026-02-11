import React, { useState } from 'react';
import { Keyword, UserRole } from '../types';
import { MOCK_KEYWORDS } from '../constants';
import { 
  ChevronLeft, Download, Bell, RefreshCw, ChevronRight, 
  MapPin, Search, Sparkles, ChevronDown, MoreHorizontal, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';

interface KeywordResearchProps {
    userRole: UserRole;
    onBack?: () => void;
}

const KeywordResearch: React.FC<KeywordResearchProps> = ({ userRole, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('truck accident lawyer las vegas');
  
  // Helper to extract a "Term" for the first column (simulating the grouped view)
  const getTerm = (keyword: string) => {
    const words = keyword.split(' ');
    const ignore = ['best', 'how', 'what', 'buy', 'is', 'top', 'top-rated', 'in', 'for'];
    // Try to find a noun or significant word
    const significant = words.find(w => !ignore.includes(w.toLowerCase()) && w.length > 3) || words[0];
    return significant;
  };

  const getIntentBadge = (intent: string) => {
      const map: Record<string, { label: string, color: string, bg: string, border: string }> = { 
          'I': { label: 'I', color: 'text-blue-600', bg: 'bg-white', border: 'border-blue-200' }, 
          'T': { label: 'T', color: 'text-emerald-600', bg: 'bg-white', border: 'border-emerald-200' }, 
          'C': { label: 'C', color: 'text-amber-600', bg: 'bg-white', border: 'border-amber-200' }, 
          'N': { label: 'N', color: 'text-purple-600', bg: 'bg-white', border: 'border-purple-200' } 
      };
      const config = map[intent] || map['I'];
      
      return (
          <span className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold border ${config.border} ${config.bg} ${config.color} shadow-sm`}>
              {config.label}
          </span>
      );
  };

  const getKDStyle = (kd: number) => {
      let colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
      let dotClass = 'bg-emerald-500';
      
      if (kd >= 30) {
          colorClass = 'bg-amber-50 text-amber-600 border-amber-100';
          dotClass = 'bg-amber-500';
      }
      if (kd >= 60) {
          colorClass = 'bg-rose-50 text-rose-600 border-rose-100';
          dotClass = 'bg-rose-500';
      }
      
      return (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${colorClass} w-fit`}>
              <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></div>
              <span className="text-xs font-bold">{kd}</span>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7] relative font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 bg-[#F5F5F7] z-10">
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
            <h1 className="text-lg font-bold text-gray-900">Keyword Research</h1>
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 pb-32">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="py-5 pl-8 pr-4 text-xs font-bold text-gray-900 uppercase tracking-wider w-40">Terms</th>
                        <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Keyword</th>
                        <th className="py-5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Search Intent</th>
                        <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider w-24 cursor-pointer group hover:bg-gray-50">
                            <div className="flex items-center gap-1">SV <ArrowUpDown size={12} className="text-gray-300 group-hover:text-gray-500"/></div>
                        </th>
                        <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider w-24 cursor-pointer group hover:bg-gray-50">
                             <div className="flex items-center gap-1">KD <ArrowUpDown size={12} className="text-gray-300 group-hover:text-gray-500"/></div>
                        </th>
                        <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider w-24 cursor-pointer group hover:bg-gray-50">
                             <div className="flex items-center gap-1">CPC <ArrowUpDown size={12} className="text-gray-300 group-hover:text-gray-500"/></div>
                        </th>
                        <th className="py-5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-24">PPCD</th>
                        <th className="py-5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-20 text-right pr-8">Updated</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {MOCK_KEYWORDS.map((kw, index) => (
                        <tr key={kw.id} className="hover:bg-gray-50 transition-colors group">
                            {/* Terms Column */}
                            <td className="py-4 pl-8 pr-4 align-middle">
                                <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold cursor-pointer hover:text-gray-900">
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
                                    <span>{getTerm(kw.term)}</span>
                                </div>
                            </td>

                            {/* Keyword Column */}
                            <td className="py-4 px-4 align-middle">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex items-center justify-center w-5 h-5">
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-indigo-400 cursor-pointer"></div>
                                    </div>
                                    <span className="text-indigo-600 font-medium text-sm hover:underline cursor-pointer decoration-indigo-300 underline-offset-2">
                                        {kw.term}
                                    </span>
                                </div>
                            </td>

                            {/* Search Intent */}
                            <td className="py-4 px-4 align-middle">
                                {getIntentBadge(kw.intent)}
                            </td>

                            {/* SV */}
                            <td className="py-4 px-4 align-middle">
                                <span className="text-sm font-bold text-gray-900">{kw.volume}</span>
                            </td>

                            {/* KD */}
                            <td className="py-4 px-4 align-middle">
                                {getKDStyle(kw.difficulty)}
                            </td>

                            {/* CPC */}
                            <td className="py-4 px-4 align-middle">
                                <span className="text-sm font-semibold text-gray-900">${kw.cpc.toFixed(2)}</span>
                            </td>

                            {/* PPCD (Mocked based on difficulty) */}
                            <td className="py-4 px-4 align-middle">
                                <span className="text-sm font-medium text-gray-600">{Math.floor(kw.difficulty / 2.5)}</span>
                            </td>

                            {/* Updated */}
                            <td className="py-4 px-4 align-middle text-right pr-8">
                                <button className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                    <RefreshCw size={14} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {/* Filler rows for visual effect */}
                    {Array.from({ length: 6 }).map((_, i) => (
                         <tr key={`fill-${i}`} className="hover:bg-gray-50 transition-colors">
                             <td className="py-4 pl-8 pr-4"><div className="w-12 h-4 bg-gray-100 rounded animate-pulse opacity-40"></div></td>
                             <td className="py-4 px-4"><div className="w-64 h-4 bg-gray-100 rounded animate-pulse opacity-40"></div></td>
                             <td className="py-4 px-4"><div className="w-6 h-6 bg-gray-100 rounded animate-pulse opacity-40"></div></td>
                             <td className="py-4 px-4"><div className="w-10 h-4 bg-gray-100 rounded animate-pulse opacity-40"></div></td>
                             <td className="py-4 px-4"><div className="w-12 h-5 bg-gray-100 rounded animate-pulse opacity-40"></div></td>
                             <td className="py-4 px-4"><div className="w-14 h-4 bg-gray-100 rounded animate-pulse opacity-40"></div></td>
                             <td className="py-4 px-4"><div className="w-8 h-4 bg-gray-100 rounded animate-pulse opacity-40"></div></td>
                             <td className="py-4 px-4 text-right pr-8"><div className="w-6 h-6 ml-auto bg-gray-100 rounded animate-pulse opacity-40"></div></td>
                         </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Floating Search Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-30">
        <div className="bg-white p-2 rounded-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center gap-2 pl-2">
            
            {/* AI Button */}
            <button className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-full hover:bg-black transition-colors shadow-md group">
                <Sparkles size={16} className="group-hover:animate-pulse text-indigo-300" />
                <span className="text-sm font-bold">AI</span>
            </button>

            {/* Input */}
            <div className="flex-1 flex items-center px-3 border-l border-gray-100 ml-1">
                <Search size={18} className="text-gray-400 mr-3" />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900 placeholder-gray-400 h-10 outline-none"
                    placeholder="Ask anything about keywords..."
                />
            </div>

            {/* Location Pill */}
            <button className="hidden md:flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-full text-xs font-bold text-gray-700 transition-colors border border-gray-100">
                <MapPin size={14} className="text-gray-400" />
                <span>Las Vegas, NV</span>
                <ChevronDown size={12} className="text-gray-400" />
            </button>

            {/* Search Button */}
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
                Search
            </button>
        </div>
      </div>

    </div>
  );
};

export default KeywordResearch;