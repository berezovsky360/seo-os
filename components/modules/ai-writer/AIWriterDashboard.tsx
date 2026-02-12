'use client'

import React, { useState } from 'react'
import {
  ChevronLeft, Sparkles, Key, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Zap, FileText, Type, AlignLeft, RefreshCw, ExternalLink,
  BarChart3, Coins, Clock, Activity,
} from 'lucide-react'
import { useApiKeys, useValidateApiKey } from '@/hooks/useApiKeys'
import {
  useAIWriterSettings, useUpdateAIWriterModel, useAIUsageStats, useTestAIWriter,
} from '@/hooks/useAIWriter'
import { getAvailableModels } from '@/lib/modules/ai-writer/pricing'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/contexts/ToastContext'

interface AIWriterDashboardProps {
  onBack?: () => void
}

const FEATURES = [
  { icon: Type, label: 'SEO Title Generation', description: 'Generate 3 optimized title options per post with keyword placement' },
  { icon: AlignLeft, label: 'Meta Descriptions', description: 'Action-driven meta descriptions with keyword integration' },
  { icon: FileText, label: 'Full Article Generation', description: 'Generate complete SEO-optimized articles from a topic' },
  { icon: Sparkles, label: 'AI Text Editing', description: 'Improve, simplify, proofread, expand, or condense selected text' },
]

const AVAILABLE_MODELS = getAvailableModels()

export default function AIWriterDashboard({ onBack }: AIWriterDashboardProps) {
  const router = useRouter()
  const { data: apiKeys = [], isLoading: keysLoading } = useApiKeys()
  const validateKey = useValidateApiKey()
  const toast = useToast()

  const { data: settings } = useAIWriterSettings()
  const updateModel = useUpdateAIWriterModel()
  const testWriter = useTestAIWriter()

  const [usagePeriod, setUsagePeriod] = useState<'7d' | '30d' | 'all'>('30d')
  const { data: usageStats, isLoading: usageLoading } = useAIUsageStats(usagePeriod)

  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const currentModel = settings?.model || 'gemini-2.5-flash'
  const geminiKey = apiKeys.find(k => k.key_type === 'gemini')
  const isKeyValid = geminiKey?.is_valid === true
  const hasKey = !!geminiKey

  const handleValidateKey = async () => {
    try {
      const result = await validateKey.mutateAsync('gemini')
      if (result.valid) {
        toast.success('Gemini API key is valid')
      } else {
        toast.warning(`Validation failed: ${result.error || 'Invalid key'}`)
      }
    } catch {
      toast.error('Validation request failed')
    }
  }

  const handleSelectModel = async (modelId: string) => {
    if (modelId === currentModel) return
    try {
      await updateModel.mutateAsync({ model: modelId })
      toast.success(`Model changed to ${modelId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save model')
    }
  }

  const handleTestGeneration = async () => {
    setTestResult(null)
    try {
      const data = await testWriter.mutateAsync()
      setTestResult({ ok: true, message: data.message || 'Generation test passed' })
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Connection failed' })
    }
  }

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(2)}`
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
    return String(tokens)
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-600" />
            <h1 className="text-lg font-bold text-gray-900">AI Writer</h1>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-4xl space-y-8">

        {/* API Key Status */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Key size={16} />
            API Key Status
          </h2>
          <div className={`bg-white rounded-xl border p-5 ${
            isKeyValid ? 'border-green-200' : hasKey ? 'border-amber-200' : 'border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {keysLoading ? (
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                ) : isKeyValid ? (
                  <CheckCircle2 size={18} className="text-green-500" />
                ) : hasKey ? (
                  <AlertTriangle size={18} className="text-amber-500" />
                ) : (
                  <XCircle size={18} className="text-red-500" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">Google Gemini API Key</p>
                  <p className="text-xs text-gray-500">
                    {keysLoading ? 'Loading...' :
                      isKeyValid ? `Connected ${geminiKey?.masked_value ? `(${geminiKey.masked_value})` : ''}` :
                      hasKey ? (geminiKey?.validation_error || 'Key not validated') :
                      'No API key configured'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasKey && (
                  <button
                    onClick={handleValidateKey}
                    disabled={validateKey.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {validateKey.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Validate
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard/keys')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Key size={12} />
                  {hasKey ? 'Manage Keys' : 'Add Key'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Model Selection */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles size={16} />
            Model Selection
          </h2>
          <div className="space-y-3">
            {AVAILABLE_MODELS.map(model => {
              const isActive = model.id === currentModel
              return (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  disabled={updateModel.isPending}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                    isActive
                      ? 'border-indigo-300 ring-2 ring-indigo-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isActive ? 'border-indigo-600' : 'border-gray-300'
                      }`}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{model.label}</p>
                          {isActive && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-gray-400">
                            Input: {model.inputPrice}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Output: {model.outputPrice}
                          </span>
                        </div>
                      </div>
                    </div>
                    <code className="text-[11px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">
                      {model.id}
                    </code>
                  </div>
                </button>
              )
            })}
          </div>
          {updateModel.isPending && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Loader2 size={12} className="animate-spin" />
              Saving model preference...
            </div>
          )}
        </section>

        {/* Usage Stats */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={16} />
              Usage & Costs
            </h2>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['7d', '30d', 'all'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setUsagePeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    usagePeriod === p
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-blue-500" />
                <span className="text-[11px] font-medium text-gray-500 uppercase">Requests</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {usageLoading ? '—' : usageStats?.total_requests ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-amber-500" />
                <span className="text-[11px] font-medium text-gray-500 uppercase">Tokens</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {usageLoading ? '—' : formatTokens(usageStats?.total_tokens ?? 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Coins size={14} className="text-green-500" />
                <span className="text-[11px] font-medium text-gray-500 uppercase">Cost</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {usageLoading ? '—' : formatCost(usageStats?.total_cost ?? 0)}
              </p>
            </div>
          </div>

          {/* Per-model breakdown */}
          {usageStats?.model_breakdown && Object.keys(usageStats.model_breakdown).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-3 uppercase">Per-Model Breakdown</p>
              <div className="space-y-2">
                {Object.entries(usageStats.model_breakdown).map(([model, stats]) => {
                  const pct = usageStats.total_requests > 0
                    ? (stats.requests / usageStats.total_requests) * 100
                    : 0
                  return (
                    <div key={model}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{model}</span>
                        <span className="text-gray-500">
                          {stats.requests} req · {formatTokens(stats.tokens)} tokens · {formatCost(stats.cost)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Requests */}
          {usageStats?.recent && usageStats.recent.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-600 uppercase">Recent Requests</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Action</th>
                      <th className="px-4 py-2 font-medium">Model</th>
                      <th className="px-4 py-2 font-medium text-right">Tokens</th>
                      <th className="px-4 py-2 font-medium text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageStats.recent.map(entry => (
                      <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-medium text-gray-700">
                            {entry.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 font-mono">{entry.model}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatTokens(entry.total_tokens)}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatCost(entry.estimated_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!usageLoading && (!usageStats?.recent || usageStats.recent.length === 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <BarChart3 size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No usage data yet. Generate some content to see stats here.</p>
            </div>
          )}
        </section>

        {/* Connection Test */}
        {hasKey && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Zap size={16} />
              Connection Test
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-600 mb-3">
                Test connection to Gemini using the selected model ({currentModel}).
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestGeneration}
                  disabled={testWriter.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {testWriter.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Testing...</>
                  ) : (
                    <><Zap size={14} /> Run Test</>
                  )}
                </button>
                {testResult && (
                  <div className={`flex items-center gap-2 text-sm font-medium ${
                    testResult.ok ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Capabilities */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-3">Capabilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map(feature => (
              <div key={feature.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <feature.icon size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{feature.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* External Link */}
        <section className="pb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-600">
              View detailed billing in the{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
              >
                Google AI Studio dashboard
                <ExternalLink size={11} />
              </a>
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
