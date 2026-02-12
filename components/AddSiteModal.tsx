'use client';

import { useState } from 'react';
import { X, Plus, Globe } from 'lucide-react';
import { useCreateSite, useSites } from '@/hooks/useSites';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { useToast } from '@/lib/contexts/ToastContext';

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddSiteModal({ isOpen, onClose }: AddSiteModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isCompetitor, setIsCompetitor] = useState(false);

  const createSite = useCreateSite();
  const { currentWorkspaceId } = useWorkspace();
  const { data: existingSites = [] } = useSites(currentWorkspaceId || undefined);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !url.trim()) {
      toast.warning('Please fill in site name and URL');
      return;
    }

    // Normalize URL (remove https://, http://, trailing slash)
    const normalizedUrl = url.trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    // Check for duplicates
    const isDuplicate = existingSites.some(
      site => site.url.replace(/^https?:\/\//, '').replace(/\/$/, '') === normalizedUrl
    );

    if (isDuplicate) {
      toast.error(`Site "${normalizedUrl}" already exists!`);
      return;
    }

    createSite.mutate(
      {
        name: name.trim(),
        url: normalizedUrl,
        is_competitor: isCompetitor,
        workspace_id: currentWorkspaceId || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Site "${name}" added successfully!`);
          setName('');
          setUrl('');
          setIsCompetitor(false);
          onClose();
        },
        onError: (error) => {
          toast.error(`Failed to create site: ${error.message}`);
        },
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Plus className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Site</h2>
                <p className="text-sm text-gray-500">Add a new project to your portfolio</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              disabled={createSite.isPending}
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Site Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Site Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Blog"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Site URL */}
          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-gray-700 mb-2">
              Website URL *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                https://
              </span>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com"
                required
                className="w-full pl-[70px] pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Just enter the domain (https:// will be added automatically)</p>
          </div>

          {/* Competitor Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_competitor"
              checked={isCompetitor}
              onChange={(e) => setIsCompetitor(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <label htmlFor="is_competitor" className="text-sm font-semibold text-gray-700">
              Competitor site
            </label>
            <span className="text-xs text-gray-400">Track this domain as a competitor</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createSite.isPending}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSite.isPending}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createSite.isPending ? 'Creating...' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
