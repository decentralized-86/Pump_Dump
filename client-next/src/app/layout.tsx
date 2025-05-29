import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import {WalletConnect} from '../components/WalletConnect';
import WalletContextProvider from '@/components/WalletContextProvider';

const network = 'devnet';
const endpoint = `https://api.${network}.solana.com`;

const wallets = [
  new PhantomWalletAdapter(),
  // add other wallets if needed
];

export const metadata: Metadata = {
  title: 'Pumpshie Pumps',
  description: 'Play, Earn, and Compete!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-background text-text antialiased">
        <WalletContextProvider>
            {children}
        </WalletContextProvider>     
      
      </body>
    </html>
  )
}
