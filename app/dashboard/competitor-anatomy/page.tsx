'use client'

import { useRouter } from 'next/navigation'
import CompetitorAnatomyDashboard from '@/components/modules/competitor-anatomy/CompetitorAnatomyDashboard'

export default function CompetitorAnatomyPage() {
  const router = useRouter()
  return <CompetitorAnatomyDashboard onBack={() => router.push('/dashboard')} />
}
