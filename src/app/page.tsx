'use client'

import React from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BookOpen, 
  Trophy, 
  Users, 
  Target, 
  Star, 
  Zap,
  ArrowRight,
  Play,
  CheckCircle,
  Sparkles,
  Crown,
  Gamepad2
} from 'lucide-react'

const Home = () => {
  return (
    <MainLayout showSidebar={false}>
      <div className="space-y-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background with animated elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
            <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-pink-400 rounded-full opacity-20 animate-bounce"></div>
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-green-400 rounded-full opacity-20 animate-pulse"></div>
          </div>
          
          <div className="relative text-center py-20 px-0">
            <div className="w-full">
              {/* Floating icon with glow effect */}
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
                <span className="bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  BookCraft
                </span>
                <br />
                <span className="text-3xl md:text-4xl font-bold text-gray-200">
                  독서가 게임이 되다! 🎮
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-10 leading-relaxed px-6">
                퀘스트를 완료하고 • 레벨업하고 • 보상을 획득하세요!<br />
                <span className="text-yellow-400 font-semibold">매일 새로운 모험이 기다립니다</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200">
                    <Gamepad2 className="mr-3 h-6 w-6" />
                    🚀 모험 시작하기
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-2 border-yellow-400 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400 hover:text-purple-900 font-bold py-4 px-8 rounded-full transition-all duration-200">
                    이미 모험가라면 로그인
                  </Button>
                </Link>
              </div>
              
              {/* Stats preview */}
              <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl mx-auto px-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">1000+</div>
                  <div className="text-sm text-gray-400">활성 모험가</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">50K+</div>
                  <div className="text-sm text-gray-400">완료된 퀘스트</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">100+</div>
                  <div className="text-sm text-gray-400">수집 가능 배지</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              🎮 <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">게임 같은 독서</span> 경험
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              RPG 게임처럼 재미있는 독서 시스템으로 매일 성장하는 즐거움을 느껴보세요
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Quest Card */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-blue-50 to-indigo-100">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-bl-3xl flex items-center justify-center">
                <Target className="h-8 w-8 text-white" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">일일 퀘스트</CardTitle>
                    <div className="text-sm text-blue-600 font-semibold">+100 XP</div>
                  </div>
                </div>
                <CardDescription className="text-gray-700 leading-relaxed">
                  매일 새로운 독서 미션을 완료하고 경험치를 획득하세요. 연속 완료 시 보너스 XP!
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Level & Badge Card */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-yellow-50 to-orange-100">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-bl-3xl flex items-center justify-center">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">레벨 & 배지</CardTitle>
                    <div className="text-sm text-orange-600 font-semibold">100+ 배지</div>
                  </div>
                </div>
                <CardDescription className="text-gray-700 leading-relaxed">
                  독서 성과에 따라 레벨업하고 희귀 배지를 수집하세요. 친구들에게 자랑해보세요!
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Family Challenge Card */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-green-50 to-emerald-100">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-bl-3xl flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">가족 챌린지</CardTitle>
                    <div className="text-sm text-green-600 font-semibold">함께 성장</div>
                  </div>
                </div>
                <CardDescription className="text-gray-700 leading-relaxed">
                  가족과 함께 독서 챌린지에 참여하고 순위를 경쟁하세요. 협력과 경쟁의 재미!
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Avatar Card */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-purple-50 to-pink-100">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-bl-3xl flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">아바타 꾸미기</CardTitle>
                    <div className="text-sm text-purple-600 font-semibold">코인 상점</div>
                  </div>
                </div>
                <CardDescription className="text-gray-700 leading-relaxed">
                  독서로 얻은 코인으로 나만의 아바타를 꾸며보세요. 수백 가지 아이템 준비!
                </CardDescription>
              </CardHeader>
            </Card>

            {/* AI Assistant Card */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-red-50 to-pink-100">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-bl-3xl flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl shadow-lg">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">AI 독서 도우미</CardTitle>
                    <div className="text-sm text-red-600 font-semibold">스마트 추천</div>
                  </div>
                </div>
                <CardDescription className="text-gray-700 leading-relaxed">
                  AI가 당신의 취향을 분석해 맞춤형 책과 독서 가이드를 추천해드려요.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Reading Record Card */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-indigo-50 to-blue-100">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-bl-3xl flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl shadow-lg">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">독서 기록</CardTitle>
                    <div className="text-sm text-indigo-600 font-semibold">자동 추적</div>
                  </div>
                </div>
                <CardDescription className="text-gray-700 leading-relaxed">
                  읽은 책과 독서 시간을 자동으로 기록하고 상세한 통계를 제공해드려요.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How it Works */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-12">
          {/* Animated background elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-r from-blue-300 to-indigo-300 rounded-full opacity-15 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-full opacity-15 animate-bounce"></div>
          
          <div className="relative text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              🎯 <span className="bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent">모험가 가이드</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              3단계로 시작하는 독서 RPG 여정
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative mx-auto w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <span className="text-3xl font-black">1</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">📚 책 등록하기</h3>
              <p className="text-gray-300 leading-relaxed">
                읽고 싶은 책을 등록하고 독서 목표를 설정하세요.<br />
                <span className="text-blue-200 font-medium">첫 등록 시 +50 XP 보너스!</span>
              </p>
            </div>
            
            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-gray-400 animate-pulse" />
            </div>
            
            {/* Step 2 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative mx-auto w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <span className="text-3xl font-black">2</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">⚔️ 퀘스트 완료</h3>
              <p className="text-gray-300 leading-relaxed">
                일일 독서 퀘스트를 완료하고 경험치와 코인을 획득하세요.<br />
                <span className="text-indigo-200 font-medium">연속 완료 시 보너스 배율!</span>
              </p>
            </div>
            
            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-gray-400 animate-pulse" />
            </div>
            
            {/* Step 3 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative mx-auto w-20 h-20 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <span className="text-3xl font-black">3</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">👑 레벨업 & 보상</h3>
              <p className="text-gray-300 leading-relaxed">
                레벨업하고 배지를 수집하며 아바타를 꾸며보세요.<br />
                <span className="text-purple-200 font-medium">희귀 아이템 획득 기회!</span>
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden text-center py-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl">
          {/* Animated background */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-24 h-24 bg-white rounded-full opacity-10 animate-pulse"></div>
            <div className="absolute top-20 right-20 w-16 h-16 bg-blue-300 rounded-full opacity-15 animate-bounce"></div>
            <div className="absolute bottom-10 left-1/3 w-20 h-20 bg-indigo-300 rounded-full opacity-15 animate-pulse"></div>
          </div>
          
          <div className="relative max-w-3xl mx-auto px-6">
            {/* Floating elements */}
            <div className="mb-8 flex justify-center space-x-4">
              <div className="animate-bounce">
                <Trophy className="h-12 w-12 text-blue-200" />
              </div>
              <div className="animate-pulse">
                <Star className="h-12 w-12 text-white" />
              </div>
              <div className="animate-bounce" style={{animationDelay: '0.5s'}}>
                <Crown className="h-12 w-12 text-indigo-200" />
              </div>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              🚀 모험이 기다리고 있어요!
            </h2>
            <div className="mb-10">
              <p className="text-2xl md:text-3xl text-white font-bold mb-4 leading-relaxed">
                시작 보상으로 받아가세요! 🎁
              </p>
              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 px-6 py-3 rounded-2xl font-bold text-lg shadow-lg">
                  ✨ 100 XP
                </div>
                <div className="bg-gradient-to-r from-blue-400 to-cyan-500 text-white px-6 py-3 rounded-2xl font-bold text-lg shadow-lg">
                  💰 50 코인
                </div>
                <div className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold text-lg shadow-lg">
                  🏆 특별 배지
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-50 font-semibold py-4 px-10 rounded-3xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-lg">
                  🎮 모험 시작하기
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex justify-center items-center space-x-8 text-gray-300">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-sm">무료 가입</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-sm">즉시 시작</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-sm">언제든 탈퇴</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}

export default Home