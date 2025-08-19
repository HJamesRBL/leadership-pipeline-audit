'use client'

import { useState } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'

export const metadata: Metadata = {
  title: 'Leadership Pipeline Audit Platform | The RBL Group',
  description: 'Leadership Pipeline Audit Platform - The RBL Group',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <html lang="en">
      <body>
        <nav>
          <div className="nav-content">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Image
                src="/rbl-logo.png"
                alt="The RBL Group"
                width={250}
                height={100}
                style={{ height: 'auto', width: 'auto', maxHeight: '50px', maxWidth: '180px' }}
                priority
                className="logo"
              />
              <span style={{
                borderLeft: '1px solid #d1d5db',
                height: '40px',
                marginLeft: '0.5rem',
                marginRight: '0.5rem'
              }} className="divider"></span>
              <span className="title-text">Leadership Pipeline Audit Platform</span>
            </h1>
            
            {/* Desktop Menu */}
            <div className="desktop-menu space-x-4">
              <a href="/">Dashboard</a>
              <a href="/create">Create Audit</a>
              <a href="/results">View Results</a>
            </div>
            
            {/* Mobile Menu Button */}
            <button 
              className="mobile-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
          
          {/* Mobile Dropdown Menu */}
          {isMenuOpen && (
            <div className="mobile-dropdown">
              <a href="/" onClick={() => setIsMenuOpen(false)}>Dashboard</a>
              <a href="/create" onClick={() => setIsMenuOpen(false)}>Create Audit</a>
              <a href="/results" onClick={() => setIsMenuOpen(false)}>View Results</a>
            </div>
          )}
        </nav>
        <main style={{ minHeight: 'calc(100vh - 73px)', paddingTop: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  )
}