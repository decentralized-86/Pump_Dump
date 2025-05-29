'use client';
import { useState } from 'react';
import { shouldShowWalletConnect, getWalletStatus } from '../utils/wallet';
import type { UserState } from '../utils/wallet';

interface WalletConnectProps {
  user: UserState;
  onConnect: (address: string) => void;
}

export const WalletConnect = ({ user, onConnect }: WalletConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { needsWallet, message } = getWalletStatus(user);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      // TODO: Implement actual wallet connection
      // For now, just simulate a connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      onConnect('simulated_wallet_address');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!shouldShowWalletConnect(user)) {
    return (
      <div className="flex items-center gap-2 text-secondary">
        <span className="text-sm">{message}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-secondary">
        {message}
      </div>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="get-started-btn flex items-center justify-center gap-2"
      >
        {isConnecting ? (
          <>
            <span className="animate-spin">⚡</span>
            Connecting...
          </>
        ) : (
          <>
            <span>🦊</span>
            Connect Wallet
          </>
        )}
      </button>
    </div>
  );
}; 