import './globals.css'

export const metadata = {
  title: 'Wumpus Agent Engine',
  description: 'Knowledge-Based Agent using Resolution Refutation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
