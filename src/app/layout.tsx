import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Treefort Hunt',
  description: 'Wedding scavenger hunt at Treefort Music Fest',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  )
}
