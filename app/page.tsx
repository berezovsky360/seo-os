'use client';

import { useState, useEffect, useCallback } from 'react';
import Dashboard from '@/components/Dashboard';
import Sidebar from '@/components/Sidebar';
import SiteDetails from '@/components/SiteDetails';
import KeywordResearch from '@/components/KeywordResearch';
import AuthorRotator from '@/components/AuthorRotator';
import { MainKeywordsView, ArticleProductionView, FinishedArticlesView, LLMTrackerView } from '@/components/SEOViews';
import AIGeneratorModal from '@/components/AIGeneratorModal';
import Marketplace from '@/components/modules/marketplace/Marketplace';
import KeyManagement from '@/components/modules/key-management/KeyManagement';
import EventLog from '@/components/modules/event-log/EventLog';
import SetupWizard from '@/components/modules/setup-wizard/SetupWizard';
import BulkMetadataPush from '@/components/modules/rankmath-bridge/BulkMetadataPush';
import RecipeList from '@/components/modules/recipes/RecipeList';
import RankPulseDashboard from '@/components/modules/rank-pulse/RankPulseDashboard';
import GSCDashboard from '@/components/modules/gsc-insights/GSCDashboard';
import NanaBananaDashboard from '@/components/modules/nana-banana/NanaBananaDashboard';
import ContentCalendar from '@/components/ContentCalendar';
import { MOCK_SITES } from '@/constants';
import { ViewState, Site, UserRole } from '@/types';
import { Menu, Search } from 'lucide-react';
import { useSites, useDeleteSite } from '@/hooks/useSites';
import { usePreferences } from '@/hooks/useEvents';

// ====== View title map ======

const VIEW_TITLES: Partial<Record<ViewState, string>> = {
  calendar: 'Calendar',
  'keywords-main': 'Keyword Magic Tool',
  production: 'Posts',
  finished: 'Finished Articles',
  'llm-tracker': 'LLM Tracker',
  'keywords-db': 'Keyword Research',
  authors: 'Personas',
  marketplace: 'Marketplace',
  'key-management': 'API Keys',
  'event-log': 'Event Log',
  'rankmath-bridge': 'RankMath Bridge',
  'bulk-metadata': 'RankMath Bridge',
  recipes: 'Recipes',
  'rank-pulse': 'Rank Pulse',
  'gsc-insights': 'GSC Insights',
  'nana-banana': 'Nana Banana',
};

// ====== URL helpers ======

function getViewFromUrl(): ViewState {
  if (typeof window === 'undefined') return 'dashboard';
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view && view in VIEW_TITLES) return view as ViewState;
  return 'dashboard';
}

function setViewUrl(view: ViewState) {
  if (typeof window === 'undefined') return;
  const url = view === 'dashboard'
    ? window.location.pathname
    : `${window.location.pathname}?view=${view}`;
  window.history.pushState({ view }, '', url);
}

export default function Home() {
  const [currentView, setCurrentViewState] = useState<ViewState>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);

  // Navigation with URL sync
  const changeView = useCallback((view: ViewState) => {
    setCurrentViewState(view);
    setViewUrl(view);
  }, []);

  // Read initial view from URL on client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const viewFromUrl = getViewFromUrl();
    if (viewFromUrl !== 'dashboard') {
      setCurrentViewState(viewFromUrl);
    }
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setCurrentViewState(getViewFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch real data from Supabase (no MOCK fallback)
  const { data: sites = [], isLoading, error } = useSites();
  const { data: preferences } = usePreferences();
  const deleteSiteMutation = useDeleteSite();

  if (error) {
    console.error('Error loading sites:', error);
  }

  const goBack = useCallback(() => changeView('dashboard'), [changeView]);

  const handleGeneratePost = (site: Site) => {
    setSelectedSite(site);
    setIsGeneratorOpen(true);
  };

  const handleDeleteSite = (siteId: string) => {
    if (userRole !== 'ADMIN') return;
    if (window.confirm('Are you sure you want to delete this property? This action is irreversible.')) {
      deleteSiteMutation.mutate(siteId);
    }
  };

  const handleSelectSite = (site: Site) => {
    setSelectedSite(site);
    changeView('site-details');
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
      case 'production':
        return <ArticleProductionView onBack={goBack} />;
      case 'finished':
        return <FinishedArticlesView onBack={goBack} />;
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
        return <BulkMetadataPush onBack={goBack} />;
      case 'recipes':
        return <RecipeList onBack={goBack} />;
      case 'rank-pulse':
        return <RankPulseDashboard onBack={goBack} />;
      case 'gsc-insights':
        return <GSCDashboard onBack={goBack} />;
      case 'nana-banana':
        return <NanaBananaDashboard onBack={goBack} />;
      default:
        return dashboardView;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F5F5F7] font-sans text-gray-900 overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-900">
      <Sidebar
        currentView={currentView}
        onChangeView={changeView}
        userRole={userRole}
        setUserRole={setUserRole}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#FBFBFD]/90 backdrop-blur-xl border-b border-gray-200 shadow-sm flex-shrink-0 z-30 sticky top-0">
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
