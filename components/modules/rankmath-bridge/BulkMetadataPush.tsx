'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Filter, Download, ChevronDown, ChevronLeft,
  Loader2, CheckCircle2, AlertCircle, Lock,
  RefreshCw, Upload, FileEdit, Globe,
} from 'lucide-react';
import { useSites } from '@/hooks/useSites';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ====== Types ======

interface BulkPost {
  id: string;
  site_id: string;
  site_name: string;
  site_url: string;
  title: string;
  wp_post_id: number | null;
  status: string;
  seo_score: number | null;
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  robots_meta: string | null;
  word_count: number | null;
  url: string | null;
}

type TabId = 'all' | 'unoptimized' | 'pending' | 'drafts';

interface EditState {
  seo_title: string;
  seo_description: string;
}

// ====== Data fetching ======

async function fetchAllPosts(): Promise<BulkPost[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, url')
    .eq('user_id', user.id);

  if (!sites || sites.length === 0) return [];

  const siteIds = sites.map(s => s.id);
  const siteMap = new Map(sites.map(s => [s.id, s]));

  const { data: posts } = await supabase
    .from('posts')
    .select('id, site_id, title, wp_post_id, status, seo_score, seo_title, seo_description, focus_keyword, canonical_url, robots_meta, word_count, url')
    .in('site_id', siteIds)
    .order('created_at', { ascending: false });

  if (!posts) return [];

  return posts.map(p => {
    const site = siteMap.get(p.site_id);
    return {
      ...p,
      site_name: site?.name || 'Unknown',
      site_url: site?.url || '',
    };
  });
}

// ====== Helpers ======

function getStatusIcon(status: string) {
  switch (status) {
    case 'publish':
      return <CheckCircle2 size={18} className="text-emerald-500" />;
    case 'pending':
      return <FileEdit size={18} className="text-amber-500" />;
    case 'draft':
      return <Lock size={18} className="text-gray-400" />;
    default:
      return <AlertCircle size={18} className="text-gray-400" />;
  }
}

function charCountColor(current: number, max: number): string {
  if (current === 0) return 'text-gray-300';
  if (current > max) return 'text-rose-500';
  if (current > max * 0.9) return 'text-amber-500';
  return 'text-gray-400';
}

function extractPath(url: string | null, siteUrl: string): string {
  if (!url) return '/';
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url.replace(siteUrl, '') || '/';
  }
}

// ====== SERP Preview ======

function SERPPreview({ title, description, url }: { title: string; description: string; url: string }) {
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const parts = displayUrl.split('/');
  const breadcrumb = parts.length > 1
    ? `${parts[0]} › ${parts.slice(1).join(' › ')}`
    : parts[0];

  return (
    <div className="min-w-[200px] max-w-[320px]">
      <p className="text-sm text-blue-700 font-medium leading-tight truncate hover:underline cursor-pointer">
        {title || 'Page Title'}
      </p>
      <p className="text-xs text-emerald-700 truncate mt-0.5">{breadcrumb}</p>
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-0.5">
        {description || 'No meta description set.'}
      </p>
    </div>
  );
}

// ====== Main Component ======

interface BulkMetadataPushProps {
  onBack?: () => void;
}

export default function BulkMetadataPush({ onBack }: BulkMetadataPushProps) {
  const { data: sites = [] } = useSites();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: allPosts = [], isLoading, refetch } = useQuery({
    queryKey: ['bulk-posts'],
    queryFn: fetchAllPosts,
    staleTime: 60_000,
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [pushing, setPushing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Unsaved changes tracking
  const changedPostIds = useMemo(() => {
    const ids: string[] = [];
    for (const [postId, edit] of Object.entries(edits)) {
      const original = allPosts.find(p => p.id === postId);
      if (!original) continue;
      if (
        edit.seo_title !== (original.seo_title || '') ||
        edit.seo_description !== (original.seo_description || '')
      ) {
        ids.push(postId);
      }
    }
    return ids;
  }, [edits, allPosts]);

  const changedSiteCount = useMemo(() => {
    const siteIds = new Set(changedPostIds.map(id => allPosts.find(p => p.id === id)?.site_id).filter(Boolean));
    return siteIds.size;
  }, [changedPostIds, allPosts]);

  // Filter + tab
  const filteredPosts = useMemo(() => {
    let result = allPosts;

    // Tab filter
    switch (activeTab) {
      case 'unoptimized':
        result = result.filter(p => !p.seo_title || !p.seo_description);
        break;
      case 'pending':
        result = result.filter(p => p.status === 'pending');
        break;
      case 'drafts':
        result = result.filter(p => p.status === 'draft');
        break;
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.seo_title?.toLowerCase().includes(q) ||
        p.site_name?.toLowerCase().includes(q) ||
        p.url?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allPosts, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: allPosts.length,
    unoptimized: allPosts.filter(p => !p.seo_title || !p.seo_description).length,
    pending: allPosts.filter(p => p.status === 'pending').length,
    drafts: allPosts.filter(p => p.status === 'draft').length,
  }), [allPosts]);

  // Editing
  const getEditValue = useCallback((postId: string, field: keyof EditState): string => {
    if (edits[postId]) return edits[postId][field];
    const post = allPosts.find(p => p.id === postId);
    if (!post) return '';
    return field === 'seo_title' ? (post.seo_title || '') : (post.seo_description || '');
  }, [edits, allPosts]);

  const updateEdit = useCallback((postId: string, field: keyof EditState, value: string) => {
    setEdits(prev => {
      const post = allPosts.find(p => p.id === postId);
      const existing = prev[postId] || {
        seo_title: post?.seo_title || '',
        seo_description: post?.seo_description || '',
      };
      return { ...prev, [postId]: { ...existing, [field]: value } };
    });
  }, [allPosts]);

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map(p => p.id)));
    }
  };

  // Save all changes to Supabase
  const handleSaveDrafts = async () => {
    if (changedPostIds.length === 0) return;

    let saved = 0;
    for (const postId of changedPostIds) {
      const edit = edits[postId];
      if (!edit) continue;

      const { error } = await supabase
        .from('posts')
        .update({
          seo_title: edit.seo_title || null,
          seo_description: edit.seo_description || null,
        })
        .eq('id', postId);

      if (!error) saved++;
    }

    toast.success(`Saved ${saved} changes`);
    setEdits({});
    refetch();
  };

  // Push to WordPress
  const handlePushAll = async () => {
    const toPush = changedPostIds.length > 0 ? changedPostIds : Array.from(selectedIds);
    if (toPush.length === 0) return;

    // Save first
    if (changedPostIds.length > 0) await handleSaveDrafts();

    setPushing(true);
    let ok = 0;
    let fail = 0;

    for (const postId of toPush) {
      const post = allPosts.find(p => p.id === postId);
      if (!post?.wp_post_id) { fail++; continue; }

      try {
        const res = await fetch(`/api/posts/${postId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update' }),
        });
        if (res.ok) ok++; else fail++;
      } catch {
        fail++;
      }
    }

    setPushing(false);
    if (ok > 0) toast.success(`Pushed ${ok} post(s) to WordPress`);
    if (fail > 0) toast.error(`${fail} failed to push`);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const discardChanges = () => {
    setEdits({});
  };

  // ====== Render ======

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All Pages', count: tabCounts.all },
    { id: 'unoptimized', label: 'Unoptimized', count: tabCounts.unoptimized },
    { id: 'pending', label: 'Pending Sync', count: tabCounts.pending },
    { id: 'drafts', label: 'Drafts', count: tabCounts.drafts },
  ];

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
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
            <Globe size={20} className="text-indigo-600 hidden sm:block" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Bulk Meta Editor</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="sm:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Search size={18} />
            </button>
            <button className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
              <Filter size={16} />
              <span className="hidden sm:inline">Filter</span>
            </button>
            <button className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>

        {/* Search (mobile expandable, desktop inline) */}
        <div className={`px-4 sm:px-6 lg:px-8 pb-3 ${showSearch ? 'block' : 'hidden sm:block'}`}>
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-2 max-w-lg focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search pages, titles, sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-4 sm:px-6 lg:px-8 border-b border-gray-100 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400 mr-3" />
            <span className="text-sm text-gray-500">Loading pages...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <Search size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No pages found</p>
          </div>
        ) : (
          <div className="min-w-[900px]">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_1.2fr_1.5fr_1fr] bg-gray-50 border-b border-gray-200 sticky top-0 z-5">
              <div className="flex items-center justify-center py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredPosts.length && filteredPosts.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
              <div className="py-3 px-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">URL & Site</span>
              </div>
              <div className="py-3 px-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Page SEO Title</span>
              </div>
              <div className="py-3 px-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Meta Description</span>
              </div>
              <div className="py-3 px-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">SERP Preview</span>
              </div>
            </div>

            {/* Table rows */}
            {filteredPosts.map(post => {
              const titleVal = getEditValue(post.id, 'seo_title');
              const descVal = getEditValue(post.id, 'seo_description');
              const isChanged = changedPostIds.includes(post.id);
              const path = extractPath(post.url, post.site_url);
              const fullUrl = post.url || `${post.site_url}${path}`;

              return (
                <div
                  key={post.id}
                  className={`grid grid-cols-[40px_1fr_1.2fr_1.5fr_1fr] border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                    isChanged ? 'bg-amber-50/30' : 'bg-white'
                  }`}
                >
                  {/* Checkbox + Status */}
                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(post.id)}
                      onChange={() => toggleSelect(post.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    {getStatusIcon(post.status)}
                  </div>

                  {/* URL & Site */}
                  <div className="py-4 px-3 flex flex-col justify-center min-w-0">
                    <span className="text-sm font-semibold text-blue-600 truncate">{post.site_name}</span>
                    <span className="text-xs text-gray-400 truncate mt-0.5">{path}</span>
                  </div>

                  {/* SEO Title (editable) */}
                  <div className="py-4 px-3 flex flex-col justify-center">
                    <textarea
                      value={titleVal}
                      onChange={(e) => updateEdit(post.id, 'seo_title', e.target.value)}
                      rows={2}
                      className="w-full text-sm text-gray-900 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 rounded-lg px-2 py-1.5 resize-none outline-none transition-all"
                      placeholder="Enter SEO title..."
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-[10px] font-medium tabular-nums ${charCountColor(titleVal.length, 60)}`}>
                        {titleVal.length} / 60
                      </span>
                    </div>
                  </div>

                  {/* Meta Description (editable) */}
                  <div className="py-4 px-3 flex flex-col justify-center">
                    <textarea
                      value={descVal}
                      onChange={(e) => updateEdit(post.id, 'seo_description', e.target.value)}
                      rows={3}
                      className="w-full text-sm text-gray-900 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 rounded-lg px-2 py-1.5 resize-none outline-none transition-all"
                      placeholder="Enter meta description..."
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-[10px] font-medium tabular-nums ${charCountColor(descVal.length, 160)}`}>
                        {descVal.length} / 160
                      </span>
                    </div>
                  </div>

                  {/* SERP Preview */}
                  <div className="py-4 px-3 flex items-center">
                    <SERPPreview
                      title={titleVal || post.title}
                      description={descVal}
                      url={fullUrl}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {changedPostIds.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 bg-white border-t border-gray-200 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-sm text-gray-600">
              <strong>{changedPostIds.length}</strong> unsaved metadata change{changedPostIds.length !== 1 ? 's' : ''}
              {changedSiteCount > 0 && (
                <span className="text-gray-400"> across {changedSiteCount} site{changedSiteCount !== 1 ? 's' : ''}</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={discardChanges}
              className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Discard changes
            </button>
            <button
              onClick={handleSaveDrafts}
              className="px-3 sm:px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm"
            >
              Save Drafts
            </button>
            <button
              onClick={handlePushAll}
              disabled={pushing}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-50 transition-colors"
            >
              {pushing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>Push All Changes</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
