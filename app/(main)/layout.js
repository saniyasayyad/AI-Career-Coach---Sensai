import React from 'react'

export default function MainLayout({ children }) {
  // Redirect User after onboarding if not completed
  return (
    <div className="container mx-auto mt-24 mb-20">
      {children}
    </div>
  )
}
