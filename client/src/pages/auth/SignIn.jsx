import { SignIn as ClerkSignIn } from '@clerk/clerk-react'
import njalaLogo from '../../assets/Njala University.jpg'

export default function SignIn() {
  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-[#fbf9f8]">
      {/* Left — Brand panel */}
      <section className="w-full md:w-1/2 lg:w-5/12 brand-gradient flex flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-12 relative overflow-hidden shrink-0 min-h-[320px] md:min-h-screen">
        {/* Top — Logo & Portal Badge */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl p-1 bg-white/10 border border-white/20 backdrop-blur-md shadow-inner shrink-0 flex items-center justify-center">
              <img src={njalaLogo} alt="Njala University Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-bold leading-tight text-white tracking-wide">NELMS</h1>
              <p className="text-[11px] text-[#a0f3d4] font-semibold uppercase tracking-widest">Academic Portal</p>
            </div>
          </div>
        </div>

        {/* Center — Headline & Intro */}
        <div className="relative z-10 max-w-lg my-8 md:my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[12px] font-medium text-white/90 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#a0f3d4] animate-pulse" />
            Centralized E-Learning Platform
          </div>
          <h2 className="text-[26px] sm:text-[32px] lg:text-[36px] font-bold leading-tight text-white mb-3 sm:mb-4">
            Empowering Academic Excellence.
          </h2>
          <p className="text-[14px] sm:text-[16px] leading-relaxed text-white/80">
            Access your courses, assignments, grades, and resources in one centralized portal designed for the modern scholar.
          </p>
        </div>

        {/* Bottom — System Authority Badges */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">Institution</span>
            <span className="text-[14px] font-semibold text-white mt-0.5">Njala University</span>
          </div>
          <div className="w-px h-8 bg-white/20 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">System Status</span>
            <span className="text-[14px] font-semibold text-white mt-0.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#a0f3d4] shadow-[0_0_8px_#a0f3d4]" />
              Online & Secure
            </span>
          </div>
        </div>

        {/* Background ambient lighting effects */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#086b53]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 -left-12 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Right — Clerk sign-in section */}
      <section className="w-full md:w-1/2 lg:w-7/12 flex items-center justify-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-[24px] sm:text-[28px] font-bold text-[#03224d]">Welcome Back</h2>
            <p className="text-[14px] text-[#44474f] mt-1">Please enter your academic credentials to sign in.</p>
          </div>

          {/* Form */}
          <ClerkSignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-sm border border-[#c4c6d0] rounded-2xl p-6 sm:p-8 bg-white w-full',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'border border-[#c4c6d0] hover:border-[#03224d] rounded-lg text-[#1b1c1c] hover:bg-[#f6f3f2] transition-colors py-2.5 text-[14px] font-medium',
                formButtonPrimary: 'bg-[#03224d] hover:bg-[#1f3864] text-white rounded-lg py-2.5 text-[14px] font-bold transition-all shadow-sm',
                formFieldInput: 'border border-[#c4c6d0] rounded-lg text-[14px] px-3.5 py-2.5 focus:border-[#03224d] focus:ring-2 focus:ring-[#03224d]/20 transition-all',
                formFieldLabel: 'text-[13px] font-semibold text-[#1b1c1c]',
                footerActionLink: 'text-[#03224d] font-bold hover:underline',
                identityPreviewText: 'text-[#1b1c1c] font-medium',
              },
            }}
            redirectUrl="/dashboard"
          />

          {/* IT Support Footer */}
          <div className="mt-6 pt-6 border-t border-[#c4c6d0] text-center">
            <p className="text-[13px] text-[#44474f]">
              Trouble signing in?{' '}
              <a href="mailto:kmorie18c@njala.edu.sl" className="text-[#03224d] font-bold hover:underline">
                Contact IT Support
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
