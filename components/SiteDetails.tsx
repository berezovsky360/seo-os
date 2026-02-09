import React, { useState, useEffect, useRef } from 'react';
import { Site } from '../types';
import { ArticleRecord } from '@/lib/services/articleService';
import { ChevronLeft, ChevronRight, Settings, FileText, Tag, Folder, Save, CheckCircle2, MoreHorizontal, Filter, Search, Globe, AlertTriangle, Monitor, Smartphone, TrendingUp, BarChart3, AlertCircle, Calendar, ChevronDown, Plus, Wifi, Trash2, Edit, Eye, GripVertical, Settings2, TrendingDown, X, Loader2, RefreshCw, Download, Puzzle, ExternalLink, Link2, Image as ImageIcon, BookOpen, Shield, Hash, Upload, RefreshCcw, Wand2, Sparkles, Palette } from 'lucide-react';
import { useSite, useUpdateSite, useDeleteSite } from '@/hooks/useSites';
import { useArticles, useCreateArticle, usePublishArticleToWordPress } from '@/hooks/useArticles';
import { useSyncPosts, usePosts } from '@/hooks/usePosts';
import { useToast } from '@/lib/contexts/ToastContext';
import { useCore } from '@/lib/contexts/CoreContext';
import { useQueryClient } from '@tanstack/react-query';
import PublishModal from './PublishModal';
import ArticleEditor from './ArticleEditor';
import SEOScoreIndicator from './SEOScoreIndicator';

interface SiteDetailsProps {
    siteId: string;
    onBack: () => void;
}

type Tab = 'content' | 'categories' | 'tags' | 'settings';
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

// Available columns for customization
const AVAILABLE_COLUMNS = [
    { id: 'title', label: 'Title', required: true },
    { id: 'source', label: 'Source' },
    { id: 'keyword', label: 'Keyword' },
    { id: 'seo_score', label: 'SEO Score' },
    { id: 'readability', label: 'Readability' },
    { id: 'word_count', label: 'Words' },
    { id: 'links', label: 'Links' },
    { id: 'images', label: 'Images' },
    { id: 'seo_title', label: 'SEO Title' },
    { id: 'seo_description', label: 'Meta Desc' },
    { id: 'robots', label: 'Robots' },
    { id: 'schema_type', label: 'Schema' },
    { id: 'canonical', label: 'Canonical' },
    { id: 'published_at', label: 'Published' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions', required: true },
];

const SiteDetails: React.FC<SiteDetailsProps> = ({ siteId, onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('content');
    const [contentFilter, setContentFilter] = useState<ContentFilter>('all');

    // Fetch site data
    const { data: site, isLoading: siteLoading } = useSite(siteId);
    const { data: articles = [], isLoading: articlesLoading } = useArticles(siteId);
    const { data: posts = [], isLoading: postsLoading } = usePosts(siteId);
    const updateSite = useUpdateSite();
    const deleteSite = useDeleteSite();
    const syncPosts = useSyncPosts();
    const publishArticle = usePublishArticleToWordPress();
    const createArticle = useCreateArticle();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { isModuleEnabled } = useCore();
    const nanaBananaEnabled = isModuleEnabled('nana-banana');

    // Cover Style State
    const [coverStylePrompt, setCoverStylePrompt] = useState('');
    const [coverReferenceUrl, setCoverReferenceUrl] = useState('');
    const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
    const [styleImageFile, setStyleImageFile] = useState<File | null>(null);
    const [styleImagePreview, setStyleImagePreview] = useState<string | null>(null);

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

    // Article Editor State
    const [editingArticle, setEditingArticle] = useState<ArticleRecord | null>(null);
    // Track if we're editing a WP post (from posts table) vs a local article (from generated_articles)
    const [editingWPPostId, setEditingWPPostId] = useState<string | null>(null);

    // Categories & Tags State
    const [wpCategories, setWpCategories] = useState<Array<{id: number; name: string; slug: string; count: number}>>([]);
    const [wpTags, setWpTags] = useState<Array<{id: number; name: string; slug: string; count: number}>>([]);
    const [isCatTagsLoading, setIsCatTagsLoading] = useState(false);
    const [catTagsError, setCatTagsError] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [isCreatingCatTag, setIsCreatingCatTag] = useState(false);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);

    // Clear selection when contentFilter changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [contentFilter]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredContent.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredContent.map(item => item.id)));
        }
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

    // Column Customization State
    const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>([
        'title',
        'source',
        'keyword',
        'seo_score',
        'readability',
        'word_count',
        'links',
        'images',
        'status',
        'actions',
    ]);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

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
            setCoverReferenceUrl((site as any).cover_reference_url || '');
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
        if (contentFilter === 'all') return contentItems;
        return contentItems.filter(item => item.source === contentFilter);
    }, [contentItems, contentFilter]);

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

    const renderTabs = () => (
        <div className="flex space-x-1 border-b border-gray-200 mb-6 mt-8">
            <button
                onClick={() => setActiveTab('content')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'content' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <FileText size={16} /> Content
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                    {contentItems.length}
                </span>
            </button>
            <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'categories' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Folder size={16} /> Categories
            </button>
            <button
                onClick={() => setActiveTab('tags')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tags' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Tag size={16} /> Tags
            </button>
            <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Settings size={16} /> Settings
            </button>
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
        setEditingWPPostId(null);
        setEditingArticle(article);
    };

    const handleEditWPPost = (post: any) => {
        // Convert WP post to ArticleEditor-compatible format
        const articleCompat: ArticleRecord = {
            id: post.id,
            site_id: post.site_id,
            keyword: post.focus_keyword || '',
            title: post.title,
            seo_title: post.seo_title,
            seo_description: post.seo_description,
            content: post.content,
            word_count: post.word_count,
            status: post.status,
            wp_post_id: post.wp_post_id,
            created_at: post.created_at,
            published_at: post.published_at,
            seo_score: post.seo_score,
            canonical_url: post.canonical_url,
            robots_meta: post.robots_meta,
            og_title: post.og_title,
            og_description: post.og_description,
            og_image_url: post.og_image_url,
            twitter_title: post.twitter_title,
            twitter_description: post.twitter_description,
            twitter_image_url: post.twitter_image_url,
            twitter_card_type: post.twitter_card_type,
            schema_article_type: post.schema_article_type,
            additional_keywords: post.additional_keywords,
            readability_score: post.readability_score,
            content_ai_score: post.content_ai_score,
            internal_links_count: post.internal_links_count,
            external_links_count: post.external_links_count,
            images_count: post.images_count,
            images_alt_count: post.images_alt_count,
        };
        setEditingWPPostId(post.id);
        setEditingArticle(articleCompat);
    };

    const handleCloseEditor = () => {
        setEditingArticle(null);
        setEditingWPPostId(null);
    };

    const handleSaveArticleFromEditor = async (updates: any) => {
        if (!editingArticle) return;

        try {
            // Use different API endpoint depending on whether this is a WP post or local article
            const apiUrl = editingWPPostId
                ? `/api/posts/${editingWPPostId}`
                : `/api/articles/${editingArticle.id}`;

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Saved!');
                setEditingArticle({ ...editingArticle, ...updates });
                // Invalidate both queries to refresh the table
                queryClient.invalidateQueries({ queryKey: ['articles'] });
                queryClient.invalidateQueries({ queryKey: ['posts'] });
            } else {
                const errMsg = result.error || 'Failed to save';
                toast.error(errMsg);
                throw new Error(errMsg);
            }
        } catch (error) {
            if (!(error instanceof Error && error.message.includes('Failed'))) {
                toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            throw error;
        }
    };

    const handlePublishFromEditor = async (categoryIds: number[], tagIds: number[]) => {
        if (!editingArticle || !site) return;

        try {
            // Create version backup before publishing
            try {
                await fetch('/api/versions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        articleId: editingWPPostId ? undefined : editingArticle.id,
                        postId: editingWPPostId || undefined,
                        siteId: site.id,
                        label: 'Before publish to WordPress',
                    }),
                });
            } catch (vErr) {
                console.error('Pre-publish version creation failed (non-blocking):', vErr);
            }

            // Use different publish endpoint for WP posts vs local articles
            const apiUrl = editingWPPostId
                ? `/api/posts/${editingWPPostId}/publish`
                : `/api/articles/${editingArticle.id}/publish`;

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
                handleCloseEditor();
                queryClient.invalidateQueries({ queryKey: ['articles'] });
                queryClient.invalidateQueries({ queryKey: ['posts'] });
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleAnalyzeFromEditor = async () => {
        if (!editingArticle) return null;

        try {
            // Send article data in the body so the analyze endpoint works
            // regardless of whether this is a WP post or local article
            const response = await fetch(`/api/articles/${editingArticle.id}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editingArticle.title,
                    content: editingArticle.content,
                    keyword: editingArticle.keyword,
                    seo_title: editingArticle.seo_title,
                    seo_description: editingArticle.seo_description,
                    focus_keyword: editingArticle.keyword,
                    word_count: editingArticle.word_count,
                    readability_score: editingArticle.readability_score,
                    images_count: editingArticle.images_count,
                    images_alt_count: editingArticle.images_alt_count,
                    internal_links_count: editingArticle.internal_links_count,
                    external_links_count: editingArticle.external_links_count,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`SEO Score: ${result.analysis.score}/100`);
                return result.analysis;
            } else {
                toast.error(result.error || 'Failed to analyze article');
                return null;
            }
        } catch (error) {
            toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
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
            setEditingArticle(newArticle);
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
        const column = AVAILABLE_COLUMNS.find((col) => col.id === columnId);
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
                        articleId: editingWPPostId ? undefined : articleToPublish.id,
                        postId: editingWPPostId || undefined,
                        siteId: site.id,
                        label: 'Before publish to WordPress',
                    }),
                });
            } catch (vErr) {
                console.error('Pre-publish version creation failed (non-blocking):', vErr);
            }

            // Route to correct API depending on whether this is a WP post or local article
            const apiUrl = editingWPPostId
                ? `/api/posts/${editingWPPostId}/publish`
                : `/api/articles/${articleToPublish.id}/publish`;

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
                setEditingWPPostId(null);
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

        return (
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                    <div className="flex gap-2">
                        {/* Source filter pills */}
                        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <button
                                onClick={() => setContentFilter('all')}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                    contentFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                All ({contentItems.length})
                            </button>
                            <button
                                onClick={() => setContentFilter('wordpress')}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                                    contentFilter === 'wordpress' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                WP ({wpCount})
                            </button>
                            <button
                                onClick={() => setContentFilter('generated')}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                                    contentFilter === 'generated' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                SEO OS ({genCount})
                            </button>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Settings2 size={14} />
                                Columns
                            </button>
                            {showColumnCustomizer && (
                                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-64">
                                    <p className="text-xs font-medium text-gray-700 mb-2">Show/Hide Columns</p>
                                    <div className="space-y-2">
                                        {AVAILABLE_COLUMNS.map((column) => (
                                            <label
                                                key={column.id}
                                                className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns.includes(column.id)}
                                                    onChange={() => toggleColumn(column.id)}
                                                    disabled={column.required}
                                                    className="rounded border-gray-300"
                                                />
                                                {column.label}
                                                {column.required && (
                                                    <span className="text-xs text-gray-400">(required)</span>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search content..." className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <button
                            onClick={() => setShowNewArticleDialog(true)}
                            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                        >
                            <Plus size={14} />
                            New Post
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold">
                            Bulk Actions for {selectedIds.size} selected:
                        </span>
                        <div className="flex items-center gap-2">
                            {bulkProcessing ? (
                                <div className="flex items-center gap-2 text-sm">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>{bulkProgress.current}/{bulkProgress.total}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowBulkStatusDropdown(!showBulkStatusDropdown)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            <RefreshCcw size={12} />
                                            Change Status
                                            <ChevronDown size={12} />
                                        </button>
                                        {showBulkStatusDropdown && (
                                            <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-30 min-w-[140px]">
                                                {['draft', 'reviewed', 'published'].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => handleBulkStatusChange(s)}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 capitalize"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleBulkPublish}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
                                    >
                                        <Upload size={12} />
                                        Sync to WP
                                    </button>
                                    {nanaBananaEnabled && (
                                        <button
                                            onClick={handleBulkGenerateCovers}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/30 hover:bg-yellow-500/50 rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            <Wand2 size={12} />
                                            Generate Covers
                                        </button>
                                    )}
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-xs font-semibold transition-colors"
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="px-3 py-1.5 text-xs font-semibold hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        Deselect All
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded-md border-gray-300"
                                        checked={filteredContent.length > 0 && selectedIds.size === filteredContent.length}
                                        ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredContent.length; }}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                {visibleColumns.map((columnId) => {
                                    const column = AVAILABLE_COLUMNS.find((col) => col.id === columnId);
                                    if (!column) return null;
                                    return (
                                        <th
                                            key={columnId}
                                            draggable
                                            onDragStart={() => handleDragStart(columnId)}
                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                            onDragEnd={handleDragEnd}
                                            className={`px-6 py-4 cursor-move ${
                                                draggedColumn === columnId ? 'opacity-50' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <GripVertical size={14} className="text-gray-400" />
                                                {column.label}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                            Loading content...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredContent.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="px-6 py-12 text-center text-gray-500">
                                        <div className="text-center space-y-3">
                                            <FileText size={32} className="text-gray-300 mx-auto" />
                                            <div>
                                                <p className="font-medium">
                                                    {contentFilter === 'wordpress' ? 'No WordPress posts' :
                                                     contentFilter === 'generated' ? 'No posts created in SEO OS' :
                                                     'No content yet'}
                                                </p>
                                                <p className="text-xs mt-1">
                                                    {contentFilter === 'wordpress'
                                                        ? 'Sync posts from WordPress in Settings'
                                                        : 'Create your first post or sync from WordPress'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredContent.map(item => (
                                    <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(item.id) ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded-md border-gray-300"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        {visibleColumns.includes('title') && (
                                            <td className="px-6 py-4">
                                                <div
                                                    className="cursor-pointer"
                                                    onClick={() => {
                                                        if (item.originalArticle) handleEditArticle(item.originalArticle);
                                                        else if (item.originalPost) handleEditWPPost(item.originalPost);
                                                    }}
                                                >
                                                    <div className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                                                        {item.title || 'Untitled'}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('source') && (
                                            <td className="px-6 py-4">
                                                {item.source === 'wordpress' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                        <Globe size={10} /> WP
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                                        <FileText size={10} /> Local
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('keyword') && (
                                            <td className="px-6 py-4">
                                                {item.keyword ? (
                                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                                        <Tag size={12} />
                                                        {item.keyword}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('seo_score') && (
                                            <td className="px-6 py-4">
                                                {item.seo_score !== null || item.preliminary_seo_score ? (
                                                    <div className="flex items-center gap-2">
                                                        <SEOScoreIndicator
                                                            score={item.seo_score || item.preliminary_seo_score || 0}
                                                            size="sm"
                                                        />
                                                        {item.seo_score && item.preliminary_seo_score && (
                                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                {item.seo_score > item.preliminary_seo_score ? (
                                                                    <TrendingUp size={12} className="text-emerald-600" />
                                                                ) : item.seo_score < item.preliminary_seo_score ? (
                                                                    <TrendingDown size={12} className="text-rose-600" />
                                                                ) : null}
                                                                <span>{item.preliminary_seo_score} → {item.seo_score}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('readability') && (
                                            <td className="px-6 py-4">
                                                {item.readability_score != null ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            item.readability_score >= 80 ? 'bg-emerald-500' :
                                                            item.readability_score >= 50 ? 'bg-amber-500' :
                                                            'bg-rose-500'
                                                        }`} />
                                                        <span className={`text-xs font-bold ${
                                                            item.readability_score >= 80 ? 'text-emerald-700' :
                                                            item.readability_score >= 50 ? 'text-amber-700' :
                                                            'text-rose-700'
                                                        }`}>
                                                            {item.readability_score}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('word_count') && (
                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                {item.word_count ? `${item.word_count.toLocaleString()}` : '—'}
                                            </td>
                                        )}
                                        {visibleColumns.includes('links') && (
                                            <td className="px-6 py-4">
                                                {(item.internal_links_count != null || item.external_links_count != null) ? (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="flex items-center gap-0.5 text-blue-600" title="Internal links">
                                                            <Link2 size={11} />
                                                            {item.internal_links_count ?? 0}
                                                        </span>
                                                        <span className="text-gray-300">/</span>
                                                        <span className="flex items-center gap-0.5 text-orange-600" title="External links">
                                                            <ExternalLink size={11} />
                                                            {item.external_links_count ?? 0}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('images') && (
                                            <td className="px-6 py-4">
                                                {item.images_count != null ? (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <ImageIcon size={12} className="text-gray-400" />
                                                        <span className="text-gray-700">{item.images_count}</span>
                                                        {item.images_count > 0 && (
                                                            <span className={`text-[10px] ${
                                                                item.images_alt_count === item.images_count
                                                                    ? 'text-emerald-600'
                                                                    : 'text-amber-600'
                                                            }`}>
                                                                ({item.images_alt_count ?? 0} alt)
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('seo_title') && (
                                            <td className="px-6 py-4">
                                                {item.seo_title ? (
                                                    <div className="max-w-[200px]">
                                                        <p className="text-xs text-gray-700 truncate" title={item.seo_title}>
                                                            {item.seo_title}
                                                        </p>
                                                        <span className={`text-[10px] ${
                                                            item.seo_title.length >= 50 && item.seo_title.length <= 60
                                                                ? 'text-emerald-600'
                                                                : item.seo_title.length > 60
                                                                ? 'text-rose-600'
                                                                : 'text-amber-600'
                                                        }`}>
                                                            {item.seo_title.length}/60
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('seo_description') && (
                                            <td className="px-6 py-4">
                                                {item.seo_description ? (
                                                    <div className="max-w-[220px]">
                                                        <p className="text-xs text-gray-700 truncate" title={item.seo_description}>
                                                            {item.seo_description}
                                                        </p>
                                                        <span className={`text-[10px] ${
                                                            item.seo_description.length >= 150 && item.seo_description.length <= 160
                                                                ? 'text-emerald-600'
                                                                : item.seo_description.length > 160
                                                                ? 'text-rose-600'
                                                                : 'text-amber-600'
                                                        }`}>
                                                            {item.seo_description.length}/160
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('robots') && (
                                            <td className="px-6 py-4">
                                                {item.robots_meta ? (
                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                        item.robots_meta.includes('noindex')
                                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    }`}>
                                                        <Shield size={10} />
                                                        {item.robots_meta.includes('noindex') ? 'noindex' : 'index'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('schema_type') && (
                                            <td className="px-6 py-4">
                                                {item.schema_article_type ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
                                                        <Hash size={10} />
                                                        {item.schema_article_type}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('canonical') && (
                                            <td className="px-6 py-4">
                                                {item.canonical_url ? (
                                                    <a
                                                        href={item.canonical_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-blue-600 hover:underline truncate max-w-[150px] block"
                                                        title={item.canonical_url}
                                                    >
                                                        {new URL(item.canonical_url).pathname}
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('published_at') && (
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {item.published_at ? (
                                                    <span title={new Date(item.published_at).toLocaleString()}>
                                                        {new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('status') && (
                                            <td className="px-6 py-4">
                                                <div className="relative w-fit">
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                        item.status === 'publish' || item.status === 'published' ? 'bg-emerald-50 text-emerald-700' :
                                                        item.status === 'reviewed' ? 'bg-amber-50 text-amber-700' :
                                                        item.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('actions') && (
                                            <td className="px-6 py-4">
                                                {item.source === 'wordpress' && item.originalPost ? (
                                                    // WordPress post actions: Edit, Update WP, View
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleEditWPPost(item.originalPost)}
                                                            className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        {item.wp_post_id && (
                                                            <button
                                                                onClick={() => {
                                                                    if (!site?.wp_username || !site?.wp_app_password) {
                                                                        toast.warning('Configure WordPress credentials first');
                                                                        return;
                                                                    }
                                                                    // For WP posts, use the post as article to trigger the PublishModal
                                                                    const postAsArticle: ArticleRecord = {
                                                                        id: item.originalPost.id,
                                                                        site_id: item.originalPost.site_id,
                                                                        keyword: item.originalPost.focus_keyword || '',
                                                                        title: item.originalPost.title,
                                                                        seo_title: item.originalPost.seo_title,
                                                                        seo_description: item.originalPost.seo_description,
                                                                        content: item.originalPost.content,
                                                                        word_count: item.originalPost.word_count,
                                                                        status: item.originalPost.status,
                                                                        wp_post_id: item.originalPost.wp_post_id,
                                                                        created_at: item.originalPost.created_at,
                                                                        published_at: item.originalPost.published_at,
                                                                    };
                                                                    setArticleToPublish(postAsArticle);
                                                                    setEditingWPPostId(item.originalPost.id);
                                                                    setIsPublishModalOpen(true);
                                                                }}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1"
                                                                title="Update in WordPress"
                                                            >
                                                                <RefreshCw size={12} /> Update WP
                                                            </button>
                                                        )}
                                                        {item.url && (
                                                            <a
                                                                href={item.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                                title="View on site"
                                                            >
                                                                <Globe size={16} />
                                                            </a>
                                                        )}
                                                        {nanaBananaEnabled && item.wp_post_id && (
                                                            <button
                                                                onClick={() => handleGenerateCover(item.id)}
                                                                disabled={generatingCoverId === item.id}
                                                                className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors disabled:opacity-50"
                                                                title="Generate Cover"
                                                            >
                                                                {generatingCoverId === item.id ? (
                                                                    <Loader2 size={16} className="animate-spin" />
                                                                ) : (
                                                                    <Wand2 size={16} />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : item.originalArticle ? (
                                                    // Generated article actions: Edit, Analyze, Publish
                                                    item.status === 'published' && item.wp_post_id ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleEditArticle(item.originalArticle!)}
                                                                className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handlePublishArticle(item.originalArticle!)}
                                                                disabled={publishArticle.isPending}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                                title="Update in WordPress"
                                                            >
                                                                <RefreshCw size={12} /> Update WP
                                                            </button>
                                                            {item.url && (
                                                                <a
                                                                    href={item.url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                                    title="View on site"
                                                                >
                                                                    <Globe size={16} />
                                                                </a>
                                                            )}
                                                            {nanaBananaEnabled && item.wp_post_id && (
                                                                <button
                                                                    onClick={() => handleGenerateCover(item.id)}
                                                                    disabled={generatingCoverId === item.id}
                                                                    className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors disabled:opacity-50"
                                                                    title="Generate Cover"
                                                                >
                                                                    {generatingCoverId === item.id ? (
                                                                        <Loader2 size={16} className="animate-spin" />
                                                                    ) : (
                                                                        <Wand2 size={16} />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleEditArticle(item.originalArticle!)}
                                                                className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAnalyzeInline(item.originalArticle!)}
                                                                disabled={analyzingArticleId === item.originalArticle!.id}
                                                                className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-600 transition-colors disabled:opacity-50"
                                                                title="Analyze SEO"
                                                            >
                                                                {analyzingArticleId === item.originalArticle!.id ? (
                                                                    <Loader2 size={16} className="animate-spin" />
                                                                ) : (
                                                                    <Eye size={16} />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handlePublishArticle(item.originalArticle!)}
                                                                disabled={publishArticle.isPending}
                                                                className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Publish
                                                            </button>
                                                        </div>
                                                    )
                                                ) : null}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderSettings = () => (
        <div className="max-w-2xl">
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
                            Upload a reference image to define the visual style for AI-generated covers.
                        </p>
                    </div>
                    {coverReferenceUrl && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                            <CheckCircle2 size={14} />
                            Style set
                        </span>
                    )}
                </div>

                <div className="mt-6 space-y-4">
                    {/* Reference image preview */}
                    {(styleImagePreview || coverReferenceUrl) && (
                        <div className="relative w-full max-w-sm">
                            <img
                                src={styleImagePreview || coverReferenceUrl}
                                alt="Style reference"
                                className="w-full h-48 object-cover rounded-xl border border-gray-200"
                            />
                            {coverReferenceUrl && !styleImagePreview && (
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Current reference
                                </div>
                            )}
                        </div>
                    )}

                    {/* File input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setStyleImageFile(file);
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setStyleImagePreview(ev.target?.result as string);
                                    reader.readAsDataURL(file);
                                }
                            }}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100 file:cursor-pointer"
                        />
                    </div>

                    {/* Upload & Analyze button */}
                    <button
                        onClick={async () => {
                            if (!styleImageFile) {
                                toast.warning('Select a reference image first');
                                return;
                            }
                            setIsAnalyzingStyle(true);
                            try {
                                // Convert to base64
                                const arrayBuffer = await styleImageFile.arrayBuffer();
                                const base64 = btoa(
                                    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                                );

                                // Analyze style (the API route also saves cover_style_prompt to DB)
                                const res = await fetch('/api/nana-banana/analyze-style', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ site_id: siteId, image_base64: base64 }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed to analyze style');

                                setCoverStylePrompt(data.style_prompt);

                                // Save reference as data URL for preview (no WP upload needed for reference)
                                const dataUrl = `data:${styleImageFile.type};base64,${base64}`;
                                setCoverReferenceUrl(dataUrl);
                                updateSite.mutate({
                                    siteId,
                                    updates: { cover_reference_url: dataUrl } as any,
                                });

                                setStyleImageFile(null);
                                setStyleImagePreview(null);
                                toast.success('Style analyzed and saved!');
                            } catch (error) {
                                toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            } finally {
                                setIsAnalyzingStyle(false);
                            }
                        }}
                        disabled={!styleImageFile || isAnalyzingStyle}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-xl text-sm hover:from-yellow-500 hover:to-orange-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzingStyle ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Analyzing style...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Upload & Analyze Style
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
                                        updateSite.mutate({
                                            siteId,
                                            updates: { cover_style_prompt: coverStylePrompt } as any,
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
                            <div key={cat.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                <div>
                                    <span className="font-medium text-gray-900">{cat.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">/{cat.slug}</span>
                                </div>
                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{cat.count} posts</span>
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
                            <span key={tag.id} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                                <Tag size={12} className="text-gray-400" />
                                <span className="font-medium text-gray-900">{tag.name}</span>
                                <span className="text-xs text-gray-400">({tag.count})</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto bg-[#F5F5F7]">
            {/* Header */}
            <div className="flex flex-col space-y-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 bg-white p-1.5 rounded-lg border border-gray-200 w-fit shadow-sm">
                        <button 
                            onClick={onBack}
                            className="p-1 hover:bg-gray-50 rounded-md text-gray-400 hover:text-gray-600 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="h-4 w-px bg-gray-300"></div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 px-2">
                            <span className="cursor-pointer hover:text-gray-700" onClick={onBack}>Dashboard</span>
                            <ChevronRight size={10} />
                            <span className="font-semibold text-gray-900 truncate">{site.name}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-gray-100 shrink-0 shadow-sm">
                        <img src={site.favicon} alt={site.name} className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
                        <a href={`https://${site.url}`} target="_blank" rel="noreferrer" className="text-sm text-gray-500 hover:text-indigo-600">{site.url}</a>
                    </div>
                </div>
            </div>

            {/* Metrics Dashboard */}
            {renderMetrics()}

            {/* Tabs */}
            {renderTabs()}

            {/* Content */}
            <div className="animate-fade-in bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                {activeTab === 'content' && renderContent()}
                {activeTab === 'categories' && renderCategoriesTab()}
                {activeTab === 'tags' && renderTagsTab()}
                {activeTab === 'settings' && renderSettings()}
            </div>

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

            {/* Article Editor Modal */}
            {editingArticle && (
                <ArticleEditor
                    article={editingArticle}
                    onClose={() => {
                        handleCloseEditor();
                        queryClient.invalidateQueries({ queryKey: ['articles'] });
                        queryClient.invalidateQueries({ queryKey: ['posts'] });
                    }}
                    onSave={handleSaveArticleFromEditor}
                    onPublish={handlePublishFromEditor}
                    onAnalyze={handleAnalyzeFromEditor}
                    isWPPost={!!editingWPPostId}
                    isNanaBananaEnabled={nanaBananaEnabled}
                />
            )}
        </div>
    );
};

export default SiteDetails;