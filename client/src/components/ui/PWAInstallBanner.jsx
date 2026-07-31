import { useEffect, useState } from 'react'

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    // Online / Offline monitor
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // PWA Install prompt listener
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt')
    }
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  return (
    <>
      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="bg-[#ba1a1a] text-white text-[12px] font-bold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-md">
          <span className="material-symbols-outlined text-[16px]">wifi_off</span>
          <span>You are currently offline. Pages and cached resources remain available.</span>
        </div>
      )}

      {/* PWA App Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#03224d] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-4 max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-[#a0f3d4] text-[#002117] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">install_mobile</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-[13px]">Install NELMS App</h4>
            <p className="text-[11px] opacity-80">Add Njala E-Learning to your home screen for quick offline access.</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-[#a0f3d4] text-[#002117] px-3 py-1.5 rounded-lg text-[11px] font-extrabold hover:bg-[#85e4c2] transition-colors"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-white"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
