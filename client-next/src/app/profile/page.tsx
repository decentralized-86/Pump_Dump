'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'

interface GameHistoryEntry {
  date: string
  score: number
}

interface ProfileState {
  projectName: string | null
  walletAddress: string | null
  displayNameGlobally: boolean
  currentProject: string | null
  mcPoints: number
  projectMcPoints: number
  gameHistory: GameHistoryEntry[]
  timeRemaining: string
  isEditingName: boolean
}

// SVG Icons as components
const PowerIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" stroke="white" strokeWidth="3"/>
    <line x1="12" y1="2" x2="12" y2="12" stroke="white" strokeWidth="3"/>
  </svg>
)

const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9BA1A6" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
)

const GameControllerIcon = () => (
  <div className="relative flex items-center justify-center w-12 h-12 bg-black rounded-full">
    <span className="text-[#4ADE80] font-bold text-xl">N</span>
    <div className="absolute inset-0 flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="1.5">
        <path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/>
        <circle cx="7" cy="12" r="1.5"/>
        <circle cx="17" cy="12" r="1.5"/>
        <path d="M11 9h2v6h-2z"/>
      </svg>
    </div>
  </div>
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

export default function Profile() {
  const router = useRouter()
  const { publicKey, connected } = useWallet()
  const [isLoading, setIsLoading] = useState(true)
  const [profileData, setProfileData] = useState<ProfileState>({
    projectName: null,
    walletAddress: null,
    displayNameGlobally: false,
    currentProject: null,
    mcPoints: 0,
    projectMcPoints: 0,
    timeRemaining: "00:00:00",
    isEditingName: false,
    gameHistory: []
  })

  useEffect(() => {
    const checkWalletAndLoadProfile = async () => {
      if (!publicKey || !connected) {
        setIsLoading(false)
        return
      }

      try {
        const walletAddress = publicKey.toBase58()
        const response = await fetch(`/api/users/check-wallet?walletAddress=${walletAddress}`)
        const data = await response.json()

        if (data.success && data.exists && data.userData) {
          setProfileData({
            projectName: data.userData.displayName || walletAddress.slice(0, 8),
            walletAddress: data.userData.walletAddress,
            displayNameGlobally: data.userData.displayNameGlobally || false,
            currentProject: "Native Pumpshie",
            mcPoints: data.userData.mcPoints || 0,
            projectMcPoints: data.userData.projectMcPoints || 0,
            timeRemaining: "00:00:00",
            isEditingName: false,
            gameHistory: data.userData.gameHistory || []
          })
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkWalletAndLoadProfile()
  }, [publicKey, connected])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  // If no wallet is connected, show connect button
  if (!connected || !profileData.walletAddress) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-black text-[#4ADE80] mb-8">Connect Wallet</h1>
        <WalletMultiButton className="bg-[#4ADE80] hover:bg-[#3AAD60] text-white rounded-lg px-6 py-3" />
      </div>
    )
  }

  const handleNameEdit = () => {
    setProfileData(prev => ({ ...prev, isEditingName: true }))
  }

  const handleNameSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newName = formData.get('projectName') as string
    if (newName.trim()) {
      setProfileData(prev => ({
        ...prev,
        projectName: newName.trim(),
        isEditingName: false
      }))
    }
  }

  const handleLinkWallet = () => {
    const webappUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://732d-103-214-63-177.ngrok-free.app'
    const walletUrl = `${webappUrl}/wallet`
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openLink(walletUrl)
    } else {
      window.location.href = walletUrl
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!connected || !profileData.walletAddress) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 
          className="text-[#4ADE80] text-6xl font-black mb-16"
          style={{ 
            textShadow: `
              0 0 20px rgba(74, 222, 128, 0.4),
              0 0 40px rgba(74, 222, 128, 0.2),
              2px 2px 4px rgba(74, 222, 128, 0.3)
            `
          }}
        >
          Connect Wallet
        </h1>
        <div className="flex flex-col items-center gap-4">
          <WalletMultiButton className="bg-[#4ADE80] hover:bg-[#3AAD60] text-white rounded-lg px-6 py-3 min-w-[200px] flex justify-center" />
          {/* <span className="text-white text-lg">Select Wallet</span>
          <span className="text-gray-400 text-base">Change wallet</span> */}
        </div>
      </div>
    )
  }

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
          Profile
        </h1>
      </div>

      {/* Profile Info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 bg-[#2563EB] rounded-full flex items-center justify-center">
          <PowerIcon />
        </div>
        <div className="flex-1">
          {profileData.isEditingName ? (
            <form onSubmit={handleNameSave} className="flex items-center gap-2">
              <input
                type="text"
                name="projectName"
                defaultValue={profileData.projectName}
                className="bg-transparent border-b border-[#4ADE80] text-lg font-medium text-gray-100 focus:outline-none"
                autoFocus
              />
              <button type="submit" className="text-[#4ADE80]">
                <EditIcon />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-gray-100">{profileData.projectName}</h2>
              <button onClick={handleNameEdit} className="text-[#4ADE80]">
                <EditIcon />
              </button>
            </div>
          )}
        </div>
        <div className="bg-[#1B3129] rounded-xl p-2 flex items-center justify-between min-w-[140px]">
          <div className="flex flex-col">
            <div className="text-[#FFD700] text-xs">Time Remaining</div>
            <div className="font-mono text-white text-sm mt-0.5">{profileData.timeRemaining}</div>
          </div>
          <Image
            src="/assets/carttoon1-CbncO-Xi.png"
            alt="Ghost"
            width={32}
            height={32}
            className="ml-2"
          />
        </div>
      </div>

      {/* Wallet Info */}
      <div className="space-y-6 mb-8">
        <div className="flex justify-between items-center">
          <div className="text-gray-500 text-sm font-light">Project Wallet Address</div>
          {profileData.walletAddress ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-gray-200 text-sm">{profileData.walletAddress}</span>
              <button className="text-gray-400 hover:text-white">
                <CopyIcon />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLinkWallet}
              className="bg-[#4ADE80] hover:bg-[#3AAD60] text-white rounded-lg px-4 py-1.5 text-sm font-medium"
            >
              LINK WALLET
            </button>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-gray-500 text-sm font-light">Display Name Globally</div>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${profileData.displayNameGlobally ? 'text-gray-500' : 'text-gray-200'}`}>OFF</span>
            <div 
              className={`w-14 h-7 rounded-full relative cursor-pointer transition-colors duration-300 ${
                profileData.displayNameGlobally ? 'bg-[#4ADE80]' : 'bg-gray-600'
              }`}
              onClick={() => setProfileData(prev => ({
                ...prev,
                displayNameGlobally: !prev.displayNameGlobally
              }))}
            >
              <div 
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                  profileData.displayNameGlobally ? 'right-1' : 'left-1'
                }`}
              />
            </div>
            <span className={`text-sm ${profileData.displayNameGlobally ? 'text-gray-200' : 'text-gray-500'}`}>ON</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-gray-500 text-sm font-light">Current Project:</div>
          <div className="flex items-center gap-2">
            <span className="text-gray-200 text-sm">{profileData.currentProject}</span>
            <button className="text-[#4ADE80] hover:opacity-80">
              <EditIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Highlight Section */}
      <div className="mb-8">
        <h3 
          className="text-[#4ADE80] text-2xl font-black mb-4"
          style={{ 
            textShadow: `
              0 0 20px rgba(74, 222, 128, 0.4),
              0 0 40px rgba(74, 222, 128, 0.2)
            `
          }}
        >
          Highlight
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-gray-500 text-sm font-light">Your Mc Points:</div>
            <div className="font-mono text-gray-200 text-sm">{profileData.mcPoints.toFixed(3)}kmc</div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-gray-500 text-sm font-light">Project Mc Points:</div>
            <div className="font-mono text-gray-200 text-sm">{profileData.projectMcPoints.toFixed(3)}kmc</div>
          </div>
        </div>
      </div>

      {/* Game History */}
      <div className="mb-24">
        <h3 
          className="text-[#4ADE80] text-2xl font-black mb-4"
          style={{ 
            textShadow: `
              0 0 20px rgba(74, 222, 128, 0.4),
              0 0 40px rgba(74, 222, 128, 0.2)
            `
          }}
        >
          Game History
        </h3>
        <div>
          <div className="flex justify-between text-gray-500 mb-3 px-2">
            <div className="text-sm font-light">Date</div>
            <div className="text-sm font-light">Score</div>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {profileData.gameHistory.map((entry, index) => (
              <div 
                key={index} 
                className="flex justify-between py-2.5 px-2 border-b border-gray-800"
                style={{ background: 'linear-gradient(180deg, rgba(26,29,33,0.3) 0%, rgba(26,29,33,0) 100%)' }}
              >
                <div className="text-gray-500 font-mono text-sm">{entry.date}</div>
                <div className="font-mono text-gray-200 text-sm">{entry.score}kmc</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
} 