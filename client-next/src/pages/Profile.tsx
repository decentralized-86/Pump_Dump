import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';

interface UserData {
  walletAddress: string;
  freePlaysRemaining: number;
  tweetVerifiedToday: boolean;
  accessType: 'free' | 'token_holder' | 'paid';
}

export default function Profile() {
  const { publicKey, connected } = useWallet();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGlobalDisplayEnabled, setIsGlobalDisplayEnabled] = useState(false);

  // Check if wallet exists in DB
  useEffect(() => {
    const checkWalletInDB = async () => {
      if (!publicKey || !connected) {
        setUserData(null);
        setIsLoading(false);
        return;
      }

      try {
        const walletAddress = publicKey.toBase58();
        const response = await fetch(`/api/users/check-wallet?walletAddress=${walletAddress}`);
        const data = await response.json();

        if (data.success && data.exists && data.userData) {
          setUserData(data.userData);
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkWalletInDB();
  }, [publicKey, connected]);

  // Handle new wallet connection
  useEffect(() => {
    const handleWalletConnection = async () => {
      if (connected && publicKey && !userData) {
        const walletAddress = publicKey.toBase58();
        
        try {
          // Save to DB through API
          const response = await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({ walletAddress }),
            headers: { 'Content-Type': 'application/json' }
          });

          const data = await response.json();

          if (data.success) {
            // Refresh user data after successful save
            const checkResponse = await fetch(`/api/users/check-wallet?walletAddress=${walletAddress}`);
            const checkData = await checkResponse.json();
            
            if (checkData.success && checkData.exists) {
              setUserData(checkData.userData);
            }
          } else {
            throw new Error(data.message || 'Failed to save wallet');
          }
        } catch (error) {
          console.error('Failed to save wallet:', error);
        }
      }
    };

    handleWalletConnection();
  }, [connected, publicKey, userData]);

  const handleCopyAddress = () => {
    if (userData?.walletAddress) {
      navigator.clipboard.writeText(userData.walletAddress);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">
      Loading...
    </div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-medium">
            S
          </div>
          <span className="text-xl font-medium">SolPump Game</span>
        </div>
        <button className="text-2xl">•••</button>
      </div>

      {/* Profile Title */}
      <div className="text-center py-8">
        <h1 className="text-6xl font-bold text-green-400 glow-text tracking-wide">Profile</h1>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 space-y-8">
        {/* User Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {userData ? userData.walletAddress.slice(0, 8) : 'Connect Wallet'}
                <button className="text-green-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </button>
              </h2>
            </div>
          </div>
          <div className="bg-gray-900/70 rounded-xl p-3 flex items-center gap-3">
            <span className="text-yellow-400 font-medium">Time Remaining</span>
            <span className="font-mono text-lg">00:00:00</span>
            <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center">
              <img src="/images/pumpkin.png" alt="Pumpkin" className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-lg font-light">Project Wallet Address</span>
            {!connected || !userData ? (
              <WalletMultiButton className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2" />
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg text-white">{userData.walletAddress}</span>
                <button onClick={handleCopyAddress} className="text-gray-400 hover:text-white transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Display Name Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-lg font-light">Display Name Globally</span>
            <div className="flex items-center gap-3">
              <span className={!isGlobalDisplayEnabled ? 'text-white' : 'text-gray-500'}>OFF</span>
              <button 
                onClick={() => setIsGlobalDisplayEnabled(!isGlobalDisplayEnabled)}
                className="relative w-14 h-8 flex items-center"
              >
                <div className={`
                  absolute w-14 h-8 rounded-full transition-colors duration-200
                  ${isGlobalDisplayEnabled ? 'bg-green-400' : 'bg-gray-700'}
                `}></div>
                <div className={`
                  absolute w-6 h-6 bg-white rounded-full transition-transform duration-200 shadow-lg
                  ${isGlobalDisplayEnabled ? 'translate-x-8' : 'translate-x-1'}
                `}></div>
              </button>
              <span className={isGlobalDisplayEnabled ? 'text-white' : 'text-gray-500'}>ON</span>
            </div>
          </div>

          {/* Current Project */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-lg font-light">Current Project:</span>
            <div className="flex items-center gap-2">
              <span className="text-lg text-white">Native Pumpshie</span>
              <button className="text-green-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Section */}
        <div className="pt-12 space-y-6">
          <h3 className="text-4xl font-bold text-green-400 glow-text">Highlight</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-lg font-light">Your Mc Points:</span>
              <span className="font-mono text-lg text-white">126.000kmc</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-lg font-light">Project Mc Points:</span>
              <span className="font-mono text-lg text-white">1435.851kmc</span>
            </div>
          </div>
        </div>

        {/* Game History */}
        <div className="pt-12 space-y-6">
          <h3 className="text-4xl font-bold text-green-400 glow-text">Game History</h3>
          <div className="bg-gray-900/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-lg font-light">Date</span>
              <span className="text-gray-500 text-lg font-light">Score</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">2025-02-19 17:38:14</span>
              <span className="text-white">7kmc</span>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm p-4">
          <div className="max-w-2xl mx-auto flex justify-around">
            <button className="flex flex-col items-center text-green-400">
              <span className="text-2xl">🎮</span>
              <span>Play</span>
            </button>
            <button className="flex flex-col items-center text-green-400">
              <span className="text-2xl">👥</span>
              <span>Invite</span>
            </button>
            <button className="flex flex-col items-center text-green-400">
              <span className="text-2xl">📊</span>
              <span>Leaderboard</span>
            </button>
            <button className="flex flex-col items-center text-green-400">
              <span className="text-2xl">😊</span>
              <span>Profile</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .glow-text {
          text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
        }
      `}</style>
    </div>
  );
} 