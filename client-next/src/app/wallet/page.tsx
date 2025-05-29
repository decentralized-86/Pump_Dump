'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import bs58 from 'bs58'

interface WalletState {
  step: 'connect' | 'verify' | 'saving' | 'success' | 'error';
  message?: string;
  error?: string;
  verificationData?: {
    message: string;
    nonce: string;
  };
}

export default function WalletConnect() {
  const { publicKey, connected, signMessage } = useWallet()
  const [state, setState] = useState<WalletState>({ step: 'connect' })
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://732d-103-214-63-177.ngrok-free.app'

  // Handle wallet connection
  useEffect(() => {
    if (connected && publicKey) {
      prepareVerification()
    }
  }, [connected, publicKey])

  const prepareVerification = async () => {
    if (!publicKey) return

    try {
      setState({ step: 'verify', message: 'Preparing verification...' })
      
      // Get verification message from backend
      const response = await fetch(`${API_URL}/api/wallet/verify-wallet/prepare?walletAddress=${publicKey.toBase58()}`)
      const data = await response.json()

      if (data.success) {
        setState({ 
          step: 'verify', 
          message: 'Please sign the message to verify your wallet...',
          verificationData: data
        })
      } else {
        throw new Error(data.error || 'Failed to prepare verification')
      }
    } catch (error) {
      console.error('Preparation failed:', error)
      setState({ 
        step: 'error', 
        error: error instanceof Error ? error.message : 'Failed to prepare verification'
      })
    }
  }

  const handleVerify = async () => {
    if (!publicKey || !signMessage || !state.verificationData) return

    try {
      setState({ step: 'verify', message: 'Please sign the message to verify your wallet...' })

      // Create verification message
      const message = new TextEncoder().encode(state.verificationData.message)

      // Request signature
      const signature = await signMessage(message)
      
      // Verify with backend
      setState({ step: 'saving', message: 'Verifying wallet ownership...' })
      
      const response = await fetch(`${API_URL}/api/wallet/verify-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: bs58.encode(signature),
          nonce: state.verificationData.nonce
        })
      })

      const data = await response.json()

      if (data.success) {
        setState({ step: 'success' })
        // Return to Telegram after 1 second
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            window.Telegram.WebApp.sendData(JSON.stringify({
              walletAddress: publicKey.toBase58(),
              verified: true
            }))
            window.Telegram.WebApp.close()
          }
        }, 1000)
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
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <h1 
          className="text-[#4ADE80] text-4xl font-black mb-8 text-center"
          style={{ 
            textShadow: `
              0 0 20px rgba(74, 222, 128, 0.4),
              0 0 40px rgba(74, 222, 128, 0.2)
            `
          }}
        >
          Connect Wallet
        </h1>

        {/* Status */}
        <div className="mb-8 text-center">
          {state.step === 'connect' && (
            <p className="text-gray-300 mb-4">
              Please connect your wallet to continue
            </p>
          )}
          {state.step === 'verify' && (
            <p className="text-gray-300 mb-4">
              {state.message || 'Please verify your wallet ownership'}
            </p>
          )}
          {state.step === 'saving' && (
            <p className="text-gray-300 mb-4">
              {state.message || 'Saving your information...'}
            </p>
          )}
          {state.step === 'success' && (
            <p className="text-green-400 mb-4">
              Wallet verified successfully! Returning to game...
            </p>
          )}
          {state.step === 'error' && (
            <p className="text-red-400 mb-4">
              {state.error || 'Something went wrong'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          {state.step === 'connect' && (
            <WalletMultiButton className="bg-[#4ADE80] hover:bg-[#3AAD60] text-white rounded-lg px-6 py-3" />
          )}
          
          {state.step === 'verify' && state.verificationData && (
            <button
              onClick={handleVerify}
              className="bg-[#4ADE80] hover:bg-[#3AAD60] text-white rounded-lg px-6 py-3"
            >
              Verify Wallet
            </button>
          )}

          {state.step === 'error' && (
            <button
              onClick={() => setState({ step: 'connect' })}
              className="bg-[#4ADE80] hover:bg-[#3AAD60] text-white rounded-lg px-6 py-3"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 