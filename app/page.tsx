'use client';

import { useState, useEffect, useCallback } from 'react';
import Dashboard from '@/components/Dashboard';
import Sidebar from '@/components/Sidebar';
import SiteDetails from '@/components/SiteDetails';
import KeywordResearch from '@/components/KeywordResearch';
import AuthorRotator from '@/components/AuthorRotator';
import { MainKeywordsView, LLMTrackerView } from '@/components/SEOViews';
import AIGeneratorModal from '@/components/AIGeneratorModal';
import Marketplace from '@/components/modules/marketplace/Marketplace';
import KeyManagement from '@/components/modules/key-management/KeyManagement';
import EventLog from '@/components/modules/event-log/EventLog';
import SetupWizard from '@/components/modules/setup-wizard/SetupWizard';
import RankMathBridgeSettings from '@/components/modules/rankmath-bridge/RankMathBridgeSettings';
import RecipeList from '@/components/modules/recipes/RecipeList';
import RankPulseDashboard from '@/components/modules/rank-pulse/RankPulseDashboard';
import GSCDashboard from '@/components/modules/gsc-insights/GSCDashboard';
import NanaBananaDashboard from '@/components/modules/nana-banana/NanaBananaDashboard';
import DocumentationView from '@/components/modules/docs/DocumentationView';
import CronJobList from '@/components/modules/cron/CronJobList';
import ContentEngineDashboard from '@/components/modules/content-engine/ContentEngineDashboard';
import ContentLots from '@/components/modules/content-engine/ContentLots';
import TelegraphDashboard from '@/components/modules/telegraph/TelegraphDashboard';
import AccountSettings from '@/components/modules/settings/AccountSettings';
import CompetitorAnalysisDashboard from '@/components/modules/competitor-analysis/CompetitorAnalysisDashboard';
import CompetitorAnatomyDashboard from '@/components/modules/competitor-anatomy/CompetitorAnatomyDashboard';
import AIWriterDashboard from '@/components/modules/ai-writer/AIWriterDashboard';
import AnyChatDashboard from '@/components/modules/any-chat/AnyChatDashboard';
import TaskHistory from '@/components/TaskHistory';
import ContentCalendar from '@/components/ContentCalendar';
import { MOCK_SITES } from '@/constants';
import { ViewState, Site } from '@/types';
import { Menu, Search } from 'lucide-react';
import { useSites, useDeleteSite } from '@/hooks/useSites';
import { usePreferences } from '@/hooks/useEvents';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import LoginForm from '@/components/auth/LoginForm';
import AdminPanel from '@/components/modules/admin/AdminPanel';

// ====== View title map ======

const VIEW_TITLES: Partial<Record<ViewState, string>> = {
  calendar: 'Calendar',
  'keywords-main': 'Keyword Magic Tool',
  'llm-tracker': 'LLM Tracker',
  'keywords-db': 'Keyword Research',
  authors: 'Personas',
  marketplace: 'Marketplace',
  'key-management': 'API Keys',
  'event-log': 'Event Log',
  'rankmath-bridge': 'RankMath Bridge',
  'bulk-metadata': 'RankMath Bridge',
  recipes: 'Automations',
  brands: 'Settings',
  'rank-pulse': 'Rank Pulse',
  'gsc-insights': 'GSC Insights',
  'nana-banana': 'Nana Banana',
  'docs': 'Documentation',
  'cron-jobs': 'Cron Jobs',
  'content-engine': 'Content Engine',
  'content-lots': 'Content Lots',
  'telegraph': 'Telegraph',
  'competitor-analysis': 'Competitor Analysis',
  'competitor-anatomy': 'Competitor Anatomy',
  'ai-writer': 'AI Writer',
  'task-history': 'Task History',
  'admin': 'Admin Panel',
};

// ====== URL helpers ======

function getViewFromUrl(): { view: ViewState; siteId: string | null } {
  if (typeof window === 'undefined') return { view: 'dashboard', siteId: null };
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const siteId = params.get('siteId');
  if (view && view in VIEW_TITLES) return { view: view as ViewState, siteId };
  return { view: 'dashboard', siteId };
}

function setViewUrl(view: ViewState, siteId?: string) {
  if (typeof window === 'undefined') return;
  if (view === 'dashboard') {
    window.history.pushState({ view }, '', window.location.pathname);
  } else {
    const params = new URLSearchParams();
    params.set('view', view);
    if (siteId) params.set('siteId', siteId);
    window.history.pushState({ view, siteId }, '', `${window.location.pathname}?${params.toString()}`);
  }
}

export default function Home() {
  const { user, loading: authLoading, userRole } = useAuth();
  const [currentView, setCurrentViewState] = useState<ViewState>('dashboard');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [pendingSiteId, setPendingSiteId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);

  // Navigation with URL sync
  const changeView = useCallback((view: ViewState) => {
    if (view === 'admin' && userRole !== 'super_admin') return;
    setCurrentViewState(view);
    setViewUrl(view);
  }, [userRole]);

  // Read initial view from URL on client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const { view, siteId } = getViewFromUrl();
    if (view !== 'dashboard') {
      setCurrentViewState(view);
      // Restore selectedSite from URL param (e.g. returning from /editor)
      if (siteId && view === 'site-details') {
        // Will be resolved once sites load
        setPendingSiteId(siteId);
      }
    }
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const { view, siteId } = getViewFromUrl();
      setCurrentViewState(view);
      if (siteId && view === 'site-details') {
        setPendingSiteId(siteId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Guard: kick non-super_admin away from admin view
  useEffect(() => {
    if (currentView === 'admin' && userRole !== 'super_admin') {
      setCurrentViewState('dashboard');
      setViewUrl('dashboard');
    }
  }, [currentView, userRole]);

  // Listen for navigate-view custom events (from portalled components)
  useEffect(() => {
    const handler = (e: Event) => {
      const view = (e as CustomEvent).detail as ViewState;
      if (view) changeView(view);
    };
    window.addEventListener('navigate-view', handler);
    return () => window.removeEventListener('navigate-view', handler);
  }, [changeView]);

  // Fetch real data from Supabase (filtered by current workspace)
  const { currentWorkspaceId } = useWorkspace();
  const { data: sites = [], isLoading, error } = useSites(currentWorkspaceId || undefined);
  const { data: preferences } = usePreferences();
  const deleteSiteMutation = useDeleteSite();

  // Resolve pendingSiteId once sites are loaded
  useEffect(() => {
    if (pendingSiteId && sites.length > 0 && !selectedSite) {
      const found = sites.find(s => s.id === pendingSiteId);
      if (found) {
        setSelectedSite(found);
        setPendingSiteId(null);
      }
    }
  }, [pendingSiteId, sites, selectedSite]);

  if (error) {
    console.error('Error loading sites:', error);
  }

  const goBack = useCallback(() => changeView('dashboard'), [changeView]);

  const handleGeneratePost = (site: Site) => {
    setSelectedSite(site);
    setIsGeneratorOpen(true);
  };

  const handleDeleteSite = (siteId: string) => {
    if (userRole === 'user') return;
    if (window.confirm('Are you sure you want to delete this property? This action is irreversible.')) {
      deleteSiteMutation.mutate(siteId);
    }
  };

  const handleSelectSite = (site: Site) => {
    setSelectedSite(site);
    setCurrentViewState('site-details');
    setViewUrl('site-details', site.id);
  };

  const dashboardView = (
    <Dashboard
      sites={sites}
      isLoading={isLoading}
      error={error}
      onGeneratePost={handleGeneratePost}
      userRole={userRole}
      onDeleteSite={handleDeleteSite}
      onSelectSite={handleSelectSite}
      onChangeView={changeView}
    />
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return dashboardView;
      case 'site-details':
        if (!selectedSite) return dashboardView;
        return (
          <SiteDetails
            siteId={selectedSite.id}
            onBack={goBack}
          />
        );
      case 'calendar':
        return <ContentCalendar onBack={goBack} />;
      case 'keywords-main':
        return <MainKeywordsView onBack={goBack} />;
      case 'llm-tracker':
        return <LLMTrackerView onBack={goBack} />;
      case 'keywords-db':
        return <KeywordResearch userRole={userRole} onBack={goBack} />;
      case 'authors':
        return <AuthorRotator userRole={userRole} onBack={goBack} />;
      case 'marketplace':
        return <Marketplace onBack={goBack} onChangeView={changeView} />;
      case 'key-management':
        return <KeyManagement onBack={goBack} />;
      case 'event-log':
        return <EventLog onBack={goBack} />;
      case 'bulk-metadata':
      case 'rankmath-bridge':
        return <RankMathBridgeSettings onBack={goBack} />;
      case 'recipes':
        return <RecipeList onBack={goBack} />;
      case 'rank-pulse':
        return <RankPulseDashboard onBack={goBack} />;
      case 'gsc-insights':
        return <GSCDashboard onBack={goBack} />;
      case 'nana-banana':
        return <NanaBananaDashboard onBack={goBack} />;
      case 'docs':
        return <DocumentationView onBack={goBack} />;
      case 'cron-jobs':
        return <CronJobList onBack={goBack} />;
      case 'content-engine':
        return <ContentEngineDashboard onBack={goBack} />;
      case 'content-lots':
        return <ContentLots onBack={goBack} />;
      case 'telegraph':
        return <TelegraphDashboard onBack={goBack} />;
      case 'brands':
        return <AccountSettings onBack={goBack} onChangeView={changeView} />;
      case 'competitor-analysis':
        return <CompetitorAnalysisDashboard onBack={goBack} />;
      case 'competitor-anatomy':
        return <CompetitorAnatomyDashboard onBack={goBack} />;
      case 'ai-writer':
        return <AIWriterDashboard onBack={goBack} onChangeView={changeView} />;
      case 'any-chat':
        return <AnyChatDashboard onBack={goBack} sites={sites.map((s: any) => ({ id: s.id, name: s.name }))} />;
      case 'task-history':
        return <TaskHistory onBack={goBack} />;
      case 'admin':
        if (userRole !== 'super_admin') return dashboardView;
        return <AdminPanel onBack={goBack} onChangeView={changeView} />;
      default:
        return dashboardView;
    }
  };

  // Auth guard — show login when not authenticated
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen w-screen bg-white font-sans text-gray-900 overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-900">
      <Sidebar
        currentView={currentView}
        onChangeView={changeView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full md:mt-2 md:rounded-tl-[2rem] bg-[#F5F5F7]">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm flex-shrink-0 z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-lg text-gray-900 tracking-tight">SEO OS</span>
          </div>
          <button className="p-2 text-gray-500 bg-gray-100 rounded-full">
            <Search size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative h-full">
          {renderView()}
        </div>
      </main>

      <AIGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        site={selectedSite}
      />

      {/* Setup Wizard Overlay */}
      {preferences && !preferences.setup_completed && !setupDismissed && (
        <SetupWizard onComplete={() => setSetupDismissed(true)} />
      )}
    </div>
  );
}
