import { createContext, useContext, useEffect, useState } from 'react'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import api from '../lib/api'

const UserContext = createContext(null)

/**
 * UserProvider — wraps the entire app so every component can
 * call useUserContext() without triggering duplicate /users/sync requests.
 */
export function UserProvider({ children }) {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useClerkUser()
  const [dbUser, setDbUser] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(null)

  async function refetchUser() {
    try {
      const { data } = await api.get('/users/me')
      setDbUser(data)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    if (!clerkLoaded) return
    if (!isSignedIn) {
      setDbUser(null)
      setIsLoaded(true)
      return
    }

    let cancelled = false
    let retries = 0
    async function syncAndFetch() {
      try {
        // Always send {} so axios includes Content-Type: application/json
        // (without a body, axios omits the header and express.json() skips parsing)
        await api.post('/users/sync', {})
        const { data } = await api.get('/users/me')
        if (!cancelled) setDbUser(data)
      } catch (err) {
        if (cancelled) return
        // Retry once after 1.5s — handles transient network/auth token delays at sign-up
        if (retries === 0) {
          retries++
          setTimeout(syncAndFetch, 1500)
          return
        }
        setError(err.message)
      } finally {
        // Only mark loaded after success or second failure — not after first retry
        if (!cancelled && retries !== 1) setIsLoaded(true)
      }
    }

    syncAndFetch()
    return () => { cancelled = true }
  }, [clerkLoaded, isSignedIn, clerkUser?.id])

  const userStatus = dbUser?.status ? String(dbUser.status).toUpperCase() : null
  const isApproved = userStatus === 'APPROVED' || userStatus === 'ACTIVE'
  const isPending = userStatus === 'PENDING'
  const isRejected = userStatus === 'REJECTED'

  const value = {
    clerkUser,
    dbUser,
    setDbUser,
    refetchUser,
    role: dbUser?.role ?? null,
    status: userStatus,
    isApproved,
    isPending,
    isRejected,
    isLoaded,
    loading: !isLoaded,
    isSignedIn,
    error,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

/** Hook to consume user context — replaces the old useUser() hook */
export function useUserContext() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUserContext must be used within <UserProvider>')
  return ctx
}
