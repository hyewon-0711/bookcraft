import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'
import { PushNotificationService } from '@/lib/firebase-admin'

// 푸시 알림 전송
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

    const {
      target_user_id,
      notification_type,
      title,
      body,
      data,
      click_action
    } = await request.json()

    // 관리자 권한 확인 (필요한 경우)
    // if (!user.is_admin) {
    //   return NextResponse.json(
    //     { error: '관리자 권한이 필요합니다.' },
    //     { status: 403 }
    //   )
    // }

    // 대상 사용자의 FCM 토큰 조회
    const tokensQuery = `
      SELECT fcm_token 
      FROM user_fcm_tokens 
      WHERE user_id = $1 AND is_active = true
    `
    
    const tokensResult = await query(tokensQuery, [target_user_id || user.id])
    
    if (tokensResult.rows.length === 0) {
      return NextResponse.json(
        { error: '대상 사용자의 FCM 토큰을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const fcmTokens = tokensResult.rows.map(row => row.fcm_token)
    
    // 알림 데이터 구성
    const notificationData = {
      title: title || '알림',
      body: body || '',
      icon: '/icon-192x192.png',
      clickAction: click_action || '/',
      data: {
        type: notification_type || 'general',
        timestamp: new Date().toISOString(),
        ...data
      }
    }

    // 푸시 알림 전송
    let successCount = 0
    let failureCount = 0

    if (fcmTokens.length === 1) {
      const success = await PushNotificationService.sendToDevice(
        fcmTokens[0],
        notificationData
      )
      if (success) {
        successCount = 1
      } else {
        failureCount = 1
      }
    } else {
      const result = await PushNotificationService.sendToMultipleDevices(
        fcmTokens,
        notificationData
      )
      successCount = result.successCount
      failureCount = result.failureCount
    }

    // 알림 기록 저장
    const logQuery = `
      INSERT INTO notification_logs (
        sender_id,
        recipient_id,
        notification_type,
        title,
        body,
        data,
        success_count,
        failure_count,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    `
    
    await query(logQuery, [
      user.id,
      target_user_id || user.id,
      notification_type || 'general',
      title,
      body,
      JSON.stringify(data || {}),
      successCount,
      failureCount
    ])

    return NextResponse.json({
      success: true,
      message: '푸시 알림이 전송되었습니다.',
      result: {
        total_tokens: fcmTokens.length,
        success_count: successCount,
        failure_count: failureCount
      }
    })
  } catch (error) {
    console.error('푸시 알림 전송 오류:', error)
    return NextResponse.json(
      { error: '푸시 알림 전송에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 퀘스트 관련 알림 전송 헬퍼 함수들
export async function sendQuestNotification(
  userId: string,
  notificationType: 'expiring' | 'expired' | 'completed' | 'new_quest' | 'streak' | 'level_up',
  data: any
) {
  try {
    // 사용자의 FCM 토큰 조회
    const tokensQuery = `
      SELECT fcm_token 
      FROM user_fcm_tokens 
      WHERE user_id = $1 AND is_active = true
    `
    
    const tokensResult = await query(tokensQuery, [userId])
    
    if (tokensResult.rows.length === 0) {
      console.log(`사용자 ${userId}의 FCM 토큰을 찾을 수 없습니다.`)
      return false
    }

    const fcmTokens = tokensResult.rows.map(row => row.fcm_token)
    const templates = PushNotificationService.getQuestNotificationTemplates()
    
    let notificationData
    
    switch (notificationType) {
      case 'expiring':
        notificationData = templates.questExpiring(data.questTitle, data.timeRemaining)
        break
      case 'expired':
        notificationData = templates.questExpired(data.questTitle)
        break
      case 'completed':
        notificationData = templates.questCompleted(data.questTitle, data.xpReward, data.coinReward)
        break
      case 'new_quest':
        notificationData = templates.newQuestAvailable(data.questCount)
        break
      case 'streak':
        notificationData = templates.streakAchievement(data.streakCount)
        break
      case 'level_up':
        notificationData = templates.levelUp(data.newLevel)
        break
      default:
        console.error('알 수 없는 알림 타입:', notificationType)
        return false
    }

    // 푸시 알림 전송
    let result
    if (fcmTokens.length === 1) {
      const success = await PushNotificationService.sendToDevice(
        fcmTokens[0],
        notificationData
      )
      result = { successCount: success ? 1 : 0, failureCount: success ? 0 : 1 }
    } else {
      result = await PushNotificationService.sendToMultipleDevices(
        fcmTokens,
        notificationData
      )
    }

    // 알림 기록 저장
    const logQuery = `
      INSERT INTO notification_logs (
        recipient_id,
        notification_type,
        title,
        body,
        data,
        success_count,
        failure_count,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `
    
    await query(logQuery, [
      userId,
      notificationType,
      notificationData.title,
      notificationData.body,
      JSON.stringify(notificationData.data || {}),
      result.successCount,
      result.failureCount
    ])

    console.log(`퀘스트 알림 전송 완료 (${notificationType}):`, {
      userId,
      successCount: result.successCount,
      failureCount: result.failureCount
    })

    return result.successCount > 0
  } catch (error) {
    console.error('퀘스트 알림 전송 오류:', error)
    return false
  }
}