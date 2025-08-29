import { QuestType, CreateQuestRequest } from '@/types'

export interface QuestTemplate {
  id: string
  name: string
  description: string
  category: 'reading' | 'writing' | 'learning' | 'social' | 'challenge'
  difficulty_range: [number, number] // [min, max]
  quest_type: QuestType
  type: 'timer' | 'summary' | 'challenge' | 'reading'
  target_value_range: [number, number]
  xp_multiplier: number
  coin_multiplier: number
  tags: string[]
  requirements?: {
    min_books?: number
    min_level?: number
    completed_quests?: string[]
    time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night'
    day_of_week?: number[]
  }
  variables: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'array'
      default?: any
      options?: any[]
      min?: number
      max?: number
    }
  }
  title_template: string
  description_template: string
}

/**
 * 퀘스트 템플릿 관리 클래스
 */
export class QuestTemplateManager {
  private static templates: QuestTemplate[] = [
    // 독서 관련 템플릿
    {
      id: 'daily_reading_timer',
      name: '일일 독서 시간',
      description: '매일 일정 시간 동안 독서하는 기본 퀘스트',
      category: 'reading',
      difficulty_range: [1, 3],
      quest_type: 'daily',
      type: 'timer',
      target_value_range: [15, 120],
      xp_multiplier: 1.0,
      coin_multiplier: 1.0,
      tags: ['독서', '시간', '일일'],
      variables: {
        duration: {
          type: 'number',
          default: 30,
          min: 15,
          max: 120
        },
        book_genre: {
          type: 'string',
          default: '모든 장르',
          options: ['소설', '에세이', '자기계발', '과학', '역사', '철학', '모든 장르']
        }
      },
      title_template: '{duration}분 {book_genre} 독서',
      description_template: '{book_genre} 책을 {duration}분 동안 집중해서 읽어보세요! 📚 꾸준한 독서 습관을 만들어가요.'
    },
    {
      id: 'book_summary',
      name: '독서 요약',
      description: '읽은 내용을 요약하여 이해도를 높이는 퀘스트',
      category: 'writing',
      difficulty_range: [2, 4],
      quest_type: 'daily',
      type: 'summary',
      target_value_range: [3, 10],
      xp_multiplier: 1.5,
      coin_multiplier: 1.2,
      tags: ['요약', '글쓰기', '이해'],
      requirements: {
        min_books: 1
      },
      variables: {
        sentence_count: {
          type: 'number',
          default: 5,
          min: 3,
          max: 10
        },
        summary_type: {
          type: 'string',
          default: '핵심 내용',
          options: ['핵심 내용', '감상평', '인상 깊은 구절', '배운 점']
        }
      },
      title_template: '{summary_type} {sentence_count}문장 요약',
      description_template: '읽은 책의 {summary_type}을 {sentence_count}문장으로 요약해보세요! ✍️ 글로 정리하면 더 오래 기억에 남아요.'
    },
    {
      id: 'reading_streak',
      name: '연속 독서',
      description: '연속으로 독서하여 습관을 만드는 퀘스트',
      category: 'challenge',
      difficulty_range: [3, 5],
      quest_type: 'streak',
      type: 'challenge',
      target_value_range: [3, 30],
      xp_multiplier: 2.0,
      coin_multiplier: 1.5,
      tags: ['연속', '습관', '도전'],
      variables: {
        streak_days: {
          type: 'number',
          default: 7,
          min: 3,
          max: 30
        },
        min_duration: {
          type: 'number',
          default: 20,
          min: 10,
          max: 60
        }
      },
      title_template: '{streak_days}일 연속 독서 챌린지',
      description_template: '{streak_days}일 동안 매일 최소 {min_duration}분씩 독서해보세요! 🔥 연속 기록을 만들어가는 재미를 느껴보세요.'
    },
    {
      id: 'genre_exploration',
      name: '장르 탐험',
      description: '새로운 장르의 책을 읽어보는 퀘스트',
      category: 'learning',
      difficulty_range: [2, 4],
      quest_type: 'weekly',
      type: 'reading',
      target_value_range: [1, 3],
      xp_multiplier: 1.8,
      coin_multiplier: 1.3,
      tags: ['장르', '탐험', '새로움'],
      variables: {
        target_genre: {
          type: 'string',
          default: '과학',
          options: ['과학', '철학', '역사', '예술', '종교', '정치', '경제']
        },
        book_count: {
          type: 'number',
          default: 1,
          min: 1,
          max: 3
        }
      },
      title_template: '{target_genre} 장르 탐험',
      description_template: '{target_genre} 장르의 책 {book_count}권을 읽어보세요! 🌟 새로운 분야의 지식을 탐험해보는 시간입니다.'
    },
    {
      id: 'speed_reading',
      name: '속독 챌린지',
      description: '빠른 속도로 많은 페이지를 읽는 퀘스트',
      category: 'challenge',
      difficulty_range: [4, 5],
      quest_type: 'daily',
      type: 'challenge',
      target_value_range: [50, 200],
      xp_multiplier: 1.5,
      coin_multiplier: 1.4,
      tags: ['속독', '페이지', '도전'],
      requirements: {
        min_level: 3
      },
      variables: {
        page_count: {
          type: 'number',
          default: 100,
          min: 50,
          max: 200
        },
        time_limit: {
          type: 'number',
          default: 60,
          min: 30,
          max: 120
        }
      },
      title_template: '{time_limit}분 안에 {page_count}페이지 읽기',
      description_template: '{time_limit}분 안에 {page_count}페이지를 읽어보세요! ⚡ 집중력과 독서 속도를 향상시켜보세요.'
    },
    {
      id: 'book_discussion',
      name: '독서 토론',
      description: '다른 사람과 책에 대해 토론하는 소셜 퀘스트',
      category: 'social',
      difficulty_range: [3, 4],
      quest_type: 'weekly',
      type: 'challenge',
      target_value_range: [1, 5],
      xp_multiplier: 2.5,
      coin_multiplier: 2.0,
      tags: ['토론', '소셜', '공유'],
      requirements: {
        min_books: 3
      },
      variables: {
        discussion_count: {
          type: 'number',
          default: 2,
          min: 1,
          max: 5
        },
        discussion_type: {
          type: 'string',
          default: '온라인',
          options: ['온라인', '오프라인', '가족과', '친구와']
        }
      },
      title_template: '{discussion_type} 독서 토론 {discussion_count}회',
      description_template: '{discussion_type}에서 {discussion_count}번의 독서 토론에 참여해보세요! 💬 다양한 관점을 나누며 책을 더 깊이 이해해보세요.'
    },
    {
      id: 'morning_reading',
      name: '모닝 독서',
      description: '아침 시간에 독서하는 습관 형성 퀘스트',
      category: 'reading',
      difficulty_range: [2, 4],
      quest_type: 'daily',
      type: 'timer',
      target_value_range: [15, 60],
      xp_multiplier: 1.3,
      coin_multiplier: 1.2,
      tags: ['아침', '습관', '시간'],
      requirements: {
        time_of_day: 'morning'
      },
      variables: {
        duration: {
          type: 'number',
          default: 30,
          min: 15,
          max: 60
        },
        start_time: {
          type: 'string',
          default: '07:00',
          options: ['06:00', '06:30', '07:00', '07:30', '08:00']
        }
      },
      title_template: '모닝 독서 {duration}분 ({start_time})',
      description_template: '{start_time}부터 {duration}분 동안 아침 독서를 해보세요! 🌅 하루를 책과 함께 시작하는 특별한 시간입니다.'
    },
    {
      id: 'weekend_marathon',
      name: '주말 독서 마라톤',
      description: '주말에 장시간 독서하는 특별 퀘스트',
      category: 'challenge',
      difficulty_range: [4, 5],
      quest_type: 'weekly',
      type: 'timer',
      target_value_range: [120, 480],
      xp_multiplier: 2.0,
      coin_multiplier: 1.8,
      tags: ['주말', '마라톤', '장시간'],
      requirements: {
        day_of_week: [0, 6] // 일요일, 토요일
      },
      variables: {
        duration: {
          type: 'number',
          default: 180,
          min: 120,
          max: 480
        },
        break_interval: {
          type: 'number',
          default: 60,
          min: 30,
          max: 90
        }
      },
      title_template: '주말 독서 마라톤 {duration}분',
      description_template: '주말에 {duration}분 동안 독서 마라톤을 해보세요! 🏃‍♂️ {break_interval}분마다 휴식을 취하며 장시간 독서에 도전해보세요.'
    }
  ]

  /**
   * 모든 템플릿 조회
   */
  static getAllTemplates(): QuestTemplate[] {
    return this.templates
  }

  /**
   * 템플릿 ID로 조회
   */
  static getTemplateById(id: string): QuestTemplate | null {
    return this.templates.find(template => template.id === id) || null
  }

  /**
   * 카테고리별 템플릿 조회
   */
  static getTemplatesByCategory(category: string): QuestTemplate[] {
    return this.templates.filter(template => template.category === category)
  }

  /**
   * 사용자 레벨에 맞는 템플릿 조회
   */
  static getTemplatesForLevel(userLevel: number): QuestTemplate[] {
    return this.templates.filter(template => {
      const minLevel = template.requirements?.min_level || 1
      return userLevel >= minLevel
    })
  }

  /**
   * 사용자 조건에 맞는 템플릿 필터링
   */
  static getAvailableTemplates(userContext: {
    level: number
    bookCount: number
    completedQuests: string[]
    currentTime?: Date
  }): QuestTemplate[] {
    const { level, bookCount, completedQuests, currentTime = new Date() } = userContext
    
    return this.templates.filter(template => {
      const req = template.requirements
      if (!req) return true

      // 레벨 체크
      if (req.min_level && level < req.min_level) return false
      
      // 책 수 체크
      if (req.min_books && bookCount < req.min_books) return false
      
      // 완료된 퀘스트 체크
      if (req.completed_quests) {
        const hasRequired = req.completed_quests.every(questId => 
          completedQuests.includes(questId)
        )
        if (!hasRequired) return false
      }
      
      // 시간대 체크
      if (req.time_of_day) {
        const hour = currentTime.getHours()
        const timeOfDay = 
          hour < 6 ? 'night' :
          hour < 12 ? 'morning' :
          hour < 18 ? 'afternoon' :
          hour < 22 ? 'evening' : 'night'
        
        if (timeOfDay !== req.time_of_day) return false
      }
      
      // 요일 체크
      if (req.day_of_week) {
        const dayOfWeek = currentTime.getDay()
        if (!req.day_of_week.includes(dayOfWeek)) return false
      }
      
      return true
    })
  }

  /**
   * 템플릿으로부터 퀘스트 생성
   */
  static generateQuestFromTemplate(
    template: QuestTemplate,
    variables: Record<string, any> = {},
    userLevel: number = 1
  ): CreateQuestRequest {
    // 변수 값 설정 (기본값 사용 또는 사용자 입력값)
    const resolvedVariables: Record<string, any> = {}
    
    Object.entries(template.variables).forEach(([key, config]) => {
      if (variables[key] !== undefined) {
        resolvedVariables[key] = variables[key]
      } else {
        resolvedVariables[key] = config.default
      }
    })

    // 제목과 설명 템플릿 처리
    const title = this.processTemplate(template.title_template, resolvedVariables)
    const description = this.processTemplate(template.description_template, resolvedVariables)
    
    // 난이도 계산 (사용자 레벨 기반)
    const [minDiff, maxDiff] = template.difficulty_range
    const difficulty = Math.min(maxDiff, Math.max(minDiff, Math.floor(userLevel / 2) + 1))
    
    // 목표값 계산
    const [minTarget, maxTarget] = template.target_value_range
    const targetValue = resolvedVariables.duration || 
                       resolvedVariables.sentence_count || 
                       resolvedVariables.page_count || 
                       resolvedVariables.book_count ||
                       Math.floor((minTarget + maxTarget) / 2)
    
    // 보상 계산
    const baseXp = difficulty * 10
    const baseCoin = difficulty * 5
    
    return {
      title,
      description,
      type: template.type,
      quest_type: template.quest_type,
      difficulty,
      target_value: targetValue,
      xp_reward: Math.round(baseXp * template.xp_multiplier),
      coin_reward: Math.round(baseCoin * template.coin_multiplier),
      auto_renew: template.quest_type === 'daily',
      grace_period_minutes: 60,
      renewal_pattern: {
        interval: template.quest_type === 'daily' ? 'daily' : 
                 template.quest_type === 'weekly' ? 'weekly' : 'daily',
        time: '00:00'
      },
      expiry_notifications: {
        '24h_before': true,
        '6h_before': true,
        '1h_before': true,
        '15m_before': true,
        'expired': true
      }
    }
  }

  /**
   * 템플릿 문자열 처리
   */
  private static processTemplate(template: string, variables: Record<string, any>): string {
    let result = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder, 'g'), value.toString())
    })
    
    return result
  }

  /**
   * 랜덤 템플릿 선택
   */
  static getRandomTemplate(userContext: {
    level: number
    bookCount: number
    completedQuests: string[]
    currentTime?: Date
  }): QuestTemplate | null {
    const availableTemplates = this.getAvailableTemplates(userContext)
    
    if (availableTemplates.length === 0) return null
    
    const randomIndex = Math.floor(Math.random() * availableTemplates.length)
    return availableTemplates[randomIndex]
  }

  /**
   * 다양성을 고려한 템플릿 선택
   */
  static getBalancedTemplates(
    userContext: {
      level: number
      bookCount: number
      completedQuests: string[]
      recentQuestTypes: string[]
      currentTime?: Date
    },
    count: number = 3
  ): QuestTemplate[] {
    const availableTemplates = this.getAvailableTemplates(userContext)
    const { recentQuestTypes } = userContext
    
    // 최근에 사용하지 않은 카테고리 우선 선택
    const categoryCounts: Record<string, number> = {}
    recentQuestTypes.forEach(type => {
      categoryCounts[type] = (categoryCounts[type] || 0) + 1
    })
    
    // 카테고리별로 그룹화
    const templatesByCategory: Record<string, QuestTemplate[]> = {}
    availableTemplates.forEach(template => {
      if (!templatesByCategory[template.category]) {
        templatesByCategory[template.category] = []
      }
      templatesByCategory[template.category].push(template)
    })
    
    // 다양성을 고려하여 선택
    const selectedTemplates: QuestTemplate[] = []
    const categories = Object.keys(templatesByCategory).sort((a, b) => {
      const aCount = categoryCounts[a] || 0
      const bCount = categoryCounts[b] || 0
      return aCount - bCount // 적게 사용된 카테고리 우선
    })
    
    for (let i = 0; i < count && selectedTemplates.length < count; i++) {
      const categoryIndex = i % categories.length
      const category = categories[categoryIndex]
      const categoryTemplates = templatesByCategory[category]
      
      if (categoryTemplates && categoryTemplates.length > 0) {
        // 해당 카테고리에서 아직 선택되지 않은 템플릿 중 랜덤 선택
        const availableInCategory = categoryTemplates.filter(t => 
          !selectedTemplates.some(s => s.id === t.id)
        )
        
        if (availableInCategory.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableInCategory.length)
          selectedTemplates.push(availableInCategory[randomIndex])
        }
      }
    }
    
    return selectedTemplates
  }
}

export default QuestTemplateManager