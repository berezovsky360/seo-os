'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart3,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Search,
  ChevronDown,
  ChevronLeft,
  Camera,
  X,
} from 'lucide-react';
import {
  useRankPulseKeywords,
  useKeywordHistory,
  useCheckPositions,
  useAddKeyword,
  useDeleteRankKeyword,
  useSerpSnapshot,
} from '@/hooks/useRankPulse';
import { useSites } from '@/hooks/useSites';
import { useToast } from '@/lib/contexts/ToastContext';
import { DFS_LOCATIONS, DFS_LOCATION_MAP, isoToFlag } from '@/lib/dataforseo/locations';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ====== Helpers ======

function formatTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}

function positionChange(
  current: number | null,
  previous: number | null
): { text: string; color: string; icon: React.ReactNode } {
  if (current === null || previous === null) {
    return { text: '–', color: 'text-gray-400', icon: <Minus size={14} className="text-gray-400" /> };
  }

  const diff = previous - current;

  if (diff > 0) {
    return {
      text: `+${diff}`,
      color: 'text-green-600',
      icon: <TrendingUp size={14} className="text-green-600" />,
    };
  }

  if (diff < 0) {
    return {
      text: `${diff}`,
      color: 'text-red-600',
      icon: <TrendingDown size={14} className="text-red-600" />,
    };
  }

  return { text: '0', color: 'text-gray-400', icon: <Minus size={14} className="text-gray-400" /> };
}

// ====== Component ======

export default function RankPulseDashboard({ onBack }: { onBack?: () => void } = {}) {
  // --- State ---
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newLanguage, setNewLanguage] = useState('ru');
  const [newLocationCode, setNewLocationCode] = useState(2643);
  const [serpSnapshot, setSerpSnapshot] = useState<any | null>(null);
  const [showSerpModal, setShowSerpModal] = useState(false);

  // Country picker state
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Available languages for the selected location
  const selectedLocation = DFS_LOCATION_MAP.get(newLocationCode);
  const availableLanguages = selectedLocation?.languages ?? [{ name: 'Russian', code: 'ru' }];

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filtered countries for search
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return DFS_LOCATIONS;
    const q = countrySearch.toLowerCase();
    return DFS_LOCATIONS.filter(
      (loc) => loc.name.toLowerCase().includes(q) || loc.iso.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const handleSelectCountry = (loc: typeof DFS_LOCATIONS[number]) => {
    setNewLocationCode(loc.code);
    setNewLanguage(loc.languages[0].code);
    setCountrySearch('');
    setShowCountryDropdown(false);
  };

  // --- Data hooks ---
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const { data: keywords = [], isLoading: keywordsLoading } = useRankPulseKeywords(selectedSiteId);
  const { data: history = [], isLoading: historyLoading } = useKeywordHistory(
    selectedKeywordId ?? '',
    30
  );
  const checkPositions = useCheckPositions();
  const addKeyword = useAddKeyword();
  const deleteKeyword = useDeleteRankKeyword();
  const serpSnapshotMutation = useSerpSnapshot();

  const toast = useToast();

  // Auto-select first site when sites load
  React.useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  // --- Computed values ---
  const stats = useMemo(() => {
    const total = keywords.length;
    const withPosition = keywords.filter((k) => k.current_position !== null);
    const avgPosition =
      withPosition.length > 0
        ? withPosition.reduce((sum, k) => sum + (k.current_position ?? 0), 0) / withPosition.length
        : 0;
    const improved = keywords.filter(
      (k) =>
        k.current_position !== null &&
        k.previous_position !== null &&
        k.current_position < k.previous_position
    ).length;
    const dropped = keywords.filter(
      (k) =>
        k.current_position !== null &&
        k.previous_position !== null &&
        k.current_position > k.previous_position
    ).length;

    return { total, avgPosition, improved, dropped };
  }, [keywords]);

  const lastCheckedAt = useMemo(() => {
    const checked = keywords
      .filter((k) => k.last_checked_at)
      .sort(
        (a, b) =>
          new Date(b.last_checked_at!).getTime() - new Date(a.last_checked_at!).getTime()
      );
    return checked.length > 0 ? checked[0].last_checked_at! : null;
  }, [keywords]);

  const selectedKeyword = useMemo(
    () => keywords.find((k) => k.id === selectedKeywordId) ?? null,
    [keywords, selectedKeywordId]
  );

  // --- Handlers ---
  const handleCheckAll = async () => {
    if (!selectedSiteId) return;
    try {
      const result = await checkPositions.mutateAsync(selectedSiteId);
      toast.success(
        `Check complete: ${result.checked} checked, ${result.improved} improved, ${result.dropped} dropped`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to check positions');
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId || !newKeyword.trim()) return;
    try {
      await addKeyword.mutateAsync({
        site_id: selectedSiteId,
        keyword: newKeyword.trim(),
        language: newLanguage,
        location_code: newLocationCode,
      });
      toast.success(`Keyword "${newKeyword.trim()}" added`);
      setNewKeyword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add keyword');
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    if (!window.confirm('Delete this keyword? This cannot be undone.')) return;
    try {
      await deleteKeyword.mutateAsync(keywordId);
      toast.success('Keyword deleted');
      if (selectedKeywordId === keywordId) {
        setSelectedKeywordId(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete keyword');
    }
  };

  const handleSerpSnapshot = async (keyword: string) => {
    try {
      const result = await serpSnapshotMutation.mutateAsync({
        keyword,
        site_id: selectedSiteId,
        location_code: newLocationCode,
        language_code: newLanguage,
      });
      setSerpSnapshot(result);
      setShowSerpModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to get SERP snapshot');
    }
  };

  // --- Chart data ---
  const chartData = useMemo(() => {
    return history.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      position: point.position,
    }));
  }, [history]);

  // ====== Render ======

  // No sites state
  if (!sitesLoading && sites.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BarChart3 size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-500 font-medium mb-1">No sites configured</h3>
          <p className="text-sm text-gray-400">Add a site first to start tracking keyword rankings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* ===== Header ===== */}
      <div className="flex justify-between items-center px-8 py-5 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
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
          <BarChart3 size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Rank Pulse</h1>
        </div>

        <div className="relative">
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value);
              setSelectedKeywordId(null);
            }}
            className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {sites.map((site: any) => (
              <option key={site.id} value={site.id}>
                {site.name || site.url}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* ===== Summary Cards ===== */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Keywords Tracked
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Avg Position
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgPosition > 0 ? stats.avgPosition.toFixed(1) : '–'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Improved
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">{stats.improved}</span>
              <TrendingUp size={18} className="text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Dropped
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-red-600">{stats.dropped}</span>
              <TrendingDown size={18} className="text-red-500" />
            </div>
          </div>
        </div>

        {/* ===== Add Keyword Form ===== */}
        <form
          onSubmit={handleAddKeyword}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
        >
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Keyword
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Enter keyword to track..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Country selector with flag + search */}
            <div className="w-52 relative" ref={countryDropdownRef}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Country
              </label>
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                <span className="text-base leading-none">{selectedLocation ? isoToFlag(selectedLocation.iso) : '🌍'}</span>
                <span className="truncate flex-1 text-left">{selectedLocation?.name ?? 'Select'}</span>
                <ChevronDown size={14} className="text-gray-400 shrink-0" />
              </button>
              {showCountryDropdown && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search country..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredCountries.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center">No countries found</div>
                    ) : (
                      filteredCountries.map((loc) => (
                        <button
                          key={loc.code}
                          type="button"
                          onClick={() => handleSelectCountry(loc)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors text-left ${
                            loc.code === newLocationCode ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <span className="text-base leading-none">{isoToFlag(loc.iso)}</span>
                          <span className="flex-1 truncate">{loc.name}</span>
                          <span className="text-[10px] text-gray-400 uppercase">{loc.iso}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language selector — auto-filtered by selected country */}
            <div className="w-36">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Language
              </label>
              <div className="relative">
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="appearance-none w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={addKeyword.isPending || !newKeyword.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addKeyword.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Add
            </button>
          </div>
        </form>

        {/* ===== Action Bar ===== */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleCheckAll}
            disabled={checkPositions.isPending || keywords.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkPositions.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Check All Positions
          </button>

          {lastCheckedAt && (
            <span className="text-xs text-gray-400">
              Last checked: {formatTime(lastCheckedAt)}
            </span>
          )}
        </div>

        {/* ===== Keywords Table ===== */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {keywordsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-gray-300" />
            </div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-16">
              <Search size={40} className="text-gray-200 mx-auto mb-3" />
              <h3 className="text-gray-500 font-medium mb-1">No keywords tracked</h3>
              <p className="text-sm text-gray-400">Add keywords above to start tracking rankings.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Keyword
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Position
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Previous
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Change
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Volume
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Checked
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw) => {
                  const change = positionChange(kw.current_position, kw.previous_position);
                  const isSelected = selectedKeywordId === kw.id;

                  return (
                    <tr
                      key={kw.id}
                      onClick={() =>
                        setSelectedKeywordId(isSelected ? null : kw.id)
                      }
                      className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50'
                          : 'hover:bg-gray-50/50'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-gray-900">{kw.keyword}</span>
                        {(() => {
                          const kwLoc = DFS_LOCATION_MAP.get(kw.location_code);
                          return (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-gray-400 uppercase">
                              {kwLoc && <span className="text-xs">{isoToFlag(kwLoc.iso)}</span>}
                              {kw.language}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="text-center px-3 py-3.5">
                        <span className="text-sm font-bold text-gray-900">
                          {kw.current_position !== null ? kw.current_position : '–'}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3.5">
                        <span className="text-sm text-gray-500">
                          {kw.previous_position !== null ? kw.previous_position : '–'}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-medium ${change.color}`}
                        >
                          {change.icon}
                          {change.text}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3.5">
                        <span className="text-sm text-gray-500">
                          {kw.search_volume !== null
                            ? kw.search_volume.toLocaleString()
                            : '–'}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3.5">
                        <span className="text-xs text-gray-400">
                          {kw.last_checked_at ? formatTime(kw.last_checked_at) : 'never'}
                        </span>
                      </td>
                      <td className="text-right px-5 py-3.5">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleSerpSnapshot(kw.keyword)}
                            disabled={serpSnapshotMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="SERP Snapshot"
                          >
                            {serpSnapshotMutation.isPending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Camera size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteKeyword(kw.id)}
                            disabled={deleteKeyword.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete keyword"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ===== Position History Chart ===== */}
        {selectedKeywordId && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Position History</h3>
                {selectedKeyword && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    &ldquo;{selectedKeyword.keyword}&rdquo; &mdash; last 30 days
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedKeywordId(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center h-[250px]">
                <Loader2 size={24} className="animate-spin text-gray-300" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">
                No history data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    reversed
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    label={{
                      value: 'Position',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 11, fill: '#9ca3af' },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`#${value}`, 'Position']}
                  />
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* ===== SERP Snapshot Modal ===== */}
      {showSerpModal && serpSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowSerpModal(false);
              setSerpSnapshot(null);
            }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">SERP Snapshot</h2>
                {serpSnapshot.keyword && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    &ldquo;{serpSnapshot.keyword}&rdquo;
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSerpModal(false);
                  setSerpSnapshot(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* SERP Features */}
              {serpSnapshot.serp_features && serpSnapshot.serp_features.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    SERP Features
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {serpSnapshot.serp_features.map((feature: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-200"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Organic Results */}
              {serpSnapshot.organic_results && serpSnapshot.organic_results.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Top 10 Results
                  </h4>
                  <div className="space-y-3">
                    {serpSnapshot.organic_results
                      .slice(0, 10)
                      .map((result: any, i: number) => (
                        <div
                          key={i}
                          className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                          <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-500 text-xs font-bold rounded-lg">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline block truncate"
                            >
                              {result.title || result.url}
                            </a>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {result.url}
                            </p>
                            {result.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {result.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* No results fallback */}
              {(!serpSnapshot.organic_results ||
                serpSnapshot.organic_results.length === 0) &&
                (!serpSnapshot.serp_features ||
                  serpSnapshot.serp_features.length === 0) && (
                  <div className="text-center py-8 text-sm text-gray-400">
                    No SERP data available for this query.
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
