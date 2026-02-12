'use client'

import { useRouter } from 'next/navigation'
import CronJobList from '@/components/modules/cron/CronJobList'

export default function CronPage() {
  const router = useRouter()
  return <CronJobList onBack={() => router.push('/dashboard')} />
}
