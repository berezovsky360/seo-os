'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import SiteDetails from '@/components/SiteDetails'

export default function SiteDetailsPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = use(params)
  const router = useRouter()

  return (
    <SiteDetails
      siteId={siteId}
      onBack={() => router.push('/dashboard')}
    />
  )
}
