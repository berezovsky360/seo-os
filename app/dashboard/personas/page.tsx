'use client'

import { useRouter } from 'next/navigation'
import AuthorRotator from '@/components/AuthorRotator'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function PersonasPage() {
  const router = useRouter()
  const { userRole } = useAuth()
  return <AuthorRotator userRole={userRole} onBack={() => router.push('/dashboard')} />
}
