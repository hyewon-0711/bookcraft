import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { RewardSystem, RewardCalculator, LevelSystem } from '@/lib/reward-system'

// 보상 지급 API
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

    const { rewardType, data } = await request.json()
    
    let reward
    
    switch (rewardType) {
      case 'quest':
        const { questId, difficulty, completionQuality } = data
        reward = await RewardSystem.giveQuestReward(
          user.id, 
          questId, 
          difficulty, 
          completionQuality || 'normal'
        )
        break
        
      case 'reading':
        const { sessionId, duration, focusScore, pagesRead } = data
        reward = await RewardSystem.giveReadingReward(
          user.id, 
          sessionId, 
          { duration, focusScore, pagesRead }
        )
        break
        
      case 'book_completion':
        const { bookId, pageCount } = data
        reward = await RewardSystem.giveBookCompletionReward(
          user.id, 
          bookId, 
          pageCount
        )
        break
        
      case 'first_book':
        const { bookId: firstBookId } = data
        reward = await RewardSystem.giveFirstBookReward(
          user.id, 
          firstBookId
        )
        break
        
      case 'manual':
        const { xp, coins, badges } = data
        reward = await RewardSystem.giveReward(
          user.id, 
          { xp, coins, badges }, 
          'manual'
        )
        break
        
      default:
        return NextResponse.json(
          { error: '지원하지 않는 보상 타입입니다.' },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      reward
    })
  } catch (error) {
    console.error('보상 지급 오류:', error)
    return NextResponse.json(
      { error: '보상 지급에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 사용자 보상 통계 조회
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

    const userStats = await RewardSystem.getUserStats(user.id)
    
    if (!userStats) {
      return NextResponse.json(
        { error: '사용자 통계를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const nextLevelXP = LevelSystem.getXPToNextLevel(userStats.total_xp)
    const levelProgress = LevelSystem.getLevelProgress(userStats.total_xp)
    const recentRewards = await RewardSystem.getRewardHistory(user.id, 10)
    const userBadges = await RewardSystem.getUserBadges(user.id)
    
    return NextResponse.json({
      success: true,
      stats: {
        ...userStats,
        next_level_xp: nextLevelXP,
        level_progress: levelProgress
      },
      recent_rewards: recentRewards,
      badges: userBadges
    })
  } catch (error) {
    console.error('보상 통계 조회 오류:', error)
    return NextResponse.json(
      { error: '보상 통계 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}