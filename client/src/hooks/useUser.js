import { useUser as useClerkUser } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import api from '../lib/api'

/**
 * Combines Clerk user data with MongoDB user document.
 * Returns { clerkUser, dbUser, role, isLoaded, error }
 */
export function useUser() {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useClerkUser()
  const [dbUser, setDbUser] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!clerkLoaded) return
    if (!isSignedIn) {
      setIsLoaded(true)
      return
    }

    async function syncAndFetch() {
      try {
        // Sync creates/updates the MongoDB User document
        await api.post('/users/sync')
        const { data } = await api.get('/users/me')
        setDbUser(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoaded(true)
      }
    }

    syncAndFetch()
  }, [clerkLoaded, isSignedIn, clerkUser?.id])

  return {
    clerkUser,
    dbUser,
    role: dbUser?.role ?? null,
    isLoaded,
    isSignedIn,
    error,
  }
}
