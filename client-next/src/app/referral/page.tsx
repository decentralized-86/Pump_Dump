'use client'

import { useState } from 'react'
import Image from 'next/image'
import BottomNavigation from '@/components/BottomNavigation'

export default function Referral() {
  const [referralCode] = useState('5026139769')
  const [timeRemaining] = useState('00 : 00 : 00')

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode)
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="relative pt-3">
        <h1 
          className="text-[#4ADE80] text-4xl font-black text-center"
          style={{ 
            textShadow: '0 0 15px rgba(74, 222, 128, 0.6)',
            fontFamily: 'system-ui',
            letterSpacing: '0.5px'
          }}
        >
          Invite Friends
        </h1>
        <Image
          src="/assets/carttoon1-CbncO-Xi.png"
          alt="Ghost"
          width={42}
          height={42}
          className="absolute top-1 right-4"
        />
      </div>

      {/* Info Boxes */}
      <div className="flex gap-3 px-4 mt-6">
        <div className="flex-1 bg-[#1B3129] rounded-3xl px-4 py-2.5 text-center">
          <div className="text-[#4ADE80] text-xs mb-0.5">Your Referral Code</div>
          <div className="text-white text-lg font-mono tracking-wider">{referralCode}</div>
        </div>
        <div className="flex-1 bg-[#1B3129] rounded-3xl px-4 py-2.5 text-center">
          <div className="text-[#FFD700] text-xs mb-0.5">Time Remaining</div>
          <div className="text-white text-lg font-mono tracking-wider">{timeRemaining}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center text-center px-4">
        <h2 className="text-3xl font-normal mt-14 mb-16">
          Share this code or link<br />
          with your friends.
        </h2>

        <Image
          src="/assets/carttoon2-Bbwxy4MY.png"
          alt="Two Ghost Characters"
          width={140}
          height={70}
          className="mb-14"
        />

        <p className="text-lg text-gray-300 mb-16">
          When they sign up and play,<br />
          you both earn rewards!
        </p>

        <div className="w-full max-w-[320px] bg-[#1B3129] rounded-2xl p-4">
          <p className="text-base mb-3">Invite your friends and earn rewards!</p>
          <div className="flex gap-3">
            <button 
              className="flex-1 bg-[#4ADE80] text-black py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
              onClick={() => {/* Add invite friend logic */}}
            >
              <span className="text-base">👥</span>
              Invite Friend
            </button>
            <button 
              className="flex-1 bg-[#4ADE80] text-black py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
              onClick={copyToClipboard}
            >
              <span className="text-base">📋</span>
              Copy Link
            </button>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
} 