'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Bot, Loader2, Check, ExternalLink, Zap, Settings2 } from 'lucide-react'
import { useConnectTelegram } from '@/hooks/useAnyChat'

interface ConnectTelegramModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Mode = null | 'shared' | 'personal'
type Step = 'choose' | 'token' | 'verifying' | 'start'

export default function ConnectTelegramModal({ isOpen, onClose, onSuccess }: ConnectTelegramModalProps) {
  const [mode, setMode] = useState<Mode>(null)
  const [step, setStep] = useState<Step>('choose')
  const [botToken, setBotToken] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [linkCode, setLinkCode] = useState('')
  const [error, setError] = useState('')
  const connectMutation = useConnectTelegram()

  if (!isOpen || typeof window === 'undefined') return null

  const reset = () => {
    setMode(null)
    setStep('choose')
    setBotToken('')
    setBotUsername('')
    setLinkCode('')
    setError('')
  }

  const handleClose = () => {
    if (step === 'verifying') return
    reset()
    onClose()
  }

  const handleDone = () => {
    reset()
    onSuccess?.()
    onClose()
  }

  // ---- Shared Bot Flow ----
  const handleConnectShared = async () => {
    setError('')
    setStep('verifying')
    setMode('shared')

    try {
      const result = await connectMutation.mutateAsync({ mode: 'shared' })
      setBotUsername(result.bot_username)
      setLinkCode(result.link_code || '')
      setStep('start')
    } catch (err: any) {
      setError(err.message || 'Failed to connect')
      setStep('choose')
    }
  }

  // ---- Personal Bot Flow ----
  const handleConnectPersonal = async () => {
    if (!botToken.trim()) return
    setError('')
    setStep('verifying')
    setMode('personal')

    try {
      const result = await connectMutation.mutateAsync({ mode: 'personal', bot_token: botToken.trim() })
      setBotUsername(result.bot_username)
      setStep('start')
    } catch (err: any) {
      setError(err.message || 'Failed to connect')
      setStep('token')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Connect Telegram</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Step: Choose Mode */}
          {step === 'choose' && (
            <div className="space-y-3 mt-3">
              <p className="text-sm text-gray-500 mb-4">Choose how to connect Telegram:</p>

              {/* Option 1: SEO OS Bot (Quick) */}
              <button
                onClick={handleConnectShared}
                className="w-full flex items-start gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl hover:border-emerald-400 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Zap size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">SEO OS Bot</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Quick setup — use the official SEO OS bot. Just click and send /start.
                  </p>
                  <span className="inline-block mt-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
              </button>

              {/* Option 2: Personal Bot */}
              <button
                onClick={() => { setMode('personal'); setStep('token') }}
                className="w-full flex items-start gap-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Settings2 size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Personal Bot</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Create your own bot via @BotFather and enter the token. Full control.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Step: Enter Personal Bot Token */}
          {step === 'token' && mode === 'personal' && (
            <div className="space-y-4 mt-2">
              <button
                onClick={() => { setStep('choose'); setMode(null); setError('') }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                &larr; Back
              </button>

              <div className="text-sm text-gray-500">
                <p className="mb-2">Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">@BotFather <ExternalLink size={12} /></a>:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-400">
                  <li>Open @BotFather in Telegram</li>
                  <li>Send <code className="bg-gray-100 px-1 rounded">/newbot</code></li>
                  <li>Follow the steps and copy the token</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Bot Token</label>
                <input
                  type="text"
                  value={botToken}
                  onChange={e => setBotToken(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConnectPersonal() }}
                  placeholder="123456:ABC-DEF1234..."
                  autoFocus
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                onClick={handleConnectPersonal}
                disabled={!botToken.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-sm rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect Bot
              </button>
            </div>
          )}

          {/* Step: Verifying */}
          {step === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 size={32} className="text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">
                {mode === 'shared' ? 'Setting up SEO OS Bot...' : 'Verifying bot token...'}
              </p>
            </div>
          )}

          {/* Step: Send /start */}
          {step === 'start' && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-center py-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${mode === 'shared' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                  <Bot size={32} className={mode === 'shared' ? 'text-emerald-500' : 'text-blue-500'} />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  {mode === 'shared' ? 'Almost done!' : 'Bot connected!'}
                </p>
                <p className="text-sm text-gray-500">
                  {mode === 'shared' && linkCode ? (
                    <>Send this command to the bot:</>
                  ) : (
                    <>Send <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">/start</code> to your bot:</>
                  )}
                </p>

                {/* Link code for shared bot */}
                {mode === 'shared' && linkCode && (
                  <div className="bg-gray-900 text-emerald-400 rounded-xl px-4 py-3 font-mono text-sm select-all cursor-pointer"
                    onClick={() => navigator.clipboard.writeText(`/start ${linkCode}`)}
                    title="Click to copy"
                  >
                    /start {linkCode}
                  </div>
                )}

                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    mode === 'shared'
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  Open @{botUsername}
                  <ExternalLink size={14} />
                </a>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700">
                  {mode === 'shared' && linkCode
                    ? `After sending /start ${linkCode} to the bot, it will link to your account. You can close this dialog.`
                    : 'After sending /start, the bot will know your chat ID and can send you messages. You can close this dialog.'}
                </p>
              </div>

              <button
                onClick={handleDone}
                className={`w-full py-2.5 text-white font-semibold text-sm rounded-xl hover:shadow-lg transition-all ${
                  mode === 'shared'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Check size={16} />
                  Done
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
