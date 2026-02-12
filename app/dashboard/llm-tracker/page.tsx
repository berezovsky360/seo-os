'use client'

import { useRouter } from 'next/navigation'
import { LLMTrackerView } from '@/components/SEOViews'

export default function LLMTrackerPage() {
  const router = useRouter()
  return <LLMTrackerView onBack={() => router.push('/dashboard')} />
}
