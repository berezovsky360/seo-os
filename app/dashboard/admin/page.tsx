'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import AdminPanel from '@/components/modules/admin/AdminPanel'

export default function AdminPage() {
  const router = useRouter()
  const { userRole, loading } = useAuth()

  useEffect(() => {
    if (!loading && userRole !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [userRole, loading, router])

  if (loading || userRole !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <AdminPanel
      onBack={() => router.push('/dashboard')}
    />
  )
}
