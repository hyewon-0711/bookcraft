'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Home, 
  Trophy, 
  Users, 
  Settings,
  Target,
  BarChart3,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface SidebarItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const sidebarItems: SidebarItem[] = [
  {
    href: '/dashboard',
    label: '대시보드',
    icon: Home
  },
  {
    href: '/books',
    label: '내 책장',
    icon: BookOpen
  },
  {
    href: '/quests',
    label: '퀘스트',
    icon: Target,
    badge: '3'
  },
  {
    href: '/achievements',
    label: '업적',
    icon: Trophy
  },
  {
    href: '/stats',
    label: '통계',
    icon: BarChart3
  },
  {
    href: '/family',
    label: '가족',
    icon: Users
  },
  {
    href: '/rewards',
    label: '보상',
    icon: Star
  },
  {
    href: '/settings',
    label: '설정',
    icon: Settings
  }
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* 사이드바 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">
              BookCraft
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn(
                "h-5 w-5 flex-shrink-0",
                isActive ? "text-blue-700" : "text-gray-400"
              )} />
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* 사이드바 하단 */}
      {!isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="h-5 w-5" />
              <span className="font-medium">레벨 5</span>
            </div>
            <div className="text-sm opacity-90 mb-2">
              다음 레벨까지 250 XP
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2 w-3/4"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}