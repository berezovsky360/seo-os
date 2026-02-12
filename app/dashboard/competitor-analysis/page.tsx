'use client'

import { useRouter } from 'next/navigation'
import CompetitorAnalysisDashboard from '@/components/modules/competitor-analysis/CompetitorAnalysisDashboard'

export default function CompetitorAnalysisPage() {
  const router = useRouter()
  return <CompetitorAnalysisDashboard onBack={() => router.push('/dashboard')} />
}
