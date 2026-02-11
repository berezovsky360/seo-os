'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity, Filter, ChevronLeft, ChevronDown, RefreshCw,
  AlertTriangle, AlertCircle, Info, Zap, Globe, Sparkles,
  Search, BarChart3, Settings2, Clock, Loader2
} from 'lucide-react';
import { useCore } from '@/lib/contexts/CoreContext';
import { useSites } from '@/hooks/useSites';
import type { EventRecord, EventSeverity, ModuleId } from '@/lib/core/events';

// Module icon + color mapping
const MODULE_STYLE: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  'core': { icon: <Settings2 size={14} />, color: 'text-gray-600', bg: 'bg-gray-100' },
  'rankmath-bridge': { icon: <Globe size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  'gemini-architect': { icon: <Sparkles size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'rank-pulse': { icon: <BarChart3 size={14} />, color: 'text-orange-600', bg: 'bg-orange-50' },
  'gsc-insights': { icon: <Search size={14} />, color: 'text-purple-600', bg: 'bg-purple-50' },
};

const SEVERITY_STYLE: Record<EventSeverity, { icon: React.ReactNode; color: string; bg: string; badge: string }> = {
  info: { icon: <Info size={14} />, color: 'text-blue-600', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  warning: { icon: <AlertTriangle size={14} />, color: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  critical: { icon: <AlertCircle size={14} />, color: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
};

interface EventLogProps {
  onBack?: () => void;
}

export default function EventLog({ onBack }: EventLogProps) {
  const { recentEvents, eventsLoading } = useCore();
  const { data: sites = [] } = useSites();

  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return recentEvents.filter((evt) => {
      if (filterModule !== 'all' && evt.source_module !== filterModule) return false;
      if (filterSeverity !== 'all' && evt.severity !== filterSeverity) return false;
      if (filterSite !== 'all' && evt.site_id !== filterSite) return false;
      return true;
    });
  }, [recentEvents, filterModule, filterSeverity, filterSite]);

  const getSiteName = (siteId: string | null) => {
    if (!siteId) return null;
    const site = sites.find((s: any) => s.id === siteId);
    return site?.name || site?.url || siteId.slice(0, 8);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatEventType = (type: string) => {
    // 'bridge.sync_completed' → 'Sync Completed'
    const action = type.split('.').slice(1).join('.');
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-gray-900" />
            <h1 className="text-lg font-bold text-gray-900">Event Log</h1>
          </div>
          {eventsLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {filteredEvents.length} events
          </span>
        </div>
      </div>

      <div className="p-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter size={12} />
            <span>Filters:</span>
          </div>

          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Modules</option>
            <option value="core">Core</option>
            <option value="rankmath-bridge">RankMath Bridge</option>
            <option value="rank-pulse">Rank Pulse</option>
            <option value="gemini-architect">Gemini Architect</option>
            <option value="gsc-insights">GSC Insights</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          {sites.length > 0 && (
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Sites</option>
              {sites.map((site: any) => (
                <option key={site.id} value={site.id}>
                  {site.name || site.url}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <Activity size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-gray-500 font-medium mb-1">No events yet</h3>
            <p className="text-sm text-gray-400">
              Events will appear here as modules emit them through the Core Event Bus.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((evt) => {
              const modStyle = MODULE_STYLE[evt.source_module] || MODULE_STYLE['core'];
              const sevStyle = SEVERITY_STYLE[evt.severity] || SEVERITY_STYLE.info;
              const isExpanded = expandedEvent === evt.id;

              return (
                <div
                  key={evt.id}
                  className={`bg-white rounded-xl border border-gray-200 transition-all hover:border-gray-300 ${
                    isExpanded ? 'shadow-md' : 'shadow-sm'
                  }`}
                >
                  {/* Main Row */}
                  <div
                    className="flex items-center gap-4 px-5 py-3.5 cursor-pointer"
                    onClick={() => setExpandedEvent(isExpanded ? null : evt.id)}
                  >
                    {/* Severity indicator */}
                    <div className={`w-8 h-8 rounded-lg ${sevStyle.bg} ${sevStyle.color} flex items-center justify-center shrink-0`}>
                      {sevStyle.icon}
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {formatEventType(evt.event_type)}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${modStyle.bg} ${modStyle.color}`}>
                          {evt.source_module}
                        </span>
                        {evt.site_id && (
                          <span className="text-[10px] text-gray-400 truncate">
                            {getSiteName(evt.site_id)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {evt.event_type}
                      </div>
                    </div>

                    {/* Status + Time */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        evt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        evt.status === 'failed' ? 'bg-red-100 text-red-700' :
                        evt.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {evt.status}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(evt.created_at)}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded Payload */}
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                        <div>
                          <span className="text-gray-400">Event ID:</span>
                          <span className="ml-2 text-gray-600 font-mono">{evt.id.slice(0, 8)}...</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Severity:</span>
                          <span className={`ml-2 ${sevStyle.color} font-medium`}>{evt.severity}</span>
                        </div>
                        {evt.processed_by && evt.processed_by.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Processed by:</span>
                            <span className="ml-2 text-gray-600">{evt.processed_by.join(', ')}</span>
                          </div>
                        )}
                        {evt.error && (
                          <div className="col-span-2">
                            <span className="text-red-500">Error:</span>
                            <span className="ml-2 text-red-600">{evt.error}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 mb-1 block">Payload:</span>
                        <pre className="text-xs font-mono text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-40">
                          {JSON.stringify(evt.payload, null, 2)}
                        </pre>
                      </div>
                      {evt.result && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-400 mb-1 block">Result:</span>
                          <pre className="text-xs font-mono text-gray-600 bg-green-50 rounded-lg p-3 overflow-x-auto max-h-40">
                            {JSON.stringify(evt.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
