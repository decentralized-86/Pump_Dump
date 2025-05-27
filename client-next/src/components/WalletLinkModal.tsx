'use client'

import { useState } from 'react'
import Image from 'next/image'

interface WalletLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onLinkWallet: () => void
}

export default function WalletLinkModal({ isOpen, onClose, onLinkWallet }: WalletLinkModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1B2129] rounded-2xl p-6 max-w-md w-full mx-4 relative">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 
            className="text-[#4ADE80] text-2xl font-black mb-2"
            style={{ 
              textShadow: `
                0 0 20px rgba(74, 222, 128, 0.4),
                0 0 40px rgba(74, 222, 128, 0.2)
              `
            }}
          >
            Link Your Wallet
          </h2>
          <p className="text-gray-400 text-sm">
            Connect your Solana wallet to access exclusive features and track your progress
          </p>
        </div>

        {/* Wallet Benefits */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 text-gray-200">
            <div className="w-8 h-8 rounded-full bg-[#2A3744] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
                <path d="M12 2l3 6 6-2-2 6 2 6-6-2-3 6-3-6-6 2 2-6-2-6 6 2z"/>
              </svg>
            </div>
            <span>Earn rewards and track your progress</span>
          </div>
          <div className="flex items-center gap-3 text-gray-200">
            <div className="w-8 h-8 rounded-full bg-[#2A3744] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span>Access exclusive features and modes</span>
          </div>
          <div className="flex items-center gap-3 text-gray-200">
            <div className="w-8 h-8 rounded-full bg-[#2A3744] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2">
                <path d="M12 2v20M2 12h20"/>
              </svg>
            </div>
            <span>Get more free plays and bonuses</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onLinkWallet}
          className="w-full bg-[#4ADE80] hover:bg-[#3AAD60] text-white rounded-lg py-3 font-medium transition-colors"
        >
          Link Wallet Now
        </button>

        {/* Skip Option */}
        <button
          onClick={onClose}
          className="w-full text-gray-400 hover:text-white mt-4 text-sm"
        >
          Maybe Later
        </button>
      </div>
    </div>
  )
} 