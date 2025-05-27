import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import Providers from '@/components/Providers'

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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
