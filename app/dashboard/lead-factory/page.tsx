'use client'

import { useRouter } from 'next/navigation'
import LeadFactoryDashboard from '@/components/modules/lead-factory/LeadFactoryDashboard'

export default function LeadFactoryPage() {
  const router = useRouter()
  return <LeadFactoryDashboard onBack={() => router.push('/dashboard')} />
}
