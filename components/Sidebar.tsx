'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ViewState } from '../types';
import { ShieldCheck } from '@phosphor-icons/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  House, CalendarBlank, Lightning, Storefront, GearSix,
  SignOut, Check, GearFine, Swatches,
} from '@phosphor-icons/react';
import { useBackgroundTasks } from '@/lib/contexts/BackgroundTaskContext';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { useAccountRegistry } from '@/lib/contexts/AccountRegistryContext';
import { supabase } from '@/lib/supabase/client';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';
import WorkspaceSettingsModal from '@/components/WorkspaceSettingsModal';
import type { Workspace } from '@/types';

// ─── Avatar helpers ───
const EMOJI_OPTIONS = [
  '😎', '🚀', '🔥', '💡', '🎯', '⚡', '🌟', '🎨',
  '🧠', '💎', '🦊', '🐱', '🐶', '🦁', '🐼', '🦄',
  '🌈', '🍀', '☕', '🎸', '🏆', '👾', '🤖', '🛸',
];

function getInitials(user: any): string {
  const meta = user?.user_metadata;
  const first = meta?.first_name?.[0] || '';
  const last = meta?.last_name?.[0] || '';
  if (first || last) return (first + last).toUpperCase();
  // Fallback: first 2 chars of email
  const email = user?.email || '';
  return email.slice(0, 2).toUpperCase() || '??';
}

function getAvatarEmoji(user: any): string | null {
  return user?.user_metadata?.avatar_emoji || null;
}

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
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
  { id: 'content-lots', icon: Swatches, label: 'Content Lots', viewState: 'content-lots' },
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
  const { user, signOut, userProfile, userRole } = useAuth();
  const { workspaces, currentWorkspaceId, isAllWorkspaces, switchWorkspace } = useWorkspace();
  const { linkedAccounts, currentAccountEmail, addAccount, switchAccount, removeAccount } = useAccountRegistry();
  const panelRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [settingsWorkspace, setSettingsWorkspace] = useState<Workspace | null>(null);
  const currentEmoji = getAvatarEmoji(user);
  const initials = getInitials(user);

  const handlePickEmoji = async (emoji: string | null) => {
    setShowEmojiPicker(false);
    await supabase.auth.updateUser({ data: { avatar_emoji: emoji } });
  };

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
        className="absolute top-3 left-[84px] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden animate-[slideIn_250ms_ease-out]"
        style={{ maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' }}
      >
        {/* Account Switcher */}
        {linkedAccounts.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Accounts</p>
            <div className="flex items-center gap-2 flex-wrap">
              {linkedAccounts.map(acc => (
                <div key={acc.user_id} className="relative group">
                  <button
                    onClick={() => acc.email !== currentAccountEmail && switchAccount(acc.email)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold transition-all ${
                      acc.email === currentAccountEmail
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 ring-2 ring-indigo-300 ring-offset-1'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500 hover:from-indigo-400 hover:to-purple-500 cursor-pointer'
                    }`}
                    title={acc.email}
                  >
                    {acc.avatar_emoji ? (
                      <span className="text-base leading-none">{acc.avatar_emoji}</span>
                    ) : (
                      (acc.display_name || acc.email)[0].toUpperCase()
                    )}
                  </button>
                </div>
              ))}
              <button
                onClick={() => { addAccount(); onClose(); }}
                className="w-9 h-9 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                title="Add account"
              >
                <span className="text-lg leading-none">+</span>
              </button>
            </div>
          </div>
        )}

        {/* User Profile Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 hover:scale-105 transition-transform group"
              title="Change avatar"
            >
              {currentEmoji ? (
                <span className="text-lg leading-none">{currentEmoji}</span>
              ) : (
                <span className="text-xs">{initials}</span>
              )}
              <div className="absolute inset-0 rounded-xl bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-[10px]">Edit</span>
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {user?.user_metadata?.first_name
                  ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
                  : user?.email || 'User'}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="bg-gray-50 rounded-xl p-3 mb-2 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pick an avatar</span>
                {currentEmoji && (
                  <button
                    onClick={() => handlePickEmoji(null)}
                    className="text-[10px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Use initials
                  </button>
                )}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => handlePickEmoji(e)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-base hover:bg-white hover:shadow-sm transition-all ${
                      currentEmoji === e ? 'bg-white shadow-sm ring-2 ring-indigo-300' : ''
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workspace list */}
        <div className="border-t border-gray-100 px-2 py-2">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Workspaces</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              + New
            </button>
          </div>

          {/* "All Workspaces" option */}
          {workspaces.length > 1 && (
            <button
              onClick={() => { switchWorkspace(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${
                isAllWorkspaces ? 'bg-indigo-50/70' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                isAllWorkspaces ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="9.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="1" y="9.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <span className={`flex-1 text-sm font-semibold truncate text-left ${
                isAllWorkspaces ? 'text-gray-900' : 'text-gray-600'
              }`}>
                All Workspaces
              </span>
              {isAllWorkspaces && (
                <Check size={14} weight="bold" className="text-indigo-600 flex-shrink-0" />
              )}
            </button>
          )}

          {/* Individual workspace items */}
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => { switchWorkspace(ws.id); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${
                ws.id === currentWorkspaceId ? 'bg-indigo-50/70' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                ws.id === currentWorkspaceId ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gray-100'
              }`}>
                {ws.emoji}
              </div>
              <span className={`flex-1 text-sm font-semibold truncate text-left ${
                ws.id === currentWorkspaceId ? 'text-gray-900' : 'text-gray-600'
              }`}>
                {ws.name}
              </span>
              {ws.is_default && (
                <span className="text-[9px] font-semibold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0">
                  Default
                </span>
              )}
              <span
                onClick={(e) => { e.stopPropagation(); setSettingsWorkspace(ws); }}
                className="w-6 h-6 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                title="Settings"
              >
                <GearFine size={14} />
              </span>
              {ws.id === currentWorkspaceId && (
                <Check size={14} weight="bold" className="text-indigo-600 flex-shrink-0" />
              )}
            </button>
          ))}

          {/* Add first account link (if no linked accounts yet) */}
          {linkedAccounts.length === 0 && (
            <button
              onClick={() => { addAccount(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors text-left text-sm"
            >
              <span className="w-8 h-8 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg">+</span>
              <span>Add another account</span>
            </button>
          )}
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
          {userRole === 'super_admin' && (
            <button
              onClick={() => { onNavigate('admin'); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left text-sm font-medium"
            >
              <ShieldCheck size={16} />
              Admin Panel
            </button>
          )}
          <button
            onClick={async () => { onClose(); await signOut(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors text-left text-sm font-medium"
          >
            <SignOut size={16} />
            Log out
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateWorkspaceModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <WorkspaceSettingsModal workspace={settingsWorkspace} onClose={() => setSettingsWorkspace(null)} />
    </div>,
    document.body,
  );
};

// ─── Task Activity Button ───
const TaskActivityButton = () => {
  const { hasRunning, activeCount, failedCount, tasks, isExpanded, setIsExpanded } = useBackgroundTasks();
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const hasFailed = failedCount > 0;

  const show = useCallback(() => {
    if (ref.current) setAnchor(ref.current.getBoundingClientRect());
  }, []);
  const hide = useCallback(() => setAnchor(null), []);

  return (
    <>
      <button
        ref={ref}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`relative w-12 h-12 flex items-center justify-center rounded-2xl mb-1 cursor-pointer transition-all duration-200 ${
          hasRunning
            ? 'text-blue-500 bg-blue-50'
            : hasFailed
              ? 'text-red-500 bg-red-50'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        {/* Animated orbiting ring when running */}
        {hasRunning && (
          <svg className="absolute inset-0 w-12 h-12 animate-task-orbit" viewBox="0 0 48 48">
            <circle
              cx="24" cy="24" r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="16 97"
              strokeLinecap="round"
              opacity="0.3"
            />
          </svg>
        )}

        {/* Core icon */}
        <svg
          className={hasRunning ? 'animate-task-pulse' : ''}
          width="22" height="22" viewBox="0 0 24 24" fill="none"
        >
          {hasRunning ? (
            <path
              d="M22 12h-4l-3 9L9 3l-3 9H2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : hasFailed ? (
            <>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.4" />
              <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.4" />
              <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
        </svg>

        {/* Active count badge */}
        {activeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full px-1 shadow-sm">
            {activeCount}
          </span>
        )}
        {/* Failed badge */}
        {!hasRunning && hasFailed && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-sm">
            !
          </span>
        )}
      </button>
      <Tooltip
        label={
          hasRunning ? `${activeCount} task${activeCount > 1 ? 's' : ''} running`
          : hasFailed ? `${failedCount} task${failedCount > 1 ? 's' : ''} failed`
          : 'Background Tasks'
        }
        anchor={anchor}
      />
    </>
  );
};

// ─── Theme Toggle ───
const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
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
        onClick={toggle}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="w-12 h-12 flex items-center justify-center rounded-2xl mb-1 cursor-pointer transition-all duration-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50"
      >
        {theme === 'dark' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
      <Tooltip label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} anchor={anchor} />
    </>
  );
};

// ─── Sidebar ───
const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose }) => {
  const { user, userRole } = useAuth();
  const [wsOpen, setWsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const avatarEmoji = getAvatarEmoji(user);
  const initials = getInitials(user);

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
            {avatarEmoji ? (
              <span className="text-lg leading-none">{avatarEmoji}</span>
            ) : (
              initials
            )}
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
          <TaskActivityButton />
          <ThemeToggle />
          {userRole === 'super_admin' && (
            <NavIcon
              icon={ShieldCheck}
              label="Admin Panel"
              active={currentView === 'admin'}
              onClick={() => handleNavClick('admin')}
            />
          )}
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
