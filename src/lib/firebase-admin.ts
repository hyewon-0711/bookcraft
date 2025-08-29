import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

// Firebase Admin SDK 초기화
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  })
}

const messaging = getMessaging()

export interface PushNotificationData {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, string>
  clickAction?: string
}

export interface NotificationTarget {
  token?: string
  topic?: string
  condition?: string
}

/**
 * 푸시 알림 서비스 클래스
 */
export class PushNotificationService {
  /**
   * 단일 기기에 푸시 알림 전송
   */
  static async sendToDevice(
    token: string,
    notification: PushNotificationData
  ): Promise<boolean> {
    try {
      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
        },
        data: notification.data || {},
        webpush: {
          notification: {
            icon: notification.icon || '/icon-192x192.png',
            badge: notification.badge || '/badge-72x72.png',
            requireInteraction: true,
            actions: notification.clickAction ? [
              {
                action: 'open',
                title: '확인하기',
                icon: '/icon-192x192.png'
              }
            ] : undefined
          },
          fcmOptions: {
            link: notification.clickAction || '/'
          }
        }
      }

      const response = await messaging.send(message)
      console.log('푸시 알림 전송 성공:', response)
      return true
    } catch (error) {
      console.error('푸시 알림 전송 실패:', error)
      return false
    }
  }

  /**
   * 여러 기기에 푸시 알림 전송
   */
  static async sendToMultipleDevices(
    tokens: string[],
    notification: PushNotificationData
  ): Promise<{ successCount: number; failureCount: number }> {
    try {
      const message = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
        },
        data: notification.data || {},
        webpush: {
          notification: {
            icon: notification.icon || '/icon-192x192.png',
            badge: notification.badge || '/badge-72x72.png',
            requireInteraction: true,
          },
          fcmOptions: {
            link: notification.clickAction || '/'
          }
        }
      }

      const response = await messaging.sendEachForMulticast(message)
      console.log('다중 푸시 알림 전송 결과:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      })

      return {
        successCount: response.successCount,
        failureCount: response.failureCount
      }
    } catch (error) {
      console.error('다중 푸시 알림 전송 실패:', error)
      return { successCount: 0, failureCount: tokens.length }
    }
  }

  /**
   * 토픽에 푸시 알림 전송
   */
  static async sendToTopic(
    topic: string,
    notification: PushNotificationData
  ): Promise<boolean> {
    try {
      const message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
        },
        data: notification.data || {},
        webpush: {
          notification: {
            icon: notification.icon || '/icon-192x192.png',
            badge: notification.badge || '/badge-72x72.png',
          },
          fcmOptions: {
            link: notification.clickAction || '/'
          }
        }
      }

      const response = await messaging.send(message)
      console.log('토픽 푸시 알림 전송 성공:', response)
      return true
    } catch (error) {
      console.error('토픽 푸시 알림 전송 실패:', error)
      return false
    }
  }

  /**
   * 토픽 구독
   */
  static async subscribeToTopic(
    tokens: string[],
    topic: string
  ): Promise<boolean> {
    try {
      const response = await messaging.subscribeToTopic(tokens, topic)
      console.log('토픽 구독 성공:', response)
      return true
    } catch (error) {
      console.error('토픽 구독 실패:', error)
      return false
    }
  }

  /**
   * 토픽 구독 해제
   */
  static async unsubscribeFromTopic(
    tokens: string[],
    topic: string
  ): Promise<boolean> {
    try {
      const response = await messaging.unsubscribeFromTopic(tokens, topic)
      console.log('토픽 구독 해제 성공:', response)
      return true
    } catch (error) {
      console.error('토픽 구독 해제 실패:', error)
      return false
    }
  }

  /**
   * 퀘스트 관련 알림 템플릿
   */
  static getQuestNotificationTemplates() {
    return {
      questExpiring: (questTitle: string, timeRemaining: string): PushNotificationData => ({
        title: '⏰ 퀘스트 만료 임박!',
        body: `"${questTitle}" 퀘스트가 ${timeRemaining} 후 만료됩니다.`,
        icon: '/quest-icon.png',
        clickAction: '/quests',
        data: {
          type: 'quest_expiring',
          questTitle,
          timeRemaining
        }
      }),

      questExpired: (questTitle: string): PushNotificationData => ({
        title: '😞 퀘스트 만료',
        body: `"${questTitle}" 퀘스트가 만료되었습니다. 새로운 퀘스트를 확인해보세요!`,
        icon: '/quest-expired-icon.png',
        clickAction: '/quests',
        data: {
          type: 'quest_expired',
          questTitle
        }
      }),

      questCompleted: (questTitle: string, xpReward: number, coinReward: number): PushNotificationData => ({
        title: '🎉 퀘스트 완료!',
        body: `"${questTitle}" 완료! +${xpReward} XP, +${coinReward} 코인을 획득했습니다.`,
        icon: '/quest-completed-icon.png',
        clickAction: '/quests',
        data: {
          type: 'quest_completed',
          questTitle,
          xpReward: xpReward.toString(),
          coinReward: coinReward.toString()
        }
      }),

      newQuestAvailable: (questCount: number): PushNotificationData => ({
        title: '✨ 새로운 퀘스트!',
        body: `${questCount}개의 새로운 퀘스트가 생성되었습니다. 도전해보세요!`,
        icon: '/new-quest-icon.png',
        clickAction: '/quests',
        data: {
          type: 'new_quest',
          questCount: questCount.toString()
        }
      }),

      streakAchievement: (streakCount: number): PushNotificationData => ({
        title: '🔥 연속 달성!',
        body: `${streakCount}일 연속 퀘스트 완료! 대단해요!`,
        icon: '/streak-icon.png',
        clickAction: '/dashboard',
        data: {
          type: 'streak_achievement',
          streakCount: streakCount.toString()
        }
      }),

      levelUp: (newLevel: number): PushNotificationData => ({
        title: '🎊 레벨 업!',
        body: `축하합니다! 레벨 ${newLevel}에 도달했습니다!`,
        icon: '/level-up-icon.png',
        clickAction: '/dashboard',
        data: {
          type: 'level_up',
          newLevel: newLevel.toString()
        }
      })
    }
  }
}

export default PushNotificationService