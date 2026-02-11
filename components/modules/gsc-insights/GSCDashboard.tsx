'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  RefreshCw,
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Plus,
  MousePointerClick,
  Eye,
  Target,
  ArrowUpRight,
  ChevronLeft,
} from 'lucide-react';
import {
  useGSCAnalytics,
  useGSCTopQueries,
  useGSCTopPages,
  useGSCLowCTR,
  useSyncGSCData,
  type GSCDailyStats,
} from '@/hooks/useGSCInsights';
import { useSites } from '@/hooks/useSites';
import { useAddKeyword } from '@/hooks/useRankPulse';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCTR(ctr: number | undefined | null): string {
  if (ctr == null) return '0.00%';
  // ctr stored as decimal 0-1 in DB
  return `${(ctr * 100).toFixed(2)}%`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateUrl(url: string, maxLen = 60): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (path.length <= maxLen) return path;
    return '\u2026' + path.slice(path.length - maxLen);
  } catch {
    if (url.length <= maxLen) return url;
    return '\u2026' + url.slice(url.length - maxLen);
  }
}

// ---------------------------------------------------------------------------
// Types for sort state
// ---------------------------------------------------------------------------

type SortDir = 'asc' | 'desc';
interface SortState {
  key: string;
  dir: SortDir;
}

function toggleSort(current: SortState, key: string): SortState {
  if (current.key === key) {
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { key, dir: 'desc' };
}

function sortRows<T extends Record<string, any>>(
  rows: T[],
  sort: SortState
): T[] {
  if (!sort.key) return rows;
  return [...rows].sort((a, b) => {
    const av = a[sort.key] ?? 0;
    const bv = b[sort.key] ?? 0;
    if (av < bv) return sort.dir === 'asc' ? -1 : 1;
    if (av > bv) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (s: SortState) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 ${className}`}
      onClick={() => onSort(toggleSort(sort, sortKey))}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <span className="text-indigo-500">
            {sort.dir === 'asc' ? '\u2191' : '\u2193'}
          </span>
        )}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 text-sm">
      <p className="font-medium text-gray-900 mb-1">{formatDate(label)}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type DateRange = '7d' | '30d' | '90d';
type TabId = 'queries' | 'pages' | 'low-ctr' | 'new-keywords';

export default function GSCDashboard({ onBack }: { onBack?: () => void } = {}) {
  // ---- State ---------------------------------------------------------------
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<TabId>('queries');
  const [querySort, setQuerySort] = useState<SortState>({ key: 'gsc_clicks', dir: 'desc' });
  const [pageSort, setPageSort] = useState<SortState>({ key: 'gsc_clicks', dir: 'desc' });
  const [lowCtrSort, setLowCtrSort] = useState<SortState>({ key: 'gsc_impressions', dir: 'desc' });
  const [newKwSort, setNewKwSort] = useState<SortState>({ key: 'gsc_impressions', dir: 'desc' });

  const toast = useToast();

  // ---- Computed dates ------------------------------------------------------
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() - 2);
    const start = new Date(end);
    const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
    start.setDate(start.getDate() - days);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [dateRange]);

  // ---- Data hooks ----------------------------------------------------------
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const gscSites = useMemo(
    () => sites.filter((s: any) => s.gsc_property),
    [sites]
  );

  // Auto-select first GSC site when available
  useMemo(() => {
    if (!selectedSiteId && gscSites.length > 0) {
      setSelectedSiteId(gscSites[0].id);
    }
  }, [gscSites, selectedSiteId]);

  const {
    data: analytics = [],
    isLoading: analyticsLoading,
  } = useGSCAnalytics(selectedSiteId, startDate, endDate);

  const { data: topQueriesData, isLoading: queriesLoading } =
    useGSCTopQueries(selectedSiteId);
  const topQueries = topQueriesData?.queries ?? [];

  const { data: topPages = [], isLoading: pagesLoading } =
    useGSCTopPages(selectedSiteId);

  const { data: lowCtrData = [], isLoading: lowCtrLoading } =
    useGSCLowCTR(selectedSiteId);

  const syncMutation = useSyncGSCData();
  const addKeywordMutation = useAddKeyword();

  // ---- Overview stats ------------------------------------------------------
  const overview = useMemo(() => {
    if (!analytics.length) {
      return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    }
    const totalClicks = analytics.reduce(
      (sum: number, d: GSCDailyStats) => sum + (d.gsc_clicks ?? 0),
      0
    );
    const totalImpressions = analytics.reduce(
      (sum: number, d: GSCDailyStats) => sum + (d.gsc_impressions ?? 0),
      0
    );
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPos =
      analytics.reduce(
        (sum: number, d: GSCDailyStats) => sum + (d.gsc_position ?? 0),
        0
      ) / analytics.length;

    return {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: avgCtr,
      position: avgPos,
    };
  }, [analytics]);

  // ---- Chart data ----------------------------------------------------------
  const chartData = useMemo(
    () =>
      [...analytics]
        .sort(
          (a: GSCDailyStats, b: GSCDailyStats) =>
            new Date(a.date ?? '').getTime() - new Date(b.date ?? '').getTime()
        )
        .map((d: GSCDailyStats) => ({
          date: d.date,
          clicks: d.gsc_clicks ?? 0,
          impressions: d.gsc_impressions ?? 0,
        })),
    [analytics]
  );

  // ---- New keywords (high-impression queries) ------------------------------
  const newKeywords = useMemo(() => {
    if (!topQueries.length) return [];
    // Filter queries with high impressions but lower click-through as potential new targets
    return topQueries
      .filter(
        (q: any) =>
          (q.gsc_impressions ?? 0) > 10 && (q.gsc_ctr ?? 0) < 0.05
      )
      .slice(0, 50);
  }, [topQueries]);

  // ---- Handlers ------------------------------------------------------------
  const handleSync = async () => {
    if (!selectedSiteId) {
      toast.error('Please select a site first.');
      return;
    }
    try {
      await syncMutation.mutateAsync({ site_id: selectedSiteId });
      toast.success('GSC data synced successfully.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to sync GSC data.');
    }
  };

  const handleAddKeyword = async (query: string) => {
    if (!selectedSiteId) return;
    try {
      await addKeywordMutation.mutateAsync({
        site_id: selectedSiteId,
        keyword: query,
      });
      toast.success(`"${query}" added to Rank Pulse.`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add keyword.');
    }
  };

  // ---- Sorted table data ---------------------------------------------------
  const sortedQueries = useMemo(
    () => sortRows(topQueries, querySort),
    [topQueries, querySort]
  );
  const sortedPages = useMemo(
    () => sortRows(topPages, pageSort),
    [topPages, pageSort]
  );
  const sortedLowCtr = useMemo(
    () => sortRows(lowCtrData, lowCtrSort),
    [lowCtrData, lowCtrSort]
  );
  const sortedNewKw = useMemo(
    () => sortRows(newKeywords, newKwSort),
    [newKeywords, newKwSort]
  );

  // ---- No GSC sites --------------------------------------------------------
  if (!sitesLoading && gscSites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <h2 className="text-lg font-semibold text-gray-900">
          No sites with GSC configured
        </h2>
        <p className="text-sm text-gray-500 max-w-md">
          Add a Google Search Console property to one of your sites in the Site
          Settings to start using GSC Insights.
        </p>
      </div>
    );
  }

  // ---- Render --------------------------------------------------------------
  const isLoading =
    analyticsLoading || queriesLoading || pagesLoading || lowCtrLoading;

  const dateRangeOptions: { label: string; value: DateRange }[] = [
    { label: 'Last 7d', value: '7d' },
    { label: 'Last 30d', value: '30d' },
    { label: 'Last 90d', value: '90d' },
  ];

  const tabs: { id: TabId; label: string; icon?: React.ReactNode }[] = [
    { id: 'queries', label: 'Top Queries' },
    { id: 'pages', label: 'Top Pages' },
    {
      id: 'low-ctr',
      label: 'Low CTR',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    },
    {
      id: 'new-keywords',
      label: 'New Keywords',
      icon: <Sparkles className="h-3.5 w-3.5 text-indigo-500" />,
    },
  ];

  const overviewCards = [
    {
      label: 'Total Clicks',
      value: formatNumber(overview.clicks),
      icon: <MousePointerClick className="h-5 w-5 text-blue-600" />,
      border: 'border-l-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Impressions',
      value: formatNumber(overview.impressions),
      icon: <Eye className="h-5 w-5 text-purple-600" />,
      border: 'border-l-purple-500',
      bg: 'bg-purple-50',
    },
    {
      label: 'Avg CTR',
      value: formatCTR(overview.ctr),
      icon: <Target className="h-5 w-5 text-green-600" />,
      border: 'border-l-green-500',
      bg: 'bg-green-50',
    },
    {
      label: 'Avg Position',
      value: overview.position.toFixed(1),
      icon: <ArrowUpRight className="h-5 w-5 text-amber-600" />,
      border: 'border-l-amber-500',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 bg-[#F5F5F7] pb-4 pt-2 -mx-1 px-1">
        <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-100">
              <LineChart className="h-5 w-5 text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">GSC Insights</h1>
          </div>

          {/* Site selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {sitesLoading && (
                <option value="">Loading sites&hellip;</option>
              )}
              {gscSites.map((site: any) => (
                <option key={site.id} value={site.id}>
                  {site.name ?? site.gsc_property}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Date range selector */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2">
        {dateRangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              dateRange === opt.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Overview cards */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 ${card.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}
              >
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {analyticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              ) : (
                card.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Performance chart */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Performance Over Time
        </h2>

        {analyticsLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
            <Search className="h-8 w-8 mb-2" />
            <p className="text-sm">
              No GSC data yet. Click Sync Data to pull from Google Search
              Console.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={formatDate}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatNumber(v)}
                label={{
                  value: 'Clicks',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#6B7280' },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatNumber(v)}
                label={{
                  value: 'Impressions',
                  angle: 90,
                  position: 'insideRight',
                  style: { fontSize: 11, fill: '#6B7280' },
                }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="impressions"
                name="Impressions"
                fill="#8B5CF6"
                fillOpacity={0.1}
                stroke="#8B5CF6"
                strokeWidth={1.5}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                name="Clicks"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3B82F6' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tabs */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tab content */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ---------- Top Queries ----------------------------------------- */}
        {activeTab === 'queries' && (
          <>
            {queriesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : sortedQueries.length === 0 ? (
              <EmptyTabState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Query
                      </th>
                      <SortableHeader
                        label="Clicks"
                        sortKey="gsc_clicks"
                        sort={querySort}
                        onSort={setQuerySort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="Impressions"
                        sortKey="gsc_impressions"
                        sort={querySort}
                        onSort={setQuerySort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="CTR"
                        sortKey="gsc_ctr"
                        sort={querySort}
                        onSort={setQuerySort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="Position"
                        sortKey="gsc_position"
                        sort={querySort}
                        onSort={setQuerySort}
                        className="text-right"
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedQueries.map((q: any, i: number) => (
                      <tr
                        key={q.query ?? i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            {q.query}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNumber(q.gsc_clicks)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNumber(q.gsc_impressions)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatCTR(q.gsc_ctr)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {(q.gsc_position ?? 0).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ---------- Top Pages ------------------------------------------- */}
        {activeTab === 'pages' && (
          <>
            {pagesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : sortedPages.length === 0 ? (
              <EmptyTabState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Page URL
                      </th>
                      <SortableHeader
                        label="Clicks"
                        sortKey="gsc_clicks"
                        sort={pageSort}
                        onSort={setPageSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="Impressions"
                        sortKey="gsc_impressions"
                        sort={pageSort}
                        onSort={setPageSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="CTR"
                        sortKey="gsc_ctr"
                        sort={pageSort}
                        onSort={setPageSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="Avg Position"
                        sortKey="gsc_position"
                        sort={pageSort}
                        onSort={setPageSort}
                        className="text-right"
                      />
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Queries
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedPages.map((p: any, i: number) => (
                      <tr
                        key={p.page ?? i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 max-w-xs">
                          <a
                            href={p.page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium truncate max-w-full"
                            title={p.page}
                          >
                            <span className="truncate">
                              {truncateUrl(p.page ?? '')}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNumber(p.gsc_clicks)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNumber(p.gsc_impressions)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatCTR(p.gsc_ctr)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {(p.gsc_position ?? 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {p.query_count ?? '\u2014'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ---------- Low CTR --------------------------------------------- */}
        {activeTab === 'low-ctr' && (
          <>
            {lowCtrLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : sortedLowCtr.length === 0 ? (
              <EmptyTabState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Page
                      </th>
                      <SortableHeader
                        label="Impressions"
                        sortKey="gsc_impressions"
                        sort={lowCtrSort}
                        onSort={setLowCtrSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="Clicks"
                        sortKey="gsc_clicks"
                        sort={lowCtrSort}
                        onSort={setLowCtrSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="CTR"
                        sortKey="gsc_ctr"
                        sort={lowCtrSort}
                        onSort={setLowCtrSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="Avg Position"
                        sortKey="gsc_position"
                        sort={lowCtrSort}
                        onSort={setLowCtrSort}
                        className="text-right"
                      />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Suggestion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedLowCtr.map((row: any, i: number) => {
                      const ctrVal = (row.gsc_ctr ?? 0) * 100;
                      const ctrColor =
                        ctrVal < 1
                          ? 'text-red-600 bg-red-50'
                          : ctrVal < 2
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-gray-700';

                      return (
                        <tr
                          key={row.page ?? i}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 max-w-xs">
                            <a
                              href={row.page}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium truncate max-w-full"
                              title={row.page}
                            >
                              <span className="truncate">
                                {truncateUrl(row.page ?? '')}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatNumber(row.gsc_impressions)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatNumber(row.gsc_clicks)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ctrColor}`}
                            >
                              {formatCTR(row.gsc_ctr)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {(row.gsc_position ?? 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-amber-700">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              Needs title optimization
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ---------- New Keywords ---------------------------------------- */}
        {activeTab === 'new-keywords' && (
          <>
            {queriesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : sortedNewKw.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Sparkles className="h-8 w-8 mb-2" />
                <p className="text-sm">
                  No new keyword opportunities found yet. Sync more data to
                  discover them.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Query
                      </th>
                      <SortableHeader
                        label="Impressions"
                        sortKey="gsc_impressions"
                        sort={newKwSort}
                        onSort={setNewKwSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="Clicks"
                        sortKey="gsc_clicks"
                        sort={newKwSort}
                        onSort={setNewKwSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="CTR"
                        sortKey="gsc_ctr"
                        sort={newKwSort}
                        onSort={setNewKwSort}
                        className="text-right"
                      />
                      <SortableHeader
                        label="Position"
                        sortKey="gsc_position"
                        sort={newKwSort}
                        onSort={setNewKwSort}
                        className="text-right"
                      />
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedNewKw.map((q: any, i: number) => (
                      <tr
                        key={q.query ?? i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                            {q.query}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNumber(q.gsc_impressions)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNumber(q.gsc_clicks)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatCTR(q.gsc_ctr)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {(q.gsc_position ?? 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleAddKeyword(q.query)}
                            disabled={addKeywordMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                          >
                            {addKeywordMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Add to Rank Pulse
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sync button */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex justify-end">
        <button
          onClick={handleSync}
          disabled={syncMutation.isPending || !selectedSiteId}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {syncMutation.isPending ? 'Syncing\u2026' : 'Sync Data'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state helper
// ---------------------------------------------------------------------------

function EmptyTabState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Search className="h-8 w-8 mb-2" />
      <p className="text-sm">
        No GSC data yet. Click Sync Data to pull from Google Search Console.
      </p>
    </div>
  );
}
