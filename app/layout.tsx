import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RegIntel — Food Safety Intelligence',
  description: 'FDA recall and warning letter intelligence for DigiComply prospecting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}