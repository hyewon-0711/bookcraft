import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { QuestManager } from '@/lib/quest-manager'

// 만료된 퀘스트 자동 처리 (크론 작업용)
export async function POST(request: NextRequest) {
  try {
    // Vercel Cron Jobs 인증 검증
    const authHeader = request.headers.get('authorization')
    const apiKey = request.headers.get('x-api-key')
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret')
    
    // Vercel Cron Jobs에서 오는 요청인지 확인
    const isVercelCron = vercelCronSecret === process.env.CRON_SECRET
    const isApiKeyValid = apiKey === process.env.CRON_API_KEY
    
    if (!isVercelCron && !isApiKeyValid) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      )
    }

    console.log('만료된 퀘스트 처리 시작:', new Date().toISOString())

    // 만료된 퀘스트 조회
    const expiredQuestsQuery = `
      SELECT 
        q.id,
        q.user_id,
        q.title,
        q.quest_type,
        q.auto_renew,
        q.status,
        q.expires_at,
        q.grace_period_minutes,
        qm.renewal_pattern,
        qm.expiry_notifications
      FROM quests q
      LEFT JOIN quest_metadata qm ON q.id = qm.quest_id
      WHERE q.expires_at < CURRENT_TIMESTAMP 
        AND q.status NOT IN ('completed', 'expired', 'failed')
      ORDER BY q.expires_at ASC
    `
    
    const expiredQuestsResult = await query(expiredQuestsQuery, [])
    const expiredQuests = expiredQuestsResult.rows

    if (expiredQuests.length === 0) {
      return NextResponse.json({
        success: true,
        message: '만료된 퀘스트가 없습니다.',
        processed_count: 0
      })
    }

    console.log(`${expiredQuests.length}개의 만료된 퀘스트 발견`)

    let processedCount = 0
    let renewedCount = 0
    let expiredCount = 0
    const results = []

    for (const quest of expiredQuests) {
      try {
        const now = new Date()
        const expiryTime = new Date(quest.expires_at)
        const gracePeriodMs = (quest.grace_period_minutes || 0) * 60 * 1000
        const isInGracePeriod = (now.getTime() - expiryTime.getTime()) <= gracePeriodMs

        // 유예 시간 내라면 처리하지 않음
        if (isInGracePeriod) {
          console.log(`퀘스트 ${quest.id}: 유예 시간 내 (${quest.grace_period_minutes}분)`)
          continue
        }

        // 자동 갱신 퀘스트 처리
        if (quest.auto_renew && quest.quest_type === 'daily') {
          await handleAutoRenewal(quest)
          renewedCount++
          results.push({
            quest_id: quest.id,
            action: 'renewed',
            title: quest.title
          })
        } else {
          // 일반 만료 처리
          await expireQuest(quest.id, quest.user_id)
          expiredCount++
          results.push({
            quest_id: quest.id,
            action: 'expired',
            title: quest.title
          })
        }

        // 만료 알림 발송
        if (quest.expiry_notifications?.expired) {
          await sendExpiryNotification(quest.user_id, quest.id, quest.title)
        }

        processedCount++
      } catch (error) {
        console.error(`퀘스트 ${quest.id} 처리 중 오류:`, error)
        results.push({
          quest_id: quest.id,
          action: 'error',
          title: quest.title,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    console.log(`만료 처리 완료: ${processedCount}개 처리, ${renewedCount}개 갱신, ${expiredCount}개 만료`)

    return NextResponse.json({
      success: true,
      message: `${processedCount}개의 퀘스트를 처리했습니다.`,
      processed_count: processedCount,
      renewed_count: renewedCount,
      expired_count: expiredCount,
      results
    })
  } catch (error) {
    console.error('만료된 퀘스트 처리 오류:', error)
    return NextResponse.json(
      { error: '만료된 퀘스트 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 자동 갱신 처리
async function handleAutoRenewal(quest: any) {
  try {
    // 기존 퀘스트를 만료 상태로 변경
    const expireQuery = `
      UPDATE quests 
      SET 
        status = 'expired',
        failed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `
    
    await query(expireQuery, [quest.id])

    // 새로운 퀘스트 생성
    const renewalPattern = quest.renewal_pattern || { interval: 'daily', time: '00:00' }
    const nextExpiry = QuestManager.getNextRenewalTime(renewalPattern)

    const createNewQuestQuery = `
      INSERT INTO quests (
        title,
        description,
        type,
        quest_type,
        difficulty,
        xp_reward,
        coin_reward,
        target_value,
        progress,
        status,
        user_id,
        expires_at,
        auto_renew,
        grace_period_minutes
      )
      SELECT 
        title,
        description,
        type,
        quest_type,
        difficulty,
        xp_reward,
        coin_reward,
        target_value,
        0, -- progress 초기화
        'pending',
        user_id,
        $2,
        auto_renew,
        grace_period_minutes
      FROM quests 
      WHERE id = $1
      RETURNING id
    `
    
    const newQuestResult = await query(createNewQuestQuery, [quest.id, nextExpiry])
    const newQuestId = newQuestResult.rows[0]?.id

    if (newQuestId) {
      // 새 퀘스트의 메타데이터 생성
      const createMetadataQuery = `
        INSERT INTO quest_metadata (
          quest_id,
          renewal_pattern,
          expiry_notifications,
          streak_count,
          bonus_multiplier
        )
        SELECT 
          $1,
          renewal_pattern,
          expiry_notifications,
          0, -- streak_count 초기화
          bonus_multiplier
        FROM quest_metadata 
        WHERE quest_id = $2
      `
      
      await query(createMetadataQuery, [newQuestId, quest.id])

      console.log(`퀘스트 ${quest.id} 자동 갱신 완료 -> 새 퀘스트 ${newQuestId}`)
    }
  } catch (error) {
    console.error(`퀘스트 ${quest.id} 자동 갱신 실패:`, error)
    throw error
  }
}

// 퀘스트 만료 처리
async function expireQuest(questId: string, userId: string) {
  const expireQuery = `
    UPDATE quests 
    SET 
      status = 'expired',
      failed_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2
  `
  
  await query(expireQuery, [questId, userId])
  console.log(`퀘스트 ${questId} 만료 처리 완료`)
}

// 만료 알림 발송
async function sendExpiryNotification(userId: string, questId: string, questTitle: string) {
  try {
    // 실제 알림 시스템 연동 (푸시 알림, 이메일 등)
    // 여기서는 로그만 출력
    console.log(`사용자 ${userId}에게 퀘스트 만료 알림 발송: ${questTitle}`)
    
    // TODO: 실제 알림 서비스 연동
    // - 푸시 알림 (Firebase, OneSignal 등)
    // - 이메일 알림
    // - 인앱 알림
  } catch (error) {
    console.error(`알림 발송 실패 (사용자: ${userId}, 퀘스트: ${questId}):`, error)
  }
}

// 만료 임박 알림 처리
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron Jobs 인증 검증
    const authHeader = request.headers.get('authorization')
    const apiKey = request.headers.get('x-api-key')
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret')
    
    // Vercel Cron Jobs에서 오는 요청인지 확인
    const isVercelCron = vercelCronSecret === process.env.CRON_SECRET
    const isApiKeyValid = apiKey === process.env.CRON_API_KEY
    
    if (!isVercelCron && !isApiKeyValid) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      )
    }

    console.log('만료 임박 알림 처리 시작:', new Date().toISOString())

    // 만료 임박 퀘스트 조회 (24시간, 6시간, 1시간, 15분 전)
    const upcomingExpiryQuery = `
      SELECT 
        q.id,
        q.user_id,
        q.title,
        q.expires_at,
        qm.expiry_notifications,
        EXTRACT(EPOCH FROM (q.expires_at - CURRENT_TIMESTAMP))/3600 as hours_until_expiry
      FROM quests q
      LEFT JOIN quest_metadata qm ON q.id = qm.quest_id
      WHERE q.status IN ('pending', 'active', 'paused')
        AND q.expires_at > CURRENT_TIMESTAMP
        AND q.expires_at <= CURRENT_TIMESTAMP + INTERVAL '24 hours'
      ORDER BY q.expires_at ASC
    `
    
    const upcomingResult = await query(upcomingExpiryQuery, [])
    const upcomingQuests = upcomingResult.rows

    let notificationsSent = 0

    for (const quest of upcomingQuests) {
      const hoursUntilExpiry = parseFloat(quest.hours_until_expiry)
      const notifications = quest.expiry_notifications || {}
      
      let shouldNotify = false
      let notificationType = ''

      // 알림 시점 확인
      if (hoursUntilExpiry <= 0.25 && notifications['15m_before']) { // 15분 전
        shouldNotify = true
        notificationType = '15분 전'
      } else if (hoursUntilExpiry <= 1 && notifications['1h_before']) { // 1시간 전
        shouldNotify = true
        notificationType = '1시간 전'
      } else if (hoursUntilExpiry <= 6 && notifications['6h_before']) { // 6시간 전
        shouldNotify = true
        notificationType = '6시간 전'
      } else if (hoursUntilExpiry <= 24 && notifications['24h_before']) { // 24시간 전
        shouldNotify = true
        notificationType = '24시간 전'
      }

      if (shouldNotify) {
        // 중복 알림 방지를 위한 체크 (최근 1시간 내 같은 타입 알림 발송 여부)
        const recentNotificationQuery = `
          SELECT id FROM quest_status_history 
          WHERE quest_id = $1 
            AND reason LIKE $2
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
          LIMIT 1
        `
        
        const recentResult = await query(recentNotificationQuery, [
          quest.id, 
          `%${notificationType}%`
        ])

        if (recentResult.rows.length === 0) {
          await sendExpiryWarningNotification(
            quest.user_id, 
            quest.id, 
            quest.title, 
            notificationType,
            quest.expires_at
          )
          
          // 알림 기록 저장
          const logNotificationQuery = `
            INSERT INTO quest_status_history (
              quest_id,
              from_status,
              to_status,
              changed_by,
              reason
            ) VALUES ($1, $2, $2, $3, $4)
          `
          
          await query(logNotificationQuery, [
            quest.id,
            'active', // 현재 상태 유지
            quest.user_id,
            `만료 ${notificationType} 알림 발송`
          ])
          
          notificationsSent++
        }
      }
    }

    console.log(`만료 임박 알림 처리 완료: ${notificationsSent}개 알림 발송`)

    return NextResponse.json({
      success: true,
      message: `${notificationsSent}개의 만료 임박 알림을 발송했습니다.`,
      notifications_sent: notificationsSent,
      checked_quests: upcomingQuests.length
    })
  } catch (error) {
    console.error('만료 임박 알림 처리 오류:', error)
    return NextResponse.json(
      { error: '만료 임박 알림 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 만료 임박 알림 발송
async function sendExpiryWarningNotification(
  userId: string, 
  questId: string, 
  questTitle: string, 
  timeframe: string,
  expiresAt: string
) {
  try {
    const timeRemaining = QuestManager.formatTimeRemaining(expiresAt)
    
    console.log(`사용자 ${userId}에게 만료 임박 알림 발송: ${questTitle} (${timeframe}, ${timeRemaining})`)
    
    // TODO: 실제 알림 서비스 연동
    // const notificationMessage = `퀘스트 "${questTitle}"이 ${timeRemaining} 후 만료됩니다!`
    // await sendPushNotification(userId, notificationMessage)
  } catch (error) {
    console.error(`만료 임박 알림 발송 실패:`, error)
  }
}