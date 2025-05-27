'use client'

import { useState } from 'react'
import Image from 'next/image'
import BottomNavigation from '@/components/BottomNavigation'

interface LeaderboardEntry {
  rank: number
  name: string
  points: number
  project?: string
  playersCount?: number
}

interface LeaderboardState {
  activeTab: 'individual' | 'projects'
  timeRemaining: string
  userInfo: {
    name: string
    rank: number
    points: number
  }
  individualLeaderboard: LeaderboardEntry[]
  projectLeaderboard: LeaderboardEntry[]
}

// SVG Icons as components
const GameControllerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="1.5">
    <path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/>
    <circle cx="7" cy="12" r="1.5"/>
    <circle cx="17" cy="12" r="1.5"/>
    <path d="M11 9h2v6h-2z"/>
  </svg>
)

const CrownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5">
    <path d="M12 2l3 6 6-2-2 6 2 6-6-2-3 6-3-6-6 2 2-6-2-6 6 2z"/>
  </svg>
)

const GroupIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="1.5">
    <circle cx="12" cy="8" r="5"/>
    <path d="M20 21a8 8 0 1 0-16 0"/>
  </svg>
)

const ProfileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9BA1A6" strokeWidth="1.5">
    <circle cx="12" cy="8" r="5"/>
    <path d="M20 21a8 8 0 1 0-16 0"/>
  </svg>
)

const QuestionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#9BA1A6">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
  </svg>
)

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9BA1A6" strokeWidth="1.5">
    <circle cx="12" cy="8" r="5"/>
    <path d="M20 21a8 8 0 1 0-16 0"/>
  </svg>
)

const StarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)

const LeaderboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="1.5">
    <path d="M8 6h8v12H8z"/>
    <path d="M4 10h4v8H4z"/>
    <path d="M16 4h4v14h-4z"/>
  </svg>
)

const SmileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
)

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardState>({
    activeTab: 'individual',
    timeRemaining: "00:00:00",
    userInfo: {
      name: "Native Pumpshie",
      rank: 1,
      points: 1435.851100000053
    },
    individualLeaderboard: [
      { rank: 1, name: "achikoli", points: 784, project: "Native Pumpshie" },
      { rank: 2, name: "shbash1", points: 207, project: "No Project" },
      { rank: 3, name: "ndrew_t", points: 162, project: "Global" },
      { rank: 4, name: "efi_LLo", points: 126, project: "Native Pumpshie" },
      { rank: 5, name: "akares12", points: 73, project: "No Project" },
      { rank: 6, name: "arcin03", points: 14, project: "No Project" },
      { rank: 7, name: "oolShaw", points: 9, project: "No Project" },
      { rank: 8, name: "earvou1", points: 0, project: "No Project" }
    ],
    projectLeaderboard: [
      { rank: 1, name: "Native Pumpshie", points: 1435.851100000053, playersCount: 2 },
      { rank: 2, name: "Global", points: 986.202299999996, playersCount: 1 },
      { rank: 3, name: "Second", points: 0, playersCount: 0 }
    ]
  })

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex justify-center items-center mb-6">
        <h1 
          className="text-[#4ADE80] text-4xl font-black"
          style={{ 
            textShadow: `
              0 0 20px rgba(74, 222, 128, 0.4),
              0 0 40px rgba(74, 222, 128, 0.2),
              2px 2px 4px rgba(74, 222, 128, 0.3)
            `,
            fontFamily: 'system-ui',
            letterSpacing: '1px'
          }}
        >
          Leaderboard
        </h1>
      </div>

      {/* Ghost and Time Remaining */}
      <div className="flex justify-center mb-6">
        <div className="flex flex-col items-center">
          <Image
            src="/assets/carttoon1-CbncO-Xi.png"
            alt="Ghost"
            width={48}
            height={48}
            className="mb-2"
          />
          <div className="bg-[#1B3129] rounded-xl px-4 py-2">
            <div className="text-[#FFD700] text-xs text-center mb-1">Time Remaining</div>
            <div className="font-mono text-white text-center">{leaderboardData.timeRemaining}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
            leaderboardData.activeTab === 'individual'
              ? 'bg-[#4ADE80] text-black'
              : 'bg-[#1B3129] text-white'
          }`}
          onClick={() => setLeaderboardData(prev => ({ ...prev, activeTab: 'individual' }))}
        >
          Individual
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
            leaderboardData.activeTab === 'projects'
              ? 'bg-[#4ADE80] text-black'
              : 'bg-[#1B3129] text-white'
          }`}
          onClick={() => setLeaderboardData(prev => ({ ...prev, activeTab: 'projects' }))}
        >
          Projects
        </button>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-[#1a1d21]">
        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
          <QuestionIcon />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-medium text-white">{leaderboardData.userInfo.name}</h2>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>Rank: {leaderboardData.userInfo.rank}</span>
            <span>Points: {leaderboardData.userInfo.points.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3 mb-24">
        {leaderboardData.activeTab === 'individual' 
          ? leaderboardData.individualLeaderboard.map((entry, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#1f2937] bg-[#111827]"
              >
                <span className="text-gray-400 w-6">{entry.rank}</span>
                <div className="w-8 h-8 bg-[#1f2937] rounded-full flex items-center justify-center">
                  <QuestionIcon />
                </div>
                <div className="flex-1">
                  <div className="text-white">{entry.name}</div>
                  <div className="text-[#4ADE80] text-sm">{entry.points}k</div>
                </div>
                <div className="text-gray-400 text-sm">{entry.project}</div>
              </div>
            ))
          : leaderboardData.projectLeaderboard.map((entry, index) => (
              <div 
                key={index}
                className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  <span className="text-gray-400 w-6">{entry.rank}</span>
                  <div className="w-8 h-8 bg-[#1f2937] rounded-full flex items-center justify-center">
                    <QuestionIcon />
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-lg">{entry.name}</div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Team Points:</span>
                        <span className="text-[#4ADE80]">{entry.points.toFixed(3)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Players:</span>
                        <span className="text-gray-200">{entry.playersCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {index === leaderboardData.projectLeaderboard.length - 1 && (
                  <div className="px-4 py-2 text-[#FFD700] text-sm border-t border-[#1f2937]">
                    PROJECT BOOST: 2X Points for the next 1 hours!
                  </div>
                )}
              </div>
            ))
        }
      </div>

      <BottomNavigation />
    </div>
  )
} 