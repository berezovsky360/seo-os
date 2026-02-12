'use client'

import { useRouter } from 'next/navigation'
import ContentLots from '@/components/modules/content-engine/ContentLots'

export default function ContentLotsPage() {
  const router = useRouter()
  return <ContentLots onBack={() => router.push('/dashboard')} />
}
