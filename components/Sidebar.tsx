'use client';

import React from 'react';
import { ViewState, UserRole } from '../types';
import {
  LayoutDashboard, Calendar, Database, List, Layers, FileText,
  CheckSquare, BarChart2, Settings, Bell, Search,
  Briefcase, Home, PieChart, MessageSquare, Box,
  Zap, Key, Activity, BookOpen, Store
} from 'lucide-react';
import { useCore } from '@/lib/contexts/CoreContext';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Color mapping for dynamic module sections
const SECTION_COLOR_MAP: Record<string, { dot: string; text: string }> = {
  'bg-blue-500': { dot: 'bg-blue-500', text: 'text-blue-600' },
  'bg-orange-500': { dot: 'bg-orange-500', text: 'text-orange-600' },
  'bg-emerald-500': { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  'bg-purple-500': { dot: 'bg-purple-500', text: 'text-purple-600' },
  'bg-yellow-500': { dot: 'bg-yellow-500', text: 'text-yellow-600' },
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, userRole, setUserRole, isOpen, onClose }) => {
  const { getModuleSidebarSections } = useCore();
  const moduleSections = getModuleSidebarSections();

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    onClose();
  };

  const navItemClass = (view: ViewState) =>
    `flex items-center space-x-3 px-4 py-2.5 text-sm font-medium transition-all rounded-xl cursor-pointer mb-1 ${
      currentView === view
        ? 'bg-[#F3F4F6] text-gray-900 font-semibold'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
    }`;

  // Icon Rail Item
  const RailItem = ({ icon: Icon, active = false, onClick }: { icon: any, active?: boolean, onClick?: () => void }) => (
    <div
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center rounded-xl mb-4 cursor-pointer transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
    >
        <Icon size={20} />
    </div>
  );

  // Core views for the icon rail "active" check
  const coreViews = ['marketplace', 'key-management', 'event-log', 'recipes', 'settings'] as const;
  const moduleViews = ['rank-pulse', 'gemini-architect', 'rankmath-bridge', 'gsc-insights', 'bulk-metadata', 'nana-banana'] as const;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container - Double Pane */}
      <div className={`
        fixed inset-y-0 left-0 z-40 flex h-full
        transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-20
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Pane 1: Dark Icon Rail */}
        <div className="w-[72px] bg-[#1a1b23] flex flex-col items-center py-6 h-full z-20">
            {/* Logo Placeholder */}
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mb-8 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                R
            </div>

            <div className="flex-1 flex flex-col w-full items-center">
                <RailItem icon={Home} active={currentView === 'dashboard' || currentView === 'calendar'} />
                <RailItem icon={PieChart} />
                <RailItem icon={Database} active={['keywords-main', 'keywords-db', 'serp'].includes(currentView)} />
                <RailItem icon={FileText} active={['production', 'finished', 'clusters'].includes(currentView)} />
                <RailItem icon={Zap} active={(moduleViews as readonly string[]).includes(currentView)} />
                <RailItem icon={Box} active={(coreViews as readonly string[]).includes(currentView)} />
            </div>

            <div className="mt-auto flex flex-col items-center pb-4">
                <RailItem icon={Settings} />
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs font-bold mt-2">
                    JD
                </div>
            </div>
        </div>

        {/* Pane 2: Light Navigation Menu */}
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full z-10">
             {/* Header */}
            <div className="h-20 flex items-center px-6 border-b border-gray-50">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-lg tracking-tight">
                    <BarChart2 className="text-gray-900" size={20} />
                    <span>RankPilot</span>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">

                {/* Dashboard Section */}
                <div className="mb-8">
                    <div className="px-4 mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Dashboard</span>
                    </div>
                     <div onClick={() => handleNavClick('dashboard')} className={navItemClass('dashboard')}>
                        <span>Overview</span>
                     </div>
                     <div onClick={() => handleNavClick('calendar')} className={navItemClass('calendar')}>
                        <span>Calendar</span>
                     </div>
                </div>

                {/* Keyword Research Section */}
                <div className="mb-8">
                    <div className="px-4 mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Keyword Research</span>
                    </div>
                     <div onClick={() => handleNavClick('keywords-db')} className={navItemClass('keywords-db')}>
                        <span>Keyword Research</span>
                     </div>
                     <div onClick={() => handleNavClick('keywords-main')} className={navItemClass('keywords-main')}>
                        <span>Keyword Magic Tool</span>
                     </div>
                     <div onClick={() => handleNavClick('serp')} className={navItemClass('serp')}>
                        <span>SERP Analysis</span>
                     </div>
                      <div onClick={() => handleNavClick('llm-tracker')} className={navItemClass('llm-tracker')}>
                        <span>LLM Tracker</span>
                     </div>
                </div>

                {/* Content Section */}
                <div className="mb-8">
                    <div className="px-4 mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Content</span>
                    </div>
                     <div onClick={() => handleNavClick('production')} className={navItemClass('production')}>
                        <span>Posts</span>
                     </div>
                     <div onClick={() => handleNavClick('clusters')} className={navItemClass('clusters')}>
                        <span>Topics</span>
                     </div>
                </div>

                {/* Dynamic Module Sections */}
                {moduleSections.map((section) => {
                    const colors = SECTION_COLOR_MAP[section.color] || { dot: 'bg-gray-500', text: 'text-gray-600' };
                    return (
                        <div key={section.title} className="mb-8">
                            <div className="px-4 mb-2 flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></div>
                                <span className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}>{section.title}</span>
                            </div>
                            {section.items.map((item) => (
                                <div
                                    key={item.viewState}
                                    onClick={() => handleNavClick(item.viewState as ViewState)}
                                    className={navItemClass(item.viewState as ViewState)}
                                >
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    );
                })}

                {/* Core System Section */}
                <div className="mb-8">
                    <div className="px-4 mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                        <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">System</span>
                    </div>
                    <div onClick={() => handleNavClick('event-log')} className={navItemClass('event-log')}>
                        <span>Event Log</span>
                    </div>
                    <div onClick={() => handleNavClick('recipes')} className={navItemClass('recipes')}>
                        <span>Recipes</span>
                    </div>
                    <div onClick={() => handleNavClick('marketplace')} className={navItemClass('marketplace')}>
                        <span>Marketplace</span>
                    </div>
                    <div onClick={() => handleNavClick('key-management')} className={navItemClass('key-management')}>
                        <span>API Keys</span>
                    </div>
                </div>

                {/* Admin Section */}
                <div className="mb-8">
                    <div className="px-4 mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</span>
                    </div>
                     <div onClick={() => handleNavClick('authors')} className={navItemClass('authors')}>
                        <span>Personas</span>
                     </div>
                     <div onClick={() => handleNavClick('brands')} className={navItemClass('brands')}>
                        <span>Settings</span>
                     </div>
                </div>

            </div>

             {/* Footer */}
            <div className="p-4 border-t border-gray-100">
                <div className="bg-[#F8F9FC] rounded-xl p-4">
                     <div className="flex items-center gap-3 mb-3">
                         <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                             <Briefcase size={16} />
                         </div>
                         <div>
                             <div className="text-xs font-bold text-gray-900">Pro Plan</div>
                             <div className="text-[10px] text-gray-500">Expires in 12 days</div>
                         </div>
                     </div>
                     <button className="w-full py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors">
                         Upgrade Now
                     </button>
                </div>
            </div>

        </div>
      </div>
    </>
  );
};

export default Sidebar;
