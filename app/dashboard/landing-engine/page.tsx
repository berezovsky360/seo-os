'use client'

import { useRouter } from 'next/navigation'
import LandingEngineDashboard from '@/components/modules/landing-engine/LandingEngineDashboard'

export default function LandingEnginePage() {
  const router = useRouter()
  return <LandingEngineDashboard onBack={() => router.push('/dashboard')} />
}
