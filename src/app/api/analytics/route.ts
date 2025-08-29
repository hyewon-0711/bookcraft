import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { Analytics } from '@/lib/analytics'

// 분석 데이터 조회
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
    const timeframe = url.searchParams.get('timeframe') as 'day' | 'week' | 'month' | 'year' || 'week'
    const type = url.searchParams.get('type') // 'overview', 'quests', 'users', 'reading', 'performance'
    const userId = url.searchParams.get('user_id')

    // 사용자별 분석 데이터 요청
    if (userId) {
      // 본인 데이터만 조회 가능 (관리자 권한 확인 필요시 추가)
      if (userId !== user.id) {
        return NextResponse.json(
          { error: '다른 사용자의 데이터에 접근할 수 없습니다.' },
          { status: 403 }
        )
      }

      const userAnalytics = await Analytics.getUserAnalytics(userId)
      return NextResponse.json({
        success: true,
        data: userAnalytics,
        timeframe,
        generated_at: new Date().toISOString()
      })
    }

    // 전체 분석 데이터 조회
    const analyticsData = await Analytics.getAnalyticsData(timeframe)
    
    // 특정 타입만 요청된 경우 필터링
    let responseData = analyticsData
    if (type) {
      switch (type) {
        case 'overview':
          responseData = { overview: analyticsData.overview } as any
          break
        case 'quests':
          responseData = { quest_analytics: analyticsData.quest_analytics } as any
          break
        case 'users':
          responseData = { user_engagement: analyticsData.user_engagement } as any
          break
        case 'reading':
          responseData = { reading_patterns: analyticsData.reading_patterns } as any
          break
        case 'performance':
          responseData = { performance_metrics: analyticsData.performance_metrics } as any
          break
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      timeframe,
      generated_at: new Date().toISOString(),
      metadata: {
        data_freshness: 'real-time',
        coverage: timeframe,
        total_data_points: calculateDataPoints(analyticsData)
      }
    })
  } catch (error) {
    console.error('분석 데이터 조회 오류:', error)
    return NextResponse.json(
      { error: '분석 데이터 조회에 실패했습니다.' },
      { status: 500 }
    )
  }

}

// 데이터 포인트 수 계산 헬퍼 함수
function calculateDataPoints(data: any): number {
  let count = 0
  
  if (data.quest_analytics?.daily_completions) {
    count += data.quest_analytics.daily_completions.length
  }
  if (data.user_engagement?.daily_active_users) {
    count += data.user_engagement.daily_active_users.length
  }
  if (data.reading_patterns?.reading_time_by_hour) {
    count += data.reading_patterns.reading_time_by_hour.length
  }
  
  return count
}

// 분석 리포트 생성
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

    const { report_type, timeframe, include_charts } = await request.json()

    // 관리자 권한 확인 (필요시)
    // if (!user.is_admin) {
    //   return NextResponse.json(
    //     { error: '관리자 권한이 필요합니다.' },
    //     { status: 403 }
    //   )
    // }

    const analyticsData = await Analytics.getAnalyticsData(timeframe || 'week')
    
    // 리포트 생성
    const report = await generateReport(analyticsData, report_type, include_charts)
    
    return NextResponse.json({
      success: true,
      report,
      generated_at: new Date().toISOString(),
      report_type,
      timeframe: timeframe || 'week'
    })
  } catch (error) {
    console.error('분석 리포트 생성 오류:', error)
    return NextResponse.json(
      { error: '분석 리포트 생성에 실패했습니다.' },
      { status: 500 }
    )
  }

}

// 리포트 생성 헬퍼 함수
async function generateReport(data: any, reportType: string, includeCharts: boolean) {
  const report = {
    title: getReportTitle(reportType),
    summary: generateSummary(data),
    sections: [] as any[],
    recommendations: generateRecommendations(data),
    charts: includeCharts ? generateChartConfigs(data) : null
  }

  switch (reportType) {
    case 'executive':
      report.sections = [
        {
          title: '핵심 지표',
          content: formatOverviewSection(data.overview)
        },
        {
          title: '사용자 참여도',
          content: formatEngagementSection(data.user_engagement)
        },
        {
          title: '퀘스트 성과',
          content: formatQuestSection(data.quest_analytics)
        }
      ]
      break
      
    case 'detailed':
      report.sections = [
        {
          title: '전체 개요',
          content: formatOverviewSection(data.overview)
        },
        {
          title: '퀘스트 분석',
          content: formatQuestSection(data.quest_analytics)
        },
        {
          title: '사용자 참여도',
          content: formatEngagementSection(data.user_engagement)
        },
        {
          title: '독서 패턴',
          content: formatReadingSection(data.reading_patterns)
        },
        {
          title: '성능 지표',
          content: formatPerformanceSection(data.performance_metrics)
        }
      ]
      break
      
    case 'user_focused':
      report.sections = [
        {
          title: '사용자 활동',
          content: formatEngagementSection(data.user_engagement)
        },
        {
          title: '독서 습관',
          content: formatReadingSection(data.reading_patterns)
        }
      ]
      break
  }

  return report
}

function getReportTitle(reportType: string): string {
  switch (reportType) {
    case 'executive': return 'BookCraft 경영진 리포트'
    case 'detailed': return 'BookCraft 상세 분석 리포트'
    case 'user_focused': return 'BookCraft 사용자 중심 리포트'
    default: return 'BookCraft 분석 리포트'
  }
}

function generateSummary(data: any): string {
  const overview = data.overview
  const questAnalytics = data.quest_analytics
  
  return `현재 총 ${overview.total_users}명의 사용자가 BookCraft를 이용하고 있으며, ` +
         `이번 주 활성 사용자는 ${overview.active_users_week}명입니다. ` +
         `퀘스트 완료율은 ${questAnalytics.completion_rate}%로 ` +
         `${questAnalytics.completion_rate >= 70 ? '우수한' : questAnalytics.completion_rate >= 50 ? '양호한' : '개선이 필요한'} 수준입니다.`
}

function generateRecommendations(data: any): string[] {
  const recommendations = []
  const questAnalytics = data.quest_analytics
  const userEngagement = data.user_engagement
  
  if (questAnalytics.completion_rate < 50) {
    recommendations.push('퀘스트 완료율이 낮습니다. 퀘스트 난이도 조정이나 보상 개선을 고려해보세요.')
  }
  
  if (userEngagement.retention_rate.day_7 < 30) {
    recommendations.push('7일 리텐션이 낮습니다. 초기 사용자 경험 개선이 필요합니다.')
  }
  
  if (userEngagement.session_duration.avg_minutes < 15) {
    recommendations.push('평균 세션 시간이 짧습니다. 더 몰입할 수 있는 콘텐츠나 기능을 추가해보세요.')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('전반적으로 좋은 지표를 보이고 있습니다. 현재 전략을 유지하세요.')
  }
  
  return recommendations
}

function formatOverviewSection(overview: any): string {
  return `• 총 사용자 수: ${overview.total_users}명\n` +
         `• 오늘 활성 사용자: ${overview.active_users_today}명\n` +
         `• 이번 주 활성 사용자: ${overview.active_users_week}명\n` +
         `• 총 퀘스트 수: ${overview.total_quests}개\n` +
         `• 완료된 퀘스트: ${overview.completed_quests}개\n` +
         `• 등록된 책: ${overview.total_books}권\n` +
         `• 총 독서 시간: ${Math.round(overview.total_reading_time / 60)}시간`
}

function formatQuestSection(questAnalytics: any): string {
  return `• 퀘스트 완료율: ${questAnalytics.completion_rate}%\n` +
         `• 평균 완료 시간: ${questAnalytics.avg_completion_time}시간\n` +
         `• 인기 퀘스트 타입: ${questAnalytics.popular_quest_types.slice(0, 3).map((t: any) => t.type).join(', ')}`
}

function formatEngagementSection(userEngagement: any): string {
  return `• 1일 리텐션: ${userEngagement.retention_rate.day_1}%\n` +
         `• 7일 리텐션: ${userEngagement.retention_rate.day_7}%\n` +
         `• 30일 리텐션: ${userEngagement.retention_rate.day_30}%\n` +
         `• 평균 세션 시간: ${userEngagement.session_duration.avg_minutes}분`
}

function formatReadingSection(readingPatterns: any): string {
  const peakHour = readingPatterns.reading_time_by_hour.reduce((max: any, current: any) => 
    current.total_minutes > max.total_minutes ? current : max, { hour: 0, total_minutes: 0 })
  
  return `• 가장 활발한 독서 시간: ${peakHour.hour}시\n` +
         `• 세션당 평균 페이지: ${readingPatterns.avg_pages_per_session}페이지\n` +
         `• 인기 장르: ${readingPatterns.popular_genres.slice(0, 3).map((g: any) => g.genre).join(', ')}`
}

function formatPerformanceSection(performanceMetrics: any): string {
  return `• 퀘스트 생성 성공률: ${performanceMetrics.quest_generation_success_rate}%\n` +
         `• 평균 API 응답 시간: ${Math.round(performanceMetrics.api_response_times.reduce((sum: number, api: any) => sum + api.avg_ms, 0) / performanceMetrics.api_response_times.length)}ms`
}

function generateChartConfigs(data: any) {
  return {
    quest_completion_trend: {
      type: 'line',
      data: data.quest_analytics.daily_completions,
      title: '일별 퀘스트 완료 추이'
    },
    user_activity: {
      type: 'line',
      data: data.user_engagement.daily_active_users,
      title: '일별 활성 사용자'
    },
    reading_time_by_hour: {
      type: 'bar',
      data: data.reading_patterns.reading_time_by_hour,
      title: '시간대별 독서 시간'
    },
    quest_status_distribution: {
      type: 'pie',
      data: data.quest_analytics.status_distribution,
      title: '퀘스트 상태 분포'
    }
 }
}