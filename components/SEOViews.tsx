import React, { useState } from 'react';
import { Keyword, Article, LLMResult } from '../types';
import {
    Search, Filter, ArrowUpDown, MoreHorizontal, CheckCircle2, Circle,
    ChevronDown, ChevronRight, LayoutGrid, List as ListIcon, Maximize2,
    ChevronLeft, Download, Bell, Sparkles, RefreshCw, MapPin,
    Plus, Tag, Edit, Eye, GripVertical, Settings2, TrendingUp, TrendingDown, Globe, FileText, Calendar, X, Loader2,
    Trash2, Upload, RefreshCcw, Wand2
} from 'lucide-react';
import { MOCK_KEYWORDS, MOCK_ARTICLES, MOCK_LLM_RESULTS } from '../constants';
import ArticleDrawer from './ArticleDrawer';
import ArticleEditor from './ArticleEditor';
import SEOScoreIndicator from './SEOScoreIndicator';
import { useAllArticles, useCreateArticle } from '@/hooks/useArticles';
import { useSites } from '@/hooks/useSites';
import { useToast } from '@/lib/contexts/ToastContext';
import { useCore } from '@/lib/contexts/CoreContext';
import { useQueryClient } from '@tanstack/react-query';

// --- Shared Components matching KeywordResearch Style ---

const PageHeader = ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div className="flex justify-between items-center px-4 sm:px-8 py-5 bg-[#F5F6F8] z-10">
        <div className="flex items-center gap-3 sm:gap-4">
            {onBack && (
                <>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <ChevronLeft size={14} />
                        Back
                    </button>
                    <div className="h-4 w-px bg-gray-300"></div>
                </>
            )}
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
                <Download size={16} />
                <span>Export</span>
            </button>
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#F5F6F8]"></span>
            </button>
             <div className="w-9 h-9 rounded-full bg-gray-200 p-[2px] shadow-sm overflow-hidden">
                 <img src="https://picsum.photos/100/100?random=101" alt="User" className="w-full h-full rounded-full object-cover" />
             </div>
        </div>
    </div>
);

const FloatingSearchBar = ({ placeholder = "Ask anything..." }: { placeholder?: string }) => (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-30 pointer-events-none">
        <div className="bg-white p-2 rounded-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center gap-2 pl-2 pointer-events-auto">
            
            <button className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-full hover:bg-black transition-colors shadow-md group">
                <Sparkles size={16} className="group-hover:animate-pulse text-indigo-300" />
                <span className="text-sm font-bold">AI</span>
            </button>

            <div className="flex-1 flex items-center px-3 border-l border-gray-100 ml-1">
                <Search size={18} className="text-gray-400 mr-3" />
                <input 
                    type="text" 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900 placeholder-gray-400 h-10 outline-none"
                    placeholder={placeholder}
                />
            </div>

            <button className="hidden md:flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-full text-xs font-bold text-gray-700 transition-colors border border-gray-100">
                <Filter size={14} className="text-gray-400" />
                <span>Filter</span>
                <ChevronDown size={12} className="text-gray-400" />
            </button>

            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
                Search
            </button>
        </div>
    </div>
);

// --- 1.1 Main Keywords View ---
export const MainKeywordsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    return (
        <div className="h-full flex flex-col bg-[#F5F6F8] relative font-sans">
            <PageHeader title="Main Keywords" onBack={onBack} />
            
            <div className="flex-1 overflow-y-auto px-8 pb-32">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="py-5 pl-8 pr-4 w-10"><input type="checkbox" className="rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500" /></th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Main Keyword</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Intent</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider text-center">Research</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider text-center">Ideas</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider text-center">Cluster</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right pr-8">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {MOCK_KEYWORDS.map(kw => (
                                <tr key={kw.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="py-4 pl-8 pr-4 align-middle">
                                        <input type="checkbox" className="rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                    </td>
                                    <td className="py-4 px-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex items-center justify-center w-5 h-5">
                                                 <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-indigo-400 cursor-pointer"></div>
                                            </div>
                                            <span className="text-gray-900 font-semibold text-sm hover:underline cursor-pointer decoration-indigo-300 underline-offset-2">
                                                {kw.term}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 align-middle">
                                         <span className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold border shadow-sm ${
                                            kw.intent === 'T' ? 'border-emerald-200 bg-white text-emerald-600' : 
                                            kw.intent === 'C' ? 'border-amber-200 bg-white text-amber-600' : 
                                            kw.intent === 'I' ? 'border-blue-200 bg-white text-blue-600' : 'border-purple-200 bg-white text-purple-600'
                                         }`}>
                                            {kw.intent}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 align-middle text-center">
                                        {kw.status?.research ? <CheckCircle2 size={18} className="text-emerald-500 mx-auto" /> : <Circle size={18} className="text-gray-200 mx-auto" />}
                                    </td>
                                    <td className="py-4 px-4 align-middle text-center">
                                         <Circle size={18} className="text-gray-200 mx-auto hover:text-indigo-400 cursor-pointer" />
                                    </td>
                                    <td className="py-4 px-4 align-middle text-center">
                                         <Circle size={18} className="text-gray-200 mx-auto hover:text-indigo-400 cursor-pointer" />
                                    </td>
                                    <td className="py-4 px-4 align-middle text-right pr-8">
                                        <button className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <FloatingSearchBar placeholder="Analyze keywords..." />
        </div>
    );
};

// --- 3.1 Article Production View (All Sites) ---
export const ArticleProductionView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { data: articles = [], isLoading } = useAllArticles();
    const { data: sites = [] } = useSites();
    const createArticle = useCreateArticle();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { isModuleEnabled } = useCore();
    const nanaBananaEnabled = isModuleEnabled('nana-banana');
    const [editingArticle, setEditingArticle] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewArticleDialog, setShowNewArticleDialog] = useState(false);
    const [newArticleSiteId, setNewArticleSiteId] = useState('');
    const [newArticleKeyword, setNewArticleKeyword] = useState('');
    const [newArticleTitle, setNewArticleTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [publishingArticleId, setPublishingArticleId] = useState<string | null>(null);
    const [analyzingArticleId, setAnalyzingArticleId] = useState<string | null>(null);
    const [generatingCoverId, setGeneratingCoverId] = useState<string | null>(null);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredArticles.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredArticles.map((a: any) => a.id)));
        }
    };

    const handleBulkStatusChange = async (status: string) => {
        setShowStatusDropdown(false);
        if (selectedIds.size === 0) return;
        setBulkProcessing(true);
        const ids = Array.from(selectedIds);
        setBulkProgress({ current: 0, total: ids.length });
        let success = 0;
        for (const id of ids) {
            try {
                await fetch(`/api/articles/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status }),
                });
                success++;
            } catch {}
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        toast.success(`Updated ${success}/${ids.length} articles`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        setSelectedIds(new Set());
        setBulkProcessing(false);
    };

    const handleBulkPublish = async () => {
        if (selectedIds.size === 0) return;
        const selected = filteredArticles.filter((a: any) => selectedIds.has(a.id) && a.title && a.content);
        if (selected.length === 0) {
            toast.warning('Selected articles must have title and content');
            return;
        }
        setBulkProcessing(true);
        setBulkProgress({ current: 0, total: selected.length });
        let success = 0;
        for (const article of selected) {
            try {
                const res = await fetch(`/api/articles/${article.id}/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ siteId: article.site_id }),
                });
                const result = await res.json();
                if (result.success) success++;
            } catch {}
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        toast.success(`Published ${success}/${selected.length} articles`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        setSelectedIds(new Set());
        setBulkProcessing(false);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} articles? This cannot be undone.`)) return;
        setBulkProcessing(true);
        const ids = Array.from(selectedIds);
        setBulkProgress({ current: 0, total: ids.length });
        let success = 0;
        for (const id of ids) {
            try {
                await fetch(`/api/articles/${id}`, { method: 'DELETE' });
                success++;
            } catch {}
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        toast.success(`Deleted ${success}/${ids.length} articles`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        setSelectedIds(new Set());
        setBulkProcessing(false);
    };

    const handleBulkGenerateCovers = async () => {
        if (selectedIds.size === 0) return;
        const selected = filteredArticles.filter((a: any) => selectedIds.has(a.id) && a.wp_post_id);
        if (selected.length === 0) {
            toast.warning('No selected articles have been synced to WordPress');
            return;
        }
        setBulkProcessing(true);
        setBulkProgress({ current: 0, total: selected.length });
        let success = 0;
        for (const article of selected) {
            try {
                const res = await fetch('/api/nana-banana/pipeline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ site_id: article.site_id, post_id: article.id }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Pipeline failed');
                }
                success++;
            } catch (err) {
                console.error(`Cover generation failed for ${article.id}:`, err);
            }
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        toast.success(`Generated covers for ${success}/${selected.length} articles`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        setSelectedIds(new Set());
        setBulkProcessing(false);
    };

    const filteredArticles = articles.filter((article: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (article.title || '').toLowerCase().includes(q) ||
            (article.keyword || '').toLowerCase().includes(q) ||
            (article.sites?.name || '').toLowerCase().includes(q)
        );
    });

    const handleEditArticle = (article: any) => {
        setEditingArticle(article);
    };

    const handleSaveArticle = async (updates: any) => {
        if (!editingArticle) return;
        try {
            const response = await fetch(`/api/articles/${editingArticle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const result = await response.json();
            if (result.success && result.article) {
                toast.success('Article saved successfully!');
                setEditingArticle({ ...editingArticle, ...updates });
                queryClient.invalidateQueries({ queryKey: ['articles'] });
            } else {
                const errMsg = result.error || 'Failed to save article';
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

    const handleAnalyzeArticle = async () => {
        if (!editingArticle) return;
        try {
            const response = await fetch(`/api/articles/${editingArticle.id}/analyze`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                toast.success(`SEO Score: ${result.analysis.score}/100`);
                return result.analysis;
            }
            toast.error('Failed to analyze article');
            return null;
        } catch (error) {
            toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    };

    const handleAnalyzeInline = async (article: any) => {
        setAnalyzingArticleId(article.id);
        try {
            const response = await fetch(`/api/articles/${article.id}/analyze`, { method: 'POST' });
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

    const handlePublishInline = async (article: any) => {
        if (!article.title || !article.content) {
            toast.warning('Article must have title and content before publishing');
            return;
        }
        setPublishingArticleId(article.id);
        try {
            const response = await fetch(`/api/articles/${article.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId: article.site_id }),
            });
            const result = await response.json();
            if (result.success) {
                toast.success(`Published! ${result.wpUrl || ''}`);
                queryClient.invalidateQueries({ queryKey: ['articles'] });
            } else {
                toast.error(result.message || 'Failed to publish');
            }
        } catch (error) {
            toast.error(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setPublishingArticleId(null);
        }
    };

    const handlePublishFromEditor = async (categoryIds: number[], tagIds: number[]) => {
        if (!editingArticle) return;
        try {
            const response = await fetch(`/api/articles/${editingArticle.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteId: editingArticle.site_id,
                    categoryIds,
                    tagIds,
                }),
            });
            const result = await response.json();
            if (result.success) {
                toast.success(`Published! ${result.wpUrl || ''}`);
                setEditingArticle(null);
                queryClient.invalidateQueries({ queryKey: ['articles'] });
            } else {
                toast.error(result.message || 'Failed to publish');
            }
        } catch (error) {
            toast.error(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleCreateArticle = async () => {
        if (!newArticleSiteId || !newArticleTitle.trim()) {
            toast.warning('Please select a site and enter a title');
            return;
        }
        setIsCreating(true);
        try {
            const newArticle = await createArticle.mutateAsync({
                site_id: newArticleSiteId,
                keyword: newArticleKeyword.trim() || undefined,
                title: newArticleTitle.trim(),
            });
            toast.success('Post created! Opening editor...');
            setShowNewArticleDialog(false);
            setNewArticleSiteId('');
            setNewArticleKeyword('');
            setNewArticleTitle('');
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            // Open editor for the newly created article
            setEditingArticle(newArticle);
        } catch (error) {
            toast.error(`Failed to create article: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#F5F6F8] relative font-sans">
            <PageHeader title="Content" onBack={onBack} />

            <div className="flex-1 overflow-y-auto px-8 pb-32">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 flex items-center gap-1.5">
                                <Filter size={14} />
                                Filter
                            </button>
                            <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 flex items-center gap-1.5">
                                <ArrowUpDown size={14} />
                                Sort
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search posts..."
                                    className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
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
                                Bulk Actions for {selectedIds.size} selected articles:
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
                                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                <RefreshCcw size={12} />
                                                Change Status
                                                <ChevronDown size={12} />
                                            </button>
                                            {showStatusDropdown && (
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

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-4 pl-6 pr-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded-md border-gray-300"
                                            checked={filteredArticles.length > 0 && selectedIds.size === filteredArticles.length}
                                            ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredArticles.length; }}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Title</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Site</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Keyword</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">SEO Score</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Words</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider text-center">Status</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                Loading articles...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredArticles.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                            <div className="text-center space-y-3">
                                                <FileText size={32} className="text-gray-300 mx-auto" />
                                                <div>
                                                    <p className="font-medium">{searchQuery ? 'No posts match your search' : 'No posts yet'}</p>
                                                    <p className="text-xs mt-1">{searchQuery ? 'Try a different search term' : 'Click "New Post" to create your first post'}</p>
                                                </div>
                                                {!searchQuery && (
                                                    <button
                                                        onClick={() => setShowNewArticleDialog(true)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all mt-2"
                                                    >
                                                        <Plus size={14} />
                                                        Create Post
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredArticles.map((article: any) => (
                                        <tr key={article.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="py-4 pl-6 pr-4 align-middle">
                                                <input
                                                    type="checkbox"
                                                    className="rounded-md border-gray-300"
                                                    checked={selectedIds.has(article.id)}
                                                    onChange={() => toggleSelect(article.id)}
                                                />
                                            </td>
                                            <td className="py-4 px-4 align-middle">
                                                <div
                                                    className="cursor-pointer"
                                                    onClick={() => handleEditArticle(article)}
                                                >
                                                    <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{article.title || 'Untitled'}</div>
                                                    {article.seo_title && article.seo_title !== article.title && (
                                                        <div className="text-xs text-gray-500 mt-1">SEO: {article.seo_title}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 align-middle">
                                                {article.sites ? (
                                                    <div className="flex items-center gap-2">
                                                        {article.sites.favicon && (
                                                            <img src={article.sites.favicon} alt="" className="w-4 h-4 rounded" />
                                                        )}
                                                        <span className="text-xs font-medium text-gray-600">{article.sites.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 align-middle">
                                                {article.keyword ? (
                                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                                        <Tag size={12} />
                                                        {article.keyword}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 align-middle">
                                                {article.seo_score || article.preliminary_seo_score ? (
                                                    <div className="flex items-center gap-2">
                                                        <SEOScoreIndicator
                                                            score={article.seo_score || article.preliminary_seo_score || 0}
                                                            size="sm"
                                                        />
                                                        {article.seo_score && article.preliminary_seo_score && (
                                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                {article.seo_score > article.preliminary_seo_score ? (
                                                                    <TrendingUp size={12} className="text-emerald-600" />
                                                                ) : article.seo_score < article.preliminary_seo_score ? (
                                                                    <TrendingDown size={12} className="text-rose-600" />
                                                                ) : null}
                                                                <span>{article.preliminary_seo_score} &rarr; {article.seo_score}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Not analyzed</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 align-middle text-gray-500 text-xs">
                                                {article.word_count ? `${article.word_count.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="py-4 px-4 align-middle text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                    article.status === 'published'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        : article.status === 'reviewed'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                        : 'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        article.status === 'published' ? 'bg-emerald-500' :
                                                        article.status === 'reviewed' ? 'bg-amber-500' : 'bg-gray-400'
                                                    }`}></span>
                                                    {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 align-middle text-right pr-6">
                                                {article.status === 'published' && article.wp_post_id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                                                            <CheckCircle2 size={14} /> Published
                                                        </span>
                                                        {nanaBananaEnabled && (
                                                            <button
                                                                onClick={async () => {
                                                                    setGeneratingCoverId(article.id);
                                                                    try {
                                                                        const res = await fetch('/api/nana-banana/pipeline', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ site_id: article.site_id, post_id: article.id }),
                                                                        });
                                                                        const data = await res.json();
                                                                        if (!res.ok) throw new Error(data.error || 'Pipeline failed');
                                                                        toast.success('Cover generated!');
                                                                        queryClient.invalidateQueries({ queryKey: ['articles'] });
                                                                    } catch (err) {
                                                                        toast.error(`Cover failed: ${err instanceof Error ? err.message : 'Unknown'}`);
                                                                    } finally {
                                                                        setGeneratingCoverId(null);
                                                                    }
                                                                }}
                                                                disabled={generatingCoverId === article.id}
                                                                className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors disabled:opacity-50"
                                                                title="Generate Cover"
                                                            >
                                                                {generatingCoverId === article.id ? (
                                                                    <Loader2 size={16} className="animate-spin" />
                                                                ) : (
                                                                    <Wand2 size={16} />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditArticle(article)}
                                                            className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAnalyzeInline(article)}
                                                            disabled={analyzingArticleId === article.id}
                                                            className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-600 transition-colors disabled:opacity-50"
                                                            title="Analyze SEO"
                                                        >
                                                            {analyzingArticleId === article.id ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <Eye size={16} />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handlePublishInline(article)}
                                                            disabled={publishingArticleId === article.id}
                                                            className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all disabled:opacity-50"
                                                        >
                                                            {publishingArticleId === article.id ? 'Publishing...' : 'Publish'}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <FloatingSearchBar placeholder="Search or create new content..." />

            {/* New Post Dialog */}
            {showNewArticleDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">New Post</h3>
                            <button onClick={() => setShowNewArticleDialog(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                                <select
                                    value={newArticleSiteId}
                                    onChange={(e) => setNewArticleSiteId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                >
                                    <option value="">Select a site...</option>
                                    {sites.map((site: any) => (
                                        <option key={site.id} value={site.id}>{site.name} ({site.url})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newArticleTitle}
                                    onChange={(e) => setNewArticleTitle(e.target.value)}
                                    placeholder="Post title..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                                onClick={handleCreateArticle}
                                disabled={isCreating || !newArticleSiteId || !newArticleTitle.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isCreating ? (
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
                        setEditingArticle(null);
                        queryClient.invalidateQueries({ queryKey: ['articles'] });
                    }}
                    onSave={handleSaveArticle}
                    onPublish={handlePublishFromEditor}
                    onAnalyze={handleAnalyzeArticle}
                    isNanaBananaEnabled={nanaBananaEnabled}
                />
            )}
        </div>
    );
};

// --- 4.0 Finished Articles View ---
export const FinishedArticlesView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { data: allArticles = [], isLoading } = useAllArticles();
    const publishedArticles = allArticles.filter((a: any) => a.status === 'published');
    const [viewingArticle, setViewingArticle] = useState<any>(null);
    const toast = useToast();

    const handleSaveArticle = async (updates: any) => {
        if (!viewingArticle) return;
        try {
            const response = await fetch(`/api/articles/${viewingArticle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const result = await response.json();
            if (result.success && result.article) {
                toast.success('Article updated!');
                setViewingArticle({ ...viewingArticle, ...updates });
            } else {
                const errMsg = result.error || 'Failed to save';
                toast.error(errMsg);
                throw new Error(errMsg);
            }
        } catch (error) {
            if (!(error instanceof Error && error.message.includes('Failed'))) {
                toast.error('Save failed');
            }
            throw error;
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#F5F6F8] relative font-sans">
            <PageHeader title="Published Articles" onBack={onBack} />

            <div className="flex-1 overflow-y-auto px-8 pb-32">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="ml-3 text-gray-500">Loading published articles...</span>
                    </div>
                ) : publishedArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
                        <FileText size={40} className="text-gray-300 mb-4" />
                        <p className="font-medium text-gray-700">No published articles yet</p>
                        <p className="text-sm text-gray-500 mt-1">Published articles will appear here</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {publishedArticles.map((article: any) => (
                            <div
                                key={article.id}
                                onClick={() => setViewingArticle(article)}
                                className="bg-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-100 group transition-all duration-300 flex flex-col cursor-pointer"
                            >
                                <div className="h-36 overflow-hidden relative bg-gradient-to-br from-indigo-500 to-purple-600">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80"></div>

                                    <div className="absolute top-4 left-4 flex items-center gap-2">
                                        {article.seo_score && (
                                            <span className="bg-white/20 backdrop-blur-md text-white border border-white/20 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm">
                                                SEO: {article.seo_score}/100
                                            </span>
                                        )}
                                    </div>

                                    <div className="absolute bottom-4 left-4 right-4">
                                        <h3 className="font-bold text-white leading-tight line-clamp-2 text-base drop-shadow-sm">{article.title}</h3>
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                                    <div className="flex flex-col gap-1 mb-3">
                                        {article.keyword && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Tag size={12} />
                                                <span className="font-semibold">{article.keyword}</span>
                                            </div>
                                        )}
                                        {article.sites && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                                                <Globe size={12} />
                                                <span>{article.sites.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                        <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            {article.published_at ? new Date(article.published_at).toLocaleDateString() : '-'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-100">
                                            <CheckCircle2 size={12} />
                                            Live
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <FloatingSearchBar placeholder="Search published content..." />

            {/* Article Viewer/Editor for published articles */}
            {viewingArticle && (
                <ArticleEditor
                    article={viewingArticle}
                    onClose={() => setViewingArticle(null)}
                    onSave={handleSaveArticle}
                    onPublish={async () => {}}
                    onAnalyze={async () => null}
                />
            )}
        </div>
    );
}

// --- 5.1 LLM Tracker View ---
export const LLMTrackerView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const getPill = (status: 'positive' | 'negative' | 'neutral') => {
        if (status === 'positive') return <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-100">Positive</span>
        if (status === 'negative') return <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-lg text-xs font-bold border border-rose-100">Negative</span>
        return <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold border border-gray-100">Neutral</span>
    };

    return (
        <div className="h-full flex flex-col bg-[#F5F6F8] relative font-sans">
            <PageHeader title="LLM Search Result Tracker" onBack={onBack} />

            <div className="flex-1 overflow-y-auto px-8 pb-32">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="py-5 pl-8 pr-4 px-6 text-xs font-bold text-gray-900 uppercase tracking-wider">Query</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider w-48">Visibility Score</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Check</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">ChatGPT</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Claude</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Gemini</th>
                                <th className="py-5 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider pr-8">Perplexity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {MOCK_LLM_RESULTS.map(res => (
                                <tr key={res.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="py-4 pl-8 pr-4 align-middle font-bold text-gray-900 group-hover:text-indigo-600 cursor-pointer">{res.query}</td>
                                    <td className="py-4 px-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-700 w-8 text-right text-sm">{res.score}%</span>
                                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-24">
                                                <div 
                                                    className={`h-1.5 rounded-full ${res.score > 80 ? 'bg-emerald-500' : res.score > 40 ? 'bg-amber-400' : 'bg-rose-400'}`} 
                                                    style={{ width: `${res.score}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 align-middle text-gray-400 font-medium text-xs">{res.lastCheck}</td>
                                    <td className="py-4 px-4 align-middle">{getPill(res.platforms.chatgpt)}</td>
                                    <td className="py-4 px-4 align-middle">{getPill(res.platforms.claude)}</td>
                                    <td className="py-4 px-4 align-middle">{getPill(res.platforms.gemini)}</td>
                                    <td className="py-4 px-4 align-middle pr-8">{getPill(res.platforms.perplexity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <FloatingSearchBar placeholder="Track new queries..." />
        </div>
    );
};