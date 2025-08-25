'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  // Don't show navigation on login page or audit leader pages
  if (pathname === '/login' || pathname.startsWith('/audit/')) {
    return null
  }

  // Don't render session-dependent content during build
  const isLoading = status === 'loading'

  return (
    <>
      <nav>
        <div className="nav-content">
          <h1 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            margin: 0,
            fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' // Responsive font size
          }}>
            <Image
              src="/rbl-logo.png"
              alt="The RBL Group"
              width={250}
              height={100}
              style={{ 
                height: 'auto', 
                width: 'auto', 
                maxHeight: 'clamp(35px, 5vw, 50px)', // Responsive logo size
                maxWidth: 'clamp(120px, 15vw, 180px)' 
              }}
              priority
            />
            <span style={{
              borderLeft: '1px solid #d1d5db',
              height: 'clamp(25px, 4vw, 40px)', // Responsive divider
              marginLeft: '0.5rem',
              marginRight: '0.5rem'
            }}></span>
            <span className="platform-title">Leadership Pipeline Audit Platform</span>
          </h1>

          {/* Hamburger Button - Always visible */}
          <button 
            className="menu-button"
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

          {/* Dropdown Menu */}
          <div className={`nav-dropdown ${isMenuOpen ? 'nav-dropdown-open' : ''}`}>
          <a href="/" onClick={() => setIsMenuOpen(false)}>Dashboard</a>
          <a href="/create" onClick={() => setIsMenuOpen(false)}>Create Audit</a>
          <a href="/results" onClick={() => setIsMenuOpen(false)}>View Results</a>
          {!isLoading && session && (
            <button
              onClick={() => {
                setIsMenuOpen(false)
                handleLogout()
              }}
              className="block w-full text-left px-6 py-3 text-red-600 hover:bg-red-50 font-medium"
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      <style jsx>{`
        /* Hamburger Menu Button - Always visible */
        .menu-button {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 40px;
          height: 40px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          z-index: 1001;
        }

        .hamburger-line {
          display: block;
          width: 25px;
          height: 3px;
          background-color: #333;
          margin: 4px 0;
          transition: all 0.3s ease;
          border-radius: 2px;
        }

        /* Dropdown Menu */
        .nav-dropdown {
          display: block;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }

        .nav-dropdown a {
          display: block;
          padding: 1rem 1.5rem;
          color: #333;
          text-decoration: none;
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s;
        }

        .nav-dropdown a:hover {
          background-color: #f3f4f6;
        }

        .nav-dropdown a:last-child {
          border-bottom: none;
        }

        .nav-dropdown-open {
          max-height: 300px;
        }

        /* Animate hamburger to X when open */
        .menu-button:has(+ .nav-dropdown-open) .hamburger-line:nth-child(1),
        .nav-dropdown-open ~ .menu-button .hamburger-line:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }

        .menu-button:has(+ .nav-dropdown-open) .hamburger-line:nth-child(2),
        .nav-dropdown-open ~ .menu-button .hamburger-line:nth-child(2) {
          opacity: 0;
        }

        .menu-button:has(+ .nav-dropdown-open) .hamburger-line:nth-child(3),
        .nav-dropdown-open ~ .menu-button .hamburger-line:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* Platform title - responsive */
        .platform-title {
          display: inline;
        }

        /* Remove all responsive breakpoints since hamburger is always visible */
        nav {
          position: relative;
        }

        .nav-content {
          padding: 0.75rem 1rem;
        }

        /* Extra small devices - make platform title smaller */
        @media (max-width: 480px) {
          .platform-title {
            font-size: 0.875rem; /* Smaller font on mobile */
            display: inline;
          }
        }
      `}</style>
    </>
  )
}