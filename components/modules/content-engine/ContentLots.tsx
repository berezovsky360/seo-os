'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  ChevronLeft, Undo2, X, Check, Rocket, Inbox, Loader2,
  Star, TrendingUp, Zap, ListChecks, ExternalLink,
  ArrowRight, ChevronDown, ChevronUp, Rss, SlidersHorizontal,
  Shuffle, ArrowDownNarrowWide, ArrowUpNarrowWide, Trophy,
  Plus, Trash2, RefreshCw, Newspaper,
} from 'lucide-react'
import {
  useSwipeableItems, useSwipe, useUndoSwipe, SwipeableItem,
  useSwipeDecisions, useUpdateSwipeDirection,
  type SwipeDecision, type DecisionsByFeed, type SwipeFilter,
} from '@/hooks/useContentLots'
import { useContentFeeds, useCreateFeed, useDeleteFeed, usePollFeed } from '@/hooks/useContentEngine'

interface ContentLotsProps {
  onBack: () => void
}

type View = 'swipe' | 'decisions'

// ====== Helper: strip HTML and truncate ======

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#?\w+;/g, '').trim()
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '...'
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

  // Content preview — strip HTML, truncate
  const contentPreview = useMemo(() => {
    if (!item.content) return null
    const plain = stripHtml(item.content)
    if (!plain) return null
    return truncateText(plain, 200)
  }, [item.content])

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

        {/* Cover image */}
        <div className="h-40 flex-shrink-0 overflow-hidden relative">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.target as HTMLImageElement
                el.style.display = 'none'
                el.parentElement!.classList.add('bg-gradient-to-br', 'from-indigo-100', 'to-purple-50')
                const icon = el.parentElement!.querySelector('.placeholder-icon')
                if (icon) (icon as HTMLElement).style.display = 'flex'
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-50" />
          )}
          <div
            className="placeholder-icon absolute inset-0 items-center justify-center pointer-events-none"
            style={{ display: item.image_url ? 'none' : 'flex' }}
          >
            <Newspaper size={36} className="text-indigo-300/60" />
          </div>
        </div>

        {/* Card content */}
        <div className="p-5 flex-1 flex flex-col overflow-hidden">
          {/* Header: Feed + time */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 truncate max-w-[60%]">
              {item.feed_name || 'Unknown feed'}
            </span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 mb-2">
            {item.title}
          </h3>

          {/* Content Preview */}
          {contentPreview && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-2">
              {contentPreview}
            </p>
          )}

          {/* Scores */}
          <div className="flex items-center gap-4 mb-2">
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
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2 italic">
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

// ====== Decisions View ======

function DecisionsView() {
  const { data, isLoading } = useSwipeDecisions()
  const updateDirection = useUpdateSwipeDirection()
  const [directionFilter, setDirectionFilter] = useState<'all' | 'right' | 'up' | 'left'>('all')
  const [collapsedFeeds, setCollapsedFeeds] = useState<Set<string>>(new Set())

  const feeds = data?.feeds || []

  const filteredFeeds = useMemo(() => {
    if (directionFilter === 'all') return feeds
    return feeds
      .map(f => ({
        ...f,
        decisions: f.decisions.filter(d => d.direction === directionFilter),
      }))
      .filter(f => f.decisions.length > 0)
  }, [feeds, directionFilter])

  const counts = useMemo(() => {
    const all = data?.decisions || []
    return {
      total: all.length,
      approved: all.filter(d => d.direction === 'right').length,
      superLiked: all.filter(d => d.direction === 'up').length,
      rejected: all.filter(d => d.direction === 'left').length,
    }
  }, [data])

  const toggleFeedCollapse = (feedId: string) => {
    setCollapsedFeeds(prev => {
      const next = new Set(prev)
      if (next.has(feedId)) next.delete(feedId)
      else next.add(feedId)
      return next
    })
  }

  const handleChangeDirection = (decisionId: string, newDirection: 'left' | 'right' | 'up') => {
    updateDirection.mutate({ decision_id: decisionId, new_direction: newDirection })
  }

  const directionLabel = (d: string) => {
    if (d === 'right') return 'Approved'
    if (d === 'up') return 'Super Liked'
    return 'Rejected'
  }

  const directionStyle = (d: string) => {
    if (d === 'right') return 'bg-green-100 text-green-700'
    if (d === 'up') return 'bg-blue-100 text-blue-700'
    return 'bg-red-100 text-red-700'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 sm:px-6 py-4 overflow-auto flex-1">
      {/* Stats bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setDirectionFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            directionFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({counts.total})
        </button>
        <button
          onClick={() => setDirectionFilter('right')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            directionFilter === 'right' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          <span className="flex items-center gap-1"><Check size={12} /> Approved ({counts.approved})</span>
        </button>
        <button
          onClick={() => setDirectionFilter('up')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            directionFilter === 'up' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          <span className="flex items-center gap-1"><Rocket size={12} /> Super Liked ({counts.superLiked})</span>
        </button>
        <button
          onClick={() => setDirectionFilter('left')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            directionFilter === 'left' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <span className="flex items-center gap-1"><X size={12} /> Rejected ({counts.rejected})</span>
        </button>
      </div>

      {filteredFeeds.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListChecks size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No decisions yet</p>
          <p className="text-xs mt-1">Swipe content to start building your decisions list</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeeds.map((feed) => (
            <div key={feed.feed_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Feed header */}
              <button
                onClick={() => toggleFeedCollapse(feed.feed_id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Rss size={14} className="text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-900">{feed.feed_name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {feed.decisions.length}
                  </span>
                </div>
                {collapsedFeeds.has(feed.feed_id) ? (
                  <ChevronDown size={14} className="text-gray-400" />
                ) : (
                  <ChevronUp size={14} className="text-gray-400" />
                )}
              </button>

              {/* Decision items */}
              {!collapsedFeeds.has(feed.feed_id) && (
                <div className="border-t border-gray-100">
                  {feed.decisions.map((d) => (
                    <DecisionRow
                      key={d.id}
                      decision={d}
                      onChangeDirection={handleChangeDirection}
                      isUpdating={updateDirection.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ====== Decision Row ======

function DecisionRow({
  decision,
  onChangeDirection,
  isUpdating,
}: {
  decision: SwipeDecision
  onChangeDirection: (id: string, dir: 'left' | 'right' | 'up') => void
  isUpdating: boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const contentPreview = useMemo(() => {
    if (!decision.item_content) return null
    const plain = stripHtml(decision.item_content)
    if (!plain) return null
    return truncateText(plain, 300)
  }, [decision.item_content])

  const directionStyle = (d: string) => {
    if (d === 'right') return 'bg-green-100 text-green-700'
    if (d === 'up') return 'bg-blue-100 text-blue-700'
    return 'bg-red-100 text-red-700'
  }

  const directionLabel = (d: string) => {
    if (d === 'right') return 'Approved'
    if (d === 'up') return 'Super Liked'
    return 'Rejected'
  }

  const otherDirections = (['right', 'up', 'left'] as const).filter(d => d !== decision.direction)

  return (
    <div className="border-b border-gray-50 last:border-b-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Thumbnail */}
        {decision.item_image_url && (
          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={decision.item_image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
            />
          </div>
        )}

        {/* Title + preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{decision.item_title}</p>
            {decision.item_score != null && (
              <span className="flex-shrink-0 text-xs font-bold text-gray-500">{Math.round(decision.item_score)}</span>
            )}
          </div>
          {!expanded && contentPreview && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{contentPreview.slice(0, 100)}</p>
          )}
        </div>

        {/* Direction badge */}
        <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${directionStyle(decision.direction)}`}>
          {directionLabel(decision.direction)}
        </span>

        {/* Move actions */}
        <div className="flex-shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {showActions ? (
            <>
              {otherDirections.map(dir => (
                <button
                  key={dir}
                  onClick={() => { onChangeDirection(decision.id, dir); setShowActions(false) }}
                  disabled={isUpdating}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                    dir === 'right' ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : dir === 'up' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                  title={`Move to ${directionLabel(dir)}`}
                >
                  {dir === 'right' && <Check size={12} />}
                  {dir === 'up' && <Rocket size={12} />}
                  {dir === 'left' && <X size={12} />}
                </button>
              ))}
              <button
                onClick={() => setShowActions(false)}
                className="px-1.5 py-1 text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowActions(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Move to different category"
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && contentPreview && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
            {contentPreview}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {decision.item_published_at && (
              <span>{new Date(decision.item_published_at).toLocaleDateString()}</span>
            )}
            {decision.item_url && (
              <a
                href={decision.item_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-500 hover:underline"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={10} />
                Source
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ====== ContentLots (main) ======

export default function ContentLots({ onBack }: ContentLotsProps) {
  const [view, setView] = useState<View>('swipe')
  const [showSettings, setShowSettings] = useState(false)

  // Feed filter + sort + management
  const { data: allFeeds = [] } = useContentFeeds()
  const createFeed = useCreateFeed()
  const deleteFeed = useDeleteFeed()
  const pollFeed = usePollFeed()
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>([]) // empty = all
  const [sortOrder, setSortOrder] = useState<SwipeFilter['sort']>('score')
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedName, setNewFeedName] = useState('')

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return
    const name = newFeedName.trim() || new URL(newFeedUrl.trim()).hostname
    await createFeed.mutateAsync({ name, feed_url: newFeedUrl.trim() })
    setNewFeedUrl('')
    setNewFeedName('')
    setShowAddFeed(false)
  }

  const handleDeleteFeed = (feedId: string) => {
    if (!confirm('Delete this feed and all its items?')) return
    deleteFeed.mutate(feedId)
  }

  const filter: SwipeFilter | undefined = useMemo(() => {
    const f: SwipeFilter = {}
    if (selectedFeedIds.length > 0) f.feedIds = selectedFeedIds
    if (sortOrder && sortOrder !== 'score') f.sort = sortOrder
    return (f.feedIds || f.sort) ? f : undefined
  }, [selectedFeedIds, sortOrder])

  const { data: items = [], isLoading } = useSwipeableItems(filter)
  const swipeMutation = useSwipe()
  const undoMutation = useUndoSwipe()
  const [currentIndex, setCurrentIndex] = useState(0)

  // Track total swiped for counter
  const [swipedCount, setSwipedCount] = useState(0)

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0)
    setSwipedCount(0)
  }, [selectedFeedIds, sortOrder])

  const toggleFeedFilter = (feedId: string) => {
    setSelectedFeedIds(prev =>
      prev.includes(feedId) ? prev.filter(id => id !== feedId) : [...prev, feedId]
    )
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (view !== 'swipe') return
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
  }, [currentIndex, items.length, view]) // eslint-disable-line react-hooks/exhaustive-deps

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
          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <button
              onClick={() => setView('swipe')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'swipe' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Swipe
            </button>
            <button
              onClick={() => setView('decisions')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                view === 'decisions' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ListChecks size={12} />
              Decisions
            </button>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 text-sm bg-white px-3 py-1.5 rounded-lg border shadow-sm transition-colors ${
              showSettings || selectedFeedIds.length > 0
                ? 'border-indigo-300 text-indigo-600'
                : 'border-gray-200 text-gray-500 hover:text-gray-900'
            }`}
          >
            <SlidersHorizontal size={14} />
            {selectedFeedIds.length > 0 && (
              <span className="w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {selectedFeedIds.length}
              </span>
            )}
          </button>

          {view === 'swipe' && swipedCount > 0 && (
            <button
              onClick={handleUndo}
              disabled={undoMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-colors disabled:opacity-50"
            >
              <Undo2 size={14} />
              Undo
            </button>
          )}
          {view === 'swipe' && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
              {remaining} of {totalLoaded}
            </span>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0 space-y-3">
          {/* Sort order */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Sort Order</label>
            <div className="flex items-center gap-1.5">
              {([
                { value: 'score', label: 'Best Score', icon: Trophy },
                { value: 'newest', label: 'Newest First', icon: ArrowDownNarrowWide },
                { value: 'oldest', label: 'Oldest First', icon: ArrowUpNarrowWide },
                { value: 'random', label: 'Random', icon: Shuffle },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortOrder(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortOrder === opt.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <opt.icon size={12} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed filter + management */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RSS Feeds</label>
              <div className="flex items-center gap-2">
                {selectedFeedIds.length > 0 && (
                  <button
                    onClick={() => setSelectedFeedIds([])}
                    className="text-[10px] text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    Clear filter
                  </button>
                )}
                <button
                  onClick={() => setShowAddFeed(!showAddFeed)}
                  className="flex items-center gap-1 text-[10px] text-indigo-600 font-medium hover:text-indigo-700"
                >
                  <Plus size={10} />
                  Add Feed
                </button>
              </div>
            </div>

            {/* Add feed inline form */}
            {showAddFeed && (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Feed URL (https://...)"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFeed()}
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  className="w-36 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFeed()}
                />
                <button
                  onClick={handleAddFeed}
                  disabled={!newFeedUrl.trim() || createFeed.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {createFeed.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
                </button>
                <button
                  onClick={() => { setShowAddFeed(false); setNewFeedUrl(''); setNewFeedName('') }}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Feed list */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedFeedIds([])}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedFeedIds.length === 0
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Feeds
              </button>
              {(allFeeds as any[]).map((feed: any) => (
                <div key={feed.id} className="flex items-center gap-0.5 group">
                  <button
                    onClick={() => toggleFeedFilter(feed.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-l-lg text-xs font-medium transition-colors ${
                      selectedFeedIds.includes(feed.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Rss size={10} />
                    {feed.name}
                  </button>
                  <button
                    onClick={() => pollFeed.mutate(feed.id)}
                    disabled={pollFeed.isPending}
                    className="p-1.5 bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-600 rounded-none text-xs transition-colors disabled:opacity-50"
                    title="Poll feed now"
                  >
                    <RefreshCw size={10} className={pollFeed.isPending ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    disabled={deleteFeed.isPending}
                    className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-r-lg text-xs transition-colors disabled:opacity-50"
                    title="Delete feed"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>

            {(allFeeds as any[]).length === 0 && !showAddFeed && (
              <p className="text-xs text-gray-400 mt-2">No feeds yet. Click &quot;Add Feed&quot; to add an RSS source.</p>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {view === 'decisions' ? (
        <DecisionsView />
      ) : (
        <>
          {/* Card Stack */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-hidden">
            {remaining === 0 ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Inbox size={32} className="text-gray-300" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {(allFeeds as any[]).length === 0 ? 'No RSS feeds yet' : 'All caught up!'}
                </h2>
                <p className="text-sm text-gray-500 max-w-xs">
                  {(allFeeds as any[]).length === 0
                    ? 'Add an RSS feed to start discovering content.'
                    : 'No more content to review. New items will appear after the next RSS poll.'}
                </p>
                {(allFeeds as any[]).length === 0 ? (
                  <button
                    onClick={() => { setShowSettings(true); setShowAddFeed(true) }}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={14} />
                    Add RSS Feed
                  </button>
                ) : (
                  <>
                    {swipedCount > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        Reviewed {swipedCount} items this session
                      </p>
                    )}
                    <button
                      onClick={() => setView('decisions')}
                      className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <ListChecks size={14} />
                      View Decisions
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="relative w-full max-w-md mx-auto" style={{ height: '520px' }}>
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
        </>
      )}
    </div>
  )
}
