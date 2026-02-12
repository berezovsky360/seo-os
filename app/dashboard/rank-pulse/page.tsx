'use client'

import { useRouter } from 'next/navigation'
import RankPulseDashboard from '@/components/modules/rank-pulse/RankPulseDashboard'

export default function RankPulsePage() {
  const router = useRouter()
  return <RankPulseDashboard onBack={() => router.push('/dashboard')} />
}
