import React from 'react';
import { Site, SiteStatus, Keyword, AuthorPersona, Article, LLMResult } from './types';

// 3D Mesh Gradients
export const THEMES: Record<string, React.CSSProperties> = {
  'hyper-blue': {
    background: 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
    backgroundColor: '#0f172a'
  },
  'neo-mint': {
    background: 'radial-gradient(at 0% 0%, hsla(160, 60%, 40%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(180, 70%, 50%, 1) 0, transparent 50%), radial-gradient(at 50% 100%, hsla(140, 60%, 30%, 1) 0, transparent 50%)',
    backgroundColor: '#064e3b'
  },
  'solar-flare': {
    background: 'radial-gradient(at 10% 10%, hsla(30, 90%, 60%, 1) 0, transparent 55%), radial-gradient(at 90% 10%, hsla(340, 80%, 60%, 1) 0, transparent 55%), radial-gradient(at 50% 90%, hsla(45, 100%, 70%, 1) 0, transparent 55%)',
    backgroundColor: '#7c2d12'
  },
  'deep-space': {
    background: 'radial-gradient(at 0% 100%, hsla(260, 40%, 20%, 1) 0, transparent 50%), radial-gradient(at 100% 100%, hsla(290, 40%, 20%, 1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(240, 60%, 10%, 1) 0, transparent 50%)',
    backgroundColor: '#020617'
  },
  'cotton-candy': {
    background: 'radial-gradient(at 20% 20%, hsla(310, 80%, 85%, 1) 0, transparent 50%), radial-gradient(at 80% 20%, hsla(210, 90%, 85%, 1) 0, transparent 50%), radial-gradient(at 50% 80%, hsla(260, 80%, 90%, 1) 0, transparent 50%)',
    backgroundColor: '#fdf4ff'
  }
};

export const THEME_KEYS = Object.keys(THEMES);

// Seeded random function for consistent SSR/CSR values
// This prevents hydration mismatches
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate consistent theme from URL hash
function hashStringToTheme(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % THEME_KEYS.length;
  return THEME_KEYS[index];
}

const DOMAIN_LIST = [
  "restrategy.ua", "chatgpt.com.ua", "gemini.com.ua", "claude.com.ua", "n8n.com.ua",
  "midjourney.com.ua", "notion.com.ua", "grok.com.ua", "qwen.com.ua", "runway.com.ua",
  "sora.com.ua", "dalle.com.ua", "flux.com.ua", "perplexity.com.ua", "heygen.com.ua",
  "elevenlabs.com.ua", "reve.com.ua", "trae.com.ua", "llm.com.ua", "kling.com.ua",
  "openai.com.ua", "manus.com.ua", "argil.com.ua", "krea.com.ua", "suno.com.ua",
  "syntesia.com.ua", "mcp.com.ua", "huggingface.com.ua", "copilot.com.ua", "ernie.com.ua",
  "lovable.com.ua", "seedream.com.ua", "deepseek.com.ua", "luma.com.ua"
];

export const MOCK_SITES: Site[] = DOMAIN_LIST.map((domain, index) => ({
  id: (index + 1).toString(),
  name: domain, // Kept for internal reference, though UI might hide it
  url: domain,
  favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  status: index % 7 === 0 ? SiteStatus.WARNING : index % 13 === 0 ? SiteStatus.CRITICAL : SiteStatus.HEALTHY,
  theme: hashStringToTheme(domain), // Generate theme from URL hash
  metrics: {
    speedScore: Math.floor(seededRandom(index * 100) * 40) + 55,
    notFoundCount: Math.floor(seededRandom(index * 101) * 20),
    indexedPages: Math.floor(seededRandom(index * 102) * 5000) + 100,
    trafficTrend: Array.from({ length: 7 }, (_, i) => ({
      date: `Day ${i}`,
      value: 500 + seededRandom(index * 1000 + i) * 1500
    })),
    organicKeywords: Math.floor(seededRandom(index * 103) * 15000),
    rankDistribution: {
      top1: Math.floor(seededRandom(index * 104) * 50),
      top3: Math.floor(seededRandom(index * 105) * 150),
      top5: Math.floor(seededRandom(index * 106) * 300),
      top10: Math.floor(seededRandom(index * 107) * 600),
      top20: Math.floor(seededRandom(index * 108) * 1200),
      top100: Math.floor(seededRandom(index * 109) * 3000)
    },
    deviceTraffic: {
      desktop: Math.floor(seededRandom(index * 110) * 40) + 30,
      mobile: Math.floor(seededRandom(index * 111) * 30) + 30 // Rough approximation
    }
  },
  contentQueue: {
    live: Math.floor(seededRandom(index * 112) * 200),
    queued: Math.floor(seededRandom(index * 113) * 20),
    articles: Math.floor(seededRandom(index * 114) * 150) + 10,  // 10-160 published articles
    drafts: Math.floor(seededRandom(index * 115) * 30)  // 0-30 drafts
  }
}));

// Ensure mobile percentage adds up to 100
MOCK_SITES.forEach(site => {
    site.metrics.deviceTraffic.mobile = 100 - site.metrics.deviceTraffic.desktop;
});


export const MOCK_KEYWORDS: Keyword[] = [
  { id: '1', term: 'best truck crash lawyer in las vegas', intent: 'T', volume: 320, difficulty: 6, cpc: 123.90, updated: '2h ago', status: { research: true } },
  { id: '2', term: 'top-rated truck injury attorney las vegas', intent: 'T', volume: 320, difficulty: 6, cpc: 123.90, updated: '5h ago' },
  { id: '3', term: 'legal help for truck accidents las vegas', intent: 'T', volume: 320, difficulty: 17, cpc: 123.90, updated: '1d ago', status: { research: true } },
  { id: '4', term: 'truck crash legal expert las vegas', intent: 'T', volume: 140, difficulty: 6, cpc: 70.60, updated: '2d ago' },
  { id: '5', term: 'semi-truck injury legal services las vegas', intent: 'T', volume: 140, difficulty: 30, cpc: 70.60, updated: '3d ago' },
  { id: '6', term: 'jackknife collision attorney las vegas', intent: 'T', volume: 30, difficulty: 45, cpc: 0.00, updated: '3d ago' },
  { id: '7', term: 'motorcycle-truck crash lawyer las vegas', intent: 'T', volume: 20, difficulty: 52, cpc: 0.00, updated: '4d ago' },
  { id: '8', term: 'truck rollover legal claim las vegas', intent: 'T', volume: 20, difficulty: 70, cpc: 0.00, updated: '1w ago' },
  { id: '9', term: 'truck wreck compensation lawyer las vegas', intent: 'T', volume: 10, difficulty: 60, cpc: 0.00, updated: '1w ago' },
  { id: '10', term: 'trucking accident attorney near me', intent: 'T', volume: 10, difficulty: 35, cpc: 0.00, updated: '1w ago' },
  { id: '11', term: 'las vegas semi crash settlements', intent: 'C', volume: 90, difficulty: 25, cpc: 45.00, updated: '2d ago' },
  { id: '12', term: '18 wheeler accident lawyer las vegas', intent: 'T', volume: 210, difficulty: 12, cpc: 110.50, updated: '1d ago' },
  { id: '13', term: 'commercial vehicle accident attorney', intent: 'T', volume: 50, difficulty: 40, cpc: 85.00, updated: '3d ago' },
  { id: '14', term: 'how much is a truck accident settlement worth', intent: 'I', volume: 800, difficulty: 65, cpc: 12.00, updated: '4d ago' },
  { id: '15', term: 'truck driver negligence lawyer', intent: 'T', volume: 40, difficulty: 22, cpc: 60.00, updated: '5d ago' }
];

export const MOCK_AUTHORS: AuthorPersona[] = [
  {
    id: '1',
    name: 'Sarah, The Analyst',
    role: 'Data-Driven Expert',
    avatarUrl: 'https://picsum.photos/100/100?random=101',
    systemPrompt: 'Style: Analytical, precise, chart-focused. Focus: Interpretation of complex metrics.',
    active: true
  },
  {
    id: '2',
    name: 'Marcus, The Storyteller',
    role: 'Narrative Lead',
    avatarUrl: 'https://picsum.photos/100/100?random=102',
    systemPrompt: 'Style: Emotional, engaging, narrative-driven. Focus: Case studies and user journeys.',
    active: false
  },
  {
    id: '3',
    name: 'Dr. Chen',
    role: 'Technical SEO',
    avatarUrl: 'https://picsum.photos/100/100?random=103',
    systemPrompt: 'Style: Highly technical, code-heavy, concise. Focus: Schema, rendering, and crawl budget.',
    active: false
  },
  {
    id: '4',
    name: 'Emily, Trends',
    role: 'News Reporter',
    avatarUrl: 'https://picsum.photos/100/100?random=104',
    systemPrompt: 'Style: Urgent, punchy, news-cycle focused. Focus: Algorithm updates and industry shifts.',
    active: false
  },
   {
    id: '5',
    name: 'Alex, The Minimalist',
    role: 'Product Owner',
    avatarUrl: 'https://picsum.photos/100/100?random=105',
    systemPrompt: 'Style: Direct, bullet-point heavy, actionable. Focus: ROI and bottom-line impact.',
    active: false
  }
];

export const MOCK_ARTICLES: Article[] = [
    {
        id: '1',
        mainKeyword: 'papiertüten bedrucken',
        title: 'Papiertüten bedrucken lassen: Der ultimative Guide für Unternehmen',
        status: 'Finished',
        publicationDate: '12.03.2024',
        image: 'https://picsum.photos/400/300?random=201',
        type: 'Leitfaden',
        funnel: 'BOFU',
        completed: true,
        slug: 'papiertueten-bedrucken-guide',
        metaDescription: 'Erfahren Sie alles über das Bedrucken von Papiertüten. Materialien, Druckverfahren und Tipps für das perfekte Markenbranding.'
    },
    {
        id: '2',
        mainKeyword: 'seo tools vergleich',
        title: 'Die 10 besten SEO Tools im Vergleich für Agenturen 2024',
        status: 'In Progress',
        type: 'Listicle',
        funnel: 'MOFU',
        completed: false
    },
    {
        id: '3',
        mainKeyword: 'content marketing strategie',
        title: 'Wie Sie eine Content Marketing Strategie entwickeln, die konvertiert',
        status: 'Planned',
        type: 'How-To',
        funnel: 'TOFU',
        completed: false
    },
    {
        id: '4',
        mainKeyword: 'google core update recovery',
        title: 'Google Core Update: So erholen Sie sich von Ranking-Verlusten',
        status: 'Planned',
        type: 'Pillar',
        funnel: 'TOFU',
        completed: false
    }
];

export const MOCK_LLM_RESULTS: LLMResult[] = [
    {
        id: '1',
        query: 'bagstage erfahrungen',
        score: 92,
        lastCheck: '2h ago',
        platforms: {
            chatgpt: 'positive',
            claude: 'positive',
            gemini: 'positive',
            perplexity: 'neutral'
        }
    },
    {
        id: '2',
        query: 'ist bagstage seriös',
        score: 85,
        lastCheck: '1d ago',
        platforms: {
            chatgpt: 'positive',
            claude: 'neutral',
            gemini: 'positive',
            perplexity: 'positive'
        }
    },
    {
         id: '3',
        query: 'bagstage lieferzeiten',
        score: 45,
        lastCheck: '3d ago',
        platforms: {
            chatgpt: 'neutral',
            claude: 'negative',
            gemini: 'neutral',
            perplexity: 'negative'
        }
    }
];