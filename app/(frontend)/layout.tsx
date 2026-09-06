import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Bakı daxilində aktiv idman oyunlarını tap və oyuna qoşul.',
  title: 'OyunaGəl | Birlikdə oynayaq',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
