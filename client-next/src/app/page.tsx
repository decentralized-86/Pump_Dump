'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  useEffect(() => {
    // Initialize Telegram WebApp
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0B0E] text-white">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between">
        <div className="w-full flex flex-col items-center pt-8">
          {/* Logo Text */}
          <div className="text-center mb-6">
            <h1 className="logo-text text-6xl leading-tight mb-2">
              Pumpshie
            </h1>
            <h1 className="logo-text text-6xl leading-tight mb-4">
              Pumps
            </h1>
            <div className="flex items-center justify-center gap-1.5">
              <span className="mini-app-text">Mini App</span>
              <span className="mini-app-check">✓</span>
            </div>
          </div>

          {/* Get Started Button */}
          <button
            onClick={() => window.location.href = '/game'}
            className="get-started-btn"
          >
            GET STARTED
          </button>
        </div>

        {/* Logo Image */}
        <div className="w-full">
          <Image
            src="/assets/pump2--yt2ZhSa.jpg"
            alt="Pumpshie Logo"
            width={500}
            height={500}
            className="game-logo"
            priority
          />
        </div>
      </main>
    </div>
  )
}
