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

  useEffect(() => {
    if (!clerkLoaded) return
    if (!isSignedIn) {
      setDbUser(null)
      setIsLoaded(true)
      return
    }

    let cancelled = false
    async function syncAndFetch() {
      try {
        await api.post('/users/sync')
        const { data } = await api.get('/users/me')
        if (!cancelled) setDbUser(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setIsLoaded(true)
      }
    }

    syncAndFetch()
    return () => { cancelled = true }
  }, [clerkLoaded, isSignedIn, clerkUser?.id])

  const value = {
    clerkUser,
    dbUser,
    setDbUser,
    role: dbUser?.role ?? null,
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
