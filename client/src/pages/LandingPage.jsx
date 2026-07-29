import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import njalaLogo from '../assets/Njala University.jpg'
import facultyBuilding from '../assets/Njala University Faculty Building.png'

export default function LandingPage() {
  const { isSignedIn } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const schools = [
    { code: 'SAT', name: 'School of Agriculture & Technology', desc: 'Leading research in sustainable agriculture, crop sciences, and farm mechanization.' },
    { code: 'SEN', name: 'School of Environmental Sciences', desc: 'Focusing on forestry, climate resilience, geography, and natural resource management.' },
    { code: 'SED', name: 'School of Education', desc: 'Training future educators, educational leaders, and pedagogy innovators.' },
    { code: 'SSM', name: 'School of Social Sciences & Management', desc: 'Business administration, economics, accounting, and public policy development.' },
    { code: 'STC', name: 'School of Technology & Computer Science', desc: 'Software engineering, information systems, computer networks, and AI research.' },
    { code: 'SHS', name: 'School of Health Sciences', desc: 'Nursing, public health, community medicine, and biomedical research.' },
  ]

  const features = [
    {
      icon: 'school',
      title: 'Student Learning Hub',
      desc: 'Access registered course materials, submit assignments digitally, view real-time gradebooks, and receive instant course announcements.',
      color: 'bg-[#086b53]/10 text-[#086b53]',
    },
    {
      icon: 'menu_book',
      title: 'Lecturer Suite',
      desc: 'Manage course syllabi, upload PDF & video resources, post deadlines, review student submissions, and issue digital grades.',
      color: 'bg-[#03224d]/10 text-[#03224d]',
    },
    {
      icon: 'manage_search',
      title: 'Departmental Oversight',
      desc: 'Empower Department Heads with course auditing, enrollment monitoring, curriculum oversight, and lecturer performance metrics.',
      color: 'bg-[#dd9235]/10 text-[#dd9235]',
    },
    {
      icon: 'admin_panel_settings',
      title: 'Enterprise Administration',
      desc: 'Centralized school and department creation, automated bulk CSV user provisioning, and full system security audit logs.',
      color: 'bg-purple-900/10 text-purple-900',
    },
  ]

  return (
    <div className="min-h-screen bg-[#fbf9f8] text-[#1b1c1c] font-sans selection:bg-[#086b53] selection:text-white flex flex-col">
      {/* ── Sticky Top Navigation ── */}
      <header className="sticky top-0 z-50 bg-[#03224d]/95 backdrop-blur-md border-b border-white/10 text-white transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl p-0.5 bg-white/10 border border-white/20 backdrop-blur-md shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src={njalaLogo} alt="Njala University Crest" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-wide leading-none">NELMS</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#a0f3d4] text-[#002117] px-1.5 py-0.5 rounded">Portal</span>
              </div>
              <p className="text-[11px] text-[#a0f3d4] font-medium tracking-wide">Njala University E-Learning</p>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/80">
            <a href="#overview" className="hover:text-white transition-colors">Overview</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#schools" className="hover:text-white transition-colors">Schools</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="bg-[#086b53] hover:bg-[#065441] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition-colors border border-white/20"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="bg-[#086b53] hover:bg-[#065441] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>Register</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#03224d] px-4 py-4 space-y-3">
            <nav className="flex flex-col gap-2 text-sm font-semibold text-white/90">
              <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-white/10">Overview</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-white/10">Features</a>
              <a href="#schools" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-white/10">Schools</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-white/10">About</a>
            </nav>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              {isSignedIn ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-[#086b53] text-white px-4 py-2.5 rounded-xl font-bold text-center text-sm"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/20"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center bg-[#086b53] text-white px-4 py-2.5 rounded-xl text-sm font-bold"
                  >
                    Register Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ── */}
      <section id="overview" className="relative brand-gradient text-white pt-12 pb-16 sm:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs sm:text-sm font-medium text-[#a0f3d4]">
                <span className="w-2 h-2 rounded-full bg-[#a0f3d4] animate-pulse" />
                Njala University Official Academic Portal
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
                Empowering Academic Excellence Through Digital Learning.
              </h1>

              <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                A unified, state-of-the-art e-learning management platform connecting students, lecturers, department heads, and university administrators across all Njala campuses.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {isSignedIn ? (
                  <Link
                    to="/dashboard"
                    className="w-full sm:w-auto bg-[#086b53] hover:bg-[#065441] text-white px-8 py-3.5 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>Enter My Dashboard</span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/sign-in"
                      className="w-full sm:w-auto bg-[#086b53] hover:bg-[#065441] text-white px-8 py-3.5 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <span>Sign In to Portal</span>
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                    <Link
                      to="/sign-up"
                      className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white px-7 py-3.5 rounded-xl font-semibold text-base transition-colors flex items-center justify-center cursor-pointer"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>

              {/* Quick Status Highlights */}
              <div className="pt-6 border-t border-white/15 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white">6</p>
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">Schools</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#a0f3d4]">24+</p>
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">Departments</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white">24/7</p>
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">Access</p>
                </div>
              </div>
            </div>

            {/* Right Image Feature */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Main Glassmorphic Photo Frame */}
                <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white/5 backdrop-blur-md p-2">
                  <img
                    src={facultyBuilding}
                    alt="Njala University Faculty Building"
                    className="w-full h-[320px] sm:h-[420px] object-cover rounded-xl shadow-inner"
                  />

                  {/* Overlay Badge 1 */}
                  <div className="absolute top-6 left-6 bg-[#03224d]/90 border border-white/20 backdrop-blur-md p-3.5 rounded-xl text-white shadow-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#086b53] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-[20px]">verified</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Njala University</p>
                      <p className="text-[11px] text-[#a0f3d4] font-medium">Main Campus Portal</p>
                    </div>
                  </div>

                  {/* Overlay Badge 2 */}
                  <div className="absolute bottom-6 right-6 bg-white/95 border border-[#c4c6d0] text-[#03224d] p-3.5 rounded-xl shadow-xl flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#086b53] text-[24px]">grade</span>
                    <div>
                      <p className="text-xs font-bold">Digital Gradebooks</p>
                      <p className="text-[11px] text-[#44474f]">Automated Submissions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient lighting effects */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#086b53]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 -right-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ── Key Features Section ── */}
      <section id="features" className="py-16 sm:py-24 bg-white border-b border-[#c4c6d0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#086b53] bg-[#086b53]/10 px-3 py-1 rounded-full">
              System Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#03224d] mt-3">
              Purpose-Built for Sierra Leone Higher Education
            </h2>
            <p className="text-sm sm:text-base text-[#44474f] mt-3">
              Designed to meet the specific operational workflows of Njala University students, faculty members, and academic departments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[#fbf9f8] border border-[#c4c6d0] rounded-2xl p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-[26px]">{f.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#03224d] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#44474f] leading-relaxed">{f.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#c4c6d0]/40 flex items-center text-xs font-bold text-[#03224d] group-hover:text-[#086b53] transition-colors">
                  <span>Learn more</span>
                  <span className="material-symbols-outlined text-[16px] ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Academic Schools Section ── */}
      <section id="schools" className="py-16 sm:py-24 bg-[#fbf9f8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#03224d] bg-[#03224d]/10 px-3 py-1 rounded-full">
              Academic Divisions
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#03224d] mt-3">
              Explore Njala Academic Schools
            </h2>
            <p className="text-sm sm:text-base text-[#44474f] mt-3">
              Serving diverse disciplines across all university campuses with digitized course structures and departmental oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map((s) => (
              <div
                key={s.code}
                className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-xs hover:border-[#03224d] transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold font-mono bg-[#03224d] text-white px-2.5 py-1 rounded">
                    {s.code}
                  </span>
                  <span className="material-symbols-outlined text-[#086b53] text-[20px]">domain</span>
                </div>
                <h3 className="text-base font-bold text-[#03224d] mb-2">{s.name}</h3>
                <p className="text-xs sm:text-sm text-[#44474f] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call To Action Banner ── */}
      <section className="py-16 bg-[#03224d] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Ready to Begin Your Academic Journey?
          </h2>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
            Sign in with your official Njala University credentials to access your courses, submit assignments, and track your academic progress.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto bg-[#086b53] hover:bg-[#065441] text-white px-8 py-3.5 rounded-xl font-bold text-base transition-all shadow-md cursor-pointer"
              >
                Go to Portal Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="w-full sm:w-auto bg-[#086b53] hover:bg-[#065441] text-white px-8 py-3.5 rounded-xl font-bold text-base transition-all shadow-md cursor-pointer"
                >
                  Sign In Now
                </Link>
                <Link
                  to="/sign-up"
                  className="w-full sm:w-auto border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors cursor-pointer"
                >
                  Register Account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="about" className="bg-[#001736] text-white/70 py-12 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-white/10">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-white">
                <img src={njalaLogo} alt="Njala Logo" className="w-8 h-8 rounded-lg object-cover" />
                <span className="text-lg font-bold">NELMS</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Njala E-Learning Management System (NELMS). Dedicated to providing modern digital education across Sierra Leone.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Quick Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#overview" className="hover:text-white transition-colors">Overview</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#schools" className="hover:text-white transition-colors">Academic Schools</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Portals</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/sign-in" className="hover:text-white transition-colors">Student Sign In</Link></li>
                <li><Link to="/sign-in" className="hover:text-white transition-colors">Lecturer Sign In</Link></li>
                <li><Link to="/sign-in" className="hover:text-white transition-colors">Admin Console</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Support & Help</h4>
              <p className="text-xs text-white/60 mb-2">Need assistance with your portal account?</p>
              <a href="mailto:kmorie18c@njala.edu.sl" className="text-xs text-[#a0f3d4] font-semibold hover:underline block">
                kmorie18c@njala.edu.sl
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 gap-3">
            <p>© {new Date().getFullYear()} Njala University. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#a0f3d4]" />
              <span>NELMS Production v1.0.0</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
