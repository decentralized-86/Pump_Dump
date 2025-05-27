'use client'

import { SolanaWalletProvider } from '@/contexts/SolanaWalletProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      {children}
    </SolanaWalletProvider>
  )
} 