import { Pool, PoolClient } from 'pg'

// PostgreSQL 연결 풀 생성
// Vercel 배포 시 DATABASE_URL 환경 변수 우선 사용
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // 최대 연결 수
        idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
        connectionTimeoutMillis: 10000, // 연결 타임아웃 (Vercel용 증가)
      }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'bookcraft',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        max: 20, // 최대 연결 수
        idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
        connectionTimeoutMillis: 2000, // 연결 타임아웃
      }
)

// 데이터베이스 연결 테스트
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    console.log('✅ 데이터베이스 연결 성공:', result.rows[0].now)
    return true
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error)
    return false
  }
}

// 쿼리 실행 헬퍼 함수
export async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// 트랜잭션 헬퍼 함수
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// 사용자 관련 데이터베이스 함수들
export const userDb = {
  // 사용자 생성
  async createUser(userData: {
    email: string
    name: string
    role: 'child' | 'parent'
    passwordHash: string
  }) {
    const { email, name, role, passwordHash } = userData
    const result = await query(
      `INSERT INTO public.users (email, name, role, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role, created_at`,
      [email, name, role, passwordHash]
    )
    return result.rows[0]
  },

  // 이메일로 사용자 조회
  async findByEmail(email: string) {
    const result = await query(
      'SELECT * FROM public.users WHERE email = $1',
      [email]
    )
    return result.rows[0] || null
  },

  // ID로 사용자 조회
  async findById(id: string) {
    const result = await query(
      'SELECT * FROM public.users WHERE id = $1',
      [id]
    )
    return result.rows[0] || null
  },

  // 사용자 프로필 업데이트
  async updateProfile(id: string, updates: Partial<{
    name: string
    avatar_url: string
    birth_date: string
  }>) {
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
    
    const result = await query(
      `UPDATE public.users SET ${setClause}, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id, ...values]
    )
    return result.rows[0]
  },

  // 사용자 통계 조회
  async getStats(userId: string) {
    const result = await query(
      'SELECT * FROM get_user_reading_stats($1)',
      [userId]
    )
    return result.rows[0]
  },

  // 비밀번호 업데이트
  async updatePassword(id: string, passwordHash: string) {
    const result = await query(
      `UPDATE public.users SET password_hash = $2, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id, passwordHash]
    )
    return result.rows[0]
  }
}

// 책 관련 데이터베이스 함수들
export const bookDb = {
  // 책 생성
  async create(bookData: {
    title: string
    author: string
    isbn?: string
    cover_image_url?: string
    description?: string
    page_count?: number
    publisher?: string
    published_date?: string
    genre?: string
    age_rating?: string
    user_id: string
  }) {
    const fields = Object.keys(bookData)
    const values = Object.values(bookData)
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
    
    const result = await query(
      `INSERT INTO public.books (${fields.join(', ')}) 
       VALUES (${placeholders}) 
       RETURNING *`,
      values
    )
    return result.rows[0]
  },

  // 사용자의 책 목록 조회
  async findByUserId(userId: string, limit = 10, offset = 0) {
    const result = await query(
      `SELECT * FROM public.books 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    return result.rows
  },

  // 책 상세 조회
  async findById(id: string) {
    const result = await query(
      'SELECT * FROM public.books WHERE id = $1',
      [id]
    )
    return result.rows[0] || null
  },

  // ISBN으로 책 조회
  async findByIsbn(isbn: string) {
    const result = await query(
      'SELECT * FROM public.books WHERE isbn = $1',
      [isbn]
    )
    return result.rows
  }
}

// 퀘스트 관련 데이터베이스 함수들
export const questDb = {
  // 일일 퀘스트 생성
  async generateDaily(userId: string) {
    await query('SELECT generate_daily_quests($1)', [userId])
  },

  // 사용자의 퀘스트 목록 조회
  async findByUserId(userId: string, status?: string) {
    let queryText = `
      SELECT * FROM public.quests 
      WHERE user_id = $1
    `
    const params = [userId]
    
    if (status) {
      queryText += ' AND status = $2'
      params.push(status)
    }
    
    queryText += ' ORDER BY created_at DESC'
    
    const result = await query(queryText, params)
    return result.rows
  },

  // 퀘스트 완료 처리
  async complete(questId: string, userId: string) {
    const result = await query(
      'SELECT complete_quest($1, $2) as success',
      [questId, userId]
    )
    return result.rows[0].success
  },

  // 퀘스트 상태 업데이트
  async updateStatus(questId: string, status: string) {
    const result = await query(
      `UPDATE public.quests 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, questId]
    )
    return result.rows[0]
  }
}

// 독서 세션 관련 데이터베이스 함수들
export const sessionDb = {
  // 독서 세션 시작
  async start(sessionData: {
    user_id: string
    book_id: string
  }) {
    const result = await query(
      `INSERT INTO public.reading_sessions (user_id, book_id, start_time) 
       VALUES ($1, $2, NOW()) 
       RETURNING *`,
      [sessionData.user_id, sessionData.book_id]
    )
    return result.rows[0]
  },

  // 독서 세션 종료
  async end(sessionId: string, sessionData: {
    duration_minutes?: number
    focus_score?: number
    pages_read?: number
    summary?: string
  }) {
    const { duration_minutes, focus_score, pages_read, summary } = sessionData
    
    const result = await query(
      `UPDATE public.reading_sessions 
       SET end_time = NOW(), 
           duration_minutes = $2, 
           focus_score = $3, 
           pages_read = $4, 
           summary = $5
       WHERE id = $1 
       RETURNING *`,
      [sessionId, duration_minutes, focus_score, pages_read, summary]
    )
    return result.rows[0]
  },

  // 사용자의 독서 세션 조회
  async findByUserId(userId: string, limit = 10) {
    const result = await query(
      `SELECT rs.*, b.title as book_title, b.author as book_author
       FROM public.reading_sessions rs
       JOIN public.books b ON rs.book_id = b.id
       WHERE rs.user_id = $1
       ORDER BY rs.start_time DESC
       LIMIT $2`,
      [userId, limit]
    )
    return result.rows
  }
}

// 연결 풀 종료 (애플리케이션 종료 시 호출)
export async function closePool() {
  await pool.end()
}

export default pool