import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'
import { QuestManager } from '@/lib/quest-manager'
import { QuestStatus, QuestStatusTransition } from '@/types'

// 퀘스트 상태 전환
export async function PUT(
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
    const body = await request.json()
    const { new_status, reason }: { new_status: QuestStatus, reason?: string } = body

    // 현재 퀘스트 상태 조회
    const questQuery = `
      SELECT 
        id,
        status,
        progress,
        target_value,
        expires_at,
        user_id
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
    const currentStatus = quest.status as QuestStatus

    // 유효한 상태 전환인지 확인
    if (!QuestManager.isValidTransition(currentStatus, new_status)) {
      return NextResponse.json(
        { 
          error: `${currentStatus}에서 ${new_status}로 전환할 수 없습니다.`,
          current_status: currentStatus,
          requested_status: new_status
        },
        { status: 400 }
      )
    }

    // 완료 상태로 전환 시 진행률 확인
    if (new_status === 'completed' && quest.progress < quest.target_value) {
      return NextResponse.json(
        { 
          error: '퀘스트가 아직 완료되지 않았습니다.',
          progress: quest.progress,
          target: quest.target_value
        },
        { status: 400 }
      )
    }

    // 만료된 퀘스트 확인
    if (quest.expires_at && new Date(quest.expires_at) < new Date() && new_status !== 'expired') {
      return NextResponse.json(
        { error: '만료된 퀘스트입니다.' },
        { status: 400 }
      )
    }

    // 데이터베이스 함수를 사용하여 상태 전환
    const transitionQuery = `
      SELECT transition_quest_status($1, $2, $3, $4) as success
    `
    
    const transitionResult = await query(transitionQuery, [
      questId,
      new_status,
      user.id,
      reason || `Status changed from ${currentStatus} to ${new_status}`
    ])
    
    if (!transitionResult.rows[0]?.success) {
      return NextResponse.json(
        { error: '상태 전환에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 업데이트된 퀘스트 정보 조회
    const updatedQuestQuery = `
      SELECT 
        q.*,
        qm.streak_count,
        qm.bonus_multiplier
      FROM quests q
      LEFT JOIN quest_metadata qm ON q.id = qm.quest_id
      WHERE q.id = $1
    `
    
    const updatedQuestResult = await query(updatedQuestQuery, [questId])
    const updatedQuest = updatedQuestResult.rows[0]

    // 보상 처리 (completed 또는 ready_to_claim 상태일 때)
    if (new_status === 'completed' || new_status === 'ready_to_claim') {
      const rewardMultiplier = QuestManager.calculateRewardMultiplier(
        updatedQuest,
        new Date(),
        updatedQuest.streak_count || 0
      )

      const finalXpReward = Math.round(updatedQuest.xp_reward * rewardMultiplier)
      const finalCoinReward = Math.round(updatedQuest.coin_reward * rewardMultiplier)

      // 사용자에게 보상 지급
      const rewardQuery = `
        UPDATE users 
        SET 
          total_xp = total_xp + $1,
          total_coins = total_coins + $2
        WHERE id = $3
      `
      
      await query(rewardQuery, [finalXpReward, finalCoinReward, user.id])

      // 연속 기록 업데이트
      if (updatedQuest.quest_type === 'daily' || updatedQuest.quest_type === 'streak') {
        const streakUpdateQuery = `
          UPDATE quest_metadata 
          SET 
            streak_count = streak_count + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE quest_id = $1
        `
        
        await query(streakUpdateQuery, [questId])
      }

      return NextResponse.json({
        success: true,
        message: '퀘스트가 완료되었습니다!',
        quest: updatedQuest,
        rewards: {
          xp: finalXpReward,
          coins: finalCoinReward,
          multiplier: rewardMultiplier
        },
        previous_status: currentStatus,
        new_status: new_status
      })
    }

    return NextResponse.json({
      success: true,
      message: `퀘스트 상태가 ${new_status}로 변경되었습니다.`,
      quest: updatedQuest,
      previous_status: currentStatus,
      new_status: new_status
    })
  } catch (error) {
    console.error('퀘스트 상태 전환 오류:', error)
    return NextResponse.json(
      { error: '퀘스트 상태 전환에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 퀘스트 상태 이력 조회
export async function GET(
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

    // 퀘스트 소유권 확인
    const ownershipQuery = `
      SELECT id FROM quests WHERE id = $1 AND user_id = $2
    `
    
    const ownershipResult = await query(ownershipQuery, [questId, user.id])
    
    if (ownershipResult.rows.length === 0) {
      return NextResponse.json(
        { error: '퀘스트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 상태 변경 이력 조회
    const historyQuery = `
      SELECT 
        id,
        from_status,
        to_status,
        reason,
        metadata,
        created_at
      FROM quest_status_history 
      WHERE quest_id = $1
      ORDER BY created_at DESC
    `
    
    const historyResult = await query(historyQuery, [questId])

    return NextResponse.json({
      success: true,
      quest_id: questId,
      status_history: historyResult.rows
    })
  } catch (error) {
    console.error('퀘스트 상태 이력 조회 오류:', error)
    return NextResponse.json(
      { error: '퀘스트 상태 이력 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}