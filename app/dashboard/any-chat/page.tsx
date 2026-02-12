'use client'

import { useRouter } from 'next/navigation'
import AnyChatDashboard from '@/components/modules/any-chat/AnyChatDashboard'
import { useSites } from '@/hooks/useSites'

export default function AnyChatPage() {
  const router = useRouter()
  const { data: sites = [] } = useSites()

  return (
    <AnyChatDashboard
      onBack={() => router.push('/dashboard')}
      sites={sites.map((s: any) => ({ id: s.id, name: s.name }))}
    />
  )
}
