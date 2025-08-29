'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/providers'
import { 
  BookOpen, 
  Home, 
  Trophy, 
  Users, 
  Settings, 
  Menu, 
  X,
  LogOut,
  User,
  Timer
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  requiresAuth?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: '대시보드',
    icon: Home,
    requiresAuth: true
  },
  {
    href: '/books',
    label: '내 책장',
    icon: BookOpen,
    requiresAuth: true
  },
  {
    href: '/reading',
    label: '독서 세션',
    icon: Timer,
    requiresAuth: true
  },
  {
    href: '/quests',
    label: '퀘스트',
    icon: Trophy,
    requiresAuth: true
  },
  {
    href: '/family',
    label: '가족',
    icon: Users,
    requiresAuth: true
  }
]

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  if (loading) {
    return (
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-2 text-xl font-bold text-gray-900">
                BookCraft
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          {/* 로고 */}
          <div className="flex items-center">
            <Link href={user ? '/dashboard' : '/'} className="flex items-center group">
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                {/* Book 부분 */}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
                    Book
                  </span>
                  {/* Book 하이라이트 */}
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent opacity-40">Book</span>
                </span>
                
                {/* C 부분 - 더욱 화려하게 */}
                <span className="relative inline-block mx-1 group-hover:animate-pulse">
                  {/* 메인 C 글자 */}
                  <span className="relative text-4xl font-black bg-gradient-to-br from-amber-400 via-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg transform transition-all duration-500 group-hover:scale-125 group-hover:rotate-6">
                    C
                    {/* 내부 하이라이트 */}
                    <span className="absolute inset-0 text-4xl font-black bg-gradient-to-tr from-yellow-200 via-white to-transparent bg-clip-text text-transparent opacity-70">C</span>
                    {/* 내부 글로우 */}
                    <span className="absolute inset-0 text-4xl font-black bg-gradient-to-br from-amber-300 to-orange-400 bg-clip-text text-transparent opacity-30 blur-sm">C</span>
                  </span>
                  
                  {/* 마법 파티클들 - 더 많고 다양하게 */}
                  <span className="absolute -top-3 -right-3 w-4 h-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-bounce shadow-xl" style={{animationDelay: '0s', animationDuration: '2s'}}></span>
                  <span className="absolute top-4 -right-4 w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse shadow-lg" style={{animationDelay: '0.5s', animationDuration: '1.5s'}}></span>
                  <span className="absolute -bottom-3 -right-2 w-2.5 h-2.5 bg-gradient-to-r from-red-400 to-pink-500 rounded-full animate-ping shadow-md" style={{animationDelay: '1s', animationDuration: '2.5s'}}></span>
                  <span className="absolute top-2 -left-3 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" style={{animationDelay: '1.5s', animationDuration: '1.8s'}}></span>
                  <span className="absolute -top-1 -left-1 w-1 h-1 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '2s', animationDuration: '2.2s'}}></span>
                  
                  {/* 반짝이는 이모지들 */}
                  <span className="absolute -top-2 left-2 text-yellow-400 animate-pulse" style={{animationDelay: '0.8s', fontSize: '10px'}}>✨</span>
                  <span className="absolute bottom-1 right-1 text-orange-400 animate-bounce" style={{animationDelay: '1.2s', fontSize: '8px'}}>⭐</span>
                  <span className="absolute top-0 -right-1 text-pink-400 animate-pulse" style={{animationDelay: '1.8s', fontSize: '6px'}}>💫</span>
                  
                  {/* 호버 시 나타나는 광채 효과 */}
                  <span className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-orange-400/30 via-red-400/30 to-pink-400/30 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></span>
                  
                  {/* 3D 그림자 효과 */}
                  <span className="absolute top-1 left-1 text-4xl font-black text-gray-400/40 -z-20">C</span>
                  <span className="absolute top-0.5 left-0.5 text-4xl font-black text-gray-300/20 -z-30">C</span>
                </span>
                
                {/* raft 부분 */}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
                    raft
                  </span>
                  {/* raft 하이라이트 */}
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 bg-clip-text text-transparent opacity-40">raft</span>
                </span>
                
                {/* 전체 로고 주변 글로우 */}
                <span className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-40"></span>
              </span>
            </Link>
          </div>

          {/* 데스크톱 네비게이션 */}
          {user && (
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* 모바일 메뉴 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={toggleMobileMenu}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>

                {/* 사용자 드롭다운 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ''} alt={user.name} />
                        <AvatarFallback>
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.role === 'child' ? '어린이' : '부모'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>프로필</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>설정</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>로그아웃</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/login">
                  <Button variant="ghost">로그인</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>회원가입</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}