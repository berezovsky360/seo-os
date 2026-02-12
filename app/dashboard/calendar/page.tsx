'use client'

import { useRouter } from 'next/navigation'
import ContentCalendar from '@/components/ContentCalendar'

export default function CalendarPage() {
  const router = useRouter()
  return <ContentCalendar onBack={() => router.push('/dashboard')} />
}
