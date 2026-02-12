'use client'

import { useRouter } from 'next/navigation'
import KeywordResearch from '@/components/KeywordResearch'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function KeywordResearchPage() {
  const router = useRouter()
  const { userRole } = useAuth()
  return <KeywordResearch userRole={userRole} onBack={() => router.push('/dashboard')} />
}
