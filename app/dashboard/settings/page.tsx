'use client'

import { useRouter } from 'next/navigation'
import AccountSettings from '@/components/modules/settings/AccountSettings'

export default function SettingsPage() {
  const router = useRouter()

  return (
    <AccountSettings
      onBack={() => router.push('/dashboard')}
    />
  )
}
