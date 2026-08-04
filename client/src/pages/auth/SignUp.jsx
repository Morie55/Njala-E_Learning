import { SignUp as ClerkSignUp } from '@clerk/clerk-react'
import njalaLogo from '../../assets/Njala University.jpg'

export default function SignUp() {
  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-[#fbf9f8] text-[#1b1c1c]">
      {/* Mobile Top Header Banner (Sleek, Compact Header for Mobile Viewports) */}
      <header className="md:hidden brand-gradient px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg p-0.5 bg-white/10 border border-white/20 backdrop-blur-md shrink-0 flex items-center justify-center">
            <img src={njalaLogo} alt="Njala Logo" className="w-full h-full object-cover rounded-xs" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-white tracking-wide">NELMS</h1>
            <p className="text-[9px] text-[#a0f3d4] font-semibold uppercase tracking-widest mt-0.5">Academic Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90 bg-white/10 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#a0f3d4] animate-pulse" />
          Njala University
        </div>
      </header>

      {/* Desktop Left Brand Panel (Hidden on Mobile for optimal UX) */}
      <section className="hidden md:flex md:w-1/2 lg:w-5/12 brand-gradient flex-col justify-between p-8 md:p-10 lg:p-12 relative overflow-hidden shrink-0">
        {/* Top — Logo & Portal Badge */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl p-1 bg-white/10 border border-white/20 backdrop-blur-md shadow-inner shrink-0 flex items-center justify-center">
              <img src={njalaLogo} alt="Njala University Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold leading-tight text-white tracking-wide">NELMS</h1>
              <p className="text-[11px] text-[#a0f3d4] font-semibold uppercase tracking-widest">Academic Portal</p>
            </div>
          </div>
        </div>

        {/* Center — Headline & Intro */}
        <div className="relative z-10 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[12px] font-medium text-white/90 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#a0f3d4] animate-pulse" />
            New Account Registration
          </div>
          <h2 className="text-3xl lg:text-[36px] font-bold leading-tight text-white mb-4">
            Join the Academic Community.
          </h2>
          <p className="text-sm md:text-base leading-relaxed text-white/80">
            Create your account using your official university email address to get started with Njala University's e-learning platform.
          </p>
        </div>

        {/* Bottom — System Authority Badges */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">Institution</span>
            <span className="font-semibold text-white mt-0.5">Njala University</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">Registration</span>
            <span className="font-semibold text-white mt-0.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#a0f3d4] shadow-[0_0_8px_#a0f3d4]" />
              Role Verified
            </span>
          </div>
        </div>

        {/* Background ambient lighting effects */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#086b53]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 -left-12 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Main Sign-Up Section */}
      <section className="w-full md:w-1/2 lg:w-7/12 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12 my-auto">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-4 sm:mb-6 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold text-[#03224d]">Create Account</h2>
            <p className="text-xs sm:text-sm text-[#44474f] mt-1">Use your official university email address to register.</p>
          </div>

          {/* Form */}
          <ClerkSignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-xs border border-[#c4c6d0] rounded-xl sm:rounded-2xl p-4 sm:p-8 bg-white w-full',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton:
                  'border border-[#c4c6d0] hover:border-[#03224d] rounded-lg text-[#1b1c1c] hover:bg-[#f6f3f2] transition-colors py-2.5 text-xs sm:text-sm font-medium',
                formButtonPrimary:
                  'bg-[#03224d] hover:bg-[#1f3864] text-white rounded-lg py-2.5 text-sm font-bold transition-all shadow-xs w-full cursor-pointer',
                formFieldInput:
                  'border border-[#c4c6d0] rounded-lg text-base sm:text-sm px-3.5 py-2.5 focus:border-[#03224d] focus:ring-2 focus:ring-[#03224d]/20 transition-all w-full',
                formFieldLabel: 'text-xs sm:text-sm font-semibold text-[#1b1c1c]',
                footerActionLink: 'text-[#03224d] font-bold hover:underline',
                identityPreviewText: 'text-[#1b1c1c] font-medium text-xs sm:text-sm',
              },
            }}
            redirectUrl="/dashboard"
          />

          {/* Help Footer */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-[#c4c6d0] text-center">
            <p className="text-xs sm:text-sm text-[#44474f]">
              Need assistance?{' '}
              <a href="mailto:support@njala.edu.sl" className="text-[#03224d] font-bold hover:underline">
                Contact IT Support
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
