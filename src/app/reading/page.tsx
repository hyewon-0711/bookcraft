'use client'

import { useState, useEffect, useRef } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Play, 
  Pause, 
  Square, 
  BookOpen, 
  Clock, 
  Target, 
  Zap,
  Eye,
  FileText,
  TrendingUp,
  Award
} from 'lucide-react'
import { useAuth } from '@/lib/providers'

interface Book {
  id: string
  title: string
  author: string
  cover_image_url?: string
  page_count?: number
}

interface ReadingSession {
  id?: string
  book_id: string
  start_time: string
  end_time?: string
  duration_minutes: number
  pages_read: number
  focus_score: number
  summary?: string
  status: 'active' | 'completed' | 'paused'
}

export default function ReadingPage() {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [pagesRead, setPagesRead] = useState(0)
  const [focusScore, setFocusScore] = useState(100)
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const pauseTimeRef = useRef<number>(0)
  const focusCheckRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<Date>(new Date())

  // 책 목록 불러오기
  const fetchBooks = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/books', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBooks(data.books || [])
      }
    } catch (error) {
      console.error('책 목록 불러오기 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 독서 세션 시작
  const startReading = async () => {
    if (!selectedBook || !user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/reading/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          book_id: selectedBook.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentSession(data.session)
        setIsReading(true)
        setIsPaused(false)
        startTimeRef.current = new Date()
        pauseTimeRef.current = 0
        setElapsedTime(0)
        setPagesRead(0)
        setFocusScore(100)
        setSummary('')
        
        // 타이머 시작
        startTimer()
        // 집중도 모니터링 시작
        startFocusMonitoring()
      } else {
        const error = await response.json()
        alert(error.message || '독서 세션 시작에 실패했습니다.')
      }
    } catch (error) {
      console.error('독서 세션 시작 오류:', error)
      alert('독서 세션 시작 중 오류가 발생했습니다.')
    }
  }

  // 독서 세션 일시정지
  const pauseReading = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (focusCheckRef.current) {
      clearInterval(focusCheckRef.current)
      focusCheckRef.current = null
    }
    setIsPaused(true)
    pauseTimeRef.current = elapsedTime
  }

  // 독서 세션 재개
  const resumeReading = () => {
    setIsPaused(false)
    startTimeRef.current = new Date(Date.now() - pauseTimeRef.current * 60000)
    startTimer()
    startFocusMonitoring()
  }

  // 독서 세션 종료
  const stopReading = async () => {
    if (!currentSession || !user) return
    
    // 타이머 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (focusCheckRef.current) {
      clearInterval(focusCheckRef.current)
      focusCheckRef.current = null
    }
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/reading/${currentSession.id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          duration_minutes: Math.max(1, Math.floor(elapsedTime)),
          pages_read: pagesRead,
          focus_score: Math.round(focusScore),
          summary: summary.trim() || undefined
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`독서 완료! +${data.xp_earned} XP를 획득했습니다!`)
        
        // 상태 초기화
        setCurrentSession(null)
        setIsReading(false)
        setIsPaused(false)
        setElapsedTime(0)
        setPagesRead(0)
        setFocusScore(100)
        setSummary('')
        setSelectedBook(null)
      } else {
        const error = await response.json()
        alert(error.message || '독서 세션 종료에 실패했습니다.')
      }
    } catch (error) {
      console.error('독서 세션 종료 오류:', error)
      alert('독서 세션 종료 중 오류가 발생했습니다.')
    }
  }

  // 타이머 시작
  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const now = new Date()
        const elapsed = (now.getTime() - startTimeRef.current.getTime()) / (1000 * 60)
        setElapsedTime(elapsed)
      }
    }, 1000)
  }

  // 집중도 모니터링 시작
  const startFocusMonitoring = () => {
    // 마우스 움직임과 키보드 입력 감지
    const handleActivity = () => {
      lastActivityRef.current = new Date()
    }
    
    document.addEventListener('mousemove', handleActivity)
    document.addEventListener('keypress', handleActivity)
    document.addEventListener('click', handleActivity)
    
    // 5초마다 집중도 체크
    focusCheckRef.current = setInterval(() => {
      const now = new Date()
      const timeSinceActivity = (now.getTime() - lastActivityRef.current.getTime()) / 1000
      
      // 30초 이상 활동이 없으면 집중도 감소
      if (timeSinceActivity > 30) {
        setFocusScore(prev => Math.max(0, prev - 2))
      } else if (timeSinceActivity < 5) {
        // 활발한 활동이 있으면 집중도 회복
        setFocusScore(prev => Math.min(100, prev + 1))
      }
    }, 5000)
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener('mousemove', handleActivity)
      document.removeEventListener('keypress', handleActivity)
      document.removeEventListener('click', handleActivity)
    }
  }

  // 시간 포맷팅
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    const secs = Math.floor((minutes % 1) * 60)
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 집중도 색상
  const getFocusColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  // 컴포넌트 마운트 시 책 목록 불러오기
  useEffect(() => {
    if (user) {
      fetchBooks()
    } else {
      setIsLoading(false)
    }
  }, [user])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (focusCheckRef.current) {
        clearInterval(focusCheckRef.current)
      }
    }
  }, [])

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600">독서 세션을 시작하려면 로그인해주세요.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">독서 세션</h1>
          <p className="text-gray-600 mt-1">
            집중해서 독서하고 진행률을 추적해보세요
          </p>
        </div>

        {!isReading ? (
          /* 독서 시작 화면 */
          <div className="space-y-6">
            {/* 책 선택 */}
            <Card>
              <CardHeader>
                <CardTitle>독서할 책 선택</CardTitle>
                <CardDescription>
                  등록된 책 중에서 읽을 책을 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {books.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">등록된 책이 없습니다.</p>
                    <Button onClick={() => window.location.href = '/books'}>
                      책 등록하러 가기
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {books.map((book) => (
                      <Card 
                        key={book.id} 
                        className={`cursor-pointer transition-all ${
                          selectedBook?.id === book.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedBook(book)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                              {book.cover_image_url ? (
                                <img 
                                  src={book.cover_image_url} 
                                  alt={book.title}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <BookOpen className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm line-clamp-2">
                                {book.title}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                {book.author}
                              </p>
                              {book.page_count && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {book.page_count}페이지
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 독서 시작 버튼 */}
            {selectedBook && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">
                      선택된 책: {selectedBook.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      저자: {selectedBook.author}
                    </p>
                    <Button 
                      onClick={startReading}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Play className="h-5 w-5" />
                      독서 시작하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* 독서 중 화면 */
          <div className="space-y-6">
            {/* 현재 독서 중인 책 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {selectedBook?.title}
                </CardTitle>
                <CardDescription>
                  저자: {selectedBook?.author}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 독서 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">독서 시간</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatTime(elapsedTime)}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">읽은 페이지</p>
                      <p className="text-2xl font-bold text-green-600">
                        {pagesRead}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">집중도</p>
                      <p className={`text-2xl font-bold ${getFocusColor(focusScore)}`}>
                        {Math.round(focusScore)}%
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-purple-600" />
                  </div>
                  <Progress value={focusScore} className="mt-2 h-2" />
                </CardContent>
              </Card>
            </div>

            {/* 독서 진행 입력 */}
            <Card>
              <CardHeader>
                <CardTitle>독서 진행 상황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pages">읽은 페이지 수</Label>
                  <Input
                    id="pages"
                    type="number"
                    value={pagesRead}
                    onChange={(e) => setPagesRead(parseInt(e.target.value) || 0)}
                    placeholder="읽은 페이지 수를 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="summary">독서 요약 (선택사항)</Label>
                  <Textarea
                    id="summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="읽은 내용을 간단히 요약해보세요"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 독서 제어 버튼 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-center gap-4">
                  {!isPaused ? (
                    <Button 
                      onClick={pauseReading}
                      variant="outline"
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Pause className="h-5 w-5" />
                      일시정지
                    </Button>
                  ) : (
                    <Button 
                      onClick={resumeReading}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Play className="h-5 w-5" />
                      재개
                    </Button>
                  )}
                  <Button 
                    onClick={stopReading}
                    variant="destructive"
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-5 w-5" />
                    독서 완료
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  )
}