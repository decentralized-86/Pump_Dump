import { useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export function useGameEndWallet() {
  const { publicKey, connected, connecting, disconnect, select, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  const showWalletConnect = useCallback(() => {
    // If Phantom is available, select it first
    const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
    if (phantomWallet) {
      select(phantomWallet.adapter.name);
    } else if (wallets.length > 0) {
      // Otherwise use the first available wallet
      select(wallets[0].adapter.name);
    }
    // Show the wallet modal
    setVisible(true);
  }, [select, wallets, setVisible]);

  useEffect(() => {
    // Get the game count from localStorage
    const gameCount = parseInt(localStorage.getItem('gameCount') || '0');
    
    // If this was their first game and they don't have a wallet connected
    if (gameCount === 1 && !publicKey && !connecting) {
      showWalletConnect();
    }
  }, [publicKey, connecting, showWalletConnect]); // Add proper dependencies

  const incrementGameCount = () => {
    const currentCount = parseInt(localStorage.getItem('gameCount') || '0');
    localStorage.setItem('gameCount', (currentCount + 1).toString());
  };

  // Return both the increment function and the showWalletConnect function
  return { 
    incrementGameCount,
    showWalletConnect,
    isConnected: !!publicKey,
    isConnecting: connecting
  };
} 