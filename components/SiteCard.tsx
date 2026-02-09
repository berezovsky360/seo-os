import React from 'react';
import { Site, SiteStatus, UserRole } from '../types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { ExternalLink, Sparkles, Activity, AlertCircle, CheckCircle, Trash2, MoreHorizontal } from 'lucide-react';

interface SiteCardProps {
  site: Site;
  onGeneratePost: (site: Site) => void;
  userRole: UserRole;
  onDelete: (id: string) => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, onGeneratePost, userRole, onDelete }) => {
  
  const canDelete = userRole === 'ADMIN';
  const canCreateContent = userRole === 'ADMIN' || userRole === 'EDITOR';

  const getStatusIcon = (status: SiteStatus) => {
    switch (status) {
      case SiteStatus.HEALTHY: 
        return <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-600"><CheckCircle size={14} /></div>;
      case SiteStatus.WARNING: 
        return <div className="p-1.5 rounded-full bg-amber-100 text-amber-600"><Activity size={14} /></div>;
      case SiteStatus.CRITICAL: 
        return <div className="p-1.5 rounded-full bg-rose-100 text-rose-600"><AlertCircle size={14} /></div>;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 hover:shadow-lg transition-all duration-300 border border-gray-100 group relative flex flex-col h-full">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
             <img src={site.favicon} alt={site.name} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">{site.name}</h2>
            <a href={`https://${site.url}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-indigo-600 flex items-center mt-0.5 transition-colors">
              {site.url}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {getStatusIcon(site.status)}
            <button className="text-gray-300 hover:text-gray-600">
                <MoreHorizontal size={18} />
            </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50/50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-gray-100">
            <span className="text-sm font-bold text-gray-900">{site.metrics.speedScore}</span>
            <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wide">Speed</span>
        </div>
        <div className="bg-gray-50/50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-gray-100">
            <span className={`text-sm font-bold ${site.metrics.notFoundCount > 0 ? 'text-rose-500' : 'text-gray-900'}`}>{site.metrics.notFoundCount}</span>
            <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wide">404s</span>
        </div>
        <div className="bg-gray-50/50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-gray-100">
            <span className="text-sm font-bold text-gray-900">{(site.metrics.indexedPages / 1000).toFixed(1)}k</span>
            <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wide">Index</span>
        </div>
      </div>

      {/* Growth Graph */}
      <div className="mb-6 flex-1 min-h-[60px]">
        <div className="flex justify-between items-center mb-2">
             <span className="text-xs font-semibold text-gray-400">Traffic (7d)</span>
             <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">+12.4%</span>
        </div>
        <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={site.metrics.trafficTrend}>
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#7C69EF" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Status Queue Pill */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between mb-4 border border-gray-100">
          <div className="flex flex-col">
              <span className="text-[10px] uppercase text-gray-400 font-bold">Live</span>
              <span className="text-sm font-bold text-gray-900">{site.contentQueue.live}</span>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase text-gray-400 font-bold">Queue</span>
              <span className="text-sm font-bold text-indigo-600">{site.contentQueue.queued}</span>
          </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            Manage
        </button>
        {canCreateContent && (
            <button 
                onClick={() => onGeneratePost(site)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 shadow-sm shadow-indigo-200"
            >
                <Sparkles size={12} />
                Generate
            </button>
        )}
      </div>

      {canDelete && (
        <button 
            onClick={(e) => { e.stopPropagation(); onDelete(site.id); }}
            className="absolute top-4 right-10 p-1.5 text-gray-300 hover:text-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
            <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

export default SiteCard;