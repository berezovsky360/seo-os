'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ViewState, UserRole } from '../types';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  House, CalendarBlank, Lightning, Storefront, GearSix,
  SignOut, Check, Plus, GearFine,
} from '@phosphor-icons/react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Tooltip (portalled, fixed position) ───
const Tooltip = ({ label, anchor }: { label: string; anchor: DOMRect | null }) => {
  if (!anchor || typeof window === 'undefined') return null;
  return createPortal(
    <div
      className="fixed z-[9999] px-3 py-2 bg-white text-gray-900 text-xs font-semibold rounded-xl whitespace-nowrap shadow-xl border border-gray-100 pointer-events-none"
      style={{
        top: anchor.top + anchor.height / 2,
        left: anchor.right + 14,
        transform: 'translateY(-50%)',
      }}
    >
      {label}
    </div>,
    document.body,
  );
};

// ─── NavIcon ───
const NavIcon = ({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  const show = useCallback(() => {
    if (ref.current) setAnchor(ref.current.getBoundingClientRect());
  }, []);
  const hide = useCallback(() => setAnchor(null), []);

  return (
    <>
      <button
        ref={ref}
        onClick={onClick}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-1 cursor-pointer transition-all duration-200 ${
          active
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon size={24} weight="fill" />
      </button>
      <Tooltip label={label} anchor={anchor} />
    </>
  );
};

// ─── Core nav items (static, always visible) ───
const CORE_NAV: { id: string; icon: React.ElementType; label: string; viewState: ViewState }[] = [
  { id: 'home', icon: House, label: 'Home', viewState: 'dashboard' },
  { id: 'calendar', icon: CalendarBlank, label: 'Calendar', viewState: 'calendar' },
  { id: 'recipes', icon: Lightning, label: 'Automations', viewState: 'recipes' },
];

const BOTTOM_NAV: { id: string; icon: React.ElementType; label: string; viewState: ViewState }[] = [
  { id: 'marketplace', icon: Storefront, label: 'Marketplace', viewState: 'marketplace' },
  { id: 'settings', icon: GearSix, label: 'Settings', viewState: 'brands' },
];

// ─── Workspace Panel (portalled overlay) ───
const WorkspacePanel = ({
  isOpen,
  onClose,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
}) => {
  const { signOut } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute top-3 left-[84px] w-72 bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden animate-[slideIn_250ms_ease-out]"
        style={{ maxHeight: 'calc(100vh - 24px)' }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Workspaces</h2>
          <button
            className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
            title="New Workspace"
          >
            <Plus size={14} weight="bold" />
          </button>
        </div>

        {/* Workspace list */}
        <div className="px-2 pb-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-50/70">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
              D
            </div>
            <span className="flex-1 text-sm font-semibold text-gray-900 truncate">default</span>
            <button
              onClick={() => { onNavigate('brands' as ViewState); onClose(); }}
              className="w-6 h-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-white flex items-center justify-center transition-colors"
              title="Settings"
            >
              <GearFine size={14} />
            </button>
            <Check size={16} weight="bold" className="text-indigo-600 flex-shrink-0" />
          </div>
        </div>

        {/* Divider + Actions */}
        <div className="border-t border-gray-100 px-2 py-2">
          <button
            onClick={() => { onNavigate('brands' as ViewState); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors text-left text-sm font-medium"
          >
            <GearSix size={16} />
            Account Settings
          </button>
          <button
            onClick={async () => { onClose(); await signOut(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors text-left text-sm font-medium"
          >
            <SignOut size={16} />
            Log out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ─── Sidebar ───
const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose }) => {
  const [wsOpen, setWsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Icon Rail */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-[72px] bg-white flex flex-col items-center py-5 h-full
        md:relative md:translate-x-0 md:z-20
        ${mounted ? 'transition-transform duration-300 ease-in-out' : ''}
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Avatar → Workspaces */}
        <div className="mb-6 flex-shrink-0">
          <button
            onClick={() => setWsOpen(true)}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            JD
          </button>
        </div>

        {/* Core Nav */}
        <div className="flex flex-col items-center w-full px-3">
          {CORE_NAV.map(item => (
            <NavIcon
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={currentView === item.viewState}
              onClick={() => handleNavClick(item.viewState)}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Nav */}
        <div className="flex flex-col items-center px-3">
          <div className="w-6 h-px bg-gray-100 mb-2" />
          {BOTTOM_NAV.map(item => (
            <NavIcon
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={currentView === item.viewState}
              onClick={() => handleNavClick(item.viewState)}
            />
          ))}
        </div>
      </div>

      {/* Workspace Panel */}
      {mounted && (
        <WorkspacePanel
          isOpen={wsOpen}
          onClose={() => setWsOpen(false)}
          onNavigate={handleNavClick}
        />
      )}
    </>
  );
};

export default Sidebar;
