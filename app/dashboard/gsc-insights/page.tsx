'use client'

import { useRouter } from 'next/navigation'
import GSCDashboard from '@/components/modules/gsc-insights/GSCDashboard'

export default function GSCInsightsPage() {
  const router = useRouter()
  return <GSCDashboard onBack={() => router.push('/dashboard')} />
}
