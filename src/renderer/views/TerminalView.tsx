import React, { useEffect } from 'react'
import { Terminal } from '../components/Terminal'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../utils/cn'

export default function TerminalView() {
  const { theme } = useUIStore()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "p-4 border-b",
        theme === 'dark'
          ? "bg-gray-800 border-gray-700"
          : "bg-gray-50 border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Terminal</h1>
            <p className={cn(
              "text-sm",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>
              Command line interface for your project workspace
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 overflow-hidden">
        <Terminal className="h-full" />
      </div>
    </div>
  )
}