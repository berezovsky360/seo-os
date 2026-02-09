'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Search, Plus,
  Calendar as CalendarIcon, CirclePlus
} from 'lucide-react';

// ====== Types ======

interface CalendarPost {
  id: string;
  title: string;
  site: string;
  status: 'publish' | 'scheduled' | 'draft';
  seoScore: number;
  date: string; // YYYY-MM-DD
}

interface DayCell {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: CalendarPost[];
}

// ====== Mock Data ======

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth();
const pad = (n: number) => String(n).padStart(2, '0');
const mockDate = (day: number) => `${y}-${pad(m + 1)}-${pad(day)}`;

const MOCK_POSTS: CalendarPost[] = [
  { id: '1', title: 'SEO Strategies 2024', site: 'techblog.com', status: 'publish', seoScore: 82, date: mockDate(2) },
  { id: '2', title: 'Backlink Audit Guide', site: 'marketing-pro.net', status: 'scheduled', seoScore: 68, date: mockDate(6) },
  { id: '3', title: 'Core Web Vitals Optimization', site: 'techblog.com', status: 'publish', seoScore: 94, date: mockDate(8) },
  { id: '4', title: 'Internal Link Mastery', site: 'techblog.com', status: 'draft', seoScore: 42, date: mockDate(12) },
  { id: '5', title: 'Content Cluster Blueprint', site: 'marketing-pro.net', status: 'scheduled', seoScore: 91, date: mockDate(15) },
  { id: '6', title: 'Technical SEO Checklist', site: 'seo-agency.io', status: 'draft', seoScore: 35, date: mockDate(15) },
  { id: '7', title: 'E-E-A-T Guide for SaaS', site: 'techblog.com', status: 'scheduled', seoScore: 77, date: mockDate(19) },
  { id: '8', title: 'Local SEO for Restaurants', site: 'marketing-pro.net', status: 'publish', seoScore: 88, date: mockDate(22) },
  { id: '9', title: 'Schema Markup Best Practices', site: 'seo-agency.io', status: 'draft', seoScore: 55, date: mockDate(25) },
  { id: '10', title: 'AI Content Detection Bypass', site: 'techblog.com', status: 'scheduled', seoScore: 63, date: mockDate(28) },
];

// ====== Helpers ======

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

  // Previous month padding
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  const cells: DayCell[] = [];

  // Prev month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(prevYear, prevMonth, day);
    cells.push({ date, day, isCurrentMonth: false, isToday: false, posts: [] });
  }

  // Current month days
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

  // Next month padding (fill to 42 = 6 rows × 7 cols)
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

function StatusBadge({ status }: { status: CalendarPost['status'] }) {
  const config = {
    publish: { label: 'PUBLISHED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    scheduled: { label: 'SCHEDULED', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    draft: { label: 'DRAFT', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  };
  const c = config[status];
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

function PostCard({ post }: { post: CalendarPost }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-1.5 sm:p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
        <StatusBadge status={post.status} />
        <SeoScore score={post.seoScore} />
      </div>
      <p className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight truncate group-hover:text-indigo-600 transition-colors">
        {post.title}
      </p>
      <p className="text-[10px] sm:text-[11px] text-gray-400 truncate mt-0.5">{post.site}</p>
    </div>
  );
}

// Mobile post card (more spacious)
function MobilePostCard({ post }: { post: CalendarPost }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm active:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <StatusBadge status={post.status} />
        <SeoScore score={post.seoScore} />
      </div>
      <p className="text-sm font-semibold text-gray-900 leading-snug">{post.title}</p>
      <p className="text-xs text-gray-400 mt-1">{post.site}</p>
    </div>
  );
}

// ====== Main Component ======

export default function ContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date(y, m, 1));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_POSTS;
    const q = searchQuery.toLowerCase();
    return MOCK_POSTS.filter(
      p => p.title.toLowerCase().includes(q) || p.site.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const grid = useMemo(
    () => buildCalendarGrid(year, month, filteredPosts),
    [year, month, filteredPosts]
  );

  // Days with posts for mobile list view
  const daysWithPosts = useMemo(() => {
    return grid.filter(cell => cell.isCurrentMonth && cell.posts.length > 0);
  }, [grid]);

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };
  const goToToday = () => {
    setCurrentMonth(new Date(y, m, 1));
  };

  const rows: DayCell[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    rows.push(grid.slice(i, i + 7));
  }

  // Check if we need 5 or 6 rows (skip last row if all next-month)
  const displayRows = rows.filter(row => row.some(cell => cell.isCurrentMonth));

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] relative font-sans">
      {/* ====== Header ====== */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        {/* Top row: title + actions */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <CalendarIcon size={22} className="text-indigo-600 hidden sm:block" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Content Calendar</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search toggle (mobile) */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search size={18} />
            </button>

            {/* Search (desktop) */}
            <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-2 w-56 lg:w-64 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>

            {/* Create New Post button (desktop) */}
            <button className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-colors">
              <CirclePlus size={18} />
              <span>Create New Post</span>
            </button>
          </div>
        </div>

        {/* Mobile search bar (expandable) */}
        {showSearch && (
          <div className="md:hidden px-4 pb-3">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 gap-2 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300">
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

        {/* Month navigation row */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              {MONTH_NAMES[month]} {year}
            </h2>
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

      {/* ====== Calendar Grid (Desktop / Tablet) ====== */}
      <div className="flex-1 overflow-y-auto hidden md:block">
        <div className="p-4 lg:p-6">
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
                  const maxVisible = 2;
                  const visiblePosts = cell.posts.slice(0, maxVisible);
                  const overflowCount = cell.posts.length - maxVisible;

                  return (
                    <div
                      key={cellIdx}
                      className={`min-h-[120px] lg:min-h-[140px] border-r border-gray-100 last:border-r-0 p-1.5 lg:p-2 flex flex-col transition-colors ${
                        cell.isToday
                          ? 'bg-indigo-50/40 ring-2 ring-inset ring-indigo-400'
                          : cell.isCurrentMonth
                            ? 'bg-white hover:bg-gray-50/50'
                            : 'bg-gray-50/50'
                      }`}
                    >
                      {/* Date number */}
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
                      </div>

                      {/* Post cards */}
                      <div className="flex-1 flex flex-col gap-1">
                        {visiblePosts.map(post => (
                          <PostCard key={post.id} post={post} />
                        ))}
                        {overflowCount > 0 && (
                          <button className="text-[10px] lg:text-xs text-indigo-500 font-semibold hover:text-indigo-700 text-left px-1 py-0.5 rounded hover:bg-indigo-50 transition-colors">
                            +{overflowCount} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== Mobile List View ====== */}
      <div className="flex-1 overflow-y-auto md:hidden px-4 pt-4 pb-24">
        {daysWithPosts.length === 0 ? (
          <div className="text-center py-16">
            <CalendarIcon size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-400 font-medium">No posts this month</p>
            <p className="text-xs text-gray-300 mt-1">
              {searchQuery ? 'Try a different search query' : 'Navigate to another month'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {daysWithPosts.map(cell => {
              const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][cell.date.getDay()];
              return (
                <div key={cell.day}>
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                      cell.isToday
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className="text-sm font-bold">{cell.day}</span>
                      <span className="text-xs font-medium">{dayOfWeek}</span>
                    </div>
                    {cell.isToday && (
                      <span className="text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Posts for this day */}
                  <div className="space-y-2 pl-1">
                    {cell.posts.map(post => (
                      <MobilePostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== Desktop empty state ====== */}
      {filteredPosts.length === 0 && (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <Search size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-400 font-medium">No posts match your search</p>
          </div>
        </div>
      )}

      {/* ====== FAB (Mobile) ====== */}
      <button className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center transition-all z-20">
        <Plus size={24} />
      </button>
    </div>
  );
}
