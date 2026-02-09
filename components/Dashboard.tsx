import React, { useState } from 'react';
import { Site, UserRole, SiteStatus } from '../types';
import { PlusCircle, FileText, CheckCircle, Sparkles, Activity, AlertCircle, Search, TrendingUp, Settings, ExternalLink, Calendar, Monitor, Smartphone, Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { THEMES } from '../constants';
import AddSiteModal from './AddSiteModal';
import { useAllStats } from '@/hooks/useStats';
import { useToast } from '@/lib/contexts/ToastContext';

interface DashboardProps {
  sites: Site[];
  isLoading?: boolean;
  error?: Error | null;
  onGeneratePost: (site: Site) => void;
  userRole: UserRole;
  onDeleteSite: (siteId: string) => void;
  onSelectSite: (site: Site) => void;
  onChangeView?: (view: any) => void;
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
    <div className="group relative bg-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-white/60 flex flex-col h-[380px] animate-pulse">
        {/* Cover Area Skeleton */}
        <div className="relative h-[200px] w-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent shimmer"></div>
        </div>

        {/* Body Skeleton */}
        <div className="flex-1 p-6 bg-white flex flex-col justify-between">
            <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded-lg w-3/4"></div>
                <div className="grid grid-cols-3 gap-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-1">
                            <div className="h-2 bg-gray-200 rounded w-1/2 mx-auto"></div>
                            <div className="h-6 bg-gray-200 rounded-lg"></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
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

const Dashboard: React.FC<DashboardProps> = ({ sites, isLoading, error, onGeneratePost, userRole, onDeleteSite, onSelectSite, onChangeView }) => {
  const canAddProperty = userRole === 'ADMIN' || userRole === 'EDITOR';
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [syncingSiteId, setSyncingSiteId] = useState<string | null>(null);
  const toast = useToast();

  // Fetch real statistics for all sites
  const { data: statsMap = {} } = useAllStats();

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


  return (
    <div className="p-6 md:p-10 h-full overflow-y-auto bg-[#F5F5F7]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-gray-500 text-sm font-medium">Overview of your portfolio performance.</p>
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

      <h2 className="text-xl font-bold text-gray-900 mb-6 px-1 tracking-tight">Active Projects</h2>

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
        ) : filteredSites.length === 0 && !canAddProperty ? (
          // Empty state when no sites and can't add
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <PlusCircle size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 max-w-md">Connect your first WordPress site to start tracking and generating content.</p>
          </div>
        ) : (
          // Show actual sites with fade-in animation
          filteredSites.map((site, index) => {
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
                    onClick={() => onSelectSite(site)}
                    className="group relative bg-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 cursor-pointer overflow-hidden border border-white/60 flex flex-col h-[380px] animate-fade-in"
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
                            <div className="flex gap-2">
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
                                        onSelectSite(site);
                                    }}
                                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors hover:text-white"
                                    title="Settings"
                                >
                                    <Settings size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="relative z-10 mt-auto">
                            <a href={`https://${site.url}`} target="_blank" rel="noreferrer" className={`text-base font-bold ${textColor} hover:opacity-80 flex items-center gap-1 tracking-tight truncate`} onClick={e => e.stopPropagation()}>
                                {site.url} <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>

                    {/* Stats Body */}
                    <div className="flex-1 p-6 bg-white flex flex-col justify-between">
                        {/* Keyword Rankings Distribution */}
                        <div className="mb-4">
                             <div className="flex justify-between items-center mb-3">
                                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Keywords in Google</span>
                                 <div className="flex gap-1">
                                     <button className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors">
                                         <Monitor size={12} />
                                     </button>
                                     <button className="w-6 h-6 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors">
                                         <Smartphone size={12} />
                                     </button>
                                 </div>
                             </div>

                             {/* Rankings Grid */}
                             <div className="grid grid-cols-3 gap-2">
                                 <div className="text-center">
                                     <div className="text-[10px] font-bold text-gray-400 mb-1">1</div>
                                     <div className="text-lg font-bold text-emerald-600">{site.metrics.rankDistribution.top1}</div>
                                 </div>
                                 <div className="text-center">
                                     <div className="text-[10px] font-bold text-gray-400 mb-1">2-3</div>
                                     <div className="text-lg font-bold text-emerald-500">{site.metrics.rankDistribution.top3 - site.metrics.rankDistribution.top1}</div>
                                 </div>
                                 <div className="text-center">
                                     <div className="text-[10px] font-bold text-gray-400 mb-1">4-5</div>
                                     <div className="text-lg font-bold text-gray-400">{site.metrics.rankDistribution.top5 - site.metrics.rankDistribution.top3}</div>
                                 </div>
                             </div>

                             <div className="grid grid-cols-3 gap-2 mt-2">
                                 <div className="text-center">
                                     <div className="text-[10px] font-bold text-gray-400 mb-1">6-10</div>
                                     <div className="text-lg font-bold text-gray-400">{site.metrics.rankDistribution.top10 - site.metrics.rankDistribution.top5}</div>
                                 </div>
                                 <div className="text-center">
                                     <div className="text-[10px] font-bold text-gray-400 mb-1">11-20</div>
                                     <div className="text-lg font-bold text-gray-400">{site.metrics.rankDistribution.top20 - site.metrics.rankDistribution.top10}</div>
                                 </div>
                                 <div className="text-center">
                                     <div className="text-[10px] font-bold text-gray-400 mb-1">21-100</div>
                                     <div className="text-lg font-bold text-gray-400">{site.metrics.rankDistribution.top100 - site.metrics.rankDistribution.top20}</div>
                                 </div>
                             </div>
                        </div>

                        {/* Bottom Metric Grid */}
                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
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

        {/* Calendar Card */}
        {!isLoading && (
        <button
            onClick={() => onChangeView && onChangeView('calendar')}
            className="group relative bg-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 cursor-pointer overflow-hidden border border-gray-200 flex flex-col h-[380px]"
        >
            {/* Gray Cover Area */}
            <div
                className="relative h-[200px] w-full p-6 flex flex-col justify-between transition-transform duration-700 group-hover:scale-[1.02] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100"
            >
                {/* Mesh Overlay for Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

                <div className="relative z-10 flex justify-center items-center h-full">
                    <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200 flex items-center justify-center shadow-lg">
                        <Calendar size={32} className="text-gray-600" />
                    </div>
                </div>
            </div>

            {/* Stats Body */}
            <div className="flex-1 p-6 bg-white flex flex-col justify-center items-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Calendar</h3>
                <p className="text-sm text-gray-500 text-center">View scheduled articles and plan your content strategy</p>
            </div>
        </button>
        )}

        {/* Add New Card (Empty State) */}
        {!isLoading && canAddProperty && (
            <button
              onClick={() => setIsAddSiteModalOpen(true)}
              className="group relative rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center h-[380px] cursor-pointer"
            >
                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md">
                    <PlusCircle size={32} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Add New Project</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-[200px] text-center">Connect a new domain to start tracking and generating content.</p>
            </button>
        )}
      </div>

      {/* Add Site Modal */}
      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;