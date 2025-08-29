import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'
import { RewardSystem } from '@/lib/reward-system'

export async function POST(
  request: NextRequest,
  { params }: { params: { questId: string } }
) {
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
    
    const { questId } = params
    const { completionQuality = 'normal' } = await request.json()
    
    // 퀘스트 정보 조회
    const questQuery = `
      SELECT 
        id,
        title,
        type,
        difficulty,
        xp_reward,
        coin_reward,
        target_value,
        progress as current_progress,
        status
      FROM quests 
      WHERE id = $1 AND user_id = $2
    `
    
    const questResult = await query(questQuery, [questId, user.id])
    
    if (questResult.rows.length === 0) {
      return NextResponse.json(
        { error: '퀘스트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const quest = questResult.rows[0]
    
    if (quest.status === 'completed') {
      return NextResponse.json(
        { error: '이미 완료된 퀘스트입니다.' },
        { status: 400 }
      )
    }
    
    if (quest.current_progress < quest.target_value) {
      return NextResponse.json(
        { error: '퀘스트 목표를 달성하지 못했습니다.' },
        { status: 400 }
      )
    }
    
    // 퀘스트 완료 상태로 업데이트
    await query(
      `UPDATE quests 
       SET status = 'completed', completed_at = NOW(), progress = target_value
       WHERE id = $1`,
      [questId]
    )
    
    // 새로운 보상 시스템을 통한 보상 지급
    const reward = await RewardSystem.giveQuestReward(
      user.id,
      questId,
      quest.difficulty,
      completionQuality
    )
    
    // 업데이트된 사용자 통계 조회
    const userStats = await RewardSystem.getUserStats(user.id)
    
    return NextResponse.json({
      success: true,
      message: '퀘스트를 완료했습니다!',
      quest: {
        ...quest,
        status: 'completed',
        completed_at: new Date().toISOString()
      },
      reward,
      userStats
    })
  } catch (error) {
    console.error('퀘스트 완료 오류:', error)
    return NextResponse.json(
      { error: '퀘스트 완료에 실패했습니다.' },
      { status: 500 }
    )
  }
}