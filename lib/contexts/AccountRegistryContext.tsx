'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import type { LinkedAccount } from '@/types'

const STORAGE_KEY = 'seo-os-accounts'

interface AccountRegistryContextType {
  linkedAccounts: LinkedAccount[]
  currentAccountEmail: string | null
  isLoginModalOpen: boolean
  setIsLoginModalOpen: (open: boolean) => void
  addAccount: () => void
  switchAccount: (email: string) => Promise<void>
  removeAccount: (email: string) => void
  registerCurrentSession: () => Promise<void>
}

const AccountRegistryContext = createContext<AccountRegistryContextType>({
  linkedAccounts: [],
  currentAccountEmail: null,
  isLoginModalOpen: false,
  setIsLoginModalOpen: () => {},
  addAccount: () => {},
  switchAccount: async () => {},
  removeAccount: () => {},
  registerCurrentSession: async () => {},
})

export const useAccountRegistry = () => useContext(AccountRegistryContext)

function loadAccounts(): LinkedAccount[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAccounts(accounts: LinkedAccount[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

// Update a single account's refresh token in the registry
function updateTokenInRegistry(userId: string, refreshToken: string) {
  const accounts = loadAccounts()
  const idx = accounts.findIndex(a => a.user_id === userId)
  if (idx >= 0) {
    accounts[idx].refresh_token = refreshToken
    saveAccounts(accounts)
  }
  return accounts
}

export function AccountRegistryProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth()
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [currentAccountEmail, setCurrentAccountEmail] = useState<string | null>(null)

  // Load accounts from localStorage on mount
  useEffect(() => {
    setLinkedAccounts(loadAccounts())
  }, [])

  // Track current account email
  useEffect(() => {
    if (user?.email) {
      setCurrentAccountEmail(user.email)
    }
  }, [user?.email])

  // Keep refresh tokens up-to-date when Supabase rotates them
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession?.user && newSession.refresh_token) {
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          const updated = updateTokenInRegistry(newSession.user.id, newSession.refresh_token)
          setLinkedAccounts(updated)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Register current session's refresh token in the registry
  const registerCurrentSession = useCallback(async () => {
    if (!user || !session) return

    const accounts = loadAccounts()
    const existing = accounts.findIndex(a => a.user_id === user.id)

    const entry: LinkedAccount = {
      email: user.email || '',
      refresh_token: session.refresh_token,
      display_name: user.user_metadata?.first_name || user.email?.split('@')[0] || '',
      avatar_emoji: user.user_metadata?.avatar_emoji || null,
      user_id: user.id,
    }

    if (existing >= 0) {
      accounts[existing] = entry
    } else {
      accounts.push(entry)
    }

    saveAccounts(accounts)
    setLinkedAccounts(accounts)
  }, [user, session])

  // Auto-register current session when user/session is available
  useEffect(() => {
    if (user && session) {
      registerCurrentSession()
    }
  }, [user?.id, session?.refresh_token, registerCurrentSession])

  const addAccount = useCallback(() => {
    // Save current session before opening the login modal
    registerCurrentSession()
    setIsLoginModalOpen(true)
  }, [registerCurrentSession])

  const switchAccount = useCallback(async (email: string) => {
    // Read latest tokens from localStorage (they stay current via onAuthStateChange)
    const accounts = loadAccounts()
    const target = accounts.find(a => a.email === email)
    if (!target) return

    // Save current session's latest refresh token before switching
    if (user && session) {
      const currentIdx = accounts.findIndex(a => a.user_id === user.id)
      if (currentIdx >= 0) {
        accounts[currentIdx].refresh_token = session.refresh_token
        saveAccounts(accounts)
      }
    }

    try {
      // Use setSession with the refresh token — Supabase will exchange it for a new pair
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: target.refresh_token,
      })

      if (error || !data.session) {
        // Token expired — remove from registry
        const updated = accounts.filter(a => a.email !== email)
        saveAccounts(updated)
        setLinkedAccounts(updated)
        console.error('Session expired for', email, error)
        return
      }

      // Update registry with the new refresh token before reload
      updateTokenInRegistry(data.session.user.id, data.session.refresh_token)

      // Full page reload to reset all state
      window.location.reload()
    } catch (err) {
      console.error('Failed to switch account:', err)
    }
  }, [user, session])

  const removeAccount = useCallback((email: string) => {
    const updated = loadAccounts().filter(a => a.email !== email)
    saveAccounts(updated)
    setLinkedAccounts(updated)
  }, [])

  return (
    <AccountRegistryContext.Provider value={{
      linkedAccounts,
      currentAccountEmail,
      isLoginModalOpen,
      setIsLoginModalOpen,
      addAccount,
      switchAccount,
      removeAccount,
      registerCurrentSession,
    }}>
      {children}
    </AccountRegistryContext.Provider>
  )
}
