import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Site } from '../types';
import { ArticleRecord } from '@/lib/services/articleService';
import { ChevronLeft, ChevronRight, Settings, FileText, Tag, Folder, Save, CheckCircle2, CheckSquare, MoreHorizontal, Filter, Search, Globe, AlertTriangle, Monitor, Smartphone, TrendingUp, BarChart3, AlertCircle, Calendar, ChevronDown, Plus, Wifi, Trash2, Edit, Eye, GripVertical, Settings2, TrendingDown, X, Loader2, RefreshCw, Download, Puzzle, ExternalLink, Link2, Image as ImageIcon, BookOpen, Shield, Hash, Upload, RefreshCcw, Wand2, Sparkles, Palette, ShoppingBag, Layout, ArrowRightLeft, Swords } from 'lucide-react';
import { useSite, useUpdateSite, usePatchSite, useDeleteSite } from '@/hooks/useSites';
import { useArticles, useCreateArticle, usePublishArticleToWordPress } from '@/hooks/useArticles';
import { useSyncPosts, usePosts } from '@/hooks/usePosts';
import { useToast } from '@/lib/contexts/ToastContext';
import { useCore } from '@/lib/contexts/CoreContext';
import { useQueryClient } from '@tanstack/react-query';
import { useBackgroundTasks } from '@/lib/contexts/BackgroundTaskContext';
import PublishModal from './PublishModal';
import SEOScoreIndicator from './SEOScoreIndicator';
import AIGeneratePopover from './AIGeneratePopover';
import RedirectManager from './modules/redirects/RedirectManager';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { useMoveSiteToWorkspace } from '@/hooks/useWorkspaces';

// ─── Move Site to Workspace Section ───
function WorkspaceMoveSection({ siteId, currentWorkspaceId }: { siteId: string; currentWorkspaceId?: string | null }) {
  const { workspaces } = useWorkspace();
  const moveSite = useMoveSiteToWorkspace();
  const toast = useToast();

  if (workspaces.length <= 1) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-[2rem] p-8 shadow-sm mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <ArrowRightLeft size={20} className="text-indigo-600" />
          Workspace
        </h3>
        <p className="text-sm text-gray-500 mt-1">Move this site to a different workspace.</p>
      </div>
      <select
        value={currentWorkspaceId || ''}
        onChange={(e) => {
          moveSite.mutate(
            { siteId, workspaceId: e.target.value },
            { onSuccess: () => toast.success('Site moved to workspace') }
          );
        }}
        disabled={moveSite.isPending}
        className="w-full max-w-xs px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none disabled:opacity-50"
      >
        {workspaces.map(ws => (
          <option key={ws.id} value={ws.id}>{ws.emoji} {ws.name}</option>
        ))}
      </select>
    </div>
  );
}

interface SiteDetailsProps {
    siteId: string;
    onBack: () => void;
}

type Tab = 'overview' | 'content' | 'categories' | 'tags' | 'redirects' | 'settings';
type ContentFilter = 'all' | 'wordpress' | 'generated';

// Unified content item that merges Post and ArticleRecord
interface ContentItem {
    id: string;
    source: 'wordpress' | 'generated';
    title: string | null;
    keyword: string | null;
    seo_score: number | null;
    preliminary_seo_score?: number | null;
    readability_score: number | null;
    word_count: number | null;
    status: string;
    wp_post_id: number | null;
    slug: string | null;
    url: string | null;
    published_at: string | null;
    created_at: string;
    // Rank Math fields
    seo_title: string | null;
    seo_description: string | null;
    canonical_url: string | null;
    robots_meta: string | null;
    internal_links_count: number | null;
    external_links_count: number | null;
    images_count: number | null;
    images_alt_count: number | null;
    schema_article_type: string | null;
    og_title: string | null;
    additional_keywords: string[] | null;
    // Original data for actions
    originalArticle?: ArticleRecord;
    originalPost?: any;
}

// Column definition with module group
interface ColumnDef {
    id: string;
    label: string;
    required?: boolean;
    group: 'core' | 'rankmath' | 'nana-banana' | 'ai-writer';
}

// Dynamic columns based on enabled modules
function getAvailableColumns(modules: { rm: boolean; nana: boolean }): ColumnDef[] {
    const cols: ColumnDef[] = [
        { id: 'title', label: 'Title', required: true, group: 'core' },
        { id: 'source', label: 'Source', group: 'core' },
        { id: 'keyword', label: 'Keyword', group: 'core' },
        { id: 'seo_score', label: 'SEO Score', group: 'core' },
        { id: 'word_count', label: 'Words', group: 'core' },
        { id: 'published_at', label: 'Published', group: 'core' },
        { id: 'status', label: 'Status', group: 'core' },
        { id: 'actions', label: 'Actions', required: true, group: 'core' },
    ];

    if (modules.rm) {
        // Insert RM columns after seo_score (index 4)
        const insertAt = 4;
        const rmCols: ColumnDef[] = [
            { id: 'seo_title', label: 'SEO Title', group: 'rankmath' },
            { id: 'seo_description', label: 'Meta Desc', group: 'rankmath' },
            { id: 'serp_preview', label: 'SERP Preview', group: 'rankmath' },
            { id: 'readability', label: 'Readability', group: 'rankmath' },
            { id: 'links', label: 'Links', group: 'rankmath' },
            { id: 'images', label: 'Images', group: 'rankmath' },
            { id: 'robots', label: 'Robots', group: 'rankmath' },
            { id: 'schema_type', label: 'Schema', group: 'rankmath' },
            { id: 'canonical', label: 'Canonical', group: 'rankmath' },
            { id: 'og_title', label: 'OG Title', group: 'rankmath' },
        ];
        cols.splice(insertAt + 1, 0, ...rmCols);
    }

    if (modules.nana) {
        // Insert cover column before actions
        const actionsIdx = cols.findIndex(c => c.id === 'actions');
        cols.splice(actionsIdx, 0, { id: 'cover', label: 'Cover', group: 'nana-banana' });
    }

    return cols;
}

// Character count color helper
function charCountColor(current: number, max: number): string {
    if (current === 0) return 'text-gray-400';
    if (current > max) return 'text-rose-500';
    if (current > max * 0.9) return 'text-amber-500';
    return 'text-gray-400';
}

type StatusTab = 'all' | 'unoptimized' | 'pending-sync' | 'drafts';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const SiteDetails: React.FC<SiteDetailsProps> = ({ siteId, onBack }) => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [contentFilter, setContentFilter] = useState<ContentFilter>('all');

    // Fetch site data
    const { data: site, isLoading: siteLoading } = useSite(siteId);
    const { data: articles = [], isLoading: articlesLoading } = useArticles(siteId);
    const { data: posts = [], isLoading: postsLoading } = usePosts(siteId);
    const updateSite = useUpdateSite();
    const patchSite = usePatchSite();
    const deleteSite = useDeleteSite();
    const syncPosts = useSyncPosts();
    const publishArticle = usePublishArticleToWordPress();
    const createArticle = useCreateArticle();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { isModuleEnabled } = useCore();
    const { tasks } = useBackgroundTasks();
    const nanaBananaEnabled = isModuleEnabled('nana-banana');
    const rmBridgeEnabled = isModuleEnabled('rankmath-bridge');
    const aiWriterEnabled = isModuleEnabled('ai-writer');

    // Invalidate content queries when a bulk_generate background task completes
    const handledBulkTaskIds = useRef(new Set<string>());
    useEffect(() => {
        for (const task of tasks) {
            if (task.task_type !== 'bulk_generate') continue;
            if (task.status !== 'completed' && task.status !== 'failed') continue;
            if (handledBulkTaskIds.current.has(task.id)) continue;
            handledBulkTaskIds.current.add(task.id);
            if (task.status === 'completed') {
                queryClient.invalidateQueries({ queryKey: ['posts'] });
                queryClient.invalidateQueries({ queryKey: ['articles'] });
                const result = task.result as any;
                toast.success(`Bulk generation complete: ${result?.success || 0}/${result?.total || 0} succeeded`);
            } else {
                toast.error(`Bulk generation failed: ${task.error || 'Unknown error'}`);
            }
        }
    }, [tasks, queryClient, toast]);

    // Dynamic columns based on modules
    const availableColumns = React.useMemo(
        () => getAvailableColumns({ rm: rmBridgeEnabled, nana: nanaBananaEnabled }),
        [rmBridgeEnabled, nanaBananaEnabled]
    );

    // Cover Style State (multi-image, up to 10)
    const [coverStylePrompt, setCoverStylePrompt] = useState('');
    const [coverReferenceUrls, setCoverReferenceUrls] = useState<string[]>([]);
    const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
    const [pendingStyleFiles, setPendingStyleFiles] = useState<{ file: File; preview: string }[]>([]);

    // Cover generation in content table
    const [generatingCoverId, setGeneratingCoverId] = useState<string | null>(null);

    // New Article Dialog State
    const [showNewArticleDialog, setShowNewArticleDialog] = useState(false);
    const [newArticleKeyword, setNewArticleKeyword] = useState('');
    const [newArticleTitle, setNewArticleTitle] = useState('');
    const [isCreatingArticle, setIsCreatingArticle] = useState(false);
    const [analyzingArticleId, setAnalyzingArticleId] = useState<string | null>(null);

    // Wordpress Settings State
    const [wpUrl, setWpUrl] = useState('');
    const [wpUsername, setWpUsername] = useState('');
    const [wpAppPassword, setWpAppPassword] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Connector Plugin State
    const [connectorStatus, setConnectorStatus] = useState<{
        installed: boolean;
        version?: string;
        rankMathActive?: boolean;
        rankMathVersion?: string | null;
        checking: boolean;
    }>({ installed: false, checking: false });

    // Publish Modal State
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [articleToPublish, setArticleToPublish] = useState<ArticleRecord | null>(null);

    // Categories & Tags State
    const [wpCategories, setWpCategories] = useState<Array<{id: number; name: string; slug: string; count: number}>>([]);
    const [wpTags, setWpTags] = useState<Array<{id: number; name: string; slug: string; count: number}>>([]);
    const [isCatTagsLoading, setIsCatTagsLoading] = useState(false);
    const [catTagsError, setCatTagsError] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [isCreatingCatTag, setIsCreatingCatTag] = useState(false);
    const [editingCatTag, setEditingCatTag] = useState<{ type: 'category' | 'tag'; id: number; name: string } | null>(null);
    const [isSavingCatTag, setIsSavingCatTag] = useState(false);
    const [deletingCatTagId, setDeletingCatTagId] = useState<number | null>(null);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = (items: typeof filteredContent) => {
        const itemIds = items.map(item => item.id);
        const allOnPage = itemIds.every(id => selectedIds.has(id));
        if (allOnPage) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                itemIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds(prev => new Set([...prev, ...itemIds]));
        }
    };

    const selectAllPages = () => {
        setSelectedIds(new Set(filteredContent.map(item => item.id)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleBulkStatusChange = async (status: string) => {
        setShowBulkStatusDropdown(false);
        if (selectedIds.size === 0) return;
        setBulkProcessing(true);
        const items = filteredContent.filter(item => selectedIds.has(item.id));
        setBulkProgress({ current: 0, total: items.length });
        let success = 0;
        for (const item of items) {
            try {
                const endpoint = item.source === 'wordpress'
                    ? `/api/posts/${item.id}`
                    : `/api/articles/${item.id}`;
                await fetch(endpoint, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status }),
                });
                success++;
            } catch {}
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        toast.success(`Updated ${success}/${items.length} items`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        setSelectedIds(new Set());
        setBulkProcessing(false);
    };

    const handleBulkPublish = async () => {
        if (selectedIds.size === 0) return;
        const items = filteredContent.filter(item => selectedIds.has(item.id) && item.title);
        if (items.length === 0) {
            toast.warning('Selected items must have a title');
            return;
        }
        setBulkProcessing(true);
        setBulkProgress({ current: 0, total: items.length });
        let success = 0;
        for (const item of items) {
            try {
                const endpoint = item.source === 'wordpress'
                    ? `/api/posts/${item.id}/publish`
                    : `/api/articles/${item.id}/publish`;
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ siteId }),
                });
                const result = await res.json();
                if (result.success) success++;
            } catch {}
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        toast.success(`Synced ${success}/${items.length} items to WordPress`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        setSelectedIds(new Set());
        setBulkProcessing(false);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} items? This cannot be undone.`)) return;
        setBulkProcessing(true);
        const items = filteredContent.filter(item => selectedIds.has(item.id));
        setBulkProgress({ current: 0, total: items.length });
        let success = 0;
        for (const item of items) {
            try {
                const endpoint = item.source === 'wordpress'
                    ? `/api/posts/${item.id}`
                    : `/api/articles/${item.id}`;
                await fetch(endpoint, { method: 'DELETE' });
                success++;
            } catch {}
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        toast.success(`Deleted ${success}/${items.length} items`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        setSelectedIds(new Set());
        setBulkProcessing(false);
    };

    const handleGenerateCover = async (itemId: string) => {
        setGeneratingCoverId(itemId);
        try {
            const res = await fetch('/api/nana-banana/pipeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ site_id: siteId, post_id: itemId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Pipeline failed');
            toast.success('Cover generated and uploaded to WordPress!');
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        } catch (error) {
            toast.error(`Cover generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setGeneratingCoverId(null);
        }
    };

    const handleBulkGenerateCovers = async () => {
        if (selectedIds.size === 0) return;
        const items = filteredContent.filter(item => selectedIds.has(item.id) && item.wp_post_id);
        if (items.length === 0) {
            toast.warning('Selected items must have a WordPress post ID');
            return;
        }
        setBulkProcessing(true);
        setBulkProgress({ current: 0, total: items.length });
        let success = 0;
        for (const item of items) {
            try {
                const res = await fetch('/api/nana-banana/pipeline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ site_id: siteId, post_id: item.id }),
                });
                const data = await res.json();
                if (data.media_url) success++;
            } catch {}
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        toast.success(`Generated covers for ${success}/${items.length} items`);
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        setSelectedIds(new Set());
        setBulkProcessing(false);
    };

    // Bulk AI generation — fires background task, progress shown in BackgroundTaskPanel
    const handleBulkGenerateTitles = async () => {
        setShowBulkStatusDropdown(false);
        if (selectedIds.size === 0) return;
        const items = filteredContent.filter(item => selectedIds.has(item.id));
        const payload = items.map(item => ({
            id: item.id,
            post_id: item.id.replace(/^(wp-|gen-)/, ''),
            keyword: item.keyword,
        }));
        try {
            const res = await fetch('/api/ai-writer/bulk-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: payload, action: 'titles', site_id: siteId }),
            });
            if (res.ok) {
                toast.success(`Title generation started for ${items.length} items — see Background Tasks`);
                setSelectedIds(new Set());
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to start bulk generation');
            }
        } catch (err) {
            toast.error('Failed to start bulk generation');
        }
    };

    const handleBulkGenerateDescriptions = async () => {
        setShowBulkStatusDropdown(false);
        if (selectedIds.size === 0) return;
        const items = filteredContent.filter(item => selectedIds.has(item.id));
        const payload = items.map(item => ({
            id: item.id,
            post_id: item.id.replace(/^(wp-|gen-)/, ''),
            keyword: item.keyword,
        }));
        try {
            const res = await fetch('/api/ai-writer/bulk-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: payload, action: 'descriptions', site_id: siteId }),
            });
            if (res.ok) {
                toast.success(`Description generation started for ${items.length} items — see Background Tasks`);
                setSelectedIds(new Set());
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to start bulk generation');
            }
        } catch (err) {
            toast.error('Failed to start bulk generation');
        }
    };

    // Column Customization State
    const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>([
        'title',
        'seo_title',
        'seo_description',
        'serp_preview',
        'status',
        'actions',
    ]);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

    // Status tab filter
    const [statusTab, setStatusTab] = useState<StatusTab>('all');

    // Inline SEO editing state (BulkEdit-style)
    const [seoEdits, setSeoEdits] = useState<Record<string, { seo_title?: string; seo_description?: string; slug?: string }>>({});
    const [isSavingEdits, setIsSavingEdits] = useState(false);

    // Content search
    const [contentSearch, setContentSearch] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);

    // Clear selection and reset page when filters change
    useEffect(() => {
        setSelectedIds(new Set());
        setCurrentPage(1);
    }, [contentFilter, statusTab, contentSearch]);

    // Reset page when page size changes
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    // Initialize form with site data
    useEffect(() => {
        if (site) {
            // Normalize URL - add https:// only if protocol is missing
            const normalizedUrl = site.url.startsWith('http://') || site.url.startsWith('https://')
                ? site.url
                : `https://${site.url}`;
            setWpUrl(normalizedUrl);
            setWpUsername(site.wp_username || '');
            setWpAppPassword(site.wp_app_password || '');
            setIsConnected(!!(site.wp_username && site.wp_app_password));
            setCoverStylePrompt((site as any).cover_style_prompt || '');
            const refs = (site as any).cover_reference_urls;
            setCoverReferenceUrls(Array.isArray(refs) ? refs : refs ? [refs] : []);
        }
    }, [site]);

    // Fetch categories and tags from WP when switching to those tabs
    const fetchCategoriesAndTags = async () => {
        if (!site || !site.wp_username || !site.wp_app_password) return;
        setIsCatTagsLoading(true);
        setCatTagsError(null);
        try {
            const response = await fetch(`/api/sites/${siteId}/categories-tags`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch');
            setWpCategories(data.categories || []);
            setWpTags(data.tags || []);
        } catch (err) {
            setCatTagsError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setIsCatTagsLoading(false);
        }
    };

    useEffect(() => {
        if ((activeTab === 'categories' || activeTab === 'tags') && wpCategories.length === 0 && wpTags.length === 0 && !isCatTagsLoading) {
            fetchCategoriesAndTags();
        }
    }, [activeTab]);

    const handleCreateCatTag = async (type: 'category' | 'tag', name: string) => {
        if (!name.trim()) return;
        setIsCreatingCatTag(true);
        try {
            const response = await fetch(`/api/sites/${siteId}/categories-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, name: name.trim() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create');
            toast.success(`${type === 'category' ? 'Category' : 'Tag'} "${name}" created!`);
            if (type === 'category') {
                setNewCategoryName('');
                setWpCategories(prev => [...prev, data.item]);
            } else {
                setNewTagName('');
                setWpTags(prev => [...prev, data.item]);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create');
        } finally {
            setIsCreatingCatTag(false);
        }
    };

    const handleUpdateCatTag = async (type: 'category' | 'tag', id: number, name: string) => {
        if (!name.trim()) return;
        setIsSavingCatTag(true);
        try {
            const response = await fetch(`/api/sites/${siteId}/categories-tags`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id, name: name.trim() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update');
            toast.success(`${type === 'category' ? 'Category' : 'Tag'} updated!`);
            if (type === 'category') {
                setWpCategories(prev => prev.map(c => c.id === id ? data.item : c));
            } else {
                setWpTags(prev => prev.map(t => t.id === id ? data.item : t));
            }
            setEditingCatTag(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update');
        } finally {
            setIsSavingCatTag(false);
        }
    };

    const handleDeleteCatTag = async (type: 'category' | 'tag', id: number, name: string) => {
        if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setDeletingCatTagId(id);
        try {
            const response = await fetch(`/api/sites/${siteId}/categories-tags?type=${type}&id=${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete');
            toast.success(`${type === 'category' ? 'Category' : 'Tag'} "${name}" deleted!`);
            if (type === 'category') {
                setWpCategories(prev => prev.filter(c => c.id !== id));
            } else {
                setWpTags(prev => prev.filter(t => t.id !== id));
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setDeletingCatTagId(null);
        }
    };

    const handleSaveSettings = async () => {
        if (!site) return;

        if (!wpUsername.trim() || !wpAppPassword.trim()) {
            toast.warning('Please fill in all WordPress credentials');
            return;
        }

        try {
            // Save credentials via API route (encrypts password on server)
            const response = await fetch(`/api/sites/${site.id}/credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wp_username: wpUsername.trim(),
                    wp_app_password: wpAppPassword.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to save credentials');
            }

            setIsConnected(true);
            toast.success('WordPress credentials saved securely!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleTestConnection = async () => {
        if (!site) return;

        if (!site.wp_username || !site.wp_app_password) {
            toast.warning('Please save WordPress credentials first');
            return;
        }

        setIsTesting(true);

        try {
            // Test connection via API route (decrypts password on server)
            const response = await fetch(`/api/sites/${site.id}/test-connection`, {
                method: 'POST',
            });

            const result = await response.json();

            if (result.success) {
                setIsConnected(true);
                toast.success(result.message);
            } else {
                setIsConnected(false);
                toast.error(result.message);
            }
        } catch (error) {
            setIsConnected(false);
            toast.error(error instanceof Error ? error.message : 'Connection test failed');
        } finally {
            setIsTesting(false);
        }
    };

    const handleSyncPosts = async () => {
        if (!site) return;

        if (!site.wp_username || !site.wp_app_password) {
            toast.warning('Please save WordPress credentials first');
            return;
        }

        setIsSyncing(true);

        try {
            // Sync posts via API route (decrypts password on server)
            const response = await fetch(`/api/sites/${site.id}/sync`, {
                method: 'POST',
            });

            const result = await response.json();

            if (result.success) {
                const connectorLabel = result.connector ? ' via Connector' : '';
                toast.success(`${result.message} (${result.postsSynced} posts${connectorLabel})`);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSyncing(false);
        }
    };

    // Check connector status when connection is established
    const checkConnectorStatus = async () => {
        if (!site) return;
        setConnectorStatus(prev => ({ ...prev, checking: true }));
        try {
            const res = await fetch(`/api/sites/${site.id}/connector-status`);
            const data = await res.json();
            setConnectorStatus({
                installed: data.installed || false,
                version: data.version,
                rankMathActive: data.info?.rank_math_active,
                rankMathVersion: data.info?.rank_math_version,
                checking: false,
            });
        } catch {
            setConnectorStatus({ installed: false, checking: false });
        }
    };

    useEffect(() => {
        if (isConnected && site?.id) {
            checkConnectorStatus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, site?.id]);

    // Build unified content list from posts + generated articles
    // IMPORTANT: useMemo must be called BEFORE any early returns (Rules of Hooks)
    const contentItems: ContentItem[] = React.useMemo(() => {
        const items: ContentItem[] = [];

        posts.forEach(post => {
            items.push({
                id: `wp-${post.id}`,
                source: 'wordpress',
                title: post.title,
                keyword: post.focus_keyword,
                seo_score: post.seo_score,
                readability_score: post.readability_score ?? null,
                word_count: post.word_count,
                status: post.status,
                wp_post_id: post.wp_post_id,
                slug: post.slug ?? null,
                url: post.url,
                published_at: post.published_at,
                created_at: post.created_at,
                seo_title: post.seo_title ?? null,
                seo_description: post.seo_description ?? null,
                canonical_url: post.canonical_url ?? null,
                robots_meta: post.robots_meta ?? null,
                internal_links_count: post.internal_links_count ?? null,
                external_links_count: post.external_links_count ?? null,
                images_count: post.images_count ?? null,
                images_alt_count: post.images_alt_count ?? null,
                schema_article_type: post.schema_article_type ?? null,
                og_title: post.og_title ?? null,
                additional_keywords: post.additional_keywords ?? null,
                originalPost: post,
            });
        });

        articles.forEach(article => {
            items.push({
                id: `gen-${article.id}`,
                source: 'generated',
                title: article.title,
                keyword: article.keyword,
                seo_score: article.seo_score ?? null,
                preliminary_seo_score: article.preliminary_seo_score,
                readability_score: article.readability_score ?? null,
                word_count: article.word_count,
                status: article.status,
                wp_post_id: article.wp_post_id,
                slug: null,
                url: null,
                published_at: article.published_at,
                created_at: article.created_at,
                seo_title: article.seo_title ?? null,
                seo_description: article.seo_description ?? null,
                canonical_url: article.canonical_url ?? null,
                robots_meta: article.robots_meta ?? null,
                internal_links_count: article.internal_links_count ?? null,
                external_links_count: article.external_links_count ?? null,
                images_count: article.images_count ?? null,
                images_alt_count: article.images_alt_count ?? null,
                schema_article_type: article.schema_article_type ?? null,
                og_title: article.og_title ?? null,
                additional_keywords: article.additional_keywords ?? null,
                originalArticle: article,
            });
        });

        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return items;
    }, [posts, articles]);

    const filteredContent = React.useMemo(() => {
        let items = contentItems;

        // Source filter
        if (contentFilter !== 'all') {
            items = items.filter(item => item.source === contentFilter);
        }

        // Status tab filter
        if (statusTab === 'unoptimized') {
            items = items.filter(item => !item.seo_title || !item.seo_description);
        } else if (statusTab === 'pending-sync') {
            items = items.filter(item => item.source === 'generated' && !item.wp_post_id);
        } else if (statusTab === 'drafts') {
            items = items.filter(item => item.status === 'draft');
        }

        // Search filter
        if (contentSearch.trim()) {
            const q = contentSearch.toLowerCase();
            items = items.filter(item =>
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.keyword && item.keyword.toLowerCase().includes(q)) ||
                (item.seo_title && item.seo_title.toLowerCase().includes(q))
            );
        }

        return items;
    }, [contentItems, contentFilter, statusTab, contentSearch]);

    // Status tab counts
    const statusCounts = React.useMemo(() => ({
        all: contentItems.length,
        unoptimized: contentItems.filter(i => !i.seo_title || !i.seo_description).length,
        'pending-sync': contentItems.filter(i => i.source === 'generated' && !i.wp_post_id).length,
        drafts: contentItems.filter(i => i.status === 'draft').length,
    }), [contentItems]);

    // Inline edit helpers
    const updateSeoEdit = (itemId: string, field: 'seo_title' | 'seo_description' | 'slug', value: string) => {
        setSeoEdits(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: value },
        }));
    };

    const getSeoEditValue = (itemId: string, field: 'seo_title' | 'seo_description' | 'slug', original: string | null) => {
        return seoEdits[itemId]?.[field] ?? original ?? '';
    };

    const changedItemIds = React.useMemo(() => Object.keys(seoEdits), [seoEdits]);

    const discardSeoEdits = () => setSeoEdits({});

    const saveSeoEdits = async () => {
        if (changedItemIds.length === 0) return;
        setIsSavingEdits(true);
        let success = 0;
        for (const itemId of changedItemIds) {
            const edits = seoEdits[itemId];
            if (!edits) continue;
            try {
                const item = contentItems.find(i => i.id === itemId);
                if (!item) continue;
                const apiUrl = item.source === 'wordpress'
                    ? `/api/posts/${itemId.replace('wp-', '')}`
                    : `/api/articles/${itemId.replace('gen-', '')}`;
                await fetch(apiUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(edits),
                });
                success++;
            } catch {}
        }
        toast.success(`Saved ${success}/${changedItemIds.length} changes`);
        setSeoEdits({});
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        setIsSavingEdits(false);
    };

    const handleDeleteSite = () => {
        if (!site) return;

        if (window.confirm(`Are you sure you want to delete "${site.name}"? This action cannot be undone.`)) {
            deleteSite.mutate(siteId, {
                onSuccess: () => {
                    toast.success('Site deleted successfully');
                    onBack();
                },
                onError: (error) => {
                    toast.error(`Failed to delete site: ${error.message}`);
                },
            });
        }
    };

    // Loading state — all hooks are above this point
    if (siteLoading || !site) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading site details...</p>
                </div>
            </div>
        );
    }

    const isCompetitor = !!site.is_competitor;

    const tabItems: { id: string; label: string; count?: number }[] = isCompetitor
        ? [
            { id: 'overview', label: 'Overview' },
            { id: 'content', label: 'Content', count: contentItems.length },
          ]
        : [
            { id: 'overview', label: 'Overview' },
            { id: 'content', label: 'Content', count: contentItems.length },
            { id: 'categories', label: 'Categories' },
            { id: 'tags', label: 'Tags' },
            { id: 'redirects', label: 'Redirects' },
            { id: 'settings', label: 'Settings' },
          ];

    const SITE_NAV_TILES: { id: Tab; label: string; icon: React.ElementType; iconBg: string; description: string }[] = isCompetitor
        ? [
            { id: 'content', label: 'Content', icon: FileText, iconBg: 'bg-blue-50 text-blue-600', description: `${contentItems.length} pages` },
          ]
        : [
            { id: 'content', label: 'Content', icon: FileText, iconBg: 'bg-blue-50 text-blue-600', description: `${contentItems.length} pages` },
            { id: 'categories', label: 'Categories', icon: Folder, iconBg: 'bg-violet-50 text-violet-600', description: 'WordPress categories' },
            { id: 'tags', label: 'Tags', icon: Tag, iconBg: 'bg-emerald-50 text-emerald-600', description: 'WordPress tags' },
            { id: 'redirects', label: 'Redirects', icon: ArrowRightLeft, iconBg: 'bg-orange-50 text-orange-600', description: 'Redirect rules' },
            { id: 'settings', label: 'Settings', icon: Settings, iconBg: 'bg-gray-100 text-gray-600', description: 'Connection & config' },
          ];

    const renderOverview = () => (
        <div className="animate-fade-in">
            {/* Metrics */}
            <div className="p-6 md:p-8">
                {renderMetrics()}
            </div>

            {/* Navigation Tiles */}
            <div className="px-6 md:px-8 pb-8">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Navigation</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {SITE_NAV_TILES.map(tile => {
                        const TileIcon = tile.icon;
                        return (
                            <button
                                key={tile.id}
                                onClick={() => setActiveTab(tile.id)}
                                className="group bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left hover:shadow-md hover:border-gray-300 transition-all"
                            >
                                <div className={`w-10 h-10 rounded-xl ${tile.iconBg} flex items-center justify-center mb-3`}>
                                    <TileIcon size={20} />
                                </div>
                                <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{tile.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{tile.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderMetrics = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Organic Keywords Card */}
            <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Globe size={18} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Organic Keywords</span>
                    </div>
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">US</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-gray-900">{site.metrics.organicKeywords.toLocaleString()}</h3>
                    <span className="text-xs font-medium text-emerald-600 flex items-center">
                        <TrendingUp size={12} className="mr-0.5" /> +5.2%
                    </span>
                </div>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500 w-[70%] rounded-full"></div>
                </div>
            </div>

            {/* Site Audit Card */}
            <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <AlertCircle size={18} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Site Audit</span>
                    </div>
                    <div className="text-xs font-bold text-gray-400">Health: {site.metrics.speedScore}%</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Indexed</div>
                        <div className="text-lg font-bold text-gray-900">{site.metrics.indexedPages.toLocaleString()}</div>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                        <div className="text-xs text-rose-600 mb-1">404 Errors</div>
                        <div className="text-lg font-bold text-rose-700">{site.metrics.notFoundCount}</div>
                    </div>
                </div>
            </div>

            {/* Rank Tracker Card */}
            <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <BarChart3 size={18} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Rank Tracker</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">1</span>
                        <span className="text-sm font-bold text-emerald-600">{site.metrics.rankDistribution.top1}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">2-3</span>
                        <span className="text-sm font-bold text-emerald-500">{site.metrics.rankDistribution.top3}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">4-5</span>
                        <span className="text-sm font-bold text-gray-700">{site.metrics.rankDistribution.top5}</span>
                     </div>
                     <div className="flex flex-col mt-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">6-10</span>
                        <span className="text-sm font-bold text-gray-700">{site.metrics.rankDistribution.top10}</span>
                     </div>
                      <div className="flex flex-col mt-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">11-20</span>
                        <span className="text-sm font-bold text-gray-700">{site.metrics.rankDistribution.top20}</span>
                     </div>
                      <div className="flex flex-col mt-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">21-100</span>
                        <span className="text-sm font-bold text-gray-700">{site.metrics.rankDistribution.top100}</span>
                     </div>
                </div>
            </div>

            {/* Device Traffic Card */}
             <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Monitor size={18} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Device Traffic</span>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                         <div className="flex justify-between text-xs mb-1">
                             <span className="flex items-center gap-1 text-gray-600"><Monitor size={12}/> Desktop</span>
                             <span className="font-bold text-gray-900">{site.metrics.deviceTraffic.desktop}%</span>
                         </div>
                         <div className="w-full bg-gray-100 rounded-full h-1.5">
                             <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${site.metrics.deviceTraffic.desktop}%`}}></div>
                         </div>
                    </div>
                    <div>
                         <div className="flex justify-between text-xs mb-1">
                             <span className="flex items-center gap-1 text-gray-600"><Smartphone size={12}/> Mobile</span>
                             <span className="font-bold text-gray-900">{site.metrics.deviceTraffic.mobile}%</span>
                         </div>
                         <div className="w-full bg-gray-100 rounded-full h-1.5">
                             <div className="bg-sky-400 h-1.5 rounded-full" style={{ width: `${site.metrics.deviceTraffic.mobile}%`}}></div>
                         </div>
                    </div>
                </div>
            </div>

        </div>
    );

    const renderPlaceholder = (title: string, actionLabel?: string) => (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                <Folder size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No {title} Found</h3>
            <p className="text-sm text-gray-500 mt-1">Start by creating new {title.toLowerCase()} or sync with CMS.</p>
            {actionLabel && (
                <button className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
                    <Plus size={16} />
                    <span>{actionLabel}</span>
                </button>
            )}
        </div>
    );

    // Article Editor Handlers
    const handleEditArticle = (article: ArticleRecord) => {
        router.push(`/editor/${article.id}?siteId=${siteId}&source=generated`);
    };

    const handleEditWPPost = (post: any) => {
        router.push(`/editor/${post.id}?siteId=${siteId}&source=wordpress`);
    };

    // Create new post handler
    const handleCreateNewArticle = async () => {
        if (!newArticleTitle.trim()) {
            toast.warning('Please enter a title');
            return;
        }
        setIsCreatingArticle(true);
        try {
            const newArticle = await createArticle.mutateAsync({
                site_id: siteId,
                keyword: newArticleKeyword.trim() || undefined,
                title: newArticleTitle.trim(),
            });
            toast.success('Post created! Opening editor...');
            setShowNewArticleDialog(false);
            setNewArticleKeyword('');
            setNewArticleTitle('');
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            router.push(`/editor/${newArticle.id}?siteId=${siteId}&source=generated`);
        } catch (error) {
            toast.error(`Failed to create article: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsCreatingArticle(false);
        }
    };

    // Analyze article inline (without opening editor)
    const handleAnalyzeInline = async (article: ArticleRecord) => {
        setAnalyzingArticleId(article.id);
        try {
            const response = await fetch(`/api/articles/${article.id}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: article.title,
                    content: article.content,
                    keyword: article.keyword,
                    seo_title: article.seo_title,
                    seo_description: article.seo_description,
                    focus_keyword: article.keyword,
                    word_count: article.word_count,
                }),
            });
            const result = await response.json();
            if (result.success) {
                toast.success(`SEO Score: ${result.analysis.score}/100`);
                queryClient.invalidateQueries({ queryKey: ['articles'] });
                queryClient.invalidateQueries({ queryKey: ['posts'] });
            } else {
                toast.error('Failed to analyze article');
            }
        } catch (error) {
            toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setAnalyzingArticleId(null);
        }
    };

    // Column Customization Handlers
    const toggleColumn = (columnId: string) => {
        const column = availableColumns.find((col) => col.id === columnId);
        if (column?.required) return; // Can't hide required columns

        if (visibleColumns.includes(columnId)) {
            setVisibleColumns(visibleColumns.filter((id) => id !== columnId));
        } else {
            setVisibleColumns([...visibleColumns, columnId]);
        }
    };

    const handleDragStart = (columnId: string) => {
        setDraggedColumn(columnId);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === columnId) return;

        const draggedIndex = visibleColumns.indexOf(draggedColumn);
        const targetIndex = visibleColumns.indexOf(columnId);

        const newColumns = [...visibleColumns];
        newColumns.splice(draggedIndex, 1);
        newColumns.splice(targetIndex, 0, draggedColumn);

        setVisibleColumns(newColumns);
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
    };

    const handlePublishArticle = (article: ArticleRecord) => {
        if (!site || !site.wp_username || !site.wp_app_password) {
            toast.warning('Please configure WordPress credentials in Settings first');
            return;
        }

        // Check if article has content before allowing publish
        if (!article.content || !article.title) {
            toast.warning('Article must have title and content before publishing. Open the editor to add content.');
            return;
        }

        // Open modal for selecting categories and tags
        setArticleToPublish(article);
        setIsPublishModalOpen(true);
    };

    const handlePublishWithCategoriesAndTags = async (categoryIds: number[], tagIds: number[]) => {
        if (!articleToPublish || !site) return;

        try {
            // Create version backup before publishing
            try {
                await fetch('/api/versions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        articleId: articleToPublish.id,
                        siteId: site.id,
                        label: 'Before publish to WordPress',
                    }),
                });
            } catch (vErr) {
                console.error('Pre-publish version creation failed (non-blocking):', vErr);
            }

            const apiUrl = `/api/articles/${articleToPublish.id}/publish`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    siteId: site.id,
                    categoryIds,
                    tagIds,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(result.isUpdate
                    ? `Updated in WordPress! ${result.wpUrl || ''}`
                    : `Published! ${result.wpUrl || ''}`
                );
                setIsPublishModalOpen(false);
                setArticleToPublish(null);
                queryClient.invalidateQueries({ queryKey: ['articles'] });
                queryClient.invalidateQueries({ queryKey: ['posts'] });
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const renderContent = () => {
        const isLoading = postsLoading || articlesLoading;
        const wpCount = contentItems.filter(i => i.source === 'wordpress').length;
        const genCount = contentItems.filter(i => i.source === 'generated').length;

        // Pagination
        const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, filteredContent.length);
        const paginatedItems = filteredContent.slice(startIdx, endIdx);

        // Page numbers for pagination
        const getPageNumbers = () => {
            const pages: number[] = [];
            const maxVisible = 5;
            let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            const end = Math.min(totalPages, start + maxVisible - 1);
            if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            return pages;
        };

        // Group columns by module for customizer
        const columnGroups = [
            { key: 'core', label: 'Core', columns: availableColumns.filter(c => c.group === 'core') },
            ...(rmBridgeEnabled ? [{ key: 'rankmath', label: 'RankMath Bridge', columns: availableColumns.filter(c => c.group === 'rankmath') }] : []),
            ...(nanaBananaEnabled ? [{ key: 'nana-banana', label: 'Nana Banana', columns: availableColumns.filter(c => c.group === 'nana-banana') }] : []),
        ];

        // Status icon renderer
        const renderStatusIcon = (status: string, source: string) => {
            if (status === 'publish' || status === 'published') {
                return (
                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center" title="Published">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                );
            }
            if (status === 'pending' || status === 'reviewed') {
                return (
                    <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center" title="Pending">
                        <Edit size={18} className="text-amber-500" />
                    </div>
                );
            }
            if (status === 'private') {
                return (
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" title="Private">
                        <Shield size={18} className="text-gray-400" />
                    </div>
                );
            }
            // draft
            return (
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" title="Draft">
                    <FileText size={18} className="text-gray-400" />
                </div>
            );
        };

        // URL display helper — site domain + editable slug
        const renderUrlSite = (item: ContentItem) => {
            const siteUrl = (site?.url || '').replace(/^https?:\/\//, '');
            const originalSlug = item.slug || (item.url ? (() => { try { return new URL(item.url.startsWith('http') ? item.url : `https://${item.url}`).pathname; } catch { return ''; } })() : '');
            const editableSlug = getSeoEditValue(item.id, 'slug', originalSlug || null);
            const slugLen = editableSlug.length;
            return (
                <div className="min-w-[200px]">
                    <div
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer mb-1.5"
                        onClick={() => {
                            if (item.originalArticle) handleEditArticle(item.originalArticle);
                            else if (item.originalPost) handleEditWPPost(item.originalPost);
                        }}
                    >
                        {siteUrl}
                    </div>
                    <div className="flex items-start gap-1">
                        <span className="text-xs text-gray-400 mt-1.5 flex-shrink-0">/</span>
                        <input
                            type="text"
                            value={editableSlug.replace(/^\//, '').replace(/\/$/, '')}
                            onChange={e => {
                                const v = e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/--+/g, '-');
                                updateSeoEdit(item.id, 'slug', `/${v}/`);
                            }}
                            placeholder="page-slug"
                            className="w-full border border-gray-100 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-lg text-xs text-gray-700 px-2 py-1.5 placeholder:text-gray-400 bg-white transition-all"
                        />
                        <span className="text-xs text-gray-400 mt-1.5 flex-shrink-0">/</span>
                    </div>
                    <div className="mt-1 text-right">
                        <span className={`text-[10px] font-medium ${
                            slugLen === 0 ? 'text-gray-400' : slugLen > 75 ? 'text-rose-500' : slugLen > 60 ? 'text-amber-500' : 'text-gray-400'
                        }`}>
                            {slugLen > 75 ? 'Too long' : slugLen > 60 ? 'Consider shorter' : slugLen > 0 ? 'Good' : ''}
                        </span>
                    </div>
                </div>
            );
        };

        return (
            <div className="bg-white border-t border-gray-200 overflow-hidden flex flex-col min-h-0">
                {/* Sticky Filter Bar */}
                <div className="sticky top-0 z-10 bg-white">

                {/* Status Tabs */}
                <div className="px-6 border-b border-gray-200 bg-white">
                    <div className="flex gap-6 pt-6">
                        {(isCompetitor
                            ? [{ id: 'all' as StatusTab, label: 'All Pages', count: statusCounts.all }]
                            : [
                                { id: 'all' as StatusTab, label: 'All Pages', count: statusCounts.all },
                                { id: 'unoptimized' as StatusTab, label: 'Unoptimized', count: statusCounts.unoptimized },
                                { id: 'pending-sync' as StatusTab, label: 'Pending Sync', count: statusCounts['pending-sync'] },
                                { id: 'drafts' as StatusTab, label: 'Drafts', count: statusCounts.drafts },
                              ]
                        ).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusTab(tab.id)}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                    statusTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {tab.label}
                                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                                    statusTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Unsaved Changes Save Bar — above table */}
                {changedItemIds.length > 0 && (
                    <div className="px-6 py-3 border-b border-amber-200 bg-amber-50 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm text-amber-700">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                            {changedItemIds.length} unsaved change{changedItemIds.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={discardSeoEdits}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-amber-100 rounded-lg transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                onClick={saveSeoEdits}
                                disabled={isSavingEdits}
                                className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSavingEdits ? (
                                    <><Loader2 size={14} className="animate-spin" /> Saving...</>
                                ) : (
                                    <><Save size={14} /> Save Changes</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Search + Actions bar */}
                <div className="px-6 py-3 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={contentSearch}
                                onChange={e => setContentSearch(e.target.value)}
                                placeholder="Search by title, keyword, or SEO title..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                            />
                        </div>
                        <div className="flex-1" />
                        <div className="flex items-center gap-3">
                            {/* Column customizer */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Settings2 size={16} />
                                    Columns
                                </button>
                                {showColumnCustomizer && (
                                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-20 w-80 max-h-[450px] overflow-y-auto">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-sm font-semibold text-gray-900">Visible Columns</p>
                                            <button onClick={() => setShowColumnCustomizer(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={14} className="text-gray-400" /></button>
                                        </div>
                                        {/* Source filter */}
                                        <div className="mb-4 pb-3 border-b border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Source</p>
                                            <div className="flex gap-2">
                                                {([
                                                    { id: 'all' as ContentFilter, label: 'All', count: contentItems.length },
                                                    { id: 'wordpress' as ContentFilter, label: 'WordPress', count: wpCount },
                                                    { id: 'generated' as ContentFilter, label: 'SEO OS', count: genCount },
                                                ]).map(f => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => setContentFilter(f.id)}
                                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                                            contentFilter === f.id
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {f.label} ({f.count})
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {columnGroups.map(group => (
                                            <div key={group.key} className="mb-3 last:mb-0">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{group.label}</p>
                                                <div className="space-y-1">
                                                    {group.columns.map(column => (
                                                        <label key={column.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-50">
                                                            <input
                                                                type="checkbox"
                                                                checked={visibleColumns.includes(column.id)}
                                                                onChange={() => toggleColumn(column.id)}
                                                                disabled={column.required}
                                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            {column.label}
                                                            {column.required && <span className="text-xs text-gray-400">(required)</span>}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {!rmBridgeEnabled && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <p className="text-[10px] text-gray-400 px-1">Enable <strong>RankMath Bridge</strong> in Marketplace for SEO columns</p>
                                            </div>
                                        )}
                                        {!nanaBananaEnabled && (
                                            <div className="mt-1">
                                                <p className="text-[10px] text-gray-400 px-1">Enable <strong>Nana Banana</strong> for cover image column</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                <Download size={16} />
                                Export CSV
                            </button>
                            {/* Bulk Actions or New Post — hidden for competitors */}
                            {!isCompetitor && (
                                selectedIds.size > 0 ? (
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowBulkStatusDropdown(!showBulkStatusDropdown)}
                                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            <CheckSquare size={16} />
                                            Bulk Actions ({selectedIds.size})
                                            <ChevronDown size={14} />
                                        </button>
                                        {showBulkStatusDropdown && (
                                            <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-30 min-w-[180px]">
                                                        <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Change Status</p>
                                                        {['draft', 'reviewed', 'published'].map(s => (
                                                            <button key={s} onClick={() => handleBulkStatusChange(s)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 capitalize">{s}</button>
                                                        ))}
                                                        <div className="border-t border-gray-100 my-1" />
                                                        <button onClick={handleBulkPublish} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Upload size={14} /> Sync to WordPress</button>
                                                        {nanaBananaEnabled && (
                                                            <button onClick={handleBulkGenerateCovers} className="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 flex items-center gap-2"><Wand2 size={14} /> Generate Covers</button>
                                                        )}
                                                        {aiWriterEnabled && (
                                                            <>
                                                                <div className="border-t border-gray-100 my-1" />
                                                                <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Writer</p>
                                                                <button onClick={handleBulkGenerateTitles} className="w-full text-left px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 flex items-center gap-2"><Sparkles size={14} /> Generate Titles</button>
                                                                <button onClick={handleBulkGenerateDescriptions} className="w-full text-left px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 flex items-center gap-2"><Sparkles size={14} /> Generate Descriptions</button>
                                                            </>
                                                        )}
                                                        <div className="border-t border-gray-100 my-1" />
                                                        <button onClick={handleBulkDelete} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                                                        <div className="border-t border-gray-100 my-1" />
                                                        <button onClick={() => setSelectedIds(new Set())} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Deselect All</button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewArticleDialog(true)}
                                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        <Plus size={16} />
                                        New Post
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>
                </div>{/* end sticky filter bar */}

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3.5 w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id))}
                                        ref={(el) => { if (el) { const pageSelected = paginatedItems.filter(item => selectedIds.has(item.id)).length; el.indeterminate = pageSelected > 0 && pageSelected < paginatedItems.length; } }}
                                        onChange={() => toggleSelectAll(paginatedItems)}
                                    />
                                </th>
                                {visibleColumns.map((columnId) => {
                                    const column = availableColumns.find((col) => col.id === columnId);
                                    if (!column) return null;
                                    // Custom labels for design
                                    const headerLabel = columnId === 'title' ? 'URL & SITE'
                                        : columnId === 'seo_title' ? 'PAGE SEO TITLE'
                                        : columnId === 'seo_description' ? 'META DESCRIPTION'
                                        : columnId === 'serp_preview' ? 'SERP PREVIEW'
                                        : column.label.toUpperCase();
                                    return (
                                        <th
                                            key={columnId}
                                            draggable
                                            onDragStart={() => handleDragStart(columnId)}
                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                            onDragEnd={handleDragEnd}
                                            className={`px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-move whitespace-nowrap select-none group ${
                                                draggedColumn === columnId ? 'opacity-50 bg-indigo-50' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <GripVertical size={12} className="text-gray-400 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                                                {headerLabel}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="bg-[#f9f9f9]">
                            {/* Select-all-pages banner */}
                            {!isLoading && paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id)) && selectedIds.size < filteredContent.length && (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="px-6 py-2.5 bg-indigo-50 text-center text-sm text-indigo-700 border-b border-indigo-100">
                                        All {paginatedItems.length} items on this page are selected.{' '}
                                        <button onClick={selectAllPages} className="font-semibold underline hover:text-indigo-900">
                                            Select all {filteredContent.length} items across all pages
                                        </button>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && selectedIds.size === filteredContent.length && filteredContent.length > paginatedItems.length && (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="px-6 py-2.5 bg-indigo-50 text-center text-sm text-indigo-700 border-b border-indigo-100">
                                        All {filteredContent.length} items selected.{' '}
                                        <button onClick={clearSelection} className="font-semibold underline hover:text-indigo-900">
                                            Clear selection
                                        </button>
                                    </td>
                                </tr>
                            )}
                            {isLoading ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="px-6 py-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                            <span className="text-sm">Loading content...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="px-6 py-16 text-center text-gray-500">
                                        <div className="text-center space-y-3">
                                            <FileText size={36} className="text-gray-400 mx-auto" />
                                            <div>
                                                <p className="font-medium text-gray-600">
                                                    {contentFilter === 'wordpress' ? 'No WordPress posts' :
                                                     contentFilter === 'generated' ? 'No posts created in SEO OS' :
                                                     statusTab === 'unoptimized' ? 'All pages are optimized!' :
                                                     statusTab === 'pending-sync' ? 'No pages pending sync' :
                                                     'No content yet'}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {contentFilter === 'wordpress'
                                                        ? 'Sync posts from WordPress in Settings'
                                                        : 'Create your first post or sync from WordPress'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map(item => (
                                    <tr key={item.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${selectedIds.has(item.id) ? 'bg-indigo-50/40' : ''}`}>
                                        <td className="px-6 py-5 align-top">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        {visibleColumns.map(colId => {
                                            switch (colId) {
                                                case 'status':
                                                    return <td key={colId} className="px-6 py-5 align-top">{renderStatusIcon(item.status, item.source)}</td>;
                                                case 'title':
                                                    return <td key={colId} className="px-6 py-5 align-top">{renderUrlSite(item)}</td>;
                                                case 'source':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.source === 'wordpress' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100"><Globe size={10} /> WP</span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100"><FileText size={10} /> Local</span>
                                                            )}
                                                        </td>
                                                    );
                                                case 'keyword':
                                                    return <td key={colId} className="px-6 py-5 align-top">{item.keyword ? <span className="text-xs text-gray-600">{item.keyword}</span> : <span className="text-xs text-gray-400">—</span>}</td>;
                                                case 'seo_score':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.seo_score !== null || item.preliminary_seo_score ? (
                                                                <SEOScoreIndicator score={item.seo_score || item.preliminary_seo_score || 0} size="sm" />
                                                            ) : <span className="text-xs text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'seo_title': {
                                                    const titleLen = getSeoEditValue(item.id, 'seo_title', item.seo_title).length;
                                                    return (
                                                        <td key={colId} className="px-5 py-4 align-top">
                                                            <div className="min-w-[320px]">
                                                                <div className="flex items-start gap-1.5">
                                                                    <textarea rows={2} value={getSeoEditValue(item.id, 'seo_title', item.seo_title)} onChange={e => updateSeoEdit(item.id, 'seo_title', e.target.value)} placeholder="Enter SEO title..." className="w-full border border-gray-100 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm text-gray-800 resize-none p-2.5 placeholder:text-gray-400 bg-white transition-all" />
                                                                    {aiWriterEnabled && (
                                                                        <AIGeneratePopover
                                                                            type="title"
                                                                            postId={item.id.replace(/^(wp-|gen-)/, '')}
                                                                            siteId={siteId}
                                                                            keyword={item.keyword || undefined}
                                                                            onApply={(value) => updateSeoEdit(item.id, 'seo_title', value)}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="mt-1 text-left">
                                                                    <span className={`text-xs font-medium ${titleLen === 0 ? 'text-gray-400' : titleLen > 60 ? 'text-rose-500' : titleLen >= 50 ? 'text-emerald-500' : 'text-gray-400'}`}>{titleLen} / 60</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                case 'seo_description': {
                                                    const descLen = getSeoEditValue(item.id, 'seo_description', item.seo_description).length;
                                                    return (
                                                        <td key={colId} className="px-5 py-4 align-top">
                                                            <div className="min-w-[460px]">
                                                                <div className="flex items-start gap-1.5">
                                                                    <textarea rows={3} value={getSeoEditValue(item.id, 'seo_description', item.seo_description)} onChange={e => updateSeoEdit(item.id, 'seo_description', e.target.value)} placeholder="Enter meta description..." className="w-full border border-gray-100 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm text-gray-800 resize-none p-2.5 placeholder:text-gray-400 bg-white transition-all" />
                                                                    {aiWriterEnabled && (
                                                                        <AIGeneratePopover
                                                                            type="description"
                                                                            postId={item.id.replace(/^(wp-|gen-)/, '')}
                                                                            siteId={siteId}
                                                                            keyword={item.keyword || undefined}
                                                                            onApply={(value) => updateSeoEdit(item.id, 'seo_description', value)}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="mt-1 text-left">
                                                                    <span className={`text-xs font-medium ${descLen === 0 ? 'text-gray-400' : descLen > 160 ? 'text-rose-500' : descLen >= 140 ? 'text-emerald-500' : 'text-gray-400'}`}>{descLen} / 160</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                case 'readability':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.readability_score != null ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={`w-2 h-2 rounded-full ${item.readability_score >= 80 ? 'bg-emerald-500' : item.readability_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                                    <span className={`text-xs font-bold ${item.readability_score >= 80 ? 'text-emerald-700' : item.readability_score >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>{item.readability_score}</span>
                                                                </div>
                                                            ) : <span className="text-xs text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'word_count':
                                                    return <td key={colId} className="px-6 py-5 align-top text-xs text-gray-500">{item.word_count ? item.word_count.toLocaleString() : '—'}</td>;
                                                case 'links':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {(item.internal_links_count != null || item.external_links_count != null) ? (
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="text-blue-600" title="Internal"><Link2 size={11} className="inline" /> {item.internal_links_count ?? 0}</span>
                                                                    <span className="text-gray-400">/</span>
                                                                    <span className="text-orange-600" title="External"><ExternalLink size={11} className="inline" /> {item.external_links_count ?? 0}</span>
                                                                </div>
                                                            ) : <span className="text-xs text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'images':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.images_count != null ? (
                                                                <div className="flex items-center gap-1 text-xs">
                                                                    <ImageIcon size={12} className="text-gray-400" />
                                                                    <span className="text-gray-700">{item.images_count}</span>
                                                                    {item.images_count > 0 && <span className={`text-[10px] ${item.images_alt_count === item.images_count ? 'text-emerald-600' : 'text-amber-600'}`}>({item.images_alt_count ?? 0} alt)</span>}
                                                                </div>
                                                            ) : <span className="text-xs text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'robots':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.robots_meta ? (
                                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${item.robots_meta.includes('noindex') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}><Shield size={10} />{item.robots_meta.includes('noindex') ? 'noindex' : 'index'}</span>
                                                            ) : <span className="text-xs text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'schema_type':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.schema_article_type ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700"><Hash size={10} />{item.schema_article_type}</span>
                                                            ) : <span className="text-xs text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'canonical':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.canonical_url ? (
                                                                <a href={item.canonical_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[150px] block" title={item.canonical_url}>
                                                                    {(() => { try { return new URL(item.canonical_url).pathname; } catch { return item.canonical_url; } })()}
                                                                </a>
                                                            ) : <span className="text-xs text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'serp_preview':
                                                    return (
                                                        <td key={colId} className="px-5 py-4 align-top">
                                                            <div className="min-w-[240px] max-w-[300px]">
                                                                <div className="text-[15px] text-blue-700 font-medium truncate leading-snug">{getSeoEditValue(item.id, 'seo_title', item.seo_title) || item.title || 'Page Title'}</div>
                                                                <div className="text-emerald-700 text-xs truncate mt-0.5">{item.url || `https://${(site?.url || 'example.com').replace(/^https?:\/\//, '')}/${(item.originalPost?.slug || '...')}`}</div>
                                                                <div className="text-gray-500 text-xs line-clamp-2 mt-0.5 leading-relaxed">{getSeoEditValue(item.id, 'seo_description', item.seo_description) || 'No description set...'}</div>
                                                            </div>
                                                        </td>
                                                    );
                                                case 'og_title':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.og_title ? <p className="text-xs text-gray-700 truncate max-w-[180px]" title={item.og_title}>{item.og_title}</p> : <span className="text-xs text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'cover':
                                                    return (
                                                        <td key={colId} className="px-5 py-5 align-top">
                                                            {(item.originalArticle as any)?.cover_url ? (
                                                                <img src={(item.originalArticle as any).cover_url} className="w-16 h-10 rounded object-cover" alt="" />
                                                            ) : (item.originalPost as any)?.featured_image_url ? (
                                                                <img src={(item.originalPost as any).featured_image_url} className="w-16 h-10 rounded object-cover" alt="" />
                                                            ) : (
                                                                <button onClick={() => item.wp_post_id ? handleGenerateCover(item.id) : null} disabled={!item.wp_post_id || generatingCoverId === item.id} className="w-16 h-10 rounded border border-dashed border-gray-200 flex items-center justify-center hover:border-yellow-400 hover:bg-yellow-50 transition-colors disabled:opacity-40" title={item.wp_post_id ? 'Generate cover' : 'Publish to WP first'}>
                                                                    {generatingCoverId === item.id ? <Loader2 size={14} className="animate-spin text-gray-400" /> : <Palette size={14} className="text-yellow-500" />}
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                case 'published_at':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top text-xs text-gray-500">
                                                            {item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : <span className="text-gray-400">—</span>}
                                                        </td>
                                                    );
                                                case 'actions':
                                                    return (
                                                        <td key={colId} className="px-6 py-5 align-top">
                                                            {item.source === 'wordpress' && item.originalPost ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <button onClick={() => handleEditWPPost(item.originalPost)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors" title="Edit"><Edit size={15} /></button>
                                                                    {item.wp_post_id && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!site?.wp_username || !site?.wp_app_password) { toast.warning('Configure WordPress credentials first'); return; }
                                                                                const postAsArticle: ArticleRecord = { id: item.originalPost.id, site_id: item.originalPost.site_id, keyword: item.originalPost.focus_keyword || '', title: item.originalPost.title, seo_title: item.originalPost.seo_title, seo_description: item.originalPost.seo_description, content: item.originalPost.content, word_count: item.originalPost.word_count, status: item.originalPost.status, wp_post_id: item.originalPost.wp_post_id, created_at: item.originalPost.created_at, published_at: item.originalPost.published_at };
                                                                                setArticleToPublish(postAsArticle); setIsPublishModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="Update in WordPress"
                                                                        ><RefreshCw size={15} /></button>
                                                                    )}
                                                                    {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="View"><ExternalLink size={15} /></a>}
                                                                </div>
                                                            ) : item.originalArticle ? (
                                                                item.status === 'published' && item.wp_post_id ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <button onClick={() => handleEditArticle(item.originalArticle!)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors" title="Edit"><Edit size={15} /></button>
                                                                        <button onClick={() => handlePublishArticle(item.originalArticle!)} disabled={publishArticle.isPending} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors disabled:opacity-50" title="Update"><RefreshCw size={15} /></button>
                                                                        {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="View"><ExternalLink size={15} /></a>}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <button onClick={() => handleEditArticle(item.originalArticle!)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors" title="Edit"><Edit size={15} /></button>
                                                                        <button onClick={() => handleAnalyzeInline(item.originalArticle!)} disabled={analyzingArticleId === item.originalArticle!.id} className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-600 transition-colors disabled:opacity-50" title="Analyze">
                                                                            {analyzingArticleId === item.originalArticle!.id ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                                                                        </button>
                                                                        <button onClick={() => handlePublishArticle(item.originalArticle!)} disabled={publishArticle.isPending} className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50">Send to WP</button>
                                                                    </div>
                                                                )
                                                            ) : null}
                                                        </td>
                                                    );
                                                default:
                                                    return <td key={colId} className="px-6 py-5 align-top text-xs text-gray-400">—</td>;
                                            }
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-gray-500">
                                Showing {startIdx + 1} to {endIdx} of {filteredContent.length} items
                            </p>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 outline-none"
                            >
                                {PAGE_SIZE_OPTIONS.map(size => (
                                    <option key={size} value={size}>{size} / page</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            {getPageNumbers().map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === page
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

            </div>
        );
    };

    const renderSettings = () => (
        <div className="max-w-2xl">
            {/* Platform Selector */}
            <div className="bg-white border border-gray-200 rounded-[2rem] p-8 shadow-sm mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Platform</h3>
                <p className="text-sm text-gray-500 mb-4">Choose which CMS platform this site runs on.</p>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border-2 border-indigo-500 rounded-xl text-sm font-semibold text-indigo-700">
                        <Globe size={16} /> WordPress
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed opacity-60" disabled>
                        <ShoppingBag size={16} /> Shopify
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Soon</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed opacity-60" disabled>
                        <Layout size={16} /> Webflow
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Soon</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-[2rem] p-8 shadow-sm mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">WordPress Connection</h3>
                <p className="text-sm text-gray-500 mb-6">Connect your WordPress site to enable auto-publishing and content syncing.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WordPress URL</label>
                        <input 
                            type="text" 
                            value={wpUrl} 
                            onChange={(e) => setWpUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            placeholder="https://yoursite.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input 
                            type="text" 
                            value={wpUsername}
                            onChange={(e) => setWpUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            placeholder="admin"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Application Password</label>
                        <input 
                            type="password" 
                            value={wpAppPassword}
                            onChange={(e) => setWpAppPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            placeholder="xxxx xxxx xxxx xxxx"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Generate this <a href={`${wpUrl}/wp-admin/profile.php#application-passwords-section`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium underline">here</a> in your WP Admin &gt; Users &gt; Profile.
                        </p>
                    </div>

                    <div className="pt-4 space-y-4">
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                 {isConnected && <span className="text-sm text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={16} /> Connected</span>}
                             </div>
                             <div className="flex items-center gap-3">
                                 <button
                                    onClick={handleTestConnection}
                                    disabled={isTesting}
                                    className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                    <Wifi size={16} /> {isTesting ? 'Testing...' : 'Test Connection'}
                                 </button>
                                 <button
                                    onClick={handleSaveSettings}
                                    disabled={updateSite.isPending}
                                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                    <Save size={16} /> {updateSite.isPending ? 'Saving...' : 'Save & Connect'}
                                 </button>
                             </div>
                         </div>

                         {isConnected && (
                             <div className="pt-4 border-t border-gray-200">
                                 <div className="flex items-center justify-between">
                                     <div>
                                         <h4 className="text-sm font-medium text-gray-700">WordPress Posts</h4>
                                         <p className="text-xs text-gray-500 mt-1">Sync posts from WordPress to SEO OS</p>
                                     </div>
                                     <button
                                        onClick={handleSyncPosts}
                                        disabled={isSyncing || syncPosts.isPending}
                                        className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg text-sm hover:bg-purple-700 shadow-sm shadow-purple-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                     >
                                        <FileText size={16} /> {isSyncing || syncPosts.isPending ? 'Syncing...' : `Sync Posts${posts.length > 0 ? ` (${posts.length})` : ''}`}
                                     </button>
                                 </div>
                             </div>
                         )}
                    </div>
                </div>
            </div>

            {/* SEO OS Connector Plugin */}
            {isConnected && (
            <div className="bg-white border border-gray-200 rounded-[2rem] p-8 shadow-sm mb-6">
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Puzzle size={20} className="text-indigo-600" />
                            SEO OS Connector
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            WordPress plugin for advanced Rank Math SEO data sync.
                        </p>
                    </div>
                    {connectorStatus.checking ? (
                        <Loader2 size={20} className="animate-spin text-gray-400 mt-1" />
                    ) : connectorStatus.installed ? (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                            <CheckCircle2 size={14} />
                            v{connectorStatus.version}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                            <AlertCircle size={14} />
                            Not installed
                        </span>
                    )}
                </div>

                {connectorStatus.installed ? (
                    <div className="mt-4 space-y-3">
                        {/* Rank Math status */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">Rank Math SEO</p>
                                <p className="text-xs text-gray-500">
                                    {connectorStatus.rankMathActive
                                        ? `Active (v${connectorStatus.rankMathVersion})`
                                        : 'Not detected — install Rank Math for full SEO sync'}
                                </p>
                            </div>
                            {connectorStatus.rankMathActive ? (
                                <CheckCircle2 size={18} className="text-emerald-500" />
                            ) : (
                                <AlertTriangle size={18} className="text-amber-500" />
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={checkConnectorStatus}
                                disabled={connectorStatus.checking}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={connectorStatus.checking ? 'animate-spin' : ''} />
                                Refresh Status
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <p className="text-sm text-indigo-800 font-medium mb-2">
                                Why install the Connector?
                            </p>
                            <ul className="text-xs text-indigo-700 space-y-1.5">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" />
                                    Full Rank Math SEO data (25+ fields vs 4 basic)
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" />
                                    SEO scores, content analysis, readability
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" />
                                    Social previews (Facebook OG, Twitter Cards)
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" />
                                    Schema markup, canonical URLs, robots meta
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700">Installation:</p>
                            <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
                                <li>Download the plugin zip file below</li>
                                <li>Go to <strong>Plugins → Add New → Upload Plugin</strong> in WP Admin</li>
                                <li>Upload the zip and click <strong>Install Now</strong></li>
                                <li>Activate the plugin</li>
                            </ol>

                            <div className="flex items-center gap-3 pt-2">
                                <a
                                    href="/api/connector/download"
                                    download="seo-os-connector.zip"
                                    className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    Download Plugin (.zip)
                                </a>
                                <a
                                    href={`${wpUrl}/wp-admin/plugin-install.php`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-200 transition-all flex items-center gap-2"
                                >
                                    <ExternalLink size={16} />
                                    WP Plugins Page
                                </a>
                            </div>

                            <button
                                onClick={checkConnectorStatus}
                                disabled={connectorStatus.checking}
                                className="mt-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={connectorStatus.checking ? 'animate-spin' : ''} />
                                {connectorStatus.checking ? 'Checking...' : 'Check Again'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Cover Style — Nana Banana */}
            {nanaBananaEnabled && isConnected && (
            <div className="bg-white border border-yellow-200 rounded-[2rem] p-8 shadow-sm mb-6">
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Palette size={20} className="text-yellow-500" />
                            Cover Style
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Upload up to 10 reference images to train the AI on your brand's visual style.
                        </p>
                    </div>
                    {coverStylePrompt && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                            <CheckCircle2 size={14} />
                            Style set
                        </span>
                    )}
                </div>

                <div className="mt-6 space-y-4">
                    {/* Saved reference images grid */}
                    {coverReferenceUrls.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Saved References ({coverReferenceUrls.length}/10)
                            </label>
                            <div className="grid grid-cols-5 gap-3">
                                {coverReferenceUrls.map((url, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={url}
                                            alt={`Style reference ${idx + 1}`}
                                            className="w-full h-24 object-cover rounded-xl border border-gray-200"
                                        />
                                        <button
                                            onClick={() => {
                                                const updated = coverReferenceUrls.filter((_, i) => i !== idx);
                                                setCoverReferenceUrls(updated);
                                                patchSite.mutate({
                                                    siteId,
                                                    updates: { cover_reference_urls: updated },
                                                });
                                            }}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                        >
                                            <X size={10} />
                                        </button>
                                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                            {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending files preview */}
                    {pendingStyleFiles.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New images to add ({pendingStyleFiles.length})
                            </label>
                            <div className="grid grid-cols-5 gap-3">
                                {pendingStyleFiles.map((item, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={item.preview}
                                            alt={`New reference ${idx + 1}`}
                                            className="w-full h-24 object-cover rounded-xl border-2 border-yellow-300 border-dashed"
                                        />
                                        <button
                                            onClick={() => setPendingStyleFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* File input — multi-select */}
                    {(coverReferenceUrls.length + pendingStyleFiles.length) < 10 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Add Reference Images ({10 - coverReferenceUrls.length - pendingStyleFiles.length} remaining)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    const maxNew = 10 - coverReferenceUrls.length - pendingStyleFiles.length;
                                    const toAdd = files.slice(0, maxNew);

                                    toAdd.forEach(file => {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            setPendingStyleFiles(prev => {
                                                if (prev.length + coverReferenceUrls.length >= 10) return prev;
                                                return [...prev, { file, preview: ev.target?.result as string }];
                                            });
                                        };
                                        reader.readAsDataURL(file);
                                    });
                                    e.target.value = '';
                                }}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100 file:cursor-pointer"
                            />
                        </div>
                    )}

                    {/* Upload & Analyze button */}
                    <button
                        onClick={async () => {
                            // Gather all images: saved + new pending
                            const allPreviews = [...coverReferenceUrls];
                            const newBase64List: string[] = [];

                            if (pendingStyleFiles.length === 0 && coverReferenceUrls.length === 0) {
                                toast.warning('Add at least one reference image');
                                return;
                            }

                            setIsAnalyzingStyle(true);
                            try {
                                // Convert pending files to base64
                                for (const item of pendingStyleFiles) {
                                    const arrayBuffer = await item.file.arrayBuffer();
                                    const base64 = btoa(
                                        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                                    );
                                    newBase64List.push(base64);
                                    allPreviews.push(`data:${item.file.type};base64,${base64}`);
                                }

                                // Extract base64 from saved data URLs too
                                const savedBase64List = coverReferenceUrls.map(url => {
                                    const match = url.match(/^data:[^;]+;base64,(.+)$/);
                                    return match ? match[1] : '';
                                }).filter(Boolean);

                                const allBase64 = [...savedBase64List, ...newBase64List];

                                // Analyze all images together
                                const res = await fetch('/api/nana-banana/analyze-style', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ site_id: siteId, images: allBase64 }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed to analyze style');

                                setCoverStylePrompt(data.style_prompt);

                                // Save all reference URLs (data URLs for preview)
                                setCoverReferenceUrls(allPreviews);
                                patchSite.mutate({
                                    siteId,
                                    updates: { cover_reference_urls: allPreviews },
                                });

                                setPendingStyleFiles([]);
                                toast.success(`Style analyzed from ${allBase64.length} image${allBase64.length > 1 ? 's' : ''}!`);
                            } catch (error) {
                                toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            } finally {
                                setIsAnalyzingStyle(false);
                            }
                        }}
                        disabled={(pendingStyleFiles.length === 0 && coverReferenceUrls.length === 0) || isAnalyzingStyle}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-xl text-sm hover:from-yellow-500 hover:to-orange-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzingStyle ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Analyzing {coverReferenceUrls.length + pendingStyleFiles.length} image{(coverReferenceUrls.length + pendingStyleFiles.length) > 1 ? 's' : ''}...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                {pendingStyleFiles.length > 0
                                    ? `Upload & Analyze ${coverReferenceUrls.length + pendingStyleFiles.length} Images`
                                    : coverReferenceUrls.length > 0
                                        ? `Re-analyze ${coverReferenceUrls.length} Image${coverReferenceUrls.length > 1 ? 's' : ''}`
                                        : 'Upload & Analyze Style'}
                            </>
                        )}
                    </button>

                    {/* Style prompt textarea */}
                    {coverStylePrompt && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Style Description</label>
                            <textarea
                                value={coverStylePrompt}
                                onChange={(e) => setCoverStylePrompt(e.target.value)}
                                rows={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all text-sm text-gray-700 leading-relaxed"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-gray-400">
                                    AI-generated description. Edit to refine the style for all future covers.
                                </p>
                                <button
                                    onClick={() => {
                                        patchSite.mutate({
                                            siteId,
                                            updates: { cover_style_prompt: coverStylePrompt },
                                        }, {
                                            onSuccess: () => toast.success('Style prompt saved'),
                                            onError: () => toast.error('Failed to save style prompt'),
                                        });
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    <Save size={12} />
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Move to Workspace */}
            <WorkspaceMoveSection siteId={siteId} currentWorkspaceId={site?.workspace_id} />

            {/* Danger Zone */}
            <div className="bg-white border border-red-200 rounded-[2rem] p-8 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-6">Permanently delete this site and all associated data.</p>

                <button
                    onClick={handleDeleteSite}
                    disabled={deleteSite.isPending}
                    className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg text-sm hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Trash2 size={16} /> {deleteSite.isPending ? 'Deleting...' : 'Delete Site'}
                </button>
            </div>
        </div>
    );

    const renderCategoriesTab = () => {
        if (!site?.wp_username || !site?.wp_app_password) {
            return renderPlaceholder('Categories', 'Connect WordPress first');
        }
        if (isCatTagsLoading && wpCategories.length === 0) {
            return (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading categories from WordPress...
                </div>
            );
        }
        if (catTagsError && wpCategories.length === 0) {
            return (
                <div className="text-center py-12 space-y-3">
                    <AlertTriangle size={32} className="text-amber-500 mx-auto" />
                    <p className="text-gray-700 font-medium">Failed to load categories</p>
                    <p className="text-sm text-gray-500">{catTagsError}</p>
                    <button onClick={fetchCategoriesAndTags} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
                        Retry
                    </button>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                {/* Create new category */}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateCatTag('category', newCategoryName);
                        }}
                    />
                    <button
                        onClick={() => handleCreateCatTag('category', newCategoryName)}
                        disabled={isCreatingCatTag || !newCategoryName.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        {isCreatingCatTag ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Add
                    </button>
                    <button onClick={fetchCategoriesAndTags} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw size={16} className={isCatTagsLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
                <p className="text-xs text-gray-500">{wpCategories.length} categories from WordPress</p>
                {wpCategories.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No categories yet. Create one above.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {wpCategories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors group">
                                {editingCatTag?.type === 'category' && editingCatTag.id === cat.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            type="text"
                                            value={editingCatTag.name}
                                            onChange={e => setEditingCatTag({ ...editingCatTag, name: e.target.value })}
                                            onKeyDown={e => { if (e.key === 'Enter') handleUpdateCatTag('category', cat.id, editingCatTag.name); if (e.key === 'Escape') setEditingCatTag(null); }}
                                            className="flex-1 px-2 py-1 border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                                            autoFocus
                                        />
                                        <button onClick={() => handleUpdateCatTag('category', cat.id, editingCatTag.name)} disabled={isSavingCatTag} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                            {isSavingCatTag ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        </button>
                                        <button onClick={() => setEditingCatTag(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <span className="font-medium text-gray-900">{cat.name}</span>
                                            <span className="text-xs text-gray-400 ml-2">/{cat.slug}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{cat.count} posts</span>
                                            <button onClick={() => setEditingCatTag({ type: 'category', id: cat.id, name: cat.name })} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Rename"><Edit size={14} /></button>
                                            <button onClick={() => handleDeleteCatTag('category', cat.id, cat.name)} disabled={deletingCatTagId === cat.id} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50" title="Delete">
                                                {deletingCatTagId === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderTagsTab = () => {
        if (!site?.wp_username || !site?.wp_app_password) {
            return renderPlaceholder('Tags', 'Connect WordPress first');
        }
        if (isCatTagsLoading && wpTags.length === 0) {
            return (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading tags from WordPress...
                </div>
            );
        }
        if (catTagsError && wpTags.length === 0) {
            return (
                <div className="text-center py-12 space-y-3">
                    <AlertTriangle size={32} className="text-amber-500 mx-auto" />
                    <p className="text-gray-700 font-medium">Failed to load tags</p>
                    <p className="text-sm text-gray-500">{catTagsError}</p>
                    <button onClick={fetchCategoriesAndTags} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
                        Retry
                    </button>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                {/* Create new tag */}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="New tag name..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateCatTag('tag', newTagName);
                        }}
                    />
                    <button
                        onClick={() => handleCreateCatTag('tag', newTagName)}
                        disabled={isCreatingCatTag || !newTagName.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        {isCreatingCatTag ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Add
                    </button>
                    <button onClick={fetchCategoriesAndTags} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw size={16} className={isCatTagsLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
                <p className="text-xs text-gray-500">{wpTags.length} tags from WordPress</p>
                {wpTags.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No tags yet. Create one above.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {wpTags.map(tag => (
                            editingCatTag?.type === 'tag' && editingCatTag.id === tag.id ? (
                                <div key={tag.id} className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-indigo-300 rounded-xl bg-indigo-50 text-sm">
                                    <input
                                        type="text"
                                        value={editingCatTag.name}
                                        onChange={e => setEditingCatTag({ ...editingCatTag, name: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateCatTag('tag', tag.id, editingCatTag.name); if (e.key === 'Escape') setEditingCatTag(null); }}
                                        className="w-24 px-1.5 py-0.5 border border-indigo-200 rounded text-sm bg-white focus:ring-1 focus:ring-indigo-400"
                                        autoFocus
                                    />
                                    <button onClick={() => handleUpdateCatTag('tag', tag.id, editingCatTag.name)} disabled={isSavingCatTag} className="p-0.5 text-indigo-600 hover:bg-indigo-100 rounded">
                                        {isSavingCatTag ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    </button>
                                    <button onClick={() => setEditingCatTag(null)} className="p-0.5 text-gray-400 hover:bg-gray-200 rounded"><X size={12} /></button>
                                </div>
                            ) : (
                                <span key={tag.id} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm group">
                                    <Tag size={12} className="text-gray-400" />
                                    <span className="font-medium text-gray-900">{tag.name}</span>
                                    <span className="text-xs text-gray-400">({tag.count})</span>
                                    <button onClick={() => setEditingCatTag({ type: 'tag', id: tag.id, name: tag.name })} className="p-0.5 text-gray-400 hover:text-indigo-600 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-1" title="Rename"><Edit size={12} /></button>
                                    <button onClick={() => handleDeleteCatTag('tag', tag.id, tag.name)} disabled={deletingCatTagId === tag.id} className="p-0.5 text-gray-400 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50" title="Delete">
                                        {deletingCatTagId === tag.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                    </button>
                                </span>
                            )
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto bg-[#F5F5F7]">
            {/* Sticky Header + Tabs */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
                {/* Row 1: Navigation + Site Info */}
                <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>
                    <div className="h-5 w-px bg-gray-200" />
                    <img src={site.favicon} alt={site.name} className="w-6 h-6 rounded-lg object-cover" />
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-base font-bold text-gray-900 truncate">{site.name}</h1>
                        {site.is_competitor && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 border border-red-100 flex-shrink-0">
                                <Swords size={10} />
                                Competitor
                            </span>
                        )}
                        <a href={`https://${site.url}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-blue-500 transition-colors truncate hidden sm:inline">{site.url}</a>
                    </div>
                </div>
                {/* Row 2: Tab Bar */}
                <div className="flex px-4 sm:px-6 lg:px-8 gap-1 overflow-x-auto">
                    {tabItems.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview — metrics + nav tiles */}
            {activeTab === 'overview' && renderOverview()}

            {/* Content — full width, no side padding */}
            {activeTab === 'content' && (
                <div className="animate-fade-in">
                    {renderContent()}
                </div>
            )}
            {activeTab === 'redirects' && (
                <div className="animate-fade-in px-6 md:px-8 pb-6">
                    <RedirectManager siteId={siteId} />
                </div>
            )}
            {activeTab !== 'content' && activeTab !== 'redirects' && activeTab !== 'overview' && (
                <div className="animate-fade-in px-6 md:px-8 pb-6">
                    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                        {activeTab === 'categories' && renderCategoriesTab()}
                        {activeTab === 'tags' && renderTagsTab()}
                        {activeTab === 'settings' && renderSettings()}
                    </div>
                </div>
            )}

            {/* Publish Modal */}
            {articleToPublish && (
                <PublishModal
                    isOpen={isPublishModalOpen}
                    onClose={() => {
                        setIsPublishModalOpen(false);
                        setArticleToPublish(null);
                    }}
                    onPublish={handlePublishWithCategoriesAndTags}
                    siteId={siteId}
                    articleTitle={articleToPublish.title || 'Untitled'}
                    isPublishing={publishArticle.isPending}
                    isUpdate={!!articleToPublish.wp_post_id}
                />
            )}

            {/* New Post Dialog */}
            {showNewArticleDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">New Post for {site.name}</h3>
                            <button onClick={() => setShowNewArticleDialog(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newArticleTitle}
                                    onChange={(e) => setNewArticleTitle(e.target.value)}
                                    placeholder="Post title..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword (optional)</label>
                                <input
                                    type="text"
                                    value={newArticleKeyword}
                                    onChange={(e) => setNewArticleKeyword(e.target.value)}
                                    placeholder="e.g., seo optimization tips"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowNewArticleDialog(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateNewArticle}
                                disabled={isCreatingArticle || !newArticleTitle.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isCreatingArticle ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={14} />
                                        Create & Edit
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SiteDetails;