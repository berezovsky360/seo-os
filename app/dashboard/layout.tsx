'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import AIGeneratorModal from '@/components/AIGeneratorModal'
import SetupWizard from '@/components/modules/setup-wizard/SetupWizard'
import { usePreferences } from '@/hooks/useEvents'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Site } from '@/types'
import { Menu, Search } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [setupDismissed, setSetupDismissed] = useState(false)
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const { data: preferences } = usePreferences()

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="flex h-screen w-screen bg-white font-sans text-gray-900 overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-900">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full md:mt-2 md:rounded-tl-[2rem] bg-[#F5F5F7]">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm flex-shrink-0 z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-lg text-gray-900 tracking-tight">SEO OS</span>
          </div>
          <button className="p-2 text-gray-500 bg-gray-100 rounded-full">
            <Search size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative h-full">
          {children}
        </div>
      </main>

      <AIGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        site={selectedSite}
      />

      {preferences && !preferences.setup_completed && !setupDismissed && (
        <SetupWizard onComplete={() => setSetupDismissed(true)} />
      )}
    </div>
  )
}
