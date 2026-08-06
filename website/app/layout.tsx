import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import GlobalBackground3DWrapper from '@/components/GlobalBackground3DWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Guranda - One Identity. One Economy. One Life.',
  description: 'The digital operating system for everyday life. Connect messaging, gaming, work, business, shopping, transport, finance, education, and entertainment in one platform.',
  keywords: 'Guranda, digital OS, messaging, gaming, live streaming, marketplace, finance',
  authors: [{ name: 'Guranda' }],
  creator: 'Guranda',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://lifeos.app',
    title: 'Guranda - One Identity. One Economy. One Life.',
    description: 'The digital operating system for everyday life.',
    images: [
      {
        url: 'https://lifeos.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Guranda',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guranda',
    description: 'The digital operating system for everyday life.',
    images: ['https://lifeos.app/twitter-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body suppressHydrationWarning className={`${inter.className} bg-black text-white antialiased overflow-x-hidden`}>
        <GlobalBackground3DWrapper />
        <div className="relative" style={{ zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  )
}
