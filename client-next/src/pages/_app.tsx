import type { AppProps } from 'next/app';
import { SolanaWalletProvider } from '../contexts/SolanaWalletProvider';
import '../styles/wallet.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SolanaWalletProvider>
      <Component {...pageProps} />
    </SolanaWalletProvider>
  );
} 