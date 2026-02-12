'use client'

import { useRouter } from 'next/navigation'
import NanaBananaDashboard from '@/components/modules/nana-banana/NanaBananaDashboard'

export default function NanaBananaPage() {
  const router = useRouter()
  return <NanaBananaDashboard onBack={() => router.push('/dashboard')} />
}
