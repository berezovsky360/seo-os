'use client'

import { useRouter } from 'next/navigation'
import TaskHistory from '@/components/TaskHistory'

export default function TasksPage() {
  const router = useRouter()
  return <TaskHistory onBack={() => router.push('/dashboard')} />
}
