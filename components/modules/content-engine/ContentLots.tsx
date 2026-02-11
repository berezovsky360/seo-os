'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  ChevronLeft, Undo2, X, Check, Rocket, Inbox, Loader2,
  Star, TrendingUp, Zap,
} from 'lucide-react'
import { useSwipeableItems, useSwipe, useUndoSwipe, SwipeableItem } from '@/hooks/useContentLots'

interface ContentLotsProps {
  onBack: () => void
}

// ====== SwipeCard ======

interface SwipeCardProps {
  item: SwipeableItem
  isTop: boolean
  stackIndex: number
  onSwipe: (direction: 'left' | 'right' | 'up') => void
}

function SwipeCard({ item, isTop, stackIndex, onSwipe }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const startPos = useRef({ x: 0, y: 0 })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isTop) return
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    startPos.current = { x: e.clientX, y: e.clientY }
    setDrag({ x: 0, y: 0, active: true })
  }, [isTop])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.active) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    setDrag({ x: dx, y: dy, active: true })
  }, [drag.active])

  const handlePointerUp = useCallback(() => {
    if (!drag.active) return
    const { x, y } = drag
    const THRESHOLD_X = 100
    const THRESHOLD_UP = 80

    if (x > THRESHOLD_X) {
      onSwipe('right')
    } else if (x < -THRESHOLD_X) {
      onSwipe('left')
    } else if (y < -THRESHOLD_UP) {
      onSwipe('up')
    }
    setDrag({ x: 0, y: 0, active: false })
  }, [drag, onSwipe])

  const rotation = drag.active ? drag.x * 0.1 : 0
  const translateX = drag.active ? drag.x : 0
  const translateY = drag.active ? Math.min(drag.y, 0) : 0

  // Stack depth effect
  const scale = 1 - stackIndex * 0.05
  const yOffset = stackIndex * 8
  const opacity = stackIndex > 2 ? 0 : 1

  // Direction overlay
  const absX = Math.abs(drag.x)
  const absY = Math.abs(drag.y)
  let overlayColor = ''
  let overlayIcon: React.ReactNode = null
  let overlayOpacity = 0

  if (drag.active && isTop) {
    if (drag.x > 30) {
      overlayColor = 'bg-green-500'
      overlayIcon = <Check size={48} className="text-white" />
      overlayOpacity = Math.min(absX / 100, 0.7)
    } else if (drag.x < -30) {
      overlayColor = 'bg-red-500'
      overlayIcon = <X size={48} className="text-white" />
      overlayOpacity = Math.min(absX / 100, 0.7)
    } else if (drag.y < -30) {
      overlayColor = 'bg-blue-500'
      overlayIcon = <Rocket size={48} className="text-white" />
      overlayOpacity = Math.min(absY / 100, 0.7)
    }
  }

  const timeAgo = useMemo(() => {
    if (!item.published_at && !item.created_at) return ''
    const date = new Date(item.published_at || item.created_at)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const hours = Math.floor(diffMs / 3600000)
    if (hours < 1) return 'just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }, [item.published_at, item.created_at])

  const keywords = useMemo(() => {
    return (item.extracted_keywords || []).slice(0, 4)
  }, [item.extracted_keywords])

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 select-none"
      style={{
        transform: isTop
          ? `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg) scale(${scale})`
          : `translateY(${yOffset}px) scale(${scale})`,
        opacity,
        zIndex: 10 - stackIndex,
        transition: drag.active ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="h-full bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col cursor-grab active:cursor-grabbing">
        {/* Direction overlay */}
        {overlayColor && (
          <div
            className={`absolute inset-0 ${overlayColor} rounded-3xl z-10 flex items-center justify-center pointer-events-none`}
            style={{ opacity: overlayOpacity }}
          >
            {overlayIcon}
          </div>
        )}

        {/* Card content */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Header: Feed + time */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 truncate max-w-[60%]">
              {item.feed_name || 'Unknown feed'}
            </span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 mb-4">
            {item.title}
          </h3>

          {/* Scores */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-blue-500" />
              <span className="text-sm font-semibold text-gray-700">SEO: {item.seo_score ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-orange-500" />
              <span className="text-sm font-semibold text-gray-700">Viral: {item.viral_score ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-yellow-500" />
              <span className="text-sm font-bold text-gray-900">{item.combined_score ?? '—'}</span>
            </div>
          </div>

          {/* Reasoning */}
          {item.score_reasoning && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4 italic">
              &ldquo;{item.score_reasoning}&rdquo;
            </p>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ====== ContentLots (main) ======

export default function ContentLots({ onBack }: ContentLotsProps) {
  const { data: items = [], isLoading } = useSwipeableItems()
  const swipeMutation = useSwipe()
  const undoMutation = useUndoSwipe()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exiting, setExiting] = useState<{ direction: 'left' | 'right' | 'up'; key: string } | null>(null)

  // Track total swiped for counter
  const [swipedCount, setSwipedCount] = useState(0)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'j':
          handleSwipe('left')
          break
        case 'ArrowRight':
        case 'k':
          handleSwipe('right')
          break
        case 'ArrowUp':
        case 'l':
          handleSwipe('up')
          break
        case 'z':
          handleUndo()
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentIndex, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    const item = items[currentIndex]
    if (!item) return

    // Optimistic: advance index immediately
    setCurrentIndex(prev => prev + 1)
    setSwipedCount(prev => prev + 1)

    swipeMutation.mutate({ item_id: item.id, direction })
  }, [currentIndex, items, swipeMutation])

  const handleUndo = useCallback(() => {
    if (swipedCount === 0) return
    setCurrentIndex(prev => Math.max(0, prev - 1))
    setSwipedCount(prev => Math.max(0, prev - 1))
    undoMutation.mutate()
  }, [swipedCount, undoMutation])

  const remaining = items.length - currentIndex
  const totalLoaded = items.length

  // Cards to show (top 3)
  const visibleCards = useMemo(() => {
    return items.slice(currentIndex, currentIndex + 3)
  }, [items, currentIndex])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F5F5F7]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-indigo-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-[#F5F5F7] border-b border-gray-200 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <Zap size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Content Lots</h1>
        </div>

        <div className="flex items-center gap-3">
          {swipedCount > 0 && (
            <button
              onClick={handleUndo}
              disabled={undoMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-colors disabled:opacity-50"
            >
              <Undo2 size={14} />
              Undo
            </button>
          )}
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            {remaining} of {totalLoaded}
          </span>
        </div>
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-hidden">
        {remaining === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Inbox size={32} className="text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">All caught up!</h2>
            <p className="text-sm text-gray-500 max-w-xs">
              No more content to review. New items will appear after the next RSS poll.
            </p>
            {swipedCount > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Reviewed {swipedCount} items this session
              </p>
            )}
          </div>
        ) : (
          <div className="relative w-full max-w-md mx-auto" style={{ height: '420px' }}>
            {visibleCards.map((item, idx) => (
              <SwipeCard
                key={item.id}
                item={item}
                isTop={idx === 0}
                stackIndex={idx}
                onSwipe={handleSwipe}
              />
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {remaining > 0 && (
          <div className="flex items-center gap-6 mt-6">
            <button
              onClick={() => handleSwipe('left')}
              className="w-14 h-14 bg-white rounded-full border-2 border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all shadow-sm active:scale-95"
              title="Reject (← / j)"
            >
              <X size={24} />
            </button>

            <button
              onClick={() => handleSwipe('up')}
              className="w-12 h-12 bg-white rounded-full border-2 border-blue-200 flex items-center justify-center text-blue-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition-all shadow-sm active:scale-95"
              title="Super Like (↑ / l)"
            >
              <Rocket size={20} />
            </button>

            <button
              onClick={() => handleSwipe('right')}
              className="w-14 h-14 bg-white rounded-full border-2 border-green-200 flex items-center justify-center text-green-400 hover:bg-green-50 hover:border-green-300 hover:text-green-500 transition-all shadow-sm active:scale-95"
              title="Approve (→ / k)"
            >
              <Check size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
