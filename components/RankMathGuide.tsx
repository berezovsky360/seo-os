'use client'

import { CheckCircle, AlertCircle, Info, BookOpen, Target, TrendingUp } from 'lucide-react'
import SEOScoreIndicator from './SEOScoreIndicator'

export default function RankMathGuide() {
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Rank Math SEO Scoring Guide
        </h1>
        <p className="text-gray-600">
          Understand how SEO scores are calculated and what each metric means for your content ranking.
        </p>
      </div>

      {/* Score ranges explanation */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 mb-8 border border-indigo-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Target className="text-indigo-600" size={24} />
          SEO Score Ranges
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <SEOScoreIndicator score={90} label="Excellent" size="sm" />
            <p className="text-xs text-gray-600 mt-3 text-center">
              80-100 points
            </p>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Ready to rank high
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <SEOScoreIndicator score={70} label="Good" size="sm" />
            <p className="text-xs text-gray-600 mt-3 text-center">
              60-79 points
            </p>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Minor improvements needed
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <SEOScoreIndicator score={50} label="Fair" size="sm" />
            <p className="text-xs text-gray-600 mt-3 text-center">
              40-59 points
            </p>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Needs optimization
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <SEOScoreIndicator score={25} label="Poor" size="sm" />
            <p className="text-xs text-gray-600 mt-3 text-center">
              0-39 points
            </p>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Requires major work
            </p>
          </div>
        </div>
      </div>

      {/* Scoring criteria */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="text-indigo-600" size={24} />
          Scoring Criteria (Total: 100 points)
        </h2>

        {scoringCriteria.map((section, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {section.title}
                </h3>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                  {section.maxPoints} points
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {section.description}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {item.status === 'good' ? (
                      <CheckCircle size={20} className="text-emerald-600" />
                    ) : item.status === 'warning' ? (
                      <AlertCircle size={20} className="text-amber-600" />
                    ) : (
                      <Info size={20} className="text-indigo-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900">
                        {item.name}
                      </h4>
                      <span className="text-sm font-semibold text-gray-700">
                        {item.points} pts
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {item.description}
                    </p>
                    {item.recommendation && (
                      <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 inline-block">
                        💡 {item.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Interface guide */}
      <div className="mt-12 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={24} />
          Understanding the Interface
        </h2>

        <div className="space-y-4">
          {interfaceGuide.map((item, idx) => (
            <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Best practices */}
      <div className="mt-8 bg-indigo-900 text-white rounded-2xl p-8">
        <h2 className="text-2xl font-semibold mb-6">
          Best Practices for High SEO Scores
        </h2>

        <ul className="space-y-3">
          {bestPractices.map((practice, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5 text-emerald-400" />
              <span className="text-indigo-100">{practice}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Scoring criteria data
const scoringCriteria = [
  {
    title: 'Title & Description Optimization',
    maxPoints: 20,
    description: 'SEO title and meta description quality',
    items: [
      {
        name: 'Title Length',
        points: 10,
        status: 'good',
        description: 'Title should be 50-60 characters for optimal display in search results',
        recommendation: 'Keep titles concise but descriptive. Google typically displays first 50-60 characters.',
      },
      {
        name: 'Description Length',
        points: 10,
        status: 'good',
        description: 'Meta description should be 150-160 characters',
        recommendation: 'Write compelling descriptions that encourage clicks. Include call-to-action.',
      },
    ],
  },
  {
    title: 'Keyword Optimization',
    maxPoints: 40,
    description: 'Focus keyword placement and density',
    items: [
      {
        name: 'Keyword in Title',
        points: 15,
        status: 'good',
        description: 'Focus keyword should appear in SEO title, preferably near the beginning',
        recommendation: 'Place your main keyword in the first 50% of the title for better ranking.',
      },
      {
        name: 'Keyword in Description',
        points: 10,
        status: 'good',
        description: 'Focus keyword should be present in meta description',
        recommendation: 'Use your keyword naturally in the description to match user search intent.',
      },
      {
        name: 'Keyword Density',
        points: 15,
        status: 'warning',
        description: 'Keyword should appear 0.5-2.5% of total words in content',
        recommendation: 'Avoid keyword stuffing. Use synonyms and related terms naturally.',
      },
    ],
  },
  {
    title: 'Content Quality',
    maxPoints: 25,
    description: 'Content length and readability',
    items: [
      {
        name: 'Word Count',
        points: 15,
        status: 'good',
        description: 'Content should have at least 1000 words for in-depth coverage',
        recommendation: 'Longer content (1500-2500 words) tends to rank better for competitive keywords.',
      },
      {
        name: 'Readability Score',
        points: 10,
        status: 'info',
        description: 'Content should be easy to read (Flesch Reading Ease score ≥60)',
        recommendation: 'Use short sentences, simple words, and break up text with headings.',
      },
    ],
  },
  {
    title: 'On-Page Elements',
    maxPoints: 15,
    description: 'Images, links, and multimedia',
    items: [
      {
        name: 'Images with Alt Text',
        points: 10,
        status: 'good',
        description: 'All images should have descriptive alt text for accessibility and SEO',
        recommendation: 'Describe what is in the image and include keywords naturally.',
      },
      {
        name: 'Internal & External Links',
        points: 5,
        status: 'good',
        description: '3-5 internal links and 1-3 external links to authoritative sources',
        recommendation: 'Link to related content on your site and credible external sources.',
      },
    ],
  },
]

// Interface guide data
const interfaceGuide = [
  {
    title: '🎯 Preliminary SEO Score',
    description:
      'Calculated before publishing based on content analysis. This gives you a prediction of how well your article will perform.',
  },
  {
    title: '✅ Actual SEO Score',
    description:
      'Real score from Rank Math after publishing to WordPress. Synced automatically 5 seconds after publishing.',
  },
  {
    title: '📊 Score Comparison',
    description:
      'Shows "Predicted vs Actual" comparison with trending indicators (↑↓) to track improvement.',
  },
  {
    title: '🔄 Circular Progress Indicators',
    description:
      'Color-coded scores: Green (80-100) = Excellent, Amber (60-79) = Good, Orange (40-59) = Fair, Red (0-39) = Poor.',
  },
  {
    title: '💡 Suggestions & Issues',
    description:
      'Real-time feedback shows what needs improvement with specific recommendations for each criterion.',
  },
]

// Best practices data
const bestPractices = [
  'Write naturally for humans first, optimize for search engines second',
  'Research competitors ranking for your target keyword and aim to provide more value',
  'Use focus keyword in first 100 words of content',
  'Include variations and synonyms of your keyword throughout the content',
  'Structure content with clear headings (H1, H2, H3) for better readability',
  'Add relevant images, videos, or infographics to enhance engagement',
  'Update content regularly to keep it fresh and relevant',
  'Build internal links to related articles on your website',
  'Cite authoritative external sources to build trust',
  'Optimize for featured snippets by answering questions directly',
]
