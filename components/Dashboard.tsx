import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Site, UserRole, SiteStatus } from '../types';
import { getRouteForView } from '@/lib/utils/routes';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  PlusCircle, FileText, CheckCircle, Sparkles, Activity, AlertCircle, Search,
  TrendingUp, Settings, ExternalLink, Calendar, Wifi, WifiOff,
  RefreshCw, Loader2, Globe, BarChart3, Image as ImageIcon, BookOpen, Users, Bot,
  Database, Wand2, Timer, Rss, Send, Palette, Swords, GripVertical, Microscope, Rocket,
  Magnet, FlaskConical, GitBranch, LayoutDashboard
} from 'lucide-react';
import { THEMES, THEME_COLORS } from '../constants';
import AddSiteModal from './AddSiteModal';
import DeploymentTeaser from './DeploymentTeaser';
import { useAllStats } from '@/hooks/useStats';
import { useUpdateSite } from '@/hooks/useSites';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/contexts/ToastContext';
import { useCore } from '@/lib/contexts/CoreContext';
import { recordModuleVisit, getModuleVisitCounts } from '@/lib/utils/module-visits';
import type { ModuleId } from '@/lib/core/events';
import { useRankPulseSummary } from '@/hooks/useRankPulse';

interface DashboardProps {
  sites: Site[];
  isLoading?: boolean;
  error?: Error | null;
  onGeneratePost?: (site: Site) => void;
  userRole: UserRole;
  onDeleteSite: (siteId: string) => void;
  onSelectSite: (site: Site) => void;
}

// WordPress Icon Component (white for light theme, dark for future dark theme)
const WordpressIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <img
      src="/icons/wordpress-light.svg"
      alt="WordPress"
      width={size}
      height={size}
      className={className}
    />
);

// Skeleton Card Component
const SkeletonCard = () => (
    <div className="group relative bg-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-white/60 flex flex-col h-[280px] animate-pulse">
        {/* Cover Area Skeleton */}
        <div className="relative h-[200px] w-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent shimmer"></div>
        </div>

        {/* Body Skeleton */}
        <div className="flex-1 p-6 bg-white flex flex-col justify-end">
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="space-y-1">
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="space-y-1">
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        </div>
    </div>
);

// Module metadata for Quick Access navigation
const MODULE_NAV: { id: string; name: string; icon: React.ReactNode; iconBg: string; viewState: string }[] = [
  { id: 'rankmath-bridge', name: 'RankMath Bridge', icon: <Globe size={18} />, iconBg: 'bg-blue-50 text-blue-600', viewState: 'bulk-metadata' },
  { id: 'rank-pulse', name: 'Rank Pulse', icon: <BarChart3 size={18} />, iconBg: 'bg-orange-50 text-orange-600', viewState: 'rank-pulse' },
  { id: 'gsc-insights', name: 'GSC Insights', icon: <Search size={18} />, iconBg: 'bg-purple-50 text-purple-600', viewState: 'gsc-insights' },
  { id: 'nana-banana', name: 'Nana Banana', icon: <ImageIcon size={18} />, iconBg: 'bg-yellow-50 text-yellow-600', viewState: 'nana-banana' },
  { id: 'recipes', name: 'Recipes', icon: <BookOpen size={18} />, iconBg: 'bg-violet-50 text-violet-600', viewState: 'recipes' },
  { id: 'personas', name: 'Personas', icon: <Users size={18} />, iconBg: 'bg-gray-50 text-gray-600', viewState: 'authors' },
  { id: 'llm-tracker', name: 'LLM Tracker', icon: <Bot size={18} />, iconBg: 'bg-cyan-50 text-cyan-600', viewState: 'llm-tracker' },
  { id: 'keyword-research', name: 'Keyword Research', icon: <Database size={18} />, iconBg: 'bg-emerald-50 text-emerald-600', viewState: 'keywords-db' },
  { id: 'keyword-magic', name: 'Keyword Magic', icon: <Wand2 size={18} />, iconBg: 'bg-pink-50 text-pink-600', viewState: 'keywords-main' },
  { id: 'docs', name: 'Documentation', icon: <FileText size={18} />, iconBg: 'bg-slate-50 text-slate-600', viewState: 'docs' },
  { id: 'cron', name: 'Cron Scheduler', icon: <Timer size={18} />, iconBg: 'bg-violet-50 text-violet-600', viewState: 'cron-jobs' },
  { id: 'content-engine', name: 'Content Engine', icon: <Rss size={18} />, iconBg: 'bg-rose-50 text-rose-600', viewState: 'content-engine' },
  { id: 'telegraph', name: 'Telegraph', icon: <Send size={18} />, iconBg: 'bg-sky-50 text-sky-600', viewState: 'telegraph' },
  { id: 'competitor-analysis', name: 'Competitor Insight', icon: <Swords size={18} />, iconBg: 'bg-red-50 text-red-600', viewState: 'competitor-analysis' },
  { id: 'competitor-anatomy', name: 'Competitor Anatomy', icon: <Microscope size={18} />, iconBg: 'bg-violet-50 text-violet-600', viewState: 'competitor-anatomy' },
  { id: 'lead-factory', name: 'Lead Factory', icon: <Magnet size={18} />, iconBg: 'bg-rose-50 text-rose-600', viewState: 'lead-factory' },
  { id: 'conversion-lab', name: 'Conversion Lab', icon: <FlaskConical size={18} />, iconBg: 'bg-fuchsia-50 text-fuchsia-600', viewState: 'conversion-lab' },
  { id: 'landing-engine', name: 'Landing Engine', icon: <Rocket size={18} />, iconBg: 'bg-indigo-50 text-indigo-600', viewState: 'landing-engine' },
  { id: 'funnel-builder', name: 'Funnel Builder', icon: <GitBranch size={18} />, iconBg: 'bg-violet-50 text-violet-600', viewState: 'funnel-builder' },
  { id: 'metrico', name: 'Metrico', icon: <LayoutDashboard size={18} />, iconBg: 'bg-indigo-50 text-indigo-600', viewState: 'metrico' },
];

// Helper: check if a site has CMS credentials
function isSiteConnected(site: Site): boolean {
  return !!(site.wp_username && site.wp_app_password);
}

const Dashboard: React.FC<DashboardProps> = ({ sites, isLoading, error, onGeneratePost, userRole, onDeleteSite, onSelectSite }) => {
  const router = useRouter();
  const { userProfile } = useAuth();
  // Show button while profile loads (optimistic), hide only for confirmed 'user' role
  const canAddProperty = !userProfile || userRole !== 'user';
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [showDeployTeaser, setShowDeployTeaser] = useState(false);
  const [syncingSiteId, setSyncingSiteId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<'all' | 'connected' | 'not-connected'>('all');
  const [themePickerSiteId, setThemePickerSiteId] = useState<string | null>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const updateSite = useUpdateSite();
  const queryClient = useQueryClient();

  // Drag-n-drop reordering state
  const [draggedSiteId, setDraggedSiteId] = useState<string | null>(null);
  const [ownSiteOrder, setOwnSiteOrder] = useState<string[] | null>(null);
  const [competitorOrder, setCompetitorOrder] = useState<string[] | null>(null);

  const persistSiteOrder = useCallback(async (orderedIds: string[]) => {
    try {
      await fetch('/api/sites/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    } catch {
      // silent
    }
  }, [queryClient]);

  const handleSiteDragStart = (siteId: string, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedSiteId(siteId);
  };

  const handleSiteDragOver = (e: React.DragEvent, targetId: string, listType: 'own' | 'competitor') => {
    e.preventDefault();
    if (!draggedSiteId || draggedSiteId === targetId) return;

    const setOrder = listType === 'own' ? setOwnSiteOrder : setCompetitorOrder;
    const sourceList = listType === 'own' ? displaySites : competitorSites;
    const currentOrderState = listType === 'own' ? ownSiteOrder : competitorOrder;
    const ids = currentOrderState || sourceList.map(s => s.id);

    const dragIdx = ids.indexOf(draggedSiteId);
    const targetIdx = ids.indexOf(targetId);
    if (dragIdx === -1 || targetIdx === -1) return;

    const newOrder = [...ids];
    newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, draggedSiteId);
    setOrder(newOrder);
  };

  const handleSiteDragEnd = (listType: 'own' | 'competitor') => {
    const order = listType === 'own' ? ownSiteOrder : competitorOrder;
    if (order) {
      persistSiteOrder(order);
    }
    setDraggedSiteId(null);
  };

  // Close theme picker on outside click
  useEffect(() => {
    if (!themePickerSiteId) return;
    const handleClick = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setThemePickerSiteId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [themePickerSiteId]);

  // Enabled modules for Quick Access, sorted by visit frequency
  const { enabledModules } = useCore();
  const activeModules = React.useMemo(() => {
    const base = enabledModules.size > 0
      ? MODULE_NAV.filter(m => enabledModules.has(m.id))
      : MODULE_NAV;
    const counts = getModuleVisitCounts();
    return [...base].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  }, [enabledModules]);

  // Fetch real statistics for all sites
  const { data: statsMap = {} } = useAllStats();

  // Rank Pulse summary (only when module is enabled)
  const rankPulseEnabled = enabledModules.has('rank-pulse');
  const { data: rankPulseSummary } = useRankPulseSummary(rankPulseEnabled);

  const handleSyncSite = async (site: Site, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingSiteId(site.id);
    try {
      const response = await fetch(`/api/sites/${site.id}/sync`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        toast.success(`${site.name}: synced ${result.postsSynced} posts`);
      } else {
        toast.error(`${site.name}: ${result.message}`);
      }
    } catch (err) {
      toast.error(`Sync failed for ${site.name}`);
    } finally {
      setSyncingSiteId(null);
    }
  };

  // Debug: log sites data to see wp_username and wp_app_password
  React.useEffect(() => {
    if (sites.length > 0) {
      console.log('Dashboard sites data:', sites.map(s => ({
        id: s.id,
        name: s.name,
        wp_username: s.wp_username,
        wp_app_password: s.wp_app_password ? '***' : null
      })));
    }
  }, [sites]);

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ownSites = filteredSites.filter(s => !s.is_competitor);
  const competitorSites = filteredSites.filter(s => s.is_competitor);
  const connectedSites = ownSites.filter(isSiteConnected);
  const notConnectedSites = ownSites.filter(s => !isSiteConnected(s));
  const rawDisplaySites = projectFilter === 'all'
    ? ownSites
    : projectFilter === 'connected'
      ? connectedSites
      : notConnectedSites;

  // Apply local drag order
  const displaySites = ownSiteOrder
    ? rawDisplaySites.slice().sort((a, b) => {
        const ai = ownSiteOrder.indexOf(a.id);
        const bi = ownSiteOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : rawDisplaySites;

  const orderedCompetitors = competitorOrder
    ? competitorSites.slice().sort((a, b) => {
        const ai = competitorOrder.indexOf(a.id);
        const bi = competitorOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : competitorSites;

  // Clear local order when sites data refreshes from server
  useEffect(() => {
    setOwnSiteOrder(null);
    setCompetitorOrder(null);
  }, [sites]);

  return (
    <div className="p-6 md:p-10 h-full overflow-y-auto bg-[#F5F5F7]">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
              <div className="relative hidden md:block group">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm w-64 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all shadow-sm hover:shadow-md"
                   />
              </div>
               {canAddProperty && (
                <button
                  onClick={() => setIsAddSiteModalOpen(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gray-900 text-white rounded-2xl text-sm font-semibold hover:bg-black hover:scale-105 transition-all shadow-xl shadow-gray-200 active:scale-95"
                >
                    <PlusCircle size={18} />
                    <span>New Project</span>
                </button>
            )}
          </div>
      </div>

      {/* Project Filter Tabs — responsive: pills on mobile, tabs on desktop */}
      <div className="flex items-center gap-2 md:gap-4 mb-6 px-1 overflow-x-auto scrollbar-none">
        {([
          { key: 'all' as const, label: 'All Projects', count: ownSites.length },
          { key: 'connected' as const, label: 'Connected', count: connectedSites.length },
          { key: 'not-connected' as const, label: 'Not Connected', count: notConnectedSites.length },
        ]).map((tab, i) => (
          <React.Fragment key={tab.key}>
            {i > 0 && <div className="hidden md:block w-px h-6 bg-gray-200 flex-shrink-0" />}
            <button
              onClick={() => setProjectFilter(tab.key)}
              className={`whitespace-nowrap flex-shrink-0 transition-colors
                text-sm md:text-xl font-bold tracking-tight
                md:bg-transparent md:px-0 md:py-0 md:rounded-none
                px-3 py-1.5 rounded-full
                ${projectFilter === tab.key
                  ? 'text-gray-900 bg-gray-100 md:bg-transparent'
                  : 'text-gray-300 hover:text-gray-500 bg-transparent'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Grid of 3D Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {error ? (
          // Show error state
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to load sites</h3>
            <p className="text-gray-500 max-w-md mb-4">{error.message || 'An error occurred while loading your sites. Please check your connection and try again.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md"
            >
              Reload Page
            </button>
          </div>
        ) : isLoading ? (
          // Show skeleton cards while loading
          <>
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : displaySites.length === 0 ? (
          // Empty state — context-sensitive based on active tab
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <PlusCircle size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {projectFilter === 'connected' ? 'No connected sites'
                : projectFilter === 'not-connected' ? 'All sites are connected'
                : 'No projects yet'}
            </h3>
            <p className="text-gray-500 max-w-md">
              {projectFilter === 'connected' ? 'Add CMS credentials in Site Settings to connect a site.'
                : projectFilter === 'not-connected' ? 'All your sites have CMS credentials configured.'
                : 'Add your first site to start tracking and generating content.'}
            </p>
          </div>
        ) : (
          // Show actual sites with fade-in animation
          displaySites.map((site, index) => {
            const themeStyle = THEMES[site.theme || 'hyper-blue'];
            const isLightCover = site.theme === 'cotton-candy';
            const textColor = isLightCover ? 'text-gray-900' : 'text-white';
            const subTextColor = isLightCover ? 'text-gray-500' : 'text-white/70';

            // Get real stats for this site
            const siteStats = statsMap[site.id] || {
              live: 0,
              drafts: 0,
              queued: 0,
              articles: 0,
              notFoundCount: site.metrics?.notFoundCount || 0,
            };

            return (
                <div
                    key={site.id}
                    draggable
                    onDragStart={(e) => handleSiteDragStart(site.id, e)}
                    onDragOver={(e) => handleSiteDragOver(e, site.id, 'own')}
                    onDragEnd={() => handleSiteDragEnd('own')}
                    onClick={() => onSelectSite(site)}
                    className={`group relative bg-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 cursor-pointer overflow-hidden border border-white/60 flex flex-col h-[280px] animate-fade-in ${draggedSiteId === site.id ? 'opacity-50 scale-95' : ''}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    {/* 3D Cover Area */}
                    <div 
                        className="relative h-[200px] w-full p-6 flex flex-col justify-between transition-transform duration-700 group-hover:scale-[1.02]"
                        style={themeStyle}
                    >   
                        {/* Mesh Overlay for Texture */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>
                        
                        <div className="relative z-10 flex justify-between items-start">
                            {/* Connection Status & Sync */}
                            <div className="flex gap-2">
                                {/* WordPress Connection Status */}
                                {site.wp_username && site.wp_app_password ? (
                                    <div
                                        className="w-8 h-8 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 flex items-center justify-center"
                                        title="WordPress Connected"
                                    >
                                        <Wifi size={14} className="text-emerald-300" />
                                    </div>
                                ) : (
                                    <div
                                        className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center"
                                        title="WordPress Not Connected"
                                    >
                                        <WifiOff size={14} className="text-white/40" />
                                    </div>
                                )}

                                {/* Sync Button - Only visible when connected */}
                                {site.wp_username && site.wp_app_password && (
                                    <button
                                        onClick={(e) => handleSyncSite(site, e)}
                                        disabled={syncingSiteId === site.id}
                                        className={`w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/30 transition-all hover:text-white disabled:opacity-50 ${
                                            syncingSiteId === site.id ? '' : 'hover:rotate-180'
                                        }`}
                                        title="Sync Posts from WordPress"
                                    >
                                        {syncingSiteId === site.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <RefreshCw size={14} />
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Admin Links */}
                            <div className="flex gap-2 relative">
                                <a
                                    href={`https://${site.url}/wp-admin`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors hover:text-white"
                                    title="WordPress Admin"
                                >
                                    <WordpressIcon size={14} />
                                </a>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setThemePickerSiteId(themePickerSiteId === site.id ? null : site.id);
                                    }}
                                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors hover:text-white"
                                    title="Change Theme"
                                >
                                    <Palette size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectSite(site);
                                    }}
                                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors hover:text-white"
                                    title="Settings"
                                >
                                    <Settings size={14} />
                                </button>

                                {/* Theme Picker Popover */}
                                {themePickerSiteId === site.id && (
                                    <div
                                        ref={themePickerRef}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-10 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-20 animate-[fadeIn_150ms_ease-out]"
                                    >
                                        <div className="flex gap-2">
                                            {Object.entries(THEME_COLORS).map(([key, colors]) => (
                                                <button
                                                    key={key}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateSite.mutate({ siteId: site.id, updates: { theme: key } });
                                                        setThemePickerSiteId(null);
                                                    }}
                                                    className={`w-8 h-8 rounded-lg transition-all ${
                                                        site.theme === key
                                                            ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110'
                                                            : 'hover:scale-110'
                                                    }`}
                                                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                                                    title={key}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative z-10 mt-auto">
                            <a href={`https://${site.url}`} target="_blank" rel="noreferrer" className={`text-base font-bold ${textColor} hover:opacity-80 flex items-center gap-1 tracking-tight truncate`} onClick={e => e.stopPropagation()}>
                                {site.url} <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>

                    {/* Stats Body */}
                    <div className="flex-1 p-6 bg-white flex flex-col justify-end">
                        {/* Bottom Metric Grid */}
                        <div className="grid grid-cols-3 gap-3">
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Live</span>
                                 <div className="flex items-center gap-2">
                                     <span className="text-sm font-bold text-gray-900">{siteStats.live}</span>
                                     <CheckCircle size={14} className="text-emerald-500" />
                                 </div>
                             </div>
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Drafts</span>
                                 <div className="flex items-center gap-2">
                                     <span className="text-sm font-bold text-gray-900">{siteStats.drafts}</span>
                                     <FileText size={14} className="text-gray-400" />
                                 </div>
                             </div>
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">404s</span>
                                 <div className="flex items-center gap-2">
                                     <span className="text-sm font-bold text-gray-900">{siteStats.notFoundCount}</span>
                                     <AlertCircle size={14} className="text-amber-500" />
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            );
          })
        )}

        {/* Add New Card (Empty State) */}
        {!isLoading && canAddProperty && (
            <button
              onClick={() => setIsAddSiteModalOpen(true)}
              className="group relative rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-white dark:hover:bg-gray-800 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center h-[280px] cursor-pointer"
            >
                <div className="w-16 h-16 rounded-3xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md">
                    <PlusCircle size={32} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Add New Project</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-[200px] text-center">Connect a new domain to start tracking and generating content.</p>
            </button>
        )}

        {/* Deploy New Site (Coming Soon) */}
        {!isLoading && (
            <button
              onClick={() => setShowDeployTeaser(true)}
              className="group relative rounded-[2rem] border-2 border-dashed border-indigo-200 bg-indigo-50/30 hover:bg-white hover:border-indigo-400 hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center h-[280px] cursor-pointer"
            >
                <span className="absolute top-4 right-4 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-full">COMING SOON</span>
                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md">
                    <Rocket size={32} className="text-indigo-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Deploy New Site</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-[200px] text-center">Launch WordPress or custom SEO CMS sites from SEO OS.</p>
            </button>
        )}
      </div>

      {/* Rank Pulse Summary */}
      {rankPulseEnabled && rankPulseSummary && rankPulseSummary.total > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Rank Pulse</h2>
            </div>
            <button
              onClick={() => router.push(getRouteForView('rank-pulse'))}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View Details
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Keywords Tracked</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{rankPulseSummary.total}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Position</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{rankPulseSummary.avgPosition || '—'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Improved</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <TrendingUp size={18} />
                {rankPulseSummary.improved}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Dropped</p>
              <p className="text-2xl font-bold text-red-500 mt-1 flex items-center gap-1">
                <TrendingUp size={18} className="rotate-180" />
                {rankPulseSummary.dropped}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Competitors Section */}
      {competitorSites.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Swords size={20} className="text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Competitors</h2>
            <span className="text-sm text-gray-400 font-medium">({competitorSites.length})</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {orderedCompetitors.map((site, idx) => {
              const favicon = site.favicon || `https://www.google.com/s2/favicons?domain=${site.url}&sz=64`;
              return (
                <div
                  key={site.id}
                  draggable
                  onDragStart={(e) => handleSiteDragStart(site.id, e)}
                  onDragOver={(e) => handleSiteDragOver(e, site.id, 'competitor')}
                  onDragEnd={() => handleSiteDragEnd('competitor')}
                  onClick={() => onSelectSite(site)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group cursor-pointer ${idx > 0 ? 'border-t border-gray-100' : ''} ${draggedSiteId === site.id ? 'opacity-50 bg-indigo-50' : ''}`}
                >
                  <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0 cursor-grab" />
                  <img src={favicon} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{site.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{site.url}</span>
                  </div>
                  <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Access — activated modules, sorted by visit frequency */}
      {activeModules.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4 px-1 tracking-tight">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {activeModules.map(mod => (
              <button
                key={mod.id}
                onClick={() => { recordModuleVisit(mod.id); router.push(getRouteForView(mod.viewState)); }}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group"
              >
                <div className={`w-6 h-6 rounded-lg ${mod.iconBg} flex items-center justify-center flex-shrink-0`}>
                  {mod.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 truncate">{mod.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Site Modal */}
      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
      />

      {/* Deployment Teaser Modal */}
      {showDeployTeaser && (
        <DeploymentTeaser onClose={() => setShowDeployTeaser(false)} />
      )}
    </div>
  );
};

export default Dashboard;