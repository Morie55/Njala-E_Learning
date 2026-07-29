import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const isDummyKey = !PUBLISHABLE_KEY || PUBLISHABLE_KEY.includes('YOUR_CLERK_PUBLISHABLE_KEY')

function MissingKeyBanner() {
  return (
    <div className="min-h-screen bg-[#fbf9f8] flex items-center justify-center p-6">
      <div className="bg-white border border-[#c4c6d0] rounded-xl p-8 max-w-lg shadow-lg text-center">
        <div className="w-16 h-16 bg-[#1f3864]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-[#03224d]">vpn_key</span>
        </div>
        <h1 className="text-[24px] font-bold text-[#03224d] mb-2">Clerk Configuration Required</h1>
        <p className="text-[14px] text-[#44474f] mb-6">
          To enable sign-in and access the NELMS portal, please add your real <strong>Clerk Publishable Key</strong> to <code className="bg-[#f0eded] px-2 py-1 rounded text-[#03224d] font-bold">client/.env</code>.
        </p>

        <div className="bg-[#f6f3f2] border border-[#c4c6d0] rounded-lg p-4 text-left font-mono text-[12px] space-y-1 mb-6 text-[#1b1c1c]">
          <p className="text-[#747780]"># client/.env</p>
          <p><span className="text-[#086b53] font-bold">VITE_CLERK_PUBLISHABLE_KEY</span>=pk_test_...</p>
        </div>

        <div className="text-[12px] text-[#44474f] space-y-2 text-left bg-[#f0eded] p-4 rounded-lg border border-[#c4c6d0]">
          <p className="font-bold text-[#03224d] uppercase tracking-wider">Quick Steps:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="text-[#086b53] font-bold hover:underline">dashboard.clerk.com</a></li>
            <li>Copy your <strong>Publishable Key</strong> and <strong>Secret Key</strong></li>
            <li>Paste the publishable key in <code className="font-bold">client/.env</code></li>
            <li>Paste the secret key & MongoDB URI in <code className="font-bold">server/.env</code></li>
            <li>Restart the Vite dev server</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('ServiceWorker registration failed:', err)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDummyKey ? (
      <MissingKeyBanner />
    ) : (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">
        <RouterProvider router={router} />
      </ClerkProvider>
    )}
  </StrictMode>
)
