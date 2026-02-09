'use client';

import React, { useState, useMemo } from 'react';
import {
  Globe, Sparkles, Search, BarChart3, Image as ImageIcon,
  Loader2, AlertCircle, ChevronLeft, Store
} from 'lucide-react';
import { useCore } from '@/lib/contexts/CoreContext';
import { useToggleModule } from '@/hooks/useModules';
import { useToast } from '@/lib/contexts/ToastContext';
import type { ModuleId } from '@/lib/core/events';

// Module card metadata
const MODULE_CARDS: {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  requiredKeys: string[];
  status: 'ready' | 'beta' | 'coming-soon';
}[] = [
  {
    id: 'rankmath-bridge',
    name: 'RankMath Bridge',
    description: 'Sync SEO metadata across WordPress sites.',
    icon: <Globe size={20} />,
    gradient: 'from-blue-500 to-blue-600',
    requiredKeys: [],
    status: 'ready',
  },
  {
    id: 'gemini-architect',
    name: 'Gemini Architect',
    description: 'AI content analysis and optimization.',
    icon: <Sparkles size={20} />,
    gradient: 'from-emerald-500 to-teal-600',
    requiredKeys: ['gemini'],
    status: 'coming-soon',
  },
  {
    id: 'rank-pulse',
    name: 'Rank Pulse',
    description: 'Real-time position monitoring with SERP snapshots.',
    icon: <BarChart3 size={20} />,
    gradient: 'from-orange-500 to-red-500',
    requiredKeys: ['dataforseo'],
    status: 'ready',
  },
  {
    id: 'gsc-insights',
    name: 'GSC Insights',
    description: 'Search Console data sync and analysis.',
    icon: <Search size={20} />,
    gradient: 'from-purple-500 to-indigo-600',
    requiredKeys: ['gsc'],
    status: 'ready',
  },
  {
    id: 'nana-banana',
    name: 'Nana Banana',
    description: 'AI featured image generation and SEO optimization.',
    icon: <ImageIcon size={20} />,
    gradient: 'from-yellow-400 to-orange-500',
    requiredKeys: ['gemini'],
    status: 'ready',
  },
];

interface MarketplaceProps {
  onBack?: () => void;
}

// Toggle switch component
function ToggleSwitch({
  enabled,
  loading,
  disabled,
  onToggle,
}: {
  enabled: boolean;
  loading: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading || disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1 ${
        disabled
          ? 'bg-gray-200 cursor-not-allowed'
          : enabled
            ? 'bg-indigo-600'
            : 'bg-gray-300 hover:bg-gray-400'
      }`}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={14} className="animate-spin text-white" />
        </span>
      ) : (
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      )}
    </button>
  );
}

export default function Marketplace({ onBack }: MarketplaceProps) {
  const { isModuleEnabled, apiKeys } = useCore();
  const toggleModule = useToggleModule();
  const toast = useToast();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = async (moduleId: string, currentlyEnabled: boolean) => {
    setTogglingId(moduleId);
    try {
      await toggleModule.mutateAsync({
        moduleId: moduleId as ModuleId,
        enabled: !currentlyEnabled,
      });
      toast.success(`${currentlyEnabled ? 'Disabled' : 'Enabled'} module`);
    } catch {
      toast.error('Failed to toggle module');
    } finally {
      setTogglingId(null);
    }
  };

  const hasRequiredKeys = (requiredKeys: string[]) => {
    if (requiredKeys.length === 0) return true;
    return requiredKeys.every(key =>
      apiKeys.some(ak => ak.key_type === key && ak.is_valid)
    );
  };

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return MODULE_CARDS;
    const q = searchQuery.toLowerCase();
    return MODULE_CARDS.filter(
      m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5 bg-[#F5F6F8] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <Store size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Marketplace</h1>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search */}
        <div className="mb-6">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2.5 gap-2 max-w-md focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
            />
          </div>
        </div>

        {/* Module Grid — 3 columns on lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((mod) => {
            const enabled = isModuleEnabled(mod.id as ModuleId);
            const isToggling = togglingId === mod.id;
            const keysReady = hasRequiredKeys(mod.requiredKeys);
            const isComingSoon = mod.status === 'coming-soon';

            return (
              <div
                key={mod.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  enabled
                    ? 'border-indigo-200 shadow-md shadow-indigo-50'
                    : 'border-gray-200 shadow-sm hover:shadow-md'
                } ${isComingSoon ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Icon + Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                      {mod.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{mod.name}</h3>
                        {mod.status === 'beta' && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full uppercase flex-shrink-0">Beta</span>
                        )}
                        {isComingSoon && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold rounded-full uppercase flex-shrink-0">Soon</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{mod.description}</p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex-shrink-0 pt-0.5">
                    <ToggleSwitch
                      enabled={enabled}
                      loading={isToggling}
                      disabled={isComingSoon}
                      onToggle={() => handleToggle(mod.id, enabled)}
                    />
                  </div>
                </div>

                {/* Required Keys Warning */}
                {mod.requiredKeys.length > 0 && !keysReady && !isComingSoon && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg mt-3">
                    <AlertCircle size={12} className="flex-shrink-0" />
                    <span>Needs: <strong>{mod.requiredKeys.join(', ')}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* No results */}
        {filteredModules.length === 0 && (
          <div className="text-center py-12">
            <Search size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No modules match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
