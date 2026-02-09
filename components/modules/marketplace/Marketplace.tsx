'use client';

import React, { useState, useMemo } from 'react';
import {
  Globe, Sparkles, Search, BarChart3, Image as ImageIcon,
  Loader2, AlertCircle, ChevronLeft, Store, Settings, X, ShieldAlert
} from 'lucide-react';
import { useCore } from '@/lib/contexts/CoreContext';
import { useToggleModule } from '@/hooks/useModules';
import { useToast } from '@/lib/contexts/ToastContext';
import type { ModuleId } from '@/lib/core/events';
import type { ViewState } from '@/types';

// Module card metadata
const MODULE_CARDS: {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  gradient: string;
  requiredKeys: string[];
  status: 'ready' | 'beta' | 'coming-soon';
  viewState?: string;
}[] = [
  {
    id: 'rankmath-bridge',
    name: 'RankMath Bridge',
    description: 'Sync SEO metadata across WordPress sites. Push and pull Rank Math fields in bulk.',
    icon: <Globe size={24} />,
    iconBg: 'bg-blue-50 text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    requiredKeys: [],
    status: 'ready',
    viewState: 'bulk-metadata',
  },
  {
    id: 'gemini-architect',
    name: 'Gemini Architect',
    description: 'AI content analysis and optimization powered by Google Gemini.',
    icon: <Sparkles size={24} />,
    iconBg: 'bg-emerald-50 text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    requiredKeys: ['gemini'],
    status: 'coming-soon',
    viewState: 'gemini-architect',
  },
  {
    id: 'rank-pulse',
    name: 'Rank Pulse',
    description: 'Real-time keyword position monitoring with SERP snapshots and trend analysis.',
    icon: <BarChart3 size={24} />,
    iconBg: 'bg-orange-50 text-orange-600',
    gradient: 'from-orange-500 to-red-500',
    requiredKeys: ['dataforseo'],
    status: 'ready',
    viewState: 'rank-pulse',
  },
  {
    id: 'gsc-insights',
    name: 'GSC Insights',
    description: 'Search Console data sync, query analysis, and performance tracking.',
    icon: <Search size={24} />,
    iconBg: 'bg-purple-50 text-purple-600',
    gradient: 'from-purple-500 to-indigo-600',
    requiredKeys: ['gsc'],
    status: 'ready',
    viewState: 'gsc-insights',
  },
  {
    id: 'nana-banana',
    name: 'Nana Banana',
    description: 'AI featured image generation with automatic SEO optimization and WordPress upload.',
    icon: <ImageIcon size={24} />,
    iconBg: 'bg-yellow-50 text-yellow-600',
    gradient: 'from-yellow-400 to-orange-500',
    requiredKeys: ['gemini'],
    status: 'ready',
    viewState: 'nana-banana',
  },
];

interface MarketplaceProps {
  onBack?: () => void;
  onChangeView?: (view: ViewState) => void;
}

export default function Marketplace({ onBack, onChangeView }: MarketplaceProps) {
  const { isModuleEnabled, apiKeys } = useCore();
  const toggleModule = useToggleModule();
  const toast = useToast();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [disableTarget, setDisableTarget] = useState<{ id: string; name: string } | null>(null);

  const handleInstall = async (moduleId: string) => {
    setTogglingId(moduleId);
    try {
      await toggleModule.mutateAsync({
        moduleId: moduleId as ModuleId,
        enabled: true,
      });
      toast.success('Module installed');
    } catch {
      toast.error('Failed to install module');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDisableConfirm = async () => {
    if (!disableTarget) return;
    setTogglingId(disableTarget.id);
    setDisableTarget(null);
    try {
      await toggleModule.mutateAsync({
        moduleId: disableTarget.id as ModuleId,
        enabled: false,
      });
      toast.success('Module disabled');
    } catch {
      toast.error('Failed to disable module');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfigure = (viewState?: string) => {
    if (viewState && onChangeView) {
      onChangeView(viewState as ViewState);
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

  const enabledCount = MODULE_CARDS.filter(m => isModuleEnabled(m.id as ModuleId)).length;

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
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {MODULE_CARDS.length} modules
          </span>
        </div>
        {enabledCount > 0 && (
          <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-semibold">
            {enabledCount} active
          </span>
        )}
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

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModules.map((mod) => {
            const enabled = isModuleEnabled(mod.id as ModuleId);
            const isToggling = togglingId === mod.id;
            const keysReady = hasRequiredKeys(mod.requiredKeys);
            const isComingSoon = mod.status === 'coming-soon';

            return (
              <div
                key={mod.id}
                className={`bg-white rounded-2xl border p-5 transition-all flex flex-col ${
                  enabled
                    ? 'border-indigo-200 shadow-md shadow-indigo-50'
                    : 'border-gray-200 shadow-sm hover:shadow-md'
                } ${isComingSoon ? 'opacity-60' : ''}`}
              >
                {/* Top: Icon + Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${mod.iconBg} flex items-center justify-center flex-shrink-0`}>
                    {mod.icon}
                  </div>
                  {isComingSoon && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase tracking-wide">
                      Coming Soon
                    </span>
                  )}
                  {mod.status === 'beta' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
                      Beta
                    </span>
                  )}
                  {enabled && !isComingSoon && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
                      Active
                    </span>
                  )}
                </div>

                {/* Name + Description */}
                <h3 className="text-base font-bold text-gray-900 mb-1">{mod.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">{mod.description}</p>

                {/* Required Keys Warning */}
                {mod.requiredKeys.length > 0 && !keysReady && !isComingSoon && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 px-2.5 py-2 rounded-lg mb-4">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    <span>Requires: <strong>{mod.requiredKeys.join(', ')}</strong> API key</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-auto">
                  {isComingSoon ? (
                    <button
                      disabled
                      className="w-full py-2.5 text-sm font-semibold text-gray-400 bg-gray-100 rounded-xl cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  ) : enabled ? (
                    <>
                      <button
                        onClick={() => handleConfigure(mod.viewState)}
                        disabled={!onChangeView}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                      >
                        <Settings size={14} />
                        Configure
                      </button>
                      <button
                        onClick={() => setDisableTarget({ id: mod.id, name: mod.name })}
                        disabled={isToggling}
                        className="px-3 py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-gray-200 transition-colors"
                        title="Disable module"
                      >
                        {isToggling ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <X size={16} />
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleInstall(mod.id)}
                      disabled={isToggling}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      {isToggling ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        'Install'
                      )}
                    </button>
                  )}
                </div>
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

      {/* Disable Confirmation Dialog */}
      {disableTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDisableTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={24} className="text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
                Disable {disableTarget.name}?
              </h2>
              <p className="text-sm text-gray-500 text-center leading-relaxed">
                Some features linked to this module will become unavailable.
                Your data and settings will be preserved — you can re-enable it at any time.
              </p>
            </div>
            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={() => setDisableTarget(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableConfirm}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
              >
                Disable Module
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
