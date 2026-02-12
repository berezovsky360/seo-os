'use client'

import { useRouter } from 'next/navigation'
import { MainKeywordsView } from '@/components/SEOViews'

export default function KeywordsPage() {
  const router = useRouter()
  return <MainKeywordsView onBack={() => router.push('/dashboard')} />
}
