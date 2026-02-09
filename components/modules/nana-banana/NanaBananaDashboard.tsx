'use client';

import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  ChevronLeft,
  ChevronDown,
  Loader2,
  Play,
  Check,
  AlertCircle,
  Wand2,
  Sparkles,
  Upload,
  Eye,
} from 'lucide-react';
import { useSites } from '@/hooks/useSites';
import { usePosts } from '@/hooks/usePosts';
import {
  useGenerateImagePrompt,
  useGenerateImage,
  useAnalyzeImage,
  usePushToWordPress,
  useRunFullPipeline,
} from '@/hooks/useNanaBanana';
import { useToast } from '@/lib/contexts/ToastContext';

interface NanaBananaDashboardProps {
  onBack?: () => void;
}

type PipelineStep = 'idle' | 'prompt' | 'image' | 'seo' | 'push' | 'done';

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
];

export default function NanaBananaDashboard({ onBack }: NanaBananaDashboardProps) {
  // State
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // Pipeline state
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [prompt, setPrompt] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [pushResult, setPushResult] = useState<{ media_id: number; media_url: string } | null>(null);

  // Data hooks
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const { data: posts = [], isLoading: postsLoading } = usePosts(selectedSiteId);

  // Mutation hooks
  const generatePrompt = useGenerateImagePrompt();
  const generateImage = useGenerateImage();
  const analyzeImage = useAnalyzeImage();
  const pushToWp = usePushToWordPress();
  const fullPipeline = useRunFullPipeline();

  const toast = useToast();

  // Auto-select first site
  React.useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  // Reset pipeline when post changes
  const resetPipeline = () => {
    setPipelineStep('idle');
    setPrompt('');
    setImageBase64('');
    setImageMime('');
    setAltText('');
    setCaption('');
    setMediaTitle('');
    setPushResult(null);
  };

  const selectedPost = useMemo(
    () => posts.find((p: any) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  // Step handlers
  const handleGeneratePrompt = async () => {
    if (!selectedPostId) return;
    setPipelineStep('prompt');
    try {
      const result = await generatePrompt.mutateAsync({
        site_id: selectedSiteId,
        post_id: selectedPostId,
      });
      setPrompt(result.prompt);
      toast.success('Image prompt generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate prompt');
      setPipelineStep('idle');
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setPipelineStep('image');
    try {
      const result = await generateImage.mutateAsync({
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
      });
      setImageBase64(result.image_base64);
      setImageMime(result.mime_type);
      toast.success('Image generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate image');
      setPipelineStep('prompt');
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageBase64) return;
    setPipelineStep('seo');
    try {
      const result = await analyzeImage.mutateAsync({
        image_base64: imageBase64,
        article_title: selectedPost?.title || '',
        focus_keyword: selectedPost?.focus_keyword || undefined,
      });
      setAltText(result.alt_text);
      setCaption(result.caption);
      setMediaTitle(result.title);
      toast.success('SEO description generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze image');
      setPipelineStep('image');
    }
  };

  const handlePushToWp = async () => {
    if (!imageBase64 || !selectedPost?.wp_post_id) return;
    setPipelineStep('push');
    try {
      const result = await pushToWp.mutateAsync({
        site_id: selectedSiteId,
        wp_post_id: selectedPost.wp_post_id,
        image_base64: imageBase64,
        alt_text: altText,
        caption: caption || undefined,
        title: mediaTitle || undefined,
      });
      setPushResult({ media_id: result.media_id, media_url: result.media_url });
      setPipelineStep('done');
      toast.success('Image pushed to WordPress!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to push to WordPress');
      setPipelineStep('seo');
    }
  };

  const handleFullPipeline = async () => {
    if (!selectedPostId) return;
    resetPipeline();
    setPipelineStep('prompt');
    try {
      const result = await fullPipeline.mutateAsync({
        site_id: selectedSiteId,
        post_id: selectedPostId,
        aspect_ratio: aspectRatio,
      });
      setPrompt(result.prompt);
      setImageBase64(result.image_base64);
      setImageMime(result.mime_type);
      setAltText(result.alt_text);
      setCaption(result.caption);
      setMediaTitle(result.media_title);
      setPushResult({ media_id: result.media_id, media_url: result.media_url });
      setPipelineStep('done');
      toast.success('Full pipeline complete!');
    } catch (err: any) {
      toast.error(err.message || 'Pipeline failed');
      setPipelineStep('idle');
    }
  };

  const isAnyMutationPending =
    generatePrompt.isPending ||
    generateImage.isPending ||
    analyzeImage.isPending ||
    pushToWp.isPending ||
    fullPipeline.isPending;

  // No sites
  if (!sitesLoading && sites.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ImageIcon size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-500 font-medium mb-1">No sites configured</h3>
          <p className="text-sm text-gray-400">Add a site first to generate featured images.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-8 py-5 bg-[#F5F6F8] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <ImageIcon size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Nana Banana</h1>
        </div>

        <div className="relative">
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value);
              setSelectedPostId(null);
              resetPipeline();
            }}
            className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            {sites.map((site: any) => (
              <option key={site.id} value={site.id}>
                {site.name || site.url}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
      </div>

      <div className="p-4 sm:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Posts Table */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-bold text-gray-900">Select a Post</h2>
              </div>

              {postsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-gray-300" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16">
                  <ImageIcon size={40} className="text-gray-200 mx-auto mb-3" />
                  <h3 className="text-gray-500 font-medium mb-1">No posts found</h3>
                  <p className="text-sm text-gray-400">Sync posts from WordPress first.</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Keyword</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post: any) => {
                        const isSelected = selectedPostId === post.id;
                        return (
                          <tr
                            key={post.id}
                            onClick={() => {
                              setSelectedPostId(isSelected ? null : post.id);
                              if (!isSelected) resetPipeline();
                            }}
                            className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                              isSelected ? 'bg-yellow-50' : 'hover:bg-gray-50/50'
                            }`}
                          >
                            <td className="px-5 py-3">
                              <span className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                                post.status === 'publish'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {post.status}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span className="text-xs text-gray-500">{post.focus_keyword || '–'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Pipeline Panel */}
          <div className="lg:w-1/2">
            {!selectedPostId ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                <ImageIcon size={40} className="text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-500 font-medium mb-1">Select a post</h3>
                <p className="text-sm text-gray-400">Choose a post from the list to start the image pipeline.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Post Info */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{selectedPost?.title}</h3>
                      {selectedPost?.focus_keyword && (
                        <p className="text-xs text-gray-500 mt-0.5">Keyword: {selectedPost.focus_keyword}</p>
                      )}
                    </div>
                    {!selectedPost?.wp_post_id && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex-shrink-0 ml-3">
                        <AlertCircle size={12} />
                        <span>No WP post ID</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Pipeline Button */}
                <button
                  onClick={handleFullPipeline}
                  disabled={isAnyMutationPending || !selectedPost?.wp_post_id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fullPipeline.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                  Run Full Pipeline
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">or step by step</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Step 1: Generate Prompt */}
                <StepCard
                  number={1}
                  title="Generate Image Prompt"
                  icon={<Wand2 size={14} />}
                  completed={!!prompt}
                  active={pipelineStep === 'prompt'}
                >
                  <button
                    onClick={handleGeneratePrompt}
                    disabled={isAnyMutationPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {generatePrompt.isPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    Generate Prompt
                  </button>
                  {prompt && (
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      className="mt-3 w-full text-xs text-gray-700 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                    />
                  )}
                </StepCard>

                {/* Step 2: Generate Image */}
                <StepCard
                  number={2}
                  title="Generate Image"
                  icon={<ImageIcon size={14} />}
                  completed={!!imageBase64}
                  active={pipelineStep === 'image'}
                  disabled={!prompt}
                >
                  <div className="flex items-center gap-2">
                    {/* Aspect ratio selector */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      {ASPECT_RATIOS.map((ar) => (
                        <button
                          key={ar.value}
                          onClick={() => setAspectRatio(ar.value)}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                            aspectRatio === ar.value
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {ar.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleGenerateImage}
                      disabled={isAnyMutationPending || !prompt}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {generateImage.isPending ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                      Generate
                    </button>
                  </div>
                  {imageBase64 && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={`data:${imageMime || 'image/png'};base64,${imageBase64}`}
                        alt="Generated preview"
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                </StepCard>

                {/* Step 3: SEO Description */}
                <StepCard
                  number={3}
                  title="Generate Alt & Caption"
                  icon={<Sparkles size={14} />}
                  completed={!!altText}
                  active={pipelineStep === 'seo'}
                  disabled={!imageBase64}
                >
                  <button
                    onClick={handleAnalyzeImage}
                    disabled={isAnyMutationPending || !imageBase64}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {analyzeImage.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Analyze Image
                  </button>
                  {altText && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Alt Text</label>
                        <input
                          value={altText}
                          onChange={(e) => setAltText(e.target.value)}
                          className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Caption</label>
                        <input
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Media Title</label>
                        <input
                          value={mediaTitle}
                          onChange={(e) => setMediaTitle(e.target.value)}
                          className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                    </div>
                  )}
                </StepCard>

                {/* Step 4: Push to WordPress */}
                <StepCard
                  number={4}
                  title="Push to WordPress"
                  icon={<Upload size={14} />}
                  completed={!!pushResult}
                  active={pipelineStep === 'push'}
                  disabled={!altText || !selectedPost?.wp_post_id}
                >
                  <button
                    onClick={handlePushToWp}
                    disabled={isAnyMutationPending || !altText || !selectedPost?.wp_post_id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {pushToWp.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Push to WP
                  </button>
                  {pushResult && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Check size={14} className="text-green-600" />
                        <span className="text-xs font-bold text-green-700">Featured image set!</span>
                      </div>
                      <p className="text-[10px] text-green-600">Media ID: {pushResult.media_id}</p>
                      {pushResult.media_url && (
                        <a
                          href={pushResult.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-green-700 hover:underline mt-1"
                        >
                          <Eye size={10} />
                          View image
                        </a>
                      )}
                    </div>
                  )}
                </StepCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step card sub-component
function StepCard({
  number,
  title,
  icon,
  completed,
  active,
  disabled,
  children,
}: {
  number: number;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${
        completed
          ? 'border-green-200'
          : active
          ? 'border-yellow-300 shadow-md shadow-yellow-50'
          : disabled
          ? 'border-gray-100 opacity-50'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
            completed
              ? 'bg-green-100 text-green-600'
              : active
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {completed ? <Check size={10} /> : number}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
          {icon}
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
