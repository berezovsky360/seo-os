'use client'

import { useRouter } from 'next/navigation'
import FunnelBuilderDashboard from '@/components/modules/funnel-builder/FunnelBuilderDashboard'

export default function FunnelBuilderPage() {
  const router = useRouter()
  return <FunnelBuilderDashboard onBack={() => router.push('/dashboard')} />
}
