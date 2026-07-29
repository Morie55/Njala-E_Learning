import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Clerk session token on every request
api.interceptors.request.use(async (config) => {
  try {
    // window.Clerk is populated by ClerkProvider
    const token = await window.Clerk?.session?.getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch (_) {}
  return config
})

// Normalize errors & handle User Lifecycle 428 Precondition (Password change required)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 428 || err.response?.data?.error === 'PASSWORD_CHANGE_REQUIRED') {
      if (window.location.pathname !== '/activate') {
        window.location.href = '/activate'
      }
    }
    const message =
      err.response?.data?.error || err.response?.data?.message || err.message
    return Promise.reject(new Error(message))
  }
)

export default api
