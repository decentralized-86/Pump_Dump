'use client'

import { useRouter, usePathname } from 'next/navigation'

const GameControllerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <circle cx="7" cy="12" r="2"/>
    <circle cx="17" cy="12" r="2"/>
  </svg>
)

const PersonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
    <circle cx="12" cy="8" r="4"/>
    <path d="M20 21a8 8 0 10-16 0"/>
  </svg>
)

const LeaderboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
    <rect x="4" y="12" width="4" height="8"/>
    <rect x="10" y="8" width="4" height="12"/>
    <rect x="16" y="4" width="4" height="16"/>
  </svg>
)

const SmileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <circle cx="9" cy="9" r="1"/>
    <circle cx="15" cy="9" r="1"/>
  </svg>
)

export default function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black pb-6 pt-2 px-4">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <button 
          onClick={() => router.push('/game')}
          className="flex flex-col items-center w-14 h-14 bg-[#1B3129] rounded-2xl justify-center"
        >
          <GameControllerIcon />
        </button>
        <button 
          onClick={() => router.push('/referral')}
          className={`flex flex-col items-center w-14 h-14 bg-[#1B3129] rounded-2xl justify-center ${
            pathname === '/referral' ? 'bg-[#234339]' : ''
          }`}
        >
          <PersonIcon />
          <span className="text-[#4ADE80] text-xs mt-0.5">Invite</span>
        </button>
        <button 
          onClick={() => router.push('/leaderboard')}
          className={`flex flex-col items-center px-4 py-2 bg-[#1B3129] rounded-2xl min-w-[120px] ${
            pathname === '/leaderboard' ? 'bg-[#234339]' : ''
          }`}
        >
          <LeaderboardIcon />
          <span className="text-[#4ADE80] text-xs mt-0.5">Leaderboard</span>
        </button>
        <button 
          onClick={() => router.push('/profile')}
          className={`flex flex-col items-center w-14 h-14 bg-[#1B3129] rounded-2xl justify-center ${
            pathname === '/profile' ? 'bg-[#234339]' : ''
          }`}
        >
          <SmileIcon />
        </button>
      </div>
    </div>
  )
} 