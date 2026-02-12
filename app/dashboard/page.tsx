'use client'

import { useRouter } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { useSites, useDeleteSite } from '@/hooks/useSites'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useWorkspace } from '@/lib/contexts/WorkspaceContext'
import { Site } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { userRole } = useAuth()
  const { currentWorkspaceId } = useWorkspace()
  const { data: sites = [], isLoading, error } = useSites(currentWorkspaceId || undefined)
  const deleteSiteMutation = useDeleteSite()

  const handleSelectSite = (site: Site) => {
    router.push(`/dashboard/sites/${site.id}`)
  }

  const handleDeleteSite = (siteId: string) => {
    if (userRole === 'user') return
    if (window.confirm('Are you sure you want to delete this property? This action is irreversible.')) {
      deleteSiteMutation.mutate(siteId)
    }
  }

  return (
    <Dashboard
      sites={sites}
      isLoading={isLoading}
      error={error}
      userRole={userRole}
      onDeleteSite={handleDeleteSite}
      onSelectSite={handleSelectSite}
    />
  )
}
