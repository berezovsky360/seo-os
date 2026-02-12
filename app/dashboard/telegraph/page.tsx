'use client'

import { useRouter } from 'next/navigation'
import TelegraphDashboard from '@/components/modules/telegraph/TelegraphDashboard'

export default function TelegraphPage() {
  const router = useRouter()
  return <TelegraphDashboard onBack={() => router.push('/dashboard')} />
}
