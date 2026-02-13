'use client'

import React, { useState, useCallback } from 'react'
import {
  Rocket,
  Plus,
  ChevronLeft,
  Loader2,
  Globe,
  Trash2,
  Save,
  X,
  Copy,
  Check,
  Shield,
  Cloud,
  Server,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Zap,
  BarChart3,
  Settings,
  Link2,
} from 'lucide-react'
import {
  useLandingSites,
  useLandingSite,
  useCreateLandingSite,
  useUpdateLandingSite,
  useDeleteLandingSite,
  useBuildSite,
  useUpdateSiteInfra,
} from '@/hooks/useLandingEngine'
import PulseAnalytics from '@/components/modules/conversion-lab/PulseAnalytics'

// ====== Types ======

type Tab = 'general' | 'domain' | 'deploy' | 'analytics'

interface Props {
  onBack?: () => void
}

interface LandingSite {
  id: string
  name: string
  domain: string | null
  subdomain: string | null
  slug: string | null
  config: Record<string, any> | null
  is_published: boolean
  r2_bucket: string | null
  r2_endpoint: string | null
  deploy_mode: string | null
  cf_hostname_id: string | null
  domain_status: string | null
  domain_dns_records: any[] | null
  pulse_enabled: boolean
  template: string | null
  template_id: string | null
  nav_links: any[] | null
  footer_html: string | null
  analytics_id: string | null
  last_built_at: string | null
  created_at: string | null
  landing_templates?: { id: string; name: string; slug: string } | null
  [key: string]: any
}

// ====== Helpers ======

function statusBadge(status: string | null) {
  if (!status) return { bg: 'bg-gray-50', text: 'text-gray-500', label: 'Not configured' }
  switch (status) {
    case 'active':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Active' }
    case 'ssl_pending':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'SSL Pending' }
    case 'pending':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' }
    case 'error':
      return { bg: 'bg-red-50', text: 'text-red-700', label: 'Error' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-500', label: status }
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check size={14} className="text-emerald-500" />
      ) : (
        <Copy size={14} className="text-gray-400" />
      )}
    </button>
  )
}

// ====== Create Site Modal ======

function CreateSiteModal({
  onClose,
  onCreate,
  isCreating,
}: {
  onClose: () => void
  onCreate: (data: { name: string; template_id?: string }) => void
  isCreating: boolean
}) {
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create Landing Site</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Site Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Landing Page"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Template ID (optional)
            </label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="e.g. template-uuid"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({ name: name || 'My Site', template_id: templateId || undefined })}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isCreating && <Loader2 size={14} className="animate-spin" />}
            Create Site
          </button>
        </div>
      </div>
    </div>
  )
}

// ====== Delete Confirmation Modal ======

function DeleteConfirmModal({
  siteName,
  onClose,
  onConfirm,
  isDeleting,
}: {
  siteName: string
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Delete Site</h2>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{siteName}</strong>? This action cannot be undone.
            All pages and configurations will be permanently removed.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            Delete Site
          </button>
        </div>
      </div>
    </div>
  )
}

// ====== General Tab ======

function GeneralTab({ site, onSave, isSaving }: { site: LandingSite; onSave: (updates: Record<string, any>) => void; isSaving: boolean }) {
  const [name, setName] = useState(site.name || '')
  const [domain, setDomain] = useState(site.domain || '')
  const [subdomain, setSubdomain] = useState(site.subdomain || '')
  const [isPublished, setIsPublished] = useState(site.is_published || false)
  const [navLinks, setNavLinks] = useState(JSON.stringify(site.nav_links || [], null, 2))
  const [footerHtml, setFooterHtml] = useState(site.footer_html || '')
  const [analyticsId, setAnalyticsId] = useState(site.analytics_id || '')

  const handleSave = () => {
    let parsedNavLinks: any[] = []
    try {
      parsedNavLinks = JSON.parse(navLinks)
    } catch {
      parsedNavLinks = site.nav_links || []
    }
    onSave({
      name,
      domain: domain || null,
      subdomain: subdomain || null,
      is_published: isPublished,
      nav_links: parsedNavLinks,
      footer_html: footerHtml || null,
      analytics_id: analyticsId || null,
    })
  }

  return (
    <div className="space-y-6">
      {/* Site Name */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Site Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Domain */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Domain
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Subdomain
          </label>
          <input
            type="text"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            placeholder="my-site"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Published Toggle */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">Published</div>
          <div className="text-xs text-gray-500 mt-0.5">Make this site publicly accessible</div>
        </div>
        <button
          onClick={() => setIsPublished(!isPublished)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isPublished ? 'bg-indigo-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              isPublished ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Nav Links */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Nav Links (JSON)
        </label>
        <textarea
          value={navLinks}
          onChange={(e) => setNavLinks(e.target.value)}
          rows={4}
          placeholder='[{"label":"Home","href":"/"},{"label":"About","href":"/about"}]'
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Footer HTML */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Footer HTML
        </label>
        <textarea
          value={footerHtml}
          onChange={(e) => setFooterHtml(e.target.value)}
          rows={3}
          placeholder="<p>&copy; 2026 My Company</p>"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Analytics ID */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Analytics ID
        </label>
        <input
          type="text"
          value={analyticsId}
          onChange={(e) => setAnalyticsId(e.target.value)}
          placeholder="G-XXXXXXXXXX"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>
    </div>
  )
}

// ====== Domain Hub Tab ======

function DomainHubTab({
  site,
  onUpdateInfra,
  isSavingInfra,
}: {
  site: LandingSite
  onUpdateInfra: (updates: Record<string, any>) => void
  isSavingInfra: boolean
}) {
  const [customDomain, setCustomDomain] = useState(site.domain || '')
  const badge = statusBadge(site.domain_status)
  const dnsRecords: any[] = site.domain_dns_records || []

  const handleConnectDomain = () => {
    onUpdateInfra({
      domain: customDomain || null,
      domain_status: 'pending',
    })
  }

  const handleVerifyDomain = () => {
    onUpdateInfra({
      domain_status: 'pending',
    })
  }

  const handleRemoveDomain = () => {
    onUpdateInfra({
      domain: null,
      domain_status: null,
      cf_hostname_id: null,
      domain_dns_records: null,
    })
  }

  return (
    <div className="space-y-6">
      {/* Domain Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-900">Domain Status</h3>
          </div>
          <span className={`${badge.bg} ${badge.text} px-2 py-0.5 rounded-full text-xs font-medium`}>
            {badge.label}
          </span>
        </div>
        {site.domain ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">{site.domain}</span>
            {site.domain_status === 'active' && (
              <a
                href={`https://${site.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:text-indigo-600"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No custom domain configured</p>
        )}
      </div>

      {/* Connect Custom Domain */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Custom Domain</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="landing.example.com"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleConnectDomain}
            disabled={!customDomain || isSavingInfra}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {isSavingInfra ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Connect Domain
          </button>
        </div>
      </div>

      {/* DNS Instructions */}
      {site.domain && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-1">DNS Configuration</h3>
          <p className="text-xs text-gray-500 mb-4">
            Add these records to your DNS provider to connect your domain.
          </p>

          {dnsRecords.length > 0 ? (
            <div className="space-y-3">
              {dnsRecords.map((record: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100"
                >
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                    {record.type || 'CNAME'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">Name</div>
                    <div className="text-sm font-mono text-gray-800 truncate">{record.name || site.domain}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">Value</div>
                    <div className="text-sm font-mono text-gray-800 truncate">{record.value || record.content || ''}</div>
                  </div>
                  <CopyButton text={record.value || record.content || ''} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Default CNAME record */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                  CNAME
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Name</div>
                  <div className="text-sm font-mono text-gray-800 truncate">{site.domain}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Value</div>
                  <div className="text-sm font-mono text-gray-800 truncate">
                    {site.subdomain ? `${site.subdomain}.r2.dev` : 'your-bucket.r2.dev'}
                  </div>
                </div>
                <CopyButton text={site.subdomain ? `${site.subdomain}.r2.dev` : 'your-bucket.r2.dev'} />
              </div>
            </div>
          )}

          {/* SSL Status */}
          <div className="flex items-center gap-2 mt-4 px-1">
            <Shield size={14} className={site.domain_status === 'active' ? 'text-emerald-500' : 'text-gray-300'} />
            <span className="text-xs text-gray-500">
              SSL: {site.domain_status === 'active' ? 'Active (managed by Cloudflare)' : site.domain_status === 'ssl_pending' ? 'Provisioning...' : 'Waiting for domain verification'}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {site.domain && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleVerifyDomain}
            disabled={isSavingInfra}
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {isSavingInfra ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Verify Domain
          </button>
          <button
            onClick={handleRemoveDomain}
            disabled={isSavingInfra}
            className="px-4 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} />
            Remove Domain
          </button>
        </div>
      )}
    </div>
  )
}

// ====== Deploy Tab ======

function DeployTab({
  site,
  onUpdateInfra,
  onBuild,
  isSavingInfra,
  isBuilding,
  buildResult,
}: {
  site: LandingSite
  onUpdateInfra: (updates: Record<string, any>) => void
  onBuild: () => void
  isSavingInfra: boolean
  isBuilding: boolean
  buildResult: any
}) {
  const [deployMode, setDeployMode] = useState<string>(site.deploy_mode || 'internal')
  const [r2Bucket, setR2Bucket] = useState(site.r2_bucket || '')
  const [r2Endpoint, setR2Endpoint] = useState(site.r2_endpoint || '')
  const [r2AccessKey, setR2AccessKey] = useState('')
  const [r2SecretKey, setR2SecretKey] = useState('')
  const [pulseEnabled, setPulseEnabled] = useState(site.pulse_enabled !== false)

  const handleSaveR2 = () => {
    const updates: Record<string, any> = {
      deploy_mode: deployMode,
      r2_bucket: r2Bucket || null,
      r2_endpoint: r2Endpoint || null,
      pulse_enabled: pulseEnabled,
    }
    if (r2AccessKey) updates.r2_access_key_encrypted = r2AccessKey
    if (r2SecretKey) updates.r2_secret_key_encrypted = r2SecretKey
    onUpdateInfra(updates)
  }

  const handleTogglePulse = () => {
    const next = !pulseEnabled
    setPulseEnabled(next)
    onUpdateInfra({ pulse_enabled: next })
  }

  return (
    <div className="space-y-6">
      {/* Deploy Mode */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Deploy Mode</h3>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setDeployMode('internal')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              deployMode === 'internal'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server size={14} />
            Internal
          </button>
          <button
            onClick={() => setDeployMode('r2')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              deployMode === 'r2'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Cloud size={14} />
            Cloudflare R2
          </button>
        </div>
      </div>

      {/* R2 Configuration */}
      {deployMode === 'r2' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">R2 Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                R2 Bucket
              </label>
              <input
                type="text"
                value={r2Bucket}
                onChange={(e) => setR2Bucket(e.target.value)}
                placeholder="my-landing-bucket"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                R2 Endpoint
              </label>
              <input
                type="text"
                value={r2Endpoint}
                onChange={(e) => setR2Endpoint(e.target.value)}
                placeholder="https://account-id.r2.cloudflarestorage.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  R2 Access Key
                </label>
                <input
                  type="password"
                  value={r2AccessKey}
                  onChange={(e) => setR2AccessKey(e.target.value)}
                  placeholder={site.r2_bucket ? '********' : 'Enter access key'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  R2 Secret Key
                </label>
                <input
                  type="password"
                  value={r2SecretKey}
                  onChange={(e) => setR2SecretKey(e.target.value)}
                  placeholder={site.r2_bucket ? '********' : 'Enter secret key'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveR2}
                disabled={isSavingInfra}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isSavingInfra ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save R2 Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Build & Deploy */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Build & Deploy</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {site.last_built_at
                ? `Last built: ${new Date(site.last_built_at).toLocaleString()}`
                : 'Never built'}
            </p>
          </div>
          <button
            onClick={onBuild}
            disabled={isBuilding}
            className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isBuilding ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {isBuilding ? 'Building...' : 'Build & Deploy'}
          </button>
        </div>

        {/* Build Result */}
        {buildResult && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Build Result
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Pages Built</div>
                <div className="font-semibold text-gray-900">{buildResult.built ?? 0}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Deploy</div>
                <div className="font-semibold text-gray-900">
                  {buildResult.deploy
                    ? `${buildResult.deploy.uploaded} uploaded`
                    : 'Internal only'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Errors</div>
                <div className={`font-semibold ${buildResult.errors?.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {buildResult.errors?.length || 0}
                </div>
              </div>
            </div>
            {buildResult.errors?.length > 0 && (
              <div className="mt-3 space-y-1">
                {buildResult.errors.map((err: string, i: number) => (
                  <div key={i} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Silent Pulse Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Silent Pulse</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Inject privacy-first analytics tracking into deployed pages
            </p>
          </div>
          <button
            onClick={handleTogglePulse}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              pulseEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                pulseEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

// ====== Main Dashboard ======

export default function LandingEngineDashboard({ onBack }: Props) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [buildResult, setBuildResult] = useState<any>(null)

  // Data hooks
  const { data: sites, isLoading: sitesLoading } = useLandingSites()
  const { data: selectedSite, isLoading: siteLoading } = useLandingSite(selectedSiteId)

  // Mutation hooks
  const createSite = useCreateLandingSite()
  const updateSite = useUpdateLandingSite()
  const deleteSite = useDeleteLandingSite()
  const buildSite = useBuildSite()
  const updateInfra = useUpdateSiteInfra()

  const handleSelectSite = useCallback((id: string) => {
    setSelectedSiteId(id)
    setActiveTab('general')
    setBuildResult(null)
  }, [])

  const handleCreateSite = useCallback(
    (data: { name: string; template_id?: string }) => {
      createSite.mutate(data, {
        onSuccess: (newSite: any) => {
          setShowCreateModal(false)
          setSelectedSiteId(newSite.id)
        },
      })
    },
    [createSite]
  )

  const handleDeleteSite = useCallback(() => {
    if (!selectedSiteId) return
    deleteSite.mutate(selectedSiteId, {
      onSuccess: () => {
        setShowDeleteModal(false)
        setSelectedSiteId(null)
      },
    })
  }, [selectedSiteId, deleteSite])

  const handleUpdateSite = useCallback(
    (updates: Record<string, any>) => {
      if (!selectedSiteId) return
      updateSite.mutate({ siteId: selectedSiteId, updates })
    },
    [selectedSiteId, updateSite]
  )

  const handleUpdateInfra = useCallback(
    (updates: Record<string, any>) => {
      if (!selectedSiteId) return
      updateInfra.mutate({ siteId: selectedSiteId, updates })
    },
    [selectedSiteId, updateInfra]
  )

  const handleBuild = useCallback(() => {
    if (!selectedSiteId) return
    setBuildResult(null)
    buildSite.mutate(selectedSiteId, {
      onSuccess: (result: any) => setBuildResult(result),
    })
  }, [selectedSiteId, buildSite])

  const sitesList: LandingSite[] = sites || []

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: 'General', icon: <Settings size={14} /> },
    { key: 'domain', label: 'Domain Hub', icon: <Globe size={14} /> },
    { key: 'deploy', label: 'Deploy', icon: <Cloud size={14} /> },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
  ]

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <Rocket size={18} className="text-indigo-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Landing Engine</h1>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel — Site List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          {/* List Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Landing Sites
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
              title="New Site"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Site List */}
          <div className="flex-1 overflow-y-auto">
            {sitesLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={24} className="animate-spin text-gray-300" />
              </div>
            ) : sitesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 px-4">
                <Rocket size={40} className="text-gray-200 mb-3" />
                <h3 className="text-gray-500 font-medium text-sm mb-1">No sites yet</h3>
                <p className="text-xs text-gray-400 text-center">
                  Create your first landing site to get started.
                </p>
              </div>
            ) : (
              <div className="py-1">
                {sitesList.map((site: LandingSite) => (
                  <button
                    key={site.id}
                    onClick={() => handleSelectSite(site.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      selectedSiteId === site.id
                        ? 'bg-indigo-50 border-r-2 border-indigo-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {site.name}
                      </div>
                      {site.domain && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {site.domain}
                        </div>
                      )}
                      {!site.domain && site.subdomain && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {site.subdomain}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {site.domain && (
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Domain
                        </span>
                      )}
                      <span
                        className={`w-2 h-2 rounded-full ${
                          site.is_published ? 'bg-emerald-400' : 'bg-gray-300'
                        }`}
                        title={site.is_published ? 'Published' : 'Draft'}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Site Details */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {!selectedSiteId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Rocket size={40} className="text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-500 font-medium mb-1">Select a site</h3>
                <p className="text-sm text-gray-400">
                  Choose a landing site from the list or create a new one.
                </p>
              </div>
            </div>
          ) : siteLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-gray-300" />
            </div>
          ) : !selectedSite ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle size={40} className="text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-500 font-medium mb-1">Site not found</h3>
                <p className="text-sm text-gray-400">
                  This site may have been deleted.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Site Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{selectedSite.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedSite.landing_templates?.name && (
                      <span className="text-xs text-gray-400">
                        Template: {selectedSite.landing_templates.name}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedSite.is_published
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {selectedSite.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="Delete site"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Tab Bar */}
              <div className="px-6 pt-4 bg-[#F5F5F7]">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === tab.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {activeTab === 'general' && (
                  <GeneralTab
                    site={selectedSite}
                    onSave={handleUpdateSite}
                    isSaving={updateSite.isPending}
                  />
                )}
                {activeTab === 'domain' && (
                  <DomainHubTab
                    site={selectedSite}
                    onUpdateInfra={handleUpdateInfra}
                    isSavingInfra={updateInfra.isPending}
                  />
                )}
                {activeTab === 'deploy' && (
                  <DeployTab
                    site={selectedSite}
                    onUpdateInfra={handleUpdateInfra}
                    onBuild={handleBuild}
                    isSavingInfra={updateInfra.isPending}
                    isBuilding={buildSite.isPending}
                    buildResult={buildResult}
                  />
                )}
                {activeTab === 'analytics' && (
                  <PulseAnalytics siteId={selectedSiteId} />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateSiteModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSite}
          isCreating={createSite.isPending}
        />
      )}
      {showDeleteModal && selectedSite && (
        <DeleteConfirmModal
          siteName={selectedSite.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteSite}
          isDeleting={deleteSite.isPending}
        />
      )}
    </div>
  )
}
