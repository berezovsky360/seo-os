'use client';

import React, { useState, useMemo } from 'react';
import { Activity, Loader2, Eye, Users, Clock, FileText } from 'lucide-react';
import { usePulseStats } from '@/hooks/usePulse';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ====== Types ======

interface PulseAnalyticsProps {
  siteId: string | null;
}

// ====== Constants ======

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

const DEVICE_COLORS: Record<string, string> = {
  Desktop: '#6366f1',
  Mobile: '#f59e0b',
  Tablet: '#10b981',
};

const DEVICE_COLOR_LIST = ['#6366f1', '#f59e0b', '#10b981'];

// ====== Custom Tooltip ======

function AreaChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-semibold text-gray-900">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ====== Component ======

export default function PulseAnalytics({ siteId }: PulseAnalyticsProps) {
  const [days, setDays] = useState(30);

  const { data, isLoading } = usePulseStats(siteId, days);

  // --- Computed values ---
  const summary = useMemo(() => {
    if (!data?.daily || data.daily.length === 0) {
      return { totalViews: 0, uniqueVisitors: 0, avgViewsPerDay: 0 };
    }
    const totalViews = data.daily.reduce((sum, d) => sum + d.views, 0);
    const uniqueVisitors = data.daily.reduce((sum, d) => sum + d.visitors, 0);
    const avgViewsPerDay =
      data.daily.length > 0 ? Math.round(totalViews / data.daily.length) : 0;
    return { totalViews, uniqueVisitors, avgViewsPerDay };
  }, [data?.daily]);

  const topPage = useMemo(() => {
    if (!data?.topPages || data.topPages.length === 0) return null;
    return data.topPages[0].page_path;
  }, [data?.topPages]);

  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      Views: d.views,
      Visitors: d.visitors,
    }));
  }, [data?.daily]);

  const topPagesData = useMemo(() => {
    if (!data?.topPages) return [];
    return data.topPages.slice(0, 10);
  }, [data?.topPages]);

  const maxPageViews = useMemo(() => {
    if (topPagesData.length === 0) return 1;
    return Math.max(...topPagesData.map((p) => p.views), 1);
  }, [topPagesData]);

  const referrersData = useMemo(() => {
    if (!data?.referrers) return [];
    return data.referrers.slice(0, 10);
  }, [data?.referrers]);

  const devicesData = useMemo(() => {
    if (!data?.devices) return [];
    return data.devices;
  }, [data?.devices]);

  const totalDevices = useMemo(() => {
    return devicesData.reduce((sum, d) => sum + d.count, 0);
  }, [devicesData]);

  // --- No site selected ---
  if (!siteId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Activity size={40} className="text-gray-200 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium mb-1">No site selected</h3>
          <p className="text-sm text-gray-400">
            Select a site to view analytics data.
          </p>
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  // --- Empty state ---
  if (!data || (!data.daily?.length && !data.topPages?.length)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Activity size={40} className="text-gray-200 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium mb-1">No analytics data</h3>
          <p className="text-sm text-gray-400">
            Silent Pulse hasn't collected any data for this site yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Eye size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Views
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.totalViews.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-emerald-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Unique Visitors
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.uniqueVisitors.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Avg Views/Day
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.avgViewsPerDay.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-violet-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Top Page
            </span>
          </div>
          <div
            className="text-sm font-bold text-gray-900 truncate mt-1"
            title={topPage ?? undefined}
          >
            {topPage
              ? topPage.length > 30
                ? topPage.slice(0, 30) + '...'
                : topPage
              : '\u2014'}
          </div>
        </div>
      </div>

      {/* ===== Date Range Selector ===== */}
      <div className="flex items-center gap-1">
        {DATE_RANGES.map((range) => (
          <button
            key={range.days}
            onClick={() => setDays(range.days)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              days === range.days
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* ===== Area Chart: Daily Views + Visitors ===== */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">
          Traffic Overview
        </h3>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
            No traffic data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradientViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient
                  id="gradientVisitors"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                width={45}
              />
              <Tooltip content={<AreaChartTooltip />} />
              <Area
                type="monotone"
                dataKey="Views"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gradientViews)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="Visitors"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradientVisitors)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-indigo-500 rounded" />
            <span className="text-xs text-gray-500">Views</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-emerald-500 rounded" />
            <span className="text-xs text-gray-500">Visitors</span>
          </div>
        </div>
      </div>

      {/* ===== Two-Column Grid: Top Pages + Referrers/Devices ===== */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Top Pages */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Top Pages</h3>
          {topPagesData.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              No page data available.
            </div>
          ) : (
            <div className="space-y-1.5">
              {topPagesData.map((page, i) => (
                <div
                  key={page.page_path}
                  className="relative flex items-center gap-3 px-3 py-2 rounded-lg overflow-hidden"
                >
                  {/* Background bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-indigo-50 rounded-lg"
                    style={{
                      width: `${(page.views / maxPageViews) * 100}%`,
                    }}
                  />
                  {/* Content */}
                  <span className="relative z-10 flex-shrink-0 w-5 text-xs font-semibold text-gray-400 text-right">
                    {i + 1}
                  </span>
                  <span
                    className="relative z-10 flex-1 text-sm text-gray-700 truncate"
                    title={page.page_path}
                  >
                    {page.page_path}
                  </span>
                  <span className="relative z-10 flex-shrink-0 text-xs font-semibold text-gray-900">
                    {page.views.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Referrers + Devices */}
        <div className="space-y-6">
          {/* Referrer Sources */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Referrer Sources
            </h3>
            {referrersData.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                No referrer data available.
              </div>
            ) : (
              <div className="space-y-2">
                {referrersData.map((ref) => (
                  <div
                    key={ref.referrer}
                    className="flex items-center justify-between px-3 py-1.5"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1 mr-3">
                      {ref.referrer || '(direct)'}
                    </span>
                    <span className="text-xs font-semibold text-gray-900 flex-shrink-0">
                      {ref.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Device Breakdown
            </h3>
            {devicesData.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                No device data available.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <div className="relative w-[180px] h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={devicesData}
                          dataKey="count"
                          nameKey="device"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {devicesData.map((entry, index) => (
                            <Cell
                              key={entry.device}
                              fill={
                                DEVICE_COLORS[entry.device] ||
                                DEVICE_COLOR_LIST[index % DEVICE_COLOR_LIST.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name?: string) => [
                            value.toLocaleString(),
                            name || '',
                          ]}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg font-bold text-gray-900">
                        {totalDevices.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Total
                      </span>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  {devicesData.map((entry, index) => (
                    <div key={entry.device} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            DEVICE_COLORS[entry.device] ||
                            DEVICE_COLOR_LIST[index % DEVICE_COLOR_LIST.length],
                        }}
                      />
                      <span className="text-xs text-gray-500">{entry.device}</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {totalDevices > 0
                          ? Math.round((entry.count / totalDevices) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
