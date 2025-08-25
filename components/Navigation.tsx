'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

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

          {/* Desktop Navigation */}
          <div className="desktop-nav space-x-4">
            <a href="/">Dashboard</a>
            <a href="/create">Create Audit</a>
            <a href="/results">View Results</a>
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            className="mobile-menu-button"
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div className={`mobile-nav ${isMenuOpen ? 'mobile-nav-open' : ''}`}>
          <a href="/" onClick={() => setIsMenuOpen(false)}>Dashboard</a>
          <a href="/create" onClick={() => setIsMenuOpen(false)}>Create Audit</a>
          <a href="/results" onClick={() => setIsMenuOpen(false)}>View Results</a>
        </div>
      </nav>

      <style jsx>{`
        /* Desktop Navigation - Hide on mobile */
        .desktop-nav {
          display: flex;
        }

        /* Mobile Menu Button - Hide on desktop */
        .mobile-menu-button {
          display: none;
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

        /* Mobile Dropdown Menu */
        .mobile-nav {
          display: none;
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

        .mobile-nav a {
          display: block;
          padding: 1rem 1.5rem;
          color: #333;
          text-decoration: none;
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s;
        }

        .mobile-nav a:hover {
          background-color: #f3f4f6;
        }

        .mobile-nav a:last-child {
          border-bottom: none;
        }

        /* Platform title - hide text on small mobile */
        .platform-title {
          display: inline;
        }

        /* Responsive Breakpoint - 768px for tablets and below */
        @media (max-width: 768px) {
          nav {
            position: relative;
          }

          .nav-content {
            padding: 0.75rem 1rem;
          }

          .desktop-nav {
            display: none !important;
          }

          .mobile-menu-button {
            display: flex;
          }

          .mobile-nav {
            display: block;
          }

          .mobile-nav-open {
            max-height: 300px;
          }

          /* Animate hamburger to X when open */
          .mobile-menu-button:has(+ .mobile-nav-open) .hamburger-line:nth-child(1),
          .mobile-nav-open ~ .mobile-menu-button .hamburger-line:nth-child(1) {
            transform: translateY(7px) rotate(45deg);
          }

          .mobile-menu-button:has(+ .mobile-nav-open) .hamburger-line:nth-child(2),
          .mobile-nav-open ~ .mobile-menu-button .hamburger-line:nth-child(2) {
            opacity: 0;
          }

          .mobile-menu-button:has(+ .mobile-nav-open) .hamburger-line:nth-child(3),
          .mobile-nav-open ~ .mobile-menu-button .hamburger-line:nth-child(3) {
            transform: translateY(-7px) rotate(-45deg);
          }
        }

        /* Extra small devices - hide platform title text */
        @media (max-width: 480px) {
          .platform-title {
            display: none;
          }
        }
      `}</style>
    </>
  )
}