'use client'

import { useRouter } from 'next/navigation'
import ConversionLabDashboard from '@/components/modules/conversion-lab/ConversionLabDashboard'

export default function ConversionLabPage() {
  const router = useRouter()
  return <ConversionLabDashboard onBack={() => router.push('/dashboard')} />
}
