'use client'

import { useRouter } from 'next/navigation'
import RankMathBridgeSettings from '@/components/modules/rankmath-bridge/RankMathBridgeSettings'

export default function RankMathPage() {
  const router = useRouter()
  return <RankMathBridgeSettings onBack={() => router.push('/dashboard')} />
}
