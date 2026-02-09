'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, Search, Filter, Upload, CheckCircle2,
  Loader2, Globe, Edit3, Save, X, ChevronDown,
  ArrowUpDown, ExternalLink, AlertCircle, RefreshCw
} from 'lucide-react';
import { useSites } from '@/hooks/useSites';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SEOScoreIndicator from '@/components/SEOScoreIndicator';

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

interface EditingFields {
  seo_title?: string;
  seo_description?: string;
  focus_keyword?: string;
}

interface BulkMetadataPushProps {
  onBack?: () => void;
}

// Fetch all posts across all sites
async function fetchAllPosts(): Promise<BulkPost[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user's sites
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, url')
    .eq('user_id', user.id);

  if (!sites || sites.length === 0) return [];

  const siteIds = sites.map(s => s.id);
  const siteMap = new Map(sites.map(s => [s.id, s]));

  // Get all posts from these sites
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

export default function BulkMetadataPush({ onBack }: BulkMetadataPushProps) {
  const { data: sites = [] } = useSites();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch all posts
  const { data: allPosts = [], isLoading, refetch } = useQuery({
    queryKey: ['bulk-posts'],
    queryFn: fetchAllPosts,
    staleTime: 60 * 1000,
  });

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [sortField, setSortField] = useState<'title' | 'seo_score' | 'site_name'>('site_name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState<EditingFields>({});
  const [pushing, setPushing] = useState(false);
  const [pushingIds, setPushingIds] = useState<Set<string>>(new Set());

  // Filter + sort posts
  const filteredPosts = useMemo(() => {
    let result = allPosts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.seo_title?.toLowerCase().includes(q) ||
        p.focus_keyword?.toLowerCase().includes(q)
      );
    }

    if (filterSite !== 'all') {
      result = result.filter(p => p.site_id === filterSite);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = (a.title || '').localeCompare(b.title || '');
      else if (sortField === 'seo_score') cmp = (a.seo_score || 0) - (b.seo_score || 0);
      else if (sortField === 'site_name') cmp = a.site_name.localeCompare(b.site_name);
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [allPosts, searchQuery, filterSite, sortField, sortAsc]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const startEditing = (post: BulkPost) => {
    setEditingId(post.id);
    setEditingFields({
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
      focus_keyword: post.focus_keyword || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          seo_title: editingFields.seo_title || null,
          seo_description: editingFields.seo_description || null,
          focus_keyword: editingFields.focus_keyword || null,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Metadata saved locally');
      setEditingId(null);
      refetch();
    } catch {
      toast.error('Failed to save');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingFields({});
  };

  // Push selected posts to WordPress
  const handlePushSelected = async () => {
    if (selectedIds.size === 0) return;

    setPushing(true);
    let successCount = 0;
    let failCount = 0;

    for (const postId of selectedIds) {
      const post = allPosts.find(p => p.id === postId);
      if (!post || !post.wp_post_id) {
        failCount++;
        continue;
      }

      setPushingIds(prev => new Set(prev).add(postId));

      try {
        const res = await fetch(`/api/posts/${postId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update' }),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      setPushingIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }

    setPushing(false);
    setSelectedIds(new Set());

    if (successCount > 0) toast.success(`Pushed ${successCount} post(s) to WordPress`);
    if (failCount > 0) toast.warning(`${failCount} post(s) failed to push`);

    refetch();
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const seoTitleLength = (editingFields.seo_title || '').length;
  const seoDescLength = (editingFields.seo_description || '').length;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 bg-[#F5F6F8] border-b border-gray-200 sticky top-0 z-10">
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
            <Globe size={20} className="text-gray-900" />
            <h1 className="text-lg font-bold text-gray-900">Bulk Metadata Editor</h1>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {filteredPosts.length} posts
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handlePushSelected}
              disabled={pushing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              {pushing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Push {selectedIds.size} to WordPress
            </button>
          )}
        </div>
      </div>

      <div className="p-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, SEO title, keyword..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Sites</option>
            {sites.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name || site.url}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gray-300" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <Globe size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-gray-500 font-medium mb-1">No posts found</h3>
            <p className="text-sm text-gray-400">
              Sync your WordPress sites first to see posts here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredPosts.length && filteredPosts.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('site_name')}
                    >
                      <div className="flex items-center gap-1">Site <ArrowUpDown size={10} /></div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('title')}
                    >
                      <div className="flex items-center gap-1">Title <ArrowUpDown size={10} /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SEO Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Meta Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Keyword</th>
                    <th
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('seo_score')}
                    >
                      <div className="flex items-center gap-1 justify-center">Score <ArrowUpDown size={10} /></div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post) => {
                    const isEditing = editingId === post.id;
                    const isSelected = selectedIds.has(post.id);
                    const isPushing = pushingIds.has(post.id);

                    return (
                      <tr
                        key={post.id}
                        className={`border-b border-gray-50 transition-colors ${
                          isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(post.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md truncate max-w-[120px] inline-block">
                            {post.site_name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <span className="text-sm font-medium text-gray-900 truncate">{post.title || 'Untitled'}</span>
                            {post.url && (
                              <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-indigo-500 shrink-0">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          {isPushing && (
                            <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                              <Loader2 size={10} className="animate-spin" />
                              Pushing...
                            </div>
                          )}
                        </td>

                        {/* SEO Title */}
                        <td className="px-4 py-3 max-w-[200px]">
                          {isEditing ? (
                            <div>
                              <input
                                type="text"
                                value={editingFields.seo_title || ''}
                                onChange={(e) => setEditingFields(f => ({ ...f, seo_title: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="SEO Title"
                              />
                              <span className={`text-[10px] ${seoTitleLength > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                                {seoTitleLength}/60
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600 truncate block">{post.seo_title || '—'}</span>
                          )}
                        </td>

                        {/* Meta Description */}
                        <td className="px-4 py-3 max-w-[250px]">
                          {isEditing ? (
                            <div>
                              <textarea
                                value={editingFields.seo_description || ''}
                                onChange={(e) => setEditingFields(f => ({ ...f, seo_description: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                rows={2}
                                placeholder="Meta description"
                              />
                              <span className={`text-[10px] ${seoDescLength > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                                {seoDescLength}/160
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600 truncate block">{post.seo_description || '—'}</span>
                          )}
                        </td>

                        {/* Focus Keyword */}
                        <td className="px-4 py-3 max-w-[120px]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingFields.focus_keyword || ''}
                              onChange={(e) => setEditingFields(f => ({ ...f, focus_keyword: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="Keyword"
                            />
                          ) : (
                            <span className="text-xs text-gray-600 truncate block">{post.focus_keyword || '—'}</span>
                          )}
                        </td>

                        {/* SEO Score */}
                        <td className="px-4 py-3 text-center">
                          {post.seo_score != null ? (
                            <SEOScoreIndicator score={post.seo_score} size="sm" />
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={saveEdit}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"
                                title="Save"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(post)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                              title="Edit metadata"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
