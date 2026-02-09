'use client';

import React, { useState } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Globe, Key, Puzzle,
  Loader2, Eye, EyeOff, Plus, Trash2, Sparkles,
  BarChart3, Search, CheckCircle2, AlertCircle, Rocket
} from 'lucide-react';
import { useCreateSite } from '@/hooks/useSites';
import { useSaveApiKey, useValidateApiKey } from '@/hooks/useApiKeys';
import { useBatchToggleModules } from '@/hooks/useModules';
import { coreService } from '@/lib/services/coreService';
import { useToast } from '@/lib/contexts/ToastContext';
import type { ApiKeyType, ModuleId } from '@/lib/core/events';

interface SetupWizardProps {
  onComplete: () => void;
}

type Step = 0 | 1 | 2 | 3;

// Module options for step 3
const MODULE_OPTIONS: {
  id: ModuleId;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  available: boolean;
}[] = [
  {
    id: 'rankmath-bridge',
    name: 'RankMath Bridge',
    description: 'Manage SEO metadata across all WordPress sites',
    icon: <Globe size={20} />,
    gradient: 'from-blue-500 to-blue-600',
    available: true,
  },
  {
    id: 'gemini-architect',
    name: 'AI Content Architect',
    description: 'AI-powered content analysis and optimization',
    icon: <Sparkles size={20} />,
    gradient: 'from-emerald-500 to-teal-600',
    available: false,
  },
  {
    id: 'rank-pulse',
    name: 'Rank Pulse',
    description: 'Real-time position monitoring and SERP snapshots',
    icon: <BarChart3 size={20} />,
    gradient: 'from-orange-500 to-red-500',
    available: false,
  },
  {
    id: 'gsc-insights',
    name: 'GSC Insights',
    description: 'Search Console data and keyword discovery',
    icon: <Search size={20} />,
    gradient: 'from-purple-500 to-indigo-600',
    available: false,
  },
];

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<Step>(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const toast = useToast();

  // Step 1: Add Site state
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [siteAdded, setSiteAdded] = useState(false);
  const createSite = useCreateSite();

  // Step 2: API Keys state
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const saveApiKey = useSaveApiKey();
  const validateApiKey = useValidateApiKey();
  const [geminiSaved, setGeminiSaved] = useState(false);

  // Step 3: Modules state
  const [selectedModules, setSelectedModules] = useState<Set<ModuleId>>(new Set(['rankmath-bridge']));
  const batchToggle = useBatchToggleModules();

  const handleAddSite = async () => {
    if (!siteName.trim() || !siteUrl.trim()) return;

    try {
      let url = siteUrl.trim();
      if (!url.startsWith('http')) url = `https://${url}`;

      await createSite.mutateAsync({
        name: siteName.trim(),
        url,
        wp_username: wpUsername.trim() || undefined,
        wp_app_password: wpPassword.trim() || undefined,
      });
      setSiteAdded(true);
      toast.success('Site added successfully');
    } catch {
      toast.error('Failed to add site');
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKey.trim()) return;

    try {
      await saveApiKey.mutateAsync({
        keyType: 'gemini' as ApiKeyType,
        value: geminiKey.trim(),
        label: 'Setup Wizard',
      });
      setGeminiSaved(true);
      toast.success('Gemini API key saved');
    } catch {
      toast.error('Failed to save API key');
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      // Enable selected modules
      const modules = Array.from(selectedModules).map(id => ({
        module_id: id,
        enabled: true,
      }));
      if (modules.length > 0) {
        await batchToggle.mutateAsync(modules);
      }

      // Mark setup as complete
      await coreService.completeSetup();
      toast.success('Setup complete! Welcome to SEO OS');
      onComplete();
    } catch {
      toast.error('Failed to complete setup');
    } finally {
      setIsFinishing(false);
    }
  };

  const toggleModule = (id: ModuleId) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true; // Welcome — always
      case 1: return true; // Add site — optional (can skip)
      case 2: return true; // API keys — optional
      case 3: return true; // Modules — at least finish
      default: return true;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / 4) * 100}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-3 py-6">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s < step
                ? 'bg-indigo-600 text-white'
                : s === step
                ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {s < step ? <Check size={14} /> : s + 1}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-6">
        <div className="w-full max-w-lg">

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-200">
                <Rocket size={36} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to SEO OS</h1>
              <p className="text-gray-500 text-lg mb-2">Your modular SEO operating system.</p>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Let's get you set up in under a minute. Connect your WordPress sites,
                add API keys, and choose which modules to enable.
              </p>
            </div>
          )}

          {/* Step 1: Add Site */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Globe size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add Your First Site</h2>
                  <p className="text-sm text-gray-500">Connect a WordPress site to start managing it.</p>
                </div>
              </div>

              {siteAdded ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <CheckCircle2 size={40} className="text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-green-800 mb-1">Site Added!</h3>
                  <p className="text-sm text-green-600">You can add more sites later from the Dashboard.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Site Name</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="My Blog"
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">WordPress URL</label>
                    <input
                      type="text"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">WP Username</label>
                    <input
                      type="text"
                      value={wpUsername}
                      onChange={(e) => setWpUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Application Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={wpPassword}
                        onChange={(e) => setWpPassword(e.target.value)}
                        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                        className="w-full px-4 py-3 pr-10 text-sm font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      WordPress → Users → Application Passwords. Credentials are encrypted with AES-256-GCM.
                    </p>
                  </div>

                  <button
                    onClick={handleAddSite}
                    disabled={!siteName.trim() || !siteUrl.trim() || createSite.isPending}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {createSite.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Plus size={18} />
                    )}
                    Add Site
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: API Keys */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">API Keys</h2>
                  <p className="text-sm text-gray-500">Optional. Add keys for AI-powered modules.</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Gemini Key */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-600" />
                      <span className="font-semibold text-gray-900 text-sm">Google Gemini</span>
                    </div>
                    {geminiSaved && (
                      <span className="flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle2 size={12} />
                        Saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Powers AI content analysis, FAQ generation, and title rewriting.</p>

                  {geminiSaved ? (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2">
                      Key saved and encrypted
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showGeminiKey ? 'text' : 'password'}
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="w-full px-3 py-2.5 pr-9 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <button
                        onClick={handleSaveGeminiKey}
                        disabled={!geminiKey.trim() || saveApiKey.isPending}
                        className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 shrink-0"
                      >
                        {saveApiKey.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Other keys info */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">
                    DataForSEO, GSC, and GA4 keys can be added later in <strong>API Keys</strong> settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Choose Modules */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                  <Puzzle size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Choose Modules</h2>
                  <p className="text-sm text-gray-500">Enable the modules you want to use.</p>
                </div>
              </div>

              <div className="space-y-3">
                {MODULE_OPTIONS.map((mod) => {
                  const selected = selectedModules.has(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => mod.available && toggleModule(mod.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        !mod.available
                          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                          : selected
                          ? 'border-indigo-300 bg-indigo-50 cursor-pointer'
                          : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-white shrink-0`}>
                        {mod.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">{mod.name}</span>
                          {!mod.available && (
                            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-bold rounded-full">SOON</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{mod.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {selected && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          {step > 0 ? (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}
        </div>

        <div className="flex items-center gap-3">
          {step < 3 && step > 0 && (
            <button
              onClick={() => setStep((step + 1) as Step)}
              className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-200"
            >
              {step === 0 ? "Let's Go" : 'Continue'}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isFinishing}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-200"
            >
              {isFinishing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Rocket size={16} />
              )}
              Launch SEO OS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
