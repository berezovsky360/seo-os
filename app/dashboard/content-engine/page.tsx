'use client'

import { useRouter } from 'next/navigation'
import ContentEngineDashboard from '@/components/modules/content-engine/ContentEngineDashboard'

export default function ContentEnginePage() {
  const router = useRouter()
  return <ContentEngineDashboard onBack={() => router.push('/dashboard')} />
}
