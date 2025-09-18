// src/components/debug/BuildStamp.tsx
import React from 'react'

export const BuildStamp: React.FC = () => {
  const buildTime = new Date().toLocaleTimeString()
  
  return (
    <div className="fixed top-16 left-4 z-40 bg-green-600/90 text-white px-3 py-2 rounded-md text-sm font-mono">
      🔄 Build: {buildTime}
    </div>
  )
}