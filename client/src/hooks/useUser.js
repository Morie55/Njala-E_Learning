/**
 * useUser — backward-compatible shim that re-exports from UserContext.
 * All existing code that imports { useUser } from '../hooks/useUser' continues
 * to work unchanged — but now reads from the single shared context instead of
 * making its own API calls.
 */
export { useUserContext as useUser } from '../context/UserContext'
