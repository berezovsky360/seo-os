'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings,
  ArrowRightLeft,
  Table2,
  Zap,
  ExternalLink,
  Globe,
  Plug,
} from 'lucide-react';
import { useSites } from '@/hooks/useSites';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectorStatus {
  connector_version: string;
  rankmath_version: string;
  renderer_mode: string;
}

interface SiteCardState {
  checking: boolean;
  syncing: boolean;
  connectorStatus: ConnectorStatus | null;
  connectorError: string | null;
  lastSync: string | null;
}

// ---------------------------------------------------------------------------
// Field Mapping Data
// ---------------------------------------------------------------------------

const FIELD_MAPPINGS = [
  { seoOs: '_seo_os_title', rankMath: 'rank_math_title', description: 'SEO Title' },
  { seoOs: '_seo_os_description', rankMath: 'rank_math_description', description: 'Meta Description' },
  { seoOs: '_seo_os_focus_keyword', rankMath: 'rank_math_focus_keyword', description: 'Focus Keyword' },
  { seoOs: '_seo_os_canonical_url', rankMath: 'rank_math_canonical_url', description: 'Canonical URL' },
  { seoOs: '_seo_os_robots', rankMath: 'rank_math_robots', description: 'Robots Meta' },
  { seoOs: '_seo_os_og_title', rankMath: 'rank_math_facebook_title', description: 'OG Title' },
  { seoOs: '_seo_os_og_description', rankMath: 'rank_math_facebook_description', description: 'OG Description' },
  { seoOs: '_seo_os_og_image', rankMath: 'rank_math_facebook_image', description: 'OG Image' },
  { seoOs: '_seo_os_twitter_title', rankMath: 'rank_math_twitter_title', description: 'Twitter Title' },
  { seoOs: '_seo_os_schema_json', rankMath: 'rank_math_schemas', description: 'Schema JSON-LD' },
];

// ---------------------------------------------------------------------------
// Features List
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    title: 'SEO metadata columns in article table',
    description: 'View and edit SEO Title, Meta Description, SERP Preview, and more directly in the article list.',
  },
  {
    title: 'Inline editing with character counting',
    description: 'Edit SEO fields inline with real-time character counters and length warnings.',
  },
  {
    title: 'Two-way sync',
    description: 'Push changes to WordPress and pull the latest Rank Math data back into SEO OS.',
  },
  {
    title: 'Dual write to both field namespaces',
    description: 'Saves to both _seo_os_* and rank_math_* fields ensuring compatibility with both systems.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface RankMathBridgeSettingsProps {
  onBack?: () => void;
}

export default function RankMathBridgeSettings({ onBack }: RankMathBridgeSettingsProps) {
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const toast = useToast();

  // Per-site card state
  const [siteStates, setSiteStates] = useState<Record<string, SiteCardState>>({});

  // Fetch last sync dates for all sites
  const { data: lastSyncMap = {} } = useQuery({
    queryKey: ['rankmath-last-sync'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data: sitesData } = await supabase
        .from('sites')
        .select('id')
        .eq('user_id', user.id);

      if (!sitesData || sitesData.length === 0) return {};

      const siteIds = sitesData.map((s: { id: string }) => s.id);
      const result: Record<string, string> = {};

      for (const siteId of siteIds) {
        const { data: latestPost } = await supabase
          .from('posts')
          .select('synced_at')
          .eq('site_id', siteId)
          .order('synced_at', { ascending: false })
          .limit(1)
          .single();

        if (latestPost?.synced_at) {
          result[siteId] = latestPost.synced_at;
        }
      }

      return result;
    },
    staleTime: 60_000,
  });

  // Helper to get/update per-site state
  const getSiteState = (siteId: string): SiteCardState => {
    return siteStates[siteId] || {
      checking: false,
      syncing: false,
      connectorStatus: null,
      connectorError: null,
      lastSync: null,
    };
  };

  const updateSiteState = (siteId: string, partial: Partial<SiteCardState>) => {
    setSiteStates(prev => ({
      ...prev,
      [siteId]: { ...getSiteState(siteId), ...partial },
    }));
  };

  // Check connector status
  const handleCheckPlugin = async (siteId: string) => {
    updateSiteState(siteId, { checking: true, connectorStatus: null, connectorError: null });

    try {
      const res = await fetch(`/api/sites/${siteId}/connector-status`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: ConnectorStatus = await res.json();
      updateSiteState(siteId, { checking: false, connectorStatus: data });
      toast.success('Connector is reachable');
    } catch (err: any) {
      updateSiteState(siteId, { checking: false, connectorError: err?.message || 'Failed to reach connector' });
      toast.error(err?.message || 'Failed to check connector');
    }
  };

  // Sync site
  const handleSync = async (siteId: string) => {
    updateSiteState(siteId, { syncing: true });

    try {
      const res = await fetch(`/api/sites/${siteId}/sync`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      updateSiteState(siteId, { syncing: false });
      toast.success('Sync completed successfully');
    } catch (err: any) {
      updateSiteState(siteId, { syncing: false });
      toast.error(err?.message || 'Sync failed');
    }
  };

  // Partition sites
  const configuredSites = sites.filter((s: any) => s.wp_username && s.wp_app_password);
  const unconfiguredSites = sites.filter((s: any) => !s.wp_username || !s.wp_app_password);

  // ---- Render --------------------------------------------------------------

  return (
    <div className="h-full overflow-auto bg-[#F5F5F7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-16">

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <div className="flex items-center gap-3 mb-1">
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
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-100">
              <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">RankMath Bridge</h1>
              <p className="text-sm text-gray-500">Integration settings and sync management</p>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Connected Sites                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Connected Sites</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Sites with WordPress credentials configured for RankMath Bridge sync.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {sitesLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-gray-400 mr-3" />
                <span className="text-sm text-gray-500">Loading sites...</span>
              </div>
            )}

            {!sitesLoading && sites.length === 0 && (
              <div className="text-center py-12">
                <Globe size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No sites found. Add a site first.</p>
              </div>
            )}

            {/* Configured Sites */}
            {configuredSites.map((site: any) => {
              const state = getSiteState(site.id);
              const syncDate = lastSyncMap[site.id] || null;

              return (
                <div key={site.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">{site.name}</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle2 size={12} />
                          Connected
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{site.url}</p>
                      {syncDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last sync: {formatDate(syncDate)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCheckPlugin(site.id)}
                        disabled={state.checking}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-colors"
                      >
                        {state.checking ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Plug size={13} />
                        )}
                        Check Plugin
                      </button>

                      <button
                        onClick={() => handleSync(site.id)}
                        disabled={state.syncing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors"
                      >
                        {state.syncing ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <RefreshCw size={13} />
                        )}
                        Sync Now
                      </button>
                    </div>
                  </div>

                  {/* Connector Status Result */}
                  {state.connectorStatus && (
                    <div className="mt-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Connector Version
                          </span>
                          <p className="mt-0.5 font-semibold text-gray-900">
                            {state.connectorStatus.connector_version}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank Math Version
                          </span>
                          <p className="mt-0.5 font-semibold text-gray-900">
                            {state.connectorStatus.rankmath_version}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Renderer Mode
                          </span>
                          <p className="mt-0.5 font-semibold text-gray-900">
                            {state.connectorStatus.renderer_mode}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Connector Error */}
                  {state.connectorError && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 rounded-lg px-4 py-2.5 border border-red-100">
                      <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-700">{state.connectorError}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unconfigured Sites */}
            {unconfiguredSites.map((site: any) => (
              <div key={site.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">{site.name}</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <AlertCircle size={12} />
                        Not configured
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{site.url}</p>
                  </div>

                  <span className="text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1 flex-shrink-0">
                    Configure in site Settings
                    <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* SEO Field Mapping                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <Table2 className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">SEO Field Mapping</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              How SEO OS fields map to Rank Math custom fields in WordPress.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    SEO OS Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rank Math Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {FIELD_MAPPINGS.map((mapping, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <code className="text-xs font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                        {mapping.seoOs}
                      </code>
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-xs font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                        {mapping.rankMath}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{mapping.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Features                                                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <Zap className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">What RankMath Bridge Enables</h2>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{feature.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
