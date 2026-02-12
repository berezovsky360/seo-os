'use client'

import { useRouter } from 'next/navigation'
import AIWriterDashboard from '@/components/modules/ai-writer/AIWriterDashboard'

export default function AIWriterPage() {
  const router = useRouter()

  return (
    <AIWriterDashboard
      onBack={() => router.push('/dashboard')}
    />
  )
}
