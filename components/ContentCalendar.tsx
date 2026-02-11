'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Search, Plus,
  Calendar as CalendarIcon, CirclePlus, Loader2, ChevronDown,
} from 'lucide-react';
import { useCalendarPosts, type CalendarPost } from '@/hooks/useCalendar';

// ====== Types ======

interface DayCell {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: CalendarPost[];
}

// ====== Helpers ======

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const pad = (n: number) => String(n).padStart(2, '0');

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function buildCalendarGrid(year: number, month: number, posts: CalendarPost[]): DayCell[] {
  const today = new Date();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  const cells: DayCell[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(prevYear, prevMonth, day);
    cells.push({ date, day, isCurrentMonth: false, isToday: false, posts: [] });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const dayPosts = posts.filter(p => p.date === dateStr);
    cells.push({
      date,
      day,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      posts: dayPosts,
    });
  }

  const remaining = 42 - cells.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let day = 1; day <= remaining; day++) {
    const date = new Date(nextYear, nextMonth, day);
    cells.push({ date, day, isCurrentMonth: false, isToday: false, posts: [] });
  }

  return cells;
}

// ====== Sub-components ======

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  publish: { label: 'PUBLISHED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  published: { label: 'PUBLISHED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'SCHEDULED', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  reviewed: { label: 'REVIEWED', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  draft: { label: 'DRAFT', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending: { label: 'PENDING', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  private: { label: 'PRIVATE', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || { label: status.toUpperCase(), cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${c.cls} leading-none whitespace-nowrap`}>
      {c.label}
    </span>
  );
}

function SeoScore({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-rose-500';
  return (
    <span className={`text-xs sm:text-sm font-bold ${color} tabular-nums`}>{score}</span>
  );
}

function getEditorUrl(post: CalendarPost): string {
  const source = post.source === 'posts' ? 'wordpress' : 'generated';
  return `/editor/${post.rawId}?siteId=${post.siteId}&source=${source}`;
}

function PostCard({ post }: { post: CalendarPost }) {
  return (
    <Link href={getEditorUrl(post)} className="block bg-white rounded-lg border border-gray-100 p-1.5 sm:p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
        <StatusBadge status={post.status} />
        <SeoScore score={post.seoScore} />
      </div>
      <p className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight truncate group-hover:text-indigo-600 transition-colors">
        {post.title}
      </p>
      <p className="text-[10px] sm:text-[11px] text-gray-400 truncate mt-0.5">{post.site}</p>
    </Link>
  );
}

function MobilePostCard({ post }: { post: CalendarPost }) {
  return (
    <Link href={getEditorUrl(post)} className="block bg-white rounded-xl border border-gray-100 p-3 shadow-sm active:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <StatusBadge status={post.status} />
        <SeoScore score={post.seoScore} />
      </div>
      <p className="text-sm font-semibold text-gray-900 leading-snug">{post.title}</p>
      <p className="text-xs text-gray-400 mt-1">{post.site}</p>
    </Link>
  );
}

// Popover for expanded day view
function DayPopover({ posts, onClose }: { posts: CalendarPost[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 z-30 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 mt-1 max-h-56 overflow-y-auto animate-[slideIn_200ms_ease-out]"
      style={{ minWidth: '200px' }}
    >
      <div className="space-y-1.5">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

// Month/Year Picker
function MonthYearPicker({ year, month, onChange }: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const years = Array.from({ length: 7 }, (_, i) => year - 3 + i);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-base sm:text-lg font-bold text-gray-900 hover:text-indigo-600 transition-colors"
      >
        {MONTH_NAMES[month]} {year}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-40 w-72 animate-[slideIn_200ms_ease-out]">
          {/* Year selector */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => onChange(year - 1, month)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-gray-900">{year}</span>
            <button
              onClick={() => onChange(year + 1, month)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, i) => (
              <button
                key={name}
                onClick={() => { onChange(year, i); setOpen(false); }}
                className={`px-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  i === month
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ====== Main Component ======

export default function ContentCalendar({ onBack }: { onBack?: () => void }) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Compute date range for API
  const startDate = `${year}-${pad(month + 1)}-01`;
  const endDate = `${year}-${pad(month + 1)}-${pad(getDaysInMonth(year, month))}`;

  const { data: posts = [], isLoading } = useCalendarPosts(startDate, endDate);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(
      p => p.title.toLowerCase().includes(q) || p.site.toLowerCase().includes(q)
    );
  }, [searchQuery, posts]);

  const grid = useMemo(
    () => buildCalendarGrid(year, month, filteredPosts),
    [year, month, filteredPosts]
  );

  const daysWithPosts = useMemo(() => {
    return grid.filter(cell => cell.isCurrentMonth && cell.posts.length > 0);
  }, [grid]);

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setExpandedDay(null);
  };
  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setExpandedDay(null);
  };
  const goToToday = () => {
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setExpandedDay(null);
  };
  const handleMonthYearChange = (y: number, m: number) => {
    setCurrentMonth(new Date(y, m, 1));
    setExpandedDay(null);
  };

  const rows: DayCell[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    rows.push(grid.slice(i, i + 7));
  }
  const displayRows = rows.filter(row => row.some(cell => cell.isCurrentMonth));

  return (
    <div className="h-full flex flex-col relative font-sans">
      {/* ====== Header ====== */}
      <div className="flex-shrink-0 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
        {/* Top row */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <>
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
                <div className="h-4 w-px bg-gray-300" />
              </>
            )}
            <CalendarIcon size={20} className="text-gray-900" />
            <h1 className="text-lg font-bold text-gray-900">Content Calendar</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search size={18} />
            </button>

            <div className="hidden md:flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 gap-2 w-56 lg:w-64 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>
          </div>
        </div>

        {/* Mobile search */}
        {showSearch && (
          <div className="md:hidden px-4 pb-3">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2.5 gap-2 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Month/Year navigation */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <MonthYearPicker year={year} month={month} onChange={handleMonthYearChange} />
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <button
            onClick={goToToday}
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* ====== Loading ====== */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* ====== Calendar Grid (Desktop / Tablet) ====== */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto hidden md:block">
          <div className="p-4 lg:p-6">
            {filteredPosts.length === 0 && !searchQuery ? (
              <div className="flex flex-col items-center justify-center py-20">
                <CalendarIcon size={48} className="text-gray-300 mb-4" />
                <p className="text-sm text-gray-400 font-medium">No content this month</p>
                <p className="text-xs text-gray-300 mt-1">Navigate to another month or create new content</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                  {DAY_NAMES.map(day => (
                    <div key={day} className="px-2 lg:px-3 py-3 text-center">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{day}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar rows */}
                {displayRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
                    {row.map((cell, cellIdx) => {
                      const maxVisible = cell.posts.length > 5 ? 2 : 3;
                      const visiblePosts = cell.posts.slice(0, maxVisible);
                      const overflowCount = cell.posts.length - maxVisible;
                      const dateStr = `${year}-${pad(month + 1)}-${pad(cell.day)}`;
                      const isExpanded = expandedDay === dateStr;

                      return (
                        <div
                          key={cellIdx}
                          className={`min-h-[120px] lg:min-h-[140px] border-r border-gray-100 last:border-r-0 p-1.5 lg:p-2 flex flex-col transition-colors relative ${
                            cell.isToday
                              ? 'bg-indigo-50/40 ring-2 ring-inset ring-indigo-400'
                              : cell.isCurrentMonth
                                ? 'bg-white hover:bg-gray-50/50'
                                : 'bg-gray-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs lg:text-sm font-semibold leading-none ${
                              cell.isToday
                                ? 'text-indigo-600'
                                : cell.isCurrentMonth
                                  ? 'text-gray-700'
                                  : 'text-gray-300'
                            }`}>
                              {cell.day}
                            </span>
                            {cell.isToday && (
                              <span className="text-[9px] lg:text-[10px] font-bold text-indigo-500 uppercase">Today</span>
                            )}
                            {cell.posts.length >= 5 && (
                              <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                {cell.posts.length}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col gap-1">
                            {visiblePosts.map(post => (
                              <PostCard key={post.id} post={post} />
                            ))}
                            {overflowCount > 0 && (
                              <button
                                onClick={() => setExpandedDay(isExpanded ? null : dateStr)}
                                className="text-[10px] lg:text-xs text-indigo-500 font-semibold hover:text-indigo-700 text-left px-1 py-0.5 rounded hover:bg-indigo-50 transition-colors"
                              >
                                +{overflowCount} more
                              </button>
                            )}
                          </div>

                          {/* Expanded popover */}
                          {isExpanded && cell.isCurrentMonth && (
                            <DayPopover
                              posts={cell.posts}
                              onClose={() => setExpandedDay(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Search empty state */}
            {filteredPosts.length === 0 && searchQuery && (
              <div className="flex flex-col items-center justify-center py-20">
                <Search size={48} className="text-gray-300 mb-4" />
                <p className="text-sm text-gray-400 font-medium">No posts match your search</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== Mobile List View ====== */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto md:hidden px-4 pt-4 pb-24">
          {daysWithPosts.length === 0 ? (
            <div className="text-center py-16">
              <CalendarIcon size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-400 font-medium">
                {searchQuery ? 'No posts match your search' : 'No content this month'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {searchQuery ? 'Try a different search query' : 'Navigate to another month'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {daysWithPosts.map(cell => {
                const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][cell.date.getDay()];
                const dateStr = `${year}-${pad(month + 1)}-${pad(cell.day)}`;
                const mobileMax = cell.posts.length > 5 ? 2 : cell.posts.length;
                const mobileOverflow = cell.posts.length - mobileMax;
                const isMobileExpanded = expandedDay === `m-${dateStr}`;

                return (
                  <div key={cell.day}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        cell.isToday
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className="text-sm font-bold">{cell.day}</span>
                        <span className="text-xs font-medium">{dayOfWeek}</span>
                      </div>
                      {cell.posts.length >= 5 && (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {cell.posts.length} posts
                        </span>
                      )}
                      {cell.isToday && (
                        <span className="text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 pl-1">
                      {(isMobileExpanded ? cell.posts : cell.posts.slice(0, mobileMax)).map(post => (
                        <MobilePostCard key={post.id} post={post} />
                      ))}
                      {mobileOverflow > 0 && !isMobileExpanded && (
                        <button
                          onClick={() => setExpandedDay(`m-${dateStr}`)}
                          className="w-full text-center text-xs font-semibold text-indigo-500 hover:text-indigo-700 py-2 bg-indigo-50/50 rounded-xl transition-colors"
                        >
                          Show {mobileOverflow} more posts
                        </button>
                      )}
                      {isMobileExpanded && mobileOverflow > 0 && (
                        <button
                          onClick={() => setExpandedDay(null)}
                          className="w-full text-center text-xs font-semibold text-gray-400 hover:text-gray-600 py-2 transition-colors"
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====== FAB (Mobile) ====== */}
      <button className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center transition-all z-20">
        <Plus size={24} />
      </button>
    </div>
  );
}
