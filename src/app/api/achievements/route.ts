import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { AchievementSystem } from '@/lib/achievement-system'

// 사용자의 성취 목록 조회
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    const user = await authService.getCurrentUser(token)
    
    if (!user) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const type = url.searchParams.get('type') // 'earned', 'available', 'progress'

    // 사용자의 모든 성취 정보 조회
    const achievementData = await AchievementSystem.getUserAchievements(user.id)

    let responseData = achievementData

    // 카테고리 필터링
    if (category) {
      responseData = {
        earned: achievementData.earned.filter(a => a.category === category),
        available: achievementData.available.filter(a => a.category === category),
        progress: achievementData.progress.filter(p => p.achievement.category === category)
      }
    }

    // 타입별 필터링
    if (type) {
      switch (type) {
        case 'earned':
          responseData = { earned: responseData.earned, available: [], progress: [] }
          break
        case 'available':
          responseData = { earned: [], available: responseData.available, progress: [] }
          break
        case 'progress':
          responseData = { earned: [], available: [], progress: responseData.progress }
          break
      }
    }

    // 통계 정보 추가
    const stats = {
      total_earned: achievementData.earned.length,
      total_available: achievementData.available.length,
      completion_rate: achievementData.available.length > 0 
        ? Math.round((achievementData.earned.length / (achievementData.earned.length + achievementData.available.length)) * 100)
        : 0,
      categories: {
        reading: achievementData.earned.filter(a => a.category === 'reading').length,
        quests: achievementData.earned.filter(a => a.category === 'quests').length,
        social: achievementData.earned.filter(a => a.category === 'social').length,
        time: achievementData.earned.filter(a => a.category === 'time').length,
        special: achievementData.earned.filter(a => a.category === 'special').length
      },
      rarities: {
        bronze: achievementData.earned.filter(a => a.rarity === 'bronze').length,
        silver: achievementData.earned.filter(a => a.rarity === 'silver').length,
        gold: achievementData.earned.filter(a => a.rarity === 'gold').length,
        platinum: achievementData.earned.filter(a => a.rarity === 'platinum').length,
        diamond: achievementData.earned.filter(a => a.rarity === 'diamond').length
      }
    }

    return NextResponse.json({
      success: true,
      ...responseData,
      stats
    })
  } catch (error) {
    console.error('성취 조회 오류:', error)
    return NextResponse.json(
      { error: '성취 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 성취 달성 확인 및 처리
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    const user = await authService.getCurrentUser(token)
    
    if (!user) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    if (action === 'check_all') {
      // 모든 성취 달성 여부 확인
      const { unlocked } = await AchievementSystem.checkUserAchievements(user.id)
      
      const newlyUnlocked = []
      
      // 새로 달성한 성취들 처리
      for (const achievement of unlocked) {
        const success = await AchievementSystem.unlockAchievement(user.id, achievement.id)
        if (success) {
          newlyUnlocked.push(achievement)
        }
      }

      return NextResponse.json({
        success: true,
        message: newlyUnlocked.length > 0 
          ? `${newlyUnlocked.length}개의 새로운 성취를 달성했습니다!`
          : '새로 달성한 성취가 없습니다.',
        newly_unlocked: newlyUnlocked,
        total_xp_gained: newlyUnlocked.reduce((sum, a) => sum + a.rewards.xp, 0),
        total_coins_gained: newlyUnlocked.reduce((sum, a) => sum + a.rewards.coins, 0)
      })
    }

    return NextResponse.json(
      { error: '유효하지 않은 액션입니다.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('성취 처리 오류:', error)
    return NextResponse.json(
      { error: '성취 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}