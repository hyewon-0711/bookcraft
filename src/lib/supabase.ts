import { createClient } from '@supabase/supabase-js'

// TODO: Supabase 타입 생성 후 Database 타입 import
type Database = any

// Supabase 환경 변수 검증
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
}

// 클라이언트 사이드 Supabase 클라이언트
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// 서버 사이드 Supabase 클라이언트 (서비스 역할 키 사용)
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('Supabase 서비스 역할 키가 설정되지 않았습니다.')
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 인증 헬퍼 함수들
export const auth = {
  // 현재 사용자 가져오기
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // 로그인
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  },

  // 회원가입
  signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    if (error) throw error
    return data
  },

  // 로그아웃
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Google 로그인
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
    return data
  },

  // 비밀번호 재설정
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    if (error) throw error
    return data
  },

  // 비밀번호 업데이트
  updatePassword: async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password
    })
    if (error) throw error
    return data
  }
}

// 데이터베이스 헬퍼 함수들
export const db = {
  // 사용자 프로필 가져오기
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  // 사용자 프로필 업데이트
  updateUserProfile: async (userId: string, updates: Partial<Database['public']['Tables']['users']['Update']>) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 책 목록 가져오기
  getBooks: async (userId: string, limit = 10, offset = 0) => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return data
  },

  // 퀘스트 목록 가져오기
  getQuests: async (userId: string, status?: string) => {
    let query = supabase
      .from('quests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  },

  // 독서 통계 가져오기
  getReadingStats: async (userId: string) => {
    const { data, error } = await supabase
      .rpc('get_user_reading_stats', { user_id: userId })
    
    if (error) throw error
    return data
  }
}

// 실시간 구독 헬퍼
export const realtime = {
  // 퀘스트 상태 변경 구독
  subscribeToQuests: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel('quests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quests',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // 가족 랭킹 구독
  subscribeToFamilyRanking: (familyId: string, callback: (payload: any) => void) => {
    return supabase
      .channel('family_ranking')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `family_id=eq.${familyId}`
        },
        callback
      )
      .subscribe()
  }
}

// 파일 업로드 헬퍼
export const storage = {
  // 책 커버 이미지 업로드
  uploadBookCover: async (file: File, bookId: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${bookId}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('book-covers')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (error) throw error
    
    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('book-covers')
      .getPublicUrl(fileName)
    
    return { ...data, publicUrl }
  },

  // 아바타 이미지 업로드
  uploadAvatar: async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (error) throw error
    
    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    return { ...data, publicUrl }
  }
}