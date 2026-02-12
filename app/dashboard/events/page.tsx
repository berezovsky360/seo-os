'use client'

import { useRouter } from 'next/navigation'
import EventLog from '@/components/modules/event-log/EventLog'

export default function EventsPage() {
  const router = useRouter()
  return <EventLog onBack={() => router.push('/dashboard')} />
}
