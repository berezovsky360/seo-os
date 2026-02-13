'use client';

import React, { useState } from 'react';
import {
  Key, Plus, Trash2, CheckCircle2, XCircle, Loader2,
  ChevronLeft, Eye, EyeOff, RefreshCw, AlertTriangle, Shield, BarChart3
} from 'lucide-react';
import { useApiKeys, useSaveApiKey, useDeleteApiKey, useValidateApiKey } from '@/hooks/useApiKeys';
import { useToast } from '@/lib/contexts/ToastContext';
import { useUsageStats } from '@/hooks/useUsageDashboard';
import type { ApiKeyType } from '@/lib/core/events';
import UsageDashboard from './UsageDashboard';

// Key type metadata
const KEY_TYPES: {
  type: ApiKeyType;
  name: string;
  description: string;
  placeholder: string;
  helpUrl?: string;
}[] = [
  {
    type: 'gemini',
    name: 'Google Gemini',
    description: 'Powers AI content analysis, FAQ generation, and title optimization.',
    placeholder: 'AIzaSy...',
  },
  {
    type: 'dataforseo',
    name: 'DataForSEO',
    description: 'Real-time rank tracking and SERP snapshots. Format: login:password',
    placeholder: 'login:password',
  },
  {
    type: 'gsc',
    name: 'Google Search Console',
    description: 'Import impressions, clicks, CTR, and positions for your pages.',
    placeholder: '{"access_token": "...", "refresh_token": "..."}',
  },
  {
    type: 'ga4',
    name: 'Google Analytics 4',
    description: 'Traffic data, user behavior, and conversion tracking.',
    placeholder: '{"access_token": "...", "refresh_token": "..."}',
  },
];

interface KeyManagementProps {
  onBack?: () => void;
}

type TabId = 'keys' | 'usage';

export default function KeyManagement({ onBack }: KeyManagementProps) {
  const { data: apiKeys = [], isLoading } = useApiKeys();
  const saveKey = useSaveApiKey();
  const deleteKey = useDeleteApiKey();
  const validateKey = useValidateApiKey();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('keys');
  const [addingKey, setAddingKey] = useState<ApiKeyType | null>(null);
  const [keyValue, setKeyValue] = useState('');
  const [keyLabel, setKeyLabel] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [validatingType, setValidatingType] = useState<string | null>(null);

  // Check budget status for badge indicator
  const { data: usageData } = useUsageStats('30d', 'all');
  const hasBudgetWarning = usageData?.budget_status?.some(b => b.percentage >= 80) ?? false;

  const getKeyInfo = (keyType: ApiKeyType) => {
    return apiKeys.find(k => k.key_type === keyType);
  };

  const handleSave = async () => {
    if (!addingKey || !keyValue.trim()) return;

    try {
      await saveKey.mutateAsync({
        keyType: addingKey,
        value: keyValue.trim(),
        label: keyLabel.trim() || undefined,
      });
      toast.success('API key saved');
      setAddingKey(null);
      setKeyValue('');
      setKeyLabel('');
    } catch {
      toast.error('Failed to save API key');
    }
  };

  const handleDelete = async (keyType: ApiKeyType) => {
    if (!window.confirm('Delete this API key? Modules using it will stop working.')) return;

    try {
      await deleteKey.mutateAsync(keyType);
      toast.success('API key deleted');
    } catch {
      toast.error('Failed to delete API key');
    }
  };

  const handleValidate = async (keyType: ApiKeyType) => {
    setValidatingType(keyType);
    try {
      const result = await validateKey.mutateAsync(keyType);
      if (result.valid) {
        toast.success(`${keyType} key is valid`);
      } else {
        toast.warning(`${keyType} key validation failed: ${result.error || 'Invalid'}`);
      }
    } catch {
      toast.error('Validation request failed');
    } finally {
      setValidatingType(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex justify-between items-center px-8 py-5">
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
              <Shield size={20} className="text-gray-900" />
              <h1 className="text-lg font-bold text-gray-900">API & Usage</h1>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 px-8 -mb-px">
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'keys'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Key size={15} />
            Keys
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'usage'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 size={15} />
            Usage
            {hasBudgetWarning && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'usage' ? (
        <UsageDashboard />
      ) : (
      <div className="p-8 max-w-3xl">
        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <Key size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>Your keys are encrypted</strong> with AES-256-GCM and stored securely.
            They are only decrypted server-side when a module needs them.
          </div>
        </div>

        {/* Key Cards */}
        <div className="space-y-4">
          {KEY_TYPES.map((kt) => {
            const existing = getKeyInfo(kt.type);
            const isAdding = addingKey === kt.type;
            const isValidating = validatingType === kt.type;

            return (
              <div
                key={kt.type}
                className={`bg-white rounded-xl border transition-all ${
                  existing?.is_valid
                    ? 'border-green-200'
                    : existing
                    ? 'border-amber-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{kt.name}</h3>
                        {existing && (
                          existing.is_valid ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                              <CheckCircle2 size={12} />
                              Valid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                              <AlertTriangle size={12} />
                              {existing.validation_error || 'Not validated'}
                            </span>
                          )
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{kt.description}</p>

                      {existing && (
                        <div className="mt-2 text-xs text-gray-400">
                          {existing.label && <span className="mr-3">{existing.label}</span>}
                          <span>{existing.masked_value}</span>
                          {existing.balance != null && (
                            <span className="ml-3 text-emerald-600 font-medium">Balance: ${existing.balance}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {existing ? (
                        <>
                          <button
                            onClick={() => handleValidate(kt.type)}
                            disabled={isValidating}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Validate key"
                          >
                            {isValidating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                          </button>
                          <button
                            onClick={() => {
                              setAddingKey(kt.type);
                              setKeyValue('');
                              setKeyLabel(existing.label || '');
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Replace key"
                          >
                            <Key size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(kt.type)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setAddingKey(kt.type)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          <Plus size={14} />
                          Add Key
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Add/Edit Form */}
                  {isAdding && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Label (optional)</label>
                        <input
                          type="text"
                          value={keyLabel}
                          onChange={(e) => setKeyLabel(e.target.value)}
                          placeholder="My Gemini Key"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">API Key</label>
                        <div className="relative">
                          <input
                            type={showValue ? 'text' : 'password'}
                            value={keyValue}
                            onChange={(e) => setKeyValue(e.target.value)}
                            placeholder={kt.placeholder}
                            className="w-full px-3 py-2 pr-10 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => setShowValue(!showValue)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                          >
                            {showValue ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleSave}
                          disabled={!keyValue.trim() || saveKey.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saveKey.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Save & Encrypt
                        </button>
                        <button
                          onClick={() => {
                            setAddingKey(null);
                            setKeyValue('');
                            setKeyLabel('');
                            setShowValue(false);
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
