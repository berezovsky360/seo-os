'use client'

import { useRouter } from 'next/navigation'
import DocumentationView from '@/components/modules/docs/DocumentationView'

export default function DocsPage() {
  const router = useRouter()
  return <DocumentationView onBack={() => router.push('/dashboard')} />
}
