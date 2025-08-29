'use client'

import { Navbar } from './navbar'
import { Sidebar } from './sidebar'

interface MainLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        {/* 데스크톱에서만 사이드바 표시 */}
        {showSidebar && (
          <div className="hidden lg:block">
            <Sidebar className="fixed top-16 left-0 h-[calc(100vh-4rem)]" />
          </div>
        )}
        
        {/* 메인 콘텐츠 */}
        <main className={`flex-1 transition-all duration-300 ${showSidebar ? 'lg:ml-64' : ''}`}>
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}