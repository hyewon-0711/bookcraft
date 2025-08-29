import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging'
import { isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Firebase 앱 초기화
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]

/**
 * 클라이언트 사이드 푸시 알림 관리 클래스
 */
export class ClientPushNotificationService {
  private static messaging: any = null
  private static isInitialized = false

  /**
   * Firebase Messaging 초기화
   */
  static async initialize(): Promise<boolean> {
    try {
      // 브라우저 환경 체크
      if (typeof window === 'undefined') {
        console.log('서버 사이드에서는 Firebase Messaging을 사용할 수 없습니다.')
        return false
      }

      // Firebase Messaging 지원 여부 확인
      const supported = await isSupported()
      if (!supported) {
        console.log('이 브라우저는 Firebase Messaging을 지원하지 않습니다.')
        return false
      }

      // Service Worker 등록 확인
      if (!('serviceWorker' in navigator)) {
        console.log('이 브라우저는 Service Worker를 지원하지 않습니다.')
        return false
      }

      this.messaging = getMessaging(app)
      this.isInitialized = true
      
      // 포그라운드 메시지 리스너 설정
      this.setupForegroundMessageListener()
      
      console.log('Firebase Messaging 초기화 완료')
      return true
    } catch (error) {
      console.error('Firebase Messaging 초기화 실패:', error)
      return false
    }
  }

  /**
   * FCM 토큰 요청
   */
  static async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize()
        if (!initialized) return null
      }

      // 알림 권한 요청
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('알림 권한이 거부되었습니다.')
        return null
      }

      // FCM 토큰 가져오기
      const token = await getToken(this.messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      })

      if (token) {
        console.log('FCM 토큰 획득 성공:', token)
        return token
      } else {
        console.log('FCM 토큰 획득 실패')
        return null
      }
    } catch (error) {
      console.error('FCM 토큰 요청 실패:', error)
      return null
    }
  }

  /**
   * 포그라운드 메시지 리스너 설정
   */
  static setupForegroundMessageListener(): void {
    if (!this.messaging) return

    onMessage(this.messaging, (payload: MessagePayload) => {
      console.log('포그라운드 메시지 수신:', payload)
      
      // 커스텀 알림 표시
      this.showCustomNotification(payload)
    })
  }

  /**
   * 커스텀 알림 표시
   */
  static showCustomNotification(payload: MessagePayload): void {
    const { notification, data } = payload
    
    if (!notification) return

    // 브라우저 알림 표시
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationOptions: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: data?.type || 'default',
        requireInteraction: true,
        data: data
      }

      const notificationInstance = new Notification(notification.title || '', notificationOptions)
      
      // 알림 클릭 이벤트
      notificationInstance.onclick = (event) => {
        event.preventDefault()
        
        // 클릭 액션에 따른 페이지 이동
        const clickAction = data?.clickAction || '/'
        window.open(clickAction, '_blank')
        
        notificationInstance.close()
      }

      // 자동 닫기 (10초 후)
      setTimeout(() => {
        notificationInstance.close()
      }, 10000)
    }

    // 인앱 알림 표시 (토스트 등)
    this.showInAppNotification(notification, data)
  }

  /**
   * 인앱 알림 표시
   */
  static showInAppNotification(notification: any, data: any): void {
    // 커스텀 토스트 알림 생성
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50 transform transition-all duration-300 translate-x-full'
    
    toast.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <img src="${notification.icon || '/icon-192x192.png'}" alt="알림" class="w-8 h-8 rounded">
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">${notification.title}</p>
          <p class="text-sm text-gray-500 mt-1">${notification.body}</p>
        </div>
        <button class="flex-shrink-0 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `

    document.body.appendChild(toast)

    // 애니메이션으로 표시
    setTimeout(() => {
      toast.classList.remove('translate-x-full')
    }, 100)

    // 클릭 이벤트
    toast.addEventListener('click', () => {
      const clickAction = data?.clickAction || '/'
      window.location.href = clickAction
    })

    // 자동 제거 (5초 후)
    setTimeout(() => {
      toast.classList.add('translate-x-full')
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast)
        }
      }, 300)
    }, 5000)
  }

  /**
   * FCM 토큰을 서버에 저장
   */
  static async saveTokenToServer(token: string): Promise<boolean> {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        console.log('인증 토큰이 없습니다.')
        return false
      }

      const response = await fetch('/api/notifications/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ fcm_token: token })
      })

      if (response.ok) {
        console.log('FCM 토큰 서버 저장 성공')
        return true
      } else {
        console.error('FCM 토큰 서버 저장 실패')
        return false
      }
    } catch (error) {
      console.error('FCM 토큰 서버 저장 오류:', error)
      return false
    }
  }

  /**
   * 알림 설정 초기화 (앱 시작 시 호출)
   */
  static async initializeNotifications(): Promise<void> {
    try {
      const initialized = await this.initialize()
      if (!initialized) return

      const token = await this.requestPermissionAndGetToken()
      if (token) {
        await this.saveTokenToServer(token)
        
        // 로컬 스토리지에 토큰 저장
        localStorage.setItem('fcm_token', token)
      }
    } catch (error) {
      console.error('알림 초기화 실패:', error)
    }
  }

  /**
   * 알림 권한 상태 확인
   */
  static getNotificationPermission(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission
    }
    return 'denied'
  }

  /**
   * 알림 설정 페이지로 이동
   */
  static openNotificationSettings(): void {
    if ('Notification' in window) {
      // 브라우저 설정 페이지로 이동하는 방법은 브라우저마다 다름
      alert('브라우저 설정에서 알림 권한을 허용해주세요.')
    }
  }
}

export default ClientPushNotificationService