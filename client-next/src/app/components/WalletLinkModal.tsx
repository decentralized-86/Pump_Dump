import { useEffect, useState } from 'react';

interface WalletStatus {
  isConnected: boolean;
  address?: string;
  loading: boolean;
  error?: string;
}

export default function WalletLinkModal() {
  const [status, setStatus] = useState<WalletStatus>({
    isConnected: false,
    loading: true
  });

  // Check wallet status on load
  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));
      
      const response = await fetch('/api/wallet/status', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (data.success && data.walletAddress) {
        setStatus({
          isConnected: true,
          address: data.walletAddress,
          loading: false
        });
      } else {
        setStatus({
          isConnected: false,
          loading: false
        });
      }
    } catch (error) {
      setStatus({
        isConnected: false,
        loading: false,
        error: 'Failed to check wallet status'
      });
    }
  };

  const handleLinkWallet = () => {
    // Open wallet connection page
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const currentUrl = window.location.origin;
      window.location.href = `${currentUrl}/wallet`;
    }
  };

  return (
    <div className="bg-[#1E2132] rounded-2xl p-6 max-w-md w-full mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[#4ADE80] text-2xl font-bold">Link Your Wallet</h2>
        {status.loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#4ADE80] border-t-transparent" />
        ) : status.isConnected ? (
          <div className="flex items-center text-[#4ADE80]">
            <span className="mr-2">✓</span>
            Connected
          </div>
        ) : null}
      </div>

      <p className="text-gray-400 mb-8">
        Connect your Solana wallet to access exclusive features and track your progress
      </p>

      {status.isConnected ? (
        <>
          <div className="bg-[#2A2F45] rounded-lg p-4 mb-6">
            <p className="text-gray-400 mb-2">Connected Wallet</p>
            <p className="text-white font-mono">
              {status.address?.slice(0, 8)}...{status.address?.slice(-8)}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-white">
              <span className="mr-3 text-[#4ADE80]">✓</span>
              Earn rewards and track your progress
            </div>
            <div className="flex items-center text-white">
              <span className="mr-3 text-[#4ADE80]">✓</span>
              Access exclusive features and modes
            </div>
            <div className="flex items-center text-white">
              <span className="mr-3 text-[#4ADE80]">✓</span>
              Get more free plays and bonuses
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            <div className="flex items-center text-white">
              <div className="w-8 h-8 rounded-full bg-[#2A2F45] flex items-center justify-center mr-3">
                🌟
              </div>
              Earn rewards and track your progress
            </div>
            <div className="flex items-center text-white">
              <div className="w-8 h-8 rounded-full bg-[#2A2F45] flex items-center justify-center mr-3">
                👤
              </div>
              Access exclusive features and modes
            </div>
            <div className="flex items-center text-white">
              <div className="w-8 h-8 rounded-full bg-[#2A2F45] flex items-center justify-center mr-3">
                🎮
              </div>
              Get more free plays and bonuses
            </div>
          </div>

          {status.error ? (
            <p className="text-red-400 mb-4 text-sm">{status.error}</p>
          ) : null}

          <button
            onClick={handleLinkWallet}
            className="w-full bg-[#4ADE80] hover:bg-[#3AAD60] text-black font-semibold rounded-lg py-4 transition-colors"
          >
            Link Wallet Now
          </button>

          <button
            onClick={() => window.Telegram?.WebApp?.close()}
            className="w-full text-gray-400 mt-4 py-2"
          >
            Maybe Later
          </button>
        </>
      )}
    </div>
  );
} 