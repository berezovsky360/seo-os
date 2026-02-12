'use client'

import { useRouter } from 'next/navigation'
import Marketplace from '@/components/modules/marketplace/Marketplace'

export default function MarketplacePage() {
  const router = useRouter()

  return (
    <Marketplace
      onBack={() => router.push('/dashboard')}
    />
  )
}
