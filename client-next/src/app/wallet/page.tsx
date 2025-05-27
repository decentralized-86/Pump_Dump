'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'

interface WalletState {
  step: 'connect' | 'signing' | 'verifying' | 'success' | 'error';
  message?: string;
  error?: string;
}

export default function WalletConnect() {
  const { publicKey, connected, signMessage } = useWallet()
  const [state, setState] = useState<WalletState>({ step: 'connect' })
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://8264-103-214-63-137.ngrok-free.app'

  // Get tgId from URL params
  const getTgId = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('tgId');
  }

  // Handle wallet connection
  useEffect(() => {
    if (connected && publicKey) {
      handleSignMessage()
    }
  }, [connected, publicKey])

  const handleSignMessage = async () => {
    if (!publicKey || !signMessage) return

    const tgId = getTgId();
    if (!tgId) {
      setState({ 
        step: 'error', 
        error: 'Telegram user ID not found. Please open this page from Telegram.'
      });
      return;
    }

    try {
      setState({ step: 'signing', message: 'Please sign the message to verify your wallet...' })
      
      // Create verification message
      const message = `Verifying wallet ${publicKey.toBase58()}`
      const messageBytes = new TextEncoder().encode(message)

      // Get signature
      const signature = await signMessage(messageBytes)
      
      // Call verify endpoint
      setState({ step: 'verifying', message: 'Verifying wallet ownership...' })
      
      const response = await fetch(`${API_URL}/api/wallet/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: Buffer.from(signature).toString('hex'),
          tgId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to verify wallet')
      }

      const data = await response.json()

      if (data.success) {
        setState({ step: 'success' })
        
        // Send success message back to Telegram
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          window.Telegram.WebApp.showPopup({
            title: 'Wallet Connected!',
            message: `Successfully connected wallet ${publicKey.toBase58().slice(0, 8)}...`,
            buttons: [{
              type: 'ok',
              text: 'Continue Playing'
            }]
          });
          
          // Close after popup is dismissed
          window.Telegram.WebApp.close();
        }
      } else {
        throw new Error(data.error || 'Failed to verify wallet')
      }
    } catch (error) {
      console.error('Verification failed:', error)
      setState({ 
        step: 'error', 
        error: error instanceof Error ? error.message : 'Failed to verify wallet'
      })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 
        className="text-[#4ADE80] text-4xl font-black mb-8"
        style={{ 
          textShadow: `
            0 0 20px rgba(74, 222, 128, 0.4),
            0 0 40px rgba(74, 222, 128, 0.2)
          `
        }}
      >
        Connect Wallet
      </h1>

      {/* Status Messages */}
      <div className="mb-8 text-center">
        {state.step === 'connect' && (
          <p className="text-gray-300 mb-6">
            Please connect your wallet to verify it
          </p>
        )}
        {state.step === 'signing' && (
          <p className="text-gray-300 mb-6">
            {state.message}
          </p>
        )}
        {state.step === 'verifying' && (
          <p className="text-gray-300 mb-6">
            {state.message}
          </p>
        )}
        {state.step === 'success' && (
          <p className="text-green-400 mb-6">
            Wallet verified successfully! You can close this window.
          </p>
        )}
        {state.step === 'error' && (
          <p className="text-red-400 mb-6">
            {state.error || 'Something went wrong'}
          </p>
        )}
      </div>

      {/* Wallet Actions */}
      <div className="flex flex-col items-center gap-4">
        {state.step === 'connect' && (
          <WalletMultiButton 
            className="wallet-adapter-button-custom bg-transparent hover:bg-[#1a1f2e] border border-[#4ADE80] text-[#4ADE80] rounded-lg px-6 py-3 min-w-[200px] h-auto font-normal"
          />
        )}

        {state.step === 'error' && (
          <button
            onClick={() => setState({ step: 'connect' })}
            className="bg-[#4ADE80] hover:bg-[#3AAD60] text-white rounded-lg px-6 py-3 min-w-[200px]"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
} 