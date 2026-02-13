'use client'

import React from 'react'
import { X, Rocket, Globe, Server, Shield, Zap } from 'lucide-react'

interface DeploymentTeaserProps {
  onClose: () => void
}

const FEATURES = [
  { icon: Globe, label: 'WordPress Provisioning', desc: 'One-click WordPress site setup with optimized hosting' },
  { icon: Server, label: 'Custom SEO CMS', desc: 'Deploy lightweight, SEO-first CMS sites on the edge' },
  { icon: Shield, label: 'SSL & CDN', desc: 'Auto-configured HTTPS and global CDN for fast page loads' },
  { icon: Zap, label: 'Auto-Connect', desc: 'Deployed sites automatically connect to SEO OS for monitoring' },
]

export default function DeploymentTeaser({ onClose }: DeploymentTeaserProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Rocket size={18} className="text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Deploy a New Site</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <Rocket size={32} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Coming Soon</h3>
            <p className="text-sm text-gray-500">
              Deploy and manage WordPress sites or custom SEO CMS instances directly from SEO OS.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon size={16} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
            <p className="text-xs font-semibold text-indigo-700">
              This feature is under active development. Stay tuned!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
