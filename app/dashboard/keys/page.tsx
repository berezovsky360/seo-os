'use client'

import { useRouter } from 'next/navigation'
import KeyManagement from '@/components/modules/key-management/KeyManagement'

export default function KeysPage() {
  const router = useRouter()
  return <KeyManagement onBack={() => router.push('/dashboard')} />
}
